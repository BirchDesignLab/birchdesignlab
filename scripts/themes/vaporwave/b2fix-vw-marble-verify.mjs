#!/usr/bin/env node
/**
 * B2 fix round verification probe (seat vw-fix-marble), against a frozen
 * build served by snap.mjs (--name b2fix-vw-marble --port 4474). Produces
 * the films and stills the fix round's brief asks for and checks the a11y,
 * handoff and dispose-guard fixes against real Playwright input, GPU
 * Chromium throughout.
 *
 * Usage (serve the snap first):
 *   BDL_GPU=1 node scripts/themes/vaporwave/b2fix-vw-marble-verify.mjs \
 *     --base http://127.0.0.1:4474 [--only handoff,drag,idle,touch,arrive,ctxloss,a11y,plinth,kiosk]
 * Output: scripts/themes/.out/stage3-b2/vw-fix-marble/
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'stage3-b2', 'vw-fix-marble');
await mkdir(OUT, { recursive: true });
const argOf = (n, f) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? f : process.argv[i + 1]; };
const base = argOf('base', 'http://127.0.0.1:4474');
const only = (argOf('only', '') || '').split(',').filter(Boolean);
const want = (k) => only.length === 0 || only.includes(k);

if (process.env.BDL_GPU !== '1') { console.error('set BDL_GPU=1'); process.exit(1); }

const browser = await chromium.launch({
  args: ['--hide-scrollbars', '--font-render-hinting=none', '--disable-lcd-text',
    '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
});
const results = {};
const problems = [];

async function newPage({ width = 1440, height = 900, scheme = 'dark', mobile = false } = {}) {
  const context = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: mobile ? 2 : 1,
    isMobile: mobile, hasTouch: mobile, colorScheme: scheme, reducedMotion: 'no-preference',
  });
  await suppressPrompt(context);
  await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); localStorage.setItem('theme', s); } catch {} }, scheme);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(`${page.url()} ${m.type()}: ${m.text().slice(0, 220)}`); });
  page.on('pageerror', (e) => problems.push(`${page.url()} pageerror: ${e.message}`));
  return { context, page, cdp };
}

async function gpuCheck() {
  const { context, page } = await newPage();
  await page.goto('about:blank');
  const r = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
  });
  await context.close();
  console.log('renderer:', r);
  await writeFile(join(OUT, 'gpu.txt'), r + '\n');
  if (/swiftshader|llvmpipe/i.test(r)) { await browser.close(); throw new Error('software rasteriser'); }
}

async function strip(frames, labels, file, { maxW = 420 } = {}) {
  const ims = await Promise.all(frames.map((b) => loadImage(b)));
  const scale = Math.min(1, maxW / ims[0].width);
  const w = Math.round(ims[0].width * scale), h = Math.round(ims[0].height * scale);
  const pad = 8, lab = 30;
  const c = createCanvas(ims.length * (w + pad) + pad, h + lab + pad * 2);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
  ims.forEach((im, i) => {
    const x = pad + i * (w + pad);
    ctx.fillStyle = '#111'; ctx.font = 'bold 20px sans-serif';
    ctx.fillText(labels[i] ?? '', x, pad + 22);
    ctx.drawImage(im, x, pad + lab, w, h);
  });
  await writeFile(join(OUT, file), await c.encode('jpeg', 92));
}
function diffShare(a, b) {
  let n = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    const d = Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]);
    if (d > 24) n++; // ">8 levels" per channel roughly: 24 summed across 3 channels
  }
  return n / (a.width * a.height);
}
async function px(buf) { const im = await loadImage(buf); const c = createCanvas(im.width, im.height); const x = c.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, im.width, im.height); }
const clipOf = async (page, sel, padX = 20, padY = 20) => {
  const r = await page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; }, sel);
  if (!r) return null;
  const vp = page.viewportSize();
  const x = Math.max(0, r.x - padX), y = Math.max(0, r.y - padY);
  return { x, y, width: Math.min(vp.width - x, r.w + padX * 2), height: Math.min(vp.height - y, r.h + padY * 2) };
};
const waitLive = (page, ms = 15000) => page.waitForFunction(() => {
  const p = document.querySelector('[data-marble-poster]');
  return p && getComputedStyle(p).opacity === '0' && Number(document.querySelector('[data-marble-canvas]')?.dataset.draws || 0) > 0;
}, null, { timeout: ms }).then(() => true).catch(() => false);

await gpuCheck();

/* ---------- Handoff film (poster -> first live frames), light + dark ---------- */
if (want('handoff')) {
  results.handoff = {};
  for (const scheme of ['dark', 'light']) {
    // Poster-only pass: block the live-bust chunk.
    const a = await newPage({ scheme });
    await a.context.route('**/live-bust*.js', (r) => r.abort());
    await a.page.goto(`${base}/t/vaporwave/about/`, { waitUntil: 'networkidle' });
    await a.page.evaluate(() => document.querySelector('.centerpiece')?.scrollIntoView({ block: 'center' }));
    await a.page.waitForTimeout(1200);
    const clipA = await clipOf(a.page, '.centerpiece-stage', 0, 0);
    const poster = await a.page.screenshot({ clip: clipA });
    await a.context.close();
    // Real pass: capture the live chunk's arrival as a timestamped strip.
    const b = await newPage({ scheme });
    await b.page.goto(`${base}/t/vaporwave/about/`, { waitUntil: 'networkidle' });
    await b.page.evaluate(() => document.querySelector('.centerpiece')?.scrollIntoView({ block: 'center' }));
    const clipB = await clipOf(b.page, '.centerpiece-stage', 0, 0);
    const t0 = Date.now();
    const frames = [poster]; const labels = ['poster (live chunk blocked)'];
    const liveOk = await waitLive(b.page, 12000);
    const first = await b.page.screenshot({ clip: clipB });
    frames.push(first); labels.push(`first live frame (+${Date.now() - t0}ms)`);
    for (const t of [150, 500, 1200]) {
      await b.page.waitForTimeout(150);
      frames.push(await b.page.screenshot({ clip: clipB })); labels.push(`+${t}ms after`);
    }
    await strip(frames, labels, `handoff__${scheme}.jpg`, { maxW: 340 });
    const share = diffShare(await px(poster), await px(first));
    results.handoff[scheme] = { liveOk, changedShareVsPoster: +(share * 100).toFixed(2) };
    await b.context.close();
  }
}

