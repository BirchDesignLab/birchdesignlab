/**
 * Time a portal school switch from the click to the first visible change, and
 * say where the time goes.
 *
 * Written 09-23-26 for Tier 3 stage 1 (portal fix P4). The Tier 2 arrival
 * strips put the first visible change of a school switch anywhere from about
 * +160 ms (swiss) to +560 ms (vaporwave) after the click, before any of the
 * school's choreography starts. This replays the same client-side navigation
 * motion.mjs films and records, on the page's own clock (performance.now()):
 *   - the trigger and every astro:* navigation event;
 *   - inside Astro's loader: the HTML fetch, DOMParser, the stylesheet
 *     preloads, and the portal runtime's font wait (runtime.ts wraps the
 *     loader; the gap between the default loader finishing and
 *     astro:after-preparation is that wait);
 *   - document.startViewTransition: called, update callback start and end
 *     (the DOM swap), updateCallbackDone, ready (the pseudo-elements start
 *     animating) and finished;
 *   - resource timings for the destination's HTML, stylesheets, fonts and
 *     module scripts; long animation frames with script attribution; every
 *     animation frame;
 *   - the first screencast frame that differs visibly from the last frame
 *     before the trigger (pixel diff, thresholded above the page's own idle
 *     motion).
 *
 * Conditions (each cold one in a fresh browser context, so an empty cache):
 *   cold      the destination's HTML, CSS, fonts and scripts never fetched;
 *   pf-brief  portal.md's proposed remedy simulated before the trigger: the
 *             destination HTML prefetched and its font preloads added;
 *   pf-full   the same plus its stylesheets preloaded and its new module
 *             scripts modulepreloaded;
 *   pf-decode pf-full, plus each preloaded font loaded through the FontFace
 *             API and used off screen (a cheap warm-up the portal could do);
 *   pf-render a diagnostic: the destination rendered once in an invisible,
 *             script-less same-origin iframe before the trigger;
 *   pf-memory pf-full, plus the router's HTML fetch answered from memory (a
 *             portal-side HTML cache; the site's HTML always revalidates);
 *   pf-best   pf-render plus pf-memory's HTML from memory;
 *   switcher-warm  the portal's own warm-up (P4, runtime.ts), as shipped:
 *             the switcher's dialog is opened on the start page, which warms
 *             every other school's same page (HTML kept in memory, its
 *             stylesheets, their Latin fonts, font preloads and module
 *             scripts fetched into the HTTP cache); once the warm-up has gone
 *             quiet the dialog is closed and the link followed. The router
 *             then fetches nothing, so the fetch phase is empty;
 *   warm      a second arrival in the cold run's context (everything cached,
 *             stylesheets already parsed once): the floor a prefetch can reach.
 * The default set is cold, pf-brief, pf-full and warm; name the others in
 * --conditions.
 * --prewarm-kana (diagnostic) lays vaporwave's kana out off screen first.
 * --reanalyse re-sums the saved traces of a --label and --tag after a change
 * to the categories, without running the browser.
 *
 * Zaraz is blocked through CDP (Network.setBlockedURLs) rather than
 * context.route() as motion.mjs does it: Playwright disables the HTTP cache
 * for any context with a route, which would make every condition cold.
 *
 * --trace <ids> also records one cold arrival per listed school with a Chrome
 * performance trace (browser.startTracing), saves it, and sums main-thread,
 * compositor, raster and GPU work between each pair of phases.
 *
 * Usage (serve a build first, e.g. `npm run dev:worker` on :8787):
 *   BDL_GPU=1 node scripts/themes/trace-arrival.mjs --base http://127.0.0.1:8787 \
 *     [--schools swiss,vaporwave] [--returns swiss,vaporwave] [--runs 7] \
 *     [--viewport desktop|mobile] [--scheme dark] \
 *     [--conditions cold,pf-brief,pf-full,pf-decode,pf-render,pf-memory,pf-best,switcher-warm,warm] \
 *     [--no-film] [--latency 40] [--prewarm-kana] [--reanalyse] [--show-prompt] \
 *     [--trace swiss,vaporwave] [--tag desktop] [--label trace-stage1]
 * Output: scripts/themes/.out/<label>/<tag>.runs.json (every run),
 * <tag>.summary.json and <tag>.summary.md (medians and spread), and
 * trace-<id>-<direction>-<viewport>.json plus <tag>.traces.json for --trace.
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VIEWPORTS } from './capture.mjs';
import { suppressPrompt } from './lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const NL = String.fromCharCode(10);

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const list = (name, fallback) => (arg(name, fallback) || '').split(',').filter(Boolean);

const ALL = ['bauhaus', 'swiss', 'vaporwave', 'cottagecore', 'grandmillennial', 'glassmorphism'];
const base = arg('base', 'http://127.0.0.1:8787').replace(/\/$/, '');
const schools = list('schools', ALL.join(','));
const returns = list('returns', '');
const runs = Number(arg('runs', '7'));
const vpName = arg('viewport', 'desktop');
const scheme = arg('scheme', 'dark');
const conditions = list('conditions', 'cold,pf-brief,pf-full,warm');
const traced = list('trace', '');
const film = !process.argv.includes('--no-film');
/* --latency adds that many ms to every request that reaches the network
   (DevTools network emulation; cached responses are not delayed), a rough
   stand-in for the round trip to the live site's edge. */
