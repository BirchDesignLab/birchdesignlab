/**
 * Wave B2 round 5, seat b2r5-glass-critic (the glass RE-CRITIC, 09-26-26).
 * Close-up evidence on the lens poster (R5, L3) against a snap already
 * serving at --base (port 4475):
 *   pvl       poster vs live at the lens's own start: the live lens crop,
 *             then a REAL context loss (the poster stands in), then restore;
 *             1440x900, 820x1180, 390x844, Clear and Tinted (a real click or
 *             tap on the hero switch), light and dark. 2x crops, mean channel
 *             difference inside the disc.
 *   arrfilm   arrival through the real portal switcher (out to vaporwave and
 *             back), recorded with a CDP screencast (every frame the
 *             compositor paints), cropped to the lens spot at 2x; the frames
 *             either side of the poster -> live handover, with the rAF log of
 *             the poster's display and the canvas's visibility.
 *   nojs      the no-script / drawn-ahead stand-in: JavaScript off, poster
 *             spot vs the live lens's start, 820x1180 and 390x844.
 *   e10       prefers-reduced-transparency: reduce, 1440 and 390: no canvas,
 *             the frosted poster at the start.
 *   nowebgl   getContext('webgl'|'webgl2') returns null: the poster stays at
 *             the start, 1440 and 390.
 *   teardown  glass -> vaporwave through the switcher: no lens canvas left,
 *             no draws after leaving.
 * GPU Chromium (aborts on SwiftShader), prefers-reduced-transparency forced
 * to no-preference over CDP (except e10), the portal prompt suppressed.
 *
 * Usage: BDL_GPU=1 node scripts/themes/glassmorphism/b2r5-glass-critic-lensfilm.mjs --base http://127.0.0.1:4475 [--only a,b] [--out dir]
 */
import { chromium, webkit } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (n, f) => { const i = args.indexOf(`--${n}`); return i === -1 ? f : args[i + 1]; };
const base = arg('base', 'http://127.0.0.1:4475');
const only = arg('only', '').split(',').filter(Boolean);
const OUT = arg('out', join(HERE, '..', '.out', 'stage3-b2', 'glass-recritic-r5', 'lensfilm'));
const HOME = `${base}/t/glassmorphism/`;
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
const R = {};
{
  const p = await browser.newPage();
  R.renderer = await p.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); });
  await p.close();
  console.log('renderer:', R.renderer);
  if (/swiftshader|llvmpipe/i.test(R.renderer)) { await browser.close(); throw new Error('software renderer; abort'); }
}

