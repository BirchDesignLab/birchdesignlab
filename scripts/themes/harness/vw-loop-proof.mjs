/**
 * Prove the vaporwave grid's F4(b) loop-with-a-seam: film the Home hero's
 * WebGL grid (fx.ts) and the Home closer's CSS floor (.vw-floor::before,
 * theme.css) long enough to hold at least two seams each, dark and light,
 * desktop, before (the frozen HEAD build) and after (this seat's build) -
 * and, since the Tier A critique, both loop variants the brief asks the
 * founder to choose between, plus honest films and a Services F5 check.
 *
 * Written 09-25-26 for Tier 3 stage 3 (Tier A proofs), topic "vaporwave" F4.
 * Rewritten 09-25-26 for the Tier A fix round: motion.mjs's `fx` scenario
 * films 3s, too short for a 6.4s loop to show even one restart, and its
 * screencast machinery is built around a click trigger. This is a standalone
 * script rather than an addition to motion.mjs, so nine other schools' proof
 * does not gain a code path only vaporwave's grid uses.
 *
 * Method: the seam's wall-clock moment is read from the page itself rather
 * than guessed at from pixels, because a global pixel-diff sweep over 15s of
 * an animating grid turned up false positives (star twinkle, JPEG noise) on
 * the drive-only "before" build too. For the WebGL hero, fx.ts stamps a
 * proof-only `window.__vwHeroStarted` (its loop's clock zero) - only when the
 * page was loaded with an explicit `?vwLoop=` query, so a production load
 * never creates it (fix round finding 6). For the CSS floor, the animation's
 * own `currentTime` (`getAnimations({ subtree: true })`) gives the same
 * answer with no code change at all: it reads `vw-floor-seam`, the floor's
 * 6.4 s seam animation (every floor carries it in both variants since the
 * Tier A fix rounds; only the hero's grid has two variants).
 * Either way, "after" tells this script when its own seams fall; "before"
 * (the frozen HEAD build, no F4 code) gets the SAME wall-clock windows for a
 * same-time comparison (fix round finding 5: this doubles as a noise
 * baseline - see huntBoth / the manifest's `baseline` block for what that can
 * and cannot show). Inside each predicted window a short, local
 * frame-to-frame diff (not a global one) finds the exact native frame the
 * tear lands on.
 *
 * Fix round additions (Tier A critique):
 *   - two loop variants, 'tear' (the drive never resets, only the seam marks
 *     the loop) and 'restart' (the scroll/stripe phase itself jumps at the
 *     seam) - see fx.ts readLoopVariant. Both are filmed for "after"; the
 *     frozen "before" build predates F4(b) entirely and is filmed once.
 *   - real MP4s of the hero and the closer, before/tear/restart, dark/light,
 *     15s each (mp4()), plus a before|tear|restart side-by-side per scheme
 *     (sideBySideMp4()) and a 2x crop strip of the frames either side of each
 *     seam (cropSheet()).
 *   - a Services F5 capture that screenshots the `.apps` element directly
 *     (filmServicesF5()), so both windows are in frame regardless of where
 *     the fold falls, and asserts exactly one `.vw-win-bar` lacks `.inactive`
 *     in the "after" build.
 *   - the before-build noise baseline and the after/before score ratio
 *     (finding 5).
 *
 * Usage (serve the before build on --before and the after build on --after
 * first, e.g. via snap.mjs --reuse --hold):
 *   BDL_GPU=1 node scripts/themes/harness/vw-loop-proof.mjs \
 *     --before http://127.0.0.1:4463 --after http://127.0.0.1:4464 \
 *     [--film-ms 15000] [--schemes dark,light] [--variants tear,restart]
 *     [--skip-mp4] [--skip-services]
 *
 * Output: scripts/themes/.out/stage3-proofs/vaporwave/ (gitignored)
 *   <scene>__<scheme>__before.png / __tear.png / __restart.png   (seam sheets)
 *   <scene>__<scheme>__<variant>__crop.png                       (2x seam crops)
 *   <scene>__<scheme>__before.mp4 / __tear.mp4 / __restart.mp4   (15s films)
 *   <scene>__<scheme>__compare.mp4                               (side by side)
 *   services__<scheme>__compare.png                              (F5, both windows)
 *   loop-proof-manifest.json                                     (all measurements)
 * scene is "hero" (fx.ts, the WebGL grid) or "closer" (the CSS floor on
 * Home's closer band, the same component Services and Sent use).
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const OUT = join(REPO, 'scripts', 'themes', '.out', 'stage3-proofs', 'vaporwave');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const flag = (name) => process.argv.includes(`--${name}`);
const list = (name, fallback) => (arg(name, fallback) || '').split(',').filter(Boolean);

const beforeBase = arg('before', 'http://127.0.0.1:4463').replace(/\/$/, '');
const afterBase = arg('after', 'http://127.0.0.1:4464').replace(/\/$/, '');
const filmMs = Number(arg('film-ms', 15000));
const schemes = list('schemes', 'dark,light');
const variants = list('variants', 'tear,restart');
const skipMp4 = flag('skip-mp4');
const skipServices = flag('skip-services');
const VP = { width: 1440, height: 900 };
/* Kept in step with fx.ts's CYCLE and theme.css's `vw-floor`/`vw-floor-seam`
   duration by hand: all three are a founder-facing decision (F4b), not a
   value any file exports, so this script states it too and the notes record
   the match. */
