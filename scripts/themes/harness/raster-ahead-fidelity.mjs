/**
 * Does the script-less copy trace-arrival.mjs's pf-raster draws look like the
 * real page? A copy that leaves out part of the page leaves that part's GPU
 * programs uncompiled, so drawing it ahead warms less than it should.
 *
 * Written 09-24-26 for Tier 3 stage 2 (the freeze investigation,
 * tier3-stage2/freeze-investigation.md), after cottagecore's About page in
 * light kept freezing with the copy drawn ahead. For each page: load the
 * real page (a hard load, scheme set, reduced motion so it holds still) and
 * screenshot it; then, on quiet, write the same copy pf-raster writes (the
 * scheme and .js on its <html>, no .reveal-on) into a full-viewport iframe at
 * opacity 1 and screenshot that. It prints the share of pixels that differ
 * by more than 32 levels and saves both pictures and a diff under
 * scripts/themes/.out/freeze-base/fidelity-*.
 *
 * Usage (serve a build first; snap.mjs sets SNAP_BASE):
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name freeze-base --reuse --port 4491 -- \
 *     node scripts/themes/harness/raster-ahead-fidelity.mjs [--pages /t/cottagecore/about/,...] \
 *     [--viewport desktop] [--schemes light,dark]
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VIEWPORTS } from '../capture.mjs';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '.out', 'freeze-base');
const base = (process.env.SNAP_BASE || arg('base', 'http://127.0.0.1:4491')).replace(/\/$/, '');
const HEAVY = ['grandmillennial', 'cottagecore', 'vaporwave', 'glassmorphism'];
const pages = arg('pages', HEAVY.flatMap((id) => [`/t/${id}/`, `/t/${id}/about/`]).join(',')).split(',');
const vpName = arg('viewport', 'desktop');
const schemes = arg('schemes', 'light,dark').split(',');
const vp = VIEWPORTS[vpName];
const useGpu = process.env.BDL_GPU === '1';
const browser = await chromium.launch({
  args: ['--hide-scrollbars', ...(useGpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : [])],
});
await mkdir(OUT, { recursive: true });

async function px(buf) {
  const img = await loadImage(buf);
  const c = createCanvas(img.width, img.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  return { w: img.width, h: img.height, data: ctx.getImageData(0, 0, img.width, img.height).data };
}

for (const scheme of schemes) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.mobile ? 2 : 1,
    isMobile: !!vp.mobile, hasTouch: !!vp.mobile, colorScheme: scheme, reducedMotion: 'reduce',
  });
  await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
  await suppressPrompt(context);
  await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await context.newPage();
  for (const path of pages) {
    await page.goto(base + path, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1200);
    const real = await page.screenshot();
    await page.goto(`${base}/t/quiet/`, { waitUntil: 'networkidle' });
    await page.evaluate(async (to) => {
      const html = await (await fetch(to)).text();
      const f = document.createElement('iframe');
      f.setAttribute('sandbox', 'allow-same-origin');
      f.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;opacity:1;z-index:2147483647;border:0';
      const loaded = new Promise((r) => { f.onload = r; });
      f.srcdoc = html.replace('<head>', `<head><base href="${location.origin}/">`);
      document.body.append(f);
      await loaded;
      const root = document.documentElement;
      const next = f.contentDocument.documentElement;
      if (root.dataset.scheme) next.setAttribute('data-scheme', root.dataset.scheme);
      next.classList.add('js');
      await f.contentDocument.fonts.ready;
      await new Promise((r) => setTimeout(r, 800));
    }, path);
    // The portal's switcher bar sits over the copy's foot; both pictures
    // keep it (the real page has it too), so it cancels out.
    const copy = await page.screenshot();
    const a = await px(real);
    const b = await px(copy);
    let moved = 0;
    const c = createCanvas(a.w, a.h);
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(a.w, a.h);
    for (let i = 0; i < a.data.length; i += 4) {
      const d = Math.max(Math.abs(a.data[i] - b.data[i]), Math.abs(a.data[i + 1] - b.data[i + 1]), Math.abs(a.data[i + 2] - b.data[i + 2]));
      const hit = d > 32;
      if (hit) moved++;
      img.data[i] = hit ? 255 : a.data[i] * 0.3;
      img.data[i + 1] = hit ? 0 : a.data[i + 1] * 0.3;
      img.data[i + 2] = hit ? 0 : a.data[i + 2] * 0.3;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const stem = join(OUT, `fidelity-${vpName}-${scheme}-${path.replace(/^\/t\/|\/$/g, '').replace(/\//g, '-')}`);
    await writeFile(`${stem}-real.png`, real);
    await writeFile(`${stem}-copy.png`, copy);
    await writeFile(`${stem}-diff.png`, await c.encode('png'));
    console.log(`${vpName} ${scheme} ${path}: ${(moved / (a.w * a.h) * 100).toFixed(1)}% of pixels differ by more than 32 levels`);
  }
  await context.close();
}
await browser.close();
