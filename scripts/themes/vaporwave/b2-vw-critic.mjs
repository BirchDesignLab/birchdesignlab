/**
 * Vaporwave B2 critic probe (Tier 3 Stage 3, wave B2, seat b2-vw-critic).
 *
 * Written 09-25-26. Makes the critic's own GPU evidence for the B2 vaporwave
 * work (live Venus bust, Venus stills, window drag, caption press, the
 * screensaver loops and Preview, the kiosk attract loop, cross-school
 * arrivals) and prints a JSON table of probe results. Every strip is a
 * labelled JPEG q92 (labels 22 px).
 *
 * Usage (serve a snap first, e.g. snap.mjs --name b2-vw-critic --port 4479):
 *   BDL_GPU=1 node scripts/themes/vaporwave/b2-vw-critic.mjs \
 *     --base http://127.0.0.1:4479 [--only about,kiosk,scr,attract,drag,bust,arrive,a11y,leak,touch]
 * Outputs: scripts/themes/.out/stage3-b2/vw-critic/
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'stage3-b2', 'vw-critic');
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

async function newPage({ width = 1440, height = 900, scheme = 'dark', mobile = false } = {}) {
  const context = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: mobile ? 2 : 1,
    isMobile: mobile, hasTouch: mobile, colorScheme: scheme, reducedMotion: 'no-preference',
  });
  await suppressPrompt(context);
  await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); localStorage.setItem('theme', s); } catch {} }, scheme);
  await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  // Record every context a page asks for, by canvas, so a second WebGL
  // context (or one that is never released) shows.
  await context.addInitScript(() => {
    const w = window; w.__ctx = [];
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      const c = orig.call(this, type, ...rest);
      if (c && !this.__ctxType) { this.__ctxType = type; w.__ctx.push({ type, cls: this.className || this.dataset && Object.keys(this.dataset).join(' ') }); }
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

async function strip(frames, labels, file, { maxW = 480 } = {}) {
  const ims = await Promise.all(frames.map((b) => loadImage(b)));
  const scale = Math.min(1, maxW / ims[0].width);
  const w = Math.round(ims[0].width * scale), h = Math.round(ims[0].height * scale);
  const pad = 8, lab = 34;
  const c = createCanvas(ims.length * (w + pad) + pad, h + lab + pad * 2);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
  ims.forEach((im, i) => {
    const x = pad + i * (w + pad);
    ctx.fillStyle = '#111'; ctx.font = 'bold 22px sans-serif';
    ctx.fillText(labels[i] ?? '', x, pad + 24);
    ctx.drawImage(im, x, pad + lab, w, h);
  });
  await writeFile(join(OUT, file), await c.encode('jpeg', 92));
}

function diffShare(a, b) {
  let n = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    const d = Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]);
    if (d > 24) n++;
  }
  return n / (a.width * a.height);
}
async function px(buf) {
  const im = await loadImage(buf); const c = createCanvas(im.width, im.height); const x = c.getContext('2d');
  x.drawImage(im, 0, 0); return x.getImageData(0, 0, im.width, im.height);
}
const clipOf = async (page, sel, padX = 40, padY = 40) => {
  const r = await page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; }, sel);
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

/* ---------- About: full page + plinth crops, poster vs first live frame ---------- */
if (want('about')) {
  results.about = {};
  const vps = [['desktop', 1440, 900, false], ['820', 820, 1180, true], ['390', 390, 844, true]];
  for (const scheme of ['dark', 'light']) {
    for (const [name, w, h, mobile] of vps) {
      const { context, page } = await newPage({ width: w, height: h, scheme, mobile });
      // Block the live-bust chunk for the poster pass so the poster is what shows.
      await page.goto(`${base}/t/vaporwave/about/`, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.querySelector('.centerpiece')?.scrollIntoView({ block: 'center' }));
      await page.waitForTimeout(400);
      const clip = await clipOf(page, '.centerpiece', 60, 60);
      const live = await waitLive(page);
      // Idle turn starts 4 s after mount; the fade is 200 ms, so shoot now.
      await page.waitForTimeout(300);
      const liveShot = await page.screenshot({ clip });
      await writeFile(join(OUT, `about-plinth__${scheme}__${name}.png`), liveShot);
      const geo = await page.evaluate(() => {
        const st = document.querySelector('.centerpiece-stage').getBoundingClientRect();
        const top = document.querySelector('.tier-top').getBoundingClientRect();
        return { stage: [st.x, st.y, st.width, st.height].map(Math.round), tierTop: [top.x, top.y, top.width, top.height].map(Math.round),
          dpr: devicePixelRatio, canvasBuf: [document.querySelector('[data-marble-canvas]').width, document.querySelector('[data-marble-canvas]').height],
          ctx: window.__ctx };
      });
      results.about[`${scheme}-${name}`] = { live, ...geo };
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(300);
      await page.screenshot({ path: join(OUT, `about-full__${scheme}__${name}.png`), fullPage: true });
      await context.close();
    }
  }
  // Poster vs first live frame (desktop dark): shoot the stage with the live
  // chunk blocked (poster only), then unblocked right after the fade.
  for (const scheme of ['dark', 'light']) {
    const a = await newPage({ scheme });
    await a.context.route('**/live-bust*.js', (r) => r.abort());
    await a.page.goto(`${base}/t/vaporwave/about/`, { waitUntil: 'networkidle' });
    await a.page.evaluate(() => document.querySelector('.centerpiece')?.scrollIntoView({ block: 'center' }));
    await a.page.waitForTimeout(1500);
    const clipA = await clipOf(a.page, '.centerpiece-stage', 0, 0);
    const poster = await a.page.screenshot({ clip: clipA });
    await a.context.close();
    const b = await newPage({ scheme });
    await b.page.goto(`${base}/t/vaporwave/about/`, { waitUntil: 'networkidle' });
    await b.page.evaluate(() => document.querySelector('.centerpiece')?.scrollIntoView({ block: 'center' }));
    await waitLive(b.page); await b.page.waitForTimeout(250);
    const clipB = await clipOf(b.page, '.centerpiece-stage', 0, 0);
    const first = await b.page.screenshot({ clip: clipB });
    await b.context.close();
    const share = diffShare(await px(poster), await px(first));
    results.about[`posterVsLive-${scheme}`] = { clipA, clipB, changedShare: share };
    await strip([poster, first], ['poster (live chunk blocked)', `first live frame (${(share * 100).toFixed(2)}% px changed)`], `about-poster-vs-live__${scheme}.jpg`, { maxW: 520 });
  }
}

