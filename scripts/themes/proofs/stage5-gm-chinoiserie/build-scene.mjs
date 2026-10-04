/**
 * Draws the grandmillennial chinoiserie scene and the botanical birch
 * (Stage 5, proof a3) as SVG.
 *
 * Written 10-04-26. Usage:
 *   node scripts/themes/proofs/stage5-gm-chinoiserie/build-scene.mjs
 * Output (beside this file):
 *   scene-defs.svg.html   the wall: a hidden <svg class="gm-scene-defs"> holding
 *                         the leaf, catkin and bird defs and <g id="gm-scene">,
 *                         then the three <svg class="gm-scene-art"> crops that
 *                         <use> it (wide, and the phone's top and foot).
 *   birch.svg.html        the oval's birch, redrawn: <svg class="gm-birch">.
 *   scene-stats.json      bytes (raw and gzip) of both, and counts.
 *
 * Same hand for both: one pen line (a dark ink, drawn in short broken strokes
 * with a taper), a flat wash laid beside it, not quite inside it (the way a
 * hand-coloured print sits), tapering painted trunks, serrated birch leaves,
 * drooping catkins. Every colour is a CSS class or custom property, so one
 * drawing serves the day parlour (muted inks on a celadon ground) and the
 * lacquered room (gold and cream line on hunter). Seeded, so a run repeats.
 *
 * The wall is ONE drawing, 1600 x 1300 units. It is never tiled: wide screens
 * show it cropped to the room (slice), phones show two crops of it, the left
 * of the scene at the top of the wall and the right of it at the foot.
 */
import { writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Path, reseed } from '../stage5-gm-toile/draw-lib.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const r1 = (n) => Math.round(n * 10) / 10;
const tk = (n) => { let s = String(r1(n)); if (s === '-0') s = '0'; return s.replace(/^(-?)0\./, '$1.'); };
const PI = Math.PI;

/* ---------- geometry ---------- */

const bez = (p, t) => {
  const u = 1 - t;
  return [0, 1].map((i) => u * u * u * p[0][i] + 3 * u * u * t * p[1][i] + 3 * u * t * t * p[2][i] + t * t * t * p[3][i]);
};
const bezTan = (p, t) => {
  const u = 1 - t;
  const d = [0, 1].map((i) => 3 * u * u * (p[1][i] - p[0][i]) + 6 * u * t * (p[2][i] - p[1][i]) + 3 * t * t * (p[3][i] - p[2][i]));
  const n = Math.hypot(d[0], d[1]) || 1;
  return [d[0] / n, d[1] / n];
};
/** Catmull-Rom through points, sampled. */
function catmull(pts, per = 8) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let s = 0; s < per; s++) {
      const t = s / per, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
/** Polygon d around a centreline with a width function. */
function ribbon(pts, wf) {
  const L = [], R = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const n = Math.hypot(dx, dy) || 1; dx /= n; dy /= n;
    const w = wf(i / (pts.length - 1)) / 2;
    L.push([pts[i][0] - dy * w, pts[i][1] + dx * w]);
    R.push([pts[i][0] + dy * w, pts[i][1] - dx * w]);
  }
  return { L, R, poly: [...L, ...R.reverse()] };
}
const poly = (pts, close = true) => new Path().poly(pts, close).d();

/* ---------- the shared parts: leaf, catkin, birds ---------- */

reseed(1750);

/** A serrated birch leaf (ovate, pointed), length L, with a bend. */
function leafShape(L, wmax, teeth, bend, phase) {
  const K = teeth;
  const hw = (u) => wmax * Math.pow(Math.max(0, u), 0.5) * Math.pow(Math.max(0, 1 - u), 0.85) * 2.1;
  const top = [], bot = [];
  for (let k = 0; k <= K; k++) {
    const u = k / K;
    const bendY = (v) => Math.sin(v * PI * 0.9) * bend;
    top.push([u * L, -hw(u) + bendY(u)]);
    bot.push([u * L, hw(u) + bendY(u)]);
    if (k < K && u > 0.06) {
      const m = (k + 0.5 + phase) / K, tip = 1.6 + 0.5 * Math.sin(k * 2.1);
      top.push([Math.min(L, m * L + 1.1), -hw(m) - tip + bendY(m)]);
      bot.push([Math.min(L, (m + 0.03) * L + 1.1), hw(m) + tip + bendY(m)]);
    }
  }
  const pts = [...top, ...bot.reverse()];
  const veins = new Path();
  veins.M(0, 0).Q(L * 0.5, bend * 0.6, L * 0.96, bend * 0.1);
  for (let i = 1; i <= 4; i++) {
    const u = 0.14 + i * 0.17;
    const y = Math.sin(u * PI * 0.9) * bend * 0.6;
    veins.M(u * L, y).L((u + 0.12) * L, y - hw(u + 0.1) * 0.78);
    veins.M(u * L, y).L((u + 0.12) * L, y + hw(u + 0.1) * 0.78);
  }
  return { body: poly(pts), veins: veins.d() };
}
const lf1 = leafShape(24, 4.6, 7, 1.2, 0.1);
const lf2 = leafShape(20, 4.2, 6, -1.6, 0.5);

