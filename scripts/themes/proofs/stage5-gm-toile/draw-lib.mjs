/**
 * Drawing helpers for the grandmillennial toile (Stage 5, proof a1): a compact
 * relative-path builder, engraver's hatching, scalloped foliage with leaf
 * ticks, birches, big trees, islands, sprays and birds. A seeded generator, so
 * a run is repeatable. build-toile.mjs composes them into vignettes.
 */

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let R = mulberry32(1792);
const rr = (a, b) => a + (b - a) * R();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const f = (n) => {
  const s = (Math.round(n * 10) / 10).toString();
  return s === '-0' ? '0' : s;
};

/** A path builder that writes compact SVG path data. */
const r1 = (n) => Math.round(n * 10) / 10;
/** A number as the shortest SVG token: no leading zero, no "-0". */
const tok = (n) => {
  let s = String(r1(n) || 0);
  if (s === '-0') s = '0';
  return s.replace(/^(-?)0\./, '$1.');
};
/**
 * Compact path data. Every command is relative to the rounded current point
 * (so rounding never drifts), repeated l/q/c letters are dropped, and
 * separators are left out wherever the grammar allows.
 */
class Path {
  constructor() { this.cmds = []; this.x = 0; this.y = 0; this.sx = 0; this.sy = 0; }
  _push(letter, nums) { this.cmds.push([letter, nums]); }
  M(x, y) {
    x = r1(x); y = r1(y);
    this._push('m', [x - this.x, y - this.y]);
    this.x = this.sx = x; this.y = this.sy = y;
    return this;
  }
  L(x, y) {
    x = r1(x); y = r1(y);
    this._push('l', [x - this.x, y - this.y]);
    this.x = x; this.y = y;
    return this;
  }
  /** relative line */
  l(dx, dy) { return this.L(this.x + dx, this.y + dy); }
  Q(cx, cy, x, y) {
    cx = r1(cx); cy = r1(cy); x = r1(x); y = r1(y);
    this._push('q', [cx - this.x, cy - this.y, x - this.x, y - this.y]);
    this.x = x; this.y = y;
    return this;
  }
  C(a, b, c, d, x, y) {
    a = r1(a); b = r1(b); c = r1(c); d = r1(d); x = r1(x); y = r1(y);
    this._push('c', [a - this.x, b - this.y, c - this.x, d - this.y, x - this.x, y - this.y]);
    this.x = x; this.y = y;
    return this;
  }
  /** a loose segment from (x1,y1) to (x2,y2) */
  seg(x1, y1, x2, y2) { return this.M(x1, y1).L(x2, y2); }
  /** polyline through points */
  poly(pts, close = false) {
    pts.forEach(([x, y], i) => (i ? this.L(x, y) : this.M(x, y)));
    if (close) { this._push('z', []); this.x = this.sx; this.y = this.sy; }
    return this;
  }
  d() {
    let s = '', last = '', lastTok = '';
    for (const [letter, nums] of this.cmds) {
      if (letter === 'm' || letter === 'z' || letter !== last) { s += letter; lastTok = ''; }
      for (const n of nums) {
        const t = tok(n);
        // a separator is needed unless nothing numeric precedes, the token
        // starts with '-', or it starts with '.' after a token that has one.
        const need = lastTok !== '' && t[0] !== '-' && !(t[0] === '.' && lastTok.includes('.'));
        s += (need ? ' ' : '') + t;
        lastTok = t;
      }
      last = letter;
    }
    return s;
  }
}

/* ---------- hatching ---------- */

