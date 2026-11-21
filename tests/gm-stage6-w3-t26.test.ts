import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  CAP_DEG, DAMP, LAG_MS, OMEGA, PEAK_DEG, SAMPLES, SWING_MS, SYMPATHY, UNIT_PEAK,
  arcLimit, dirFromTap, dirFromTravel, fitSwing, hangPoint, rotateAbout, swingAngle, swingSamples, swingTransform,
} from '../src/themes/grandmillennial/parts/plates';

/* Stage 6 wave 3, task 26: grandmillennial's plates swing (Home). The swing maths is pure and pinned here; the mount
   and the markup are pinned in source. */
const GM = new URL('../src/themes/grandmillennial/', import.meta.url);
const read = (p: string) => readFileSync(new URL(p, GM), 'utf8').replace(/\r\n/g, '\n');

describe('the swing', () => {
  it('lasts under 600 ms, lag included, and ends at rest', () => {
    expect(SWING_MS).toBeLessThan(600);
    expect(LAG_MS * 2).toBeLessThan(SWING_MS / 4);
    const s = swingSamples(0, 16);
    expect(s).toHaveLength(SAMPLES + 1);
    expect(s[0]).toBe(0);
    expect(s[SAMPLES]).toBe(0);
    // damped: each later lobe is smaller than the one before
    const lobes: number[] = [];
    s.forEach((x, i) => { if (i && i < SAMPLES && Math.abs(x) >= Math.abs(s[i - 1]) && Math.abs(x) >= Math.abs(s[i + 1])) lobes.push(Math.abs(x)); });
    expect(lobes.length).toBeGreaterThanOrEqual(1);
    for (let i = 1; i < lobes.length; i++) expect(lobes[i]).toBeLessThan(lobes[i - 1]);
    expect(DAMP).toBeGreaterThan(0);
    expect(OMEGA).toBeGreaterThan(0);
  });

  it('reaches exactly the peak asked for in the asked direction first', () => {
    for (const dir of [1, -1] as const) {
      const { samples } = fitSwing(0, PEAK_DEG, dir, 0, 20, 20);
      const hi = Math.max(...samples), lo = Math.min(...samples);
      expect(dir > 0 ? hi : -lo).toBeCloseTo(PEAK_DEG, 1);
      // the first move is the asked way
      expect(Math.sign(samples.find((x) => Math.abs(x) > 0.01)!)).toBe(dir);
    }
    expect(Math.max(...swingSamples(0, 1).map(Math.abs))).toBeCloseTo(UNIT_PEAK, 6);
  });

  it('is clamped to the room either side, however it is started', () => {
    const { samples } = fitSwing(0, PEAK_DEG, 1, 0, 3, 2);
    expect(Math.max(...samples)).toBeLessThanOrEqual(3 + 1e-6);
    expect(Math.min(...samples)).toBeGreaterThanOrEqual(-2 - 1e-6);
    // no room at all: the swing is flat
    const none = fitSwing(0, PEAK_DEG, 1, 0, 0, 0);
    expect(none.samples.every((x) => Math.abs(x) < 1e-9)).toBe(true);
  });

  it('never runs away under rapid brushes: restarting from the current angle stays inside the bound', () => {
    let th0 = 0;
    for (let i = 0; i < 40; i++) {
      const dir = i % 3 === 0 ? 1 : -1;
      const { samples } = fitSwing(th0, PEAK_DEG, dir, 0, PEAK_DEG, PEAK_DEG);
      expect(Math.max(...samples.map(Math.abs))).toBeLessThanOrEqual(PEAK_DEG + 1e-6);
      // the next brush lands a random-looking fraction of the way through
      th0 = samples[(i * 7) % 14];
    }
  });

  it('is capped just above the peak however much room a plate has', () => {
    expect(CAP_DEG).toBeCloseTo(PEAK_DEG * 1.1, 6);
    // a restart in phase from the cap itself can add nothing: the bound holds for every start angle inside it
    for (let th0 = -CAP_DEG; th0 <= CAP_DEG; th0 += 1.1) {
      for (const dir of [1, -1] as const) {
        const { samples } = fitSwing(th0, PEAK_DEG, dir, 0, CAP_DEG, CAP_DEG);
        expect(Math.max(...samples.map(Math.abs)), `${th0} ${dir}`).toBeLessThanOrEqual(CAP_DEG + 1e-6);
      }
    }
  });

  it('keeps a neighbour a slight tilt, a beat behind', () => {
    expect(SYMPATHY).toBeGreaterThan(0);
    expect(SYMPATHY).toBeLessThanOrEqual(0.3);
    const lagged = fitSwing(0, PEAK_DEG * SYMPATHY, 1, LAG_MS, 20, 20).samples;
    const struck = fitSwing(0, PEAK_DEG, 1, 0, 20, 20).samples;
    expect(Math.max(...lagged)).toBeLessThan(Math.max(...struck) * 0.5);
    // still at rest through the lag, so it starts a beat later
    expect(swingAngle(LAG_MS / 2, 0, 10, LAG_MS)).toBe(0);
  });
});

