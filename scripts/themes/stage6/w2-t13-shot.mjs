/**
 * Stage 6 wave 2, task 13: one-off shots while building vaporwave V1 to V14.
 *
 *   node scripts/themes/stage6/w2-t13-shot.mjs <path> <width> <scheme> <selector|full|top> [out-name] [pad]
 *
 * Writes scripts/themes/.out/stage6/w2/t13/shots/<out-name>.png (gitignored).
 * BASE env picks the server (default http://127.0.0.1:4470). GPU Chromium,
 * reduced transparency forced to no-preference, the portal prompt suppressed.
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const [path, widthArg, scheme, what, nameArg, padArg] = process.argv.slice(2);
const width = Number(widthArg);
const BASE = process.env.BASE || process.env.SNAP_BASE || 'http://127.0.0.1:4470';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '.out', 'stage6', 'w2', 't13', 'shots');
await mkdir(OUT, { recursive: true });
const mobile = width < 900;
const height = width < 700 ? 844 : width < 1100 ? 1180 : 900;
const browser = await chromium.launch({ headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, colorScheme: scheme, reducedMotion: 'no-preference' });
await suppressPrompt(ctx);
await ctx.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto(`${BASE}${path.startsWith("/") ? path : "/" + path}`, { waitUntil: 'networkidle' });
await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
await page.evaluate(() => document.fonts.ready);
await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 70)); } scrollTo(0, 0); });
await page.waitForTimeout(1600);
const name = nameArg || `${path.replace(/\W+/g, '_')}_${width}_${scheme}_${what.replace(/\W+/g, '')}`;
const file = join(OUT, `${name}.png`);
if (what === 'full') await page.screenshot({ path: file, fullPage: true });
else if (what === 'top') await page.screenshot({ path: file });
else {
  const pad = Number(padArg || 0);
  const box = await page.locator(what).first().boundingBox();
  const sy = await page.evaluate(() => scrollY);
  await page.screenshot({ path: file, fullPage: true, clip: { x: Math.max(0, box.x - pad), y: Math.max(0, box.y + sy - pad), width: Math.min(width, box.width + 2 * pad), height: box.height + 2 * pad } });
}
console.log(file);
await browser.close();
