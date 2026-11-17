/**
 * B1 task 4: films the ARRIVAL on grandmillennial's Home (and the in-school swap Home to About) from the quiet school
 * (the drapes part from frame one, 640 ms) through the real switcher (its dialog opened,
 * the school's row clicked; the row's href is already /t/grandmillennial/about/), as a
 * timestamped strip. COLD: a fresh browser context, so no cached wall file. WARM: the
 * target visited once first in the same context. Also an in-school swap (Home to About)
 * with a real click on the header's About link.
 *
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name b1t2 --reuse --port 4460 -- node scripts/themes/grandmillennial/film-arrive-about.mjs [--label after]
 *
 * Run it once against the before build (stage5-base) and once against the head, same label
 * scheme (--label base / --label after), to compare when the drapes first part.
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
const OUT = join(REPO, 'scripts', 'themes', '.out', 'stage5', 'b1', 't4', 'film');
await mkdir(OUT, { recursive: true });
const li = process.argv.indexOf('--label');
const label = li < 0 ? 'after' : process.argv[li + 1];
const base = (process.env.SNAP_BASE || '').replace(/\/$/, '');
const SIZES = [{ id: '1440', w: 1440, h: 900, dpr: 1 }, { id: '820', w: 820, h: 1180, dpr: 1 }, { id: '390', w: 390, h: 844, dpr: 1, mobile: true }];
const browser = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
// The first page a fresh GPU Chromium opens pays for process and GPU start-up (the stage5-base build
// stalls ~780 ms on its first cold arrival too), so one throwaway visit comes first and no strip is it.
{ const { context, page } = await open(browser, 'light', SIZES[0]); await page.goto(`${base}/t/quiet/about/`, { waitUntil: 'networkidle' }); await page.goto(`${base}/t/grandmillennial/about/`, { waitUntil: 'networkidle' }); await context.close(); }
for (const scheme of ['light', 'dark']) for (const sz of SIZES) for (const scenario of ['arrive-cold', 'arrive-warm', 'swap']) {
  const { context, page } = await open(browser, scheme, sz);
  const arrive = scenario.startsWith('arrive');
  const start = arrive ? `${base}/t/quiet/` : `${base}/t/grandmillennial/`;
  const target = arrive ? '/t/grandmillennial/' : '/t/grandmillennial/about/';
  if (scenario === 'arrive-warm') await page.goto(`${base}${target}`, { waitUntil: 'networkidle' }); // the walls are now cached
  await page.goto(start, { waitUntil: 'networkidle' });
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(400);
  const cdp = await context.newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', async (f) => { frames.push({ t: f.metadata.timestamp, data: f.data }); await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 70, everyNthFrame: 1 });
  await page.waitForTimeout(250);
  let t0;
  if (arrive) {
    // the real switcher: open its dialog, wait for it to settle, click the school's row
    await page.locator('bdl-switcher .open').click();
    await page.waitForTimeout(600);
    const row = page.locator('bdl-switcher a[data-school="grandmillennial"]');
    const href = await row.getAttribute('href');
    if (href !== target) throw new Error(`switcher row goes to ${href}, not ${target}`);
    t0 = Date.now() / 1000;
    await row.click();
  } else {
    t0 = Date.now() / 1000;
    await page.locator(`header a[href="${target}"]`).first().click();
  }
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
  console.log(scenario, scheme, sz.id, 'frame offsets ms:', after.slice(0, 40).map((f) => Math.round((f.t - t0) * 1000)).join(' '));
  console.log(scenario, scheme, sz.id, `${after.length} frames`, page.url());
  await context.close();
}
await browser.close();
