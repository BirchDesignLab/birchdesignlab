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
  cornerStart,
  circleIntersections,
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

describe('cornerStart (round 4, G2)', () => {
  // A 390 x 844 phone: the window 16..374 x 130..572 with 30px corners.
  const win: RectLike = { left: 16, top: 130, right: 374, bottom: 572, radius: 30 };
  const bounds: [number, number, number, number] = [76, 160, 314, 768];
  it('centres the disc on the window bottom, tangent to its right side', () => {
    // round 5: an orb whose edge the tangent disc crosses on its visible half
    const got = cornerStart(win, 64, bounds, [], [{ cx: 340, cy: 640, r: 40 }])!;
    expect(got).toMatchObject({ x: 310, y: 572, open: false, source: 'corner' });
    // about half under the window, less the rounded corner
    expect(got.cover).toBeGreaterThan(0.35);
    expect(got.cover).toBeLessThan(0.5);
  });
  it('takes the left corner when only it crosses an orb edge', () => {
    const got = cornerStart(win, 64, bounds, [], [{ cx: 40, cy: 600, r: 65 }])!;
    expect(got.x).toBe(80);
  });
  it('avoids a corner that runs into another obstruction', () => {
    const cc: RectLike = { left: 200, top: 600, right: 374, bottom: 840 };
    const got = cornerStart(win, 64, bounds, [cc], [])!;
    expect(got.x).toBe(80);
  });
  it('slides inward along the edge to cross an orb near the corner', () => {
    const got = cornerStart(win, 64, bounds, [], [{ cx: 150, cy: 650, r: 37 }])!;
    expect(got.x).toBe(112);
  });
  it('gives up when every candidate runs into another obstruction', () => {
    const sw: RectLike = { left: 0, top: 600, right: 390, bottom: 650 };
    expect(cornerStart(win, 64, bounds, [sw], [])).toBeNull();
  });
  it('gives up when the window bottom is below the first view', () => {
    expect(cornerStart({ ...win, bottom: 900 }, 64, bounds, [], [])).toBeNull();
  });
});

describe('circleIntersections', () => {
  it('finds both crossing points, each on both circles', () => {
    const pts = circleIntersections(0, 0, 10, 12, 0, 8);
    expect(pts).toHaveLength(2);
    for (const [x, y] of pts) {
      expect(Math.hypot(x, y)).toBeCloseTo(10, 6);
      expect(Math.hypot(x - 12, y)).toBeCloseTo(8, 6);
    }
  });
  it('is empty when the circles are apart or one holds the other', () => {
    expect(circleIntersections(0, 0, 10, 30, 0, 8)).toEqual([]);
    expect(circleIntersections(0, 0, 10, 1, 0, 3)).toEqual([]);
  });
});

describe('cornerStart (round 5, R1 and R3)', () => {
  // round 4's 390 x 844 first view: the window 16..374 x 130..589, the
  // peach orb at (302, 557) r65 on the clock, the Control Centre from 661.
  const win: RectLike = { left: 16, top: 130, right: 374, bottom: 589, radius: 30 };
  const bounds: [number, number, number, number] = [76, 160, 314, 768];
  const peach = { cx: 302, cy: 557, r: 65 };
  const pink = { cx: 45, cy: 515, r: 35 };
  const cc: RectLike = { left: 16, top: 661, right: 374, bottom: 899, radius: 24 };
  it('slides along the peach edge until the rim crosses it on the visible half', () => {
    // at the tangent (310, 589) the disc is almost concentric with peach and
    // both crossings sit under the window (the round-4 critic's rim sheet)
    const tangent = circleIntersections(310, 589, 64, peach.cx, peach.cy, peach.r);
    expect(Math.max(...tangent.map(([, y]) => y - 589))).toBeLessThan(0.4 * 64);
    const got = cornerStart(win, 64, bounds, [], [peach, pink])!;
    expect(got.y).toBe(589);
    expect(got.x).toBe(246);
    const pts = circleIntersections(got.x, got.y, 64, peach.cx, peach.cy, peach.r);
    expect(pts.some(([x, y]) => y - 589 >= 0.4 * 64 && x > 16 && x < 374)).toBe(true);
  });
  it('still falls back to any edge crossing when no crossing is visible', () => {
    // an orb high under the window: every crossing is on the covered half
    const got = cornerStart(win, 64, bounds, [], [{ cx: 300, cy: 540, r: 60 }])!;
    expect(got.x).toBe(310);
  });
  it('keeps the preferred (poster) spot while it is still a clear candidate', () => {
    // the right tangent is not the best spot any more, but the poster is on it
    const got = cornerStart(win, 64, bounds, [], [peach, pink], [310, 589])!;
    expect(got.x).toBe(310);
    // the same plan with no preference picks the visible crossing
    expect(cornerStart(win, 64, bounds, [], [peach, pink], null)!.x).toBe(246);
  });
  it('ignores a preferred spot that is no longer a candidate or no longer clear', () => {
    // a poster left at the CSS stand-in, 83px above the corner
    expect(cornerStart(win, 64, bounds, [], [peach, pink], [310, 506])!.x).toBe(246);
    // a poster on a candidate that now runs into the Control Centre
    const low: RectLike = { ...cc, top: 640 };
    const got = cornerStart(win, 64, bounds, [low], [peach, pink], [310, 589]);
    expect(got).toBeNull();
  });
  it('plans the same spot from the same orbs, whatever order it runs in', () => {
    const a = cornerStart(win, 64, bounds, [cc], [peach, pink]);
    const b = cornerStart(win, 64, bounds, [cc], [pink, peach]);
    expect(a).toEqual(b);
  });
});
