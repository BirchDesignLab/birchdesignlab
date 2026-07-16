import { describe, it, expect } from 'vitest';
import { isWarpOver, shaftAt, treadleAt, lcm, type Draft } from '../src/lib/weave/draft';

/** 4-shaft plain weave: odd shafts vs even shafts. */
const plain: Draft = {
  shafts: 4,
  treadles: 6,
  threading: [0, 1, 2, 3],
  tieUp: [
    [true, false, true, false],   // treadle 0 lifts shafts 0 and 2
    [false, true, false, true],   // treadle 1 lifts shafts 1 and 3
    [false, false, false, false],
    [false, false, false, false],
    [false, false, false, false],
    [false, false, false, false],
  ],
  treadling: [0, 1],
};

/** 2/2 twill: adjacent shaft pairs, straight treadling. */
const twill: Draft = {
  shafts: 4,
  treadles: 6,
  threading: [0, 1, 2, 3],
  tieUp: [
    [true, true, false, false],
    [false, true, true, false],
    [false, false, true, true],
    [true, false, false, true],
    [false, false, false, false],
    [false, false, false, false],
  ],
  treadling: [0, 1, 2, 3],
};

describe('indexing repeats', () => {
  it('threading and treadling wrap', () => {
    expect(shaftAt(plain, 0)).toBe(0);
    expect(shaftAt(plain, 4)).toBe(0);
    expect(shaftAt(plain, 6)).toBe(2);
    expect(treadleAt(plain, 2)).toBe(0);
    expect(treadleAt(plain, 5)).toBe(1);
  });
});

describe('plain weave interlacement', () => {
  it('checkerboards', () => {
    expect(isWarpOver(plain, 0, 0)).toBe(true);
    expect(isWarpOver(plain, 1, 0)).toBe(false);
    expect(isWarpOver(plain, 0, 1)).toBe(false);
    expect(isWarpOver(plain, 1, 1)).toBe(true);
  });
});

describe('2/2 twill interlacement', () => {
  it('makes a diagonal: each pick lifts two adjacent shafts, shifted by one per pick', () => {
    // pick 0 lifts shafts 0,1 so ends 0,1 are over and ends 2,3 under
    expect([0, 1, 2, 3].map((e) => isWarpOver(twill, e, 0))).toEqual([true, true, false, false]);
    // pick 1 lifts shafts 1,2
    expect([0, 1, 2, 3].map((e) => isWarpOver(twill, e, 1))).toEqual([false, true, true, false]);
    // pick 3 wraps: lifts shafts 3,0
    expect([0, 1, 2, 3].map((e) => isWarpOver(twill, e, 3))).toEqual([true, false, false, true]);
  });
});

describe('lcm', () => {
  it('computes least common multiple', () => {
    expect(lcm(4, 6)).toBe(12);
    expect(lcm(1, 5)).toBe(5);
    expect(lcm(8, 8)).toBe(8);
  });
});
