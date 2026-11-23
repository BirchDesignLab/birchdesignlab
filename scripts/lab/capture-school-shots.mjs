/**
 * BDL-011 (Field Guide to the Schools): one picture per school, the top of
 * that school's home page, for the section that describes it.
 *
 * Shoots a running preview of the built site (launch config "preview", port
 * 4400), light scheme, GPU rasteriser so the WebGL pieces draw. Re-run when a
 * school's home changes.
 *
 *   node scripts/lab/capture-school-shots.mjs [school ...]
 */
import { chromium } from 'playwright';
import { suppressPrompt } from '../themes/lib/portal-prompt.mjs';

const BASE = process.env.BASE || 'http://localhost:4400';
const OUT = 'src/content/lab/bdl-011';
const all = ['bauhaus', 'swiss', 'vaporwave', 'cottagecore', 'grandmillennial', 'glassmorphism'];
const schools = process.argv.slice(2).length ? process.argv.slice(2) : all;

const browser = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 810 }, deviceScaleFactor: 1, colorScheme: 'light' });
await suppressPrompt(ctx);
await ctx.addInitScript(() => { try { localStorage.setItem('scheme', 'light'); } catch {} });
for (const s of schools) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/t/${s}/`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/${s}.png` });
  console.log('wrote', `${OUT}/${s}.png`);
  await page.close();
}
await browser.close();
