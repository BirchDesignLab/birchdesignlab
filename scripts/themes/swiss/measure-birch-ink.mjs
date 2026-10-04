/**
 * Stage 4 B1 task 3 fix round 1: where the rotated Birch's ink sits against
 * the frame line (the founder section's left edge). Screenshots a clip around
 * the word, finds the leftmost ink pixel, prints ink-left minus section-left.
 *
 *   BDL_GPU=1 node scripts/themes/swiss/measure-birch-ink.mjs
 */
import { chromium } from 'playwright';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveDist } from '../lib/serve-dist.mjs';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const PORT = 4460;
const server = await serveDist(PORT, join(REPO, 'dist'));
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const out = {};
try {
  for (const scheme of ['light', 'dark']) for (const w of [1920, 1440, 1280, 1024, 820, 640]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, colorScheme: scheme, reducedMotion: 'no-preference' });
    await suppressPrompt(ctx);
    await ctx.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/t/swiss/about/`, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
    await page.evaluate(async () => { await document.fonts.ready; });
    await page.waitForTimeout(400);
    const box = await page.evaluate(() => {
      const s = document.querySelector('.founder'); s.scrollIntoView({ block: 'start' });
      const r = s.getBoundingClientRect(); const b = document.querySelector('.sw-birch').getBoundingClientRect();
      return { sl: r.left, st: r.top, sh: r.height, bl: b.left, br: b.right, fs: parseFloat(getComputedStyle(document.querySelector('.sw-birch')).fontSize) };
    });
    await page.waitForTimeout(200);
    const x0 = Math.max(0, Math.floor(box.sl - 40));
    const clip = { x: x0, y: Math.max(0, Math.floor(box.st)), width: Math.ceil(box.br - x0 + 4), height: Math.min(800, Math.floor(box.sh)) };
    const b64 = (await page.screenshot({ clip })).toString('base64');
    const minX = await page.evaluate(async (data) => {
      const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob());
      const c = new OffscreenCanvas(bmp.width, bmp.height); const g = c.getContext('2d'); g.drawImage(bmp, 0, 0);
      const px = g.getImageData(0, 0, bmp.width, bmp.height).data;
      let m = Infinity;
      for (let y = 0; y < bmp.height; y++) for (let x = 0; x < bmp.width; x++) {
        const i = (y * bmp.width + x) * 4;
        const d = Math.abs(px[i] - px[0]) + Math.abs(px[i + 1] - px[1]) + Math.abs(px[i + 2] - px[2]);
        if (d > 120 && x < m) m = x;
      }
      return m;
    }, b64);
    out[`${scheme}__${w}`] = { sectionLeft: +box.sl.toFixed(2), inkLeft: x0 + minX, delta: +(x0 + minX - box.sl).toFixed(2), fs: +box.fs.toFixed(1), em: +((x0 + minX - box.sl) / box.fs).toFixed(4) };
    await ctx.close();
  }
  console.log(JSON.stringify(out, null, 1));
} finally { await browser.close(); server.close?.(); }
