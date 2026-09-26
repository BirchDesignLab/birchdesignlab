/**
 * Vaporwave B2 fix round 2, seat vw-fix-interact: films and stills for the
 * caption-press/drag fix (windows.ts), the attract loop layout fix
 * (Home.astro), the marble sphere size and the shaded-tube pipes
 * (screensaver.ts).
 *
 * Written 09-26-26. Reuses scripts/themes/vaporwave/b2-vw-critic.mjs's
 * helpers (strip, newPage, GPU launch, portal-prompt suppression) and the
 * glass B2 critic probe's `viaSwitcher` (a real cross-school arrival through
 * the portal's own switcher dialog, not a synthetic link).
 *
 * Usage (serve a snap first, e.g. snap.mjs --name b2fix-vw-interact --port 4473):
 *   BDL_GPU=1 node scripts/themes/vaporwave/b2fix-vw-interact.mjs \
 *     --base http://127.0.0.1:4473 [--only capdrag,attract,scr,arrive,light]
 * Outputs: scripts/themes/.out/stage3-b2/vw-fix-interact/
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'stage3-b2', 'vw-fix-interact');
await mkdir(OUT, { recursive: true });
const argOf = (n, f) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? f : process.argv[i + 1]; };
const base = argOf('base', 'http://127.0.0.1:4473');
const only = (argOf('only', '') || '').split(',').filter(Boolean);
const want = (k) => only.length === 0 || only.includes(k);

const gpu = process.env.BDL_GPU === '1';
const browser = await chromium.launch({
  args: ['--hide-scrollbars', '--font-render-hinting=none', '--disable-lcd-text',
    ...(gpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : [])],
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
  await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  await context.addInitScript(() => {
    const w = window; w.__ctx = [];
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      const c = orig.call(this, type, ...rest);
      if (c && !this.__ctxType) { this.__ctxType = type; w.__ctx.push({ type }); }
      return c;
    };
  });
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
  await writeFile(join(OUT, 'gpu.txt'), r + '\n');
  if (/swiftshader|llvmpipe/i.test(r)) { await browser.close(); throw new Error('software rasteriser'); }
}

async function strip(frames, labels, file, { maxW = 480, cols = frames.length } = {}) {
  const ims = await Promise.all(frames.map((b) => loadImage(b)));
  const scale = Math.min(1, maxW / ims[0].width);
  const w = Math.round(ims[0].width * scale), h = Math.round(ims[0].height * scale);
  const pad = 8, lab = 34;
  const rows = Math.ceil(ims.length / cols);
  const c = createCanvas(cols * (w + pad) + pad, rows * (h + lab + pad) + pad);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
  ims.forEach((im, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = pad + col * (w + pad);
    const y = pad + row * (h + lab + pad);
    ctx.fillStyle = '#111'; ctx.font = 'bold 20px sans-serif';
    ctx.fillText(labels[i] ?? '', x, y + 22);
    ctx.drawImage(im, x, y + lab, w, h);
  });
  await writeFile(join(OUT, file), await c.encode('jpeg', 92));
}

const clipOf = async (page, sel, padX = 40, padY = 40) => {
  const r = await page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; }, sel);
  if (!r) return null;
  const vw = page.viewportSize();
  const x = Math.max(0, r.x - padX), y = Math.max(0, r.y - padY);
  return { x, y, width: Math.min(vw.width - x, r.w + padX * 2), height: Math.min(vw.height - y, r.h + padY * 2) };
};

/** A real cross-school arrival, through the portal's own switcher dialog
    (as scripts/themes/glassmorphism/b2-glass-critic-probe.mjs's viaSwitcher
    does), clicking from the top of the page. */
async function viaSwitcher(page, school) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(150);
  await page.locator('.open[aria-haspopup="dialog"]').first().click();
  const link = page.locator(`a[data-school="${school}"]`).first();
  await link.waitFor({ state: 'visible', timeout: 5000 });
  await link.click();
}

await gpuCheck();

