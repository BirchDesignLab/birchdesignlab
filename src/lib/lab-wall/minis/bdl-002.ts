/** BDL-002 The Styleguide. Ported from the mockup's spec-a.js. */
import { T, TAU, clamp, ease, mix, rr } from '../draw';
import type { Mini, MiniFactory } from '../types';
import { bestLines } from './shared';

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

type Chip = { n: string; x: number; y: number; w: number };

const factory: MiniFactory = (): Mini => {
  let W = 0, H = 0;
  let from: Sel = { p: 0, f: 0 }, to: Sel = { p: 0, f: 0 }, m = 1, k = 0, nextAuto = 4.5;
  const set = (p: number, f: number) => { if (p === to.p && f === to.f) return; from = { ...to }; to = { p, f }; m = 0; };
  return {
    t0: 0,
    resize(w, h) { W = w; H = h; },
    // rest: the house palette and Marcellus, chips and swatches all showing, at every size
    rest() { return 0; },
    enter(_p, t) { set((to.p + 1) % 3, (to.f + 1) % 3); nextAuto = t + 6; },
    draw(c, t, dt, p) {
      if (p.a > 0.5) set(Math.min(2, Math.floor(p.x * 3)), Math.min(2, Math.floor(p.y * 3)));
      else if (t > nextAuto) { k++; set(k % 3, (k % 3 + Math.floor(k / 3)) % 3); nextAuto = t + 4.8; }
      m = clamp(m + dt / 0.55);
      const e = ease(m);
      const A = PAL[from.p]!, B = PAL[to.p]!;
      c.fillStyle = T.field; c.fillRect(0, 0, W, H);

      // The composition for the box: the two chip rows stack, a row breaks onto a second line when it will not fit, the specimen
      // takes what is left, and in a box too short for that the small labels go. Type is never under 9px.
      const pad = Math.max(8, W * 0.06), maxW = W - pad * 2;
      const pf = clamp(Math.min(H * 0.034, W * 0.052), 9, 26), lf = Math.max(9, pf * 0.9), ph = pf * 1.9, cg = pf * 0.5, rg = pf * 0.45;
      const chipFont = (i: number, fam?: string[]) => `${pf}px ${fam ? fam[i] : 'Marcellus, serif'}`;
      const flow = (names: string[], fam?: string[]): { chips: Chip[]; rows: number } => {
        const chips: Chip[] = []; let x = 0, row = 0;
        names.forEach((n, i) => {
          c.font = chipFont(i, fam);
          const w = c.measureText(n).width + pf * 1.7;
          if (x > 0 && x + w > maxW) { x = 0; row++; }
          chips.push({ n, x, y: row, w }); x += w + cg;
        });
        return { chips, rows: row + 1 };
      };
      const pals = flow(PAL.map((q) => q.n)), faces = flow(FACES.map((q) => q.n), FACES.map((q) => q.f));
      const sr = clamp(Math.min(H * 0.033, maxW / 14), 5, 18), swH = sr * 2 + pad * 0.5;
      const secH = (rows: number, labels: boolean) => (labels ? lf * 1.7 : 0) + rows * ph + (rows - 1) * rg;
      // the top inset keeps the first row clear of the open piece's Back button and arrows (a tile is short, and gets the least)
      const top = Math.max(pad * 0.7, Math.min(H * 0.1, 54));
      const sec = (labels: boolean) => top + secH(pals.rows, labels) + pad * 0.6 + secH(faces.rows, labels) + pad * 0.7;
      let labels = true;
      if (H - sec(true) - swH - pad * 0.5 < Math.max(44, H * 0.2)) labels = false;
      const bx = pad, by = sec(labels), bw = maxW, bh = Math.max(20, H - by - swH - pad * 0.3);
      c.textBaseline = 'middle';
      const label = (txt: string, y: number) => {
        c.font = `${lf}px Marcellus, serif`; c.letterSpacing = lf * 0.14 + 'px';
        c.fillStyle = T.muted; c.fillText(txt, pad, y); c.letterSpacing = '0px';
      };
      const chips = (set: { chips: Chip[]; rows: number }, act: number, y0: number, fam?: string[]) => {
        for (const [i, ch] of set.chips.entries()) {
          const x = pad + ch.x, y = y0 + ch.y * (ph + rg), on = i === act;
          rr(c, x, y, ch.w, ph, ph / 2);
          if (on) { c.fillStyle = mix(A.ac, B.ac, e); c.fill(); }
          c.strokeStyle = T.line; c.lineWidth = 1; if (!on) c.stroke();
          c.font = chipFont(i, fam); c.fillStyle = on ? T.onAccent : T.muted; c.textAlign = 'left';
          c.fillText(ch.n, x + pf * 0.85, y + ph / 2 + 0.5);
        }
      };
      let y = top;
      if (labels) { label('PALETTE', y + lf * 0.6); y += lf * 1.7; }
      chips(pals, to.p, y); y += pals.rows * ph + (pals.rows - 1) * rg + pad * 0.6;
      if (labels) { label('TYPEFACE', y + lf * 0.6); y += lf * 1.7; }
      chips(faces, to.f, y, FACES.map((q) => q.f));
      // billboard
      rr(c, bx, by, bw, bh, 10);
      c.fillStyle = mix(A.bg, B.bg, e); c.fill();
      c.strokeStyle = T.line; c.lineWidth = 1; c.stroke();
      const word = (face: Face, a: number) => {
        if (a <= 0.01) return;
        const opts = face.caps ? [['BIRCH DESIGN LAB'], ['BIRCH', 'DESIGN LAB']] : [['Birch Design Lab'], ['Birch', 'Design Lab']];
        const font = (s: number) => `${face.st}${s}px ${face.f}`;
        const { lines, size } = bestLines(c, opts, font, bw * 0.84, bh * 0.72, Math.min(H * 0.12, bh * 0.36), 1.2, face.tr);
        c.font = font(size); c.letterSpacing = face.tr * size + 'px';
        c.globalAlpha = a; c.textAlign = 'center';
        c.fillStyle = mix(A.ink, B.ink, e);
        const lead = size * 1.2, y1 = by + bh * 0.5 - ((lines.length - 1) * lead) / 2 + (1 - a) * 6 * (a === 1 ? 0 : 1);
        lines.forEach((s, i) => c.fillText(s, bx + bw / 2 + (face.tr * size) / 2, y1 + i * lead));
        c.globalAlpha = 1; c.letterSpacing = '0px'; c.textAlign = 'left';
      };
      word(FACES[from.f]!, from.f === to.f ? 0 : 1 - e);
      word(FACES[to.f]!, from.f === to.f ? 1 : e);
      // swatches
      const sy = H - pad * 0.5 - sr;
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
