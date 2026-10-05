/* B2 task 5 probe: the cottagecore floaters (fireflies by lamplight, dandelion
   seeds by day) on GPU Chromium.

   Usage (each against a frozen build):
     BDL_GPU=1 node scripts/themes/snap.mjs --name s5-b2-t5-r0 --port 4460 -- node scripts/themes/cottagecore/b2-t5-probe.mjs after
     BDL_GPU=1 node scripts/themes/snap.mjs --name s5-b2-t4-r1 --reuse --port 4460 -- node scripts/themes/cottagecore/b2-t5-probe.mjs before
   Stages (second argument, default all): films cost pointer swap sheets

   Everything the page does is read back from the pixels of the live canvas
   (no hook in fx.ts): blobs by connected components on the alpha channel, and
   the share of lit pixels that fall inside an unpadded line of text, so a halo
   counts, not only a centre. Films are timestamped strips. */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const label = process.argv[2] || 'after';
const stages = (process.argv[3] || 'films,cost,pointer,swap,sheets').split(',');
const base = (process.env.SNAP_BASE || 'http://127.0.0.1:4460').replace(/\/$/, '');
const out = join('scripts', 'themes', '.out', 'stage5', 'b2', 's5-b2-t5', label);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const SIZES = [
  { id: '1440', w: 1440, h: 900, dpr: 1 },
  { id: '1280', w: 1280, h: 800, dpr: 1 },
  { id: '1024', w: 1024, h: 800, dpr: 1 },
  { id: '820', w: 820, h: 1000, dpr: 1 },
  { id: '390', w: 390, h: 844, dpr: 2, mobile: true },
];
const sz = (id) => SIZES.find((s) => s.id === id);
const report = { label, renderer: null, films: {}, cost: {}, pointer: {}, swap: {}, errors: [] };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function open(scheme, s, { network = true } = {}) {
  const context = await browser.newContext({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: s.dpr, isMobile: !!s.mobile, hasTouch: !!s.mobile, colorScheme: scheme, reducedMotion: 'no-preference' });
  await suppressPrompt(context);
  await context.addInitScript((sc) => { try { localStorage.setItem('scheme', sc); localStorage.setItem('theme', sc); } catch {} }, scheme);
  await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'error') report.errors.push(`${m.text()}`); });
  page.on('pageerror', (e) => report.errors.push(`pageerror: ${e.message}`));
  return { context, page };
}
async function go(page, path, scheme) {
  await page.goto(`${base}/t/cottagecore/${path}`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(600);
  const sc = await page.evaluate(() => document.documentElement.dataset.scheme);
  if (scheme && sc !== scheme) throw new Error(`scheme is ${sc}, wanted ${scheme}`);
}

/* In the page: read the canvas, label blobs, and say how much of what is lit
   sits on a line of text. Defined once on window so later calls are cheap. */
async function install(page) {
  await page.evaluate(() => {
    window.__t5 = {
      lines() {
        const out = [];
        const range = document.createRange();
        document.querySelectorAll('header, main, footer').forEach((region) => {
          const w = document.createTreeWalker(region, NodeFilter.SHOW_TEXT);
          for (let n = w.nextNode(); n; n = w.nextNode()) {
            if (!n.nodeValue.trim()) continue;
            range.selectNodeContents(n);
            for (const r of range.getClientRects()) if (r.width > 1 && r.height > 1) out.push([r.left, r.top, r.right, r.bottom]);
          }
          region.querySelectorAll('input, textarea, button').forEach((el) => { const r = el.getBoundingClientRect(); if (r.width > 1) out.push([r.left, r.top, r.right, r.bottom]); });
        });
        return out;
      },
      scan(minA, minArea) {
        // Max-pool the alpha channel into 4 px blocks (hairlines survive), label
        // 8-connected blobs on the pooled grid dilated by one block, and report
        // each blob's centre, area (CSS px squared of pooled cells) and peak alpha.
        const c = document.querySelector('[data-cc-motes]');
        const ctx = c.getContext('2d');
        const W = c.width, H = c.height;
        const k = W / innerWidth;
        const data = ctx.getImageData(0, 0, W, H).data;
        const step = 4;
        const gw = Math.ceil(W / step), gh = Math.ceil(H / step);
        const peakG = new Uint8Array(gw * gh);
        for (let y = 0; y < H; y++) {
          const gy = (y / step) | 0;
          for (let x = 0; x < W; x++) {
            const a = data[(y * W + x) * 4 + 3];
            if (a) { const g = gy * gw + ((x / step) | 0); if (a > peakG[g]) peakG[g] = a; }
          }
        }
        const lines = this.lines();
        let lit = 0, onText = 0;
        const grid = new Uint8Array(gw * gh);
        for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
          if (peakG[y * gw + x] >= minA) {
            grid[y * gw + x] = 1;
            lit++;
            const cx = ((x + 0.5) * step) / k, cy = ((y + 0.5) * step) / k;
            for (const r of lines) if (cx >= r[0] && cx <= r[2] && cy >= r[1] && cy <= r[3]) { onText++; break; }
          }
        }
        const dil = new Uint8Array(gw * gh);
        for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) if (grid[y * gw + x]) {
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < gw && ny < gh) dil[ny * gw + nx] = 1;
          }
        }
        const cell = (step * step) / (k * k);
        const covers = [...document.querySelectorAll('.cc-paper, .cc-torn')].map((e) => e.getBoundingClientRect());
        let hiddenBlobs = 0;
        const blobs = [];
        const seen = new Uint8Array(gw * gh);
        for (let i = 0; i < dil.length; i++) {
          if (!dil[i] || seen[i]) continue;
          const stack = [i]; seen[i] = 1;
          let n = 0, sx = 0, sy = 0, peak = 0;
          while (stack.length) {
            const j = stack.pop();
            const x = j % gw, y = (j - x) / gw;
            if (grid[j]) { n++; sx += x; sy += y; if (peakG[j] > peak) peak = peakG[j]; }
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
              const nx = x + dx, ny = y + dy;
              if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
              const q = ny * gw + nx;
              if (dil[q] && !seen[q]) { seen[q] = 1; stack.push(q); }
            }
          }
          if (n * cell >= minArea) {
            const bx = Math.round(((sx / n + 0.5) * step) / k), by = Math.round(((sy / n + 0.5) * step) / k);
            // Under a sheet, the canvas still holds the pixels but nobody sees them.
            if (covers.some((r) => bx >= r.left && bx <= r.right && by >= r.top && by <= r.bottom)) hiddenBlobs++;
            else blobs.push({ x: bx, y: by, area: Math.round(n * cell), peak });
          }
        }
        return { lit: Math.round(lit * cell), onText: Math.round(onText * cell), blobs, hiddenBlobs };
      },
    };
  });
}

