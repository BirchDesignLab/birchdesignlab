/**
 * Stage 6 wave 1, task 4: the width dial's live collision cap across desktop
 * widths. For each width from 1024 to 1920 it reads the dial's rest and top
 * (aria-valuenow, aria-valuemax), the word's right edge and descender, the
 * lede's box, and reports the clearance: when the lede's top is above the
 * word's ink bottom, the lede's left edge less the word's right edge must be
 * at least zero (no ink on the lede); the dial is also dragged to its top and
 * the same is measured. Also reports whether the CSS rest (no script) already
 * matched (125 from 1280).
 *
 *   node scripts/themes/snap.mjs --name s6-w1-t4 --reuse --port 4470 -- node scripts/themes/stage6/w1-t4-cap-sweep.mjs
 */
import { chromium } from 'playwright';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const BASE = process.env.BASE || process.env.SNAP_BASE || 'http://127.0.0.1:4470';
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const rows = [];
for (let w = 1024; w <= 1920; w += 64) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, colorScheme: 'light' });
  await suppressPrompt(ctx);
  await ctx.addInitScript(() => { try { sessionStorage.setItem('bdl-swiss-dial-hint', '1'); } catch {} });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/t/swiss/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const read = () => page.evaluate(() => {
    const dial = document.querySelector('[data-sw-dial]');
    const word = document.querySelectorAll('.billboard .ln')[1];
    const r = document.createRange(); r.selectNodeContents(word);
    const t = r.getBoundingClientRect();
    const lede = document.querySelector('.lede').getBoundingClientRect();
    const fs = parseFloat(getComputedStyle(word).fontSize);
    const inkBottom = t.top + t.height * 0.5 + fs * 0.45; // generous: the g's descender
    return { now: +dial.getAttribute('aria-valuenow'), max: +dial.getAttribute('aria-valuemax'), wordR: Math.round(t.right), ledeL: Math.round(lede.left), ledeT: Math.round(lede.top), inkBottom: Math.round(inkBottom), overlapsY: lede.top < inkBottom };
  });
  const rest = await read();
  await page.focus('[data-sw-dial]');
  await page.keyboard.press('End');
  const top = await read();
  rows.push({ w, rest: rest.now, max: rest.max, restClear: rest.overlapsY ? rest.ledeL - rest.wordR : 'n/a (clear above)', topClear: top.overlapsY ? top.ledeL - top.wordR : 'n/a (clear above)' });
  await ctx.close();
}
await browser.close();
console.table(rows);
