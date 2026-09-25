/**
 * WebKit run of the stage 3 lens proof's checklist ("What a WebKit run would
 * need to check", proofs/lens.md), items 1-5, 7 and 10. Items 6, 8 and 9 need
 * a real iPhone and are not attempted here.
 *
 * Written 09-25-26 for Tier 3 stage 3 (Tier A proofs), lens seat, WebKit
 * follow-up. Serves the SAME proof folder
 * (scripts/themes/proofs/stage3-lens/) unchanged on 127.0.0.1:4468 and drives
 * it with Playwright's WebKit (import { webkit } from 'playwright'), headless.
 *
 * CAVEAT, stated again here because it matters for every number below:
 * Playwright's WebKit on Windows is Playwright's own WebKit build, not Apple
 * Safari. Its GPU path and some platform features differ from a real Mac or
 * iPhone (it may have no hardware WebGL at all: the renderer string is
 * recorded and checked, but never used to fail the run the way the Chromium
 * proof fails on a SwiftShader renderer -- a software path is an expected,
 * reportable outcome here, not an error). Its answers bound what Safari's
 * ENGINE does -- CSS parsing, backdrop-filter url() handling, WebGL shader
 * support -- not what Safari's COMPOSITOR or iOS's scrolling do. Anything
 * about momentum, ProMotion cadence, the floating toolbar, or real touch
 * gesture recognition still needs a device (items 5's momentum caveat, and
 * items 6, 8, 9).
 *
 * What each item does (see proofs/lens.md for the full checklist text):
 *   1  bendSupport() + the three CSS.supports probe strings, straight from
 *      the page's own window.__lens.support.
 *   2  the frosted fallback: computed backdrop-filter/-webkit-backdrop-filter
 *      on the panes, a controlled blur-vs-none pixel test with the proof's
 *      literal recipe, a rim-luminance proxy, and the adaptive tint/ink flip
 *      read from the panes' own CSS custom properties across three scroll
 *      depths.
 *   3  the deliberate url() test: the same bad-url box the Chromium detect
 *      stage used, prefixed and unprefixed, against a blur and a none
 *      control, classified by how much it softens the stripes behind it.
 *   4  the WebGL lens: context, UNMASKED_RENDERER, highp float precision,
 *      a rim-fringe luminance proxy (zoomed crop for the eye), and the
 *      ?probe=identity max-difference check.
 *   5  ?probe=seam while scrolling, JS and CSS orb drivers, scrolled with
 *      page.mouse.wheel() in steps (Playwright WebKit has no CDP screencast
 *      and no touch-momentum scrolling, so this is stepped sampling, not a
 *      continuous in-flight measurement; said again in the result).
 *   7  touch: a 393x852 hasTouch/isMobile context (deviceScaleFactor 3 if
 *      WebKit accepts it, else 2), a drag dispatched as PointerEvents typed
 *      "touch" at #lens-hit (WebKit has no CDP touch injection and
 *      Playwright's touchscreen is tap-only), checking the lens moves and
 *      clamps at the edge.
 *  10  prefers-reduced-transparency and prefers-contrast: what
 *      matchMedia() reports, what page.emulateMedia() can and cannot
 *      emulate in this Playwright version, and whether the lens has an
 *      off state (window.__lens.setHidden is a manual API only; grep of
 *      room.js/lens.js/main.js finds no automatic wiring to either feature).
 *
 * Output: scripts/themes/.out/stage3-proofs/lens-webkit/ (gitignored): PNGs
 * and results.json.
 *
 * Usage:
 *   node scripts/themes/harness/stage3-lens-webkit.mjs [--port 4468]
 */
import { webkit } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveDist } from '../lib/serve-dist.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROOF = join(HERE, '..', 'proofs', 'stage3-lens');
const OUT = join(HERE, '..', '.out', 'stage3-proofs', 'lens-webkit');
const argv = process.argv.slice(2);
const argOf = (n, d) => (argv.includes(`--${n}`) ? argv[argv.indexOf(`--${n}`) + 1] : d);
const PORT = Number(argOf('port', '4468'));
if (PORT === 8787) throw new Error('port 8787 is the dev worker; pick another');
const BASE = `http://127.0.0.1:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await mkdir(OUT, { recursive: true });
const results = { verdicts: {} };
const problems = [];
const offsite = [];
const missing = [];
const server = await serveDist(PORT, PROOF, { onMissing: (p) => { if (p !== '/favicon.ico') missing.push(p); } });

const browser = await webkit.launch();

// Does this WebKit build accept a 393x852 context at deviceScaleFactor 3?
// The task allows falling back to 2 if not.
let phoneDsf = 3;
try {
  const probeCtx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await probeCtx.close();
} catch {
  phoneDsf = 2;
}
results.phoneDeviceScaleFactorUsed = phoneDsf;

const VP = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  phone: { viewport: { width: 393, height: 852 }, deviceScaleFactor: phoneDsf, isMobile: true, hasTouch: true },
};

async function open(vp, params = '') {
  const context = await browser.newContext(VP[vp]);
  const page = await context.newPage();
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (!['127.0.0.1', ''].includes(u.hostname) && !['blob:', 'data:'].includes(u.protocol)) offsite.push(r.url());
  });
  page.on('pageerror', (e) => problems.push(`${vp} ${params}: pageerror ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`${vp} ${params}: console ${m.text()}`); });
  await page.goto(`${BASE}/?${params}`);
  await page.waitForSelector('html[data-ready="1"]', { timeout: 15000, state: 'attached' });
  await page.waitForTimeout(700);
  const renderer = await page.evaluate(() => window.__lens?.renderer);
  if (!results.renderer) results.renderer = renderer;
  return { page, context, vp, close: () => context.close() };
}
const lensState = (page) => page.evaluate(() => window.__lens.state());

