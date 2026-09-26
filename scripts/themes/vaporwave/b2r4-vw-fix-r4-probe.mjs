/**
 * Vaporwave B2 fix round 4, seat vw-fix-r4: films and measurements for the
 * crisp 3D pipes fix (screensaver.ts), the no-scroll phone attract loop
 * (kiosk.ts, theme.css/Home.astro's .attract-content), and the caption
 * drag-off text-selection fix (windows.ts).
 *
 * Written 09-26-26. Structure borrowed from
 * scripts/themes/vaporwave/b2r3-vw-fix-interact3-probe.mjs (strip, newPage,
 * GPU launch, portal-prompt suppression, clipOf, viaSwitcher).
 *
 * Usage (serve a snap first, e.g. snap.mjs --name b2r4-vw-fix --port 4473):
 *   BDL_GPU=1 node scripts/themes/vaporwave/b2r4-vw-fix-r4-probe.mjs \
 *     --base http://127.0.0.1:4473 [--only pipes,attract,caption,arrive]
 * Outputs: scripts/themes/.out/stage3-b2/vw-fix-r4/
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'stage3-b2', 'vw-fix-r4');
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

/** A real cross-school arrival, through the portal's own switcher dialog. */
async function viaSwitcher(page, school) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(150);
  await page.locator('.open[aria-haspopup="dialog"]').first().click();
  const link = page.locator(`a[data-school="${school}"]`).first();
  await link.waitFor({ state: 'visible', timeout: 5000 });
  await link.click();
}

