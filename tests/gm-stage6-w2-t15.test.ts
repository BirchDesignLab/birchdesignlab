import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';

/* Stage 6 wave 2 task 15: grandmillennial Stage 5 ledger leftovers.
   Source checks: they fail if one of the task's calls is quietly undone. */
const GM = new URL('../src/themes/grandmillennial/', import.meta.url);
const read = (p: string) => readFileSync(new URL(p, GM), 'utf8').replace(/\r\n/g, '\n');

/* The CSS of a file with every `@media (hover: hover) and (pointer: fine) { ... }` block removed,
   so what is left is the rules that apply to every pointer. */
function outsideHoverMedia(src: string): string {
  const open = '@media (hover: hover) and (pointer: fine) {';
  let out = '';
  let i = 0;
  for (;;) {
    const at = src.indexOf(open, i);
    if (at < 0) return out + src.slice(i);
    out += src.slice(i, at);
    let depth = 1;
    let j = at + open.length;
    while (depth > 0 && j < src.length) {
      if (src[j] === '{') depth++;
      else if (src[j] === '}') depth--;
      j++;
    }
    i = j;
  }
}

describe('grandmillennial Stage 6 wave 2 task 15', () => {
  it('every :hover rule in the school sits inside (hover: hover) and (pointer: fine)', () => {
    const files = ['Header.astro', 'Footer.astro', 'theme.css'];
    for (const dir of ['pages', 'parts']) {
      for (const f of readdirSync(new URL(`${dir}/`, GM))) if (f.endsWith('.astro')) files.push(`${dir}/${f}`);
    }
    for (const f of files) {
      const bare = outsideHoverMedia(read(f))
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .split('\n')
        .filter((line) => /:hover/.test(line));
      expect(bare, `${f} has an ungated :hover rule`).toEqual([]);
    }
  });

  it('the Home designation keeps its focus underline ungated and its hover underline gated', () => {
    const home = read('pages/Home.astro');
    expect(home).toMatch(/\.designation:focus-visible \{[^}]*text-decoration: underline/);
    expect(home).not.toMatch(/\.designation:hover, \.designation:focus-visible/);
    expect(read('Header.astro')).toMatch(/nav a\[aria-current='page'\]::after \{ opacity: 1; \}/);
  });

  it('the tassel tug presses at once, tracks the move and springs from where it is', () => {
    const h = read('Header.astro');
    expect(h).toMatch(/const REST = 58, MAX = 26, PRESS = 7;/);
    expect(h).toMatch(/drag = \{ id: e\.pointerId, y0: e\.clientY, d: PRESS,/);
    expect(h).toMatch(/show\(PRESS\);/);
    expect(h).toMatch(/drag\.d = Math\.max\(PRESS, /);
    expect(h).toMatch(/spring\(was\.d\);/);
  });

  it('the tug hit area is at least 24px wide at the narrowest pull (20px: 36 of 28 units)', () => {
    const h = read('Header.astro');
    const m = h.match(/class="bp-hit" x="(-?\d+)" y="-?\d+" width="(\d+)"/);
    expect(m).toBeTruthy();
    const width = Number(m![2]);
    const narrowest = 20 / 28; // the pull is 20px wide between 761 and 1100 and on phones
    expect(width * narrowest).toBeGreaterThanOrEqual(24);
    expect(Number(m![1])).toBe(-width / 2);
  });

  it('the phone nav is tracked 0.14em', () => {
    expect(read('Header.astro')).toMatch(/nav \{ gap: 0\.5rem; font-size: 1\.05rem; letter-spacing: 0\.14em; \}/);
  });

  it('the frame width never shrinks as the viewport grows (one width above 1100, a clamp to the same below)', () => {
    const home = read('pages/Home.astro');
    // Task 19 (stop 3 answer 2) raised the one width from 22rem to 24rem (384px, reached at about 873).
    expect(home).toMatch(/\.portrait \{ grid-column: 2; position: relative; width: 24rem; \}/);
    expect(home).toMatch(/\.portrait \{ width: clamp\(15rem, 44vw, 24rem\); \}/);
    // the plate groups share one aspect (the mat's 4 / 5) at both sizes: no override at 1100
    expect(home).toMatch(/aspect-ratio: 4 \/ 5;\n  \}\n  \.plates\.left/);
    expect(home).not.toMatch(/\.plates \{ aspect-ratio/);
  });

  it('the plates are drawn once: PlateDefs holds the rims and wells, Plate is a <use> stack', () => {
    const defs = read('parts/PlateDefs.astro');
    expect(defs).toMatch(/id=\{`gm-pl-rim-\$\{n\}`\}/);
    for (const w of ['peony', 'bamboo', 'medallion']) expect(defs).toContain(`id="gm-pl-well-${w}"`);
    const plate = read('parts/Plate.astro');
    expect(plate).toContain('<use href={`#gm-pl-rim-${lotus}`} />');
    expect(plate).toContain('<use href={`#gm-pl-well-${well}`} />');
    expect(plate).not.toContain('<path');
    const home = read('pages/Home.astro');
    expect(home.match(/<PlateDefs \/>/g)).toHaveLength(1);
    // every lotus count Home asks for has a rim
    const used = new Set([16, ...[...home.matchAll(/lotus=\{(\d+)\}/g)].map((m) => Number(m[1]))]);
    const counts = defs.match(/lotus: counts = \[([\d, ]+)\]/)![1].split(',').map(Number);
    for (const n of used) expect(counts).toContain(n);
  });

  it('the Contact envelope starts at the form top, and the Services room trims its top padding', () => {
    expect(read('pages/Contact.astro')).toMatch(/gap: var\(--gap\);[\s\S]*?align-items: start;/);
    // Task 19: the shared padding is a custom property (theme.css), Services scales it.
    expect(read('pages/Services.astro')).toMatch(/gm-wall-room \{\s*padding-top: calc\(var\(--wall-room-pad\) \* 0\.6\);/);
    expect(read('theme.css')).toMatch(/--wall-room-pad: clamp\(2\.75rem, 6vw, 4\.75rem\);/);
  });

  it('the canopy swap picture sizes its fixed layers to its own width, not 100vw', () => {
    const css = read('theme.css');
    expect(css).toContain('var(--vignette) 0 0 / 100% 100vh no-repeat');
    expect(css).toContain('var(--sheen) 0 0 / 100% 100vh no-repeat');
    expect(css).not.toContain('100vw 100vh');
  });
});