/* ---------- Home kiosk crops ---------- */
if (want('kiosk')) {
  results.kiosk = {};
  for (const scheme of ['dark', 'light']) for (const w of [1440, 1024]) {
    const { context, page } = await newPage({ width: w, height: 1000, scheme });
    await page.goto(`${base}/t/vaporwave/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.querySelector('.kiosk')?.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(600);
    const clip = await clipOf(page, '.kiosk', 30, 30);
    await page.screenshot({ path: join(OUT, `kiosk__${scheme}__${w}.png`), clip });
    results.kiosk[`${scheme}-${w}`] = await page.evaluate(() => {
      const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom].map(Math.round); };
      return { stand: r('.kiosk-stand'), foot: r('.stand-foot'), sphere: r('.kiosk-prop:not(.kiosk-prop-venus)'), venus: r('.kiosk-prop-venus'), kiosk: r('.kiosk'), ctx: window.__ctx };
    });
    await context.close();
  }
}

/* ---------- Contact screensaver: each loop, Preview, focus return, phone ---------- */
if (want('scr')) {
  results.scr = {};
  for (const scheme of ['dark', 'light']) {
    const { context, page } = await newPage({ scheme });
    await page.goto(`${base}/t/vaporwave/contact/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.querySelector('.screensaver')?.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(500);
    const clip = await clipOf(page, '.screensaver', 16, 16);
    const frames = []; const labels = []; const labelsAria = [];
    for (let m = 0; m < 3; m++) {
      if (m > 0) { await page.click('[data-scr-settings]'); await page.waitForTimeout(700); }
      const f1 = await page.screenshot({ clip }); await page.waitForTimeout(900);
      const f2 = await page.screenshot({ clip });
      frames.push(f1, f2);
      const lab = await page.getAttribute('[data-scr-settings]', 'aria-label');
      labelsAria.push(lab);
      const name = ['sunset', 'marble', 'pipes'][m];
      labels.push(`${name} t0`, `${name} +0.9s (${(diffShare(await px(f1), await px(f2)) * 100).toFixed(1)}%)`);
    }
    await strip(frames, labels, `scr-loops__${scheme}.jpg`, { maxW: 360 });
    // Pipes is current; open Preview with the keyboard (Enter), shoot, close with a key.
    await page.focus('[data-scr-preview-btn]');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1200);
    const pv1 = await page.screenshot();
    const openState = await page.evaluate(() => ({ hidden: document.querySelector('[data-scr-fullscreen]').hidden, active: document.activeElement?.getAttribute('data-scr-preview-btn') !== null ? 'preview' : document.activeElement?.tagName }));
    await page.keyboard.press('a');
    await page.waitForTimeout(300);
    const closeState = await page.evaluate(() => ({ hidden: document.querySelector('[data-scr-fullscreen]').hidden, focusIsPreview: document.activeElement?.hasAttribute('data-scr-preview-btn') }));
    // Cycle back to sunset and Preview it via mouse, close by click.
    await page.click('[data-scr-settings]'); await page.waitForTimeout(300);
    await page.click('[data-scr-preview-btn]'); await page.waitForTimeout(800);
    const pv2 = await page.screenshot();
    await page.mouse.click(700, 450); await page.waitForTimeout(300);
    const closeState2 = await page.evaluate(() => ({ hidden: document.querySelector('[data-scr-fullscreen]').hidden, focusIsPreview: document.activeElement?.hasAttribute('data-scr-preview-btn') }));
    // Marble full-window
    await page.click('[data-scr-settings]'); await page.waitForTimeout(300);
    await page.click('[data-scr-preview-btn]'); await page.waitForTimeout(1200);
    const pv3 = await page.screenshot();
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    await strip([pv2, pv3, pv1], ['Preview: sunset', 'Preview: marble', 'Preview: pipes (opened with Enter)'], `scr-preview__${scheme}.jpg`, { maxW: 560 });
    results.scr[scheme] = { ariaLabels: labelsAria, openState, closeState, closeState2, ctx: await page.evaluate(() => window.__ctx) };
    // Off-screen pause: scroll the screensaver away, count 2D draws via canvas pixel change.
    await context.close();
  }
  // Phone: the window shows.
  const { context, page } = await newPage({ width: 390, height: 844, mobile: true });
  await page.goto(`${base}/t/vaporwave/contact/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.querySelector('.screensaver')?.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(500);
  results.scr.phone = await page.evaluate(() => { const e = document.querySelector('.screensaver'); const b = e.getBoundingClientRect(); return { display: getComputedStyle(e.closest('.side-scene')).display, rect: [b.x, b.y, b.width, b.height].map(Math.round), overflow: document.documentElement.scrollWidth - innerWidth }; });
  await page.screenshot({ path: join(OUT, 'scr-phone__dark__390.png') });
  await context.close();
}

/* ---------- Kiosk attract loop ---------- */
if (want('attract')) {
  results.attract = {};
  for (const scheme of ['dark', 'light']) {
    const { context, page } = await newPage({ scheme });
    await page.goto(`${base}/t/vaporwave/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.querySelector('.kiosk')?.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(500);
    const clip = await clipOf(page, '.kiosk', 10, 10);
    const f0 = await page.screenshot({ clip });
    await page.click('[data-kiosk-attract-btn]');
    const tc = Date.now();
    const frames = [f0]; const labels = ['before'];
    for (const t of [400, 2000, 4200, 6000]) {
      await page.waitForTimeout(Math.max(0, t - (Date.now() - tc)));
      frames.push(await page.screenshot({ clip })); labels.push(`+${(t / 1000).toFixed(1)}s`);
    }
    await strip(frames, labels, `attract__${scheme}.jpg`, { maxW: 420 });
    // Keyboard: tab into the CRT links while playing.
    await page.click('[data-kiosk-attract-btn]');
    const reach = await page.evaluate(() => {
      const links = [...document.querySelectorAll('.kiosk a')];
      return links.map((a) => { a.focus(); return { text: a.textContent.trim().slice(0, 30), focused: document.activeElement === a, hiddenAncestor: !!a.closest('[aria-hidden="true"]') }; });
    });
    results.attract[scheme] = { reach, on: await page.evaluate(() => document.querySelector('[data-kiosk-attract-screen]').classList.contains('on')), ctx: await page.evaluate(() => window.__ctx) };
    await context.close();
  }
}

