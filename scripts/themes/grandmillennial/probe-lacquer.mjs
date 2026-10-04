/**
 * B1 task 1 fix round 2 probe: the dark lacquer vignette (side, top, corner
 * pixels vs --field) and the in-school swap's header (lit streak held through
 * the swap). GPU Chromium.
 *
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name b1t1r2 --port 4460 -- \
 *     node scripts/themes/grandmillennial/probe-lacquer.mjs
 *
 * Output: scripts/themes/.out/stage5/b1/t1/probe/
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = join(REPO, 'scripts', 'themes', '.out', 'stage5', 'b1', 't1', 'probe');
await mkdir(OUT, { recursive: true });
const base = (process.env.SNAP_BASE || '').replace(/\/$/, '');
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const SIZES = [{ id: '1440', w: 1440, h: 900 }, { id: '1024', w: 1024, h: 768 }, { id: '390', w: 390, h: 844, mobile: true }];

async function ctxFor(sz, scheme) {
  const context = await browser.newContext({ viewport: { width: sz.w, height: sz.h }, deviceScaleFactor: 1, isMobile: !!sz.mobile, hasTouch: !!sz.mobile, colorScheme: scheme, reducedMotion: 'no-preference' });
  await suppressPrompt(context);
  await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); localStorage.setItem('theme', s); } catch {} }, scheme);
  await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  return context;
}
async function px(buf, pts) {
  const im = await loadImage(buf);
  const cv = createCanvas(im.width, im.height); const g = cv.getContext('2d'); g.drawImage(im, 0, 0);
  return Object.fromEntries(Object.entries(pts).map(([k, [x, y]]) => [k, Array.from(g.getImageData(x, y, 1, 1).data.slice(0, 3)).join(',')]));
}

// 1. vignette: viewport screenshots, dark Home, scroll 0
const browserInfo = {};
for (const sz of SIZES) {
  const context = await ctxFor(sz, 'dark');
  const page = await context.newPage();
  await page.goto(`${base}/t/grandmillennial/`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(400);
  if (!browserInfo.r) browserInfo.r = await page.evaluate(() => { const c = document.createElement('canvas').getContext('webgl'); const e = c.getExtension('WEBGL_debug_renderer_info'); return c.getParameter(e.UNMASKED_RENDERER_WEBGL); });
  const buf = await page.screenshot({ path: join(OUT, `vp__home__dark__${sz.id}.jpg`), type: 'jpeg', quality: 90 });
  const m = 3, W = sz.w, H = sz.h;
  console.log(sz.id, await px(buf, { leftMid: [m, H / 2 | 0], rightMid: [W - 1 - m, H / 2 | 0], topMid: [W / 2 | 0, 600 < H ? 600 : 0], blCorner: [m, H - 1 - m], brCorner: [W - 1 - m, H - 1 - m], center: [W / 2 | 0, H / 2 | 0] }));
  await context.close();
}
console.log('renderer', browserInfo.r);
await writeFile(join(OUT, 'renderer.txt'), browserInfo.r);

// 2. header through a swap, dark: header-crop mean diff vs the pre-click frame
for (const sz of SIZES.slice(0, 1).concat(SIZES.slice(2))) {
  const context = await ctxFor(sz, 'dark');
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }, { name: 'prefers-reduced-motion', value: 'no-preference' }, { name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  await page.goto(`${base}/t/grandmillennial/`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(500);
  const hb = await page.evaluate(() => { const r = document.querySelector('.site-header').getBoundingClientRect(); return { x: 0, y: 0, w: Math.round(r.width), h: Math.round(r.height) }; });
  const frames = [];
  cdp.on('Page.screencastFrame', (f) => { frames.push({ t: f.metadata.timestamp, data: f.data }); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
  await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 });
  await page.waitForTimeout(200);
  const t0 = Date.now() / 1000;
  await page.locator('header nav a[href="/t/grandmillennial/services/"]').first().click();
  await page.waitForTimeout(1000);
  await cdp.send('Page.stopScreencast');
  const pre = frames.filter((f) => f.t < t0 - 0.02).at(-1);
  const post = frames.filter((f) => f.t >= t0 - 0.02);
  const crop = async (f) => { const im = await loadImage(Buffer.from(f.data, 'base64')); const sc = im.width / sz.w; const cv = createCanvas(Math.round(hb.w * sc), Math.round(hb.h * sc)); cv.getContext('2d').drawImage(im, 0, 0, hb.w * sc, hb.h * sc, 0, 0, cv.width, cv.height); return cv; };
  const base0 = await crop(pre);
  const d0 = base0.getContext('2d').getImageData(0, 0, base0.width, base0.height).data;
  const rows = [];
  for (const f of post.slice(0, 40)) {
    const c = await crop(f); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let s = 0, n = 0, over = 0; for (let i = 0; i < d.length; i += 4) { const e = (Math.abs(d[i] - d0[i]) + Math.abs(d[i + 1] - d0[i + 1]) + Math.abs(d[i + 2] - d0[i + 2])) / 3; s += e; n++; if (e > 6) over++; }
    rows.push({ ms: Math.round((f.t - t0) * 1000), mean: +(s / n).toFixed(2), over6: +(100 * over / n).toFixed(1) });
  }
  console.log(`swap header dark ${sz.id}:`, rows.map((r) => `${r.ms}ms mean ${r.mean} over6 ${r.over6}%`).join(' | '));
  const picks = [pre, ...post.slice(0, 5), ...post.filter((f) => f.t - t0 > 0.15 && f.t - t0 < 0.5).filter((_, i) => i % 5 === 0).slice(0, 2)];
  const cs = await Promise.all(picks.map(crop));
  const cv = createCanvas(cs[0].width, cs.length * (cs[0].height + 4));
  cs.forEach((c, i) => cv.getContext('2d').drawImage(c, 0, i * (c.height + 4)));
  await writeFile(join(OUT, `header__swap__dark__${sz.id}.png`), cv.toBuffer('image/png'));
  await context.close();
}
await browser.close();
