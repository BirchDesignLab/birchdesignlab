/**
 * Stage 6 wave 2, task 16: the dark tap (CC2) and the touch hover gates (CC4), at 390 x 844 2x.
 *
 *   BASE=http://127.0.0.1:4470 node scripts/themes/stage6/w2-t16-tap-hover.mjs <tap|hover|all> <outDir> [label]
 *
 * tap    Home top, dark, touch. Clear cloth points are found in the page (no text line within 14px, no
 *        sheet or control under it). For each of up to 14 spread points: a touch tap, then lit blobs on
 *        the floater canvas sampled for 1.5 s. Per tap: whether a lit mote showed within 60px of the
 *        tap, how long after, and whether the first lit blob was already at the tap (a new mote, or one
 *        that was near) or arrived from farther (a called mote). Also taps on text, a sheet and a link
 *        (should not call a mote), and a finger drag (pointercancel, no answer). Two taps are filmed as
 *        timestamped strips of 170px crops: <outDir>/<label>-tap-strip-<n>.png.
 * hover  Touch context: each hover rule's element is forced into :hover (CDP CSS.forcePseudoState) and its
 *        computed style compared with the same element unforced; a mouse context does the same as a
 *        control (the rule must change there, never on touch).
 * GPU Chromium (renderer checked), reduced transparency forced to no-preference, prompt suppressed.
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const BASE = (process.env.BASE || 'http://127.0.0.1:4470').replace(/\/$/, '');
const WHAT = process.argv[2] || 'all';
const OUT = process.argv[3];
const LABEL = process.argv[4] || 'run';
if (!OUT) throw new Error('usage: w2-t16-tap-hover.mjs <tap|hover|all> <outDir> [label]');
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'] });
const R = { base: BASE, label: LABEL };
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
      out.push({ x: Math.round(((sx / n) * C + C / 2) / k), y: Math.round(((sy / n) * C + C / 2) / k), px });
    }
    return out;
  };
  /** Points on clear cloth: no text line within 14px, no sheet, link or control under it. */
  window.__clearPoints = () => {
    const rects = [];
    const range = document.createRange();
    for (const region of document.querySelectorAll('header, main, footer')) {
      const w = document.createTreeWalker(region, NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n; n = w.nextNode()) {
        if (!n.nodeValue.trim()) continue;
        range.selectNodeContents(n);
        for (const r of range.getClientRects()) rects.push(r);
      }
      for (const el of region.querySelectorAll('input, textarea, select, button')) rects.push(el.getBoundingClientRect());
    }
    const sheets = [...document.querySelectorAll('.cc-paper, .cc-torn, .cc-gingham, .hoop')].map((e) => e.getBoundingClientRect());
    const near = (x, y, r, pad) => x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
    const out = [];
    for (let y = 30; y < innerHeight - 30; y += 20) for (let x = 14; x < innerWidth - 14; x += 20) {
      if (rects.some((r) => near(x, y, r, 14)) || sheets.some((r) => near(x, y, r, 0))) continue;
      const top = document.elementFromPoint(x, y);
      if (top && top.closest('a, button, input, textarea, select, label, .cc-paper, .cc-torn, .cc-gingham')) continue;
      out.push([x, y]);
    }
    return out;
  };
};

async function newDark(touch = true) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: touch, isMobile: touch, colorScheme: 'dark', reducedMotion: 'no-preference' });
  await context.addInitScript(() => { try { localStorage.setItem('scheme', 'dark'); } catch {} });
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
  return { context, page, cdp };
}

