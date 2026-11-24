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
    // rest: mid-cycle, every card that fits the box has arrived and none has left (t 0 is 6.5s into the 13s cycle), at every size
    rest() { return 0; },
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
      // One type unit for the box (9px at the least) sizes every card, so what shows is readable and nothing is wider than the box:
      // the ticket card hangs bottom right, the score toast top left, and the venue TV tile takes the bottom left only where there is room for all three.
      const u = clamp(Math.min(H * 0.07, W * 0.045), 9, 30), m = Math.max(8, Math.min(W, H) * 0.05);
      const roomy = W >= u * 27 + m * 3 && H >= u * 16 + m * 2;
      // the card and the toast, at rest: the toast shows only where it clears the card (to its left or above it), as the TV tile does with roomy
      const cardW = Math.min(u * 16.5, W - m * 2), cardH = u * 9.2, cardX = W - cardW - m, cardY = H - cardH - m;
      const toastH = u * 2.4, toastY = Math.max(m, H * 0.07);
      c.font = `${u}px Spectral, serif`;
      const toastW = Math.min(toastH * 0.85 + c.measureText('Round 3: Team Fern leads').width + toastH * 0.55, W - m * 2);
      const toastClear = m + toastW <= cardX - 4 || toastY + toastH <= cardY - 4;
      // A: ticket card
      let q = arrive(cyc, 0.5);
      if (q.a > 0.01) {
        const w = cardW, h = cardH, x = cardX, y = cardY + q.y;
        c.save(); c.globalAlpha = q.a;
        shadowed(c, () => { rr(c, x, y, w, h, u * 1.1); c.fillStyle = '#fffaf4'; c.fill(); });
        const px = x + u * 1.1;
        c.textBaseline = 'alphabetic'; c.fillStyle = coral; c.font = `${u}px Marcellus, serif`; c.letterSpacing = u * 0.12 + 'px';
        c.fillText('THIS FRIDAY', px, y + u * 2.1); c.letterSpacing = '0px';
        c.fillStyle = ink; c.font = `${u * 1.7}px Marcellus, serif`; c.fillText('Plant Bingo', px, y + u * 4.2);
        c.fillStyle = '#7b655d'; c.font = `${u}px Spectral, serif`; c.fillText('Doors 6:30 pm, two tickets left', px, y + u * 5.8);
        const bw = Math.min(u * 7.4, w - u * 2.2);
        rr(c, px, y + u * 6.5, bw, u * 2.1, u * 1.05); c.fillStyle = coral; c.fill();
        c.fillStyle = '#fff'; c.font = `${u}px Marcellus, serif`; c.textAlign = 'center'; c.fillText('Buy tickets', px + bw / 2, y + u * 6.5 + u * 1.4); c.textAlign = 'left';
        c.restore();
      }
      // B: score toast
      q = arrive(cyc, 2.6);
      if (q.a > 0.01 && toastClear) {
        const h = toastH, w = toastW, x = m, y = toastY - q.y;
        c.save(); c.globalAlpha = q.a;
        shadowed(c, () => { rr(c, x, y, w, h, h / 2); c.fillStyle = ink; c.fill(); });
        c.fillStyle = '#8fd19b'; c.beginPath(); c.arc(x + h * 0.5, y + h / 2, h * 0.16, 0, TAU); c.fill();
        c.fillStyle = '#fbeee6'; c.font = `${u}px Spectral, serif`; c.textBaseline = 'middle'; c.fillText('Round 3: Team Fern leads', x + h * 0.85, y + h / 2 + 1);
        c.restore();
      }
      // C: venue TV tile with join code
      q = arrive(cyc, 4.4);
      if (q.a > 0.01 && roomy) {
        const w = u * 8.4, h = u * 11.2, x = m - q.y, y = H - h - m;
        c.save(); c.globalAlpha = q.a;
        shadowed(c, () => { rr(c, x, y, w, h, u); c.fillStyle = '#2c2220'; c.fill(); });
        const cell = w * 0.078, qx = x + (w - cell * 9) / 2, qy = y + h * 0.1;
        rr(c, qx - cell * 0.6, qy - cell * 0.6, cell * 10.2, cell * 10.2, 6); c.fillStyle = '#fffaf4'; c.fill();
        c.fillStyle = ink; cells.forEach((on, i) => { if (on) c.fillRect(qx + (i % 9) * cell, qy + Math.floor(i / 9) * cell, cell * 0.92, cell * 0.92); });
        c.fillStyle = '#fbeee6'; c.font = `${u}px Marcellus, serif`; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
        c.fillText('Scan to join', x + w / 2, y + h * 0.92); c.textAlign = 'left';
        c.restore();
      }
    },
  };
};

export default factory;
