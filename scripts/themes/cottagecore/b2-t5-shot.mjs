/* B2 task 5: one viewport screenshot of a cottagecore page. GPU Chromium.
   Usage: SNAP_BASE=... node scripts/themes/cottagecore/b2-t5-shot.mjs <path> <w> <h> <scheme> <out.png> [scrollY] [waitMs] */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const [path = '', w = '390', h = '844', scheme = 'light', out = 'shot.png', sy = '0', wait = '3000'] = process.argv.slice(2);
const base = (process.env.SNAP_BASE || 'http://127.0.0.1:4460').replace(/\/$/, '');
await mkdir(dirname(out), { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const mobile = Number(w) < 700;
const context = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile, colorScheme: scheme, reducedMotion: 'no-preference' });
await suppressPrompt(context);
await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); localStorage.setItem('theme', s); } catch {} }, scheme);
await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
const page = await context.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.log('console error:', m.text()); });
await page.goto(`${base}/t/cottagecore/${path}`, { waitUntil: 'networkidle' });
await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
await page.evaluate(async (y) => { await document.fonts.ready; window.scrollTo(0, y); }, +sy);
await page.waitForTimeout(+wait);
await page.screenshot({ path: out });
await browser.close();
