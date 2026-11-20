/**
 * Stage 6 wave 2, task 10 (T6 C5, C6): Services' timetable. Per width, light:
 * each numeral's ink top minus the title's cap line (the ink top of the first
 * step's title, a flat D; the others' titles are B, L and a round C), each
 * numeral's left ink minus the frame, and each row's height in 24px lines and
 * where its rule falls on the baseline grid (rule y modulo 24 from the first
 * row's top).
 *   BASE=http://127.0.0.1:4470 node scripts/themes/stage6/w2-t10-numerals.mjs
 *   SNAP=<name> node ...
 */
import { chromium } from 'playwright';
import sharp from 'sharp';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveDist } from '../lib/serve-dist.mjs';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const OUTROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '.out');
let server = null;
let BASE = process.env.BASE;
if (!BASE) { server = await serveDist(4470, join(OUTROOT, `snap-${process.env.SNAP}`)); BASE = 'http://127.0.0.1:4470'; }
const browser = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--font-render-hinting=none', '--disable-lcd-text'] });
const heights = { 1440: 900, 1280: 800, 1024: 768, 820: 1180, 390: 844 };
const SC = 3;
const inkBox = async (page, rect) => {
  const buf = await page.screenshot({ clip: { x: rect.x, y: rect.y, width: rect.w, height: rect.h }, fullPage: true });
  const { data, info } = await sharp(buf).greyscale().raw().toBuffer({ resolveWithObject: true });
  let top = info.height, left = info.width;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[y * info.width + x] < 128) { if (y < top) top = y; if (x < left) left = x; }
  return { top: rect.y + top / SC, left: rect.x + left / SC };
};
try {
  for (const w of [1440, 1280, 1024, 820, 390]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: heights[w] }, deviceScaleFactor: SC, colorScheme: 'light' });
    await suppressPrompt(ctx);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/t/swiss/services/`, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    const g = await page.evaluate(() => {
      const steps = [...document.querySelectorAll('.step')];
      const frame = document.querySelector('.process').getBoundingClientRect();
      return { frameLeft: frame.left, y0: scrollY, steps: steps.map((s) => {
        const n = s.querySelector('.num').getBoundingClientRect(), t = s.querySelector('.step-title').getBoundingClientRect(), r = s.getBoundingClientRect();
        return { num: { x: n.left - 20, y: n.top + scrollY - 6, w: n.width + 20, h: n.height + 12 }, title: { x: t.left, y: t.top + scrollY, w: Math.min(t.width, 120), h: 24 }, top: r.top + scrollY, h: r.height };
      }) };
    });
    const ref = await inkBox(page, g.steps[0].title);
    const row = [];
    for (const [i, s] of g.steps.entries()) {
      const num = await inkBox(page, s.num);
      row.push(`${i + 1}: top ${(num.top - (await inkBox(page, s.title)).top).toFixed(1)} (vs D ${(num.top - ref.top - (s.title.y - g.steps[0].title.y)).toFixed(1)}) left ${(num.left - g.frameLeft).toFixed(1)} rowH ${(s.h / 24).toFixed(2)}u`);
    }
    console.log(w, row.join(' | '));
    await ctx.close();
  }
} finally {
  await browser.close();
  if (server) await new Promise((r) => server.close(r));
}