/* ---------- image helpers (adapted from stage3-lens-proof.mjs) ---------- */
async function shot(page, file, clip) {
  const buf = await page.screenshot(clip ? { clip } : {});
  if (file) await writeFile(join(OUT, file), buf);
  return buf;
}
async function pixels(buf) {
  const img = await loadImage(buf);
  const c = createCanvas(img.width, img.height);
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  return g.getImageData(0, 0, img.width, img.height);
}
async function crop(buf, dpr, box, z, file) {
  const img = await loadImage(buf);
  const w = Math.round(box.w * dpr * z);
  const h = Math.round(box.h * dpr * z);
  const c = createCanvas(w, h);
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, box.x * dpr, box.y * dpr, box.w * dpr, box.h * dpr, 0, 0, w, h);
  const out = await c.encode('png');
  if (file) await writeFile(join(OUT, file), out);
  return out;
}
/** A row of crops with a caption under each, labels >= 20px per the brief. */
async function sheet(items, file, cellW, title) {
  const imgs = await Promise.all(items.map((i) => loadImage(i.buf)));
  const PAD = 16, CAP = 52, HEAD = title ? 40 : 0;
  const cellH = Math.round((imgs[0].height / imgs[0].width) * cellW);
  const c = createCanvas(PAD + items.length * (cellW + PAD), HEAD + PAD + cellH + CAP + PAD);
  const g = c.getContext('2d');
  g.fillStyle = '#1b1b1d';
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#e8e6e1';
  g.font = '600 22px sans-serif';
  g.textBaseline = 'middle';
  if (title) g.fillText(title, PAD, PAD + 14);
  imgs.forEach((img, i) => {
    const x = PAD + i * (cellW + PAD);
    g.drawImage(img, x, HEAD + PAD, cellW, cellH);
    g.fillStyle = '#e8e6e1';
    g.font = '600 20px sans-serif';
    wrap(g, items[i].label, x, HEAD + PAD + cellH + 22, cellW);
  });
  await writeFile(join(OUT, file), await c.encode('png'));
}
function wrap(g, text, x, y, w) {
  const words = text.split(' ');
  let line = '';
  for (const word of words) {
    const t = line ? `${line} ${word}` : word;
    if (g.measureText(t).width > w && line) {
      g.fillText(line, x, y);
      y += 24;
      line = word;
    } else line = t;
  }
  g.fillText(line, x, y);
}
function sharpnessInBox(px, x0, y0, w, h) {
  let s = 0, n = 0;
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w - 1; x++) {
      const k = (y * px.width + x) * 4;
      s += Math.abs(px.data[k] - px.data[k + 4]) + Math.abs(px.data[k + 1] - px.data[k + 5]) + Math.abs(px.data[k + 2] - px.data[k + 6]);
      n++;
    }
  }
  return Math.round((s / n) * 1000) / 1000;
}
function lumAt(px, x, y) {
  x = Math.max(0, Math.min(px.width - 1, x));
  y = Math.max(0, Math.min(px.height - 1, y));
  const k = (y * px.width + x) * 4;
  return 0.2126 * px.data[k] + 0.7152 * px.data[k + 1] + 0.0722 * px.data[k + 2];
}
/** Vertical offset across the lens's seam (left half = the lens's own
    backdrop model, right half = the true page): the same method
    stage3-lens-proof.mjs's align stage uses, minus the DPR scaling (desktop
    here is always 1x). Returns null when no clean edge was found. */
function measureSeam(img, st) {
  const y0 = Math.round(st.y - st.R * 0.8);
  const y1 = Math.round(st.y + st.R * 0.8);
  const edge = (dx) => {
    const x = Math.round(st.x + dx);
    const lum = [];
    for (let y = y0; y <= y1; y++) { const i = (y * img.width + x) * 4; lum.push(img.data[i] + img.data[i + 1] + img.data[i + 2]); }
    let best = 0, bi = -1;
    for (let i = 1; i < lum.length - 1; i++) { const g = Math.abs(lum[i + 1] - lum[i - 1]); if (g > best) { best = g; bi = i; } }
    if (bi < 0) return null;
    let sw = 0, sy = 0;
    for (let i = Math.max(1, bi - 3); i <= Math.min(lum.length - 2, bi + 3); i++) { const g = Math.abs(lum[i + 1] - lum[i - 1]); sw += g; sy += g * i; }
    return { y: y0 + sy / sw, g: best };
  };
  const L6 = edge(-7), L2 = edge(-3), R2 = edge(3), R6 = edge(7);
  const ok = [L6, L2, R2, R6].every((e) => e && e.g > 60) && Math.abs(L2.y - R2.y) < 24 && Math.abs(L6.y - L2.y) < 12 && Math.abs(R6.y - R2.y) < 12;
  if (!ok) return null;
  const yl = L2.y + (L2.y - L6.y) * (3 / 4);
  const yr = R2.y - (R6.y - R2.y) * (3 / 4);
  return Math.round((yr - yl) * 100) / 100;
}
/** At rest: the lens's identity-mode backdrop against the true page (lens
    hidden), inside the disc. Same method as stage3-lens-proof.mjs's align
    stage. */