async function ctx({ w, h, scheme = 'light', touch = w < 900, js = true, rt = 'no-preference', noWebgl = false }) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, hasTouch: touch, isMobile: touch, deviceScaleFactor: touch ? 2 : 1, javaScriptEnabled: js });
  await suppressPrompt(context);
  await context.addInitScript(([sch, noGl]) => {
    try { localStorage.setItem('bdl-scheme', sch); } catch {}
    window.__draws = 0;
    const p = WebGLRenderingContext.prototype; const o = p.drawArrays;
    p.drawArrays = function (...a) { window.__draws++; return o.apply(this, a); };
    if (noGl) { const gc = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, ...a) { return /webgl/i.test(t) ? null : gc.call(this, t, ...a); }; }
    // rAF log of the poster and canvas, epoch ms, for the screencast match
    window.__plog = [];
    const tick = () => {
      const po = document.querySelector('.lens-poster'); const c = document.querySelector('.lens-canvas');
      const orb = document.querySelector('.hero .orb'); const orr = orb?.getBoundingClientRect();
      window.__plog.push({ t: performance.timeOrigin + performance.now(), theme: document.documentElement.dataset.theme, poster: po ? getComputedStyle(po).display : null, canvas: c ? getComputedStyle(c).visibility : null, orbCy: orr ? Math.round(orr.top + orr.height / 2) : null, clock: orb ? orb.parentElement.hasAttribute('data-clock') : null });
      if (window.__plog.length < 20000) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [scheme, noWebgl]);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: rt }, { name: 'prefers-color-scheme', value: scheme }] });
  return { context, page, cdp, errors, dsf: touch ? 2 : 1 };
}
const mountWait = (page) => page.waitForFunction(() => document.querySelector('.lens-poster')?.style.display === 'none', { timeout: 10000 }).then(() => true).catch(() => false);
async function open(page, scheme, { wait = true } = {}) {
  await page.goto(HOME, { waitUntil: 'networkidle' });
  const cur = await page.evaluate(() => document.documentElement.dataset.scheme);
  if (cur !== scheme) { await page.evaluate((s) => { document.documentElement.dataset.scheme = s; }, scheme); await page.waitForTimeout(700); }
  const ok = wait ? await mountWait(page) : false;
  await page.waitForTimeout(500);
  return ok;
}
const geo = (page) => page.evaluate(() => {
  const hit = document.querySelector('.lens-hit')?.getBoundingClientRect();
  const p = document.querySelector('.lens-poster'); const pr = p?.getBoundingClientRect();
  const c = document.querySelector('.lens-canvas');
  return {
    lens: hit ? { cx: Math.round(hit.left + hit.width / 2), cy: Math.round(hit.top + hit.height / 2), r: Math.round(hit.width / 2) } : null,
    poster: p ? { display: getComputedStyle(p).display, cx: Math.round(pr.left + pr.width / 2), cy: Math.round(pr.top + pr.height / 2), r: Math.round(pr.width / 2), bg: getComputedStyle(p).backgroundColor, bf: getComputedStyle(p).backdropFilter } : null,
    canvas: c ? getComputedStyle(c).visibility : null, canvases: document.querySelectorAll('canvas').length,
    window: (() => { const r = document.querySelector('.hero .window')?.getBoundingClientRect(); return r ? [r.left, r.top, r.right, r.bottom].map(Math.round) : null; })(),
    tint: document.documentElement.dataset.glassTint ?? null, draws: window.__draws,
  };
});
async function setTint(page, w) {
  if (w < 900) await page.tap('.hero .window-bar .switch'); else await page.click('.hero .window-bar .switch');
  await page.waitForTimeout(1300);
}
async function sheet(file, rows, { scale = 1, title = '' } = {}) {
  const imgs = await Promise.all(rows.map((row) => Promise.all(row.map(async ([l, b]) => [l, await loadImage(b)]))));
  const cw = Math.max(...imgs.flat().map(([, i]) => i.width)) * scale;
  const ch = Math.max(...imgs.flat().map(([, i]) => i.height)) * scale;
  const cols = Math.max(...imgs.map((r) => r.length));
  const lh = 58, pad = 12, th = title ? 44 : 0;
  const c = createCanvas(Math.round(cols * (cw + pad) + pad), Math.round(th + imgs.length * (ch + lh + pad) + pad));
  const g = c.getContext('2d');
  g.fillStyle = '#1c1c1c'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#fff';
  if (title) { g.font = 'bold 26px sans-serif'; g.fillText(title, pad, 32); }
  g.font = '21px sans-serif';
  imgs.forEach((row, ri) => row.forEach(([l, im], ci) => {
    const x = pad + ci * (cw + pad), y = th + pad + ri * (ch + lh + pad);
    g.fillStyle = '#fff';
    const words = l.split(' '); let line = '', ly = y + 22, n = 0;
    for (const wd of words) { const t = line ? `${line} ${wd}` : wd; if (g.measureText(t).width > cw - 4 && line && n === 0) { g.fillText(line, x, ly); ly += 25; n++; line = wd; } else line = t; }
    g.fillText(line, x, ly);
    g.imageSmoothingEnabled = scale < 1;
    g.drawImage(im, x, y + lh, im.width * scale, im.height * scale);
  }));
  const path = join(OUT, file);
  await writeFile(path, c.toBuffer('image/jpeg', 92));
  console.log('wrote', path);
}
async function pixels(buf) {
  const img = await loadImage(buf);
  const c = createCanvas(img.width, img.height); const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  return { img, width: img.width, height: img.height, data: g.getImageData(0, 0, img.width, img.height).data };
}
async function cropScale(buf, sx, sy, sw, sh, k) {
  const img = await loadImage(buf);
  const c = createCanvas(Math.round(sw * k), Math.round(sh * k)); const g = c.getContext('2d');
  g.imageSmoothingEnabled = true; g.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
  return c.toBuffer('image/png');
}
function discDiff(a, b, cx, cy, r) {
  let n = 0, sum = 0; const ds = [];
  for (let y = 0; y < a.height; y++) for (let x = 0; x < a.width; x++) {
    if (Math.hypot(x - cx, y - cy) > r - 2) continue;
    const i = (y * a.width + x) * 4; let d = 0;
    for (let c = 0; c < 3; c++) d += Math.abs(a.data[i + c] - b.data[i + c]);
    d /= 3; sum += d; n++; ds.push(d);
  }
  ds.sort((p, q) => p - q);
  return { mean: +(sum / n).toFixed(1), p95: +ds[Math.floor(ds.length * 0.95)].toFixed(1) };
}
const loseCtx = (page) => page.evaluate(() => { const c = document.querySelector('.lens-canvas'); const gl = c.getContext('webgl2') || c.getContext('webgl'); window.__lc = gl.getExtension('WEBGL_lose_context'); window.__lc.loseContext(); });