/* A timestamped strip: frames in a grid, each with its time and its numbers. */
async function strip(frames, file, cols = 3) {
  const { context, page } = await open('light', { w: 1200, h: 800, dpr: 1 });
  const cell = Math.floor(1180 / cols);
  const html = `<body style="margin:8px;background:#222;font:12px sans-serif;color:#eee"><div style="display:grid;grid-template-columns:repeat(${cols},${cell}px);gap:6px">${frames.map((f) => `<figure style="margin:0"><img src="data:image/jpeg;base64,${f.buf.toString('base64')}" style="width:${cell}px;display:block"/><figcaption>${f.caption}</figcaption></figure>`).join('')}</div></body>`;
  await page.setContent(html);
  await page.waitForTimeout(300);
  await page.screenshot({ path: file, fullPage: true, type: 'jpeg', quality: 80 });
  await context.close();
}

async function film(scheme, sizeId, path, name, seconds = scheme === 'dark' ? 30 : 20, every = scheme === 'dark' ? 200 : 500) {
  const s = sz(sizeId);
  const { context, page } = await open(scheme, s);
  await go(page, path, scheme);
  await install(page);
  const frames = [];
  const t0 = Date.now();
  while (Date.now() - t0 < seconds * 1000) {
    const at = (Date.now() - t0) / 1000;
    const buf = await page.screenshot({ type: 'jpeg', quality: 70 });
    const m = await page.evaluate((dark) => window.__t5.scan(dark ? 60 : 14, dark ? 6 : 150), scheme === 'dark');
    frames.push({ at, buf, m });
    await sleep(every);
  }
  const totalLit = frames.reduce((a, f) => a + f.m.lit, 0);
  const totalOnText = frames.reduce((a, f) => a + f.m.onText, 0);
  const shown = frames.map((f) => f.m.blobs.length);
  const stats = {
    frames: frames.length,
    blobsMax: Math.max(...shown),
    blobsMin: Math.min(...shown),
    blobsMean: +(shown.reduce((a, b) => a + b, 0) / shown.length).toFixed(2),
    framesWith2plus: shown.filter((n) => n >= 2).length,
    framesWithNone: shown.filter((n) => n === 0).length,
    litPx: totalLit,
    onTextPx: totalOnText,
    onTextShare: totalLit ? +(totalOnText / totalLit).toFixed(4) : 0,
    framesWithAnyOnText: frames.filter((f) => f.m.onText > 0).length,
  };
  // Pick six. Light: the busiest, the quietest and four spread in time. Dark: the
  // four brightest flashes at least a second apart, the quietest, and a middle one.
  const idx = new Set();
  if (scheme === 'dark') {
    const order = frames.map((f, i) => i).sort((p, q) => frames[q].m.lit - frames[p].m.lit);
    for (const i of order) {
      if (idx.size >= 4) break;
      if ([...idx].every((j) => Math.abs(frames[j].at - frames[i].at) >= 1)) idx.add(i);
    }
    idx.add(order[order.length - 1]);
    idx.add(order[Math.floor(order.length / 2)]);
  } else {
    idx.add(shown.indexOf(Math.max(...shown)));
    idx.add(shown.indexOf(Math.min(...shown)));
    for (let i = 0; idx.size < 6 && i < frames.length; i += Math.max(1, Math.floor(frames.length / 5))) idx.add(i);
  }
  const pick = [...idx].sort((a, b) => a - b).slice(0, 6).map((i) => frames[i]);
  await strip(pick.map((f) => ({ buf: f.buf, caption: `${name} ${scheme} ${sizeId}  t=${f.at.toFixed(1)}s  blobs ${f.m.blobs.length}  on text ${f.m.onText}px` })), join(out, `film-${name}__${scheme}__${sizeId}.jpg`));
  // The first screen at t ~ 1 s, for the phone's "two or three on the first screen".
  stats.firstScreenBlobs = frames.slice(0, 4).map((f) => f.m.blobs.length);
  report.films[`${name}/${scheme}/${sizeId}`] = stats;
  console.log(`film ${name} ${scheme} ${sizeId}`, JSON.stringify(stats));
  await context.close();
}

