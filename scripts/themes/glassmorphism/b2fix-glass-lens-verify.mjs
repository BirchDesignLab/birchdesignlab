/**
 * Wave B2 fix round, seat glass-fix-lens: verification against the glass
 * critic's blocking #1-#3 plus the verification gap (layering, redraw,
 * start position, hit area, the identity/seam probes, and the scheme-flip
 * texture mismatch nit). Read-only against a snap already serving at
 * --base (this seat's own snap, port 4471).
 *
 * Usage: BDL_GPU=1 node scripts/themes/glassmorphism/b2fix-glass-lens-verify.mjs --base http://127.0.0.1:4471
 * Output: scripts/themes/.out/stage3-b2/glass-fix-lens/verify-results.json plus PNGs.
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

/** A PNG buffer's pixel data as {width, height, data (RGBA Uint8ClampedArray)}. */
async function readPng(buf) {
  const img = await loadImage(buf);
  const c = createCanvas(img.width, img.height);
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  return { width: img.width, height: img.height, data: g.getImageData(0, 0, img.width, img.height).data };
}

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'stage3-b2', 'glass-fix-lens');
const args = process.argv.slice(2);
const arg = (n, f) => { const i = args.indexOf(`--${n}`); return i === -1 ? f : args[i + 1]; };
const base = arg('base', 'http://127.0.0.1:4471');
const only = arg('only', '');
const want = (k) => !only || only.split(',').includes(k);
await mkdir(OUT, { recursive: true });
const R = {};

const browser = await chromium.launch({
  args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
});

async function ctx({ phone = false, width, height, scheme = 'light', rt = 'no-preference' } = {}) {
  const viewport = width ? { width, height } : phone ? { width: 390, height: 844 } : { width: 1440, height: 900 };
  const context = await browser.newContext(phone
    ? { viewport, deviceScaleFactor: 2, hasTouch: true, isMobile: true, colorScheme: scheme }
    : { viewport, deviceScaleFactor: 1, colorScheme: scheme });
  await suppressPrompt(context);
  await context.addInitScript((sch) => {
    try { localStorage.setItem('bdl-scheme', sch); } catch {}
    window.__draws = 0;
    const p = WebGLRenderingContext.prototype;
    const o = p.drawArrays;
    p.drawArrays = function (...a) { window.__draws++; return o.apply(this, a); };
    window.__rafCalls = 0;
    const r = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => { window.__rafCalls++; return r(cb); };
  }, scheme);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: rt }, { name: 'prefers-color-scheme', value: scheme }] });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  return { context, page, errors };
}

async function gpuCheck() {
  const { context, page } = await ctx();
  await page.goto('about:blank');
  const r = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl');
    const e = gl.getExtension('WEBGL_debug_renderer_info');
    return gl.getParameter(e.UNMASKED_RENDERER_WEBGL);
  });
  console.log('renderer:', r);
  R.renderer = r;
  await context.close();
  if (/swiftshader|llvmpipe/i.test(r)) throw new Error('software renderer; abort');
}
await gpuCheck();

async function mountWait(page) {
  return page.waitForFunction(() => document.querySelector('.lens-poster')?.style.display === 'none', { timeout: 10000 }).then(() => true).catch(() => false);
}

/** Reads live layout the same way lens.ts's own findStartPosition inputs do,
    plus the computed z-index values, so layering and start-position can be
    checked from one evaluate call. */
