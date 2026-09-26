/**
 * Wave B2 fix round, seat glass-fix-lens: the required films. GPU Chromium,
 * real input driven through Playwright, timestamped frame strips (a labelled
 * PNG/JPEG sheet, per the brief's definition of "film"; the timestamps are
 * the actual measured elapsed ms from a `performance.now()`/`Date.now()`
 * read each frame, not a fixed schedule, since real navigation and layout
 * work take a variable amount of wall-clock time frame to frame).
 *
 * Usage: BDL_GPU=1 node scripts/themes/glassmorphism/b2fix-glass-lens-films.mjs --base http://127.0.0.1:4471
 * Output: scripts/themes/.out/stage3-b2/glass-fix-lens/*.jpg
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'stage3-b2', 'glass-fix-lens');
const args = process.argv.slice(2);
const arg = (n, f) => { const i = args.indexOf(`--${n}`); return i === -1 ? f : args[i + 1]; };
const base = arg('base', 'http://127.0.0.1:4471');
const only = arg('only', '');
const want = (k) => !only || only.split(',').includes(k);
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
});

async function ctx({ phone = false, width, height, scheme = 'light' } = {}) {
  const viewport = width ? { width, height } : phone ? { width: 390, height: 844 } : { width: 1440, height: 900 };
  const context = await browser.newContext(phone
    ? { viewport, deviceScaleFactor: 2, hasTouch: true, isMobile: true, colorScheme: scheme }
    : { viewport, deviceScaleFactor: 1, colorScheme: scheme });
  await suppressPrompt(context);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }, { name: 'prefers-color-scheme', value: scheme }] });
  return { context, page };
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
  await context.close();
  if (/swiftshader|llvmpipe/i.test(r)) throw new Error('software renderer; abort');
}
await gpuCheck();

async function mountWait(page) {
  return page.waitForFunction(() => document.querySelector('.lens-poster')?.style.display === 'none', { timeout: 10000 }).then(() => true).catch(() => false);
}

/** Lays out frames (each {label, buf, w, h}) in a row, a caption above each,
    and an optional title above the whole sheet. Matches compare-strips.mjs's
    look (600 20px sans-serif labels, #111113 background) generalised to N
    frames in one row, wrapping to a new row past `perRow`. */
async function composeStrip(frames, outPath, { title = '', perRow = 6, quality = 90 } = {}) {
  const PAD = 16, HEAD = title ? 44 : 0, TAG = 32;
  const cellW = Math.max(...frames.map((f) => f.w));
  const cellH = Math.max(...frames.map((f) => f.h));
  const rows = Math.ceil(frames.length / perRow);
  const cols = Math.min(perRow, frames.length);
  const width = cols * cellW + (cols + 1) * PAD;
  const height = HEAD + rows * (TAG + cellH + PAD) + PAD;
  const canvas = createCanvas(width, height);
  const c = canvas.getContext('2d');
  c.fillStyle = '#111113';
  c.fillRect(0, 0, width, height);
  if (title) {
    c.fillStyle = '#f2f2f5';
    c.font = '600 20px sans-serif';
    c.fillText(title, PAD, HEAD / 2 + 4);
  }
  for (let i = 0; i < frames.length; i++) {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const x = PAD + col * (cellW + PAD);
    const y = HEAD + PAD + row * (TAG + cellH + PAD);
    c.fillStyle = '#c9c9d6';
    c.font = '600 20px sans-serif';
    c.fillText(frames[i].label, x, y + TAG / 2 + 6);
    const img = await loadImage(frames[i].buf);
    c.drawImage(img, x, y + TAG, frames[i].w, frames[i].h);
  }
  await writeFile(outPath, canvas.toBuffer('image/jpeg', quality));
}

