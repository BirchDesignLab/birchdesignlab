/**
 * Vaporwave B2 fix round 3, seat vw-fix-interact3: films for the phone
 * attract loop (kiosk.ts), the shaded 3D pipes (screensaver.ts) and the
 * caption press/leave/re-enter/release fix (windows.ts, theme.css).
 *
 * Written 09-26-26. Reuses scripts/themes/vaporwave/b2fix-vw-interact.mjs's
 * helpers (strip, newPage, GPU launch, portal-prompt suppression, clipOf,
 * viaSwitcher -- the real cross-school arrival through the portal's own
 * switcher dialog, not a synthetic link).
 *
 * Usage (serve a snap first, e.g. snap.mjs --name b2r3-vw-interact --port 4473):
 *   BDL_GPU=1 node scripts/themes/vaporwave/b2r3-vw-fix-interact3-probe.mjs \
 *     --base http://127.0.0.1:4473 [--only attract,pipes,caption,arrive]
 * Outputs: scripts/themes/.out/stage3-b2/vw-fix-interact3/
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'stage3-b2', 'vw-fix-interact3');
await mkdir(OUT, { recursive: true });
const argOf = (n, f) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? f : process.argv[i + 1]; };
const base = argOf('base', 'http://127.0.0.1:4473');
const only = (argOf('only', '') || '').split(',').filter(Boolean);
const want = (k) => only.length === 0 || only.includes(k);

const gpu = process.env.BDL_GPU === '1';
const browser = await chromium.launch({
  args: ['--hide-scrollbars', '--font-render-hinting=none', '--disable-lcd-text',
    ...(gpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : [])],
});
const results = {};
const problems = [];

async function newPage({ width = 1440, height = 900, scheme = 'dark', mobile = false } = {}) {
  const context = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: mobile ? 2 : 1,
    isMobile: mobile, hasTouch: mobile, colorScheme: scheme, reducedMotion: 'no-preference',
  });
  await suppressPrompt(context);
  await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); localStorage.setItem('theme', s); } catch {} }, scheme);
  await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(`${page.url()} ${m.type()}: ${m.text().slice(0, 200)}`); });
  page.on('pageerror', (e) => problems.push(`${page.url()} pageerror: ${e.message}`));
  return { context, page, cdp };
}

async function gpuCheck() {
  const { context, page } = await newPage();
  await page.goto('about:blank');
  const r = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
  });
  await context.close();
  console.log('renderer:', r);
  await writeFile(join(OUT, 'gpu.txt'), r + '\n');
  if (/swiftshader|llvmpipe/i.test(r)) { await browser.close(); throw new Error('software rasteriser'); }
}

async function strip(frames, labels, file, { maxW = 480, cols = frames.length } = {}) {
  const ims = await Promise.all(frames.map((b) => loadImage(b)));
  const scale = Math.min(1, maxW / ims[0].width);
  const w = Math.round(ims[0].width * scale), h = Math.round(ims[0].height * scale);
  const pad = 8, lab = 34;
  const rows = Math.ceil(ims.length / cols);
  const c = createCanvas(cols * (w + pad) + pad, rows * (h + lab + pad) + pad);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
  ims.forEach((im, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = pad + col * (w + pad);
    const y = pad + row * (h + lab + pad);
    ctx.fillStyle = '#111'; ctx.font = 'bold 20px sans-serif';
    ctx.fillText(labels[i] ?? '', x, y + 22);
    ctx.drawImage(im, x, y + lab, w, h);
  });
  await writeFile(join(OUT, file), await c.encode('jpeg', 92));
}

const clipOf = async (page, sel, padX = 40, padY = 40) => {
  const r = await page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; }, sel);
  if (!r) return null;
  const vw = page.viewportSize();
  const x = Math.max(0, r.x - padX), y = Math.max(0, r.y - padY);
  return { x, y, width: Math.min(vw.width - x, r.w + padX * 2), height: Math.min(vw.height - y, r.h + padY * 2) };
};

/** A real cross-school arrival, through the portal's own switcher dialog
    (as b2fix-vw-interact.mjs and the glassmorphism B2 critic probe do),
    clicking from the top of the page. */