const latency = Number(arg('latency', '0'));
/* --prewarm-kana, a diagnostic: before the trigger, lay out vaporwave's kana
   line off screen in the system Japanese fonts its .vw-kana asks for, so the
   renderer has already loaded and shaped them. Isolates how much of
   vaporwave's first render is the system CJK font. */
const prewarmKana = process.argv.includes('--prewarm-kana');
/* The switcher's first-load prompt is marked dismissed before any page
   script runs: in a fresh (cold) context it would show, and its vanishing
   at the click would count as the arrival's first visible change (and its
   beacon as idle motion). --show-prompt keeps it. */
const showPrompt = process.argv.includes('--show-prompt');
const label = arg('label', 'trace-stage1');
const tag = arg('tag', vpName);
const vp = VIEWPORTS[vpName];
if (!vp) throw new Error(`unknown viewport ${vpName}`);
for (const c of conditions) {
  if (!['cold', 'pf-brief', 'pf-full', 'pf-decode', 'pf-render', 'pf-memory', 'pf-best', 'switcher-warm', 'warm'].includes(c)) throw new Error(`unknown condition ${c}`);
}

/* After the trigger, how long to keep filming. Every arrival so far has
   finished its view transition inside 1.6 s; a run that has not is given up
   to FINISH_MAX_MS before it is recorded as unfinished. */
const FILM_MS = 2000;
const FINISH_MAX_MS = 5000;
/* How long to watch the page idle before the trigger, to learn how much it
   moves on its own (quiet's bark, vaporwave's grid) so that motion is not
   mistaken for the switch. */
const IDLE_MS = 400;
/* A frame counts as visibly changed when more than this share of its pixels
   moved by more than DIFF_LEVEL in any channel, and by more than the idle
   page's own motion. */
const DIFF_LEVEL = 32;
const DIFF_FLOOR = 0.004;
const DIFF_W = 320;

const useGpu = process.env.BDL_GPU === '1';
const browser = await chromium.launch({
  args: ['--hide-scrollbars', ...(useGpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : [])],
});
const outDir = join(HERE, '.out', label);
await mkdir(outDir, { recursive: true });
const problems = [];

/* Runs in every document before its own scripts, so these listeners fire
   ahead of the portal runtime's and see the loader before runtime.ts wraps
   it. Everything lands in window.__bdlTrace on the performance.now() clock,
   and as a performance.mark('bdl:<name>') so a Chrome trace can find it. */
function instrument() {
  const T = (window.__bdlTrace = { marks: [], loaf: [], frames: [] });
  const mark = (name, extra) => {
    T.marks.push({ name, t: performance.now(), ...extra });
    try { performance.mark('bdl:' + name); } catch {}
  };
  window.__bdlMark = mark;
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
  const realFetch = window.fetch;
  window.fetch = function (input, init) {
    const url = String(input && input.url ? input.url : input);
    const html = url.includes('/t/');
    if (html) mark('fetch-start');
    const p = realFetch.call(this, input, init);
    if (html) {
      p.then((res) => {
        mark('fetch-headers');
        const text = res.text.bind(res);
        res.text = () => text().then((body) => { mark('fetch-body', { bytes: body.length }); return body; });
      }, () => {});
    }
    return p;
  };
  const parse = DOMParser.prototype.parseFromString;
  DOMParser.prototype.parseFromString = function (s, type) {
    mark('parse-start');
    try { return parse.call(this, s, type); } finally { mark('parse-end'); }
  };
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
      const on = (p, name) => p.then(() => mark(name), (err) => mark(name, { rejected: String(err && err.name) }));
      on(vt.updateCallbackDone, 'vt-updateCallbackDone');
      on(vt.ready, 'vt-ready');
      on(vt.finished, 'vt-finished');
      return vt;
    };
  }
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        T.loaf.push({
          start: e.startTime, duration: e.duration, renderStart: e.renderStart,
          styleAndLayoutStart: e.styleAndLayoutStart, blocking: e.blockingDuration,
          scripts: (e.scripts || []).map((s) => ({
            src: (s.sourceURL || '').split('/').pop(), fn: s.sourceFunctionName, invoker: s.invoker,
            type: s.invokerType, start: s.startTime, duration: s.duration,
            forced: s.forcedStyleAndLayoutDuration,
          })),
        });
      }
    }).observe({ type: 'long-animation-frame', buffered: true });
  } catch {}
}

