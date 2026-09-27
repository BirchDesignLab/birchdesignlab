/**
 * B2 glass fix round 3 (09-26-26), seat glass-fix-r3: the poster now carries
 * the lens's own spot and size, so check the two states where the poster is
 * what a visitor sees: E10 (reduced transparency: canvas and hit off, poster
 * on, at its CSS spot) and a WebGL context loss after a drag (the poster must
 * come back where the lens WAS, not at the CSS spot), then restore.
 * GPU Chromium (aborts on SwiftShader), prompt suppressed.
 *
 * Usage: node scripts/themes/glassmorphism/b2r3-glass-fix-e10.mjs --base http://127.0.0.1:4471 [--out <dir>]
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (n, f) => { const i = args.indexOf(`--${n}`); return i === -1 ? f : args[i + 1]; };
const base = arg('base', 'http://127.0.0.1:4471');
const OUT = arg('out', join(HERE, '..', '.out', 'stage3-b2', 'glass-fix-r3', 'e10'));
await mkdir(OUT, { recursive: true });
const R = {};
const browser = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
{
  const p = await browser.newPage();
  R.renderer = await p.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); });
  await p.close();
  if (/swiftshader|llvmpipe/i.test(R.renderer)) throw new Error('software renderer; abort');
}
const rect = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const q = e.getBoundingClientRect(); return { x: Math.round(q.left + q.width / 2), y: Math.round(q.top + q.height / 2), w: Math.round(q.width), display: getComputedStyle(e).display }; }, sel);

// E10
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await suppressPrompt(context);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] });
  await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  R.e10 = { poster: await rect(page, '.lens-poster'), canvas: await rect(page, '.lens-canvas'), hit: await rect(page, '.lens-hit') };
  await page.screenshot({ path: join(OUT, 'e10__1440x900.png') });
  await context.close();
}
// context loss after a drag
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await suppressPrompt(context);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('.lens-poster')?.style.display === 'none', { timeout: 10000 });
  await page.waitForTimeout(400);
  const h = await rect(page, '.lens-hit');
  await page.mouse.move(h.x, h.y); await page.mouse.down();
  for (let i = 1; i <= 12; i++) { await page.mouse.move(h.x + 60 * i / 12, h.y + 260 * i / 12); await page.waitForTimeout(16); }
  await page.waitForTimeout(150); await page.mouse.up(); await page.waitForTimeout(900);
  const lensAt = await rect(page, '.lens-hit');
  await page.evaluate(() => { window.__lose = document.querySelector('.lens-canvas').getContext('webgl').getExtension('WEBGL_lose_context'); window.__lose.loseContext(); });
  await page.waitForTimeout(400);
  const posterLost = await rect(page, '.lens-poster');
  await page.screenshot({ path: join(OUT, 'lost__1440x900.png') });
  await page.evaluate(() => window.__lose.restoreContext());
  await page.waitForFunction(() => document.querySelector('.lens-poster')?.style.display === 'none', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(400);
  R.contextLoss = { lensAt, posterWhileLost: posterLost, posterMatchesLens: posterLost.display !== 'none' && Math.abs(posterLost.x - lensAt.x) <= 1 && Math.abs(posterLost.y - lensAt.y) <= 1 && Math.abs(posterLost.w - lensAt.w) <= 1, afterRestore: { poster: await rect(page, '.lens-poster'), canvasVisibility: await page.evaluate(() => document.querySelector('.lens-canvas').style.visibility) } };
  await page.screenshot({ path: join(OUT, 'restored__1440x900.png') });
  await context.close();
}
await browser.close();
await writeFile(join(OUT, 'e10-results.json'), JSON.stringify(R, null, 2));
console.log(JSON.stringify(R, null, 1));
