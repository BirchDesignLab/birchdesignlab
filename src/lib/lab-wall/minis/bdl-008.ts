/** BDL-008 Magnolia and Mane: a page that reads itself. Ported from the mockup's spec-b.js. */
import { clamp, rr } from '../draw';
import { bar, heading, pageMini, per } from './shared';
import type { Detail } from './shared';

export const hint = 'Move to scroll';

const CARDS: [string, string, string][] = [['Cut and style', '$45', '#e9d7cf'], ['Color', 'from $85', '#dfe5d6'], ['Nails', '$30', '#e6dce8']];

const NAME = (s: number) => `${s}px Marcellus, serif`;
const BAND = 'Book without leaving the page';

function size(c: CanvasRenderingContext2D, W: number): number {
  const pad = Math.round(W * 0.055);
  return clamp((W - pad * 2 - 14) / (per(c, 'What we are known for', NAME) * 1.15), 10, 13);
}

function wrap(c: CanvasRenderingContext2D, txt: string, fs: number, maxW: number): string[] {
  c.font = NAME(fs);
  const out: string[] = [];
  let line = '';
  for (const word of txt.split(' ')) {
    const next = line ? line + ' ' + word : word;
    if (line && c.measureText(next).width > maxW) { out.push(line); line = word; } else line = next;
  }
  if (line) out.push(line);
  return out;
}

function layout(f: number, W: number, lines: string[]): { card: number; cards: number; band: number; total: number } {
  const pad = Math.round(W * 0.055), card = f * 3.1, cards = pad + f * 1.15 + f * 1.1, band = cards + CARDS.length * (card + f * 0.6) + f * 0.3;
  const bs = Math.max(9.5, f * 0.8);
  return { card, cards, band, total: band + f * 1.9 + lines.length * f * 1.4 + bs * 1.9 + f * 1.6 };
}

/** In a small box: the three price cards and the booking band at a size that reads, not the whole page shrunk. */
const detail: Detail = {
  height(c, W) {
    const f = size(c, W);
    return layout(f, W, wrap(c, BAND, f * 1.15, W - Math.round(W * 0.055) * 2 - 14)).total;
  },
  build(c, W) {
    const f = size(c, W), pad = Math.round(W * 0.055), lines = wrap(c, BAND, f * 1.15, W - pad * 2 - 14), L = layout(f, W, lines);
    c.fillStyle = '#f5f1e8'; c.fillRect(0, 0, W, L.total);
    heading(c, 'What we are known for', pad, pad + f * 1.15, f * 1.15, '#1f1b15');
    CARDS.forEach(([n, pr, col], i) => {
      const y = L.cards + i * (L.card + f * 0.6), x = pad, w = W - pad * 2 - 8;
      rr(c, x, y, w, L.card, 8); c.fillStyle = '#fffdf8'; c.fill(); c.strokeStyle = 'rgba(31,27,21,.15)'; c.lineWidth = 1; c.stroke();
      rr(c, x + 5, y + 5, L.card - 10, L.card - 10, 5); c.fillStyle = col; c.fill();
      heading(c, n, x + L.card + 4, y + L.card * 0.45, f, '#1f1b15');
      heading(c, pr, x + L.card + 4, y + L.card * 0.82, f * 0.95, '#2b4a37', 'Spectral, serif');
      bar(c, x + w - f * 3.2, y + L.card * 0.5 - 3, f * 2.6, 6, 'rgba(31,27,21,.12)');
    });
    c.fillStyle = '#2b4a37'; c.fillRect(0, L.band, W, L.total - L.band);
    lines.forEach((s, i) => heading(c, s, pad, L.band + f * 1.9 + i * f * 1.4, f * 1.15, '#f5f1e8'));
    const bs = Math.max(9.5, f * 0.8), bw = per(c, 'BOOK NOW', NAME) * bs + bs * 1.8, by = L.band + f * 1.9 + lines.length * f * 1.4 + f * 0.1;
    rr(c, pad, by, bw, bs * 1.9, 5); c.fillStyle = '#f5f1e8'; c.fill();
    heading(c, 'BOOK NOW', pad + bs * 0.9, by + bs * 1.3, bs, '#2b4a37');
  },
};

export default pageMini('bdl-008', (c, img) => {
  c.fillStyle = '#f5f1e8'; c.fillRect(0, 0, 1200, 1760);
  c.save(); c.beginPath(); c.rect(0, 0, 1200, 700); c.clip(); c.drawImage(img, 0, 0, 1200, 750); c.restore();
  heading(c, 'What we are known for', 80, 800, 60, '#1f1b15');
  CARDS.forEach(([n, pr, col], i) => {
    const x = 80 + i * 365, yy = 850;
    rr(c, x, yy, 330, 330, 14); c.fillStyle = '#fffdf8'; c.fill(); c.strokeStyle = 'rgba(31,27,21,.15)'; c.lineWidth = 2; c.stroke();
    rr(c, x + 20, yy + 20, 290, 130, 10); c.fillStyle = col; c.fill();
    heading(c, n, x + 24, yy + 210, 36, '#1f1b15'); heading(c, pr, x + 24, yy + 258, 34, '#2b4a37', 'Spectral, serif');
    bar(c, x + 24, yy + 282, 220, 10, 'rgba(31,27,21,.12)'); bar(c, x + 24, yy + 302, 150, 10, 'rgba(31,27,21,.12)');
  });
  c.fillStyle = '#2b4a37'; c.fillRect(0, 1260, 1200, 250);
  heading(c, 'Book without leaving the page', 80, 1360, 56, '#f5f1e8');
  rr(c, 80, 1400, 220, 64, 8); c.fillStyle = '#f5f1e8'; c.fill(); heading(c, 'BOOK NOW', 112, 1442, 26, '#2b4a37');
  heading(c, 'Hours', 80, 1600, 40, '#1f1b15');
  for (let i = 0; i < 3; i++) bar(c, 80, 1630 + i * 34, 420 - i * 60, 12, 'rgba(31,27,21,.14)');
  heading(c, 'EN   VI', 980, 1600, 30, '#5a5244');
}, 1760, detail);