const CYCLE_MS = 6400;
/* The window around each predicted seam to hunt a real frame in, and how
   many native frames of context to show either side of what it finds. */
const HUNT_MS = 220;
const CONTEXT_FRAMES = 2;
/* Finding 5: how close a hunted frame must land to its prediction to call the
   method accurate, in a screencast whose own frame arrival is not perfectly
   periodic (vaporwave.md: "the screencast's own frame-arrival jitter"). Two
   native frames at 60fps, not one, for exactly that reason - stated here
   rather than assumed, and the manifest records the real deltas either way. */
const SEAM_TOLERANCE_MS = 34;

/* The two scenes on Home, and the box each one's crop is measured against.
   Read live so a later layout change cannot silently point this script at
   the wrong element. */
const SCENES = {
  hero: { selector: '.hero', label: 'Home hero (fx.ts WebGL grid)' },
  closer: { selector: '.closer-band', label: 'Home closer (.vw-floor CSS grid)' },
};

const ffmpegBin = process.env.FFMPEG_BIN || 'ffmpeg';

const useGpu = process.env.BDL_GPU === '1';
const browser = await chromium.launch({
  args: ['--hide-scrollbars', ...(useGpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : [])],
});

async function checkRenderer(page) {
  await page.goto('about:blank');
  const renderer = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
    if (!gl) return 'no webgl';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  });
  console.log(`renderer: ${renderer}`);
  if (useGpu && /swiftshader|llvmpipe/i.test(renderer)) {
    await browser.close();
    throw new Error('BDL_GPU=1 but Chromium fell back to a software rasteriser');
  }
  return renderer;
}

/** Record every screencast frame from the moment it is called, for `ms`.
    Frames carry `ms` since the first one, which is requested at once, so it
    is within a frame or two of this call. */
async function recordIdle(page, ms) {
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  let t0 = null;
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    if (t0 === null) t0 = metadata.timestamp;
    frames.push({ data, ms: Math.round((metadata.timestamp - t0) * 1000) });
    try { await cdp.send('Page.screencastFrameAck', { sessionId }); } catch {}
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, everyNthFrame: 1 });
  await page.waitForTimeout(ms);
  await cdp.send('Page.stopScreencast');
  await cdp.detach();
  return frames;
}

/** A small grayscale thumbnail of `box` from a base64 JPEG frame, for cheap
    frame-to-frame diffing. */
async function thumb(data, box, w = 96, h = 54) {
  const img = await loadImage(Buffer.from(data, 'base64'));
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, box.x, box.y, box.w, box.h, 0, 0, w, h);
  const { data: px } = ctx.getImageData(0, 0, w, h);
  const gray = new Float32Array(w * h);
  for (let i = 0; i < gray.length; i++) gray[i] = (px[i * 4] + px[i * 4 + 1] + px[i * 4 + 2]) / 3;
  return gray;
}

