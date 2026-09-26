/**
 * Wave B1 glass fix round 2 (09-25-26): where does the extra time of a cold
 * quiet -> glass arrival go, against the base build? One cold arrival per
 * run (fresh browser each, so empty GPU caches), traced with
 * browser.startTracing, prefers-reduced-transparency forced to no-preference
 * over CDP (scripts/themes/trace-arrival.mjs does not, so it would time
 * glass's E10 off state: no blur, no wallpaper). From the trace:
 *   - presented frames: every Display::DrawAndSwap (GPU/viz) after the
 *     click, and the longest gap between two of them up to +700 ms;
 *   - image decodes (ImageDecodeTask / Decode Image / ImageFrameGenerator)
 *     summed, with their start and end relative to the click;
 *   - raster (RasterTask) and main-thread work summed in the same window;
 *   - the page's own marks: after-swap, VT ready, VT finished;
 *   - the presented-frame film (the trace's screenshots, which are what the
 *     display compositor showed): presentedFirstChange and presentedLanded
 *     (first screenshot from which the picture stays within 10 levels of
 *     the last one).
 * --cond tinywp answers the wallpaper with a tiny PNG; --css "<css>" adopts a
 * diagnostic stylesheet in every document (e.g. every backdrop-filter off).
 * Usage: BDL_GPU=1 node scripts/themes/glassmorphism/b1-fix2-trace.mjs
 *   [--base URL] [--scheme light] [--runs 3] [--tag name] [--cond asis|tinywp] [--css "<css>"]
 * Output: scripts/themes/.out/b1-glass-fix2/trace-<tag>-<scheme>/run-<n>.json
 * (the raw trace) and summary.json.
 */
import { chromium } from 'playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? d : process.argv[i + 1]; };
const BASE = arg('base', process.env.SNAP_BASE || 'http://127.0.0.1:4471');
const scheme = arg('scheme', 'light');
const runs = Number(arg('runs', '3'));
const tag = arg('tag', 'after');
const cond = arg('cond', 'asis');
// --css: a diagnostic stylesheet adopted by every document (survives the
// router's swap), to take one layer out and re-measure.
const extraCss = arg('css', '');
const OUT = join(HERE, '..', '.out', 'b1-glass-fix2', `trace-${tag}-${scheme}`);
await mkdir(OUT, { recursive: true });
const gpu = process.env.BDL_GPU === '1';
if (!gpu) console.warn('BDL_GPU is not 1: SwiftShader is a failure for this probe');

