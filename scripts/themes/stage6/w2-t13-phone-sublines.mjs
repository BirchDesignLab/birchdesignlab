/**
 * Stage 6 wave 2, task 13 fix round 1 (critic C1): vaporwave Services lede
 * width on a phone. At 760 and below the kana is hidden, so the sublines must
 * not reserve room for it. Prints the sublines and h1 widths and line counts
 * at 360, 390, 600 and 760 (run against base and head to compare).
 *
 *   BASE=http://127.0.0.1:4470 node scripts/themes/stage6/w2-t13-phone-sublines.mjs
 */
import { chromium } from 'playwright';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const BASE = process.env.BASE || 'http://127.0.0.1:4470';
const browser = await chromium.launch({ headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const w of [360, 390, 600, 760]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 844 }, isMobile: true, hasTouch: true, colorScheme: 'light' });
  await suppressPrompt(ctx);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/t/vaporwave/services/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const m = await page.evaluate(() => {
    const s = document.querySelector('.sublines');
    const h = document.querySelector('.intro h1');
    return { sublines: Math.round(s.getBoundingClientRect().width), ps: [...s.querySelectorAll('p')].map((p) => Math.round(p.getBoundingClientRect().height)), h1: Math.round(h.getBoundingClientRect().width), kana: getComputedStyle(document.querySelector('.intro-kana')).display };
  });
  console.log(w, JSON.stringify(m));
  await ctx.close();
}
await browser.close();