function meanAbsDiff(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum / a.length;
}

/** How long from right now until the hero's WebGL seam next starts, reading
    fx.ts's proof hook; null if the hook is missing (no `?vwLoop=` query was
    used to load this page - the "before" build, or a variant load that
    somehow dropped the query). */
async function heroSeamOffset(page) {
  return page.evaluate((CYCLE) => {
    const started = window.__vwHeroStarted;
    if (typeof started !== 'number') return null;
    const cyclePos = ((performance.now() - started) / 1000) % (CYCLE / 1000);
    return CYCLE - cyclePos * 1000;
  }, CYCLE_MS);
}

/** How long from right now until the CSS floor's seam next starts: the
    animation's own currentTime, no code change needed. Reads `vw-floor-seam`
    (every floor since the second fix round, in both variants: the tear rides
    its own `translate` animation on a 6.4s clock beside the 1.6s scroll),
    falling back to `vw-floor` for the "before" build, whose only floor
    animation it is. The seam sits at 99.2%-100% of the 6.4s cycle. Null if
    neither is animating (should not happen). */
async function closerSeamOffset(page, selector) {
  return page.evaluate(({ selector, CYCLE }) => {
    const host = document.querySelector(`${selector} .vw-floor`);
    const anims = host?.getAnimations?.({ subtree: true }) ?? [];
    const anim = anims.find((a) => a.animationName === 'vw-floor-seam') ?? anims.find((a) => a.animationName === 'vw-floor');
    if (!anim || typeof anim.currentTime !== 'number') return null;
    const seamStartMs = CYCLE * 0.9945;
    const cyclePos = anim.currentTime % CYCLE;
    return (seamStartMs - cyclePos + CYCLE) % CYCLE;
  }, { selector, CYCLE: CYCLE_MS });
}

/** Every predicted seam start inside [0, filmMs), from `firstOffsetMs`
    (measured before recording began, so frame 0 is not exactly ms 0, but
    within the settle wait's small, known slack). */
function seamSchedule(firstOffsetMs) {
  const out = [];
  for (let t = firstOffsetMs; t < filmMs; t += CYCLE_MS) out.push(Math.round(t));
  return out;
}

/** Inside `frames` near `targetMs` (+/-HUNT_MS), the frame-to-frame jump with
    the highest score: the real tear (or, on a build with nothing to find,
    whatever jumped most by chance - star twinkle, JPEG noise). Always
    returns a result if two-plus frames exist nearby, so "before" gets a
    score too (finding 5's noise baseline). */
async function huntSeam(frames, box, targetMs) {
  const nearby = frames.filter((f) => Math.abs(f.ms - targetMs) <= HUNT_MS);
  if (nearby.length < 2) return null;
  const thumbs = await Promise.all(nearby.map((f) => thumb(f.data, box)));
  let best = { i: 1, score: -1 };
  for (let i = 1; i < nearby.length; i++) {
    const score = meanAbsDiff(thumbs[i], thumbs[i - 1]);
    if (score > best.score) best = { i, score };
  }
  return { ms: nearby[best.i].ms, score: Number(best.score.toFixed(2)), deltaMs: nearby[best.i].ms - targetMs, predictedMs: targetMs };
}

/** The frames actually shown on a seam sheet: a sparse spine across the whole
    film plus CONTEXT_FRAMES of native frames either side of each seam,
    de-duplicated. */
function pickFrames(frames, seamMsList, spineCount = 8) {
  const chosen = new Map();
  for (let i = 0; i < spineCount; i++) {
    const target = Math.round((i * (filmMs - 1)) / (spineCount - 1));
    const nearest = frames.reduce((best, f) => (Math.abs(f.ms - target) < Math.abs(best.ms - target) ? f : best));
    chosen.set(nearest.ms, nearest);
  }
  for (const seamMs of seamMsList) {
    const idx = frames.findIndex((f) => f.ms === seamMs);
    for (let k = idx - CONTEXT_FRAMES; k <= idx + CONTEXT_FRAMES; k++) {
      if (frames[k]) chosen.set(frames[k].ms, frames[k]);
    }
  }
  return [...chosen.values()].sort((a, b) => a.ms - b.ms);
}