/** Everything the destination page will ask for that the current page has
    not: stylesheets, font preloads, new module scripts. */
async function destinationAssets(path) {
  const html = await (await fetch(base + path)).text();
  const hrefs = (re) => [...html.matchAll(re)].map((m) => m[1]);
  return {
    css: hrefs(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g),
    fonts: hrefs(/<link[^>]*rel="preload"[^>]*as="font"[^>]*href="([^"]+)"/g),
    scripts: hrefs(/<script[^>]*type="module"[^>]*src="([^"]+)"/g),
  };
}

/** The remedies portal.md proposes, done by hand on the page before the
    trigger: prefetch the HTML and add its font preloads (pf-brief), plus
    preload its stylesheets and modulepreload its new scripts (pf-full). */
async function prefetch(page, to, assets, full) {
  await page.evaluate(
    async ({ to, assets, full }) => {
      const add = (attrs) =>
        new Promise((resolve) => {
          const l = document.createElement('link');
          for (const [k, v] of Object.entries(attrs)) l.setAttribute(k, v);
          l.onload = l.onerror = () => resolve();
          document.head.appendChild(l);
        });
      const want = [add({ rel: 'prefetch', href: to })];
      for (const f of assets.fonts) {
        if (!document.head.querySelector(`link[rel="preload"][href="${f}"]`)) {
          want.push(add({ rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: 'anonymous', href: f }));
        }
      }
      if (full) {
        for (const c of assets.css) want.push(add({ rel: 'preload', as: 'style', href: c }));
        const have = new Set([...document.scripts].map((s) => s.getAttribute('src')));
        for (const s of assets.scripts) if (!have.has(s)) want.push(add({ rel: 'modulepreload', href: s }));
      }
      await Promise.all(want);
    },
    { to, assets, full },
  );
  await page.waitForTimeout(150);
}

/** pf-decode: pf-full, then load each font preload through the FontFace API
    and lay out a line of text in it off screen, so the renderer has decoded
    the font files and shaped Latin text in them before the switch. */
async function decodeFonts(page, assets) {
  await page.evaluate(async (fonts) => {
    const faces = await Promise.all(
      fonts.map((u, i) => new FontFace(`bdl-warm-${i}`, `url(${u})`).load().catch(() => null)),
    );
    faces.forEach((f, i) => {
      if (!f) return;
      document.fonts.add(f);
      const s = document.createElement('span');
      s.textContent = 'Birch Design Lab. Services, Lab, About, Contact 0123456789 abcdefghijklmnopqrstuvwxyz';
      s.style.cssText = `position:fixed;left:-9999px;top:0;font-family:bdl-warm-${i}`;
      document.body.append(s);
      s.getBoundingClientRect();
    });
  }, assets.fonts);
  await page.waitForTimeout(100);
}

/** pf-render, a diagnostic: render the destination page once in an invisible
    same-origin iframe with scripts off, then remove it, so the renderer has
    parsed its CSS, decoded its fonts (every one it uses, not only the
    preloads) and shaped its text. Near warm means the gap between pf-full and
    warm is first-render work in the renderer, not the network. */
async function renderOffscreen(page, to) {
  await page.evaluate(async (to) => {
    // The site sends X-Frame-Options: DENY, so the page goes in as srcdoc.
    const html = await (await fetch(to)).text();
    const f = document.createElement('iframe');
    f.setAttribute('sandbox', 'allow-same-origin');
    f.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;opacity:0;pointer-events:none;z-index:-1;border:0';
    const loaded = new Promise((r) => { f.onload = r; });
    f.srcdoc = html.replace('<head>', `<head><base href="${location.origin}/">`);
    document.body.append(f);
    await loaded;
    await f.contentDocument.fonts.ready;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    f.remove();
  }, to);
  await page.waitForTimeout(150);
}

