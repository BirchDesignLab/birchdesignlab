/**
 * Check a school's pages for horizontal scroll at 390 px (a 2x touch phone),
 * both schemes.
 *
 * Written 09-23-26 for Tier 3 stage 2 (cottagecore gate 7). Stills are
 * captured full page at the viewport's width, so a page that scrolls
 * sideways looks the same in them; this reads scrollWidth instead.
 *
 * Usage (serve a build first; snap.mjs sets SNAP_BASE):
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name cottagecore --reuse --port 4464 -- \
 *     node scripts/themes/harness/cc-overflow-390.mjs [--school cottagecore]
 * Exit code 1 if any page is wider than its viewport.
 */
import { chromium } from 'playwright';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const base = arg('base', process.env.SNAP_BASE || 'http://127.0.0.1:8787').replace(/\/$/, '');
const school = arg('school', 'cottagecore');
const pages = ['', 'about/', 'services/', 'contact/', 'contact/sent/'];
const browser = await chromium.launch();
let bad = 0;
for (const scheme of ['dark', 'light']) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: scheme });
  await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
  await suppressPrompt(context);
  const page = await context.newPage();
  for (const p of pages) {
    await page.goto(`${base}/t/${school}/${p}`, { waitUntil: 'networkidle' });
    const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    const ok = sw <= cw;
    if (!ok) bad++;
    console.log(`${ok ? 'ok  ' : 'WIDE'} ${scheme} /t/${school}/${p} scrollWidth ${sw} clientWidth ${cw}`);
  }
  await context.close();
}
await browser.close();
process.exit(bad ? 1 : 0);
