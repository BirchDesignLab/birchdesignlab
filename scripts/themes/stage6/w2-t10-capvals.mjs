/**
 * Stage 6 wave 2, task 10 (S2): the exact cap the dial computes (the inline
 * --sw-rest it writes on the h1 when it differs from the CSS rest), 1024 to
 * 1195 and a few widths above. BASE=http://127.0.0.1:4470 node scripts/themes/stage6/w2-t10-capvals.mjs
 */
import { chromium } from 'playwright';
import { suppressPrompt } from '../lib/portal-prompt.mjs';
const BASE = process.env.BASE || 'http://127.0.0.1:4470';
const browser = await chromium.launch({ args: ['--hide-scrollbars'] });
const out = [];
for (const w of [1024, 1040, 1056, 1088, 1120, 1152, 1180, 1195, 1196, 1240, 1279]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 800 } });
  await suppressPrompt(ctx);
  await ctx.addInitScript(() => { try { sessionStorage.setItem('bdl-swiss-dial-hint', '1'); } catch {} });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/t/swiss/`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  out.push(`${w}: inline rest ${await p.evaluate(() => document.querySelector('.billboard').style.getPropertyValue('--sw-rest') || '(none)')} valuemax ${await p.evaluate(() => document.querySelector('[data-sw-dial]').getAttribute('aria-valuemax'))} frameW ${await p.evaluate(() => document.querySelector('.hero').getBoundingClientRect().width.toFixed(2))}`);
  await ctx.close();
}
await browser.close();
console.log(out.join('\n'));