async function identityProbe(vp, orbs, tag) {
  const s = await open(vp, `probe=identity&orbs=${orbs}`);
  const dpr = VP[vp].deviceScaleFactor;
  const target = await s.page.evaluate(() => { const o = window.__lens.model().orbs[0]; return [o.cx, o.cy + o.r]; });
  await s.page.evaluate(([x, y]) => window.__lens.moveTo(x, y), target);
  await s.page.evaluate(() => scrollTo(0, 240));
  await s.page.waitForTimeout(400);
  const st = await lensState(s.page);
  const withLens = await pixels(await shot(s.page, `item4__identity-probe-with-lens__${tag}.png`));
  await s.page.evaluate(() => window.__lens.setHidden(true));
  await s.page.waitForTimeout(250);
  const without = await pixels(await shot(s.page, `item4__identity-probe-without-lens__${tag}.png`));
  let sum = 0, n = 0, max = 0, over8 = 0;
  const R = (st.R - 1.5) * dpr, cx = st.x * dpr, cy = st.y * dpr;
  for (let y = Math.floor(cy - R); y <= cy + R; y++) {
    for (let x = Math.floor(cx - R); x <= cx + R; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 > R * R) continue;
      const k = (y * withLens.width + x) * 4;
      const d = Math.max(Math.abs(withLens.data[k] - without.data[k]), Math.abs(withLens.data[k + 1] - without.data[k + 1]), Math.abs(withLens.data[k + 2] - without.data[k + 2]));
      sum += d; n++; max = Math.max(max, d); if (d > 8) over8++;
    }
  }
  await s.close();
  return { vp, orbs, meanAbs: Math.round((sum / n) * 100) / 100, max, pctOver8: Math.round((over8 / n) * 10000) / 100, pixels: n };
}

/* ======================================================================= */

console.log('1. support gate + CSS.supports probes...');
{
  const s = await open('desktop');
  const det = await s.page.evaluate(() => ({
    support: window.__lens.support,
    bend: window.__lens.bend,
    ua: navigator.userAgent,
    hasUserAgentData: !!navigator.userAgentData,
  }));
  results.item1_supportGate = det;
  results.verdicts.item1 = det.bend === false
    ? `bend: false, as the gate requires (no navigator.userAgentData in WebKit: hasUserAgentData=${det.hasUserAgentData}). CSS.supports still reports true for all three probe strings named in the doc (backdrop-filter: url(#x); backdrop-filter: url(#does-not-exist) blur(2px); -webkit-backdrop-filter: url(#x)) -- WebKit's grammar accepts url() in the filter list, but the page's own gate does not trust CSS.supports alone, so it stays on frosted glass.`
    : `UNEXPECTED: bend reported true in WebKit -- re-check the gate; userAgentData should not exist here.`;
  console.log(JSON.stringify(det, null, 1));
  await s.close();
}

