/**
 * Stage 6 wave 3, task 27: shared launcher and film helpers for cottagecore's needle and thread probes.
 * GPU Chromium (d3d11) with the renderer checked, reduced transparency forced to no-preference through CDP,
 * the portal prompt suppressed, and every arrival on About made through the real switcher (open the
 * dialog, press the Cottagecore row, then the header's About link). SNAP_BASE (set by snap.mjs) picks the
 * server, default http://127.0.0.1:4470. Output: scripts/themes/.out/stage6/w3/t27/.
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

export const BASE = process.env.SNAP_BASE || 'http://127.0.0.1:4470';
export const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '.out', 'stage6', 'w3', 't27');
await mkdir(OUT, { recursive: true });

export async function launch() {
  const browser = await chromium.launch({ headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'] });
  const p = await browser.newPage();
  const renderer = await p.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl');
    const e = gl?.getExtension('WEBGL_debug_renderer_info');
    return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown';
  });
  await p.close();
  console.log('renderer:', renderer);
  if (/swiftshader|llvmpipe|software|unknown/i.test(renderer)) { await browser.close(); throw new Error(`software renderer: ${renderer}`); }
  return { browser, renderer };
}

/** A fresh context and page at the width, in the scheme, with every probe-wide setting applied. */
export async function newPage(browser, { width, scheme = 'light', touch }) {
  const mobile = touch ?? width < 900;
  const height = width < 700 ? 844 : width < 1100 ? 1180 : 900;
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: Number(process.env.DSF) || (mobile ? 2 : 1), isMobile: mobile, hasTouch: mobile, colorScheme: scheme, reducedMotion: 'no-preference' });
  await suppressPrompt(ctx);
  await ctx.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
  await ctx.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  return { ctx, page, cdp, errors, mobile };
}

/**
 * Arrive on cottagecore About the way a visitor does: start on another school's Home, open the portal
 * switcher, press the Cottagecore row, wait for its Home, then follow the header's About link. The switcher is
 * hidden afterwards so it stays out of the shots (it is not part of the toy).
 */
