/* B2 task 6: the washi tape lift (founder call 5) at 4x, resting and lifted, light and dark, on
   the Home hero's tapes and the Services cards' tapes. GPU Chromium.
   BDL_GPU=1 node scripts/themes/snap.mjs --name <build> --reuse --port 4460 -- node scripts/themes/cottagecore/b2-t6-tape-zoom.mjs <label> */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const label = process.argv[2] || 'after';
const base = (process.env.SNAP_BASE || 'http://127.0.0.1:4460').replace(/\/$/, '');
const out = join('scripts', 'themes', '.out', 'stage5', 'b2', 's5-b2-t6', label);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const scheme of ['light', 'dark']) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 4, colorScheme: scheme, reducedMotion: 'no-preference' });
  await suppressPrompt(context);
  await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); localStorage.setItem('theme', s); } catch {} }, scheme);
  await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await context.newPage();
  for (const [path, sel, tag] of [['', '.hero .sheet .t1', 'hero-t1'], ['', '.hero .sheet .t2', 'hero-t2'], ['', '.cards .card:nth-child(2) .cc-tape', 'card2'], ['', '.cards .card:nth-child(1) .cc-tape', 'card1'], ['', '.lab-tape', 'lab'], ['services/', '.offerings .recipe:nth-child(2) .cc-tape', 'recipe2']]) {
    await page.goto(`${base}/t/cottagecore/${path}`, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: 'bdl-switcher{display:none!important} .cc-motes{display:none!important}' });
    await page.evaluate(async () => { await document.fonts.ready; });
    const el = page.locator(sel).first();
    await el.scrollIntoViewIfNeeded();
    const b = await el.boundingBox();
    const clip = { x: Math.max(0, b.x - 24), y: Math.max(0, b.y - 24), width: b.width + 48, height: b.height + 48 };
    await page.waitForTimeout(250);
    await page.screenshot({ path: join(out, `tape-${tag}__${scheme}__rest.png`), clip });
    await page.evaluate((s) => document.querySelector(s).setAttribute('data-lift', ''), sel);
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(out, `tape-${tag}__${scheme}__lift.png`), clip });
  }
  await context.close();
}
await browser.close();
