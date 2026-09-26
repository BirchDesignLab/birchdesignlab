/**
 * Serve and film the stage 3 lens proof (scripts/themes/proofs/stage3-lens/)
 * in GPU Chromium, and measure it.
 *
 * Written 09-25-26 for Tier 3 stage 3 (Tier A proofs). Proves glass's
 * lensing before Tier B commits to it (stage3-decisions.md item 1): SVG
 * displacement in backdrop-filter on the panes, one draggable WebGL lens,
 * rigid-glass handling. Serves the proof folder with lib/serve-dist.mjs on
 * its own port (4465 by default; nothing leaves localhost, and any request
 * that is not to 127.0.0.1 fails the run), launches Chromium on the real GPU
 * (BDL_GPU=1 is required; a SwiftShader renderer is a hard failure) and runs
 * these stages:
 *
 *   detect  what CSS.supports says against what is applied: the support
 *           object, a pixel check that the pane bend is really drawn, and a
 *           pixel check of what one unresolvable url() does to the rest of
 *           a backdrop-filter list;
 *   stills  panes and lens, Clear and Tinted, desktop 1440 (1x) and phone
 *           390 (2x); the frosted fallback other engines get; the three
 *           lens routes over DOM text side by side;
 *   films   drag, fling, wall stop, lift and scroll, as timestamped frame
 *           strips (PNG) and MP4s (ffmpeg, from the screencast frames);
 *   stats   rAF deltas and long frames while idle, dragging and scrolling,
 *           desktop 1x, desktop 2x and phone, with variants (panes frosted
 *           only, lens hidden, SVG lens);
 *   throttled the phone drag and scroll again with the CPU slowed 6x;
 *   align   the lens's own backdrop against the true one: at rest (identity
 *           probe against the page with the lens hidden) and while scrolling
 *           (seam probe, the vertical offset across the seam per frame), JS
 *           and CSS orb drivers, desktop and phone;
 *   trace   the handling measured frame by frame: fling, wall stop, drag
 *           with reversals; peak stretch, overshoot, rebound; a plot.
 *
 * Output: scripts/themes/.out/stage3-proofs/lens/ (gitignored): PNGs, MP4s
 * and results.json, which the notes quote.
 *
 * Usage:
 *   BDL_GPU=1 node scripts/themes/harness/stage3-lens-proof.mjs [--port 4465] [--only stills,films]
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveDist } from '../lib/serve-dist.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROOF = join(HERE, '..', 'proofs', 'stage3-lens');
const OUT = join(HERE, '..', '.out', 'stage3-proofs', 'lens');
const argv = process.argv.slice(2);
const argOf = (n, d) => (argv.includes(`--${n}`) ? argv[argv.indexOf(`--${n}`) + 1] : d);
const PORT = Number(argOf('port', '4465'));
if (PORT === 8787) throw new Error('port 8787 is the dev worker; pick another');
const ALL = ['detect', 'stills', 'films', 'stats', 'throttled', 'align', 'trace'];
const STAGES = argOf('only', ALL.join(',')).split(',');
const BASE = `http://127.0.0.1:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (process.env.BDL_GPU !== '1') {
  console.error('BDL_GPU=1 is required: this proof measures GPU rendering.');
  process.exit(1);
}
await mkdir(OUT, { recursive: true });
const resultsFile = join(OUT, 'results.json');
const results = existsSync(resultsFile) ? JSON.parse(await readFile(resultsFile, 'utf8')) : {};
const missing = [];
const server = await serveDist(PORT, PROOF, { onMissing: (p) => { if (p !== '/favicon.ico') missing.push(p); } });

const browser = await chromium.launch({
  args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
});
const VP = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  desktop2x: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};
const problems = [];
const offsite = [];

async function open(vp, params = '') {
  const context = await browser.newContext(VP[vp]);
  const page = await context.newPage();
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (!['127.0.0.1', ''].includes(u.hostname) && !['blob:', 'data:'].includes(u.protocol)) offsite.push(r.url());
  });
  page.on('pageerror', (e) => problems.push(`${vp} ${params}: pageerror ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`${vp} ${params}: console ${m.text()}`); });
  await page.goto(`${BASE}/?${params}`);
  await page.waitForSelector('html[data-ready="1"]', { timeout: 15000, state: 'attached' });
  await page.waitForTimeout(700);
  const renderer = await page.evaluate(() => window.__lens.renderer);
  if (!renderer || /swiftshader|software|llvmpipe/i.test(renderer)) throw new Error(`software renderer: ${renderer}`);
  results.renderer = renderer;
  return { page, context, vp, close: () => context.close() };
}

const lensState = (page) => page.evaluate(() => window.__lens.state());

/* ---------- images ---------- */
async function shot(page, file, clip) {
  const buf = await page.screenshot(clip ? { clip } : {});
  if (file) await writeFile(join(OUT, file), buf);
  return buf;
}
async function pixels(buf) {
  const img = await loadImage(buf);
  const c = createCanvas(img.width, img.height);
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  return g.getImageData(0, 0, img.width, img.height);
}
/** Crop (CSS px) a full-page screenshot buffer and scale it by `z`. */
async function crop(buf, dpr, box, z, file) {
  const img = await loadImage(buf);
  const w = Math.round(box.w * dpr * z);
  const h = Math.round(box.h * dpr * z);
  const c = createCanvas(w, h);
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, box.x * dpr, box.y * dpr, box.w * dpr, box.h * dpr, 0, 0, w, h);
  const out = await c.encode('png');
  if (file) await writeFile(join(OUT, file), out);
  return out;
}
/** Lay images side by side with a caption under each. */
async function sideBySide(items, file, cellW, title) {
  const imgs = await Promise.all(items.map((i) => loadImage(i.buf)));
  const PAD = 14, CAP = 42, HEAD = title ? 34 : 0;
  const cellH = Math.round((imgs[0].height / imgs[0].width) * cellW);
  const c = createCanvas(PAD + items.length * (cellW + PAD), HEAD + PAD + cellH + CAP + PAD);
  const g = c.getContext('2d');
  g.fillStyle = '#1b1b1d';
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#e8e6e1';
  g.font = '600 16px sans-serif';
  g.textBaseline = 'middle';
  if (title) g.fillText(title, PAD, PAD + 12);
  imgs.forEach((img, i) => {
    const x = PAD + i * (cellW + PAD);
    g.drawImage(img, x, HEAD + PAD, cellW, cellH);
    g.fillStyle = '#e8e6e1';
    g.font = '600 14px sans-serif';
    wrap(g, items[i].label, x, HEAD + PAD + cellH + 14, cellW);
  });
  await writeFile(join(OUT, file), await c.encode('png'));
}
function wrap(g, text, x, y, w) {
  const words = text.split(' ');
  let line = '';
  for (const word of words) {
    const t = line ? `${line} ${word}` : word;
    if (g.measureText(t).width > w && line) {
      g.fillText(line, x, y);
      y += 17;
      line = word;
    } else line = t;
  }
  g.fillText(line, x, y);
}

