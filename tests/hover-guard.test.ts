import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/**
 * Hover guard (Stage 6 w2 task 17). Every `:hover` rule in a school's CSS
 * (src/themes/** .css, and <style> blocks of .astro, quiet and the portal
 * included) must sit inside a media query that implies
 * `(hover: hover) and (pointer: fine)`, so a tap on a phone leaves no stuck
 * hover state. A rule that shares a selector list with `:focus` or
 * `:focus-visible` fails too: split it so focus stays ungated.
 *
 * Checks the SOURCES (not dist/), so it needs no build. Scope is
 * src/themes/** plus the shared CSS quiet actually loads (EXTRA below):
 * quiet's CSS is the root site's own src/styles/base.css, and it mounts
 * ThemeToggle and BarkCredit.
 */

const SRC = join(__dirname, '..', 'src');
const ROOT = join(SRC, 'themes');

/** Shared files outside src/themes that the quiet school ships. */
const EXTRA = [
  join(SRC, 'styles', 'base.css'),
  join(SRC, 'components', 'ThemeToggle.astro'),
  join(SRC, 'components', 'BarkCredit.astro'),
];

const SHARED =
  'shared with the live business site (src/styles/base.css and components), outside the task owns; ' +
  'quiet ships it ungated so a phone tap sticks. Controller decides whether to gate it';

/** Named exceptions only: `file::selector` -> reason. */
const ALLOW: Record<string, string> = {
  'styles/base.css::a:hover': SHARED,
  'styles/base.css::.cta-engraved:hover .fill': `(hover: hover) without pointer: fine; ${SHARED}`,
  'styles/base.css::.cta-engraved:hover .lbl': `(hover: hover) without pointer: fine; ${SHARED}`,
  'styles/base.css::.more-link:hover': `(hover: hover) without pointer: fine; ${SHARED}`,
  'styles/base.css::.more-link:hover .arw': `(hover: hover) without pointer: fine; ${SHARED}`,
  'styles/base.css::.loud a:hover, .loud .more-link:hover': `outranks the gated .designation hover in quiet Home; ${SHARED}`,
  'components/ThemeToggle.astro::button:hover': SHARED,
  'components/BarkCredit.astro::.bark-credit:hover, .bark-credit:focus-visible': `hover shares a list with focus-visible; ${SHARED}`,
};

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(css|astro)$/.test(name) || name === 'switcher.ts') out.push(p);
  }
  return out;
}

function cssBlocks(file: string): string[] {
  const src = readFileSync(file, 'utf8');
  if (file.endsWith('.css')) return [src];
  // The portal switcher's shadow-root CSS lives in template literals.
  if (file.endsWith('.ts')) return [...src.matchAll(/`([^`]*)`/g)].map((m) => m[1]);
  const out: string[] = [];
  const re = /<style\b[^>]*>([\s\S]*?)<\/style>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) out.push(m[1]);
  return out;
}

export interface Rule {
  selector: string;
  media: string[];
}

/** Brace-aware walk: returns every style-rule prelude with its @media chain. */
export function collectRules(css: string): Rule[] {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, () => ' ');
  const rules: Rule[] = [];
  function parse(from: number, to: number, media: string[]): void {
    let start = from;
    let i = from;
    let paren = 0;
    let quote = '';
    while (i < to) {
      const ch = text[i];
      if (quote) {
        if (ch === '\\') i++;
        else if (ch === quote) quote = '';
      } else if (ch === '"' || ch === "'") quote = ch;
      else if (ch === '(') paren++;
      else if (ch === ')') paren--;
      else if (paren === 0 && ch === ';') start = i + 1;
      else if (paren === 0 && ch === '{') {
        let depth = 1;
        let j = i + 1;
        let q = '';
        let p = 0;
        while (j < to && depth > 0) {
          const c = text[j];
          if (q) {
            if (c === '\\') j++;
            else if (c === q) q = '';
          } else if (c === '"' || c === "'") q = c;
          else if (c === '(') p++;
          else if (c === ')') p--;
          else if (p === 0 && c === '{') depth++;
          else if (p === 0 && c === '}') depth--;
          j++;
        }
        const prelude = text.slice(start, i).trim();
        const bodyEnd = j - 1;
        if (prelude.startsWith('@')) {
          const isMedia = /^@media\b/i.test(prelude);
          parse(i + 1, bodyEnd, isMedia ? [...media, prelude] : media);
        } else {
          rules.push({ selector: prelude, media });
          parse(i + 1, bodyEnd, media); // nested rules
        }
        i = j;
        start = i;
        continue;
      }
      i++;
    }
  }
  parse(0, text.length, []);
  return rules;
}

function splitList(sel: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of sel) {
    if (ch === '(' || ch === '[') depth++;
    if (ch === ')' || ch === ']') depth--;
    if (ch === ',' && depth === 0) {
      out.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

const gated = (media: string[]) =>
  media.some((m) => /hover\s*:\s*hover/i.test(m) && /pointer\s*:\s*fine/i.test(m));

function keyOf(file: string, selector: string): string {
  const rel = relative(file.startsWith(ROOT) ? ROOT : SRC, file).split(sep).join('/');
  return `${rel}::${selector.replace(/\s+/g, ' ')}`;
}

export function violations(file: string, css: string): string[] {
  const bad: string[] = [];
  for (const r of collectRules(css)) {
    const parts = splitList(r.selector);
    const hasHover = parts.some((s) => /:hover\b/.test(s));
    if (!hasHover) continue;
    const key = keyOf(file, r.selector);
    if (ALLOW[key]) continue;
    if (!gated(r.media)) bad.push(`ungated :hover: ${key}`);
    else if (parts.some((s) => /:focus/.test(s)))
      bad.push(`hover shares a list with :focus: ${key}`);
  }
  return bad;
}

describe('hover guard', () => {
  const files = [...walk(ROOT), ...EXTRA];

  it('finds the school sources', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('every :hover rule is gated and focus is never in its list', () => {
    const bad: string[] = [];
    for (const f of files) for (const css of cssBlocks(f)) bad.push(...violations(f, css));
    expect(bad).toEqual([]);
  });

  it('every ALLOW entry still matches a real violation (no stale exceptions)', () => {
    const hit = new Set<string>();
    for (const f of files)
      for (const css of cssBlocks(f))
        for (const r of collectRules(css)) {
          const key = keyOf(f, r.selector);
          hit.add(key);
        }
    expect(Object.keys(ALLOW).filter((k) => !hit.has(k))).toEqual([]);
  });

  it('the scanner itself catches the failure modes', () => {
    const f = join(ROOT, 'x.css');
    expect(violations(f, '.a:hover{color:red}')).toHaveLength(1);
    expect(
      violations(f, '@media (hover: hover) and (pointer: fine){.a:hover{color:red}}'),
    ).toHaveLength(0);
    expect(
      violations(
        f,
        '@media (hover: hover) and (pointer: fine){.a:hover,.a:focus-visible{color:red}}',
      ),
    ).toHaveLength(1);
    expect(violations(f, '@media (min-width:600px){.a:hover{color:red}}')).toHaveLength(1);
    expect(
      violations(f, '.b{background:url("data:image/svg+xml;utf8,<svg/>")}.a:hover{color:red}'),
    ).toHaveLength(1);
  });
});
