import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/**
 * Hover guard (Stage 6 w2 task 17, tightened in w3 task 18). Every `:hover`
 * rule in a school's CSS (src/themes/** .css, <style> blocks of .astro, quiet
 * and the portal included, and the switcher's shadow-root STYLE) must sit
 * inside a media query whose every comma branch carries both
 * `(hover: hover)` and `(pointer: fine)`, with no leading `not` and no `or`,
 * so a tap on a phone leaves no stuck hover state. A rule that shares a
 * selector list with `:focus` or `:focus-visible` fails too: split it so
 * focus stays ungated.
 *
 * Checks the SOURCES (not dist/), so it needs no build and names the file a
 * fix belongs in; the reasoning and the mutation check are recorded in
 * docs/superpowers/specs/theme-schools-research/tier3-stage6/hover-guard.md.
 * Scope is src/themes/** plus the shared CSS quiet actually loads (EXTRA):
 * quiet's CSS is the root site's own src/styles/base.css, and it mounts
 * ThemeToggle and BarkCredit. Since w3 task 18 those are gated at the source,
 * so there is no touch-only allowance and no exception left.
 */

const SRC = join(__dirname, '..', 'src');
const ROOT = join(SRC, 'themes');
const SWITCHER = join(ROOT, 'portal', 'switcher.ts');

/** Shared files outside src/themes that the quiet school ships. */
const EXTRA = [
  join(SRC, 'styles', 'base.css'),
  join(SRC, 'components', 'ThemeToggle.astro'),
  join(SRC, 'components', 'BarkCredit.astro'),
];

/**
 * Named exceptions only: `file::selector` -> reason. Empty since w3 task 18.
 * An entry whose rule is gated (or gone) fails the stale-entry test.
 */
const ALLOW: Record<string, string> = {};

/** Fewest gated :hover rules the whole scan may find (canary against a silently shrunk scope). */
const GATED_FLOOR = 60;
/** Fewest :hover rules the switcher's shadow-root STYLE may yield. */
const SWITCHER_FLOOR = 3;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(css|astro)$/.test(name) || p === SWITCHER) out.push(p);
  }
  return out;
}