/** A hanging catkin: a stem and a slim scaled bean. */
function catkinDef() {
  const b = new Path();
  b.M(0, 0).L(0, 3);
  const body = new Path();
  body.M(0, 3).C(2.8, 5, 3.4, 12, 1.6, 21).Q(0, 22.5, -1.6, 21).C(-3.4, 12, -2.8, 5, 0, 3).d();
  const ticks = new Path();
  for (let y = 6; y < 20; y += 2.6) { ticks.M(-2.6 + y * 0.02, y).L(2.6 - y * 0.02, y + 1.3); }
  return { stem: b.d(), body: body.d(), ticks: ticks.d() };
}
const ck = catkinDef();

/** A perched long-tailed bird facing right, feet at the origin. */
const perchedBird = `
<path class="sc-tail" d="M-12-17C-38-9-70 3-108 25C-76 8-46-6-14-13Z"/>
<path class="sc-tail2" d="M-12-15C-34-4-60 14-92 40C-64 16-40 0-12-11Z"/>
<path class="sc-body" d="M31-35C33-26 23-10 7-8C-4-8-12-13-14-20C-6-23 5-30 13-41C20-46 29-43 31-35Z"/>
<path class="sc-belly" d="M31-33C30-25 22-12 8-9C16-11 25-20 28-30Z"/>
<path class="sc-wing" d="M11-33C-1-30-12-22-22-12C-8-13 5-17 15-25Z"/>
<path class="sc-ln" d="M9-30C-2-26-11-19-18-13M6-27C-2-23-8-18-13-12"/>
<path class="sc-crest" d="M14-43C10-52 7-54 4-57C11-55 17-50 19-44Z"/>
<path class="sc-beak" d="M31-38L42-35L31-32Z"/>
<circle class="sc-eye" cx="24" cy="-38" r="1.5"/>
<path class="sc-ln" d="M31-35C33-26 23-10 7-8C-4-8-12-13-14-20M13-41C20-46 29-43 31-35M-12-17C-38-9-70 3-108 25M-12-15C-34-4-60 14-92 40M7-8L5 0L1 0M13-9L13 0L9 1"/>`;

/** A bird in flight facing right, wings up and down, centre at the origin. */
const flyingBird = `
<path class="sc-tail" d="M-14 2C-34 7-52 20-70 44C-48 26-30 14-12-2Z"/>
<path class="sc-wing" d="M0-3C-4-22-20-36-42-40C-32-28-24-16-14-1Z"/>
<path class="sc-body" d="M-16 3C-10-5 6-8 20-4C26-2 31-6 36-4L28 0C31 4 22 10 6 9C-6 8-12 7-16 3Z"/>
<path class="sc-wing2" d="M4 5C8 17 18 26 36 30C28 20 20 10 10 2Z"/>
<path class="sc-beak" d="M34-5L45-2L33 0Z"/>
<circle class="sc-eye" cx="28" cy="-2" r="1.2"/>
<path class="sc-ln" d="M-4-8C-12-14-22-18-30-19M-16 3C-10-5 6-8 20-4C26-2 31-6 36-4M28 0C31 4 22 10 6 9C-6 8-12 7-16 3M-14 2C-34 7-52 20-70 44M0-3C-4-22-20-36-42-40"/>`;

/* ---------- the scene ---------- */

const used = { leaves: 0, birds: 0, catkins: 0 };
const out = { far: [], farT: [], ground: [], rocks: [], trunks: [], limbs: [], twigs: [], leaves: [], catkins: [], birds: [] };

const uw = (id, x, y, rot, s, cls = '') =>
  `<use href="#${id}" transform="translate(${Math.round(x)} ${Math.round(y)})${rot ? ` rotate(${Math.round(rot)})` : ''}${s !== 1 ? ` scale(${tk(Math.round(s * 10) / 10)})` : ''}"${cls ? ` class="${cls}"` : ''}/>`;

/** Tapering painted limb; returns its centreline sampler. */
function limb(p, w0, w1, layer = 'limbs') {
  const pts = []; for (let i = 0; i <= 14; i++) pts.push(bez(p, i / 14));
  const rb = ribbon(pts, (t) => w0 + (w1 - w0) * Math.pow(t, 0.8));
  out[layer].push(`<path class="sc-limb" d="${poly(rb.poly)}"/>`);
  // a pale highlight along the upper edge, broken in two
  const hl = new Path();
  for (const [a, b] of [[0.06, 0.4], [0.48, 0.82]]) {
    const i0 = Math.round(a * 14), i1 = Math.round(b * 14);
    hl.poly(rb.L.slice(i0, i1 + 1), false);
  }
  out[layer].push(`<path class="sc-hl" d="${hl.d()}"/>`);
  return (t) => ({ at: bez(p, t), dir: bezTan(p, t), w: w0 + (w1 - w0) * Math.pow(t, 0.8) });
}

/** A leaf instance. */
function leaf(x, y, rot, s) {
  out.leaves.push(uw(R() < 0.55 ? 'sc-l1' : 'sc-l2', x, y, rot, s));
  used.leaves++;
}
let R = () => Math.random();
{ const m = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; R = m(1789); }
const ra = (a, b) => a + (b - a) * R();

