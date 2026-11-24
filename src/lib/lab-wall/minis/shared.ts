/**
 * Helpers shared by several miniatures: the page-reading miniature factory
 * (008, 009), its text and bar helpers, and the six school title cards
 * (010, 011).
 */
import { TAU, clamp, mulberry32, rr } from '../draw';
import type { Mini, MiniEnv, MiniFactory } from '../types';

type Ctx = CanvasRenderingContext2D;

/* ---------------- a page that reads itself (008, 009) ---------------- */

/**
 * What a page miniature shows in a small box instead of the whole page shrunk: a few rows drawn at a size that reads, in
 * CSS pixels. `height` is how tall the strip is for a box of W x H; `build` draws it (the context is already scaled to CSS px).
 */
export interface Detail {
  height(c: Ctx, W: number, H: number): number;
  build(c: Ctx, W: number, H: number): void;
}

/** A box smaller than this (width x height, CSS px) gets the detail, not the page: the biggest wall tile is about 45,000, the smallest open piece about 180,000. */
const SMALL_AREA = 90000;

export function pageMini(id: string, build: (c: Ctx, img: HTMLImageElement) => void, PH: number, detail?: Detail): MiniFactory {
  return (env: MiniEnv): Mini => {
    let W = 0, H = 0, dpr = 1, y = 0, dir = 1, pause = 2.2, scale = 1, ph = PH, small = false;
    let pg: HTMLCanvasElement | null = null;
    function make() {
      small = !!detail && W * H < SMALL_AREA;
      if (small && detail) {
        scale = 1;
        const probe = document.createElement('canvas').getContext('2d')!;
        ph = Math.max(H, Math.ceil(detail.height(probe, W, H)));
        pg = document.createElement('canvas');
        pg.width = Math.round(W * dpr);
        pg.height = Math.round(ph * dpr);
        const c = pg.getContext('2d')!;
        c.scale(dpr, dpr);
        detail.build(c, W, H);
        return;
      }
      const img = env.img(id);
      if (!img) return;
      ph = PH;
      scale = W / 1200;
      pg = document.createElement('canvas');
      pg.width = Math.round(W * dpr);
      pg.height = Math.round(PH * scale * dpr);
      const c = pg.getContext('2d')!;
      c.scale(scale * dpr, scale * dpr);
      build(c, img);
    }
    return {
      t0: 0,
      resize(w, h, d) { W = w; H = h; dpr = d; pg = null; },
      draw(c, _t, dt, p) {
        if (!pg) make();
        c.fillStyle = '#f5f1e8'; c.fillRect(0, 0, W, H);
        const maxS = Math.max(1, ph - H / scale);
        // The whole page crawls at 30 page units a second (a few CSS px on a tile); the few rows of a small box move at a pace that reads.
        const down = small ? 15 : 30, up = small ? 45 : 90;
        if (p.a > 0.4) { y += (p.y * maxS - y) * (1 - Math.exp(-dt * 5)); pause = 1.2; dir = p.y > 0.5 ? 1 : -1; }
        else if (pause > 0) pause -= dt;
        else {
          y += dir * (dir > 0 ? down : up) * Math.min(dt, 0.1);
          if (y >= maxS) { y = maxS; dir = -1; pause = 2.4; } else if (y <= 0) { y = 0; dir = 1; pause = 3; }
        }
        y = clamp(y, 0, maxS);
        if (pg) c.drawImage(pg, 0, y * scale * dpr, W * dpr, H * dpr, 0, 0, W, H);
        // scroll bar: shows it is a page being read
        const th = Math.max(26, H * (H / scale / ph)), ty = (H - th - 12) * (y / maxS) + 6;
        c.fillStyle = 'rgba(30,25,18,.12)'; rr(c, W - 9, 6, 4, H - 12, 2); c.fill();
        c.fillStyle = 'rgba(30,25,18,.5)'; rr(c, W - 9, ty, 4, th, 2); c.fill();
        if (p.a > 0.4) { c.fillStyle = 'rgba(30,25,18,.55)'; c.beginPath(); c.arc(W - 7, clamp(p.y * H, 8, H - 8), 7, 0, TAU); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.stroke(); }
      },
    };
  };
}

export const heading = (c: Ctx, txt: string, x: number, yy: number, size: number, col: string, fam?: string): void => {
  c.font = `${size}px ${fam || 'Marcellus, serif'}`;
  c.fillStyle = col;
  c.textBaseline = 'alphabetic';
  c.fillText(txt, x, yy);
};