/* ---------- input ---------- */
/** Where a timed path [[ms, x, y], ...] is at `ms`, interpolated. */
function at(path, ms) {
  if (ms <= path[0][0]) return path[0].slice(1);
  for (let i = 1; i < path.length; i++) {
    if (path[i][0] >= ms) {
      const [t0, x0, y0] = path[i - 1];
      const [t1, x1, y1] = path[i];
      const k = (ms - t0) / (t1 - t0 || 1);
      return [x0 + (x1 - x0) * k, y0 + (y1 - y0) * k];
    }
  }
  return path[path.length - 1].slice(1);
}
/** Replay a timed pointer path in real time: each input event goes to where
    the path is now, so a slow event round trip drops points instead of
    stretching the gesture (a fling stays a fling). `send(kind, x, y)`. */
async function replay(path, send) {
  const end = path[path.length - 1][0];
  await send('down', ...path[0].slice(1));
  const t0 = Date.now();
  for (;;) {
    const el = Date.now() - t0;
    if (el >= end) break;
    await send('move', ...at(path, el));
    await sleep(3);
  }
  await send('move', ...path[path.length - 1].slice(1));
  await send('up');
}
async function mousePath(page, path) {
  await page.mouse.move(path[0][1], path[0][2]);
  await replay(path, (kind, x, y) => (kind === 'down' ? page.mouse.down() : kind === 'up' ? page.mouse.up() : page.mouse.move(x, y)));
}
/** The same with one touch point, over CDP. */
async function touchPath(page, path) {
  const cdp = await page.context().newCDPSession(page);
  const type = { down: 'touchStart', move: 'touchMove', up: 'touchEnd' };
  await replay(path, (kind, x, y) => cdp.send('Input.dispatchTouchEvent', { type: type[kind], touchPoints: kind === 'up' ? [] : [{ x, y }] }));
  await cdp.detach();
}
/** A path from a to b over `ms`, sampled every 8 ms, eased or linear. */
function line(a, b, ms, t0 = 0, ease = (t) => t) {
  const out = [];
  for (let t = 0; t <= ms; t += 8) {
    const k = ease(t / ms);
    out.push([t0 + t, a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]);
  }
  return out;
}
/** A drag that then flings: slow move, then a fast final stroke released
    while still moving. */
function flingPath(start, slowTo, flingTo, slowMs = 500, flingMs = 110) {
  return [...line(start, slowTo, slowMs, 0, (t) => t * t * (3 - 2 * t)), ...line(slowTo, flingTo, flingMs, slowMs + 8)];
}
/** Scroll by `distance` px (positive = down the page). Desktop: a
    synthesized mouse-wheel gesture. Phone: a real touch drag over CDP
    (Input.synthesizeScrollGesture with a touch source does not scroll in
    this headless Chromium: measured, see the probe stage), a flick of at
    most 600 px at `speed` px/s, which Chromium may carry on as a fling. */
async function scrollGesture(page, vp, distance, speed) {
  if (vp === 'phone') {
    const d = Math.max(-600, Math.min(600, distance));
    const y0 = d > 0 ? 740 : 120;
    return touchPath(page, line([200, y0], [200, y0 - d], Math.max(60, (Math.abs(d) / speed) * 1000)));
  }
  const cdp = await page.context().newCDPSession(page);
  const v = VP[vp].viewport;
  await cdp.send('Input.synthesizeScrollGesture', {
    x: Math.round(v.width * 0.3), y: Math.round(v.height * 0.6), yDistance: -distance, speed,
    gestureSourceType: vp === 'phone' ? 'touch' : 'mouse', preventFling: vp !== 'phone', repeatCount: 1,
  });
  await cdp.detach();
}

/* ---------- films ---------- */
async function film(page, ms, action, quality = 88) {
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    frames.push({ data, at: metadata.timestamp });
    try { await cdp.send('Page.screencastFrameAck', { sessionId }); } catch {}
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality, everyNthFrame: 1 });
  await page.waitForTimeout(300);
  const t0 = Date.now() / 1000;
  const done = action();
  await sleep(ms);
  await done;
  await cdp.send('Page.stopScreencast');
  await cdp.detach();
  const before = frames.filter((f) => f.at < t0).slice(-1);
  return [...before, ...frames.filter((f) => f.at >= t0)].map((f) => ({ ...f, ms: Math.round((f.at - t0) * 1000) }));
}
function pick(frames, n, ms) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const at = Math.round((i * ms) / (n - 1));
    const shown = frames.filter((f) => f.ms <= at).pop() ?? frames[0];
    out.push({ ...shown, label: at });
  }
  return out;
}
async function strip(frames, file, { cols = 4, cellW = 340, box = null, vpWidth, title }) {
  const imgs = await Promise.all(frames.map((f) => loadImage(Buffer.from(f.data, 'base64'))));
  const k = imgs[0].width / vpWidth;
  const src = box ? { x: box.x * k, y: box.y * k, w: box.w * k, h: box.h * k } : { x: 0, y: 0, w: imgs[0].width, h: imgs[0].height };
  const cellH = Math.round((src.h / src.w) * cellW);
  const PAD = 12, CAP = 24, HEAD = 36;
  const rows = Math.ceil(imgs.length / cols);
  const c = createCanvas(PAD + cols * (cellW + PAD), HEAD + PAD + rows * (cellH + CAP + PAD));
  const g = c.getContext('2d');
  g.fillStyle = '#1b1b1d';
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#e8e6e1';
  g.font = '600 15px sans-serif';
  g.textBaseline = 'middle';
  g.fillText(title, PAD, PAD + 10);
  imgs.forEach((img, i) => {
    const x = PAD + (i % cols) * (cellW + PAD);
    const y = HEAD + PAD + Math.floor(i / cols) * (cellH + CAP + PAD);
    g.drawImage(img, src.x, src.y, src.w, src.h, x, y, cellW, cellH);
    g.fillStyle = '#e8e6e1';
    g.fillText(`+${frames[i].label} ms`, x, y + cellH + CAP / 2);
  });
  await writeFile(join(OUT, file), await c.encode('png'));
}
/** Resample the screencast at 30 fps (newest frame at or before each tick)
    and encode an MP4. */