/** A hanging twig from (x,y): a thin curved stroke dropping with leaves along it. */
function hang(x, y, len, lean, { cat = false, scale = 1 } = {}) {
  const ex = x + lean, ey = y + len;
  const c = [x + lean * 0.1, y + len * 0.5];
  out.twigs.push(`<path class="sc-twig" d="M${tk(x)} ${tk(y)}Q${tk(c[0])} ${tk(c[1])} ${tk(ex)} ${tk(ey)}"/>`);
  const n = Math.max(2, Math.round(len / 19));
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const px = (1 - t) * (1 - t) * x + 2 * (1 - t) * t * c[0] + t * t * ex;
    const py = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * c[1] + t * t * ey;
    const side = i % 2 ? 1 : -1;
    // leaves point outward and downward, varied; larger toward the tip
    const base = 90 + side * ra(35, 70) + lean * 0.4;
    leaf(px, py, base + ra(-18, 18), scale * 1.25 * (0.78 + 0.45 * t) * ra(0.9, 1.15));
  }
  leaf(ex, ey, 90 + ra(-30, 30), scale * 1.3 * ra(0.95, 1.2));
  if (cat) { out.catkins.push(uw('sc-ck', ex + ra(-5, 5), ey + 2, ra(-14, 14), scale * ra(0.9, 1.15))); used.catkins++; }
}

/** Dress a limb with hanging twigs (and a few upright leaf tufts at the tip). */
function dress(f, { from = 0.28, to = 1, gap = 34, len = [26, 64], cats = 0.22, scale = 1, tip = true } = {}) {
  const total = Math.hypot(...[0, 1].map((i) => f(1).at[i] - f(0).at[i])) * 1.12;
  const step = gap / total;
  for (let t = from; t <= to + 1e-6; t += step * ra(0.75, 1.3)) {
    const { at, dir, w } = f(Math.min(1, t));
    const nx = -dir[1], ny = dir[0];
    const off = (R() < 0.5 ? 1 : -1) * (w / 2);
    const x = at[0] + nx * off, y = at[1] + ny * off;
    const l = ra(len[0], len[1]) * (1 - 0.25 * t);
    hang(x, y, l, ra(-16, 22) + dir[0] * 10, { cat: R() < cats, scale });
  }
  if (tip) {
    const { at, dir } = f(1);
    hang(at[0], at[1], ra(36, 62), dir[0] * 22 + ra(-6, 14), { cat: true, scale });
    for (let i = 0; i < 2; i++) leaf(at[0] + dir[0] * ra(2, 10), at[1] + dir[1] * ra(2, 10), Math.atan2(dir[1], dir[0]) * 180 / PI + ra(-45, 45), scale * 1.25 * ra(0.9, 1.15));
  }
}

/** A birch trunk. Returns sampler for branching. */
function trunk(ctr, w0, w1, { lens = 0.8, eyes = [], curls = 5, hatch = true, far = false, layer = 'trunks' } = {}) {
  const pts = catmull(ctr, 9);
  const wf = (t) => (w0 + (w1 - w0) * t) * (1 + 0.04 * Math.sin(t * 17));
  const rb = ribbon(pts, wf);
  const o = out[layer];
  o.push(`<path class="sc-trunk" d="${poly(rb.poly)}"/>`);
  // the wash on the shaded third (the right-hand side, light from the upper left),
  // laid a hair inside the edge. In ribbon(), L is the right-hand side of an upward trunk.
  const shade = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const n = Math.hypot(dx, dy) || 1; dx /= n; dy /= n;
    const w = wf(i / (pts.length - 1)) / 2;
    shade.push([pts[i][0] - dy * w * 0.3, pts[i][1] + dx * w * 0.3]);
  }
  const rEdge = rb.L.map((p, i) => [p[0] - (p[0] - pts[i][0]) * 0.05, p[1] - (p[1] - pts[i][1]) * 0.05]);
  o.push(`<path class="sc-shade" d="${poly([...shade, ...rEdge.slice().reverse()])}"/>`);
  // edge lines: the lit left side broken, the shaded right side continuous
  const pL = new Path(); const N = rb.R.length;
  for (let s = 0; s < N - 1; s += Math.round(ra(10, 18))) pL.poly(rb.R.slice(s, Math.min(N, s + Math.round(ra(7, 12)))), false);
  o.push(`<path class="sc-ln" d="${pL.d()}"/>`);
  o.push(`<path class="sc-ln2" d="${poly(rb.L, false)}"/>`);
  // lenticels: dark brushed dashes across the trunk, a few in pairs
  const lent = new Path();
  const meanW = (w0 + w1) / 2;
  for (let t = 0.02; t < 0.99; t += ra(0.022, 0.044) * (meanW > 50 ? 0.8 : 1.15)) {
    const i = Math.min(pts.length - 1, Math.round(t * (pts.length - 1)));
    const [px, py] = pts[i], w = wf(t);
    const a = ra(-0.42, 0.1) * w, b = a + ra(0.3, 0.62) * w;
    lent.M(px + a, py + ra(-1, 1)).Q(px + (a + b) / 2, py + ra(0.6, 1.7), px + b, py + ra(-1, 1));
    if (R() < 0.32) { const a2 = ra(0.05, 0.3) * w; lent.M(px + a2, py + 5).L(px + a2 + ra(0.12, 0.26) * w, py + 5.6); }
  }
  o.push(`<path class="sc-lent" d="${lent.d()}"/>`);
  // peeling curls at the edges: short papery curls with a pale fill
  for (let k = 0; k < curls; k++) {
    const t = ra(0.08, 0.9), i = Math.min(pts.length - 1, Math.round(t * (pts.length - 1)));
    const side = k % 2 ? 1 : -1, e = side > 0 ? rb.L[i] : rb.R[i];
    const l = ra(12, 22) * (meanW > 50 ? 1 : 0.7);
    o.push(`<path class="sc-curl" d="M${tk(e[0])} ${tk(e[1])}c${tk(side * l * 0.5)} ${tk(-3)} ${tk(side * l)} ${tk(-1)} ${tk(side * l * 0.8)} ${tk(4)}c${tk(-side * 4)} ${tk(-2)} ${tk(-side * l * 0.6)} ${tk(0)} ${tk(-side * l * 0.8)} ${tk(-1)}Z"/>`);
  }
  // the dark eye where a limb leaves
  for (const t of eyes) {
    const i = Math.min(pts.length - 1, Math.round(t * (pts.length - 1)));
    const [px, py] = pts[i], w = wf(t);
    o.push(`<path class="sc-eye2" d="M${tk(px - w * 0.18)} ${tk(py)}Q${tk(px)} ${tk(py - 9)} ${tk(px + w * 0.2)} ${tk(py - 1)}Q${tk(px + w * 0.02)} ${tk(py + 6)} ${tk(px - w * 0.18)} ${tk(py)}Z"/>`);
  }
  // the swell at the root
  const [bx, by] = pts[0], bw = wf(0);
  o.push(`<path class="sc-ln2" d="M${tk(bx - bw / 2 - 12)} ${tk(by + 3)}Q${tk(bx - bw / 2 - 1)} ${tk(by - 6)} ${tk(bx - bw / 2 + 1)} ${tk(by - 36)}M${tk(bx + bw / 2 + 12)} ${tk(by + 3)}Q${tk(bx + bw / 2 + 1)} ${tk(by - 6)} ${tk(bx + bw / 2 - 1)} ${tk(by - 36)}"/>`);
  return (t) => {
    const i = Math.min(pts.length - 1, Math.max(0, Math.round(t * (pts.length - 1))));
    return { at: pts[i], w: wf(t) };
  };
}

