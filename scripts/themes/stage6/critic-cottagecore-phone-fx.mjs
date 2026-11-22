/**
 * Stage 6 cottagecore critic (11-19-26): are the phone floaters visible, and
 * does a tap (not a scroll) make them react? 390x844 at 2x, hasTouch, isMobile,
 * GPU Chromium, both schemes, motion on.
 *
 * Visibility: every frame is diffed against the same view with the canvas
 * hidden, so only floater ink that actually shows (not under a sheet) counts.
 * Diff pixels are binned into 8px cells and connected cells counted as blobs.
 * Taps: page.touchscreen.tap on clear cloth; light compares a seed blob's
 * centroid shift against an untapped control; dark counts new lit blobs near
 * the tap. Scroll: a CDP touch scroll gesture, logging the pointer events the
 * page saw (a scroll should end in pointercancel, never a tap).
 *
 * Usage: node scripts/themes/snap.mjs --name stage6-base --reuse --port 4468 -- node scripts/themes/stage6/critic-cottagecore-phone-fx.mjs
 * Output: scripts/themes/.out/stage6-critic-cottagecore/phone-fx/
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'stage6-critic-cottagecore', 'phone-fx');
await mkdir(OUT, { recursive: true });
const base = process.env.SNAP_BASE || 'http://127.0.0.1:4468';
const FRAMES = Number(process.env.FRAMES || 45);

const browser = await chromium.launch({ headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'] });
const R = { base, frames: FRAMES, runs: [] };
{
  const p = await browser.newPage();
  R.renderer = await p.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); });
  await p.close();
  console.log('renderer:', R.renderer);
  if (/swiftshader|llvmpipe/i.test(R.renderer)) throw new Error('software renderer: evidence invalid');
}

async function newPage(scheme) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, colorScheme: scheme, reducedMotion: 'no-preference' });
  await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
  await suppressPrompt(context);
  await context.addInitScript(() => {
    window.__pe = [];
    for (const t of ['pointerdown', 'pointerup', 'pointercancel']) window.addEventListener(t, (e) => window.__pe.push(`${t}:${e.pointerType}`), { capture: true, passive: true });
    document.addEventListener('DOMContentLoaded', () => {
      const st = document.createElement('style');
      st.textContent = 'bdl-switcher { display: none !important; }';
      document.head.append(st);
    });
  });
  const page = await context.newPage();
  return { context, page };
}

const decode = async (buf) => {
  const img = await loadImage(buf);
  const c = createCanvas(img.width, img.height);
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  return { w: img.width, h: img.height, d: g.getImageData(0, 0, img.width, img.height).data };
};

/** Blobs of floater ink: cells (8 device px) with any pixel differing from ref. */
function blobs(ref, cur, scheme) {
  if (ref.ref2) { const a = blobsRaw(ref, cur, scheme, ref.mask); return a; }
  return blobsRaw(ref, cur, scheme, null);
}
function blobsRaw(ref, cur, scheme, mask) {
  const C = 8;
  const cw = Math.ceil(ref.w / C), ch = Math.ceil(ref.h / C);
  const cell = new Uint8Array(cw * ch);
  const thr = scheme === 'dark' ? 36 : 30;
  for (let y = 0; y < ref.h; y++) for (let x = 0; x < ref.w; x++) {
    const i = (y * ref.w + x) * 4;
    const dd = Math.abs(ref.d[i] - cur.d[i]) + Math.abs(ref.d[i + 1] - cur.d[i + 1]) + Math.abs(ref.d[i + 2] - cur.d[i + 2]);
    const ci = ((y / C) | 0) * cw + ((x / C) | 0);
    if (dd > thr && !(mask && mask[ci])) cell[ci]++;
  }
  const seen = new Uint8Array(cw * ch);
  const out = [];
  for (let i = 0; i < cell.length; i++) {
    if (!cell[i] || seen[i]) continue;
    const st = [i]; seen[i] = 1; let n = 0, sx = 0, sy = 0, px = 0;
    while (st.length) {
      const j = st.pop(); const x = j % cw, y = (j / cw) | 0; n++; sx += x; sy += y; px += cell[j];
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= cw || yy >= ch) continue;
        const k = yy * cw + xx; if (cell[k] && !seen[k]) { seen[k] = 1; st.push(k); }
      }
    }
    if (px >= 6) out.push({ x: ((sx / n) * C) / 2, y: ((sy / n) * C) / 2, cells: n, px });
  }
  return out; // CSS px
}