async function mp4(frames, file, ms) {
  const dir = join(OUT, `_frames-${file}`);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  const n = Math.round((ms / 1000) * 30);
  for (let i = 0; i <= n; i++) {
    const at = (i * 1000) / 30;
    const f = frames.filter((x) => x.ms <= at).pop() ?? frames[0];
    await writeFile(join(dir, `${String(i).padStart(5, '0')}.jpg`), Buffer.from(f.data, 'base64'));
  }
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '30', '-i', join(dir, '%05d.jpg'), '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', join(OUT, file)], { encoding: 'utf8' });
  await rm(dir, { recursive: true, force: true });
  if (r.status !== 0) problems.push(`ffmpeg ${file}: ${r.stderr}`);
}

/* ---------- stats ---------- */
function stats(frames) {
  const d = frames.map((f) => f.dt).sort((a, b) => a - b);
  const w = frames.map((f) => f.work).sort((a, b) => a - b);
  const q = (arr, p) => arr[Math.min(arr.length - 1, Math.floor(p * arr.length))];
  const r = (x) => Math.round(x * 100) / 100;
  if (!d.length) return null;
  return {
    frames: d.length,
    meanMs: r(d.reduce((a, b) => a + b, 0) / d.length),
    p50: r(q(d, 0.5)), p95: r(q(d, 0.95)), p99: r(q(d, 0.99)), max: r(d[d.length - 1]),
    over20ms: d.filter((x) => x > 20).length,
    over25ms: d.filter((x) => x > 25).length,
    over34ms: d.filter((x) => x > 34).length,
    workMean: r(w.reduce((a, b) => a + b, 0) / w.length), workP95: r(q(w, 0.95)), workMax: r(w[w.length - 1]),
  };
}

/* ======================================================================= */

if (STAGES.includes('probe')) {
  // Diagnostics only (not in the default run): the panes' filters as applied.
  const s = await open('desktop');
  console.log(await s.page.evaluate(() => [...document.querySelectorAll('[data-pane]')].map((el) => ({
    pane: el.dataset.pane, computed: getComputedStyle(el).backdropFilter, filter: document.getElementById(`pane-${el.dataset.pane}`)?.outerHTML.replace(/href="[^"]+"/, 'href="…"'),
  }))));
  await s.close();
  // Does a synthesized touch scroll move a phone page?
  const ph = await open('phone');
  for (const d of [700, -700]) {
    const before = await ph.page.evaluate(() => scrollY);
    await scrollGesture(ph.page, 'phone', d, 1600);
    await sleep(1200);
    console.log('phone touch scroll', d, before, '->', await ph.page.evaluate(() => scrollY), 'max', await ph.page.evaluate(() => document.documentElement.scrollHeight - innerHeight));
  }
  for (const ms of [250, 100]) {
    const b2 = await ph.page.evaluate(() => scrollY);
    await touchPath(ph.page, line([200, 760], [200, 360], ms));
    await sleep(1500);
    console.log('phone touch drag 400 px in', ms, 'ms:', b2, '->', await ph.page.evaluate(() => scrollY));
    await ph.page.evaluate(() => scrollTo(0, 0));
    await sleep(300);
  }
  const cdp = await ph.page.context().newCDPSession(ph.page);
  await cdp.send('Input.synthesizeScrollGesture', { x: 200, y: 600, yDistance: -600, gestureSourceType: 'touch', speed: 1200 });
  await sleep(800);
  console.log('phone synth default args', await ph.page.evaluate(() => scrollY));
  await ph.close();
}

