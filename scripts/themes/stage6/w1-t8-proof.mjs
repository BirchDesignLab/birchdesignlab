/**
 * Stage 6 wave 1, task 8: film, sheet and check the P3 re-division proof
 * (scripts/themes/proofs/stage6-swiss-p3/). Written 11-19-26.
 *
 * Serves the frozen build with the proof injected into swiss Home
 * (proofs/stage6-swiss-p3/serve.mjs) on --port (4470), opens GPU Chromium
 * (exits 2 on a software renderer), forces prefers-reduced-transparency:
 * no-preference and suppresses the portal prompt and the dial's first-visit
 * hint.
 *
 * Stages (no flag: all):
 *   --look    whole-page frames at 1440, 1024, 820 and 390, both schemes, for
 *             the page as built and each division; page text per division
 *             (word parity), sideways overflow, the width dial's rest width
 *   --films   1440 and 390, both schemes: the division key pressed through
 *             2, 3, 4, 6 (a timestamped strip per press), plus a rapid
 *             double press
 *   --grid    the grid key latched on each division at 1440 and 390 (does
 *             the mark-up layer follow the division)
 *   --keys    keyboard: Tab to the key, Enter and Space cycle, focus stays,
 *             the status line, label text, key and neighbour hit areas
 *   --sheet   the founder sheets: the four layouts side by side, whole page,
 *             at 1440 and 390, both schemes
 *
 * Usage:
 *   node scripts/themes/snap.mjs --name s6-w1-t8        # freeze once
 *   BDL_GPU=1 node scripts/themes/stage6/w1-t8-proof.mjs [--look] [--films] ...
 * Output: scripts/themes/.out/stage6/w1/t8/ (frames, strips, sheets, results.json)
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';
import { serveProof } from '../proofs/stage6-swiss-p3/serve.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const OUT = join(HERE, '..', '.out', 'stage6', 'w1', 't8');
const arg = (n, f) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? f : process.argv[i + 1]; };
const PORT = Number(arg('port', '4470'));
const SNAP = arg('snap', 's6-w1-t8');
const base = `http://127.0.0.1:${PORT}`;
const HOME = '/t/swiss/';
const STAGES = ['look', 'films', 'grid', 'keys', 'sheet'];
const only = STAGES.filter((s) => process.argv.includes(`--${s}`));
const want = (s) => only.length === 0 || only.includes(s);
for (const d of ['frames', 'strips', 'sheets']) await mkdir(join(OUT, d), { recursive: true });
const resultsPath = join(OUT, 'results.json');
const R = existsSync(resultsPath) ? JSON.parse(await readFile(resultsPath, 'utf8')) : {};
const save = () => writeFile(resultsPath, JSON.stringify(R, null, 2));

if (process.env.BDL_GPU !== '1') { console.error('BDL_GPU=1 required'); process.exit(2); }
const dist = join(REPO, 'scripts', 'themes', '.out', `snap-${SNAP}`);
if (!existsSync(dist)) { console.error(`no ${dist}`); process.exit(1); }
const server = await serveProof(PORT, dist);

const browser = await chromium.launch({
  headless: true,
  args: ['--hide-scrollbars', '--font-render-hinting=none', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
});
const done = async (code = 0) => { await browser.close(); server.close(); process.exit(code); };
{
  const p = await browser.newPage();
  R.renderer = await p.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); });
  await p.close();
  console.log('renderer:', R.renderer);
  if (/swiftshader|llvmpipe|software/i.test(R.renderer)) { console.error('software renderer: evidence invalid'); await done(2); }
}

const SIZES = {
  1440: { w: 1440, h: 900, dpr: 1 },
  1024: { w: 1024, h: 768, dpr: 1 },
  820: { w: 820, h: 1180, dpr: 1 },
  390: { w: 390, h: 844, dpr: 2, mobile: true },
};
const DIVS = [0, 2, 3, 4, 6];

async function open(sizeId, scheme, div = 0) {
  const sz = SIZES[sizeId];
  const context = await browser.newContext({
    viewport: { width: sz.w, height: sz.h }, deviceScaleFactor: sz.dpr,
    isMobile: !!sz.mobile, hasTouch: !!sz.mobile, colorScheme: scheme, reducedMotion: 'no-preference',
  });
  await suppressPrompt(context);
  await context.addInitScript((s) => {
    try { localStorage.setItem('scheme', s); } catch {}
    try { sessionStorage.setItem('bdl-swiss-dial-hint', '1'); } catch {}
  }, scheme);
  await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [
      { name: 'prefers-color-scheme', value: scheme },
      { name: 'prefers-reduced-motion', value: 'no-preference' },
      { name: 'prefers-reduced-transparency', value: 'no-preference' },
    ],
  });
  await page.goto(`${base}${HOME}${div ? `?div=${div}` : ''}`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'bdl-switcher{opacity:0!important;pointer-events:none!important} *{scroll-behavior:auto!important}' }).catch(() => {});
  await page.waitForFunction(() => window.__p3?.relay && document.querySelector('.p3-key'), null, { timeout: 8000 });
  await page.waitForFunction(() => !document.querySelector('[data-sw-dial]')?.hidden, null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(700);
  return { context, page, cdp, errors, sz };
}

const shot = async (page, file, full = false) => writeFile(file, await page.screenshot({ type: 'png', fullPage: full }));
const pageText = (page) => page.evaluate(() => (document.querySelector('main').innerText || '').replace(/\s+/g, ' ').trim());
const dialRest = (page) => page.evaluate(() => {
  const w = document.querySelector('.billboard .ln:nth-child(2)');
  const r = document.createRange(); r.selectNodeContents(w);
  return { stretch: getComputedStyle(w).fontStretch, sd: w.style.getPropertyValue('--sw-d'), w: Math.round(r.getBoundingClientRect().width), dialHidden: document.querySelector('[data-sw-dial]')?.hidden };
});

/* ---------- films ---------- */