const SIZES = [[1440, 900], [820, 1180], [390, 844]];

/* ---------------- pvl ---------------- */
async function pvl() {
  R.pvl = {};
  const rows = [];
  for (const [w, h] of SIZES) {
    const row = [];
    for (const scheme of ['light', 'dark']) for (const tint of ['clear', 'tinted']) {
      const { context, page, errors } = await ctx({ w, h, scheme });
      await open(page, scheme);
      if (tint === 'tinted') await setTint(page, w);
      await page.mouse.move(2, 2); await page.waitForTimeout(300);
      const g = await geo(page);
      const m = 28;
      const clip = { x: Math.max(0, g.lens.cx - g.lens.r - m), y: Math.max(0, g.lens.cy - g.lens.r - m), width: 0, height: 0 };
      clip.width = Math.min(w - clip.x, g.lens.cx + g.lens.r + m - clip.x); clip.height = Math.min(h - clip.y, g.lens.cy + g.lens.r + m - clip.y);
      const live = await page.screenshot({ clip, scale: 'css' });
      await loseCtx(page); await page.waitForTimeout(400);
      const gl = await geo(page);
      const post = await page.screenshot({ clip, scale: 'css' });
      await page.evaluate(() => window.__lc.restoreContext()); await page.waitForTimeout(900);
      const gb = await geo(page);
      const a = await pixels(live), b = await pixels(post);
      const d = discDiff(a, b, g.lens.cx - clip.x, g.lens.cy - clip.y, g.lens.r);
      const k = w < 900 ? 2 : 1.4;
      R.pvl[`${w}x${h}__${scheme}__${tint}`] = { lens: g.lens, posterOnLoss: gl.poster, canvasOnLoss: gl.canvas, restored: { canvas: gb.canvas, poster: gb.poster?.display }, tint: g.tint, diff: d, errors };
      console.log('pvl', w, scheme, tint, JSON.stringify(R.pvl[`${w}x${h}__${scheme}__${tint}`]));
      row.push([`${w} ${scheme} ${tint}: LIVE lens`, await cropScale(live, 0, 0, a.width, a.height, k)]);
      row.push([`POSTER (ctx lost) same spot; mean ${d.mean} p95 ${d.p95}`, await cropScale(post, 0, 0, b.width, b.height, k)]);
      await context.close();
    }
    rows.push(row.slice(0, 4), row.slice(4));
  }
  await sheet('sheet__poster-vs-live-ctxloss.jpg', rows, { scale: 1, title: 'Live lens | poster after a real WebGL context loss, same spot and crop (1440 at 1.4x, 820 and 390 at 2x)' });
}

