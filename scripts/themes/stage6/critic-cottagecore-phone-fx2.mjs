/**
 * Stage 6 cottagecore critic (11-19-26), v2 of critic-cottagecore-phone-fx.mjs.
 * v1 diffed screenshots against a canvas-hidden reference, but hiding the
 * canvas layer shifts text antialiasing, so static blobs swamped the count.
 * v2 reads the floater canvas itself in the page, finds ink blobs, and drops
 * any blob whose centre sits under a sheet (elementsFromPoint finds a
 * .cc-paper/.cc-torn/.cc-gingham or an element with an opaque background
 * above the canvas). 390x844 at 2x, hasTouch, isMobile, GPU Chromium.
 *
 * Measures: visible floaters per frame (sampled every ~120 ms for ~12 s) at
 * five views per scheme; tap reaction (seed speeds near a tap before vs after;
 * lit motes near a tap before vs after); a manual touch drag (CDP touch
 * events) to confirm a scroll is never taken as a tap.
 *
 * Usage: node scripts/themes/snap.mjs --name stage6-base --reuse --port 4468 -- node scripts/themes/stage6/critic-cottagecore-phone-fx2.mjs
 * Output: scripts/themes/.out/stage6-critic-cottagecore/phone-fx/results2.json
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'stage6-critic-cottagecore', 'phone-fx');
await mkdir(OUT, { recursive: true });
const base = process.env.SNAP_BASE || 'http://127.0.0.1:4468';

const browser = await chromium.launch({ headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'] });
const R = { base, runs: [] };
{
  const p = await browser.newPage();
  R.renderer = await p.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); });
  await p.close();
  console.log('renderer:', R.renderer);
  if (/swiftshader|llvmpipe/i.test(R.renderer)) throw new Error('software renderer: evidence invalid');
}

const INPAGE = () => {
  /** Ink blobs on the floater canvas, in CSS px, with whether each shows. */
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
  return { context, page: await context.newPage() };
}

