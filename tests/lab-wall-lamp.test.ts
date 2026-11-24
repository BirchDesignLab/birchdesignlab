import { describe, expect, it } from 'vitest';
import {
  CAST_MAX, CAST_MIN, LAMP_ATTR, LAMP_FADE_MS, LAMP_KEY, bulbShows, castAt, driftTarget, inView, lampDistance, lampLift, lampRuns, lampStart, readLamp, writeLamp,
} from '../src/lib/lab-wall/lamp';

const store = (initial: Record<string, string> = {}) => {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => (k in data ? data[k]! : null),
    setItem: (k: string, v: string) => { data[k] = v; },
  };
};

describe('the remembered lamp', () => {
  it('is on unless the visitor turned it off', () => {
    expect(readLamp(store())).toBe(true);
    expect(readLamp(store({ [LAMP_KEY]: 'on' }))).toBe(true);
    expect(readLamp(store({ [LAMP_KEY]: 'off' }))).toBe(false);
    expect(readLamp(store({ [LAMP_KEY]: 'dim' }))).toBe(true);
  });
  it('survives storage that throws or is missing', () => {
    expect(readLamp(null)).toBe(true);
    expect(readLamp({ getItem: () => { throw new Error('blocked'); } })).toBe(true);
    expect(() => writeLamp({ setItem: () => { throw new Error('blocked'); } }, false)).not.toThrow();
    expect(() => writeLamp(null, false)).not.toThrow();
  });
  it('writes what it reads back', () => {
    const s = store();
    writeLamp(s, false);
    expect(s.data[LAMP_KEY]).toBe('off');
    expect(readLamp(s)).toBe(false);
    writeLamp(s, true);
    expect(readLamp(s)).toBe(true);
  });
  it('keeps one attribute and one key, which the page script repeats', () => {
    expect(LAMP_ATTR).toBe('data-lab-lamp');
    expect(LAMP_KEY).toBe('lab-lamp');
  });
});

describe('where the lamp runs', () => {
  it('runs wherever the visitor has it on: it lights and darkens nothing, so every scheme and screen', () => {
    expect(lampRuns({ on: true })).toBe(true);
  });
  it('never runs when the visitor turned it off', () => {
    expect(lampRuns({ on: false })).toBe(false);
  });
  it('fades over about 400ms', () => {
    expect(LAMP_FADE_MS).toBe(400);
  });
});

describe('where the bulb shows', () => {
  it('shows in the wall view, and not in the list', () => {
    expect(bulbShows({ view: 'wall' })).toBe(true);
    expect(bulbShows({ view: 'list' })).toBe(false);
  });
});

describe('the lift on a tile', () => {
  const tile = { x: 100, y: 100, w: 200, h: 100 };

  it('is full while the lamp is over the tile, edge included', () => {
    expect(lampLift(tile, 200, 150)).toBe(1);
    expect(lampLift(tile, 100, 100)).toBe(1);
    expect(lampLift(tile, 300, 200)).toBe(1);
  });
  it('falls off smoothly with the distance from the tile edge, never below zero', () => {
    let last = 1;
    for (const d of [20, 60, 120, 230, 400, 800]) {
      const v = lampLift(tile, 300 + d, 150);
      expect(v).toBeLessThan(last);
      expect(v).toBeGreaterThanOrEqual(0);
      last = v;
    }
    expect(lampLift(tile, 300 + 230, 150)).toBeCloseTo(Math.exp(-1), 6);
  });
  it('measures from the nearest edge, so a corner counts both ways', () => {
    expect(lampDistance(tile, 300 + 30, 200 + 40)).toBeCloseTo(50, 6);
    expect(lampLift(tile, 300 + 30, 200 + 40)).toBeCloseTo(Math.exp(-(((30 ** 2 + 40 ** 2) ** 0.5 / 230) ** 2)), 6);
  });
});

describe('the shadow a tile casts', () => {
  const tile = { x: 600, y: 300, w: 200, h: 100 };
  const len = (c: { dx: number; dy: number }) => Math.hypot(c.dx, c.dy);

  it('points away from the lamp, from every side', () => {
    const left = castAt(tile, 100, 350), right = castAt(tile, 1400, 350), above = castAt(tile, 700, -200), below = castAt(tile, 700, 900);
    expect(left.dx).toBeGreaterThan(0);
    expect(Math.abs(left.dy)).toBeLessThan(1);
    expect(right.dx).toBeLessThan(0);
    expect(above.dy).toBeGreaterThan(0);
    expect(below.dy).toBeLessThan(0);
  });
  it('lengthens with the tile\'s distance from the lamp, between CAST_MIN and CAST_MAX', () => {
    let last = 0;
    for (const d of [0, 60, 150, 300, 600, 1200, 3000]) {
      const l = len(castAt(tile, 600 - d, 350));
      expect(l).toBeGreaterThan(last);
      expect(l).toBeGreaterThanOrEqual(CAST_MIN - 1e-9);
      expect(l).toBeLessThanOrEqual(CAST_MAX + 1e-9);
      last = l;
    }
  });
  it('falls straight down, short, from a lamp right on the tile\'s middle', () => {
    const c = castAt(tile, 700, 350);
    expect(c.dx).toBe(0);
    expect(c.dy).toBeCloseTo(CAST_MIN, 6);
  });
  it('fades with the distance, but never to nothing', () => {
    const near = castAt(tile, 700, 350).strength, far = castAt(tile, -2000, 350).strength;
    expect(near).toBeCloseTo(1, 6);
    expect(far).toBeGreaterThan(0.39);
    expect(far).toBeLessThan(near);
  });
});

