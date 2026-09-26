/**
 * B2 ROUND 4 RE-CRITIC RERUN (b2r4-vw-critic, 09-26-26; copy of b2r3-vw-critic-rerun.mjs writing to vw-recritic-r4/). Was: ROUND 3 RERUN: a copy of
 * b2fix-vw-recritic.mjs writing to vw-recritic-r3/, so the part-2 evidence in
 * vw-recritic/ stays for comparison. Otherwise unchanged.
 *
 * Vaporwave B2 fix-round RE-CRITIC probe (Tier 3 Stage 3, wave B2, seat
 * b2fix-vw-critic). Written 09-26-26.
 *
 * The rerun of workflow 1's critic probe (b2-vw-critic.mjs --out vw-recritic)
 * covers the stills, loops, attract loop, drag, caption press, bust and a11y.
 * This script adds what that probe does not: 1:1 face crops of the LIVE bust
 * at several yaws while a real drag is held, a handoff diff heatmap on desktop
 * and phone, a context-loss film with a black-box diagnosis (filter off,
 * canvas hidden), the kiosk at 1440/1280/1024/900, the pipes and marble loops
 * in full-window Preview over time, and cross-school arrivals at About and
 * Home through the REAL portal switcher.
 *
 * Usage (serve a snap first: snap.mjs --name b2fix-vw-critic --port 4479 --hold):
 *   BDL_GPU=1 node scripts/themes/vaporwave/b2fix-vw-recritic.mjs \
 *     --base http://127.0.0.1:4479 [--only faces,handoff,ctxloss,kiosk,pipes,arrive,attractphone]
 * Outputs: scripts/themes/.out/stage3-b2/vw-recritic/ (gitignored)
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'stage3-b2', 'vw-recritic-r4');
await mkdir(OUT, { recursive: true });
const argOf = (n, f) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? f : process.argv[i + 1]; };
const base = argOf('base', 'http://127.0.0.1:4479');
const only = (argOf('only', '') || '').split(',').filter(Boolean);
const want = (k) => only.length === 0 || only.includes(k);

const gpu = process.env.BDL_GPU === '1';
const browser = await chromium.launch({
  args: ['--hide-scrollbars', '--font-render-hinting=none', '--disable-lcd-text',
    ...(gpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : [])],
});
const results = {};
const problems = [];

async function newPage({ width = 1440, height = 900, scheme = 'dark', mobile = false, dpr } = {}) {
  const context = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: dpr ?? (mobile ? 2 : 1),
    isMobile: mobile, hasTouch: mobile, colorScheme: scheme, reducedMotion: 'no-preference',
  });
  await suppressPrompt(context);
  await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); localStorage.setItem('theme', s); } catch {} }, scheme);
  await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(`${page.url()} ${m.type()}: ${m.text().slice(0, 200)}`); });
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
  await writeFile(join(OUT, 'gpu-recritic.txt'), r + '\n');
  if (/swiftshader|llvmpipe/i.test(r)) { await browser.close(); throw new Error('software rasteriser'); }
}

/** Labelled strip. scale 1 keeps frames 1:1; `enlarge` > 1 enlarges nearest-neighbour. */
async function strip(frames, labels, file, { maxW = 480, enlarge = 1 } = {}) {
  const ims = await Promise.all(frames.map((b) => loadImage(b)));
  const scale = enlarge > 1 ? enlarge : Math.min(1, maxW / ims[0].width);
  const w = Math.round(ims[0].width * scale), h = Math.round(ims[0].height * scale);
  const pad = 8, lab = 34;
  const c = createCanvas(ims.length * (w + pad) + pad, h + lab + pad * 2);
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = enlarge <= 1;
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
  ims.forEach((im, i) => {
    const x = pad + i * (w + pad);
    ctx.fillStyle = '#111'; ctx.font = 'bold 22px sans-serif';
    ctx.fillText(labels[i] ?? '', x, pad + 24);
    ctx.drawImage(im, x, pad + lab, w, h);
  });
  await writeFile(join(OUT, file), await c.encode('jpeg', 93));
}
async function px(buf) {
  const im = await loadImage(buf); const c = createCanvas(im.width, im.height); const x = c.getContext('2d');
  x.drawImage(im, 0, 0); return x.getImageData(0, 0, im.width, im.height);
}
function diffShare(a, b, thr = 24) {
  let n = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    const d = Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]);
    if (d > thr) n++;
  }
  return n / (a.width * a.height);
}
/** Heatmap: the first image greyed, changed pixels (sum > thr) painted red. */
async function heat(a, b, thr = 24) {
  const c = createCanvas(a.width, a.height); const x = c.getContext('2d');
  const out = x.createImageData(a.width, a.height);
  for (let i = 0; i < a.data.length; i += 4) {
    const d = Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]);
    const g = (a.data[i] + a.data[i + 1] + a.data[i + 2]) / 3 * 0.5 + 100;
    if (d > thr) { out.data[i] = 255; out.data[i + 1] = 0; out.data[i + 2] = 0; } else { out.data[i] = out.data[i + 1] = out.data[i + 2] = g; }
    out.data[i + 3] = 255;
  }
  x.putImageData(out, 0, 0);
  return c.encode('png');
}
const rectOf = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; }, sel);
const clipOf = async (page, sel, padX = 40, padY = 40) => {
  const r = await rectOf(page, sel);
  if (!r) return null;
  const vw = page.viewportSize();
  const x = Math.max(0, r.x - padX), y = Math.max(0, r.y - padY);
  return { x, y, width: Math.min(vw.width - x, r.w + padX * 2), height: Math.min(vw.height - y, r.h + padY * 2) };
};
const waitLive = (page, ms = 15000) => page.waitForFunction(() => {
  const p = document.querySelector('[data-marble-poster]');
  return p && getComputedStyle(p).opacity === '0' && Number(document.querySelector('[data-marble-canvas]')?.dataset.draws || 0) > 0;
}, null, { timeout: ms }).then(() => true).catch(() => false);