async function imageData(buf) {
  const im = await loadImage(buf);
  const c = createCanvas(im.width, im.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(im, 0, 0);
  return ctx.getImageData(0, 0, im.width, im.height);
}
const luma = (data, w, x, y) => {
  const i = (y * w + x) * 4;
  return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
};

await gpuCheck();

/* ---------- V1: crisp 3D pipes -- growth cycle in the Contact window and
   in Preview, light and dark; 2x elbow crops beside round 3's evidence; a
   luminance check across a run (rises then falls) and along a straight
   run (varies under 6 levels). ------------------------------------------ */
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

    // Full growth cycle in the small Contact window (PIPE_GEN_FRAMES=480 at
    // 30fps is about 16s before the field clears and restarts).
    const growthFrames = []; const growthLabels = [];
    const t0 = Date.now();
    for (const t of [200, 2000, 5000, 9000, 13000, 16500]) {
      await page.waitForTimeout(Math.max(0, t - (Date.now() - t0)));
      growthFrames.push(await page.screenshot({ clip })); growthLabels.push(`+${(t / 1000).toFixed(1)}s`);
    }
    await strip(growthFrames, growthLabels, `r4-pipes-window-growth__${scheme}.jpg`, { maxW: 260, cols: 3 });

    // Full-window Preview: where a tube reads largest.
    await page.click('[data-scr-preview-btn]'); await page.waitForTimeout(1200);
    const pv1 = await page.screenshot();
    await page.waitForTimeout(1500);
    const pv2 = await page.screenshot();
    await strip([pv1, pv2], ['Preview: pipes t0', 'Preview: pipes +1.5s'], `r4-pipes-preview-strip__${scheme}.jpg`, { maxW: 460, cols: 2 });

    const canvasBox = await page.evaluate(() => {
      const c = document.querySelector('[data-scr-fs-canvas]');
      const r = c.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });
    // Scan for a LONG horizontal run of bright pixels (a straight tube
    // segment well clear of its own ends, not a joint dot) to crop and to
    // measure, rather than guessing a fixed point -- pipes spawn at random
    // positions. The tube's own geometry (screensaver.ts's cell/lineW
    // formula, replicated here) sizes the margin excluded from each end so
    // the "along its length" sample never lands on a joint or a tip cap.
    const cellPx = Math.max(18, Math.min(canvasBox.w, canvasBox.h) / 14);
    const lineWPx = Math.max(6, cellPx * 0.42);
    const margin = Math.ceil(lineWPx * 1.6);
    const pv2Data = await imageData(pv2);
    const runNeeded = Math.round(margin * 2 + 40);
    let found = null;
    for (let y = Math.max(0, Math.round(canvasBox.y)); y < Math.min(pv2Data.height, canvasBox.y + canvasBox.h) && !found; y += 2) {
      let run = 0, runStart = 0;
      for (let x = Math.max(0, Math.round(canvasBox.x)); x < Math.min(pv2Data.width, canvasBox.x + canvasBox.w); x++) {
        const b = luma(pv2Data.data, pv2Data.width, x, y) > 55;
        if (b) { if (run === 0) runStart = x; run++; if (run >= runNeeded) { found = { xStart: runStart, xEnd: x, y }; break; } } else run = 0;
      }
    }
    if (found) {
      const midX = Math.round((found.xStart + found.xEnd) / 2);
      const cropW = 260, cropH = 200;
      const cropX = Math.max(0, midX - cropW / 2), cropY = Math.max(0, found.y - cropH / 2);
      const cropShot = await page.screenshot({ clip: { x: cropX, y: cropY, width: cropW, height: cropH } });
      const cropIm = await loadImage(cropShot);
      const c2x = createCanvas(cropIm.width * 2, cropIm.height * 2);
      c2x.getContext('2d').drawImage(cropIm, 0, 0, c2x.width, c2x.height);
      await writeFile(join(OUT, `r4-pipes-elbow-2x__${scheme}.png`), await c2x.encode('png'));

      // Luminance across the run's WIDTH (perpendicular to travel), sampled
      // at midX over a window wider than the tube: should rise then fall
      // (a single hump), not a flat band with a hard step (the old halo).
      const halfSpan = 40;
      const widthProfile = [];
      for (let dy = -halfSpan; dy <= halfSpan; dy++) {
        const y = found.y + dy;
        if (y < 0 || y >= pv2Data.height) continue;
        widthProfile.push(luma(pv2Data.data, pv2Data.width, midX, y));
      }
      let peakIdx = 0;
      for (let i = 1; i < widthProfile.length; i++) if (widthProfile[i] > widthProfile[peakIdx]) peakIdx = i;
      // Tolerant monotonicity: count out-of-order adjacent steps against a
      // small tolerance, on each side of the peak.
      let risingViolations = 0, fallingViolations = 0;
      for (let i = 1; i <= peakIdx; i++) if (widthProfile[i] < widthProfile[i - 1] - 3) risingViolations++;
      for (let i = peakIdx + 1; i < widthProfile.length; i++) if (widthProfile[i] > widthProfile[i - 1] + 3) fallingViolations++;
      const risesThenFalls = risingViolations <= 1 && fallingViolations <= 1;

      // Luminance ALONG the run's length at a fixed cross-section offset
      // (the same relative row, `found.y`), sampled at several x well clear
      // of both ends (the `margin` excludes the joint at the start and the
      // round-capped tip): should vary under 6 levels if the run is
      // straight and the gradient anchor is fixed (not drifting frame to
      // frame or along the tube).
      const usableStart = found.xStart + margin, usableEnd = found.xEnd - margin;
      const lengthXs = usableEnd - usableStart >= 12
        ? [0.15, 0.38, 0.62, 0.85].map((f) => Math.round(usableStart + (usableEnd - usableStart) * f))
        : [];
      const lengthProfile = lengthXs.map((x) => luma(pv2Data.data, pv2Data.width, x, found.y));
      const lengthSpread = lengthProfile.length ? Math.max(...lengthProfile) - Math.min(...lengthProfile) : null;

      results.pipes[scheme] = {
        elbowFound: found, canvasBox, margin: Math.round(margin), widthProfile: widthProfile.map((v) => Math.round(v)),
        risesThenFalls, risingViolations, fallingViolations,
        lengthXs, lengthProfile: lengthProfile.map((v) => Math.round(v)),
        lengthSpread: lengthSpread === null ? null : Math.round(lengthSpread * 10) / 10,
        lengthUnder6: lengthSpread === null ? null : lengthSpread < 6,
      };
      if (lengthSpread === null) problems.push(`pipes ${scheme}: found run too short for a margin-clear length sample (span ${found.xEnd - found.xStart}, margin ${margin})`);
    } else {
      results.pipes[scheme] = { elbowFound: null, note: 'no bright horizontal run found in this window' };
      problems.push(`pipes ${scheme}: no straight run found for the luminance check`);
    }
    await page.mouse.click(700, 450); await page.waitForTimeout(300);
    await context.close();
  }
  // Side by side with round 3's own evidence (the flat halo band / occluded
  // joints), if still on disk.
  try {
    const oldDark = await loadImage(join(HERE, '..', '.out', 'stage3-b2', 'vw-recritic-r3', 'r3-pipes-preview-2x__dark.png'));
    const newDark = await loadImage(join(OUT, 'r4-pipes-elbow-2x__dark.png'));
    const h = Math.max(oldDark.height, newDark.height);
    const oldScale = h / oldDark.height, newScale = h / newDark.height;
    const ow = Math.round(oldDark.width * oldScale), nw = Math.round(newDark.width * newScale);
    const pad = 10, lab = 34;
    const c = createCanvas(ow + nw + pad * 3, h + lab + pad * 2);
    const cx = c.getContext('2d');
    cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, c.width, c.height);
    cx.fillStyle = '#111'; cx.font = 'bold 18px sans-serif';
    cx.fillText('ROUND 3 (blocked): opaque halo buries the elbow joint', pad, lab - 6);
    cx.fillText('ROUND 4 (this fix): rim + joint drawn on top every frame', ow + pad * 2, lab - 6);
    cx.drawImage(oldDark, pad, lab + pad, ow, h);
    cx.drawImage(newDark, ow + pad * 2, lab + pad, nw, h);
    await writeFile(join(OUT, 'r4-pipes-old-vs-new__dark.png'), await c.encode('png'));
  } catch (e) {
    problems.push(`old-vs-new pipes comparison skipped: ${e.message}`);
  }
}

