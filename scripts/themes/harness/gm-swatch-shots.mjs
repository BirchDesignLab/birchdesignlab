/**
 * Shoot grandmillennial's Services sample-book swatches (No. 1 chintz, No. 2
 * porcelain) as element screenshots, dark and light, desktop and mobile, and
 * lay them out on one labelled sheet.
 *
 * Written 09-23-26 for Tier 3 stage 2, wave B (grandmillennial item 3: the
 * No. 1 swatch tiled the half-scale chintz in a visible grid). Full-page
 * stills show the swatch at a few hundred pixels inside a 1440 x 4000 image;
 * this shoots just the swatches at device pixels so a before and an after
 * can be read side by side. Reduced motion is emulated, like capture.mjs.
 *
 * Usage (serve a build first; snap.mjs sets SNAP_BASE):
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name head --reuse --port 4565 -- \
 *     node scripts/themes/harness/gm-swatch-shots.mjs --label stage2-grandmillennial-swatch-before
 *   --svg '<markup>'  prototype a swatch without a build: replaces the No. 1
 *                     swatch's <svg> inner markup on the served page before
 *                     the shots (the pattern defs stay the page's own).
 * Output: scripts/themes/.out/<label>/swatches.png (and one PNG per shot).
 * The portal's switcher is hidden so it never covers a phone swatch.
 * At mobile (390 px) it also loads every page of the school and prints
 * documentElement.scrollWidth, which must equal 390 (no horizontal scroll).
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const base = (arg('base', process.env.SNAP_BASE || 'http://127.0.0.1:8787')).replace(/\/$/, '');
const label = arg('label', 'gm-swatches');
const protoSvg = arg('svg', null);
const outDir = join(HERE, '..', '.out', label);
await mkdir(outDir, { recursive: true });

const VIEWPORTS = {
  desktop: { width: 1440, height: 900, scale: 1, mobile: false },
  mobile: { width: 390, height: 844, scale: 2, mobile: true },
};
const useGpu = process.env.BDL_GPU === '1';
const browser = await chromium.launch({
  args: ['--hide-scrollbars', '--font-render-hinting=none', '--disable-lcd-text',
    ...(useGpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : [])],
});
const shots = [];
for (const scheme of ['light', 'dark']) {
  for (const [vp, v] of Object.entries(VIEWPORTS)) {
    const context = await browser.newContext({
      viewport: { width: v.width, height: v.height }, deviceScaleFactor: v.scale,
      isMobile: v.mobile, hasTouch: v.mobile, colorScheme: scheme, reducedMotion: 'reduce',
    });
    await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); localStorage.setItem('theme', s); } catch {} }, scheme);
    await suppressPrompt(context);
    await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
    const page = await context.newPage();
    await page.goto(`${base}/t/grandmillennial/services/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({ content: 'bdl-switcher { display: none !important; }' });
    if (protoSvg) {
      await page.evaluate((m) => { document.querySelector('.swatch.floral svg').innerHTML = m; }, protoSvg);
    }
    const hangs = page.locator('.swatch-hang');
    const n = await hangs.count();
    for (let i = 0; i < n; i++) {
      await hangs.nth(i).scrollIntoViewIfNeeded();
      await page.waitForTimeout(250);
      const file = `swatch${i + 1}__${scheme}__${vp}.png`;
      await hangs.nth(i).screenshot({ path: join(outDir, file) });
      shots.push({ file, label: `No. ${i + 1} ${scheme} ${vp}` });
    }
    if (v.mobile) {
      for (const path of ['', 'about/', 'services/', 'contact/', 'contact/sent/']) {
        await page.goto(`${base}/t/grandmillennial/${path}`, { waitUntil: 'networkidle' });
        const sw = await page.evaluate(() => document.documentElement.scrollWidth);
        console.log(`scrollWidth ${scheme} /t/grandmillennial/${path}: ${sw}${sw > v.width ? '  HORIZONTAL SCROLL' : ''}`);
      }
    }
    await context.close();
  }
}
await browser.close();

// One sheet: a row per scheme and viewport, the two swatches side by side,
// every shot drawn at CSS size (mobile halved) so desktop and phone compare.
const imgs = await Promise.all(shots.map(async (s) => ({ ...s, img: await loadImage(join(outDir, s.file)) })));
const cell = (s) => (s.file.includes('mobile') ? 0.5 : 1);
const rows = [];
for (let i = 0; i < imgs.length; i += 2) rows.push(imgs.slice(i, i + 2));
const pad = 16, cap = 22;
const W = Math.max(...rows.map((r) => r.reduce((w, s) => w + s.img.width * cell(s) + pad, pad)));
const H = rows.reduce((h, r) => h + Math.max(...r.map((s) => s.img.height * cell(s))) + cap + pad, pad);
const cv = createCanvas(Math.ceil(W), Math.ceil(H));
const ctx = cv.getContext('2d');
ctx.fillStyle = '#1c1c1f'; ctx.fillRect(0, 0, cv.width, cv.height);
ctx.font = '14px sans-serif'; ctx.fillStyle = '#e8e8e8';
let y = pad;
for (const r of rows) {
  let x = pad;
  for (const s of r) {
    const k = cell(s);
    ctx.fillText(s.label, x, y + 15);
    ctx.drawImage(s.img, x, y + cap, s.img.width * k, s.img.height * k);
    x += s.img.width * k + pad;
  }
  y += Math.max(...r.map((s) => s.img.height * cell(s))) + cap + pad;
}
writeFileSync(join(outDir, 'swatches.png'), cv.toBuffer('image/png'));
console.log(`${shots.length} swatches -> ${join(outDir, 'swatches.png')}`);
