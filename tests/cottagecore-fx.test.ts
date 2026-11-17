import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const ROOT = new URL('../src/themes/cottagecore/', import.meta.url);
const fx = readFileSync(new URL('fx.ts', ROOT), 'utf8');
const css = readFileSync(new URL('theme.css', ROOT), 'utf8');

/* Stage 5 B2 task 5: the floaters (fireflies by lamplight, dandelion seeds by day).
   Task 6 (pair C fixes) changed the phone halo, the tap, the fonts wait and the
   resize sweep; the tests below hold those. */
describe('cottagecore floaters', () => {
  it('says where the canvas lives (D7 (a)) and keeps it over the cloth, under main', () => {
    expect(fx).toMatch(/D7 \(a\)/);
    expect(fx).toMatch(/under `main`/);
    expect(css).toMatch(/\.cc-motes \{[^}]*position: fixed[^}]*z-index: 0[^}]*display: block/s);
    expect(css).not.toMatch(/\[data-scheme='dark'\] \.cc-motes/);
  });

  it('reads no layout while scrolling: no scroll listener, text measured on mount and debounced', () => {
    expect(fx).not.toMatch(/addEventListener\('scroll'/);
    expect(fx).toMatch(/new ResizeObserver\(\(\) => scheduleRects\(\)\)/);
    expect(fx).toMatch(/document\.fonts\.ready\.then\(onFonts\)/);
  });

  it('cancels the fonts-ready sweep on teardown and never sweeps mid-scroll', () => {
    expect(fx).toMatch(/const onFonts = \(\) => \{\s*if \(!alive\) return;/);
    const teardown = fx.slice(fx.indexOf('alive = false;'));
    expect(teardown).toMatch(/clearTimeout\(rectTimer\)/);
    const sweep = fx.slice(fx.indexOf('const sweep = () =>'), fx.indexOf('const scheduleRects'));
    expect(sweep).toMatch(/if \(!alive\) return;/);
    expect(sweep).toMatch(/Math\.abs\(sy - sweepSy\) > 0\.5/);
    // Its own scroll reading, so it settles with no draw loop running (hidden tab).
    expect(sweep).not.toMatch(/lastSy/);
  });

  it('debounces resize (no synchronous sweep) and only re-staggers after a real pause', () => {
    const resize = fx.slice(fx.indexOf('const resize = () =>'), fx.indexOf('/* ----- fireflies ----- */'));
    // The only synchronous sweep is the first seating, guarded by "nothing seeded yet".
    expect(resize).toMatch(/if \(!fireflies\.length \|\| !seeds\.length\) \{\s*collectTextRects\(\);/);
    // A height-only resize (a phone toolbar) waits for stillness; a width change sweeps soon.
    expect(fx).toMatch(/const widthChanged = window\.innerWidth !== lastW;/);
    expect(fx).toMatch(/scheduleRects\(widthChanged \? 150 : SETTLE_MS\)/);
    expect(fx).toMatch(/const SETTLE_MS = 700/);
    expect(fx).toMatch(/const PAUSE_MS = 1500/);
    expect(fx).not.toMatch(/FRAME_MS \* 3/);
  });

  it('keeps a halo clear of text by its peak radius, smaller on a phone', () => {
    const pad = fx.slice(fx.indexOf('const fireflyPad'), fx.indexOf('const SEED = {'));
    expect(pad).toMatch(/r \* \(FIREFLY\.haloMin \+ FIREFLY\.haloGrow\) \* FIREFLY\.padShare/);
    expect(pad).toMatch(/r \* \(FIREFLY\.phoneHaloMin \+ FIREFLY\.phoneHaloGrow\) \* FIREFLY\.phonePadShare/);
    // The halo and the pad are the only phone differences: the rests are the desktop's.
    expect(fx).toMatch(/darkMin: 4000/);
    expect(fx).toMatch(/darkMax: 8000/);
    expect(fx).not.toMatch(/phoneDark/);
  });

  it('reacts to a touch only on a tap: a release with no movement and no scroll', () => {
    const block = fx.slice(fx.indexOf('const presses = new Map'), fx.indexOf('const onPointerLeave'));
    // A mouse click counts on the press; a touch or pen press only records itself.
    expect(block).toMatch(/if \(e\.pointerType === 'mouse'\) \{[^}]*tap\.pending = true;[^}]*return;/s);
    const up = block.slice(block.indexOf('const onPointerUp'));
    expect(up).toMatch(/p\.moved/);
    expect(up).toMatch(/TAP\.slop/);
    expect(up).toMatch(/Math\.abs\(window\.scrollY - p\.sy\) > TAP\.maxScroll/);
    expect(fx).toMatch(/addEventListener\('pointercancel', onPointerCancel/);
    expect(fx).toMatch(/addEventListener\('pointerup', onPointerUp/);
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

  it('tests a seed as it is tilted: the stalk is the tilted segment and the fan drops with the tilt', () => {
    const fn = fx.slice(fx.indexOf('function seedHitsText'), fx.indexOf('/** Where a firefly'));
    expect(fn).toMatch(/boxes: Box\[\], angle = 0/);
    expect(fn).toMatch(/const footX = x - 70 \* k \* sin/);
    expect(fn).toMatch(/const footY = y \+ 70 \* k \* cos/);
    expect(fn).toMatch(/const low = y \+ \(3 \+ 38 \* Math\.abs\(sin\)\) \* k \+ pad/);
    expect(fn).toMatch(/segmentHitsBox\(x, y, footX, footY/);
    // every caller passes the angle the draw uses
    const calls = fx.match(/seedHitsText\([^)]*\)/g) ?? [];
    expect(calls.filter((c) => /angle\)|tilt\)/.test(c)).length).toBe(calls.length - 0 - 1); // all but the declaration
  });

  it('takes a seed off a line it is on right now on the first frame that sees it', () => {
    expect(fx).toMatch(/fadeOutNow: 1,/);
    expect(fx).toMatch(/onNow \? SEED\.fadeOutNow : SEED\.fadeOut/);
  });

  it('draws every compositor frame while the page scrolls by day, so no skipped frame leaves ink on a line', () => {
    const tick = fx.slice(fx.indexOf('const tick = (t: number)'), fx.indexOf('const stop = ()'));
    expect(tick).toMatch(/const scrolling = root\.dataset\.scheme !== 'dark' && Math\.abs\(window\.scrollY - lastSy\) > 0\.5/);
    expect(tick).toMatch(/if \(t - last < FRAME_MS && !scrolling\) return/);
  });

  it('moves only a seed nobody can see, and counts a seed by its drawn fan', () => {
    const keep = fx.slice(fx.indexOf('let shown = 0;'), fx.indexOf('const pointerLive'));
    expect(keep).toMatch(/seedOnShow\(s\.x, s\.y/);
    expect(keep).toMatch(/turnOf\(s\), angleOf\(s\)/);
    const gone = keep.slice(keep.indexOf('const gone'));
    expect(gone.split(String.fromCharCode(10))[0]).toMatch(/seedVisible/);
    expect(gone.split(String.fromCharCode(10))[0]).not.toMatch(/seedOnShow/);
    // The fan (crown and both tips) is what counts as on show, as it is DRAWN
    // (squeezed by turn, tilted by angle); the anchor may be under a sheet.
    const show = fx.slice(fx.indexOf('const seedOnShow'), fx.indexOf('const seedVisible'));
    expect(show).toMatch(/drawnPoints\(x, y, k, turn, angle\)/);
    expect(show).not.toMatch(/pointOnShow\(x, y, sy\)/);
    const pts = fx.slice(fx.indexOf('const drawnPoints'), fx.indexOf('const edgeFade'));
    expect(pts).toMatch(/at\(0, -42 \* k\)/);
    expect(pts).toMatch(/at\(-40 \* k \* turn, -10 \* k\)/);
    expect(pts).toMatch(/x \+ px \* c - py \* n/);
  });

  it('shows and seats nothing until the fonts have settled', () => {
    expect(fx).toMatch(/let fontsSettled = false;/);
    expect(fx).toMatch(/if \(fontsSettled && \(switched \|\| t - lastKeepT > SEED\.keepEvery\)\)/);
    expect(fx).toMatch(/\|\| !fontsSettled;/);
    // No seed is set showing against the pre-font text.
    expect(fx).not.toMatch(/seatSeed\(seeds\[i\], sy\)\) seeds\[i\]\.cover = 1/);
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