if (stages.includes('films')) {
  const jobs = [
    ['dark', '1440', '', 'home'], ['dark', '390', '', 'home'],
    ['light', '1440', '', 'home'], ['light', '390', '', 'home'],
    ['light', '1440', 'about/', 'about'], ['light', '390', 'about/', 'about'],
  ];
  for (const [scheme, id, path, name] of jobs) await film(scheme, id, path, name);
}

/* Cost: CDP task time per second idle (12 s) and over a 5 s scroll, and the
   layout reads made during that scroll (getBoundingClientRect, getClientRects). */
if (stages.includes('cost')) {
  for (const scheme of ['dark', 'light']) for (const id of ['1440', '390']) {
    const s = sz(id);
    const { context, page } = await open(scheme, s);
    await go(page, '', scheme);
    const cdp = await context.newCDPSession(page);
    await cdp.send('Performance.enable');
    const task = async () => (await cdp.send('Performance.getMetrics')).metrics.find((m) => m.name === 'TaskDuration').value;
    await page.evaluate(() => {
      window.__reads = 0;
      const a = Element.prototype.getBoundingClientRect;
      Element.prototype.getBoundingClientRect = function () { window.__reads++; return a.call(this); };
      const b = Range.prototype.getClientRects;
      Range.prototype.getClientRects = function () { window.__reads++; return b.call(this); };
      window.__cb = [];
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (fn) => raf((t) => { const s0 = performance.now(); fn(t); window.__cb.push(performance.now() - s0); });
    });
    await page.evaluate(() => { window.__cb = []; });
    const a0 = await task();
    await sleep(12000);
    const a1 = await task();
    const idleMs = ((a1 - a0) / 12) * 1000;
    const cb = await page.evaluate(() => window.__cb.slice());
    await page.evaluate(() => { window.__reads = 0; window.__cb = []; });
    const b0 = await task();
    const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    for (let i = 0; i < 50; i++) { await page.evaluate((y) => window.scrollTo(0, y), (total * (i + 1)) / 50); await sleep(100); }
    const b1 = await task();
    const reads = await page.evaluate(() => window.__reads);
    const sorted = cb.slice().sort((x, y) => x - y);
    const c = {
      idleTaskMsPerS: +idleMs.toFixed(2),
      scrollTaskMs5s: +((b1 - b0) * 1000).toFixed(1),
      layoutReadsDuringScroll: reads,
      rafCallbackMeanMs: +(cb.reduce((x, y) => x + y, 0) / Math.max(1, cb.length)).toFixed(3),
      rafCallbackP95Ms: +(sorted[Math.floor(sorted.length * 0.95)] ?? 0).toFixed(3),
      rafCallbackMaxMs: +(sorted[sorted.length - 1] ?? 0).toFixed(3),
      callbacks: cb.length,
    };
    report.cost[`${scheme}/${id}`] = c;
    console.log('cost', scheme, id, JSON.stringify(c));
    await context.close();
  }
}