async function startFilm(page) {
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    frames.push({ data, at: metadata.timestamp });
    try { await cdp.send('Page.screencastFrameAck', { sessionId }); } catch {}
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 85, everyNthFrame: 1 });
  await page.waitForTimeout(200);
  if (!frames.length) {
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 85 });
    frames.push({ data, at: Date.now() / 1000 });
  }
  const t0 = Date.now() / 1000;
  return {
    async stop() {
      await cdp.send('Page.stopScreencast');
      await cdp.detach();
      const before = frames.filter((f) => f.at < t0).slice(-1);
      return [...before, ...frames.filter((f) => f.at >= t0)].map((f) => ({ ...f, ms: Math.round((f.at - t0) * 1000) }));
    },
  };
}
function pick(frames, n, ms) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const at = i === 0 ? -1 : Math.round((i * ms) / (n - 1));
    const shown = frames.filter((f) => f.ms <= at).pop() ?? frames[0];
    out.push({ ...shown, ms: at });
  }
  return out;
}
async function strip(frames, file, title, cols = 5, cellW = 420) {
  const images = await Promise.all(frames.map((f) => loadImage(Buffer.from(f.data, 'base64'))));
  const cellH = Math.round((images[0].height / images[0].width) * cellW);
  const PAD = 12, CAP = 26, HEAD = CAP + PAD;
  const rows = Math.ceil(images.length / cols);
  const canvas = createCanvas(PAD + cols * (cellW + PAD), HEAD + PAD + rows * (cellH + CAP + PAD));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1b1b1d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = '600 15px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e8e6e1';
  ctx.fillText(title, PAD, PAD + CAP / 2);
  images.forEach((img, i) => {
    const x = PAD + (i % cols) * (cellW + PAD);
    const y = HEAD + PAD + Math.floor(i / cols) * (cellH + CAP + PAD);
    ctx.drawImage(img, x, y, cellW, cellH);
    ctx.fillStyle = '#e8e6e1';
    ctx.fillText(frames[i].ms < 0 ? 'before' : `+${frames[i].ms} ms`, x, y + cellH + CAP / 2);
  });
  await writeFile(file, await canvas.encode('png'));
}

/** A tile sheet of images (files or buffers) side by side, each captioned. */
async function tile(items, file, title, cellW) {
  const images = await Promise.all(items.map((i) => loadImage(i.src)));
  const PAD = 14, CAP = 28, HEAD = 36;
  const scale = images.map((img) => cellW / img.width);
  const hs = images.map((img, i) => Math.round(img.height * scale[i]));
  const canvas = createCanvas(PAD + images.length * (cellW + PAD), HEAD + Math.max(...hs) + CAP + PAD * 2);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1b1b1d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = '600 16px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e8e6e1';
  ctx.fillText(title, PAD, HEAD / 2);
  images.forEach((img, i) => {
    const x = PAD + i * (cellW + PAD);
    ctx.drawImage(img, x, HEAD, cellW, hs[i]);
    ctx.fillStyle = '#e8e6e1';
    ctx.fillText(items[i].cap, x, HEAD + hs[i] + CAP / 2 + 4);
  });
  await writeFile(file, await canvas.encode('png'));
}