async function lensState(page) {
  return page.evaluate(() => {
    const host = document.querySelector('.lens-host');
    const hit = document.querySelector('.lens-hit');
    const canvas = document.querySelector('.lens-canvas');
    if (!hit || !canvas || !host) return null;
    const h = hit.getBoundingClientRect();
    const cx = h.left + h.width / 2, cy = h.top + h.height / 2;
    const radius = h.width / 2;
    const obstructions = [];
    const header = document.querySelector('.site-header');
    if (header) { const r = header.getBoundingClientRect(); if (r.width > 0 && r.height > 0) obstructions.push({ what: 'header', ...r.toJSON?.() ?? { left: r.left, top: r.top, right: r.right, bottom: r.bottom } }); }
    const tail = document.querySelector('[data-portal-tail]');
    if (tail) { const r = tail.getBoundingClientRect(); if (r.width > 0 && r.height > 0) obstructions.push({ what: 'portal-tail', left: r.left, top: r.top, right: r.right, bottom: r.bottom }); }
    for (const el of document.querySelectorAll('.glass')) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) obstructions.push({ what: el.className, left: r.left, top: r.top, right: r.right, bottom: r.bottom });
    }
    function circleRectOverlaps(px, py, pr, rect) {
      const nx = Math.min(Math.max(px, rect.left), rect.right);
      const ny = Math.min(Math.max(py, rect.top), rect.bottom);
      const dx = px - nx, dy = py - ny;
      return dx * dx + dy * dy < pr * pr;
    }
    const overlapping = obstructions.filter((o) => circleRectOverlaps(cx, cy, radius, o));
    const orbs = [...document.querySelectorAll('.orb')].map((o) => {
      const r = o.getBoundingClientRect();
      return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, r: r.width / 2 };
    });
    function crossesEdge(px, py, pr, ocx, ocy, or_) {
      const d = Math.hypot(px - ocx, py - ocy);
      return d < pr + or_ && d > Math.abs(pr - or_);
    }
    const crossing = orbs.filter((o) => crossesEdge(cx, cy, radius, o.cx, o.cy, o.r));
    return {
      lensStart: host.dataset.lensStart ?? null,
      cx: Math.round(cx), cy: Math.round(cy), radius: Math.round(radius),
      overlappingObstructionCount: overlapping.length,
      overlapping: overlapping.map((o) => o.what),
      crossingOrbCount: crossing.length,
      zCanvas: getComputedStyle(canvas).zIndex,
      zHit: getComputedStyle(hit).zIndex,
      zOrbs: getComputedStyle(document.querySelector('.orbs[data-js-driven]')).zIndex,
      zGlassWindow: getComputedStyle(document.querySelector('.hero .window')).zIndex,
    };
  });
}

/** README, item 3: five viewports, the start position must be open (no
    obstruction overlap) and cross an orb edge, at every one. */
async function startPositionAllSizes() {
  R.startPosition = {};
  const sizes = [
    { w: 1440, h: 900, phone: false },
    { w: 1280, h: 800, phone: false },
    { w: 1024, h: 768, phone: false },
    { w: 820, h: 1180, phone: false },
    { w: 390, h: 844, phone: true },
  ];
  for (const { w, h, phone } of sizes) {
    const { context, page } = await ctx({ phone, width: w, height: h });
    await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
    const ok = await mountWait(page);
    await page.waitForTimeout(300);
    const tag = `${w}x${h}`;
    const state = await lensState(page);
    await page.screenshot({ path: join(OUT, `start__${tag}.png`) });
    R.startPosition[tag] = { mounted: ok, ...state };
    await context.close();
  }
}

/** README, item 1 and 2: at rest the lens must cover its own orb (layering)
    and must not go stale on scroll or idle drift (redraw). Reuses the glass
    critic's own orbedge methodology (fresh / idle 4s / scrolled 120px). */