/** Shorthand: grow a limb from a trunk sampler at t. */
function bough(tr, t, side, len, rise, droop, w0, w1, opts = {}) {
  const { at, w } = tr(t);
  const sx = at[0] + side * w * 0.12, sy = at[1];
  const wob = ra(-0.16, 0.16) * len;
  const p = [[sx, sy], [sx + side * len * 0.36, sy - rise * 0.5 + wob], [sx + side * len * 0.72, sy - rise * 1.05 + droop * 0.2 - wob * 0.8], [sx + side * len, sy - rise + droop]];
  const f = limb(p, w0 ?? Math.max(10, w * 0.42), w1 ?? 3);
  dress(f, opts);
  // sub-limb, a smaller one off the middle, to break the single sweep
  if (opts.sub) {
    const { at: a2, dir } = f(0.5);
    const sl = len * 0.42, sd = opts.sub;
    const p2 = [[a2[0], a2[1]], [a2[0] + side * sl * 0.3, a2[1] - sd * 0.9], [a2[0] + side * sl * 0.7, a2[1] - sd * 1.2], [a2[0] + side * sl, a2[1] - sd * 0.7]];
    const f2 = limb(p2, 7, 2.4);
    dress(f2, { gap: 34, len: [22, 48], scale: opts.scale ?? 1 });
  }
  return f;
}

/* ---------- rocks, ground, far ---------- */