/** pf-memory and pf-best: fetch the destination HTML ahead and answer the
    router's fetch for it from memory, the way a portal-side HTML cache would.
    The site's HTML is max-age=0, must-revalidate, so without this even a
    prefetched or warm arrival pays one round trip to revalidate it. */
async function serveFromMemory(page, to) {
  await page.evaluate(async (to) => {
    const html = await (await fetch(to, { cache: 'no-store' })).text();
    const next = window.fetch;
    window.fetch = function (input, init) {
      const url = new URL(String(input && input.url ? input.url : input), location.href);
      if (url.pathname !== to) return next.call(this, input, init);
      window.__bdlMark('fetch-start');
      const res = new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
      const text = res.text.bind(res);
      res.text = () => text().then((body) => { window.__bdlMark('fetch-body', { bytes: body.length }); return body; });
      return Promise.resolve(res);
    };
  }, to);
}

/** switcher-warm: open the switcher's dialog, as a visitor does, and let the
    portal warm every other school's same page. Waits until the destination
    has been fetched and the network has been quiet for 800 ms (the warm-up
    runs one page at a time, so a quiet spell means it is done), then closes
    the dialog and lets the page settle, so neither the backdrop leaving nor a
    warm-up still running lands in the measurement. */
async function switcherWarm(page, to) {
  await page.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('.open').click());
  await page.waitForFunction(
    (to) => performance.getEntriesByType('resource').some((e) => new URL(e.name).pathname === to),
    to,
    { timeout: 15000 },
  ).catch(() => problems.push(`switcher-warm: ${to} was never warmed`));
  let count = -1;
  for (let quiet = 0, waited = 0; quiet < 800 && waited < 20000; waited += 200) {
    const now = await page.evaluate(() => performance.getEntriesByType('resource').filter((e) => e.responseEnd > 0).length);
    quiet = now === count ? quiet + 200 : 0;
    count = now;
    await page.waitForTimeout(200);
  }
  await page.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('dialog').close());
  await page.waitForTimeout(400);
}

/** Share of pixels that differ visibly between two decoded frames. */
function diffShare(a, b) {
  let moved = 0;
  const n = a.length / 4;
  for (let i = 0; i < a.length; i += 4) {
    if (Math.abs(a[i] - b[i]) > DIFF_LEVEL || Math.abs(a[i + 1] - b[i + 1]) > DIFF_LEVEL || Math.abs(a[i + 2] - b[i + 2]) > DIFF_LEVEL) moved++;
  }
  return moved / n;
}

async function pixels(frame) {
  const img = await loadImage(Buffer.from(frame.data, 'base64'));
  const h = Math.round((img.height / img.width) * DIFF_W);
  const c = createCanvas(DIFF_W, h);
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, DIFF_W, h);
  return ctx.getImageData(0, 0, DIFF_W, h).data;
}

/** The first frame after the trigger that differs from the last frame before
    it by more than the idle page's own motion (`firstVisible`), and the first
    that differs at all beyond that motion (`firstAny`: a wordmark starting to
    move, a one-column wipe step). `offset` maps the screencast's wall-clock
    timestamps onto performance.now(). `series` is every filmed frame's
    changed share, for reading a choreography's ramp. */
async function firstVisible(frames, triggerWall, offset, trigger) {
  const before = frames.filter((f) => f.at * 1000 < triggerWall);
  const after = frames.filter((f) => f.at * 1000 >= triggerWall);
  if (!before.length || !after.length) return { firstVisible: null, firstAny: null, noise: null, framesAfter: after.length };
  const ref = await pixels(before[before.length - 1]);
  let noise = 0;
  for (const f of before.slice(0, -1)) noise = Math.max(noise, diffShare(ref, await pixels(f)));
  const threshold = Math.max(DIFF_FLOOR, noise * 1.5 + 0.002);
  const anyThreshold = Math.max(0.0005, noise * 1.5 + 0.0005);
  const series = [];
  let firstVisible = null;
  let firstAny = null;
  for (const f of after) {
    const ms = f.at * 1000 - offset - trigger;
    const share = diffShare(ref, await pixels(f));
    series.push([Math.round(ms), Math.round(share * 10000) / 10000]);
    if (firstAny == null && share > anyThreshold) firstAny = ms;
    if (firstVisible == null && share > threshold) firstVisible = ms;
  }
  return { firstVisible, firstAny, noise, threshold, framesAfter: after.length, series };
}

