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
 *
 * Added 09-23-26 for Tier 3 stage 2 (the freeze investigation,
 * tier3-stage2/freeze-investigation.md). The wave B strips showed the page
 * holding still for up to 435 ms on a first arrival in a fresh browser; these
 * measure that hold and say what fills it:
 *   --fresh-browser  every cold, pf-* and switcher-warm run gets its own
 *             browser process, not just its own context, so the GPU
 *             process's shader and pipeline caches start empty, as they did
 *             for motion.mjs's strips (Playwright launches each browser on
 *             a new temporary profile, with no shader cache on disk). `warm`
 *             stays the second arrival in the same browser;
 *   --pages <ids>  also time the in-school swap, /t/<id>/ to /t/<id>/about/
 *             (quiet loaded first, then the school's home by a hard load);
 *   gaps      every run records the longest gap between screencast frames
 *             from the trigger to `finished` + 100 ms, measured as
 *             motion.mjs's dense.maxGapMs is (between frames after the
 *             trigger), and the longest gap between animation frames in the
 *             page (rAF, which does not fire while rendering is paused);
 *   --trace   now also reads, from the trace, every frame the display
 *             compositor drew and swapped (Display::DrawAndSwap in the GPU
 *             process) and reports the longest presented-frame gap from the
 *             trigger to `finished`, with each thread's work summed inside
 *             that gap (the freeze window). --trace-runs <n> traces n
 *             arrivals per school (default 1), and a traced run obeys
 *             --no-film, so a trace can be taken without the screencast's
 *             own cost in it;
 *   --trace-condition <c>  the condition a traced run is prepared under
 *             (default cold), so a warm-up's effect on the GPU can be read;
 *   pf-raster a diagnostic condition: pf-render's copy of the destination,
 *             drawn on top of the page at opacity 0.001 (no 8-bit pixel
 *             moves) instead of 0, so the compositor rasterises it on the GPU
 *             and the shaders its paint needs are compiled before the click;
 *   --stub <names>  a diagnostic: apply named stubs from
 *             harness/freeze-stubs.mjs (CSS added to every page the run
 *             draws, including the incoming document before the swap, and
 *             script run before the page's own) to take one layer out and
 *             re-measure; the stub names go in the output.
 * --base defaults to $SNAP_BASE when set (snap.mjs sets it), else :8787.
 *
 * Added 09-23-26 for the same investigation's drawing-ahead agent (D), which
 * put a drawn copy into the portal runtime:
 *   --raster-place top|under|below|below-far|below-scaled, --raster-wait <ms>,
 *   --raster-css <css>, --raster-seq <ids>, --raster-lead <ms>  where
 *             pf-raster's copy sits, how long it stays up, a style added to
 *             it, a sequence of copies (as the dialog draws them), or a copy
 *             started <ms> before the click and taken down by it (a pointer
 *             resting on a link);
 *   switcher-warm  now also waits for the runtime's copies to finish, and
 *             records the start page's longest animation-frame gap while the
 *             dialog was open (aheadRafGap: what drawing ahead costs the
 *             visitor looking at it) and each copy's school and time up;
 *   switcher-pick  the dialog opened and the destination's row clicked
 *             --pick-after ms later: the visitor's own path;
 *   pf-raster records the same animation-frame gap while its copy is up.
 *
 * Added 09-24-26 for the stage 2 wrap-up (tuning the mouse's rest before a
 * row is drawn ahead): --rest-before-click <ms>, hover timed exactly from
 * the row's pointerover to a press and click (see its comment below). Note
 * for older hover runs: without it, the rest before the click was
 * --hover-lead plus at least 400 ms (the idle watch and the screencast's
 * start), and the click had no press.
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
const base = arg('base', process.env.SNAP_BASE || 'http://127.0.0.1:8787').replace(/\/$/, '');
const schools = list('schools', ALL.join(','));
const returns = list('returns', '');
const pages = list('pages', '');
const freshBrowser = process.argv.includes('--fresh-browser');
const traceRuns = Number(arg('trace-runs', '1'));
const stubNames = list('stub', '');
const traceCondition = arg('trace-condition', 'cold');
/* pf-raster: the pf-render copy drawn on top of the page at this opacity
   instead of 0, so the compositor rasterises and draws it (an opacity of 0
   is skipped). 0.001 moves no 8-bit pixel: 255 x 0.001 is a quarter level. */
const RASTER_OPACITY = 0.001;
/* --raster-place top|below|below-far and --raster-wait <ms> (agent D,
   09-23-26): where pf-raster's copy is drawn and how long it stays up. */
const rasterPlace = arg('raster-place', 'top');
const rasterWait = Number(arg('raster-wait', '400'));
/* --raster-css <css>: a style added to the copy (e.g. glassmorphism's
   backdrop filters taken out, which otherwise change the page's text). */
const rasterCss = arg('raster-css', '');
/* switcher-pick (agent D, 09-23-26): the visitor's own path through the
   switcher. The dialog is opened on the start page (which warms, and draws
   ahead, every other school's same page), and --pick-after ms later the
   destination's row in the dialog is clicked: the trigger. What a visitor
   gets who chooses that fast. */
const pickAfter = Number(arg('pick-after', '1500'));
/* --raster-seq <ids> (agent D): pf-raster draws a copy of each listed
   school's same page, in order, instead of the destination's alone (the
   destination must be listed), as drawing ahead from the dialog does. */
const rasterSeq = list('raster-seq', '');
/* --raster-lead <ms> (agent D): a stand-in for drawing ahead on a pointer
   resting on a link. pf-raster's copy (fetch included) is started this long
   before the click instead of being let finish, and the click's
   astro:before-preparation takes it down, as runtime.ts would. */
const rasterLead = Number(arg('raster-lead', '0'));
/* hover and tap (agent D, 09-23-26): drawing ahead on intent, as shipped.
   hover: for an arrival the dialog is opened and its warm-up let finish (a
   visitor reading the list), then the real mouse rests on the destination's
   row --hover-lead ms before the click; for an in-school swap the mouse
   rests on the page's own link to the destination. tap: the dialog is opened
   and let warm, then a touch goes down on the row --hover-lead ms before
   the click (a finger's press; pointerdown draws at once). */
const hoverLead = Number(arg('hover-lead', '300'));
/* --rest-before-click <ms> (Tier 3 stage 2 wrap-up, 09-24-26): hover, timed
   exactly. Under plain hover the rest before the click is --hover-lead plus
   the film's idle watch (IDLE_MS) and the screencast's start, at least 400 ms
   more than asked (measured: a 150 ms hover-lead gave the copy about 555 ms
   before the click), and the click is a script click with no press. With
   this flag (arrivals through the dialog only) the mouse moves onto the
   destination's row, the film starts (measure() says why in that order),
   and the click lands this many ms after the row's own pointerover, on the
   page's clock, as a press (pointerdown) and a click at the same instant: a
   press adds no lead here, where a real one adds about 0.1 s. --no-press
   leaves the pointerdown out. Each run also records how late the click ran
   (the main thread busy with a copy) and when each copy went up and came
   down, relative to the click. */
const restBeforeClick = arg('rest-before-click', null) == null ? null : Number(arg('rest-before-click'));
const restNoPress = process.argv.includes('--no-press');
/* --press-lead <ms> (the wrap-up's press question, 09-24-26): with
   --rest-before-click, the press goes down this many ms before the click on
   the page's clock, as a real one does (a mouse button or a finger is down
   about 0.1 s), instead of at the same instant. A copy the press starts has
   that much lead, and the click waits while the main thread draws it, as a
   real release would. On the mobile viewport the press says pointerType
   touch (runtime.ts draws on a press of either kind; the mouse still moves
   onto the row first, which only starts a rest the click cuts short). Each
   run records when the press really went down (restInfo.pressAt, from the
   click). */
const pressLead = Number(arg('press-lead', '0'));
if (pressLead && (restBeforeClick == null || restNoPress || pressLead > restBeforeClick)) {
  throw new Error('--press-lead needs --rest-before-click at least as long, and no --no-press');
}
const stubs = stubNames.length ? (await import('./harness/freeze-stubs.mjs')).pick(stubNames) : [];
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
  if (!['cold', 'pf-brief', 'pf-full', 'pf-decode', 'pf-render', 'pf-memory', 'pf-best', 'pf-raster', 'switcher-warm', 'switcher-pick', 'hover', 'tap', 'warm'].includes(c)) throw new Error(`unknown condition ${c}`);
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
const launch = () => chromium.launch({
  args: ['--hide-scrollbars', ...(useGpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : [])],
});
const browser = await launch();
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
  // The portal's copies drawn ahead (runtime.ts, agent D): when each went up
  // and came down, on this clock. Kept across the trigger.
  const copies = (window.__bdlCopies = []);
  new MutationObserver((records) => {
    for (const r of records) {
      for (const n of r.addedNodes) if (n.nodeName === 'IFRAME' && n.getAttribute('aria-hidden') === 'true') copies.push({ up: performance.now(), el: n });
      for (const n of r.removedNodes) {
        const c = copies.find((x) => x.el === n && x.down == null);
        if (c) c.down = performance.now();
      }
    }
  }).observe(document, { childList: true, subtree: true });
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
async function renderOffscreen(page, to, opacity = 0) {
  const ahead = await page.evaluate(async ({ to, opacity, place, wait, css }) => {
    // The site sends X-Frame-Options: DENY, so the page goes in as srcdoc.
    const html = await (await fetch(to)).text();
    const f = document.createElement('iframe');
    f.setAttribute('sandbox', 'allow-same-origin');
    // --raster-place (agent D): where a drawn copy sits. `top` is M's
    // pf-raster (over the page at 0.001); `below` is the copy at full
    // opacity just past the bottom edge of the viewport, its own layer, so
    // it is never on screen; `below-far` is the same a viewport lower.
    // `under` is the copy at 0.001 beneath the page (z-index -1, painted
    // into the page's own layer); `below-scaled` is `below` shrunk to a
    // quarter, so all of it sits inside the band cc rasterises soon.
    const tops = { below: '100vh', 'below-far': '200vh' };
    f.style.cssText = !opacity
      ? 'position:fixed;left:0;top:0;width:100vw;height:100vh;opacity:0;pointer-events:none;z-index:-1;border:0'
      : place === 'under'
        ? `position:fixed;left:0;top:0;width:100vw;height:100vh;opacity:${opacity};pointer-events:none;z-index:-1;border:0`
      : place === 'below-scaled'
        ? 'position:fixed;left:0;top:100vh;width:100vw;height:100vh;pointer-events:none;z-index:2147483647;border:0;transform:scale(0.25);transform-origin:0 0'
      : place in tops
        ? `position:fixed;left:0;top:${tops[place]};width:100vw;height:100vh;pointer-events:none;z-index:2147483647;border:0;will-change:transform`
        : `position:fixed;left:0;top:0;width:100vw;height:100vh;opacity:${opacity};pointer-events:none;z-index:2147483647;border:0`;
    // The page's own animation frames while the copy is up: what drawing
    // ahead costs the visitor looking at the start page.
    const frames = [];
    let up = true;
    const tick = (ts) => { frames.push(ts); if (up) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    const t0 = performance.now();
    const loaded = new Promise((r) => { f.onload = r; });
    f.srcdoc = html.replace('<head>', `<head><base href="${location.origin}/">${css ? `<style>${css}</style>` : ''}`);
    document.body.append(f);
    await loaded;
    // A drawn copy wears the scheme and the .js marker the runtime carries
    // onto the incoming page at the swap: with no script in it, it would
    // otherwise draw the scheme-less (light) page. Not .reveal-on: that hides
    // every [data-reveal] block until the page's own script settles it, and
    // the copy has none, so those blocks would never be drawn (or warmed).
    if (opacity) {
      const html = document.documentElement;
      const next = f.contentDocument.documentElement;
      if (html.dataset.scheme) next.setAttribute('data-scheme', html.dataset.scheme);
      next.classList.add('js');
    }
    await f.contentDocument.fonts.ready;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    // A drawn copy has to reach the GPU before it goes: wait for its tiles.
    if (opacity) await new Promise((r) => setTimeout(r, wait));
    f.remove();
    up = false;
    let gap = 0;
    for (let i = 1; i < frames.length; i++) gap = Math.max(gap, frames[i] - frames[i - 1]);
    return { ms: Math.round(performance.now() - t0), rafGap: Math.round(gap) };
  }, { to, opacity, place: rasterPlace, wait: rasterWait, css: rasterCss });
  await page.waitForTimeout(150);
  return ahead;
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
async function switcherWarm(page, to, close = true) {
  // The start page's animation frames while the dialog is open: what the
  // warm-up (and drawing ahead) costs the visitor looking at it.
  await page.evaluate(() => {
    const f = (window.__bdlDialogFrames = []);
    const tick = (ts) => { f.push(ts); if (!window.__bdlDialogDone) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  await page.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('.open').click());
  await page.waitForFunction(
    (to) => performance.getEntriesByType('resource').some((e) => new URL(e.name).pathname === to),
    to,
    { timeout: 15000 },
  ).catch(() => problems.push(`switcher-warm: ${to} was never warmed`));
  // Quiet: no new resource and no copy drawn ahead up or come down for
  // 800 ms (the warm-up and the drawing run one page at a time).
  let count = -1;
  for (let quiet = 0, waited = 0; quiet < 800 && waited < 30000; waited += 200) {
    const now = await page.evaluate(() => performance.getEntriesByType('resource').filter((e) => e.responseEnd > 0).length
      + 1000 * window.__bdlCopies.length + 100000 * window.__bdlCopies.filter((c) => c.down != null).length);
    quiet = now === count ? quiet + 200 : 0;
    count = now;
    await page.waitForTimeout(200);
  }
  const cost = await page.evaluate(() => {
    window.__bdlDialogDone = true;
    const f = window.__bdlDialogFrames;
    let gap = 0;
    for (let i = 1; i < f.length; i++) gap = Math.max(gap, f[i] - f[i - 1]);
    const copies = window.__bdlCopies.map((c) => ({ up: Math.round(c.up - f[0]), ms: c.down == null ? null : Math.round(c.down - c.up), src: (c.el.srcdoc.match(/data-theme="([^"]+)"/) || [])[1] }));
    return { rafGap: Math.round(gap), copies };
  });
  if (!close) return cost;
  await page.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('dialog').close());
  await page.waitForTimeout(400);
  return cost;
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

/** --stub: each stub's CSS goes into every document the context opens and,
    through astro:before-swap, into the incoming document before it is
    swapped in (so the new state is drawn without that layer); its script,
    when it has one, runs before the page's own. */
function applyStubs({ css, stubNames }) {
  const add = (doc) => {
    const s = doc.createElement('style');
    s.setAttribute('data-freeze-stub', stubNames);
    s.textContent = css;
    (doc.head || doc.documentElement).append(s);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => add(document));
  else add(document);
  document.addEventListener('astro:before-swap', (e) => add(e.newDocument));
}

async function newContext(b = browser) {
  const context = await b.newContext({
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
  if (stubs.length) {
    const css = stubs.map((s) => s.css || '').join(NL);
    if (css.trim()) await context.addInitScript(applyStubs, { css, stubNames: stubNames.join(',') });
    for (const s of stubs) if (s.js) await context.addInitScript(s.js);
  }
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
async function measure(page, cdp, trip, viaDialog = false, rest = null) {
  const frames = [];
  const onFrame = async ({ data, metadata, sessionId }) => {
    frames.push({ data, at: metadata.timestamp });
    try { await cdp.send('Page.screencastFrameAck', { sessionId }); } catch {}
  };
  // --rest-before-click: the mouse onto the row first, its pointerover timed,
  // then the film starts and watches the page idle for what is left of the
  // rest (at most IDLE_MS). Not the other way round: filming longer than
  // about 1 s before the click delays the first frames after it, a capture
  // artifact (measured on freeze-d0, nothing drawn ahead, 1000 ms: bauhaus
  // 243 to 273 and glassmorphism 407 to 440 with the film started first,
  // against 65 to 88 and 178 to 211 with the mouse moved first, which match
  // the cold runs).
  if (rest) {
    await page.evaluate((id) => {
      window.__bdlOverAt = null;
      document.querySelector('bdl-switcher').shadowRoot.addEventListener('pointerover', (e) => {
        if (window.__bdlOverAt == null && e.target.closest?.(`a[data-school="${id}"]`)) window.__bdlOverAt = performance.now();
      }, { capture: true });
    }, rest.id);
    await page.mouse.move(rest.box.x, rest.box.y);
  }
  if (film) {
    cdp.on('Page.screencastFrame', onFrame);
    await cdp.send('Page.startScreencast', {
      format: 'jpeg', quality: 70, everyNthFrame: 1, maxWidth: vp.width, maxHeight: vp.height,
    });
    // (An early press, --press-lead, must still be ahead of this page script.)
    await page.waitForTimeout(rest ? Math.max(100, Math.min(IDLE_MS, rest.ms - 150 - pressLead)) : IDLE_MS);
  }
  const t = await page.evaluate(async ({ to, viaDialog, restMs, press, pressLead, pointerType }) => {
    let intended = null;
    let pressedAt = null;
    const until = async (when) => {
      while (performance.now() < when) await new Promise((r) => setTimeout(r, Math.max(0, Math.min(4, when - performance.now() - 1))));
    };
    const rowOf = () => document.querySelector('bdl-switcher').shadowRoot.querySelector(`a[data-school="${to.split('/')[2]}"]`);
    const pressRow = () => rowOf().dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType, isPrimary: true }));
    if (restMs != null) {
      const t0 = performance.now();
      while (window.__bdlOverAt == null && performance.now() - t0 < 2000) await new Promise((r) => setTimeout(r, 1));
      intended = (window.__bdlOverAt ?? t0) + restMs;
      if (press && pressLead > 0) {
        await until(intended - pressLead);
        pressedAt = performance.now();
        pressRow();
      }
      await until(intended);
    }
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
    if (viaDialog) {
      a.remove();
      if (restMs != null && press && !(pressLead > 0)) pressRow();
      rowOf().click();
    } else a.click();
    return {
      wall, perf, late: intended == null ? null : perf - intended, overAt: window.__bdlOverAt ?? null,
      pressAt: pressedAt == null ? null : pressedAt - perf,
    };
  }, {
    to: trip.to, viaDialog, restMs: rest ? rest.ms : null, press: !restNoPress, pressLead,
    pointerType: vp.mobile ? 'touch' : 'mouse',
  });
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
  // --rest-before-click: the click's lateness and every copy, from the click.
  // (Any click through the dialog records its copies too, so a plain hover
  // run shows how long its copy really had.)
  const restInfo = rest || viaDialog ? {
    rest: rest?.ms ?? null, late: t.late == null ? null : Math.round(t.late), overToClick: t.overAt == null ? null : Math.round(trigger - t.overAt),
    pressAt: t.pressAt == null ? null : Math.round(t.pressAt), pressLead: rest && !restNoPress ? pressLead : null,
    copies: await page.evaluate((trig) => window.__bdlCopies.map((c) => ({
      up: Math.round(c.up - trig), down: c.down == null ? null : Math.round(c.down - trig),
    })), trigger).catch(() => null),
  } : null;
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
  // The longest holds, from the trigger to `finished` + 100 ms: between
  // screencast frames after the trigger (motion.mjs's dense.maxGapMs), and
  // between the page's animation frames.
  const end = ('vt-finished' in at ? at['vt-finished'] : FILM_MS) + 100;
  const longest = (ts) => {
    let best = null;
    for (let i = 1; i < ts.length; i++) {
      const d = ts[i] - ts[i - 1];
      if (!best || d > best.ms) best = { ms: Math.round(d), from: Math.round(ts[i - 1]), to: Math.round(ts[i]) };
    }
    return best;
  };
  const offset = t.wall - t.perf;
  const filmed = frames.map((f) => f.at * 1000 - offset - trigger).filter((ms) => ms >= 0 && ms <= end);
  const screencastGap = film ? longest(filmed) : null;
  const rafGap = longest([0, ...data.frames.map((ts) => ts - trigger).filter((ms) => ms > 0 && ms <= end)]);
  return {
    at, ...vis, resources, loaf, frameGaps: gaps, ended: data.url, ...(restInfo ? { restInfo } : {}),
    screencastGap, screencastFrames: filmed.length, firstFrameMs: filmed.length ? Math.round(filmed[0]) : null, rafGap,
  };
}

/** The intervals the report reads, from one run's marks. */
function phases(r) {
  const a = r.at;
  const d = (x, y) => (x in a && y in a ? a[y] - a[x] : null);
  return {
    firstVisible: r.firstVisible,
    firstAny: r.firstAny ?? null,
    aheadRafGap: r.ahead?.rafGap ?? null,
    aheadCopies: r.ahead?.copies?.length ?? null,
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
    // still: the longest time nothing new reached the screen, from the trigger
    // to `finished` + 100 ms. screencastGap alone starts at the first frame
    // after the trigger, so it misses a hold that begins at the click (a copy
    // still drawing when the click lands holds the old page's capture).
    still: r.firstFrameMs == null && r.screencastGap == null ? null : Math.max(r.firstFrameMs ?? 0, r.screencastGap?.ms ?? 0),
    firstFrame: r.firstFrameMs ?? null,
    screencastGap: r.screencastGap?.ms ?? null,
    screencastGapAt: r.screencastGap?.from ?? null,
    rafGap: r.rafGap?.ms ?? null,
    rafGapAt: r.rafGap?.from ?? null,
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
  const presented = presentedFrames(events, threadName, marks, byThread, group);
  return { marks: Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, Math.round((v - marks.trigger) / 100) / 10])), windows, presented };
}

/** Frames the display compositor drew and swapped to the screen
    (Display::DrawAndSwap on the GPU process's VizCompositorThread), from the
    trigger to `finished` + 100 ms: the longest gap between two, where it sits
    against the phases, and every thread's work summed inside it (the freeze
    window). During a view transition something animates every frame, so a
    gap over two vsyncs is a frame the screen did not get. */
function presentedFrames(events, threadName, marks, byThread, group) {
  const viz = new Set([...threadName].filter(([, n]) => n === 'VizCompositorThread').map(([k]) => k));
  const swaps = events
    .filter((e) => e.ph === 'X' && e.name === 'Display::DrawAndSwap' && viz.has(`${e.pid}:${e.tid}`))
    .map((e) => e.ts + e.dur)
    .sort((p, q) => p - q);
  if (!swaps.length) return { error: 'no Display::DrawAndSwap in the trace' };
  const t0 = marks.trigger;
  const t1 = ('vt-finished' in marks ? marks['vt-finished'] : t0 + FILM_MS * 1000) + 100 * 1000;
  // The last swap before the trigger opens the window, so a hold that starts
  // at the click is counted from the frame that was on screen.
  const before = swaps.filter((s) => s < t0).pop();
  const inside = [...(before != null ? [before] : []), ...swaps.filter((s) => s >= t0 && s <= t1)];
  const ms = (x) => Math.round((x - t0) / 100) / 10;
  let max = null;
  const long = [];
  for (let i = 1; i < inside.length; i++) {
    const d = (inside[i] - inside[i - 1]) / 1000;
    if (d > 50) long.push({ ms: Math.round(d), from: ms(inside[i - 1]), to: ms(inside[i]) });
    if (!max || d > max.ms) max = { ms: Math.round(d), from: ms(inside[i - 1]), to: ms(inside[i]), w0: inside[i - 1], w1: inside[i] };
  }
  let freeze = null;
  if (max) {
    const sums = {};
    for (const { g, ev } of byThread.values()) {
      for (const s of selfSegments(ev.filter((e) => e.ts < max.w1 && e.ts + e.dur > max.w0))) {
        const d = (Math.min(s.to, max.w1) - Math.max(s.from, max.w0)) / 1000;
        if (d <= 0) continue;
        sums[g] ??= { busy: 0, categories: {}, names: {} };
        sums[g].busy += d;
        const c = category(s.name);
        sums[g].categories[c] = (sums[g].categories[c] || 0) + d;
        sums[g].names[s.name] = (sums[g].names[s.name] || 0) + d;
      }
    }
    const round = (o) => Object.fromEntries(Object.entries(o).sort((p, q) => q[1] - p[1]).map(([k, v]) => [k, Math.round(v * 10) / 10]));
    freeze = Object.fromEntries(Object.entries(sums).map(([g, t]) => [g, {
      busy: Math.round(t.busy * 10) / 10, categories: round(t.categories), top: Object.fromEntries(Object.entries(round(t.names)).slice(0, 12)),
    }]));
  }
  // Skia's GPU program compiles (a first draw of a new kind of paint), in
  // the whole span and inside the longest gap.
  const compiles = events.filter((e) => e.ph === 'X' && e.name === 'shader_compile');
  const sumIn = (a, z) => {
    const c = compiles.filter((e) => e.ts >= a && e.ts < z);
    return { count: c.length, ms: Math.round(c.reduce((s, e) => s + e.dur, 0) / 100) / 10 };
  };
  const shaderCompiles = { span: sumIn(before ?? t0, t1), inMaxGap: max ? sumIn(max.w0, max.w1) : null, wholeTrace: sumIn(-Infinity, Infinity) };
  if (max) {
    delete max.w0;
    delete max.w1;
  }
  return { swaps: inside.length, maxGap: max, longGaps: long, freeze, shaderCompiles };
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

/** Load the start page (quiet first, as a visitor enters the portal there),
    then do whatever the condition does ahead of the click. */
async function prepare(page, trip, condition, assets) {
  if (trip.dir !== 'arrive') await settle(page, '/t/quiet/');
  await settle(page, trip.from);
  if (condition === 'pf-render' || condition === 'pf-best') await renderOffscreen(page, trip.to);
  else if (condition === 'pf-raster' && rasterSeq.length) {
    const at = trip.to.split('/')[2];
    const aheads = [];
    for (const id of rasterSeq) aheads.push(await renderOffscreen(page, trip.to.replace(`/t/${at}/`, `/t/${id}/`), RASTER_OPACITY));
    return { ahead: { rafGap: Math.max(...aheads.map((x) => x.rafGap)), copies: aheads } };
  } else if (condition === 'pf-raster' && rasterLead) {
    await page.evaluate(({ to, css }) => {
      (async () => {
        const html = await (await fetch(to)).text();
        const f = document.createElement('iframe');
        f.setAttribute('sandbox', 'allow-same-origin');
        f.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;opacity:0.001;pointer-events:none;z-index:2147483647;border:0';
        document.addEventListener('astro:before-preparation', () => f.remove(), { once: true });
        const loaded = new Promise((r) => { f.onload = r; });
        f.srcdoc = html.replace('<head>', `<head><base href="${location.origin}/">${css ? `<style>${css}</style>` : ''}`);
        document.body.append(f);
        await loaded;
        const next = f.contentDocument && f.contentDocument.documentElement;
        if (!next) return;
        if (document.documentElement.dataset.scheme) next.setAttribute('data-scheme', document.documentElement.dataset.scheme);
        next.classList.add('js');
      })();
    }, { to: trip.to, css: rasterCss });
    await page.waitForTimeout(rasterLead);
    return {};
  } else if (condition === 'pf-raster') return { ahead: await renderOffscreen(page, trip.to, RASTER_OPACITY) };
  else if (condition === 'switcher-warm') return { ahead: await switcherWarm(page, trip.to) };
  else if ((condition === 'hover' || condition === 'tap') && trip.dir === 'page') {
    const box = await page.evaluate((to) => {
      const r = [...document.querySelectorAll(`a[href="${to}"]`)].map((a) => a.getBoundingClientRect()).find((b) => b.width && b.top >= 0 && b.bottom <= innerHeight);
      return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
    }, trip.to);
    if (!box) { problems.push(`${trip.id} ${condition}: no visible link to ${trip.to}`); return {}; }
    await page.mouse.move(box.x, box.y);
    await page.waitForTimeout(hoverLead);
    return {};
  } else if (condition === 'hover' || condition === 'tap') {
    const cost = await switcherWarm(page, trip.to, false);
    const id = trip.to.split('/')[2];
    const box = await page.evaluate((id) => {
      // On a phone the list scrolls: bring the row into view first (a no-op
      // on desktop, where every row shows).
      const row = document.querySelector('bdl-switcher').shadowRoot.querySelector(`a[data-school="${id}"]`);
      row.scrollIntoView({ block: 'nearest' });
      const r = row.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }, id);
    // --rest-before-click: measure() moves the mouse, after the idle watch.
    if (condition === 'hover' && restBeforeClick != null) return { viaDialog: true, rest: { box, id, ms: restBeforeClick }, ahead: cost };
    if (condition === 'hover') await page.mouse.move(box.x, box.y);
    else await page.context()._bdlCdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x, y: box.y }] });
    await page.waitForTimeout(hoverLead);
    return { viaDialog: true, touch: condition === 'tap', ahead: cost };
  } else if (condition === 'switcher-pick') {
    await page.evaluate(() => { window.__bdlOpened = performance.now(); document.querySelector('bdl-switcher').shadowRoot.querySelector('.open').click(); });
    await page.waitForTimeout(pickAfter);
    const copies = await page.evaluate(() => window.__bdlCopies.map((c) => ({ up: Math.round(c.up - window.__bdlOpened), ms: c.down == null ? null : Math.round(c.down - c.up), src: (c.el.srcdoc.match(/data-theme="([^"]+)"/) || [])[1] })));
    return { ahead: { copies }, viaDialog: true };
  }
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
}

let renderer = null;
const trips = [
  ...schools.map((id) => ({ id, dir: 'arrive', from: '/t/quiet/', to: `/t/${id}/` })),
  ...returns.map((id) => ({ id, dir: 'return', from: `/t/${id}/`, to: '/t/quiet/' })),
  ...pages.map((id) => ({ id, dir: 'page', from: `/t/${id}/`, to: `/t/${id}/about/` })),
];
const results = [];

for (const trip of trips) {
  const assets = await destinationAssets(trip.to);
  for (let run = 0; run < runs; run++) {
    for (const condition of conditions.filter((c) => c !== 'warm')) {
      const b = freshBrowser ? await launch() : browser;
      const { context, page, cdp } = await newContext(b);
      if (!renderer) {
        renderer = await page.evaluate(() => {
          const gl = document.createElement('canvas').getContext('webgl');
          const x = gl && gl.getExtension('WEBGL_debug_renderer_info');
          return x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : 'unknown';
        });
        console.log(`renderer: ${renderer}`);
      }
      // A visitor always enters the portal on quiet, so quiet's assets are
      // cached on every return trip (and in-school swap).
      context._bdlCdp = cdp;
      const prep = await prepare(page, trip, condition, assets);
      const r = await measure(page, cdp, trip, !!prep?.viaDialog, prep?.rest ?? null);
      if (prep?.touch) await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }).catch(() => {});
      results.push({ ...trip, condition, run, ...r, ...(prep?.ahead ? { ahead: prep.ahead } : {}) });
      if (condition === 'cold' && conditions.includes('warm')) {
        await settle(page, trip.from);
        const w = await measure(page, cdp, trip);
        results.push({ ...trip, condition: 'warm', run, ...w });
      }
      await context.close();
      if (freshBrowser) await b.close();
    }
    const last = results.filter((x) => x.id === trip.id && x.dir === trip.dir && x.run === run);
    const gap = (x) => (x.screencastGap ? ` gap ${x.screencastGap.ms}` : '');
    console.log(`${trip.id} ${trip.dir} run ${run + 1}/${runs}: ` + last.map((x) => `${x.condition} ${x.firstVisible == null ? '?' : Math.round(x.firstVisible)}${gap(x)}`).join(', '));
  }
}

// Traced cold arrivals (--trace-runs per listed school), after the timed runs
// so tracing never overlaps them.
const traceSummaries = [];
for (const id of traced) {
  for (const trip of trips.filter((t) => t.id === id)) for (let n = 0; n < traceRuns; n++) {
    const b = freshBrowser ? await launch() : browser;
    const { context, page, cdp } = await newContext(b);
    // The prepared state reaches the traced run as it does a timed one, so a
    // hover trace (--rest-before-click) clicks through the dialog after its rest.
    const prep = await prepare(page, trip, traceCondition, await destinationAssets(trip.to));
    const file = join(outDir, `trace-${id}-${trip.dir}-${vpName}-${scheme}${traceCondition !== 'cold' ? `-${traceCondition}` : ''}${traceRuns > 1 ? `-${n + 1}` : ''}.json`);
    await b.startTracing(page, {
      path: file,
      categories: [
        'devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.frame',
        'blink.user_timing', 'v8.execute', 'v8', 'loading', 'blink', 'cc', 'gpu', 'viz', 'toplevel', 'benchmark',
        // Skia's and ANGLE's own events, so a raster flush can be split into
        // shader compiles, path work and the draw itself.
        'skia', 'disabled-by-default-skia', 'disabled-by-default-skia.gpu', 'disabled-by-default-skia.shaders', 'gpu.angle',
        'disabled-by-default-gpu.service', 'blink.image_decode',
      ],
    });
    const r = await measure(page, cdp, trip, !!prep?.viaDialog, prep?.rest ?? null);
    await b.stopTracing();
    await context.close();
    if (freshBrowser) await b.close();
    const summary = await analyseTrace(file, r.firstVisible);
    traceSummaries.push({ id, dir: trip.dir, viewport: vpName, scheme, condition: traceCondition, file, run: { at: r.at, firstVisible: r.firstVisible, phases: phases(r) }, ...summary });
    const p = summary.presented;
    console.log(`traced ${id} ${trip.dir}: ${file}${p?.maxGap ? `  presented gap ${p.maxGap.ms} ms at +${p.maxGap.from}, screencast gap ${r.screencastGap?.ms ?? 'n/a'}, shader compiles ${p.shaderCompiles.span.count} (${p.shaderCompiles.span.ms} ms)` : ''}`);
  }
}
await browser.close();

const summary = [];
for (const trip of trips) {
  for (const condition of ['cold', 'pf-brief', 'pf-full', 'pf-decode', 'pf-render', 'pf-memory', 'pf-best', 'pf-raster', 'switcher-warm', 'switcher-pick', 'hover', 'tap', 'warm']) {
    const rs = results.filter((r) => r.id === trip.id && r.dir === trip.dir && r.condition === condition);
    if (!rs.length) continue;
    const ph = rs.map(phases);
    const row = { id: trip.id, dir: trip.dir, condition, runs: rs.length };
    for (const k of Object.keys(ph[0])) row[k] = stats(ph.map((p) => p[k]));
    summary.push(row);
  }
}

const meta = { base, viewport: vpName, scheme, film, latency, gpu: useGpu, renderer, runs, freshBrowser, stubs: stubNames, written: new Date().toISOString() };
await writeFile(join(outDir, `${tag}.runs.json`), JSON.stringify({ meta, results, problems }, null, 2));
await writeFile(join(outDir, `${tag}.summary.json`), JSON.stringify({ meta, summary }, null, 2));
if (traceSummaries.length) await writeFile(join(outDir, `${tag}.traces.json`), JSON.stringify(traceSummaries, null, 2));

const cell = (s) => (s ? `${Math.round(s.median)} (${Math.round(s.min)} to ${Math.round(s.max)})` : 'n/a');
const cols = ['still', 'firstFrame', 'screencastGap', 'rafGap', 'aheadRafGap', 'firstAny', 'firstVisible', 'vtStart', 'ready', 'fetch', 'cssWait', 'fontWait', 'oldCapture', 'swap', 'newRender', 'readyToVisible', 'finished'];
const md = [
  `# Arrival timings, ${vpName} ${scheme} (${renderer}${film ? '' : ', not filmed'}${latency ? `, +${latency} ms per request` : ''}${freshBrowser ? ', fresh browser per run' : ''}${stubNames.length ? `, stubs ${stubNames.join('+')}` : ''})`,
  '',
  'Median (min to max) ms after the trigger, or per phase.',
  'still = the longer of firstFrame (the trigger to the first new screencast frame) and screencastGap (the longest gap between frames after that): read still, not screencastGap, for the hold.',
  '',
  `| school | trip | condition | runs | ${cols.join(' | ')} |`,
  `|${'---|'.repeat(cols.length + 4)}`,
  ...summary.map((r) => `| ${r.id} | ${r.dir} | ${r.condition} | ${r.runs} | ${cols.map((c) => cell(r[c])).join(' | ')} |`),
];
if (problems.length) md.push('', 'Problems:', ...problems.map((p) => `- ${p}`));
await writeFile(join(outDir, `${tag}.summary.md`), md.join(NL) + NL);
console.log(md.join(NL));
if (problems.length) process.exitCode = 2;
