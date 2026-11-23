/** BDL-007 The Shining Tree (2.5D points and lines). Ported from the mockup's spec-b.js. */
import { T, TAU, mulberry32 } from '../draw';
import type { Mini, MiniFactory } from '../types';

export const hint = 'Move to turn it';

type V3 = [number, number, number];
type Leaf = { p: V3; c: string; s: number; ph: number };
type Seg = { a: V3; b: V3; w: number };

const factory: MiniFactory = (): Mini => {
  let W = 0, H = 0, spin = 0.55;
  const r = mulberry32(707);
  const R = (y: number) => 0.034 * (1 - 0.55 * y) + (y < 0.07 ? 0.02 * (1 - y / 0.07) : 0);
  const CX = (y: number) => 0.012 * Math.sin(y * 5.5);
  const dashes: { y: number; th: number; len: number; th2: number }[] = [];
  for (let i = 0; i < 640; i++) dashes.push({ y: Math.pow(r(), 0.95) * 0.96, th: r() * TAU, len: 0.008 + r() * 0.028, th2: 0.9 + r() * 1.6 });
  const segs: Seg[] = [], leaves: Leaf[] = [];
  const LEAF = ['#5f8a4a', '#86a86a', '#3f6b3a', '#a3bd8f', '#2f5a3a'];
  function grow(p: V3, d: V3, len: number, depth: number, w: number) {
    const e: V3 = [p[0] + d[0] * len, p[1] + d[1] * len, p[2] + d[2] * len];
    segs.push({ a: p, b: e, w });
    if (depth >= 2) {
      const n = depth === 2 ? 11 : 6;
      for (let i = 0; i < n; i++) leaves.push({ p: [e[0] + (r() - 0.5) * 0.085, e[1] + (r() - 0.35) * 0.07, e[2] + (r() - 0.5) * 0.085], c: LEAF[Math.floor(r() * LEAF.length)]!, s: 1.6 + r() * 1.9, ph: r() * TAU });
    }
    if (depth < 2) for (let k = 0; k < 2; k++) {
      const a = r() * 0.9 + 0.35, b = r() * TAU;
      let nd: V3 = [d[0] + Math.cos(b) * a * 0.6, d[1] + 0.25 + (r() - 0.5) * 0.3, d[2] + Math.sin(b) * a * 0.6];
      const nl = Math.hypot(...nd); nd = nd.map((v) => v / nl) as V3;
      grow(e, nd, len * (0.58 + r() * 0.1), depth + 1, w * 0.6);
    }
    if (depth === 1) for (let i = 0; i < 4; i++) leaves.push({ p: [e[0] + (r() - 0.5) * 0.06, e[1] + (r() - 0.5) * 0.05, e[2] + (r() - 0.5) * 0.06], c: LEAF[Math.floor(r() * LEAF.length)]!, s: 1.5 + r() * 1.6, ph: r() * TAU });
  }
  for (let i = 0; i < 15; i++) {
    const y0 = 0.3 + r() * 0.6, ang = r() * TAU, out = 0.9 - y0 * 0.45;
    const d: V3 = [Math.cos(ang) * out, 0.35 + r() * 0.35, Math.sin(ang) * out];
    const dl = Math.hypot(...d);
    grow([CX(y0) + Math.cos(ang) * R(y0), y0, Math.sin(ang) * R(y0)], d.map((v) => v / dl) as V3, 0.2 * (1.15 - y0 * 0.7) + r() * 0.04, 0, 1);
  }
  // crown
  for (let i = 0; i < 90; i++) { const a = r() * TAU, rad = Math.sqrt(r()) * 0.09; leaves.push({ p: [Math.cos(a) * rad, 0.93 + r() * 0.1, Math.sin(a) * rad], c: LEAF[Math.floor(r() * LEAF.length)]!, s: 1.6 + r() * 1.6, ph: r() * TAU }); }
  return {
    t0: 0,
    resize(w, h) { W = w; H = h; },
    draw(c, t, dt, p) {
      spin += dt * 0.16 * (1 - p.a);
      const yaw = spin + (p.x - 0.5) * 5.2 * p.a;
      const cs = Math.cos(yaw), sn = Math.sin(yaw);
      const S = H * 0.72 * (1 + 0.012 * Math.sin(t * 0.9)), baseY = H * 0.85, cx0 = W / 2;
      const dark = T.dark;
      c.fillStyle = T.field; c.fillRect(0, 0, W, H);
      const gl = c.createRadialGradient(cx0, H * 0.45, 10, cx0, H * 0.45, W * 0.5);
      gl.addColorStop(0, dark ? 'rgba(163,189,143,.14)' : 'rgba(43,74,55,.10)'); gl.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = gl; c.fillRect(0, 0, W, H);
      // pedestal
      const pw = S * 0.36, ph = S * 0.07;
      c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(cx0, baseY + S * 0.085, pw * 1.15, ph * 0.9, 0, 0, TAU); c.fill();
      const side = c.createLinearGradient(cx0 - pw, 0, cx0 + pw, 0);
      side.addColorStop(0, dark ? '#4a3c2f' : '#5a4838'); side.addColorStop(0.5, dark ? '#6b5845' : '#7a6450'); side.addColorStop(1, dark ? '#3c3027' : '#463829');
      c.fillStyle = side; c.beginPath(); c.moveTo(cx0 - pw, baseY); c.lineTo(cx0 - pw, baseY + S * 0.06); c.ellipse(cx0, baseY + S * 0.06, pw, ph, 0, Math.PI, 0, true); c.lineTo(cx0 + pw, baseY); c.closePath(); c.fill();
      c.fillStyle = dark ? '#847059' : '#9b8468'; c.beginPath(); c.ellipse(cx0, baseY, pw, ph, 0, 0, TAU); c.fill();
      c.fillStyle = '#4f7a40'; c.beginPath(); c.ellipse(cx0, baseY - 1, pw * 0.8, ph * 0.72, 0, 0, TAU); c.fill();
      // projection
      const proj = (q: V3): V3 => { const x = q[0] * cs - q[2] * sn, z = q[0] * sn + q[2] * cs; return [cx0 + x * S, baseY - q[1] * S + z * S * 0.05, z]; };
      const lq = (l: Leaf): V3 => { const pp = proj(l.p); const sway = Math.sin(t * 0.7 + l.ph) * 1.6; return [pp[0] + sway, pp[1] + Math.cos(t * 0.6 + l.ph) * 1.1, pp[2]]; };
      const leaf = (list: Leaf[], front: boolean) => {
        for (const l of list) {
          const q = lq(l); if ((q[2] >= 0) !== front) continue;
          c.globalAlpha = front ? 1 : 0.7; c.fillStyle = l.c; const s = l.s * (1 + 0.04 * Math.sin(t * 0.9 + l.ph)) * (S / 520 + 0.45);
          c.fillRect(q[0] - s / 2, q[1] - s / 2, s, s * 1.15);
        }
        c.globalAlpha = 1;
      };
      const drawSegs = (front: boolean) => {
        c.lineCap = 'round';
        for (const s of segs) {
          const a = proj(s.a), b = proj(s.b); if ((((a[2] + b[2]) / 2) >= 0) !== front) continue;
          c.strokeStyle = dark ? 'rgba(228,220,200,.82)' : 'rgba(62,50,38,.85)'; c.lineWidth = Math.max(0.8, s.w * S * 0.011);
          c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
        }
      };
      leaf(leaves, false); drawSegs(false);
      // trunk
      const N = 14, tg = c.createLinearGradient(cx0 - R(0) * S, 0, cx0 + R(0) * S, 0);
      tg.addColorStop(0, dark ? '#bdb59f' : '#cfc6b0'); tg.addColorStop(0.4, '#f1ecdf'); tg.addColorStop(1, dark ? '#9d957f' : '#b6ad96');
      c.fillStyle = tg; c.beginPath();
      for (let i = 0; i <= N; i++) { const y = i / N; c.lineTo(cx0 + (CX(y) - R(y)) * S, baseY - y * S); }
      for (let i = N; i >= 0; i--) { const y = i / N; c.lineTo(cx0 + (CX(y) + R(y)) * S, baseY - y * S); }
      c.closePath(); c.fill();
      c.strokeStyle = dark ? 'rgba(244,240,230,.5)' : 'rgba(40,32,24,.55)'; c.lineWidth = 1.1; c.stroke();
      for (const d of dashes) {
        const a = d.th + yaw, z = Math.cos(a); if (z < 0.08) continue;
        const sx = cx0 + (CX(d.y) + R(d.y) * Math.sin(a)) * S, sy = baseY - d.y * S;
        const len = d.len * S * z * d.th2;
        c.fillStyle = `rgba(36,28,20,${0.3 + 0.55 * z})`;
        c.fillRect(sx - len / 2, sy, len, Math.max(1.2, S * 0.0036));
      }
      drawSegs(true); leaf(leaves, true);
    },
  };
};

export default factory;
