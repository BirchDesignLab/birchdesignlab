/** BDL-013 The Drawing Set. Ported from the mockup's spec-b.js. */
import { T, TAU, alpha, clamp, ease, rr } from '../draw';
import type { Mini, MiniFactory } from '../types';

export const hint = 'Touch a line';

type Geo = {
  /** code card: left edge and width; page sheet: left edge and width */
  cx: number; cw: number; px: number; pw: number;
  /** each code line's y; each page part's top and height */
  ly: number[]; pt: number[]; ph: number[]; by: number[];
  /** type: code lines, the small parts (numbers, part names), the sheet's own lines */
  fs: number; fp: number; fn: number; fh: number;
  /** the frame inset, and how far the rows and the sheet run */
  m: number; rowPitch: number; top: number; bottom: number;
  short: boolean;
};

const LINES = ['name: "Bayou Kitchen"', 'menu: 24 dishes', 'booking: on', 'ordering: off', 'languages: en, es'];
const PARTS = ['Header', 'Hero', 'Menu', 'Booking', 'Footer'];
const BY: [number, number][] = [[0.17, 0.24], [0.26, 0.42], [0.44, 0.58], [0.6, 0.7], [0.72, 0.79]];
const MONO = (s: number) => `${s}px "Courier New", monospace`;

