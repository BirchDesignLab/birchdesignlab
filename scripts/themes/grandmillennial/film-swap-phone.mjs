/**
 * B1 task 4 fix 1: films in-school swaps at 390 in BOTH directions (Home to About, About to Home),
 * both schemes, as timestamped strips, plus the canopy's height each frame via the strip itself.
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name fix1 --reuse --port 4460 -- node scripts/themes/grandmillennial/film-swap-phone.mjs
 * Output: scripts/themes/.out/stage5/b1/t4/film/fix1__<dir>__<scheme>__390.jpg
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { open } from './t2-common.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = join(REPO, 'scripts', 'themes', '.out', 'stage5', 'b1', 't4', 'film');
await mkdir(OUT, { recursive: true });
const base = (process.env.SNAP_BASE || '').replace(/\/$/, '');
const sz = { id: '390', w: 390, h: 844, dpr: 1, mobile: true };
const browser = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
// throwaway visit: the first page a fresh GPU Chromium opens pays for start-up, and no strip is it
{ const { context, page } = await open(browser, 'light', sz); await page.goto(`${base}/t/grandmillennial/`, { waitUntil: 'networkidle' }); await page.goto(`${base}/t/grandmillennial/about/`, { waitUntil: 'networkidle' }); await context.close(); }
for (const scheme of ['light', 'dark']) for (const [dir, from, to] of [['home-to-about', '/t/grandmillennial/', '/t/grandmillennial/about/'], ['about-to-home', '/t/grandmillennial/about/', '/t/grandmillennial/']]) {
  const { context, page } = await open(browser, scheme, sz);
  await page.goto(`${base}${from}`, { waitUntil: 'networkidle' });
  await page.evaluate(async () => { await document.fonts.ready; });
  if (scheme === 'light' && dir === 'home-to-about') console.log('renderer', await page.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); const e = gl.getExtension('WEBGL_debug_renderer_info'); return gl.getParameter(e.UNMASKED_RENDERER_WEBGL); }));
  await page.waitForTimeout(400);
  const cdp = await context.newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', async (f) => { frames.push({ t: f.metadata.timestamp, data: f.data }); await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 70, everyNthFrame: 1 });
  await page.waitForTimeout(250);
  const t0 = Date.now() / 1000;
  await page.locator(`header a[href="${to}"]`).first().click();
  await page.waitForTimeout(1200);
  await cdp.send('Page.stopScreencast');
  const after = frames.filter((f) => f.t >= t0 - 0.05).filter((f) => f.t - t0 < 0.5);
  const N = 12, pick = [];
  for (let i = 0; i < N; i++) pick.push(after[Math.min(after.length - 1, Math.round((i / (N - 1)) * (after.length - 1)))]);
  const imgs = await Promise.all(pick.map((f) => loadImage(Buffer.from(f.data, 'base64'))));
  const w = 200, hh = Math.round(imgs[0].height * (w / imgs[0].width)), cols = 6, rows = 2;
  const cv = createCanvas(cols * w, rows * (hh + 18)), g = cv.getContext('2d');
  g.fillStyle = '#222'; g.fillRect(0, 0, cv.width, cv.height);
  imgs.forEach((im, i) => { const x = (i % cols) * w, y = Math.floor(i / cols) * (hh + 18); g.drawImage(im, x, y + 18, w, hh); g.fillStyle = '#fff'; g.font = '13px sans-serif'; g.fillText(`+${Math.round((pick[i].t - t0) * 1000)}ms`, x + 4, y + 13); });
  await writeFile(join(OUT, `fix1__${dir}__${scheme}__390.jpg`), cv.toBuffer('image/jpeg', 78));
  console.log(dir, scheme, `${after.length} frames`, page.url());
  await context.close();
}
await browser.close();
