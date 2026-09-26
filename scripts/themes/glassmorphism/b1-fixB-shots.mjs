/**
 * Wave B1 glass fix round 2, fix B: quick screenshots at the exact
 * scheme/viewport/page/scroll% combinations the re-critic's useless-orb
 * probe flagged, so the fixer can see what it is placing by hand.
 * Forces prefers-reduced-transparency: no-preference over CDP.
 *
 * Usage: BDL_GPU=1 node scripts/themes/glassmorphism/b1-fixB-shots.mjs [--base URL] [--out DIR]
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? d : process.argv[i + 1]; };
const BASE = arg('base', 'http://127.0.0.1:4471');
const OUT = arg('out', join(HERE, '..', '.out', 'b1-glass-fixB', 'shots'));
const useGpu = process.env.BDL_GPU === '1';
await mkdir(OUT, { recursive: true });

const PAGES = { home: '/t/glassmorphism/', services: '/t/glassmorphism/services/', about: '/t/glassmorphism/about/' };
const cases = [
  ['light', 'desktop', 'home', 0], ['light', 'desktop', 'home', 25],
  ['light', 'desktop', 'services', 25], ['light', 'desktop', 'services', 75],
  ['light', 'desktop', 'about', 0], ['light', 'desktop', 'about', 25],
];

const browser = await chromium.launch({ args: ['--hide-scrollbars', ...(useGpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : [])] });
for (const [scheme, vpName, name, pct] of cases) {
  const vp = { desktop: { width: 1440, height: 900 }, phone: { width: 390, height: 844 } }[vpName];
  const c = await browser.newContext({ viewport: vp, colorScheme: scheme });
  await c.addInitScript((s) => { try { localStorage.setItem('scheme', s); localStorage.setItem('theme', s); localStorage.setItem('bdl-switcher-prompt', 'dismissed'); } catch {} }, scheme);
  await c.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await c.newPage();
  const cdp = await c.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  await page.goto(BASE + PAGES[name], { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'bdl-switcher { display: none !important; }' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate((p) => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * p / 100), pct);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.waitForTimeout(150);
  await page.screenshot({ path: join(OUT, `${scheme}-${vpName}-${name}-${pct}.png`) });
  await c.close();
}
await browser.close();
console.log('done ->', OUT);
