/**
 * Wave B2 glass CRITIC touch probe (09-25-26): at 390x844 (touch), swipe up
 * starting on the lens's resting spot (which sits over the hero text) and,
 * as a control, starting beside it. Reports scrollY change and where the
 * lens moved, i.e. whether the invisible lens hit area blocks page scrolling
 * over the hero copy. GPU Chromium, reduced-transparency forced off.
 * Usage: BDL_GPU=1 node scripts/themes/glassmorphism/b2-glass-critic-touch.mjs --base http://127.0.0.1:4477
 */
import { chromium } from 'playwright';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const args = process.argv.slice(2);
const base = args[args.indexOf('--base') + 1] || 'http://127.0.0.1:4477';
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const out = {};
for (const where of ['on-lens', 'beside-lens']) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await suppressPrompt(context);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('.lens-poster')?.style.display === 'none', { timeout: 10000 });
  await page.waitForTimeout(500);
  const lens = await page.evaluate(() => { const r = document.querySelector('.lens-hit').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.width / 2]; });
  const x = where === 'on-lens' ? lens[0] : 30;
  const y0 = lens[1] + 40, y1 = lens[1] - 200;
  const before = await page.evaluate(() => scrollY);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] });
  for (let i = 1; i <= 12; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y0 + (y1 - y0) * i / 12 }] });
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(900);
  const after = await page.evaluate(() => scrollY);
  const lens2 = await page.evaluate(() => { const r = document.querySelector('.lens-hit').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  const topEl = await page.evaluate(([cx, cy]) => { const e = document.elementsFromPoint(cx, cy); return e.slice(0, 3).map((n) => n.className || n.tagName); }, lens);
  out[where] = { lens, startX: x, scrollBefore: before, scrollAfter: after, lensAfter: lens2.map(Math.round), stackAtLens: topEl };
  await context.close();
}
await browser.close();
console.log(JSON.stringify(out, null, 2));
