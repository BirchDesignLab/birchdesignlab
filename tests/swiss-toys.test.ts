import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/* Stage 6 wave 3 task 21: swiss's variable giants and pressed fields. Source
   checks, in the style of bauhaus-toys.test.ts; the behaviour itself is timed
   and filmed by scripts/themes/stage6/w3-t21-probe.mjs and -evidence.mjs. */

const read = (p: string) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const toys = read('src/themes/swiss/toys.ts');
/** The code without its comments, for the "never" checks (the header explains what it does not do). */
const code = toys.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/ \/\/ .*$/gm, '');
const about = read('src/themes/swiss/pages/About.astro');
const services = read('src/themes/swiss/pages/Services.astro');
const sent = read('src/themes/swiss/pages/Sent.astro');
const footer = read('src/themes/swiss/Footer.astro');
const css = read('src/themes/swiss/theme.css');
const meta = read('src/themes/swiss/meta.ts');

describe('swiss toys: wiring', () => {
  it('each page mounts its toy through onMount, the numerals on Services\' own landmark', () => {
    expect(about).toMatch(/onMount\(\(\) => initAboutSweep\(\)\)/);
    expect(services).toContain("onMount(() => initNumeralHold(document.querySelector('section.process')))");
    expect(sent).toContain("initStopDrag(document.querySelector<HTMLElement>('.sent .stop'))");
    expect(footer).toContain('onMount(() => initFieldPress())');
  });
  it('every init is guarded to the swiss theme and returns a cleanup', () => {
    expect(toys.match(/if \(!isSwiss\(\)\) return;|!isSwiss\(\)/g)!.length).toBeGreaterThanOrEqual(4);
    expect(toys.match(/return \(\) => \{/g)!.length).toBeGreaterThanOrEqual(4);
  });
  it('is deaf and at rest from the router\'s before-preparation (the swap\'s snapshot)', () => {
    expect(toys).toContain("document.addEventListener('astro:before-preparation'");
    expect(toys.match(/onNavigate\(/g)!.length).toBeGreaterThanOrEqual(5);
  });
});

describe('swiss toys: inert, memory only, no sound', () => {
  it('never prevents a touch, stores nothing, plays nothing', () => {
    expect(code).not.toMatch(/Audio|AudioContext|localStorage|sessionStorage|document\.cookie/);
    expect(code).not.toMatch(/touchstart|touchmove/);
    // preventDefault is used for the context menu only.
    for (const m of code.matchAll(/preventDefault\(\)/g)) {
      expect(code.slice(Math.max(0, m.index! - 120), m.index!)).toMatch(/contextmenu|e\.preventDefault\(\)\)/);
    }
  });
  it('the numerals and the stop stay inert: no tabindex, role or button is added to them', () => {
    expect(services).not.toMatch(/<(p|li)[^>]*class="num"[^>]*(tabindex|role=)/);
    expect(services).toMatch(/<p class="num" aria-hidden="true">/);
    expect(sent).not.toMatch(/class="stop"[^>]*(tabindex|role=|<button)/);
    expect(code).not.toMatch(/tabIndex|setAttribute\('role'|setAttribute\('tabindex'/);
  });
  it('a touch picks a toy up after 200 ms still, and a swipe stays the page\'s', () => {
    expect(toys).toContain('const TOUCH_HOLD_MS = 200');
    expect(toys).toContain('const SLOP_PX = 8');
    expect(sent).toMatch(/touch-action: pan-y/);
  });
});

describe('swiss toys: About', () => {
  it('sweeps the spine from its rest cut to 125 and the title stack down to 62', () => {
    expect(toys).toContain('const WIDEST = 125');
    expect(toys).toContain('const NARROWEST = 62');
    expect(toys).toMatch(/const tri = clamp01\(1 - Math\.abs\(2 \* p - 1\)\)/);
  });
  it('its table is About\'s own cuts of the axis', () => {
    for (const cut of ['--sw-bwdth: 62; --sw-birch-r: 1.725; --sw-k: 0.9775', '--sw-bwdth: 75; --sw-birch-r: 2.064; --sw-k: 0.9683', '--sw-bwdth: 105; --sw-birch-r: 2.816; --sw-k: 0.9622', '--sw-bwdth: 125; --sw-birch-r: 3.2211; --sw-k: 0.9677']) {
      expect(about).toContain(cut);
    }
    expect(toys).toMatch(/w: 62, r: 1\.725, k: 0\.9775/);
    expect(toys).toMatch(/w: 125, r: 3\.2211, k: 0\.9677/);
  });
  it('runs only while the thing it moves is on screen, with passive scroll', () => {
    expect(toys).toContain('new IntersectionObserver');
    expect(toys).toMatch(/'scroll', schedule, \{ passive: true/);
    expect(toys).toMatch(/if \(!raf && visible && !frozen\)/);
  });
  it('the title lines carry the width axis and step by the dial\'s bearing figure, as a translate', () => {
    expect(about).toContain('font-stretch: calc(var(--sw-d) * 1%)');
    expect(about).toContain('translate: calc(-1em * 0.000675 * (var(--sw-d) - var(--sw-s))) 0');
  });
});

describe('swiss toys: Services numerals', () => {
  it('weight dips to 100 and travels to 900 in a second, and snaps back at a constant speed after 100 ms', () => {
    expect(toys).toContain('const W_MIN = 100');
    expect(toys).toContain('const W_MAX = 900');
    expect(toys).toContain('const RISE_MS = 1000');
    expect(toys).toContain('const BACK_HOLD_MS = 100');
    expect(toys).toContain('const BACK_FULL_MS = 252');
    expect(toys).toContain('const W_SPEED = (W_MAX - W_MIN) / BACK_FULL_MS');
  });
  it('a press counts on the digit, not on the empty columns of its box', () => {
    expect(toys).toContain('onGlyph(num, p.clientX, p.clientY)');
  });
  it('no text selection on a live numeral; the pointer belongs to the digit (task 29, 21/C2)', () => {
    expect(services).toMatch(/\.num\[data-live\] \{[^}]*user-select: none/);
    expect(services).not.toMatch(/\.num\[data-live\] \{[^}]*cursor/);
    expect(services).toMatch(/@media \(hover: hover\) and \(pointer: fine\) \{\s*\.num\[data-hot\] \{ cursor: pointer; text-decoration: underline;/);
  });
});

describe('swiss toys: Sent', () => {
  it('the full stop is an inline-block always (nothing moves when the script arrives) with a hit area out of flow', () => {
    expect(sent).toMatch(/\.stop \{ color: var\(--red-field\); display: inline-block; position: relative; \}/);
    expect(sent).toMatch(/\.stop\[data-live\]::after \{[^}]*position: absolute/);
    expect(sent).toMatch(/max\(0\.34em, 44px\)/);
  });
  it('drags horizontally only, clamped to the measure, back at a constant speed', () => {
    expect(toys).toMatch(/translate = `\$\{v\.toFixed\(2\)\}px 0`/);
    expect(toys).toContain('lo = f.left - restLeft');
    expect(toys).toContain('hi = f.right - (restLeft + r.width)');
    expect(toys).toContain('speed = Math.max(1, f.width) / BACK_FULL_MS');
  });
});

describe('swiss toys: fields that invert', () => {
  it('names the red, black and white fields and never takes a press that starts on a control', () => {
    expect(toys).toContain("const FIELD = '.sw-red, .sw-sheet, .sw-black'");
    expect(toys).toMatch(/const CONTROL = 'a, button, input, textarea, select, label/);
    expect(toys).toMatch(/control && inside\.contains\(control\) \? null : inside/);
  });
  it('flips with one attribute, a step each way, no transition', () => {
    const block = css.slice(css.indexOf('Pressed fields'), css.indexOf('---- Arrival'));
    expect(block).toMatch(/\.sw-red\[data-sw-flip\] \{\s*background: var\(--white-field\);\s*color: var\(--red-field\);/);
    expect(block).toMatch(/\.sw-black\[data-sw-flip\] \{\s*background: var\(--white-field\);\s*color: var\(--black\);/);
    expect(block).toMatch(/\.sw-sheet\.sw-white\[data-sw-flip\] \{\s*background: var\(--black\);/);
    expect(block).not.toMatch(/transition|animation/);
  });
  it('every flipped field restates its bleed fill, so the fill that runs out to the sheet\'s edge turns too', () => {
    expect(css.match(/\.sw-bleed\[data-sw-flip\] \{ --bleed-fill/g)!.length).toBe(4);
  });
  it('the trunk photograph turns red on the white field (a filter that keeps the alpha)', () => {
    expect(about).toContain('<filter id="sw-flip-red"');
    expect(about).toContain('.manifesto[data-sw-flip] :global(.field-img img) { filter: url(#sw-flip-red); }');
  });
  it('the red type on white is a contrast pair meta.ts holds', () => {
    expect(meta).toMatch(/fg: '--red-field', bg: \['--white-field'\], min: 4\.5/);
  });
});