async function sheet(frames, file, seamSet, title) {
  const images = await Promise.all(frames.map((f) => loadImage(Buffer.from(f.data, 'base64'))));
  const cols = 6;
  const cellW = 300;
  const cellH = Math.round((images[0].height / images[0].width) * cellW);
  const PAD = 10;
  const CAP = 22;
  const HEAD = 30;
  const rows = Math.ceil(images.length / cols);
  const width = PAD + cols * (cellW + PAD);
  const canvas = createCanvas(width, HEAD + PAD + rows * (cellH + CAP + PAD));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1b1b1d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = '600 22px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e8e6e1';
  ctx.fillText(title, PAD, HEAD / 2);
  images.forEach((img, i) => {
    const x = PAD + (i % cols) * (cellW + PAD);
    const y = HEAD + PAD + Math.floor(i / cols) * (cellH + CAP + PAD);
    ctx.drawImage(img, x, y, cellW, cellH);
    const isSeam = seamSet.has(frames[i].ms);
    if (isSeam) {
      ctx.strokeStyle = '#ff2ecb';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, cellW, cellH);
    }
    ctx.fillStyle = isSeam ? '#ff2ecb' : '#e8e6e1';
    ctx.fillText(`+${frames[i].ms} ms${isSeam ? '  SEAM' : ''}`, x, y + cellH + CAP / 2);
  });
  await writeFile(file, await canvas.encode('png'));
}

/** A 2x crop of the floor's lower half (where the grid is densest, so a
    tear is easiest to see), CONTEXT_FRAMES native frames either side of every
    seam, one row per seam. Finding 3's "2x crop strip of the floor showing
    the frames on either side of each seam". */
async function cropSheet(frames, box, seamMsList, file, title) {
  if (!seamMsList.length) return;
  // A true 2x: the centre 240 px of the floor's lowest quarter, drawn at twice
  // its native size (the critic's second pass: the first cut downscaled).
  const cropBox = { x: box.x + box.w / 2 - 120, y: box.y + box.h * 0.75, w: 240, h: box.h * 0.25 };
  const rowsData = seamMsList.map((seamMs) => {
    const idx = frames.findIndex((f) => f.ms === seamMs);
    const out = [];
    for (let k = idx - CONTEXT_FRAMES; k <= idx + CONTEXT_FRAMES; k++) if (frames[k]) out.push(frames[k]);
    return out;
  }).filter((row) => row.length > 1);
  if (!rowsData.length) return;
  const cellW = cropBox.w * 2;
  const cellH = Math.round(cropBox.h * 2);
  const PAD = 12;
  const CAP = 34;
  const HEAD = 44;
  const cols = Math.max(...rowsData.map((r) => r.length));
  const width = PAD + cols * (cellW + PAD);
  const canvas = createCanvas(width, HEAD + PAD + rowsData.length * (cellH + CAP + PAD));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1b1b1d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = '600 22px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e8e6e1';
  ctx.fillText(title, PAD, HEAD / 2);
  for (let r = 0; r < rowsData.length; r++) {
    const row = rowsData[r];
    const images = await Promise.all(row.map((f) => loadImage(Buffer.from(f.data, 'base64'))));
    images.forEach((img, i) => {
      const x = PAD + i * (cellW + PAD);
      const y = HEAD + PAD + r * (cellH + CAP + PAD);
      ctx.drawImage(img, cropBox.x, cropBox.y, cropBox.w, cropBox.h, x, y, cellW, cellH);
      const isSeam = row[i].ms === seamMsList[r];
      ctx.strokeStyle = isSeam ? '#ff2ecb' : '#4a4a4f';
      ctx.lineWidth = isSeam ? 3 : 1;
      ctx.strokeRect(x, y, cellW, cellH);
      ctx.fillStyle = isSeam ? '#ff2ecb' : '#e8e6e1';
      ctx.fillText(`+${row[i].ms} ms${isSeam ? '  SEAM' : ''}`, x, y + cellH + CAP / 2);
    });
  }
  await writeFile(file, await canvas.encode('png'));
}

