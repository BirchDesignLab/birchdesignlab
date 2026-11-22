/**
 * Stage 6 wave 5, task 31 (stop 5, D1): measure the swiss Sent full stop's ink,
 * not its advance box, at 390 and 1440. The dot is the only red-field ink in
 * the h1 (the stop span), so its bounding box is the red pixels inside the
 * span's hit area; the "t" before it is the dark ink to its left on the dot's
 * rows. Prints the ink rect in px and in ems of the span's font size, the
 * offsets from the span's own box (what .stop[data-live]::before needs), and
 * the gap from the "t"'s right-most ink to the dot's ink.
 *
 *   node scripts/themes/snap.mjs --name s6-w5-t31 --port 4470 -- node scripts/themes/stage6/w5-t31-measure-stop.mjs
 * Output: scripts/themes/.out/stage6/w5/t31/stop-measure.json (gitignored scratch).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, open, pixelReader } from './w4-t29-lib.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '.out', 'stage6', 'w5', 't31');
await mkdir(OUT, { recursive: true });
const { browser } = await launch();
const R = {};
for (const width of [390, 1440]) {
  const { ctx, page } = await open(browser, { path: '/t/swiss/contact/sent/', width, scheme: 'light' });
  const info = await page.evaluate(() => {
    const s = document.querySelector('.sent .stop');
    const r = s.getBoundingClientRect();
    const cs = getComputedStyle(s);
    return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height, fs: parseFloat(cs.fontSize), red: cs.color, live: 'live' in s.dataset };
  });
  await page.evaluate((y) => scrollTo(0, Math.max(0, y - 300)), info.y);
  await page.waitForTimeout(300);
  const vy = await page.evaluate(() => document.querySelector('.sent .stop').getBoundingClientRect().top);
  const dpr = width < 900 ? 2 : 1;
  const png = await page.screenshot({ type: 'png' });
  const px = await pixelReader(png);
  const m = info.red.match(/\d+/g).map(Number);
  const isRed = (c) => c.every((v, i) => Math.abs(v - m[i]) <= 24);
  // scan the span's box widened by half its height each side
  const x0 = Math.floor((info.x - info.h * 0.5) * dpr), x1 = Math.ceil((info.x + info.w + info.h * 0.5) * dpr);
  const y0 = Math.floor((vy - info.h * 0.3) * dpr), y1 = Math.ceil((vy + info.h * 1.3) * dpr);
  let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (isRed(px.at(x, y))) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  const ink = { left: minX / dpr, right: (maxX + 1) / dpr, top: minY / dpr, bottom: (maxY + 1) / dpr };
  // the "t": the right-most dark pixel left of the dot's ink, on the dot's rows and above
  let tRight = -1;
  for (let x = Math.floor(ink.left * dpr) - 1; x >= x0 && tRight < 0; x--) {
    for (let y = Math.floor((vy - info.h) * dpr); y < Math.ceil(ink.bottom * dpr); y++) { const c = px.at(x, y); if (c[0] < 80 && c[1] < 80 && c[2] < 80) { tRight = (x + 1) / dpr; break; } }
  }
  const spanLeft = info.x, spanTop = vy;
  R[width] = {
    dpr, span: { left: info.x, top: vy, width: info.w, height: info.h, fontSize: info.fs, live: info.live },
    ink, inkW: ink.right - ink.left, inkH: ink.bottom - ink.top,
    inkOffsetsFromSpanBox_em: {
      left: (ink.left - spanLeft) / info.fs, top: (ink.top - spanTop) / info.fs,
      width: (ink.right - ink.left) / info.fs, height: (ink.bottom - ink.top) / info.fs,
    },
    tRight, gapTtoInk: ink.left - tRight, gapTtoOutline: ink.left - 8 - tRight,
  };
  console.log(width, JSON.stringify(R[width]));
  await ctx.close();
}
await writeFile(join(OUT, 'stop-measure.json'), JSON.stringify(R, null, 1));
await browser.close();
