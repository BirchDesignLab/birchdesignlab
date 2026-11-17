/* B2 task 5 fix round 2: seed presence check for the cottagecore floaters (light scheme), read back from the live canvas pixels.
   Adapted from the verifier's r1 film script. Stages: renderer films first (default).
   BDL_GPU=1 node scripts/themes/snap.mjs --name s5-b2-t5-r2 --port 4460 -- node scripts/themes/cottagecore/b2-t5-seeds.mjs head renderer,films,first */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const mode = process.argv[2] || 'head';
const stages = (process.argv[3] || 'renderer,films,first').split(',');
const base = (process.env.SNAP_BASE || 'http://127.0.0.1:4460').replace(/\/$/, '');
const ROOT = join('scripts', 'themes', '.out', 'stage5', 'b2', 's5-b2-t5');
const V = join(ROOT, 'v-r2');
const SHEETS = join(ROOT, 'sheets', 'r2');
await mkdir(join(V, mode), { recursive: true });
await mkdir(SHEETS, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SIZES = [
  { id: '1440', w: 1440, h: 900, dpr: 1 },
  { id: '1280', w: 1280, h: 800, dpr: 1 },
  { id: '1024', w: 1024, h: 800, dpr: 1 },
  { id: '820', w: 820, h: 1000, dpr: 1 },
  { id: '390', w: 390, h: 844, dpr: 2, mobile: true },
];
const sz = (id) => SIZES.find((s) => s.id === id);
const report = { mode, renderer: null, films: {}, first: {}, pointer: {}, swap: {}, cost: {}, resize: {}, errors: [] };
const save = async () => writeFile(join(V, mode, `report-${stages.join('-')}.json`), JSON.stringify(report, null, 2));

let browser;
const launch = async () => {
  browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
};
await launch();

/* In-page instrumentation, installed before any page script. */
function instr() {
  window.__rafCalls = 0;
  window.__cb = [];
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (fn) =>
    raf((t) => {
      const s = performance.now();
      try { fn(t); } finally { window.__rafCalls++; window.__cb.push(performance.now() - s); }
    });
  window.__lis = {};
  const key = (t) => (t === window ? 'window' : t === document ? 'document' : t === document.documentElement ? 'html' : null);
  const add = EventTarget.prototype.addEventListener;
  const rem = EventTarget.prototype.removeEventListener;
  EventTarget.prototype.addEventListener = function (type, fn, o) {
    const k = key(this);
    if (k) (window.__lis[`${k}:${type}`] ||= new Set()).add(fn);
    return add.call(this, type, fn, o);
  };
  EventTarget.prototype.removeEventListener = function (type, fn, o) {
    const k = key(this);
    if (k) window.__lis[`${k}:${type}`]?.delete(fn);
    return rem.call(this, type, fn, o);
  };
  window.__reads = 0;
  const wrap = (proto, name) => {
    const f = proto[name];
    proto[name] = function (...a) { window.__reads++; return f.apply(this, a); };
  };
  wrap(Element.prototype, 'getBoundingClientRect');
  wrap(Element.prototype, 'getClientRects');
  wrap(Range.prototype, 'getClientRects');
  wrap(Range.prototype, 'getBoundingClientRect');
}

async function open(scheme, s, { instrument = false } = {}) {
  const context = await browser.newContext({
    viewport: { width: s.w, height: s.h }, deviceScaleFactor: s.dpr, isMobile: !!s.mobile, hasTouch: !!s.mobile,
    colorScheme: scheme, reducedMotion: 'no-preference',
  });
  await suppressPrompt(context);
  await context.addInitScript((sc) => { try { localStorage.setItem('scheme', sc); } catch {} }, scheme);
  if (instrument) await context.addInitScript(instr);
  await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await context.newPage();
  try {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  } catch {}
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));
  page.on('response', (r) => { if (r.status() >= 400) errs.push(`${r.status()} ${r.url()}`); });
  page.on('requestfailed', (r) => { if (!r.url().includes('/cdn-cgi/zaraz/')) errs.push(`requestfailed ${r.url()}`); });
  page.__errs = errs;
  return { context, page };
}

