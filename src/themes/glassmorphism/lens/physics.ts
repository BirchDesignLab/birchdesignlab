/**
 * Pure math for the production glass lens: the rigid-glass handling proven in
 * `scripts/themes/proofs/stage3-lens/lens.js` (Tier A, `proofs/lens.md`), and
 * the small geometry helpers the lens and the lens-driven orbs both need.
 * Nothing here touches the DOM or WebGL, so it is unit-testable without a
 * browser (see `tests/glass-lens-physics.test.ts`).
 *
 * The FEEL constants and the two-lag stretch/lift model are copied verbatim
 * from the proof (same numbers, same shapes): the founder approved this exact
 * feel ("a little less bouncy... kind of rubbery... shooting for glass"), and
 * Tier B's job is to ship it, not retune it.
 */

export const FEEL = {
  maxStretch: 0.04, // along the motion; across narrows by half this
  stretchSpeed: 1400, // px/s at which the stretch reaches 63% of its max
  stretchTau: 0.045, // s, each of the two lags
  glideTau: 0.2, // s, velocity e-folding time after release
  stopSpeed: 6, // px/s, below this the glide ends
  maxThrow: 3600, // px/s cap on release speed
  liftScale: 0.012,
  liftTau: 0.06,
  tintTau: 0.09,
  wallInset: 8, // px between the lens rim and the window edge
} as const;

/** Two cascaded first-order lags: an S-shaped, never-overshooting ease. */
export class Lag2 {
  tau: number;
  a: number;
  b: number;
  constructor(tau: number, v = 0) {
    this.tau = tau;
    this.a = v;
    this.b = v;
  }
  step(target: number, dt: number): number {
    const k = 1 - Math.exp(-dt / this.tau);
    this.a += (target - this.a) * k;
    this.b += (this.a - this.b) * k;
    return this.b;
  }
}

export type Sample = [time: number, x: number, y: number];

/** Velocity at release: a least-squares slope over the last 80 ms of pointer
    samples; zero if the pointer had stopped for 50 ms. */
export function releaseVelocity(samples: Sample[], now: number): [number, number] {
  const recent = samples.filter((p) => now - p[0] <= 80);
  if (recent.length < 2 || now - recent[recent.length - 1][0] > 50) return [0, 0];
  const t0 = recent[0][0];
  let st = 0, sx = 0, sy = 0, stt = 0, stx = 0, sty = 0;
  for (const [t, x, y] of recent) {
    const u = (t - t0) / 1000;
    st += u; sx += x; sy += y; stt += u * u; stx += u * x; sty += u * y;
  }
  const n = recent.length;
  const den = n * stt - st * st;
  if (den <= 1e-9) return [0, 0];
  return [(n * stx - st * sx) / den, (n * sty - st * sy) / den];
}

/** Cap a release velocity at FEEL.maxThrow, keeping its direction. */
export function capThrow(vx: number, vy: number): [number, number] {
  const sp = Math.hypot(vx, vy);
  const k = sp > FEEL.maxThrow ? FEEL.maxThrow / sp : 1;
  return [vx * k, vy * k];
}

export type Bounds = [x0: number, y0: number, x1: number, y1: number];

/** The lens's travel box: the window inset by its own (stretched, lifted)
    radius plus a wall inset, matching the proof's bounds(). */
export function lensBounds(radius: number, viewportW: number, viewportH: number): Bounds {
  const m = radius * (1 + FEEL.maxStretch) * (1 + FEEL.liftScale) + FEEL.wallInset;
  return [m, m, viewportW - m, viewportH - m];
}

export function clampToBounds(x: number, y: number, bounds: Bounds): [number, number] {
  const [x0, y0, x1, y1] = bounds;
  return [Math.min(x1, Math.max(x0, x)), Math.min(y1, Math.max(y0, y))];
}

/** One glide step: integrate position, stop dead against a wall (drop the
    velocity component into it, never reflect), exponential decay, stop below
    stopSpeed. Mutates nothing; returns the next state. */