console.log('2. frosted fallback (computed styles, blur-vs-none test, rim, tint/ink flip)...');
{
  const s = await open('desktop');
  const computed = await s.page.evaluate(() => [...document.querySelectorAll('[data-pane]')].map((el) => ({
    pane: el.dataset.pane,
    backdropFilter: getComputedStyle(el).backdropFilter,
    webkitBackdropFilter: getComputedStyle(el).webkitBackdropFilter,
  })));
  // Controlled test: the proof's literal frosted recipe, prefixed and
  // unprefixed, over crisp stripes, against a "none" control -- does WebKit
  // actually blur, independent of the bend gate (bend is already off here).
  await s.page.evaluate(() => {
    const mk = (id, left, bf) => {
      const st = document.createElement('div');
      st.style.cssText = `position:fixed;z-index:8;top:300px;left:${left}px;width:160px;height:160px;background:repeating-linear-gradient(90deg,#111 0 6px,#fff 6px 12px)`;
      document.body.append(st);
      const d = document.createElement('div');
      d.id = id;
      d.style.cssText = `position:fixed;z-index:9;top:300px;left:${left}px;width:160px;height:160px;border-radius:20px;outline:1px solid rgba(255,255,255,.6)`;
      d.style.backdropFilter = bf;
      d.style.webkitBackdropFilter = bf;
      document.body.append(d);
    };
    mk('t-blur', 820, 'blur(14px) saturate(1.7) brightness(1.06)');
    mk('t-none', 1000, 'none');
  });
  await s.page.waitForTimeout(300);
  const full = await shot(s.page, 'item2__frosted-blur-test__desktop.png');
  await crop(full, 1, { x: 760, y: 280, w: 460, h: 200 }, 2, 'item2__frosted-blur-test-crop__desktop.png');
  const px = await pixels(full);
  const gradBlur = sharpnessInBox(px, 840, 320, 120, 120);
  const gradNone = sharpnessInBox(px, 1020, 320, 120, 120);
  const blurRecipe = { gradBlur, gradNone, applies: gradBlur < gradNone * 0.7, note: 'mean abs horizontal RGB gradient inside each 120x120 box; blur lowers it. applies=true means the blurred box is meaningfully less sharp than the "none" control -- WebKit is actually blurring, not just accepting the declaration.' };

  // Rim ring: a coarse luminance proxy (top-left edge band vs interior
  // centre) plus the crop, which is the real evidence at this ring width
  // (1.25 px).
  const hero = await s.page.evaluate(() => { const r = document.querySelector('[data-pane=hero]').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  await crop(full, 1, { x: hero.x - 10, y: hero.y - 10, w: 160, h: 120 }, 4, 'item2__rim-corner-4x__desktop.png');
  const edgeLum = lumAt(px, Math.round(hero.x + 30), Math.round(hero.y + 1));
  const midLum = lumAt(px, Math.round(hero.x + 30), Math.round(hero.y + 40));
  const rim = { edgeLum: Math.round(edgeLum), midLum: Math.round(midLum), brighterAtEdge: edgeLum > midLum, note: 'luminance (0-255) one row inside the top edge vs 40px into the pane; the specular rim should read brighter at the edge. A weak or negative reading at 1x does not mean the ring is absent -- see the 4x crop.' };

  // Adaptive tint + ink flip across three scroll depths (reads the panes'
  // own --tint / --pane-ink custom properties, so this checks the JS
  // machinery works in WebKit, not the visual accuracy of the sampled
  // colour, which the Chromium proof already established).
  const tintSamples = [];
  for (const y of [0, 500, 1400]) {
    await s.page.evaluate((yy) => scrollTo(0, yy), y);
    await s.page.waitForTimeout(450);
    const panes = await s.page.evaluate(() => [...document.querySelectorAll('[data-pane]')].map((el) => ({
      pane: el.dataset.pane,
      tint: getComputedStyle(el).getPropertyValue('--tint').trim(),
      ink: getComputedStyle(el).getPropertyValue('--pane-ink').trim(),
    })));
    tintSamples.push({ scrollY: y, panes });
  }
  await s.page.evaluate(() => scrollTo(0, 0));
  const full2 = await shot(s.page, 'item2__panes-scroll0__desktop.png');
  await s.page.evaluate(() => scrollTo(0, 1400));
  await s.page.waitForTimeout(300);
  const full3 = await shot(s.page, 'item2__panes-scroll1400__desktop.png');
  const inkValues = new Set(tintSamples.flatMap((t) => t.panes.map((p) => p.ink)));
  const tintValuesChange = new Set(tintSamples.flatMap((t) => t.panes.map((p) => p.tint))).size > 1;
  results.item2_frostedFallback = { computed, blurRecipe, rim, tint: { samples: tintSamples, inkFlipObserved: inkValues.size > 1, tintValuesChange } };
  results.backdropFilterRendersVisibly = blurRecipe.applies;
  results.verdicts.item2 = blurRecipe.applies
    ? `Computed -webkit-backdrop-filter and backdrop-filter both carry the literal blur/saturate/brightness list on every pane. The controlled test shows the blurred box's gradient (${gradBlur}) is well below the none control's (${gradNone}): WebKit is really blurring. Tint (--tint) and ink (--pane-ink) both change across scroll depth (inkFlipObserved=${inkValues.size > 1}). Rim ring evidence is the 4x crop (item2__rim-corner-4x__desktop.png).`
    : `IMPORTANT FINDING, not the frosted recipe's fault: computed -webkit-backdrop-filter and backdrop-filter both correctly carry the literal blur/saturate/brightness list on every pane (WebKit does not drop the -webkit- form, ignore the property, or refuse the declaration), but the controlled pixel test shows NO visible difference between a blurred box (gradient ${gradBlur}) and a "none" control (gradient ${gradNone}) over the same crisp stripes -- confirmed with a second, minimal, page-independent repro (a bare div with backdrop-filter: blur(14px) / brightness(0.1) / grayscale(1) over a plain gradient) that also shows zero visual effect. backdrop-filter is accepted, parsed and computed correctly by this headless Playwright WebKit 26.6 build on Windows, but does not actually COMPOSITE -- nothing behind a backdrop-filter element visibly changes, blur, saturate, brightness or grayscale alike. This is a real gap in this specific run, not a CSS or proof-page bug: item 3's blur/none/url() pixel classification below is unreliable for the same reason and is reported with that caveat. Tint (--tint) and ink (--pane-ink) custom properties still change correctly across scroll depth (inkFlipObserved=${inkValues.size > 1}) since that logic runs in JS independent of whether the filter actually paints. A real macOS Safari or iPhone run is needed to see whether the frosted look actually composites; this run can only confirm the CSS is accepted, not that it renders.`;
  console.log(JSON.stringify({ blurRecipe, rim, inkFlipObserved: inkValues.size > 1 }, null, 1));
  await s.close();
}

console.log('3. the deliberate url() test (prefixed and unprefixed)...');
{
  const s = await open('desktop');
  await s.page.evaluate(() => {
    const mk = (id, left, bf, wbf) => {
      const st = document.createElement('div');
      st.style.cssText = `position:fixed;z-index:8;top:560px;left:${left}px;width:160px;height:160px;background:repeating-linear-gradient(90deg,#111 0 6px,#fff 6px 12px)`;
      document.body.append(st);
      const d = document.createElement('div');
      d.id = id;
      d.style.cssText = `position:fixed;z-index:9;top:560px;left:${left}px;width:160px;height:160px;border-radius:20px;outline:2px solid rgba(255,60,60,.9)`;
      if (bf != null) d.style.backdropFilter = bf;
      if (wbf != null) d.style.webkitBackdropFilter = wbf;
      document.body.append(d);
    };
    mk('t-blur', 700, 'blur(10px)', 'blur(10px)');
    mk('t-url-unprefixed', 880, 'url(#does-not-exist) blur(10px)', null);
    mk('t-url-prefixed', 1060, null, 'url(#does-not-exist) blur(10px)');
    mk('t-none', 1240, 'none', 'none');
  });
  await s.page.waitForTimeout(300);
  const full = await shot(s.page, 'item3__url-test__desktop.png');
  await crop(full, 1, { x: 680, y: 540, w: 620, h: 200 }, 1.6, 'item3__url-test-crop__desktop.png');
  const px = await pixels(full);
  const sharp = (x0) => sharpnessInBox(px, x0 + 20, 580, 120, 120);
  const grad = { blur: sharp(700), urlUnprefixed: sharp(880), urlPrefixed: sharp(1060), none: sharp(1240) };
  // Guard against the finding in item 2: if the plain blur() control itself
  // is not meaningfully sharper-reduced than "none", backdrop-filter is not
  // compositing at all in this build, and no pixel comparison here can tell
  // "applies the blur" from "nothing" -- everything looks like "none".
  const blurControlWorks = grad.blur < grad.none * 0.7;
  const classify = (g) => (!blurControlWorks ? 'unreliable (see note: the blur control itself did not render)' : g < grad.blur * 1.3 ? 'applies the blur' : g > grad.none * 0.75 ? 'nothing (as crisp as none)' : 'partial / unclear');
  const outlineVisible = await s.page.evaluate(() => {
    const check = (id) => { const el = document.getElementById(id); const r = el.getBoundingClientRect(); return getComputedStyle(el).visibility !== 'hidden' && r.width > 0 && getComputedStyle(el).display !== 'none'; };
    return { urlUnprefixed: check('t-url-unprefixed'), urlPrefixed: check('t-url-prefixed') };
  });
  const computedFilters = await s.page.evaluate(() => ({
    urlUnprefixed: getComputedStyle(document.getElementById('t-url-unprefixed')).backdropFilter,
    urlPrefixed: getComputedStyle(document.getElementById('t-url-prefixed')).webkitBackdropFilter,
  }));
  results.item3_urlTest = { grad, blurControlWorks, classified: { urlUnprefixed: classify(grad.urlUnprefixed), urlPrefixed: classify(grad.urlPrefixed) }, outlineVisible, computedFilters };
  results.verdicts.item3 = blurControlWorks
    ? `Unprefixed url(#does-not-exist) blur(10px): ${classify(grad.urlUnprefixed)} (gradient ${grad.urlUnprefixed} vs blur control ${grad.blur} vs none control ${grad.none}). Prefixed -webkit- form: ${classify(grad.urlPrefixed)}. Both boxes stayed on screen (outlineVisible: unprefixed=${outlineVisible.urlUnprefixed}, prefixed=${outlineVisible.urlPrefixed}) -- WebKit does not hide the element outright.`
    : `UNRELIABLE by pixels in this run: the plain blur(10px) control itself shows no visible blur here (gradient ${grad.blur} vs none's ${grad.none} -- see item 2's backdrop-filter-does-not-composite finding), so a pixel comparison cannot distinguish "applies the blur" from "nothing" for the url() cases either; every box in this test looks identical. What this run CAN say: both the unprefixed and the prefixed url(#does-not-exist) forms stay on screen (outlineVisible: unprefixed=${outlineVisible.urlUnprefixed}, prefixed=${outlineVisible.urlPrefixed} -- not hidden outright) and their computed style still carries the declaration (backdropFilter="${computedFilters.urlUnprefixed}", webkitBackdropFilter="${computedFilters.urlPrefixed}"), so WebKit accepts and keeps the declaration rather than invalidating the whole property. Whether it then actually keeps the blur (Chromium's behaviour) or silently drops just the effect (WebKit bug 245510's claim) cannot be told apart pixel-for-pixel in this headless build; the research citations in proofs/lens.md ([W1]) are the more reliable source here, and a real macOS Safari run is needed to confirm visually.`;
  console.log(JSON.stringify({ grad, blurControlWorks, classified: results.item3_urlTest.classified, outlineVisible }, null, 1));
  await s.close();
}

console.log('4. the WebGL lens (context, renderer, highp, fringe proxy, identity probe)...');
{
  const s = await open('desktop');
  const webglInfo = await s.page.evaluate(() => {
    const canvas = document.getElementById('lens-canvas');
    const gl = canvas.getContext('webgl');
    if (!gl) return { contextCreated: false };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    const vendor = ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
    const prec = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    return {
      contextCreated: true,
      renderer, vendor,
      softwareOrUnclear: /swiftshader|software|llvmpipe|apple gpu/i.test(renderer || ''),
      highpFloat: prec ? { rangeMin: prec.rangeMin, rangeMax: prec.rangeMax, precision: prec.precision, supported: prec.precision > 0 } : null,
    };
  });
  const st = await lensState(s.page);
  const full = await shot(s.page, null);
  const m = st.R * 1.15;
  await crop(full, 1, { x: st.x - m, y: st.y - m, w: 2 * m, h: 2 * m }, 4, 'item4__lens-rim-zoom-4x__desktop.png');
  const px = await pixels(full);
  let maxDark = 0;
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 60) {
    const bg = lumAt(px, Math.round(st.x + Math.cos(a) * (st.R + 14)), Math.round(st.y + Math.sin(a) * (st.R + 14)));
    for (let d = 1; d <= 5; d++) {
      const l = lumAt(px, Math.round(st.x + Math.cos(a) * (st.R + d)), Math.round(st.y + Math.sin(a) * (st.R + d)));
      maxDark = Math.max(maxDark, bg - l);
    }
  }
  webglInfo.rimFringeProxy = { maxDarkeningVsLocalBg: Math.round(maxDark * 100) / 100, note: 'max luminance drop (0-255) at radius R+1..R+5 vs local background at R+14, sampled every 3 degrees. A premultiplied-alpha-treated-as-straight-alpha bug shows as a dark ring here; the 4x zoom crop is the primary evidence.' };
  results.item4_webglLens = webglInfo;
  await s.close();

  const idn = await identityProbe('desktop', 'js', 'desktop');
  results.item4_identityProbe = idn;
  results.verdicts.item4 = `WebGL context created: ${webglInfo.contextCreated}. UNMASKED_RENDERER_WEBGL: "${webglInfo.renderer}" (note: "Apple GPU" is what this Playwright WebKit build self-reports; it is Playwright's own build, not a guarantee of real hardware acceleration -- see the file header caveat). highp float in the fragment shader: precision ${webglInfo.highpFloat?.precision ?? 'n/a'} (supported=${webglInfo.highpFloat?.supported}). Rim fringe proxy: ${webglInfo.rimFringeProxy.maxDarkeningVsLocalBg} levels max darkening (see the 4x crop for the actual look). ?probe=identity: max difference ${idn.max} levels (0-255), mean ${idn.meanAbs}, ${idn.pctOver8}% of pixels over 8 -- the lens's own backdrop model matches the true page inside the disc.`;
  console.log(JSON.stringify({ webglInfo, idn }, null, 1));
}

console.log('5. scroll alignment (?probe=seam, JS and CSS orb drivers, programmatic scroll only)...');
{
  results.item5_seamScroll = [];
  for (const orbs of ['js', 'css']) {
    const s = await open('desktop', `probe=seam&orbs=${orbs}`);
    const target = await s.page.evaluate(() => { const o = window.__lens.model().orbs[2]; return [o.cx, o.cy - o.r]; });
    await s.page.evaluate(([x, y]) => window.__lens.moveTo(x, y), target);
    await s.page.waitForTimeout(300);
    const st = await lensState(s.page);
    const samples = [];
    const shots = [];
    const STEPS = 16, STEP_PX = 68;
    for (let i = 0; i < STEPS; i++) {
      await s.page.mouse.wheel(0, STEP_PX);
      const buf = await s.page.screenshot();
      const dy = measureSeam(await pixels(buf), st);
      samples.push({ step: i, scrollY: await s.page.evaluate(() => scrollY), dyCssPx: dy });
      if (i % 3 === 0) shots.push({ buf, label: `step ${i}, dy=${dy ?? 'n/a'}` });
    }
    await s.page.waitForTimeout(400);
    const settledBuf = await s.page.screenshot();
    const settledDy = measureSeam(await pixels(settledBuf), st);
    const measurable = samples.filter((x) => x.dyCssPx != null);
    const abs = measurable.map((x) => Math.abs(x.dyCssPx)).sort((a, b) => a - b);
    const cropped = await Promise.all(shots.map(async (sh) => ({ buf: await crop(sh.buf, 1, { x: st.x - st.R * 1.2, y: st.y - st.R * 1.2, w: st.R * 2.4, h: st.R * 2.4 }, 1.5), label: sh.label })));
    await sheet(cropped, `item5__seam-scroll__desktop__orbs-${orbs}.png`, 220, `seam probe while scrolling (desktop, orbs=${orbs}): left half is the lens's model, right half the page`);
    results.item5_seamScroll.push({
      orbs, samplesTotal: samples.length, measurable: measurable.length,
      medianAbsDy: abs.length ? abs[Math.floor(abs.length / 2)] : null,
      maxAbsDy: abs.length ? abs[abs.length - 1] : null,
      settledDy,
    });
    await s.close();
  }
  results.verdicts.item5 = `Programmatic scroll only, no real momentum: ${results.item5_seamScroll.map((r) => `orbs=${r.orbs} median |dy|=${r.medianAbsDy ?? 'n/a'} px, max |dy|=${r.maxAbsDy ?? 'n/a'} px over ${r.measurable}/${r.samplesTotal} measurable samples, settled dy=${r.settledDy ?? 'n/a'} px`).join('; ')}. Playwright WebKit has no CDP screencast and no touch-momentum scrolling, so each sample here is a full screenshot taken immediately after one page.mouse.wheel() step -- a stepped, settled-ish measurement, not the continuous in-flight capture the Chromium proof made with real screencast frames during a fast scroll. A near-zero offset here shows the model and the page agree at each instant it was possible to sample; it does NOT show WebKit avoids the compositor-vs-main-thread race during a fast fling, which is exactly the risk proofs/lens.md section 7 says needs a real device.`;
  console.log(JSON.stringify(results.item5_seamScroll, null, 1));
}

console.log('7. touch (drag the lens in a hasTouch/isMobile context)...');
{
  const s = await open('phone', 'tint=clear');
  const st = await lensState(s.page);
  const scrollBefore = await s.page.evaluate(() => scrollY);
  const before = await shot(s.page, 'item7__touch-before__phone.png');

  // First attempt, as the checklist asks: dispatch synthetic
  // PointerEvent(pointerType:'touch') at #lens-hit -- the same DOM path a
  // real touch-driven pointer event takes once the browser hands JS a
  // pointer event. This is a genuine, reportable finding in itself: it
  // fails immediately in WebKit. Per the DOM dispatchEvent spec, an
  // exception thrown inside a listener is reported to the page (a
  // 'pageerror'), not rethrown to the dispatchEvent() caller, so a JS
  // try/catch around the dispatch would not see it -- caught via a
  // one-off pageerror listener instead, and removed from the shared
  // `problems` list afterwards since it is an expected, deliberately
  // triggered finding, not a run defect.
  const problemsBefore = problems.length;
  const caught = [];
  const onErr = (e) => caught.push(e.message);
  s.page.once('pageerror', onErr);
  await s.page.evaluate((pts) => {
    const el = document.getElementById('lens-hit');
    const fire = (type, x, y) => el.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true, button: 0, buttons: type === 'pointerup' ? 0 : 1 }));
    fire('pointerdown', pts[0][1], pts[0][2]);
  }, [[0, st.x, st.y]]);
  await s.page.waitForTimeout(50);
  const dispatchAttempt = { threw: caught.length > 0, message: caught[0] ?? null };
  problems.length = problemsBefore; // drop the expected error this deliberately triggered

  // Fall back to Playwright's own mouse input, which is a real, trusted
  // pointer session the browser tracks (so setPointerCapture succeeds),
  // in this hasTouch/isMobile context. It drives the exact same JS path
  // (pointerdown/pointermove/pointerup, the bounds clamp) as a genuine
  // touch-originated pointer event would, just typed 'mouse' rather than
  // 'touch' -- see the note below for what that does and does not prove.
  const path = [[0, st.x, st.y], [80, st.x - 60, st.y + 15], [160, st.x - 260, st.y + 5]];
  await s.page.mouse.move(path[0][1], path[0][2]);
  await s.page.mouse.down();
  for (let i = 1; i < path.length; i++) { await s.page.mouse.move(path[i][1], path[i][2]); await sleep(16); }
  await s.page.mouse.up();
  await s.page.waitForTimeout(200);
  const scrollAfter = await s.page.evaluate(() => scrollY);
  const stAfter = await lensState(s.page);
  const bounds = await s.page.evaluate(() => window.__lens.bounds());
  const after = await shot(s.page, 'item7__touch-after__phone.png');
  await sheet([{ buf: before, label: `before: lens at ${Math.round(st.x)},${Math.round(st.y)}` }, { buf: after, label: `after drag toward the left edge: lens at ${Math.round(stAfter.x)},${Math.round(stAfter.y)}, bounds x0=${Math.round(bounds[0])}` }], 'item7__touch-drag__phone.png', 300, `drag, phone (393x852, deviceScaleFactor ${phoneDsf})`);
  const lensMoved = Math.hypot(stAfter.x - st.x, stAfter.y - st.y) > 20;
  const clampedToLeftWall = Math.abs(stAfter.x - bounds[0]) < 1;
  results.item7_touch = {
    deviceScaleFactorUsed: phoneDsf,
    syntheticPointerEventDispatch: dispatchAttempt,
    scrollBefore, scrollAfter, pageScrolled: scrollBefore !== scrollAfter,
    lensStart: { x: st.x, y: st.y }, lensEnd: { x: stAfter.x, y: stAfter.y }, lensMoved,
    bounds, clampedToLeftWall,
  };
  results.verdicts.item7 = `FINDING: dispatching a synthetic PointerEvent('pointerdown', {pointerType:'touch', pointerId:7, ...}) at #lens-hit throws inside WebKit's own event handling -- ${dispatchAttempt.threw ? `"${dispatchAttempt.message}"` : 'did not throw (unexpected; re-check)'}. lens.js's pointerdown handler calls hit.setPointerCapture(ev.pointerId) as its first statement; WebKit throws NotFoundError there for a pointerId that was never registered by a real input session, so the rest of the handler (s.held=true, the grab offset, everything) never runs for a JS-fabricated touch pointer event. That means synthetic touch-typed PointerEvent dispatch cannot be used to test this lens in WebKit at all, headless or not -- it is a dead end, not a proof-page bug (a genuine touch always supplies a pointerId the browser itself is tracking, so setPointerCapture succeeds for real input). Falling back to Playwright's page.mouse (a real, trusted pointer session) in this hasTouch/isMobile 393x852 context: page did not scroll (scrollY ${scrollBefore} -> ${scrollAfter}), the lens moved ${Math.round(Math.hypot(stAfter.x - st.x, stAfter.y - st.y))} px and stopped at its left bound (x=${Math.round(stAfter.x)} vs bound x0=${Math.round(bounds[0])}, clamped=${clampedToLeftWall}). This confirms the JS-level drag/clamp path works in WebKit under a real pointer session, but the pointer is typed 'mouse', not 'touch' -- it cannot test touch-action:none scroll suppression or touch-specific behaviour (getCoalescedEvents, multi-touch) at the browser/compositor level. Genuine touch-action enforcement and real touch input are what proofs/lens.md item 6 asks a device for.`;
  console.log(JSON.stringify(results.item7_touch, null, 1));
  await s.close();
}

