/**
 * Stage 6 glass critic probe: how much do the Control Centre's frost and
 * Clear/Tinted settings visibly change the hero pane? Sets the same
 * attributes/custom property lens/settings.ts writes, screenshots the hero
 * window, and reports mean absolute pixel difference against the default.
 * Intended mode only (prefers-reduced-transparency forced to no-preference).
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '.out', 'stage6-critic-glassmorphism');
const BASE = process.env.SNAP_BASE || 'http://127.0.0.1:4463';
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
await ctx.addInitScript(() => { try { localStorage.setItem('scheme', 'light'); } catch {} });
await suppressPrompt(ctx);
await ctx.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
await page.goto(BASE + '/t/glassmorphism/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
const clip = { x: 280, y: 182, width: 880, height: 609 };
const states = {
  default: () => {},
  frost0: () => document.documentElement.style.setProperty('--glass-frost', '0'),
  frost1: () => document.documentElement.style.setProperty('--glass-frost', '1'),
  tinted: () => { document.documentElement.style.removeProperty('--glass-frost'); document.documentElement.dataset.glassTint = 'tinted'; },
};
const bufs = {};
for (const [k, fn] of Object.entries(states)) {
  await page.evaluate(fn);
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  await page.waitForTimeout(900);
  bufs[k] = await page.screenshot({ clip });
  await writeFile(join(OUT, `controls-${k}.png`), bufs[k]);
}
async function px(b) { const i = await loadImage(b); const c = createCanvas(i.width, i.height); const g = c.getContext('2d'); g.drawImage(i, 0, 0); return g.getImageData(0, 0, i.width, i.height).data; }
const base = await px(bufs.default);
const res = {};
for (const k of Object.keys(states)) {
  if (k === 'default') continue;
  const d = await px(bufs[k]); let s = 0;
  for (let i = 0; i < d.length; i += 4) s += (Math.abs(d[i] - base[i]) + Math.abs(d[i + 1] - base[i + 1]) + Math.abs(d[i + 2] - base[i + 2])) / 3;
  res[k] = +(s / (d.length / 4)).toFixed(2);
}
console.log('mean abs diff vs default (0-255):', JSON.stringify(res));
await browser.close();