if (WHAT === 'tap' || WHAT === 'all') {
  const { context, page } = await newDark(true);
  await page.goto(`${BASE}/t/cottagecore/`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2500);
  const pts = await page.evaluate(() => window.__clearPoints());
  console.log('clear points at Home top:', pts.length);
  // spread: every n-th point, shuffled deterministically by stride
  const picks = [];
  const stride = Math.max(1, Math.floor(pts.length / 14));
  for (let i = 0; i < pts.length && picks.length < 14; i += stride) picks.push(pts[i]);
  const taps = [];
  const sample = async (tx, ty, ms) => {
    const t0 = Date.now();
    const seq = [];
    while (Date.now() - t0 < ms) {
      const b = await page.evaluate(() => window.__blobs(90));
      seq.push({ t: Date.now() - t0, blobs: b.map((q) => [q.x, q.y]) });
      await page.waitForTimeout(40);
    }
    return seq;
  };
  for (const [i, [tx, ty]] of picks.entries()) {
    await page.waitForTimeout(700);
    await page.evaluate(() => (window.__pe = []));
    await page.touchscreen.tap(tx, ty);
    const seq = await sample(tx, ty, 1500);
    const lit = seq.filter((s) => s.blobs.some(([x, y]) => Math.hypot(x - tx, y - ty) < 60));
    const first = seq.find((s) => s.blobs.some(([x, y]) => Math.hypot(x - tx, y - ty) < 60));
    const farFirst = seq.find((s) => s.blobs.length);
    taps.push({ at: [tx, ty], answered: lit.length > 0, firstLitMs: first ? first.t : null, firstBlobAt: farFirst ? farFirst.blobs[0] : null, events: await page.evaluate(() => window.__pe.join(' ')) });
  }
  R.clearTaps = taps;
  R.clearTapAnswerRate = +(taps.filter((t) => t.answered).length / Math.max(1, taps.length)).toFixed(2);
  console.log('clear taps answered:', R.clearTapAnswerRate, 'of', taps.length, 'first lit ms:', taps.map((t) => t.firstLitMs).join(','));

  // Taps that must not call a mote: on a text line, on a sheet, on a link.
  const refusals = [];
  for (const [name, sel] of [['text', '.lead'], ['sheet', '.sheet'], ['link', 'nav a']]) {
    const box = await page.locator(sel).first().boundingBox();
    if (!box) { refusals.push({ name, skipped: 'not in view' }); continue; }
    const tx = box.x + box.width / 2, ty = box.y + Math.min(box.height / 2, 30);
    await page.waitForTimeout(900);
    // stay on the page: a link tap would navigate, so tap beside the link's text but inside no control
    const target = name === 'link' ? [Math.max(4, box.x - 8), ty] : [tx, ty];
    await page.touchscreen.tap(target[0], target[1]);
    const seq = await sample(target[0], target[1], 700);
    refusals.push({ name, at: target, litNear: seq.some((s) => s.blobs.some(([x, y]) => Math.hypot(x - target[0], y - target[1]) < 40)) });
  }
  R.refusals = refusals;
  console.log('taps off clear cloth:', JSON.stringify(refusals));

  // Filmed strips of two taps (a timestamped strip of 170px crops).
  R.strips = [];
  for (const [n, idx] of [[1, Math.floor(picks.length / 3)], [2, Math.floor((2 * picks.length) / 3)]]) {
    const [tx, ty] = picks[idx];
    await page.waitForTimeout(1500);
    const frames = [];
    const t0 = Date.now();
    await page.touchscreen.tap(tx, ty);
    const clip = { x: Math.max(0, Math.min(390 - 170, tx - 85)), y: Math.max(0, Math.min(844 - 170, ty - 85)), width: 170, height: 170 };
    while (Date.now() - t0 < 1400 && frames.length < 10) frames.push({ ms: Date.now() - t0, buf: await page.screenshot({ clip }) });
    const cw = 170 * 2, pad = 6;
    const c = createCanvas(frames.length * (cw + pad), cw + 24);
    const g = c.getContext('2d');
    g.fillStyle = '#222'; g.fillRect(0, 0, c.width, c.height);
    for (const [k, f] of frames.entries()) {
      g.drawImage(await loadImage(f.buf), k * (cw + pad), 24, cw, cw);
      g.fillStyle = '#fff'; g.font = '16px sans-serif'; g.fillText(`+${f.ms} ms`, k * (cw + pad) + 6, 17);
    }
    await writeFile(join(OUT, `${LABEL}-tap-strip-${n}.png`), c.toBuffer('image/png'));
    R.strips.push({ n, tap: [tx, ty], frames: frames.map((f) => f.ms) });
  }

  // A finger drag is a scroll.
  await page.evaluate(() => { window.scrollTo(0, 0); window.__pe = []; });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 300, y: 650 }] });
  for (let k = 1; k <= 12; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 300, y: 650 - k * 30 }] }); await page.waitForTimeout(16); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(300);
  R.drag = { scrollY: await page.evaluate(() => Math.round(scrollY)), events: await page.evaluate(() => window.__pe.join(' ')) };
  console.log('drag', JSON.stringify(R.drag));
  await context.close();
}

if (WHAT === 'hover' || WHAT === 'all') {
  R.hover = {};
  // [page, selector, property, label]
  const rules = [
    ['/t/cottagecore/', '.more', 'textDecorationStyle', 'body link (.cc-note-link a:hover)'],
    ['/t/cottagecore/', '.cc-chrome nav a:not([aria-current])', 'color', 'header nav link'],
    ['/t/cottagecore/', 'footer nav a', 'textDecorationLine', 'footer nav link'],
    ['/t/cottagecore/', '.des', 'textDecorationLine', 'lab designation (.des)'],
    ['/t/cottagecore/', '.cc-label', 'rotate', 'sewn label'],
    ['/t/cottagecore/contact/', '.mail', 'textDecorationLine', 'Contact email link'],
    ['/t/cottagecore/', '.cc-tape', 'scale', 'tape corner'],
  ];
  for (const touch of [true, false]) {
    const ctx = await browser.newContext({ viewport: { width: touch ? 390 : 1280, height: 900 }, hasTouch: touch, isMobile: touch, colorScheme: 'light', reducedMotion: 'no-preference' });
    await suppressPrompt(ctx);
    await ctx.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
    const out = [];
    for (const [path, sel, prop, label] of rules) {
      const page = await ctx.newPage();
      await page.goto(BASE + path, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      await page.addStyleTag({ content: 'bdl-switcher{display:none!important} *{transition:none!important}' });
      const media = await page.evaluate(() => [matchMedia('(hover: hover)').matches, matchMedia('(pointer: fine)').matches]);
      const el = page.locator(sel).first();
      if (!(await el.count())) { out.push({ label, skipped: 'no such element' }); await page.close(); continue; }
      const before = await el.evaluate((e, p) => getComputedStyle(e)[p], prop);
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
      const { root } = await cdp.send('DOM.getDocument');
      let after = before;
      try {
        const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: sel });
        await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['hover'] });
        after = await el.evaluate((e, p) => getComputedStyle(e)[p], prop);
      } catch (e) { out.push({ label, error: String(e).slice(0, 80) }); await page.close(); continue; }
      out.push({ label, hoverMedia: media[0], pointerFine: media[1], prop, before, forcedHover: after, changesOnHover: before !== after });
      await page.close();
    }
    R.hover[touch ? 'touch390' : 'mouse1280'] = out;
    await ctx.close();
    console.log(touch ? 'touch' : 'mouse', JSON.stringify(out.map((o) => [o.label, o.hoverMedia, o.pointerFine, o.changesOnHover ?? o.skipped ?? o.error])));
  }
}

await writeFile(join(OUT, `${LABEL}-tap-hover.json`), JSON.stringify(R, null, 2));
await browser.close();
console.log('done');