await gpuCheck();

/* ---------- 1:1 face crops of the LIVE bust at several yaws, drag held ---------- */
if (want('faces')) {
  results.faces = {};
  for (const [scheme, dpr] of [['dark', 2], ['light', 2], ['dark', 1]]) {
    const { context, page } = await newPage({ scheme, dpr });
    await page.goto(`${base}/t/vaporwave/about/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.querySelector('.centerpiece')?.scrollIntoView({ block: 'center' }));
    const live = await waitLive(page);
    await page.waitForTimeout(250);
    const cv = await rectOf(page, '[data-marble-canvas]');
    // Face region of the canvas (the head sits in the upper-middle).
    const clip = { x: cv.x + cv.w * 0.18, y: cv.y + cv.h * 0.02, width: cv.w * 0.64, height: cv.h * 0.62 };
    const stepDeg = 30;
    const stepPx = cv.w * (stepDeg / 180) / 0.9; // DRAG_RADIANS_PER_WIDTH = 0.9 pi
    const y = cv.y + cv.h * 0.45;
    const x0 = cv.x + cv.w * 0.5;
    const frames = []; const labels = [];
    await page.mouse.move(x0, y); await page.mouse.down();
    // Walk -90..+90 while holding: left first, then right.
    const seq = [0, -1, -2, -3, -2, -1, 0, 1, 2, 3];
    const seen = new Set();
    for (const k of seq) {
      await page.mouse.move(x0 + k * stepPx, y, { steps: 4 });
      await page.waitForTimeout(120);
      if (seen.has(k)) continue; seen.add(k);
      frames.push(await page.screenshot({ clip })); labels.push(`${k * stepDeg > 0 ? '+' : ''}${k * stepDeg} deg`);
    }
    await page.mouse.up();
    const order = [...seen].map((k, i) => [k, i]).sort((a, b) => a[0] - b[0]).map(([, i]) => i);
    const f = order.map((i) => frames[i]); const l = order.map((i) => labels[i]);
    await strip(f, l, `faces-live-drag__${scheme}__dpr${dpr}__1to1.jpg`, { maxW: 4000 });
    await strip(f.slice(1, 6), l.slice(1, 6), `faces-live-drag__${scheme}__dpr${dpr}__3x.jpg`, { enlarge: dpr === 1 ? 3 : 2 });
    results.faces[`${scheme}-dpr${dpr}`] = { live, canvasCss: [cv.w, cv.h], buf: await page.evaluate(() => { const c = document.querySelector('[data-marble-canvas]'); return [c.width, c.height]; }) };
    await context.close();
  }
}

/* ---------- Handoff heatmaps: desktop and phone ---------- */
if (want('handoff')) {
  results.handoff = {};
  for (const [name, w, h, mobile, scheme] of [['desktop', 1440, 900, false, 'dark'], ['desktop', 1440, 900, false, 'light'], ['390', 390, 844, true, 'dark']]) {
    const a = await newPage({ width: w, height: h, mobile, scheme });
    await a.context.route('**/live-bust*.js', (r) => r.abort());
    await a.page.goto(`${base}/t/vaporwave/about/`, { waitUntil: 'networkidle' });
    await a.page.evaluate(() => document.querySelector('.centerpiece')?.scrollIntoView({ block: 'center' }));
    await a.page.waitForTimeout(1500);
    const clipA = await clipOf(a.page, '.centerpiece-stage', 0, 0);
    const poster = await a.page.screenshot({ clip: clipA });
    await a.context.close();
    const b = await newPage({ width: w, height: h, mobile, scheme });
    await b.page.goto(`${base}/t/vaporwave/about/`, { waitUntil: 'networkidle' });
    await b.page.evaluate(() => document.querySelector('.centerpiece')?.scrollIntoView({ block: 'center' }));
    // The first live frame straight after the fade (as b2-vw-critic.mjs does).
    const tNav = Date.now();
    await waitLive(b.page); const tLive = Date.now() - tNav; await b.page.waitForTimeout(200);
    const clipB = await clipOf(b.page, '.centerpiece-stage', 0, 0);
    const first = await b.page.screenshot({ clip: clipB });
    await b.context.close();
    // Mid-fade from a third load (a best effort: the fade is 200 ms).
    const m = await newPage({ width: w, height: h, mobile, scheme });
    await m.page.goto(`${base}/t/vaporwave/about/`, { waitUntil: 'networkidle' });
    await m.page.evaluate(() => document.querySelector('.centerpiece')?.scrollIntoView({ block: 'center' }));
    const midCaught = await m.page.waitForFunction(() => { const p = document.querySelector('[data-marble-poster]'); const o = p && Number(getComputedStyle(p).opacity); return o > 0 && o < 1; }, null, { timeout: 6000, polling: 'raf' }).then(() => true).catch(() => false);
    const tMid = Date.now() - tNav;
    const mid = await m.page.screenshot({ clip: clipB });
    await m.context.close();
    const pa = await px(poster), pb = await px(first);
    const share = diffShare(pa, pb);
    const hm = await heat(pa, pb);
    results.handoff[`${name}-${scheme}`] = { clipA, clipB, changedShareStage: share, midCaught, tMid, tLive };
    await strip([poster, mid, first, hm], ['poster (chunk blocked)', 'mid-fade', `first live (${(share * 100).toFixed(2)}%)`, 'changed px (red)'], `handoff-heat__${name}__${scheme}.jpg`, { maxW: mobile ? 700 : 600 });
  }
}

/* ---------- Context loss and restore on About, with a black-box diagnosis ---------- */
if (want('ctxloss')) {
  results.ctxloss = {};
  for (const scheme of ['dark', 'light']) {
    const { context, page } = await newPage({ scheme });
    await page.goto(`${base}/t/vaporwave/about/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.querySelector('.centerpiece')?.scrollIntoView({ block: 'center' }));
    await waitLive(page);
    await page.waitForTimeout(300);
    await page.evaluate(() => document.activeElement?.blur());
    const clip = await clipOf(page, '.centerpiece', 30, 30);
    const frames = [await page.screenshot({ clip })]; const labels = ['live'];
    const raf2 = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.evaluate(() => {
      const cv = document.querySelector('[data-marble-canvas]');
      window.__ext = (cv.getContext('webgl2') || cv.getContext('webgl')).getExtension('WEBGL_lose_context');
      window.__ext.loseContext();
    });
    await page.waitForTimeout(500);
    const lostState = await page.evaluate(() => { const cv = document.querySelector('[data-marble-canvas]'); return { role: cv.getAttribute('role'), hidden: cv.getAttribute('aria-hidden'), poster: getComputedStyle(document.querySelector('[data-marble-poster]')).opacity, stageFilter: getComputedStyle(document.querySelector('.centerpiece-stage')).filter }; });
    frames.push(await page.screenshot({ clip })); labels.push('lost');
    await page.evaluate(() => { document.querySelector('.centerpiece-stage').style.filter = 'none'; }); await raf2();
    frames.push(await page.screenshot({ clip })); labels.push('lost, stage filter off');
    await page.evaluate(() => { document.querySelector('.centerpiece-stage').style.filter = ''; document.querySelector('[data-marble-canvas]').style.visibility = 'hidden'; }); await raf2();
    frames.push(await page.screenshot({ clip })); labels.push('lost, canvas hidden');
    await page.evaluate(() => { document.querySelector('[data-marble-canvas]').style.visibility = ''; window.__ext.restoreContext(); });
    await page.waitForTimeout(3000);
    const restState = await page.evaluate(() => { const cv = document.querySelector('[data-marble-canvas]'); const gl = cv.getContext('webgl2') || cv.getContext('webgl'); return { role: cv.getAttribute('role'), hidden: cv.getAttribute('aria-hidden'), poster: getComputedStyle(document.querySelector('[data-marble-poster]')).opacity, draws: cv.dataset.draws, attrs: gl.getContextAttributes(), lost: gl.isContextLost() }; });
    frames.push(await page.screenshot({ clip })); labels.push('restored');
    await page.evaluate(() => { document.querySelector('.centerpiece-stage').style.filter = 'none'; }); await raf2();
    frames.push(await page.screenshot({ clip })); labels.push('restored, filter off');
    await page.evaluate(() => { document.querySelector('.centerpiece-stage').style.filter = ''; }); await raf2();
    // Drag after restore: does the rebuilt bust still draw over a clear background?
    const cv = await rectOf(page, '[data-marble-canvas]');
    await page.mouse.move(cv.x + cv.w * 0.3, cv.y + cv.h * 0.45); await page.mouse.down();
    await page.mouse.move(cv.x + cv.w * 0.6, cv.y + cv.h * 0.45, { steps: 6 }); await page.mouse.up();
    await page.waitForTimeout(1500);
    frames.push(await page.screenshot({ clip })); labels.push('restored, after drag');
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(400);
    await page.evaluate(() => document.querySelector('.centerpiece')?.scrollIntoView({ block: 'center' })); await page.waitForTimeout(800);
    frames.push(await page.screenshot({ clip })); labels.push('restored, scrolled away+back');
    await strip(frames, labels, `ctxloss__${scheme}.jpg`, { maxW: 300 });
    results.ctxloss[scheme] = { lostState, restState };
    await context.close();
  }
}

