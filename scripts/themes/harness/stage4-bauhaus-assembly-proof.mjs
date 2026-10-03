/**
 * Stage 4 Tier A proof a5: bauhaus assembly feel behind one switch (F1).
 *
 * Injects scripts/themes/proofs/stage4-bauhaus-assembly/proof.css into a
 * frozen build and films the Home hero and About's constructed B assembling
 * under feels (a) today, (b) mechanical and (c) middle. Nothing under src/
 * changes. The proof CSS and the switch (html[data-bh-assembly]) reach every
 * document, including the one the router fetches on an arrival, by
 * rewriting the HTML responses (context.route), so the first frame of the
 * assembly is the proof's, never the frozen build's.
 *
 * Films are real composited frames from the DevTools screencast. Zero is the
 * moment the first assembling shape's animation starts (Animation.startTime
 * on the page's clock, read after the film), so a column reads "ms since the
 * assembly began", not "ms since the click". Captured under .out/stage4-proofs/bauhaus-assembly/:
 *   strips/<page>__<scenario>__<variant>__<scheme>__<size>.json   frame times
 *   frames/...                                                    jpg per frame
 *   sheet__<page>__<size>__<scheme>.jpg                           founder sheets
 *   timing.json   per-shape delay, duration, easing, end; opacity at +480 ms
 *   finals.json   settled pixels of each variant against (a)
 *   renderer.txt, manifest.json, problems
 *
 * Usage (BDL_GPU=1 required; exits 2 on a software renderer):
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name stage4-base --reuse --port 4460 -- \
 *     node scripts/themes/harness/stage4-bauhaus-assembly-proof.mjs
 *   add --sheets-only to rebuild sheets and tables from existing frames.
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const PROOF = join(REPO, 'scripts', 'themes', 'proofs', 'stage4-bauhaus-assembly');
const out = join(REPO, 'scripts', 'themes', '.out', 'stage4-proofs', 'bauhaus-assembly');
const frameDir = join(out, 'frames');
const stripDir = join(out, 'strips');
await mkdir(frameDir, { recursive: true });
await mkdir(stripDir, { recursive: true });
const base = (process.env.SNAP_BASE || '').replace(/\/$/, '');

const SCHEMES = ['light', 'dark'];
const SIZES = [
  { id: '1440', w: 1440, h: 900, dpr: 1 },
  { id: '390', w: 390, h: 844, dpr: 2, mobile: true },
];
const VARIANTS = [
  { id: 'a', label: '(a) today: 820 ms, spring, fade' },
  { id: 'b', label: '(b) mechanical: solid, no overshoot, 3 beats' },
  { id: 'c', label: '(c) middle: (b) with a 3% peak' },
];
/* page -> route, the element that assembles, and the scenarios filmed */
const PAGES = {
  home: { route: '/t/bauhaus/', sel: '.poster', scenarios: ['load', 'arrive'] },
  about: { route: '/t/bauhaus/about/', sel: '.letter-b', scenarios: ['load'] },
};
const TIMES = [0, 80, 160, 240, 320, 400, 480, 560, 680, 820, 1000, 1250, 1600];
const problems = [];
const problem = (m) => { problems.push(m); console.warn('PROBLEM ' + m); };

let CSS = '';

async function launch() {
  if (!base) { console.error('no SNAP_BASE; run through snap.mjs'); process.exit(1); }
  if (process.env.BDL_GPU !== '1') { console.error('BDL_GPU=1 is required'); process.exit(2); }
  const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const p = await browser.newPage();
  const r = await p.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl');
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'no webgl';
  });
  await p.close();
  console.log(`renderer: ${r}`);
  await writeFile(join(out, 'renderer.txt'), r + '\n');
  if (/swiftshader|llvmpipe|software|no webgl/i.test(r)) { console.error('software renderer: aborting'); await browser.close(); process.exit(2); }
  return browser;
}

