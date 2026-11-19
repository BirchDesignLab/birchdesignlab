/**
 * Stage 6 w1 task 1: what sits over a lens spot that elementFromPoint calls
 * covered but the lens's own obstruction list does not (the probe's 1088 px
 * resize case). Prints the top elements over a grid of the disc.
 * Usage: node scripts/themes/snap.mjs --name s6-w1-t1 --reuse --port 4470 -- node scripts/themes/stage6/w1-t1-probe-cover.mjs <w> <h> <x> <y> <r>
 */
import { chromium } from 'playwright';
import { suppressPrompt } from '../lib/portal-prompt.mjs';
const [w, h, x, y, r] = process.argv.slice(2).map(Number);
const base = process.env.SNAP_BASE || 'http://127.0.0.1:4470';
const browser = await chromium.launch({ headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu'] });
const context = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'no-preference' });
await suppressPrompt(context);
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
console.log(JSON.stringify(await page.evaluate(([x, y, r]) => {
  const d = (e) => e ? `${e.tagName.toLowerCase()}${e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : ''}` : 'null';
  const counts = {};
  for (let dy = -r; dy <= r; dy += 8) for (let dx = -r; dx <= r; dx += 8) {
    if (dx * dx + dy * dy > r * r) continue;
    const k = d(document.elementFromPoint(x + dx, y + dy));
    counts[k] = (counts[k] || 0) + 1;
  }
  return { counts, chain: document.elementsFromPoint(x, y).slice(0, 6).map(d) };
}, [x, y, r]), null, 1));
await browser.close();
