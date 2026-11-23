/**
 * Helpers shared by several miniatures: the page-reading miniature factory
 * (008, 009), its text and bar helpers, and the six school title cards
 * (010, 011).
 */
import { TAU, clamp, mulberry32, rr } from '../draw';
import type { Mini, MiniEnv, MiniFactory } from '../types';

type Ctx = CanvasRenderingContext2D;

/* ---------------- a page that reads itself (008, 009) ---------------- */

export function pageMini(id: string, build: (c: Ctx, img: HTMLImageElement) => void, PH: number): MiniFactory {
  return (env: MiniEnv): Mini => {
    let W = 0, H = 0, dpr = 1, y = 0, dir = 1, pause = 2.2, scale = 1;
    let pg: HTMLCanvasElement | null = null;
    function make() {
      const img = env.img(id);
      if (!img) return;
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
        const maxS = Math.max(1, PH - H / scale);
        if (p.a > 0.4) { y += (p.y * maxS - y) * (1 - Math.exp(-dt * 5)); pause = 1.2; dir = p.y > 0.5 ? 1 : -1; }
        else if (pause > 0) pause -= dt;
        else {
          y += dir * (dir > 0 ? 30 : 90) * Math.min(dt, 0.1);
          if (y >= maxS) { y = maxS; dir = -1; pause = 2.4; } else if (y <= 0) { y = 0; dir = 1; pause = 3; }
        }
        y = clamp(y, 0, maxS);
        if (pg) c.drawImage(pg, 0, y * scale * dpr, W * dpr, H * dpr, 0, 0, W, H);
        // scroll bar: shows it is a page being read
        const th = Math.max(26, H * (H / scale / PH)), ty = (H - th - 12) * (y / maxS) + 6;
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

/* ---------------- the six school title cards (010, 011) ---------------- */

export interface School {
  n: string;
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

/** One title card per school, drawn from fractions of w and h. */
export const SCHOOLS: School[] = [
  { n: 'Bauhaus', d(c, w, h) {
    c.fillStyle = '#efe7d3'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#d62f27'; c.beginPath(); c.arc(w * 0.26, h * 0.4, h * 0.25, 0, TAU); c.fill();
    c.fillStyle = '#1f3f9a'; c.fillRect(w * 0.5, h * 0.1, h * 0.34, h * 0.34);
    c.fillStyle = '#f2c31c'; c.beginPath(); c.moveTo(w * 0.62, h * 0.74); c.lineTo(w * 0.93, h * 0.74); c.lineTo(w * 0.775, h * 0.4); c.closePath(); c.fill();
    c.fillStyle = '#111'; c.fillRect(w * 0.07, h * 0.86, w * 0.86, h * 0.028);
    c.font = `900 ${h * 0.115}px "Arial Black", "Helvetica Neue", Arial, sans-serif`; c.textBaseline = 'alphabetic'; c.fillText('birch design lab', w * 0.07, h * 0.8);
  } },
  { n: 'Swiss', d(c, w, h) {
    c.fillStyle = '#f6f6f3'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#e30613'; c.fillRect(w * 0.76, h * 0.09, h * 0.12, h * 0.12);
    c.fillStyle = '#111'; c.fillRect(w * 0.07, h * 0.07, w * 0.86, 2);
    c.font = `700 ${h * 0.27}px "Helvetica Neue", Helvetica, Arial, sans-serif`; c.letterSpacing = -h * 0.012 + 'px'; c.textBaseline = 'alphabetic';
    ['Birch', 'Design', 'Lab'].forEach((s, i) => c.fillText(s, w * 0.07, h * (0.4 + i * 0.26)));
    c.letterSpacing = '0px';
  } },
  { n: 'Vaporwave', d(c, w, h, t) {
    const g = c.createLinearGradient(0, 0, 0, h * 0.62); g.addColorStop(0, '#190a3a'); g.addColorStop(0.6, '#6a2a9e'); g.addColorStop(1, '#ff5fa8');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const sg = c.createLinearGradient(0, h * 0.28, 0, h * 0.62); sg.addColorStop(0, '#ffe66d'); sg.addColorStop(1, '#ff4fa8');
    c.save(); c.beginPath(); c.rect(0, 0, w, h * 0.62); c.clip();
    c.fillStyle = sg; c.beginPath(); c.arc(w * 0.5, h * 0.52, h * 0.26, 0, TAU); c.fill();
    c.fillStyle = '#7a2a9a'; for (let i = 0; i < 6; i++) c.fillRect(w * 0.3, h * (0.46 + i * 0.03), w * 0.4, h * (0.004 + i * 0.0045));
    c.restore();
    c.fillStyle = '#12052a'; c.fillRect(0, h * 0.62, w, h * 0.38);
    c.strokeStyle = 'rgba(53,224,255,.7)'; c.lineWidth = 1;
    for (let i = -12; i <= 12; i++) { c.beginPath(); c.moveTo(w * 0.5 + i * w * 0.012, h * 0.62); c.lineTo(w * 0.5 + i * w * 0.14, h); c.stroke(); }
    for (let k = 0; k < 8; k++) { const f = ((k + (t * 0.25) % 1) / 8), y = h * 0.62 + h * 0.38 * f * f; c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.font = `italic 900 ${h * 0.2}px "Arial Black", Impact, sans-serif`; c.letterSpacing = h * 0.016 + 'px';
    const tg = c.createLinearGradient(0, h * 0.1, 0, h * 0.32); tg.addColorStop(0, '#9ff7ff'); tg.addColorStop(1, '#ff6ad5');
    c.strokeStyle = '#2a0a5a'; c.lineWidth = h * 0.012; c.strokeText('BIRCH', w * 0.5, h * 0.3); c.fillStyle = tg; c.fillText('BIRCH', w * 0.5, h * 0.3);
    c.font = `${h * 0.05}px "Courier New", monospace`; c.letterSpacing = h * 0.03 + 'px'; c.fillStyle = '#9ff7ff'; c.fillText('DESIGN LAB', w * 0.5, h * 0.37);
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
    c.font = `italic ${h * 0.3}px Spectral, Georgia, serif`; c.fillText('Birch', w * 0.5, h * 0.58);
    c.font = `italic ${h * 0.065}px Spectral, Georgia, serif`; c.fillText('a design lab, not an agency', w * 0.5, h * 0.7); c.textAlign = 'left';
  } },
  { n: 'Grandmillennial', d(c, w, h) {
    c.fillStyle = '#f6eedd'; c.fillRect(0, 0, w, h);
    const cell = h * 0.04; c.fillStyle = 'rgba(35,53,92,.22)';
    for (let y = 0; y < h * 0.12; y += cell) for (let x = 0; x < w; x += cell) if (((x / cell) + (y / cell)) % 2 === 0) c.fillRect(x, y, cell, cell);
    for (let y = h * 0.88; y < h; y += cell) for (let x = 0; x < w; x += cell) if (((x / cell) + (y / cell)) % 2 === 0) c.fillRect(x, y, cell, cell);
    c.strokeStyle = '#23355c'; c.lineWidth = 3; c.strokeRect(w * 0.06, h * 0.16, w * 0.88, h * 0.68);
    c.strokeStyle = '#b8903a'; c.lineWidth = 1.2; c.strokeRect(w * 0.075, h * 0.185, w * 0.85, h * 0.63);
    c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillStyle = '#23355c';
    c.font = `${h * 0.26}px Marcellus, Georgia, serif`; c.fillText('Birch', w * 0.5, h * 0.56);
    c.fillStyle = '#b8903a'; c.font = `${h * 0.06}px Marcellus, serif`; c.letterSpacing = h * 0.03 + 'px'; c.fillText('DESIGN LAB', w * 0.5, h * 0.68); c.letterSpacing = '0px';
    c.fillRect(w * 0.36, h * 0.74, w * 0.28, 1.2); c.save(); c.translate(w * 0.5, h * 0.74); c.rotate(Math.PI / 4); c.fillRect(-h * 0.014, -h * 0.014, h * 0.028, h * 0.028); c.restore(); c.textAlign = 'left';
  } },
  { n: 'Glass', d(c, w, h, t) {
    const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#2f5bf0'); g.addColorStop(0.55, '#8a5bf0'); g.addColorStop(1, '#ff9b5e');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const blob = (x: number, y: number, r: number, col: string) => { const q = c.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, col); q.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = q; c.fillRect(x - r, y - r, r * 2, r * 2); };
    blob(w * (0.25 + 0.05 * Math.sin(t * 0.5)), h * 0.3, h * 0.5, 'rgba(110,240,255,.75)');
    blob(w * (0.78 + 0.04 * Math.cos(t * 0.4)), h * 0.72, h * 0.55, 'rgba(255,200,120,.8)');
    blob(w * 0.55, h * (0.2 + 0.05 * Math.sin(t * 0.6)), h * 0.35, 'rgba(255,120,220,.55)');
    c.save(); c.shadowColor = 'rgba(20,20,80,.3)'; c.shadowBlur = h * 0.08; c.shadowOffsetY = h * 0.03;
    rr(c, w * 0.17, h * 0.2, w * 0.66, h * 0.6, h * 0.06); c.fillStyle = 'rgba(255,255,255,.24)'; c.fill(); c.restore();
    c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 1.5; rr(c, w * 0.17, h * 0.2, w * 0.66, h * 0.6, h * 0.06); c.stroke();
    c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillStyle = '#fff';
    c.font = `600 ${h * 0.1}px "Segoe UI", system-ui, sans-serif`; c.fillText('Birch Design Lab', w * 0.5, h * 0.5);
    rr(c, w * 0.39, h * 0.6, w * 0.22, h * 0.1, h * 0.05); c.fillStyle = 'rgba(255,255,255,.9)'; c.fill();
    c.fillStyle = '#2f4fd0'; c.font = `600 ${h * 0.045}px "Segoe UI", system-ui, sans-serif`; c.fillText('Say hello', w * 0.5, h * 0.665); c.textAlign = 'left';
  } },
];
