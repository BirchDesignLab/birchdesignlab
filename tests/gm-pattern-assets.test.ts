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

/* Stage 5 B1 task 6: the founder's B1 calls, as checks that fail if one is quietly undone. */
describe('grandmillennial B1 calls', () => {
  it('toile-porcelain-light.svg is the same drawing in the light porcelain ink (the No. 2 cutting)', () => {
    const svg = read('assets/toile-porcelain-light.svg');
    expect(svg).toContain(`stroke:${token(light, '--porcelain-ink')}`);
    expect(svg).not.toMatch(/<rect/);
    expect(svg.length).toBe(read('assets/toile-light.svg').length);
  });
  it('the No. 2 swatch is cut from the porcelain file by day, not the oxblood wall file', () => {
    const toile = read('parts/Toile.astro');
    expect(toile).toContain("toile-porcelain-light.svg");
    expect(toile).not.toContain("assets/toile-light.svg");
  });
  it('the dark footer band is a deep porcelain blue, not the pale line', () => {
    expect(token(light, '--foot-band')).toBeTruthy();
    expect(token(dark, '--foot-band')).toBeTruthy();
    expect(token(dark, '--foot-band')).not.toBe(token(light, '--foot-band'));
  });
  it('the light flap is a warm paper, not a grey (chroma well above the first pass)', () => {
    const hex = token(light, '--flap')!;
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    expect(r).toBeGreaterThan(g); // warm: red over green over blue
    expect(g).toBeGreaterThan(b);
    expect(r - b).toBeGreaterThanOrEqual(12); // #dfdcd6 spread 9
  });
  it('the alphabet thread has its own oxblood token per scheme', () => {
    expect(token(light, '--thread')).toBe('#a8394a');
    expect(token(dark, '--thread')).toBeTruthy();
    expect(token(dark, '--thread')).not.toBe(token(light, '--thread'));
  });
  it("services' cameo rings are the band's own colour, not the field", () => {
    const services = read('pages/Services.astro');
    expect(services).toContain('0 0 0 8px var(--lacquer-yellow)');
    expect(services).not.toContain('0 0 0 8px var(--field)');
  });
  it('the rosette is a handful of broad pleats round a covered button', () => {
    const rosette = read('parts/Rosette.astro');
    expect(rosette).toMatch(/ring\(9, 0,/);
    expect(rosette).toMatch(/ring\(9, 20,/);
    expect(rosette).toContain('class="button"');
  });
  it("the sampler's Greek key turns four corners and repeats whole motifs", () => {
    const about = read('pages/About.astro');
    for (const c of ['tl', 'tr', 'bl', 'br']) expect(about).toContain(`key corner ${c}`);
    expect(about).toContain('24px 24px round no-repeat');
    expect(about).not.toMatch(/24px 24px repeat-[xy]/);
  });
});
