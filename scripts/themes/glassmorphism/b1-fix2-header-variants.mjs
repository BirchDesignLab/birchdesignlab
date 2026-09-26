/**
 * Wave B1 glass fix round 2 (09-25-26): the header-ghost defect. With the
 * bevel url() first in the sticky header bar's backdrop-filter, content
 * scrolled under the bar reads through it. Only the header shows this (every
 * other pane's interior frost is unchanged by the url(): b1-fix2-bevel-frost.mjs).
 * This crops the bar over Home's "How we build" link in variants, to find a
 * construction that keeps both the frost and the bend:
 *   asis      as built;
 *   nourl     url() stripped;
 *   urllast   the url() moved after the blur list;
 *   noshadow  as built, but the bar's scroll-driven drop-shadow filter off
 *             (animation: none; filter: none);
 *   nosticky  as built, but the header position: relative (the page scrolled
 *             so the bar sits in the same place over the same content).
 * Writes a stacked PNG and each crop's high-frequency energy inside the bar
 * (less is frostier) to scripts/themes/.out/b1-glass-fix2/header-variants/.
 * prefers-reduced-transparency is forced to no-preference over CDP.
 *
 * Usage: BDL_GPU=1 node scripts/themes/glassmorphism/b1-fix2-header-variants.mjs [--base URL] [--scheme light] [--vw 1440 --vh 900] [--variants a,b]
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? d : process.argv[i + 1]; };
const BASE = arg('base', process.env.SNAP_BASE || 'http://127.0.0.1:4471');
const scheme = arg('scheme', 'light');
const vw = Number(arg('vw', '1440'));
const vh = Number(arg('vh', '900'));
const variants = arg('variants', 'asis,nourl,urllast,noshadow,nosticky').split(',');
const OUT = join(HERE, '..', '.out', 'b1-glass-fix2', `header-variants-${scheme}-${vw}`);
await mkdir(OUT, { recursive: true });
const gpu = process.env.BDL_GPU === '1';
const browser = await chromium.launch({ args: ['--hide-scrollbars', ...(gpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : [])] });
const an = await browser.newPage();
const shots = [];
for (const v of variants) {
  const c = await browser.newContext({ viewport: { width: vw, height: vh }, colorScheme: scheme, deviceScaleFactor: 1 });
  await c.addInitScript((s) => { try { localStorage.setItem('scheme', s); localStorage.setItem('bdl-switcher-prompt', 'dismissed'); } catch {} }, scheme);
  await c.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await c.newPage();
  const cdp = await c.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  await page.goto(BASE + '/t/glassmorphism/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.evaluate((v) => {
    const bar = document.querySelector('.site-header > .bar');
    const bf = bar.style.backdropFilter || '';
    if (v === 'nourl') bar.style.backdropFilter = bf.replace(/url\([^)]*\)\s*/g, '');
    if (v === 'urllast') { const u = bf.match(/url\([^)]*\)/)?.[0]; if (u) bar.style.backdropFilter = `${bf.replace(/url\([^)]*\)\s*/g, '')} ${u}`; }
    if (v === 'noshadow') { bar.style.animation = 'none'; bar.style.filter = 'none'; }
    if (v === 'nosticky') document.querySelector('.site-header').style.position = 'relative';
  }, v);
  await page.evaluate((v) => {
    const b = [...document.querySelectorAll('main a')].find((a) => /How we build/.test(a.textContent));
    const hdr = document.querySelector('.site-header > .bar').getBoundingClientRect();
    if (v === 'nosticky') {
      // Bring the link up to the bar's height without moving the bar: move the link instead.
      b.style.position = 'relative';
      b.style.top = `${hdr.top + 16 - b.getBoundingClientRect().top}px`;
      b.style.zIndex = '0';
    } else scrollBy(0, b.getBoundingClientRect().top - 30);
  }, v);
  await page.waitForTimeout(700);
  const info = await page.evaluate(() => { const bar = document.querySelector('.site-header > .bar'); const r = bar.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, bf: bar.style.backdropFilter, filter: getComputedStyle(bar).filter }; });
  const clip = { x: Math.max(0, info.x - 10), y: 0, width: Math.min(vw, info.w + 20), height: Math.round(info.y + info.h + 12) };
  const buf = await page.screenshot({ clip });
  await writeFile(join(OUT, `${v}.png`), buf);
  // High-frequency energy inside the bar's right half (the link sits there), text of the nav hidden.
  await page.evaluate(() => document.querySelectorAll('.site-header .bar > *').forEach((k) => { k.style.visibility = 'hidden'; }));
  await page.waitForTimeout(150);
  const inner = { x: info.x + info.w * 0.55, y: info.y + 10, width: info.w * 0.4, height: info.h - 20 };
  const b64 = (await page.screenshot({ clip: inner })).toString('base64');
  const sharp = await an.evaluate(async (x) => {
    const i = new Image(); i.src = 'data:image/png;base64,' + x; await i.decode();
    const cv = document.createElement('canvas'); cv.width = i.width; cv.height = i.height; const g = cv.getContext('2d'); g.drawImage(i, 0, 0);
    const D = g.getImageData(0, 0, i.width, i.height); const L = (k) => 0.3 * D.data[k] + 0.59 * D.data[k + 1] + 0.11 * D.data[k + 2];
    let h = 0, n = 0; for (let y = 1; y < D.height - 1; y++) for (let x2 = 1; x2 < D.width - 1; x2++) { const k = (y * D.width + x2) * 4; h += Math.abs(4 * L(k) - L(k - 4) - L(k + 4) - L(k - 4 * D.width) - L(k + 4 * D.width)); n++; }
    return +(h / n).toFixed(3);
  }, b64);
  console.log(JSON.stringify({ v, sharp, ...info }));
  shots.push({ v, b64: buf.toString('base64'), sharp });
  await c.close();
}
// Stack the crops with labels.
const stack = await an.evaluate(async (shots) => {
  const imgs = await Promise.all(shots.map(async (s) => { const i = new Image(); i.src = 'data:image/png;base64,' + s.b64; await i.decode(); return i; }));
  const w = Math.max(...imgs.map((i) => i.width)); const lh = 30;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = imgs.reduce((a, i) => a + i.height + lh, 0);
  const g = cv.getContext('2d'); g.fillStyle = '#111'; g.fillRect(0, 0, cv.width, cv.height);
  let y = 0; imgs.forEach((i, k) => { g.fillStyle = '#fff'; g.font = '22px sans-serif'; g.fillText(`${shots[k].v}  (sharpness ${shots[k].sharp})`, 8, y + 23); y += lh; g.drawImage(i, 0, y); y += i.height; });
  return cv.toDataURL('image/png').split(',')[1];
}, shots);
await writeFile(join(OUT, 'stack.png'), Buffer.from(stack, 'base64'));
await browser.close();