describe('direction', () => {
  it('a brush left to right swings the plate anticlockwise (its bottom to the right), right to left clockwise', () => {
    expect(dirFromTravel(5)).toBe(-1);
    expect(dirFromTravel(-5)).toBe(1);
    expect(dirFromTravel(0)).toBe(0);
  });

  it('a tap swings it away from the tap point', () => {
    expect(dirFromTap(120, 100)).toBe(1);
    expect(dirFromTap(80, 100)).toBe(-1);
    expect(dirFromTap(100.2, 100)).toBe(0);
  });
});

describe('the room a plate has', () => {
  it('rotates a point about the hanging point the way CSS rotate does (clockwise is positive, y down)', () => {
    const q = rotateAbout({ x: 0, y: 10 }, { x: 0, y: 0 }, 90);
    expect(q.x).toBeCloseTo(-10, 6);
    expect(q.y).toBeCloseTo(0, 6);
  });

  it('puts the hanging point at the top rim of the turned plate', () => {
    const p = hangPoint({ x: 100, y: 100 }, 40, 0);
    expect(p).toEqual({ x: 100, y: 80 });
    const q = hangPoint({ x: 100, y: 100 }, 40, 90);
    expect(q.x).toBeCloseTo(120, 6);
    expect(q.y).toBeCloseTo(100, 6);
  });

  it('stops a swing short of a protected box and lets the other side run free', () => {
    const c = { x: 0, y: 40 }, p = { x: 0, y: 0 };
    // a wall to the left of the plate (the bottom of a clockwise swing goes left)
    const wall = { l: -80, t: 0, r: -30, b: 100 };
    const left = arcLimit(c, p, 20, [wall], 1, 30);
    const right = arcLimit(c, p, 20, [wall], -1, 30);
    expect(left).toBeGreaterThan(0);
    expect(left).toBeLessThan(30);
    expect(right).toBe(30);
    // the swung disc really does clear the wall at the limit
    const q = rotateAbout(c, p, left);
    expect(q.x - 20).toBeGreaterThanOrEqual(-30 - 1e-6);
  });

  it('writes the rotation about the top rim as one transform, so the resting rotate property is untouched', () => {
    expect(swingTransform(4, 100)).toBe('translate(0, -50px) rotate(4.000deg) translate(0, 50px)');
  });
});

describe('the mount (Home and Plate)', () => {
  const plates = read('parts/plates.ts');
  const home = read('pages/Home.astro');
  const plate = read('parts/Plate.astro');

  it('mounts through onMount, on this school only, and cleans up', () => {
    expect(home).toMatch(/onMount\(\(\) => \{\s*if \(document\.documentElement\.dataset\.theme !== 'grandmillennial'\) return;\s*return initPlates\(/);
    for (const ev of ['pointermove', 'pointerleave', 'pointerdown', 'pointerup', 'pointercancel', 'visibilitychange']) {
      expect(plates, ev).toContain(`addEventListener('${ev}'`);
      expect(plates, ev).toContain(`removeEventListener('${ev}'`);
    }
    expect(plates).toContain('io.disconnect()');
    expect(plates).toContain('ro.disconnect()');
    expect(plates).toContain('cancelAll()');
  });

  it('is inert: the plates stay aria-hidden with no tabindex, and nothing is stored', () => {
    expect(home).toContain('<div class="plates left" aria-hidden="true">');
    expect(home).toContain('<div class="plates right" aria-hidden="true">');
    expect(home).toContain('<div class="plate-row" aria-hidden="true">');
    expect(plate).toContain('aria-hidden="true"');
    expect(plate).not.toContain('tabindex');
    expect(plates).not.toMatch(/localStorage|sessionStorage|setAttribute\('tabindex'/);
  });

  it('moves by a transform animation only (no layout, no style writes, no loop)', () => {
    expect(plates).toContain('.animate(');
    expect(plates).not.toMatch(/requestAnimationFrame|setInterval|\.style\./);
    expect(plates).not.toMatch(/\b(left|top|width|height)\s*:\s*['`]/);
  });

  it('pays the first animated frame once, invisibly, in view and quiet or as the pointer arrives', () => {
    expect(plates).toContain("rotate(0.01deg)");
    expect(plates).toContain('{ duration: 80 }');
    expect(plates).toContain("hero.addEventListener('pointerenter', warm)");
    expect(plates).toContain('window.setTimeout(warm, 900)');
    expect(plates).toContain('for (const a of warmAnims) a.cancel()');
  });

  it('hits the painted plate only, and leaves touch scrolling to the page', () => {
    expect(plate).toContain('pointer-events: none');
    expect(plate).toContain('.gm-plate use { pointer-events: visiblePainted; }');
    expect(plates).not.toContain('preventDefault');
    expect(plate).not.toContain('touch-action');
  });
});