async function viaSwitcher(page, school) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(150);
  await page.locator('.open[aria-haspopup="dialog"]').first().click();
  const link = page.locator(`a[data-school="${school}"]`).first();
  await link.waitFor({ state: 'visible', timeout: 5000 });
  await link.click();
}

await gpuCheck();

/* ---------- 1: the phone attract loop, filmed from the tap, not from a
   pre-scroll to .screen -- a visitor scrolls to reach the button, taps it
   from there, and the loop has to read from wherever that leaves them. ---- */
if (want('attract')) {
  results.attract = {};
  const vpFilter = argOf('vp', '');
  const schemeFilter = argOf('scheme', '');
  for (const [vpName, w, h, mobile] of [['phone', 390, 844, true], ['tablet', 820, 1180, true], ['desktop', 1440, 900, false]]) {
    if (vpFilter && vpName !== vpFilter) continue;
    for (const scheme of ['dark', 'light']) {
      if (schemeFilter && scheme !== schemeFilter) continue;
      console.log(`attract: starting ${scheme}-${vpName}`);
      const { context, page } = await newPage({ width: w, height: h, scheme, mobile });
      page.setDefaultTimeout(20000);
      try {
      await page.goto(`${base}/t/vaporwave/`, { waitUntil: 'load', timeout: 45000 });
      console.log(`attract: ${scheme}-${vpName} loaded`);
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      console.log(`attract: ${scheme}-${vpName} networkidle-or-timeout`);
      // Forcing img.decode() here reliably crashed the renderer under this
      // run's heavy concurrent GPU/tab load (many peer sessions sharing the
      // machine); a plain wait lets the same images decode the normal way
      // without that spike.
      await page.waitForTimeout(500);
      // Scroll the way a real visitor does: bring the BUTTON into view (the
      // thing they are about to tap), not the screen above it. On a phone
      // this leaves .screen mostly above the viewport -- the exact
      // situation the B2 re-critic caught as reading black.
      await page.evaluate(() => document.querySelector('[data-kiosk-attract-btn]')?.scrollIntoView({ block: 'center' }));
      await page.waitForTimeout(400);
      await page.evaluate(() => document.querySelector('[data-kiosk-attract-btn]')?.scrollIntoView({ block: 'center' }));
      await page.waitForTimeout(300);
      const preTapScroll = await page.evaluate(() => window.scrollY);
      const preTapScreen = await page.evaluate(() => {
        const r = document.querySelector('.screen').getBoundingClientRect();
        return { top: Math.round(r.top), bottom: Math.round(r.bottom) };
      });
      // Whole viewport, not clipped to .screen: what a real visitor's eyes
      // are actually pointed at is the button and whatever sits around it,
      // which is what needs to show the loop.
      const f0 = await page.screenshot();
      await page.click('[data-kiosk-attract-btn]');
      const tc = Date.now();
      const frames = [f0]; const labels = ['before tap'];
      for (const t of [150, 600, 1500, 3000, 4500, 5300, 6000]) {
        await page.waitForTimeout(Math.max(0, t - (Date.now() - tc)));
        frames.push(await page.screenshot()); labels.push(`+${(t / 1000).toFixed(1)}s`);
      }
      await strip(frames, labels, `attract-from-tap__${scheme}__${vpName}.jpg`, { maxW: vpName === 'phone' ? 220 : 300, cols: 4 });
      // Pixel-level check: does the VIEWPORT itself (not .screen's own box)
      // show non-background pixels during the loop, at the same scroll
      // position the visitor tapped from?
      const sample = async () => {
        const buf = await page.screenshot();
        const im = await loadImage(buf);
        const c = createCanvas(im.width, im.height);
        const cx = c.getContext('2d');
        cx.drawImage(im, 0, 0);
        const { data, width, height } = cx.getImageData(0, 0, im.width, im.height);
        let lit = 0;
        const total = width * height;
        for (let i = 0; i < data.length; i += 4 * 37) {
          if (data[i] > 40 || data[i + 1] > 40 || data[i + 2] > 40) lit++;
        }
        return lit / Math.ceil(total / 37);
      };
      await page.waitForTimeout(200);
      const litDuringLoop = await sample();
      await page.waitForTimeout(6200);
      const litAfterLoop = await sample();
      results.attract[`${scheme}-${vpName}`] = {
        scrollY: preTapScroll, screenRect: preTapScreen, litShareDuringLoop: litDuringLoop, litShareAfterLoop: litAfterLoop,
      };
      console.log(`attract: done ${scheme}-${vpName}`);
      } catch (e) {
        problems.push(`attract ${scheme}-${vpName} failed: ${e.message}`);
        console.log(`attract: FAILED ${scheme}-${vpName}: ${e.message}`);
      } finally {
        await context.close().catch(() => {});
      }
    }
  }
}

