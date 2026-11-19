/**
 * Stage 6 R1 (G7): orbs ease away from the cursor (orb-repel.ts), shared by
 * light.ts (every page's CSS-driven orbs) and lens/orbs-clock.ts (Home).
 */
import { describe, it, expect } from 'vitest';
import { REPEL, repelTarget, easeStep } from '../src/themes/glassmorphism/orb-repel';

describe('repelTarget', () => {
  it('pushes away from the cursor', () => {
    const [x, y] = repelTarget(500, 300, 150, 420, 300);
    expect(x).toBeGreaterThan(0);
    expect(y).toBeCloseTo(0);
    const [x2, y2] = repelTarget(500, 300, 150, 500, 380);
    expect(x2).toBeCloseTo(0);
    expect(y2).toBeLessThan(0);
  });

  it('is zero beyond reach past the edge', () => {
    expect(repelTarget(0, 0, 100, 100 + REPEL.reach + 1, 0)).toEqual([0, 0]);
  });

  it('grows as the cursor nears the centre, capped by maxPush and the radius', () => {
    const far = Math.hypot(...repelTarget(0, 0, 200, 300, 0));
    const near = Math.hypot(...repelTarget(0, 0, 200, 40, 0));
    expect(near).toBeGreaterThan(far);
    expect(near).toBeLessThanOrEqual(REPEL.maxPush);
    expect(Math.hypot(...repelTarget(0, 0, 40, 1, 0))).toBeLessThanOrEqual(40 * 0.4);
  });

  it('never returns NaN with the cursor on the centre', () => {
    const [x, y] = repelTarget(10, 10, 100, 10, 10);
    expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
  });
});

describe('easeStep', () => {
  it('moves part of the way, then snaps when settled', () => {
    const a = easeStep(0, 40, 16);
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(40);
    let v = 0;
    for (let i = 0; i < 400; i++) v = easeStep(v, 40, 16);
    expect(v).toBe(40);
    expect(easeStep(40, 40, 16)).toBe(40);
  });
});
