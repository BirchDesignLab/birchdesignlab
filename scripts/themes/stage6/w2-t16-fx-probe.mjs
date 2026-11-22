/**
 * Stage 6 wave 2, task 16: the cottagecore floaters on a phone (390 x 844 at 2x, touch, motion on).
 * Adapted from critic-cottagecore-phone-fx2.mjs, which found CC1 and CC2.
 *
 *   BASE=http://127.0.0.1:4470 node scripts/themes/stage6/w2-t16-fx-probe.mjs <vis|tap|drag|all> <dark|light|both> <outDir> [label]
 *
 *   vis   the report's seven views (Home top, cards, Lab band, bottom, About, Services, Contact), 12 s
 *         each, a frame every ~120 ms. Per view: the share of frames with a lit mote (dark) or seed
 *         (light) SHOWING (not under a sheet), the mean number showing, the longest run of frames with
 *         none showing (seconds), and the bursts that showed (a burst is a run of showing frames; two
 *         runs closer than 0.9 s are one burst, since a burst's flashes are about 0.5 s apart).
 *   tap   dark: 16 taps spread over the clear cloth of Home top. "answered" = a lit mote within 60px of
 *         the tap within 1.2 s that was not there before. Light: a seed tapped, kicked away.
 *   drag  a raw touch drag (a scroll) must give pointercancel and never a tap response.
 *
 * Canvas blobs are read in the page; a blob whose centre sits under a .cc-paper, .cc-torn or
 * .cc-gingham, or under an element with an opaque background, does not count as showing.
 * GPU Chromium (renderer printed and checked), prefers-reduced-transparency forced to no-preference,
 * the portal prompt suppressed. Writes <outDir>/<label>-fx.json.
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const BASE = (process.env.BASE || 'http://127.0.0.1:4470').replace(/\/$/, '');
const WHAT = process.argv[2] || 'all';
const SCHEMES = (process.argv[3] || 'both') === 'both' ? ['dark', 'light'] : [process.argv[3]];
const OUT = process.argv[4];
const LABEL = process.argv[5] || 'run';
if (!OUT) throw new Error('usage: w2-t16-fx-probe.mjs <vis|tap|drag|all> <dark|light|both> <outDir> [label]');
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'] });
const R = { base: BASE, label: LABEL, runs: [] };
{
  const p = await browser.newPage();
  R.renderer = await p.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); });
  await p.close();
  console.log('renderer:', R.renderer);
  if (/swiftshader|llvmpipe/i.test(R.renderer)) throw new Error('software renderer: evidence invalid');
}

const INPAGE = () => {
  window.__blobs = (thr) => {
    const cv = document.querySelector('[data-cc-motes]');
    const g = cv.getContext('2d');
    const W = cv.width, H = cv.height, k = W / innerWidth;
    const d = g.getImageData(0, 0, W, H).data;
    const C = 6, cw = Math.ceil(W / C), ch = Math.ceil(H / C);
    const cell = new Uint16Array(cw * ch);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > thr) cell[((y / C) | 0) * cw + ((x / C) | 0)]++;
    const seen = new Uint8Array(cw * ch), out = [];
    for (let i = 0; i < cell.length; i++) {
      if (!cell[i] || seen[i]) continue;
      const st = [i]; seen[i] = 1; let n = 0, sx = 0, sy = 0, px = 0;
      while (st.length) {
        const j = st.pop(), x = j % cw, y = (j / cw) | 0; n++; sx += x; sy += y; px += cell[j];
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
          const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= cw || yy >= ch) continue;
          const q = yy * cw + xx; if (cell[q] && !seen[q]) { seen[q] = 1; st.push(q); }
        }
      }
      if (px < 3) continue;
      const bx = ((sx / n) * C + C / 2) / k, by = ((sy / n) * C + C / 2) / k;
      out.push({ x: Math.round(bx), y: Math.round(by), px, shows: !covered(bx, by) });
    }
    return out;
  };
  const covered = (x, y) => {
    if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return true;
    for (const el of document.elementsFromPoint(x, y)) {
      if (el.matches('header, html, body, .cc-header, [data-cc-motes]')) return false;
      if (el.closest('.cc-paper, .cc-torn, .cc-gingham')) return true;
      const cs = getComputedStyle(el);
      const m = cs.backgroundColor.match(/rgba?\(([^)]+)\)/);
      const a = m ? (m[1].split(',')[3] === undefined ? 1 : +m[1].split(',')[3]) : 0;
      if (a > 0.5 || cs.backgroundImage !== 'none') return true;
    }
    return false;
  };
};

async function newPage(scheme) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, colorScheme: scheme, reducedMotion: 'no-preference' });
  await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
  await suppressPrompt(context);
  await context.addInitScript(() => {
    window.__pe = [];
    for (const t of ['pointerdown', 'pointerup', 'pointercancel']) window.addEventListener(t, (e) => window.__pe.push(`${t}:${e.pointerType}`), { capture: true, passive: true });
  });
  await context.addInitScript(INPAGE);
  await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  return { context, page };
}

async function settle(page, path, scrollTo) {
  await page.goto(BASE + path, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  if (scrollTo) await page.evaluate((y) => window.scrollTo(0, y === 'bottom' ? document.body.scrollHeight : y), scrollTo);
  await page.waitForTimeout(2200);
}

const THR = { light: 70, dark: 90 };
const STEP = 120;

async function sample(page, scheme, label) {
  const frames = await page.evaluate(async ([thr, step]) => {
    const out = [];
    const t0 = performance.now();
    while (performance.now() - t0 < 12000) {
      await new Promise((r) => setTimeout(r, step));
      const b = window.__blobs(thr);
      out.push([b.length, b.filter((x) => x.shows).length]);
    }
    return out;
  }, [THR[scheme], STEP]);
  const n = frames.length;
  const shows = frames.map((f) => f[1]);
  const avg = (a) => +(a.reduce((p, q) => p + q, 0) / n).toFixed(2);
  let longest = 0, run = 0;
  for (const s of shows) { if (s === 0) { run++; longest = Math.max(longest, run); } else run = 0; }
  // Bursts: runs of showing frames, merging runs split by under 0.9 s of nothing.
  const gapFrames = Math.ceil(900 / (12000 / n));
  let bursts = 0, quiet = 1e9;
  for (const s of shows) { if (s > 0) { if (quiet >= gapFrames) bursts++; quiet = 0; } else quiet++; }
  return { label, frames: n, meanShowing: avg(shows), shareFramesShowingAny: +(shows.filter((c) => c > 0).length / n).toFixed(2), longestEmptySeconds: +(longest * 12 / n).toFixed(1), burstsIn12s: bursts, showing: shows.join('') };
}

const VIEWS = [['home-top', '/t/cottagecore/', 0], ['home-cards', '/t/cottagecore/', 1700], ['home-lab', '/t/cottagecore/', 2600], ['home-bottom', '/t/cottagecore/', 'bottom'], ['about-top', '/t/cottagecore/about/', 0], ['services-top', '/t/cottagecore/services/', 0], ['contact-top', '/t/cottagecore/contact/', 0]];

for (const scheme of SCHEMES) {
  const run = { scheme, visibility: [], taps: [], drag: null };
  const { context, page } = await newPage(scheme);
  if (WHAT === 'vis' || WHAT === 'all') {
    for (const [label, path, scroll] of VIEWS) {
      await settle(page, path, scroll);
      const v = await sample(page, scheme, label);
      run.visibility.push(v);
      console.log(scheme, JSON.stringify({ ...v, showing: undefined }));
    }
    const shares = run.visibility.map((v) => v.shareFramesShowingAny);
    run.meanShare = +(shares.reduce((a, b) => a + b, 0) / shares.length).toFixed(2);
    run.worstLongestEmpty = Math.max(...run.visibility.map((v) => v.longestEmptySeconds));
    console.log(scheme, 'mean share', run.meanShare, 'worst longest empty (s)', run.worstLongestEmpty);
  }
  if (WHAT === 'tap' || WHAT === 'all') {
    await settle(page, '/t/cottagecore/', 0);
    for (let i = 0; i < (scheme === 'dark' ? 16 : 8); i++) {
      const before = await page.evaluate((thr) => window.__blobs(thr), THR[scheme]);
      if (scheme === 'light') {
        const s = before.filter((b) => b.shows).sort((a, b) => b.px - a.px)[0];
        if (!s) { await page.waitForTimeout(700); continue; }
        const target = [Math.max(4, s.x - 50), s.y];
        await page.waitForTimeout(400);
        const mid = await page.evaluate((thr) => window.__blobs(thr), THR[scheme]);
        const m0 = mid.map((b) => ({ b, d: Math.hypot(b.x - s.x, b.y - s.y) })).sort((p, q) => p.d - q.d)[0];
        await page.evaluate(() => (window.__pe = []));
        await page.touchscreen.tap(target[0], m0 ? m0.b.y : target[1]);
        await page.waitForTimeout(400);
        const after = await page.evaluate((thr) => window.__blobs(thr), THR[scheme]);
        const a0 = m0 ? after.map((b) => ({ b, d: Math.hypot(b.x - m0.b.x, b.y - m0.b.y) })).sort((p, q) => p.d - q.d)[0] : null;
        run.taps.push({ movedNoTap400ms: m0 ? Math.round(m0.d) : null, movedAfterTap400ms: a0 ? Math.round(a0.d) : null, events: await page.evaluate(() => window.__pe.join(' ')) });
        await page.waitForTimeout(1200);
      } else {
        const target = [[60, 250], [330, 280], [330, 330], [200, 470], [40, 600], [350, 700], [100, 760], [300, 150]][i % 8];
        const near = (bs) => bs.filter((b) => b.shows && Math.hypot(b.x - target[0], b.y - target[1]) < 60).length;
        const n0 = near(before);
        await page.evaluate(() => (window.__pe = []));
        await page.touchscreen.tap(target[0], target[1]);
        let n1 = 0;
        for (let k = 0; k < 10; k++) { await page.waitForTimeout(120); n1 = Math.max(n1, near(await page.evaluate((thr) => window.__blobs(thr), THR[scheme]))); }
        run.taps.push({ tapAt: target, litNearBefore: n0, litNearAfter: n1, events: await page.evaluate(() => window.__pe.join(' ')) });
        await page.waitForTimeout(500);
      }
    }
    if (scheme === 'dark') run.tapResponseRate = +(run.taps.filter((t) => t.litNearAfter > t.litNearBefore).length / run.taps.length).toFixed(2);
    console.log(scheme, 'taps', run.taps.length, 'rate', run.tapResponseRate);
  }
  if (WHAT === 'drag' || WHAT === 'all') {
    await settle(page, '/t/cottagecore/', 0);
    await page.evaluate(() => (window.__pe = []));
    const cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 300, y: 650 }] });
    for (let k = 1; k <= 12; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 300, y: 650 - k * 30 }] }); await page.waitForTimeout(16); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(400);
    run.drag = { scrollY: await page.evaluate(() => Math.round(scrollY)), events: await page.evaluate(() => window.__pe.join(' ')) };
    console.log(scheme, 'drag', JSON.stringify(run.drag));
  }
  R.runs.push(run);
  await context.close();
}

await writeFile(join(OUT, `${LABEL}-fx.json`), JSON.stringify(R, null, 2));
await browser.close();
console.log('done');