async function go(page, path, scheme, { hideSwitcher = true } = {}) {
  await page.goto(`${base}/t/cottagecore/${path}`, { waitUntil: 'networkidle' });
  if (hideSwitcher) await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(600);
  const sc = await page.evaluate(() => document.documentElement.dataset.scheme);
  if (scheme && sc !== scheme) throw new Error(`scheme is ${sc}, wanted ${scheme}`);
}

async function install(page) {
  await page.evaluate(() => {
    if (window.__v) return;
    window.__v = {
      lines() {
        const out = [];
        const range = document.createRange();
        for (const region of document.querySelectorAll('header, main, footer')) {
          const w = document.createTreeWalker(region, NodeFilter.SHOW_TEXT);
          for (let n = w.nextNode(); n; n = w.nextNode()) {
            if (!n.nodeValue.trim()) continue;
            range.selectNodeContents(n);
            for (const r of range.getClientRects()) if (r.width > 1 && r.height > 1) out.push([r.left, r.top, r.right, r.bottom]);
          }
          for (const el of region.querySelectorAll('input, textarea, button')) {
            const r = el.getBoundingClientRect();
            if (r.width > 1) out.push([r.left, r.top, r.right, r.bottom]);
          }
        }
        return out;
      },
      /* Blobs of the canvas' alpha at or above thr, pooled in 4 px blocks, 8-connected
         after a one-block dilation; area in CSS px squared. onText: lit blocks whose
         centre falls inside an unpadded line box, at thr and at 60 (clearly visible). */
      scan(thr, minArea) {
        const c = document.querySelector('[data-cc-motes]');
        if (!c) return { missing: true, blobs: [], hidden: 0, lit: 0, onText: 0, onTextStrong: 0 };
        const ctx = c.getContext('2d');
        const W = c.width, H = c.height, k = W / innerWidth, step = 4;
        const d = ctx.getImageData(0, 0, W, H).data;
        const gw = Math.ceil(W / step), gh = Math.ceil(H / step);
        const peak = new Uint8Array(gw * gh);
        for (let y = 0; y < H; y++) {
          const gy = (y / step) | 0;
          for (let x = 0; x < W; x++) {
            const a = d[(y * W + x) * 4 + 3];
            if (a) { const g = gy * gw + ((x / step) | 0); if (a > peak[g]) peak[g] = a; }
          }
        }
        const lines = this.lines();
        const cell = (step * step) / (k * k);
        let lit = 0, onText = 0, onTextStrong = 0;
        const grid = new Uint8Array(gw * gh);
        for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
          const p = peak[y * gw + x];
          if (p >= thr) {
            grid[y * gw + x] = 1; lit++;
            const cx = ((x + 0.5) * step) / k, cy = ((y + 0.5) * step) / k;
            for (const r of lines) if (cx >= r[0] && cx <= r[2] && cy >= r[1] && cy <= r[3]) { onText++; if (p >= 60) onTextStrong++; break; }
          }
        }
        const dil = new Uint8Array(gw * gh);
        for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) if (grid[y * gw + x])
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < gw && ny < gh) dil[ny * gw + nx] = 1;
          }
        const covers = [...document.querySelectorAll('.cc-paper, .cc-torn, .cc-gingham')].map((e) => e.getBoundingClientRect());
        const seen = new Uint8Array(gw * gh);
        const blobs = [];
        let hidden = 0;
        for (let i = 0; i < dil.length; i++) {
          if (!dil[i] || seen[i]) continue;
          const st = [i]; seen[i] = 1;
          let n = 0, sx = 0, sy = 0, pk = 0;
          while (st.length) {
            const j = st.pop(); const x = j % gw, y = (j - x) / gw;
            if (grid[j]) { n++; sx += x; sy += y; if (peak[j] > pk) pk = peak[j]; }
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
              const nx = x + dx, ny = y + dy;
              if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
              const q = ny * gw + nx;
              if (dil[q] && !seen[q]) { seen[q] = 1; st.push(q); }
            }
          }
          if (n * cell >= minArea) {
            const bx = Math.round(((sx / n + 0.5) * step) / k), by = Math.round(((sy / n + 0.5) * step) / k);
            if (covers.some((r) => bx >= r.left && bx <= r.right && by >= r.top && by <= r.bottom)) hidden++;
            else blobs.push({ x: bx, y: by, area: Math.round(n * cell), peak: pk });
          }
        }
        return { blobs, hidden, lit: Math.round(lit * cell), onText: Math.round(onText * cell), onTextStrong: Math.round(onTextStrong * cell) };
      },
    };
  });
}

