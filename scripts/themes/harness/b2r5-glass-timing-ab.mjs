/**
 * Glass's cross-school arrival, timed and traced, two builds interleaved run
 * by run, with optional one-layer removals: where did the Stage 3 gates'
 * extra ~200 ms of glassmorphism firstVisible come from?
 *
 * Written 09-26-26 for Tier 3 Stage 3 wave B2 round 5 (seat glass-timing),
 * READ-ONLY on src/. The instrumentation, firstVisible (screencast pixel
 * diff), trace categories and trace sums are copied from
 * scripts/themes/trace-arrival.mjs so the numbers read the same way as the
 * gates' columns; what this adds:
 *   - two or more builds (--builds name=url,...) in the same run loop,
 *     order alternated run by run, so machine drift (other agents building
 *     and filming) lands on both sides equally;
 *   - --from <school> (the gates start on quiet; the round-5 brief asks for
 *     vaporwave);
 *   - --variants: base, or a layer taken out of the glass destination only,
 *     WITHOUT editing source (CSS added to the incoming document at
 *     astro:before-swap, or requests blocked over CDP after the start page
 *     settled, so the HTTP cache is not disabled the way context.route would):
 *       nohome    block glass Home's page script (the lens, the orb clock,
 *                 the Control Centre wiring, the poster placement);
 *       noimg     block the wallpaper images (avif and webp);
 *       nofilter  backdrop-filter and filter none on the glass page;
 *       nocc      the Control Centre hidden (visibility, layout kept);
 *       noposter  the lens poster hidden;
 *       nowebgl   getContext('webgl*') returns null on the glass page;
 *       notiles   the Control Centre's tiles hidden, its panel kept;
 *       layers    (a candidate fix, not a removal) the Control Centre and
 *                 the hero window given will-change: transform;
 *   - --trigger link (a script click on an injected link, as the gates do)
 *     or switcher (a real mouse: the switcher's button, the dialog left to
 *     warm, then the glassmorphism row), clicked from the top of the page;
 *   - --trace: a Chrome trace per run (browser.startTracing), summed per
 *     phase and inside the longest presented-frame gap, plus the renderer
 *     main thread's long tasks and every shader compile, WebGL program link
 *     and image decode between the trigger and the first visible frame;
 *   - a frame strip (JPEG sheet, times labelled) of each build's first run
 *     per variant: the film.
 * GPU Chromium (BDL_GPU=1 required; aborts on SwiftShader), a fresh browser
 * per run (cold shader cache, as the gates), prefers-reduced-transparency
 * forced to no-preference over CDP, the portal prompt suppressed.
 *
 * Usage (serve builds with snap.mjs --reuse --hold first):
 *   BDL_GPU=1 node scripts/themes/harness/b2r5-glass-timing-ab.mjs \
 *     --builds b1=http://127.0.0.1:4477,cur=http://127.0.0.1:4476 \
 *     [--from vaporwave] [--viewport desktop|mobile] [--scheme dark] [--runs 5] \
 *     [--variants base,nohome,...] [--trigger link|switcher] [--trace] [--tag x]
 * Output: scripts/themes/.out/stage3-b2/glass-timing/<tag>.json (every run,
 * with its trace summary), <tag>.md (medians), strip-<tag>-<build>-<variant>.jpg.
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VIEWPORTS } from '../capture.mjs';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'stage3-b2', 'glass-timing');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const flag = (n) => process.argv.includes(`--${n}`);
const builds = arg('builds', '').split(',').filter(Boolean).map((s) => {
  const [name, url] = s.split('=');
  return { name, url: url.replace(/\/$/, '') };
});
if (!builds.length) throw new Error('--builds name=url,... required');
const fromId = arg('from', 'vaporwave');
const vpName = arg('viewport', 'desktop');
const scheme = arg('scheme', 'dark');
const runs = Number(arg('runs', '5'));
const variants = arg('variants', 'base').split(',').filter(Boolean);
const trigger = arg('trigger', 'link');
const doTrace = flag('trace');
const keepTraces = flag('keep-traces');
const tag = arg('tag', `${vpName}-${scheme}-${fromId}-${trigger}`);
const vp = VIEWPORTS[vpName];
if (!vp) throw new Error(`unknown viewport ${vpName}`);
if (process.env.BDL_GPU !== '1') throw new Error('BDL_GPU=1 required (GPU Chromium only)');
const FROM = `/t/${fromId}/`;
const TO = '/t/glassmorphism/';
const FILM_MS = 2000;
const IDLE_MS = 400;
const DIFF_LEVEL = 32;
const DIFF_FLOOR = 0.004;
const DIFF_W = 320;

const G = "html[data-theme='glassmorphism']";
const VARIANTS = {
  base: {},
  nohome: { block: ['*/_astro/Home.astro_astro_type_script_*'] },
  noimg: { block: ['*/_astro/dark-*.avif', '*/_astro/dark-*.webp', '*/_astro/light-*.avif', '*/_astro/light-*.webp'] },
  nofilter: { css: `${G} *, ${G} *::before, ${G} *::after { filter: none !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }` },
  nocc: { css: `${G} [data-control-centre] { visibility: hidden !important; }` },
  noposter: { css: `${G} .lens-poster { visibility: hidden !important; }` },
  // A candidate fix, not a removal: the Control Centre and the hero window
  // promoted to their own composited layers, so their first raster is
  // separate GPU work the display compositor can draw between.
  layers: { css: `${G} [data-control-centre], ${G} .hero .window { will-change: transform; }` },
  // nohome + nocc + noposter + noimg together: B2's first-view additions out
  // at once (does the B1-like early fade come back?).
  combo: {
    block: ['*/_astro/Home.astro_astro_type_script_*', '*/_astro/dark-*.avif', '*/_astro/dark-*.webp', '*/_astro/light-*.avif', '*/_astro/light-*.webp'],
    css: `${G} [data-control-centre], ${G} .lens-poster { visibility: hidden !important; }`,
  },
  // The Control Centre's tiles hidden but the panel kept (its own frost).
  notiles: { css: `${G} [data-control-centre] > * { visibility: hidden !important; }` },
  nowebgl: {
    js: () => {
      const get = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
        if (/webgl/i.test(type) && document.documentElement.dataset.theme === 'glassmorphism') return null;
        return get.call(this, type, ...rest);
      };
    },
  },
};
for (const v of variants) if (!VARIANTS[v]) throw new Error(`unknown variant ${v}`);