/* ---------- V2: the phone attract loop, no scroll -- filmed from the tap,
   window.scrollY logged before/after, content sampled every 500ms in the
   part of the CRT that is actually on screen; the desktop loop unchanged. */
if (want('attract')) {
  results.attract = {};
  for (const [vpName, w, h, mobile] of [['390', 390, 844, true], ['820', 820, 1180, true], ['desktop', 1440, 900, false]]) {
    for (const scheme of ['dark', 'light']) {
      console.log(`attract: starting ${scheme}-${vpName}`);
      const { context, page } = await newPage({ width: w, height: h, scheme, mobile });
      page.setDefaultTimeout(20000);
      try {
        await page.goto(`${base}/t/vaporwave/`, { waitUntil: 'load', timeout: 45000 });
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(500);
        // A real visitor scrolls down to reach the button; this is THEIR
        // scroll, not the tap's -- the tap itself must leave scrollY alone.
        await page.evaluate(() => document.querySelector('[data-kiosk-attract-btn]')?.scrollIntoView({ block: 'center' }));
        await page.waitForTimeout(400);
        const preTapScroll = await page.evaluate(() => window.scrollY);
        const f0 = await page.screenshot();
        await page.click('[data-kiosk-attract-btn]');
        const postTapScroll = await page.evaluate(() => window.scrollY);
        const scrollUnchanged = postTapScroll === preTapScroll;

        // Sample every ~500ms through the ~5.2s loop: is the attract content
        // (marquee + kana) inside the part of the CRT screen that is
        // actually within the viewport right now?
        const samples = [];
        const tc = Date.now();
        for (const t of [0, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000]) {
          await page.waitForTimeout(Math.max(0, t - (Date.now() - tc)));
          const st = await page.evaluate(() => {
            const content = document.querySelector('.attract-content');
            const screenEl = document.querySelector('[data-kiosk-attract-screen]');
            if (!content || !screenEl) return null;
            const cr = content.getBoundingClientRect();
            const visTop = Math.max(cr.top, 0), visBottom = Math.min(cr.bottom, innerHeight);
            const visLeft = Math.max(cr.left, 0), visRight = Math.min(cr.right, innerWidth);
            const overlapArea = Math.max(0, visBottom - visTop) * Math.max(0, visRight - visLeft);
            return {
              scrollY: window.scrollY,
              contentRect: [Math.round(cr.top), Math.round(cr.bottom), Math.round(cr.left), Math.round(cr.right)],
              overlapArea: Math.round(overlapArea),
              contentArea: Math.round(cr.width * cr.height),
              onScreenShare: cr.width * cr.height > 0 ? overlapArea / (cr.width * cr.height) : 0,
            };
          });
          samples.push({ t, ...st });
        }
        const worstShare = Math.min(...samples.map((s) => s.onScreenShare ?? 0));
        const allOnScreen = samples.every((s) => (s.onScreenShare ?? 0) > 0.5);

        const frames = [f0]; const labels = ['before tap'];
        for (const t of [150, 1000, 3000, 5300]) {
          frames.push(await page.screenshot());
          labels.push(`+${(t / 1000).toFixed(1)}s`);
        }
        await strip(frames, labels, `r4-attract__${scheme}__${vpName}.jpg`, { maxW: vpName === 'desktop' ? 300 : 220, cols: 4 });

        const canvasCount = await page.evaluate(() => document.querySelectorAll('canvas').length);
        results.attract[`${scheme}-${vpName}`] = {
          preTapScroll, postTapScroll, scrollUnchanged, worstShare, allOnScreen, canvasCount, samples,
        };
        console.log(`attract: done ${scheme}-${vpName} scrollUnchanged=${scrollUnchanged} allOnScreen=${allOnScreen} worstShare=${worstShare.toFixed(2)}`);
        if (!scrollUnchanged) problems.push(`attract ${scheme}-${vpName}: scrollY changed on tap (${preTapScroll} -> ${postTapScroll})`);
        if (!allOnScreen) problems.push(`attract ${scheme}-${vpName}: attract content not fully on screen at some sample (worst ${worstShare.toFixed(2)})`);
      } catch (e) {
        problems.push(`attract ${scheme}-${vpName} failed: ${e.message}`);
        console.log(`attract: FAILED ${scheme}-${vpName}: ${e.message}`);
      } finally {
        await context.close().catch(() => {});
      }
    }
  }
}

