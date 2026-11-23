/** BDL-005 Cheer and Chatter. Ported from the mockup's spec-a.js. */
import { TAU, clamp, ease, easeOut, mulberry32, rr } from '../draw';
import type { Mini, MiniEnv, MiniFactory } from '../types';

export const hint = 'Touch to replay';

const factory: MiniFactory = (env: MiniEnv): Mini => {
  let W = 0, H = 0, tc = -6.5;
  const qr = mulberry32(5), cells = Array.from({ length: 81 }, () => qr() > 0.5);
  for (const [r, k] of [[0, 0], [0, 6], [6, 0]] as const) for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) cells[(r + i) * 9 + k + j] = true;
  const coral = '#e58f7b', ink = '#3a2a26';
  function shadowed(c: CanvasRenderingContext2D, fn: () => void) { c.save(); c.shadowColor = 'rgba(40,20,10,.28)'; c.shadowBlur = 20; c.shadowOffsetY = 8; fn(); c.restore(); }
  const arrive = (cyc: number, d: number) => { const a = easeOut(clamp((cyc - d) / 0.8)); const o = 1 - ease(clamp((cyc - 11.6) / 0.9)); return { a: a * o, y: (1 - a) * 26 }; };
  return {
    t0: 0,
    resize(w, h) { W = w; H = h; },
    enter(_p, t) { tc = t - 0.1; },
    draw(c, t, _dt, p) {
      const img = env.img('bdl-005');
      c.fillStyle = '#d9c9b8'; c.fillRect(0, 0, W, H);
      if (img) {
        const s = Math.max(W / img.naturalWidth, H / img.naturalHeight) * 1.16;
        const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
        const mx = (dw - W) / 2, my = (dh - H) / 2;
        const ox = clamp(Math.sin(t * 0.09) * mx * 0.8 - (p.x - 0.5) * mx * 0.9 * p.a, -mx, mx);
        const oy = clamp(Math.cos(t * 0.07) * my * 0.6 - (p.y - 0.5) * my * 0.9 * p.a, -my, my);
        c.drawImage(img, (W - dw) / 2 + ox, (H - dh) / 2 + oy, dw, dh);
      }
      const cyc = (t - tc) % 13;
      const fs = H * 0.045;
      // A: ticket card
      let q = arrive(cyc, 0.5);
      if (q.a > 0.01) {
        c.save(); c.globalAlpha = q.a; const x = W * 0.58, y = H * 0.5 + q.y, w = W * 0.37, h = H * 0.36;
        shadowed(c, () => { rr(c, x, y, w, h, 14); c.fillStyle = '#fffaf4'; c.fill(); });
        c.textBaseline = 'alphabetic'; c.fillStyle = coral; c.font = `${fs * 0.62}px Marcellus, serif`; c.letterSpacing = '1.5px';
        c.fillText('THIS FRIDAY', x + w * 0.07, y + h * 0.2); c.letterSpacing = '0px';
        c.fillStyle = ink; c.font = `${fs * 1.5}px Marcellus, serif`; c.fillText('Plant Bingo', x + w * 0.07, y + h * 0.46);
        c.fillStyle = '#7b655d'; c.font = `${fs * 0.78}px Spectral, serif`; c.fillText('Doors 6:30 pm, two tickets left', x + w * 0.07, y + h * 0.63);
        rr(c, x + w * 0.07, y + h * 0.72, w * 0.5, h * 0.17, h * 0.085); c.fillStyle = coral; c.fill();
        c.fillStyle = '#fff'; c.font = `${fs * 0.7}px Marcellus, serif`; c.textAlign = 'center'; c.fillText('Buy tickets', x + w * 0.32, y + h * 0.835); c.textAlign = 'left';
        c.restore();
      }
      // B: score toast
      q = arrive(cyc, 2.6);
      if (q.a > 0.01) {
        c.save(); c.globalAlpha = q.a; const w = W * 0.4, h = H * 0.1, x = W * 0.05 - q.y * -1 * 0, y = H * 0.07 - q.y;
        shadowed(c, () => { rr(c, x, y, w, h, h / 2); c.fillStyle = ink; c.fill(); });
        c.fillStyle = '#8fd19b'; c.beginPath(); c.arc(x + h * 0.5, y + h / 2, h * 0.16, 0, TAU); c.fill();
        c.fillStyle = '#fbeee6'; c.font = `${fs * 0.82}px Spectral, serif`; c.textBaseline = 'middle'; c.fillText('Round 3: Team Fern leads', x + h * 0.85, y + h / 2 + 1);
        c.restore();
      }
      // C: venue TV tile with join code
      q = arrive(cyc, 4.4);
      if (q.a > 0.01) {
        c.save(); c.globalAlpha = q.a; const w = W * 0.22, h = H * 0.4, x = W * 0.06 - q.y, y = H * 0.5;
        shadowed(c, () => { rr(c, x, y, w, h, 12); c.fillStyle = '#2c2220'; c.fill(); });
        const cell = Math.min(w, h) * 0.075, qx = x + (w - cell * 9) / 2, qy = y + h * 0.1;
        rr(c, qx - cell * 0.6, qy - cell * 0.6, cell * 10.2, cell * 10.2, 6); c.fillStyle = '#fffaf4'; c.fill();
        c.fillStyle = ink; cells.forEach((on, i) => { if (on) c.fillRect(qx + (i % 9) * cell, qy + Math.floor(i / 9) * cell, cell * 0.92, cell * 0.92); });
        c.fillStyle = '#fbeee6'; c.font = `${fs * 0.7}px Marcellus, serif`; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
        c.fillText('Scan to join', x + w / 2, y + h * 0.9); c.textAlign = 'left';
        c.restore();
      }
    },
  };
};

export default factory;
