/**
 * What size are DevTools screencast frames, under each way of making a phone?
 *
 * scripts/measure-screen-recorders.mjs found that a context with an emulated
 * deviceScaleFactor of 3 delivers 390x844 frames: CSS pixels, not device pixels,
 * so a 1080-wide clip made from them is a 2.8x upscale. This probes the ways
 * round that, and keeps the result so the choice in lib/screen-record.mjs has
 * its evidence in the repo.
 *
 *   emulated  Playwright deviceScaleFactor 3 (what the first measurement used)
 *   native    a real window at 390x844 with --force-device-scale-factor=3 and no
 *             metrics override, so the compositor really is 1170x2532
 *   scaled    emulated 390x693 with Emulation's `scale` set to 1080/390
 *
 * Usage:  BDL_BASE=http://localhost:4400 BDL_GPU=1 node scripts/probe-screencast-resolution.mjs
 * Output: out/.probe-screencast/<variant>.jpg and a summary on stdout.
 */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { siteUrl } from '../lib/devserver.mjs';
import { GPU_ARGS, jpegSize, useGpu } from '../lib/screen-record.mjs';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'out', '.probe-screencast');
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const gpu = useGpu() ? GPU_ARGS : [];

async function grab(page, name, { width, height }) {
  const cdp = await page.context().newCDPSession(page);
  let first = null;
  cdp.on('Page.screencastFrame', ({ data, sessionId }) => {
    first ??= Buffer.from(data, 'base64');
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: width, maxHeight: height, everyNthFrame: 1 });
  await page.waitForTimeout(1500);
  // Make sure at least one frame is produced on a static page.
  await page.mouse.move(100, 100);
  await page.waitForTimeout(500);
  await cdp.send('Page.stopScreencast');
  if (!first) return { name, error: 'no frame' };
  await writeFile(path.join(OUT, `${name}.jpg`), first);
  const size = jpegSize(first);
  return { name, frame: `${size.width}x${size.height}`, kb: Math.round(first.length / 1024) };
}

const results = [];

{ // emulated
  const b = await chromium.launch({ args: ['--hide-scrollbars', ...gpu] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, colorScheme: 'dark' });
  const page = await ctx.newPage();
  await page.goto(siteUrl('/t/quiet/'), { waitUntil: 'networkidle' });
  results.push(await grab(page, 'emulated', { width: 1170, height: 2532 }));
  await b.close();
}

{ // native: a real device scale factor on the real window
  const b = await chromium.launch({ args: ['--hide-scrollbars', '--window-size=390,844', '--force-device-scale-factor=3', ...gpu] });
  const ctx = await b.newContext({ viewport: null, colorScheme: 'dark' });
  const page = await ctx.newPage();
  await page.goto(siteUrl('/t/quiet/'), { waitUntil: 'networkidle' });
  const seen = await page.evaluate(() => ({ w: innerWidth, h: innerHeight, dpr: devicePixelRatio }));
  const r = await grab(page, 'native', { width: 1170, height: 2532 });
  results.push({ ...r, page: `${seen.w}x${seen.h}@${seen.dpr}` });
  await b.close();
}

{ // scaled: the emulation's own view scale
  const b = await chromium.launch({ args: ['--hide-scrollbars', ...gpu] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 693 }, deviceScaleFactor: 1, colorScheme: 'dark' });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  const k = 1080 / 390;
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 390, height: 693, deviceScaleFactor: 1, mobile: false, scale: k,
    screenWidth: 1080, screenHeight: 1920, viewport: { x: 0, y: 0, width: 390, height: 693, scale: k },
  });
  await page.goto(siteUrl('/t/quiet/'), { waitUntil: 'networkidle' });
  results.push(await grab(page, 'scaled', { width: 1080, height: 1920 }));
  await b.close();
}

console.log(JSON.stringify(results, null, 2));