export async function arriveAbout(browser, { width, scheme = 'light', touch, settle = 900, hideSwitcher = true }) {
  const env = await newPage(browser, { width, scheme, touch });
  const { page } = env;
  await page.goto(`${BASE}/t/quiet/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('.open').click());
  await page.waitForTimeout(500);
  const box = await page.evaluate(() => {
    const a = document.querySelector('bdl-switcher').shadowRoot.querySelector('a[data-school="cottagecore"]');
    a.scrollIntoView({ block: 'nearest' });
    const r = a.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await page.mouse.click(box.x, box.y);
  await page.waitForURL((u) => u.pathname === '/t/cottagecore/', { timeout: 15000 });
  await page.waitForTimeout(1800);
  const link = page.locator('header nav a[href="/t/cottagecore/about/"]').first();
  if (await link.isVisible()) await link.click();
  else await page.evaluate(() => document.querySelector('header nav a[href="/t/cottagecore/about/"]').click());
  await page.waitForURL((u) => u.pathname === '/t/cottagecore/about/', { timeout: 15000 });
  if (hideSwitcher) await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(settle);
  return env;
}

/** Scroll to the selector's centre and wait for its reveal to settle and every build animation under it to finish. */
export async function reach(page, sel) {
  await page.evaluate((sel) => document.querySelector(sel).scrollIntoView({ block: 'center' }), sel);
  await page.waitForFunction((sel) => {
    const el = document.querySelector(sel);
    return el.getAnimations({ subtree: true }).every((a) => a.playState === 'finished' || a.playState === 'idle');
  }, sel, { timeout: 15000 });
  await page.waitForTimeout(250);
}

export async function centre(page, sel) {
  return page.evaluate((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.left, r.top, r.width, r.height]; }, sel);
}

/** The needle's tip (its origin) and the hoop's centre and radii, in viewport px. */
export async function hoopGeo(page) {
  return page.evaluate(() => {
    const h = document.querySelector('.hoop').getBoundingClientRect();
    const c = document.querySelector('.hoop .cloth').getBoundingClientRect();
    const n = document.querySelector('.needle').getBoundingClientRect();
    const b = document.querySelector('.needle .nd-body').getBoundingClientRect();
    return { cx: c.left + c.width / 2, cy: c.top + c.height / 2, hoopR: h.width / 2, linenR: c.width / 2, tipX: n.left, tipY: n.top, body: { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width, h: b.height } };
  });
}

/** Timestamped screencast film. */
export async function startFilm(page) {
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    frames.push({ data, at: metadata.timestamp });
    try { await cdp.send('Page.screencastFrameAck', { sessionId }); } catch {}
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 88, everyNthFrame: 1 });
  await page.waitForTimeout(200);
  if (!frames.length) {
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 88 });
    frames.push({ data, at: Date.now() / 1000 });
  }
  const t0 = Date.now() / 1000;
  return {
    t0,
    async stop() {
      await cdp.send('Page.stopScreencast');
      await cdp.detach();
      const before = frames.filter((f) => f.at < t0).slice(-1);
      return [...before, ...frames.filter((f) => f.at >= t0)].map((f) => ({ ...f, ms: Math.round((f.at - t0) * 1000) }));
    },
  };
}

/** Frames at the given times (ms from the film's start; the first is the frame before the trigger). */
export function pickAt(frames, times) {
  return times.map((t, i) => {
    const at = i === 0 && t <= 0 ? -1 : t;
    const shown = frames.filter((f) => f.ms <= at).pop() ?? frames[0];
    return { ...shown, ms: at, real: shown.ms };
  });
}

export async function strip(frames, file, title, { cols = 6, cellW = 280, box = null, vpWidth = 0 } = {}) {
  const images = await Promise.all(frames.map((f) => loadImage(Buffer.from(f.data, 'base64'))));
  const k = box ? images[0].width / vpWidth : 1;
  const src = box ? { x: box.x * k, y: box.y * k, w: box.w * k, h: box.h * k } : { x: 0, y: 0, w: images[0].width, h: images[0].height };
  const cellH = Math.round((src.h / src.w) * cellW);
  const PAD = 10, CAP = 24, HEAD = 30;
  const rows = Math.ceil(images.length / cols);
  const canvas = createCanvas(PAD + cols * (cellW + PAD), HEAD + PAD + rows * (cellH + CAP + PAD));
  const c = canvas.getContext('2d');
  c.fillStyle = '#1b1b1d'; c.fillRect(0, 0, canvas.width, canvas.height);
  c.font = '600 14px sans-serif'; c.textBaseline = 'middle'; c.fillStyle = '#e8e6e1';
  c.fillText(title, PAD, HEAD / 2 + 2);
  images.forEach((img, i) => {
    const x = PAD + (i % cols) * (cellW + PAD), y = HEAD + PAD + Math.floor(i / cols) * (cellH + CAP + PAD);
    c.drawImage(img, src.x, src.y, src.w, src.h, x, y, cellW, cellH);
    c.fillStyle = '#e8e6e1';
    c.fillText(frames[i].ms < 0 ? 'before' : `+${frames[i].ms} ms`, x, y + cellH + CAP / 2);
  });
  await writeFile(file, await canvas.encode('png'));
}

/** The box (viewport px, padded) around a selector, for cropping film frames. */
export async function boxOf(page, sel, pad = 70) {
  return page.evaluate(({ sel, pad }) => {
    const r = document.querySelector(sel).getBoundingClientRect();
    const x = Math.max(0, r.left - pad), y = Math.max(0, r.top - pad);
    return { x, y, w: Math.min(innerWidth - x, r.width + pad * 2), h: Math.min(innerHeight - y, r.height + pad * 2) };
  }, { sel, pad });
}

/** What the stitch layer holds right now: threads, dashed paths with a drawn `d`, knots, and the needle's inline style. */
export async function stitchState(page) {
  return page.evaluate(() => {
    const th = [...document.querySelectorAll('.nt-thread')];
    return {
      threads: th.length,
      colours: th.map((t) => t.dataset.c),
      drawn: th.filter((t) => (t.querySelector('.nt-over')?.getAttribute('d') || '').length > 12).length,
      knots: document.querySelectorAll('.nt-knot').length,
      needleStyle: document.querySelector('.needle')?.getAttribute('style') || '',
      held: document.querySelector('.needle')?.hasAttribute('data-held') ?? false,
    };
  });
}

/** A drag across the linen with the mouse: the pointer follows a gentle S from the needle across the cloth. */
export async function dragMouse(page, geo, { steps = 46, pause = 16, release = true } = {}) {
  const x0 = geo.body.x, y0 = geo.body.y;
  // grab the needle at its tip end so the tip leads (the tip is at tipX/tipY; the body's centre is half a needle behind)
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  const r = geo.linenR * 0.62;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + (geo.cx - r * 0.9 - x0) * 0 + (geo.cx - r + 2 * r * t - x0) * Math.min(1, t * 1.6) + (1 - Math.min(1, t * 1.6)) * 0;
    const y = geo.cy + Math.sin(t * Math.PI * 2) * r * 0.45 - r * 0.15 + (1 - t) * 40;
    await page.mouse.move(x, y);
    await page.waitForTimeout(pause);
  }
  if (release) await page.mouse.up();
}
