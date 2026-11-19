// Stage 6 grandmillennial critic: settle the triage's "unsure until rendered"
// list and the founder's three looks by rendering the frozen build.
// Run: node scripts/themes/snap.mjs --name stage6-base --reuse --port 4467 -- node scripts/themes/stage6/critic-grandmillennial-probe.mjs
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'stage6-critic-grandmillennial', 'probe');
mkdirSync(OUT, { recursive: true });
const BASE = (process.env.SNAP_BASE || 'http://127.0.0.1:4467').replace(/\/$/, '');
const log = {};

const browser = await chromium.launch({
  args: ['--hide-scrollbars', '--font-render-hinting=none', '--disable-lcd-text',
    '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
});

async function open(route, width, scheme, { mobile = false, height = 900 } = {}) {
  const context = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile,
    colorScheme: scheme, reducedMotion: 'reduce',
  });
  await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); localStorage.setItem('theme', s); } catch {} }, scheme);
  await suppressPrompt(context);
  await context.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const st = document.createElement('style'); st.textContent = 'bdl-switcher{display:none!important}'; document.head.append(st);
    });
  });
  await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await context.newPage();
  await page.goto(BASE + route, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  return { page, context };
}
const rect = (page, sel) => page.evaluate((s) => [...document.querySelectorAll(s)].map((e) => {
  const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) };
}), sel);
async function shotEl(page, sel, file, pad = 24) {
  const r = (await rect(page, sel))[0]; if (!r) return null;
  const vw = await page.evaluate(() => document.documentElement.clientWidth);
  const x = Math.max(0, r.x - pad), w = Math.min(vw - x, r.w + 2 * pad);
  await page.screenshot({ path: join(OUT, file), fullPage: true, clip: { x, y: Math.max(0, r.y - pad), width: w, height: r.h + 2 * pad } });
  return r;
}

// A. Specimen cards on Home.
log.specimens = {};
for (const w of [561, 650, 699, 861, 900, 999]) {
  const { page, context } = await open('/t/grandmillennial/', w, 'light');
  const lis = await rect(page, '.specimens li');
  const rows = new Set(lis.map((l) => l.y)).size;
  log.specimens[w] = { lis, rows, perRow: lis.filter((l) => l.y === lis[0].y).length };
  await shotEl(page, '.lab .band', `specimens-${w}.png`, 0);
  await context.close();
}

// B. Contact column widths at 390 (phone device).
log.contact390 = {};
for (const scheme of ['light', 'dark']) {
  const { page, context } = await open('/t/grandmillennial/contact/', 390, scheme, { mobile: true, height: 844 });
  log.contact390[scheme] = {
    stationery: (await rect(page, '.stationery'))[0],
    strip: (await rect(page, '.stationery .strip'))[0],
    envelope: (await rect(page, '.envelope'))[0],
    trust: (await rect(page, '.trust'))[0],
    write: (await rect(page, '.write'))[0],
  };
  await shotEl(page, '.desk', `contact390-${scheme}.png`, 0);
  await context.close();
}

// C. Chintz frame run ends at 820 (tablet device), 1024, 1440.
log.chintz = {};
for (const [w, mobile] of [[820, true], [1024, false], [1440, false]]) {
  for (const [route, sel, tag] of [['/t/grandmillennial/contact/', '.stationery .strip', 'contact'], ['/t/grandmillennial/about/', '.letter .strip', 'about']]) {
    const { page, context } = await open(route, w, 'light', { mobile, height: mobile ? 1180 : 900 });
    const s = (await rect(page, sel))[0];
    const runs = await page.evaluate((q) => [...document.querySelectorAll(q + ' .run')].map((e) => Math.round(e.getBoundingClientRect()[e.classList.contains('top') || e.classList.contains('bottom') ? 'width' : 'height'])), sel);
    log.chintz[`${tag}-${w}`] = { strip: s, runs };
    // corners: top-left and top-right, bottom-right
    const cs = 90;
    for (const [cx, cy, n] of [[s.x, s.y, 'tl'], [s.x + s.w - cs, s.y, 'tr'], [s.x + s.w - cs, s.y + s.h - cs, 'br']]) {
      await page.screenshot({ path: join(OUT, `chintz-${tag}-${w}-${n}.png`), fullPage: true, clip: { x: Math.max(0, cx), y: cy, width: cs, height: cs } });
    }
    await context.close();
  }
}

// D. About scenes at 820 and 390, both schemes.
for (const [w, mobile, h] of [[820, true, 1180], [390, true, 844]]) {
  for (const scheme of ['light', 'dark']) {
    const { page, context } = await open('/t/grandmillennial/about/', w, scheme, { mobile, height: h });
    await shotEl(page, '.scene-part.a', `about-${w}-${scheme}-a.png`, 0);
    await shotEl(page, '.scene-part.b', `about-${w}-${scheme}-b.png`, 0);
    await context.close();
  }
}

// E. Rosette at 390 and 1440, both schemes (crop tight).
log.rosette = {};
for (const [w, mobile, h] of [[390, true, 844], [1440, false, 900]]) {
  for (const scheme of ['light', 'dark']) {
    const { page, context } = await open('/t/grandmillennial/services/', w, scheme, { mobile, height: h });
    log.rosette[`${w}-${scheme}`] = await shotEl(page, '.ask-bow', `rosette-${w}-${scheme}.png`, 40);
    await context.close();
  }
}

// F. Dark awning top edge at 1440 and 390 (piping).
for (const [w, mobile, h] of [[1440, false, 900], [390, true, 844]]) {
  const { page, context } = await open('/t/grandmillennial/', w, 'dark', { mobile, height: h });
  await page.screenshot({ path: join(OUT, `awning-dark-${w}.png`), clip: { x: 0, y: 0, width: Math.min(w, 600), height: 90 } });
  await context.close();
}

writeFileSync(join(OUT, 'probe.json'), JSON.stringify(log, null, 1));
console.log(JSON.stringify(log, null, 1));
await browser.close();