async function refShot(page) {
  await page.evaluate(() => { document.querySelector('[data-cc-motes]').style.visibility = 'hidden'; });
  await page.waitForTimeout(80);
  const ref = await decode(await page.screenshot());
  await page.waitForTimeout(250);
  const r2 = await decode(await page.screenshot());
  await page.evaluate(() => { document.querySelector('[data-cc-motes]').style.visibility = ''; });
  // Cells that differ between two canvas-less shots are page noise, not floaters.
  const C = 8, cw = Math.ceil(ref.w / C), ch = Math.ceil(ref.h / C);
  const mask = new Uint8Array(cw * ch);
  let noisy = 0;
  for (let y = 0; y < ref.h; y++) for (let x = 0; x < ref.w; x++) {
    const i = (y * ref.w + x) * 4;
    if (Math.abs(ref.d[i] - r2.d[i]) + Math.abs(ref.d[i + 1] - r2.d[i + 1]) + Math.abs(ref.d[i + 2] - r2.d[i + 2]) > 12) {
      const ci = ((y / C) | 0) * cw + ((x / C) | 0);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const k = ci + dy * cw + dx; if (k >= 0 && k < mask.length) { if (!mask[k]) noisy++; mask[k] = 1; } }
    }
  }
  ref.ref2 = true; ref.mask = mask; ref.noisyCells = noisy;
  return ref;
}

async function sample(page, scheme, label, n = FRAMES) {
  const ref = await refShot(page);
  const counts = [];
  let saved = 0;
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const buf = await page.screenshot();
    const b = blobs(ref, await decode(buf), scheme);
    counts.push(b.length);
    if (b.length && saved < 2) { await writeFile(join(OUT, `${scheme}-${label}-lit${saved}.png`), buf); saved++; }
    if (i === 0) await writeFile(join(OUT, `${scheme}-${label}-f0.png`), buf);
  }
  const secs = (Date.now() - t0) / 1000;
  const withAny = counts.filter((c) => c > 0).length;
  const mean = counts.reduce((a, b) => a + b, 0) / n;
  return { label, noisyCells: ref.noisyCells, frames: n, secs: +secs.toFixed(1), framesWithAny: withAny, shareWithAny: +(withAny / n).toFixed(2), meanVisible: +mean.toFixed(2), max: Math.max(...counts), counts: counts.join('') };
}