async function newContext() {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.mobile ? 2 : 1,
    isMobile: !!vp.mobile,
    hasTouch: !!vp.mobile,
    colorScheme: scheme,
    reducedMotion: 'no-preference',
  });
  await context.addInitScript((s) => {
    try { localStorage.setItem('scheme', s); } catch {}
  }, scheme);
  await context.addInitScript(instrument);
  if (!showPrompt) await suppressPrompt(context);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setBlockedURLs', { urls: ['*/cdn-cgi/zaraz/*'] });
  if (latency) {
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency, downloadThroughput: -1, uploadThroughput: -1 });
  }
  page.on('pageerror', (e) => problems.push(`${page.url()} pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`${page.url()} console: ${m.text()}`); });
  return { context, page, cdp };
}

async function settle(page, path) {
  await page.goto(base + path, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
}

/** One navigation from `trip.from` to `trip.to`, measured. The page must
    already be settled on `trip.from`. */
async function measure(page, cdp, trip) {
  const frames = [];
  const onFrame = async ({ data, metadata, sessionId }) => {
    frames.push({ data, at: metadata.timestamp });
    try { await cdp.send('Page.screencastFrameAck', { sessionId }); } catch {}
  };
  if (film) {
    cdp.on('Page.screencastFrame', onFrame);
    await cdp.send('Page.startScreencast', {
      format: 'jpeg', quality: 70, everyNthFrame: 1, maxWidth: vp.width, maxHeight: vp.height,
    });
    await page.waitForTimeout(IDLE_MS);
  }
  const t = await page.evaluate((to) => {
    const T = window.__bdlTrace;
    T.marks = [];
    T.loaf = [];
    T.frames = [];
    const a = document.createElement('a');
    a.href = to;
    a.textContent = 'go';
    a.style.cssText = 'position:fixed;left:0;top:0;opacity:0';
    document.body.append(a);
    const wall = Date.now();
    const perf = performance.now();
    window.__bdlMark('trigger');
    const tick = (ts) => {
      T.frames.push(ts);
      if (!T.marks.some((m) => m.name === 'vt-finished') && ts - perf < 5000) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    a.click();
    return { wall, perf };
  }, trip.to);
  await page.waitForTimeout(FILM_MS);
  const deadline = Date.now() + FINISH_MAX_MS - FILM_MS;
  while (Date.now() < deadline) {
    const done = await page.evaluate(() => window.__bdlTrace.marks.some((m) => m.name === 'vt-finished'));
    if (done) break;
    await page.waitForTimeout(100);
  }
  if (film) {
    await page.waitForTimeout(100);
    await cdp.send('Page.stopScreencast');
    cdp.off('Page.screencastFrame', onFrame);
  }
  const data = await page.evaluate((since) => ({
    marks: window.__bdlTrace.marks,
    loaf: window.__bdlTrace.loaf.filter((l) => l.start + l.duration >= since),
    frames: window.__bdlTrace.frames,
    resources: performance.getEntriesByType('resource')
      .filter((r) => r.startTime >= since - 1)
      .map((r) => ({
        name: new URL(r.name).pathname, type: r.initiatorType, start: r.startTime, end: r.responseEnd,
        transfer: r.transferSize, body: r.encodedBodySize,
      })),
    url: location.pathname,
  }), t.perf);
  const trigger = data.marks.find((m) => m.name === 'trigger').t;
  const at = {};
  for (const m of data.marks) if (!(m.name in at)) at[m.name] = m.t - trigger;
  const vis = film ? await firstVisible(frames, t.wall, t.wall - t.perf, trigger) : { firstVisible: null };
  if (data.url !== trip.to) problems.push(`${trip.id} ${trip.dir}: ended on ${data.url}, wanted ${trip.to}`);
  if (!('vt-finished' in at)) problems.push(`${trip.id} ${trip.dir}: view transition never finished`);
  const rel = (r) => ({ ...r, start: r.start - trigger, end: r.end - trigger });
  const resources = data.resources.map(rel);
  const loaf = data.loaf.map((l) => ({
    ...l, start: l.start - trigger, renderStart: l.renderStart ? l.renderStart - trigger : 0,
    styleAndLayoutStart: l.styleAndLayoutStart ? l.styleAndLayoutStart - trigger : 0,
    scripts: l.scripts.map((s) => ({ ...s, start: s.start - trigger })),
  }));
  const gaps = [];
  for (let i = 1; i < data.frames.length; i++) {
    const d = data.frames[i] - data.frames[i - 1];
    if (d > 34) gaps.push({ at: Math.round(data.frames[i - 1] - trigger), ms: Math.round(d) });
  }
  return { at, ...vis, resources, loaf, frameGaps: gaps, ended: data.url };
}

/** The intervals the report reads, from one run's marks. */
function phases(r) {
  const a = r.at;
  const d = (x, y) => (x in a && y in a ? a[y] - a[x] : null);
  return {
    firstVisible: r.firstVisible,
    firstAny: r.firstAny ?? null,
    toPrep: a['before-preparation'] ?? null,
    fetch: d('fetch-start', 'fetch-body'),
    parse: d('parse-start', 'parse-end'),
    cssWait: d('parse-end', 'loader-done'),
    fontWait: d('loader-done', 'after-preparation'),
    load: d('before-preparation', 'after-preparation'),
    toVT: d('after-preparation', 'vt-start'),
    oldCapture: d('vt-start', 'vt-update-start'),
    swap: d('vt-update-start', 'vt-update-end'),
    newRender: d('vt-update-end', 'vt-ready'),
    vtStart: a['vt-start'] ?? null,
    ready: a['vt-ready'] ?? null,
    readyToVisible: r.firstVisible != null && 'vt-ready' in a ? r.firstVisible - a['vt-ready'] : null,
    finished: a['vt-finished'] ?? null,
    pageLoad: a['page-load'] ?? null,
    longestLoaf: Math.max(0, ...r.loaf.filter((l) => l.start < (a['vt-ready'] ?? Infinity)).map((l) => l.duration)),
  };
}

function stats(xs) {
  const v = xs.filter((x) => typeof x === 'number' && Number.isFinite(x)).sort((p, q) => p - q);
  if (!v.length) return null;
  const q = (f) => {
    const i = (v.length - 1) * f;
    const lo = Math.floor(i);
    return v[lo] + (v[Math.min(lo + 1, v.length - 1)] - v[lo]) * (i - lo);
  };
  const r = (x) => Math.round(x * 10) / 10;
  return { median: r(q(0.5)), min: r(v[0]), max: r(v[v.length - 1]), p25: r(q(0.25)), p75: r(q(0.75)), n: v.length };
}

// ---------------------------------------------------------------- trace

/** Chrome trace: sum each thread's self time by what it was doing, clipped to
    the windows between consecutive phases. */
const WINDOWS = [
  ['trigger', 'after-preparation', 'load (fetch, parse, stylesheets, fonts)'],
  ['after-preparation', 'vt-start', 'to startViewTransition'],
  ['vt-start', 'vt-update-start', 'old-state capture'],
  ['vt-update-start', 'vt-update-end', 'DOM swap (update callback)'],
  ['vt-update-end', 'vt-ready', 'new-state render and capture'],
  ['vt-ready', 'first-visible', 'ready to first visible frame'],
  ['first-visible', 'vt-finished', 'the animation'],
];

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

async function analyseTrace(file, firstVisibleMs) {
  const raw = JSON.parse(await readFile(file, 'utf8'));
  const events = raw.traceEvents || raw;
  const threadName = new Map();
  for (const e of events) if (e.ph === 'M' && e.name === 'thread_name') threadName.set(`${e.pid}:${e.tid}`, e.args.name);
  const marks = {};
  let rendererPid = null;
  for (const e of events) {
    if (typeof e.name === 'string' && e.name.startsWith('bdl:') && e.cat && e.cat.includes('user_timing')) {
      const n = e.name.slice(4);
      if (n === 'trigger') rendererPid = e.pid;
      if (!(n in marks) || e.ts < marks[n]) marks[n] = e.ts;
    }
  }
  if (rendererPid == null || !('trigger' in marks)) return { error: 'no bdl:trigger mark in the trace' };
  if (firstVisibleMs != null) marks['first-visible'] = marks.trigger + firstVisibleMs * 1000;
  const group = (pid, tid) => {
    const n = threadName.get(`${pid}:${tid}`) || '';
    if (pid === rendererPid) {
      if (n === 'CrRendererMain') return 'main';
      if (n === 'Compositor') return 'compositor';
      if (n.startsWith('CompositorTileWorker')) return 'raster workers';
      return null;
    }
    if (n === 'CrGpuMain' || n === 'VizCompositorThread') return 'gpu process';
    return null;
  };
  const byThread = new Map();
  const open = new Map();
  for (const e of events) {
    const g = group(e.pid, e.tid);
    if (!g) continue;
    const key = `${e.pid}:${e.tid}`;
    if (!byThread.has(key)) byThread.set(key, { g, ev: [] });
    if (e.ph === 'X' && typeof e.dur === 'number') byThread.get(key).ev.push({ name: e.name, ts: e.ts, dur: e.dur });
    else if (e.ph === 'B') {
      if (!open.has(key)) open.set(key, []);
      open.get(key).push(e);
    } else if (e.ph === 'E') {
      const b = open.get(key)?.pop();
      if (b) byThread.get(key).ev.push({ name: b.name, ts: b.ts, dur: e.ts - b.ts });
    }
  }
  const windows = [];
  for (const [from, to, what] of WINDOWS) {
    if (!(from in marks) || !(to in marks)) continue;
    const w0 = marks[from];
    const w1 = marks[to];
    const sums = {};
    for (const { g, ev } of byThread.values()) {
      for (const s of selfSegments(ev.filter((e) => e.ts < w1 && e.ts + e.dur > w0))) {
        const ms = (Math.min(s.to, w1) - Math.max(s.from, w0)) / 1000;
        if (ms <= 0) continue;
        sums[g] ??= { busy: 0, categories: {}, names: {} };
        const t = sums[g];
        t.busy += ms;
        const c = category(s.name);
        t.categories[c] = (t.categories[c] || 0) + ms;
        t.names[s.name] = (t.names[s.name] || 0) + ms;
      }
    }
    const round = (o) => Object.fromEntries(Object.entries(o).sort((p, q) => q[1] - p[1]).map(([k, v]) => [k, Math.round(v * 10) / 10]));
    const threads = {};
    for (const [g, t] of Object.entries(sums)) {
      threads[g] = {
        busy: Math.round(t.busy * 10) / 10,
        categories: round(t.categories),
        top: Object.fromEntries(Object.entries(round(t.names)).slice(0, 8)),
      };
    }
    windows.push({ from, to, what, ms: Math.round((w1 - w0) / 100) / 10, threads });
  }
  return { marks: Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, Math.round((v - marks.trigger) / 100) / 10])), windows };
}

