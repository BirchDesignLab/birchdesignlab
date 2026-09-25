/**
 * Wave B1 glass fix round 2 (09-25-26): does the SVG bevel (fx.ts
 * mountPanes, url(#glass-pane-bevel-N) prepended to backdrop-filter) defeat
 * a pane's blur? For every .glass/.glass-strong pane in view, on each page and
 * at several scroll offsets, it screenshots the pane as built and again with
 * the url() stripped from every inline backdrop-filter, and reports the mean
 * absolute difference of the pane's INTERIOR (inset 40 px, clear of the
 * bevel band where the two legitimately differ) plus a high-frequency
 * energy (sharpness) of both. A pane whose blur still works shows an interior
 * difference near zero; a pane whose frost the bevel defeats shows a large
 * one and more sharpness as built.
 * Also saves a header crop (as built / url stripped) on Home with the "How we
 * build" link scrolled under the bar (the re-critic's header-ghost case).
 * prefers-reduced-transparency is forced to no-preference over CDP.
 *
 * Usage: BDL_GPU=1 node scripts/themes/glassmorphism/b1-fix2-bevel-frost.mjs
 *   [--base URL] [--scheme light|dark] [--vw 1440 --vh 900] [--tag name]
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
const tag = arg('tag', 'frost');
const OUT = join(HERE, '..', '.out', 'b1-glass-fix2', `${tag}-${scheme}-${vw}`);
await mkdir(OUT, { recursive: true });
const gpu = process.env.BDL_GPU === '1';
if (!gpu) console.warn('BDL_GPU is not 1: SwiftShader is a failure for this probe');
const browser = await chromium.launch({ args: ['--hide-scrollbars', ...(gpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : [])] });
const c = await browser.newContext({ viewport: { width: vw, height: vh }, colorScheme: scheme, deviceScaleFactor: 1 });
await c.addInitScript((s) => { try { localStorage.setItem('scheme', s); localStorage.setItem('bdl-switcher-prompt', 'dismissed'); } catch {} }, scheme);
await c.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
const page = await c.newPage();
const cdp = await c.newCDPSession(page);
await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
const an = await browser.newPage();
const measure = (a, b) => an.evaluate(async ([a, b]) => {
  const load = async (x) => { const i = new Image(); i.src = 'data:image/png;base64,' + x; await i.decode(); const cv = document.createElement('canvas'); cv.width = i.width; cv.height = i.height; const g = cv.getContext('2d'); g.drawImage(i, 0, 0); return g.getImageData(0, 0, i.width, i.height); };
  const A = await load(a); const B = await load(b);
  let d = 0, n = 0, ha = 0, hb = 0;
  const L = (D, k) => 0.3 * D.data[k] + 0.59 * D.data[k + 1] + 0.11 * D.data[k + 2];
  for (let y = 1; y < A.height - 1; y++) for (let x = 1; x < A.width - 1; x++) {
    const k = (y * A.width + x) * 4;
    d += Math.abs(L(A, k) - L(B, k)); n++;
    const lap = (D) => Math.abs(4 * L(D, k) - L(D, k - 4) - L(D, k + 4) - L(D, k - 4 * A.width) - L(D, k + 4 * A.width));
    ha += lap(A); hb += lap(B);
  }
  return { diff: +(d / n).toFixed(2), sharpBuilt: +(ha / n).toFixed(2), sharpNoUrl: +(hb / n).toFixed(2) };
}, [a, b]);

const rows = [];
for (const path of ['/t/glassmorphism/', '/t/glassmorphism/about/', '/t/glassmorphism/services/', '/t/glassmorphism/contact/']) {
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const docH = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  for (const frac of [0, 0.5, 1]) {
    await page.evaluate((y) => scrollTo(0, y), Math.round(docH * frac));
    await page.waitForTimeout(700);
    // Freeze the orbs so the two shots see the same backdrop.
    await page.evaluate(() => document.getAnimations().forEach((a) => a.pause()));
    const panes = await page.evaluate(() => [...document.querySelectorAll('.glass, .glass-strong')].map((el, i) => {
      const r = el.getBoundingClientRect();
      return { i, cls: el.className, bf: el.style.backdropFilter.slice(0, 40), x: r.x, y: r.y, w: r.width, h: r.height };
    }).filter((p) => p.w > 100 && p.h > 90 && p.y >= 0 && p.y + p.h <= innerHeight && p.x >= 0 && p.x + p.w <= innerWidth));
    for (const p of panes) {
      const clip = { x: p.x + 40, y: p.y + 40, width: p.w - 80, height: p.h - 80 };
      if (clip.width < 20 || clip.height < 20) continue;
      // Hide the pane's own content so only its backdrop is compared.
      await page.evaluate((i) => { const el = [...document.querySelectorAll('.glass, .glass-strong')][i]; el.dataset.probeHide = '1'; for (const k of el.children) k.style.visibility = 'hidden'; }, p.i);
      await page.waitForTimeout(120);
      const built = (await page.screenshot({ clip })).toString('base64');
      const saved = await page.evaluate((i) => { const el = [...document.querySelectorAll('.glass, .glass-strong')][i]; const v = el.style.backdropFilter; el.style.backdropFilter = v.replace(/url\([^)]*\)\s*/g, ''); return v; }, p.i);
      await page.waitForTimeout(160);
      const nourl = (await page.screenshot({ clip })).toString('base64');
      await page.evaluate(([i, v]) => { const el = [...document.querySelectorAll('.glass, .glass-strong')][i]; el.style.backdropFilter = v; for (const k of el.children) k.style.visibility = ''; }, [p.i, saved]);
      const m = await measure(built, nourl);
      const row = { path, frac, pane: p.i, cls: p.cls, hasUrl: /url\(/.test(p.bf), ...m };
      rows.push(row);
      console.log(JSON.stringify(row));
    }
    await page.evaluate(() => document.getAnimations().forEach((a) => a.play()));
  }
}
// Header ghost case.
await page.goto(BASE + '/t/glassmorphism/', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
await page.evaluate(() => { const b = [...document.querySelectorAll('main a')].find((a) => /How we build/.test(a.textContent)); if (b) scrollBy(0, b.getBoundingClientRect().top - 30); });
await page.waitForTimeout(600);
const hdr = await page.evaluate(() => { const bar = document.querySelector('.site-header > .bar'); const r = bar.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, bf: bar.style.backdropFilter || getComputedStyle(bar).backdropFilter }; });
console.log('header', JSON.stringify(hdr));
await page.screenshot({ path: join(OUT, 'header-under-howwebuild.png'), clip: { x: Math.max(0, hdr.x - 10), y: 0, width: Math.min(vw, hdr.w + 20), height: hdr.y + hdr.h + 12 } });
await writeFile(join(OUT, 'report.json'), JSON.stringify({ rows, header: hdr }, null, 1));
await browser.close();
