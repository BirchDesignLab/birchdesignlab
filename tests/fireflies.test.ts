import { describe, it, expect } from 'vitest';
import { createFlies, stepFlies, scatter, type Vec3 } from '../src/experiments/bdl-007/fireflies';

const dist = (a: Vec3, b: Vec3) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const speed = (v: Vec3) => Math.hypot(v[0], v[1], v[2]);

describe('createFlies', () => {
  it('is deterministic for the same seed', () => {
    const a = createFlies(10, 2, 7);
    const b = createFlies(10, 2, 7);
    expect(a).toEqual(b);
  });

  it('differs across seeds and spawns inside bounds', () => {
    const a = createFlies(10, 2, 7);
    const c = createFlies(10, 2, 8);
    expect(a).not.toEqual(c);
    for (const f of a) expect(speed(f.pos)).toBeLessThanOrEqual(2);
  });
});

describe('stepFlies', () => {
  const targets: Vec3[] = [[0.5, 1, 0], [-0.5, 0.8, 0.2]];

  it('gather mode pulls flies toward their targets', () => {
    const flies = createFlies(20, 2, 1);
    const before =
      flies.reduce((s, f) => s + dist(f.pos, targets[f.target % targets.length]), 0) / flies.length;
    for (let i = 0; i < 600; i++) {
      stepFlies(flies, { mode: 'gather', dt: 1 / 60, time: i / 60, targets, bounds: 2 });
    }
    const after =
      flies.reduce((s, f) => s + dist(f.pos, targets[f.target % targets.length]), 0) / flies.length;
    expect(after).toBeLessThan(before * 0.5);
  });

  it('never exceeds the speed clamp', () => {
    const flies = createFlies(20, 2, 2);
    scatter(flies, 10, 3); // absurd burst on purpose
    for (let i = 0; i < 120; i++) {
      stepFlies(flies, { mode: 'wander', dt: 1 / 60, time: i / 60, targets, bounds: 2 });
      for (const f of flies) expect(speed(f.vel)).toBeLessThanOrEqual(0.9 + 1e-9);
    }
  });

  it('wander keeps flies near the volume', () => {
    const flies = createFlies(20, 2, 4);
    for (let i = 0; i < 1200; i++) {
      stepFlies(flies, { mode: 'wander', dt: 1 / 60, time: i / 60, targets, bounds: 2 });
    }
    for (const f of flies) expect(speed(f.pos)).toBeLessThan(2 * 1.6);
  });
});

describe('scatter', () => {
  it('kicks velocity and is deterministic per seed', () => {
    const a = createFlies(5, 2, 9);
    const b = createFlies(5, 2, 9);
    scatter(a, 1.5, 42);
    scatter(b, 1.5, 42);
    expect(a).toEqual(b);
    expect(a.some((f, i) => speed(f.vel) > speed(createFlies(5, 2, 9)[i].vel))).toBe(true);
  });
});
