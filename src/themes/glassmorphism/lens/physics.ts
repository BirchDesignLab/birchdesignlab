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

/** A `DOMRect`-shaped rect: left/top/right/bottom in viewport coordinates.
    Named separately from `DOMRect` so the geometry below stays DOM-free and
    unit-testable with plain objects. */
export interface RectLike {
  left: number;
  top: number;
  right: number;
  bottom: number;
  /** Corner radius (a pane's own border-radius), optional: 0 is a plain
      rect. Glass fix round 3: at 1024 x 768 the least-covered start sits
      beside the hero window's rounded corner, and a square-cornered model
      over-counts the cover there. */
  radius?: number;
}

/** The distance from (x, y) to a (rounded) rect's filled shape: 0 inside. */
function distToRoundedRect(x: number, y: number, rect: RectLike): number {
  const rad = Math.max(0, Math.min(rect.radius ?? 0, (rect.right - rect.left) / 2, (rect.bottom - rect.top) / 2));
  const nx = Math.min(Math.max(x, rect.left + rad), rect.right - rad);
  const ny = Math.min(Math.max(y, rect.top + rad), rect.bottom - rad);
  return Math.max(0, Math.hypot(x - nx, y - ny) - rad);
}

/** Whether a circle (cx, cy, r) overlaps an axis-aligned rect at all,
    touching counts (a candidate flush against a pane's edge is rejected: the
    lens should start in clearly open wallpaper, not grazing a pane). Used to
    keep the lens's start position off every `.glass` pane and the portal
    chrome (README, "fix hint": compute the start from the live layout). */
export function circleRectOverlaps(cx: number, cy: number, r: number, rect: RectLike): boolean {
  return circleRectGap(cx, cy, r, rect) < 0;
}

/** The gap between a circle (cx, cy, r) and an axis-aligned (optionally
    rounded) rect: negative while overlapping, positive otherwise (how far
    the circle's edge is from the rect). Used to rank candidate start
    positions by how much open wallpaper surrounds them. */
export function circleRectGap(cx: number, cy: number, r: number, rect: RectLike): number {
  const rad = Math.max(0, Math.min(rect.radius ?? 0, (rect.right - rect.left) / 2, (rect.bottom - rect.top) / 2));
  const nx = Math.min(Math.max(cx, rect.left + rad), rect.right - rad);
  const ny = Math.min(Math.max(cy, rect.top + rad), rect.bottom - rad);
  return Math.hypot(cx - nx, cy - ny) - rad - r;
}

/** The fraction (0 to 1) of a disc's area that sits under any of `rects`,
    sampled on a grid of about 150 points. The "partial" start's real measure
    (glass fix round 3): the critic scored a start by how much of the visible
    disc a pane hides, which a single penetration depth ranks wrongly beside a
    rounded corner. */
export function discCoverage(cx: number, cy: number, r: number, rects: RectLike[]): number {
  const step = r / 7;
  let n = 0;
  let hit = 0;
  for (let y = -r + step / 2; y < r; y += step) {
    for (let x = -r + step / 2; x < r; x += step) {
      if (x * x + y * y > r * r) continue;
      n++;
      for (const rect of rects) {
        if (distToRoundedRect(cx + x, cy + y, rect) === 0) { hit++; break; }
      }
    }
  }
  return n ? hit / n : 0;
}

/** Whether a circle (cx, cy, r) genuinely crosses another circle's edge: the
    two circles intersect without one fully containing the other. This is the
    "across an orb edge" placement the founder approved (the crisp edge is
    what makes the frosting legible; a lens fully inside or fully outside an
    orb shows no bend at all). */
export function crossesCircleEdge(cx: number, cy: number, r: number, ocx: number, ocy: number, orbR: number): boolean {
  const d = Math.hypot(cx - ocx, cy - ocy);
  return d < r + orbR && d > Math.abs(r - orbR);
}

export interface OrbCircle { cx: number; cy: number; r: number }

export interface StartCandidate {
  x: number;
  y: number;
  /** False when no candidate in `bounds` cleared every obstruction: (x, y)
      is then the least-overlapping point found, and the caller should say
      so (README, item 3: "if no open spot exists at a size, choose the best
      partial spot and say so"). */
  open: boolean;
}