/* ---------- Drag + release glide film ---------- */
if (want('drag')) {
  const { context, page } = await newPage();
  await page.goto(`${base}/t/vaporwave/about/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.querySelector('.centerpiece')?.scrollIntoView({ block: 'center' }));
  await waitLive(page);
  await page.waitForTimeout(300);
  const clip = await clipOf(page, '.centerpiece-stage', 10, 10);
  const c = await page.evaluate(() => { const b = document.querySelector('[data-marble-canvas]').getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height * 0.4, w: b.width }; });
  const frames = [await page.screenshot({ clip })]; const labels = ['rest'];
  await page.mouse.move(c.x - c.w * 0.32, c.y); await page.mouse.down();
  await page.mouse.move(c.x, c.y, { steps: 8 });
  frames.push(await page.screenshot({ clip })); labels.push('mid-drag');
  await page.mouse.move(c.x + c.w * 0.32, c.y, { steps: 4 });
  const cursorDuring = await page.evaluate(() => getComputedStyle(document.querySelector('[data-marble-canvas]')).cursor);
  await page.mouse.up();
  const t0 = Date.now();
  frames.push(await page.screenshot({ clip })); labels.push('flick released');
  for (const t of [200, 400, 700, 1200, 2000]) {
    await page.waitForTimeout(Math.max(0, t - (Date.now() - t0)));
    frames.push(await page.screenshot({ clip })); labels.push(`+${t}ms`);
  }
  const dAfterGlide1 = Number(await page.getAttribute('[data-marble-canvas]', 'data-draws'));
  await page.waitForTimeout(800);
  const dAfterGlide2 = Number(await page.getAttribute('[data-marble-canvas]', 'data-draws'));
  await strip(frames, labels, 'drag-glide__dark.jpg', { maxW: 300 });
  results.drag = { cursorDuring, drawsWhileStoppedPer0_8s: dAfterGlide2 - dAfterGlide1 };
  await context.close();
}

/* ---------- Idle turn resuming film ---------- */
if (want('idle')) {
  const { context, page } = await newPage();
  await page.goto(`${base}/t/vaporwave/about/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.querySelector('.centerpiece')?.scrollIntoView({ block: 'center' }));
  await waitLive(page);
  const clip = await clipOf(page, '.centerpiece-stage', 10, 10);
  const frames = [await page.screenshot({ clip })]; const labels = ['just live'];
  for (const t of [2000, 4000, 5500, 7500, 10000]) {
    await page.waitForTimeout(t === 2000 ? 2000 : 1500);
    frames.push(await page.screenshot({ clip })); labels.push(`+${t / 1000}s`);
  }
  await strip(frames, labels, 'idle-turn__dark.jpg', { maxW: 300 });
  await context.close();
}