/** variant: 'a' | 'b' | 'c' | 'frozen' (no proof at all) | 'default' (proof, no attribute) */
async function newCtx(browser, sz, scheme, variant) {
  const context = await browser.newContext({
    viewport: { width: sz.w, height: sz.h }, deviceScaleFactor: sz.dpr,
    isMobile: !!sz.mobile, hasTouch: !!sz.mobile, colorScheme: scheme, reducedMotion: 'no-preference',
  });
  await suppressPrompt(context);
  await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
  if (variant !== 'frozen') {
    await context.route('**/*', async (route) => {
      const req = route.request();
      let res;
      try { res = await route.fetch(); } catch { return route.continue(); }
      const type = res.headers()['content-type'] || '';
      if (!type.includes('text/html')) return route.fulfill({ response: res });
      let body = await res.text();
      const attr = variant === 'default' ? '' : ` data-bh-assembly="${variant}"`;
      body = body.replace(/<html([^>]*)>/i, `<html$1${attr}>`).replace(/<\/head>/i, `<style id="bh-asm-proof">${CSS}</style></head>`);
      return route.fulfill({ response: res, body });
    });
  }
  const page = await context.newPage();
  await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'no-preference', reducedTransparency: 'no-preference' }).catch(async () => {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'no-preference' });
  });
  page.on('pageerror', (e) => problem(`${page.url()} pageerror: ${e.message}`));
  page.on('response', (r) => { if (r.status() >= 400) problem(`${r.status()} for ${r.url()}`); });
  return { context, page };
}

/** Film from `start()` until `ms` after it returns, as the screencast sees it. */
async function film(page, start, ms) {
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    frames.push({ data, at: metadata.timestamp });
    try { await cdp.send('Page.screencastFrameAck', { sessionId }); } catch {}
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, everyNthFrame: 1 });
  await page.waitForTimeout(200);
  await start();
  await page.waitForTimeout(ms);
  await cdp.send('Page.stopScreencast');
  await cdp.detach();
  return frames;
}

/** Epoch ms at which the first assembling shape under `sel` began, and the rect of `sel`. */
function readZero(page, sel) {
  return page.evaluate((sel) => {
    const root = document.querySelector(sel);
    if (!root) return null;
    const starts = document.getAnimations()
      .filter((a) => a.effect && a.effect.target && root.contains(a.effect.target) && a.startTime != null)
      .map((a) => a.startTime);
    const r = root.getBoundingClientRect();
    return { zero: starts.length ? performance.timeOrigin + Math.min(...starts) : null, anims: starts.length,
      rect: { x: r.left, y: r.top, w: r.width, h: r.height }, vh: innerHeight, vw: innerWidth,
      theme: document.documentElement.dataset.theme, scheme: document.documentElement.dataset.scheme,
      attr: document.documentElement.getAttribute('data-bh-assembly') };
  }, sel);
}

const fname = (page, scenario, variant, scheme, size) => [page, scenario, variant, scheme, size].join('__');

async function saveStrip(name, frames, z, sz) {
  const t0 = z.zero;
  const kept = frames.map((f) => ({ ...f, ms: Math.round(f.at * 1000 - t0) })).filter((f) => f.ms > -250 && f.ms < 2200);
  const metaFrames = [];
  let i = 0;
  for (const f of kept) {
    const file = `${name}__${String(i++).padStart(3, '0')}.jpg`;
    await writeFile(join(frameDir, file), Buffer.from(f.data, 'base64'));
    metaFrames.push({ file, ms: f.ms });
  }
  /* the crop is the element's box padded 12 px, clamped to the viewport; the
     frame is the viewport in CSS px */
  const pad = 12;
  const x = Math.max(0, z.rect.x - pad), y = Math.max(0, z.rect.y - pad);
  const w = Math.min(z.vw, z.rect.x + z.rect.w + pad) - x, h = Math.min(z.vh, z.rect.y + z.rect.h + pad) - y;
  const clipped = z.rect.y + z.rect.h > z.vh + 1 || z.rect.y < -1;
  if (clipped) problem(`${name}: the element runs outside the viewport (y ${z.rect.y.toFixed(0)} h ${z.rect.h.toFixed(0)} of ${z.vh})`);
  const sums = frames.length ? frames.slice(1).map((f, k) => Math.round((f.at - frames[k].at) * 1000)) : [];
  await writeFile(join(stripDir, name + '.json'), JSON.stringify({
    name, crop: { x, y, w, h }, vw: z.vw, vh: z.vh, clipped, frames: metaFrames,
    anims: z.anims, attr: z.attr, theme: z.theme, scheme: z.scheme, totalFrames: frames.length,
    firstMs: kept[0]?.ms, lastMs: kept.at(-1)?.ms, maxGapMs: Math.max(0, ...sums),
  }, null, 2) + '\n');
  return kept.length;
}