async function layeringAndRedraw() {
  R.layeringAndRedraw = {};
  for (const scheme of ['light', 'dark']) {
    const { context, page } = await ctx({ scheme });
    await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
    await mountWait(page);
    await page.waitForTimeout(400);
    const state = await lensState(page);
    // Drag onto the nearest crossable orb edge if the mount spot did not
    // already land on one (it should; this is belt and braces).
    const orb = await page.evaluate(() => {
      const os = [...document.querySelectorAll('.hero .orb')].map((o) => o.getBoundingClientRect());
      const hit = document.querySelector('.lens-hit').getBoundingClientRect();
      const cx = hit.left + hit.width / 2, cy = hit.top + hit.height / 2;
      os.sort((a, b) => Math.hypot(a.left + a.width / 2 - cx, a.top + a.height / 2 - cy) - Math.hypot(b.left + b.width / 2 - cx, b.top + b.height / 2 - cy));
      const o = os[0];
      return { cx: o.left + o.width / 2, cy: o.top + o.height / 2, r: o.width / 2 };
    });
    const hit = await page.$('.lens-hit');
    const b = await hit.boundingBox();
    const sx = b.x + b.width / 2, sy = b.y + b.height / 2;
    const tx = orb.cx - orb.r * 0.85, ty = Math.min(orb.cy - orb.r * 0.85, 700);
    await page.mouse.move(sx, sy); await page.mouse.down();
    for (let i = 1; i <= 20; i++) { await page.mouse.move(sx + (tx - sx) * i / 20, sy + (ty - sy) * i / 20); await page.waitForTimeout(16); }
    await page.waitForTimeout(150); await page.mouse.up(); await page.waitForTimeout(600);
    await page.mouse.move(720, 20);
    const crop = { x: Math.max(0, Math.round(tx - 220)), y: Math.max(0, Math.round(ty - 220)), width: 440, height: 440 };
    const shots = {};
    for (const tint of ['clear', 'tinted']) {
      if (tint === 'tinted') { await page.click('.hero .switch'); await page.mouse.move(720, 20); await page.waitForTimeout(500); }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(300);
      await page.screenshot({ path: join(OUT, `layer__${scheme}__${tint}__0-fresh.png`), clip: crop });
      // idle 4s: count draws, and measure whether the orb under the lens drifted
      await page.evaluate(() => { window.__draws = 0; });
      const before = await page.evaluate(() => { const o = document.querySelector('.hero .orb'); const r = o.getBoundingClientRect(); return [r.left, r.top]; });
      await page.waitForTimeout(4000);
      const after = await page.evaluate(() => { const o = document.querySelector('.hero .orb'); const r = o.getBoundingClientRect(); return [r.left, r.top]; });
      const idleDraws = await page.evaluate(() => window.__draws);
      const idleOrbDriftPx = Math.round(Math.hypot(after[0] - before[0], after[1] - before[1]));
      await page.screenshot({ path: join(OUT, `layer__${scheme}__${tint}__1-idle4s.png`), clip: crop });
      // scroll 120px: draws must be > 0 (the redraw fix)
      await page.evaluate(() => { window.__draws = 0; });
      for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 20); await page.waitForTimeout(30); }
      await page.waitForTimeout(300);
      const scrollDraws = await page.evaluate(() => window.__draws);
      await page.screenshot({ path: join(OUT, `layer__${scheme}__${tint}__2-scrolled120.png`), clip: crop });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(400);
      shots[tint] = { idleDrawsOver4s: idleDraws, idleOrbDriftPx, scrollDrawsOver120px: scrollDraws };
    }
    R.layeringAndRedraw[scheme] = { start: state, ...shots };
    await context.close();
  }
}

/** README, item 4: the hit control must never sit above a pane/text/the
    Control Centre, and a phone swipe on the hero copy must scroll the page. */
