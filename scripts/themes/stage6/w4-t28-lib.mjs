/**
 * Stage 6 wave 4, task 28: shared launcher and film helpers for the task's
 * evidence scripts. GPU Chromium (d3d11) with the renderer checked, reduced
 * transparency forced to no-preference through CDP, the portal prompt
 * suppressed unless a script asks to see it. SNAP_BASE (set by snap.mjs)
 * picks the server, default http://127.0.0.1:4470. Output:
 * scripts/themes/.out/stage6/w4/t28/ (gitignored scratch).
 *
 * The film and strip helpers are w3-t20-lib's, re-exported so a strip reads
 * the same across the stage.
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';
export { startFilm, pickAt, strip, boxOf, startSampler, stopSampler, centre } from './w3-t20-lib.mjs';

export const BASE = process.env.SNAP_BASE || 'http://127.0.0.1:4470';
export const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '.out', 'stage6', 'w4', 't28');
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

/**
 * A fresh context and page. `touch` defaults to a phone under 900px wide.
 * `prompt: true` leaves the portal's welcome prompt alone (it is otherwise
 * marked dismissed before any page script runs). `hideSwitcher` hides the bar
 * for film crops.
 */
export async function open(browser, { path, width, scheme = 'light', touch, settle = 700, hideSwitcher = true, prompt = false, height, init }) {
  const mobile = touch ?? width < 900;
  const h = height ?? (width < 700 ? 844 : width < 1100 ? 1180 : 900);
  const ctx = await browser.newContext({ viewport: { width, height: h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile, colorScheme: scheme, reducedMotion: 'no-preference' });
  if (!prompt) await suppressPrompt(ctx);
  await ctx.addInitScript((s) => { try { localStorage.setItem('scheme', s); sessionStorage.setItem('bdl-swiss-dial-hint', '1'); } catch {} }, scheme);
  if (init) await ctx.addInitScript(init);
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

/** Scroll to the selector's centre and wait for every build animation under it to finish. */
export async function reach(page, sel) {
  await page.evaluate((sel) => document.querySelector(sel).scrollIntoView({ block: 'center' }), sel);
  await page.waitForFunction((sel) => {
    const el = document.querySelector(sel);
    return el.getAnimations({ subtree: true }).every((a) => a.playState === 'finished' || a.playState === 'idle');
  }, sel, { timeout: 15000 });
  await page.waitForTimeout(250);
}