/* A timestamped strip of jpeg frames with a caption under each. */
async function strip(frames, file, cols, cellW) {
  const imgs = await Promise.all(frames.map((f) => loadImage(f.buf)));
  const sc = cellW / imgs[0].width;
  const capH = 34;
  const cellH = Math.max(...imgs.map((i) => Math.round(i.height * sc))) + capH;
  const rows = Math.ceil(imgs.length / cols);
  const G = 8;
  const cv = createCanvas(cols * (cellW + G) + G, rows * (cellH + G) + G);
  const g = cv.getContext('2d');
  g.fillStyle = '#222'; g.fillRect(0, 0, cv.width, cv.height);
  g.font = '15px sans-serif';
  imgs.forEach((im, i) => {
    const x = G + (i % cols) * (cellW + G), y = G + Math.floor(i / cols) * (cellH + G);
    g.drawImage(im, x, y, cellW, Math.round(im.height * sc));
    g.fillStyle = '#eee';
    const lines = frames[i].caption.split('\n');
    lines.forEach((ln, j) => g.fillText(ln, x + 2, y + Math.round(im.height * sc) + 15 + j * 16));
  });
  await writeFile(file, cv.toBuffer('image/jpeg', 82));
}

const GL = () => {
  const g = document.createElement('canvas').getContext('webgl');
  const e = g.getExtension('WEBGL_debug_renderer_info');
  return g.getParameter(e.UNMASKED_RENDERER_WEBGL);
};

/* ---------------- renderer ---------------- */
if (stages.includes('renderer')) {
  const { context, page } = await open('light', sz('1440'));
  await page.goto(`${base}/t/cottagecore/`, { waitUntil: 'load' });
  report.renderer = await page.evaluate(GL);
  await writeFile(join(V, 'renderer.txt'), report.renderer);
  console.log('renderer', report.renderer);
  await context.close();
}

/* ---------------- films ---------------- */
async function film({ scheme, size, path, name, seconds, every, thr, minArea }) {
  const s = sz(size);
  const { context, page } = await open(scheme, s);
  await go(page, path, scheme);
  await install(page);
  const frames = [];
  const t0 = Date.now();
  while (Date.now() - t0 < seconds * 1000) {
    const at = (Date.now() - t0) / 1000;
    const m0 = await page.evaluate(([a, b]) => window.__v.scan(a, b), [thr, minArea]);
    const buf = await page.screenshot({ type: 'jpeg', quality: 72, scale: 'css' });
    const m1 = await page.evaluate(([a, b]) => window.__v.scan(a, b), [thr, minArea]);
    frames.push({ at, buf, n0: m0.blobs.length, n1: m1.blobs.length, hid: Math.max(m0.hidden, m1.hidden), m: m1, m0 });
    await sleep(every);
  }
  const nMax = (f) => Math.max(f.n0, f.n1);
  const shown = frames.map(nMax);
  const lits = frames.map((f) => f.m.lit + f.m0.lit);
  const stats = {
    seconds, frames: frames.length,
    blobsMax: Math.max(...shown), blobsMin: Math.min(...shown), blobsMean: +(shown.reduce((a, b) => a + b, 0) / shown.length).toFixed(2),
    framesWith1plus: shown.filter((n) => n >= 1).length, framesWith2plus: shown.filter((n) => n >= 2).length, framesWithNone: shown.filter((n) => n === 0).length,
    hiddenMax: Math.max(...frames.map((f) => f.hid)),
    onTextPxMax: Math.max(...frames.map((f) => Math.max(f.m.onText, f.m0.onText))),
    onTextStrongPxMax: Math.max(...frames.map((f) => Math.max(f.m.onTextStrong, f.m0.onTextStrong))),
    framesWithOnText: frames.filter((f) => f.m.onText > 0 || f.m0.onText > 0).length,
    framesWithOnTextStrong: frames.filter((f) => f.m.onTextStrong > 0 || f.m0.onTextStrong > 0).length,
  };
  // Pick six frames.
  const idx = new Set();
  if (scheme === 'dark') {
    const order = frames.map((_, i) => i).sort((p, q) => shown[q] - shown[p] || lits[q] - lits[p]);
    for (const i of order) { if (idx.size >= 3) break; if ([...idx].every((j) => Math.abs(frames[j].at - frames[i].at) >= 2)) idx.add(i); }
    const zero = frames.map((_, i) => i).filter((i) => shown[i] === 0);
    if (zero.length) { idx.add(zero[0]); idx.add(zero[Math.floor(zero.length / 2)]); idx.add(zero[zero.length - 1]); }
  } else {
    idx.add(shown.indexOf(Math.max(...shown)));
    idx.add(shown.indexOf(Math.min(...shown)));
    for (let i = 0; idx.size < 6 && i < frames.length; i += Math.max(1, Math.floor(frames.length / 5))) idx.add(i);
  }
  const pick = [...idx].sort((a, b) => a - b).slice(0, 6).map((i) => frames[i]);
  const cap = (f) => `${name} ${scheme} ${size}  t=${f.at.toFixed(1)}s  lit blobs ${f.n0}/${f.n1}${f.hid ? ` (+${f.hid} under sheets)` : ''}  on text ${Math.max(f.m.onText, f.m0.onText)}px`;
  const cols = s.mobile ? 3 : 2;
  const file = join(SHEETS, `film-${name}__${scheme}__${size}.jpg`);
  await strip(pick.map((f) => ({ buf: f.buf, caption: cap(f) })), file, cols, s.mobile ? 360 : 700);
  stats.sheet = file;
  stats.errors = page.__errs.slice();
  report.films[`${name}/${scheme}/${size}`] = stats;
  console.log('film', name, scheme, size, JSON.stringify({ ...stats, errors: stats.errors.length }));
  await context.close();
}
if (stages.includes('films')) {
  await film({ scheme: 'light', size: '1440', path: '', name: 'home', seconds: 24, every: 400, thr: 14, minArea: 150 });
  await film({ scheme: 'light', size: '390', path: '', name: 'home', seconds: 24, every: 250, thr: 14, minArea: 150 });
  await film({ scheme: 'light', size: '1440', path: 'about/', name: 'about', seconds: 24, every: 400, thr: 14, minArea: 150 });
  await film({ scheme: 'light', size: '390', path: 'about/', name: 'about', seconds: 24, every: 250, thr: 14, minArea: 150 });
  await save();
}