/** README, films: "the lens over an orb edge while scrolling (clear and
    tinted, light and dark)", crop following the lens (open item D of the
    fix round: the first run's strip scrolled 400px total -- far more than
    the ~92px radius the lens can reach -- so the orb (moving at up to 0.55x
    of page scroll, theme.css's --scroll-rate) travelled clean out of the
    lens's crossing range by the third frame, and the strip's FIXED crop was
    also centred on the pre-drag mouse TARGET (tx, ty) rather than the lens's
    actual post-clamp resting spot, which can differ by tens of px (the
    lens's travel bounds keep it clear of the header). Measured (this fix
    round, `b2fix-glass-lens-verify.mjs`'s own hitOverPanes/layeringAndRedraw
    checks and a live probe): the lens itself never moves on screen while the
    page scrolls (`.lens-hit`'s getBoundingClientRect is bit-identical before
    and after 400px of scroll -- it is genuinely `position: fixed`, not a
    stale claim), so "losing the lens" was really "the orb it was bending
    scrolled away, leaving a WebGL lens over plain wallpaper, which barely
    shows without a crisp edge to bend" -- expected once the orb leaves, not
    a positioning bug. The fix: (1) crop from the lens's REAL resting centre,
    read from the DOM after the drag settles, not the pre-drag mouse target;
    (2) scroll only as far as the redraw check already validates (120px,
    matching layeringAndRedraw's own "6 draws over 120px scroll" and the
    critic's original orbedge methodology), so the orb's ~66px of relative
    travel at 0.55x stays inside the lens's 92px radius for every frame. */
async function orbEdgeScrollFilm() {
  for (const scheme of ['light', 'dark']) {
    const { context, page } = await ctx({ scheme });
    await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
    await mountWait(page);
    await page.waitForTimeout(400);
    const orb = await page.evaluate(() => {
      const o = [...document.querySelectorAll('.hero .orb')].map((el) => el.getBoundingClientRect())
        .sort((a, b) => a.top - b.top)[0];
      return { cx: o.left + o.width / 2, cy: o.top + o.height / 2, r: o.width / 2 };
    });
    const hit = await page.$('.lens-hit');
    const b = await hit.boundingBox();
    const sx = b.x + b.width / 2, sy = b.y + b.height / 2;
    const tx = orb.cx - orb.r * 0.8, ty = Math.min(orb.cy - orb.r * 0.8, 700);
    await page.mouse.move(sx, sy); await page.mouse.down();
    for (let i = 1; i <= 15; i++) { await page.mouse.move(sx + (tx - sx) * i / 15, sy + (ty - sy) * i / 15); await page.waitForTimeout(16); }
    await page.waitForTimeout(150); await page.mouse.up(); await page.waitForTimeout(500);
    await page.mouse.move(720, 20);
    // The lens's ACTUAL resting centre (post-clamp), not the pre-drag mouse
    // target: computeBounds() can pull the final position tens of px from
    // (tx, ty) (the header inset, the wall inset), and since the lens never
    // moves again on scroll, this one read is valid for the whole strip.
    const restBox = await page.locator('.lens-hit').boundingBox();
    const lcx = restBox.x + restBox.width / 2, lcy = restBox.y + restBox.height / 2;
    const crop = { x: Math.max(0, Math.round(lcx - 210)), y: Math.max(0, Math.round(lcy - 210)), width: 420, height: 420 };
    for (const tint of ['clear', 'tinted']) {
      if (tint === 'tinted') { await page.click('.hero .switch'); await page.mouse.move(720, 20); await page.waitForTimeout(500); }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(300);
      const t0 = Date.now();
      const frames = [];
      const shot = async (label) => {
        const buf = await page.screenshot({ clip: crop });
        frames.push({ label, buf, w: crop.width, h: crop.height });
      };
      await shot(`t+${Date.now() - t0}ms sy=0`);
      // 6 steps of 20px = 120px total (the redraw check's own scroll
      // distance): far enough to show the orb sweep across the lens and the
      // redraw keep up with it, not so far the orb leaves the lens's reach.
      for (let step = 0; step < 6; step++) {
        await page.mouse.wheel(0, 20);
        await page.waitForTimeout(90);
        const sy = await page.evaluate(() => window.scrollY);
        await shot(`t+${Date.now() - t0}ms sy=${sy}`);
      }
      await composeStrip(frames, join(OUT, `film__orbedge-scroll__${scheme}__${tint}.jpg`), {
        title: `Lens over an orb edge while scrolling -- ${scheme}, ${tint}`,
      });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(300);
    }
    await context.close();
  }
}

