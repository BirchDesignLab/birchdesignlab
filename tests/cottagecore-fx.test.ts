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

  it('keeps the tape-lift mount and ships no proof-only probe', () => {
    expect(fx).toContain('export function mountTapes');
    expect(fx).not.toContain('__ccFloatersProbe');
  });
});
