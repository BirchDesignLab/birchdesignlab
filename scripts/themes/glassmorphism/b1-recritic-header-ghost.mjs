/**
 * Wave B1 glass re-critic (09-25-26): content scrolled under the header bar
 * reads through it (a ghost "How we build" pill behind About/Contact on Home
 * at 50% scroll). Is it the fixer's new z-index:1 on .btn-glass/.surface-solid,
 * or the header's blur? Crops the header in several variants.
 * Usage: BDL_GPU=1 node scripts/themes/glassmorphism/b1-recritic-header-ghost.mjs [--base URL]
 */
import { chromium } from 'playwright';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'b1-glass-recritic');
const bi = process.argv.indexOf('--base');
const BASE = bi === -1 ? 'http://127.0.0.1:4475' : process.argv[bi + 1];
const gpu = process.env.BDL_GPU === '1';
const browser = await chromium.launch({ args: ['--hide-scrollbars', ...(gpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] : [])] });
const variants = {
  asis: '',
  noz: '[data-theme] .btn-glass, [data-theme] .surface-solid, [data-theme] .chip { z-index: auto !important; }',
  nourl: '',
};
for (const [name, css] of Object.entries(variants)) {
  const c = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
  await c.addInitScript(() => { try { localStorage.setItem('scheme', 'light'); } catch {} });
  await c.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await c.newPage();
  const cdp = await c.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  await page.goto(BASE + '/t/glassmorphism/', { waitUntil: 'networkidle' });
  if (css) await page.addStyleTag({ content: css });
  if (name === 'nourl') await page.evaluate(() => document.querySelectorAll('.glass, .glass-strong').forEach((e) => { e.style.backdropFilter = e.style.backdropFilter.replace(/url\([^)]*\)\s*/, ''); }));
  // put the How we build button right under the header's right end
  await page.evaluate(() => { const b = [...document.querySelectorAll('main a')].find((a) => /How we build/.test(a.textContent)); const r = b.getBoundingClientRect(); scrollBy(0, r.top - 30); });
  await page.waitForTimeout(500);
  const info = await page.evaluate(() => { const bar = document.querySelector('.site-header > .bar') || document.querySelector('header .glass-strong'); const cs = getComputedStyle(bar); return { cls: bar.className, bf: cs.backdropFilter, bg: cs.backgroundColor, z: getComputedStyle(document.querySelector('.site-header')).zIndex }; });
  console.log(name, JSON.stringify(info));
  await page.screenshot({ path: join(OUT, `header-ghost-${name}.png`), clip: { x: 120, y: 0, width: 1200, height: 100 } });
  await c.close();
}
await browser.close();
