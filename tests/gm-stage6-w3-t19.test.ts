import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/* Stage 6 wave 3, task 19: grandmillennial fixes (stop 3 answer 2, task 14 and 15 minors), pinned in source. */
const GM = new URL('../src/themes/grandmillennial/', import.meta.url);
const read = (p: string) => readFileSync(new URL(p, GM), 'utf8').replace(/\r\n/g, '\n');

describe('grandmillennial Stage 6 wave 3 task 19', () => {
  it('the Home frame is 24rem (384px) from about 873 up, desktop included, and never shrinks', () => {
    const home = read('pages/Home.astro');
    expect(home).toMatch(/\.portrait \{ grid-column: 2; position: relative; width: 24rem; \}/);
    expect(home).toMatch(/@media \(max-width: 1100px\) \{\s*\.portrait \{ width: clamp\(15rem, 44vw, 24rem\); \}/);
    expect(home).not.toMatch(/\.portrait \{[^}]*22rem/);
  });

  it('each Contact trust part is one nowrap unit, so the tape breaks at the fleuron', () => {
    const c = read('pages/Contact.astro');
    expect(c).toContain('<span class="tp">{part}</span>');
    expect(c).toMatch(/\.trust \.tp \{ white-space: nowrap; \}/);
    // the fleuron and its two spaces stay between the parts, so the visible words are unchanged
    expect(c).toContain('<span class="sep" aria-hidden="true">&#10086;</span> </>}');
  });

  it('the wall room padding is one custom property, scaled in Services', () => {
    expect(read('theme.css')).toMatch(/\.gm-wall-room \{\s*--wall-room-pad: clamp\(2\.75rem, 6vw, 4\.75rem\);[^}]*padding-block: var\(--wall-room-pad\);/);
    const s = read('pages/Services.astro');
    expect(s).toMatch(/padding-top: calc\(var\(--wall-room-pad\) \* 0\.6\);/);
    expect(s).not.toContain('clamp(2.75rem, 6vw, 4.75rem)');
  });

  it('the bird shots script takes the away shot after a tap, as its docstring says', () => {
    const src = readFileSync(new URL('../scripts/themes/stage6/w2-t14-fix1-bird-shots.mjs', import.meta.url), 'utf8');
    expect(src).toContain("dispatchEvent(new MouseEvent('click'");
    expect(src).toContain('bird-away-');
  });
});
