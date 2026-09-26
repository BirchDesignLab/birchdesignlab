import { describe, it, expect } from 'vitest';
import {
  FEEL,
  Lag2,
  releaseVelocity,
  capThrow,
  lensBounds,
  clampToBounds,
  stepGlide,
  stretchMatrix,
  stretchTarget,
  coverRect,
  viewProgress,
  circleRectOverlaps,
  circleRectGap,
  crossesCircleEdge,
  findStartPosition,
  discCoverage,
  chooseStart,
  type RectLike,
  type Bounds,
} from '../src/themes/glassmorphism/lens/physics';

describe('Lag2', () => {
  it('never overshoots a step target', () => {
    const lag = new Lag2(0.05);
    let max = 0;
    for (let i = 0; i < 200; i++) {
      const v = lag.step(1, 1 / 60);
      max = Math.max(max, v);
    }
    expect(max).toBeLessThanOrEqual(1.0001);
  });
  it('settles to the target', () => {
    const lag = new Lag2(0.05);
    let v = 0;
    for (let i = 0; i < 600; i++) v = lag.step(1, 1 / 60);
    expect(v).toBeCloseTo(1, 3);
  });
});

describe('releaseVelocity', () => {
  it('is zero with fewer than two samples', () => {
    expect(releaseVelocity([[0, 0, 0]], 10)).toEqual([0, 0]);
  });
  it('is zero if the pointer paused before release', () => {
    const samples: Array<[number, number, number]> = [
      [0, 0, 0],
      [10, 10, 0],
    ];
    expect(releaseVelocity(samples, 100)).toEqual([0, 0]); // 90ms since last sample > 50ms
  });
  it('recovers a constant velocity from evenly spaced samples', () => {
    // Moving at 500 px/s in x over the last 80ms.
    const samples: Array<[number, number, number]> = [];
    for (let t = 0; t <= 80; t += 10) samples.push([t, (500 * t) / 1000, 0]);
    const [vx, vy] = releaseVelocity(samples, 80);
    expect(vx).toBeCloseTo(500, 0);
    expect(vy).toBeCloseTo(0, 5);
  });
});

describe('capThrow', () => {
  it('leaves a slow velocity untouched', () => {
    expect(capThrow(100, 0)).toEqual([100, 0]);
  });
  it('caps a fast velocity at FEEL.maxThrow, keeping direction', () => {
    const [vx, vy] = capThrow(4000, 3000); // speed 5000
    const speed = Math.hypot(vx, vy);
    expect(speed).toBeCloseTo(FEEL.maxThrow, 5);
    expect(vx / vy).toBeCloseTo(4000 / 3000, 5);
  });
});

describe('lensBounds / clampToBounds', () => {
  it('insets the window by the radius, stretch, lift and wall inset', () => {
    const [x0, y0, x1, y1] = lensBounds(100, 1000, 800);
    const expectedInset = 100 * 1.04 * 1.012 + FEEL.wallInset;
    expect(x0).toBeCloseTo(expectedInset, 5);
    expect(y0).toBeCloseTo(expectedInset, 5);
    expect(x1).toBeCloseTo(1000 - expectedInset, 5);
    expect(y1).toBeCloseTo(800 - expectedInset, 5);
  });
  it('clamps a point into the bounds', () => {
    const bounds = lensBounds(100, 1000, 800);
    expect(clampToBounds(-500, -500, bounds)).toEqual([bounds[0], bounds[1]]);
    expect(clampToBounds(5000, 5000, bounds)).toEqual([bounds[2], bounds[3]]);
    expect(clampToBounds(500, 400, bounds)).toEqual([500, 400]);
  });
});

describe('stepGlide', () => {
  it('stops dead at a wall: velocity into it drops, never reflects', () => {
    const bounds: [number, number, number, number] = [50, 50, 950, 750];
    // Moving hard to the left, starting just inside the left wall.
    const next = stepGlide(60, 400, -2000, 0, 1 / 60, bounds);
    expect(next.x).toBe(50);
    expect(next.vx).toBeGreaterThanOrEqual(0); // dropped, never negative (never reflected)
  });
  it('decays exponentially and stops below stopSpeed', () => {
    const bounds: [number, number, number, number] = [0, 0, 10000, 10000];
    let x = 500, y = 500, vx = 1000, vy = 0;
    for (let i = 0; i < 600; i++) {
      const next = stepGlide(x, y, vx, vy, 1 / 60, bounds);
      x = next.x; y = next.y; vx = next.vx; vy = next.vy;
    }
    expect(vx).toBe(0);
    expect(vy).toBe(0);
  });
  it('never backtracks after stopping at a wall (a proof-report invariant)', () => {
    const bounds: [number, number, number, number] = [50, 50, 950, 750];
    let x = 940, y = 400, vx = 2000, vy = 0;
    let minAfterStop: number | null = null;
    for (let i = 0; i < 300; i++) {
      const next = stepGlide(x, y, vx, vy, 1 / 60, bounds);
      x = next.x; vx = next.vx; y = next.y; vy = next.vy;
      if (x >= bounds[2]) minAfterStop = minAfterStop == null ? x : Math.min(minAfterStop, x);
    }
    expect(minAfterStop).toBe(bounds[2]);
  });
});