/* Pointer. Dark: learn where a mote lives from a lit blob, wait until it is
   dark, then bring the cursor (1440) or a finger (390) to it and look for a
   flash there within 700 ms. Light: a seed is followed while a cursor sweeps
   through it (1440) or a tap lands behind it (390). */
async function pointerDark(id) {
  const s = sz(id);
  const { context, page } = await open('dark', s);
  await go(page, '', 'dark');
  await install(page);
  // Find a mote on the open cloth: lit, with no text within 60 px.
  let spot = null;
  const t0 = Date.now();
  while (!spot && Date.now() - t0 < 40000) {
    const m = await page.evaluate(() => window.__t5.scan(120, 6));
    const lines = await page.evaluate(() => window.__t5.lines());
    for (const b of m.blobs) {
      const clear = !lines.some((r) => b.x > r[0] - 60 && b.x < r[2] + 60 && b.y > r[1] - 60 && b.y < r[3] + 60);
      if (clear && b.x > 30 && b.y > 30) { spot = b; break; }
    }
    await sleep(120);
  }
  if (!spot) { report.pointer[`dark/${id}`] = { found: false }; await context.close(); return; }
  // Wait until it is dark again (no blob within 40 px).
  const dark0 = Date.now();
  for (;;) {
    const m = await page.evaluate(() => window.__t5.scan(30, 4));
    if (!m.blobs.some((b) => Math.hypot(b.x - spot.x, b.y - spot.y) < 45)) break;
    if (Date.now() - dark0 > 15000) break;
    await sleep(150);
  }
  await sleep(1600); // clear of the touch cooldown and any burst
  const frames = [];
  const shoot = async (cap) => {
    const clip = { x: Math.max(0, spot.x - 100), y: Math.max(0, spot.y - 70), width: 200, height: 140 };
    const buf = await page.screenshot({ type: 'jpeg', quality: 80, clip });
    const m = await page.evaluate(() => window.__t5.scan(30, 4));
    const near = m.blobs.filter((b) => Math.hypot(b.x - spot.x, b.y - spot.y) < 45);
    frames.push({ buf, caption: `${cap}  near blobs ${near.length}  peak ${near.length ? Math.max(...near.map((b) => b.peak)) : 0}` });
    return near;
  };
  const before = await shoot('before');
  const tStart = Date.now();
  if (s.mobile) await page.touchscreen.tap(spot.x + 6, spot.y + 4);
  else { await page.mouse.move(spot.x - 120, spot.y + 40); await page.mouse.move(spot.x + 4, spot.y + 2, { steps: 12 }); }
  let peak = 0;
  for (let i = 0; i < 6; i++) {
    const near = await shoot(`+${Date.now() - tStart} ms`);
    if (near.length) peak = Math.max(peak, ...near.map((b) => b.peak));
    await sleep(90);
  }
  await strip(frames.map((f) => ({ buf: f.buf, caption: `${id} dark ${f.caption}` })), join(out, `pointer-dark__${id}.jpg`), 4);
  report.pointer[`dark/${id}`] = { found: true, spot, darkBefore: before.length === 0, flashPeakAlpha: peak, flashed: peak >= 150 };
  console.log('pointer dark', id, JSON.stringify(report.pointer[`dark/${id}`]));
  await context.close();
}

