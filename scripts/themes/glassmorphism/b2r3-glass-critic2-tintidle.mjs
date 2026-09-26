/**
 * Wave B2 glass RE-CRITIC round 2 (09-26-26): idle draws after Tinted is set
 * by a real click. Logs WebGL drawArrays per 250 ms for 10 s after the click,
 * with the timestamps of each draw, at 1440x900 light. GPU Chromium, reduced
 * transparency forced off, prompt suppressed.
 * Usage: BDL_GPU=1 node scripts/themes/glassmorphism/b2r3-glass-critic2-tintidle.mjs --base http://127.0.0.1:4475
 */
import { chromium } from 'playwright';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const base = process.argv[process.argv.indexOf('--base') + 1] || 'http://127.0.0.1:4475';
const browser = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const out = {};
for (const how of ['hero-switch', 'cc-tile', 'held-from-session']) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
  await suppressPrompt(context);
  await context.addInitScript(() => {
    window.__drawT = [];
    const p = WebGLRenderingContext.prototype; const o = p.drawArrays;
    p.drawArrays = function (...a) { window.__drawT.push(Math.round(performance.now())); return o.apply(this, a); };
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  const renderer = await page.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); });
  if (/swiftshader|llvmpipe/i.test(renderer)) throw new Error('software renderer; abort');
  await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('.lens-poster')?.style.display === 'none', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(800);
  if (how === 'held-from-session') {
    await page.click('.hero .switch'); await page.waitForTimeout(3000);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelector('.lens-poster')?.style.display === 'none', { timeout: 10000 }).catch(() => {});
  } else if (how === 'cc-tile') {
    await page.evaluate(() => document.querySelector('.cc-tint-switch').scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(500);
    await page.click('.cc-tint-switch');
  } else {
    await page.click('.hero .switch');
  }
  await page.mouse.move(2, 2);
  const t0 = await page.evaluate(() => performance.now());
  await page.waitForTimeout(10000);
  const ts = await page.evaluate(() => window.__drawT);
  const after = ts.filter((t) => t >= t0).map((t) => Math.round(t - t0));
  const buckets = {};
  for (const t of after) { const b = Math.floor(t / 1000); buckets[b] = (buckets[b] || 0) + 1; }
  out[how] = { renderer, tint: await page.evaluate(() => document.documentElement.dataset.glassTint ?? document.querySelector('.hero .switch').getAttribute('aria-checked')), drawsPerSecond: buckets, lastDrawsMs: after.slice(-12) };
  await context.close();
}
console.log(JSON.stringify(out, null, 1));
await browser.close();