export function stepGlide(
  x: number,
  y: number,
  vx: number,
  vy: number,
  dt: number,
  bounds: Bounds,
): { x: number; y: number; vx: number; vy: number } {
  let nx = x + vx * dt;
  let ny = y + vy * dt;
  let nvx = vx;
  let nvy = vy;
  const [x0, y0, x1, y1] = bounds;
  if (nx <= x0) { nx = x0; nvx = Math.max(0, nvx); }
  if (nx >= x1) { nx = x1; nvx = Math.min(0, nvx); }
  if (ny <= y0) { ny = y0; nvy = Math.max(0, nvy); }
  if (ny >= y1) { ny = y1; nvy = Math.min(0, nvy); }
  const decay = Math.exp(-dt / FEEL.glideTau);
  nvx *= decay;
  nvy *= decay;
  if (Math.hypot(nvx, nvy) < FEEL.stopSpeed) { nvx = 0; nvy = 0; }
  return { x: nx, y: ny, vx: nvx, vy: nvy };
}

export interface StretchMatrix {
  m00: number;
  m01: number;
  m11: number;
  det: number;
}

/** The along/across stretch matrix from the eased stretch vector (ex, ey)
    and the current lift. M = I + e (0.25 I + 0.75 [[c, s], [s, -c]]): 1 + e
    along the motion, 1 - e/2 across it; L scales both for the lift. */
export function stretchMatrix(ex: number, ey: number, lift: number): StretchMatrix {
  const e = Math.hypot(ex, ey);
  const ang = Math.atan2(ey, ex) / 2;
  const c2 = Math.cos(2 * ang);
  const s2 = Math.sin(2 * ang);
  const L = 1 + FEEL.liftScale * lift;
  const m00 = (1 + e * (0.25 + 0.75 * c2)) * L;
  const m11 = (1 + e * (0.25 - 0.75 * c2)) * L;
  const m01 = e * 0.75 * s2 * L;
  const det = m00 * m11 - m01 * m01;
  return { m00, m01, m11, det };
}

/** The stretch target for the current speed, in doubled-angle form (so its
    direction eases along with its magnitude): magnitude saturates toward
    FEEL.maxStretch as speed grows past FEEL.stretchSpeed. */
export function stretchTarget(vx: number, vy: number): [number, number] {
  const sp = Math.hypot(vx, vy);
  const mag = FEEL.maxStretch * (1 - Math.exp(-sp / FEEL.stretchSpeed));
  const a2 = 2 * Math.atan2(vy, vx);
  if (sp <= 1) return [0, 0];
  return [mag * Math.cos(a2), mag * Math.sin(a2)];
}

export interface Rect { x: number; y: number; w: number; h: number }

/** The `background-size: cover` rect for an image of size (imgW, imgH) inside
    a box of size (boxW, boxH), centred: the same fit the CSS wallpaper uses,
    so the lens's texture placement can never disagree with the page (one
    wallpaper source, proofs/lens.md). */
export function coverRect(boxW: number, boxH: number, imgW: number, imgH: number): Rect {
  const s = Math.max(boxW / imgW, boxH / imgH);
  const w = imgW * s;
  const h = imgH * s;
  return { x: (boxW - w) / 2, y: (boxH - h) / 2, w, h };
}

/** Progress (0 to 1) of an element's pass through the viewport, matching the
    default `view()` scroll-timeline range ("cover" 0% to 100%): 0% when the
    element's leading edge starts crossing the viewport's trailing edge (about
    to become visible from the bottom), 100% when its trailing edge finishes
    crossing the viewport's leading edge (fully scrolled past the top). Used
    to drive Home's orbs from the lens's own rAF at the same rate the CSS
    `animation-timeline: view()` gives them elsewhere (README, "Wave B2: orbs
    on the lens clock"). */
export function viewProgress(elementTop: number, elementHeight: number, viewportHeight: number): number {
  const span = viewportHeight + elementHeight;
  if (span <= 0) return 0;
  const p = (viewportHeight - elementTop) / span;
  return Math.min(1, Math.max(0, p));
}
