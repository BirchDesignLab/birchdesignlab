/**
 * Wave B2 round 5, seat glass-fix-r5: a quick geometry dump of glass Home at
 * given sizes (window, stage, Control Centre, lens, source, every hero orb),
 * GPU Chromium (aborts on SwiftShader), reduced transparency forced off, the
 * portal prompt suppressed. Used while tuning the layout and the stand-in
 * poster spots.
 * Usage: BDL_GPU=1 node scripts/themes/glassmorphism/b2r5-glass-fix-geo.mjs --base http://127.0.0.1:4471 [--sizes 820x1180,390x844] [--scheme light]
 */
import { chromium } from 'playwright';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const args = process.argv.slice(2);
const arg = (n, f) => { const i = args.indexOf(`--${n}`); return i === -1 ? f : args[i + 1]; };
const base = arg('base', 'http://127.0.0.1:4471');
const sizes = arg('sizes', '1440x900,1280x800,1024x768,820x1180,390x844').split(',').map((s) => s.split('x').map(Number));
const scheme = arg('scheme', 'light');
const browser = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
{
  const p = await browser.newPage();
  const r = await p.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); });
  console.log('renderer:', r);
  await p.close();
  if (/swiftshader|llvmpipe/i.test(r)) { await browser.close(); throw new Error('software renderer; abort'); }
}
for (const [w, h] of sizes) {
  const touch = w < 900;
  const context = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, hasTouch: touch, isMobile: touch, deviceScaleFactor: touch ? 2 : 1 });
  await suppressPrompt(context);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }, { name: 'prefers-color-scheme', value: scheme }] });
  await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('.lens-poster')?.style.display === 'none', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(300);
  const g = await page.evaluate(() => {
    const rr = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom].map((v) => Math.round(v)); };
    const hit = document.querySelector('.lens-hit')?.getBoundingClientRect();
    const host = document.querySelector('#glass-lens-host');
    return {
      window: rr(document.querySelector('.hero .window')), stage: rr(document.querySelector('.hero-stage')), hero: rr(document.querySelector('.hero')), cc: rr(document.querySelector('.control-centre')),
      lens: hit ? [Math.round(hit.left + hit.width / 2), Math.round(hit.top + hit.height / 2), Math.round(hit.width / 2)] : null,
      source: host?.dataset.lensSource, cover: host?.dataset.lensCover,
      orbs: [...document.querySelectorAll('.hero .orb')].map((o) => { const r = o.getBoundingClientRect(); return [o.className.split(' ')[1], Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2), Math.round(r.width / 2)]; }),
    };
  });
  console.log(`${w}x${h}`, JSON.stringify(g));
  await context.close();
}
await browser.close();