const launch = () => chromium.launch({
  args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
});

/* Copied from trace-arrival.mjs's instrument(), trimmed; plus a capture-phase
   click listener so a real mouse click (the switcher) marks the trigger. */
function instrument() {
  const T = (window.__bdlTrace = { marks: [], frames: [], armed: false, wall: 0, perf: 0 });
  const mark = (name, extra) => {
    T.marks.push({ name, t: performance.now(), ...extra });
    try { performance.mark('bdl:' + name); } catch {}
  };
  window.__bdlMark = mark;
  const startFrames = () => {
    const perf = performance.now();
    const tick = (ts) => {
      T.frames.push(ts);
      if (!T.marks.some((m) => m.name === 'vt-finished') && ts - perf < 5000) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  window.__bdlFire = () => {
    T.marks = [];
    T.frames = [];
    T.wall = Date.now();
    T.perf = performance.now();
    mark('trigger');
    startFrames();
  };
  window.addEventListener('click', () => { if (T.armed) { T.armed = false; window.__bdlFire(); } }, true);
  for (const n of ['before-preparation', 'after-preparation', 'before-swap', 'after-swap', 'page-load']) {
    document.addEventListener('astro:' + n, () => mark(n));
  }
  document.addEventListener('astro:before-preparation', (e) => {
    const original = e.loader;
    e.loader = async () => {
      mark('loader-start');
      try { await original(); } finally { mark('loader-done'); }
    };
  });
  const start = Document.prototype.startViewTransition;
  if (start) {
    Document.prototype.startViewTransition = function (arg) {
      mark('vt-start');
      const cb = typeof arg === 'function' ? arg : arg && arg.update;
      const wrapped = cb && async function () {
        mark('vt-update-start');
        try { return await cb.apply(this, arguments); } finally { mark('vt-update-end'); }
      };
      const vt = start.call(this, typeof arg === 'function' ? wrapped : { ...arg, update: wrapped });
      const on = (p, name) => p.then(() => mark(name), () => mark(name, { rejected: true }));
      on(vt.updateCallbackDone, 'vt-updateCallbackDone');
      on(vt.ready, 'vt-ready');
      on(vt.finished, 'vt-finished');
      return vt;
    };
  }
}

/* Copied from trace-arrival.mjs's applyStubs(): CSS into every document and
   into the incoming one at astro:before-swap. */
function applyCss({ css }) {
  const add = (doc) => {
    const s = doc.createElement('style');
    s.setAttribute('data-glass-timing-stub', '');
    s.textContent = css;
    (doc.head || doc.documentElement).append(s);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => add(document));
  else add(document);
  document.addEventListener('astro:before-swap', (e) => add(e.newDocument));
}

function diffShare(a, b) {
  let moved = 0;
  for (let i = 0; i < a.length; i += 4) {
    if (Math.abs(a[i] - b[i]) > DIFF_LEVEL || Math.abs(a[i + 1] - b[i + 1]) > DIFF_LEVEL || Math.abs(a[i + 2] - b[i + 2]) > DIFF_LEVEL) moved++;
  }
  return moved / (a.length / 4);
}
async function pixels(frame) {
  const img = await loadImage(Buffer.from(frame.data, 'base64'));
  const h = Math.round((img.height / img.width) * DIFF_W);
  const c = createCanvas(DIFF_W, h);
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, DIFF_W, h);
  return ctx.getImageData(0, 0, DIFF_W, h).data;
}
async function firstVisible(frames, triggerWall, offset, trig) {
  const before = frames.filter((f) => f.at * 1000 < triggerWall);
  const after = frames.filter((f) => f.at * 1000 >= triggerWall);
  if (!before.length || !after.length) return { firstVisible: null, series: [] };
  const ref = await pixels(before[before.length - 1]);
  let noise = 0;
  for (const f of before.slice(0, -1)) noise = Math.max(noise, diffShare(ref, await pixels(f)));
  const threshold = Math.max(DIFF_FLOOR, noise * 1.5 + 0.002);
  const series = [];
  let fv = null;
  for (const f of after) {
    const ms = f.at * 1000 - offset - trig;
    const share = diffShare(ref, await pixels(f));
    series.push([Math.round(ms), Math.round(share * 10000) / 10000]);
    if (fv == null && share > threshold) fv = ms;
  }
  return { firstVisible: fv, noise, threshold, series };
}

/* The film: frames from 100 ms before the trigger to 900 ms after, times
   labelled (>= 20 px), four columns. */
async function strip(frames, offset, trig, file, title) {
  const picked = frames.map((f) => ({ ...f, ms: f.at * 1000 - offset - trig })).filter((f) => f.ms >= -100 && f.ms <= 900);
  if (!picked.length) return;
  const first = await loadImage(Buffer.from(picked[0].data, 'base64'));
  const cols = 4;
  const w = vp.mobile ? 260 : 480;
  const h = Math.round((first.height / first.width) * w);
  const lab = 30;
  const rows = Math.ceil(picked.length / cols);
  const c = createCanvas(cols * w, 44 + rows * (h + lab));
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#fff';
  ctx.font = '24px sans-serif';
  ctx.fillText(title, 8, 30);
  for (let i = 0; i < picked.length; i++) {
    const img = await loadImage(Buffer.from(picked[i].data, 'base64'));
    const x = (i % cols) * w;
    const y = 44 + Math.floor(i / cols) * (h + lab);
    ctx.fillStyle = '#fff';
    ctx.font = '22px sans-serif';
    ctx.fillText(`${Math.round(picked[i].ms)} ms`, x + 6, y + 23);
    ctx.drawImage(img, x, y + lab, w, h);
  }
  await writeFile(file, c.toBuffer('image/jpeg', 92));
}

// ------------------------------------------------------------ trace sums
function category(name) {
  if (/ViewTransition/i.test(name)) return 'view transition';
  if (/ShapeText|Shaper|ShapeResult|HarfBuzz/i.test(name)) return 'text shaping';
  if (/UpdateLayoutTree|RecalculateStyles|recalcStyle|rebuildLayoutTree|ParseAuthorStyleSheet|StyleRecalc|UpdateStyle|StyleEngine|CSSParser/i.test(name)) return 'style';
  if (/^Layout$|UpdateLayout|PerformLayout|LayoutView/i.test(name)) return 'layout';
  if (/Raster|TileManager|GpuRaster|PaintOpBuffer|DrawRecord/i.test(name)) return 'raster';
  if (/Decode|ImageDecode/i.test(name)) return 'image decode';
  if (/Paint|Layerize|UpdateLayer|CompositeLayers|Commit|UpdateLifecycle/i.test(name)) return 'paint and composite';
  if (/Font/i.test(name)) return 'font';
  if (/WaitForGetOffset|WaitSyncToken|CommandBufferProxyImpl/i.test(name)) return 'waiting on the GPU process';
  if (/ResourceFetcher|ResourceLoader|requestResource/i.test(name)) return 'resource loading';
  if (/GC|Scavenge|MarkCompact|Sweep/.test(name)) return 'garbage collection';
  if (/ParseHTML|HTMLDocumentParser|DOMParser|HTMLParser/i.test(name)) return 'HTML parse';
  if (/EvaluateScript|v8\.compile|v8\.run|FunctionCall|EventDispatch|TimerFire|FireAnimationFrame|RunMicrotasks|evaluateModule|V8\.Execute|v8\.callFunction|v8\.produce|v8\.deserialize|FireIdleCallback/i.test(name)) return 'script';
  if (/Swap|DrawAndSwap|SkiaOutputSurface|DrawFrame|Display::|Gpu|Present/i.test(name)) return 'gpu and display';
  if (/RunTask|ThreadControllerImpl|SequenceManager|MessageLoop|ProcessTask/i.test(name)) return 'task overhead';
  return 'other';
}
function selfSegments(events) {
  const sorted = events.slice().sort((p, q) => p.ts - q.ts || q.dur - p.dur);
  const out = [];
  const stack = [];
  let cursor = null;
  const emit = (name, from, to) => { if (to > from) out.push({ name, from, to }); };
  for (const e of sorted) {
    const end = e.ts + e.dur;
    while (stack.length && stack[stack.length - 1].end <= e.ts) {
      const top = stack.pop();
      emit(top.name, cursor, top.end);
      cursor = top.end;
    }
    if (stack.length) emit(stack[stack.length - 1].name, cursor, e.ts);
    const parentEnd = stack.length ? stack[stack.length - 1].end : Infinity;
    stack.push({ name: e.name, end: Math.min(end, parentEnd) });
    cursor = e.ts;
  }
  while (stack.length) {
    const top = stack.pop();
    emit(top.name, cursor, top.end);
    cursor = top.end;
  }
  return out;
}

async function analyseTrace(file, fvMs) {
  const raw = JSON.parse(await readFile(file, 'utf8'));
  const events = raw.traceEvents || raw;
  const threadName = new Map();
  for (const e of events) if (e.ph === 'M' && e.name === 'thread_name') threadName.set(`${e.pid}:${e.tid}`, e.args.name);
  const marks = {};
  let rendererPid = null;
  // The LAST bdl:trigger (the start page's own load has none; a switcher run
  // marks once), and each later mark's first occurrence after it.
  const um = events.filter((e) => typeof e.name === 'string' && e.name.startsWith('bdl:') && e.cat && e.cat.includes('user_timing')).sort((p, q) => p.ts - q.ts);
  const trig = um.filter((e) => e.name === 'bdl:trigger').pop();
  if (!trig) return { error: 'no bdl:trigger mark' };
  rendererPid = trig.pid;
  marks.trigger = trig.ts;
  for (const e of um) { const n = e.name.slice(4); if (e.ts >= trig.ts && !(n in marks)) marks[n] = e.ts; }
  if (fvMs != null) marks['first-visible'] = marks.trigger + fvMs * 1000;
  const t0 = marks.trigger;
  const tEnd = marks['first-visible'] ?? (t0 + 1000 * 1000);
  const rel = (ts) => Math.round((ts - t0) / 100) / 10;
  const group = (pid, tid) => {
    const n = threadName.get(`${pid}:${tid}`) || '';
    if (pid === rendererPid) {
      if (n === 'CrRendererMain') return 'main';
      if (n === 'Compositor') return 'compositor';
      if (n.startsWith('CompositorTileWorker')) return 'raster workers';
      return null;
    }
    if (n === 'CrGpuMain') return 'gpu main';
    if (n === 'VizCompositorThread') return 'viz';
    return null;
  };
  const byThread = new Map();
  const open = new Map();
  for (const e of events) {
    const g = group(e.pid, e.tid);
    if (!g) continue;
    const key = `${e.pid}:${e.tid}`;
    if (!byThread.has(key)) byThread.set(key, { g, ev: [] });
    if (e.ph === 'X' && typeof e.dur === 'number') byThread.get(key).ev.push({ name: e.name, ts: e.ts, dur: e.dur, args: e.args });
    else if (e.ph === 'B') { if (!open.has(key)) open.set(key, []); open.get(key).push(e); }
    else if (e.ph === 'E') { const b = open.get(key)?.pop(); if (b) byThread.get(key).ev.push({ name: b.name, ts: b.ts, dur: e.ts - b.ts, args: b.args }); }
  }
  const sumWindow = (w0, w1) => {
    const sums = {};
    for (const { g, ev } of byThread.values()) {
      for (const s of selfSegments(ev.filter((e) => e.ts < w1 && e.ts + e.dur > w0))) {
        const ms = (Math.min(s.to, w1) - Math.max(s.from, w0)) / 1000;
        if (ms <= 0) continue;
        sums[g] ??= { busy: 0, categories: {}, names: {} };
        sums[g].busy += ms;
        const c = category(s.name);
        sums[g].categories[c] = (sums[g].categories[c] || 0) + ms;
        sums[g].names[s.name] = (sums[g].names[s.name] || 0) + ms;
      }
    }
    const round = (o) => Object.fromEntries(Object.entries(o).sort((p, q) => q[1] - p[1]).map(([k, v]) => [k, Math.round(v * 10) / 10]));
    return Object.fromEntries(Object.entries(sums).map(([g, t]) => [g, { busy: Math.round(t.busy * 10) / 10, categories: round(t.categories), top: Object.fromEntries(Object.entries(round(t.names)).slice(0, 10)) }]));
  };
  const W = [
    ['trigger', 'vt-update-end', 'load, old capture, swap'],
    ['vt-update-end', 'vt-ready', 'newRender'],
    ['vt-ready', 'first-visible', 'readyToVisible'],
  ];
  const windows = [];
  for (const [a, b, what] of W) if (a in marks && b in marks) windows.push({ from: a, to: b, what, ms: rel(marks[b]) - rel(marks[a]), threads: sumWindow(marks[a], marks[b]) });
  // Main-thread long tasks (RunTask >= 30 ms) from the trigger to first visible.
  const mainKey = [...byThread].find(([, v]) => v.g === 'main')?.[0];
  const longTasks = [];
  if (mainKey) {
    const ev = byThread.get(mainKey).ev;
    for (const t of ev.filter((e) => e.name === 'RunTask' && e.dur >= 30000 && e.ts + e.dur > t0 && e.ts < tEnd)) {
      const inner = ev.filter((e) => e.ts >= t.ts && e.ts + e.dur <= t.ts + t.dur && e !== t);
      const self = {};
      for (const s of selfSegments(inner)) self[s.name] = (self[s.name] || 0) + (s.to - s.from) / 1000;
      const scripts = inner.filter((e) => e.name === 'FunctionCall' || e.name === 'EvaluateScript' || e.name === 'v8.evaluateModule')
        .map((e) => ({ name: e.name, ms: Math.round(e.dur / 100) / 10, url: (e.args?.data?.url || e.args?.data?.functionName || '').split('/').pop() }))
        .filter((s) => s.ms >= 2);
      longTasks.push({ at: rel(t.ts), ms: Math.round(t.dur / 100) / 10, top: Object.fromEntries(Object.entries(self).sort((p, q) => q[1] - p[1]).slice(0, 8).map(([k, v]) => [k, Math.round(v * 10) / 10])), scripts: scripts.slice(0, 8) });
    }
  }
  // Every presented frame (Display::DrawAndSwap on viz), the longest gap.
  const vizKeys = [...byThread].filter(([, v]) => v.g === 'viz').map(([k]) => k);
  const swaps = vizKeys.flatMap((k) => byThread.get(k).ev.filter((e) => e.name === 'Display::DrawAndSwap').map((e) => e.ts + e.dur)).sort((p, q) => p - q);
  const endT = ('vt-finished' in marks ? marks['vt-finished'] : t0 + 2e6) + 1e5;
  const lastBefore = swaps.filter((s) => s < t0).pop();
  const inside = [...(lastBefore != null ? [lastBefore] : []), ...swaps.filter((s) => s >= t0 && s <= endT)];
  let maxGap = null;
  for (let i = 1; i < inside.length; i++) {
    const d = (inside[i] - inside[i - 1]) / 1000;
    if (!maxGap || d > maxGap.ms) maxGap = { ms: Math.round(d), from: rel(inside[i - 1]), to: rel(inside[i]), w0: inside[i - 1], w1: inside[i] };
  }
  const gapThreads = maxGap ? sumWindow(maxGap.w0, maxGap.w1) : null;
  const all = events.filter((e) => e.ph === 'X' && typeof e.dur === 'number');
  const sumOf = (pred, a, b) => {
    const c = all.filter((e) => pred(e) && e.ts >= a && e.ts < b);
    return { count: c.length, ms: Math.round(c.reduce((s, e) => s + e.dur, 0) / 100) / 10 };
  };
  const isCompile = (e) => e.name === 'shader_compile';
  const isGlLink = (e) => /LinkProgram|CompileShader|glLinkProgram|glCompileShader/i.test(e.name);
  const isDecode = (e) => /Decode Image|ImageDecodeTask|DecodeImage|ImageFrameGenerator::decode|Decode LazyPixelRef/i.test(e.name);
  const isWebgl = (e) => /WebGL|WebGL2RenderingContext|DrawingBuffer/i.test(e.name);
  const span = (pred) => ({
    toReady: 'vt-ready' in marks ? sumOf(pred, t0, marks['vt-ready']) : null,
    readyToVisible: 'vt-ready' in marks ? sumOf(pred, marks['vt-ready'], tEnd) : null,
    inMaxGap: maxGap ? sumOf(pred, maxGap.w0, maxGap.w1) : null,
    toFinished: sumOf(pred, t0, endT),
  });
  const decodes = all.filter((e) => isDecode(e) && e.ts >= t0 && e.ts < endT).map((e) => ({ at: rel(e.ts), ms: Math.round(e.dur / 100) / 10, name: e.name, url: (e.args?.data?.url || e.args?.url || '').split('/').pop() })).filter((d) => d.ms >= 1).slice(0, 20);
  if (maxGap) { delete maxGap.w0; delete maxGap.w1; }
  return {
    marks: Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, rel(v)])),
    windows, longTasks, maxGap, gapThreads,
    swapsBeforeVisible: swaps.filter((s) => s >= t0 && s < tEnd).map(rel),
    shaderCompiles: span(isCompile), glCompileLink: span(isGlLink), imageDecodes: span(isDecode), webgl: span(isWebgl), decodes,
  };
}