/** Resample a screencast at 30fps (newest frame at or before each tick) and
    encode an MP4 via ffmpeg (Playwright's own copy, or FFMPEG_BIN, or PATH -
    see stage3-lens-proof.mjs, which uses the same pattern). */
async function mp4(frames, file, ms, problems) {
  const dir = join(OUT, `_frames-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  const n = Math.round((ms / 1000) * 30);
  for (let i = 0; i <= n; i++) {
    const at = (i * 1000) / 30;
    const f = frames.filter((x) => x.ms <= at).pop() ?? frames[0];
    await writeFile(join(dir, `${String(i).padStart(5, '0')}.jpg`), Buffer.from(f.data, 'base64'));
  }
  const r = spawnSync(ffmpegBin, ['-y', '-loglevel', 'error', '-framerate', '30', '-i', join(dir, '%05d.jpg'), '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', file], { encoding: 'utf8' });
  await rm(dir, { recursive: true, force: true });
  if (r.status !== 0) problems.push(`ffmpeg ${file}: ${r.stderr || r.error?.message}`);
  return r.status === 0;
}

/** before | A | B, one frame source per column, resampled to 30fps and
    composited into one JPEG sequence, then encoded. Finding 3's "side-by-side
    MP4 (before | A | B) per scheme". */
async function sideBySideMp4(columns, file, ms, problems) {
  const dir = join(OUT, `_frames-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  // Stacked, one row per column source, at 960 wide so a one-frame seam can
  // be judged (the critic's second pass: three 480 px columns were too small).
  const cellW = 960;
  const cellH = Math.round((VP.height / VP.width) * cellW);
  const CAP = 40;
  const width = cellW;
  const height = columns.length * (cellH + CAP);
  const n = Math.round((ms / 1000) * 30);
  for (let i = 0; i <= n; i++) {
    const at = (i * 1000) / 30;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1b1b1d';
    ctx.fillRect(0, 0, width, height);
    ctx.font = '600 24px sans-serif';
    ctx.textBaseline = 'middle';
    for (let c = 0; c < columns.length; c++) {
      const { label, frames } = columns[c];
      const f = frames.filter((x) => x.ms <= at).pop() ?? frames[0];
      const img = await loadImage(Buffer.from(f.data, 'base64'));
      const top = c * (cellH + CAP);
      ctx.drawImage(img, 0, top + CAP, cellW, cellH);
      ctx.fillStyle = '#e8e6e1';
      ctx.fillText(`${label}  +${Math.round(at)} ms`, 10, top + CAP / 2);
    }
    await writeFile(join(dir, `${String(i).padStart(5, '0')}.jpg`), await canvas.encode('jpeg', 90));
  }
  const r = spawnSync(ffmpegBin, ['-y', '-loglevel', 'error', '-framerate', '30', '-i', join(dir, '%05d.jpg'), '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', file], { encoding: 'utf8' });
  await rm(dir, { recursive: true, force: true });
  if (r.status !== 0) problems.push(`ffmpeg ${file}: ${r.stderr || r.error?.message}`);
  return r.status === 0;
}

/** Film one scene on its own: the hero needs no scroll (it is the first
    thing on the page), the closer band needs scrolling into view first, so
    each gets its own page load rather than sharing one scroll position that
    would leave the other's crop capturing nothing. `variant` is appended as
    `?vwLoop=` for a build that understands it (the "after" build only; the
    frozen "before" build predates F4(b) and ignores any query). */
async function filmScene(base, scheme, sceneKey, label, variant) {
  const scene = SCENES[sceneKey];
  const context = await browser.newContext({
    viewport: VP,
    deviceScaleFactor: 1,
    colorScheme: scheme,
    reducedMotion: 'no-preference',
  });
  await context.addInitScript((s) => {
    try { localStorage.setItem('scheme', s); } catch {}
  }, scheme);
  await suppressPrompt(context);
  await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await context.newPage();
  const problems = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
  page.on('requestfailed', (r) => { if (!r.url().includes('/cdn-cgi/zaraz/')) problems.push(`request failed: ${r.url()}`); });

  const url = base + '/t/vaporwave/' + (variant ? `?vwLoop=${variant}` : '');
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  if (sceneKey === 'closer') {
    await page.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ block: 'center' }), scene.selector);
  }
  // Long enough for the WebGL program to link, the CSS floor's animation to
  // be well underway, and any scroll to have settled, before either offset
  // is read.
  await page.waitForTimeout(700);

  const box = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: Math.max(0, b.x), y: Math.max(0, b.y), w: b.width, h: b.height };
  }, scene.selector);
  if (!box) problems.push(`${label}: no ${scene.selector} on the page`);

  const offset = sceneKey === 'hero' ? await heroSeamOffset(page) : await closerSeamOffset(page, scene.selector);

  console.log(`${label}: filming ${filmMs} ms (predicted first seam +${offset?.toFixed(0) ?? 'n/a'} ms)...`);
  const frames = await recordIdle(page, filmMs);
  await context.close();
  return { frames, box, offset, problems };
}

