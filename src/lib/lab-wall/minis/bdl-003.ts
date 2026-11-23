/** BDL-003 Novgorod Letters. Ported from the mockup's spec-a.js. */
import { T, clamp, ease, lerp, mulberry32 } from '../draw';
import type { Mini, MiniFactory } from '../types';

export const hint = 'Move to scratch';

type Pt = { x: number; y: number };
type Stroke = { pts: Pt[]; len: number };
type PlanItem = { g: string; l: number; col: number; jit: number; sc: number };
type Travel = { a: Pt; b: Pt; u: number };

const GLYPH: Record<string, number[][][]> = {
  zh: [[[.5, 0], [.5, 1]], [[0, 0], [.5, .5], [0, 1]], [[1, 0], [.5, .5], [1, 1]]],
  i: [[[0, 1], [0, 0]], [[0, 1], [1, 0]], [[1, 0], [1, 1]]],
  d: [[[.05, .72], [.95, .72]], [[.2, .72], [.35, 0], [.8, 0], [.8, .72]], [[0, .72], [0, 1]], [[1, .72], [1, 1]]],
  ya: [[[1, 1], [1, 0], [.3, 0], [0, .25], [.3, .5], [1, .5]], [[.3, .5], [0, 1]]],
  sh: [[[0, 0], [0, 1], [1, 1], [1, 0]], [[.5, 0], [.5, 1]]],
  soft: [[[0, 0], [0, 1], [.72, 1], [.95, .75], [.72, .5], [0, .5]]],
  t: [[[0, 0], [1, 0]], [[.5, 0], [.5, 1]]],
  o: [[[.5, 0], [.85, .12], [1, .5], [.85, .88], [.5, 1], [.15, .88], [0, .5], [.15, .12], [.5, 0]]],
  x: [[[0, 0], [1, 1]], [[1, 0], [0, 1]]],
  l: [[[0, 1], [.4, 0], [1, 0]], [[.55, 0], [.9, 1]]],
  yat: [[[0, .25], [.65, .25]], [[.3, 0], [.3, 1]], [[.3, .72], [.85, .72], [1, .86], [.85, 1], [.3, 1]]],
  v: [[[0, 0], [.5, 1], [1, 0]]],
  k: [[[0, 0], [0, 1]], [[0, .5], [1, 0]], [[0, .5], [1, 1]]],
};
const GKEYS = Object.keys(GLYPH);

