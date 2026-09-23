/**
 * Just enough CSS reading to answer one question: what does the root element's
 * custom-property table look like for a given school and scheme?
 *
 * Every school's tokens live on the root element (quiet's in
 * src/styles/tokens.css, the rest in src/themes/<id>/theme.css), keyed on
 * html / :root plus [data-theme] and [data-scheme]. So this is not a CSS
 * engine: it reads top-level rules, matches only compound selectors aimed at
 * the root, and runs the cascade by specificity then source order. Anything it
 * does not understand fails to match rather than guessing, so a selector the
 * checker cannot reason about never feeds it a token the browser would not.
 *
 * At-rule blocks are skipped whole. That is deliberate for tokens.css: its
 * @media (prefers-color-scheme) block is the no-JS fallback, and the checker
 * models the page as a browser with JS running (class="js").
 */

export interface TokenBlock {
  /** The rule's selector list, one entry per comma-separated selector. */
  selectors: string[];
  /** Declarations as written (custom properties and ordinary ones). */
  decls: Record<string, string>;
  /** Source order among the returned blocks. */
  order: number;
}

/** Remove comments without touching comment-like text inside strings. */
function stripComments(css: string): string {
  let out = '';
  let i = 0;
  while (i < css.length) {
    const ch = css[i];
    if (ch === '"' || ch === "'") {
      const end = skipString(css, i);
      out += css.slice(i, end);
      i = end;
    } else if (ch === '/' && css[i + 1] === '*') {
      const close = css.indexOf('*/', i + 2);
      if (close === -1) throw new Error('unterminated comment in CSS');
      i = close + 2;
      out += ' ';
    } else {
      out += ch;
      i++;
    }
  }
  return out;
}

/** Index just past the string literal that opens at `start`. */
function skipString(css: string, start: number): number {
  const quote = css[start];
  let i = start + 1;
  while (i < css.length && css[i] !== quote) i += css[i] === '\\' ? 2 : 1;
  if (i >= css.length) throw new Error('unterminated string in CSS');
  return i + 1;
}

/** Index just past the `}` matching the `{` at `open`. */
function skipBlock(css: string, open: number): number {
  let depth = 0;
  let i = open;
  while (i < css.length) {
    const ch = css[i];
    if (ch === '"' || ch === "'") {
      i = skipString(css, i);
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return i + 1;
    i++;
  }
  throw new Error('unbalanced braces in CSS');
}

/**
 * Split on `sep` at the top level only: not inside (), [] or quotes. Commas in
 * color-mix() or attribute values must not break a selector or declaration.
 */
export function splitTopLevel(text: string, sep: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '"' || ch === "'") {
      i = skipString(text, i);
      continue;
    }
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    else if (ch === sep && depth === 0) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
    i++;
  }
  parts.push(text.slice(start));
  return parts;
}

/**
 * Declarations of one rule body. A nested rule (CSS nesting) is skipped: its
 * selector is relative to this one and never targets the root on its own.
 */
function parseDecls(body: string): Record<string, string> {
  const decls: Record<string, string> = {};
  let flat = '';
  let i = 0;
  while (i < body.length) {
    const ch = body[i];
    if (ch === '"' || ch === "'") {
      const end = skipString(body, i);
      flat += body.slice(i, end);
      i = end;
    } else if (ch === '{') {
      // Drop the nested rule's prelude (text since the last ';') and its block.
      flat = flat.slice(0, flat.lastIndexOf(';') + 1);
      i = skipBlock(body, i);
    } else {
      flat += ch;
      i++;
    }
  }
  for (const part of splitTopLevel(flat, ';')) {
    const colon = part.indexOf(':');
    if (colon === -1) continue;
    const name = part.slice(0, colon).trim();
    if (!name) continue;
    decls[name] = part.slice(colon + 1).trim();
  }
  return decls;
}