/* ---------- Phone touch: vertical scrolls, horizontal turns ---------- */
if (want('touch')) {
  const { context, page, cdp } = await newPage({ width: 390, height: 844, mobile: true });
  await page.goto(`${base}/t/vaporwave/about/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.querySelector('.centerpiece')?.scrollIntoView({ block: 'center' }));
  const live = await waitLive(page, 15000);
  await page.waitForTimeout(300);
  const clip = await clipOf(page, '.centerpiece-stage', 10, 10);
  const c = await page.evaluate(() => { const b = document.querySelector('[data-marble-canvas]').getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
  const touch = async (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  const t0 = await page.screenshot({ clip });
  await touch('touchStart', c.x - 60, c.y);
  for (let i = 1; i <= 8; i++) { await touch('touchMove', c.x - 60 + i * 15, c.y); await page.waitForTimeout(16); }
  await touch('touchEnd');
  await page.waitForTimeout(150);
  const t1 = await page.screenshot({ clip });
  const sy0 = await page.evaluate(() => scrollY);
  await touch('touchStart', c.x, c.y + 60);
  for (let i = 1; i <= 8; i++) { await touch('touchMove', c.x, c.y + 60 - i * 22); await page.waitForTimeout(16); }
  await touch('touchEnd');
  await page.waitForTimeout(500);
  const sy1 = await page.evaluate(() => scrollY);
  const t2 = await page.screenshot({ clip: await clipOf(page, '.centerpiece-stage', 10, 10) });
  await strip([t0, t1, t2], ['phone live', 'horizontal drag turns', 'vertical swipe scrolled'], 'touch-context__390.jpg', { maxW: 300 });
  results.touch = { live, hTurnShare: diffShare(await px(t0), await px(t1)), verticalSwipeScrolledPx: sy1 - sy0 };
  await context.close();
}

/* ---------- Cross-school arrival at vaporwave About via the REAL switcher ---------- */
if (want('arrive')) {
  results.arrive = {};
  for (const scheme of ['dark', 'light']) {
    const { context, page } = await newPage({ scheme });
    await page.goto(`${base}/t/glassmorphism/about/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    const frames = []; const labels = [];
    frames.push(await page.screenshot()); labels.push('glass About');
    await page.click('bdl-switcher .open');
    await page.waitForTimeout(300);
    frames.push(await page.screenshot()); labels.push('switcher open');
    await page.click('bdl-switcher a[data-school="vaporwave"]');
    const t0 = Date.now();
    for (const t of [200, 500, 1000]) {
      await page.waitForTimeout(Math.max(0, t - (Date.now() - t0)));
      frames.push(await page.screenshot()); labels.push(`+${t}ms`);
    }
    const live = await waitLive(page, 12000);
    frames.push(await page.screenshot()); labels.push('live bust arrived');
    const path = await page.evaluate(() => location.pathname);
    await strip(frames, labels, `arrive-switcher__${scheme}.jpg`, { maxW: 260 });
    results.arrive[scheme] = { path, live };
    await context.close();
  }
}

