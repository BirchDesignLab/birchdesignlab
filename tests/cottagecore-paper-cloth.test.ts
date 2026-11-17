import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

const ROOT = new URL('../src/themes/cottagecore/', import.meta.url);
const read = (p: string) => readFileSync(new URL(p, ROOT), 'utf8');
const css = read('theme.css');
const pages = readdirSync(new URL('pages/', ROOT)).filter((f) => f.endsWith('.astro')).map((f) => read(`pages/${f}`));

/* Stage 5 B2 task 2: the structural promises of the paper-and-cloth pass. */
describe('cottagecore paper and cloth', () => {
  it('tears from one tile of 900px or more, never the old 240px tile', () => {
    expect(css).not.toMatch(/\/ 240px 14px repeat-x/);
    const tiles = [...css.matchAll(/\/ (\d+)px 14px repeat-x/g)].map((m) => Number(m[1]));
    expect(tiles.length).toBeGreaterThan(0);
    for (const w of tiles) expect(w).toBeGreaterThanOrEqual(900);
  });

  it('rules ride whole-pixel pitches', () => {
    expect(css).toMatch(/\.cc-ruled \{[^}]*--lh: 30px/);
    expect(css).not.toMatch(/--lh: 1\.[0-9]+rem/);
    for (const p of pages) expect(p).not.toMatch(/--lh: [0-9.]+rem/);
  });

  it('has exactly one indigo tape and four cut-end variants', () => {
    const indigo = pages.join('\n').match(/cc-tape--indigo/g) ?? [];
    expect(indigo).toHaveLength(1);
    for (const v of ['cut', 'half', 'ragged', 'pinked']) expect(css).toContain(`.cc-tape--${v} {`);
  });

  it('mounts both herbarium sheets as boards, with six gum strips on the hero', () => {
    expect(read('pages/Home.astro')).toContain('sheet cc-paper cc-board');
    expect(read('pages/About.astro')).toContain('sheet cc-paper cc-board');
    expect(read('pages/Home.astro').match(/class="pressed gum"/g)).toHaveLength(6);
  });

  it('keeps the dark cloth a check at 0.14 and drops the dashed SVG', () => {
    expect(css).toMatch(/--gingham-thread: rgba\(169, 194, 148, 0\.14\)/);
    expect(css).not.toMatch(/--gingham-texture: url\(/);
    expect(css).toContain('.valance.cc-gingham');
    expect(css).toContain('.hem.cc-gingham');
  });
});