async function loadFilm(browser, pageId, variant, scheme, sz) {
  const { sel, route } = PAGES[pageId];
  const { context, page } = await newCtx(browser, sz, scheme, variant);
  await page.goto('about:blank');
  const frames = await film(page, async () => { await page.goto(base + route, { waitUntil: 'load' }); }, 2600);
  await page.evaluate(() => document.fonts.ready);
  const z = await readZero(page, sel);
  if (!z || z.zero == null) { problem(`load ${pageId} ${variant} ${scheme} ${sz.id}: no assembly animation found`); await context.close(); return; }
  if (z.theme !== 'bauhaus' || z.scheme !== scheme) problem(`load ${pageId}: theme ${z.theme} scheme ${z.scheme}`);
  const n = await saveStrip(fname(pageId, 'load', variant, scheme, sz.id), frames, z, sz);
  /* settled picture of the element, for the identical-ending check */
  await page.waitForTimeout(400);
  await page.locator(sel).first().screenshot({ path: join(out, 'finals', `${fname(pageId, 'final', variant, scheme, sz.id)}.png`) });
  console.log(`ok load ${pageId} ${variant} ${scheme} ${sz.id}: ${n} frames, ${z.anims} animations`);
  await context.close();
}

async function arriveFilm(browser, variant, scheme, sz) {
  const pageId = 'home';
  const { sel } = PAGES[pageId];
  const { context, page } = await newCtx(browser, sz, scheme, variant);
  await page.goto(base + '/t/quiet/', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  /* the real switcher: open its dialog, click the Bauhaus row */
  const openBox = await page.evaluate(() => {
    const r = document.querySelector('bdl-switcher').shadowRoot.querySelector('.open').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await page.mouse.click(openBox.x, openBox.y);
  await page.waitForTimeout(600);
  const rowBox = await page.evaluate(() => {
    const a = document.querySelector('bdl-switcher').shadowRoot.querySelector('a[data-school="bauhaus"]');
    a.scrollIntoView({ block: 'nearest' });
    const r = a.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await page.waitForTimeout(250);
  const frames = await film(page, async () => { await page.mouse.click(rowBox.x, rowBox.y); }, 3200);
  if (new URL(page.url()).pathname !== '/t/bauhaus/') { problem(`arrive ${variant} ${scheme} ${sz.id}: ended on ${page.url()}`); await context.close(); return; }
  const z = await readZero(page, sel);
  if (!z || z.zero == null) { problem(`arrive ${variant} ${scheme} ${sz.id}: no assembly animation found`); await context.close(); return; }
  if (z.theme !== 'bauhaus' || z.scheme !== scheme) problem(`arrive: theme ${z.theme} scheme ${z.scheme}`);
  const n = await saveStrip(fname(pageId, 'arrive', variant, scheme, sz.id), frames, z, sz);
  console.log(`ok arrive ${variant} ${scheme} ${sz.id}: ${n} frames, ${z.anims} animations`);
  await context.close();
}

/* Per-shape timing and the state at +480 ms (the pink square), read from the
   Web Animations API on the settled page, then paused and stepped. */
async function timing(browser) {
  const rows = [];
  for (const variant of ['frozen', 'a', 'b', 'c', 'default']) {
    const { context, page } = await newCtx(browser, SIZES[0], 'light', variant);
    for (const [pageId, { route, sel }] of Object.entries(PAGES)) {
      await page.goto(base + route, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      const r = await page.evaluate((sel) => {
        const root = document.querySelector(sel);
        const anims = document.getAnimations().filter((a) => a.effect && a.effect.target && root.contains(a.effect.target));
        const shapes = anims.map((a) => {
          const t = a.effect.target, ct = a.effect.getComputedTiming(), cs = getComputedStyle(t);
          return { shape: `${t.tagName.toLowerCase()}:nth-child(${[...t.parentNode.children].indexOf(t) + 1})`, fill: t.getAttribute('fill'),
            name: a.animationName, delay: ct.delay, duration: ct.duration, end: ct.endTime, easing: cs.animationTimingFunction };
        });
        anims.forEach((a) => a.pause());
        const at = {};
        for (const t of [240, 480, 720]) {
          anims.forEach((a) => { a.currentTime = t; });
          at[t] = anims.map((a) => { const cs = getComputedStyle(a.effect.target); return { op: +parseFloat(cs.opacity).toFixed(3), tf: cs.transform === 'none' ? 'none' : cs.transform }; });
        }
        return { shapes, at, finish: Math.max(...shapes.map((s) => s.end)) };
      }, sel);
      rows.push({ variant, page: pageId, finishMs: r.finish, shapes: r.shapes.map((s, i) => ({ ...s, op240: r.at[240][i].op, op480: r.at[480][i].op, op720: r.at[720][i].op })) });
    }
    await context.close();
  }
  await writeFile(join(out, 'timing.json'), JSON.stringify(rows, null, 2) + '\n');
  for (const r of rows) console.log(`timing ${r.page} ${r.variant}: ends ${r.finishMs} ms`);
}

/* The settled pictures must be identical across a, b and c. */
async function finals() {
  const dir = join(out, 'finals');
  const report = [];
  for (const pageId of Object.keys(PAGES)) for (const scheme of SCHEMES) for (const sz of SIZES) {
    const load = async (v) => {
      const p = join(dir, `${fname(pageId, 'final', v, scheme, sz.id)}.png`);
      return existsSync(p) ? loadImage(p) : null;
    };
    const ref = await load('a');
    if (!ref) continue;
    const px = (img) => { const c = createCanvas(img.width, img.height); const g = c.getContext('2d'); g.drawImage(img, 0, 0); return g.getImageData(0, 0, img.width, img.height).data; };
    const ra = px(ref);
    for (const v of ['b', 'c']) {
      const im = await load(v);
      if (!im) continue;
      if (im.width !== ref.width || im.height !== ref.height) { report.push({ pageId, scheme, size: sz.id, variant: v, same: false, note: 'size differs' }); continue; }
      const rv = px(im); let diff = 0, max = 0;
      for (let i = 0; i < ra.length; i += 4) { const d = Math.max(Math.abs(ra[i] - rv[i]), Math.abs(ra[i + 1] - rv[i + 1]), Math.abs(ra[i + 2] - rv[i + 2])); if (d > 2) diff++; if (d > max) max = d; }
      report.push({ pageId, scheme, size: sz.id, variant: v, same: diff === 0, pixelsOff: diff, maxChannelDiff: max, pixels: ra.length / 4 });
    }
  }
  await writeFile(join(out, 'finals.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`finals: ${report.filter((r) => r.same).length}/${report.length} identical`);
}

async function capture() {
  await mkdir(join(out, 'finals'), { recursive: true });
  const browser = await launch();
  for (const scheme of SCHEMES) for (const sz of SIZES) for (const v of VARIANTS) {
    for (const [pageId, { scenarios }] of Object.entries(PAGES)) {
      if (scenarios.includes('load')) await loadFilm(browser, pageId, v.id, scheme, sz);
    }
    await arriveFilm(browser, v.id, scheme, sz);
  }
  await timing(browser);
  await browser.close();
  await finals();
}

/* ---------- sheets ---------- */
const BG = '#1b1b1f', INK = '#f2f2f2', CAP = '#c9c9d0', GAP = 8, SIDE = 150;

async function readStrip(name) {
  const p = join(stripDir, name + '.json');
  return existsSync(p) ? JSON.parse(await readFile(p, 'utf8')) : null;
}

/** The newest frame at or before t, else the first. */
function frameAt(strip, t) {
  let pick = strip.frames[0];
  for (const f of strip.frames) if (f.ms <= t) pick = f;
  return pick;
}

async function sheets() {
  for (const [pageId, { scenarios }] of Object.entries(PAGES)) for (const sz of SIZES) for (const scheme of SCHEMES) {
    const sections = [];
    for (const sc of scenarios) {
      const rows = [];
      for (const v of VARIANTS) {
        const strip = await readStrip(fname(pageId, sc, v.id, scheme, sz.id));
        if (strip) rows.push({ v, strip });
      }
      if (rows.length) sections.push({ sc, rows });
    }
    if (!sections.length) continue;
    const first = sections[0].rows[0].strip;
    const cellW = sz.id === '1440' ? 168 : 120;
    const cellH = Math.round(cellW * (first.crop.h / first.crop.w));
    const W = SIDE + TIMES.length * (cellW + GAP) + GAP;
    const rowH = cellH + 20;
    const H = 40 + sections.reduce((a, s) => a + 30 + s.rows.length * (rowH + GAP), 0) + 10;
    const cv = createCanvas(W, H); const g = cv.getContext('2d');
    g.fillStyle = BG; g.fillRect(0, 0, W, H);
    g.fillStyle = INK; g.font = '600 20px sans-serif';
    g.fillText(`${pageId === 'home' ? 'Home hero' : "About's constructed B"} assembling, ${sz.id} wide, ${scheme}: (a) today, (b) mechanical, (c) middle. Time is ms since the assembly began.`, GAP, 28);
    let y = 40;
    for (const s of sections) {
      g.fillStyle = CAP; g.font = 'italic 16px sans-serif';
      g.fillText(s.sc === 'load' ? 'on load (fresh page)' : 'on arrival from Quiet (through the switcher)', GAP, y + 20);
      y += 30;
      for (const { v, strip } of s.rows) {
        g.fillStyle = INK; g.font = '600 15px sans-serif';
        const lines = v.label.split(': ');
        g.fillText(lines[0], GAP, y + 22);
        g.font = '12px sans-serif'; g.fillStyle = CAP;
        (lines[1] || '').match(/.{1,22}(\s|$)/g)?.slice(0, 4).forEach((l, i) => g.fillText(l.trim(), GAP, y + 42 + i * 15));
        for (let c = 0; c < TIMES.length; c++) {
          const f = frameAt(strip, TIMES[c]);
          const x = SIDE + GAP + c * (cellW + GAP);
          const img = await loadImage(join(frameDir, f.file));
          const sx = (img.width / strip.vw), sy = (img.height / strip.vh);
          g.drawImage(img, strip.crop.x * sx, strip.crop.y * sy, strip.crop.w * sx, strip.crop.h * sy, x, y, cellW, cellH);
          g.fillStyle = f.ms <= TIMES[c] && TIMES[c] - f.ms < 60 ? INK : '#ff9a9a';
          g.font = '12px sans-serif';
          g.fillText(`+${f.ms} ms`, x, y + cellH + 14);
        }
        y += rowH + GAP;
      }
    }
    const file = join(out, `sheet__${pageId}__${sz.id}__${scheme}.jpg`);
    await writeFile(file, cv.toBuffer('image/jpeg', 90));
    console.log(`sheet ${file} ${W}x${H}`);
  }
}

if (!process.argv.includes('--sheets-only')) {
  CSS = await readFile(join(PROOF, 'proof.css'), 'utf8');
  await capture();
}
await sheets();
await writeFile(join(out, 'problems.json'), JSON.stringify(problems, null, 2) + '\n');
console.log(`problems: ${problems.length}`);
