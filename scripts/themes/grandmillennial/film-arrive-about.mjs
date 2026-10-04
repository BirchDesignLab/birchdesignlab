/**
 * B1 task 2: films the ARRIVAL on grandmillennial's About from the quiet school
 * (the drapes part from frame one, 640 ms), through the real router, as a
 * timestamped strip. Also an in-school swap (Home to About) for the same sizes.
 *
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name b1t2 --reuse --port 4460 -- node scripts/themes/grandmillennial/film-arrive-about.mjs [--label after]
 *
 * Output: scripts/themes/.out/stage5/b1/t2/film/<label>__<arrive|swap>__<scheme>__<size>.jpg
 * Frames are CDP screencast frames (real composited frames, GPU), stamped with
 * the time since the click.
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { open } from './t2-common.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = join(REPO, 'scripts', 'themes', '.out', 'stage5', 'b1', 't2', 'film');
await mkdir(OUT, { recursive: true });
const li = process.argv.indexOf('--label');
const label = li < 0 ? 'after' : process.argv[li + 1];
const base = (process.env.SNAP_BASE || '').replace(/\/$/, '');
const SIZES = [{ id: '1440', w: 1440, h: 900, dpr: 1 }, { id: '390', w: 390, h: 844, dpr: 1, mobile: true }];
const browser = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
for (const scheme of ['light', 'dark']) for (const sz of SIZES) for (const scenario of ['arrive', 'swap']) {
  const { context, page } = await open(browser, scheme, sz);
  const start = scenario === 'arrive' ? `${base}/t/quiet/about/` : `${base}/t/grandmillennial/`;
  const target = '/t/grandmillennial/about/';
  await page.goto(start, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(400);
  const cdp = await context.newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', async (f) => { frames.push({ t: f.metadata.timestamp, data: f.data }); await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 70, everyNthFrame: 1 });
  await page.waitForTimeout(250);
  const t0 = Date.now() / 1000;
  await page.evaluate((h) => {
    const a = document.createElement('a'); a.href = h; a.textContent = 'go';
    a.style.cssText = 'position:fixed;left:0;top:0;opacity:0'; document.body.append(a); a.click();
  }, target);
  await page.waitForTimeout(1500);
  await cdp.send('Page.stopScreencast');
  const after = frames.filter((f) => f.t >= t0 - 0.05);
  const pick = [];
  const N = 12;
  for (let i = 0; i < N; i++) pick.push(after[Math.min(after.length - 1, Math.round((i / (N - 1)) * (after.length - 1)))]);
  const imgs = await Promise.all(pick.map((f) => loadImage(Buffer.from(f.data, 'base64'))));
  const w = sz.mobile ? 200 : 360, hh = Math.round(imgs[0].height * (w / imgs[0].width));
  const cols = sz.mobile ? 6 : 4, rows = Math.ceil(N / cols);
  const cv = createCanvas(cols * w, rows * (hh + 18));
  const g = cv.getContext('2d');
  g.fillStyle = '#222'; g.fillRect(0, 0, cv.width, cv.height);
  imgs.forEach((im, i) => { const x = (i % cols) * w, y = Math.floor(i / cols) * (hh + 18); g.drawImage(im, x, y + 18, w, hh); g.fillStyle = '#fff'; g.font = '13px sans-serif'; g.fillText(`+${Math.round((pick[i].t - t0) * 1000)}ms`, x + 4, y + 13); });
  await writeFile(join(OUT, `${label}__${scenario}__${scheme}__${sz.id}.jpg`), cv.toBuffer('image/jpeg', 78));
  console.log(scenario, scheme, sz.id, `${after.length} frames`, page.url());
  await context.close();
}
await browser.close();