export const bar = (c: Ctx, x: number, yy: number, w: number, h: number, col: string): void => {
  rr(c, x, yy, w, h, h / 2);
  c.fillStyle = col;
  c.fill();
};

/* ---------------- fitting type to a box ---------------- */

/** How wide `txt` is per pixel of font size, in the font `font(size)` with `track` em of letter spacing. */
export const per = (c: Ctx, txt: string, font: (s: number) => string, track = 0): number => {
  c.font = font(100);
  c.letterSpacing = track * 100 + 'px';
  const w = c.measureText(txt).width / 100;
  c.letterSpacing = '0px';
  return w;
};

/** The font size at which the widest of `lines` just fits `maxW`, never above `cap`. */
export const fit = (c: Ctx, lines: string[], font: (s: number) => string, maxW: number, cap: number, track = 0): number =>
  Math.min(cap, maxW / Math.max(0.01, ...lines.map((l) => per(c, l, font, track))));

/** Of several ways to break a text into lines, the one that sets the biggest type inside maxW x maxH (a tie goes to fewer lines). */
export const bestLines = (c: Ctx, opts: string[][], font: (s: number) => string, maxW: number, maxH: number, cap: number, lead = 1, track = 0): { lines: string[]; size: number } => {
  let best = { lines: opts[0]!, size: 0 };
  for (const lines of opts) {
    const size = Math.min(fit(c, lines, font, maxW, cap, track), maxH / (lines.length * lead));
    if (size > best.size + 0.01) best = { lines, size };
  }
  return best;
};

/* ---------------- the six school title cards (010, 011) ---------------- */

export interface School {
  n: string;
  /**
   * Draw the card into w x h. The Field Guide draws it in a 1.6:1 stage, and the Portal in whatever box it hangs in, so each
   * school has a wide composition (from 1:1 up; the most stretched stage is 1.7:1 and centred in anything wider) and a tall
   * one (under 1:1), and the type is fitted to the box rather than cropped by it.
   */
  d(c: Ctx, w: number, h: number, t: number): void;
}

const flowers = (() => {
  const r = mulberry32(44);
  const out: { x: number; y: number; s: number; c: string; ph: number }[] = [];
  const cols = ['#e9a9b8', '#b9a4d4', '#f2d98a', '#f0b9a0'];
  for (let i = 0; i < 12; i++) {
    let x: number, y: number;
    do { x = 0.08 + r() * 0.84; y = 0.1 + r() * 0.82; } while (x > 0.2 && x < 0.8 && y > 0.3 && y < 0.78);
    out.push({ x, y, s: 0.035 + r() * 0.03, c: cols[i % 4]!, ph: r() * TAU });
  }
  return out;
})();

const BAUHAUS = (s: number) => `900 ${s}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
const SWISS = (s: number) => `700 ${s}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
const VAPOR = (s: number) => `italic 900 ${s}px "Arial Black", Impact, sans-serif`;
const VAPOR_SUB = (s: number) => `${s}px "Courier New", monospace`;
const COTTAGE = (s: number) => `italic ${s}px Spectral, Georgia, serif`;
const GRAND = (s: number) => `${s}px Marcellus, Georgia, serif`;
const GRAND_SUB = (s: number) => `${s}px Marcellus, serif`;
const GLASS = (s: number) => `600 ${s}px "Segoe UI", system-ui, sans-serif`;