// ---------------------------------------------------------------- main

// --reanalyse: re-sum the Chrome traces a previous run saved under this
// --label and --tag (after a change to the categories), without a browser run.
if (process.argv.includes('--reanalyse')) {
  const file = join(outDir, `${tag}.traces.json`);
  const saved = JSON.parse(await readFile(file, 'utf8'));
  const redone = [];
  for (const t of saved) redone.push({ ...t, ...(await analyseTrace(t.file, t.run.firstVisible)) });
  await writeFile(file, JSON.stringify(redone, null, 2));
  console.log(`re-analysed ${redone.length} traces -> ${file}`);
  await browser.close();
  process.exit(0);
}

let renderer = null;
const trips = [
  ...schools.map((id) => ({ id, dir: 'arrive', from: '/t/quiet/', to: `/t/${id}/` })),
  ...returns.map((id) => ({ id, dir: 'return', from: `/t/${id}/`, to: '/t/quiet/' })),
];
const results = [];

for (const trip of trips) {
  const assets = await destinationAssets(trip.to);
  for (let run = 0; run < runs; run++) {
    for (const condition of conditions.filter((c) => c !== 'warm')) {
      const { context, page, cdp } = await newContext();
      if (!renderer) {
        renderer = await page.evaluate(() => {
          const gl = document.createElement('canvas').getContext('webgl');
          const x = gl && gl.getExtension('WEBGL_debug_renderer_info');
          return x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : 'unknown';
        });
        console.log(`renderer: ${renderer}`);
      }
      // A visitor always enters the portal on quiet, so quiet's assets are
      // cached on every return trip.
      if (trip.dir === 'return') await settle(page, '/t/quiet/');
      await settle(page, trip.from);
      if (condition === 'pf-render' || condition === 'pf-best') await renderOffscreen(page, trip.to);
      else if (condition === 'switcher-warm') await switcherWarm(page, trip.to);
      else if (condition !== 'cold') await prefetch(page, trip.to, assets, condition !== 'pf-brief');
      if (condition === 'pf-decode') await decodeFonts(page, assets);
      if (condition === 'pf-memory' || condition === 'pf-best') await serveFromMemory(page, trip.to);
      if (prewarmKana) {
        await page.evaluate(() => {
          const s = document.createElement('span');
          s.textContent = 'バーチ・デザイン・ラボ';
          s.style.cssText = "position:fixed;left:-9999px;top:0;font-weight:700;letter-spacing:0.35em;font-family:'Yu Gothic','Hiragino Kaku Gothic ProN','Noto Sans JP','Meiryo',sans-serif";
          document.body.append(s);
          return s.getBoundingClientRect().width;
        });
        await page.waitForTimeout(100);
      }
      const r = await measure(page, cdp, trip);
      results.push({ ...trip, condition, run, ...r });
      if (condition === 'cold' && conditions.includes('warm')) {
        await settle(page, trip.from);
        const w = await measure(page, cdp, trip);
        results.push({ ...trip, condition: 'warm', run, ...w });
      }
      await context.close();
    }
    const last = results.filter((x) => x.id === trip.id && x.dir === trip.dir && x.run === run);
    console.log(`${trip.id} ${trip.dir} run ${run + 1}/${runs}: ` + last.map((x) => `${x.condition} ${x.firstVisible == null ? '?' : Math.round(x.firstVisible)}`).join(', '));
  }
}