/* ---------------- arrfilm ---------------- */
async function viaSwitcher(page, school) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('.open[aria-haspopup="dialog"]').first().click();
  const link = page.locator(`a[data-school="${school}"]`).first();
  await link.waitFor({ state: 'visible', timeout: 5000 });
  await link.click();
}
async function arrfilm() {
  R.arrfilm = {};
  const list = arg('arrivals', '1440x900,820x1180,390x844').split(',').map((s) => s.split('x').map(Number));
  for (const [w, h] of list) {
    const rows = [];
    for (const scheme of ['light', 'dark']) for (const tint of ['clear', 'tinted']) {
      const { context, page, cdp, errors, dsf } = await ctx({ w, h, scheme });
      await open(page, scheme);
      if (tint === 'tinted') await setTint(page, w);
      const g = await geo(page);
      await viaSwitcher(page, 'vaporwave');
      await page.waitForFunction(() => document.documentElement.dataset.theme === 'vaporwave', { timeout: 8000 });
      await page.waitForTimeout(2500);
      const frames = [];
      cdp.on('Page.screencastFrame', async (f) => { frames.push({ t: f.metadata.timestamp * 1000, data: f.data }); try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch {} });
      await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: w * dsf, maxHeight: h * dsf, everyNthFrame: 1 });
      await page.waitForTimeout(150);
      const tClick = Date.now();
      await viaSwitcher(page, 'glassmorphism');
      await page.waitForFunction(() => document.querySelector('.lens-poster')?.style.display === 'none', { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(900);
      await cdp.send('Page.stopScreencast');
      const plog = await page.evaluate(() => window.__plog);
      const after = await geo(page);
      // the portal swaps in place, so the log also holds the first visit: keep only what follows the click
      const glassLog = plog.filter((e) => e.t >= tClick && e.theme === 'glassmorphism');
      const swap = glassLog.find((e) => e.poster === 'none');
      const firstPoster = glassLog.find((e) => e.poster === 'block');
      // pick frames: 3 before the swap, 4 after
      const tSwap = swap?.t ?? Infinity;
      const before = frames.filter((f) => f.t >= tClick && f.t < tSwap).slice(-4);
      const aft = frames.filter((f) => f.t >= tSwap).slice(0, 4);
      const m = 30;
      const sx = Math.max(0, g.lens.cx - g.lens.r - m), sy = Math.max(0, g.lens.cy - g.lens.r - m);
      const sw = Math.min(w - sx, 2 * (g.lens.r + m)), sh = Math.min(h - sy, 2 * (g.lens.r + m));
      const row = [];
      for (const f of [...before, ...aft]) {
        const buf = Buffer.from(f.data, 'base64');
        const im = await loadImage(buf); const k = im.width / w;
        const state = (() => { let s = null; for (const e of plog) { if (e.t <= f.t) s = e; else break; } return s; })();
        row.push([`${scheme} ${tint} +${Math.round(f.t - tClick)}ms ${state?.theme === 'glassmorphism' ? `poster ${state.poster} canvas ${state.canvas ?? '-'}` : state?.theme ?? ''}`, await cropScale(buf, sx * k, sy * k, sw * k, sh * k, (w < 900 ? 2 : 1.5) / k)]);
      }
      R.arrfilm[`${w}x${h}__${scheme}__${tint}`] = { lensAtStart: g.lens, lensAfter: after.lens, tintAfter: after.tint, frames: frames.length, firstPosterMs: firstPoster ? Math.round(firstPoster.t - tClick) : null, swapMs: swap ? Math.round(swap.t - tClick) : null, canvasAtSwap: swap?.canvas ?? null, blankRafs: glassLog.filter((e) => e.poster !== 'block' && e.canvas !== 'visible').length, errors };
      console.log('arrfilm', w, scheme, tint, JSON.stringify(R.arrfilm[`${w}x${h}__${scheme}__${tint}`]));
      rows.push(row);
      await context.close();
    }
    await sheet(`film__arrival-lens-${w}x${h}.jpg`, rows, { scale: 1, title: `${w}x${h} arrival via the real switcher, CDP screencast cropped to the lens start: the 4 frames before and after poster -> live (rows: light clear, light tinted, dark clear, dark tinted)` });
  }
}

/* ---------------- nojs ---------------- */
async function nojs() {
  R.nojs = {};
  const row = [];
  const orbsOf = (page) => page.evaluate(() => [...document.querySelectorAll('.hero .orb')].map((o) => { const r = o.getBoundingClientRect(); return [Math.round((r.left + r.width / 2) * 10) / 10, Math.round((r.top + r.height / 2) * 10) / 10]; }));
  for (const [w, h] of [[1440, 900], [820, 1180], [390, 844]]) {
    let live, liveOrbs;
    { const { context, page } = await ctx({ w, h }); await open(page, 'light'); live = (await geo(page)).lens; liveOrbs = await orbsOf(page); await context.close(); }
    const { context, page } = await ctx({ w, h, js: false });
    await page.goto(HOME, { waitUntil: 'networkidle' }); await page.waitForTimeout(600);
    const g = await geo(page);
    const nojsOrbs = await orbsOf(page);
    R.nojs[`${w}x${h}`] = { orbsJsOff: nojsOrbs, orbsLive: liveOrbs, worstOrbPx: Math.max(...nojsOrbs.map((p, i) => Math.max(Math.abs(p[0] - liveOrbs[i][0]), Math.abs(p[1] - liveOrbs[i][1])))), poster: g.poster, liveStart: live, dx: g.poster ? g.poster.cx - live.cx : null, dy: g.poster ? g.poster.cy - live.cy : null, window: g.window };
    console.log('nojs', w, JSON.stringify(R.nojs[`${w}x${h}`]));
    const buf = await page.screenshot({ scale: 'css' });
    const im = await loadImage(buf); const c = createCanvas(im.width, im.height); const gg = c.getContext('2d'); gg.drawImage(im, 0, 0);
    gg.lineWidth = 2; gg.strokeStyle = 'rgba(255,0,0,0.9)'; gg.beginPath(); gg.arc(live.cx, live.cy, live.r, 0, Math.PI * 2); gg.stroke();
    row.push([`${w}x${h} JS off: poster (${g.poster?.cx},${g.poster?.cy}) vs live start (red) (${live.cx},${live.cy})`, c.toBuffer('image/png')]);
    await context.close();
  }
  await sheet('sheet__nojs-poster.jpg', [row], { scale: 0.5, title: 'No-script stand-in poster vs the live lens start (red circle)' });
}