function smooth(pts) {
  const n = pts.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const p = new Path();
  const m0 = mid(pts[n - 1], pts[0]);
  p.M(m0[0], m0[1]);
  for (let i = 0; i < n; i++) { const m = mid(pts[i], pts[(i + 1) % n]); p.Q(pts[i][0], pts[i][1], m[0], m[1]); }
  return p.d() + 'Z';
}
/** A pierced scholar's rock: tall, waisted, with holes and contour strokes. */
function rock(cx, base, w, h, holes = 2) {
  const n = 18, pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 2 * PI - PI / 2;
    const y = Math.sin(a), x = Math.cos(a);
    const yn = (y + 1) / 2; // 0 top .. 1 bottom
    const widen = 0.52 + 0.58 * Math.pow(yn, 0.8) + 0.16 * Math.sin(yn * 11 + cx);
    pts.push([cx + x * (w / 2) * widen * ra(0.86, 1.14), base - h / 2 + y * (h / 2) * ra(0.96, 1.04)]);
  }
  const d = smooth(pts);
  out.rocks.push(`<path class="sc-rock" d="${d}"/>`);
  const shade = pts.map(([x, y]) => [cx + (x - cx) * 0.9 + w * 0.08, y]).filter(([x]) => x > cx - w * 0.1);
  out.rocks.push(`<path class="sc-rockshade" d="${smooth(pts.map(([x, y]) => [x > cx ? x : cx + w * 0.12, y]))}"/>`);
  const lines = new Path();
  for (const k of [0.8, 0.58, 0.36]) {
    const sp = pts.map(([x, y]) => [cx + (x - cx) * k, base - h / 2 + (y - (base - h / 2)) * (0.15 + 0.85 * k) ]);
    const m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    for (let i = 0; i < n; i += 1) {
      if (R() < 0.42) continue;
      const a = m(sp[(i + n - 1) % n], sp[i]), b = m(sp[i], sp[(i + 1) % n]);
      lines.M(a[0], a[1]).Q(sp[i][0], sp[i][1], b[0], b[1]);
    }
  }
  out.rocks.push(`<path class="sc-ln2" d="${lines.d()}"/>`);
  for (let k = 0; k < holes; k++) {
    const hx = cx + ra(-0.16, 0.16) * w, hy = base - h * (0.3 + 0.28 * k + ra(-0.04, 0.04));
    const hw = w * ra(0.07, 0.11), hh = h * ra(0.05, 0.08);
    const hp = Array.from({ length: 8 }, (_, i) => [hx + Math.cos((i / 8) * 2 * PI) * hw * ra(0.8, 1.15), hy + Math.sin((i / 8) * 2 * PI) * hh * ra(0.8, 1.15)]);
    out.rocks.push(`<path class="sc-hole" d="${smooth(hp)}"/>`);
  }
  out.rocks.push(`<path class="sc-ln" d="${d}"/>`);
  // grass at the foot
  grass(cx - w * 0.5, base, 5); grass(cx + w * 0.42, base + 4, 4);
}
function grass(x, y, n, h = 24) {
  const p = new Path();
  for (let i = 0; i < n; i++) {
    const x0 = x + ra(-14, 14), hh = ra(h * 0.5, h * 1.2), bend = ra(-9, 9);
    p.M(x0, y).Q(x0 + bend * 0.3, y - hh * 0.5, x0 + bend, y - hh);
  }
  out.ground.push(`<path class="sc-grass" d="${p.d()}"/>`);
}
function fern(x, y, len, ang) {
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const stem = new Path(); stem.M(x, y).Q(x + dx * len * 0.55 - dy * 8, y + dy * len * 0.55 + dx * 8, x + dx * len, y + dy * len);
  out.ground.push(`<path class="sc-twig" d="${stem.d()}"/>`);
  const n = 9;
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1), px = x + dx * len * t - dy * 8 * t * (1 - t) * 2, py = y + dy * len * t + dx * 8 * t * (1 - t) * 2;
    const s = (1 - t * 0.7) * 11;
    for (const side of [-1, 1]) {
      const a = ang + side * (1.15 - t * 0.35);
      out.ground.push(`<path class="sc-fern" d="M${tk(px)} ${tk(py)}q${tk(Math.cos(a) * s * 0.6 - Math.sin(a) * 1.6)} ${tk(Math.sin(a) * s * 0.6 + Math.cos(a) * 1.6)} ${tk(Math.cos(a) * s)} ${tk(Math.sin(a) * s)}q${tk(-Math.cos(a) * s * 0.35 - Math.sin(a) * 2.4)} ${tk(-Math.sin(a) * s * 0.35 + Math.cos(a) * 2.4)} ${tk(-Math.cos(a) * s)} ${tk(-Math.sin(a) * s)}Z"/>`);
    }
  }
}
function flower(x, y, s) {
  const p = new Path();
  for (let i = 0; i < 5; i++) { const a = (i / 5) * 2 * PI - PI / 2; p.M(x, y).Q(x + Math.cos(a - 0.5) * 5 * s, y + Math.sin(a - 0.5) * 5 * s, x + Math.cos(a) * 7 * s, y + Math.sin(a) * 7 * s).Q(x + Math.cos(a + 0.5) * 5 * s, y + Math.sin(a + 0.5) * 5 * s, x, y); }
  out.ground.push(`<path class="sc-petal" d="${p.d()}"/><circle class="sc-gold" cx="${tk(x)}" cy="${tk(y)}" r="${tk(1.6 * s)}"/>`);
}

/* ---------- compose ---------- */

// far hills and mist: two soft ridges, flat washes
out.far.push(`<path class="sc-hill1" d="M0 880C140 820 250 790 400 830C520 862 600 800 760 780C900 762 1000 820 1130 800C1260 780 1360 700 1500 720C1560 730 1590 740 1600 745V1300H0Z"/>`);
out.far.push(`<path class="sc-hill2" d="M0 960C180 930 300 960 470 940C650 920 760 880 940 900C1120 920 1220 880 1400 890C1500 896 1560 920 1600 930V1300H0Z"/>`);
// far thin birches, pale and small
for (const [x, y0, y1, w] of [[470, 1010, 330, 20], [915, 1030, 260, 22], [1275, 1000, 340, 18], [75, 1040, 500, 22]]) {
  trunk([[x, y0], [x + 7, (y0 + y1) / 2], [x - 4, y1]], w, w * 0.55, { curls: 0, lens: 0.5, layer: 'farT' });
}
// ground wash
out.ground.push(`<path class="sc-ground" d="M0 1118C120 1096 220 1112 360 1100C520 1086 660 1108 820 1100C980 1092 1100 1112 1260 1098C1400 1086 1510 1104 1600 1096V1300H0Z"/>`);
{
  const p = new Path();
  for (let i = 0; i < 70; i++) { const x = ra(0, 1600), y = ra(1130, 1290), l = ra(10, 34); p.M(x, y).Q(x + l / 2, y - 2.5, x + l, y); }
  out.ground.push(`<path class="sc-ln2" d="${p.d()}"/>`);
}

// rocks
rock(445, 1186, 150, 250, 3);
rock(1005, 1238, 230, 120, 1);
rock(1525, 1190, 130, 200, 2);
rock(120, 1250, 150, 110, 1);
for (const [x, y, l, a] of [[540, 1200, 90, -1.2], [380, 1190, 80, -1.9], [1080, 1215, 76, -1.35], [1470, 1200, 84, -1.7], [860, 1240, 70, -1.1], [210, 1230, 74, -1.6]]) fern(x, y, l, a);
for (const [x, y] of [[300, 1206], [700, 1216], [905, 1250], [1260, 1190], [1390, 1210], [610, 1260], [1180, 1262]]) { grass(x, y, 5, 26); }
for (const [x, y, s] of [[320, 1226, 1], [335, 1218, 0.8], [690, 1232, 1.1], [1230, 1212, 0.9], [1245, 1222, 1], [880, 1262, 1], [1180, 1236, 0.9]]) flower(x, y, s);