// One traced cold arrival per listed school, after the timed runs so tracing
// never overlaps them.
const traceSummaries = [];
for (const id of traced) {
  for (const trip of trips.filter((t) => t.id === id)) {
    const { context, page, cdp } = await newContext();
    if (trip.dir === 'return') await settle(page, '/t/quiet/');
    await settle(page, trip.from);
    const file = join(outDir, `trace-${id}-${trip.dir}-${vpName}.json`);
    await browser.startTracing(page, {
      path: file,
      categories: [
        'devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.frame',
        'blink.user_timing', 'v8.execute', 'v8', 'loading', 'blink', 'cc', 'gpu', 'viz', 'toplevel', 'benchmark',
      ],
    });
    const r = await measure(page, cdp, trip);
    await browser.stopTracing();
    await context.close();
    const summary = await analyseTrace(file, r.firstVisible);
    traceSummaries.push({ id, dir: trip.dir, viewport: vpName, file, run: { at: r.at, firstVisible: r.firstVisible, phases: phases(r) }, ...summary });
    console.log(`traced ${id} ${trip.dir}: ${file}`);
  }
}
await browser.close();

const summary = [];
for (const trip of trips) {
  for (const condition of ['cold', 'pf-brief', 'pf-full', 'pf-decode', 'pf-render', 'pf-memory', 'pf-best', 'switcher-warm', 'warm']) {
    const rs = results.filter((r) => r.id === trip.id && r.dir === trip.dir && r.condition === condition);
    if (!rs.length) continue;
    const ph = rs.map(phases);
    const row = { id: trip.id, dir: trip.dir, condition, runs: rs.length };
    for (const k of Object.keys(ph[0])) row[k] = stats(ph.map((p) => p[k]));
    summary.push(row);
  }
}