/* ---------------- e10 / nowebgl ---------------- */
async function e10() {
  R.e10 = {};
  const row = [];
  for (const [w, h] of [[1440, 900], [390, 844]]) for (const scheme of ['light', 'dark']) {
    const { context, page } = await ctx({ w, h, scheme, rt: 'reduce' });
    await open(page, scheme, { wait: false }); await page.waitForTimeout(1500);
    const g = await geo(page);
    R.e10[`${w}x${h}__${scheme}`] = g;
    console.log('e10', w, scheme, JSON.stringify(g));
    const p = g.poster; const m = 30;
    row.push([`E10 ${w} ${scheme}: poster ${p?.display} (${p?.cx},${p?.cy}) canvases ${g.canvases} canvas ${g.canvas}`, await page.screenshot({ clip: { x: Math.max(0, p.cx - p.r - m), y: Math.max(0, p.cy - p.r - m), width: Math.min(w - Math.max(0, p.cx - p.r - m), 2 * (p.r + m)), height: 2 * (p.r + m) }, scale: 'css' })]);
    await context.close();
  }
  await sheet('sheet__e10-poster.jpg', [row], { scale: 1.5, title: 'E10 (reduced transparency): frosted poster, no live canvas' });
}
async function nowebgl() {
  R.nowebgl = {};
  const row = [];
  for (const [w, h] of [[1440, 900], [390, 844]]) for (const tint of ['clear', 'tinted']) {
    const { context, page, errors } = await ctx({ w, h, noWebgl: true });
    await open(page, 'light', { wait: false }); await page.waitForTimeout(1500);
    if (tint === 'tinted') await setTint(page, w);
    const g = await geo(page);
    R.nowebgl[`${w}x${h}__${tint}`] = { ...g, errors };
    console.log('nowebgl', w, tint, JSON.stringify(g), errors.join(' | '));
    const p = g.poster; const m = 30;
    row.push([`no WebGL ${w} ${tint}: poster ${p?.display} (${p?.cx},${p?.cy})`, await page.screenshot({ clip: { x: Math.max(0, p.cx - p.r - m), y: Math.max(0, p.cy - p.r - m), width: Math.min(w - Math.max(0, p.cx - p.r - m), 2 * (p.r + m)), height: 2 * (p.r + m) }, scale: 'css' })]);
    await context.close();
  }
  await sheet('sheet__nowebgl-poster.jpg', [row], { scale: 1.5, title: 'No WebGL: the poster stands in at the start' });
}

/* ---------------- orbfirst ---------------- */
// Where Home's first hero orb (violet) sits in every animation frame from the
// document's first rAF, on a hard load and on a real switcher arrival: any
// frame at a spot other than the settled one is a visible orb jump.
async function orbfirst() {
  R.orbfirst = {};
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const { context, page } = await ctx({ w, h });
    await open(page, 'light');
    const hard = await page.evaluate(() => window.__plog.filter((e) => e.theme === 'glassmorphism').map((e) => [Math.round(e.t - performance.timeOrigin), e.orbCy, e.clock]));
    const settled = hard.at(-1)?.[1];
    await viaSwitcher(page, 'vaporwave');
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'vaporwave', { timeout: 8000 });
    await page.waitForTimeout(2000);
    const tClick = Date.now();
    await viaSwitcher(page, 'glassmorphism');
    await page.waitForTimeout(2500);
    const arr = await page.evaluate((t0) => window.__plog.filter((e) => e.t >= t0 && e.theme === 'glassmorphism').map((e) => [Math.round(e.t - t0), e.orbCy, e.clock]), tClick);
    const summ = (log) => { const off = log.filter((e) => e[1] !== null && Math.abs(e[1] - settled) > 1); return { frames: log.length, framesOffSettled: off.length, offSpots: [...new Set(off.map((e) => e[1]))], firstOffMs: off[0]?.[0] ?? null, lastOffMs: off.at(-1)?.[0] ?? null, clockFromMs: log.find((e) => e[2])?.[0] ?? null }; };
    R.orbfirst[`${w}x${h}`] = { settledCy: settled, hardLoad: summ(hard), arrival: summ(arr), arrivalHead: arr.slice(0, 12) };
    console.log('orbfirst', w, JSON.stringify(R.orbfirst[`${w}x${h}`]));
    await context.close();
  }
}

