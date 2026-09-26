/**
 * Wave B1 glass critic (09-25-26): does headless Chromium report
 * prefers-reduced-transparency: reduce, and what do the glass pages look like
 * with it forced to no-preference (CDP Emulation.setEmulatedMedia) vs
 * forced to reduce. Viewport stills of every glass page, light and dark,
 * desktop, into scripts/themes/.out/b1-glass-critic/rt-*.png.
 *
 * Usage: BDL_GPU=1 node scripts/themes/glassmorphism/b1-critic-transparency.mjs [--base URL]
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'b1-glass-critic');
const bi = process.argv.indexOf('--base');
const BASE = bi === -1 ? 'http://127.0.0.1:4473' : process.argv[bi + 1];
const useGpu = process.env.BDL_GPU === '1';
const PAGES = { home: '/t/glassmorphism/', services: '/t/glassmorphism/services/', about: '/t/glassmorphism/about/', contact: '/t/glassmorphism/contact/', sent: '/t/glassmorphism/contact/sent/' };

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--hide-scrollbars', ...(useGpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : [])] });
for (const scheme of ['light', 'dark']) {
  for (const rt of ['default', 'no-preference', 'reduce']) {
    const c = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: scheme });
    await c.addInitScript((s) => { try { localStorage.setItem('scheme', s); localStorage.setItem('theme', s); } catch {} }, scheme);
    await c.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
    const page = await c.newPage();
    if (rt !== 'default') {
      const cdp = await c.newCDPSession(page);
      await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: rt }] });
    }
    for (const [name, path] of Object.entries(PAGES)) {
      if (rt === 'default' && name !== 'home') continue;
      await page.goto(BASE + path, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      const info = await page.evaluate(() => {
        const el = document.querySelector('.glass.thin');
        const cs = el && getComputedStyle(el);
        const orb = document.querySelector('.orb');
        return {
          mqReduce: matchMedia('(prefers-reduced-transparency: reduce)').matches,
          thinBg: cs?.backgroundColor, thinBf: cs?.backdropFilter,
          wp: getComputedStyle(document.querySelector('main'), '::before').backgroundImage.slice(0, 40),
          orbAnim: orb && getComputedStyle(orb).animationName,
        };
      });
      console.log(scheme, rt, name, JSON.stringify(info));
      if (rt !== 'default') await page.screenshot({ path: join(OUT, `rt-${rt}-${scheme}-${name}.png`) });
    }
    await c.close();
  }
}
await browser.close();