const meta = { base, viewport: vpName, scheme, film, latency, gpu: useGpu, renderer, runs, written: new Date().toISOString() };
await writeFile(join(outDir, `${tag}.runs.json`), JSON.stringify({ meta, results, problems }, null, 2));
await writeFile(join(outDir, `${tag}.summary.json`), JSON.stringify({ meta, summary }, null, 2));
if (traceSummaries.length) await writeFile(join(outDir, `${tag}.traces.json`), JSON.stringify(traceSummaries, null, 2));

const cell = (s) => (s ? `${Math.round(s.median)} (${Math.round(s.min)} to ${Math.round(s.max)})` : 'n/a');
const cols = ['firstAny', 'firstVisible', 'vtStart', 'ready', 'fetch', 'cssWait', 'fontWait', 'oldCapture', 'swap', 'newRender', 'readyToVisible', 'finished'];
const md = [
  `# Arrival timings, ${vpName} ${scheme} (${renderer}${film ? '' : ', not filmed'}${latency ? `, +${latency} ms per request` : ''})`,
  '',
  'Median (min to max) ms after the trigger, or per phase.',
  '',
  `| school | trip | condition | runs | ${cols.join(' | ')} |`,
  `|${'---|'.repeat(cols.length + 4)}`,
  ...summary.map((r) => `| ${r.id} | ${r.dir} | ${r.condition} | ${r.runs} | ${cols.map((c) => cell(r[c])).join(' | ')} |`),
];
if (problems.length) md.push('', 'Problems:', ...problems.map((p) => `- ${p}`));
await writeFile(join(outDir, `${tag}.summary.md`), md.join(NL) + NL);
console.log(md.join(NL));
if (problems.length) process.exitCode = 2;
