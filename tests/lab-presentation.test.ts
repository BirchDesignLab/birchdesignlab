import { describe, expect, it } from 'vitest';
import {
  ENTRANCES, LAB_PRESENTATION, TEXTURES, barkTile, lockIn, motionTiming, normalise, sameSetting,
  textureOpacity, type LabPresentation,
} from '../src/lib/lab-presentation';

/**
 * The Lab's texture and motion model (src/lib/lab-presentation.ts): the
 * numbers the bench (BDL-006), the catalog and the lock-in all share.
 */
describe('lab presentation', () => {
  it('ships a valid setting', () => {
    expect(sameSetting(normalise(LAB_PRESENTATION), LAB_PRESENTATION)).toBe(true);
  });

  it('normalises junk to the base setting', () => {
    for (const junk of [null, undefined, 'x', 4, [], { texture: 'velvet', amount: 'lots', motion: Number.NaN, entrance: 7 }]) {
      expect(normalise(junk)).toEqual(LAB_PRESENTATION);
    }
  });

  it('clamps and rounds the dials, keeps known names', () => {
    expect(normalise({ texture: 'laid', amount: 140.6, motion: -3, entrance: 'draw' })).toEqual({
      texture: 'laid', amount: 100, motion: 0, entrance: 'draw',
    });
    expect(normalise({ amount: 33.4 }).amount).toBe(33);
  });

  it('draws nothing at amount 0 or texture none, and more as the amount rises', () => {
    for (const texture of TEXTURES) {
      const at = (amount: number) => textureOpacity({ ...LAB_PRESENTATION, texture, amount });
      expect(at(0)).toBe(0);
      if (texture === 'none') expect(at(100)).toBe(0);
      else {
        expect(at(50)).toBeGreaterThan(0);
        expect(at(100)).toBeGreaterThan(at(50));
        expect(at(100)).toBeLessThanOrEqual(0.6);
      }
    }
  });

  it('runs no motion at 0, and slower, further and wider apart as the budget rises', () => {
    expect(motionTiming(0)).toBeNull();
    const low = motionTiming(10)!;
    const high = motionTiming(100)!;
    expect(high.duration).toBeGreaterThan(low.duration);
    expect(high.distance).toBeGreaterThan(low.distance);
    expect(high.stagger).toBeGreaterThan(low.stagger);
    // A catalog of eleven rows must not take an age to arrive at full budget.
    expect(high.duration).toBeLessThanOrEqual(1.2);
  });

  it('makes the same bark tile for the same seed, as a CSS url()', () => {
    expect(barkTile(6)).toBe(barkTile(6));
    expect(barkTile(6)).not.toBe(barkTile(7));
    expect(barkTile(6)).toMatch(/^url\("data:image\/svg\+xml,%3Csvg/);
    expect(decodeURIComponent(barkTile(6, 12)).match(/<rect /g)).toHaveLength(12);
  });

  it('prints a lock-in that names the file and parses back to the setting', () => {
    for (const entrance of ENTRANCES) {
      const p: LabPresentation = { texture: 'paper', amount: 42, motion: 65, entrance };
      const text = lockIn(p);
      expect(text).toContain('src/lib/lab-presentation.ts');
      const literal = /LAB_PRESENTATION: LabPresentation = (\{.*\});/.exec(text)![1];
      const parsed = JSON.parse(literal.replace(/(\w+):/g, '"$1":').replace(/'/g, '"'));
      expect(normalise(parsed)).toEqual(p);
    }
  });
});
