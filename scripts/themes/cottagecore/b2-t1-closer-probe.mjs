/* B2 task 1 fix 1: Home closer at phone widths, lead height and sprig overlap.
   Usage: BDL_GPU=1 node scripts/themes/snap.mjs --name b2t1c --port 4460 -- node scripts/themes/cottagecore/b2-t1-closer-probe.mjs */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const base = (process.env.SNAP_BASE || '').replace(/\/$/, '');
const out = join('scripts', 'themes', '.out', 'stage5', 'scratch', 'b2t1');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const scheme of ['light', 'dark']) for (const w of [360, 390, 430, 640]) {
  const context = await browser.newContext({ viewport: { width: w, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: scheme, reducedMotion: 'no-preference' });
  await suppressPrompt(context);
  await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); localStorage.setItem('theme', s); } catch {} }, scheme);
  await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await context.newPage();
  await page.goto(`${base}/t/cottagecore/`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'bdl-switcher{display:none!important} .cc-motes{display:none!important}' });
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(400);
  const m = await page.evaluate(() => {
    const lead = document.querySelector('.closer-lead');
    const r = lead.getBoundingClientRect();
    const range = document.createRange(); range.selectNodeContents(lead);
    const rects = [...range.getClientRects()].map((q) => ({ l: q.left, r: q.right, t: q.top, b: q.bottom }));
    const hit = (sel) => { const e = document.querySelector(sel); if (!e) return null; const q = e.getBoundingClientRect(); return rects.some((t) => t.l < q.right && t.r > q.left && t.t < q.bottom && t.b > q.top); };
    return { h: r.height, lines: Math.round(r.height / parseFloat(getComputedStyle(lead).lineHeight)), left: hit('.closer .c-left'), right: hit('.closer .c-right') };
  });
  console.log(scheme, w, JSON.stringify(m));
  const el = await page.$('.closer');
  await el.scrollIntoViewIfNeeded();
  await el.screenshot({ path: join(out, `closer-fix-${scheme}-${w}.png`) });
  await context.close();
}
await browser.close();