/* ---------------- first screen after a fresh load (seeds) ---------------- */
async function first({ size, path, name, loads, shotAt = 1.5, watch = 7 }) {
  const s = sz(size);
  const shots = [];
  const series = [];
  for (let i = 0; i < loads; i++) {
    const { context, page } = await open('light', s);
    await page.goto(`${base}/t/cottagecore/${path}`, { waitUntil: 'domcontentloaded' });
    await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
    await page.waitForFunction(() => !!document.querySelector('[data-cc-motes]'));
    await install(page);
    const rows = [];
    let shot = null;
    for (;;) {
      const t = await page.evaluate(() => performance.now() / 1000);
      if (t > watch) break;
      const m = await page.evaluate(() => window.__v.scan(14, 150));
      rows.push({ t: +t.toFixed(2), n: m.blobs.length, strong: m.onTextStrong, any: m.onText });
      if (!shot && t >= shotAt) shot = { buf: await page.screenshot({ type: 'jpeg', quality: 80, scale: 'css' }), t, n: m.blobs.length };
      await sleep(80);
    }
    const win = rows.filter((r) => r.t >= 1.0);
    series.push({
      load: i + 1, nAt1_5: shot?.n ?? null, minFrom1s: Math.min(...win.map((r) => r.n)), maxFrom1s: Math.max(...win.map((r) => r.n)),
      onTextStrongMax: Math.max(...rows.map((r) => r.strong)), onTextAnyMax: Math.max(...rows.map((r) => r.any)), errors: page.__errs.length,
    });
    shots.push({ buf: shot.buf, caption: `${name} light ${size} load ${i + 1}  t=${shot.t.toFixed(1)}s\nseeds on first screen ${shot.n}` });
    await context.close();
  }
  const file = join(SHEETS, `first-${name}__light__${size}.jpg`);
  await strip(shots, file, s.mobile ? 3 : 3, s.mobile ? 380 : 620);
  report.first[`${name}/${size}`] = { loads: series, sheet: file };
  console.log('first', name, size, JSON.stringify(series));
}
if (stages.includes('first')) {
  await first({ size: '390', path: '', name: 'home', loads: 10 });
  await first({ size: '390', path: 'about/', name: 'about', loads: 10 });
  await first({ size: '1440', path: '', name: 'home', loads: 5 });
  await first({ size: '1440', path: 'about/', name: 'about', loads: 5 });
  await save();
}

