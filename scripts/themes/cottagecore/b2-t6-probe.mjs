/* B2 task 6 probe: whole-page sheets for both pair-C schools, the crops the
   brief names, card line lengths, header wraps. GPU Chromium, frozen build.

   Usage (label = before | after | base; the base build is snap-stage5-base):
     BDL_GPU=1 node scripts/themes/snap.mjs --name s5-b2-t6-r0 --reuse --port 4460 -- node scripts/themes/cottagecore/b2-t6-probe.mjs before
     BDL_GPU=1 node scripts/themes/snap.mjs --name stage5-base --reuse --port 4460 -- node scripts/themes/cottagecore/b2-t6-probe.mjs base
   Stages (second argument, default all): sheets crops cards header

   Output: scripts/themes/.out/stage5/b2/s5-b2-t6/<label>/ (jpg, whole pages
   at 1440, 1280, 1024, 820 and 390; crops at 2x). Scratch, never committed. */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const label = process.argv[2] || 'after';
const stages = (process.argv[3] || 'sheets,crops,cards,header').split(',');
const base = (process.env.SNAP_BASE || 'http://127.0.0.1:4460').replace(/\/$/, '');
const out = join('scripts', 'themes', '.out', 'stage5', 'b2', 's5-b2-t6', label);
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
const SCHOOLS = ['cottagecore', 'grandmillennial'];
const report = { label, renderer: null, cards: {}, header: {}, errors: [] };

async function open(scheme, sz, dprOverride) {
  const context = await browser.newContext({ viewport: { width: sz.w, height: sz.h }, deviceScaleFactor: dprOverride ?? sz.dpr, isMobile: !!sz.mobile, hasTouch: !!sz.mobile, colorScheme: scheme, reducedMotion: 'no-preference' });
  await suppressPrompt(context);
  await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); localStorage.setItem('theme', s); } catch {} }, scheme);
  await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await context.newPage();
  await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'no-preference', reducedTransparency: 'no-preference' }).catch(() => {});
  page.on('pageerror', (e) => report.errors.push(`pageerror: ${e.message}`));
  return { context, page };
}
async function settle(page, school, url) {
  await page.goto(`${base}/t/${school}/${url}`, { waitUntil: 'networkidle' });
  // Floaters off so a sheet is the page, not the page plus a random mote.
  await page.addStyleTag({ content: 'bdl-switcher{display:none!important} .cc-motes{display:none!important}' });
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(500);
}
const jpg = { type: 'jpeg', quality: 82 };

/* ---------- whole pages ---------- */
if (stages.includes('sheets')) {
  for (const school of SCHOOLS) for (const scheme of ['light', 'dark']) for (const sz of SIZES) {
    const { context, page } = await open(scheme, sz);
    for (const [name, path] of PAGES) {
      await settle(page, school, path);
      await page.screenshot({ path: join(out, `whole-${school === 'cottagecore' ? 'cc' : 'gm'}-${name}__${scheme}__${sz.id}.jpg`), fullPage: true, ...jpg });
    }
    if (!report.renderer) report.renderer = await page.evaluate(() => { const g = document.createElement('canvas').getContext('webgl'); const e = g.getExtension('WEBGL_debug_renderer_info'); return g.getParameter(e.UNMASKED_RENDERER_WEBGL); });
    await context.close();
  }
}

