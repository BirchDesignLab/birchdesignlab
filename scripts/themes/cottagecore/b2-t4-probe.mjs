/* B2 task 4 probe: whole-page sheets (home, services, contact, sent, about)
   at the five review sizes in both schemes, and 2x crops of the hero label,
   the postmark, the Sent envelope and the hoop at 1440 and 390, on GPU
   Chromium. Usage:
   BDL_GPU=1 node scripts/themes/snap.mjs --name b2t4 --port 4460 -- node scripts/themes/cottagecore/b2-t4-probe.mjs after
   BDL_GPU=1 node scripts/themes/snap.mjs --name stage5-base --reuse --port 4460 -- node scripts/themes/cottagecore/b2-t4-probe.mjs before */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const label = process.argv[2] || 'after';
const base = (process.env.SNAP_BASE || '').replace(/\/$/, '');
const out = join('scripts', 'themes', '.out', 'stage5', 'b2', 's5-b2-t4', label);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const SIZES = [
  { id: '1440', w: 1440, h: 900, dpr: 1 },
  { id: '1280', w: 1280, h: 800, dpr: 1 },
  { id: '1024', w: 1024, h: 800, dpr: 1 },
  { id: '820', w: 820, h: 1000, dpr: 1 },
  { id: '390', w: 390, h: 844, dpr: 2, mobile: true },
];
const PAGES = [['home', ''], ['services', 'services/'], ['contact', 'contact/'], ['sent', 'contact/sent/'], ['about', 'about/']];
const CROPS = [
  ['home', '', '.herb-label', 'label'],
  ['contact', 'contact/', '.postcard', 'postmark'],
  ['sent', 'contact/sent/', '.envelope', 'envelope'],
  ['about', 'about/', '.hoop', 'hoop'],
  ['home', '', '.clipping', 'clipping'],
  ['services', 'services/', '.posy', 'posy'],
];
const report = { label, renderer: null, measures: {} };

async function open(scheme, sz, dpr) {
  const context = await browser.newContext({ viewport: { width: sz.w, height: sz.h }, deviceScaleFactor: dpr ?? sz.dpr, isMobile: !!sz.mobile, hasTouch: !!sz.mobile, colorScheme: scheme, reducedMotion: 'no-preference' });
  await suppressPrompt(context);
  await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); localStorage.setItem('theme', s); } catch {} }, scheme);
  await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  return { context, page: await context.newPage() };
}
async function settle(page, url) {
  await page.goto(`${base}/t/cottagecore/${url}`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'bdl-switcher{display:none!important} .cc-motes{display:none!important}' });
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(400);
}

for (const scheme of ['light', 'dark']) {
  for (const sz of SIZES) {
    const { context, page } = await open(scheme, sz);
    for (const [name, path] of PAGES) {
      await settle(page, path);
      await page.screenshot({ path: join(out, `${name}__${scheme}__${sz.id}.png`), fullPage: true });
      report.measures[`${scheme}/${sz.id}/${name}`] = await page.evaluate(() => ({ docW: document.documentElement.scrollWidth, winW: innerWidth }));
    }
    if (scheme === 'light' && sz.id === '1440') report.renderer = await page.evaluate(() => { const g = document.createElement('canvas').getContext('webgl'); const e = g.getExtension('WEBGL_debug_renderer_info'); return g.getParameter(e.UNMASKED_RENDERER_WEBGL); });
    await context.close();
  }
  if (label === 'after') for (const sz of [SIZES[0], SIZES[4]]) {
    const { context, page } = await open(scheme, sz, 2);
    for (const [pname, path, sel, tag] of CROPS) {
      await settle(page, path);
      const el = page.locator(sel).first();
      if (!(await el.count())) continue;
      await el.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      await el.screenshot({ path: join(out, `crop-${tag}__${scheme}__${sz.id}.png`) });
    }
    await context.close();
  }
}
await browser.close();
await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 1));
console.log(JSON.stringify({ renderer: report.renderer }));