/* ---------- Window drag strip + caption press + swap reset ---------- */
if (want('drag')) {
  results.drag = {};
  const { context, page } = await newPage();
  await page.goto(`${base}/t/vaporwave/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.querySelector('.door-grid')?.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(500);
  const clip = await clipOf(page, '.door-grid', 120, 120);
  const bar = await page.evaluate(() => { const b = document.querySelector('.door-0 .vw-win-bar').getBoundingClientRect(); return { x: b.x + 60, y: b.y + b.height / 2 }; });
  const frames = [await page.screenshot({ clip })]; const labels = ['before (door-0 back)'];
  await page.mouse.move(bar.x, bar.y); await page.mouse.down();
  frames.push(await page.screenshot({ clip })); labels.push('pressed: front + active');
  for (let i = 1; i <= 10; i++) await page.mouse.move(bar.x + i * 12, bar.y + i * 6);
  const selDuring = await page.evaluate(() => String(getSelection()));
  frames.push(await page.screenshot({ clip })); labels.push('dragging +120,+60');
  await page.mouse.up();
  frames.push(await page.screenshot({ clip })); labels.push('released');
  const st = await page.evaluate(() => ({
    t0: document.querySelector('.door-0').style.transform, z0: document.querySelector('.door-0').style.zIndex,
    in0: document.querySelector('.door-0 .vw-win-bar').classList.contains('inactive'), in1: document.querySelector('.door-1 .vw-win-bar').classList.contains('inactive'),
    lock: document.documentElement.classList.contains('vw-drag-lock'),
  }));
  // Clamp: drag far off the viewport.
  const bar2 = await page.evaluate(() => { const b = document.querySelector('.door-0 .vw-win-bar').getBoundingClientRect(); return { x: b.x + 60, y: b.y + b.height / 2 }; });
  await page.mouse.move(bar2.x, bar2.y); await page.mouse.down();
  await page.mouse.move(-500, -800, { steps: 8 }); await page.mouse.up();
  const clamp = await page.evaluate(() => { const b = document.querySelector('.door-0').getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom].map(Math.round); });
  frames.push(await page.screenshot({ clip })); labels.push('dragged past top-left: clamped');
  await strip(frames, labels, 'window-drag__dark__desktop.jpg', { maxW: 420 });
  // Caption press with a real mouse (min button of door-1).
  const cap = await page.evaluate(() => { const b = document.querySelector('.door-1 .vw-win-btns .min').getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
  const capBefore = await page.evaluate(() => getComputedStyle(document.querySelector('.door-1 .vw-win-btns .min')).borderTopColor);
  await page.mouse.move(cap.x, cap.y); await page.mouse.down();
  await page.waitForTimeout(100);
  const capDown = await page.evaluate(() => ({ top: getComputedStyle(document.querySelector('.door-1 .vw-win-btns .min')).borderTopColor, active: document.querySelector('.door-1 .vw-win-btns .min').matches(':active'), dragging: document.querySelector('.door-1').classList.contains('dragging') }));
  const capClip = await clipOf(page, '.door-1 .vw-win-bar', 10, 10);
  const capShot = await page.screenshot({ clip: capClip });
  await page.mouse.move(cap.x + 30, cap.y + 10);
  const tAfterCapMove = await page.evaluate(() => document.querySelector('.door-1').style.transform);
  await page.mouse.up();
  const capUp = await page.evaluate(() => getComputedStyle(document.querySelector('.door-1 .vw-win-btns .min')).borderTopColor);
  await page.mouse.move(cap.x, cap.y); const capRel = await page.screenshot({ clip: capClip });
  await strip([capShot, capRel], ['caption min held', 'released'], 'caption-press__dark.jpg', { maxW: 600 });
  // In-school swap: go Services, then back Home, windows untouched.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.click('a[href="/t/vaporwave/services/"]').catch(() => {});
  await page.waitForTimeout(1500);
  const svc = await page.evaluate(() => ({ path: location.pathname, t: [...document.querySelectorAll('.vw-win')].map((w) => w.style.transform).filter(Boolean), lock: document.documentElement.classList.contains('vw-drag-lock') }));
  await page.goBack(); await page.waitForTimeout(1500);
  const home = await page.evaluate(() => ({ path: location.pathname, t: [...document.querySelectorAll('.vw-win')].map((w) => w.style.transform).filter(Boolean), in0: document.querySelector('.door-0 .vw-win-bar')?.classList.contains('inactive') }));
  results.drag = { st, selDuring, clamp, viewport: page.viewportSize(), capBefore, capDown, capUp, tAfterCapMove, svc, home };
  await context.close();
  // Touch: no drag.
  const t = await newPage({ width: 390, height: 844, mobile: true });
  await t.page.goto(`${base}/t/vaporwave/`, { waitUntil: 'networkidle' });
  results.drag.touch = await t.page.evaluate(() => ({ mq: matchMedia('(hover: hover) and (pointer: fine)').matches, cursor: getComputedStyle(document.querySelector('.vw-win-bar')).cursor, ta: getComputedStyle(document.querySelector('.vw-win-bar')).touchAction }));
  await t.context.close();
}

/* ---------- Live bust: drag strip, glide, idle, keyboard ---------- */
if (want('bust')) {
  results.bust = {};
  const { context, page } = await newPage();
  await page.goto(`${base}/t/vaporwave/about/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.querySelector('.centerpiece')?.scrollIntoView({ block: 'center' }));
  const live = await waitLive(page);
  await page.waitForTimeout(300);
  const clip = await clipOf(page, '.centerpiece-stage', 10, 10);
  const c = await page.evaluate(() => { const b = document.querySelector('[data-marble-canvas]').getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height * 0.4, w: b.width }; });
  const frames = [await page.screenshot({ clip })]; const labels = ['live, rest'];
  const d0 = Number(await page.getAttribute('[data-marble-canvas]', 'data-draws'));
  await page.mouse.move(c.x - c.w * 0.3, c.y); await page.mouse.down();
  await page.mouse.move(c.x, c.y, { steps: 6 });
  frames.push(await page.screenshot({ clip })); labels.push('mid-drag +0.3w (held)');
  await page.waitForTimeout(400);
  const heldA = await page.screenshot({ clip });
  const heldShare = diffShare(await px(frames[1]), await px(heldA));
  await page.mouse.move(c.x + c.w * 0.3, c.y, { steps: 3 });
  await page.mouse.up();
  frames.push(await page.screenshot({ clip })); labels.push('flick released');
  await page.waitForTimeout(350); frames.push(await page.screenshot({ clip })); labels.push('+350ms glide');
  await page.waitForTimeout(1200); const g2 = await page.screenshot({ clip }); frames.push(g2); labels.push('+1.55s');
  await page.waitForTimeout(800); const g3 = await page.screenshot({ clip }); frames.push(g3); labels.push('+2.35s (stopped?)');
  const stoppedShare = diffShare(await px(g2), await px(g3));
  const dStop1 = Number(await page.getAttribute('[data-marble-canvas]', 'data-draws'));
  await page.waitForTimeout(1000);
  const dStop2 = Number(await page.getAttribute('[data-marble-canvas]', 'data-draws'));
  await page.waitForTimeout(3500);
  const i1 = await page.screenshot({ clip }); const di1 = Number(await page.getAttribute('[data-marble-canvas]', 'data-draws'));
  await page.waitForTimeout(2000);
  const i2 = await page.screenshot({ clip }); const di2 = Number(await page.getAttribute('[data-marble-canvas]', 'data-draws'));
  frames.push(i2); labels.push('idle turn (+~7s)');
  await strip(frames, labels, 'bust-drag__dark__desktop.jpg', { maxW: 300 });
  // Keyboard
  await page.focus('[data-marble-canvas]');
  const k0 = await page.screenshot({ clip });
  for (let i = 0; i < 15; i++) await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(150);
  const k1 = await page.screenshot({ clip });
  await strip([k0, k1], ['focused', '15x ArrowLeft'], 'bust-keys__dark.jpg', { maxW: 420 });
  // Off-screen pause
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(6000);
  const off1 = Number(await page.getAttribute('[data-marble-canvas]', 'data-draws'));
  await page.waitForTimeout(1500);
  const off2 = Number(await page.getAttribute('[data-marble-canvas]', 'data-draws'));
  const a11y = await page.evaluate(() => { const cv = document.querySelector('[data-marble-canvas]'); return { role: cv.getAttribute('role'), label: cv.getAttribute('aria-label'), tab: cv.tabIndex, hiddenAncestor: cv.parentElement.closest('[aria-hidden="true"]')?.className ?? null, cursor: getComputedStyle(cv).cursor, ta: getComputedStyle(cv).touchAction, buf: [cv.width, cv.height], css: [cv.clientWidth, cv.clientHeight], dpr: devicePixelRatio }; });
  results.bust = { live, d0, heldShare, stoppedShare, drawsWhileStopped: dStop2 - dStop1, idleDraws2s: di2 - di1, idleShare: diffShare(await px(i1), await px(i2)), offscreenDraws1_5s: off2 - off1, a11y, ctx: await page.evaluate(() => window.__ctx) };
  // Hidden tab pause via CDP page lifecycle is awkward headless; skip.
  // Context loss / restore
  results.bust.ctxLoss = await page.evaluate(async () => {
    const cv = document.querySelector('[data-marble-canvas]');
    cv.scrollIntoView({ block: 'center' });
    await new Promise((r) => setTimeout(r, 500));
    const gl = cv.getContext('webgl2') || cv.getContext('webgl');
    const ext = gl.getExtension('WEBGL_lose_context');
    ext.loseContext();
    await new Promise((r) => setTimeout(r, 400));
    const lost = { role: cv.getAttribute('role'), hidden: cv.getAttribute('aria-hidden'), poster: getComputedStyle(document.querySelector('[data-marble-poster]')).opacity };
    ext.restoreContext();
    await new Promise((r) => setTimeout(r, 3000));
    const restored = { role: cv.getAttribute('role'), hidden: cv.getAttribute('aria-hidden'), poster: getComputedStyle(document.querySelector('[data-marble-poster]')).opacity, draws: cv.dataset.draws };
    return { lost, restored };
  });
  await page.screenshot({ path: join(OUT, 'bust-after-restore__dark.png'), clip: await clipOf(page, '.centerpiece-stage', 10, 10) });
  await context.close();
}