/** Rotate a point about the origin. */
const rot = ([x, y], a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

/**
 * Hatch a polygon with parallel lines at `angle` degrees. `sp` is the spacing
 * as a function of u (0..1 across the polygon, perpendicular to the lines),
 * so tone can build toward one side. Each line is trimmed a little at random,
 * the way an engraver lifts the burin.
 */
function hatch(path, poly, angle, sp, { trim = 0.8, minLen = 1.5, skip = 0 } = {}) {
  const a = (-angle * Math.PI) / 180;
  const rp = poly.map((p) => rot(p, a));
  const ys = rp.map((p) => p[1]);
  const y0 = Math.min(...ys), y1 = Math.max(...ys);
  const span = y1 - y0 || 1;
  let y = y0 + 0.5;
  while (y < y1) {
    const u = (y - y0) / span;
    const xs = [];
    for (let i = 0; i < rp.length; i++) {
      const [ax, ay] = rp[i], [bx, by] = rp[(i + 1) % rp.length];
      if ((ay <= y && by > y) || (by <= y && ay > y)) xs.push(ax + ((y - ay) / (by - ay)) * (bx - ax));
    }
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      let xa = xs[i] + rr(0, trim), xb = xs[i + 1] - rr(0, trim);
      if (xb - xa < minLen || R() < skip) continue;
      const [px, py] = rot([xa, y], -a), [qx, qy] = rot([xb, y], -a);
      path.seg(px, py, qx, qy);
    }
    y += typeof sp === 'function' ? sp(u) : sp;
  }
}

const ellipsePoly = (cx, cy, rx, ry, n = 20) =>
  Array.from({ length: n }, (_, i) => [cx + rx * Math.cos((i / n) * 6.2832), cy + ry * Math.sin((i / n) * 6.2832)]);

/* ---------- parts ---------- */

/**
 * Foliage: a scalloped outline and a field of small leaf ticks that thicken
 * toward the lower right (light from the upper left). `airy` thins the ticks
 * and leaves clear paper in the light, for birch.
 */
function canopy(fine, bold, cx, cy, rx, ry, { airy = 0.6, scallop = 9, tick = 4.5 } = {}) {
  // outline: a chain of bumps, left open at the top-left where the light is.
  const n = Math.max(8, Math.round((Math.PI * (rx + ry)) / scallop));
  const start = 3.3;
  for (let i = 0; i < n; i++) {
    const a0 = start + (i / n) * 5.6, a1 = start + ((i + 1) / n) * 5.6;
    const p0 = [cx + rx * Math.cos(a0), cy + ry * Math.sin(a0)];
    const p1 = [cx + rx * Math.cos(a1), cy + ry * Math.sin(a1)];
    const am = (a0 + a1) / 2, k = 1.16 + rr(-0.03, 0.06);
    const pc = [cx + rx * k * Math.cos(am), cy + ry * k * Math.sin(am)];
    if (i === 0) bold.M(p0[0], p0[1]);
    bold.Q(pc[0], pc[1], p1[0], p1[1]);
  }
  // inner scallop strokes: cluster edges, mostly in the shade.
  for (let i = 0; i < Math.round(n * 0.7); i++) {
    const a = rr(0.1, 3.0);
    const rad = rr(0.35, 0.8);
    const px = cx + rx * rad * Math.cos(a), py = cy + ry * rad * Math.sin(a);
    const w = rr(5, 9);
    fine.M(px - w / 2, py).Q(px, py + w * 0.5, px + w / 2, py);
  }
  // ticks on a jittered grid; the grid cell skips more in the light.
  for (let gy = cy - ry; gy < cy + ry; gy += tick) {
    for (let gx = cx - rx; gx < cx + rx; gx += tick * 1.15) {
      const x = gx + rr(-1.2, 1.2), y = gy + rr(-1.2, 1.2);
      const ex = (x - cx) / rx, ey = (y - cy) / ry;
      if (ex * ex + ey * ey > 0.86) continue;
      const shade = clamp(0.5 + 0.38 * ey + 0.3 * ex, 0, 1);
      if (R() > 0.12 + airy * shade * 1.25 - (shade < 0.28 ? 0.1 : 0)) continue;
      const s = rr(1.4, 2.4);
      fine.M(x, y).Q(x + s * 0.5, y + s * 0.9, x + s, y - s * 0.1);
    }
  }
}

