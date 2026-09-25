/**
 * Viewport-sized stills at several scroll offsets, for the glassmorphism
 * wallpaper (main::before is position: fixed, so a full-page capture only
 * shows it in the top viewport; src/themes/README's capture caveat and
 * glassmorphism.md E3's "Verify" line both ask for this instead).
 *
 * Written 09-25-26 for Tier 3 stage 3 wave B1, seat glass-1.
 *
 * Usage (serve a build first, e.g. scripts/themes/snap.mjs):
 *   BDL_GPU=1 node scripts/themes/glassmorphism/scroll-viewport-capture.mjs \
 *     --base http://127.0.0.1:4471 --label b1-glass-scroll
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_ROOT = join(HERE, '..', '.out');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

const base = arg('base', 'http://127.0.0.1:4471');
const label = arg('label', 'b1-glass-scroll');
const outDir = join(OUT_ROOT, label);
await mkdir(outDir, { recursive: true });

const ROUTES = ['/t/glassmorphism/', '/t/glassmorphism/services/'];
const SCHEMES = ['light', 'dark'];
const VIEWPORT = { width: 1440, height: 900 };
const OFFSETS = ['top', 'middle', 'bottom'];

const gpu = process.env.BDL_GPU === '1';
const browser = await chromium.launch({
  headless: true,
  args: gpu
    ? ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu']
    : [],
});

const rendererPage = await browser.newPage();
const renderer = await rendererPage.evaluate(() => {
  const c = document.createElement('canvas');
  const gl = c.getContext('webgl');
  if (!gl) return 'no webgl';
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
});
console.log('renderer:', renderer);
if (gpu && /swiftshader/i.test(renderer)) {
  console.error('BDL_GPU=1 but got SwiftShader (software). Aborting.');
  process.exit(1);
}
await rendererPage.close();

let count = 0;
for (const route of ROUTES) {
  for (const scheme of SCHEMES) {
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
      colorScheme: scheme,
    });
    await suppressPrompt(context);
    await context.addInitScript((s) => {
      try {
        localStorage.setItem('scheme', s);
        localStorage.setItem('theme', s);
      } catch {}
    }, scheme);
    const page = await context.newPage();
    // Headless Chromium otherwise reports prefers-reduced-transparency:
    // reduce by default (no Playwright context option for it), pushing
    // glass's E10 fallback into every still ("B1-sheets-invalid-light").
    try {
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }],
      });
    } catch {}
    await page.goto(base + route, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts?.ready);
    await page.waitForTimeout(400);

    const slug = route.replace(/^\/t\//, 't-').replace(/\/$/, '').replace(/\//g, '-') || 't-glassmorphism';
    const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const positions = { top: 0, middle: Math.round((scrollHeight - VIEWPORT.height) / 2), bottom: scrollHeight - VIEWPORT.height };

    for (const off of OFFSETS) {
      const y = Math.max(0, positions[off]);
      await page.evaluate((yy) => scrollTo({ top: yy, behavior: 'instant' }), y);
      await page.waitForTimeout(150);
      const file = `${slug}__${scheme}__${off}.png`;
      await page.screenshot({ path: join(outDir, file) });
      count++;
    }
    await context.close();
  }
}

await browser.close();
await writeFile(join(outDir, 'renderer.txt'), renderer + '\n');
console.log(`${count} scrolled-viewport captures -> ${outDir}`);
