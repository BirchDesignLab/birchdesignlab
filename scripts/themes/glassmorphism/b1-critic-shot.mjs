/**
 * Wave B1 glass critic (09-25-26): one viewport still at a given scroll,
 * motion allowed, reduced transparency forced to no-preference (CDP).
 * Usage: BDL_GPU=1 node scripts/themes/glassmorphism/b1-critic-shot.mjs <path> <scheme> <w>x<h> <scrollY> <out-name> [--base URL]
 */
import { chromium } from 'playwright';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const [path, scheme, size, sy, name] = process.argv.slice(2);
const bi = process.argv.indexOf('--base');
const BASE = bi === -1 ? 'http://127.0.0.1:4473' : process.argv[bi + 1];
const [w, h] = size.split('x').map(Number);
const phone = w < 500;
const browser = await chromium.launch({ args: ['--hide-scrollbars', ...(process.env.BDL_GPU === '1' ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] : [])] });
const c = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, isMobile: phone, hasTouch: phone, deviceScaleFactor: phone ? 2 : 1 });
await c.addInitScript((s) => { try { localStorage.setItem('scheme', s); localStorage.setItem('theme', s); } catch {} }, scheme);
await c.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
const page = await c.newPage();
const cdp = await c.newCDPSession(page);
await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
await page.goto(BASE + path, { waitUntil: 'networkidle' });
await page.addStyleTag({ content: 'bdl-switcher { display: none !important; }' });
await page.evaluate((y) => window.scrollTo(0, y), Number(sy));
await page.waitForTimeout(900);
await page.screenshot({ path: join(HERE, '..', '.out', 'b1-glass-critic', `${name}.png`) });
await browser.close();
