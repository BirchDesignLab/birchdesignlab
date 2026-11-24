/** BDL-009 Bayou Kitchen: a page that reads itself. Ported from the mockup's spec-b.js. */
import { TAU, clamp, rr } from '../draw';
import { bar, heading, pageMini, per } from './shared';
import type { Detail } from './shared';

export const hint = 'Move to scroll';

const ROWS: [string, string, string][] = [['Shrimp and Grits', '$18', 'GF'], ['Blackened Redfish', 'Market Price', 'GF'], ['Seafood Gumbo', '$14', ''], ['Red Beans and Rice', '$12', 'V'], ['Crawfish Etouffee', 'Market Price', ''], ['Bread Pudding', '$9', 'V']];

const DISH = (s: number) => `${s}px Marcellus, serif`;
const PRICE = (s: number) => `${s}px Spectral, serif`;

/** The type size for a row: as big as the widest row (a long dish and a long price) allows in the width, between 10 and 13. */
function size(c: CanvasRenderingContext2D, W: number): number {
  const pad = Math.round(W * 0.055);
  const need = per(c, 'Blackened Redfish', DISH) + per(c, 'Market Price', PRICE) * 0.88 + 1.6;
  return clamp((W - pad * 2 - 14) / need, 10, 13);
}

const total = (f: number) => f * 1.5 * 1.6 + ROWS.length * f * 2 + f * 5.6;
/** Where the rows start under the heading, and the most rows a box shows whole with the heading above them. */
const rowsFrom = (f: number) => f * 1.5 * 1.6 + f * 0.6;
const ROWS_WITH_HEADING = 3;

/** In a small box: the menu's rows at a size that reads (dish, dotted leader, price), then the booking band, not the whole page shrunk. */
export const detail: Detail = {
  height(c, W) { return total(size(c, W)); },
  rest(c, W, H) {
    const f = size(c, W), rh = f * 2;
    // the heading stays when it and three whole rows (and the line under the third) fit; otherwise the first row's baseline sits 1.6 lines down
    return rowsFrom(f) + ROWS_WITH_HEADING * rh + f * 0.6 <= H ? 0 : rowsFrom(f) + rh - f * 1.6;
  },
  build(c, W) {
    const f = size(c, W), pad = Math.round(W * 0.055), rh = f * 2;
    c.fillStyle = '#faf6ee'; c.fillRect(0, 0, W, total(f));
    heading(c, 'The Menu', pad, pad + f * 1.2, f * 1.5, '#1f1b15');
    let yy = rowsFrom(f);
    for (const [n, pr] of ROWS) {
      const mkt = pr[0] === 'M', ps = f * (mkt ? 0.88 : 1);
      yy += rh;
      heading(c, n, pad, yy, f, '#1f1b15');
      c.font = DISH(f); const dw = c.measureText(n).width;
      c.font = PRICE(ps); const pw = c.measureText(pr).width;
      c.fillStyle = 'rgba(31,27,21,.3)';
      for (let x = pad + dw + f * 0.6; x < W - pad - pw - f * 0.6 - 8; x += f * 0.7) c.fillRect(x, yy - 2, 1.6, 1.6);
      c.textAlign = 'right'; heading(c, pr, W - pad - 8, yy, ps, mkt ? '#8a5a2e' : '#2b4a37', 'Spectral, serif'); c.textAlign = 'left';
      c.fillStyle = 'rgba(31,27,21,.1)'; c.fillRect(pad, yy + f * 0.55, W - pad * 2 - 8, 1);
    }
    const by = yy + f * 1.2;
    c.fillStyle = '#2a2420'; c.fillRect(0, by, W, f * 4.4);
    heading(c, 'Book a table', pad, by + f * 1.8, f * 1.25, '#f5f1e8');
    const bs = Math.max(9.5, f * 0.8), bw = per(c, 'RESERVE', DISH) * bs + bs * 1.8;
    rr(c, pad, by + f * 2.5, bw, bs * 1.9, 5); c.fillStyle = '#f5f1e8'; c.fill();
    heading(c, 'RESERVE', pad + bs * 0.9, by + f * 2.5 + bs * 1.3, bs, '#2a2420');
  },
};

export default pageMini('bdl-009', (c, img) => {
  c.fillStyle = '#faf6ee'; c.fillRect(0, 0, 1200, 1900);
  c.drawImage(img, 0, 0, 1200, 750);
  heading(c, 'The Menu', 80, 860, 62, '#1f1b15');
  ROWS.forEach(([n, pr, tag], i) => {
    const yy = 960 + i * 110;
    heading(c, n, 80, yy, 40, '#1f1b15');
    c.fillStyle = 'rgba(31,27,21,.3)'; for (let x = 520; x < 900; x += 14) c.fillRect(x, yy - 6, 4, 3);
    c.textAlign = 'right'; heading(c, pr, 1120, yy, pr[0] === 'M' ? 30 : 40, pr[0] === 'M' ? '#8a5a2e' : '#2b4a37', 'Spectral, serif'); c.textAlign = 'left';
    bar(c, 80, yy + 26, 340, 10, 'rgba(31,27,21,.12)');
    if (tag) { c.beginPath(); c.arc(470, yy + 31, 17, 0, TAU); c.fillStyle = '#e3e9e0'; c.fill(); c.strokeStyle = '#2b4a37'; c.lineWidth = 2; c.stroke(); heading(c, tag, tag.length > 1 ? 454 : 463, yy + 38, 18, '#2b4a37', 'Spectral, serif'); }
  });
  c.fillStyle = '#2a2420'; c.fillRect(0, 1690, 1200, 210);
  heading(c, 'Book a table', 80, 1790, 54, '#f5f1e8');
  rr(c, 80, 1815, 200, 56, 8); c.fillStyle = '#f5f1e8'; c.fill(); heading(c, 'RESERVE', 112, 1852, 24, '#2a2420');
}, 1900, detail);