async function pointerLight(id) {
  const s = sz(id);
  const { context, page } = await open('light', s);
  await go(page, '', 'light');
  await install(page);
  // Follow a seed that is well inside the view and clear of text.
  let seed = null;
  const t0 = Date.now();
  while (!seed && Date.now() - t0 < 60000) {
    const m = await page.evaluate(() => window.__t5.scan(14, 150));
    const lines = await page.evaluate(() => window.__t5.lines());
    for (const b of m.blobs) {
      const inside = b.x > 70 && b.x < s.w - 70 && b.y > 70 && b.y < s.h - 70;
      const clear = !lines.some((r) => b.x > r[0] - 70 && b.x < r[2] + 70 && b.y > r[1] - 70 && b.y < r[3] + 70);
      if (inside && clear) { seed = b; break; }
    }
    await sleep(150);
  }
  if (!seed) { report.pointer[`light/${id}`] = { found: false }; await context.close(); return; }
  const frames = [];
  const track = [];
  const sample = async (cap) => {
    const m = await page.evaluate(() => window.__t5.scan(14, 150));
    const last = track.length ? track[track.length - 1] : seed;
    const near = m.blobs.slice().sort((p, q) => Math.hypot(p.x - last.x, p.y - last.y) - Math.hypot(q.x - last.x, q.y - last.y))[0];
    const ok = near && Math.hypot(near.x - last.x, near.y - last.y) < 160;
    if (ok) track.push({ t: Date.now(), x: near.x, y: near.y });
    const c = ok ? near : last;
    const clip = { x: Math.max(0, Math.min(s.w - 300, c.x - 150)), y: Math.max(0, Math.min(s.h - 240, c.y - 120)), width: 300, height: 240 };
    frames.push({ buf: await page.screenshot({ type: 'jpeg', quality: 80, clip }), caption: `${id} light ${cap}  seed ${ok ? near.x + ',' + near.y : 'out'}` });
    return ok ? near : null;
  };
  // Its own breeze first: two samples about 500 ms apart.
  await sample('before');
  await sleep(500);
  const p1 = await sample('breeze');
  const p0 = track[0];
  const dtB = p1 ? (track[track.length - 1].t - p0.t) / 1000 : 0.5;
  const v0 = p1 ? { x: (p1.x - p0.x) / dtB, y: (p1.y - p0.y) / dtB } : { x: 21, y: -11 };
  const at = track[track.length - 1];
  const tPass = Date.now();
  const fromX = at.x > s.w / 2 ? at.x + 200 : Math.max(5, at.x - 200);
  if (s.mobile) await page.touchscreen.tap(Math.max(5, Math.min(s.w - 5, at.x - 40)), at.y + 30);
  else {
    await page.mouse.move(Math.min(s.w - 2, fromX), at.y + 20);
    await page.mouse.move(at.x + (at.x > s.w / 2 ? -20 : 20), at.y + 10, { steps: 25 });
  }
  let worst = 0;
  for (let i = 0; i < 5; i++) {
    await sleep(240);
    const q = await sample(`+${Date.now() - tPass} ms`);
    if (q) {
      const dt = (Date.now() - tPass) / 1000;
      const exp = { x: at.x + v0.x * dt, y: at.y + v0.y * dt };
      worst = Math.max(worst, Math.hypot(q.x - exp.x, q.y - exp.y));
    }
  }
  await strip(frames, join(out, `pointer-light__${id}.jpg`), 3);
  report.pointer[`light/${id}`] = { found: true, start: { x: seed.x, y: seed.y }, breezePxPerS: { x: Math.round(v0.x), y: Math.round(v0.y) }, offTrackPx: Math.round(worst), track: track.map((p) => ({ x: p.x, y: p.y })) };
  console.log('pointer light', id, JSON.stringify(report.pointer[`light/${id}`]));
  await context.close();
}
if (stages.includes('pointer')) {
  await pointerDark('1440'); await pointerDark('390');
  await pointerLight('1440'); await pointerLight('390');
}

