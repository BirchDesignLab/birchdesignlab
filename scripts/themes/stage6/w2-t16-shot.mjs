/**
 * Stage 6 wave 2, task 16: viewport or whole-page shots of cottagecore pages.
 *   BASE=http://127.0.0.1:4470 node scripts/themes/stage6/w2-t16-shot.mjs <outDir> <tag> <page> <width> <scheme> [full|view] [touch]
 * page: home | about | services | contact. GPU Chromium, no-preference transparency, prompt suppressed.
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const BASE = (process.env.BASE || 'http://127.0.0.1:4470').replace(/\/$/, '');
const [OUT, TAG, PAGE, W, SCHEME, MODE = 'full', TOUCH] = process.argv.slice(2);
if (!SCHEME) throw new Error('usage: w2-t16-shot.mjs <outDir> <tag> <page> <width> <scheme> [full|view] [touch]');
await mkdir(OUT, { recursive: true });
const paths = { home: '', about: 'about/', services: 'services/', contact: 'contact/' };
const w = +W;
const mobile = w < 900 || TOUCH === 'touch';
const browser = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: w, height: w < 700 ? 844 : w < 1100 ? 1180 : 900 }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile, colorScheme: SCHEME, reducedMotion: 'no-preference' });
await suppressPrompt(ctx);
await ctx.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, SCHEME);
await ctx.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
await page.goto(`${BASE}/t/cottagecore/${paths[PAGE]}`, { waitUntil: 'networkidle' });
await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1200);
await page.screenshot({ path: join(OUT, `${TAG}-${PAGE}-${W}-${SCHEME}.png`), fullPage: MODE === 'full' });
await browser.close();
console.log('ok', TAG, PAGE, W, SCHEME);