/* ---------- 1: caption press starts no drag ---------- */
if (want('capdrag')) {
  results.capdrag = {};
  const { context, page } = await newPage();
  await page.goto(`${base}/t/vaporwave/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.querySelector('.door-grid')?.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(500);
  const clip = await clipOf(page, '.door-grid', 120, 120);
  const cap = await page.evaluate(() => { const b = document.querySelector('.door-1 .vw-win-btns .min').getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
  const before = await page.evaluate(() => ({
    t: document.querySelector('.door-1').style.transform,
    in0: document.querySelector('.door-0 .vw-win-bar').classList.contains('inactive'),
    in1: document.querySelector('.door-1 .vw-win-bar').classList.contains('inactive'),
  }));
  const frames = [await page.screenshot({ clip })]; const labels = ['before'];
  await page.mouse.move(cap.x, cap.y); await page.mouse.down();
  frames.push(await page.screenshot({ clip })); labels.push('mouse down on caption: bevel inverts');
  const capDown = await page.evaluate(() => ({
    active: document.querySelector('.door-1 .vw-win-btns .min').matches(':active'),
    dragging: document.querySelector('.door-1').classList.contains('dragging'),
    lock: document.documentElement.classList.contains('vw-drag-lock'),
  }));
  // Move the pointer the way a real drag would, still held on the caption.
  for (let i = 1; i <= 10; i++) await page.mouse.move(cap.x + i * 12, cap.y + i * 6);
  frames.push(await page.screenshot({ clip })); labels.push('held + moved 120,60: no drag');
  const midMove = await page.evaluate(() => ({
    t: document.querySelector('.door-1').style.transform,
    dragging: document.querySelector('.door-1').classList.contains('dragging'),
  }));
  await page.mouse.up();
  frames.push(await page.screenshot({ clip })); labels.push('released');
  const after = await page.evaluate(() => ({
    t: document.querySelector('.door-1').style.transform,
    in0: document.querySelector('.door-0 .vw-win-bar').classList.contains('inactive'),
    in1: document.querySelector('.door-1 .vw-win-bar').classList.contains('inactive'),
    z: document.querySelector('.door-1').style.zIndex,
  }));
  await strip(frames, labels, 'caption-press-nodrag__dark.jpg', { maxW: 380 });
  results.capdrag = { before, capDown, midMove, after };
  // A real title-bar drag still works, and an in-school swap resets it.
  const bar = await page.evaluate(() => { const b = document.querySelector('.door-0 .vw-win-bar').getBoundingClientRect(); return { x: b.x + 60, y: b.y + b.height / 2 }; });
  const dframes = [await page.screenshot({ clip })]; const dlabels = ['before (door-0 back)'];
  await page.mouse.move(bar.x, bar.y); await page.mouse.down();
  dframes.push(await page.screenshot({ clip })); dlabels.push('bar pressed: front + active');
  for (let i = 1; i <= 10; i++) { await page.mouse.move(bar.x + i * 12, bar.y + i * 6); await page.waitForTimeout(16); }
  dframes.push(await page.screenshot({ clip })); dlabels.push('dragging +120,+60');
  await page.mouse.up();
  dframes.push(await page.screenshot({ clip })); dlabels.push('released, dragged');
  await strip(dframes, dlabels, 'title-drag__dark.jpg', { maxW: 380 });
  const dragged = await page.evaluate(() => document.querySelector('.door-0').style.transform);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.click('a[href="/t/vaporwave/services/"]').catch(() => {});
  await page.waitForTimeout(1500);
  const svcShot = await page.screenshot();
  await page.goBack(); await page.waitForTimeout(1500);
  await page.evaluate(() => document.querySelector('.door-grid')?.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(300);
  const homeAfterShot = await page.screenshot({ clip: await clipOf(page, '.door-grid', 120, 120) });
  await strip([svcShot, homeAfterShot], ['in-school swap: Services', 'back on Home: drag reset'], 'title-drag-swap__dark.jpg', { maxW: 500 });
  const resetState = await page.evaluate(() => ({
    t: document.querySelector('.door-0').style.transform,
    in0: document.querySelector('.door-0 .vw-win-bar').classList.contains('inactive'),
  }));
  results.capdrag.drag = { dragged, resetState };
  await context.close();
}

/* ---------- 2: attract loop, light+dark, desktop+phone, tap to return ---------- */
if (want('attract')) {
  results.attract = {};
  for (const [vpName, w, h, mobile] of [['desktop', 1440, 900, false], ['phone', 390, 844, true]]) {
    for (const scheme of ['dark', 'light']) {
      const { context, page } = await newPage({ width: w, height: h, scheme, mobile });
      await page.goto(`${base}/t/vaporwave/`, { waitUntil: 'networkidle' });
      // The CRT screen itself, not the whole (much taller on phone) kiosk:
      // .kiosk overruns an 844px phone viewport, so centering on it left the
      // screen mostly scrolled out of the clip. The kiosk's own still images
      // (the sphere, the Venus still) decode after networkidle and shift the
      // layout above the fold, which Chrome's scroll anchoring then corrects
      // by moving scrollY on its own: settle on those before scrolling, and
      // scroll twice, so the second lands after any anchoring has happened.
      await page.evaluate(() => Promise.all([...document.querySelectorAll('.kiosk img')].map((img) => img.decode().catch(() => {}))));
      await page.evaluate(() => document.querySelector('.screen')?.scrollIntoView({ block: 'center' }));
      await page.waitForTimeout(400);
      await page.evaluate(() => document.querySelector('.screen')?.scrollIntoView({ block: 'center' }));
      await page.waitForTimeout(300);
      const clip = await clipOf(page, '.screen', 10, 10);
      const f0 = await page.screenshot({ clip });
      await page.click('[data-kiosk-attract-btn]');
      const tc = Date.now();
      const frames = [f0]; const labels = ['before'];
      for (const t of [400, 1500, 3000, 4500, 5300, 6000]) {
        await page.waitForTimeout(Math.max(0, t - (Date.now() - tc)));
        frames.push(await page.screenshot({ clip })); labels.push(`+${(t / 1000).toFixed(1)}s`);
      }
      await strip(frames, labels, `attract-loop__${scheme}__${vpName}.jpg`, { maxW: 300, cols: 4 });
      const geo = await page.evaluate(() => {
        const scr = document.querySelector('.crt-attract').getBoundingClientRect();
        const kana = document.querySelector('.attract-kana').getBoundingClientRect();
        const marquee = document.querySelector('.attract-marquee').getBoundingClientRect();
        const track = getComputedStyle(document.querySelector('.crt-attract')).gridTemplateColumns;
        return {
          screen: [scr.x, scr.y, scr.width, scr.height].map(Math.round),
          kana: [kana.x, kana.y, kana.width, kana.height].map(Math.round),
          marquee: [marquee.x, marquee.y, marquee.width, marquee.height].map(Math.round),
          kanaInsideScreen: kana.x >= scr.x - 1 && kana.x + kana.width <= scr.x + scr.width + 1,
          trackWidth: track,
          on: document.querySelector('[data-kiosk-attract-screen]').classList.contains('on'),
        };
      });
      results.attract[`${scheme}-${vpName}`] = geo;
      await context.close();
    }
  }
}

/* ---------- 3: screensaver loops (marble bigger, pipes shaded) + Preview ---------- */
if (want('scr')) {
  results.scr = {};
  for (const scheme of ['dark', 'light']) {
    const { context, page } = await newPage({ scheme });
    await page.goto(`${base}/t/vaporwave/contact/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.querySelector('.screensaver')?.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(500);
    const clip = await clipOf(page, '.screensaver', 16, 16);
    // Cycle to marble.
    await page.click('[data-scr-settings]'); await page.waitForTimeout(500);
    const mFrames = []; const mLabels = [];
    for (const t of [0, 400, 900, 1500, 2400]) {
      if (t) await page.waitForTimeout(400);
      mFrames.push(await page.screenshot({ clip })); mLabels.push(`marble +${t}ms`);
    }
    await strip(mFrames, mLabels, `scr-marble-loop__${scheme}.jpg`, { maxW: 260, cols: 5 });
    const marbleGeo = await page.evaluate(() => {
      const box = document.querySelector('.scr-canvas.on') || document.querySelector('[data-scr-canvas]');
      const r = box.getBoundingClientRect();
      return { boxH: r.height, sphereTargetFraction: 1 / 3 };
    });
    // Preview marble now, while it is still the current mode (a mode switch
    // below would otherwise leave a "marble" capture showing pipes instead).
    await page.click('[data-scr-preview-btn]'); await page.waitForTimeout(900);
    const pvMarble1 = await page.screenshot();
    await page.waitForTimeout(700);
    const pvMarble2 = await page.screenshot();
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    const closedFocus = await page.evaluate(() => document.activeElement?.hasAttribute('data-scr-preview-btn'));
    // Cycle to pipes.
    await page.click('[data-scr-settings]'); await page.waitForTimeout(500);
    const pFrames = []; const pLabels = [];
    for (const t of [0, 500, 1200, 2200, 3200]) {
      if (t) await page.waitForTimeout(500);
      pFrames.push(await page.screenshot({ clip })); pLabels.push(`pipes +${t}ms`);
    }
    await strip(pFrames, pLabels, `scr-pipes-loop__${scheme}.jpg`, { maxW: 260, cols: 5 });
    results.scr[scheme] = { marbleGeo, ariaLabel: await page.getAttribute('[data-scr-settings]', 'aria-label') };
    // Preview pipes, still the current mode.
    await page.click('[data-scr-preview-btn]'); await page.waitForTimeout(1000);
    const pvPipes1 = await page.screenshot();
    await page.waitForTimeout(900);
    const pvPipes2 = await page.screenshot();
    await page.mouse.click(700, 450); await page.waitForTimeout(300);
    await strip([pvMarble1, pvMarble2, pvPipes1, pvPipes2],
      ['Preview: marble t0', 'Preview: marble +0.7s', 'Preview: pipes t0', 'Preview: pipes +0.9s'],
      `scr-preview-loops__${scheme}.jpg`, { maxW: 460, cols: 2 });
    results.scr[scheme].closedFocusIsPreview = closedFocus;
    await context.close();
  }
  // Phone check that the window and both loops still show.
  const { context, page } = await newPage({ width: 390, height: 844, mobile: true });
  await page.goto(`${base}/t/vaporwave/contact/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.querySelector('.screensaver')?.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(500);
  await page.click('[data-scr-settings]'); await page.waitForTimeout(500);
  const phoneShot = await page.screenshot({ clip: await clipOf(page, '.screensaver', 10, 10) });
  await writeFile(join(OUT, 'scr-phone-marble__dark__390.png'), phoneShot);
  await context.close();
}

/* ---------- 4: light-scheme stills of every new element ---------- */
if (want('light')) {
  results.light = {};
  const { context, page } = await newPage({ scheme: 'light' });
  await page.goto(`${base}/t/vaporwave/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.querySelector('.kiosk-touch')?.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, 'light-kiosk-button__light.png'), clip: await clipOf(page, '.kiosk-stand', 20, 20) });
  await context.close();
  const { context: c2, page: p2 } = await newPage({ scheme: 'light' });
  await p2.goto(`${base}/t/vaporwave/contact/`, { waitUntil: 'networkidle' });
  await p2.evaluate(() => document.querySelector('.screensaver')?.scrollIntoView({ block: 'center' }));
  await p2.waitForTimeout(400);
  await p2.screenshot({ path: join(OUT, 'light-screensaver-window__light.png'), clip: await clipOf(p2, '.screensaver', 16, 16) });
  await context.close();
}

