import { describe, expect, it } from 'vitest';
import {
  DESKTOP_QUERY, FINE_POINTER_QUERY, LAMP_ATTR, LAMP_KEY, bulbShows, driftTarget, lampRuns, lampStart, readLamp, rimLit, writeLamp,
} from '../src/lib/lab-wall/lamp';
import { PHONE_BELOW } from '../src/lib/lab-wall/layout';

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
  const where = (over: Partial<Parameters<typeof lampRuns>[0]>) => ({ on: true, light: false, finePointer: false, desktop: false, ...over });

  it('runs in dark everywhere: phones, touch, narrow windows', () => {
    for (const finePointer of [true, false]) {
      for (const desktop of [true, false]) expect(lampRuns(where({ finePointer, desktop }))).toBe(true);
    }
  });
  it('runs in light only with a fine pointer at desktop layout', () => {
    expect(lampRuns(where({ light: true, finePointer: true, desktop: true }))).toBe(true);
    expect(lampRuns(where({ light: true, finePointer: true, desktop: false }))).toBe(false);
    expect(lampRuns(where({ light: true, finePointer: false, desktop: true }))).toBe(false);
    expect(lampRuns(where({ light: true, finePointer: false, desktop: false }))).toBe(false);
  });
  it('never runs when the visitor turned it off', () => {
    expect(lampRuns(where({ on: false }))).toBe(false);
    expect(lampRuns(where({ on: false, light: true, finePointer: true, desktop: true }))).toBe(false);
  });
});

describe('where the bulb shows', () => {
  const base = { light: false, finePointer: false, desktop: false };

  it('shows in the wall view where the lamp could run', () => {
    expect(bulbShows({ ...base, view: 'wall' })).toBe(true);
    expect(bulbShows({ ...base, view: 'wall', light: true, finePointer: true, desktop: true })).toBe(true);
  });
  it('is hidden in the list, and on a phone or touch screen in light', () => {
    expect(bulbShows({ ...base, view: 'list' })).toBe(false);
    expect(bulbShows({ ...base, view: 'wall', light: true })).toBe(false);
    expect(bulbShows({ ...base, view: 'wall', light: true, finePointer: true })).toBe(false);
    expect(bulbShows({ ...base, view: 'wall', light: true, desktop: true })).toBe(false);
  });
  it('is shown whether or not the lamp is switched on: it is the switch', () => {
    // bulbShows takes no choice; a visitor who turned the lamp off still needs the bulb to turn it back on.
    expect(bulbShows({ ...base, view: 'wall' })).toBe(true);
  });
});

describe('the media queries the CSS repeats', () => {
  it('ask for a fine hovering pointer and the desktop layout', () => {
    expect(FINE_POINTER_QUERY).toBe('(hover: hover) and (pointer: fine)');
    expect(DESKTOP_QUERY).toBe(`(min-width: ${PHONE_BELOW}px)`);
    expect(PHONE_BELOW).toBe(720);
  });
});

describe('the glow on a tile', () => {
  const tile = { x: 100, y: 100, w: 200, h: 100 };

  it('is full while the lamp is over the tile, edge included', () => {
    expect(rimLit(tile, 200, 150)).toBe(1);
    expect(rimLit(tile, 100, 100)).toBe(1);
    expect(rimLit(tile, 300, 200)).toBe(1);
  });
  it('falls off smoothly with the distance from the tile edge, never below zero', () => {
    let last = 1;
    for (const d of [20, 60, 120, 230, 400, 800]) {
      const v = rimLit(tile, 300 + d, 150);
      expect(v).toBeLessThan(last);
      expect(v).toBeGreaterThanOrEqual(0);
      last = v;
    }
    expect(rimLit(tile, 300 + 230, 150)).toBeCloseTo(Math.exp(-1), 6);
  });
  it('measures from the nearest edge, so a corner counts both ways', () => {
    expect(rimLit(tile, 300 + 30, 200 + 40)).toBeCloseTo(Math.exp(-(((30 ** 2 + 40 ** 2) ** 0.5 / 230) ** 2)), 6);
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
});