// trunks and limbs
const T1 = trunk([[255, 1190], [286, 1010], [236, 830], [214, 640], [250, 420], [268, 200], [226, -60]], 80, 42, { eyes: [0.52, 0.62, 0.78, 0.9, 0.34], curls: 8 });
const T3 = trunk([[1130, 1180], [1100, 1000], [1146, 800], [1166, 580], [1128, 340], [1090, 100], [1138, -60]], 72, 38, { eyes: [0.5, 0.64, 0.8, 0.9, 0.3], curls: 8 });
const T5 = trunk([[1525, 1200], [1500, 1020], [1540, 820], [1556, 600], [1520, 380], [1490, 160], [1530, -60]], 66, 32, { eyes: [0.44, 0.7, 0.86], curls: 6 });
const T2 = trunk([[640, 1170], [668, 1000], [626, 850], [650, 700], [616, 560]], 46, 24, { eyes: [0.5, 0.7], curls: 4 });
const T4 = trunk([[1385, 1140], [1395, 950], [1380, 780], [1400, 600], [1395, 430]], 38, 18, { eyes: [0.6, 0.82], curls: 3 });

const bR = [];
bR.push(bough(T1, 0.62, 1, 330, 120, 40, 24, 5, { sub: 90 }));
bR.push(bough(T1, 0.8, 1, 400, 170, 10, 20, 4, { sub: 70 }));
bR.push(bough(T1, 0.42, -1, 260, 80, 90, 20, 4));
bR.push(bough(T1, 0.9, -1, 230, 130, 10, 15, 4));
bR.push(bough(T1, 0.3, 1, 190, 40, 70, 14, 3.5));
bR.push(bough(T3, 0.62, -1, 340, 190, 20, 22, 5, { sub: 90 }));
bR.push(bough(T3, 0.82, -1, 300, 200, -10, 18, 4, { sub: 60 }));
bR.push(bough(T3, 0.5, 1, 260, 100, 60, 20, 4, { sub: 70 }));
bR.push(bough(T3, 0.86, 1, 240, 120, 20, 15, 4));
bR.push(bough(T5, 0.66, -1, 280, 80, 70, 20, 4, { sub: 80 }));
bR.push(bough(T5, 0.84, -1, 240, 110, 30, 16, 4));
bR.push(bough(T5, 0.52, -1, 170, 20, 80, 12, 3.2));
bR.push(bough(T2, 0.55, -1, 160, 60, 60, 12, 3.4));
bR.push(bough(T2, 0.7, 1, 190, 80, 60, 14, 3.6, { sub: 50 }));
bR.push(bough(T2, 0.98, -1, 110, 120, 10, 12, 3.5));
bR.push(bough(T2, 1.0, 1, 150, 130, 0, 12, 3.5));
bR.push(bough(T2, 1.0, 1, 40, 150, 0, 9, 3));
bR.push(bough(T4, 0.58, -1, 140, 70, 60, 11, 3.2));
bR.push(bough(T4, 0.84, 1, 150, 80, 50, 11, 3.2));
bR.push(bough(T4, 1.0, 1, 40, 120, 0, 9, 3));
bR.push(bough(T4, 1.0, -1, 70, 110, 0, 9, 3));

// birds: a pair perched on T1's upper bough, a pair on T3's, flyers across
const pb = (x, y, s, flip, cls) => out.birds.push(`<use href="#sc-pb" transform="translate(${tk(x)} ${tk(y)}) scale(${tk(flip * s)} ${tk(s)})" class="${cls}"/>`);
const fb = (x, y, s, rot, flip, cls) => out.birds.push(`<use href="#sc-fb" transform="translate(${tk(x)} ${tk(y)}) rotate(${tk(rot)}) scale(${tk(flip * s)} ${tk(s)})" class="${cls}"/>`);
{
  const f1 = bR[1](0.55).at, f2 = bR[5](0.55).at, f3 = bR[9](0.5).at;
  pb(f1[0] - 6, f1[1] + 2, 1.25, 1, 'sc-birdA'); pb(f1[0] + 68, f1[1] - 6, 1.05, -1, 'sc-birdB');
  pb(f2[0] + 4, f2[1] + 1, 1.15, -1, 'sc-birdB');
  pb(f3[0] - 8, f3[1] + 3, 1.0, 1, 'sc-birdA');
  fb(780, 190, 1.35, -8, 1, 'sc-birdA'); fb(870, 130, 1.0, -12, 1, 'sc-birdB'); fb(930, 235, 0.8, -4, 1, 'sc-birdB');
  fb(720, 520, 0.95, 10, -1, 'sc-birdB'); fb(1330, 300, 0.9, -6, -1, 'sc-birdA'); fb(560, 850, 0.75, -10, 1, 'sc-birdA');
  fb(1260, 900, 0.8, 8, -1, 'sc-birdB');
}

/* ---------- assemble ---------- */