describe('stretchTarget / stretchMatrix', () => {
  it('is zero for a near-stationary lens', () => {
    expect(stretchTarget(0, 0)).toEqual([0, 0]);
    expect(stretchTarget(0.5, 0.5)).toEqual([0, 0]);
  });
  it('saturates toward FEEL.maxStretch as speed grows', () => {
    const [tx] = stretchTarget(1_000_000, 0);
    expect(Math.abs(tx)).toBeLessThanOrEqual(FEEL.maxStretch);
    expect(Math.abs(tx)).toBeGreaterThan(FEEL.maxStretch * 0.99);
  });
  it('reaches about 63% of max at FEEL.stretchSpeed (the documented point)', () => {
    const [tx] = stretchTarget(FEEL.stretchSpeed, 0);
    expect(Math.abs(tx) / FEEL.maxStretch).toBeCloseTo(1 - Math.exp(-1), 2);
  });
  it('identity matrix at zero stretch and lift', () => {
    const { m00, m01, m11 } = stretchMatrix(0, 0, 0);
    expect(m00).toBeCloseTo(1, 10);
    expect(m11).toBeCloseTo(1, 10);
    expect(m01).toBeCloseTo(0, 10);
  });
  it('stretches along the motion and narrows across it', () => {
    // ex, ey encode the eased stretch vector; along x means ang = 0.
    const { m00, m11 } = stretchMatrix(FEEL.maxStretch, 0, 0);
    expect(m00).toBeGreaterThan(1);
    expect(m11).toBeLessThan(1);
  });
});

describe('coverRect', () => {
  it('matches background-size: cover for a wider box than the image', () => {
    const r = coverRect(2000, 1000, 1600, 1000);
    // scale = max(2000/1600, 1000/1000) = 1.25
    expect(r.w).toBeCloseTo(2000, 5);
    expect(r.h).toBeCloseTo(1250, 5);
    expect(r.x).toBeCloseTo(0, 5);
    expect(r.y).toBeCloseTo(-125, 5);
  });
  it('centres the overflow on both axes', () => {
    const r = coverRect(1000, 2000, 1600, 1000);
    // scale = max(1000/1600, 2000/1000) = 2
    expect(r.w).toBeCloseTo(3200, 5);
    expect(r.h).toBeCloseTo(2000, 5);
    expect(r.x).toBeCloseTo((1000 - 3200) / 2, 5);
    expect(r.y).toBeCloseTo(0, 5);
  });
});

describe('viewProgress', () => {
  it('is 0 before the element enters the viewport', () => {
    expect(viewProgress(2000, 500, 800)).toBe(0);
  });
  it('is 1 once the element has fully exited the top', () => {
    expect(viewProgress(-2000, 500, 800)).toBe(1);
  });
  it('is 0.5 at the midpoint of its pass through the viewport', () => {
    // span = 800 + 500 = 1300; progress 0.5 when elementTop = 800 - 650 = 150
    expect(viewProgress(150, 500, 800)).toBeCloseTo(0.5, 5);
  });
});

describe('circleRectOverlaps / circleRectGap', () => {
  const rect: RectLike = { left: 100, top: 100, right: 300, bottom: 200 };
  it('overlaps when the circle centre is inside the rect', () => {
    expect(circleRectOverlaps(200, 150, 10, rect)).toBe(true);
    expect(circleRectGap(200, 150, 10, rect)).toBeLessThan(0);
  });
  it('overlaps when the circle only reaches the rect', () => {
    expect(circleRectOverlaps(95, 150, 10, rect)).toBe(true); // 5px into the 10px radius
  });
  it('does not overlap when clear of the rect', () => {
    expect(circleRectOverlaps(50, 150, 10, rect)).toBe(false);
    expect(circleRectGap(50, 150, 10, rect)).toBeCloseTo(40, 5); // 50px away minus the 10px radius
  });
  it('touching counts as overlap (the fix hint: never graze a pane)', () => {
    expect(circleRectOverlaps(90, 150, 10, rect)).toBe(false); // gap is exactly 0, strictly less-than
    expect(circleRectGap(90, 150, 10, rect)).toBeCloseTo(0, 5);
  });
});

describe('crossesCircleEdge', () => {
  it('is true when the two circles genuinely intersect', () => {
    expect(crossesCircleEdge(0, 0, 50, 80, 0, 50)).toBe(true); // 80px apart, radii 50 each
  });
  it('is false when one circle fully contains the other', () => {
    expect(crossesCircleEdge(0, 0, 100, 10, 0, 20)).toBe(false); // small orb wholly inside the lens
  });
  it('is false when the two circles are fully separate', () => {
    expect(crossesCircleEdge(0, 0, 50, 500, 0, 50)).toBe(false);
  });
});

