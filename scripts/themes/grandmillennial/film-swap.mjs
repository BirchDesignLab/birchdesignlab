/**
 * B1 task 1 film: in-school swaps for grandmillennial (Home to Services,
 * Services to Contact) as timestamped strips, over the DevTools screencast.
 *
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name b1t1 --reuse --port 4460 -- \
 *     node scripts/themes/grandmillennial/film-swap.mjs
 *
 * Output: scripts/themes/.out/stage5/b1/t1/films/swap__<from>-<to>__<scheme>__<size>.jpg
 * (16 evenly picked frames over 1.3 s from the click, time under each frame).
 * Arrivals from quiet go through the real switcher with scripts/themes/motion.mjs.
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = join(REPO, 'scripts', 'themes', '.out', 'stage5', 'b1', 't1', 'films');
await mkdir(OUT, { recursive: true });
const base = (process.env.SNAP_BASE || '').replace(/\/$/, '');
const SIZES = [{ id: '1440', w: 1440, h: 900, dpr: 1 }, { id: '390', w: 390, h: 844, dpr: 1, mobile: true }];
const SWAPS = [['', 'services/', 'home-services'], ['services/', 'contact/', 'services-contact']];
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const scheme of ['light', 'dark']) for (const sz of SIZES) for (const [from, to, name] of SWAPS) {
  const context = await browser.newContext({ viewport: { width: sz.w, height: sz.h }, deviceScaleFactor: sz.dpr, isMobile: !!sz.mobile, hasTouch: !!sz.mobile, colorScheme: scheme, reducedMotion: 'no-preference' });
  await suppressPrompt(context);
  await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); localStorage.setItem('theme', s); } catch {} }, scheme);
  await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'no-preference' }, { name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  await page.goto(`${base}/t/grandmillennial/${from}`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(500);
  const frames = [];
  cdp.on('Page.screencastFrame', async (f) => {
    frames.push({ t: f.metadata.timestamp, data: f.data });
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 70, everyNthFrame: 1 });
  await page.waitForTimeout(150);
  const t0 = Date.now() / 1000;
  await page.locator(`header nav a[href="/t/grandmillennial/${to}"]`).first().click();
  await page.waitForTimeout(1300);
  await cdp.send('Page.stopScreencast');
  const after = frames.filter((f) => f.t >= t0 - 0.05);
  const picks = Array.from({ length: 12 }, (_, i) => after[Math.min(after.length - 1, Math.round((i / 11) * (after.length - 1)))]).filter(Boolean);
  const imgs = await Promise.all(picks.map((p) => loadImage(Buffer.from(p.data, 'base64'))));
  const cw = sz.mobile ? 195 : 360, ch = Math.round(cw * (sz.h / sz.w)), cols = sz.mobile ? 6 : 4, rows = Math.ceil(imgs.length / cols);
  const cv = createCanvas(cols * (cw + 8) + 8, rows * (ch + 30) + 8);
  const g = cv.getContext('2d');
  g.fillStyle = '#777'; g.fillRect(0, 0, cv.width, cv.height);
  g.font = '14px sans-serif'; g.fillStyle = '#fff';
  imgs.forEach((im, i) => {
    const x = 8 + (i % cols) * (cw + 8), y = 8 + Math.floor(i / cols) * (ch + 30);
    g.drawImage(im, x, y + 18, cw, ch);
    g.fillText(`${Math.round((picks[i].t - t0) * 1000)} ms`, x, y + 13);
  });
  await writeFile(join(OUT, `swap__${name}__${scheme}__${sz.id}.jpg`), cv.toBuffer('image/jpeg', 80));
  console.log(`film ${name} ${scheme} ${sz.id}: ${after.length} frames, last at ${Math.round(((after.at(-1)?.t ?? t0) - t0) * 1000)} ms`);
  await context.close();
}
await browser.close();
