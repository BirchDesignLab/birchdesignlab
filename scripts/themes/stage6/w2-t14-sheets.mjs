/**
 * Stage 6 wave 2, task 14: whole-page sheets of the grandmillennial pages at every review size,
 * both schemes, and the cottagecore boundary strips (the first screen of Services and Contact in
 * both schools, light, side by side, at 1440 and 390).
 *
 *   BASE=http://127.0.0.1:4470 node scripts/themes/stage6/w2-t14-sheets.mjs <outDir> [sheets|boundary|both]
 *
 * GPU Chromium, prefers-reduced-transparency forced to no-preference, the portal prompt suppressed,
 * the switcher hidden. Sheets are <outDir>/<page>-<width>-<scheme>.png; the boundary strips are
 * <outDir>/boundary-<page>-<width>.png (grandmillennial left, cottagecore right).
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const BASE = (process.env.BASE || process.env.SNAP_BASE || 'http://127.0.0.1:4470').replace(/\/$/, '');
const OUT = process.argv[2];
const MODE = process.argv[3] || 'both';
if (!OUT) throw new Error('usage: w2-t14-sheets.mjs <outDir> [sheets|boundary|both]');
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'] });
const dims = (w) => ({ width: w, height: w < 700 ? 844 : w < 1100 ? 1180 : 900, mobile: w < 900 });

async function shot(school, path, w, scheme, full) {
  const d = dims(w);
  const ctx = await browser.newContext({ viewport: { width: d.width, height: d.height }, deviceScaleFactor: d.mobile ? 2 : 1, isMobile: d.mobile, hasTouch: d.mobile, colorScheme: scheme, reducedMotion: 'no-preference' });
  await suppressPrompt(ctx);
  await ctx.addInitScript((s) => { try { localStorage.setItem('scheme', s); localStorage.setItem('theme', s); } catch {} }, scheme);
  await ctx.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  await page.goto(`${BASE}/t/${school}${path}`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
  const buf = await page.screenshot({ fullPage: full });
  await ctx.close();
  return buf;
}

if (MODE !== 'boundary') {
  for (const w of [1440, 1280, 1024, 820, 390]) for (const scheme of ['light', 'dark']) for (const [name, path] of [['home', '/'], ['about', '/about/'], ['services', '/services/'], ['contact', '/contact/']]) {
    await writeFile(join(OUT, `${name}-${w}-${scheme}.png`), await shot('grandmillennial', path, w, scheme, true));
    console.log(`${name}-${w}-${scheme}`);
  }
}
if (MODE !== 'sheets') {
  for (const w of [1440, 390]) for (const [name, path] of [['services', '/services/'], ['contact', '/contact/']]) {
    const [a, b] = await Promise.all([shot('grandmillennial', path, w, 'light', false), shot('cottagecore', path, w, 'light', false)]);
    const [ia, ib] = await Promise.all([loadImage(a), loadImage(b)]);
    const gap = 24, c = createCanvas(ia.width + ib.width + gap, Math.max(ia.height, ib.height));
    const g = c.getContext('2d'); g.fillStyle = '#888'; g.fillRect(0, 0, c.width, c.height);
    g.drawImage(ia, 0, 0); g.drawImage(ib, ia.width + gap, 0);
    await writeFile(join(OUT, `boundary-${name}-${w}.png`), c.toBuffer('image/png'));
    console.log(`boundary-${name}-${w}`);
  }
}
await browser.close();
