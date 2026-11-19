/**
 * Stage 6 wave 1, task 4: quick viewport or element shot of one swiss page.
 *   BASE=http://127.0.0.1:4470 node scripts/themes/stage6/w1-t4-shot.mjs <path> <width> <height> <out.png> [light|dark] [scrollY] [full]
 */
import { chromium } from 'playwright';
import { suppressPrompt } from '../lib/portal-prompt.mjs';
const [path, w, h, out, scheme = 'light', sy = '0', full] = process.argv.slice(2);
const BASE = process.env.BASE || 'http://127.0.0.1:4470';
const mobile = Number(w) < 900;
const browser = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, colorScheme: scheme, reducedMotion: 'no-preference' });
await suppressPrompt(ctx);
await ctx.addInitScript((s) => { try { localStorage.setItem('scheme', s); sessionStorage.setItem('bdl-swiss-dial-hint', '1'); } catch {} }, scheme);
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
await page.evaluate(() => document.fonts.ready);
await page.evaluate((y) => scrollTo(0, y), +sy);
await page.waitForTimeout(300);
await page.screenshot({ path: out, fullPage: full === 'full' });
await browser.close();