/* ---------- Context loss and restore film ---------- */
if (want('ctxloss')) {
  const { context, page } = await newPage();
  await page.goto(`${base}/t/vaporwave/about/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.querySelector('.centerpiece')?.scrollIntoView({ block: 'center' }));
  await waitLive(page);
  await page.waitForTimeout(300);
  const clip = await clipOf(page, '.centerpiece-stage', 10, 10);
  const frames = [await page.screenshot({ clip })]; const labels = ['live'];
  const r = await page.evaluate(async () => {
    const cv = document.querySelector('[data-marble-canvas]');
    const gl = cv.getContext('webgl2') || cv.getContext('webgl');
    const ext = gl.getExtension('WEBGL_lose_context');
    ext.loseContext();
    await new Promise((res) => setTimeout(res, 400));
    const lost = { role: cv.getAttribute('role'), hidden: cv.getAttribute('aria-hidden'), poster: getComputedStyle(document.querySelector('[data-marble-poster]')).opacity };
    ext.restoreContext();
    await new Promise((res) => setTimeout(res, 2500));
    const restored = { role: cv.getAttribute('role'), hidden: cv.getAttribute('aria-hidden'), poster: getComputedStyle(document.querySelector('[data-marble-poster]')).opacity, draws: cv.dataset.draws };
    return { lost, restored };
  });
  frames.push(await page.screenshot({ clip })); labels.push('lost (poster back)');
  await page.waitForTimeout(200);
  frames.push(await page.screenshot({ clip })); labels.push('restored + rebuilt');
  await strip(frames, labels, 'context-loss-restore__dark.jpg', { maxW: 320 });
  results.ctxloss = r;
  await context.close();
}

/* ---------- a11y: nothing focusable inside aria-hidden ---------- */
if (want('a11y')) {
  const { context, page } = await newPage();
  await page.goto(`${base}/t/vaporwave/about/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.querySelector('.centerpiece')?.scrollIntoView());
  await waitLive(page, 12000);
  await page.waitForTimeout(300);
  results.a11y = await page.evaluate(() => {
    const canvas = document.querySelector('[data-marble-canvas]');
    const f = [...document.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')].filter((e) => e.tabIndex >= 0 && !e.disabled);
    const violations = f.filter((e) => e.closest('[aria-hidden="true"]')).map((e) => `${e.tagName}.${e.className}`);
    return {
      violations,
      canvas: { role: canvas.getAttribute('role'), label: canvas.getAttribute('aria-label'), tabIndex: canvas.tabIndex, hiddenAncestor: canvas.closest('[aria-hidden="true"]')?.className ?? null },
    };
  });
  await context.close();
}

/* ---------- Stills: plinth (desktop/820/390 x dark/light), kiosk widths ---------- */
if (want('plinth')) {
  results.plinth = {};
  for (const scheme of ['dark', 'light']) {
    for (const [name, w, h, mobile] of [['desktop', 1440, 900, false], ['820', 820, 1180, true], ['390', 390, 844, true]]) {
      const { context, page } = await newPage({ width: w, height: h, scheme, mobile });
      await page.goto(`${base}/t/vaporwave/about/`, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.querySelector('.centerpiece')?.scrollIntoView({ block: 'center' }));
      await waitLive(page, 12000);
      await page.waitForTimeout(400);
      const clip = await clipOf(page, '.centerpiece', 50, 50);
      await page.screenshot({ path: join(OUT, `plinth__${scheme}__${name}.png`), clip });
      const geo = await page.evaluate(() => {
        const stage = document.querySelector('.centerpiece-stage').getBoundingClientRect();
        const top = document.querySelector('.tier-top').getBoundingClientRect();
        return { stage: [stage.x, stage.y, stage.width, stage.height].map(Math.round), tierTop: [top.x, top.y, top.width, top.height].map(Math.round) };
      });
      results.plinth[`${scheme}-${name}`] = geo;
      await context.close();
    }
  }
}
/* ---------- DPR cap: min(devicePixelRatio, cap), not the cap outright ---------- */
if (want('dpr')) {
  results.dpr = {};
  for (const dsf of [1, 2]) {
    const c2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: dsf });
    await suppressPrompt(c2);
    const p2 = await c2.newPage();
    await p2.goto(`${base}/t/vaporwave/about/`, { waitUntil: 'networkidle' });
    await p2.evaluate(() => document.querySelector('.centerpiece')?.scrollIntoView({ block: 'center' }));
    await waitLive(p2, 12000);
    await p2.waitForTimeout(300);
    results.dpr[`deviceScaleFactor-${dsf}`] = await p2.evaluate(() => {
      const cv = document.querySelector('[data-marble-canvas]');
      return { devicePixelRatio, bufW: cv.width, cssW: cv.clientWidth, ratio: +(cv.width / cv.clientWidth).toFixed(3) };
    });
    await c2.close();
  }
}