/* ---------- V3: caption press, leave, re-enter, release away -- with
   document.getSelection().toString().length logged at every step. -------- */
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
    const sel = document.getSelection();
    return {
      pressed: btn.classList.contains('pressed'),
      transform: win.style.transform,
      dragging: win.classList.contains('dragging'),
      selectionLength: sel ? sel.toString().length : 0,
    };
  });

  frames.push(await page.screenshot({ clip })); labels.push('before');
  const s0 = await state();

  await page.mouse.move(cap.x, cap.y);
  await page.mouse.down();
  frames.push(await page.screenshot({ clip })); labels.push('down: pressed');
  const s1 = await state();

  // Drag the pointer 200px away, over nearby text, without releasing -- the
  // exact motion the round-3 critic caught selecting ~9 characters.
  for (let i = 1; i <= 10; i++) await page.mouse.move(cap.x + i * 20, cap.y + i * 0);
  frames.push(await page.screenshot({ clip })); labels.push('held, moved 200px away');
  const s2 = await state();

  // Re-enter the button's own coordinates while still held.
  await page.mouse.move(cap.x, cap.y);
  frames.push(await page.screenshot({ clip })); labels.push('re-entered, still held');
  const s3 = await state();

  // Leave again, then release away from the button.
  for (let i = 1; i <= 10; i++) await page.mouse.move(cap.x + i * 20, cap.y + i * 0);
  await page.mouse.up();
  frames.push(await page.screenshot({ clip })); labels.push('released away from button');
  const s4 = await state();

  await strip(frames, labels, 'r4-caption-press-leave-reenter-release__dark.jpg', { maxW: 380 });
  const allZero = [s0, s1, s2, s3, s4].every((s) => s.selectionLength === 0);
  const neverDragged = [s0, s1, s2, s3, s4].every((s) => s.transform === '' && s.dragging === false);
  results.caption = {
    before: s0, down: s1, leftWhileHeld: s2, reenteredStillHeld: s3, releasedAway: s4,
    allSelectionLengthsZero: allZero, neverDragged,
  };
  if (!allZero) problems.push(`caption: a non-zero selection length appeared (${JSON.stringify([s0, s1, s2, s3, s4].map((s) => s.selectionLength))})`);
  await context.close();
}

/* ---------- cross-school arrival via the real switcher ---------- */
if (want('arrive')) {
  results.arrive = {};
  for (const scheme of ['dark', 'light']) {
    for (const route of ['home', 'contact']) {
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
      await strip(frames, labels, `r4-arrive-${route}__${scheme}.jpg`, { maxW: 300, cols: 3 });
      const st = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, path: location.pathname, canvases: document.querySelectorAll('canvas').length }));
      results.arrive[`${scheme}-${route}`] = st;
      await context.close();
    }
  }
}

/* ---------- Keep-list check: the CRT's real links stay reachable by
   keyboard throughout the attract loop and after it ends (unchanged code
   path, but cheap to confirm since this round touches the same overlay). */
if (want('reach')) {
  const { context, page } = await newPage({ width: 390, height: 844, mobile: true });
  await page.goto(`${base}/t/vaporwave/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const linkState = () => page.evaluate(() => {
    const links = [...document.querySelectorAll('.specimens a, .crt-more')];
    return links.map((a) => ({
      text: a.textContent.trim().slice(0, 24),
      hiddenAncestor: !!a.closest('[aria-hidden="true"]'),
      tabIndex: a.tabIndex,
      focusable: a.tabIndex >= 0 && !a.closest('[aria-hidden="true"]'),
    }));
  });
  const before = await linkState();
  await page.evaluate(() => document.querySelector('[data-kiosk-attract-btn]')?.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(300);
  await page.click('[data-kiosk-attract-btn]');
  await page.waitForTimeout(800);
  const during = await linkState();
  await page.waitForTimeout(5500);
  const after = await linkState();
  results.reach = { before, during, after };
  const allFocusableAlways = [before, during, after].every((set) => set.every((l) => l.focusable));
  results.reach.allFocusableThroughout = allFocusableAlways;
  if (!allFocusableAlways) problems.push('reach: a CRT link lost focusability during or after the attract loop');
  console.log('reach: allFocusableThroughout =', allFocusableAlways);
  await context.close();
}

console.log(JSON.stringify(results, null, 1));
console.log('problems:', JSON.stringify([...new Set(problems)], null, 1));
await writeFile(join(OUT, 'results.json'), JSON.stringify({ results, problems: [...new Set(problems)] }, null, 1));
await browser.close();