async function hitArea() {
  const { context, page } = await ctx();
  await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
  await mountWait(page);
  await page.waitForTimeout(300);
  const out = [];
  for (const y of [0, 500, 900, 1300, 1800, 2300]) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(250);
    out.push({ scrollY: y, ...(await page.evaluate(() => {
      const h = document.querySelector('.lens-hit').getBoundingClientRect();
      const cx = h.left + h.width / 2, cy = h.top + h.height / 2;
      const pts = [[cx, cy], [cx - 50, cy], [cx + 50, cy], [cx, cy - 50], [cx, cy + 50]];
      const blockedByPane = [];
      for (const [x, y] of pts) {
        const top = document.elementFromPoint(x, y);
        // A pane/text/control genuinely covering the lens's screen position
        // is topmost there and is NOT the lens-hit button itself (closest()
        // matches the element itself too, so excluding lens-hit up front
        // avoids the button trivially "blocking" itself wherever it is
        // correctly the topmost, visible thing).
        if (top && !top.classList.contains('lens-hit') && top.closest('.glass, a, button, input, p, h1, h2, h3, li')) {
          blockedByPane.push(`${top.tagName.toLowerCase()}.${[...top.classList].join('.')}`);
        }
      }
      return { lens: [Math.round(cx), Math.round(cy)], hitIsTopmostHere: document.elementFromPoint(cx, cy)?.classList.contains('lens-hit') ?? false, coveredByPaneOrText: blockedByPane };
    })) });
  }
  R.hitOverPanes = out;
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  R.hitAtTop = await page.evaluate(() => {
    const h = document.querySelector('.lens-hit').getBoundingClientRect();
    const cx = h.left + h.width / 2, cy = h.top + h.height / 2;
    const top = document.elementFromPoint(cx, cy);
    return { topClass: top?.className, cursor: getComputedStyle(top).cursor };
  });
  await context.close();

  // Phone: a swipe starting on the hero copy (not the lens) must scroll the
  // page; a swipe starting on the lens itself must not.
  const { context: pc, page: pp } = await ctx({ phone: true });
  await pp.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
  await mountWait(pp);
  await pp.waitForTimeout(300);
  const headingBox = await pp.locator('.hero h1.billboard').boundingBox();
  const before1 = await pp.evaluate(() => window.scrollY);
  await pp.touchscreen.tap(headingBox.x + headingBox.width / 2, headingBox.y + headingBox.height / 2);
  const cdp2 = await pc.newCDPSession(pp);
  await cdp2.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: headingBox.x + headingBox.width / 2, y: headingBox.y + headingBox.height / 2 }] });
  for (let i = 1; i <= 8; i++) {
    await cdp2.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: headingBox.x + headingBox.width / 2, y: headingBox.y + headingBox.height / 2 - i * 20 }] });
    await pp.waitForTimeout(16);
  }
  await cdp2.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await pp.waitForTimeout(300);
  const after1 = await pp.evaluate(() => window.scrollY);
  R.phoneSwipeOnHeroCopy = { before: before1, after: after1, scrolled: after1 > before1 };
  await pc.close();
}

/** README, item 5: identity at rest (max diff near 1 level) and seam offset
    while scrolling (median/max under 2 px). */