/** F5: screenshot the `.apps` element directly (not the viewport), so both
    windows are in frame no matter where the fold falls - the Tier A critique
    found the earlier viewport-only capture cut `web_design.htm` off
    entirely. Also asserts exactly one `.vw-win-bar` is the active neon fill
    (the other, `custom_software.exe`, carries `.inactive`) - finding 4's
    "exactly one neon bar must be visible in each after image", checked in
    the DOM rather than guessed at from pixels. */
async function filmServicesF5(base, scheme, tag) {
  const context = await browser.newContext({
    viewport: VP,
    deviceScaleFactor: 1,
    colorScheme: scheme,
    reducedMotion: 'reduce',
  });
  await context.addInitScript((s) => {
    try { localStorage.setItem('scheme', s); } catch {}
  }, scheme);
  await suppressPrompt(context);
  await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await context.newPage();
  const problems = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => { if (!r.url().includes('/cdn-cgi/zaraz/')) problems.push(`request failed: ${r.url()}`); });

  await page.goto(base + '/t/vaporwave/services/', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);

  const apps = page.locator('.apps');
  const count = await apps.count();
  let png = null;
  let inactiveCount = -1;
  let barCount = -1;
  if (count) {
    png = await apps.screenshot();
    inactiveCount = await page.locator('.apps .vw-win-bar.inactive').count();
    barCount = await page.locator('.apps .vw-win-bar').count();
  } else {
    problems.push(`services ${scheme} ${tag}: no .apps section on the page`);
  }
  await context.close();
  return { png, inactiveCount, barCount, problems };
}

await mkdir(OUT, { recursive: true });
await checkRenderer(await (await browser.newContext()).newPage());

const manifest = { schemes, variants, filmMs, cycleMs: CYCLE_MS, seamToleranceMs: SEAM_TOLERANCE_MS, scenes: {}, services: {} };
const allProblems = [];

/* ---------- F4 / F5 loop variants, seams, films, crops ---------- */

