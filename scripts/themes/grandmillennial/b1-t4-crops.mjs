/**
 * B1 task 4: Home hero and Lab band crops, plus measurements.
 *   node scripts/themes/grandmillennial/b1-t4-crops.mjs --base http://127.0.0.1:4460 --label a [--sizes 1440,820,390] [--schemes light,dark]
 * Output: scripts/themes/.out/stage5/b1/t4/crops/<label>__<hero|lab>__<scheme>__<size>.png, and measures.json.
 * Measures: the "DESIGN LAB" line's width against the oval's chord at its row (clearance to the inner gold rule),
 * the plaque's line count and width against the frame, the header wordmark's rect and line count.
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { open } from './t2-common.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = join(REPO, 'scripts', 'themes', '.out', 'stage5', 'b1', 't4');
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i < 0 ? d : process.argv[i + 1]; };
const base = arg('base', process.env.SNAP_BASE || '').replace(/\/$/, '');
const label = arg('label', 'a');
const ALL = [
  { id: '1440', w: 1440, h: 900, dpr: 1 }, { id: '1280', w: 1280, h: 800, dpr: 1 }, { id: '1024', w: 1024, h: 768, dpr: 1 },
  { id: '900', w: 900, h: 1000, dpr: 1 }, { id: '820', w: 820, h: 1180, dpr: 1 }, { id: '768', w: 768, h: 1024, dpr: 1 },
  { id: '390', w: 390, h: 844, dpr: 2, mobile: true }, { id: '360', w: 360, h: 800, dpr: 2, mobile: true },
];
const want = arg('sizes', '1440,1280,1024,820,390').split(',');
const SIZES = ALL.filter((s) => want.includes(s.id));
await mkdir(join(OUT, 'crops'), { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const measures = [];
for (const scheme of arg('schemes', 'light,dark').split(',')) for (const sz of SIZES) {
  const { context, page } = await open(browser, scheme, sz);
  await page.goto(`${base}/t/grandmillennial/`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(400);
  const m = await page.evaluate(() => {
    const r = (e) => { const b = e.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top + scrollY), w: Math.round(b.width), h: Math.round(b.height) }; };
    const oval = document.querySelector('.oval'), rest = document.querySelector('.b-rest'), first = document.querySelector('.b-first');
    const ob = oval.getBoundingClientRect(), tb = (() => { const g = document.createRange(); g.selectNodeContents(rest); return g.getBoundingClientRect(); })();
    const fb = (() => { const g = document.createRange(); g.selectNodeContents(first); return g.getBoundingClientRect(); })();
    // inner gold rule: inset 8px ellipse; chord at the text row's far edge
    const a = ob.width / 2 - 8, b = ob.height / 2 - 8, cy = ob.top + ob.height / 2;
    const chord = (y) => { const t = (y - cy) / b; return t >= 1 ? 0 : 2 * a * Math.sqrt(1 - t * t); };
    const restChord = Math.min(chord(tb.top), chord(tb.bottom)), firstChord = Math.min(chord(fb.top), chord(fb.bottom));
    const plaque = document.querySelector('.plaque'), pr = plaque.getBoundingClientRect();
    const lh = parseFloat(getComputedStyle(plaque).lineHeight), pad = parseFloat(getComputedStyle(plaque).paddingTop) * 2 + 2;
    const wm = document.querySelector('.wordmark'), wr = wm.getBoundingClientRect();
    const portrait = document.querySelector('.portrait').getBoundingClientRect();
    return {
      oval: r(oval), restW: Math.round(tb.width - parseFloat(getComputedStyle(rest).letterSpacing)), restChord: Math.round(restChord),
      restClearancePct: Math.round((1 - (tb.width - parseFloat(getComputedStyle(rest).letterSpacing)) / restChord) * 100),
      firstClearancePct: Math.round((1 - fb.width / firstChord) * 100),
      plaque: r(plaque), plaqueLines: Math.round((pr.height - pad) / lh), portraitW: Math.round(portrait.width),
      wordmark: r(wm), wordmarkLines: Math.round(wr.height / parseFloat(getComputedStyle(document.querySelector('.wm-first')).fontSize)),
      plates: [...document.querySelectorAll('.plates .pl, .plate-row .pr')].filter((e) => e.getBoundingClientRect().width).map((e) => r(e)),
      scrollW: document.documentElement.scrollWidth,
    };
  });
  measures.push({ scheme, size: sz.id, ...m });
  const hero = await page.evaluate(() => { const e = document.querySelector('.hero').getBoundingClientRect(); return { top: 0, h: Math.round(e.bottom + scrollY) }; });
  await page.screenshot({ path: join(OUT, 'crops', `${label}__hero__${scheme}__${sz.id}.png`), clip: { x: 0, y: 0, width: sz.w, height: hero.h }, fullPage: true });
  const lab = await page.evaluate(() => { const e = document.querySelector('.lab'); if (!e) return null; const b = e.getBoundingClientRect(); return { y: Math.round(b.top + scrollY - 10), h: Math.round(b.height + 20) }; });
  if (lab) await page.screenshot({ path: join(OUT, 'crops', `${label}__lab__${scheme}__${sz.id}.png`), clip: { x: 0, y: lab.y, width: sz.w, height: lab.h }, fullPage: true });
  await context.close();
}
await writeFile(join(OUT, `measures-${label}.json`), JSON.stringify(measures, null, 1));
for (const m of measures) console.log(m.scheme, m.size, 'rest clr%', m.restClearancePct, 'first clr%', m.firstClearancePct, 'plaque', m.plaque.w + 'x' + m.plaque.h, 'lines', m.plaqueLines, 'frame', m.portraitW, 'wm', m.wordmark.w + 'x' + m.wordmark.h, 'scrollW', m.scrollW);
await browser.close();
