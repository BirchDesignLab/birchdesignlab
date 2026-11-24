/** BDL-010 The Portal: the frame crosses between schools. Ported from the mockup's spec-c.js. */
import { TAU, clamp, easeOut, rr } from '../draw';
import type { Mini, MiniFactory } from '../types';
import { SCHOOLS } from './shared';

export const hint = 'Move to cross styles';

type Portal = { to: number; t0: number; x: number; y: number };

const factory: MiniFactory = (): Mini => {
  let W = 0, H = 0, cur = 0, portal: Portal | null = null, nextAuto = 5.2;
  const go = (to: number, t: number, x: number, y: number) => { if (portal) cur = portal.to; portal = { to, t0: t, x, y }; };
  return {
    t0: 0,
    resize(w, h) { W = w; H = h; },
    // rest: one complete design style card (Bauhaus, which composes for wide and tall boxes alike), no crossing under way, at every size
    rest() { return 0; },
    draw(c, t, _dt, p) {
      const want = Math.min(5, Math.floor(p.x * 6));
      if (p.a > 0.5) { const tgt = portal ? (portal as Portal).to : cur; if (want !== tgt) { go(want, t, p.x * W, p.y * H); nextAuto = t + 6; } }
      else if (t > nextAuto && !portal) { go((cur + 1) % 6, t, W * 0.5, H * 0.55); nextAuto = t + 5.6; }
      SCHOOLS[cur]!.d(c, W, H, t);
      const pt = portal as Portal | null;
      if (pt) {
        const u = clamp((t - pt.t0) / 1.0), r = easeOut(u) * Math.hypot(W, H);
        c.save(); c.beginPath(); c.arc(pt.x, pt.y, r, 0, TAU); c.clip(); SCHOOLS[pt.to]!.d(c, W, H, t); c.restore();
        c.strokeStyle = `rgba(255,255,255,${0.9 * (1 - u)})`; c.lineWidth = 3; c.beginPath(); c.arc(pt.x, pt.y, r, 0, TAU); c.stroke();
        if (u >= 1) { cur = pt.to; portal = null; }
      }
      // caption and six ticks: the zones the pointer chooses between
      const now = portal as Portal | null;
      const shown = now ? now.to : cur, fs = clamp(H * 0.036, 10, 14);
      c.font = `${fs}px Marcellus, serif`; const label = `${shown + 1} / 6  ${SCHOOLS[shown]!.n}`;
      const lw = c.measureText(label).width + 22;
      rr(c, 14, 14, lw, fs * 2.1, fs * 1.05); c.fillStyle = 'rgba(15,12,10,.62)'; c.fill();
      c.fillStyle = '#fff'; c.textBaseline = 'middle'; c.fillText(label, 14 + 11, 14 + fs * 1.05 + 1);
      for (let i = 0; i < 6; i++) { const zx = (i + 0.5) * (W / 6), on = i === shown; c.fillStyle = on ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.45)'; rr(c, zx - (on ? 14 : 7), H - 12, on ? 28 : 14, 3, 1.5); c.fill(); c.fillStyle = 'rgba(0,0,0,.25)'; }
    },
  };
};

export default factory;