// ------------------------------------------------------------ one run
const renderers = new Set();
async function one(build, variant, runIndex) {
  const b = await launch();
  const v = VARIANTS[variant];
  const context = await b.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.mobile ? 2 : 1,
    isMobile: !!vp.mobile,
    hasTouch: !!vp.mobile,
    colorScheme: scheme,
    reducedMotion: 'no-preference',
  });
  await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
  await context.addInitScript(instrument);
  if (v.css) await context.addInitScript(applyCss, { css: v.css });
  if (v.js) await context.addInitScript(v.js);
  await suppressPrompt(context);
  const page = await context.newPage();
  const problems = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setBlockedURLs', { urls: ['*/cdn-cgi/zaraz/*'] });
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  const renderer = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl');
    const x = gl && gl.getExtension('WEBGL_debug_renderer_info');
    return x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : 'unknown';
  });
  if (/swiftshader/i.test(renderer)) throw new Error(`SwiftShader renderer (${renderer}); aborting`);
  renderers.add(renderer);
  await page.goto(build.url + FROM, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);
  // Blocks that must not touch the start page go on only now.
  if (v.block) await cdp.send('Network.setBlockedURLs', { urls: ['*/cdn-cgi/zaraz/*', ...v.block] });
  let rowBox = null;
  if (trigger === 'switcher') {
    await page.mouse.move(vp.width / 2, 5);
    if (vp.mobile) await page.locator('.open[aria-haspopup="dialog"]').first().tap();
    else await page.locator('.open[aria-haspopup="dialog"]').first().click();
    const row = page.locator('a[data-school="glassmorphism"]').first();
    await row.waitFor({ state: 'visible', timeout: 5000 });
    // Let the dialog's warm-up go quiet (as trace-arrival's switcher-warm).
    let count = -1;
    for (let quiet = 0, waited = 0; quiet < 800 && waited < 20000; waited += 200) {
      const now = await page.evaluate(() => performance.getEntriesByType('resource').filter((e) => e.responseEnd > 0).length);
      quiet = now === count ? quiet + 200 : 0;
      count = now;
      await page.waitForTimeout(200);
    }
    // On the phone the glass row is the last and sits below the fold of the
    // dialog's list (swdebug: 817 to 914 in an 844 viewport): scroll it in,
    // as a visitor would, and let the scroll settle before the film starts.
    await row.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    rowBox = await row.boundingBox();
  }
  const file = join(OUT, `trace-${tag}-${build.name}-${variant}-${runIndex + 1}.json`);
  if (doTrace) {
    await b.startTracing(page, {
      path: file,
      categories: [
        'devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.frame',
        'blink.user_timing', 'v8.execute', 'v8', 'loading', 'blink', 'cc', 'gpu', 'viz', 'toplevel', 'benchmark',
        'skia', 'disabled-by-default-skia', 'disabled-by-default-skia.gpu', 'disabled-by-default-skia.shaders', 'gpu.angle',
        'disabled-by-default-gpu.service', 'blink.image_decode', 'webgl', 'disabled-by-default-devtools.timeline.invalidationTracking',
      ],
    });
  }
  const frames = [];
  const onFrame = async ({ data, metadata, sessionId }) => {
    frames.push({ data, at: metadata.timestamp });
    try { await cdp.send('Page.screencastFrameAck', { sessionId }); } catch {}
  };
  cdp.on('Page.screencastFrame', onFrame);
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 70, everyNthFrame: 1, maxWidth: vp.width, maxHeight: vp.height });
  await page.waitForTimeout(IDLE_MS);
  if (trigger === 'switcher') {
    // A real mouse onto the row and a click (Playwright moves, then presses).
    await page.evaluate(() => { window.__bdlTrace.armed = true; });
    // On the touch viewport a tap (a mouse press there did not navigate).
    if (vp.mobile) await page.touchscreen.tap(rowBox.x + rowBox.width / 2, rowBox.y + rowBox.height / 2);
    else {
      await page.mouse.move(rowBox.x + rowBox.width / 2, rowBox.y + rowBox.height / 2);
      await page.mouse.down();
      await page.mouse.up();
    }
  } else {
    await page.evaluate((to) => {
      const a = document.createElement('a');
      a.href = to;
      a.textContent = 'go';
      a.style.cssText = 'position:fixed;left:0;top:0;opacity:0';
      document.body.append(a);
      window.__bdlFire();
      a.click();
    }, TO);
  }
  await page.waitForTimeout(FILM_MS);
  for (let i = 0; i < 30; i++) {
    if (await page.evaluate(() => window.__bdlTrace.marks.some((m) => m.name === 'vt-finished'))) break;
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(100);
  await cdp.send('Page.stopScreencast');
  cdp.off('Page.screencastFrame', onFrame);
  if (doTrace) await b.stopTracing();
  const data = await page.evaluate(() => ({ marks: window.__bdlTrace.marks, frames: window.__bdlTrace.frames, wall: window.__bdlTrace.wall, perf: window.__bdlTrace.perf, url: location.pathname, canvases: document.querySelectorAll('canvas').length }));
  await context.close();
  await b.close();
  if (data.url !== TO) problems.push(`ended on ${data.url}`);
  const trig = data.marks.find((m) => m.name === 'trigger')?.t;
  if (trig == null) throw new Error('no trigger mark');
  const at = {};
  for (const m of data.marks) if (!(m.name in at)) at[m.name] = Math.round((m.t - trig) * 10) / 10;
  const offset = data.wall - data.perf;
  const vis = await firstVisible(frames, data.wall, offset, trig);
  if (runIndex === 0) await strip(frames, offset, trig, join(OUT, `strip-${tag}-${build.name}-${variant}.jpg`), `${build.name} ${variant} ${vpName} ${scheme} from ${fromId} via ${trigger}: glass arrival, ms after the click`);
  const longest = (ts) => { let m = null; for (let i = 1; i < ts.length; i++) { const d = ts[i] - ts[i - 1]; if (!m || d > m.ms) m = { ms: Math.round(d), from: Math.round(ts[i - 1]) }; } return m; };
  const end = (at['vt-finished'] ?? FILM_MS) + 100;
  const filmed = frames.map((f) => f.at * 1000 - offset - trig).filter((ms) => ms >= 0 && ms <= end);
  const d = (x, y) => (x in at && y in at ? Math.round((at[y] - at[x]) * 10) / 10 : null);
  const r = {
    build: build.name, variant, run: runIndex + 1, renderer,
    firstVisible: vis.firstVisible == null ? null : Math.round(vis.firstVisible),
    ready: at['vt-ready'] ?? null, finished: at['vt-finished'] ?? null,
    fetch: d('loader-start', 'loader-done'), oldCapture: d('vt-start', 'vt-update-start'), swap: d('vt-update-start', 'vt-update-end'),
    newRender: d('vt-update-end', 'vt-ready'),
    readyToVisible: vis.firstVisible != null && 'vt-ready' in at ? Math.round(vis.firstVisible - at['vt-ready']) : null,
    pageLoadAt: at['page-load'] ?? null,
    screencastGap: longest(filmed), firstFrame: filmed.length ? Math.round(filmed[0]) : null,
    rafGap: longest([0, ...data.frames.map((ts) => ts - trig).filter((ms) => ms > 0 && ms <= end)]),
    series: vis.series.filter((s) => s[0] < 1000), at, problems,
  };
  // When the new page is on screen: the first frame whose changed share is
  // at least 90% of the last filmed frame's (firstVisible is only the first
  // frame over the threshold, which the old page's fade-out alone can cross).
  const fin = vis.series.length ? vis.series[vis.series.length - 1][1] : 0;
  const land = vis.series.find((s) => s[1] >= 0.9 * fin && fin > 0.05);
  r.land90 = land ? land[0] : null;
  if (doTrace) {
    try { r.trace = await analyseTrace(file, vis.firstVisible); } catch (e) { r.trace = { error: String(e) }; }
    if (!(keepTraces && runIndex === 0)) await rm(file, { force: true });
  }
  return r;
}

await mkdir(OUT, { recursive: true });
const results = [];
for (let i = 0; i < runs; i++) {
  // Alternate the build order run by run; variants inside.
  const order = i % 2 === 0 ? builds : [...builds].reverse();
  for (const variant of variants) {
    for (const build of order) {
      const r = await one(build, variant, i);
      results.push(r);
      console.log(`run ${i + 1} ${build.name} ${variant}: firstVisible ${r.firstVisible} land90 ${r.land90} ready ${r.ready} newRender ${r.newRender} r2v ${r.readyToVisible} gap ${r.screencastGap?.ms}@${r.screencastGap?.from} raf ${r.rafGap?.ms}` + (r.trace?.maxGap ? ` | presented gap ${r.trace.maxGap.ms}@${r.trace.maxGap.from} compiles r2v ${r.trace.shaderCompiles.readyToVisible?.count}/${r.trace.shaderCompiles.readyToVisible?.ms}ms` : ''));
    }
  }
}
const med = (xs) => { const v = xs.filter((x) => typeof x === 'number').sort((p, q) => p - q); if (!v.length) return null; const m = v.length >> 1; return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; };
const rng = (xs) => { const v = xs.filter((x) => typeof x === 'number'); return v.length ? `${Math.round(Math.min(...v))} to ${Math.round(Math.max(...v))}` : 'n/a'; };
const cols = [
  ['firstVisible', (r) => r.firstVisible], ['land90', (r) => r.land90], ['ready', (r) => r.ready], ['newRender', (r) => r.newRender], ['readyToVisible', (r) => r.readyToVisible],
  ['screencastGap', (r) => r.screencastGap?.ms], ['rafGap', (r) => r.rafGap?.ms], ['finished', (r) => r.finished],
  ['presentedGap', (r) => r.trace?.maxGap?.ms], ['compiles r2v n', (r) => r.trace?.shaderCompiles?.readyToVisible?.count], ['compiles r2v ms', (r) => r.trace?.shaderCompiles?.readyToVisible?.ms],
  ['compiles toReady ms', (r) => r.trace?.shaderCompiles?.toReady?.ms], ['main busy r2v', (r) => r.trace?.windows?.find((w) => w.what === 'readyToVisible')?.threads?.main?.busy],
  ['gpu main busy r2v', (r) => r.trace?.windows?.find((w) => w.what === 'readyToVisible')?.threads?.['gpu main']?.busy],
];
let md = `# Glass arrival A/B, ${tag}\n\nRenderer: ${[...renderers].join('; ')}. From ${FROM} to ${TO}, trigger ${trigger}, ${runs} runs per cell, builds interleaved (order alternated per run), fresh browser per run. Median (min to max), ms.\n\n| build | variant | ${cols.map((c) => c[0]).join(' | ')} |\n|---|---|${cols.map(() => '---').join('|')}|\n`;
for (const variant of variants) for (const build of builds) {
  const rs = results.filter((r) => r.build === build.name && r.variant === variant);
  md += `| ${build.name} | ${variant} | ${cols.map(([, f]) => { const xs = rs.map(f); const m = med(xs); return m == null ? 'n/a' : `${Math.round(m)} (${rng(xs)})`; }).join(' | ')} |\n`;
}
const probs = results.flatMap((r) => r.problems.map((p) => `${r.build} ${r.variant} ${r.run}: ${p}`));
if (probs.length) md += `\nProblems:\n${probs.map((p) => `- ${p}`).join('\n')}\n`;
await writeFile(join(OUT, `${tag}.json`), JSON.stringify({ meta: { builds, fromId, vpName, scheme, runs, variants, trigger, renderers: [...renderers], written: new Date().toISOString() }, results }, null, 1));
await writeFile(join(OUT, `${tag}.md`), md);
console.log(md);