/* ---------------- pointer ---------------- */
async function pointerDark(id) {
  const s = sz(id);
  const { context, page } = await open('dark', s);
  await go(page, '', 'dark');
  await install(page);
  let spot = null;
  const t0 = Date.now();
  while (!spot && Date.now() - t0 < 60000) {
    const m = await page.evaluate(() => window.__v.scan(120, 6));
    const lines = await page.evaluate(() => window.__v.lines());
    for (const b of m.blobs) {
      const clear = !lines.some((r) => b.x > r[0] - 50 && b.x < r[2] + 50 && b.y > r[1] - 50 && b.y < r[3] + 50);
      if (clear && b.x > 30 && b.y > 30 && b.x < s.w - 30 && b.y < s.h - 30) { spot = b; break; }
    }
    await sleep(100);
  }
  if (!spot) { report.pointer[`dark/${id}`] = { found: false }; await context.close(); return; }
  // Wait for it to go dark, plus the end of its burst's cooldown.
  const d0 = Date.now();
  for (;;) {
    const m = await page.evaluate(() => window.__v.scan(25, 4));
    if (!m.blobs.some((b) => Math.hypot(b.x - spot.x, b.y - spot.y) < 50)) break;
    if (Date.now() - d0 > 15000) break;
    await sleep(120);
  }
  await sleep(1500);
  // Control: still dark?
  const frames = [];
  const shoot = async (cap) => {
    const clip = { x: Math.max(0, spot.x - 110), y: Math.max(0, spot.y - 80), width: 220, height: 160 };
    const m = await page.evaluate(() => window.__v.scan(25, 4));
    const buf = await page.screenshot({ type: 'jpeg', quality: 85, clip, scale: 'css' });
    const near = m.blobs.filter((b) => Math.hypot(b.x - spot.x, b.y - spot.y) < 50);
    const pk = near.length ? Math.max(...near.map((b) => b.peak)) : 0;
    frames.push({ buf, caption: `dark ${id} ${cap}\nlit blobs here ${near.length}  peak alpha ${pk}` });
    return pk;
  };
  const pre1 = await shoot('control, before');
  await sleep(300);
  const pre2 = await shoot('control, 300 ms on');
  const tStart = Date.now();
  if (s.mobile) await page.touchscreen.tap(spot.x + 5, spot.y + 4);
  else { await page.mouse.move(Math.max(2, spot.x - 150), spot.y + 50); await page.mouse.move(spot.x + 3, spot.y + 2, { steps: 14 }); }
  let peak = 0, peakAt = 0;
  for (let i = 0; i < 9; i++) {
    const pk = await shoot(`${s.mobile ? 'tap' : 'cursor'} +${Date.now() - tStart} ms`);
    if (pk > peak) { peak = pk; peakAt = Date.now() - tStart; }
    await sleep(70);
  }
  const file = join(SHEETS, `pointer-dark__${id}.jpg`);
  await strip(frames, file, 4, 330);
  report.pointer[`dark/${id}`] = { found: true, spot, controlPeaks: [pre1, pre2], flashPeakAlpha: peak, peakAtMs: peakAt, flashed: peak >= 150 && pre1 < 60 && pre2 < 60, sheet: file, errors: page.__errs.length };
  console.log('pointer dark', id, JSON.stringify(report.pointer[`dark/${id}`]));
  await context.close();
}

