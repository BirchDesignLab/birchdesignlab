import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const ROOT = new URL('../src/themes/cottagecore/', import.meta.url);
const fx = readFileSync(new URL('fx.ts', ROOT), 'utf8');
const css = readFileSync(new URL('theme.css', ROOT), 'utf8');

/* Stage 5 B2 task 5: the floaters (fireflies by lamplight, dandelion seeds by day). */
describe('cottagecore floaters', () => {
  it('says where the canvas lives (D7 (a)) and keeps it over the cloth, under main', () => {
    expect(fx).toMatch(/D7 \(a\)/);
    expect(fx).toMatch(/under `main`/);
    expect(css).toMatch(/\.cc-motes \{[^}]*position: fixed[^}]*z-index: 0[^}]*display: block/s);
    expect(css).not.toMatch(/\[data-scheme='dark'\] \.cc-motes/);
  });

  it('reads no layout while scrolling: no scroll listener, text measured on mount and debounced', () => {
    expect(fx).not.toMatch(/addEventListener\('scroll'/);
    expect(fx).toMatch(/new ResizeObserver\(scheduleRects\)/);
    expect(fx).toMatch(/document\.fonts\?\.ready\.then\(scheduleRects\)/);
  });

  it('debounces resize (no synchronous sweep) and only re-staggers after a real pause', () => {
    const resize = fx.slice(fx.indexOf('const resize = () =>'), fx.indexOf('/* ----- fireflies ----- */'));
    // The only synchronous sweep is the first seating, guarded by "nothing seeded yet".
    expect(resize).toMatch(/if \(!fireflies\.length \|\| !seeds\.length\) \{\s*collectTextRects\(\);/);
    expect(fx).toMatch(/const onResize = \(\) => \{\s*resize\(\);\s*sync\(\);\s*scheduleRects\(\);/);
    expect(fx).toMatch(/const PAUSE_MS = 1500/);
    expect(fx).not.toMatch(/FRAME_MS \* 3/);
  });

  it('keeps a halo clear of text by its peak radius', () => {
    expect(fx).toMatch(/fireflyPad = \(r: number\) => r \* \(FIREFLY\.haloMin \+ FIREFLY\.haloGrow\)/);
  });

  it('draws the seeds 1.5 times larger and keeps some on the cloth in view', () => {
    expect(fx).toMatch(/spriteScale: 0\.93/);
    expect(fx).toMatch(/minShown: 3/);
  });

  it('tests a seed against its drawn shape, not a box around it', () => {
    const fn = fx.slice(fx.indexOf('function seedHitsText'), fx.indexOf('/** Where a firefly'));
    expect(fn).toMatch(/Math\.hypot\(cx - x, cy - y\) < reach/);
    expect(fn).toMatch(/const half = 4 \* k \+ pad/);
    expect(fn).not.toMatch(/40 \* k - SEED\.textPad/);
  });

  it('moves only a seed nobody can see, and counts a seed by its fan', () => {
    const keep = fx.slice(fx.indexOf('let shown = 0;'), fx.indexOf('const pointerLive'));
    expect(keep).toMatch(/seedOnShow\(s\.x, s\.y/);
    const gone = keep.slice(keep.indexOf('const gone'));
    expect(gone.split(String.fromCharCode(10))[0]).toMatch(/seedVisible/);
    expect(gone.split(String.fromCharCode(10))[0]).not.toMatch(/seedOnShow/);
    // The fan (crown and both tips) is what counts as on show; the anchor may be under a sheet.
    const show = fx.slice(fx.indexOf('const seedOnShow'), fx.indexOf('const seedVisible'));
    expect(show).toMatch(/y - 42 \* k/);
    expect(show).toMatch(/x - 40 \* k, y - 10 \* k/);
    expect(show).not.toMatch(/pointOnShow\(x, y, sy\)/);
  });

  it('seats a cramped seed smaller, never under the size floor, and starts every seed unseen', () => {
    expect(fx).toMatch(/sizeMin: 0\.8/);
    expect(fx).toMatch(/const sizes = \[s\.base, SEED\.sizeMin \+ \(s\.base - SEED\.sizeMin\) \/ 2, SEED\.sizeMin\]/);
    const mount = fx.slice(fx.indexOf('const seedDandelions'), fx.indexOf('/* Text, measured line by line'));
    expect(mount).toMatch(/cover: 0,/);
    expect(mount).not.toMatch(/\.cover = 1;\s*return s/);
  });

  it('keeps the tape-lift mount and ships no proof-only probe', () => {
    expect(fx).toContain('export function mountTapes');
    expect(fx).not.toContain('__ccFloatersProbe');
  });
});
