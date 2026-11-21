import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { revealStatus, type Fills } from '../src/themes/bauhaus/parts/questionnaire';

const read = (p: string) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const services = read('src/themes/bauhaus/pages/Services.astro');
const home = read('src/themes/bauhaus/pages/Home.astro');
const sent = read('src/themes/bauhaus/pages/Sent.astro');
const footer = read('src/themes/bauhaus/Footer.astro');
const css = read('src/themes/bauhaus/theme.css');
const card = read('src/themes/bauhaus/parts/Questionnaire.astro');
const quiz = read('src/themes/bauhaus/parts/questionnaire.ts');
const loose = read('src/themes/bauhaus/parts/loose.ts');
const meta = read('src/themes/bauhaus/meta.ts');

describe('bauhaus questionnaire status (Stage 6 w2 task 12)', () => {
  const key = "Kandinsky's answer: yellow triangle, red square, blue circle.";
  it('an empty form says the key alone, with no tally and no "none"', () => {
    const empty: Fills = { triangle: null, square: null, circle: null };
    expect(revealStatus(empty)).toBe(key);
    expect(revealStatus(empty)).not.toMatch(/none|agree/);
  });
  it('a filled form with no matches still says "none"', () => {
    expect(revealStatus({ triangle: 'red', square: 'blue', circle: 'yellow' })).toBe(`${key} You agree on none.`);
    expect(revealStatus({ triangle: 'yellow', square: 'red', circle: 'blue' })).toBe(`${key} You agree on 3 of 3.`);
  });
  it('hides the tally line on an empty form and the "used" marker is gone', () => {
    expect(quiz).toMatch(/tally\.hidden = empty/);
    expect(quiz).not.toContain('is-used');
    expect(card).not.toContain('is-used');
  });
  it('the auto reveal does not scroll the page', () => {
    expect(quiz).toContain('againBtn.focus({ preventScroll: true })');
  });
  it('the match stamp stands outside the shape, touching its corner, with no right/top overlap offset', () => {
    const stamp = card.match(/\.qstamp \{[^}]*\}/)?.[0] ?? '';
    expect(stamp).toContain('left: var(--sx)');
    expect(stamp).toContain('top: calc(var(--sy) - 26px)');
    expect(stamp).not.toMatch(/right:|top: -14px/);
  });
  it('the phone colour bars are fluid', () => {
    expect(card).toMatch(/\.qcolours \{ display: grid; grid-template-columns: repeat\(3, minmax\(0, 96px\)\)/);
    expect(card).toMatch(/\.qswatch \{ width: 100%; height: 44px; \}/);
  });
  it('the card muted text is a checked token, not a hard-coded colour', () => {
    expect(card).toContain('--mark-muted: var(--card-muted)');
    expect(card).not.toContain('#474541');
    expect(css).toMatch(/--card-muted: #474541/);
    expect(meta).toMatch(/fg: '--card-muted', bg: \['--paper'\]/);
  });
});

describe('bauhaus process diagram (Services) and unequal doors (Home)', () => {
  it('draws a 6px beam and a 6px hanging rule per step, stations stepping down', () => {
    expect(services).toMatch(/\.step::before \{[^}]*height: 6px/);
    expect(services).toMatch(/\.step::after \{[^}]*width: 6px/);
    const sizes = [...services.matchAll(/\.step-(\d) \{ --sz: (\d+)px; \}/g)].map((m) => Number(m[2]));
    expect(sizes.slice(0, 4)).toEqual([...sizes.slice(0, 4)].sort((a, b) => b - a));
    expect(new Set(sizes.slice(0, 4)).size).toBe(4);
  });
  it('keeps the 12ch process heading', () => {
    expect(services).toMatch(/\.process-heading \{[^}]*max-width: 12ch/);
  });
  it('splits the Home doors 7 and 5 columns on desktop and stacks them on phones (760px and below)', () => {
    expect(home).toMatch(/\.door:nth-child\(1\) \{ grid-column: span 7; \}/);
    expect(home).toMatch(/\.door:nth-child\(2\) \{ grid-column: span 5; \}/);
    expect(home).toMatch(/max-width: 760px\) \{[^}]*\.door:nth-child\(n\) \{ grid-column: 1 \/ -1; \}/s);
  });
});

describe('bauhaus findable shapes', () => {
  it('marks one red square per page for the pick-me beat', () => {
    for (const [src, page] of [[home, 'home'], [sent, 'sent']] as const) {
      expect(src).toContain(`data-beat="${page}"`);
      expect(src.match(/data-pick-me/g)).toHaveLength(1);
      expect(src).toMatch(/<rect class="asm loose" data-loose data-pick-me[^>]*Red square/);
    }
  });
  it('the beat is 12px, plays once per page per visit on the common touch conditions (task 28), in memory', () => {
    expect(loose).toContain('BEAT_PX = 12');
    // No fixed delay after the build any more: beat.ts holds the conditions (visible, still, no focus).
    expect(loose).not.toContain('BEAT_WAIT_MS');
    expect(loose).toMatch(/scheduleBeat\(\s*`loose:\$\{page\}`/);
    expect(loose).not.toMatch(/localStorage|sessionStorage/);
  });
  it('lifts 4px over an ink block for a mouse only, fenced to a real hover pointer', () => {
    expect(loose).toContain('LIFT_PX = 4');
    expect(loose).toMatch(/e\.pointerType !== 'mouse' \|\| !fine\.matches/);
    const at = css.indexOf('.loose[data-lift]');
    expect(css.lastIndexOf('@media (hover: hover) and (pointer: fine)', at)).toBeGreaterThan(css.lastIndexOf('\n}\n', at));
  });
  it('a finger scrolls: pan-y, pick up after 200ms or a horizontal move over 8px', () => {
    expect(css).toMatch(/\.loose \{[^}]*touch-action: pan-y/);
    expect(css).not.toMatch(/\.loose \{[^}]*touch-action: none/);
    expect(loose).toContain('HOLD_MS = 200');
    expect(loose).toContain('SLOP_PX = 8');
    expect(loose).toMatch(/Math\.abs\(dx\) > Math\.abs\(dy\)/);
    expect(loose).not.toMatch(/'touchstart'/);
  });
});

describe('bauhaus footer join', () => {
  it('drops the paper stripe in light and keeps the paper rule in dark', () => {
    expect(footer).toMatch(/\.site-footer \{[^}]*border-top: 0;/s);
    expect(footer).toMatch(/\[data-scheme='dark'\]\) \.site-footer \{\s*border-top: var\(--rule\) solid var\(--on-poster\);/);
  });
});
