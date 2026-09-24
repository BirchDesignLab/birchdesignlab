/**
 * Does drawing a school's page on top of the current one at opacity 0.001
 * change any pixel? The check behind trace-arrival.mjs's pf-raster condition.
 *
 * Written 09-23-26 for Tier 3 stage 2 (the freeze investigation,
 * tier3-stage2/freeze-investigation.md). pf-raster draws the destination in a
 * script-less srcdoc iframe over the whole viewport at opacity 0.001 so the
 * GPU compiles its shaders before the click. 255 x 0.001 is a quarter of one
 * 8-bit level, so no pixel should move; this measures it instead of assuming
 * it. Under reduced motion (so the start page is still), it screenshots the
 * start page, adds the iframe, waits for it to be drawn, screenshots again,
 * and counts differing pixels and the largest channel difference. A second
 * pass at opacity 0.01 is the positive control: it must show a difference,
 * or the check could not see one.
 *
 * --place under (added 09-23-26 by agent D): the copy goes beneath the page
 * (z-index -1, still 0.001) instead of on top, the placement drawing ahead
 * would ship with. --label names the output folder (default freeze-base).
 * --copy-css <css> adds a style to the copy (for glassmorphism, to try it
 * without its backdrop filters). --dialog opens the switcher's dialog before
 * the first screenshot, so the check sees what a visitor sees while the
 * copy would be drawn: the page under the dialog's backdrop, and the dialog.
 * --tag goes in the picture names; --viewports and --schemes narrow the run.
 *
 * Usage (serve a build first; snap.mjs sets SNAP_BASE):
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name freeze-base --reuse --port 4491 -- \
 *     node scripts/themes/harness/raster-ahead-invisible.mjs [--from quiet,swiss] \
 *     [--to grandmillennial,cottagecore,vaporwave,glassmorphism]
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { VIEWPORTS } from '../capture.mjs';
import { suppressPrompt } from '../lib/portal-prompt.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '.out', arg('label', 'freeze-base'));
const place = arg('place', 'top');
const copyCss = arg('copy-css', '');
const withDialog = process.argv.includes('--dialog');
const tag = arg('tag', place);
const base = (process.env.SNAP_BASE || arg('base', 'http://127.0.0.1:4491')).replace(/\/$/, '');
const froms = arg('from', 'quiet,swiss').split(',');
const tos = arg('to', 'grandmillennial,cottagecore,vaporwave,glassmorphism').split(',');
const useGpu = process.env.BDL_GPU === '1';
const browser = await chromium.launch({
  args: ['--hide-scrollbars', ...(useGpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : [])],
});

async function px(buf) {
  const img = await loadImage(buf);
  const c = createCanvas(img.width, img.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, img.width, img.height).data;
}
function compare(a, b, width) {
  let n = 0;
  let max = 0;
  const box = { x0: Infinity, y0: Infinity, x1: -1, y1: -1 };
  for (let i = 0; i < a.length; i += 4) {
    const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
    if (d) {
      n++;
      const x = (i / 4) % width;
      const y = Math.floor(i / 4 / width);
      box.x0 = Math.min(box.x0, x); box.y0 = Math.min(box.y0, y);
      box.x1 = Math.max(box.x1, x); box.y1 = Math.max(box.y1, y);
    }
    if (d > max) max = d;
  }
  return { changed: n, maxLevel: max, box: n ? box : null };
}

let failed = false;
for (const vpName of arg('viewports', 'desktop,mobile').split(',')) {
  const vp = VIEWPORTS[vpName];
  for (const scheme of arg('schemes', 'dark,light').split(',')) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.mobile ? 2 : 1,
      isMobile: !!vp.mobile, hasTouch: !!vp.mobile, colorScheme: scheme, reducedMotion: 'reduce',
    });
    await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
    await suppressPrompt(context);
    await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
    const page = await context.newPage();
    for (const from of froms) {
      for (const to of tos) {
        if (to === from) continue;
        const out = {};
        for (const opacity of [0.001, 0.01]) {
          await page.goto(`${base}/t/${from}/`, { waitUntil: 'networkidle' });
          await page.evaluate(() => document.fonts.ready);
          await page.waitForTimeout(800);
          if (withDialog) {
            await page.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('.open').click());
            await page.waitForTimeout(800);
          }
          const shot0 = await page.screenshot();
          const before = await px(shot0);
          await page.evaluate(async ({ to, opacity, place, copyCss }) => {
            const html = await (await fetch(to)).text();
            const f = document.createElement('iframe');
            f.id = 'raster-ahead';
            f.setAttribute('sandbox', 'allow-same-origin');
            f.style.cssText = `position:fixed;left:0;top:0;width:100vw;height:100vh;opacity:${opacity};pointer-events:none;z-index:${place === 'under' ? -1 : 2147483647};border:0`;
            const loaded = new Promise((r) => { f.onload = r; });
            f.srcdoc = html.replace('<head>', `<head><base href="${location.origin}/">${copyCss ? `<style>${copyCss}</style>` : ''}`);
            document.body.append(f);
            await loaded;
            // As trace-arrival's pf-raster: the scheme and .js, not .reveal-on.
            const root = document.documentElement;
            const next = f.contentDocument.documentElement;
            if (root.dataset.scheme) next.setAttribute('data-scheme', root.dataset.scheme);
            next.classList.add('js');
            await f.contentDocument.fonts.ready;
            await new Promise((r) => setTimeout(r, 400));
          }, { to: `/t/${to}/`, opacity, place, copyCss });
          const shot1 = await page.screenshot();
          const during = await px(shot1);
          out[opacity] = compare(before, during, vp.width * (vp.mobile ? 2 : 1));
          // A visible 0.001 pass keeps both pictures, for reading where.
          if (opacity === 0.001 && out[opacity].changed) {
            await mkdir(OUT, { recursive: true });
            const stem = join(OUT, `invisible-${tag}-${vpName}-${scheme}-${from}-${to}`);
            await writeFile(`${stem}-before.png`, shot0);
            await writeFile(`${stem}-during.png`, shot1);
            // The changed pixels in red over a dimmed copy of the page.
            const w = vp.width * (vp.mobile ? 2 : 1);
            const h = before.length / 4 / w;
            const c = createCanvas(w, h);
            const ctx = c.getContext('2d');
            const img = ctx.createImageData(w, h);
            for (let i = 0; i < before.length; i += 4) {
              const d = Math.max(Math.abs(before[i] - during[i]), Math.abs(before[i + 1] - during[i + 1]), Math.abs(before[i + 2] - during[i + 2]));
              img.data[i] = d ? 255 : before[i] * 0.3;
              img.data[i + 1] = d ? 0 : before[i + 1] * 0.3;
              img.data[i + 2] = d ? 0 : before[i + 2] * 0.3;
              img.data[i + 3] = 255;
            }
            ctx.putImageData(img, 0, 0);
            await writeFile(`${stem}-diff.png`, await c.encode('png'));
          }
        }
        const ok = out[0.001].changed === 0 && out[0.01].changed > 0;
        if (!ok) failed = true;
        console.log(`${vpName} ${scheme} ${from} <- ${to}: at 0.001 ${out[0.001].changed} px changed (max ${out[0.001].maxLevel} levels${out[0.001].box ? `, in ${JSON.stringify(out[0.001].box)}` : ''}); control 0.01 ${out[0.01].changed} px (max ${out[0.01].maxLevel})  ${ok ? 'invisible' : 'VISIBLE or control blind'}`);
      }
    }
    await context.close();
  }
}
await browser.close();
process.exitCode = failed ? 1 : 0;