async function probes() {
  R.probes = {};
  // Identity: compare the lens's own model (canvas visible, ?lensProbe=identity)
  // against the true page with the canvas hidden, at the same pixel region.
  {
    const { context, page } = await ctx();
    await page.goto(`${base}/t/glassmorphism/?lensProbe=identity`, { waitUntil: 'networkidle' });
    await mountWait(page);
    await page.waitForTimeout(500);
    const box = await page.locator('.lens-canvas').boundingBox();
    const crop = { x: Math.max(0, Math.round(box.x + box.width * 0.15)), y: Math.max(0, Math.round(box.y + box.height * 0.15)), width: Math.round(box.width * 0.7), height: Math.round(box.height * 0.7) };
    const withLens = await page.screenshot({ clip: crop });
    await page.evaluate(() => { document.querySelector('.lens-canvas').style.visibility = 'hidden'; });
    await page.waitForTimeout(100);
    const withoutLens = await page.screenshot({ clip: crop });
    await page.evaluate(() => { document.querySelector('.lens-canvas').style.visibility = 'visible'; });
    const a = await readPng(withLens);
    const b = await readPng(withoutLens);
    let max = 0, sum = 0, n = 0, over8 = 0;
    for (let i = 0; i < a.data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        const d = Math.abs(a.data[i + c] - b.data[i + c]);
        max = Math.max(max, d); sum += d; n++;
        if (d > 8) over8++;
      }
    }
    R.probes.identity = { maxDiffLevel: max, meanDiffLevel: +(sum / n).toFixed(3), pctOver8: +((over8 / n) * 100).toFixed(3) };
    await page.screenshot({ path: join(OUT, 'probe-identity__with-lens.png'), clip: crop });
    await writeFile(join(OUT, 'probe-identity__without-lens.png'), withoutLens);

    // Diagnostic: the same check moved off any orb, over open wallpaper
    // only, to separate "does the wallpaper texture match the CSS
    // background" from "does an orb's flat modelled colour match its real
    // CSS gradient" (resolveOrbs/orbColorAt in lens.ts model each orb as a
    // single flat colour -- the gradient's `--lo` stop -- not its actual
    // two-stop `linear-gradient`, which is unchanged by this fix round).
    await page.focus('.lens-hit');
    for (let i = 0; i < 60; i++) await page.keyboard.press('Shift+ArrowUp');
    await page.waitForTimeout(300);
    const awayInfo = await page.evaluate(() => {
      const h = document.querySelector('.lens-hit').getBoundingClientRect();
      const cx = h.left + h.width / 2, cy = h.top + h.height / 2;
      const orbs = [...document.querySelectorAll('.orb')].map((o) => { const r = o.getBoundingClientRect(); return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, r: r.width / 2 }; });
      const nearestGap = Math.min(...orbs.map((o) => Math.hypot(o.cx - cx, o.cy - cy) - o.r - h.width / 2));
      return { cx, cy, nearestOrbGapPx: Math.round(nearestGap) };
    });
    const box2 = await page.locator('.lens-canvas').boundingBox();
    const crop2 = { x: Math.max(0, Math.round(box2.x + box2.width * 0.15)), y: Math.max(0, Math.round(box2.y + box2.height * 0.15)), width: Math.round(box2.width * 0.7), height: Math.round(box2.height * 0.7) };
    const withLens2 = await page.screenshot({ clip: crop2 });
    await page.evaluate(() => { document.querySelector('.lens-canvas').style.visibility = 'hidden'; });
    await page.waitForTimeout(100);
    const withoutLens2 = await page.screenshot({ clip: crop2 });
    await page.evaluate(() => { document.querySelector('.lens-canvas').style.visibility = 'visible'; });
    const a2 = await readPng(withLens2);
    const b2 = await readPng(withoutLens2);
    let max2 = 0, sum2 = 0, n2 = 0, over8b = 0;
    for (let i = 0; i < a2.data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        const d = Math.abs(a2.data[i + c] - b2.data[i + c]);
        max2 = Math.max(max2, d); sum2 += d; n2++;
        if (d > 8) over8b++;
      }
    }
    R.probes.identityAwayFromOrb = { ...awayInfo, maxDiffLevel: max2, meanDiffLevel: +(sum2 / n2).toFixed(3), pctOver8: +((over8b / n2) * 100).toFixed(3) };
    await page.screenshot({ path: join(OUT, 'probe-identity-away__with-lens.png'), clip: crop2 });
    await writeFile(join(OUT, 'probe-identity-away__without-lens.png'), withoutLens2);
    await context.close();
  }
  // Seam: drag the lens across an orb edge, then step-scroll (mouse wheel,
  // one screenshot per step -- the WebKit run's own method for exactly this
  // reason: it gives the main thread and compositor time to agree before
  // each shot, so a clean measurement needs a real scroll to have actually
  // happened between steps, not zero movement) and measure the vertical
  // offset between the model's orb edge (left of the clip seam) and the
  // real orb (right of it) at the seam x.
  {
    const { context, page } = await ctx();
    await page.goto(`${base}/t/glassmorphism/?lensProbe=seam`, { waitUntil: 'networkidle' });
    await mountWait(page);
    await page.waitForTimeout(400);
    const orb = await page.evaluate(() => {
      const o = [...document.querySelectorAll('.hero .orb')][0].getBoundingClientRect();
      return { cx: o.left + o.width / 2, cy: o.top + o.height / 2, r: o.width / 2 };
    });
    const hit = await page.$('.lens-hit');
    const b = await hit.boundingBox();
    const sx = b.x + b.width / 2, sy = b.y + b.height / 2;
    const tx = orb.cx, ty = orb.cy;
    await page.mouse.move(sx, sy); await page.mouse.down();
    for (let i = 1; i <= 15; i++) { await page.mouse.move(sx + (tx - sx) * i / 15, sy + (ty - sy) * i / 15); await page.waitForTimeout(16); }
    await page.waitForTimeout(150); await page.mouse.up(); await page.waitForTimeout(500);
    const offsets = [];
    // Scroll only as far as the glass critic's own orbedge check did (120px
    // total): far enough to move the orb a meaningful amount relative to
    // the page, not so far that it drifts out of the lens's own disc and
    // leaves the scan measuring the disc's own circular edge instead of the
    // orb's.
    for (let step = 0; step < 6; step++) {
      await page.mouse.wheel(0, 20);
      await page.waitForTimeout(80);
      const seamX = await page.evaluate(() => {
        const c = document.querySelector('.lens-canvas').getBoundingClientRect();
        return Math.round(c.left + c.width / 2);
      });
      const canvasBox = await page.locator('.lens-canvas').boundingBox();
      const scanTop = Math.max(0, Math.round(canvasBox.y));
      const scanH = Math.round(canvasBox.height);
      const shot = await page.screenshot({ clip: { x: seamX - 6, y: scanTop, width: 12, height: scanH } });
      await writeFile(join(OUT, `probe-seam__step${step}.png`), shot);
      const png = await readPng(shot);
      // Scan the left column (model) and right column (true page) for the
      // orb-colour edge (a big luminance jump), report their row difference.
      function edgeRow(colX) {
        let prevLum = null;
        for (let y = 1; y < png.height; y++) {
          const idx = (y * png.width + colX) * 4;
          const lum = png.data[idx] * 0.3 + png.data[idx + 1] * 0.59 + png.data[idx + 2] * 0.11;
          if (prevLum != null && Math.abs(lum - prevLum) > 30) return y;
          prevLum = lum;
        }
        return null;
      }
      const leftEdge = edgeRow(2);
      const rightEdge = edgeRow(png.width - 3);
      if (leftEdge != null && rightEdge != null) offsets.push(Math.abs(leftEdge - rightEdge));
    }
    offsets.sort((a, b2) => a - b2);
    const median = offsets.length ? offsets[Math.floor(offsets.length / 2)] : null;
    const max2 = offsets.length ? Math.max(...offsets) : null;
    R.probes.seam = { framesWithMeasurableEdge: offsets.length, offsets, medianOffsetPx: median, maxOffsetPx: max2 };
    await context.close();
  }
}

