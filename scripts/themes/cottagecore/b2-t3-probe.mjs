/* B2 task 3 probe: whole-page sheets (home, services, contact) at the five
   review sizes in both schemes, a focused Contact field at 1440 and 390, the
   tablet footer, and tape-corner hover/tap strips, on GPU Chromium.
   Usage: BDL_GPU=1 node scripts/themes/snap.mjs --name b2t3 --port 4460 -- node scripts/themes/cottagecore/b2-t3-probe.mjs <label>
   (label: after | before; before runs against --name stage5-base --reuse) */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const label = process.argv[2] || 'after';
const base = (process.env.SNAP_BASE || '').replace(/\/$/, '');
const out = join('scripts', 'themes', '.out', 'stage5', 'b2', 's5-b2-t3', label);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const SIZES = [
  { id: '1440', w: 1440, h: 900, dpr: 1 },
  { id: '1280', w: 1280, h: 800, dpr: 1 },
  { id: '1024', w: 1024, h: 800, dpr: 1 },
  { id: '820', w: 820, h: 1000, dpr: 1 },
  { id: '390', w: 390, h: 844, dpr: 2, mobile: true },
];
const PAGES = [['home', ''], ['services', 'services/'], ['contact', 'contact/']];
const report = { label, renderer: null, measures: {} };

async function open(scheme, sz) {
  const context = await browser.newContext({ viewport: { width: sz.w, height: sz.h }, deviceScaleFactor: sz.dpr, isMobile: !!sz.mobile, hasTouch: !!sz.mobile, colorScheme: scheme, reducedMotion: 'no-preference' });
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

for (const scheme of ['light', 'dark']) for (const sz of SIZES) {
  const { context, page } = await open(scheme, sz);
  for (const [name, path] of PAGES) {
    await settle(page, path);
    const key = `${scheme}/${sz.id}/${name}`;
    await page.screenshot({ path: join(out, `${name}__${scheme}__${sz.id}.png`), fullPage: true });
    report.measures[key] = await page.evaluate(() => {
      const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y + scrollY), w: Math.round(b.width), h: Math.round(b.height) }; };
      return {
        docW: document.documentElement.scrollWidth, winW: innerWidth,
        stationery: r('.stationery'), post: r('.post'), posy: r('.post-posy'), postcard: r('.postcard'),
        cards: [...document.querySelectorAll('.card, .recipe')].map((e) => { const b = e.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.width)]; }),
        footerLinks: [...document.querySelectorAll('.cc-footer nav a, .cc-footer .fine a')].map((a) => Math.round(a.getBoundingClientRect().height)),
        tapes: document.querySelectorAll('.cc-tape').length,
      };
    });
    if (name === 'contact' && ['1440', '390'].includes(sz.id)) {
      await page.focus('#cf-email');
      await page.waitForTimeout(250);
      await page.screenshot({ path: join(out, `contact-focus__${scheme}__${sz.id}.png`), fullPage: true });
      await page.focus('#cf-message');
      await page.waitForTimeout(250);
      await page.screenshot({ path: join(out, `contact-focus-msg__${scheme}__${sz.id}.png`), fullPage: true });
    }
  }
  if (scheme === 'light' && sz.id === '1440') report.renderer = await page.evaluate(() => { const g = document.createElement('canvas').getContext('webgl'); const e = g.getExtension('WEBGL_debug_renderer_info'); return g.getParameter(e.UNMASKED_RENDERER_WEBGL); });
  if (sz.id === '820') {
    await settle(page, '');
    await page.locator('footer').screenshot({ path: join(out, `footer__${scheme}__820.png`) });
  }
  await context.close();
}

/* tape corner strips: hover at 1440, tap at 390, both schemes (after only) */
if (label === 'after') for (const scheme of ['light', 'dark']) {
  for (const [id, sz] of [['1440', SIZES[0]], ['390', SIZES[4]]]) {
    const { context, page } = await open(scheme, sz);
    for (const [pname, path, sel] of [['home', '', '.card .cc-tape'], ['services', 'services/', '.recipe .cc-tape'], ['contact', 'contact/', '.pc-tape'], ['home-hero', '', '.t1']]) {
      await settle(page, path);
      const tape = page.locator(sel).first();
      await tape.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      const box = await tape.boundingBox();
      const clip = { x: Math.max(0, box.x - 20), y: Math.max(0, box.y - 20), width: box.width + 40, height: box.height + 40 };
      const frames = [];
      const shot = async (tag) => { const p = join(out, `tape__${pname}__${scheme}__${id}__${tag}.png`); await page.screenshot({ path: p, clip }); frames.push(tag); };
      await shot('0-rest');
      if (id === '1440') {
        await page.mouse.move(box.x + box.width * 0.9, box.y + box.height / 2);
        await page.waitForTimeout(350); await shot('1-hover');
        await page.mouse.move(5, 5);
        await page.waitForTimeout(350); await shot('2-leave');
      } else {
        await tape.tap({ position: { x: box.width * 0.9 / 1, y: box.height / 2 } }).catch(() => {});
        await page.waitForTimeout(300); await shot('1-tap');
        report.measures[`tap/${scheme}/${pname}`] = await tape.evaluate((e) => e.hasAttribute('data-lift'));
        await page.waitForTimeout(1500); await shot('2-after');
        report.measures[`tapEnd/${scheme}/${pname}`] = await tape.evaluate((e) => e.hasAttribute('data-lift'));
      }
    }
    await context.close();
  }
}
await browser.close();
await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 1));
console.log(JSON.stringify(report.renderer), 'done');
