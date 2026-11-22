/**
 * Stage 6 wave 2, task 10 (T6 C7): what a visitor downloads for About's field
 * image and Home's lab band, measured in a real browser (Chromium, DPR 1),
 * on a frozen snap. Scrolls to the foot so the lazy images load, and sums the
 * image responses.
 *   SNAP=stage6-base node scripts/themes/stage6/w2-t10-weights.mjs
 */
import { chromium } from 'playwright';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveDist } from '../lib/serve-dist.mjs';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const OUTROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '.out');
const server = await serveDist(4470, join(OUTROOT, `snap-${process.env.SNAP}`));
const browser = await chromium.launch({ args: ['--hide-scrollbars'] });
try {
  for (const w of [1440, 1024, 820, 390]) for (const pg of ['about/', '']) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
    await suppressPrompt(ctx);
    const page = await ctx.newPage();
    const imgs = [];
    page.on('response', async (r) => {
      const u = r.url();
      if (/\.(avif|webp|png|jpe?g)(\?|$)/.test(u) && !/favicon|icon|og-/.test(u)) {
        try { imgs.push({ u: u.split('/').pop(), bytes: (await r.body()).length }); } catch { /* aborted */ }
      }
    });
    await page.goto(`http://127.0.0.1:4470/t/swiss/${pg}`, { waitUntil: 'networkidle' });
    await page.evaluate(async () => { for (let y = 0; y <= document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } });
    await page.waitForTimeout(800);
    const swissImgs = imgs.filter((i) => /swiss|field|band|tree/i.test(i.u));
    console.log(w, pg || 'home', JSON.stringify(swissImgs), 'total', swissImgs.reduce((a, i) => a + i.bytes, 0));
    await ctx.close();
  }
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
