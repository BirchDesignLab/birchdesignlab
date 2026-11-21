/**
 * Stage 6 wave 3, task 20: shared launcher and film helpers for the task's
 * probes. GPU Chromium (d3d11) with the renderer checked, reduced
 * transparency forced to no-preference through CDP, the portal prompt
 * suppressed. SNAP_BASE (set by snap.mjs) picks the server, default
 * http://127.0.0.1:4470. Output: scripts/themes/.out/stage6/w3/t20/.
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

export const BASE = process.env.SNAP_BASE || 'http://127.0.0.1:4470';
export const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '.out', 'stage6', 'w3', 't20');
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

export async function open(browser, { path, width, scheme = 'light', touch, settle = 700, hideSwitcher = true }) {
  const mobile = touch ?? width < 900;
  const height = width < 700 ? 844 : width < 1100 ? 1180 : 900;
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile, colorScheme: scheme, reducedMotion: 'no-preference' });
  await suppressPrompt(ctx);
  await ctx.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
  await ctx.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  if (hideSwitcher) await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(settle);
  return { ctx, page, cdp, errors, mobile };
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

/** Timestamped screencast film. */
export async function startFilm(page) {
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

/** The box (viewport pixels, padded) around a selector, for cropping film frames. */
export async function boxOf(page, sel, pad = 70) {
  return page.evaluate(({ sel, pad }) => {
    const r = document.querySelector(sel).getBoundingClientRect();
    const x = Math.max(0, r.left - pad), y = Math.max(0, r.top - pad);
    return { x, y, w: Math.min(innerWidth - x, r.width + pad * 2), h: Math.min(innerHeight - y, r.height + pad * 2) };
  }, { sel, pad });
}

/** A rAF sampler: records `read()` every frame until `stop`. Returns a handle on window.__samples. */
export async function startSampler(page, fn) {
  await page.evaluate((src) => {
    const read = new Function(`return (${src})`)();
    const t0 = performance.now();
    window.__samples = [];
    window.__samplerOn = true;
    const tick = () => {
      if (!window.__samplerOn) return;
      window.__samples.push({ t: Math.round(performance.now() - t0), ...read() });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, fn.toString());
}
export async function stopSampler(page) {
  return page.evaluate(() => { window.__samplerOn = false; return window.__samples; });
}
