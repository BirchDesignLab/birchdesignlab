/** BDL-013 The Drawing Set. Ported from the mockup's spec-b.js. */
import { T, TAU, alpha, clamp, ease, rr } from '../draw';
import type { Mini, MiniFactory } from '../types';

export const hint = 'Touch a line';

type Geo = { cx: number; cw: number; px: number; pw: number; ly: number[]; by: number[] };

const factory: MiniFactory = (): Mini => {
  let W = 0, H = 0, tc = -9.5, focus = -1;
  const ovr = [-99, -99, -99, -99, -99];
  const LINES = ['name: "Bayou Kitchen"', 'menu: 24 dishes', 'booking: on', 'ordering: off', 'languages: en, es'];
  const PARTS = ['Header', 'Hero', 'Menu', 'Booking', 'Footer'];
  const BY: [number, number][] = [[0.17, 0.24], [0.26, 0.42], [0.44, 0.58], [0.6, 0.7], [0.72, 0.79]];
  const geo = (): Geo => {
    const g: Geo = { cx: W * 0.07, cw: W * 0.35, px: W * 0.6, pw: W * 0.33, ly: [], by: [] };
    for (let i = 0; i < 5; i++) { g.ly.push(H * (0.27 + i * 0.105)); g.by.push(H * (BY[i]![0] + BY[i]![1]) / 2); }
    return g;
  };
  const bez = (g: Geo, i: number, u: number): [number, number] => {
    const x0 = g.cx + g.cw + 8, y0 = g.ly[i]!, x3 = g.px - 8, y3 = g.by[i]!, x1 = x0 + W * 0.09, x2 = x3 - W * 0.09;
    const v = 1 - u, a = v * v * v, b = 3 * v * v * u, cc = 3 * v * u * u, d = u * u * u;
    return [a * x0 + b * x1 + cc * x2 + d * x3, a * y0 + b * y0 + cc * y3 + d * y3];
  };
  return {
    t0: 0,
    resize(w, h) { W = w; H = h; },
    enter(_p, t) { tc = t - 0.2; },
    draw(c, t, _dt, p) {
      const g = geo(), ink = T.mark, ac = T.accent;
      c.fillStyle = T.field; c.fillRect(0, 0, W, H);
      const m = W * 0.03;
      c.strokeStyle = alpha(T.mark.length === 7 ? T.mark : '#1f1b15', 0.55); c.lineWidth = 1.4; c.strokeRect(m, m, W - m * 2, H - m * 2);
      c.lineWidth = 0.8; c.strokeRect(m + 5, m + 5, W - m * 2 - 10, H - m * 2 - 10);
      const fs = clamp(Math.min(H * 0.036, W * 0.0215), 8, 17);
      c.font = `${fs * 0.85}px "Courier New", monospace`; c.fillStyle = T.muted; c.textBaseline = 'middle';
      const short = W < 500; c.fillText(short ? 'ONE FILE' : 'ONE FILE DESCRIBES THE BUSINESS', g.cx, H * 0.115); c.textAlign = 'right'; c.fillText(short ? 'THE WEBSITE' : 'THE WEBSITE IT BUILDS', g.px + g.pw, H * 0.115); c.textAlign = 'left';
      // focus from pointer
      const nf = p.a > 0.4 ? clamp(Math.round((p.y * H - H * 0.27) / (H * 0.105)), 0, 4) : -1;
      if (nf !== focus) { focus = nf; if (nf >= 0) ovr[nf] = t; }
      // code card
      rr(c, g.cx - 10, H * 0.2, g.cw + 12, H * 0.54, 8); c.fillStyle = T.raised; c.fill(); c.strokeStyle = T.line; c.lineWidth = 1; c.stroke();
      const ct = (t - tc) % 15, fade = 1 - clamp((ct - 13.3) / 1.2);
      const prog = (i: number) => {
        if (t - ovr[i]! < 1.5) return clamp((t - ovr[i]!) / 1.3);
        return clamp((ct - (0.6 + i * 1.5)) / 1.4) * (ct > 13.3 ? fade : 1);
      };
      LINES.forEach((ln, i) => {
        const y = g.ly[i]!, pr = prog(i), hot = focus === i || pr >= 1;
        if (focus === i) { rr(c, g.cx - 4, y - fs * 0.95, g.cw, fs * 1.9, 4); c.fillStyle = alpha(ac.length === 7 ? ac : '#2b4a37', 0.16); c.fill(); }
        c.beginPath(); c.arc(g.cx + fs * 0.7, y, fs * 0.62, 0, TAU); c.fillStyle = hot ? ac : 'transparent'; c.fill();
        c.strokeStyle = ac; c.lineWidth = 1; c.stroke();
        c.fillStyle = hot ? T.onAccent : T.muted; c.font = `${fs * 0.75}px "Courier New", monospace`; c.textAlign = 'center'; c.fillText(String(i + 1), g.cx + fs * 0.7, y + 0.5); c.textAlign = 'left';
        c.fillStyle = ink; c.font = `${fs}px "Courier New", monospace`; c.fillText(ln, g.cx + fs * 1.9, y + 1);
      });
      // page wireframe
      rr(c, g.px, H * 0.15, g.pw, H * 0.66, 8); c.fillStyle = T.field; c.fill(); c.strokeStyle = alpha(T.mark.length === 7 ? T.mark : '#1f1b15', 0.5); c.lineWidth = 1.2; c.stroke();
      PARTS.forEach((n, j) => {
        const bx = g.px + 10, bw = g.pw - 20, by = H * BY[j]![0], bh = H * (BY[j]![1] - BY[j]![0]);
        const lit = prog(j) >= 1 || focus === j;
        rr(c, bx, by, bw, bh, 4); c.fillStyle = lit ? alpha(ac.length === 7 ? ac : '#2b4a37', 0.16) : 'transparent'; c.fill();
        c.strokeStyle = lit ? ac : T.line; c.lineWidth = lit ? 1.5 : 1; c.setLineDash(lit ? [] : [4, 3]); c.stroke(); c.setLineDash([]);
        c.fillStyle = lit ? ink : T.muted; c.font = `${fs * 0.8}px "Courier New", monospace`; c.fillText(n.toLowerCase(), bx + 8, by + bh / 2 + 1);
      });
      // arrows
      for (let i = 0; i < 5; i++) {
        const pr = prog(i); if (pr <= 0) continue;
        c.strokeStyle = ac; c.lineWidth = focus === i ? 2.4 : 1.8; c.lineCap = 'round'; c.beginPath();
        const n = 28; let last: [number, number] | null = null, prev: [number, number] | null = null;
        for (let k = 0; k <= n; k++) { const u = (k / n) * ease(pr); const pt = bez(g, i, u); prev = last; last = pt; k ? c.lineTo(pt[0], pt[1]) : c.moveTo(pt[0], pt[1]); }
        c.stroke();
        if (pr > 0.03 && prev && last) { // arrowhead follows the tip
          const ang = Math.atan2(last[1] - prev[1], last[0] - prev[0]), s = fs * 0.7;
          c.fillStyle = ac; c.beginPath(); c.moveTo(last[0] + Math.cos(ang) * s * 0.4, last[1] + Math.sin(ang) * s * 0.4);
          c.lineTo(last[0] + Math.cos(ang + 2.6) * s, last[1] + Math.sin(ang + 2.6) * s); c.lineTo(last[0] + Math.cos(ang - 2.6) * s, last[1] + Math.sin(ang - 2.6) * s); c.closePath(); c.fill();
        }
      }
      c.fillStyle = T.muted; c.font = `${fs * 0.75}px "Courier New", monospace`; c.textAlign = 'center';
      c.fillText('bdlBase  /  SHEET 1 OF 1', W / 2, H - m - 14); c.textAlign = 'left';
    },
  };
};

export default factory;
