/**
 * Stage 6 wave 2, task 10 (T4 C3): the right side bearing of "Design" (range
 * right edge minus the last ink pixel) at each width stop, as a fraction of the
 * font size, so the dial's bar can sit a gutter past the ink at every width.
 *   BASE=http://127.0.0.1:4470 node scripts/themes/stage6/w2-t10-rsb.mjs
 */
import { chromium } from 'playwright';
import sharp from 'sharp';
import { suppressPrompt } from '../lib/portal-prompt.mjs';
const BASE = process.env.BASE || 'http://127.0.0.1:4470';
const browser = await chromium.launch({ args: ['--hide-scrollbars', '--font-render-hinting=none', '--disable-lcd-text'] });
for (const w of [1440, 390]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 3 });
  await suppressPrompt(ctx);
  await ctx.addInitScript(() => { try { sessionStorage.setItem('bdl-swiss-dial-hint', '1'); } catch {} });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/t/swiss/`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'bdl-switcher{display:none!important} .lede,.lead,.subline,.dial{visibility:hidden}' });
  await page.evaluate(() => document.fonts.ready);
  const rows = [];
  for (const s of [62, 75, 85, 87.5, 100, 112.5, 125]) {
    const g = await page.evaluate((s) => {
      const word = document.querySelectorAll('.billboard .ln')[1];
      word.style.setProperty('--sw-d', String(s));
      const r = document.createRange(); r.selectNodeContents(word);
      const rr = r.getBoundingClientRect();
      return { right: rr.right, top: word.getBoundingClientRect().top + scrollY, h: word.getBoundingClientRect().height, fs: parseFloat(getComputedStyle(word).fontSize) };
    }, s);
    const x = Math.max(0, Math.floor(g.right) - 300);
    const buf = await page.screenshot({ clip: { x, y: g.top, width: Math.min(w - x, 400), height: g.h }, fullPage: true });
    const { data, info } = await sharp(buf).greyscale().raw().toBuffer({ resolveWithObject: true });
    let ink = -1;
    for (let y = 0; y < info.height; y++) for (let xx = 0; xx < info.width; xx++) if (data[y * info.width + xx] < 128 && xx > ink) ink = xx;
    rows.push({ s, rsbEm: +(((g.right - (x + (ink + 1) / 3)) / g.fs)).toFixed(5), fs: g.fs });
  }
  console.log(w, rows.map((r) => `${r.s}:${r.rsbEm}`).join(' '));
  await ctx.close();
}
await browser.close();