/* ---------- Kiosk at four widths, both schemes, plus a DPR-2 Venus zoom ---------- */
if (want('kiosk')) {
  results.kiosk = {};
  for (const scheme of ['dark', 'light']) for (const w of [1440, 1280, 1024, 900]) {
    const { context, page } = await newPage({ width: w, height: 1000, scheme });
    await page.goto(`${base}/t/vaporwave/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.querySelector('.kiosk')?.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(600);
    await page.screenshot({ path: join(OUT, `kiosk4__${scheme}__${w}.png`), clip: await clipOf(page, '.kiosk', 30, 30) });
    results.kiosk[`${scheme}-${w}`] = await page.evaluate(() => {
      const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return b.width ? [b.left, b.top, b.right, b.bottom].map(Math.round) : 'hidden'; };
      return { stand: r('.kiosk-stand'), sphere: r('.kiosk-prop:not(.kiosk-prop-venus)'), venus: r('.kiosk-prop-venus'), kiosk: r('.kiosk') };
    });
    await context.close();
  }
  for (const scheme of ['dark', 'light']) {
    const { context, page } = await newPage({ width: 1440, height: 1000, scheme, dpr: 2 });
    await page.goto(`${base}/t/vaporwave/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.querySelector('.kiosk-prop-venus')?.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(600);
    await page.screenshot({ path: join(OUT, `kiosk-venus-zoom__${scheme}__1440dpr2.png`), clip: await clipOf(page, '.kiosk-prop-venus', 40, 30) });
    await context.close();
  }
}

/* ---------- Pipes and marble in full-window Preview over time ---------- */
if (want('pipes')) {
  results.pipes = {};
  for (const scheme of ['dark', 'light']) {
    const { context, page } = await newPage({ scheme });
    await page.goto(`${base}/t/vaporwave/contact/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.querySelector('.screensaver')?.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(400);
    // sunset -> marble
    await page.click('[data-scr-settings]'); await page.waitForTimeout(300);
    await page.click('[data-scr-preview-btn]');
    const mf = []; const ml = []; let t0 = Date.now();
    for (const t of [500, 1500, 3000, 5000]) { await page.waitForTimeout(Math.max(0, t - (Date.now() - t0))); mf.push(await page.screenshot()); ml.push(`marble +${(t / 1000).toFixed(1)}s`); }
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    await strip(mf, ml, `preview-marble-time__${scheme}.jpg`, { maxW: 480 });
    // marble -> pipes
    await page.click('[data-scr-settings]'); await page.waitForTimeout(300);
    const aria = await page.getAttribute('[data-scr-settings]', 'aria-label');
    await page.click('[data-scr-preview-btn]');
    const pf = []; const pl = []; t0 = Date.now();
    for (const t of [500, 2000, 5000, 9000, 14000, 18000]) { await page.waitForTimeout(Math.max(0, t - (Date.now() - t0))); pf.push(await page.screenshot()); pl.push(`pipes +${(t / 1000).toFixed(1)}s`); }
    await strip(pf, pl, `preview-pipes-time__${scheme}.jpg`, { maxW: 480 });
    // 1:1 crop of the middle of the pipes field at ~9s equivalent (the 5th frame is +14s)
    const im = await loadImage(pf[3]); const c = createCanvas(640, 400); c.getContext('2d').drawImage(im, 400, 250, 640, 400, 0, 0, 640, 400);
    await writeFile(join(OUT, `preview-pipes-1to1__${scheme}.png`), await c.encode('png'));
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    results.pipes[scheme] = { aria, focusBack: await page.evaluate(() => document.activeElement?.hasAttribute('data-scr-preview-btn')) };
    await context.close();
  }
}

/* ---------- Cross-school arrivals at About and Home via the REAL switcher ---------- */
if (want('arrive')) {
  results.arrive = {};
  for (const scheme of ['dark', 'light']) for (const [route, from] of [['about/', 'glassmorphism'], ['', 'glassmorphism'], ['about/', 'swiss'], ['', 'swiss']]) {
    const { context, page } = await newPage({ scheme });
    await page.goto(`${base}/t/${from}/${route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    // Scroll a bit then back to the top, as a visitor would before switching.
    await page.evaluate(() => window.scrollTo(0, 600)); await page.waitForTimeout(200);
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300);
    const frames = [await page.screenshot()]; const labels = [`${from} ${route || 'home'}`];
    await page.click('bdl-switcher .open');
    await page.waitForTimeout(350);
    frames.push(await page.screenshot()); labels.push('switcher open');
    await page.click('bdl-switcher a[data-school="vaporwave"]');
    const t0 = Date.now();
    for (const t of [150, 400, 900, 1600]) { await page.waitForTimeout(Math.max(0, t - (Date.now() - t0))); frames.push(await page.screenshot()); labels.push(`+${t}ms`); }
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'vaporwave', null, { timeout: 8000 }).catch(() => {});
    let extra = {};
    if (route) {
      await page.evaluate(() => document.querySelector('.centerpiece')?.scrollIntoView({ block: 'center' }));
      const live = await waitLive(page, 12000);
      const d1 = Number(await page.getAttribute('[data-marble-canvas]', 'data-draws').catch(() => 0));
      await page.waitForTimeout(6000);
      const d2 = Number(await page.getAttribute('[data-marble-canvas]', 'data-draws').catch(() => 0));
      frames.push(await page.screenshot()); labels.push('bust live, idle turning');
      extra = { live, idleDrawsOver6s: d2 - d1 };
    } else {
      const a = await px(await page.screenshot({ clip: { x: 0, y: 60, width: 1440, height: 600 } }));
      await page.waitForTimeout(1200);
      const b = await px(await page.screenshot({ clip: { x: 0, y: 60, width: 1440, height: 600 } }));
      extra = { heroChanged1_2s: diffShare(a, b) };
      frames.push(await page.screenshot()); labels.push('settled');
    }
    const st = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, path: location.pathname, scrollY, canvases: document.querySelectorAll('canvas').length }));
    results.arrive[`${scheme}-${from}->${route || 'home'}`] = { ...extra, ...st };
    await strip(frames, labels, `arrive-real__${route ? 'about' : 'home'}__${from}__${scheme}.jpg`, { maxW: 340 });
    await context.close();
  }
}