if (STAGES.includes('detect')) {
  console.log('detect...');
  const s = await open('desktop');
  const det = await s.page.evaluate(() => ({ support: window.__lens.support, bend: window.__lens.bend, ua: navigator.userAgent }));
  // Is the bend really drawn? Hero pane with bend against bend=off, compared
  // in the bevel band and in the middle.
  const hero = await s.page.evaluate(() => { const r = document.querySelector('[data-pane=hero]').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  const on = await pixels(await shot(s.page, null));
  const off = await open('desktop', 'bend=off');
  const offPx = await pixels(await shot(off.page, null));
  await off.close();
  const diffIn = (band) => {
    let sum = 0, n = 0;
    for (let y = Math.round(hero.y); y < hero.y + hero.h; y++) {
      for (let x = Math.round(hero.x); x < hero.x + hero.w; x++) {
        const edge = Math.min(x - hero.x, hero.x + hero.w - x, y - hero.y, hero.y + hero.h - y);
        if (band ? edge > 3 && edge < 22 : edge > 60) {
          const k = (y * on.width + x) * 4;
          sum += Math.abs(on.data[k] - offPx.data[k]) + Math.abs(on.data[k + 1] - offPx.data[k + 1]) + Math.abs(on.data[k + 2] - offPx.data[k + 2]);
          n++;
        }
      }
    }
    return Math.round((sum / n / 3) * 100) / 100;
  };
  det.bendPixelCheck = { bevelBandMeanAbsDiff: diffIn(true), middleMeanAbsDiff: diffIn(false), note: 'mean |bend - frosted| per channel, 0-255; the band should differ, the middle barely' };
  // One unresolvable url() in the list: does Chromium keep the blur?
  await s.page.evaluate(() => {
    const mk = (id, bf, left) => {
      // Crisp stripes behind each box, so a blur shows.
      const st = document.createElement('div');
      st.style.cssText = `position:fixed;z-index:8;top:300px;left:${left}px;width:160px;height:160px;background:repeating-linear-gradient(90deg,#111 0 6px,#fff 6px 12px)`;
      document.body.append(st);
      const d = document.createElement('div');
      d.id = id;
      d.style.cssText = `position:fixed;z-index:9;top:300px;left:${left}px;width:160px;height:160px;border-radius:20px;backdrop-filter:${bf};outline:1px solid rgba(255,255,255,.6)`;
      document.body.append(d);
    };
    window.__lens.moveTo(1300, 800);
    mk('t-blur', 'blur(10px)', 820);
    mk('t-bad', 'url(#does-not-exist) blur(10px)', 1000);
    mk('t-none', 'none', 1180);
  });
  await s.page.waitForTimeout(300);
  const t = await shot(s.page, null);
  await crop(t, 1, { x: 800, y: 280, w: 560, h: 200 }, 1, 'detect__bad-url-list.png');
  const px = await pixels(t);
  const sharp = (x0) => { // mean abs horizontal gradient inside a box: blur lowers it
    let s2 = 0, n = 0;
    for (let y = 320; y < 440; y++) for (let x = x0 + 20; x < x0 + 140; x++) { const k = (y * px.width + x) * 4; s2 += Math.abs(px.data[k] - px.data[k + 4]) + Math.abs(px.data[k + 1] - px.data[k + 5]); n++; }
    return Math.round((s2 / n) * 1000) / 1000;
  };
  det.badUrlList = { gradBlur: sharp(820), gradBadUrl: sharp(1000), gradNone: sharp(1180), note: 'mean horizontal gradient inside each box; blur lowers it. If the bad-url box matches "none", one bad url() dropped the whole list' };
  // Does Chromium hand backdrop-filter any pixels from outside the element?
  // A uniform displacement map shifts every sample 40 px to the right, over
  // stripes that run past the element's right edge. If the rightmost 40 px
  // show stripes, outside pixels are available; if not, the backdrop is
  // clipped to the border box and a lens edge cannot pull in its surroundings.
  await s.page.evaluate(() => {
    const svg = document.getElementById('filters');
    const c = document.createElement('canvas');
    c.width = c.height = 4;
    const g = c.getContext('2d');
    g.fillStyle = 'rgb(255,128,128)';
    g.fillRect(0, 0, 4, 4);
    const f = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    f.id = 'shift40';
    for (const [k, v] of Object.entries({ x: 0, y: 0, width: 200, height: 160, filterUnits: 'userSpaceOnUse', primitiveUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB' })) f.setAttribute(k, String(v));
    f.innerHTML = `<feImage href="${c.toDataURL()}" x="0" y="0" width="200" height="160" preserveAspectRatio="none" result="m"/><feDisplacementMap in="SourceGraphic" in2="m" scale="80" xChannelSelector="R" yChannelSelector="G"/>`;
    svg.append(f);
    for (const el of document.querySelectorAll('[id^=t-]')) el.remove();
    const st = document.createElement('div');
    st.style.cssText = 'position:fixed;z-index:8;top:560px;left:760px;width:520px;height:160px;background:repeating-linear-gradient(90deg,#111 0 6px,#fff 6px 12px)';
    const plain = document.createElement('div');
    plain.style.cssText = 'position:fixed;z-index:8;top:560px;left:1000px;width:80px;height:160px;background:#2f6fe0';
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;z-index:9;top:560px;left:800px;width:200px;height:160px;backdrop-filter:url(#shift40);outline:1px solid red';
    document.body.append(st, plain, d);
  });
  await s.page.waitForTimeout(300);
  const t2 = await shot(s.page, null);
  await crop(t2, 1, { x: 740, y: 540, w: 560, h: 200 }, 1, 'detect__outside-pixels.png');
  const p2 = await pixels(t2);
  // Right 40 px of the element (x 960..1000) should show what is at 1000..1040: solid blue if outside pixels exist.
  let blue = 0, n2 = 0;
  for (let y = 580; y < 700; y++) for (let x = 964; x < 996; x++) { const k = (y * p2.width + x) * 4; if (p2.data[k + 2] > 180 && p2.data[k] < 120) blue++; n2++; }
  det.outsidePixels = { shareBlueInRightBand: Math.round((blue / n2) * 1000) / 1000, note: 'uniform +40 px displacement; blue sits just outside the element. ~1 = outside pixels available; ~0 = backdrop clipped to the box (the crop shows stripes there: the inside, mirrored past the edge)' };
  results.detect = det;
  console.log(JSON.stringify(det, null, 1));
  await s.close();
}

if (STAGES.includes('stills')) {
  console.log('stills...');
  results.stills = [];
  for (const vp of ['desktop', 'phone']) {
    for (const tint of ['clear', 'tinted']) {
      const s = await open(vp, `tint=${tint}`);
      const dpr = VP[vp].deviceScaleFactor;
      const st = await lensState(s.page);
      const full = await shot(s.page, `still__${vp}__${tint}.png`);
      const m = st.R * 1.7;
      await crop(full, dpr, { x: st.x - m, y: st.y - m, w: 2 * m, h: 2 * m }, vp === 'phone' ? 1 : 2, `lens__${vp}__${tint}.png`);
      const hero = await s.page.evaluate(() => { const r = document.querySelector('[data-pane=hero]').getBoundingClientRect(); return { x: r.left - 12, y: r.top - 12, w: r.width + 24, h: r.height + 24 }; });
      await crop(full, dpr, hero, 1, `pane-hero__${vp}__${tint}.png`);
      results.stills.push({ vp, tint, lens: st });
      await s.close();
    }
  }
  // What Safari and Firefox get: the panes frosted, no bend (the lens is the same WebGL).
  for (const vp of ['desktop', 'phone']) {
    const s = await open(vp, 'bend=off');
    const dpr = VP[vp].deviceScaleFactor;
    const full = await shot(s.page, `still__${vp}__clear__frosted-fallback.png`);
    const hero = await s.page.evaluate(() => { const r = document.querySelector('[data-pane=hero]').getBoundingClientRect(); return { x: r.left - 12, y: r.top - 12, w: r.width + 24, h: r.height + 24 }; });
    await crop(full, dpr, hero, 1, `pane-hero__${vp}__clear__frosted-fallback.png`);
    await s.close();
  }
  // Bend against frosted, hero pane corner, zoomed.
  {
    const items = [];
    for (const [p, label] of [['', 'Chromium, bevel samples inward (default): the band magnifies what is just inside'], ['bevel=out', 'Chromium, bevel samples outward: the inside mirrored past the rim, like a thick edge'], ['bend=off', 'Safari and Firefox: frosted, rim and tint, no bend']]) {
      const s = await open('desktop', p);
      // Where the orange orb's edge crosses the hero pane's bottom edge.
      const at = await s.page.evaluate(() => {
        const r = document.querySelector('[data-pane=hero]').getBoundingClientRect();
        const o = window.__lens.model().orbs[1];
        const y = r.bottom;
        return { x: o.cx + Math.sqrt(Math.max(0, o.r * o.r - (y - o.cy) ** 2)), y };
      });
      const full = await shot(s.page, null);
      items.push({ buf: await crop(full, 1, { x: at.x - 140, y: at.y - 110, w: 280, h: 160 }, 2), label });
      await s.close();
    }
    await sideBySide(items, 'compare__pane-bend-vs-frosted__desktop.png', 460, 'Hero pane bottom edge where an orb edge crosses it, 2x zoom');
  }
  // The three lens routes over DOM text.
  {
    const items = [];
    for (const [p, label] of [
      ['layer=over', 'WebGL, over the content: the lens draws only the backdrop, so the text under it is hidden, not bent'],
      ['layer=under', 'WebGL, on the wallpaper plane under the content: text passes over the lens unbent'],
      ['lens=svg', 'SVG displacement lens (Chromium only): bends the DOM text too, but past its rim it can only mirror its own inside (see the rim)'],
    ]) {
      const s = await open('desktop', p);
      const h1 = await s.page.evaluate(() => { const r = document.querySelector('h1').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
      const cx = h1.x + 250, cy = h1.y + 50;
      await s.page.evaluate(([x, y]) => window.__lens.moveTo(x, y), [cx, cy]);
      await s.page.waitForTimeout(200);
      const full = await shot(s.page, null);
      items.push({ buf: await crop(full, 1, { x: cx - 170, y: cy - 150, w: 340, h: 300 }, 1.5), label });
      await s.close();
    }
    await sideBySide(items, 'compare__lens-over-text__desktop.png', 460, 'The lens over the hero headline, three routes (desktop, 1.5x zoom)');
  }
  // The WebGL and SVG lens over bare wallpaper and orbs, same spot.
  {
    const items = [];
    for (const [p, label] of [['', 'WebGL lens, Clear'], ['lens=svg', 'SVG lens, Clear (Chromium)'], ['tint=tinted', 'WebGL lens, Tinted'], ['lens=svg&tint=tinted', 'SVG lens, Tinted (Chromium)']]) {
      const s = await open('desktop', p);
      const st = await lensState(s.page);
      const full = await shot(s.page, null);
      const m = st.R * 1.6;
      items.push({ buf: await crop(full, 1, { x: st.x - m, y: st.y - m, w: 2 * m, h: 2 * m }, 2), label });
      await s.close();
    }
    await sideBySide(items, 'compare__lens-webgl-vs-svg__desktop.png', 330, 'Lens over wallpaper and an orb edge, 2x zoom');
  }
}

if (STAGES.includes('films')) {
  console.log('films...');
  results.films = [];
  const record = async (name, vp, params, ms, act, { box = null, n = 16, cols = 4, cellW = 340 } = {}) => {
    const s = await open(vp, params);
    const st = await lensState(s.page);
    const frames = await film(s.page, ms, () => act(s.page, st));
    const title = `${name} (${vp}${params ? `, ${params}` : ''}), ${frames.length} screencast frames over ${ms} ms`;
    const b = typeof box === 'function' ? box(st) : box;
    await strip(pick(frames, n, ms), `film__${name}__${vp}.png`, { cols, cellW, box: b, vpWidth: VP[vp].viewport.width, title });
    await mp4(frames, `film__${name}__${vp}.mp4`, ms);
    results.films.push({ name, vp, params, ms, frames: frames.length });
    await s.close();
  };
  const around = (st, w, h) => ({ x: Math.max(0, Math.min(1440 - w, st.x - w / 2)), y: Math.max(0, Math.min(900 - h, st.y - h / 2)), w, h });
  await record('drag-fling', 'desktop', 'tint=clear', 2400, (p, st) => mousePath(p, flingPath([st.x, st.y], [st.x - 260, st.y + 60], [st.x - 80, st.y - 10])), { box: (st) => around(st, 960, 600), n: 12, cols: 3, cellW: 470 });
  await record('wall-stop', 'desktop', 'tint=tinted', 1600, (p, st) => mousePath(p, flingPath([st.x, st.y], [st.x - 120, st.y], [st.x + 200, st.y + 6], 300, 90)), { box: () => ({ x: 640, y: 150, w: 800, h: 500 }), n: 12, cols: 3, cellW: 470 });
  await record('lift', 'desktop', 'tint=clear', 1400, async (p, st) => {
    await p.mouse.move(st.x, st.y);
    await p.mouse.down();
    await sleep(700);
    await p.mouse.up();
  }, { box: (st) => ({ x: st.x - 140, y: st.y - 125, w: 280, h: 280 }), n: 8, cols: 4, cellW: 300 });
  await record('drag-fling', 'phone', 'tint=clear', 2200, (p, st) => touchPath(p, flingPath([st.x, st.y], [st.x - 150, st.y + 60], [st.x - 90, st.y - 60], 450, 100)), { n: 12, cols: 6, cellW: 180 });
  await record('scroll', 'desktop', 'tint=clear', 2200, (p) => scrollGesture(p, 'desktop', 900, 900), { n: 12, cols: 4, cellW: 340 });
  await record('scroll', 'phone', 'tint=tinted', 2000, (p) => scrollGesture(p, 'phone', 560, 1400), { n: 12, cols: 6, cellW: 180 });
}

if (STAGES.includes('stats')) {
  console.log('stats...');
  results.stats = [];
  const run = async (vp, params, what, act, pre) => {
    const s = await open(vp, params);
    if (pre) await pre(s.page);
    const st = await lensState(s.page);
    await s.page.evaluate(() => window.__lens.resetFrames());
    await act(s.page, st);
    const frames = await s.page.evaluate(() => window.__lens.frames.slice());
    const r = { vp, params, what, ...stats(frames) };
    results.stats.push(r);
    console.log(JSON.stringify(r));
    await s.close();
  };
  const drag = (vp) => async (p, st) => {
    // Three seconds of circling drag, then a fling.
    const path = [];
    for (let t = 0; t <= 3000; t += 8) {
      const a = (t / 1000) * Math.PI * 1.3;
      const rad = vp === 'phone' ? 70 : 160;
      path.push([t, st.x - rad + rad * Math.cos(a), st.y + rad * 0.6 * Math.sin(a)]);
    }
    if (vp === 'phone') await touchPath(p, path);
    else await mousePath(p, path);
    await sleep(300);
  };
  const scroll = (vp) => async (p) => {
    await scrollGesture(p, vp, vp === 'phone' ? 900 : 1200, 1500);
    await sleep(vp === 'phone' ? 1500 : 300);
    await scrollGesture(p, vp, vp === 'phone' ? -900 : -1200, 1500);
    await sleep(vp === 'phone' ? 1500 : 300);
  };
  for (const vp of ['desktop', 'desktop2x', 'phone']) {
    await run(vp, '', 'idle 2 s', async () => sleep(2000));
    await run(vp, '', 'drag (lens webgl, panes bend)', drag(vp));
    await run(vp, 'tint=tinted', 'drag, Tinted (17-tap frost)', drag(vp));
    await run(vp, '', 'scroll (lens webgl, panes bend)', scroll(vp));
    await run(vp, 'bend=off', 'scroll, panes frosted only (the Safari/Firefox recipe)', scroll(vp));
    await run(vp, '', 'scroll, lens hidden', scroll(vp), (p) => p.evaluate(() => window.__lens.setHidden(true)));
    await run(vp, 'orbs=css', 'scroll, CSS scroll-driven orbs', scroll(vp));
  }
  await run('desktop', 'lens=svg', 'drag (SVG lens, Chromium route)', drag('desktop'));
  await run('desktop2x', 'lens=svg', 'drag (SVG lens, Chromium route)', drag('desktop2x'));
  await run('phone', 'lens=svg', 'drag (SVG lens, Chromium route)', drag('phone'));
}

if (STAGES.includes('throttled')) {
  // A phone's CPU is several times slower than this desktop's, and the lens
  // does its model read, physics and uniform upload on the main thread. The
  // same drag and scroll runs with the CPU slowed 6x over CDP (Lighthouse's
  // mobile profile uses 4x). This slows script and layout only, not the GPU.
  // (An uncapped run, vsync and frame limit off, was tried first and
  // dropped: rAF then fires thousands of times a second without a frame
  // being produced, so its rate measures nothing.)
  console.log('throttled...');
  results.throttled = [];
  const runT = async (vp, params, what, act, pre) => {
    const s = await open(vp, params);
    const cdp = await s.page.context().newCDPSession(s.page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
    if (pre) await pre(s.page);
    await s.page.waitForTimeout(500);
    const st = await lensState(s.page);
    await s.page.evaluate(() => window.__lens.resetFrames());
    await act(s.page, st);
    const frames = await s.page.evaluate(() => window.__lens.frames.slice());
    const r = { vp, params, what, cpuThrottle: 6, ...stats(frames) };
    results.throttled.push(r);
    console.log(JSON.stringify(r));
    await s.close();
  };
  const dragT = async (p, st) => {
    const path = [];
    for (let t = 0; t <= 3000; t += 8) {
      const a = (t / 1000) * Math.PI * 1.3;
      path.push([t, st.x - 70 + 70 * Math.cos(a), st.y + 42 * Math.sin(a)]);
    }
    await touchPath(p, path);
    await sleep(300);
  };
  const scrollT = async (p) => { await scrollGesture(p, 'phone', 560, 1400); await sleep(500); await scrollGesture(p, 'phone', -560, 1400); await sleep(500); };
  await runT('phone', '', 'drag, WebGL lens Clear', dragT);
  await runT('phone', 'tint=tinted', 'drag, WebGL lens Tinted', dragT);
  await runT('phone', '', 'scroll, panes bend + lens', scrollT);
  await runT('phone', 'orbs=css', 'scroll, CSS orbs, panes bend + lens', scrollT);
  await runT('phone', '', 'scroll, lens hidden', scrollT, (p) => p.evaluate(() => window.__lens.setHidden(true)));
}

if (STAGES.includes('align')) {
  console.log('align...');
  results.align = { rest: [], scroll: [] };
  // At rest: identity probe (the model backdrop, unbent) against the page
  // with the lens hidden, inside the disc.
  for (const vp of ['desktop', 'phone']) {
    for (const orbs of ['js', 'css']) {
      const s = await open(vp, `probe=identity&orbs=${orbs}`);
      const dpr = VP[vp].deviceScaleFactor;
      // Put the lens on an orb's edge so a misplaced orb would show.
      const target = await s.page.evaluate(() => { const o = window.__lens.model().orbs[0]; return [o.cx, o.cy + o.r]; });
      await s.page.evaluate(([x, y]) => window.__lens.moveTo(x, y), target);
      // Scroll a little so the orbs have moved off their layout positions.
      await s.page.evaluate(() => scrollTo(0, 240));
      await s.page.waitForTimeout(400);
      const st = await lensState(s.page);
      const withLens = await pixels(await shot(s.page, null));
      await s.page.evaluate(() => window.__lens.setHidden(true));
      await s.page.waitForTimeout(250);
      const without = await pixels(await shot(s.page, null));
      let sum = 0, n = 0, max = 0, over8 = 0;
      const R = (st.R - 1.5) * dpr;
      const cx = st.x * dpr, cy = st.y * dpr;
      for (let y = Math.floor(cy - R); y <= cy + R; y++) {
        for (let x = Math.floor(cx - R); x <= cx + R; x++) {
          if ((x - cx) ** 2 + (y - cy) ** 2 > R * R) continue;
          const k = (y * withLens.width + x) * 4;
          const d = Math.max(Math.abs(withLens.data[k] - without.data[k]), Math.abs(withLens.data[k + 1] - without.data[k + 1]), Math.abs(withLens.data[k + 2] - without.data[k + 2]));
          sum += d; n++; max = Math.max(max, d); if (d > 8) over8++;
        }
      }
      const r = { vp, orbs, meanAbs: Math.round((sum / n) * 100) / 100, max, pctOver8: Math.round((over8 / n) * 10000) / 100, pixels: n };
      results.align.rest.push(r);
      console.log('rest', JSON.stringify(r));
      await s.close();
    }
  }
  // While scrolling: seam probe. Left of the lens's centre line is the
  // canvas (model backdrop, unbent); right of it is the page. Per frame, the
  // vertical shift that best lines the two columns up is the lens's lag.
  for (const vp of ['desktop', 'phone']) {
    for (const orbs of ['js', 'css']) {
      const s = await open(vp, `probe=seam&orbs=${orbs}`);
      const v = VP[vp].viewport;
      // The seam runs down orb 2's middle, starting on its top edge: the top
      // edge is in the window at first, leaves as the orb rises, and
      // the bottom edge crosses later in the scroll; the settled frames after
      // the scroll are the at-rest control.
      const target = await s.page.evaluate(() => { const o = window.__lens.model().orbs[2]; return [o.cx, o.cy - o.r]; });
      await s.page.evaluate(([x, y]) => window.__lens.moveTo(x, y), target);
      await s.page.waitForTimeout(300);
      const st = await lensState(s.page);
      const ms = vp === 'phone' ? 3400 : 2000;
      const frames = await film(s.page, ms, async () => { await scrollGesture(s.page, vp, vp === 'phone' ? 560 : 1100, vp === 'phone' ? 420 : 1400); if (vp === 'phone') { await sleep(150); await scrollGesture(s.page, vp, 560, 420); } }, 95);
      const per = [];
      for (const f of frames) {
        const img = await pixels(Buffer.from(f.data, 'base64'));
        const k = img.width / v.width;
        const y0 = Math.round((st.y - st.R * 0.8) * k), y1 = Math.round((st.y + st.R * 0.8) * k);
        // The strongest vertical edge in a column: its y (CSS px, sub-pixel
        // by the gradient's centroid) and strength.
        const edge = (dxCss) => {
          const x = Math.round((st.x + dxCss) * k);
          const lum = [];
          for (let y = y0; y <= y1; y++) { const i = (y * img.width + x) * 4; lum.push(img.data[i] + img.data[i + 1] + img.data[i + 2]); }
          let best = 0, bi = -1;
          for (let i = 1; i < lum.length - 1; i++) { const g = Math.abs(lum[i + 1] - lum[i - 1]); if (g > best) { best = g; bi = i; } }
          if (bi < 0) return null;
          let sw = 0, sy = 0;
          for (let i = Math.max(1, bi - 3); i <= Math.min(lum.length - 2, bi + 3); i++) { const g = Math.abs(lum[i + 1] - lum[i - 1]); sw += g; sy += g * i; }
          return { y: (y0 + sy / sw) / k, g: best };
        };
        // Two columns each side of the seam; each side's edge is extrapolated
        // to the seam, so a slanted edge does not read as an offset.
        const L6 = edge(-7), L2 = edge(-3), R2 = edge(3), R6 = edge(7);
        const ok = [L6, L2, R2, R6].every((e) => e && e.g > 60) && Math.abs(L2.y - R2.y) < 24 && Math.abs(L6.y - L2.y) < 12 && Math.abs(R6.y - R2.y) < 12;
        let dy = null;
        if (ok) {
          const yl = L2.y + (L2.y - L6.y) * (3 / 4);
          const yr = R2.y - (R6.y - R2.y) * (3 / 4);
          dy = Math.round((yr - yl) * 100) / 100;
        }
        per.push({ ms: f.ms, measurable: ok, dyCssPx: dy });
      }
      const meas = per.filter((p) => p.measurable && p.ms >= 0);
      const abs = meas.map((p) => Math.abs(p.dyCssPx)).sort((x, y) => x - y);
      const r = {
        vp, orbs, frames: per.length, measurable: meas.length,
        settledDy: per.length && per[per.length - 1].measurable ? per[per.length - 1].dyCssPx : null,
        medianAbsDy: abs.length ? abs[Math.floor(abs.length / 2)] : null,
        p90AbsDy: abs.length ? abs[Math.floor(abs.length * 0.9)] : null,
        maxAbsDy: abs.length ? abs[abs.length - 1] : null,
        framesOver1px: abs.filter((x) => x > 1).length,
        framesOver2px: abs.filter((x) => x > 2).length,
        per,
      };
      results.align.scroll.push(r);
      console.log('scroll', JSON.stringify({ ...r, per: undefined }));
      // A strip of the seam region for the eye.
      await strip(pick(frames, 8, ms), `align__seam-scroll__${vp}__orbs-${orbs}.png`, { cols: 8, cellW: 150, box: { x: st.x - st.R * 1.2, y: st.y - st.R * 1.2, w: st.R * 2.4, h: st.R * 2.4 }, vpWidth: v.width, title: `seam probe while scrolling (${vp}, orbs=${orbs}): left half is the lens's model, right half the page` });
      await s.close();
    }
  }
}

if (STAGES.includes('trace')) {
  console.log('trace...');
  results.trace = {};
  const s = await open('desktop');
  const p = s.page;
  const run = async (name, act) => {
    await p.evaluate(() => window.__lens.moveTo(innerWidth * 0.5, innerHeight * 0.5));
    await p.waitForTimeout(300);
    const st = await lensState(p);
    await p.evaluate(() => window.__lens.startTrace());
    await act(st);
    await p.waitForTimeout(1600);
    const tr = await p.evaluate(() => window.__lens.stopTrace());
    return tr;
  };
  const analyse = (tr, axis) => {
    const rel = tr.findIndex((f, i) => i > 0 && tr[i - 1].held && !f.held);
    const after = rel >= 0 ? tr.slice(rel) : [];
    const pos = after.map((f) => f[axis]);
    const vel = after.map((f) => f[axis === 'x' ? 'vx' : 'vy']);
    const v0 = vel[0] ?? 0;
    const dir = Math.sign(v0);
    const reversals = vel.filter((v) => Math.sign(v) === -dir && Math.abs(v) > 0.01).length;
    let backtrack = 0;
    for (let i = 1; i < pos.length; i++) backtrack = Math.max(backtrack, -dir * (pos[i] - pos[i - 1]));
    const stopIdx = after.findIndex((f) => f.vx === 0 && f.vy === 0);
    const eAfter = after.map((f) => f.e);
    let extrema = 0;
    for (let i = 1; i < eAfter.length - 1; i++) if ((eAfter[i] - eAfter[i - 1]) * (eAfter[i + 1] - eAfter[i]) < -1e-9) extrema++;
    return {
      releaseSpeed: Math.round(Math.hypot(after[0]?.vx ?? 0, after[0]?.vy ?? 0)),
      glideMs: stopIdx > 0 ? Math.round(after[stopIdx].t - after[0].t) : null,
      glideDistance: stopIdx > 0 ? Math.round(Math.abs(after[stopIdx][axis] - after[0][axis])) : null,
      peakStretchPct: Math.round(Math.max(...tr.map((f) => f.e)) * 10000) / 100,
      velocityReversals: reversals,
      maxBacktrackPx: Math.round(backtrack * 1000) / 1000,
      stretchTurningPointsAfterRelease: extrema,
    };
  };
  const fling = await run('fling', (st) => mousePath(p, flingPath([st.x, st.y], [st.x - 200, st.y], [st.x - 60, st.y], 400, 100)));
  results.trace.fling = analyse(fling, 'x');
  const hard = await run('hard', (st) => mousePath(p, flingPath([st.x, st.y], [st.x + 80, st.y], [st.x - 260, st.y], 200, 90)));
  results.trace.hardFling = analyse(hard, 'x');
  const wall = await run('wall', (st) => mousePath(p, flingPath([st.x, st.y], [st.x + 100, st.y], [st.x + 380, st.y], 250, 90)));
  const wallA = analyse(wall, 'x');
  const x1 = (await p.evaluate(() => window.__lens.bounds()))[2];
  const contact = wall.findIndex((f) => !f.held && f.x >= x1 - 0.01);
  wallA.contactSpeedBefore = contact > 0 ? Math.round(Math.abs(wall[contact - 1].vx)) : null;
  wallA.speedAfterContact = contact >= 0 ? Math.round(Math.abs(wall[contact].vx)) : null;
  wallA.leftWallAfterContactPx = contact >= 0 ? Math.round(Math.max(0, ...wall.slice(contact).map((f) => x1 - f.x)) * 1000) / 1000 : null;
  results.trace.wall = wallA;
  const zig = await run('zigzag', (st) => {
    const path = [];
    for (let t = 0; t <= 1600; t += 8) path.push([t, st.x + 240 * Math.sin((t / 1600) * Math.PI * 4), st.y + 60 * Math.sin((t / 1600) * Math.PI * 2)]);
    return mousePath(p, path);
  });
  results.trace.zigzag = { peakStretchPct: Math.round(Math.max(...zig.map((f) => f.e)) * 10000) / 100, peakLift: Math.round(Math.max(...zig.map((f) => f.lift)) * 1000) / 1000 };
  console.log(JSON.stringify(results.trace, null, 1));
  await plotTrace({ fling, wall, zig, x1 }, 'trace__handling__desktop.png');
  await s.close();
}

async function plotTrace({ fling, wall, zig, x1 }, file) {
  const W = 1400, H = 900, PAD = 60;
  const c = createCanvas(W, H);
  const g = c.getContext('2d');
  g.fillStyle = '#fbfaf8';
  g.fillRect(0, 0, W, H);
  const panels = [
    { title: 'Fling: position (px, left axis) and stretch (%, right axis)', tr: fling, key: 'x', y: 30 },
    { title: `Fling into the right wall (stops at x = ${Math.round(x1)} px)`, tr: wall, key: 'x', y: 320, wall: x1 },
    { title: 'Zigzag drag: stretch (%) and lift', tr: zig, key: null, y: 610 },
  ];
  for (const pnl of panels) {
    const tr = pnl.tr;
    const t0 = tr[0].t, t1 = tr[tr.length - 1].t;
    const px0 = PAD, px1 = W - PAD, py0 = pnl.y + 30, py1 = pnl.y + 250;
    g.fillStyle = '#222';
    g.font = '600 16px sans-serif';
    g.fillText(pnl.title, px0, pnl.y + 16);
    g.strokeStyle = '#ccc';
    g.lineWidth = 1;
    g.strokeRect(px0, py0, px1 - px0, py1 - py0);
    const X = (t) => px0 + ((t - t0) / (t1 - t0)) * (px1 - px0);
    // Held span shading.
    g.fillStyle = 'rgba(40,90,200,0.08)';
    let hs = null;
    tr.forEach((f, i) => { if (f.held && hs == null) hs = f.t; if ((!f.held || i === tr.length - 1) && hs != null) { g.fillRect(X(hs), py0, X(f.t) - X(hs), py1 - py0); hs = null; } });
    const series = (vals, lo, hi, color, width = 2) => {
      g.strokeStyle = color;
      g.lineWidth = width;
      g.beginPath();
      tr.forEach((f, i) => { const y = py1 - ((vals[i] - lo) / (hi - lo || 1)) * (py1 - py0); i ? g.lineTo(X(f.t), y) : g.moveTo(X(f.t), y); });
      g.stroke();
    };
    if (pnl.key) {
      const vals = tr.map((f) => f[pnl.key]);
      let lo = Math.min(...vals), hi = Math.max(...vals);
      if (pnl.wall) hi = Math.max(hi, pnl.wall);
      lo -= 10; hi += 10;
      series(vals, lo, hi, '#1f4fa8', 2.5);
      if (pnl.wall) {
        const y = py1 - ((pnl.wall - lo) / (hi - lo)) * (py1 - py0);
        g.strokeStyle = '#c0392b'; g.setLineDash([6, 4]); g.beginPath(); g.moveTo(px0, y); g.lineTo(px1, y); g.stroke(); g.setLineDash([]);
      }
      g.fillStyle = '#1f4fa8'; g.font = '13px sans-serif';
      g.fillText(`${Math.round(hi)} px`, px0 + 4, py0 + 14); g.fillText(`${Math.round(lo)} px`, px0 + 4, py1 - 6);
    }
    series(tr.map((f) => f.e * 100), 0, 4.5, '#e0662b', 2);
    g.fillStyle = '#e0662b'; g.font = '13px sans-serif';
    g.fillText('stretch 0 to 4.5 %', px1 - 130, py0 + 14);
    if (!pnl.key) series(tr.map((f) => f.lift), 0, 1.1, '#2a9d6f', 2), g.fillStyle = '#2a9d6f', g.fillText('lift 0 to 1.1', px1 - 130, py0 + 30);
    g.fillStyle = '#555';
    g.fillText(`${Math.round(t1 - t0)} ms; shaded = held`, px0, py1 + 18);
  }
  await writeFile(join(OUT, file), await c.encode('png'));
}

results.run = { at: new Date().toISOString(), stages: STAGES, port: PORT, missing, offsite, problems };
await writeFile(resultsFile, JSON.stringify(results, null, 1));
await browser.close();
server.close();
console.log(`done -> ${OUT}`);
if (offsite.length) console.log('OFFSITE REQUESTS:', offsite);
if (missing.length) console.log('MISSING:', missing);
if (problems.length) console.log('PROBLEMS:', problems);
process.exit(offsite.length || problems.length ? 3 : 0);