const factory: MiniFactory = (): Mini => {
  let W = 0, H = 0, dpr = 1;
  let bark: HTMLCanvasElement | null = null, scratch: HTMLCanvasElement | null = null;
  let sc: CanvasRenderingContext2D;
  let rnd = mulberry32(1066), plan: PlanItem[] = [], strokes: Stroke[] = [], si = 0, sd = 0, nib: Pt = { x: 0, y: 0 }, travel: Travel | null = null;
  let userLast: Pt | null = null, holdUntil = 0, heal: number | null = null, ready = false;
  let area = { x: 0, y: 0, w: 0, h: 0 };

  function buildBark() {
    bark = document.createElement('canvas'); bark.width = Math.round(W * dpr); bark.height = Math.round(H * dpr);
    const b = bark.getContext('2d')!; b.scale(dpr, dpr);
    const r = mulberry32(77);
    const px = W * 0.09, py = H * 0.11, pw = W * 0.82, ph = H * 0.78;
    area = { x: px, y: py, w: pw, h: ph };
    const pts: [number, number][] = [];
    const N = 64;
    for (let i = 0; i < N; i++) {
      const u = i / N; let x: number, y: number;
      if (u < 0.25) { x = px + pw * (u / 0.25); y = py; }
      else if (u < 0.5) { x = px + pw; y = py + ph * ((u - 0.25) / 0.25); }
      else if (u < 0.75) { x = px + pw * (1 - (u - 0.5) / 0.25); y = py + ph; }
      else { x = px; y = py + ph * (1 - (u - 0.75) / 0.25); }
      pts.push([x + (r() - 0.5) * 7, y + (r() - 0.5) * 7]);
    }
    const path = () => { b.beginPath(); pts.forEach(([x, y], i) => (i ? b.lineTo(x, y) : b.moveTo(x, y))); b.closePath(); };
    b.save(); b.shadowColor = 'rgba(0,0,0,.35)'; b.shadowBlur = 22; b.shadowOffsetY = 10; path();
    b.fillStyle = '#d9c8a2'; b.fill(); b.restore();
    path(); b.save(); b.clip();
    const g = b.createLinearGradient(px, py, px + pw, py + ph);
    g.addColorStop(0, '#e9dcbc'); g.addColorStop(0.55, '#dccaa2'); g.addColorStop(1, '#cdb78c');
    b.fillStyle = g; b.fillRect(px, py, pw, ph);
    for (let i = 0; i < 110; i++) { // fibre
      b.fillStyle = `rgba(110,80,40,${0.03 + r() * 0.05})`;
      b.fillRect(px + r() * pw, py + r() * ph, 30 + r() * 220, 1 + r() * 1.6);
    }
    for (let i = 0; i < 70; i++) { // lenticels
      b.fillStyle = `rgba(70,48,24,${0.25 + r() * 0.3})`;
      const w = 14 + r() * 70; b.fillRect(px + r() * pw, py + r() * ph, w, 1.2 + r() * 2);
    }
    const vg = b.createRadialGradient(px + pw / 2, py + ph / 2, ph * 0.3, px + pw / 2, py + ph / 2, pw * 0.65);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(70,45,20,.28)');
    b.fillStyle = vg; b.fillRect(px, py, pw, ph);
    b.restore();
  }
  function layout() {
    plan = []; const lines = 4, per = 9;
    for (let l = 0; l < lines; l++) {
      let col = 0;
      while (col < per) {
        if (col > 0 && rnd() < 0.2) { col++; continue; } // word gap
        plan.push({ g: GKEYS[Math.floor(rnd() * GKEYS.length)]!, l, col, jit: (rnd() - 0.5) * 0.14, sc: 0.9 + rnd() * 0.2 });
        col++;
      }
    }
    strokes = [];
    const mx = area.w * 0.07, my = area.h * 0.09;
    const lh = (area.h - my * 2) / lines, gh = lh * 0.56, gw = gh * 0.62, step = (area.w - mx * 2) / per;
    for (const it of plan) {
      const cx = area.x + mx + it.col * step + step * 0.5, cy = area.y + my + it.l * lh + lh * 0.5;
      const cs = Math.cos(it.jit), sn = Math.sin(it.jit);
      for (const s of GLYPH[it.g]!) {
        const pts = s.map(([u, v]) => {
          const x = (u! - 0.5) * gw * it.sc, y = (v! - 0.5) * gh * it.sc;
          return { x: cx + x * cs - y * sn, y: cy + x * sn + y * cs };
        });
        let len = 0; for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y);
        strokes.push({ pts, len });
      }
    }
  }
  function pointAt(s: Stroke, d: number): Pt {
    let acc = 0;
    for (let i = 1; i < s.pts.length; i++) {
      const a = s.pts[i - 1]!, b = s.pts[i]!, l = Math.hypot(b.x - a.x, b.y - a.y);
      if (acc + l >= d) { const u = (d - acc) / (l || 1); return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) }; }
      acc += l;
    }
    return s.pts[s.pts.length - 1]!;
  }
  function seg(a: Pt, b: Pt) {
    sc.lineCap = 'round';
    sc.strokeStyle = 'rgba(252,242,220,.55)'; sc.lineWidth = 1.5;
    sc.beginPath(); sc.moveTo(a.x + 0.9, a.y + 0.9); sc.lineTo(b.x + 0.9, b.y + 0.9); sc.stroke();
    sc.strokeStyle = 'rgba(58,38,20,.92)'; sc.lineWidth = 2;
    sc.beginPath(); sc.moveTo(a.x, a.y); sc.lineTo(b.x, b.y); sc.stroke();
  }
  function redrawScratch() {
    sc.clearRect(0, 0, W, H);
    for (let i = 0; i < si; i++) for (let k = 1; k < strokes[i]!.pts.length; k++) seg(strokes[i]!.pts[k - 1]!, strokes[i]!.pts[k]!);
    if (si < strokes.length && sd > 0) {
      const s = strokes[si]!; let prev = s.pts[0]!, acc = 0;
      for (let k = 1; k < s.pts.length; k++) {
        const l = Math.hypot(s.pts[k]!.x - s.pts[k - 1]!.x, s.pts[k]!.y - s.pts[k - 1]!.y);
        if (acc + l <= sd) { seg(prev, s.pts[k]!); prev = s.pts[k]!; acc += l; } else { seg(prev, pointAt(s, sd)); break; }
      }
    }
  }
  function warm(secs: number) {
    const v = 100 * (W / 820); let d = secs * v;
    while (d > 0 && si < strokes.length) { const room = strokes[si]!.len - sd; if (d >= room) { d -= room; si++; sd = 0; } else { sd += d; d = 0; } }
    if (si < strokes.length) nib = pointAt(strokes[si]!, sd);
    redrawScratch();
  }

  return {
    t0: 0,
    resize(w, h, d) {
      W = w; H = h; dpr = d;
      buildBark();
      scratch = document.createElement('canvas'); scratch.width = Math.round(W * dpr); scratch.height = Math.round(H * dpr);
      sc = scratch.getContext('2d')!; sc.scale(dpr, dpr);
      rnd = mulberry32(1066); layout();
      if (!ready) { si = 0; sd = 0; warm(8); ready = true; } else { si = Math.min(si, strokes.length); redrawScratch(); }
    },
    draw(c, t, dt, p) {
      c.fillStyle = T.raised; c.fillRect(0, 0, W, H);
      const user = p.a > 0.3;
      if (user) {
        const cur = { x: p.x * W, y: p.y * H };
        if (userLast) { const d = Math.hypot(cur.x - userLast.x, cur.y - userLast.y); if (d > 0.5 && d < 80) seg(userLast, cur); }
        userLast = cur; nib = cur;
      } else {
        userLast = null;
        if (heal != null) {
          const hv = clamp((t - heal) / 2.6);
          if (hv >= 1) { sc.clearRect(0, 0, W, H); heal = null; si = 0; sd = 0; rnd = mulberry32((t * 1000) | 0); layout(); holdUntil = t + 0.8; }
        } else if (si >= strokes.length) {
          if (!holdUntil) holdUntil = t + 4;
          if (t > holdUntil) { heal = t; holdUntil = 0; }
        } else if (t > holdUntil) {
          if (travel) {
            travel.u += dt / 0.3; nib = { x: lerp(travel.a.x, travel.b.x, ease(clamp(travel.u))), y: lerp(travel.a.y, travel.b.y, ease(clamp(travel.u))) };
            if (travel.u >= 1) travel = null;
          } else {
            const s = strokes[si]!, v = 100 * (W / 820) * Math.min(dt, 0.1) * 1;
            const before = sd === 0 ? s.pts[0]! : pointAt(s, sd);
            if (sd === 0) { nib = s.pts[0]!; }
            sd += v;
            if (sd >= s.len) {
              seg(before, s.pts[s.pts.length - 1]!); nib = s.pts[s.pts.length - 1]!;
              si++; sd = 0;
              if (si < strokes.length) travel = { a: nib, b: strokes[si]!.pts[0]!, u: 0 };
            } else { const np = pointAt(s, sd); seg(before, np); nib = np; }
          }
        }
      }
      if (bark) c.drawImage(bark, 0, 0, W, H);
      const ha = heal != null ? 1 - clamp((t - heal) / 2.6) : 1;
      if (scratch) { c.globalAlpha = ha; c.drawImage(scratch, 0, 0, W, H); c.globalAlpha = 1; }
      if (heal == null && (si < strokes.length || user)) { // stylus
        c.save(); c.lineCap = 'round';
        c.strokeStyle = 'rgba(30,20,10,.85)'; c.lineWidth = 4;
        c.beginPath(); c.moveTo(nib.x, nib.y); c.lineTo(nib.x + 15, nib.y - 25); c.stroke();
        c.strokeStyle = 'rgba(240,228,200,.9)'; c.lineWidth = 1.2;
        c.beginPath(); c.moveTo(nib.x + 1, nib.y - 1); c.lineTo(nib.x + 14, nib.y - 23); c.stroke();
        c.restore();
      }
    },
  };
};

export default factory;