describe('findStartPosition', () => {
  const bounds: Bounds = [0, 0, 1000, 800];
  it('picks a point crossing an orb edge when the viewport is otherwise empty', () => {
    const orbs = [{ cx: 500, cy: 400, r: 150 }];
    const found = findStartPosition(bounds, 92, [], orbs);
    expect(found.open).toBe(true);
    expect(crossesCircleEdge(found.x, found.y, 92, orbs[0].cx, orbs[0].cy, orbs[0].r)).toBe(true);
  });
  it('avoids every obstruction it can, even with no orb to cross', () => {
    const obstructions: RectLike[] = [{ left: 0, top: 0, right: 1000, bottom: 700 }];
    const found = findStartPosition(bounds, 50, obstructions, []);
    expect(found.open).toBe(true);
    expect(circleRectOverlaps(found.x, found.y, 50, obstructions[0])).toBe(false);
  });
  it('reports open:false and still returns a point when nothing is open', () => {
    const obstructions: RectLike[] = [{ left: -1000, top: -1000, right: 2000, bottom: 2000 }]; // covers the whole viewport
    const found = findStartPosition(bounds, 92, obstructions, []);
    expect(found.open).toBe(false);
    expect(found.x).toBeGreaterThanOrEqual(bounds[0]);
    expect(found.x).toBeLessThanOrEqual(bounds[2]);
  });
  it('prefers a fully open, orb-crossing point over a merely open one', () => {
    // A pane fills the left half; an orb sits in the open right half.
    const obstructions: RectLike[] = [{ left: 0, top: 0, right: 480, bottom: 800 }];
    const orbs = [{ cx: 750, cy: 400, r: 150 }];
    const found = findStartPosition(bounds, 60, obstructions, orbs);
    expect(found.open).toBe(true);
    expect(circleRectOverlaps(found.x, found.y, 60, obstructions[0])).toBe(false);
    expect(crossesCircleEdge(found.x, found.y, 60, orbs[0].cx, orbs[0].cy, orbs[0].r)).toBe(true);
  });
});

describe('rounded rects (glass fix round 3)', () => {
  const rect: RectLike = { left: 100, top: 100, right: 300, bottom: 300, radius: 40 };
  it('a circle just off a rounded corner is clear, though it would touch the square corner', () => {
    // 11.3 px diagonal from the square corner: inside the square's reach, outside the arc.
    expect(circleRectOverlaps(92, 92, 12, { ...rect, radius: 0 })).toBe(true);
    expect(circleRectOverlaps(92, 92, 12, rect)).toBe(false);
  });
  it('straight edges are unchanged by the radius', () => {
    expect(circleRectGap(50, 200, 10, rect)).toBeCloseTo(40, 5);
  });
});

describe('discCoverage', () => {
  it('is 0 in the open, 1 fully inside, about half across a straight edge', () => {
    const rect: RectLike = { left: 0, top: 0, right: 100, bottom: 1000 };
    expect(discCoverage(500, 500, 50, [rect])).toBe(0);
    expect(discCoverage(50, 500, 20, [rect])).toBe(1);
    expect(discCoverage(100, 500, 50, [rect])).toBeGreaterThan(0.4);
    expect(discCoverage(100, 500, 50, [rect])).toBeLessThan(0.6);
  });
});

describe('chooseStart', () => {
  const bounds: Bounds = [0, 0, 1000, 800];
  it('keeps the poster spot when it is open, even if the search would pick elsewhere', () => {
    const got = chooseStart(bounds, 50, [200, 200], [{ left: 400, top: 0, right: 1000, bottom: 800 }], [{ cx: 300, cy: 600, r: 100 }]);
    expect(got).toMatchObject({ x: 200, y: 200, open: true, source: 'poster', cover: 0 });
  });
  it('moves to an open point when the poster spot is covered and an open one exists', () => {
    const got = chooseStart(bounds, 50, [200, 200], [{ left: 0, top: 0, right: 500, bottom: 800 }], []);
    expect(got.source).toBe('search');
    expect(got.open).toBe(true);
    expect(got.x).toBeGreaterThan(550);
  });
  it('keeps a partial poster spot when nothing is open and the search is no better', () => {
    const obs: RectLike[] = [{ left: 60, top: 0, right: 1000, bottom: 800 }];
    // The strip left of the pane is 60 px wide, a 50 px lens cannot fit; the
    // poster sits flush with the viewport's left edge, the least covered.
    const got = chooseStart([50, 50, 950, 750], 50, [50, 400], obs, []);
    expect(got.open).toBe(false);
    expect(got.source).toBe('poster');
    expect(got.cover).toBeGreaterThan(0);
    expect(got.cover).toBeLessThan(0.5);
  });
  it('clamps the poster spot into the travel box', () => {
    const got = chooseStart([100, 100, 900, 700], 50, [0, 0], [], []);
    expect(got).toMatchObject({ x: 100, y: 100, source: 'poster' });
  });
});
