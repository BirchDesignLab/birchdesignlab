/**
 * Stage 6 wave 2, task 15 (ledger B1 T4 rc1-N1): Home's canopy height is hand-fitted.
 * On a phone Home's header carries the compact one-line mark with
 * `padding-block: 1.489rem` (Header.astro), chosen so the canopy is exactly as tall as the
 * stacked mark's on the other pages. The canopy is pinned between rooms
 * (grandmillennial-header), so a mismatch snaps the header on the first frame of a swap.
 * This probe measures `.site-header > .canopy` on Home, About, Services and Contact at a run
 * of widths, in both schemes, and exits 1 if any width gives two different heights. Run it
 * after any change to the masthead, the wordmark or the font sizes.
 *
 *   BASE=http://127.0.0.1:4470 node scripts/themes/stage6/w2-t15-canopy.mjs
 */
import { chromium } from 'playwright';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const BASE = (process.env.BASE || 'http://127.0.0.1:4470').replace(/\/$/, '');
const PAGES = ['', 'about/', 'services/', 'contact/'];
const WIDTHS = [320, 360, 390, 430, 480, 600, 700, 760, 761, 820, 1024, 1280, 1440];
const browser = await chromium.launch({ args: ['--hide-scrollbars'] });
let bad = 0;
for (const scheme of ['light', 'dark']) {
  for (const w of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, colorScheme: scheme });
    await suppressPrompt(ctx);
    await ctx.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
    const heights = {};
    for (const path of PAGES) {
      const page = await ctx.newPage();
      await page.goto(`${BASE}/t/grandmillennial/${path}`, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      heights[path || 'home'] = await page.evaluate(() => document.querySelector('.site-header > .canopy').getBoundingClientRect().height);
      await page.close();
    }
    const vals = Object.values(heights);
    const ok = Math.max(...vals) - Math.min(...vals) < 0.5;
    if (!ok) bad++;
    console.log(scheme.padEnd(5), String(w).padStart(5), ok ? 'ok      ' : 'MISMATCH', JSON.stringify(heights));
    await ctx.close();
  }
}
await browser.close();
console.log(bad ? `FAIL: ${bad} width(s) with unequal canopy heights` : 'PASS: the canopy is one height on every page at every width');
process.exit(bad ? 1 : 0);