/* ---------- 2: pipes growth cycle, small window + Preview, 2x crop vs the
   old ribbed/eyed render (vw-recritic's own evidence) --------------------- */
if (want('pipes')) {
  results.pipes = {};
  for (const scheme of ['dark', 'light']) {
    const { context, page } = await newPage({ scheme });
    await page.goto(`${base}/t/vaporwave/contact/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.querySelector('.screensaver')?.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(500);
    const clip = await clipOf(page, '.screensaver', 16, 16);
    // Cycle Settings to pipes (sunset -> marble -> pipes).
    await page.click('[data-scr-settings]'); await page.waitForTimeout(300);
    await page.click('[data-scr-settings]'); await page.waitForTimeout(300);
    const growthFrames = []; const growthLabels = [];
    const t0 = Date.now();
    for (const t of [200, 2000, 5000, 9000, 13000, 16500]) {
      await page.waitForTimeout(Math.max(0, t - (Date.now() - t0)));
      growthFrames.push(await page.screenshot({ clip })); growthLabels.push(`+${(t / 1000).toFixed(1)}s`);
    }
    await strip(growthFrames, growthLabels, `pipes-growth-cycle__${scheme}.jpg`, { maxW: 260, cols: 3 });
    // Full-window Preview: this is where a single tube reads largest.
    await page.click('[data-scr-preview-btn]'); await page.waitForTimeout(1200);
    const pv1 = await page.screenshot();
    await page.waitForTimeout(1500);
    const pv2 = await page.screenshot();
    // A tight 2x crop on a straight run, well away from any elbow ball
    // joint, to show the tube's shading with no fine ribbing and no
    // "eyes" at the growing head.
    const canvasBox = await page.evaluate(() => {
      const c = document.querySelector('[data-scr-fs-canvas]');
      const r = c.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });
    // Find an actual tube in pv2 instead of guessing a fixed centre point
    // (pipes grow from random spawns, so a fixed crop often lands on empty
    // canvas): scan for a run of bright pixels in a row, which is a
    // horizontal tube segment, not just a joint dot.
    const cropW = 260, cropH = 200;
    const pv2Im = await loadImage(pv2);
    const pv2Canvas = createCanvas(pv2Im.width, pv2Im.height);
    const pv2Ctx = pv2Canvas.getContext('2d');
    pv2Ctx.drawImage(pv2Im, 0, 0);
    const { data: pv2Data, width: pv2W, height: pv2H } = pv2Ctx.getImageData(0, 0, pv2Im.width, pv2Im.height);
    let found = null;
    const runNeeded = 50;
    for (let y = Math.max(0, Math.round(canvasBox.y)); y < Math.min(pv2H, canvasBox.y + canvasBox.h) && !found; y += 3) {
      let run = 0;
      for (let x = Math.max(0, Math.round(canvasBox.x)); x < Math.min(pv2W, canvasBox.x + canvasBox.w); x++) {
        const i = (y * pv2W + x) * 4;
        const bright = pv2Data[i] > 55 || pv2Data[i + 1] > 55 || pv2Data[i + 2] > 55;
        if (bright) {
          run++;
          if (run >= runNeeded) { found = { x: x - Math.floor(run / 2), y }; break; }
        } else run = 0;
      }
    }
    const centre = found ?? { x: canvasBox.x + canvasBox.w * 0.5, y: canvasBox.y + canvasBox.h * 0.5 };
    const cropX = Math.max(0, Math.round(centre.x - cropW / 2));
    const cropY = Math.max(0, Math.round(centre.y - cropH / 2));
    const cropShot = await page.screenshot({ clip: { x: cropX, y: cropY, width: cropW, height: cropH } });
    // 2x upscale of the crop with @napi-rs/canvas (nearest-neighbour would
    // hide the shading; drawImage's default is bilinear, which is fine at
    // 2x for a visual "does the gradient look continuous" check).
    const cropIm = await loadImage(cropShot);
    const c2x = createCanvas(cropIm.width * 2, cropIm.height * 2);
    const c2xCtx = c2x.getContext('2d');
    c2xCtx.drawImage(cropIm, 0, 0, c2x.width, c2x.height);
    const newCropBuf = await c2x.encode('png');
    await writeFile(join(OUT, `pipes-2x-crop-new__${scheme}.png`), newCropBuf);
    await page.mouse.click(700, 450); await page.waitForTimeout(300);
    await strip([pv1, pv2], ['Preview: pipes t0', 'Preview: pipes +1.5s'], `pipes-preview-strip__${scheme}.jpg`, { maxW: 460, cols: 2 });
    results.pipes[scheme] = { canvasBox, cropRegion: { x: cropX, y: cropY, w: cropW, h: cropH } };
    await context.close();
  }
  // Side by side with the old (ribbed/eyed) render, if the earlier
  // evidence is still on disk (scripts/themes/.out/stage3-b2/vw-recritic/).
  try {
    const oldDark = await loadImage(join(HERE, '..', '.out', 'stage3-b2', 'vw-recritic', 'preview-pipes-1to1__dark.png'));
    const newDark = await loadImage(join(OUT, 'pipes-2x-crop-new__dark.png'));
    const h = Math.max(oldDark.height, newDark.height);
    const oldScale = h / oldDark.height, newScale = h / newDark.height;
    const ow = Math.round(oldDark.width * oldScale), nw = Math.round(newDark.width * newScale);
    const pad = 10, lab = 30;
    const c = createCanvas(ow + nw + pad * 3, h + lab + pad * 2);
    const cx = c.getContext('2d');
    cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, c.width, c.height);
    cx.fillStyle = '#111'; cx.font = 'bold 18px sans-serif';
    cx.fillText('OLD (vw-recritic): fine ribbing + eyed head', pad, lab - 6);
    cx.fillText('NEW (this fix): one continuous shaded tube', ow + pad * 2, lab - 6);
    cx.drawImage(oldDark, pad, lab + pad, ow, h);
    cx.drawImage(newDark, ow + pad * 2, lab + pad, nw, h);
    await writeFile(join(OUT, 'pipes-old-vs-new__dark.png'), await c.encode('png'));
  } catch (e) {
    problems.push(`old-vs-new pipes comparison skipped: ${e.message}`);
  }
}

/* ---------- 3: caption press, leave (while held), re-enter, release ---- */
if (want('caption')) {
  results.caption = {};
  const { context, page } = await newPage();
  await page.goto(`${base}/t/vaporwave/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.querySelector('.door-grid')?.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(500);
  const clip = await clipOf(page, '.door-grid', 120, 120);
  const cap = await page.evaluate(() => { const b = document.querySelector('.door-1 .vw-win-btns .min').getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
  const frames = []; const labels = [];
  const state = async () => page.evaluate(() => {
    const btn = document.querySelector('.door-1 .vw-win-btns .min');
    const win = document.querySelector('.door-1');
    return { pressed: btn.classList.contains('pressed'), transform: win.style.transform, dragging: win.classList.contains('dragging') };
  });

  frames.push(await page.screenshot({ clip })); labels.push('before');
  const s0 = await state();

  await page.mouse.move(cap.x, cap.y);
  await page.mouse.down();
  frames.push(await page.screenshot({ clip })); labels.push('down: pressed');
  const s1 = await state();

  // Drag the pointer 200px away without releasing -- the exact real
  // defect the B2 verifier caught (CSS :active alone stayed inverted).
  for (let i = 1; i <= 10; i++) await page.mouse.move(cap.x + i * 20, cap.y + i * 0);
  frames.push(await page.screenshot({ clip })); labels.push('held, moved 200px away: unpressed');
  const s2 = await state();

  // Re-enter the button's own coordinates while still held.
  await page.mouse.move(cap.x, cap.y);
  frames.push(await page.screenshot({ clip })); labels.push('re-entered, still held: pressed again');
  const s3 = await state();

  // Leave again, then release away from the button (up anywhere).
  for (let i = 1; i <= 10; i++) await page.mouse.move(cap.x + i * 20, cap.y + i * 0);
  await page.mouse.up();
  frames.push(await page.screenshot({ clip })); labels.push('released away from button: unpressed');
  const s4 = await state();

  // pointercancel path: press, then a touch-style cancel, must also clear.
  const touchLoc = await page.evaluate(() => { const b = document.querySelector('.door-1 .vw-win-btns .close').getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
  await page.mouse.move(touchLoc.x, touchLoc.y);
  await page.mouse.down();
  const s5 = await page.evaluate(() => document.querySelector('.door-1 .vw-win-btns .close').classList.contains('pressed'));
  await page.evaluate(() => document.querySelector('.door-1 .vw-win-btns .close').dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1, bubbles: true })));
  const s6 = await page.evaluate(() => document.querySelector('.door-1 .vw-win-btns .close').classList.contains('pressed'));
  await page.mouse.up();

  await strip(frames, labels, 'caption-press-leave-reenter-release__dark.jpg', { maxW: 380 });
  results.caption = {
    before: s0, down: s1, leftWhileHeld: s2, reenteredStillHeld: s3, releasedAway: s4,
    pointercancelPath: { pressedBeforeCancel: s5, pressedAfterCancel: s6 },
    neverDragged: [s0, s1, s2, s3, s4].every((s) => s.transform === '' && s.dragging === false),
  };
  await context.close();
}

/* ---------- 4: real cross-school arrival via the switcher ---------- */
if (want('arrive')) {
  results.arrive = {};
  for (const scheme of ['dark', 'light']) {
    for (const [route] of [['home'], ['contact']]) {
      const { context, page } = await newPage({ scheme });
      await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      const frames = []; const labels = [];
      frames.push(await page.screenshot()); labels.push('before (glassmorphism)');
      await viaSwitcher(page, 'vaporwave');
      const t0 = Date.now();
      for (const t of [200, 500, 1000]) {
        await page.waitForTimeout(Math.max(0, t - (Date.now() - t0)));
        frames.push(await page.screenshot()); labels.push(`+${t}ms`);
      }
      await page.waitForFunction(() => document.documentElement.dataset.theme === 'vaporwave', null, { timeout: 8000 }).catch(() => {});
      if (route === 'contact') {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.click('header a[href="/t/vaporwave/contact/"], nav a[href="/t/vaporwave/contact/"]').catch(async () => {
          await page.evaluate(() => document.querySelector('a[href="/t/vaporwave/contact/"]')?.click());
        });
        await page.waitForTimeout(1200);
      }
      await page.waitForTimeout(400);
      frames.push(await page.screenshot()); labels.push('settled');
      await strip(frames, labels, `arrive-${route}__${scheme}.jpg`, { maxW: 300, cols: 3 });
      const st = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, path: location.pathname, canvases: document.querySelectorAll('canvas').length }));
      results.arrive[`${scheme}-${route}`] = st;
      await context.close();
    }
  }
}

console.log(JSON.stringify(results, null, 1));
console.log('problems:', JSON.stringify([...new Set(problems)], null, 1));
await writeFile(join(OUT, 'results.json'), JSON.stringify({ results, problems: [...new Set(problems)] }, null, 1));
await browser.close();
