/** BDL-002 The Styleguide. Ported from the mockup's spec-a.js. */
import { T, TAU, clamp, ease, mix, rr } from '../draw';
import type { Mini, MiniFactory } from '../types';

export const hint = 'Move to restyle';

interface Pal { n: string; bg: string; ink: string; ac: string; sw: string[] }
interface Face { n: string; f: string; caps: number; tr: number; st: string }
interface Sel { p: number; f: number }

const PAL: Pal[] = [
  { n: 'House', bg: '#f5f1e8', ink: '#1f1b15', ac: '#2b4a37', sw: ['#f5f1e8', '#e9e1d2', '#2b4a37', '#4a3a2c', '#1f1b15'] },
  { n: 'Limestone', bg: '#ebe8e1', ink: '#2c3138', ac: '#5f7388', sw: ['#ebe8e1', '#d6d1c5', '#5f7388', '#8a7d6b', '#2c3138'] },
  { n: 'Granite', bg: '#25231f', ink: '#efe9db', ac: '#c99a6a', sw: ['#25231f', '#3a3631', '#c99a6a', '#8fa58a', '#efe9db'] },
];
const FACES: Face[] = [
  { n: 'Marcellus', f: 'Marcellus, Georgia, serif', caps: 1, tr: 0.14, st: '' },
  { n: 'Spectral', f: 'Spectral, Georgia, serif', caps: 0, tr: 0, st: 'italic ' },
  { n: 'Mono', f: '"Courier New", monospace', caps: 1, tr: 0.05, st: 'bold ' },
];

const factory: MiniFactory = (): Mini => {
  let W = 0, H = 0;
  let from: Sel = { p: 0, f: 0 }, to: Sel = { p: 0, f: 0 }, m = 1, k = 0, nextAuto = 4.5;
  const set = (p: number, f: number) => { if (p === to.p && f === to.f) return; from = { ...to }; to = { p, f }; m = 0; };
  return {
    t0: 0,
    resize(w, h) { W = w; H = h; },
    enter(_p, t) { set((to.p + 1) % 3, (to.f + 1) % 3); nextAuto = t + 6; },
    draw(c, t, dt, p) {
      if (p.a > 0.5) set(Math.min(2, Math.floor(p.x * 3)), Math.min(2, Math.floor(p.y * 3)));
      else if (t > nextAuto) { k++; set(k % 3, (k % 3 + Math.floor(k / 3)) % 3); nextAuto = t + 4.8; }
      m = clamp(m + dt / 0.55);
      const e = ease(m);
      const A = PAL[from.p]!, B = PAL[to.p]!;
      c.fillStyle = T.field; c.fillRect(0, 0, W, H);
      const pad = W * 0.055, fs = clamp(H * 0.03, 5.5, 15); // wall: small tiles go below 9px
      c.textBaseline = 'middle';
      const label = (txt: string, y: number) => {
        c.font = `${fs}px Marcellus, serif`; c.letterSpacing = fs * 0.14 + 'px';
        c.fillStyle = T.muted; c.fillText(txt, pad, y); c.letterSpacing = '0px';
      };
      const pills = (names: string[], act: number, y: number, ph: number, fam?: string[]) => {
        let x = pad;
        names.forEach((n, i) => {
          c.font = `${fs * 1.1}px ${fam ? fam[i] : 'Marcellus, serif'}`;
          const tw = c.measureText(n).width, w = tw + fs * 1.9;
          const on = i === act;
          rr(c, x, y, w, ph, ph / 2);
          if (on) { c.fillStyle = mix(A.ac, B.ac, e); c.fill(); }
          c.strokeStyle = T.line; c.lineWidth = 1; if (!on) c.stroke();
          c.fillStyle = on ? T.onAccent : T.muted; c.textAlign = 'left';
          c.fillText(n, x + fs * 0.95, y + ph / 2 + 0.5);
          x += w + fs * 0.6;
        });
      };
      const ph = H * 0.07;
      label('PALETTE', H * 0.075); pills(PAL.map((q) => q.n), to.p, H * 0.115, ph);
      label('TYPEFACE', H * 0.265); pills(FACES.map((q) => q.n), to.f, H * 0.305, ph, FACES.map((q) => q.f));
      // billboard
      const bx = pad, by = H * 0.43, bw = W - pad * 2, bh = H * 0.34;
      rr(c, bx, by, bw, bh, 10);
      c.fillStyle = mix(A.bg, B.bg, e); c.fill();
      c.strokeStyle = T.line; c.lineWidth = 1; c.stroke();
      const word = (face: Face, a: number) => {
        if (a <= 0.01) return;
        const txt = face.caps ? 'BIRCH DESIGN LAB' : 'Birch Design Lab';
        let size = H * 0.12;
        c.font = `${face.st}${size}px ${face.f}`; c.letterSpacing = face.tr * size + 'px';
        const w = c.measureText(txt).width;
        if (w > bw * 0.84) { size *= (bw * 0.84) / w; c.font = `${face.st}${size}px ${face.f}`; c.letterSpacing = face.tr * size + 'px'; }
        c.globalAlpha = a; c.textAlign = 'center';
        c.fillStyle = mix(A.ink, B.ink, e);
        c.fillText(txt, bx + bw / 2 + (face.tr * size) / 2, by + bh * 0.5 + (1 - a) * 6 * (a === 1 ? 0 : 1));
        c.globalAlpha = 1; c.letterSpacing = '0px'; c.textAlign = 'left';
      };
      word(FACES[from.f]!, from.f === to.f ? 0 : 1 - e);
      word(FACES[to.f]!, from.f === to.f ? 1 : e);
      // swatches
      const sr = H * 0.033, sy = H * 0.885;
      for (let i = 0; i < 5; i++) {
        const x = pad + sr + i * (sr * 2.7);
        c.beginPath(); c.arc(x, sy, sr, 0, TAU);
        c.fillStyle = mix(A.sw[i]!, B.sw[i]!, e); c.fill();
        c.strokeStyle = T.line; c.stroke();
      }
    },
  };
};

export default factory;