/** Top-level style rules of `css`, in source order; at-rule blocks skipped whole. */
export function parseTokenBlocks(css: string): TokenBlock[] {
  const src = stripComments(css);
  const blocks: TokenBlock[] = [];
  let i = 0;
  while (i < src.length) {
    if (/\s/.test(src[i])) {
      i++;
      continue;
    }
    if (src[i] === '@') {
      // Statement at-rule (@import ...;) or block at-rule (@media ... { }).
      let j = i;
      while (j < src.length && src[j] !== ';' && src[j] !== '{') {
        j = src[j] === '"' || src[j] === "'" ? skipString(src, j) : j + 1;
      }
      i = src[j] === '{' ? skipBlock(src, j) : j + 1;
      continue;
    }
    let open = i;
    while (open < src.length && src[open] !== '{') {
      open = src[open] === '"' || src[open] === "'" ? skipString(src, open) : open + 1;
    }
    if (open >= src.length) {
      if (src.slice(i).trim()) throw new Error(`CSS rule without a block: "${src.slice(i).trim().slice(0, 40)}"`);
      break;
    }
    const end = skipBlock(src, open);
    const selectors = splitTopLevel(src.slice(i, open), ',')
      .map((s) => s.trim().replace(/\s+/g, ' '))
      .filter(Boolean);
    blocks.push({ selectors, decls: parseDecls(src.slice(open + 1, end - 1)), order: blocks.length });
    i = end;
  }
  return blocks;
}

/** (class-level, type-level): ids never appear on these selectors. */
type Specificity = [number, number];

const ATTR = /^\s*(data-theme|data-scheme)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'\]]+)))?\s*$/;

/**
 * Specificity of `selector` if it matches <html data-theme data-scheme
 * class="js">, else null. Only a compound selector made of html, :root,
 * [data-theme], [data-scheme] and .js can match; a space or combinator means
 * the selector is about a descendant, and any other part is outside the model.
 */
function matchRoot(selector: string, target: { theme?: string; scheme: string }): Specificity | null {
  const s = selector.trim();
  let i = 0;
  let cls = 0;
  let type = 0;
  const identEnd = (at: number) => at >= s.length || !/[\w-]/.test(s[at]);
  if (s.startsWith('html') && identEnd(4)) {
    type = 1;
    i = 4;
  }
  while (i < s.length) {
    if (s.startsWith(':root', i) && identEnd(i + 5)) {
      cls++;
      i += 5;
    } else if (s.startsWith('.js', i) && identEnd(i + 3)) {
      cls++;
      i += 3;
    } else if (s[i] === '[') {
      let close = i + 1;
      while (close < s.length && s[close] !== ']') {
        close = s[close] === '"' || s[close] === "'" ? skipString(s, close) : close + 1;
      }
      const m = ATTR.exec(s.slice(i + 1, close));
      if (!m) return null;
      const want = m[1] === 'data-theme' ? target.theme : target.scheme;
      const value = m[2] ?? m[3] ?? m[4];
      if (want === undefined || (value !== undefined && value !== want)) return null;
      cls++;
      i = close + 1;
    } else {
      return null;
    }
  }
  return type + cls > 0 ? [cls, type] : null;
}

/**
 * The root element's custom properties for <html data-theme={theme}
 * data-scheme={scheme} class="js">. A rule applies with its most specific
 * matching selector; ties fall to source order, later wins.
 */
export function tokensFor(
  blocks: TokenBlock[],
  target: { theme?: string; scheme: 'light' | 'dark' },
): Record<string, string> {
  const matched: { spec: Specificity; block: TokenBlock }[] = [];
  for (const block of blocks) {
    let best: Specificity | null = null;
    for (const sel of block.selectors) {
      const spec = matchRoot(sel, target);
      if (spec && (!best || spec[0] > best[0] || (spec[0] === best[0] && spec[1] > best[1]))) best = spec;
    }
    if (best) matched.push({ spec: best, block });
  }
  matched.sort((a, b) => a.spec[0] - b.spec[0] || a.spec[1] - b.spec[1] || a.block.order - b.block.order);
  const tokens: Record<string, string> = {};
  for (const { block } of matched) {
    for (const [name, value] of Object.entries(block.decls)) {
      if (name.startsWith('--')) tokens[name] = value;
    }
  }
  return tokens;
}