/** README, item 6: on a live scheme flip, the canvas must never show the
    OLD scheme's texture against the NEW CSS wallpaper. Two paths matter:
    - The Control Centre's tod buttons (home-boot.ts): these pre-decode the
      new file, THEN flip the CSS attribute and call lens.setTod() in the
      same synchronous stretch, so the canvas hides (loadTexture's own
      showPosterUntilReady) before the browser ever gets to paint the new
      CSS attribute with an unrevealed/old canvas -- there is no gap to
      observe by racing the click itself (the button's handler is async and
      has not run any of that yet the instant the click event returns), so
      this is checked for a settled, correct final state instead.
    - A direct `data-scheme` flip (the site's light/dark control, wherever it
      lives): only `schemeObserver` reacts, asynchronously. Two separate
      evaluate() calls straddle a microtask flush, so the second call
      observes the state after schemeObserver's callback has already run,
      before the browser's next paint -- exactly the moment that matters. */
async function schemeFlip() {
  const { context, page } = await ctx();
  await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
  await mountWait(page);
  await page.waitForTimeout(400);

  await page.click('.cc-seg[data-tod="dusk"]');
  await page.waitForTimeout(900);
  const todSettled = await page.evaluate(() => ({
    canvasVisibility: getComputedStyle(document.querySelector('.lens-canvas')).visibility,
    posterDisplay: getComputedStyle(document.querySelector('.lens-poster')).display,
    tod: document.documentElement.dataset.glassTod,
  }));

  await page.evaluate(() => { document.documentElement.dataset.scheme = document.documentElement.dataset.scheme === 'dark' ? 'light' : 'dark'; });
  const rightAfterFlip = await page.evaluate(() => getComputedStyle(document.querySelector('.lens-canvas')).visibility);
  await page.waitForTimeout(700);
  const afterFlipSettled = await page.evaluate(() => getComputedStyle(document.querySelector('.lens-canvas')).visibility);

  R.schemeFlip = {
    todButtonPath: todSettled,
    directSchemeFlip: { canvasVisibilityRightAfterMicrotaskFlush: rightAfterFlip, canvasVisibilityAfterSettle: afterFlipSettled },
  };
  await context.close();
}

if (want('gpu')) {} // already ran
if (want('start')) await startPositionAllSizes();
if (want('layer')) await layeringAndRedraw();
if (want('hit')) await hitArea();
if (want('probes')) await probes();
if (want('scheme')) await schemeFlip();

await browser.close();
await writeFile(join(OUT, 'verify-results.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