async function settle(page, path, scrollTo) {
  await page.goto(base + path, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  if (scrollTo) {
    await page.evaluate((y) => window.scrollTo(0, y === 'bottom' ? document.body.scrollHeight : y), scrollTo);
    await page.waitForTimeout(1200); // sweep settles after a scroll
  }
  await page.waitForTimeout(1500);
}

/** Clear cloth points in view: not on text, not on a sheet, not on a link. */
async function clearPoints(page) {
  return page.evaluate(() => {
    const cover = [...document.querySelectorAll('.cc-paper, .cc-torn, .cc-gingham, a, button, input, textarea, p, h1, h2, h3, li, img, svg')].map((e) => e.getBoundingClientRect());
    const pts = [];
    for (let y = 60; y < innerHeight - 60; y += 40) for (let x = 30; x < innerWidth - 30; x += 40) {
      if (!cover.some((r) => x >= r.left - 12 && x <= r.right + 12 && y >= r.top - 12 && y <= r.bottom + 12)) pts.push([x, y]);
    }
    return pts;
  });
}

for (const scheme of ['light', 'dark']) {
  const run = { scheme, visibility: [], taps: [], scroll: null };
  const { context, page } = await newPage(scheme);
  for (const [label, path, scroll] of [['home-top', '/t/cottagecore/', 0], ['home-cards', '/t/cottagecore/', 1700], ['home-bottom', '/t/cottagecore/', 'bottom'], ['about-top', '/t/cottagecore/about/', 0], ['contact-top', '/t/cottagecore/contact/', 0]]) {
    await settle(page, path, scroll);
    const v = await sample(page, scheme, label);
    run.visibility.push(v);
    console.log(scheme, JSON.stringify(v));
  }

  // Taps on clear cloth at the top of Home.
  await settle(page, '/t/cottagecore/', 0);
  const pts = await clearPoints(page);
  run.clearPointsAtTop = pts.length;
  const ref = await refShot(page);
  const tries = scheme === 'dark' ? 12 : 8;
  for (let i = 0; i < tries; i++) {
    let target;
    if (scheme === 'light') {
      // Tap 45px left of a visible seed, if one shows; else a clear point.
      const b = blobs(ref, await decode(await page.screenshot()), scheme);
      const s = b.sort((a, c) => c.px - a.px)[0];
      if (!s) { await page.waitForTimeout(800); continue; }
      target = [Math.max(5, s.x - 45), s.y];
      const before = s;
      await page.evaluate(() => (window.__pe = []));
      await page.touchscreen.tap(target[0], target[1]);
      await page.waitForTimeout(500);
      const after = blobs(ref, await decode(await page.screenshot()), scheme);
      const near = after.map((a) => ({ a, d: Math.hypot(a.x - before.x, a.y - before.y) })).sort((p, q) => p.d - q.d)[0];
      // Control: the same seed's 500 ms drift with no tap.
      const c0 = blobs(ref, await decode(await page.screenshot()), scheme);
      const cs = c0.map((a) => ({ a, d: Math.hypot(a.x - (near?.a.x ?? 0), a.y - (near?.a.y ?? 0)) })).sort((p, q) => p.d - q.d)[0];
      await page.waitForTimeout(500);
      const c1 = blobs(ref, await decode(await page.screenshot()), scheme);
      const cn = cs ? c1.map((a) => ({ a, d: Math.hypot(a.x - cs.a.x, a.y - cs.a.y) })).sort((p, q) => p.d - q.d)[0] : null;
      run.taps.push({ target: target.map(Math.round), seed: [Math.round(before.x), Math.round(before.y)], shiftAfterTap: near ? +near.d.toFixed(1) : null, dx: near ? Math.round(near.a.x - before.x) : null, controlShift: cn ? +cn.d.toFixed(1) : null, events: await page.evaluate(() => window.__pe.join(' ')) });
    } else {
      target = pts[Math.floor((i / tries) * pts.length)] || [195, 420];
      const b0 = blobs(ref, await decode(await page.screenshot()), scheme).filter((b) => Math.hypot(b.x - target[0], b.y - target[1]) < 70).length;
      await page.evaluate(() => (window.__pe = []));
      await page.touchscreen.tap(target[0], target[1]);
      let hit = 0;
      for (let k = 0; k < 4; k++) {
        await page.waitForTimeout(120);
        hit = Math.max(hit, blobs(ref, await decode(await page.screenshot()), scheme).filter((b) => Math.hypot(b.x - target[0], b.y - target[1]) < 70).length);
      }
      run.taps.push({ target, litNearBefore: b0, litNearAfter: hit, events: await page.evaluate(() => window.__pe.join(' ')) });
      await page.waitForTimeout(300);
    }
  }
  if (scheme === 'dark') run.tapResponseRate = +(run.taps.filter((t) => t.litNearAfter > t.litNearBefore).length / run.taps.length).toFixed(2);

  // A touch scroll gesture: what pointer events does the page see?
  await settle(page, '/t/cottagecore/', 0);
  await page.evaluate(() => (window.__pe = []));
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.synthesizeScrollGesture', { x: 300, y: 650, yDistance: -350, gestureSourceType: 'touch', speed: 800 });
  await page.waitForTimeout(300);
  run.scroll = { scrollY: await page.evaluate(() => scrollY), events: await page.evaluate(() => window.__pe.join(' ')) };
  console.log(scheme, 'taps', JSON.stringify(run.taps), 'scroll', JSON.stringify(run.scroll));
  R.runs.push(run);
  await context.close();
}

await writeFile(join(OUT, 'results.json'), JSON.stringify(R, null, 2));
await browser.close();
console.log('done');