/* ---------- Attract loop on a phone, as a visitor sees it after tapping ---------- */
if (want('attractphone')) {
  results.attractphone = {};
  for (const scheme of ['dark', 'light']) {
    const { context, page } = await newPage({ width: 390, height: 844, scheme, mobile: true });
    await page.goto(`${base}/t/vaporwave/`, { waitUntil: 'networkidle' });
    // The visitor scrolls until the button is in view; tap it where it sits.
    await page.evaluate(() => document.querySelector('[data-kiosk-attract-btn]')?.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(500);
    const frames = [await page.screenshot()]; const labels = ['button centred'];
    await page.tap('[data-kiosk-attract-btn]');
    const t0 = Date.now();
    for (const t of [500, 2000, 4000]) { await page.waitForTimeout(Math.max(0, t - (Date.now() - t0))); frames.push(await page.screenshot()); labels.push(`+${(t / 1000).toFixed(1)}s`); }
    const geo = await page.evaluate(() => {
      const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom].map(Math.round); };
      return { vh: innerHeight, screen: r('[data-kiosk-attract-screen]'), kana: r('.attract-kana'), marquee: r('.attract-marquee'), btn: r('[data-kiosk-attract-btn]') };
    });
    results.attractphone[scheme] = geo;
    await strip(frames, labels, `attract-phone-visitor__${scheme}.jpg`, { maxW: 390 });
    await context.close();
  }
}

console.log(JSON.stringify(results, null, 1));
console.log('problems:', JSON.stringify([...new Set(problems)], null, 1));
await writeFile(join(OUT, `results-recritic${only.length ? '-' + only.join('-') : ''}.json`), JSON.stringify({ results, problems: [...new Set(problems)] }, null, 1));
await browser.close();
