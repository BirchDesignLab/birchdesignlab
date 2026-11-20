import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const dial = readFileSync('src/themes/swiss/WidthDial.astro', 'utf8');
const home = readFileSync('src/themes/swiss/pages/Home.astro', 'utf8');
const css = readFileSync('src/themes/swiss/theme.css', 'utf8');
const key = readFileSync('src/themes/swiss/GridKey.astro', 'utf8');
const header = readFileSync('src/themes/swiss/Header.astro', 'utf8');
const meta = readFileSync('src/themes/swiss/meta.ts', 'utf8');

describe('swiss width dial', () => {
  it('is a labelled horizontal slider from 62 to 125, hidden until measured', () => {
    expect(dial).toMatch(/role="slider"/);
    expect(dial).toMatch(/tabindex="0"/);
    expect(dial).toMatch(/aria-label="Design width"/);
    expect(dial).toMatch(/aria-valuemin="62"/);
    expect(dial).toMatch(/aria-valuemax="125"/);
    expect(dial).toMatch(/aria-orientation="horizontal"/);
    expect(dial).toMatch(/\bhidden\b/);
    expect(dial).toContain('dial.hidden = false');
  });
  it('is a sibling of the h1 inside the hero, in a clipped sheet', () => {
    expect(home).toContain('<WidthDial />');
    expect(home.indexOf('</h1>')).toBeLessThan(home.indexOf('<WidthDial />'));
    expect(home).toMatch(/\.hero-sheet \{ overflow-x: clip; \}/);
    expect(home).toContain('<div class="hero-sheet">');
  });
  it('lets a vertical swipe scroll and engages after 6px sideways', () => {
    expect(dial).toMatch(/touch-action: pan-y pinch-zoom/);
    expect(dial).toMatch(/const ENGAGE = 6/);
    expect(dial).toMatch(/cursor: ew-resize/);
  });
  it('snaps back at a constant 0.25 units a millisecond after a 100ms hold', () => {
    expect(dial).toMatch(/const SPEED = 0\.25;/);
    expect(dial).toMatch(/const HOLD = 100/);
  });
  it('re-measures when the word comes back to rest after a resize it skipped', () => {
    // The observer and the fonts both go through remeasure, which marks the
    // geometry stale while a drag or the keys hold the word.
    expect(dial).toContain('new ResizeObserver(() => remeasure())');
    expect(dial).toMatch(/if \(active \|\| pending\) \{ stale = true; return; \}/);
    // finish() and reset() both catch up; so do a press that never engaged.
    const finish = dial.slice(dial.indexOf('const finish = () =>'), dial.indexOf('const schedule'));
    expect(finish).toContain('relayout()');
    const reset = dial.slice(dial.indexOf('const reset = () =>'), dial.indexOf('/** Travel'));
    expect(reset).toContain('relayout()');
    expect(dial).toMatch(/else if \(stale\) remeasure\(\)/);
  });
  it('has the keys: arrows, page keys, Home, End, Esc', () => {
    for (const k of ['ArrowRight', 'ArrowLeft', 'PageUp', 'PageDown', 'Home', 'End', 'Escape']) expect(dial).toContain(`'${k}'`);
  });
  it('rests instantly before a swap snapshot, and cleans up', () => {
    expect(dial).toContain("'astro:before-preparation'");
    expect(dial).toContain("document.removeEventListener('astro:before-preparation'");
    expect(dial).toContain("import { onMount } from '../../lib/lifecycle'");
  });
  it('plays its first-visit hint once per session, 600ms after the page lands', () => {
    expect(dial).toContain('sessionStorage');
    expect(dial).toMatch(/window\.setTimeout\(cb, 600\)/);
  });
  it('caps the word below the lede on a desktop', () => {
    expect(dial).toMatch(/ledeR\.top < base \+ desc/);
    expect(dial).toMatch(/Winv\(ledeR\.left - gap - heroR\.left\)/);
  });
  it('the bar is the red field, 6px and 4px on phones', () => {
    expect(dial).toMatch(/background: var\(--red-field\)/);
    expect(dial).toMatch(/width: 6px/);
    expect(dial).toMatch(/\.dial-mark \{ width: 4px; \}/);
  });
});

describe('swiss poster scale and flush-left', () => {
  it('rests the dial word at the dial\'s own cap, in CSS: 94.7 from 1024, 125 once the hero is 1100px', () => {
    expect(home).toMatch(/min-width: 1024px\) \{\s*\.billboard \{ --sw-rest: 94\.7; \}/);
    expect(home).toMatch(/@container \(min-width: 1100px\) \{\s*\.billboard \{ --sw-rest: 125; \}/);
    expect(home).not.toMatch(/min-width: 1280px\) \{\s*\.billboard \{ --sw-rest/);
    // The script leaves the CSS rest alone when the cap agrees to a quarter of a unit.
    expect(dial).toMatch(/Math\.abs\(rest - cssRest\) <= 0\.25/);
    expect(home).toContain('--bb: min(20.2cqw, 21rem)');
  });
  it('steps every giant left by its measured bearing', () => {
    expect(css).toMatch(/:where\(\[data-theme='swiss'\]\) h1\.sw-display \{/);
    expect(css).toContain('margin-inline-start: calc(-1em * (0.0078 + 0.000675 * var(--sw-s)))');
  });
});

describe('swiss grid key mark-up layer', () => {
  it('latches on a tap under 250ms and clears on a second tap, Esc or blur', () => {
    expect(key).toMatch(/const TAP_MS = 250/);
    expect(key).toContain('aria-pressed');
    expect(key).toContain("e.key === 'Escape'");
    expect(key).toContain("key.addEventListener('blur', leave)");
  });
  it('draws numbers, span tags, line counts and the giant spec as aria-hidden meta type', () => {
    expect(key).toMatch(/class="marks" aria-hidden="true"/);
    expect(key).toContain('counter(sw-col)');
    expect(key).toContain("'span'");
    expect(key).toContain("'count'");
    expect(key).toContain("'spec'");
    expect(key).toContain('/ leading ');
  });
  it('moves the tablet key off the nav, to the wordmark row', () => {
    expect(key).toMatch(/@media \(min-width: 640px\) \{\s*\.grid-key \{ grid-column: 2 \/ 3; justify-self: start/);
    expect(header).toMatch(/min-width: 640px\) \{\s*\.wordmark \{ justify-self: start; \}/);
  });
});

describe('swiss dark lab band', () => {
  it('turns white in dark with black type, and keeps the red close', () => {
    expect(css).toMatch(/\[data-scheme='dark'\] \.sw-sheet\.sw-white \{\s*background: var\(--white-field\)/);
    expect(css).toContain("[data-scheme='dark'] .sw-sheet.sw-white.sw-bleed { --bleed-fill: var(--white-field); }");
    expect(home).toContain('class="sw-sheet sw-white lab sw-bleed"');
    expect(home).toContain('class="sw-red closer sw-bleed"');
  });
  it('has its contrast pairs', () => {
    expect(meta).toContain("fg: '--black', bg: ['--white-field'], min: 4.5");
    expect(meta).toContain("fg: '--grey-on-white', bg: ['--white-field'], min: 4.5");
    expect(meta).toContain('focus ring on the white field');
  });
});
