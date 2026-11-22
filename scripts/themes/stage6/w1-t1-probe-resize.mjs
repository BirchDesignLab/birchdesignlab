/**
 * Stage 6 w1 task 1: replay the lens probe's resize case (1280 -> 1088, drag
 * into the hero window, hold, release) and print the obstruction rects the
 * lens sees, the disc's modelled cover and elementFromPoint's view, before
 * and after the release.
 * Usage: node scripts/themes/snap.mjs --name s6-w1-t1 --reuse --port 4470 -- node scripts/themes/stage6/w1-t1-probe-resize.mjs
 */
import { chromium } from 'playwright';
import { suppressPrompt } from '../lib/portal-prompt.mjs';
const base = process.env.SNAP_BASE || 'http://127.0.0.1:4470';
const browser = await chromium.launch({ headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu'] });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'no-preference' });
await suppressPrompt(context);
const page = await context.newPage();
page.on('console', (m) => console.log('console:', m.text()));
const cdp = await context.newCDPSession(page);
await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => document.querySelector('.lens-canvas')?.style.visibility === 'visible');
await page.setViewportSize({ width: 1088, height: 800 });
await page.waitForTimeout(800);
const state = () => page.evaluate(() => {
  const hit = document.querySelector('.lens-hit');
  const q = hit.getBoundingClientRect();
  const c = [q.left + q.width / 2, q.top + q.height / 2];
  const rects = [document.querySelector('.site-header'), document.querySelector('bdl-switcher'), ...document.querySelectorAll('.glass')].filter(Boolean).map((e) => { const r = e.getBoundingClientRect(); return [e.className || e.tagName, Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; });
  let n = 0, on = 0;
  for (let y = -q.width / 2; y < q.width / 2; y += 6) for (let x = -q.width / 2; x < q.width / 2; x += 6) { if (x * x + y * y > q.width * q.width / 4) continue; n++; if (document.elementFromPoint(c[0] + x, c[1] + y) === hit) on++; }
  return { c: c.map(Math.round), grab: +(on / n).toFixed(3), rects, vw: innerWidth, sx: scrollX, sy: scrollY };
});
const s0 = await state();
console.log('before', JSON.stringify(s0));
const from = s0.c;
await page.mouse.move(from[0] - 50, from[1]);
await page.mouse.down();
for (let i = 1; i <= 16; i++) { await page.mouse.move(from[0] - 50 + 5 * i, from[1] - 4 * i, { steps: 2 }); await page.waitForTimeout(20); }
await page.waitForTimeout(150);
console.log('held', JSON.stringify(await state()));
await page.mouse.up();
for (const t of [100, 400, 1200]) { await page.waitForTimeout(t); console.log('after', t, JSON.stringify(await state())); }
await browser.close();
