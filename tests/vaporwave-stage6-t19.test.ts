import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

/** Stage 6 wave 3, task 19: the vaporwave fixes (stop 3 answer 2, task 13's
    deferred minors), pinned in source. The measured results are in the task
    report; these keep the decisions from drifting. */
const read = (p: string) => readFileSync(`src/themes/vaporwave/${p}`, 'utf8');
const lobby = read('parts/Lobby.astro');
const home = read('pages/Home.astro');
const header = read('Header.astro');
const windows = read('windows.ts');

describe("the drum's Venus (V1)", () => {
  it('ships the pink cast on a white drum as its own still, both formats', () => {
    expect(existsSync('src/themes/vaporwave/stills/venus-drum-512.webp')).toBe(true);
    expect(existsSync('src/themes/vaporwave/stills/venus-drum-512.avif')).toBe(true);
    expect(lobby).toContain("../stills/venus-drum-512.avif?url");
    expect(lobby).toContain("../stills/venus-drum-512.webp?url");
    expect(lobby).not.toContain('venus-kiosk-512');
  });
  it('leaves Home on the white kiosk Venus', () => {
    expect(home).toContain('venus-kiosk-512.webp?url');
    expect(home).not.toContain('venus-drum-512');
  });
});

describe('the phone kiosk props (V3)', () => {
  const block = home.slice(home.indexOf('@media (max-width: 900px)'));
  it('sizes the ball by its figure, about 44px across at 390, and the Venus about 60px tall', () => {
    expect(block).toContain('--prop-w: clamp(107px, 27.5vw, 178px);');
    expect(block).toContain('--prop-w: clamp(82px, 20.95vw, 136px);');
  });
  it('anchors each prop by its visible figure, not its image box (C1)', () => {
    // The ball's figure starts 29.5% in from the image's side, Venus's 31.8%.
    expect(block).toContain('--prop-m: 0.295;');
    expect(block).toContain('--prop-m: 0.318;');
    expect(block).toContain('left: calc(50% + min(50%, 320px) - var(--prop-w) + var(--prop-m) * var(--prop-w));');
    expect(block).toContain('right: calc(50% + min(50%, 320px) - var(--prop-w) + var(--prop-m) * var(--prop-w));');
    expect(block).not.toContain('max(0px, 50% - 320px)');
  });
  it('drops the bases to the stand foot line and keeps the decoration off the pointer', () => {
    expect(block).toContain('bottom: -0.15rem;');
    expect(block).toContain('pointer-events: none;');
  });
});

describe('inactive captions stay static outside a cascade (C2)', () => {
  it('bringToFront wakes a caption only inside .door-grid or .apps', () => {
    expect(windows).toContain("const group = win.closest('.door-grid, .apps');");
    expect(windows).not.toContain('?? win.parentElement');
    // The caption is only un-greyed after the group check, never before it.
    const at = (s: string) => windows.indexOf(s);
    expect(at("const group = win.closest('.door-grid, .apps');")).toBeLessThan(at("bar.classList.remove('inactive');"));
  });
});

describe('the header at 360 and 375 (C3)', () => {
  it('has a narrower step at 380px and below', () => {
    expect(header).toMatch(/@media \(max-width: 380px\) \{\s*\.task \{ font-size: 0\.64rem; letter-spacing: 0\.02em; \}/);
  });
});

describe('the fountain (C4)', () => {
  it('has a stem from the basin to the bowl', () => {
    expect(lobby).toContain('<span class="fn-stem"></span>');
    expect(lobby).toMatch(/\.fn-stem \{[^}]*bottom: 21%; height: 13%/s);
  });
  it('sizes the jets as shares of the fountain box, not pixels', () => {
    expect(lobby).toMatch(/\.fn-jets \{ position: absolute; inset: 0; z-index: 0; \}/);
    expect(lobby).toContain('.fn-jet-c { height: 36%; width: 3%; }');
    expect(lobby).not.toMatch(/\.fn-jet-[clr] \{[^}]*\b\d+px;/);
  });
  it('keeps a smaller escalator rail on the phone mall, the fountain toward the centre', () => {
    const phone = lobby.slice(lobby.indexOf('@media (max-width: 620px)'));
    expect(phone).toContain('.mall-rail { width: clamp(110px, 30vw, 150px); }');
    expect(phone).not.toContain('.mall-rail { display: none; }');
    expect(phone).toContain('.mall-fountain { left: 31%;');
  });
});

describe("the phone hero's CSS sky (C5)", () => {
  it('stops at 64% and 64.2% below 760px, to match the shader horizon (PHONE_HORIZON 0.36)', () => {
    expect(home).toMatch(/@media \(max-width: 759\.98px\) \{\s*\.hero \{\s*background: linear-gradient\(180deg, var\(--hz-sky-top\) 0, var\(--hz-sky-mid\) 50%, var\(--hz-horizon\) 64%, var\(--hz-ground\) 64\.2%, var\(--hz-ground\)\);/);
    expect(readFileSync('src/themes/vaporwave/fx.ts', 'utf8')).toContain('const PHONE_HORIZON = 0.36;');
  });
  it('keeps the desktop sky at 68% and 68.2%', () => {
    expect(home).toContain('var(--hz-horizon) 68%, var(--hz-ground) 68.2%');
  });
});