/* ---------------- webkitposter ---------------- */
// WebKit (Safari's engine): the live lens, then the poster after a real
// context loss, Clear and Tinted, 1440x900 light; the computed
// -webkit-backdrop-filter the poster really gets.
async function webkitposter() {
  R.webkitposter = {};
  const wk = await webkit.launch();
  const row = [];
  for (const tint of ['clear', 'tinted']) {
    const context = await wk.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
    await suppressPrompt(context);
    await context.addInitScript(() => { try { localStorage.setItem('bdl-scheme', 'light'); } catch {} });
    const page = await context.newPage();
    await page.goto(HOME, { waitUntil: 'networkidle' });
    await mountWait(page); await page.waitForTimeout(600);
    if (tint === 'tinted') { await page.click('.hero .window-bar .switch'); await page.waitForTimeout(1300); }
    await page.mouse.move(2, 2); await page.waitForTimeout(300);
    const g = await geo(page);
    const clip = { x: Math.max(0, g.lens.cx - g.lens.r - 28), y: g.lens.cy - g.lens.r - 28, width: 2 * g.lens.r + 56, height: 2 * g.lens.r + 56 };
    const live = await page.screenshot({ clip });
    await loseCtx(page); await page.waitForTimeout(500);
    const gl = await geo(page);
    const wbf = await page.evaluate(() => { const p = document.querySelector('.lens-poster'); const cs = getComputedStyle(p); return { webkit: cs.webkitBackdropFilter, std: cs.backdropFilter, bg: cs.backgroundColor }; });
    const post = await page.screenshot({ clip });
    const a = await pixels(live), b = await pixels(post);
    const d = discDiff(a, b, g.lens.cx - clip.x, g.lens.cy - clip.y, g.lens.r);
    R.webkitposter[tint] = { lens: g.lens, poster: gl.poster, canvas: gl.canvas, filters: wbf, diff: d };
    console.log('webkitposter', tint, JSON.stringify(R.webkitposter[tint]));
    row.push([`WebKit ${tint} LIVE`, live], [`WebKit ${tint} POSTER (ctx lost) mean ${d.mean}`, post]);
    await context.close();
  }
  await wk.close();
  await sheet('sheet__webkit-poster-vs-live.jpg', [row], { scale: 1.4, title: 'WebKit 1440x900 light: live lens | poster after a context loss' });
}

/* ---------------- teardown ---------------- */
async function teardown() {
  const { context, page, errors } = await ctx({ w: 1440, h: 900 });
  await open(page, 'light');
  const g = await geo(page);
  await viaSwitcher(page, 'vaporwave');
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'vaporwave', { timeout: 8000 });
  await page.waitForTimeout(1500);
  const a = await page.evaluate(() => ({ lensCanvas: document.querySelectorAll('.lens-canvas').length, host: !!document.getElementById('glass-lens-host'), draws: window.__draws, webglCanvases: [...document.querySelectorAll('canvas')].length }));
  await page.waitForTimeout(2000);
  const b = await page.evaluate(() => ({ draws: window.__draws }));
  R.teardown = { before: { lens: g.lens, draws: g.draws }, afterLeave: a, drawsLater: b.draws, errors };
  console.log('teardown', JSON.stringify(R.teardown));
  await context.close();
}

const all = { pvl, arrfilm, nojs, e10, nowebgl, orbfirst, webkitposter, teardown };
for (const [k, fn] of Object.entries(all)) {
  if (only.length && !only.includes(k)) continue;
  try { console.log('==', k); await fn(); } catch (e) { R[`${k}Error`] = String(e?.stack || e); console.error('ERR', k, e); }
}
await browser.close();
await writeFile(join(OUT, 'results.json'), JSON.stringify(R, null, 1));
console.log('done');