const factory: MiniFactory = (): Mini => {
  let W = 0, H = 0, tc = -9.5, focus = -1;
  const ovr = [-99, -99, -99, -99, -99];
  let G: Geo = { cx: 0, cw: 0, px: 0, pw: 0, ly: [], pt: [], ph: [], by: [], fs: 9, fp: 9, fn: 9, fh: 9, m: 8, rowPitch: 0, top: 0, bottom: 0, short: true };

  /**
   * The composition for the box. The code card, the arrows and the page sit on one drawing sheet: in a box wider than 2.6:1 the sheet
   * stays that wide and centred (the frame still runs the full width), the type is as big as the card's longest line allows (never under
   * 9px), the card takes just over half of the sheet, and the page's five parts keep a height their names fit in.
   */
  function geo(): Geo {
    const m = Math.min(W * 0.03, H * 0.05), sw = Math.min(W, H * 2.6), ox = (W - sw) / 2, mm = Math.max(m + 13, sw * 0.05), S = sw - 2 * mm;
    const cw = S * 0.6, pw = S * 0.26;
    const rowPitch = H * 0.105;
    const fs = clamp(Math.min((cw - 8) / 14.5, rowPitch / 1.7, 40), 9, 40);
    const fp = Math.max(9, fs * 0.8), fn = Math.max(9, fs * 0.75), fh = Math.max(9, fs * 0.85);
    const g: Geo = { cx: ox + mm, cw, px: ox + mm + S - pw, pw, ly: [], pt: [], ph: [], by: [], fs, fp, fn, fh, m, rowPitch, top: H * 0.165, bottom: H * 0.8, short: false };
    // the five parts: their drawn proportions, each at least tall enough for its name, squeezed to the room there is
    const gap = Math.max(3, H * 0.02), hmin = fp * 1.55, room = g.bottom - g.top - gap * 4;
    let hs = BY.map(([a, b]) => Math.max((b - a) * H, hmin));
    const sum = hs.reduce((a, b) => a + b, 0);
    if (sum > room) hs = hs.map((v) => v * room / sum);
    let y = g.top + (room - Math.min(sum, room)) / 2;
    hs.forEach((v) => { g.pt.push(y); g.ph.push(v); g.by.push(y + v / 2); y += v + gap; });
    for (let i = 0; i < 5; i++) g.ly.push(H * 0.27 + i * rowPitch);
    g.short = S < 52 * 0.6 * fh + 24;
    return g;
  }
  const bez = (g: Geo, i: number, u: number): [number, number] => {
    const x0 = g.cx + g.cw + 8, y0 = g.ly[i]!, x3 = g.px - 8, y3 = g.by[i]!, k = (x3 - x0) * 0.5, x1 = x0 + k, x2 = x3 - k;
    const v = 1 - u, a = v * v * v, b = 3 * v * v * u, cc = 3 * v * u * u, d = u * u * u;
    return [a * x0 + b * x1 + cc * x2 + d * x3, a * y0 + b * y0 + cc * y3 + d * y3];
  };
  return {
    t0: 0,
    resize(w, h) { W = w; H = h; G = geo(); },
    enter(_p, t) { tc = t - 0.2; },
    draw(c, t, _dt, p) {
      const g = G, ink = T.mark, ac = T.accent, fs = g.fs;
      c.fillStyle = T.field; c.fillRect(0, 0, W, H);
      const m = g.m;
      c.strokeStyle = alpha(T.mark.length === 7 ? T.mark : '#1f1b15', 0.55); c.lineWidth = 1.4; c.strokeRect(m, m, W - m * 2, H - m * 2);
      c.lineWidth = 0.8; c.strokeRect(m + 5, m + 5, W - m * 2 - 10, H - m * 2 - 10);
      c.font = MONO(g.fh); c.fillStyle = T.muted; c.textBaseline = 'middle';
      const ty = Math.max(H * 0.115, m + 5 + g.fh), short = g.short;
      c.fillText(short ? 'ONE FILE' : 'ONE FILE DESCRIBES THE BUSINESS', g.cx, ty); c.textAlign = 'right'; c.fillText(short ? 'THE WEBSITE' : 'THE WEBSITE IT BUILDS', g.px + g.pw, ty); c.textAlign = 'left';
      // focus from pointer
      const nf = p.a > 0.4 ? clamp(Math.round((p.y * H - H * 0.27) / g.rowPitch), 0, 4) : -1;
      if (nf !== focus) { focus = nf; if (nf >= 0) ovr[nf] = t; }
      // code card
      rr(c, g.cx - 6, H * 0.2, g.cw + 12, H * 0.54, 8); c.fillStyle = T.raised; c.fill(); c.strokeStyle = T.line; c.lineWidth = 1; c.stroke();
      const ct = (t - tc) % 15, fade = 1 - clamp((ct - 13.3) / 1.2);
      const prog = (i: number) => {
        if (t - ovr[i]! < 1.5) return clamp((t - ovr[i]!) / 1.3);
        return clamp((ct - (0.6 + i * 1.5)) / 1.4) * (ct > 13.3 ? fade : 1);
      };
      const br = Math.max(fs * 0.62, g.fn * 0.62);
      LINES.forEach((ln, i) => {
        const y = g.ly[i]!, pr = prog(i), hot = focus === i || pr >= 1;
        if (focus === i) { rr(c, g.cx - 3, y - g.rowPitch * 0.45, g.cw + 6, g.rowPitch * 0.9, 4); c.fillStyle = alpha(ac.length === 7 ? ac : '#2b4a37', 0.16); c.fill(); }
        c.beginPath(); c.arc(g.cx + br + 1, y, br, 0, TAU); c.fillStyle = hot ? ac : 'transparent'; c.fill();
        c.strokeStyle = ac; c.lineWidth = 1; c.stroke();
        c.fillStyle = hot ? T.onAccent : T.muted; c.font = MONO(g.fn); c.textAlign = 'center'; c.fillText(String(i + 1), g.cx + br + 1, y + 0.5); c.textAlign = 'left';
        c.fillStyle = ink; c.font = MONO(fs); c.fillText(ln, g.cx + br * 2 + fs * 0.6 + 2, y + 1);
      });
      // page wireframe
      rr(c, g.px, H * 0.15, g.pw, H * 0.66, 8); c.fillStyle = T.field; c.fill(); c.strokeStyle = alpha(T.mark.length === 7 ? T.mark : '#1f1b15', 0.5); c.lineWidth = 1.2; c.stroke();
      PARTS.forEach((n, j) => {
        const bx = g.px + 6, bw = g.pw - 12, by = g.pt[j]!, bh = g.ph[j]!;
        const lit = prog(j) >= 1 || focus === j;
        rr(c, bx, by, bw, bh, 4); c.fillStyle = lit ? alpha(ac.length === 7 ? ac : '#2b4a37', 0.16) : 'transparent'; c.fill();
        c.strokeStyle = lit ? ac : T.line; c.lineWidth = lit ? 1.5 : 1; c.setLineDash(lit ? [] : [4, 3]); c.stroke(); c.setLineDash([]);
        c.fillStyle = lit ? ink : T.muted; c.font = MONO(g.fp); c.fillText(n.toLowerCase(), bx + 6, by + bh / 2 + 1);
      });
      // arrows
      for (let i = 0; i < 5; i++) {
        const pr = prog(i); if (pr <= 0) continue;
        c.strokeStyle = ac; c.lineWidth = focus === i ? 2.4 : 1.8; c.lineCap = 'round'; c.beginPath();
        const n = 28; let last: [number, number] | null = null, prev: [number, number] | null = null;
        for (let k = 0; k <= n; k++) { const u = (k / n) * ease(pr); const pt = bez(g, i, u); prev = last; last = pt; k ? c.lineTo(pt[0], pt[1]) : c.moveTo(pt[0], pt[1]); }
        c.stroke();
        if (pr > 0.03 && prev && last) { // arrowhead follows the tip
          const ang = Math.atan2(last[1] - prev[1], last[0] - prev[0]), s = Math.max(7, fs * 0.7);
          c.fillStyle = ac; c.beginPath(); c.moveTo(last[0] + Math.cos(ang) * s * 0.4, last[1] + Math.sin(ang) * s * 0.4);
          c.lineTo(last[0] + Math.cos(ang + 2.6) * s, last[1] + Math.sin(ang + 2.6) * s); c.lineTo(last[0] + Math.cos(ang - 2.6) * s, last[1] + Math.sin(ang - 2.6) * s); c.closePath(); c.fill();
        }
      }
      c.fillStyle = T.muted; c.font = MONO(Math.max(9, g.fh * 0.88)); c.textAlign = 'center';
      c.fillText('bdlBase  /  SHEET 1 OF 1', W / 2, H - m - Math.max(14, g.fh * 1.2)); c.textAlign = 'left';
    },
  };
};

export default factory;