/** README, films: "a 4x rim crop over an orb edge" (open item A's evidence:
    proves whether the lens's own copy of the orb reads as a seam against the
    true orb at the rim, at a size a founder can actually judge by eye). Drags
    the lens onto the same orb edge the orb-edge-scroll film uses, then crops
    a small square straddling the lens's rim where it crosses the orb's true
    edge and upscales it 4x with nearest-neighbour sampling (no smoothing, so
    the crop shows real pixels, not an interpolated blur that would hide or
    invent a seam). Light and dark, Clear only (Tinted's frost intentionally
    changes the rim's look; the seam check is about position, not tint). */
async function rimCrop4xFilm() {
  const frames = [];
  for (const scheme of ['light', 'dark']) {
    const { context, page } = await ctx({ scheme });
    await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
    await mountWait(page);
    await page.waitForTimeout(400);
    const orb = await page.evaluate(() => {
      const o = [...document.querySelectorAll('.hero .orb')].map((el) => el.getBoundingClientRect())
        .sort((a, b) => a.top - b.top)[0];
      return { cx: o.left + o.width / 2, cy: o.top + o.height / 2, r: o.width / 2 };
    });
    const hit = await page.$('.lens-hit');
    const b = await hit.boundingBox();
    const sx = b.x + b.width / 2, sy = b.y + b.height / 2;
    const tx = orb.cx - orb.r * 0.8, ty = Math.min(orb.cy - orb.r * 0.8, 700);
    await page.mouse.move(sx, sy); await page.mouse.down();
    for (let i = 1; i <= 15; i++) { await page.mouse.move(sx + (tx - sx) * i / 15, sy + (ty - sy) * i / 15); await page.waitForTimeout(16); }
    await page.waitForTimeout(150); await page.mouse.up(); await page.waitForTimeout(500);
    await page.mouse.move(720, 20);
    // The actual intersection of the two circles (the lens's own boundary
    // and the orb's true edge): standard circle-circle intersection, not a
    // guess along the centre line. This is the exact point where the lens's
    // bent copy of the orb edge and the true, unbent orb edge outside the
    // lens meet -- where a seam would genuinely show, if there is one.
    const rimPoint = await page.evaluate((orbIn) => {
      const h = document.querySelector('.lens-hit').getBoundingClientRect();
      const lcx = h.left + h.width / 2, lcy = h.top + h.height / 2, lr = h.width / 2;
      const dx = orbIn.cx - lcx, dy = orbIn.cy - lcy;
      const d = Math.hypot(dx, dy);
      const a = (lr * lr - orbIn.r * orbIn.r + d * d) / (2 * d);
      const hh = Math.sqrt(Math.max(0, lr * lr - a * a));
      const mx = lcx + (a * dx) / d, my = lcy + (a * dy) / d;
      const rx = -dy / d, ry = dx / d;
      // Either intersection point works (the circles are symmetric about
      // the centre line); the +h one is fine.
      return { x: mx + hh * rx, y: my + hh * ry };
    }, orb);
    const zoomSrc = 50; // px of source captured, then upscaled 4x
    const crop = { x: Math.max(0, Math.round(rimPoint.x - zoomSrc / 2)), y: Math.max(0, Math.round(rimPoint.y - zoomSrc / 2)), width: zoomSrc, height: zoomSrc };
    const buf = await page.screenshot({ clip: crop });
    const img = await loadImage(buf);
    const zoomed = createCanvas(zoomSrc * 4, zoomSrc * 4);
    const zg = zoomed.getContext('2d');
    zg.imageSmoothingEnabled = false; // nearest-neighbour: real pixels, no invented blur
    zg.drawImage(img, 0, 0, zoomSrc * 4, zoomSrc * 4);
    // A thin crosshair at the crop's centre, which is exactly the computed
    // circle-circle intersection point: marks where to look for a seam
    // without painting over the pixels being judged (a 1px line, 70%
    // opaque, well clear of the centre itself).
    const mid = (zoomSrc * 4) / 2;
    zg.strokeStyle = 'rgba(0, 220, 120, 0.7)';
    zg.lineWidth = 1;
    zg.beginPath();
    zg.moveTo(mid - 14, mid); zg.lineTo(mid - 5, mid);
    zg.moveTo(mid + 5, mid); zg.lineTo(mid + 14, mid);
    zg.moveTo(mid, mid - 14); zg.lineTo(mid, mid - 5);
    zg.moveTo(mid, mid + 5); zg.lineTo(mid, mid + 14);
    zg.stroke();
    frames.push({ label: scheme, buf: zoomed.toBuffer('image/png'), w: zoomSrc * 4, h: zoomSrc * 4 });
    await context.close();
  }
  await composeStrip(frames, join(OUT, 'film__rim-crop-4x.jpg'), { title: 'Rim, 4x, no smoothing: the lens boundary crossing the true orb edge (50px source)', perRow: 2 });
}

