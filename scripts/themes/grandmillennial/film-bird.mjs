/**
 * B1 task 2: films the live wall bird on About as timestamped strips.
 *
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name b1t2 --reuse --port 4460 -- node scripts/themes/grandmillennial/film-bird.mjs
 *
 * Per scheme and size: hover (mouse, 1440) or tap (touch, 390) takes the bird off;
 * frames every 130 ms for 1.5 s; a second tap sends it back, same again. Strips in
 * scripts/themes/.out/stage5/b1/t2/film/bird__<mode>__<scheme>__<size>.jpg, each frame
 * stamped with its time. Checks the bird really moved and returned.
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
const base = (process.env.SNAP_BASE || '').replace(/\/$/, '');
const CASES = [
  { size: { id: '1440', w: 1440, h: 900, dpr: 1 }, mode: 'hover' },
  { size: { id: '1440', w: 1440, h: 900, dpr: 1 }, mode: 'tap' },
  { size: { id: '390', w: 390, h: 844, dpr: 2, mobile: true }, mode: 'tap' },
];
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
let bad = 0;
for (const scheme of ['light', 'dark']) for (const { size, mode } of CASES) {
  const { context, page } = await open(browser, scheme, size);
  await page.goto(`${base}/t/grandmillennial/about/`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
  await page.evaluate(async () => { await document.fonts.ready; });
  const info = await page.evaluate(() => {
    const g = [...document.querySelectorAll('.wb')].find((e) => e.closest('svg').getBoundingClientRect().width > 0 && getComputedStyle(e.closest('svg')).display !== 'none');
    const svg = g.closest('svg');
    const map = (s) => { const [x, y] = s.split(' ').map(Number); const p = svg.createSVGPoint(); p.x = x; p.y = y; const q = p.matrixTransform(svg.getScreenCTM()); return [q.x, q.y + scrollY]; };
    const hit = g.querySelector('.wb-hit').getBoundingClientRect();
    return { home: map(g.dataset.home), away: map(g.dataset.away), hit: [hit.left + hit.width / 2, hit.top + hit.height / 2 + scrollY] };
  });
  const pad = 130;
  const xs = [info.home[0], info.away[0]], ys = [info.home[1], info.away[1]];
  const clip = { x: Math.max(0, Math.min(...xs) - pad), y: Math.max(0, Math.min(...ys) - pad * 1.1), width: Math.abs(xs[0] - xs[1]) + pad * 2, height: Math.abs(ys[0] - ys[1]) + pad * 1.4 };
  clip.width = Math.min(clip.width, size.w - clip.x);
  await page.evaluate((y) => window.scrollTo(0, y), Math.max(0, info.hit[1] - size.h / 2));
  await page.waitForTimeout(300);
  const pos = () => page.evaluate(() => { const g = [...document.querySelectorAll('.wb')].find((e) => getComputedStyle(e.closest('svg')).display !== 'none'); return g.style.transform; });
  const start = await pos();
  const frames = [];
  const grab = async (label, t0) => frames.push({ label: `${label} +${Math.round(performance.now() - t0)}ms`, buf: await page.screenshot({ clip, fullPage: true, type: 'jpeg', quality: 80 }) });
  const centre = () => page.evaluate(() => { const g = [...document.querySelectorAll('.wb')].find((e) => getComputedStyle(e.closest('svg')).display !== 'none'); const r = g.querySelector('.wb-hit').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  const trigger = async (leg) => {
    const [vx, vy] = await centre();
    if (mode === 'hover' && leg === 'out') { await page.mouse.move(vx - 200, vy); await page.mouse.move(vx, vy, { steps: 4 }); }
    else if (size.mobile) await page.touchscreen.tap(vx, vy);
    else await page.mouse.click(vx, vy);
  };
  for (const [leg, wait] of [['out', 500], ['back', 700]]) {
    const t0 = performance.now();
    await trigger(leg);
    for (let i = 0; i < 12; i++) { await grab(leg, t0); await page.waitForTimeout(80); }
    await page.waitForTimeout(wait);
  }
  const end = await pos();
  const ok = start !== end ? false : true;
  const mid = frames[11].label;
  if (!ok) { bad++; console.error('did not return', scheme, size.id, mode, start, end); }
  const w = 360, imgs = await Promise.all(frames.map((f) => loadImage(f.buf)));
  const hh = Math.round(imgs[0].height * (w / imgs[0].width));
  const cols = 6, rows = Math.ceil(frames.length / cols);
  const cv = createCanvas(cols * w, rows * (hh + 20));
  const g = cv.getContext('2d');
  g.fillStyle = '#222'; g.fillRect(0, 0, cv.width, cv.height);
  imgs.forEach((im, i) => { const x = (i % cols) * w, y = Math.floor(i / cols) * (hh + 20); g.drawImage(im, x, y + 20, w, hh); g.fillStyle = '#fff'; g.font = '14px sans-serif'; g.fillText(`${frames[i].label}`, x + 4, y + 14); });
  await writeFile(join(OUT, `bird__${mode}__${scheme}__${size.id}.jpg`), cv.toBuffer('image/jpeg', 80));
  console.log(scheme, size.id, mode, 'start', start, 'end', end, ok ? 'returned' : 'STUCK');
  await context.close();
}
await browser.close();
process.exit(bad ? 1 : 0);