if (want('kiosk')) {
  results.kiosk = {};
  for (const w of [1440, 1280, 1024, 900]) {
    const { context, page } = await newPage({ width: w, height: 1000, scheme: 'dark' });
    await page.goto(`${base}/t/vaporwave/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.querySelector('.kiosk')?.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(500);
    const clip = await clipOf(page, '.kiosk', 30, 30);
    await page.screenshot({ path: join(OUT, `kiosk__dark__${w}.png`), clip });
    const geo = await page.evaluate(() => {
      const r = (s) => { const e = document.querySelector(s); if (!e) return null; const cs = getComputedStyle(e); if (cs.display === 'none') return 'none'; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)]; };
      return { stand: r('.kiosk-stand'), foot: r('.stand-foot'), sphere: r('.kiosk-prop:not(.kiosk-prop-venus)'), venus: r('.kiosk-prop-venus') };
    });
    const overlap = (a, b) => Array.isArray(a) && Array.isArray(b) && a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
    results.kiosk[w] = { ...geo, sphereOverlapsStand: overlap(geo.sphere, geo.stand), venusOverlapsStand: overlap(geo.venus, geo.stand), sphereOverlapsVenus: overlap(geo.sphere, geo.venus) };
    await context.close();
  }
}

/* ---------- Cursor before live: must not be grab yet ---------- */
if (want('precursor')) {
  const { context, page } = await newPage();
  await page.route('**/live-bust*.js', (r) => r.abort()); // keep the canvas permanently pre-live
  await page.goto(`${base}/t/vaporwave/about/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.querySelector('.centerpiece')?.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(1500);
  results.precursor = await page.evaluate(() => {
    const cv = document.querySelector('[data-marble-canvas]');
    return { cursor: getComputedStyle(cv).cursor, ariaHidden: cv.getAttribute('aria-hidden'), tabIndex: cv.tabIndex };
  });
  await context.close();
}

/* ---------- In-school swap teardown/rebuild: exercises the dispose guard ---------- */
if (want('swap')) {
  const { context, page } = await newPage();
  await page.goto(`${base}/t/vaporwave/about/`, { waitUntil: 'networkidle' });
  await waitLive(page, 12000);
  const swaps = [];
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.evaluate(() => document.querySelector('a[href="/t/vaporwave/"]')?.click());
    await page.waitForTimeout(700);
    const home = await page.evaluate(() => ({ p: location.pathname, canvases: document.querySelectorAll('canvas').length }));
    await page.evaluate(() => document.querySelector('a[href="/t/vaporwave/about/"]')?.click());
    await page.waitForTimeout(300);
    await page.evaluate(() => document.querySelector('.centerpiece')?.scrollIntoView({ block: 'center' }));
    const live = await waitLive(page, 10000);
    const about = await page.evaluate(() => ({ p: location.pathname, canvases: document.querySelectorAll('canvas').length }));
    swaps.push({ home, about: { ...about, live } });
  }
  results.swap = { swaps };
  await context.close();
}

console.log(JSON.stringify(results, null, 1));
console.log('problems:', JSON.stringify([...new Set(problems)], null, 1));
await writeFile(join(OUT, 'verify-results.json'), JSON.stringify({ results, problems: [...new Set(problems)] }, null, 1));
await browser.close();
