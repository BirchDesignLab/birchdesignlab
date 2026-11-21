import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/* Stage 6 w3 task 20: the four toys below the fold. Source checks, in the
   style of bauhaus-stage6-w2.test.ts; the behaviour itself is filmed and
   sampled by scripts/themes/stage6/w3-t20-probe.mjs. */

const read = (p: string) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const toys = read('src/themes/bauhaus/parts/toys.ts');
/** The code without its comments, for the "never" checks (the header explains what it does not do). */
const code = toys.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/ \/\/ .*$/gm, '');
const home = read('src/themes/bauhaus/pages/Home.astro');
const about = read('src/themes/bauhaus/pages/About.astro');
const services = read('src/themes/bauhaus/pages/Services.astro');
const footer = read('src/themes/bauhaus/Footer.astro');
const numeral = read('src/themes/bauhaus/parts/Numeral.astro');
const css = read('src/themes/bauhaus/theme.css');

describe('bauhaus toys: controls and inert pieces', () => {
  it('the see-saw is a real button with the plain label, the drawing inside it aria-hidden', () => {
    expect(home).toMatch(/<button class="seesaw toy" type="button" aria-label="See-saw, tip it">/);
    expect(home).toMatch(/<svg viewBox="0 0 400 300" aria-hidden="true"/);
    expect(home.match(/data-seat="(left|right)"/g)).toHaveLength(2);
  });
  it('the letter B is a real button with the plain label, the drawing inside it aria-hidden', () => {
    expect(about).toMatch(/<button class="letter-b toy" type="button" aria-label="Letter B, take apart">/);
    expect(about).toMatch(/<svg viewBox="0 0 320 420" aria-hidden="true"/);
  });
  it('the footer corner and the numerals stay inert: aria-hidden, no tabindex, no role, no control', () => {
    expect(footer).toMatch(/<svg class="corner"[^>]*aria-hidden="true"/);
    expect(footer).toMatch(/data-spin/);
    const corner = footer.slice(footer.indexOf('<svg class="corner"'), footer.indexOf('</svg>'));
    expect(corner).not.toMatch(/tabindex|role=|<button|<a /);
    expect(numeral).toMatch(/<span class="num" aria-hidden="true"/);
    expect(numeral).not.toMatch(/tabindex|role=|<button/);
  });
});

describe('bauhaus toys: the school\'s motion', () => {
  it('every motion rides the snap curve; no spring, no overshoot, no sound, nothing stored', () => {
    expect(toys).toContain("const SNAP = 'cubic-bezier(0.7, 0, 0.2, 1)'");
    expect(code).not.toMatch(/cubic-bezier\(0\.\d+, ?(0\.)?\d+, ?\d+\.\d*, ?1\.\d/);
    expect(code).not.toMatch(/Audio|localStorage|sessionStorage|document\.cookie/);
  });
  it('the see-saw tips 8 degrees about the beam, slides the high shape the full gap, then levels', () => {
    expect(toys).toContain('TIP_DEG = 8');
    expect(toys).toContain('SLIDE = 158');
    // circle right edge 128 + 158 = square left edge 286: the slide stops where the shapes meet.
    expect(home).toMatch(/<circle class="asm" data-seat="left" cx="78"[^>]*r="50"/);
    expect(home).toMatch(/<rect class="asm" data-seat="right" x="286"/);
    expect(toys).toContain("'0deg'");
  });
  it('the see-saw keys alternate (detail 0) and a click takes the end it landed on', () => {
    expect(toys).toMatch(/e\.detail === 0/);
    expect(toys).toMatch(/last === 'left' \? 'right' : 'left'/);
  });
  it('a re-aim sends the other shape home before the next slide starts', () => {
    expect(toys).toContain('SLIDE_AT_REAIM_MS');
    expect(toys).toMatch(/displaced/);
  });
  it('the B comes apart on straight lines and rebuilds in the stepped order; a tap while apart rebuilds at once', () => {
    expect(toys).toMatch(/B_OFFSETS[^=]*=\s*\[/);
    expect(toys).toContain('B_STEP_MS');
    expect(toys).toMatch(/i \* B_STEP_MS/);
    expect(toys).toMatch(/if \(state === 'apart'\) rebuild\(\);\s*else breakApart\(\)/);
    expect(about).toMatch(/\.letter-b svg:global\(\.is-apart\) \{ overflow: visible; \}/);
  });
  it('the corner turns 90 degrees a tap and keeps counting; the numerals replay their own assembly', () => {
    expect(toys).toMatch(/turns \* 90/);
    expect(toys).toMatch(/a\.currentTime = 0;\s*a\.play\(\)/);
  });
  it('transforms only: the toys write translate and rotate, never layout properties', () => {
    expect(code).not.toMatch(/style\.(top|left|right|bottom|width|height|margin|padding)\b/);
  });
});

describe('bauhaus toys: touch, lifecycle, hover', () => {
  it('nothing grabs the touch: no touch-action none, no preventDefault, no touchmove handler', () => {
    expect(code).not.toMatch(/preventDefault|touchstart|touchmove|setPointerCapture/);
    expect(css).toMatch(/\.toy \{[^}]*touch-action: manipulation/);
    expect(css).not.toMatch(/\.toy \{[^}]*touch-action: none/);
  });
  it('a tap is a press and release within 8px, and a cancelled pointer drops it', () => {
    expect(toys).toContain('SLOP_PX = 8');
    expect(toys).toMatch(/'pointercancel'/);
  });
  it('every init returns a cleanup that aborts its listeners and puts the shapes back', () => {
    for (const fn of ['initSeesaw', 'initLetterB', 'initCornerSpin', 'initNumerals']) expect(toys).toContain(`export function ${fn}`);
    expect(toys.match(/new AbortController\(\)/g)).toHaveLength(4);
    expect(toys.match(/abort\.abort\(\)/g)).toHaveLength(4);
    expect(toys).toMatch(/for \(const a of anims\) a\.cancel\(\)/);
    expect(toys).toMatch(/square\.style\.rotate = ''/);
  });
  it('the pages mount the toys through onMount', () => {
    expect(home).toMatch(/onMount\(\(\) => initSeesaw\(/);
    expect(home).toMatch(/onMount\(\(\) => initNumerals\(document\.querySelector\('section\.doors'\)\)\)/);
    expect(services).toMatch(/onMount\(\(\) => initNumerals\(document\.querySelector\('section\.process'\)\)\)/);
    // The guard: a page's numeral mount must not run on the other page's body after a swap.
    expect(toys).toMatch(/if \(!page \|\| !root\.querySelector\('\.num'\)\) return;/);
    expect(about).toMatch(/onMount\(\(\) => initLetterB\(/);
    expect(footer).toMatch(/onMount\(\(\) => initCornerSpin\(/);
  });
  it('the hover lift is for a real hover pointer only, and the pivots are set outside the motion gate', () => {
    const at = css.indexOf('.toy:hover');
    expect(at).toBeGreaterThan(0);
    expect(css.lastIndexOf('@media (hover: hover) and (pointer: fine)', at)).toBeGreaterThan(css.lastIndexOf('\n}\n', at));
    expect(css).toMatch(/\[data-theme='bauhaus'\] \.beam \{ transform-box: view-box; transform-origin: 200px 178px; \}/);
    expect(css).toMatch(/\[data-spin\] \{ transform-box: fill-box; transform-origin: center; \}/);
  });
  it('the ?bh-assembly switch is untouched', () => {
    expect(read('src/themes/bauhaus/AssemblySwitch.astro')).toContain('bh-assembly');
    expect(toys).not.toContain('bh-assembly');
  });
});