async function pointerLight(id) {
  const s = sz(id);
  const { context, page } = await open('light', s);
  await go(page, '', 'light');
  await install(page);
  let seed = null;
  const t0 = Date.now();
  while (!seed && Date.now() - t0 < 90000) {
    const m = await page.evaluate(() => window.__v.scan(14, 150));
    const lines = await page.evaluate(() => window.__v.lines());
    for (const b of m.blobs) {
      const M = s.mobile ? 40 : 90; const inside = b.x > M && b.x < s.w - M && b.y > M && b.y < s.h - M;
      const clear = !lines.some((r) => b.x > r[0] - M && b.x < r[2] + M && b.y > r[1] - M && b.y < r[3] + M);
      if (inside && clear) { seed = b; break; }
    }
    await sleep(120);
  }
  if (!seed) { report.pointer[`light/${id}`] = { found: false }; await context.close(); return; }
  const track = [];
  const frames = [];
  const nearest = (m, ref) => m.blobs.slice().sort((p, q) => Math.hypot(p.x - ref.x, p.y - ref.y) - Math.hypot(q.x - ref.x, q.y - ref.y))[0];
  const sample = async (cap, shot = true) => {
    const m = await page.evaluate(() => window.__v.scan(14, 150));
    const ref = track.length ? track[track.length - 1] : seed;
    const b = nearest(m, ref);
    const ok = b && Math.hypot(b.x - ref.x, b.y - ref.y) < 120;
    const now = Date.now();
    if (ok) track.push({ t: now, x: b.x, y: b.y });
    if (shot) {
      const c = ok ? b : ref;
      const clip = { x: Math.max(0, Math.min(s.w - 320, c.x - 160)), y: Math.max(0, Math.min(s.h - 260, c.y - 130)), width: 320, height: 260 };
      frames.push({ buf: await page.screenshot({ type: 'jpeg', quality: 85, clip, scale: 'css' }), caption: `light ${id} ${cap}\nseed at ${ok ? b.x + ',' + b.y : 'lost'}` });
    }
    return ok ? { t: now, x: b.x, y: b.y } : null;
  };
  // Its own breeze: five samples over 600 ms.
  await sample('before');
  for (let i = 0; i < 5; i++) { await sleep(110); await sample('', false); }
  const p0 = track[0], p1 = track[track.length - 1];
  const dtB = (p1.t - p0.t) / 1000;
  const v0 = { x: (p1.x - p0.x) / dtB, y: (p1.y - p0.y) / dtB };
  const speed0 = Math.hypot(v0.x, v0.y);
  const at = track[track.length - 1];
  // Where the cursor ends up: left of the seed (pushing it right/ahead is weak evidence), so come from
  // below-right and end up lower-right of it, pushing it up/left, against the breeze.
  const tPass = Date.now();
  let cur;
  if (s.mobile) { cur = { x: Math.max(8, Math.min(s.w - 8, at.x + 35)), y: Math.min(s.h - 8, at.y + 30) }; await page.touchscreen.tap(cur.x, cur.y); }
  else {
    cur = { x: at.x + 28, y: at.y + 22 };
    await page.mouse.move(Math.min(s.w - 2, at.x + 260), Math.min(s.h - 2, at.y + 200));
    await page.mouse.move(cur.x, cur.y, { steps: 22 });
  }
  const after = [];
  for (let i = 0; i < 9; i++) {
    const q = await sample(`${s.mobile ? 'tap' : 'cursor'} +${Date.now() - tPass} ms`, i % 2 === 1 || i < 2);
    if (q) after.push(q);
    await sleep(110);
  }
  // Velocity after, over successive samples; and the push component away from the cursor.
  let peakSpeed = 0, awayMax = 0;
  for (let i = 1; i < after.length; i++) {
    const dt = (after[i].t - after[i - 1].t) / 1000;
    if (dt <= 0) continue;
    const vx = (after[i].x - after[i - 1].x) / dt, vy = (after[i].y - after[i - 1].y) / dt;
    peakSpeed = Math.max(peakSpeed, Math.hypot(vx, vy));
    const dx = after[i - 1].x - cur.x, dy = after[i - 1].y - cur.y, d = Math.hypot(dx, dy) || 1;
    awayMax = Math.max(awayMax, (vx * dx + vy * dy) / d);
  }
  // Displacement from the unperturbed path at the last sample.
  const last = after[after.length - 1] || at;
  const dtL = (last.t - at.t) / 1000;
  const expect = { x: at.x + v0.x * dtL, y: at.y + v0.y * dtL };
  const dev = Math.hypot(last.x - expect.x, last.y - expect.y);
  const file = join(SHEETS, `pointer-light__${id}.jpg`);
  await strip(frames, file, 3, 400);
  report.pointer[`light/${id}`] = {
    found: true, start: { x: seed.x, y: seed.y }, cursor: cur, breezePxPerS: { x: Math.round(v0.x), y: Math.round(v0.y), speed: Math.round(speed0) },
    peakSpeedAfter: Math.round(peakSpeed), awayComponentMax: Math.round(awayMax), deviationFromBreezePx: Math.round(dev), samplesAfter: after.length, sheet: file, errors: page.__errs.length,
  };
  console.log('pointer light', id, JSON.stringify(report.pointer[`light/${id}`]));
  await context.close();
}
if (stages.includes('pointerl390')) { await pointerLight('390'); await save(); }
if (stages.includes('pointer')) {
  await pointerDark('1440'); await pointerDark('390');
  await pointerLight('1440'); await pointerLight('390');
  await save();
}

