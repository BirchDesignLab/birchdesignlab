import { describe, it, expect } from 'vitest';
import { mulberry32, hashString, generateBark } from '../src/lib/bark/pattern';
import { resolveSeed, DEFAULT_SEED_STRATEGY } from '../src/lib/bark/seed';

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(42), b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it('yields values in [0,1)', () => {
    const r = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('hashString', () => {
  it('is deterministic and unsigned 32-bit', () => {
    expect(hashString('birch')).toBe(hashString('birch'));
    expect(hashString('birch')).toBeGreaterThanOrEqual(0);
    expect(hashString('birch')).toBeLessThanOrEqual(0xffffffff);
    expect(hashString('birch')).not.toBe(hashString('fathom'));
  });
});

describe('generateBark', () => {
  it('same seed → identical pattern', () => {
    expect(generateBark(123)).toEqual(generateBark(123));
  });
  it('different seeds → different patterns', () => {
    expect(generateBark(1)).not.toEqual(generateBark(2));
  });
  it('respects density', () => {
    expect(generateBark(5, { density: 40 })).toHaveLength(40);
    expect(generateBark(5)).toHaveLength(140);
  });
  it('keeps every dash within documented bounds', () => {
    for (const d of generateBark(99, { density: 300 })) {
      expect(d.x).toBeGreaterThanOrEqual(0); expect(d.x).toBeLessThanOrEqual(1);
      expect(d.y).toBeGreaterThanOrEqual(0); expect(d.y).toBeLessThanOrEqual(1);
      expect(d.w).toBeGreaterThanOrEqual(0.02); expect(d.w).toBeLessThanOrEqual(0.14);
      expect(d.h).toBeGreaterThanOrEqual(0.002); expect(d.h).toBeLessThanOrEqual(0.01);
      expect(Math.abs(d.rot)).toBeLessThanOrEqual(0.06);
      expect(d.shade).toBeGreaterThanOrEqual(0); expect(d.shade).toBeLessThanOrEqual(1);
    }
  });
});

describe('resolveSeed', () => {
  it('defaults to the date strategy', () => {
    expect(DEFAULT_SEED_STRATEGY).toBe('date');
    expect(resolveSeed()).toBe(resolveSeed('date'));
  });
  it('page strategy hashes the pathname deterministically', () => {
    expect(resolveSeed('page', '/lab')).toBe(resolveSeed('page', '/lab'));
    expect(resolveSeed('page', '/lab')).not.toBe(resolveSeed('page', '/about'));
  });
});