/* ---------- crops at 1440 and 390, both schemes ---------- */
async function shot(page, sel, file, opts = {}) {
  const el = page.locator(sel).first();
  if (!(await el.count())) { console.log('no element', sel, file); return; }
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  await el.screenshot({ path: join(out, file), ...jpg, ...opts });
}
if (stages.includes('crops')) {
  const CC = [
    ['', '.clipping', 'clipping-focus', 'focus'],
    ['', '.clipping', 'clipping', null],
    ['services/', '.posy', 'magnolia', null],
    ['about/', '.hoop', 'hoop', null],
    ['', '.cc-chrome .bar', 'header', null],
    ['', '.hero .sheet', 'tape-lift-hero', 'lift'],
    ['', '.cards', 'tape-lift-cards', 'lift'],
    ['contact/sent/', '.envelope', 'envelope', null],
    ['contact/', '.post', 'postcard', null],
    ['contact/', '.field:has(textarea)', 'textarea', null],
    ['about/', '.herbarium .specimen', 'twig', null],
    ['', '.herb-label', 'hero-label', null],
    ['', '.hero .sheet', 'hero-sheet', null],
  ];
  const GM = [
    ['services/', '.ask', 'gm-rosette', null],
    ['about/', '.sampler', 'gm-sampler', null],
    ['about/', '.intro', 'gm-about-intro', null],
  ];
  for (const scheme of ['light', 'dark']) for (const sz of [SIZES[0], SIZES[4]]) {
    const { context, page } = await open(scheme, sz, 2);
    for (const [path, sel, tag, mode] of CC) {
      await settle(page, 'cottagecore', path);
      if (mode === 'focus') {
        await page.keyboard.press('Tab');
        await page.locator('.des').first().focus();
      }
      if (mode === 'lift') await page.evaluate(() => document.querySelectorAll('.cc-tape').forEach((t) => t.setAttribute('data-lift', '')));
      await shot(page, sel, `crop-${tag}__${scheme}__${sz.id}.jpg`);
    }
    for (const [path, sel, tag] of GM) {
      await settle(page, 'grandmillennial', path);
      await shot(page, sel, `crop-${tag}__${scheme}__${sz.id}.jpg`);
    }
    await context.close();
  }
  // The postcard at the widths the brief names, and the myrtle where it should show.
  for (const scheme of ['light', 'dark']) for (const w of [820, 861, 870, 890, 1000, 1024, 1060, 1100]) {
    const { context, page } = await open(scheme, { w, h: 900, dpr: 1 });
    await settle(page, 'cottagecore', 'contact/');
    await shot(page, '.contact', `crop-contact-${w}__${scheme}.jpg`);
    await context.close();
  }
}

/* ---------- card line lengths ---------- */
if (stages.includes('cards')) {
  for (const w of [700, 820, 859, 860, 861, 1024]) {
    const { context, page } = await open('light', { w, h: 1000, dpr: 1 });
    for (const [name, path, sel] of [['home', '', '.card p.cc-ruled'], ['services', 'services/', '.recipe .body p']]) {
      await settle(page, 'cottagecore', path);
      const m = await page.evaluate((s) => {
        const per = [];
        for (const p of document.querySelectorAll(s)) {
          const r = document.createRange();
          r.selectNodeContents(p);
          const lines = new Set([...r.getClientRects()].filter((q) => q.width > 2).map((q) => Math.round(q.top)));
          per.push({ chars: p.textContent.trim().length, lines: lines.size, cpl: Math.round(p.textContent.trim().length / Math.max(1, lines.size)), w: Math.round(p.closest('.card, .recipe').getBoundingClientRect().width) });
        }
        return per;
      }, sel);
      report.cards[`${name}/${w}`] = m;
      await shot(page, name === 'home' ? '.cards' : '.offerings', `cards-${name}__${w}.jpg`);
    }
    await context.close();
  }
}

/* ---------- header: wraps 600 to 1100, and the three widths the brief names ---------- */
if (stages.includes('header')) {
  const { context, page } = await open('light', { w: 700, h: 700, dpr: 1 });
  await settle(page, 'cottagecore', '');
  const wraps = [];
  for (let w = 600; w <= 1100; w++) {
    await page.setViewportSize({ width: w, height: 700 });
    const wrapped = await page.evaluate(() => {
      const wm = document.querySelector('.cc-chrome .wordmark').getBoundingClientRect();
      const nav = document.querySelector('.cc-chrome nav').getBoundingClientRect();
      return nav.top >= wm.bottom - 4;
    });
    wraps.push([w, wrapped]);
  }
  const bad = wraps.filter(([, x]) => x).map(([w]) => w);
  report.header.wrappedWidths = bad.length ? `${bad[0]}..${bad[bad.length - 1]} (${bad.length} widths)` : 'none';
  report.header.wrappedAbove640 = bad.filter((w) => w > 640);
  for (const w of [641, 650, 656, 700, 820]) {
    await page.setViewportSize({ width: w, height: 700 });
    await page.waitForTimeout(150);
    await shot(page, '.cc-chrome', `header__${w}.jpg`);
  }
  await context.close();
}

await browser.close();
await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 1));
console.log(JSON.stringify({ label, renderer: report.renderer, errors: report.errors.length, header: report.header }));