/** Finds the lens's start position at mount: the point inside `bounds`
    farthest from every obstruction (a `.glass` pane, the header, the portal
    switcher) that also crosses an orb's edge, so the lens starts visible, in
    open wallpaper, showing the bend it exists for (proofs/lens.md's
    placement rule, "Placement"). A grid search, not a closed form: panes are
    arbitrary rects, so there is no formula for "farthest open point" cheaper
    than sampling, and this runs once at mount, never per frame.

    Falls back in two steps if no such point exists at the current viewport:
    first any fully open point (dropping the orb-edge requirement), then, if
    every point in `bounds` overlaps something, the point that overlaps the
    least (`open: false`). */
export function findStartPosition(bounds: Bounds, radius: number, obstructions: RectLike[], orbs: OrbCircle[]): StartCandidate {
  const [x0, y0, x1, y1] = bounds;
  const w = Math.max(1, x1 - x0);
  const h = Math.max(1, y1 - y0);
  const cols = Math.max(1, Math.min(48, Math.round(w / 22)));
  const rows = Math.max(1, Math.min(36, Math.round(h / 22)));

  let bestOpenEdge: { x: number; y: number; score: number } | null = null;
  let bestOpenAny: { x: number; y: number; score: number } | null = null;
  let bestPartial: { x: number; y: number; score: number } | null = null;

  for (let iy = 0; iy <= rows; iy++) {
    const y = y0 + (h * iy) / rows;
    for (let ix = 0; ix <= cols; ix++) {
      const x = x0 + (w * ix) / cols;
      let minGap = Infinity;
      for (const rect of obstructions) minGap = Math.min(minGap, circleRectGap(x, y, radius, rect));
      const open = minGap >= 0;
      const crossesEdge = orbs.some((o) => crossesCircleEdge(x, y, radius, o.cx, o.cy, o.r));
      if (open) {
        if (crossesEdge && (!bestOpenEdge || minGap > bestOpenEdge.score)) bestOpenEdge = { x, y, score: minGap };
        if (!bestOpenAny || minGap > bestOpenAny.score) bestOpenAny = { x, y, score: minGap };
      } else if (!bestOpenAny) {
        // Least covered disc area wins (glass fix round 3), not the least
        // penetration depth: the visitor sees area, and a corner spot can
        // be deeper yet show more of the disc. Only scored while no open
        // point has turned up, since any open point beats every partial one.
        const cover = discCoverage(x, y, radius, obstructions);
        if (!bestPartial || -cover > bestPartial.score) bestPartial = { x, y, score: -cover };
      }
    }
  }
  const pick = bestOpenEdge ?? bestOpenAny ?? bestPartial ?? { x: (x0 + x1) / 2, y: (y0 + y1) / 2, score: 0 };
  return { x: pick.x, y: pick.y, open: !!(bestOpenEdge || bestOpenAny) };
}

export interface ChosenStart extends StartCandidate {
  /** The fraction of the disc under an obstruction (0 when open). */
  cover: number;
  /** 'poster' when the lens keeps the CSS poster's own spot (so the poster
      and the live lens agree with no jump), 'search' when it moved,
      'corner' for round 4's deliberate half-under-the-window phone start
      (cornerStart). */
  source: 'poster' | 'search' | 'corner';
}

/** Glass fix round 3 (the critic's arrival jump): the poster's CSS spot is
    the lens's preferred start. It is kept whenever it is open, or when no
    open point exists anywhere and it is covered no more than the search's
    least-covered point; only otherwise does the lens (and the poster with
    it) move to the search's point. */
export function chooseStart(bounds: Bounds, radius: number, preferred: [number, number], obstructions: RectLike[], orbs: OrbCircle[]): ChosenStart {
  const [px, py] = clampToBounds(preferred[0], preferred[1], bounds);
  const prefCover = discCoverage(px, py, radius, obstructions);
  const prefOpen = obstructions.every((rect) => circleRectGap(px, py, radius, rect) >= 0);
  if (prefOpen) return { x: px, y: py, open: true, cover: 0, source: 'poster' };
  const found = findStartPosition(bounds, radius, obstructions, orbs);
  if (found.open) return { ...found, cover: 0, source: 'search' };
  const foundCover = discCoverage(found.x, found.y, radius, obstructions);
  if (prefCover <= foundCover + 0.01) return { x: px, y: py, open: false, cover: prefCover, source: 'poster' };
  return { ...found, cover: foundCover, source: 'search' };
}