export function cssBlocks(file: string, src = readFileSync(file, 'utf8')): string[] {
  if (file.endsWith('.css')) return [src];
  // The portal switcher's shadow-root CSS is the STYLE template literal. It
  // is matched by name, so a backtick elsewhere in the file cannot shift it.
  if (file.endsWith('.ts')) {
    const m = /const STYLE = `([^`]*)`;/.exec(src);
    if (!m) throw new Error(`no STYLE literal in ${file}`);
    return [m[1]];
  }
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

/** Splits on top-level commas (outside parentheses and brackets). */
function splitTop(list: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of list) {
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

/**
 * One @media prelude is a mouse gate when every top-level comma branch
 * carries both `(hover: hover)` and `(pointer: fine)`, none starts with
 * `not`, and none uses a level-4 `or` (either would let a touch device in).
 */
export function mouseGate(prelude: string): boolean {
  const branches = splitTop(prelude.replace(/^@media\s*/i, ''));
  return (
    branches.length > 0 &&
    branches.every(
      (b) =>
        !/^not\b/i.test(b) &&
        !/\)\s*or\s*\(|\bor\s*\(/i.test(b) &&
        /\(\s*hover\s*:\s*hover\s*\)/i.test(b) &&
        /\(\s*pointer\s*:\s*fine\s*\)/i.test(b),
    )
  );
}

/** Nested @media chains intersect, so one mouse gate anywhere in the chain is enough. */
export const gated = (media: string[]) => media.some(mouseGate);

function keyOf(file: string, selector: string): string {
  const rel = relative(file.startsWith(ROOT) ? ROOT : SRC, file).split(sep).join('/');
  return `${rel}::${selector.replace(/\s+/g, ' ')}`;
}

/** Every violation, before exceptions: `[key, message]`. */
export function rawViolations(file: string, css: string): [string, string][] {
  const bad: [string, string][] = [];
  for (const r of collectRules(css)) {
    const parts = splitTop(r.selector);
    if (!parts.some((s) => /:hover\b/.test(s))) continue;
    const key = keyOf(file, r.selector);
    if (!gated(r.media)) bad.push([key, `ungated :hover: ${key}`]);
    else if (parts.some((s) => /:focus/.test(s))) bad.push([key, `hover shares a list with :focus: ${key}`]);
  }
  return bad;
}

export function violations(file: string, css: string, allow: Record<string, string> = ALLOW): string[] {
  return rawViolations(file, css)
    .filter(([key]) => !allow[key])
    .map(([, msg]) => msg);
}

/** ALLOW keys that no longer name a real violation (the rule was gated, split or removed). */
export function staleAllow(allow: Record<string, string>, sources: [string, string][]): string[] {
  const live = new Set(sources.flatMap(([f, css]) => rawViolations(f, css).map(([k]) => k)));
  return Object.keys(allow).filter((k) => !live.has(k));
}

/** Gated :hover rules in one block. */
function gatedHoverCount(css: string): number {
  return collectRules(css).filter(
    (r) => splitTop(r.selector).some((s) => /:hover\b/.test(s)) && gated(r.media),
  ).length;
}

describe('hover guard', () => {
  const files = [...walk(ROOT), ...EXTRA];
  const sources: [string, string][] = files.flatMap((f) => cssBlocks(f).map((css) => [f, css] as [string, string]));

  it('finds the school sources', () => {
    expect(files.length).toBeGreaterThan(20);
    expect(files).toContain(SWITCHER);
  });

  it('canary: the switcher STYLE yields its hover rules', () => {
    const hovers = cssBlocks(SWITCHER).flatMap((css) =>
      collectRules(css).filter((r) => splitTop(r.selector).some((s) => /:hover\b/.test(s))),
    );
    expect(hovers.length).toBeGreaterThanOrEqual(SWITCHER_FLOOR);
  });

  it('canary: the whole scan finds gated hover rules above the floor', () => {
    const total = sources.reduce((n, [, css]) => n + gatedHoverCount(css), 0);
    expect(total).toBeGreaterThan(GATED_FLOOR);
  });

  it('every :hover rule is gated and focus is never in its list', () => {
    const bad: string[] = [];
    for (const [f, css] of sources) bad.push(...violations(f, css));
    expect(bad).toEqual([]);
  });

  it('every ALLOW entry still names a real violation (no stale exceptions)', () => {
    expect(staleAllow(ALLOW, sources)).toEqual([]);
  });

  it('the scanner itself catches the failure modes', () => {
    const f = join(ROOT, 'x.css');
    const ok = (css: string) => expect(violations(f, css, {}), css).toHaveLength(0);
    const bad = (css: string) => expect(violations(f, css, {}), css).toHaveLength(1);
    bad('.a:hover{color:red}');
    ok('@media (hover: hover) and (pointer: fine){.a:hover{color:red}}');
    ok('@media (min-width:600px){@media (hover: hover) and (pointer: fine){.a:hover{color:red}}}');
    bad('@media (hover: hover) and (pointer: fine){.a:hover,.a:focus-visible{color:red}}');
    bad('@media (min-width:600px){.a:hover{color:red}}');
    bad('@media (hover: hover){.a:hover{color:red}}');
    // C2: a comma branch without the gate, a leading not, a level-4 or.
    bad('@media (hover: hover) and (pointer: fine), (max-width: 640px){.a:hover{color:red}}');
    ok('@media (hover: hover) and (pointer: fine) and (min-width: 600px), (hover: hover) and (pointer: fine) and (orientation: landscape){.a:hover{color:red}}');
    bad('@media not all and (hover: hover) and (pointer: fine){.a:hover{color:red}}');
    bad('@media ((hover: hover) and (pointer: fine)) or (max-width: 640px){.a:hover{color:red}}');
    // No touch-only allowance any more: a (hover: none) hover is ungated like any other.
    bad('@media (hover: none){.a:hover{color:red}}');
    bad('.b{background:url("data:image/svg+xml;utf8,<svg/>")}.a:hover{color:red}');
  });

  it('the stale-entry check flags an exception whose rule is now gated', () => {
    const f = join(ROOT, 'x.css');
    const key = keyOf(f, '.a:hover');
    const ungatedSrc: [string, string][] = [[f, '.a:hover{color:red}']];
    const gatedSrc: [string, string][] = [[f, '@media (hover: hover) and (pointer: fine){.a:hover{color:red}}']];
    expect(violations(f, ungatedSrc[0][1], { [key]: 'reason' })).toEqual([]);
    expect(staleAllow({ [key]: 'reason' }, ungatedSrc)).toEqual([]);
    expect(staleAllow({ [key]: 'reason' }, gatedSrc)).toEqual([key]);
  });

  it('the switcher STYLE is found by name, not by backtick pairing', () => {
    const src = '// a stray ` backtick\nconst STYLE = `\n.b:hover{color:red}\n`;\nconst X = `y`;';
    expect(cssBlocks(SWITCHER, src)).toEqual(['\n.b:hover{color:red}\n']);
    expect(() => cssBlocks(SWITCHER, 'const OTHER = `x`;')).toThrow();
  });
});
