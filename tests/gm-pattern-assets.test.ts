import { describe, it, expect } from 'vitest';
import { readFileSync, statSync } from 'node:fs';

const GM = new URL('../src/themes/grandmillennial/', import.meta.url);
const read = (p: string) => readFileSync(new URL(p, GM), 'utf8');
const css = read('theme.css');
const light = css.slice(css.indexOf(":root[data-theme='grandmillennial'] {"), css.indexOf("[data-scheme='dark'] {"));
const dark = css.slice(css.indexOf("[data-scheme='dark'] {"), css.indexOf(':where([data-theme'));
const token = (block: string, name: string) => block.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1].trim();

/* Stage 5 B1 task 1: the papered walls and the toile are external files with the
   ink baked per scheme (cached by the browser, never inlined in the header). They
   are written by scripts/themes/grandmillennial/build-patterns.mjs from theme.css,
   so a token change without a rebuild must fail here. */
describe('grandmillennial pattern files', () => {
  for (const [scheme, block] of [['light', light], ['dark', dark]] as const) {
    it(`chintz-wall-${scheme}.svg bakes the ${scheme} --c-* inks at 0.6 ink opacity`, () => {
      const svg = read(`assets/chintz-wall-${scheme}.svg`);
      for (const k of ['--c-rose', '--c-rose-lt', '--c-leaf', '--c-blue', '--c-brown', '--c-grain-d']) {
        expect(svg, k).toContain(`${k}:${token(block, k)}`);
      }
      expect(svg).toContain('<g opacity="0.6">');
    });
    it(`toile-${scheme}.svg is one ink on no ground`, () => {
      const svg = read(`assets/toile-${scheme}.svg`);
      const ink = scheme === 'light' ? token(light, '--oxblood') : token(light, '--gold-light');
      expect(svg).toContain(`stroke:${ink}`);
      expect(svg).not.toMatch(/<rect/);
    });
  }

  it('the files are big enough to be real files, not inlined data URIs', () => {
    for (const f of ['toile-light', 'toile-dark', 'chintz-wall-light', 'chintz-wall-dark']) {
      expect(statSync(new URL(`assets/${f}.svg`, GM)).size, f).toBeGreaterThan(4096);
    }
  });

  it('Defs.astro (inlined on every page) carries no toile and no old porcelain pattern', () => {
    const defs = read('parts/Defs.astro');
    expect(defs).not.toMatch(/gm-toile|gm-porcelaine|k-porc/);
    expect(defs.length).toBeLessThan(24_000);
  });

  it('the aged tile prints every motif twice and has three rose variants', () => {
    const defs = read('parts/Defs.astro');
    for (const id of ['gm-rose', 'gm-rose-b', 'gm-rose-c']) expect(defs).toContain(`<g id="${id}">`);
    expect(defs).toContain('class="o"');
    expect(defs).toContain('k-grain-d');
  });

  it('the stripe band pinstripe has its own ink that shows on the cream stripe in dark', () => {
    expect(token(dark, '--band-pin')).toBeTruthy();
    expect(token(dark, '--band-pin')).not.toBe(token(dark, '--accent'));
  });
});