/** The points where two circles' edges cross (none when they do not). */
export function circleIntersections(ax: number, ay: number, ar: number, bx: number, by: number, br: number): [number, number][] {
  const dx = bx - ax;
  const dy = by - ay;
  const d = Math.hypot(dx, dy);
  if (d >= ar + br || d <= Math.abs(ar - br) || d === 0) return [];
  const a = (ar * ar - br * br + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, ar * ar - a * a));
  const mx = ax + (a * dx) / d;
  const my = ay + (a * dy) / d;
  return [[mx + (h * dy) / d, my - (h * dx) / d], [mx - (h * dy) / d, my + (h * dx) / d]];
}

/** Round 4 (G2, founder): on phones and portrait tablets the lens STARTS half
    under the hero window's lower corner, across an orb, where B1's hand-placed
    orbs cluster (the founder's answer after B2 round 3), instead of in a gap
    of open wallpaper. The disc's centre sits on the window's bottom edge, so
    the window covers its upper half (less the rounded corner) and the visible
    lower half is the grab. Candidates: each lower corner, the disc tangent to
    the window's side, then slid inward along the edge by half, one and one
    and a half radii. Clear of every OTHER obstruction (the Control Centre,
    the switcher, the header) is required. Returns null when no candidate is
    clear or the window's bottom is outside `bounds` (a small phone whose
    window fills the first view): the caller then falls back to
    `chooseStart`.

    Ranking (round 5, R3, founder: "move it along the peach orb's edge so its
    visible half shows the rim crossing the orb edge"): first a candidate
    whose rim crosses an orb's edge on the VISIBLE lower half, at least 0.4
    radii below the window's edge (so the crossing reads, not a sliver at the
    pane's edge); then one that crosses an orb edge anywhere (round 4's rule,
    which let the phone lens sit almost concentric with the peach orb, both
    crossings under the pane); then none. Within a tier, the least slide,
    then the right corner (where B1's placeholder sat).

    `preferred` (round 5, R1): the poster's current centre. When it is still
    one of the clear candidates it is returned as is, whatever the ranking
    says now, so a re-plan (the lens's own mount, after home-boot placed the
    poster) can never move a start the visitor has already seen. */
export function cornerStart(win: RectLike, radius: number, bounds: Bounds, others: RectLike[], orbs: OrbCircle[], preferred?: [number, number] | null): ChosenStart | null {
  const [x0, y0, x1, y1] = bounds;
  const y = win.bottom;
  if (y < y0 || y > y1) return null;
  const minDepth = 0.4 * radius;
  let best: { x: number; score: number } | null = null;
  let kept: number | null = null;
  for (const [side, dir, tangent] of [[0, -1, win.right - radius], [1, 1, win.left + radius]] as const) {
    for (const k of [0, 0.5, 1, 1.5]) {
      const x = Math.min(x1, Math.max(x0, tangent + dir * k * radius));
      if (!others.every((rect) => circleRectGap(x, y, radius, rect) >= 0)) continue;
      if (preferred && Math.abs(preferred[0] - x) <= 1 && Math.abs(preferred[1] - y) <= 1) kept = x;
      let tier = 0;
      for (const o of orbs) {
        if (!crossesCircleEdge(x, y, radius, o.cx, o.cy, o.r)) continue;
        tier = Math.max(tier, 10);
        for (const [px, py] of circleIntersections(x, y, radius, o.cx, o.cy, o.r)) {
          if (py - y >= minDepth && px >= win.left && px <= win.right) tier = 20;
        }
      }
      const score = tier - k * 2 - side;
      if (!best || score > best.score) best = { x, score };
    }
  }
  if (!best) return null;
  const x = kept ?? best.x;
  return { x, y, open: false, cover: discCoverage(x, y, radius, [win, ...others]), source: 'corner' };
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