for (const scheme of schemes) {
  for (const [sceneKey, scene] of Object.entries(SCENES)) {
    const before = await filmScene(beforeBase, scheme, sceneKey, `before ${scheme} ${sceneKey}`, null);
    allProblems.push(...before.problems.map((p) => `before ${scheme} ${sceneKey}: ${p}`));

    const afterRuns = {};
    for (const v of variants) {
      afterRuns[v] = await filmScene(afterBase, scheme, sceneKey, `after(${v}) ${scheme} ${sceneKey}`, v);
      allProblems.push(...afterRuns[v].problems.map((p) => `after(${v}) ${scheme} ${sceneKey}: ${p}`));
    }

    const box = before.box ?? afterRuns[variants[0]]?.box;
    const runResults = {};

    for (const v of variants) {
      const run = afterRuns[v];
      if (!run.box || run.offset == null) continue;
      const schedule = seamSchedule(run.offset);
      const seams = [];
      for (const targetMs of schedule) {
        const found = await huntSeam(run.frames, run.box, targetMs);
        if (found) seams.push(found);
      }
      const seamMsList = seams.map((s) => s.ms);
      const gapsMs = seamMsList.slice(1).map((ms, i) => ms - seamMsList[i]);
      const offBy = seams.map((s) => Math.abs(s.deltaMs));
      const withinTolerance = offBy.every((d) => d <= SEAM_TOLERANCE_MS);

      // Finding 5: the same windowed detector, on the same predicted
      // schedule, run against the "before" build - which has no seam-making
      // code at all - as a noise baseline. What this can show: whether the
      // detector is finding a real, sharp discontinuity ("after" should score
      // much higher) rather than just picking the noisiest frame in a mostly-
      // uniform window ("before"'s score is that noise floor). What it
      // cannot show: that "before" truly has zero motion at that instant -
      // star twinkle and JPEG re-encoding both move pixels a little every
      // frame, which is exactly why this is a ratio against a measured floor
      // rather than a claim of an exact zero.
      const baselineSeams = [];
      for (const targetMs of schedule) {
        const found = await huntSeam(before.frames, box, targetMs);
        if (found) baselineSeams.push(found);
      }
      const afterMeanScore = seams.length ? seams.reduce((a, s) => a + s.score, 0) / seams.length : null;
      const beforeMeanScore = baselineSeams.length ? baselineSeams.reduce((a, s) => a + s.score, 0) / baselineSeams.length : null;
      const ratio = afterMeanScore != null && beforeMeanScore ? Number((afterMeanScore / beforeMeanScore).toFixed(2)) : null;

      const chosen = pickFrames(run.frames, seamMsList, 8);
      const seamSet = new Set(seamMsList);
      const sheetFile = join(OUT, `${sceneKey}__${scheme}__${v}.png`);
      await sheet(
        chosen, sheetFile, seamSet,
        `vaporwave F4(b) - ${scene.label} - ${v} (${scheme}), ${filmMs}ms filmed`,
      );

      const cropFile = join(OUT, `${sceneKey}__${scheme}__${v}__crop.png`);
      await cropSheet(run.frames, run.box, seamMsList, cropFile, `${scene.label} - ${v} (${scheme}) - 2x crop either side of each seam`);

      runResults[v] = {
        framesRecorded: run.frames.length,
        predictedFirstOffsetMs: Math.round(run.offset),
        seams, seamCount: seams.length, seamGapsMs: gapsMs,
        offByMs: offBy, withinToleranceMs: withinTolerance,
        baselineSeams, baselineMeanScore: beforeMeanScore, afterMeanScore, scoreRatio: ratio,
        sheetFile: sheetFile.replace(REPO, '').replace(/\\/g, '/'),
        cropFile: cropFile.replace(REPO, '').replace(/\\/g, '/'),
      };
      console.log(`${sceneKey} ${scheme} ${v}: ${seams.length} seam(s) at [${seamMsList.join(', ')}] ms (gap ${gapsMs.join(', ') || 'n/a'}), score ratio vs before ${ratio ?? 'n/a'}`);
      if (seams.length < 2) allProblems.push(`${sceneKey} ${scheme} ${v}: found ${seams.length} seam(s), wanted at least 2 in ${filmMs}ms`);
      if (!withinTolerance) allProblems.push(`${sceneKey} ${scheme} ${v}: a seam pick missed its prediction by more than ${SEAM_TOLERANCE_MS}ms (${offBy.join(', ')}ms)`);
    }

    // Before's own reference sheet: a plain, evenly-spread spine, no seam
    // search plotted on it (it has nothing seam-shaped to point at).
    const beforeSheetFile = join(OUT, `${sceneKey}__${scheme}__before.png`);
    await sheet(pickFrames(before.frames, [], 8), beforeSheetFile, new Set(), `vaporwave F4(b) - ${scene.label} - before (${scheme}), ${filmMs}ms filmed (drive/old loop, no seam expected)`);

    manifest.scenes[`${sceneKey}__${scheme}`] = {
      scene: sceneKey, scheme,
      before: { framesRecorded: before.frames.length, sheetFile: beforeSheetFile.replace(REPO, '').replace(/\\/g, '/') },
      variants: runResults,
    };

    // MP4s + the before|A|B side-by-side (finding 3).
    if (!skipMp4) {
      const beforeMp4 = join(OUT, `${sceneKey}__${scheme}__before.mp4`);
      await mp4(before.frames, beforeMp4, filmMs, allProblems);
      const columns = [{ label: 'BEFORE', frames: before.frames }];
      for (const v of variants) {
        if (!afterRuns[v]?.frames) continue;
        const f = join(OUT, `${sceneKey}__${scheme}__${v}.mp4`);
        await mp4(afterRuns[v].frames, f, filmMs, allProblems);
        columns.push({ label: v.toUpperCase(), frames: afterRuns[v].frames });
      }
      const cmpMp4 = join(OUT, `${sceneKey}__${scheme}__compare.mp4`);
      await sideBySideMp4(columns, cmpMp4, filmMs, allProblems);
    }
  }
}

