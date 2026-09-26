/**
 * Wave B1 glass fix round 2, fix B: founder-sheet captures. Full-page
 * before/after stills (5 pages x 2 schemes x 2 viewports) and scrolled
 * (top/middle/bottom) stills for Home and Services, both schemes, desktop
 * only (main::before is position: fixed, so a full-page capture only shows
 * the wallpaper in the first viewport — src/themes/README's caveat). Forces
 * prefers-reduced-transparency: no-preference over CDP so the real design
 * renders, not the E10 fallback (headless Chromium here reports reduce by
 * default).
 *
 * Usage:
 *   BDL_GPU=1 node scripts/themes/glassmorphism/b1-fixB-capture.mjs \
 *     --base http://127.0.0.1:4471 --label after
 *   ... --base http://127.0.0.1:4481 --label before
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_ROOT = join(HERE, '..', '.out', 'b1-glass-fixB', 'captures');
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? d : process.argv[i + 1]; };
const flag = (n) => process.argv.includes(`--${n}`);
const base = arg('base', 'http://127.0.0.1:4471').replace(/\/$/, '');
const label = arg('label', 'after');
const onlyScrolled = flag('scrolled-only');
const outDir = join(OUT_ROOT, label);
await mkdir(outDir, { recursive: true });

const PAGES = { home: '/t/glassmorphism/', services: '/t/glassmorphism/services/', about: '/t/glassmorphism/about/', contact: '/t/glassmorphism/contact/', sent: '/t/glassmorphism/contact/sent/' };
const SCROLL_PAGES = { home: '/t/glassmorphism/', services: '/t/glassmorphism/services/' };
const VPS = { desktop: { width: 1440, height: 900 }, phone: { width: 390, height: 844 } };
const useGpu = process.env.BDL_GPU === '1';

const browser = await chromium.launch({ args: ['--hide-scrollbars', '--font-render-hinting=none', '--disable-lcd-text', ...(useGpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : [])] });

async function ctx(scheme, vpName) {
  const vp = VPS[vpName];
  const c = await browser.newContext({ viewport: vp, colorScheme: scheme, isMobile: vpName === 'phone', hasTouch: vpName === 'phone', deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await suppressPrompt(c);
  await c.addInitScript((s) => { try { localStorage.setItem('scheme', s); localStorage.setItem('theme', s); } catch {} }, scheme);
  await c.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await c.newPage();
  const cdp = await c.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  return { c, page };
}

let count = 0;
if (!onlyScrolled) {
  for (const scheme of ['light', 'dark']) {
    for (const vpName of Object.keys(VPS)) {
      const { c, page } = await ctx(scheme, vpName);
      for (const [name, path] of Object.entries(PAGES)) {
        await page.goto(base + path, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts?.ready);
        await page.waitForTimeout(300);
        await page.screenshot({ path: join(outDir, `full__${name}__${scheme}__${vpName}.png`), fullPage: true });
        count++;
      }
      await c.close();
    }
  }
}

// scrolled viewport triples, desktop only, home + services
for (const scheme of ['light', 'dark']) {
  const { c, page } = await ctx(scheme, 'desktop');
  for (const [name, path] of Object.entries(SCROLL_PAGES)) {
    await page.goto(base + path, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts?.ready);
    await page.waitForTimeout(300);
    const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const positions = { top: 0, middle: Math.round((scrollHeight - 900) / 2), bottom: scrollHeight - 900 };
    for (const [off, y] of Object.entries(positions)) {
      await page.evaluate((yy) => scrollTo({ top: Math.max(0, yy), behavior: 'instant' }), y);
      await page.waitForTimeout(200);
      await page.screenshot({ path: join(outDir, `scroll__${name}__${scheme}__${off}.png`) });
      count++;
    }
  }
  await c.close();
}

await browser.close();
console.log(`${count} captures -> ${outDir}`);
