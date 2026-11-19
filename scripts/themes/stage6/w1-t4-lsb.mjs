/**
 * Stage 6 wave 1, task 4: the optical left bearing of Archivo 700 "D" (and
 * "B", "L") at each width-axis stop, as a fraction of the font size, measured
 * from pixels on the real Home billboard with no compensating margin. The
 * fit it prints is what Home.astro's flush-left rule uses.
 *   BASE=http://127.0.0.1:4470 node scripts/themes/stage6/w1-t4-lsb.mjs
 */
import { chromium } from 'playwright';
import sharp from 'sharp';
import { suppressPrompt } from '../lib/portal-prompt.mjs';
const BASE = process.env.BASE || 'http://127.0.0.1:4470';
const STOPS = [62, 70, 75, 80, 85, 90, 100, 110, 112.5, 125];
const browser = await chromium.launch({ args: ['--hide-scrollbars', '--font-render-hinting=none', '--disable-lcd-text'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 3, colorScheme: 'light' });
await suppressPrompt(ctx);
const page = await ctx.newPage();
await page.goto(`${BASE}/t/swiss/`, { waitUntil: 'networkidle' });
await page.addStyleTag({ content: 'bdl-switcher{display:none!important} .billboard{margin-inline-start:0!important} .billboard .ln{margin-inline-start:0!important} .lede{visibility:hidden}' });
await page.evaluate(() => document.fonts.ready);
const rows = [];
for (const [i, word] of [[0, 'Birch'], [1, 'Design'], [2, 'Lab']]) {
  for (const s of STOPS) {
    await page.evaluate(([i, s]) => { document.querySelectorAll('.billboard .ln').forEach((l) => { l.style.fontStretch = ''; }); document.querySelectorAll('.billboard .ln')[i].style.fontStretch = `${s}%`; }, [i, s]);
    const b = await page.evaluate((i) => { const r = document.querySelectorAll('.billboard .ln')[i].getBoundingClientRect(); return { x: r.left, y: r.top + scrollY, h: r.height, fs: parseFloat(getComputedStyle(document.querySelectorAll('.billboard .ln')[i]).fontSize) }; }, i);
    const buf = await page.screenshot({ clip: { x: b.x, y: b.y, width: 700, height: b.h }, fullPage: true });
    const { data, info } = await sharp(buf).greyscale().raw().toBuffer({ resolveWithObject: true });
    let l = info.width;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[y * info.width + x] < 128 && x < l) l = x;
    rows.push({ word, s, lsb: l / 3 / b.fs });
  }
}
await browser.close();
for (const w of ['Birch', 'Design', 'Lab']) console.log(w, rows.filter((r) => r.word === w).map((r) => `${r.s}:${r.lsb.toFixed(4)}`).join(' '));
const d = rows.filter((r) => r.word === 'Design');
const n = d.length, sx = d.reduce((a, r) => a + r.s, 0), sy = d.reduce((a, r) => a + r.lsb, 0);
const sxx = d.reduce((a, r) => a + r.s * r.s, 0), sxy = d.reduce((a, r) => a + r.s * r.lsb, 0);
const B = (n * sxy - sx * sy) / (n * sxx - sx * sx), A = (sy - B * sx) / n;
console.log(`Design fit: lsb = ${A.toFixed(5)} + ${B.toFixed(6)} * s; max residual ${Math.max(...d.map((r) => Math.abs(A + B * r.s - r.lsb))).toFixed(5)} em`);
