/**
 * Sonnet-verifier: E15 floor pause and CSS floor cycle-position probe for
 * vaporwave B1. Not a permanent tool.
 * Usage: BDL_GPU=1 node scripts/themes/vaporwave/verify-e15-e3.mjs
 */
import { chromium } from 'playwright';
const BASE = process.env.SNAP_BASE || 'http://127.0.0.1:4476';
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(BASE + '/t/vaporwave/contact/', { waitUntil: 'networkidle' });

// E15: scroll floor off-screen, check paused; scroll back, check running
const before = await page.evaluate(() => {
  const f = document.querySelector('.vw-floor');
  return f ? { hasPausedClass: f.classList.contains('vw-floor-paused'), playState: getComputedStyle(f, '::before').animationPlayState } : null;
});
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(400);
const atTop = await page.evaluate(() => {
  const f = document.querySelector('.vw-floor');
  const r = f.getBoundingClientRect();
  return f ? { onscreen: r.top < window.innerHeight && r.bottom > 0, hasPausedClass: f.classList.contains('vw-floor-paused'), playState: getComputedStyle(f, '::before').animationPlayState } : null;
});
await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
await page.waitForTimeout(600);
const atBottom = await page.evaluate(() => {
  const f = document.querySelector('.vw-floor');
  const r = f.getBoundingClientRect();
  return f ? { onscreen: r.top < window.innerHeight && r.bottom > 0, hasPausedClass: f.classList.contains('vw-floor-paused'), playState: getComputedStyle(f, '::before').animationPlayState } : null;
});

console.log(JSON.stringify({ before, atTop, atBottom }, null, 1));
await browser.close();