async function settle(page, path, scrollTo) {
  await page.goto(base + path, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  if (scrollTo) {
    await page.evaluate((y) => window.scrollTo(0, y === 'bottom' ? document.body.scrollHeight : y), scrollTo);
  }
  await page.waitForTimeout(2200);
}

const THR = { light: 70, dark: 90 };

async function sample(page, scheme, label) {
  const frames = await page.evaluate(async (thr) => {
    const out = [];
    const t0 = performance.now();
    while (performance.now() - t0 < 12000) {
      await new Promise((r) => setTimeout(r, 120));
      const b = window.__blobs(thr);
      out.push([b.length, b.filter((x) => x.shows).length]);
    }
    return out;
  }, THR[scheme]);
  const n = frames.length;
  const drawn = frames.map((f) => f[0]);
  const shows = frames.map((f) => f[1]);
  const avg = (a) => +(a.reduce((p, q) => p + q, 0) / n).toFixed(2);
  return { label, frames: n, meanDrawn: avg(drawn), meanShowing: avg(shows), shareFramesShowingAny: +(shows.filter((c) => c > 0).length / n).toFixed(2), maxShowing: Math.max(...shows), showing: shows.join('') };
}

for (const scheme of ['light', 'dark']) {
  const run = { scheme, visibility: [], taps: [], drag: null };
  const { context, page } = await newPage(scheme);
  for (const [label, path, scroll] of [['home-top', '/t/cottagecore/', 0], ['home-cards', '/t/cottagecore/', 1700], ['home-lab', '/t/cottagecore/', 2600], ['home-bottom', '/t/cottagecore/', 'bottom'], ['about-top', '/t/cottagecore/about/', 0], ['services-top', '/t/cottagecore/services/', 0], ['contact-top', '/t/cottagecore/contact/', 0]]) {
    await settle(page, path, scroll);
    const v = await sample(page, scheme, label);
    run.visibility.push(v);
    console.log(scheme, JSON.stringify(v));
    if (label === 'home-top') await page.screenshot({ path: join(OUT, `v2-${scheme}-home-top.png`) });
  }

  // Taps at the top of Home.
  await settle(page, '/t/cottagecore/', 0);
  for (let i = 0; i < (scheme === 'dark' ? 16 : 8); i++) {
    const before = await page.evaluate((thr) => window.__blobs(thr), THR[scheme]);
    let target;
    if (scheme === 'light') {
      const s = before.filter((b) => b.shows).sort((a, b) => b.px - a.px)[0];
      if (!s) { await page.waitForTimeout(700); continue; }
      target = [Math.max(4, s.x - 50), s.y];
      // Control speed: the same seed over 400 ms with no tap.
      await page.waitForTimeout(400);
      const mid = await page.evaluate((thr) => window.__blobs(thr), THR[scheme]);
      const m0 = mid.map((b) => ({ b, d: Math.hypot(b.x - s.x, b.y - s.y) })).sort((p, q) => p.d - q.d)[0];
      await page.evaluate(() => (window.__pe = []));
      await page.touchscreen.tap(target[0], m0 ? m0.b.y : target[1]);
      await page.waitForTimeout(400);
      const after = await page.evaluate((thr) => window.__blobs(thr), THR[scheme]);
      const a0 = m0 ? after.map((b) => ({ b, d: Math.hypot(b.x - m0.b.x, b.y - m0.b.y) })).sort((p, q) => p.d - q.d)[0] : null;
      run.taps.push({ seed: [s.x, s.y], tapAt: [Math.round(target[0]), m0 ? m0.b.y : target[1]], movedNoTap400ms: m0 ? Math.round(m0.d) : null, movedAfterTap400ms: a0 ? Math.round(a0.d) : null, dxAfterTap: a0 ? a0.b.x - m0.b.x : null, events: await page.evaluate(() => window.__pe.join(' ')) });
      await page.waitForTimeout(1200);
    } else {
      // Tap where a user would: a spread of points over the clear cloth in view.
      target = [[60, 250], [330, 280], [330, 330], [200, 470], [40, 600], [350, 700], [100, 760], [300, 150]][i % 8];
      const near = (bs) => bs.filter((b) => b.shows && Math.hypot(b.x - target[0], b.y - target[1]) < 60).length;
      const n0 = near(before);
      await page.evaluate(() => (window.__pe = []));
      await page.touchscreen.tap(target[0], target[1]);
      let n1 = 0;
      for (let k = 0; k < 4; k++) { await page.waitForTimeout(100); n1 = Math.max(n1, near(await page.evaluate((thr) => window.__blobs(thr), THR[scheme]))); }
      run.taps.push({ tapAt: target, litNearBefore: n0, litNearAfter: n1, events: await page.evaluate(() => window.__pe.join(' ')) });
      await page.waitForTimeout(500);
    }
  }
  if (scheme === 'dark') run.tapResponseRate = +(run.taps.filter((t) => t.litNearAfter > t.litNearBefore).length / run.taps.length).toFixed(2);

  // A finger drag (a scroll), dispatched as raw touch events.
  await settle(page, '/t/cottagecore/', 0);
  await page.evaluate(() => (window.__pe = []));
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 300, y: 650 }] });
  for (let k = 1; k <= 12; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 300, y: 650 - k * 30 }] }); await page.waitForTimeout(16); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(400);
  run.drag = { scrollY: await page.evaluate(() => Math.round(scrollY)), events: await page.evaluate(() => window.__pe.join(' ')) };
  console.log(scheme, 'taps', JSON.stringify(run.taps), 'rate', run.tapResponseRate, 'drag', JSON.stringify(run.drag));
  R.runs.push(run);
  await context.close();
}

await writeFile(join(OUT, 'results2.json'), JSON.stringify(R, null, 2));
await browser.close();
console.log('done');