/* ---------- look ---------- */

if (want('look')) {
  R.look = {};
  for (const scheme of ['light', 'dark']) for (const s of ['1440', '1024', '820', '390']) {
    for (const d of DIVS) {
      const { context, page, errors, sz } = await open(s, scheme, d);
      const key = `${scheme}__${s}__${d || 'built'}`;
      const rec = (R.look[key] = { errors });
      rec.text = await pageText(page);
      rec.overflowX = await page.evaluate(() => ({ scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth }));
      rec.dial = await dialRest(page);
      rec.cols = await page.evaluate(() => ({ root: getComputedStyle(document.documentElement).getPropertyValue('--cols').trim(), main: getComputedStyle(document.querySelector('main .sw-row')).gridTemplateColumns.split(' ').length }));
      rec.height = await page.evaluate(() => document.documentElement.scrollHeight);
      await shot(page, join(OUT, 'frames', `${key}.png`), true);
      await context.close();
      console.log('look', key, rec.height, JSON.stringify(rec.overflowX), rec.dial.stretch);
    }
  }
  // Word parity across the divisions.
  R.parity = {};
  for (const scheme of ['light', 'dark']) for (const s of ['1440', '1024', '820', '390']) {
    const ref = R.look[`${scheme}__${s}__built`].text;
    R.parity[`${scheme}__${s}`] = DIVS.slice(1).map((d) => R.look[`${scheme}__${s}__${d}`].text === ref);
  }
  await save();
}

/* ---------- films ---------- */

if (want('films')) {
  R.films = {};
  for (const scheme of ['light', 'dark']) for (const s of ['1440', '390']) {
    const { context, page, errors } = await open(s, scheme, 0);
    const F = (R.films[`${scheme}__${s}`] = { errors, presses: [] });
    for (const to of [2, 3, 4, 6]) {
      await page.evaluate(() => window.scrollTo(0, 0));
      const film = await startFilm(page);
      const t = Date.now();
      await page.locator('.p3-key').click();
      await page.waitForTimeout(900 - (Date.now() - t));
      const frames = await film.stop();
      const cur = await page.evaluate(() => window.__p3.current);
      F.presses.push({ to, current: cur, frameCount: frames.length, lastMs: frames[frames.length - 1]?.ms });
      await strip(pick(frames, 10, 700), join(OUT, 'strips', `press-${to}__${scheme}__${s}.png`), `Division key pressed: to ${to} columns, ${scheme} ${s} (timestamped from the press)`, 5, s === '390' ? 220 : 420);
      console.log('film', scheme, s, to, frames.length, 'frames');
    }
    // Rapid presses: three within 200ms; the last wins and the page ends laid.
    const r0 = await page.evaluate(() => window.__p3.current);
    for (let i = 0; i < 3; i++) { await page.locator('.p3-key').click(); await page.waitForTimeout(90); }
    await page.waitForTimeout(1000);
    F.rapid = { from: r0, after3: await page.evaluate(() => window.__p3.current), clipLeft: await page.evaluate(() => getComputedStyle(document.querySelector('main')).clipPath) };
    await context.close();
  }
  await save();
}

/* ---------- grid key follows the division ---------- */

if (want('grid')) {
  R.grid = {};
  for (const s of ['1440', '390']) for (const d of [2, 3, 4, 6]) {
    const { context, page } = await open(s, 'light', d);
    await page.evaluate(() => { const k = document.querySelector('[data-sw-grid-key]'); k.dispatchEvent(new PointerEvent('pointerdown', { button: 0, pointerId: 9, bubbles: true })); setTimeout(() => k.dispatchEvent(new PointerEvent('pointerup', { button: 0, pointerId: 9, bubbles: true })), 60); });
    await page.waitForTimeout(500);
    R.grid[`${s}__${d}`] = await page.evaluate(() => ({
      pressed: document.querySelector('[data-sw-grid-key]').getAttribute('aria-pressed'),
      visibleGuides: Array.from(document.querySelectorAll('[data-sw-guides] span')).filter((x) => getComputedStyle(x).display !== 'none').length,
      tags: Array.from(document.querySelectorAll('[data-sw-marks] span')).map((x) => x.textContent).slice(0, 40),
    }));
    await shot(page, join(OUT, 'frames', `grid__${s}__${d}.png`));
    await context.close();
  }
  await save();
}

