import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/* Stage 6 wave 4 task 29 (stop 4 critique C1, C2, C3 and the task 21 minors):
   source checks for swiss, in the style of swiss-toys.test.ts. The behaviour is
   filmed and measured by scripts/themes/stage6/w4-t29-*.mjs. */

const read = (p: string) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const toys = read('src/themes/swiss/toys.ts');
const css = read('src/themes/swiss/theme.css');
const about = read('src/themes/swiss/pages/About.astro');
const services = read('src/themes/swiss/pages/Services.astro');
const sent = read('src/themes/swiss/pages/Sent.astro');

const flipBlock = css.slice(css.indexOf('Pressed fields'), css.indexOf('---- Arrival'));

describe('C1: a pressed field keeps its inverse and gains a 1px edge in its rest colour', () => {
  it('--flip-edge is the rest colour of each field: red, black, black (light sheet), white (dark sheet)', () => {
    expect(flipBlock).toMatch(/\.sw-red\[data-sw-flip\] \{[^}]*--flip-edge: var\(--red-field\);/);
    expect(flipBlock).toMatch(/\.sw-black\[data-sw-flip\] \{[^}]*--flip-edge: var\(--black\);/);
    expect(flipBlock).toMatch(/:not\(\[data-scheme='dark'\]\) \.sw-sheet\[data-sw-flip\] \{[^}]*--flip-edge: var\(--black\);/);
    expect(flipBlock).toMatch(/\.sw-sheet\.sw-white\[data-sw-flip\] \{[^}]*--flip-edge: var\(--white-field\);/);
  });
  it('a field that is not a bleed takes an inset outline', () => {
    expect(flipBlock).toMatch(/\[data-sw-flip\]:not\(\.sw-bleed\) \{\s*outline: 1px solid var\(--flip-edge\);\s*outline-offset: -1px;/);
  });
  it('a bleed field keeps its 100vw fill shadow and its clip, and gets its edge from a pseudo-element out to the same width', () => {
    // The fill rule itself is untouched: a spread shadow clipped to the box, which would paint over a shadow edge.
    expect(css).toMatch(/\.sw-bleed \{\s*box-shadow: 0 0 0 100vw var\(--bleed-fill\);\s*clip-path: inset\(0 -100vw\);/);
    expect(flipBlock).toMatch(/\.sw-bleed\[data-sw-flip\]::after \{[^}]*inset: 0 -100vw;[^}]*border-block-width: var\(--flip-edge-t, 1px\) var\(--flip-edge-b, 1px\);[^}]*pointer-events: none;/);
    expect(flipBlock).toMatch(/\.sw-bleed\[data-sw-flip\] \{ position: relative; \}/);
  });
  it('the edge pseudo-element is layout overflow, so main clips the inline axis (no wider document, no zoomed-out phone)', () => {
    expect(flipBlock).toMatch(/\[data-theme='swiss'\] main \{ overflow-x: clip; \}/);
  });
  it('skips an edge that already sits on a rule: Contact\'s black sheet and its address\'s top on a desktop', () => {
    expect(flipBlock).toMatch(/\.sw-black\.sw-bleed\[data-sw-flip\] \{ --flip-edge-t: 0px; --flip-edge-b: 0px; \}/);
    expect(flipBlock).toMatch(/\.sw-bleed\.direct\[data-sw-flip\]::after \{ inset: 0 -200vw 0 0; --flip-edge-t: 0px; \}/);
  });
  it('paints only: nothing animates and the buttons are not touched by the edge', () => {
    const edge = flipBlock
      .slice(flipBlock.indexOf('/* A pressed field\'s edge'), flipBlock.indexOf('/* While a field is held flipped'))
      .replace(/\/\*[\s\S]*?\*\//g, '');
    expect(edge).not.toMatch(/transition|animation|(?<![-\w])(width|height):|margin|padding|\.sw-btn/);
  });
});

describe('21/C3: a held flipped field\'s button does not hover onto the flipped ground', () => {
  it('keeps the rest fill and no keyline on hover while flipped, outweighing the scheme-scoped rules', () => {
    expect(flipBlock).toMatch(/@media \(hover: hover\) and \(pointer: fine\) \{\s*:root\[data-theme='swiss'\] \[data-sw-flip\]\[data-sw-flip\] \.sw-btn:hover \{\s*background: var\(--btn-bg\);\s*color: var\(--btn-fg\);\s*box-shadow: none;/);
  });
});

describe('C2: a press starts from the current weight', () => {
  it('travels down to 100 at a constant speed (about 200 ms from rest), then up to 900 over the hold', () => {
    expect(toys).toContain('const DIP_MS = 200');
    expect(toys).toContain('const DIP_SPEED = (W_REST - W_MIN) / DIP_MS');
    expect(toys).toContain('const from = r.weight;');
    expect(toys).toContain('const dipMs = Math.max(0, from - W_MIN) / DIP_SPEED;');
    expect(toys).toMatch(/if \(t < dipMs\) w = from - DIP_SPEED \* t;\s*else w = Math\.min\(W_MAX, W_MIN \+ \(\(W_MAX - W_MIN\) \* \(t - dipMs\)\) \/ RISE_MS\);/);
    expect(toys).not.toMatch(/show\(n, W_MIN\);\s*r\.raf = requestAnimationFrame\(step\);/);
  });
  it('the touch gate is unchanged', () => {
    expect(toys).toContain('const TOUCH_HOLD_MS = 200');
    expect(toys).toMatch(/r\.gate = window\.setTimeout\(\(\) => \{ r\.gate = 0; if \(press && press\.num === num\) begin\(num\); \}, TOUCH_HOLD_MS\);/);
  });
});

describe('C3: the About sweep runs on the spine from 1280', () => {
  it('the desktop query is 1280, so 1024 to 1279 takes the title-stack sweep', () => {
    expect(toys).toContain("window.matchMedia('(min-width: 1280px)')");
    expect(toys).not.toContain("window.matchMedia('(min-width: 1024px)')");
  });
});

describe('21/C1: a resize keeps the sweep at its current cut', () => {
  it('puts the sweep back in the same task as the measure, and keeps visible across the re-observe', () => {
    expect(toys).toMatch(/const observe = \(\) => \{ io\.disconnect\(\); io\.observe\(target\(\)\); \};/);
    expect(toys).toMatch(/const remeasure = \(\) => \{\s*measure\(\);\s*observe\(\);\s*if \(raf\) \{ cancelAnimationFrame\(raf\); raf = 0; \}\s*if \(visible && !frozen\) update\(\);\s*else schedule\(\);/);
    expect(toys).not.toMatch(/visible = false; io\.observe/);
  });
});

describe('the signifier rule (stop 4 critique A1) for swiss', () => {
  it('21/C2: the numeral has its pointer and an underline rule on the digit and a few pixels round it, mouse only', () => {
    expect(toys).toMatch(/const hover = \(e: Event\) => \{[\s\S]*?p\.pointerType !== 'mouse' \|\| frozen \|\| !mouseHere\(\)[\s\S]*?onGlyph\(num, p\.clientX, p\.clientY\)/);
    expect(toys).toContain("n?.setAttribute('data-hot', '')");
    expect(toys).toContain("page.addEventListener('pointerleave', () => setHot(null), opts)");
    expect(services).toMatch(/\.num\[data-hot\] \{ cursor: pointer; text-decoration: underline; text-decoration-thickness: 0\.03em; text-underline-offset: 0\.07em; \}/);
    // The rule leaves the weight alone: a hover that changed it would jump the weight at the press and at the end of the return.
    expect(services).not.toMatch(/\.num\[data-hot\] \{[^}]*font-weight/);
  });
  it('the full stop keeps its grab cursor and gets a gated one pixel keyline over its hit square', () => {
    expect(sent).toMatch(/cursor: grab;/);
    expect(sent).toMatch(/@media \(hover: hover\) and \(pointer: fine\) \{\s*\.stop\[data-live\]:hover::after \{ outline: 1px solid var\(--mark\); \}/);
  });
  it('the spine is live only while the sweep is on it, and a mouse over it gets a resize cursor and an ink block', () => {
    expect(toys).toContain("birch.toggleAttribute('data-live', desk.matches)");
    expect(toys).toContain("birch.removeAttribute('data-live')");
    expect(about).toMatch(/@media \(hover: hover\) and \(pointer: fine\) \{\s*\.sw-birch\[data-live\] \{ pointer-events: auto; cursor: ns-resize; \}\s*\.sw-birch\[data-live\]:hover \{ background: var\(--mark\); color: var\(--field\); \}/);
  });
  it('the numeral and the full stop have a touch beat on the common conditions, for a finger only; the fields and the spine have none', () => {
    expect(toys).toContain("import { scheduleBeat } from '../bauhaus/parts/beat'");
    expect(toys.match(/scheduleBeat\(/g)).toHaveLength(2);
    expect(toys).toContain("scheduleBeat('swiss:numerals', nums,");
    expect(toys).toContain("scheduleBeat('swiss:stop', [stop], beat,");
    expect(toys.match(/!mouseHere\(\)/g)!.length).toBeGreaterThanOrEqual(3);
    const fields = toys.slice(toys.indexOf('export function initFieldPress'));
    expect(fields).not.toMatch(/scheduleBeat|beat\(/);
    const sweep = toys.slice(toys.indexOf('export function initAboutSweep'), toys.indexOf('/* ---------- Services'));
    expect(sweep).not.toMatch(/scheduleBeat|beat\(/);
  });
  it('the numeral beat is a small hold (dip to 450, rise to 800) and the stop\'s a slide of its own width; neither loops or stores', () => {
    expect(toys).toContain('const BEAT_DIP_TO = 450');
    expect(toys).toContain('const BEAT_RISE_TO = 800');
    expect(toys).toContain('const STOP_BEAT_MS = 320');
    expect(toys).toContain('stop.getBoundingClientRect().width * 0.9');
    const code = toys.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/setInterval|localStorage|sessionStorage|Audio/);
  });
});
