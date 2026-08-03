import { describe, it, expect } from 'vitest';
import {
  hexToOklch,
  oklchToHex,
  hueDelta,
  rampStop,
  anchoredRamp,
  DEFAULT_SHAPE,
} from '../src/lib/oklch';
import { contrast } from '../src/lib/color';

const DARK_FIELD = '#1c1a17';
const LIGHT_FIELD = '#f5f1e8';
const MOSS = '#a3bd8f';
const FOREST = '#2b4a37';

describe('conversion', () => {
  it('round-trips house colors through OKLCH', () => {
    for (const hex of [MOSS, FOREST, DARK_FIELD, LIGHT_FIELD, '#ffffff', '#000000']) {
      expect(oklchToHex(hexToOklch(hex))).toBe(hex);
    }
  });
  it('always emits six digits, since draw2d falls back to white otherwise', () => {
    for (const hex of [MOSS, '#000000', '#ffffff']) {
      expect(oklchToHex(hexToOklch(hex))).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
  it('gamut-maps out-of-range chroma instead of emitting garbage', () => {
    const hex = oklchToHex({ l: 0.5, c: 0.9, h: 140 });
    expect(hex).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('hueDelta', () => {
  it('takes the short way round', () => {
    expect(hueDelta(350, 10)).toBe(20);
    expect(hueDelta(10, 350)).toBe(-20);
    expect(hueDelta(0, 90)).toBe(90);
  });
});

describe('rampStop', () => {
  const base = hexToOklch(MOSS);
  it('runs to neutral at both ends of the cosine taper', () => {
    expect(rampStop(base, 0).c).toBeCloseTo(0, 6);
    expect(rampStop(base, 1).c).toBeCloseTo(0, 6);
    expect(rampStop(base, 0.5).c).toBeCloseTo(base.c, 6);
  });
  it('drifts darks toward blue and lights toward warm', () => {
    const seed = base.h;
    expect(hueDelta(seed, rampStop(base, 0).h)).toBeGreaterThan(0); // moss 140 -> blue 264
    expect(hueDelta(seed, rampStop(base, 1).h)).toBeLessThan(0); // moss 140 -> paper 84
  });
  it('holds the seed hue at mid-lightness', () => {
    expect(rampStop(base, 0.5).h).toBeCloseTo(base.h, 6);
  });
  it('spins the seed hue without touching the anchors', () => {
    const spun = rampStop(base, 0.5, { ...DEFAULT_SHAPE, spin: 40 });
    expect(hueDelta(base.h, spun.h)).toBeCloseTo(40, 6);
  });
});

describe('anchoredRamp', () => {
  it('hits its WCAG targets on the dark face', () => {
    for (const stop of anchoredRamp(MOSS, DARK_FIELD)) {
      expect(Math.abs(stop.ratio - stop.target)).toBeLessThan(0.1);
      expect(contrast(stop.hex, DARK_FIELD)).toBeCloseTo(stop.ratio, 6);
    }
  });
  it('hits its WCAG targets on the light face', () => {
    for (const stop of anchoredRamp(FOREST, LIGHT_FIELD)) {
      expect(Math.abs(stop.ratio - stop.target)).toBeLessThan(0.1);
    }
  });
  it('climbs away from a dark field and descends from a light one', () => {
    const dark = anchoredRamp(MOSS, DARK_FIELD);
    const light = anchoredRamp(FOREST, LIGHT_FIELD);
    expect(dark.map((s) => s.l)).toEqual([...dark.map((s) => s.l)].sort((a, b) => a - b));
    expect(light.map((s) => s.l)).toEqual([...light.map((s) => s.l)].sort((a, b) => b - a));
    expect(dark[0].l).toBeGreaterThan(hexToOklch(DARK_FIELD).l);
    expect(light[0].l).toBeLessThan(hexToOklch(LIGHT_FIELD).l);
  });
  it('rises monotonically through the targets', () => {
    const stops = anchoredRamp(MOSS, DARK_FIELD);
    for (let i = 1; i < stops.length; i++) {
      expect(stops[i].ratio).toBeGreaterThan(stops[i - 1].ratio);
    }
  });
  it('stays in hex for every stop', () => {
    for (const stop of anchoredRamp(MOSS, DARK_FIELD)) {
      expect(stop.hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
