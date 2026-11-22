/**
 * Stage 6 wave 3, task 19: shared launcher for the task's probes. GPU
 * Chromium (d3d11), reduced transparency forced to no-preference through CDP,
 * the portal prompt suppressed, the switcher hidden for shots. BASE env picks
 * the server (default http://127.0.0.1:4470).
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

export const BASE = process.env.BASE || process.env.SNAP_BASE || 'http://127.0.0.1:4470';
export const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '.out', 'stage6', 'w3', 't19');
await mkdir(OUT, { recursive: true });

export async function launch() {
  return chromium.launch({ headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'] });
}

export async function open(browser, { path, width, height, scheme = 'dark', touch, hideSwitcher = true, settle = 1200 }) {
  const mobile = touch ?? width < 900;
  const h = height ?? (width < 700 ? 844 : width < 1100 ? 1180 : 900);
  const ctx = await browser.newContext({ viewport: { width, height: h }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, colorScheme: scheme, reducedMotion: 'no-preference' });
  await suppressPrompt(ctx);
  await ctx.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  if (hideSwitcher) await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } scrollTo(0, 0); });
  await page.waitForTimeout(settle);
  return { ctx, page, cdp };
}

export async function renderer(page) {
  return page.evaluate(() => {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl');
    const e = gl?.getExtension('WEBGL_debug_renderer_info');
    return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown';
  });
}