describe('the lamp by itself', () => {
  const box = { cw: 1440, ch: 800, top: 120, vh: 900 };

  it('starts upper right of the middle on the wall, and in the window on a phone', () => {
    expect(lampStart(box, false)).toEqual({ x: 1440 * 0.64, y: 800 * 0.36 });
    expect(lampStart({ cw: 390, ch: 2400, top: 150, vh: 800 }, true)).toEqual({ x: 390 * 0.64, y: 800 * 0.45 - 150 });
  });
  it('drifts inside the wall, and slowly', () => {
    let prev = driftTarget(0, box, false);
    let worst = 0;
    for (let t = 0.1; t < 300; t += 0.1) {
      const at = driftTarget(t, box, false);
      expect(at.x).toBeGreaterThanOrEqual(box.cw * 0.15);
      expect(at.x).toBeLessThanOrEqual(box.cw * 0.85);
      expect(at.y).toBeGreaterThanOrEqual(box.ch * 0.1);
      expect(at.y).toBeLessThanOrEqual(box.ch * 0.9);
      worst = Math.max(worst, Math.hypot(at.x - prev.x, at.y - prev.y));
      prev = at;
    }
    // under 60 px every tenth of a second: a wander, not a dash
    expect(worst).toBeLessThan(60);
  });
  it('sweeps across the middle of the window on a phone, wherever the wall has scrolled to', () => {
    for (const top of [150, -400, -1500]) {
      const phoneBox = { cw: 390, ch: 2400, top, vh: 800 };
      for (let t = 0; t < 120; t += 1) {
        const at = driftTarget(t, phoneBox, true);
        const inWindowY = at.y + top;
        expect(inWindowY).toBeGreaterThanOrEqual(800 * 0.5 - 70 - 1e-9);
        expect(inWindowY).toBeLessThanOrEqual(800 * 0.5 + 70 + 1e-9);
        expect(at.x).toBeGreaterThanOrEqual(390 * 0.18 - 1e-9);
        expect(at.x).toBeLessThanOrEqual(390 * 0.82 + 1e-9);
      }
    }
  });
  it('keeps the lamp in the window on a tablet wall that is taller than the window', () => {
    // 1024x768 and 820x1180: the tablet map is 1.95 widths and a bit tall, so 0.36 of it is far below the fold
    for (const [vw, vh, top] of [[1024, 768, 260], [820, 1180, 250], [768, 1024, 240]] as const) {
      const box = { cw: vw - 49, ch: 1.95 * (vw - 49) + 189, top, vh };
      const start = lampStart(box, false);
      expect(start.y + top, `start ${vw}x${vh}`).toBeGreaterThanOrEqual(vh * 0.2 - 1e-9);
      expect(start.y + top, `start ${vw}x${vh}`).toBeLessThanOrEqual(vh * 0.7 + 1e-9);
      // and still when the visitor has scrolled the wall up
      for (const scrolled of [top, -300, -900]) {
        const b = { ...box, top: scrolled };
        const s = lampStart(b, false);
        expect(s.y + scrolled).toBeGreaterThanOrEqual(vh * 0.2 - 1e-9);
        expect(s.y + scrolled).toBeLessThanOrEqual(vh * 0.7 + 1e-9);
        for (let t = 0; t < 200; t += 0.5) {
          const at = driftTarget(t, b, false);
          expect(at.y + scrolled).toBeGreaterThanOrEqual(vh * 0.2 - 1e-9);
          expect(at.y + scrolled).toBeLessThanOrEqual(vh * 0.7 + 1e-9);
        }
      }
    }
  });
  it('leaves a wall that fits the window where it was', () => {
    for (const [ch, top, vh] of [[680, 220, 900], [860, 220, 1080], [540, 220, 640], [480, 220, 700]] as const) {
      expect(inView(ch * 0.36, { cw: 1440, ch, top, vh })).toBeCloseTo(ch * 0.36, 9);
    }
  });
});