/** README, films: "first view at the five sizes above (stills)". */
async function firstViewStills() {
  const sizes = [
    { w: 1440, h: 900, phone: false },
    { w: 1280, h: 800, phone: false },
    { w: 1024, h: 768, phone: false },
    { w: 820, h: 1180, phone: false },
    { w: 390, h: 844, phone: true },
  ];
  const frames = [];
  for (const { w, h, phone } of sizes) {
    const { context, page } = await ctx({ phone, width: w, height: h });
    await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
    await mountWait(page);
    await page.waitForTimeout(350);
    const openState = await page.evaluate(() => document.querySelector('.lens-host')?.dataset.lensStart ?? 'unknown');
    const buf = await page.screenshot();
    // Downscale every shot to the same DISPLAY height (900px) so the row
    // reads at a comparable size despite very different viewport heights;
    // each frame's own true pixel size is named in its label (the "same
    // crop" rule is about not re-cropping selectively between columns --
    // every column here is the full, uncropped first view).
    const img = await loadImage(buf);
    const dispH = 640;
    const dispW = Math.round((img.width / img.height) * dispH);
    frames.push({ label: `${w}x${h} (${openState})`, buf, w: dispW, h: dispH });
    await context.close();
  }
  await composeStrip(frames, join(OUT, 'film__first-view-five-sizes.jpg'), {
    title: 'First view, five sizes -- lens start position (open / partial)',
    perRow: 5,
  });
}

