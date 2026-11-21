import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/* Stage 6 w4 task 28 (critique A1, task 20 minors C1 and C2): the signifier
   rule for bauhaus. Source checks, in the style of bauhaus-toys.test.ts; the
   behaviour is filmed by scripts/themes/stage6/w4-t28-*.mjs. */

const read = (p: string) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const beat = read('src/themes/bauhaus/parts/beat.ts');
const toys = read('src/themes/bauhaus/parts/toys.ts');
const loose = read('src/themes/bauhaus/parts/loose.ts');
const css = read('src/themes/bauhaus/theme.css');
const footer = read('src/themes/bauhaus/Footer.astro');

describe('bauhaus touch beat: the common conditions', () => {
  it('60% visible, 400 ms still, no form focus, tab showing, held in memory only', () => {
    expect(beat).toContain('BEAT_VISIBLE = 0.6');
    expect(beat).toContain('BEAT_STILL_MS = 400');
    expect(beat).toMatch(/IntersectionObserver/);
    expect(beat).toMatch(/addEventListener\('scroll'|window\.addEventListener\('scroll'/);
    expect(beat).toMatch(/INPUT\|TEXTAREA\|SELECT/);
    expect(beat).toMatch(/isContentEditable/);
    expect(beat).toMatch(/document\.hidden/);
    expect(beat).toMatch(/const played = new Set<string>\(\)/);
    expect(beat).not.toMatch(/localStorage|sessionStorage|setInterval/);
  });
  it('a press or a key on the toy spends its beat', () => {
    expect(beat).toMatch(/addEventListener\('pointerdown', spend, true\)/);
    expect(beat).toMatch(/addEventListener\('keydown', onKey, true\)/);
  });
});

describe('bauhaus touch beat: every toy has one, in the stepped manner', () => {
  it('the see-saw, the letter B, the corner and the numerals each schedule one; the new beats are for a finger', () => {
    expect(toys.match(/scheduleBeat\(/g)).toHaveLength(4);
    for (const key of ["'see-saw'", "'letter-b'", "'footer-corner'", '`numerals:']) expect(toys).toContain(key);
    expect(toys.match(/mouseHere\(\)/g)!.length).toBeGreaterThanOrEqual(5);
    expect(toys).toMatch(/\(hover: hover\) and \(pointer: fine\)/);
  });
  it('the see-saw beat is a half-size tip that leaves the key alternation alone', () => {
    expect(toys).toMatch(/tip\('right', 0\.5\)/);
    expect(toys).toMatch(/function tip\(side: 'left' \| 'right', k = 1\)/);
  });
  it('the B beat is a quarter-size breath: out, a short hold, home in the stepped order', () => {
    expect(toys).toMatch(/breakApart\(0\.25\)/);
    expect(toys).toMatch(/rebuild\(B_IN_MS \* 0\.6, B_STEP_MS \* 0\.6\)/);
  });
  it('the corner beat is a short step round and back, on the snap curve', () => {
    expect(toys).toContain('CORNER_BEAT_DEG = 18');
    expect(toys).toMatch(/square\.style\.rotate = home/);
  });
  it('the hero pick-me no longer waits a fixed delay: it rides the common conditions', () => {
    expect(loose).toMatch(/from '\.\/beat'/);
    expect(loose).not.toMatch(/BEAT_WAIT_MS|setTimeout\(\s*\(\) => \{\s*if \(abort\.signal\.aborted \|\| document\.hidden/);
  });
});

describe('bauhaus signifiers for the inert toys (mouse)', () => {
  it('the numerals take the pointer cursor and a gated lift over a hard ink block', () => {
    expect(css).toMatch(/\[data-theme='bauhaus'\] \.num \{ cursor: pointer; \}/);
    const at = css.indexOf(".num:hover .nm");
    expect(at).toBeGreaterThan(0);
    expect(css.lastIndexOf('@media (hover: hover) and (pointer: fine)', at)).toBeGreaterThan(css.lastIndexOf('\n}\n', at));
  });
  it('the corner square has its pointer cursor only over the square, and a gated lift', () => {
    expect(css).toMatch(/\.site-footer\[data-corner-hot\] \{ cursor: pointer; \}/);
    expect(toys).toMatch(/footer\.toggleAttribute\('data-corner-hot', on\)/);
    const at = css.indexOf('.corner[data-hot] [data-lift]');
    expect(at).toBeGreaterThan(0);
    // The lift and ink block ride a group that never turns; on the turning rect they would turn with it.
    expect(css).not.toMatch(/\[data-hot\] \[data-spin\]/);
    expect(footer).toMatch(/<g data-lift><rect[^>]*data-spin/);
    expect(css.lastIndexOf('@media (hover: hover) and (pointer: fine)', at)).toBeGreaterThan(css.lastIndexOf('\n}\n', at));
    // Only a mouse on a fine pointer sets it, so a finger never leaves the cursor or the lift behind.
    expect(toys).toMatch(/e\.pointerType === 'mouse' && mouseHere\(\) && hit\(e\)/);
  });
});

describe('bauhaus task 20 minors', () => {
  it('C1: initNumerals is for bauhaus only and listens on main, not the document', () => {
    expect(toys).toMatch(/document\.documentElement\.getAttribute\('data-theme'\) !== 'bauhaus'\) return;/);
    expect(toys).toMatch(/root: Element \| null = document\.querySelector\('main'\)/);
  });
  it('C2: a key press right after a pointer tip tips that same end, then the keys alternate', () => {
    expect(toys).toMatch(/lastFromPointer \? last : last === 'left' \? 'right' : 'left'/);
    expect(toys).toMatch(/lastFromPointer = false;/);
    expect(toys).toMatch(/lastFromPointer = true;/);
  });
});