/* ---------- Touch on the bust (CDP touch events) ---------- */
if (want('touch')) {
  const { context, page, cdp } = await newPage({ width: 390, height: 844, mobile: true });
  await page.goto(`${base}/t/vaporwave/about/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.querySelector('.centerpiece')?.scrollIntoView({ block: 'center' }));
  const live = await waitLive(page);
  await page.waitForTimeout(300);
  const c = await page.evaluate(() => { const b = document.querySelector('[data-marble-canvas]').getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, w: b.width }; });
  const clip = await clipOf(page, '.centerpiece-stage', 10, 10);
  const t0 = await page.screenshot({ clip });
  const touch = async (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  await touch('touchStart', c.x - 60, c.y);
  for (let i = 1; i <= 8; i++) { await touch('touchMove', c.x - 60 + i * 15, c.y); await page.waitForTimeout(16); }
  await touch('touchEnd');
  await page.waitForTimeout(100);
  const t1 = await page.screenshot({ clip });
  const sy0 = await page.evaluate(() => scrollY);
  await touch('touchStart', c.x, c.y + 40);
  for (let i = 1; i <= 8; i++) { await touch('touchMove', c.x, c.y + 40 - i * 20); await page.waitForTimeout(16); }
  await touch('touchEnd');
  await page.waitForTimeout(600);
  const sy1 = await page.evaluate(() => scrollY);
  await strip([t0, t1], ['phone live', 'after horizontal touch drag'], 'bust-touch__dark__390.jpg', { maxW: 360 });
  results.touch = { live, hTurnShare: diffShare(await px(t0), await px(t1)), verticalSwipeScrolled: sy1 - sy0, dpr: await page.evaluate(() => { const cv = document.querySelector('[data-marble-canvas]'); return { buf: cv.width, css: cv.clientWidth }; }) };
  await context.close();
}

/* ---------- Cross-school arrivals: About and Home ---------- */
if (want('arrive')) {
  results.arrive = {};
  for (const scheme of ['dark', 'light']) for (const [route, sel] of [['/t/vaporwave/about/', '.centerpiece'], ['/t/vaporwave/', '.hero']]) {
    for (const from of ['glassmorphism', 'swiss']) {
      const { context, page } = await newPage({ scheme });
      await page.goto(`${base}/t/${from}${route.replace('/t/vaporwave', '')}`, { waitUntil: 'networkidle' });
      await page.evaluate((to) => {
        window.scrollTo(0, 0);
        const a = document.createElement('a'); a.href = to; a.textContent = 'go'; a.id = 'critic-go';
        a.style.cssText = 'position:fixed;left:8px;top:8px;z-index:99999'; document.body.append(a); a.click();
      }, route);
      const frames = []; const labels = [];
      const t0 = Date.now();
      for (const t of [150, 400, 800, 1500]) { await page.waitForTimeout(Math.max(0, t - (Date.now() - t0))); frames.push(await page.screenshot({ clip: { x: 0, y: 0, width: 1440, height: 900 } })); labels.push(`+${t}ms`); }
      await page.waitForFunction(() => document.documentElement.dataset.theme === 'vaporwave', null, { timeout: 8000 }).catch(() => {});
      let extra = {};
      if (route.includes('about')) {
        const live = await waitLive(page, 12000);
        const d1 = Number(await page.getAttribute('[data-marble-canvas]', 'data-draws').catch(() => 0));
        await page.waitForTimeout(6000);
        const d2 = Number(await page.getAttribute('[data-marble-canvas]', 'data-draws').catch(() => 0));
        frames.push(await page.screenshot({ clip: { x: 0, y: 0, width: 1440, height: 900 } })); labels.push('+~8s idle turning');
        extra = { live, idleDrawsOver6s: d2 - d1 };
      } else {
        const a = await px(await page.screenshot({ clip: { x: 0, y: 60, width: 1440, height: 600 } }));
        await page.waitForTimeout(1200);
        const b = await px(await page.screenshot({ clip: { x: 0, y: 60, width: 1440, height: 600 } }));
        extra = { heroChanged1_2s: diffShare(a, b) };
      }
      const st = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, path: location.pathname, canvases: document.querySelectorAll('canvas').length, ctx: window.__ctx }));
      results.arrive[`${scheme}-${from}->${route}`] = { ...extra, ...st };
      if (from === 'glassmorphism') await strip(frames, labels, `arrive-${route.includes('about') ? 'about' : 'home'}__${scheme}.jpg`, { maxW: 360 });
      await context.close();
    }
  }
}

/* ---------- a11y: focusable inside aria-hidden; three leak; swap leak ---------- */
if (want('a11y')) {
  results.a11y = {};
  const { context, page } = await newPage();
  for (const route of ['/t/vaporwave/', '/t/vaporwave/about/', '/t/vaporwave/services/', '/t/vaporwave/contact/', '/t/vaporwave/contact/sent/']) {
    await page.goto(base + route, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.querySelector('.centerpiece')?.scrollIntoView());
    await page.waitForTimeout(3000);
    results.a11y[route] = await page.evaluate(() => {
      const f = [...document.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')].filter((e) => e.tabIndex >= 0 && !e.disabled);
      return f.filter((e) => e.closest('[aria-hidden="true"]')).map((e) => `${e.tagName}.${e.className} in ${e.closest('[aria-hidden="true"]').className}`);
    });
  }
  await context.close();
}
if (want('leak')) {
  results.leak = {};
  const { context, page } = await newPage();
  const reqs = [];
  page.on('request', (r) => reqs.push(r.url()));
  for (const route of ['/t/vaporwave/', '/t/vaporwave/services/', '/t/vaporwave/contact/']) {
    reqs.length = 0;
    await page.goto(base + route, { waitUntil: 'networkidle' });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2500);
    results.leak[route] = reqs.filter((u) => /three|GLTF|live-bust|\.glb/i.test(u)).map((u) => u.replace(base, ''));
  }
  // About <-> Home swaps via nav links, count canvases and live contexts.
  await page.goto(base + '/t/vaporwave/about/', { waitUntil: 'networkidle' });
  await waitLive(page);
  const swaps = [];
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.click('header a[href="/t/vaporwave/"], nav a[href="/t/vaporwave/"]').catch(async () => { await page.evaluate(() => document.querySelector('a[href="/t/vaporwave/"]').click()); });
    await page.waitForTimeout(1500);
    const h = await page.evaluate(() => ({ p: location.pathname, canvases: document.querySelectorAll('canvas').length, bustCanvas: !!document.querySelector('[data-marble-canvas]') }));
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.evaluate(() => document.querySelector('a[href="/t/vaporwave/about/"]').click());
    await page.waitForTimeout(500);
    await page.evaluate(() => document.querySelector('.centerpiece')?.scrollIntoView({ block: 'center' }));
    const lv = await waitLive(page, 10000);
    const a = await page.evaluate(() => ({ p: location.pathname, canvases: document.querySelectorAll('canvas').length, ctxAsked: window.__ctx.length }));
    swaps.push({ home: h, about: { ...a, live: lv } });
  }
  results.leak.swaps = swaps;
  await context.close();
}

console.log(JSON.stringify(results, null, 1));
console.log('problems:', JSON.stringify([...new Set(problems)], null, 1));
await writeFile(join(OUT, 'results.json'), JSON.stringify({ results, problems: [...new Set(problems)] }, null, 1));
await browser.close();