/** The mound an island stands on: edge line, tapering hatch, tufts. */
function island(fine, bold, halfW, depth = 13) {
  // top edge, broken into pieces that thin out toward the ends
  const segs = 5;
  for (let i = 0; i < segs; i++) {
    const x0 = -halfW + (i * 2 * halfW) / segs, x1 = x0 + (2 * halfW) / segs - rr(0, 3);
    const y0 = Math.sin(x0 * 0.05) * 1.4, y1 = Math.sin(x1 * 0.05) * 1.4;
    bold.M(x0, y0).Q((x0 + x1) / 2, (y0 + y1) / 2 - rr(0.5, 1.8), x1, y1);
  }
  // underside lens: horizontal strokes, longer in the middle
  for (let k = 1; k <= 7; k++) {
    const yy = k * (depth / 7.5) + 1;
    const half = halfW * (1 - Math.pow(k / 8.4, 1.5)) * rr(0.82, 0.98);
    const off = rr(-4, 4);
    fine.seg(-half + off, yy, half + off, yy + rr(-0.4, 0.4));
  }
  // grass tufts along the edge
  for (let i = 0; i < Math.round(halfW / 11); i++) {
    const x = rr(-halfW * 0.92, halfW * 0.92);
    const y = Math.sin(x * 0.05) * 1.4;
    const h = rr(3, 6);
    fine.M(x, y).l(-1.8, -h);
    fine.M(x, y).l(0.2, -h * 1.15);
    fine.M(x, y).l(2, -h * 0.85);
  }
}

/** A small leaf spray on a stem, for urns, hedges and fillers. */
function spray(fine, x, y, len, ang, { leaves = 6, side = 3.2 } = {}) {
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const ex = x + dx * len, ey = y + dy * len;
  fine.M(x, y).Q(x + dx * len * 0.5 - dy * 3, y + dy * len * 0.5 + dx * 3, ex, ey);
  for (let i = 1; i <= leaves; i++) {
    const t = i / (leaves + 0.5);
    const px = x + dx * len * t - dy * 1.5 * (1 - t), py = y + dy * len * t + dx * 1.5 * (1 - t);
    for (const s of [-1, 1]) {
      const lx = px + (-dy * s * side + dx * side * 0.5), ly = py + (dx * s * side + dy * side * 0.5);
      fine.M(px, py).Q((px + lx) / 2 - dy * s * 0.9, (py + ly) / 2 + dx * s * 0.9, lx, ly);
    }
  }
}

/** A birch: a pale, slightly curving trunk with dark lenticels and a shaded edge. */
function birch(fine, bold, x, y, h, w, lean, { branches = 3, crown = true } = {}) {
  const top = [x + lean, y - h];
  const mid = (t) => [x + lean * t * t, y - h * t];
  const left = [], right = [];
  for (let i = 0; i <= 6; i++) {
    const t = i / 6, [mx, my] = mid(t);
    const ww = w * (1 - 0.6 * t) / 2;
    left.push([mx - ww, my]); right.push([mx + ww, my]);
  }
  bold.poly(left);
  bold.poly(right);
  // lenticels: short dark dashes, a few in pairs, leaning right into the shade
  for (let t = 0.05; t < 0.93; t += rr(0.05, 0.085)) {
    const [mx, my] = mid(t), ww = w * (1 - 0.6 * t) / 2;
    const p0 = rr(0.1, 0.45), p1 = p0 + rr(0.3, 0.55);
    bold.seg(mx - ww + 2 * ww * p0, my, mx - ww + 2 * ww * Math.min(p1, 0.95), my + rr(-0.4, 0.4));
    if (R() < 0.3) fine.seg(mx - ww + 2 * ww * rr(0.5, 0.7), my + 2, mx - ww + 2 * ww * 0.92, my + 2);
  }
  // roundness: a long thin line inside the right edge, in three pieces
  for (const [t0, t1] of [[0.03, 0.32], [0.36, 0.66], [0.7, 0.95]]) {
    const q = (t) => { const [mx, my] = mid(t), ww = w * (1 - 0.6 * t) / 2; return [mx + ww * 0.55, my]; };
    const [x0, y0] = q(t0), [x1, y1] = q(t1);
    fine.M(x0, y0).Q(x0 + 0.6, (y0 + y1) / 2, x1, y1);
  }
  // a swell at the root
  bold.M(x - w / 2 - 2, y).Q(x - w / 2, y - 3, x - w / 2 + 0.5, y - 7);
  bold.M(x + w / 2 + 2, y).Q(x + w / 2, y - 3, x + w / 2 - 0.5, y - 7);
  // branches with hanging leaf sprays
  for (let i = 0; i < branches; i++) {
    const t = 0.55 + (i / Math.max(1, branches)) * 0.4;
    const [mx, my] = mid(t), dir = i % 2 ? 1 : -1;
    const len = h * rr(0.14, 0.24);
    const ex = mx + dir * len, ey = my - len * rr(0.5, 0.9);
    bold.M(mx, my).Q(mx + dir * len * 0.4, my - len * 0.6, ex, ey);
    for (let k = 0; k < 4; k++) {
      const lx = ex + rr(-6, 6), ly = ey + rr(-1, 8);
      fine.M(lx, ly - 2).Q(lx + 1.5, ly, lx, ly + 3.2).Q(lx - 1.5, ly, lx, ly - 2);
    }
  }
  if (crown) {
    for (let k = 0; k < 9; k++) {
      const lx = top[0] + rr(-9, 9), ly = top[1] + rr(-10, 4);
      fine.M(lx, ly - 2).Q(lx + 1.6, ly, lx, ly + 3.4).Q(lx - 1.6, ly, lx, ly - 2);
    }
  }
}