/** One title card per school, drawn from fractions of w and h. */
export const SCHOOLS: School[] = [
  { n: 'Bauhaus', d(c, w, h) {
    c.fillStyle = '#efe7d3'; c.fillRect(0, 0, w, h);
    c.textBaseline = 'alphabetic';
    if (w >= h) {
      const sw = Math.min(w, h * 1.7), X = (f: number) => (w - sw) / 2 + sw * f;
      c.fillStyle = '#d62f27'; c.beginPath(); c.arc(X(0.26), h * 0.4, h * 0.25, 0, TAU); c.fill();
      c.fillStyle = '#1f3f9a'; c.fillRect(X(0.5), h * 0.1, h * 0.34, h * 0.34);
      c.fillStyle = '#f2c31c'; c.beginPath(); c.moveTo(X(0.62), h * 0.74); c.lineTo(X(0.93), h * 0.74); c.lineTo(X(0.775), h * 0.4); c.closePath(); c.fill();
      c.fillStyle = '#111'; c.fillRect(X(0.07), h * 0.86, sw * 0.86, h * 0.028);
      const size = fit(c, ['birch design lab'], BAUHAUS, sw * 0.86, h * 0.115);
      c.font = BAUHAUS(size); c.fillText('birch design lab', X(0.07), h * 0.8);
      return;
    }
    // tall: the three shapes stacked over the wordmark broken into the lines that set it biggest
    const m = w * 0.07, maxW = w - 2 * m, barH = Math.max(3, w * 0.024), barY = h - m * 1.6 - barH;
    const { lines, size } = bestLines(c, [['birch design lab'], ['birch design', 'lab'], ['birch', 'design', 'lab']], BAUHAUS, maxW, h * 0.34, h * 0.2);
    const last = barY - size * 0.34, first = last - (lines.length - 1) * size, top = first - size * 0.74;
    const avail = top - m * 2.4, q = Math.min(avail, maxW), bx = m + (maxW - q) / 2, by = m * 1.2 + (avail - q) / 2;
    c.fillStyle = '#d62f27'; c.beginPath(); c.arc(bx + q * 0.28, by + q * 0.5, q * 0.28, 0, TAU); c.fill();
    c.fillStyle = '#1f3f9a'; c.fillRect(bx + q * 0.52, by, q * 0.46, q * 0.46);
    c.fillStyle = '#f2c31c'; c.beginPath(); c.moveTo(bx + q * 0.5, by + q); c.lineTo(bx + q, by + q); c.lineTo(bx + q * 0.75, by + q * 0.5); c.closePath(); c.fill();
    c.fillStyle = '#111'; c.fillRect(m, barY, maxW, barH);
    c.font = BAUHAUS(size);
    lines.forEach((s, i) => c.fillText(s, m, first + i * size));
  } },
  { n: 'Swiss', d(c, w, h) {
    c.fillStyle = '#f6f6f3'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#111'; c.textBaseline = 'alphabetic';
    const lines = ['Birch', 'Design', 'Lab'], track = -0.044;
    if (w >= h) {
      // the red square sits on the type's baseline at the right margin and grows smoothly as the card widens (the type
      // fills less of a wide card), so no window size or flight frame flips the composition
      const k = clamp((w / h - 1) / 0.6, 0, 1), sq = h * (0.12 + 0.18 * k * k * (3 - 2 * k));
      c.fillStyle = '#e30613'; c.fillRect(w * 0.93 - sq, h * 0.92 - sq, sq, sq);
      c.fillStyle = '#111'; c.fillRect(w * 0.07, h * 0.07, w * 0.86, 2);
      const size = fit(c, lines, SWISS, w * 0.86, h * 0.27, track), lead = size * 0.963;
      c.font = SWISS(size); c.letterSpacing = size * track + 'px';
      lines.forEach((s, i) => c.fillText(s, w * 0.07, h * 0.92 - (2 - i) * lead));
      c.letterSpacing = '0px';
      return;
    }
    // tall: the type fills the width and sits at the foot, the red square takes the top right
    const m = w * 0.07, size = fit(c, lines, SWISS, w - 2 * m, h * 0.3, track), lead = size * 0.963;
    const sq = Math.min(w * 0.3, h * 0.2);
    c.fillStyle = '#e30613'; c.fillRect(w - m - sq, h * 0.07 + m, sq, sq);
    c.fillStyle = '#111'; c.fillRect(m, h * 0.07, w - 2 * m, 2);
    c.font = SWISS(size); c.letterSpacing = size * track + 'px';
    lines.forEach((s, i) => c.fillText(s, m, h - m * 1.3 - (2 - i) * lead));
    c.letterSpacing = '0px';
  } },
  { n: 'Vaporwave', d(c, w, h, t) {
    const g = c.createLinearGradient(0, 0, 0, h * 0.62); g.addColorStop(0, '#190a3a'); g.addColorStop(0.6, '#6a2a9e'); g.addColorStop(1, '#ff5fa8');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const sg = c.createLinearGradient(0, h * 0.28, 0, h * 0.62); sg.addColorStop(0, '#ffe66d'); sg.addColorStop(1, '#ff4fa8');
    const R = Math.min(h * 0.26, w * 0.34), slat = w >= h * 1.3 ? w * 0.4 : R * 1.9;
    c.save(); c.beginPath(); c.rect(0, 0, w, h * 0.62); c.clip();
    c.fillStyle = sg; c.beginPath(); c.arc(w * 0.5, h * 0.52, R, 0, TAU); c.fill();
    c.fillStyle = '#7a2a9a'; for (let i = 0; i < 6; i++) c.fillRect((w - slat) / 2, h * (0.46 + i * 0.03), slat, h * (0.004 + i * 0.0045));
    c.restore();
    c.fillStyle = '#12052a'; c.fillRect(0, h * 0.62, w, h * 0.38);
    c.strokeStyle = 'rgba(53,224,255,.7)'; c.lineWidth = 1;
    for (let i = -12; i <= 12; i++) { c.beginPath(); c.moveTo(w * 0.5 + i * w * 0.012, h * 0.62); c.lineTo(w * 0.5 + i * w * 0.14, h); c.stroke(); }
    for (let k = 0; k < 8; k++) { const f = ((k + (t * 0.25) % 1) / 8), y = h * 0.62 + h * 0.38 * f * f; c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    const sz = fit(c, ['BIRCH'], VAPOR, w * 0.84, h * 0.2, 0.08);
    c.font = VAPOR(sz); c.letterSpacing = sz * 0.08 + 'px';
    const tg = c.createLinearGradient(0, h * 0.3 - sz, 0, h * 0.32); tg.addColorStop(0, '#9ff7ff'); tg.addColorStop(1, '#ff6ad5');
    c.strokeStyle = '#2a0a5a'; c.lineWidth = sz * 0.06; c.strokeText('BIRCH', w * 0.5, h * 0.3); c.fillStyle = tg; c.fillText('BIRCH', w * 0.5, h * 0.3);
    const sub = fit(c, ['DESIGN LAB'], VAPOR_SUB, w * 0.8, h * 0.05, 0.6);
    c.font = VAPOR_SUB(sub); c.letterSpacing = sub * 0.6 + 'px';
    c.strokeStyle = '#2a0a5a'; c.lineWidth = sub * 0.22; c.lineJoin = 'round'; c.strokeText('DESIGN LAB', w * 0.5, h * 0.37); c.lineJoin = 'miter';
    c.fillStyle = '#9ff7ff'; c.fillText('DESIGN LAB', w * 0.5, h * 0.37);
    c.letterSpacing = '0px'; c.textAlign = 'left';
  } },
  { n: 'Cottagecore', d(c, w, h, t) {
    c.fillStyle = '#efe8d0'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#d3dfc0'; const rr0 = h * 0.04;
    for (let x = 0; x < w + rr0; x += rr0 * 1.7) { c.beginPath(); c.arc(x, 0, rr0, 0, TAU); c.arc(x, h, rr0, 0, TAU); c.fill(); }
    for (let y = 0; y < h + rr0; y += rr0 * 1.7) { c.beginPath(); c.arc(0, y, rr0, 0, TAU); c.arc(w, y, rr0, 0, TAU); c.fill(); }
    for (const f of flowers) {
      const R = f.s * h, rot = Math.sin(t * 0.5 + f.ph) * 0.15;
      c.save(); c.translate(f.x * w, f.y * h); c.rotate(rot); c.fillStyle = f.c;
      for (let k = 0; k < 5; k++) { c.rotate(TAU / 5); c.beginPath(); c.ellipse(R * 0.7, 0, R * 0.6, R * 0.38, 0, 0, TAU); c.fill(); }
      c.fillStyle = '#fff1c9'; c.beginPath(); c.arc(0, 0, R * 0.3, 0, TAU); c.fill(); c.restore();
    }
    c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillStyle = '#5b4636';
    const big = fit(c, ['Birch'], COTTAGE, w * 0.66, h * 0.3);
    c.font = COTTAGE(big); c.fillText('Birch', w * 0.5, h * 0.58);
    const tag = bestLines(c, [['a design lab, not an agency'], ['a design lab,', 'not an agency']], COTTAGE, w * 0.72, h * 0.16, h * 0.065, 1.2);
    c.font = COTTAGE(tag.size);
    tag.lines.forEach((s, i) => c.fillText(s, w * 0.5, h * 0.7 + i * tag.size * 1.2));
    c.textAlign = 'left';
  } },
  { n: 'Grandmillennial', d(c, w, h) {
    c.fillStyle = '#f6eedd'; c.fillRect(0, 0, w, h);
    const cell = h * 0.04; c.fillStyle = 'rgba(35,53,92,.22)';
    for (let y = 0; y < h * 0.12; y += cell) for (let x = 0; x < w; x += cell) if (((x / cell) + (y / cell)) % 2 === 0) c.fillRect(x, y, cell, cell);
    for (let y = h * 0.88; y < h; y += cell) for (let x = 0; x < w; x += cell) if (((x / cell) + (y / cell)) % 2 === 0) c.fillRect(x, y, cell, cell);
    c.strokeStyle = '#23355c'; c.lineWidth = 3; c.strokeRect(w * 0.06, h * 0.16, w * 0.88, h * 0.68);
    c.strokeStyle = '#b8903a'; c.lineWidth = 1.2; c.strokeRect(w * 0.075, h * 0.185, w * 0.85, h * 0.63);
    c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillStyle = '#23355c';
    const big = fit(c, ['Birch'], GRAND, w * 0.6, h * 0.26);
    c.font = GRAND(big); c.fillText('Birch', w * 0.5, h * 0.56);
    const sub = fit(c, ['DESIGN LAB'], GRAND_SUB, w * 0.6, h * 0.06, 0.5);
    c.fillStyle = '#b8903a'; c.font = GRAND_SUB(sub); c.letterSpacing = sub * 0.5 + 'px'; c.fillText('DESIGN LAB', w * 0.5, h * 0.68); c.letterSpacing = '0px';
    c.fillRect(w * 0.36, h * 0.74, w * 0.28, 1.2); c.save(); c.translate(w * 0.5, h * 0.74); c.rotate(Math.PI / 4); c.fillRect(-h * 0.014, -h * 0.014, h * 0.028, h * 0.028); c.restore(); c.textAlign = 'left';
  } },
  { n: 'Glass', d(c, w, h, t) {
    const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#2f5bf0'); g.addColorStop(0.55, '#8a5bf0'); g.addColorStop(1, '#ff9b5e');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const blob = (x: number, y: number, r: number, col: string) => { const q = c.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, col); q.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = q; c.fillRect(x - r, y - r, r * 2, r * 2); };
    blob(w * (0.25 + 0.05 * Math.sin(t * 0.5)), h * 0.3, h * 0.5, 'rgba(110,240,255,.75)');
    blob(w * (0.78 + 0.04 * Math.cos(t * 0.4)), h * 0.72, h * 0.55, 'rgba(255,200,120,.8)');
    blob(w * 0.55, h * (0.2 + 0.05 * Math.sin(t * 0.6)), h * 0.35, 'rgba(255,120,220,.55)');
    const wide = w >= h;
    const cx = wide ? w * 0.17 : w * 0.08, cy = wide ? h * 0.2 : h * 0.2, cw = wide ? w * 0.66 : w * 0.84, ch = wide ? h * 0.6 : h * 0.56;
    c.save(); c.shadowColor = 'rgba(20,20,80,.3)'; c.shadowBlur = h * 0.08; c.shadowOffsetY = h * 0.03;
    rr(c, cx, cy, cw, ch, h * 0.06); c.fillStyle = 'rgba(255,255,255,.24)'; c.fill(); c.restore();
    c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 1.5; rr(c, cx, cy, cw, ch, h * 0.06); c.stroke();
    c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillStyle = '#fff';
    if (wide) {
      const sz = fit(c, ['Birch Design Lab'], GLASS, cw * 0.88, h * 0.1);
      c.font = GLASS(sz); c.fillText('Birch Design Lab', w * 0.5, h * 0.5);
      const pw = w * 0.22, ph = h * 0.1, sub = fit(c, ['Say hello'], GLASS, pw * 0.8, h * 0.045);
      rr(c, w * 0.39, h * 0.6, pw, ph, ph / 2); c.fillStyle = 'rgba(255,255,255,.9)'; c.fill();
      c.fillStyle = '#2f4fd0'; c.font = GLASS(sub); c.fillText('Say hello', w * 0.5, h * 0.665); c.textAlign = 'left';
      return;
    }
    // tall: the card nearly fills the width, the name breaks into the lines that set it biggest
    const lead = 1.12, tx = bestLines(c, [['Birch Design Lab'], ['Birch Design', 'Lab'], ['Birch', 'Design', 'Lab']], GLASS, cw * 0.84, ch * 0.46, h * 0.1, lead);
    c.font = GLASS(tx.size);
    const mid = cy + ch * 0.4, first = mid - ((tx.lines.length - 1) * tx.size * lead) / 2 + tx.size * 0.32;
    tx.lines.forEach((s, i) => c.fillText(s, w * 0.5, first + i * tx.size * lead));
    const pw = Math.min(cw * 0.5, h * 0.3), ph = Math.min(h * 0.08, pw * 0.42), py = cy + ch * 0.76 - ph / 2, sub = fit(c, ['Say hello'], GLASS, pw * 0.8, ph * 0.5);
    rr(c, (w - pw) / 2, py, pw, ph, ph / 2); c.fillStyle = 'rgba(255,255,255,.9)'; c.fill();
    c.fillStyle = '#2f4fd0'; c.font = GLASS(sub); c.fillText('Say hello', w * 0.5, py + ph / 2 + sub * 0.34); c.textAlign = 'left';
  } },
];
