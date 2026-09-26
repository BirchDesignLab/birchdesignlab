/**
 * Does vaporwave's Home hero keep animating after arriving from another
 * school?
 *
 * Written 09-25-26 for the PR #91 review: fx.ts's 30 fps budget stored the
 * direct settle() call's Infinity default as lastDrawn, so on the deferred
 * link path (arrival via the router from another school) every later rAF tick
 * failed the budget and the hero froze on its first frame. Hard loads took a
 * different path and never showed it, which is why no film caught it.
 *
 * This starts on /t/<from>/, follows a router link to /t/vaporwave/, waits
 * for the swap to settle, then takes two shots of the hero 1.2 s apart and
 * reports how many pixels changed. A frozen hero changes none.
 *
 * Usage (serve a snap first):
 *   BDL_GPU=1 node scripts/themes/vaporwave/verify-arrival-animates.mjs \
 *     --base http://127.0.0.1:4479 [--from glassmorphism] [--schemes dark,light]
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const argOf = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const base = argOf('base', 'http://127.0.0.1:4479');
const from = argOf('from', 'glassmorphism');
const schemes = argOf('schemes', 'dark,light').split(',');

const gpu = process.env.BDL_GPU === '1';
const browser = await chromium.launch({
  args: gpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] : [],
});

async function pixels(buf) {
  const im = await loadImage(buf);
  const c = createCanvas(im.width, im.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(im, 0, 0);
  return ctx.getImageData(0, 0, im.width, im.height);
}

let failed = false;
for (const scheme of schemes) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await suppressPrompt(context);
  await context.addInitScript((s) => {
    try { localStorage.setItem('scheme', s); localStorage.setItem('theme', s); } catch {}
  }, scheme);
  // Count draw calls and rAF callbacks, so a frozen picture can be told apart:
  // no draws (the loop stopped or skips) against draws with the same picture.
  await context.addInitScript(() => {
    const w = window;
    w.__vwDraws = 0;
    const orig = WebGLRenderingContext.prototype.drawArrays;
    WebGLRenderingContext.prototype.drawArrays = function (...args) {
      w.__vwDraws++;
      return orig.apply(this, args);
    };
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }],
  });
  if (from === 'direct') {
    // Control: a hard load takes the synchronous path, which always animated.
    await page.goto(`${base}/t/vaporwave/`, { waitUntil: 'networkidle' });
  } else {
    await page.goto(`${base}/t/${from}/`, { waitUntil: 'networkidle' });
    // Clicked at the top of the page: the Portal keeps the scroll position
    // across schools on the same page, so a link clicked at the page foot
    // lands on vaporwave's foot with the hero off-screen (and paused).
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      const a = document.createElement('a');
      a.href = '/t/vaporwave/';
      a.textContent = 'go';
      a.id = 'verify-go';
      a.style.cssText = 'position:fixed;left:8px;top:8px;z-index:99999';
      document.body.append(a);
      a.click();
    });
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'vaporwave' && !document.documentElement.dataset.fromTheme, null, { timeout: 10000 }).catch(() => {});
  }
  await page.waitForTimeout(1500);
  const state = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    fromTheme: document.documentElement.dataset.fromTheme ?? null,
    canvases: document.querySelectorAll('canvas').length,
    live: [...document.querySelectorAll('[data-live]')].map((e) => e.getAttribute('data-live')).join(','),
    reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
    hidden: document.hidden,
    running: document.getAnimations().filter((an) => an.playState === 'running').map((an) => `${an.animationName || an.constructor.name}@${an.effect?.target?.className || an.effect?.pseudoElement || '?'}`).slice(0, 12),
    paused: document.getAnimations().filter((an) => an.playState === 'paused').length,
  }));
  const io = await page.evaluate(() => new Promise((res) => {
    const c = document.querySelector('canvas[data-vw-horizon]');
    if (!c) return res('no canvas');
    const r = c.getBoundingClientRect();
    new IntersectionObserver((e, o) => { o.disconnect(); res({ isIntersecting: e[0].isIntersecting, rect: [r.x, r.y, r.width, r.height].map(Math.round) }); }).observe(c);
  }));
  console.log(`  canvas now: ${JSON.stringify(io)}`);
  console.log(`  state ${JSON.stringify(state)}`);
  const clip = { x: 0, y: 60, width: 1440, height: 600 };
  const drawsA = await page.evaluate(() => window.__vwDraws);
  const a = await pixels(await page.screenshot({ clip }));
  await page.waitForTimeout(1200);
  const b = await pixels(await page.screenshot({ clip }));
  const drawsB = await page.evaluate(() => window.__vwDraws);
  console.log(`  draw calls in 1.2 s: ${drawsB - drawsA} (total ${drawsB})`);
  let changed = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    const d = Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]);
    if (d > 24) changed++;
  }
  const share = changed / (a.width * a.height);
  const renderer = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl');
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';
  });
  const ok = share > 0.005;
  if (!ok) failed = true;
  console.log(`${scheme}: from ${from}, ${(share * 100).toFixed(2)}% of hero pixels changed in 1.2 s -> ${ok ? 'animating' : 'FROZEN'} (${renderer})`);
  await context.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