/* ---------------- scheme toggle, in-school swap, arrival, teardown ---------------- */
async function swapFlow(id) {
  const s = sz(id);
  const { context, page } = await open('light', s, { instrument: true });
  await page.goto(`${base}/t/quiet/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => { window.__persist = 1; });
  const log = [];
  const measure = async (step) => {
    await install(page);
    const c0 = await page.evaluate(() => window.__rafCalls);
    await sleep(2000);
    const c1 = await page.evaluate(() => window.__rafCalls);
    const info = await page.evaluate(() => ({
      url: location.pathname, theme: document.documentElement.dataset.theme, scheme: document.documentElement.dataset.scheme,
      persisted: window.__persist === 1,
      canvases: document.querySelectorAll('[data-cc-motes]').length,
      lis: Object.fromEntries(['window:pointermove', 'window:pointerdown', 'window:resize', 'html:pointerleave', 'document:visibilitychange'].map((k) => [k, window.__lis[k]?.size ?? 0])),
    }));
    const scan = info.canvases ? await page.evaluate(() => window.__v.scan(14, 150)) : null;
    log.push({ step, ...info, rafPerS: +((c1 - c0) / 2).toFixed(1), lit: scan ? scan.blobs.length : null });
  };
  const sw = (cls) => page.evaluate((c) => document.querySelector('bdl-switcher').shadowRoot.querySelector(c).click(), cls);
  await measure('quiet, before');
  // Arrival through the real switcher.
  await sw('.open');
  await sleep(500);
  await page.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('a[data-school="cottagecore"]').click());
  await page.waitForURL(/\/t\/cottagecore\//, { timeout: 10000 });
  await sleep(1500);
  await measure('arrived cottagecore (light)');
  // Scheme toggle to dark, then back.
  await sw('.scheme'); await sleep(900);
  let seen = 0; const w0 = Date.now();
  while (Date.now() - w0 < 16000 && !seen) { seen = (await page.evaluate(() => window.__v.scan(30, 4))).blobs.length; await sleep(120); }
  await measure(`toggled to dark (a mote lit within ${((Date.now() - w0) / 1000).toFixed(1)}s: ${seen})`);
  await sw('.scheme'); await sleep(1200);
  await measure('toggled back to light');
  // In-school swaps through the real nav.
  const nav = async (re, url) => {
    await page.locator('header nav a', { hasText: re }).first().click();
    await page.waitForURL(url, { timeout: 10000 });
    await sleep(1400);
  };
  await nav(/about/i, /about/);
  await measure('swap to About (light)');
  await sw('.scheme'); await sleep(900);
  await nav(/service/i, /services/);
  await measure('toggled dark, swap to Services');
  await page.locator('header .wordmark').first().click();
  await page.waitForURL(/\/t\/cottagecore\/$/, { timeout: 10000 });
  await sleep(1500);
  await measure('swap to Home (dark)');
  // Leave through the switcher: every cottagecore listener should be gone.
  await sw('.open'); await sleep(500);
  await page.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('a[data-school="quiet"]').click());
  await page.waitForURL(/\/t\/quiet\//, { timeout: 10000 });
  await sleep(1500);
  await measure('left to quiet');
  report.swap[id] = { log, errors: page.__errs.slice() };
  console.log('swap', id, JSON.stringify(report.swap[id], null, 0));
  await context.close();
}
if (stages.includes('swap')) {
  await swapFlow('1440'); await swapFlow('390');
  await save();
}

/* ---------------- cost: CPU and layout reads, idle and over a scroll ---------------- */
if (stages.includes('cost')) {
  for (const scheme of ['dark', 'light']) for (const id of ['1440', '390']) {
    const s = sz(id);
    const { context, page } = await open(scheme, s, { instrument: true });
    await go(page, '', scheme);
    const cdp = await context.newCDPSession(page);
    await cdp.send('Performance.enable');
    const task = async () => (await cdp.send('Performance.getMetrics')).metrics.find((m) => m.name === 'TaskDuration').value;
    await sleep(1500);
    await page.evaluate(() => { window.__cb = []; });
    const a0 = await task(); await sleep(12000); const a1 = await task();
    const cb = await page.evaluate(() => window.__cb.slice());
    await page.evaluate(() => { window.__reads = 0; window.__cb = []; });
    const b0 = await task();
    const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    for (let i = 0; i < 60; i++) { await page.evaluate((y) => window.scrollTo(0, y), (total * (i + 1)) / 60); await sleep(90); }
    const b1 = await task();
    const reads = await page.evaluate(() => window.__reads);
    const srt = cb.slice().sort((x, y) => x - y);
    report.cost[`${scheme}/${id}`] = {
      idleTaskMsPerS: +(((a1 - a0) / 12) * 1000).toFixed(2), scrollTaskMsTotal: +((b1 - b0) * 1000).toFixed(1), layoutReadsDuringScroll: reads, scrollTotalPx: total,
      rafCbMeanMs: +(cb.reduce((x, y) => x + y, 0) / Math.max(1, cb.length)).toFixed(3), rafCbP95Ms: +(srt[Math.floor(srt.length * 0.95)] ?? 0).toFixed(3), rafCbMaxMs: +(srt[srt.length - 1] ?? 0).toFixed(3), idleCallbacks: cb.length,
    };
    console.log('cost', mode, scheme, id, JSON.stringify(report.cost[`${scheme}/${id}`]));
    await context.close();
  }
  await save();
}

/* ---------------- resize: debounced, no synchronous sweep ---------------- */
if (stages.includes('resize')) {
  const s = sz('1440');
  for (const scheme of ['dark', 'light']) {
    const { context, page } = await open(scheme, s, { instrument: true });
    await go(page, '', scheme);
    await sleep(1000);
    await page.evaluate(() => { window.__reads = 0; });
    const sizes = [1380, 1320, 1260, 1200, 1250, 1300, 1350, 1400, 1440].map((w) => ({ width: w, height: 900 }));
    // Fire the burst inside the page, so nothing but the resize listeners run between the events.
    const during = [];
    for (const v of sizes) {
      await page.setViewportSize(v);
      during.push(await page.evaluate(() => window.__reads));
      await sleep(16);
    }
    const right = await page.evaluate(() => window.__reads);
    await sleep(500);
    const settled = await page.evaluate(() => window.__reads);
    report.resize[scheme] = { readsAfterEachResize: during, readsRightAfterBurst: right, readsAfterDebounce: settled };
    console.log('resize', scheme, JSON.stringify(report.resize[scheme]));
    await context.close();
  }
  await save();
}

/* ---------------- sheets: whole page, every size, both schemes ---------------- */
const PAGES = [['home', ''], ['about', 'about/'], ['services', 'services/'], ['contact', 'contact/'], ['sent', 'contact/sent/']];
if (stages.includes('sheets')) {
  const dirA = join(V, mode, 'sheet');
  const dirN = join(V, mode, 'nofx');
  await mkdir(dirA, { recursive: true });
  await mkdir(dirN, { recursive: true });
  for (const scheme of (process.env.SCHEMES || 'light,dark').split(',')) for (const s of SIZES) {
    const { context, page } = await open(scheme, s);
    for (const [name, path] of PAGES) {
      await go(page, path, scheme);
      await sleep(900);
      await page.screenshot({ path: join(dirA, `${name}__${scheme}__${s.id}.png`), fullPage: true });
      await page.addStyleTag({ content: '[data-cc-motes]{display:none!important}' });
      await sleep(250);
      await page.screenshot({ path: join(dirN, `${name}__${scheme}__${s.id}.png`), fullPage: true, animations: 'disabled' });
    }
    report.errors.push(...page.__errs);
    await context.close();
    console.log('sheets', mode, scheme, s.id);
  }
  await save();
}

await save();
await browser.close();
console.log('done', mode);