const defs = `<g id="sc-l1"><path class="sc-lf" d="${lf1.body}"/><path class="sc-vein" d="${lf1.veins}"/></g>
<g id="sc-l2"><path class="sc-lf2" d="${lf2.body}"/><path class="sc-vein" d="${lf2.veins}"/></g>
<g id="sc-ck"><path class="sc-ln" d="${ck.stem}"/><path class="sc-cat" d="${ck.body}"/><path class="sc-ln2" d="${ck.ticks}"/></g>
<g id="sc-pb">${perchedBird.trim()}</g>
<g id="sc-fb">${flyingBird.trim()}</g>`;

const sceneG = ['far', 'farT', 'ground', 'rocks', 'limbs', 'trunks', 'twigs', 'leaves', 'catkins', 'birds']
  .map((k) => `<g class="g-${k}">${out[k].join('')}</g>`).join('\n');

const defsHtml = `<svg class="gm-scene-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>
${defs}
<g id="gm-scene">
${sceneG}
</g></defs></svg>
<svg class="gm-scene-art wide" viewBox="0 0 1600 1300" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><use href="#gm-scene"/></svg>
<svg class="gm-scene-art panel-a" viewBox="60 0 740 1300" preserveAspectRatio="xMinYMid slice" aria-hidden="true" focusable="false"><use href="#gm-scene"/></svg>
<svg class="gm-scene-art panel-b" viewBox="860 0 740 1300" preserveAspectRatio="xMaxYMid slice" aria-hidden="true" focusable="false"><use href="#gm-scene"/></svg>
`;
writeFileSync(join(HERE, 'scene-defs.svg.html'), defsHtml);

/* ---------- the oval's birch ---------- */

