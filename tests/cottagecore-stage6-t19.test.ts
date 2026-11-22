import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/* Stage 6 wave 3, task 19: cottagecore fixes (stop 3 answer 2, task 16 minors), pinned in source. */
const read = (p: string) => readFileSync(new URL(`../src/themes/cottagecore/${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const fx = read('fx.ts');
const home = read('pages/Home.astro');

describe('cottagecore phone seeds (stop 3 answer 2)', () => {
  it('has smaller seed sizes below sizeMin, phones only, tried last and capped at two showing', () => {
    expect(fx).toMatch(/phoneSizes: \[0\.58, 0\.42\] as const,/);
    expect(fx).toMatch(/phoneTinyMax: 2,/);
    const seat = fx.slice(fx.indexOf('const seatSeed'), fx.indexOf('const seatHeld'));
    expect(seat).toMatch(/if \(width < SEED\.phoneWidth\) \{/);
    expect(seat).toMatch(/if \(tiny < SEED\.phoneTinyMax\) sizes\.push\(\.\.\.SEED\.phoneSizes\);/);
    // the smaller sizes come after the three the desktop uses
    expect(seat.indexOf('SEED.sizeMin];')).toBeLessThan(seat.indexOf('sizes.push'));
    // both sizes are under today's sizeMin
    for (const n of [0.58, 0.42]) expect(n).toBeLessThan(0.8);
  });
  it('leaves the seat test alone (CC3 holds): no looser tier', () => {
    expect(fx).toMatch(/seedFits\(x, y, k, sy, turn, angle\) && !seedHitsText/);
    expect(fx).toMatch(/seatMinLife: 2,/);
    expect(fx).toMatch(/seatMargin: 8,/);
  });
  it('describes today seat rules in the header comment (rc1-N2)', () => {
    expect(fx).not.toContain('still has\n * seeds in it');
    expect(fx).toContain('A view\n * with no seat at any of those sizes shows no seed.');
  });
});

describe('cottagecore desktop fireflies (C2)', () => {
  it('re-seats a hidden mote on phones only, so the desktop 4 to 8 s scatter is unchanged', () => {
    const keep = fx.slice(fx.indexOf('const keepFireflies'), fx.indexOf('const answerTap'));
    expect(keep.indexOf('if (!phone) return;')).toBeGreaterThan(-1);
    expect(keep.indexOf('if (!phone) return;')).toBeLessThan(keep.indexOf('seatFirefly(m, t, sy, phone)'));
    expect(keep.match(/if \(!phone\) return;/g)).toHaveLength(1);
  });
});

describe('cottagecore Home at tablet (CC6, floated)', () => {
  it('puts the sheet first in the source and places it in the right column on a desktop', () => {
    expect(home.indexOf('<div class="specimen cc-lamp"')).toBeLessThan(home.indexOf('<div class="hero-copy">'));
    expect(home).toMatch(/\.hero-copy \{ grid-column: 1; grid-row: 1; \}/);
    expect(home).toMatch(/\.specimen \{ grid-column: 2; grid-row: 1; position: relative;/);
  });
  it('keeps one column on a phone with the sheet under the copy', () => {
    expect(home).toMatch(/\.hero-copy, \.specimen \{ grid-column: 1; \}\s*\.specimen \{ grid-row: 2;/);
  });
  it('floats the sheet right from 641 to 820 and lets the subline run on at the full width', () => {
    const block = home.slice(home.indexOf('@media (min-width: 641px) and (max-width: 820px)'));
    expect(block).toMatch(/\.hero \{ display: flow-root; \}/);
    expect(block).toMatch(/\.hero-copy \{ display: block; \}/);
    expect(block).toMatch(/\.specimen \{ float: right; width: min\(38%, 18\.5rem\); margin: 0\.8rem 0 1\.25rem 2rem; \}/);
    expect(block).toMatch(/\.subline \{ max-width: none; \}/);
    expect(block).not.toContain('grid-row: 4');
  });
});

describe('the nav-link refusal tap (C3)', () => {
  it('taps the link itself with navigation blocked', () => {
    const src = readFileSync(new URL('../scripts/themes/stage6/w2-t16-tap-hover.mjs', import.meta.url), 'utf8');
    expect(src).toContain("[box.x + box.width / 2, box.y + box.height / 2]");
    expect(src).toContain("e.target.closest('nav a')) e.preventDefault()");
    expect(src).not.toContain('[Math.max(4, box.x - 8), ty]');
  });
});
