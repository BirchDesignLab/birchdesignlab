/**
 * Why a tap on the switcher's glassmorphism row did not navigate on the
 * mobile viewport in b2r5-glass-timing-ab.mjs --trigger switcher: open the
 * dialog, report the row's box and what sits at its centre, screenshot.
 * Written 09-26-26, Tier 3 Stage 3 B2 round 5, seat glass-timing (read-only).
 * Usage: BDL_GPU=1 node scripts/themes/harness/b2r5-glass-timing-swdebug.mjs <base>
 */
import { chromium } from 'playwright';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VIEWPORTS } from '../capture.mjs';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '.out', 'stage3-b2', 'glass-timing');
const base = process.argv[2];
const vp = VIEWPORTS.mobile;
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: 'dark' });
await suppressPrompt(ctx);
const page = await ctx.newPage();
await page.goto(base + '/t/vaporwave/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.locator('.open[aria-haspopup="dialog"]').first().tap();
await page.waitForTimeout(1500);
const row = page.locator('a[data-school="glassmorphism"]').first();
console.log('count', await page.locator('a[data-school="glassmorphism"]').count(), 'visible', await row.isVisible(), 'box', JSON.stringify(await row.boundingBox()));
const info = await page.evaluate(() => {
  const sw = document.querySelector('bdl-switcher');
  const rows = sw ? [...sw.shadowRoot.querySelectorAll('a[data-school]')].map((a) => [a.dataset.school, JSON.stringify(a.getBoundingClientRect())]) : [];
  const light = [...document.querySelectorAll('a[data-school="glassmorphism"]')].map((a) => a.outerHTML.slice(0, 120));
  return { rows, light, dialogOpen: !!sw?.shadowRoot.querySelector('dialog[open]') };
});
console.log(JSON.stringify(info, null, 1));
await page.screenshot({ path: join(OUT, 'swdebug-mobile.png') });
await b.close();