reseed(2210);
{
  const o = { limbs: [], twigs: [], leaves: [], cats: [], trunk: [], ground: [] };
  const trk = [[98, 282], [105, 224], [90, 168], [103, 112], [91, 58], [101, 6], [94, -60]];
  const pts = catmull(trk, 10);
  const wf = (t) => 33 - 15 * t + 1.4 * Math.sin(t * 13);
  const rb = ribbon(pts, wf);
  // trunk: a flat paper wash, a shade wash laid a hair off, then the ink
  o.trunk.push(`<path class="bb-trunk" d="${poly(rb.poly)}"/>`);
  const shade = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const n = Math.hypot(dx, dy) || 1; dx /= n; dy /= n;
    const w = wf(i / (pts.length - 1)) / 2;
    shade.push([pts[i][0] - dy * w * 0.3 + 1.2, pts[i][1] + dx * w * 0.3 + 1]);
  }
  o.trunk.push(`<path class="bb-shade" d="${poly([...shade, ...rb.L.map((p, i) => [p[0] - (p[0] - pts[i][0]) * 0.05 + 1.2, p[1] + 1]).reverse()])}"/>`);
  const pL = new Path(); const N = rb.L.length;
  for (let s = 0; s < N - 1; s += 14) pL.poly(rb.R.slice(s, Math.min(N, s + 10)), false);
  o.trunk.push(`<path class="bb-ln" d="${pL.d()}"/><path class="bb-ln2" d="${poly(rb.L, false)}"/>`);
  // papery bark: horizontal bands that lift at the edge, and dark lenticels
  const lent = new Path();
  for (let t = 0.03; t < 0.99; t += ra(0.032, 0.058)) {
    const i = Math.min(pts.length - 1, Math.round(t * (pts.length - 1)));
    const [px, py] = pts[i], w = wf(t);
    const a = ra(-0.44, 0.08) * w, b = a + ra(0.32, 0.6) * w;
    lent.M(px + a, py).Q(px + (a + b) / 2, py + ra(0.8, 1.8), px + b, py + ra(-0.8, 0.8));
  }
  o.trunk.push(`<path class="bb-lent" d="${lent.d()}"/>`);
  for (let k = 0; k < 9; k++) {
    const t = 0.06 + k * 0.1 + ra(-0.02, 0.02), i = Math.min(pts.length - 1, Math.round(t * (pts.length - 1)));
    const side = k % 2 ? 1 : -1, e = side > 0 ? rb.L[i] : rb.R[i], l = ra(7, 11);
    o.trunk.push(`<path class="bb-curl" d="M${tk(e[0])} ${tk(e[1])}c${tk(side * l * 0.5)} -2.4 ${tk(side * l)} -.6 ${tk(side * l * 0.8)} 2.8c${tk(-side * 2.6)} -1.4 ${tk(-side * l * 0.6)} 0 ${tk(-side * l * 0.8)} -.8Z"/>`);
  }
  // the root swell
  o.trunk.push(`<path class="bb-ln2" d="M${tk(trk[0][0] - 29)} 284Q${tk(trk[0][0] - 20)} 276 ${tk(trk[0][0] - 17)} 254M${tk(trk[0][0] + 29)} 284Q${tk(trk[0][0] + 20)} 276 ${tk(trk[0][0] + 17)} 254"/>`);
  // limbs: four boughs, tapered and painted, each with its black eye at the collar
  const boughs = [
    { t: 0.62, side: -1, to: [-4, 148], c: [[58, 178], [24, 168]], w: 6 },
    { t: 0.46, side: 1, to: [214, 150], c: [[142, 176], [186, 142]], w: 6.5 },
    { t: 0.76, side: 1, to: [220, 82], c: [[136, 108], [184, 62]], w: 6 },
    { t: 0.9, side: -1, to: [26, 36], c: [[82, 58], [56, 30]], w: 5 },
    { t: 0.3, side: -1, to: [34, 196], c: [[70, 226], [48, 214]], w: 4.5 },
  ];
  const lfAt = (x, y, rot, s, alt) => o.leaves.push(uw(alt ? 'bb-l2' : 'bb-l1', x, y, rot, s));
  const eyes = [];
  for (const b of boughs) {
    const i = Math.round(b.t * (pts.length - 1)), [sx, sy] = pts[i], w = wf(b.t);
    const p0 = [sx + b.side * w * 0.1, sy];
    const p = [p0, b.c[0], b.c[1], b.to];
    const bp = []; for (let k = 0; k <= 12; k++) bp.push(bez(p, k / 12));
    const r2 = ribbon(bp, (t) => b.w - (b.w - 1.6) * Math.pow(t, 0.8));
    o.limbs.push(`<path class="bb-limb" d="${poly(r2.poly)}"/>`);
    eyes.push(`<path class="bb-eye" d="M${tk(sx - 6)} ${tk(sy + 1)}Q${tk(sx)} ${tk(sy - 8)} ${tk(sx + 7)} ${tk(sy)}Q${tk(sx + 1)} ${tk(sy + 5)} ${tk(sx - 6)} ${tk(sy + 1)}Z"/>`);
    // hanging twigs with serrated leaves and catkins
    const nT = 4;
    for (let k = 0; k < nT; k++) {
      const t = 0.3 + (k / (nT - 1)) * 0.7, at = bez(p, t), dir = bezTan(p, t);
      const len = ra(26, 44) * (1 - 0.2 * t), lean = ra(-8, 12) + dir[0] * 6;
      const ex = at[0] + lean, ey = at[1] + len;
      o.twigs.push(`<path class="bb-twig" d="M${tk(at[0])} ${tk(at[1])}Q${tk(at[0] + lean * 0.1)} ${tk(at[1] + len * 0.5)} ${tk(ex)} ${tk(ey)}"/>`);
      const n = Math.round(len / 11) + 1;
      for (let j = 1; j <= n; j++) {
        const u = j / n, px = at[0] + lean * u * u, py = at[1] + len * u, side = j % 2 ? 1 : -1;
        lfAt(px, py, 90 + side * ra(32, 72) + lean * 0.4 + ra(-16, 16), (0.5 + 0.34 * u) * ra(0.92, 1.12), (j + k) % 3 === 0);
      }
      lfAt(ex, ey, 90 + ra(-28, 28), ra(0.78, 1), k % 2 === 0);
      if (k % 2 === 1) o.cats.push(uw('bb-ck', ex + ra(-3, 3), ey + 1, ra(-10, 10), ra(0.78, 1)));
    }
  }
  // the faint ground line: a low swell, three stones and a few blades
  const g = new Path();
  g.M(-30, 272).C(10 + ra(-4, 4), 266, 54, 275, 98, 271).C(140, 267, 190, 276, 270, 270);
  o.ground.push(`<path class="bb-ground" d="${g.d()}"/>`);
  const gr = new Path();
  for (const [x, h] of [[44, 13], [52, 18], [60, 11], [128, 15], [137, 20], [146, 12], [196, 12], [203, 16]]) { gr.M(x, 272).Q(x + ra(-3, 3), 272 - h / 2, x + ra(-5, 5), 272 - h); }
  o.ground.push(`<path class="bb-grass" d="${gr.d()}"/>`);
  o.ground.push(`<path class="bb-stone" d="M158 274Q160 265 169 264Q178 264 181 274Z"/><path class="bb-stone" d="M30 275Q32 269 39 269Q45 269 46 275Z"/>`);

  const birchDefs = (() => {
    const A = leafShape(24, 5.1, 8, 1.4, 0.2), B = leafShape(21, 4.6, 7, -1.6, 0.6);
    return `<g id="bb-l1"><path class="bb-lf" d="${A.body}"/><path class="bb-vein" d="${A.veins}"/></g>
<g id="bb-l2"><path class="bb-lf2" d="${B.body}"/><path class="bb-vein" d="${B.veins}"/></g>
<g id="bb-ck"><path class="bb-ln" d="${ck.stem}"/><path class="bb-cat" d="${ck.body}"/><path class="bb-ln2" d="${ck.ticks}"/></g>`;
  })();
  const svg = `<svg class="gm-birch" viewBox="0 0 240 300" aria-hidden="true" focusable="false"><defs>${birchDefs}</defs>
<g class="bb-gnd">${o.ground.join('')}</g>
<g>${o.limbs.join('')}</g>
<g>${o.trunk.join('')}</g>
<g>${eyes.join('')}</g>
<g>${o.twigs.join('')}</g>
<g>${o.leaves.join('')}</g>
<g>${o.cats.join('')}</g>
</svg>
`;
  writeFileSync(join(HERE, 'birch.svg.html'), svg);
}

/* ---------- stats and preview ---------- */

const bytes = (s) => ({ raw: Buffer.byteLength(s), gzip: gzipSync(s).length });
const scene = defsHtml, birchHtml = (await import('node:fs')).readFileSync(join(HERE, 'birch.svg.html'), 'utf8');
const stats = { scene: bytes(scene), birch: bytes(birchHtml), counts: { ...used, birds: (defsHtml.match(/href="#sc-(pb|fb)"/g) || []).length } };
writeFileSync(join(HERE, 'scene-stats.json'), JSON.stringify(stats, null, 1) + '\n');
console.log(JSON.stringify(stats));

