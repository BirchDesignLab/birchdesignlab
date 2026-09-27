/**
 * Re-critic (09-26-26): after a forced WebGL context loss + restore on
 * vaporwave About, read the GL clear colour and a few flags, to test whether
 * the restored live bust clears to opaque black because the old, undisposed
 * three.js renderer's own restore handler reset GL state behind the new
 * renderer's state cache. Usage: BDL_GPU=1 node <this> --base http://127.0.0.1:4479
 */
import { chromium } from 'playwright';
import { suppressPrompt } from '../lib/portal-prompt.mjs';
const i = process.argv.indexOf('--base'); const base = i === -1 ? 'http://127.0.0.1:4479' : process.argv[i + 1];
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
await suppressPrompt(context);
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
console.log('renderer:', await page.evaluate(() => { const g = document.createElement('canvas').getContext('webgl2'); return g.getParameter(g.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); }));
await page.goto(`${base}/t/vaporwave/about/`, { waitUntil: 'networkidle' });
await page.evaluate(() => document.querySelector('.centerpiece')?.scrollIntoView({ block: 'center' }));
await page.waitForFunction(() => Number(document.querySelector('[data-marble-canvas]')?.dataset.draws || 0) > 0, null, { timeout: 15000 });
await page.waitForTimeout(500);
const out = await page.evaluate(async () => {
  const cv = document.querySelector('[data-marble-canvas]');
  const gl = cv.getContext('webgl2');
  const before = [...gl.getParameter(gl.COLOR_CLEAR_VALUE)];
  let restoredListeners = 0;
  cv.addEventListener('webglcontextrestored', () => { restoredListeners++; });
  const ext = gl.getExtension('WEBGL_lose_context');
  ext.loseContext();
  await new Promise((r) => setTimeout(r, 400));
  ext.restoreContext();
  await new Promise((r) => setTimeout(r, 3000));
  return { before, after: [...gl.getParameter(gl.COLOR_CLEAR_VALUE)], draws: cv.dataset.draws };
});
console.log(JSON.stringify(out));
await browser.close();
