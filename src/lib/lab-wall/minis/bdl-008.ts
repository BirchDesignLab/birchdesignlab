/** BDL-008 Magnolia and Mane: a page that reads itself. Ported from the mockup's spec-b.js. */
import { rr } from '../draw';
import { bar, heading, pageMini } from './shared';

export const hint = 'Move to scroll';

export default pageMini('bdl-008', (c, img) => {
  c.fillStyle = '#f5f1e8'; c.fillRect(0, 0, 1200, 1760);
  c.save(); c.beginPath(); c.rect(0, 0, 1200, 700); c.clip(); c.drawImage(img, 0, 0, 1200, 750); c.restore();
  heading(c, 'What we are known for', 80, 800, 60, '#1f1b15');
  const cards: [string, string, string][] = [['Cut and style', '$45', '#e9d7cf'], ['Color', 'from $85', '#dfe5d6'], ['Nails', '$30', '#e6dce8']];
  cards.forEach(([n, pr, col], i) => {
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
}, 1760);