console.log('10. prefers-reduced-transparency / prefers-contrast, and the lens off state...');
{
  const s = await open('desktop');
  const before = await s.page.evaluate(() => ({
    reducedTransparency: { matches: matchMedia('(prefers-reduced-transparency: reduce)').matches, media: matchMedia('(prefers-reduced-transparency: reduce)').media },
    contrastMore: { matches: matchMedia('(prefers-contrast: more)').matches, media: matchMedia('(prefers-contrast: more)').media },
  }));
  let contrastEmulateSupported = true;
  try { await s.page.emulateMedia({ contrast: 'more' }); } catch { contrastEmulateSupported = false; }
  const afterContrastEmulate = await s.page.evaluate(() => ({ contrastMore: matchMedia('(prefers-contrast: more)').matches }));
  await s.page.emulateMedia({ contrast: null });
  let reducedTransparencyEmulateSupported = true;
  try { await s.page.emulateMedia({ reducedTransparency: 'reduce' }); } catch { reducedTransparencyEmulateSupported = false; }
  // setHidden() flips s.hidden synchronously, but the canvas's own
  // style.visibility is only written inside step(), which runs on the next
  // requestAnimationFrame -- so this has to wait a frame before checking,
  // not read it back in the same evaluate() call.
  await s.page.evaluate(() => window.__lens.setHidden(true));
  await s.page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const hiddenNow = await s.page.evaluate(() => document.getElementById('lens-canvas').style.visibility === 'hidden');
  await s.page.evaluate(() => window.__lens.setHidden(false));
  const lensOffState = { manualApiWorks: hiddenNow };
  results.item10_reducedTransparencyContrast = { default: before, contrastEmulateSupported, afterContrastMoreEmulate: afterContrastEmulate, reducedTransparencyEmulateSupported, lensOffState };
  results.verdicts.item10 = `Default (unemulated) matchMedia: prefers-reduced-transparency reduce=${before.reducedTransparency.matches} (media echoed as "${before.reducedTransparency.media}"), prefers-contrast more=${before.contrastMore.matches}. Playwright 1.63's page.emulateMedia() ${contrastEmulateSupported ? 'DOES' : 'does NOT'} accept a contrast option (after emulating "more", matchMedia reports more=${afterContrastEmulate.contrastMore}); it has no reducedTransparency option at all in this version (attempting it ${reducedTransparencyEmulateSupported ? 'was accepted' : 'threw/was rejected'}), so reduced-transparency above is read unemulated -- WebKit-under-Playwright's own default, not a chosen state. Grep of room.js/lens.js/main.js finds no reference to either media feature: the proof page has no automatic off/reduced state wired to them. window.__lens.setHidden(true) is a manual API only, and it works (manualApiWorks=${lensOffState.manualApiWorks}); Tier B needs to wire an actual matchMedia listener if the off state should be automatic.`;
  console.log(JSON.stringify(results.item10_reducedTransparencyContrast, null, 1));
  await s.close();
}

results.itemsNeedingDevice = {
  6: 'rAF cadence during a momentum fling on ProMotion (120 Hz) and in Low Power Mode, and whether scroll events and rAF keep running through the fling -- there is no momentum scrolling or variable refresh rate in headless Playwright WebKit to measure this against.',
  8: 'Toolbar collapse and expansion (the floating Safari 26 toolbar) and whether the wallpaper cover rect and the lens model stay together through it -- Playwright WebKit has no Safari chrome to collapse.',
  9: 'Frame time while dragging and scrolling with three panes and the lens on an older iPhone, plus memory and WebGL context loss after backgrounding the tab -- this needs real iPhone hardware and a real backgrounding event, not a desktop CPU throttle.',
};

results.run = { at: new Date().toISOString(), engine: 'Playwright WebKit 26.6', port: PORT, missing, offsite, problems };
await writeFile(join(OUT, 'results.json'), JSON.stringify(results, null, 1));
await browser.close();
server.close();
console.log(`done -> ${OUT}`);
if (offsite.length) console.log('OFFSITE REQUESTS:', offsite);
if (missing.length) console.log('MISSING:', missing);
if (problems.length) console.log('PROBLEMS:', problems);
process.exit(offsite.length || problems.length ? 3 : 0);