/* The real switcher: toggle the scheme, then swap in school (About link), and
   check the canvas tears down and rebuilds with no console error. */
if (stages.includes('swap')) {
  for (const id of ['1440', '390']) {
    const s = sz(id);
    const { context, page } = await open('light', s);
    const errs0 = report.errors.length;
    await go(page, '', 'light');
    await install(page);
    const log = [];
    const lit = async () => { const m = await page.evaluate(() => window.__t5?.scan(30, 4)); return m ? m.lit : -1; };
    await sleep(2500);
    log.push({ step: 'light home', lit: await lit() });
    await page.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('.scheme').click());
    await sleep(1200);
    const sc1 = await page.evaluate(() => document.documentElement.dataset.scheme);
    // Fireflies are dark between bursts: wait for any lit pixel.
    let seen = 0; const w0 = Date.now();
    while (Date.now() - w0 < 14000 && !seen) { seen = await lit(); await sleep(150); }
    log.push({ step: `toggled to ${sc1}`, lit: seen });
    await page.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('.scheme').click());
    await sleep(1500);
    const sc2 = await page.evaluate(() => document.documentElement.dataset.scheme);
    log.push({ step: `toggled back to ${sc2}`, lit: await lit() });
    // In-school swap by the About link (a real navigation through the portal).
    await page.evaluate(() => { document.documentElement.dataset.marker = 'before'; });
    const link = page.locator('header nav a', { hasText: /about/i }).first();
    await link.click();
    await page.waitForURL(/about/, { timeout: 8000 });
    await sleep(1200);
    await install(page);
    await sleep(2500);
    log.push({ step: 'after swap to About', url: page.url(), lit: await lit(), canvases: await page.evaluate(() => document.querySelectorAll('[data-cc-motes]').length) });
    // And dark: toggle, swap back Home.
    await page.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('.scheme').click());
    await sleep(800);
    await page.locator('header .wordmark').first().click();
    await sleep(1800);
    await install(page);
    let seen2 = 0; const w1 = Date.now();
    while (Date.now() - w1 < 14000 && !seen2) { seen2 = await lit(); await sleep(150); }
    log.push({ step: 'dark, swapped home', scheme: await page.evaluate(() => document.documentElement.dataset.scheme), lit: seen2, canvases: await page.evaluate(() => document.querySelectorAll('[data-cc-motes]').length) });
    report.swap[id] = { log, newErrors: report.errors.slice(errs0) };
    console.log('swap', id, JSON.stringify(report.swap[id]));
    await context.close();
  }
}

/* Whole-page sheets, both schemes, five sizes, Home and About. */
if (stages.includes('sheets')) {
  for (const scheme of ['light', 'dark']) for (const s of SIZES) {
    const { context, page } = await open(scheme, s);
    for (const [name, path] of [['home', ''], ['about', 'about/']]) {
      await go(page, path, scheme);
      await sleep(900);
      await page.screenshot({ path: join(out, `${name}__${scheme}__${s.id}.png`), fullPage: true });
    }
    if (scheme === 'light' && s.id === '1440') report.renderer = await page.evaluate(() => { const g = document.createElement('canvas').getContext('webgl'); const e = g.getExtension('WEBGL_debug_renderer_info'); return g.getParameter(e.UNMASKED_RENDERER_WEBGL); });
    await context.close();
  }
}
if (!report.renderer) {
  const { context, page } = await open('light', sz('1440'));
  await page.goto(`${base}/t/cottagecore/`, { waitUntil: 'load' });
  report.renderer = await page.evaluate(() => { const g = document.createElement('canvas').getContext('webgl'); const e = g.getExtension('WEBGL_debug_renderer_info'); return g.getParameter(e.UNMASKED_RENDERER_WEBGL); });
  await context.close();
}
await writeFile(join(out, `report-${stages.join('-')}.json`), JSON.stringify(report, null, 2));
console.log('renderer', report.renderer, 'errors', report.errors.length, report.errors.slice(0, 5));
await browser.close();