/* ---------- keyboard ---------- */

if (want('keys')) {
  R.keys = {};
  for (const s of ['1440', '390']) {
    const { context, page } = await open(s, 'light', 0);
    const K = (R.keys[s] = {});
    await page.focus('[data-sw-grid-key]');
    await page.keyboard.press('Tab');
    K.focusAfterTab = await page.evaluate(() => document.activeElement?.className);
    K.label0 = await page.evaluate(() => document.querySelector('.p3-key').getAttribute('aria-label'));
    await page.keyboard.press('Enter'); await page.waitForTimeout(900);
    K.afterEnter = await page.evaluate(() => ({ cur: window.__p3.current, focus: document.activeElement?.className, label: document.querySelector('.p3-key').getAttribute('aria-label'), status: document.querySelector('.p3-status').textContent }));
    await page.keyboard.press('Space'); await page.waitForTimeout(900);
    K.afterSpace = await page.evaluate(() => ({ cur: window.__p3.current, focus: document.activeElement?.className, status: document.querySelector('.p3-status').textContent }));
    K.geom = await page.evaluate(() => {
      const r = (el) => { const b = el.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) }; };
      const g = document.querySelector('[data-sw-grid-key]'); const p = document.querySelector('.p3-key');
      const pad = (el) => { const b = getComputedStyle(el, '::after'); return b.inset; };
      return { grid: r(g), p3: r(p), nav: r(document.querySelector('.site-header nav')), wordmark: r(document.querySelector('.site-header .wordmark')), pad: pad(p) };
    });
    // The center of each key's pad edge: which element a press at the shared edge lands on.
    K.edgeHit = await page.evaluate(() => {
      const g = document.querySelector('[data-sw-grid-key]').getBoundingClientRect();
      const p = document.querySelector('.p3-key').getBoundingClientRect();
      const left = Math.min(g.left, p.left) === g.left ? g : p; const right = left === g ? p : g;
      const mid = (left.right + right.left) / 2;
      const cy = g.top + g.height / 2;
      const hit = (x) => document.elementFromPoint(x, cy)?.className;
      return { gap: Math.round(right.left - left.right), midHit: hit(mid), leftPad: hit(left.right + 3), rightPad: hit(right.left - 3) };
    });
    await shot(page, join(OUT, 'frames', `keys__${s}.png`));
    await context.close();
  }
  await save();
}

/* ---------- sheets ---------- */

if (want('sheet')) {
  for (const scheme of ['light', 'dark']) {
    for (const [s, cellW] of [['1440', 440], ['390', 300]]) {
      const items = DIVS.slice(1).map((d) => ({ src: join(OUT, 'frames', `${scheme}__${s}__${d}.png`), cap: `${d} columns` }));
      await tile(items, join(OUT, 'sheets', `sheet-${s}-${scheme}.png`), `P3 re-division, swiss Home at ${s}, ${scheme}: 2, 3, 4 and 6 columns (same words and type, whole page)`, cellW);
    }
    // The page as built beside the four, for orientation, at 1440 only.
    const items = DIVS.map((d) => ({ src: join(OUT, 'frames', `${scheme}__1440__${d || 'built'}.png`), cap: d ? `${d} columns` : 'as built (12)' }));
    await tile(items, join(OUT, 'sheets', `sheet-1440-with-built-${scheme}.png`), `swiss Home at 1440, ${scheme}: as built, then 2, 3, 4, 6`, 340);
    for (const s of ['1024', '820']) {
      const its = DIVS.map((d) => ({ src: join(OUT, 'frames', `${scheme}__${s}__${d || 'built'}.png`), cap: d ? `${d} columns` : 'as built' }));
      await tile(its, join(OUT, 'sheets', `sheet-${s}-${scheme}.png`), `swiss Home at ${s}, ${scheme}: as built, then 2, 3, 4, 6`, s === '820' ? 300 : 340);
    }
  }
  console.log('sheets done');
}

await save();
await done(0);