/** An oak or elm: textured bark trunk and a full shaded crown. */
function bigTree(fine, bold, x, y, h, w) {
  const l = [], r = [];
  for (let i = 0; i <= 5; i++) {
    const t = i / 5, ww = (w * (1 - 0.4 * t)) / 2 + (i === 0 ? 4 : 0);
    const mx = x + Math.sin(t * 2.2) * 3;
    l.push([mx - ww, y - h * t]); r.push([mx + ww, y - h * t]);
  }
  bold.poly(l); bold.poly(r);
  // bark: long wavering verticals, denser to the right
  for (let i = 0; i < 9; i++) {
    const u = 0.1 + i * 0.1, wob = rr(-1.5, 1.5);
    const x0 = x - w / 2 + u * w;
    const y0 = y - rr(2, 6), y1 = y - h * rr(0.45, 0.95);
    fine.M(x0, y0).Q(x0 + wob, (y0 + y1) / 2, x0 + wob * 0.4, y1);
  }
  // roots
  bold.M(x - w / 2 - 6, y + 1).Q(x - w / 2 - 1, y - 1, x - w / 2, y - 9);
  bold.M(x + w / 2 + 6, y + 1).Q(x + w / 2 + 1, y - 1, x + w / 2, y - 9);
}

/** A little bird in flight: two arcs. */
function flyer(fine, x, y, s = 1) {
  fine.M(x - 5 * s, y - 1 * s).Q(x - 2.5 * s, y - 4.5 * s, x, y).Q(x + 2.5 * s, y - 4.5 * s, x + 5 * s, y - 1 * s);
  fine.M(x - 1 * s, y).l(1.5 * s, 1.2 * s);
}

/** A perched bird, side on. */
function perched(fine, bold, x, y, s = 1, dir = 1) {
  const p = (dx, dy) => [x + dx * s * dir, y + dy * s];
  const body = [p(-5, 0), p(-3, -4), p(2, -4.5), p(5, -2.5), p(4.5, 0), p(0, 2.5), p(-5, 0)];
  bold.M(...body[0]);
  bold.Q(...p(-5, -3.5), ...body[1]);
  bold.Q(...p(0, -6.5), ...body[3]);
  bold.Q(...p(7, 0), ...p(3, 2));
  bold.Q(...p(-2, 3.5), ...body[0]);
  bold.M(...p(-5, 0)).L(...p(-10, 3)); // tail
  fine.M(...p(-1, -2)).Q(...p(1, -1), ...p(3, -3));
  fine.M(...p(5, -2.5)).l(2.2 * dir * s, 0.6 * s);
  fine.M(...p(0, 2)).l(0, 3 * s); fine.M(...p(2, 2)).l(0, 3 * s);
}

export { Path, hatch, canopy, island, spray, birch, bigTree, flyer, perched, rr, R, f, clamp, mulberry32 };
export const reseed = (n) => { R = mulberry32(n); };
