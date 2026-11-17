/* B2 task 6 verifier: timestamped screencast strips for the two seed cases.
 *
 *   BDL_GPU=1 node scripts/themes/cottagecore/b2-t6-v1-strips.mjs <outDir> [--base http://127.0.0.1:4462]
 *
 *   wheel__1440-light.jpg   one wheel step of 300 px on Home: the frames from the step to +700 ms,
 *                           each labelled with ms since the wheel event (seeds must not sit on text).
 *   first__<size>-light.jpg the first frames after navigation (domcontentloaded to +900 ms).
 *
 * Real composited frames over the DevTools screencast (as motion.mjs does); a strip shows at most
 * 16 frames picked evenly. The numeric scan (every rAF, ink alpha >= 14 inside a text line) is
 * b2-t6-fix1-wheel.mjs and b2-t6-fix1-first.mjs; this is the picture that goes with them. */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i < 0 ? d : process.argv[i + 1]; };
const out = process.argv[2];
const base = arg('base', process.env.SNAP_BASE || 'http://127.0.0.1:4462').replace(/\/$/, '');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });

async function newPage(sz) {
  const context = await browser.newContext({ viewport: { width: sz.w, height: sz.h }, deviceScaleFactor: sz.dpr, isMobile: !!sz.mobile, hasTouch: !!sz.mobile, colorScheme: 'light', reducedMotion: 'no-preference' });
  await suppressPrompt(context);
  await context.addInitScript(() => { try { localStorage.setItem('scheme', 'light'); localStorage.setItem('theme', 'light'); } catch {} });
  await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await context.newPage();
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference', reducedTransparency: 'no-preference' }).catch(() => {});
  return { context, page };
}

async function record(page) {
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', (f) => { frames.push({ ts: f.metadata.timestamp * 1000, data: f.data }); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 80, everyNthFrame: 1 });
  return { frames, stop: () => cdp.send('Page.stopScreencast').catch(() => {}) };
}

async function sheet(frames, t0, file, label, cols, thumbW) {
  const pick = frames.filter((f) => f.ts >= t0);
  const n = Math.min(16, pick.length);
  const chosen = Array.from({ length: n }, (_, i) => pick[Math.round((i * (pick.length - 1)) / Math.max(1, n - 1))]);
  const imgs = await Promise.all(chosen.map((f) => loadImage(Buffer.from(f.data, 'base64'))));
  const ratio = imgs[0].height / imgs[0].width;
  const th = Math.round(thumbW * ratio), rows = Math.ceil(n / cols), LAB = 22, HEAD = 28;
  const c = createCanvas(cols * thumbW, HEAD + rows * (th + LAB));
  const g = c.getContext('2d');
  g.fillStyle = '#222'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#fff'; g.font = '16px sans-serif'; g.fillText(`${label} (${pick.length} frames in window, ${n} shown)`, 8, 19);
  imgs.forEach((im, i) => {
    const x = (i % cols) * thumbW, y = HEAD + Math.floor(i / cols) * (th + LAB);
    g.drawImage(im, x, y, thumbW, th);
    g.fillStyle = '#ffe9a8'; g.font = '14px sans-serif'; g.fillText(`+${Math.round(chosen[i].ts - t0)} ms`, x + 6, y + th + 16);
  });
  writeFileSync(file, c.toBuffer('image/jpeg', 86));
}

/* wheel step, 1440 light: three steps filmed, the one with the most frames kept */
{
  const { context, page } = await newPage({ w: 1440, h: 900, dpr: 1 });
  await page.goto(`${base}/t/cottagecore/`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(2500);
  await page.mouse.move(700, 400);
  for (let k = 0; k < 3; k++) {
    const rec = await record(page);
    await page.waitForTimeout(300);
    const t0 = await page.evaluate(() => performance.timeOrigin + performance.now());
    await page.mouse.wheel(0, k === 1 ? -300 : 300);
    await page.waitForTimeout(800);
    await rec.stop();
    const win = rec.frames.filter((f) => f.ts >= t0 && f.ts <= t0 + 700);
    await sheet(win, t0, join(out, `wheel__1440-light__step${k + 1}.jpg`), `Home 1440 light, wheel step ${k + 1} (${k === 1 ? 'up' : 'down'} 300 px)`, 4, 540);
    await page.waitForTimeout(1200);
  }
  await context.close();
}

/* first frames after load */
for (const sz of [{ id: '1440', w: 1440, h: 900, dpr: 1 }, { id: '390', w: 390, h: 844, dpr: 2, mobile: true }]) {
  const { context, page } = await newPage(sz);
  const rec = await record(page);
  const t0 = Date.now();
  await page.goto(`${base}/t/cottagecore/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await rec.stop();
  const first = rec.frames.length ? rec.frames[0].ts : t0;
  await sheet(rec.frames.filter((f) => f.ts <= first + 1100), first, join(out, `first__${sz.id}-light.jpg`), `Home ${sz.id} light, first frames after load`, sz.mobile ? 8 : 4, sz.mobile ? 195 : 540);
  await context.close();
}
await browser.close();
