import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  CAP_DEG, DAMP, OMEGA, PEAK_DEG, SWING_MS, arcLimit, fitSwing, hangPoint, pivotOffset, rotateAbout, swingTransform,
} from '../src/themes/grandmillennial/parts/plates';

/* Stage 6 wave 4, task 30: grandmillennial's closing C (critique B5, B7, A1; task 22 and 26 minors), pinned. */
const GM = new URL('../src/themes/grandmillennial/', import.meta.url);
const read = (p: string) => readFileSync(new URL(p, GM), 'utf8').replace(/\r\n/g, '\n');

describe('the plates swing big enough to see (B7)', () => {
  it('uses the verdict numbers and keeps the cap just over the peak', () => {
    expect(PEAK_DEG).toBe(18);
    expect(OMEGA).toBe(12);
    expect(DAMP).toBe(6.5);
    expect(SWING_MS).toBe(560);
    expect(CAP_DEG).toBeCloseTo(PEAK_DEG * 1.1, 6);
  });

  it('a resting disc is an obstacle: the swinging disc stops short of touching it', () => {
    const c = { x: 0, y: 40 }, p = { x: 0, y: 0 };
    // a disc of radius 15 centred left of the plate; a clockwise swing carries the plate's bottom left, into it
    const sib = { c: { x: -45, y: 40 }, r: 15 };
    const free = arcLimit(c, p, 20, [], 1, 30);
    const bound = arcLimit(c, p, 20, [], 1, 30, [sib]);
    expect(free).toBe(30);
    expect(bound).toBeGreaterThan(0);
    expect(bound).toBeLessThan(30);
    const q = rotateAbout(c, p, bound);
    expect(Math.hypot(q.x - sib.c.x, q.y - sib.c.y)).toBeGreaterThanOrEqual(35 - 1e-6);
    // the other way is free
    expect(arcLimit(c, p, 20, [], -1, 30, [sib])).toBe(30);
  });

  it('two plates hung overlapping at rest never freeze each other: only a swing closer still is blocked', () => {
    const c = { x: 0, y: 40 }, p = { x: 0, y: 0 };
    const sib = { c: { x: -25, y: 40 }, r: 15 }; // closer than 20 + 15 at rest
    expect(arcLimit(c, p, 20, [], -1, 30, [sib])).toBe(30);
    expect(arcLimit(c, p, 20, [], 1, 30, [sib])).toBe(0);
  });

  it('a swing fitted to the room still reaches the peak when there is room', () => {
    const { samples } = fitSwing(0, PEAK_DEG, 1, 0, CAP_DEG, CAP_DEG);
    expect(Math.max(...samples)).toBeCloseTo(PEAK_DEG, 1);
  });

  it('the mount feeds arcLimit the other plates and swells their discs by their own sway', () => {
    const plates = read('parts/plates.ts');
    expect(plates).toMatch(/const discs: Disc\[\] = rows\.filter\(\(o\) => o\.el !== el\)\.map\(/);
    expect(plates).toContain('arcLimit(c, p, radius, protect, 1, CAP_DEG, discs)');
    expect(plates).toContain('arcLimit(c, p, radius, protect, -1, CAP_DEG, discs)');
    expect(plates).toContain('const DISC = 0.98;');
  });
});

describe('the pivot is the screen top of a turned plate (26/C4)', () => {
  it('turns the offset by minus the rest angle', () => {
    const o = pivotOffset(100, 20);
    expect(Math.hypot(o.x, o.y)).toBeCloseTo(50, 6);
    // turned forward by the rest angle it is straight up again
    const up = rotateAbout(o, { x: 0, y: 0 }, 20);
    expect(up.x).toBeCloseTo(0, 6);
    expect(up.y).toBeCloseTo(-50, 6);
    expect(hangPoint({ x: 10, y: 10 }, 100, 20).y).toBeCloseTo(-40, 6);
    expect(hangPoint({ x: 10, y: 10 }, 100, -14).x).toBeCloseTo(10, 6);
  });
  it('writes the keyframe with that pivot', () => {
    expect(swingTransform(3, 80, 20)).toMatch(/^translate\(-?[\d.]+px, -?[\d.]+px\) rotate\(3\.000deg\) translate\(-?[\d.]+px, -?[\d.]+px\)$/);
    expect(read('parts/plates.ts')).toContain('swingTransform(x, h, g.rest)');
  });
});

describe('plate minors (26/C2, C3, r1-N1) and the touch beat', () => {
  const plates = read('parts/plates.ts');
  it('resets the sideways velocity on pointerleave and lets it go stale', () => {
    expect(plates).toContain('const onLeave = () => { over = null; lastX = null; lastVx = 0; lastVxAt = 0; };');
    expect(plates).toMatch(/e\.timeStamp - lastVxAt < VX_FRESH \? lastVx : 0/);
  });
  it('a plate already swinging takes a re-strike at once (no lag, no dead stop)', () => {
    expect(plates).toMatch(/const wait = prev && prev\.anim\.playState === 'running' \? 0 : lag;/);
  });
  it('ignores a press that is not the primary button', () => {
    expect(plates).toContain('const p = e.button === 0 ? plateAt(e.target) : null;');
  });
  it('gives one plate a half-size swing as a touch beat, on touch only, and cleans it up', () => {
    expect(plates).toContain("import { scheduleBeat } from '../../bauhaus/parts/beat';");
    expect(plates).toMatch(/scheduleBeat\('grandmillennial:plates', plates,/);
    expect(plates).toContain('swing(t as SVGElement, 0, 0.5)');
    expect(plates).toContain("window.matchMedia('(hover: hover) and (pointer: fine)').matches");
    expect(plates).toContain('stopBeat();');
    expect(plates).toContain('beatAbort.abort();');
  });
  it('gives the plates a pointer on the painted disc and a gated hover', () => {
    const plate = read('parts/Plate.astro');
    expect(plate).toMatch(/@media \(hover: hover\) and \(pointer: fine\) \{\s*\.gm-plate use \{ cursor: pointer; \}\s*\.gm-plate:hover \{ filter:/);
  });
});

describe('sampler and seal (A1, 22/C3, 22/C4)', () => {
  const toys = read('parts/toys.ts');
  const about = read('pages/About.astro');
  const css = read('theme.css');
  const meta = read('meta.ts');
  it('the band is a toolbar with a name', () => {
    expect(about).toMatch(/<div class="abc-in" role="toolbar" aria-label="[^"]+" data-sampler>/);
  });
  it('the light gold thread is the school token', () => {
    expect(css).toContain('--thread-gold: var(--gold-deep);');
    expect(css).not.toContain('#a07c2a');
  });
  it('the sampler and the seal each get one touch beat, touch only, torn down with the toy', () => {
    expect(toys).toContain("'grandmillennial:sampler'");
    expect(toys).toContain("'grandmillennial:seal'");
    expect(toys).toMatch(/const mouseHere = \(\): boolean => window\.matchMedia\('\(hover: hover\) and \(pointer: fine\)'\)\.matches;/);
    expect(toys.match(/stopBeat\(\);/g)).toHaveLength(2);
    // the seal's beat touches the seal only and never opens the envelope
    const seal = toys.slice(toys.indexOf("'grandmillennial:seal'"), toys.indexOf("set(false);\n  env.addEventListener"));
    expect(seal).toContain("art.animate(");
    expect(seal).not.toContain('toggle()');
    expect(meta).toContain("fg: '--thread-gold'");
  });
});

describe('the envelope (B5)', () => {
  const contact = read('pages/Contact.astro');
  const css = read('theme.css');
  const meta = read('meta.ts');
  it('lifts dark --flap-in off the wall and holds it', () => {
    expect(css).toContain('--flap-in: #2a4a39;');
    expect(css).not.toContain('--flap-in: #0b1c14;');
    expect(meta).toMatch(/fg: '--flap-in', bg: \['--wall-ground'\]/);
  });
  it('paints the gold diagonals on the inside face of the lid too, and does not shorten the flap', () => {
    expect(contact).toContain('--diagonals:');
    expect(contact).toContain('.lid::after { background: var(--diagonals), var(--flap-in); transform: rotateY(180deg); }');
    expect(contact).toContain('--flap-h: 7.5rem;');
  });
  it('at 860 and below opens to 105 degrees and keeps the envelope under the form', () => {
    const narrow = contact.slice(contact.indexOf('@media (max-width: 860px)'));
    expect(narrow).toContain(".envelope[data-open='true'] .lid { transform: perspective(900px) rotateX(-105deg); }");
    expect(narrow).toContain('z-index: 0;');
    // wide it is still the full fold
    expect(contact).toContain('rotateX(-160deg)');
  });
});
