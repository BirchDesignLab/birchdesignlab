/**
 * Sample the root snapshots' opacity and transform on every frame of a
 * cottagecore page change, next to the wordmark's, so a strip that seems to
 * show two pages at once can be read against the clock that drew it.
 *
 * Written 09-23-26 for Tier 3 stage 2 (cottagecore item 2). A dense strip
 * showed the old sheet still faintly legible as the new one came in, later
 * than the keyframes predict; the strip's times are screencast times, so this
 * reads the animations themselves (computed style of the pseudo-elements on
 * each requestAnimationFrame) to say which part was slow.
 *
 * Usage (serve a build first; snap.mjs sets SNAP_BASE):
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name cottagecore --reuse --port 4464 -- \
 *     node scripts/themes/harness/cc-root-sampler.mjs [--from quiet] [--scheme light] [--viewport desktop]
 * Without --from it clicks Home's About link (the in-school swap); with it,
 * it starts on /t/<from>/ and follows a link to /t/cottagecore/.
 * Prints one line per frame: ms since the click, old and new root opacity,
 * new root transform.
 */
import { chromium } from 'playwright';
import { VIEWPORTS } from '../capture.mjs';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const base = arg('base', process.env.SNAP_BASE || 'http://127.0.0.1:8787').replace(/\/$/, '');
const from = arg('from', '');
const scheme = arg('scheme', 'light');
const vp = VIEWPORTS[arg('viewport', 'desktop')];
const useGpu = process.env.BDL_GPU === '1';

const browser = await chromium.launch({
  args: ['--hide-scrollbars', ...(useGpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : [])],
});
const context = await browser.newContext({
  viewport: { width: vp.width, height: vp.height },
  deviceScaleFactor: vp.mobile ? 2 : 1,
  isMobile: !!vp.mobile,
  hasTouch: !!vp.mobile,
  colorScheme: scheme,
});
await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
await suppressPrompt(context);
const page = await context.newPage();
await page.goto(`${base}/t/${from || 'cottagecore'}/`, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);

await page.evaluate(() => {
  const rows = [];
  window.__rows = rows;
  let t0 = 0;
  const cs = (p) => getComputedStyle(document.documentElement, p);
  const loop = () => {
    if (t0) {
      rows.push({
        ms: Math.round(performance.now() - t0),
        old: cs('::view-transition-old(root)').opacity,
        new: cs('::view-transition-new(root)').opacity,
        tf: cs('::view-transition-new(root)').transform,
        wmOld: cs('::view-transition-old(wordmark)').opacity,
        wmNew: cs('::view-transition-new(wordmark)').opacity,
      });
    }
    if (rows.length < 90) requestAnimationFrame(loop);
  };
  addEventListener('click', () => { t0 = performance.now(); }, { capture: true });
  requestAnimationFrame(loop);
});
const link = from
  ? page.locator('a[href="/t/cottagecore/"]').first()
  : page.locator('header nav a[href$="/about/"]').first();
await link.click();
await page.waitForTimeout(1500);
const rows = await page.evaluate(() => window.__rows);
for (const r of rows) console.log(`+${r.ms}\told ${r.old}\tnew ${r.new}\t${r.tf}\twm ${r.wmOld}/${r.wmNew}`);
await browser.close();
