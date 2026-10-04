import { describe, it, expect } from 'vitest';
import { readFileSync, statSync } from 'node:fs';

const GM = new URL('../src/themes/grandmillennial/', import.meta.url);
const read = (p: string) => readFileSync(new URL(p, GM), 'utf8');
const palettes = JSON.parse(readFileSync(new URL('../scripts/themes/grandmillennial/chinoiserie-palettes.json', import.meta.url), 'utf8'));
const css = read('theme.css');
const light = css.slice(css.indexOf(":root[data-theme='grandmillennial'] {"), css.indexOf("[data-scheme='dark'] {"));
const dark = css.slice(css.indexOf("[data-scheme='dark'] {"), css.indexOf(':where([data-theme'));
const token = (block: string, name: string) => block.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1].trim();

/* Stage 5 B1 task 2: About's chinoiserie wall is three cached SVG files with the
   inks baked (scripts/themes/grandmillennial/build-chinoiserie.mjs); the inline
   birds and the second frame take the same inks from theme.css's --sc-* tokens.
   A change to one without the other must fail here. */
describe('grandmillennial chinoiserie', () => {
  const keys: Record<string, string> = {
    '--sc-line': 'line', '--sc-trunk': 'trunk', '--sc-limb': 'limb', '--sc-lf': 'lf', '--sc-lf2': 'lf2',
    '--sc-cat': 'cat', '--sc-oxb': 'oxb', '--sc-blue': 'blue', '--sc-gold': 'gold', '--sc-ground': 'ground',
  };
  for (const [scheme, block, pal] of [['light', light, palettes.light], ['dark', dark, palettes.dark]] as const) {
    it(`theme.css --sc-* match the ${scheme} colourway`, () => {
      for (const [t, k] of Object.entries(keys)) expect(token(block, t), `${scheme} ${t}`).toBe(pal[k]);
    });
  }
  it('--sc-room is the hunter file in light and the dark file in dark', () => {
    expect(token(light, '--sc-room')).toBe(palettes.hunter.ground);
    expect(token(dark, '--sc-room')).toBe(palettes.dark.ground);
  });
  for (const name of ['light', 'hunter', 'dark'] as const) {
    it(`chinoiserie-${name}.svg is a real file with its ground and line baked`, () => {
      const svg = read(`assets/chinoiserie-${name}.svg`);
      expect(statSync(new URL(`assets/chinoiserie-${name}.svg`, GM)).size).toBeGreaterThan(4096);
      expect(svg).toContain(`fill="${palettes[name].ground}"`);
      expect(svg).toContain(`stroke:${palettes[name].line}`);
    });
  }
  it('the wall has no tile seam to find: it is one drawing, not a pattern', () => {
    expect(read('assets/chinoiserie-light.svg')).not.toMatch(/<pattern/);
  });
  it('the wall carries no bird at the live bird\'s two perches', () => {
    const about = read('pages/About.astro');
    const spots = [...about.matchAll(/\[(\d+), (\d+), [\d.]+, -?1\]/g)].map((m) => [+m[1], +m[2]]);
    expect(spots.length).toBeGreaterThanOrEqual(4);
    const scene = JSON.parse(readFileSync(new URL('../scripts/themes/proofs/stage5-gm-chinoiserie/scene.json', import.meta.url), 'utf8'));
    const birds = [...scene.sceneG.matchAll(/<use href="#sc-(?:pb|fb)" transform="translate\(([-\d.]+) ([-\d.]+)\)/g)].map((m) => [+m[1], +m[2]]);
    for (const [x, y] of spots) for (const [bx, by] of birds) expect(Math.hypot(x - bx, y - by), `${x},${y} vs ${bx},${by}`).toBeGreaterThan(60);
  });
  it('the botanical birch draws double-toothed leaves and slender catkins, with no text nodes', () => {
    const birch = read('parts/Birch.astro');
    expect(birch).toContain('id="bb-l1"');
    expect(birch).toContain('id="bb-ck"');
    expect(birch).not.toMatch(/<text/);
  });
  it('the live bird is aria-hidden and not focusable', () => {
    const bird = read('parts/WallBird.astro');
    expect(bird).toContain('aria-hidden="true"');
    expect(bird).not.toMatch(/tabindex|role=/);
  });
  it('the live bird layer lies under the intro, so it never paints over the oval or the story', () => {
    const z = (src: string, sel: RegExp) => Number(src.match(sel)?.[1]);
    const layer = z(read('parts/WallBird.astro'), /\.wall-bird-layer\s*\{[^}]*z-index:\s*(-?\d+)/);
    const intro = z(read('pages/About.astro'), /\.intro\s*\{[^}]*z-index:\s*(-?\d+)/);
    expect(layer).toBeGreaterThanOrEqual(0); // above the wall file (z -1)
    expect(intro).toBeGreaterThan(layer);
    expect(read('pages/About.astro')).toMatch(/\.intro\s*\{[^}]*position:\s*relative/);
  });
  it('the sampler lettering is drawn, not typed', () => {
    const about = read('pages/About.astro');
    expect(about).toContain('<mask id="gm-abc-m">');
    expect(about).not.toMatch(/<text[ >]/);
  });
  it('services\' band has its own lacquer yellow token in both schemes', () => {
    expect(token(light, '--lacquer-yellow')).toBeTruthy();
    expect(token(dark, '--lacquer-yellow')).toBeTruthy();
    expect(token(dark, '--lacquer-yellow')).not.toBe(token(light, '--lacquer-yellow'));
  });
});
