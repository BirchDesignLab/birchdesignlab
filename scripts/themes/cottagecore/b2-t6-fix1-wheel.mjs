/* B2 task 6 fix round 1: seed ink on text under wheel steps, scanned IN the page on every
   animation frame (the b2-t5 probe scans over CDP, which can miss the single frame a step leaves
   behind). 1440 light, 16 wheel steps of 300 px (up and down), 1.5 s apart.

     BDL_GPU=1 node scripts/themes/cottagecore/b2-t6-fix1-wheel.mjs [--base http://127.0.0.1:4460] [--size 1440]

   Prints frames with seed ink (alpha >= 14) inside a line of text as laid out in that frame, the
   peak alpha, and how many of the steps had any such frame within 400 ms. */
import { chromium } from 'playwright';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i < 0 ? d : process.argv[i + 1]; };
const base = arg('base', process.env.SNAP_BASE || 'http://127.0.0.1:4460').replace(/\/$/, '');
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: 'light', reducedMotion: 'no-preference' });
await suppressPrompt(context);
await context.addInitScript(() => { try { localStorage.setItem('scheme', 'light'); localStorage.setItem('theme', 'light'); } catch {} });
await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
const page = await context.newPage();
await page.goto(`${base}/t/cottagecore/`, { waitUntil: 'networkidle' });
await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
await page.evaluate(async () => { await document.fonts.ready; });
await page.waitForTimeout(2500);
await page.evaluate(() => {
  window.__w = { frames: [], steps: [] };
  const lines = () => {
    const out = [];
    const range = document.createRange();
    document.querySelectorAll('header, main, footer').forEach((region) => {
      const w = document.createTreeWalker(region, NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n; n = w.nextNode()) {
        if (!n.nodeValue.trim()) continue;
        range.selectNodeContents(n);
        for (const r of range.getClientRects()) if (r.width > 1 && r.height > 1) out.push([r.left, r.top, r.right, r.bottom]);
      }
    });
    return out;
  };
  const poll = () => {
    const c = document.querySelector('[data-cc-motes]');
    const ctx = c.getContext('2d');
    const k = c.width / innerWidth;
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    const L = lines();
    let onText = 0, peak = 0;
    for (let y = 0; y < c.height; y += 2) for (let x = 0; x < c.width; x += 2) {
      const a = d[(y * c.width + x) * 4 + 3];
      if (a >= 14) {
        const cx = x / k, cy = y / k;
        for (const r of L) if (cx >= r[0] && cx <= r[2] && cy >= r[1] && cy <= r[3]) { onText++; if (a > peak) peak = a; break; }
      }
    }
    window.__w.frames.push({ t: Math.round(performance.now()), sy: Math.round(scrollY), onText, peak });
    requestAnimationFrame(poll);
  };
  requestAnimationFrame(poll);
});
await page.mouse.move(700, 400);
for (let k = 0; k < 16; k++) {
  await page.evaluate(() => window.__w.steps.push(Math.round(performance.now())));
  await page.mouse.wheel(0, k % 8 < 4 ? 300 : -300);
  await page.waitForTimeout(1500);
}
const w = await page.evaluate(() => window.__w);
const hit = w.frames.filter((f) => f.onText > 0);
const stepsHit = w.steps.filter((t0) => hit.some((f) => f.t >= t0 && f.t <= t0 + 400)).length;
console.log(`frames ${w.frames.length}, with seed ink on text ${hit.length}, peak alpha ${Math.max(0, ...hit.map((f) => f.peak))}, steps affected ${stepsHit} of ${w.steps.length}`);
if (hit.length) console.log(JSON.stringify(hit.slice(0, 10)));
await browser.close();
