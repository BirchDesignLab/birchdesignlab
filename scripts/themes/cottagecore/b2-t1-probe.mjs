/* B2 task 1 probe: whole-page shots, header baseline and role measurements
   for cottagecore, GPU Chromium.
   Usage: BDL_GPU=1 node scripts/themes/snap.mjs --name b2t1 --port 4460 -- node scripts/themes/cottagecore/b2-t1-probe.mjs */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const base = (process.env.SNAP_BASE || '').replace(/\/$/, '');
const out = join('scripts', 'themes', '.out', 'stage5', 'scratch', 'b2t1');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const SIZES = [{ id: '1440', w: 1440, h: 900, dpr: 1 }, { id: '1024', w: 1024, h: 800, dpr: 1 }, { id: '390', w: 390, h: 844, dpr: 2, mobile: true }];
const PAGES = [['home', ''], ['services', 'services/'], ['contact', 'contact/'], ['about', 'about/']];
const report = {};
for (const scheme of ['light', 'dark']) for (const sz of SIZES) {
  const context = await browser.newContext({ viewport: { width: sz.w, height: sz.h }, deviceScaleFactor: sz.dpr, isMobile: !!sz.mobile, hasTouch: !!sz.mobile, colorScheme: scheme, reducedMotion: 'no-preference' });
  await suppressPrompt(context);
  await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); localStorage.setItem('theme', s); } catch {} }, scheme);
  await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await context.newPage();
  for (const [name, path] of PAGES) {
    await page.goto(`${base}/t/cottagecore/${path}`, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: 'bdl-switcher{display:none!important} .cc-motes{display:none!important}' });
    await page.evaluate(async () => { await document.fonts.ready; });
    await page.waitForTimeout(400);
    const m = await page.evaluate(() => {
      const base = (el) => { const s = document.createElement('span'); s.style.cssText = 'display:inline-block;width:0;height:0'; el.appendChild(s); const y = s.getBoundingClientRect().bottom; s.remove(); return Math.round(y * 10) / 10; };
      const cs = (sel) => { const e = document.querySelector(sel); if (!e) return null; const c = getComputedStyle(e); return { w: c.fontWeight, size: c.fontSize, color: c.color, rotate: c.rotate, fvs: c.fontVariationSettings }; };
      const sels = ['.cc-hand.kicker', '.lead', '.lab .cc-hand', '.cc-note-link', '.field label', '.card .no', '.recipe .no', '.num', '.subline', '.etym-more', '.letter h2', '.card h3', '.recipe h2', '.method-sheet > h2', '.pull', '.closer-lead', '.wm-name', 'h1'];
      const roles = {}; for (const s of sels) roles[s] = cs(s);
      const wm = document.querySelector('.wm-name'), nav = document.querySelector('nav[aria-label=Main] a');
      const hr = document.querySelector('.hero-copy'), sp = document.querySelector('.hero .specimen');
      return { roles, wmBase: base(wm), navBase: base(nav), heroCopy: hr && hr.getBoundingClientRect().bottom, sheet: sp && sp.getBoundingClientRect().bottom, scrollW: document.documentElement.scrollWidth };
    });
    report[`${scheme}/${sz.id}/${name}`] = m;
    await page.screenshot({ path: join(out, `${name}__${scheme}__${sz.id}.png`), fullPage: true });
    if (name === 'home') await page.screenshot({ path: join(out, `header__${scheme}__${sz.id}.png`), clip: { x: 0, y: 0, width: sz.w, height: 170 } });
  }
  if (scheme === 'light' && sz.id === '1440') report.renderer = await page.evaluate(() => { const g = document.createElement('canvas').getContext('webgl'); const e = g.getExtension('WEBGL_debug_renderer_info'); return g.getParameter(e.UNMASKED_RENDERER_WEBGL); });
  await context.close();
}
await writeFile(join(out, 'measures.json'), JSON.stringify(report, null, 1));
await browser.close();
console.log(report.renderer);
