/** BDL-011 Field Guide: six schools as slices. Ported from the mockup's spec-c.js. */
import { T, clamp, lerp, rr } from '../draw';
import type { Mini, MiniFactory } from '../types';
import { SCHOOLS } from './shared';

export const hint = 'Move to widen';

const clipTo = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => { c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); c.translate(x, y); };

const factory: MiniFactory = (): Mini => {
  let W = 0, H = 0;
  const ws = [1, 1, 1, 1, 1, 1];
  return {
    t0: 0,
    resize(w, h) { W = w; H = h; },
    draw(c, t, dt, p) {
      c.fillStyle = T.field; c.fillRect(0, 0, W, H);
      const fc = p.a > 0.3 ? lerp(2.5 + 2.2 * Math.sin(t * 0.35), p.x * 6 - 0.5, clamp(p.a * 1.4)) : 2.5 + 2.2 * Math.sin(t * 0.35);
      const k = 1 - Math.exp(-dt * 7);
      let sum = 0;
      for (let i = 0; i < 6; i++) { const tw = 1 + 3.4 * Math.exp(-Math.pow((i - fc) / 0.85, 2)); ws[i]! += (tw - ws[i]!) * k; sum += ws[i]!; }
      const gap = 3, avail = W - gap * 5;
      let x = 0; const VW = H * 1.6;
      for (let i = 0; i < 6; i++) {
        const sw = (ws[i]! / sum) * avail;
        clipTo(c, x, 0, sw, H);
        c.save(); c.translate(sw / 2 - VW / 2, 0); SCHOOLS[i]!.d(c, VW, H, t); c.restore();
        c.restore();
        // name tag
        const fs = clamp(H * 0.034, 10, 13); c.font = `${fs}px Marcellus, serif`;
        const tw = c.measureText(SCHOOLS[i]!.n).width + 16, wide = sw > tw + 14;
        c.save();
        if (wide) { c.translate(x + sw / 2, H - 14); } else { c.translate(x + sw / 2, H - 12); c.rotate(-Math.PI / 2); c.translate(tw / 2, 0); }
        rr(c, -tw / 2, -fs * 0.95, tw, fs * 1.9, fs * 0.95); c.fillStyle = 'rgba(255,255,255,.88)'; c.fill();
        c.fillStyle = '#231e18'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(SCHOOLS[i]!.n, 0, 1); c.restore();
        x += sw + gap;
      }
    },
  };
};

export default factory;