/** README, films: "drag, fling and wall stop". */
async function dragFlingWallStopFilm() {
  const { context, page } = await ctx();
  await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
  await mountWait(page);
  await page.waitForTimeout(400);
  const hit = await page.$('.lens-hit');
  const b = await hit.boundingBox();
  const sx = b.x + b.width / 2, sy = b.y + b.height / 2;
  const t0 = Date.now();
  const frames = [];
  const shot = async (label) => { const buf = await page.screenshot(); frames.push({ label, buf, w: 480, h: 300 }); };
  // Slow drag (1:1 while held).
  await page.mouse.move(sx, sy); await page.mouse.down();
  for (let i = 1; i <= 10; i++) { await page.mouse.move(sx - i * 20, sy); await page.waitForTimeout(16); }
  await shot(`held t+${Date.now() - t0}ms`);
  // Fast fling toward the left wall (hard enough to hit it).
  for (let i = 1; i <= 6; i++) { await page.mouse.move(sx - 200 - i * 80, sy); await page.waitForTimeout(8); }
  await page.mouse.up();
  for (const ms of [40, 90, 180, 400, 900, 1800]) {
    await page.waitForTimeout(ms === 40 ? 40 : 90);
    await shot(`+${Date.now() - t0}ms`);
  }
  // Crop every frame to the same region around the lens's left-wall resting
  // spot so the strip reads as one continuous close-up.
  const finalBox = await page.locator('.lens-hit').boundingBox();
  const crop = { x: Math.max(0, Math.round(finalBox.x - 140)), y: Math.max(0, Math.round(finalBox.y - 140)), width: 420, height: 420 };
  const cropped = [];
  for (const f of frames) {
    const img = await loadImage(f.buf);
    const c = createCanvas(crop.width, crop.height);
    c.getContext('2d').drawImage(img, -crop.x, -crop.y);
    cropped.push({ label: f.label, buf: c.toBuffer('image/png'), w: crop.width, h: crop.height });
  }
  await composeStrip(cropped, join(OUT, 'film__drag-fling-wall-stop.jpg'), { title: 'Drag, fling into the wall, and the stop (no backtrack)' });
  await context.close();
}

/** README, films: "a phone swipe on the hero copy scrolling the page". */
async function phoneSwipeFilm() {
  const { context, page } = await ctx({ phone: true });
  await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
  await mountWait(page);
  await page.waitForTimeout(350);
  const before = await page.screenshot();
  const beforeY = await page.evaluate(() => window.scrollY);
  const headingBox = await page.locator('.hero h1.billboard').boundingBox();
  const cdp = await context.newCDPSession(page);
  const t0 = Date.now();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: headingBox.x + headingBox.width / 2, y: headingBox.y + headingBox.height / 2 }] });
  for (let i = 1; i <= 10; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: headingBox.x + headingBox.width / 2, y: headingBox.y + headingBox.height / 2 - i * 18 }] });
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(300);
  const after = await page.screenshot();
  const afterY = await page.evaluate(() => window.scrollY);
  await composeStrip(
    [
      { label: `t+0ms scrollY=${beforeY}`, buf: before, w: 195, h: 422 },
      { label: `t+${Date.now() - t0}ms scrollY=${afterY} (scrolled ${afterY - beforeY}px)`, buf: after, w: 195, h: 422 },
    ],
    join(OUT, 'film__phone-swipe-hero-copy.jpg'),
    { title: 'Phone: a swipe on the hero copy scrolls the page (not the lens)' },
  );
  await context.close();
}

/** README, films: "a cross-school arrival at glass Home through the real
    switcher". */
async function crossSchoolArrivalFilm() {
  const { context, page } = await ctx();
  await page.goto(`${base}/t/vaporwave/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const t0 = Date.now();
  const frames = [];
  const shot = async (label) => { const buf = await page.screenshot(); frames.push({ label, buf, w: 480, h: 300 }); };
  await page.locator('.open[aria-haspopup="dialog"]').first().click();
  const link = page.locator('a[data-school="glassmorphism"]').first();
  await link.waitFor({ state: 'visible', timeout: 5000 });
  await link.click();
  for (const ms of [60, 150, 300, 500, 800, 1200, 2000, 3000]) {
    const wait = ms - (Date.now() - t0);
    if (wait > 0) await page.waitForTimeout(wait);
    await shot(`t+${Date.now() - t0}ms`);
  }
  await composeStrip(frames, join(OUT, 'film__cross-school-arrival.jpg'), { title: 'Cross-school arrival at glass Home, via the real portal switcher', perRow: 4 });
  await context.close();
}

if (want('orbedge')) await orbEdgeScrollFilm();
if (want('rim')) await rimCrop4xFilm();
if (want('sizes')) await firstViewStills();
if (want('drag')) await dragFlingWallStopFilm();
if (want('phone')) await phoneSwipeFilm();
if (want('arrival')) await crossSchoolArrivalFilm();

await browser.close();
console.log('films written to', OUT);