/* ---------- 5: real cross-school arrivals via the switcher ---------- */
if (want('arrive')) {
  results.arrive = {};
  for (const scheme of ['dark', 'light']) {
    for (const [route, sel] of [['home', '.hero'], ['contact', '.desk']]) {
      const { context, page } = await newPage({ scheme });
      await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      const frames = []; const labels = [];
      const before = await page.screenshot();
      frames.push(before); labels.push('before (glassmorphism)');
      await viaSwitcher(page, 'vaporwave');
      const t0 = Date.now();
      for (const t of [200, 500, 1000]) {
        await page.waitForTimeout(Math.max(0, t - (Date.now() - t0)));
        frames.push(await page.screenshot()); labels.push(`+${t}ms`);
      }
      await page.waitForFunction(() => document.documentElement.dataset.theme === 'vaporwave', null, { timeout: 8000 }).catch(() => {});
      if (route === 'contact') {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.click('header a[href="/t/vaporwave/contact/"], nav a[href="/t/vaporwave/contact/"]').catch(async () => {
          await page.evaluate(() => document.querySelector('a[href="/t/vaporwave/contact/"]')?.click());
        });
        await page.waitForTimeout(1200);
      }
      await page.waitForTimeout(400);
      frames.push(await page.screenshot()); labels.push('settled');
      await strip(frames, labels, `arrive-${route}__${scheme}.jpg`, { maxW: 300, cols: 3 });
      const st = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, path: location.pathname, canvases: document.querySelectorAll('canvas').length }));
      results.arrive[`${scheme}-${route}`] = st;
      await context.close();
    }
  }
}

console.log(JSON.stringify(results, null, 1));
console.log('problems:', JSON.stringify([...new Set(problems)], null, 1));
await writeFile(join(OUT, 'results.json'), JSON.stringify({ results, problems: [...new Set(problems)] }, null, 1));
await browser.close();