const summary = [];
for (let n = 0; n < runs; n++) {
  const browser = await chromium.launch({ args: ['--hide-scrollbars', ...(gpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : [])] });
  const c = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: scheme, deviceScaleFactor: 1 });
  await c.addInitScript((s) => { try { localStorage.setItem('scheme', s); localStorage.setItem('bdl-switcher-prompt', 'dismissed'); } catch {} }, scheme);
  if (extraCss) await c.addInitScript((css) => { const apply = () => { const sh = new CSSStyleSheet(); sh.replaceSync(css); document.adoptedStyleSheets = [...document.adoptedStyleSheets, sh]; }; if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply(); }, extraCss);
  await c.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  // --cond tinywp: the wallpaper answered with a 64x40 PNG (its decode and
  // upload cost out of the arrival); asis: as built.
  if (cond === 'tinywp') {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAEAAAAAoCAIAAAAt2Q6oAAAAQ0lEQVR42u3OMQ0AAAgDoL1/aGuwBwEJ6eZqAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAR8WHQ4JLp6KvwAAAABJRU5ErkJggg==', 'base64');
    await c.route(/(light|dark)-day.[^/]*.(avif|webp)/, (r) => r.fulfill({ status: 200, contentType: 'image/png', body: png }));
  }
  const page = await c.newPage();
  const cdp = await c.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  await page.goto(BASE + '/t/quiet/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    window.__ev = [];
    document.addEventListener('astro:after-swap', () => window.__ev.push(['after-swap', performance.now()]));
    const orig = document.startViewTransition?.bind(document);
    if (orig) document.startViewTransition = (...a) => { const vt = orig(...a); vt.ready.then(() => window.__ev.push(['vt-ready', performance.now()])); vt.finished.then(() => window.__ev.push(['vt-finished', performance.now()])); return vt; };
  });
  const tracePath = join(OUT, `run-${n}.json`);
  await browser.startTracing(page, { path: tracePath, categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.frame', 'viz', 'cc', 'gpu', 'blink', 'toplevel', 'disabled-by-default-cc.debug.scheduler.frames', 'blink.user_timing', 'disabled-by-default-devtools.screenshot'] });
  await page.waitForTimeout(200);
  await page.evaluate(() => { performance.mark('bdl-click'); const a = document.createElement('a'); a.href = '/t/glassmorphism/'; a.textContent = 'go'; a.style.cssText = 'position:fixed;left:0;top:0;opacity:0'; document.body.append(a); a.click(); });
  await page.waitForTimeout(1300);
  const ev = await page.evaluate(() => { const m = performance.getEntriesByName('bdl-click')[0]?.startTime ?? 0; return window.__ev.map(([e, t]) => [e, Math.round(t - m)]); });
  await browser.stopTracing();
  await browser.close();
  const trace = JSON.parse(await readFile(tracePath, 'utf8'));
  const events = trace.traceEvents || trace;
  const click = events.find((e) => e.name === 'bdl-click');
  if (!click) console.warn('no bdl-click mark in the trace');
  const t0 = click ? click.ts : 0;
  const rel = (e) => (e.ts - t0) / 1000;
  const inWin = (e) => rel(e) >= 0 && rel(e) <= 700;
  const swaps = events.filter((e) => e.name === 'Display::DrawAndSwap' && e.ph === 'X' && inWin(e)).map(rel).sort((a, b) => a - b);
  let gap = 0, gapAt = 0;
  for (let i = 1; i < swaps.length; i++) if (swaps[i] - swaps[i - 1] > gap) { gap = swaps[i] - swaps[i - 1]; gapAt = swaps[i - 1]; }
  const decodes = events.filter((e) => /ImageDecodeTask|Decode Image|ImageFrameGenerator::decode|DecodeImage/i.test(e.name) && e.ph === 'X' && inWin(e));
  const decodeMs = decodes.reduce((a, e) => a + (e.dur || 0) / 1000, 0);
  const raster = events.filter((e) => e.name === 'RasterTask' && e.ph === 'X' && inWin(e)).reduce((a, e) => a + (e.dur || 0) / 1000, 0);
  const main = events.filter((e) => e.name === 'RunTask' && e.ph === 'X' && inWin(e) && (e.dur || 0) > 16000).map((e) => ({ at: Math.round(rel(e)), ms: Math.round(e.dur / 1000) }));
  // Presented-frame film: the trace's screenshots are what the display
  // compositor actually showed. Landing = first screenshot from which the
  // picture stays within 10 levels (mean, summed over channels) of the last
  // one; firstChange = first that differs from the one before the click.
  const shots = events.filter((e) => e.name === 'Screenshot' && e.args?.snapshot).map((e) => ({ t: rel(e), b64: e.args.snapshot }));
  const stats = [];
  if (shots.length) {
    const an = await (await chromium.launch()).newPage();
    for (const sh of shots) {
      const m = await an.evaluate(async (b) => { const i = new Image(); i.src = 'data:image/jpeg;base64,' + b; await i.decode(); const cv = document.createElement('canvas'); cv.width = 48; cv.height = 30; const g = cv.getContext('2d'); g.drawImage(i, 0, 0, 48, 30); const d = g.getImageData(0, 0, 48, 30).data; const m = [0, 0, 0]; for (let k = 0; k < d.length; k += 4) { m[0] += d[k]; m[1] += d[k + 1]; m[2] += d[k + 2]; } return m.map((x) => Math.round(x / (d.length / 4))); }, sh.b64);
      stats.push({ t: Math.round(sh.t), m });
    }
    await an.context().browser().close();
  }
  const pre = stats.filter((x) => x.t < 0).at(-1) || stats[0];
  const post = stats.filter((x) => x.t >= 0 && x.t <= 1200);
  const dist = (a, b) => Math.abs(a.m[0] - b.m[0]) + Math.abs(a.m[1] - b.m[1]) + Math.abs(a.m[2] - b.m[2]);
  const lastShot = post.at(-1);
  let li = post.length - 1;
  while (li > 0 && dist(post[li - 1], lastShot) <= 10) li--;
  const presentedFirstChange = post.find((x) => pre && dist(x, pre) > 6)?.t ?? null;
  const presentedLanded = post[li]?.t ?? null;
  const row = {
    presentedFirstChange, presentedLanded, film: post.map((x) => x.t + ':' + x.m.join(',')).join(' '),
    run: n, marks: ev, presented: swaps.length, longestPresentedGap: { ms: Math.round(gap), after: Math.round(gapAt) },
    firstPresentedAfter100: Math.round(swaps.find((s) => s > 100) ?? -1),
    decodes: { count: decodes.length, ms: Math.round(decodeMs), spans: decodes.map((e) => `${Math.round(rel(e))}+${Math.round((e.dur || 0) / 1000)}`).slice(0, 8) },
    rasterMs: Math.round(raster), longTasks: main,
  };
  console.log(JSON.stringify(row));
  summary.push(row);
}
await writeFile(join(OUT, 'summary.json'), JSON.stringify(summary, null, 1));