/* ---------- F5: Services, both windows, both bars ---------- */

if (!skipServices) {
  for (const scheme of schemes) {
    const before = await filmServicesF5(beforeBase, scheme, 'before');
    const after = await filmServicesF5(afterBase, scheme, 'after');
    allProblems.push(...before.problems.map((p) => `services before ${scheme}: ${p}`));
    allProblems.push(...after.problems.map((p) => `services after ${scheme}: ${p}`));

    const beforeFile = join(OUT, `services__${scheme}__before.png`);
    const afterFile = join(OUT, `services__${scheme}__after.png`);
    const cmpFile = join(OUT, `services__${scheme}__compare.png`);
    if (before.png) await writeFile(beforeFile, before.png);
    if (after.png) await writeFile(afterFile, after.png);
    if (before.png && after.png) {
      execFileSync(process.execPath, [
        join(HERE, '..', 'compare-strips.mjs'),
        '--before', beforeFile, '--after', afterFile, '--out', cmpFile,
        '--title', `vaporwave F5 - Services, both windows (${scheme})`,
        '--before-label', 'BEFORE (both bars neon)', '--after-label', 'AFTER (back bar quiet, F5)',
      ], { stdio: 'inherit' });
    }

    // Finding 4: exactly one neon (active) bar in the after image.
    const activeAfter = after.barCount - after.inactiveCount;
    if (after.barCount >= 0 && activeAfter !== 1) {
      allProblems.push(`services ${scheme} after: ${activeAfter} active .vw-win-bar (wanted exactly 1), ${after.inactiveCount} inactive of ${after.barCount} total`);
    }
    const activeBefore = before.barCount - before.inactiveCount;

    manifest.services[scheme] = {
      before: { barCount: before.barCount, inactiveCount: before.inactiveCount, activeCount: activeBefore, file: beforeFile.replace(REPO, '').replace(/\\/g, '/') },
      after: { barCount: after.barCount, inactiveCount: after.inactiveCount, activeCount: activeAfter, file: afterFile.replace(REPO, '').replace(/\\/g, '/') },
      compareFile: cmpFile.replace(REPO, '').replace(/\\/g, '/'),
    };
    console.log(`services ${scheme}: before ${activeBefore}/${before.barCount} active, after ${activeAfter}/${after.barCount} active`);
  }
}

await browser.close();
await writeFile(join(OUT, 'loop-proof-manifest.json'), JSON.stringify({ manifest, problems: allProblems }, null, 2));
console.log(`\noutput -> ${OUT}`);
if (allProblems.length) {
  console.log(`${allProblems.length} problems:`);
  for (const p of allProblems) console.log(`  ${p}`);
  process.exitCode = 2;
}
