/**
 * Film an in-school swap started from low down a page: scroll Home to the
 * bottom and click the footer's link to another page of the same school.
 *
 * Written 09-23-26 for Tier 3 stage 2 (the swiss follow-up). motion.mjs only
 * films swaps clicked from the top of a page, so anything a school keeps
 * pinned at the top of the viewport through an in-school swap (a named
 * header) was never seen over the old page's scrolled content. This films
 * every screencast frame from the click until the transition's `finished`
 * resolves plus 150 ms, full frame, and lays them out like a dense
 * motion.mjs strip.
 *
 * Usage (serve a build first; snap.mjs sets SNAP_BASE):
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name swiss-fu --reuse --port 4463 -- \
 *     node scripts/themes/probe-scrolled-swap.mjs --school swiss [--to about] \
 *     [--schemes dark,light] [--viewports desktop,mobile] [--label scrolled] [--top 160]
 * --top <px> lays out only the top <px> CSS px of each frame (the header
 * band), at full size, and the file name gains `__top`.
 * Output: scripts/themes/.out/<label>/<school>__scrolled-page__<scheme>__<viewport>[__top].png
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VIEWPORTS } from './capture.mjs';
import { suppressPrompt } from './lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const list = (name, fallback) => (arg(name, fallback) || '').split(',').filter(Boolean);

const base = arg('base', process.env.SNAP_BASE || 'http://127.0.0.1:8787').replace(/\/$/, '');
const school = arg('school', '');
const to = arg('to', 'about');
const schemes = list('schemes', 'dark,light');
const viewports = list('viewports', 'desktop,mobile');
const label = arg('label', 'scrolled');
const top = Number(arg('top', '0'));
if (!/^[a-z][a-z0-9-]{0,31}$/.test(school) || !/^[a-z][a-z0-9-]{0,31}$/.test(to)) {
  console.error('usage: node scripts/themes/probe-scrolled-swap.mjs --school <id> [--to about]');
  process.exit(1);
}

const useGpu = process.env.BDL_GPU === '1';
const browser = await chromium.launch({
  args: ['--hide-scrollbars', ...(useGpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : [])],
});
const outDir = join(HERE, '.out', label);
await mkdir(outDir, { recursive: true });
let failed = false;

/** Same layout as motion.mjs's dense sheets: every frame, time under each. */
async function sheet(frames, file, cols, cellW, title, vpWidth) {
  const images = await Promise.all(frames.map((f) => loadImage(Buffer.from(f.data, 'base64'))));
  const k = images[0].width / vpWidth;
  const srcH = top ? Math.min(images[0].height, top * k) : images[0].height;
  const cellH = Math.round((srcH / images[0].width) * cellW);
  const PAD = 12;
  const CAP = 26;
  const HEAD = CAP + PAD;
  const rows = Math.ceil(images.length / cols);
  const canvas = createCanvas(PAD + cols * (cellW + PAD), HEAD + PAD + rows * (cellH + CAP + PAD));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1b1b1d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = '600 15px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e8e6e1';
  ctx.fillText(title, PAD, PAD + CAP / 2);
  images.forEach((img, i) => {
    const x = PAD + (i % cols) * (cellW + PAD);
    const y = HEAD + PAD + Math.floor(i / cols) * (cellH + CAP + PAD);
    ctx.drawImage(img, 0, 0, img.width, srcH, x, y, cellW, cellH);
    ctx.fillStyle = '#e8e6e1';
    ctx.fillText(frames[i].ms < 0 ? 'before' : `+${frames[i].ms} ms`, x, y + cellH + CAP / 2);
  });
  await writeFile(file, await canvas.encode('png'));
}

for (const scheme of schemes) {
  for (const vpName of viewports) {
    const vp = VIEWPORTS[vpName];
    if (!vp) throw new Error(`unknown viewport ${vpName}`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.mobile ? 2 : 1,
      isMobile: !!vp.mobile,
      hasTouch: !!vp.mobile,
      colorScheme: scheme,
      reducedMotion: 'no-preference',
    });
    await context.addInitScript((s) => {
      try { localStorage.setItem('scheme', s); } catch {}
    }, scheme);
    await suppressPrompt(context);
    // Record the swap's own clock: when the transition started and finished.
    await context.addInitScript(() => {
      const orig = document.startViewTransition?.bind(document);
      if (!orig) return;
      window.__probe = { runs: [] };
      document.startViewTransition = (...a) => {
        const vt = orig(...a);
        const run = { at: Date.now(), ready: null, finished: null };
        window.__probe.runs.push(run);
        vt.ready.then(() => { run.ready = Date.now(); }, () => {});
        vt.finished.then(() => { run.finished = Date.now(); }, () => {});
        return vt;
      };
    });
    await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
    const page = await context.newPage();
    page.on('pageerror', (e) => { failed = true; console.log(`pageerror: ${e.message}`); });

    await page.goto(`${base}/t/${school}/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(600);
    const href = `/t/${school}/${to}/`;
    const link = page.locator(`footer a[href="${href}"]`).first();
    if (!(await link.count())) {
      failed = true;
      console.log(`${scheme} ${vpName}: no footer link to ${href}`);
      await context.close();
      continue;
    }

    const cdp = await context.newCDPSession(page);
    const frames = [];
    cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
      frames.push({ data, at: metadata.timestamp });
      try { await cdp.send('Page.screencastFrameAck', { sessionId }); } catch {}
    });
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, everyNthFrame: 1 });
    await page.waitForTimeout(250);
    if (!frames.length) {
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 92 });
      frames.push({ data, at: Date.now() / 1000 });
    }
    const t0 = await page.evaluate(() => Date.now());
    await link.click();
    await page
      .waitForFunction(() => window.__probe?.runs.some((r) => r.finished != null), null, { timeout: 4000 })
      .catch(() => {});
    await page.waitForTimeout(150);
    await cdp.send('Page.stopScreencast');
    await cdp.detach();
    const run = await page.evaluate(() => window.__probe?.runs.at(-1) ?? null);
    const before = frames.filter((f) => f.at * 1000 < t0).slice(-1);
    const after = frames.filter((f) => f.at * 1000 >= t0);
    const shown = [...before, ...after].map((f) => ({ ...f, ms: Math.round(f.at * 1000 - t0) }));
    const timing = run ? `ready +${run.ready - t0}, finished +${run.finished - t0}` : 'no transition seen';
    const file = join(outDir, `${school}__scrolled-page__${scheme}__${vpName}${top ? '__top' : ''}.png`);
    const cols = top ? (vp.mobile ? 4 : 2) : vp.mobile ? 8 : 5;
    const cellW = top ? (vp.mobile ? 390 : 720) : vp.mobile ? 200 : 300;
    await sheet(shown, file, cols, cellW,
      `${school} scrolled page swap (footer ${to}), ${scheme} ${vpName}: ${shown.length} frames, ${timing}`, vp.width);
    console.log(`${file}  (${shown.length} frames; ${timing})`);
    await context.close();
  }
}
await browser.close();
process.exit(failed ? 1 : 0);
