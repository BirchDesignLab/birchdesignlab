/** BDL-009 Bayou Kitchen: a page that reads itself. Ported from the mockup's spec-b.js. */
import { TAU, rr } from '../draw';
import { bar, heading, pageMini } from './shared';

export const hint = 'Move to scroll';

export default pageMini('bdl-009', (c, img) => {
  c.fillStyle = '#faf6ee'; c.fillRect(0, 0, 1200, 1900);
  c.drawImage(img, 0, 0, 1200, 750);
  heading(c, 'The Menu', 80, 860, 62, '#1f1b15');
  const rows: [string, string, string][] = [['Shrimp and Grits', '$18', 'GF'], ['Blackened Redfish', 'Market Price', 'GF'], ['Seafood Gumbo', '$14', ''], ['Red Beans and Rice', '$12', 'V'], ['Crawfish Etouffee', 'Market Price', ''], ['Bread Pudding', '$9', 'V']];
  rows.forEach(([n, pr, tag], i) => {
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
}, 1900);
