/**
 * B2 glass fix round 3 (09-26-26), seat glass-fix-r3: film a real grab of
 * the lens where it is visible (the re-critic's blocker: a drag on the lens
 * selected the headline at 1280 and 1024, and a phone could not grab it at
 * all). At 1280x800 and 1024x768 a mouse drag from the lens centre; at
 * 390x844 a CDP touch drag. Each is a timestamped frame strip (JPEG q92,
 * 22 px labels), with the lens centre, scroll and selection logged per frame.
 * GPU Chromium (aborts on SwiftShader), reduced transparency forced off,
 * the portal prompt suppressed.
 *
 * Usage: node scripts/themes/glassmorphism/b2r3-glass-fix-grabfilm.mjs --base http://127.0.0.1:4471 [--out <dir>]
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (n, f) => { const i = args.indexOf(`--${n}`); return i === -1 ? f : args[i + 1]; };
const base = arg('base', 'http://127.0.0.1:4471');
const OUT = arg('out', join(HERE, '..', '.out', 'stage3-b2', 'glass-fix-r3', 'grabfilm'));
await mkdir(OUT, { recursive: true });
const R = {};
const browser = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
{
  const p = await browser.newPage();
  R.renderer = await p.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); });
  await p.close();
  console.log('renderer:', R.renderer);
  if (/swiftshader|llvmpipe/i.test(R.renderer)) throw new Error('software renderer; abort');
}

async function strip(file, frames, title, scale) {
  const imgs = await Promise.all(frames.map(async (f) => [f.label, await loadImage(f.buf)]));
  const cw = imgs[0][1].width * scale, ch = imgs[0][1].height * scale;
  const cols = 4, rows = Math.ceil(imgs.length / cols), lh = 32, pad = 10, th = 40;
  const c = createCanvas(cols * (cw + pad) + pad, th + rows * (ch + lh + pad) + pad);
  const g = c.getContext('2d');
  g.fillStyle = '#1c1c1c'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#fff'; g.font = 'bold 24px sans-serif'; g.fillText(title, pad, 30);
  g.font = '22px sans-serif';
  imgs.forEach(([l, im], i) => {
    const x = pad + (i % cols) * (cw + pad), y = th + pad + Math.floor(i / cols) * (ch + lh + pad);
    g.fillStyle = '#fff'; g.fillText(l, x, y + 24);
    g.drawImage(im, x, y + lh, cw, ch);
  });
  await writeFile(join(OUT, file), c.toBuffer('image/jpeg', 92));
}

for (const [w, h, phone] of [[1280, 800, false], [1024, 768, false], [390, 844, true]]) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: phone, isMobile: phone, deviceScaleFactor: 1 });
  await suppressPrompt(context);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('.lens-poster')?.style.display === 'none', { timeout: 10000 });
  await page.waitForTimeout(500);
  const state = () => page.evaluate(() => { const q = document.querySelector('.lens-hit').getBoundingClientRect(); return { c: [Math.round(q.left + q.width / 2), Math.round(q.top + q.height / 2)], scrollY, sel: String(getSelection()) }; });
  const s0 = await state();
  const [x0, y0] = s0.c;
  const dx = phone ? 110 : 360, dy = phone ? -260 : 330;
  const frames = [];
  const t0 = Date.now();
  const shot = async (tag) => { const st = await state(); frames.push({ label: `+${Date.now() - t0}ms ${tag} lens ${st.c.join(',')} scroll ${st.scrollY}${st.sel ? ' SEL' : ''}`, buf: await page.screenshot({ type: 'jpeg', quality: 92 }), st }); };
  await shot('rest');
  if (phone) await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
  else { await page.mouse.move(x0, y0); await page.mouse.down(); }
  for (let i = 1; i <= 16; i++) {
    const x = x0 + dx * i / 16, y = y0 + dy * i / 16;
    if (phone) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
    else await page.mouse.move(x, y);
    await page.waitForTimeout(16);
    if (i % 4 === 0) await shot(`drag ${i}/16`);
  }
  if (phone) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  else await page.mouse.up();
  for (const ms of [120, 300, 700]) { await page.waitForTimeout(ms); await shot('released'); }
  const last = frames.at(-1).st;
  R[`${w}x${h}`] = { from: s0.c, to: last.c, movedPx: Math.round(Math.hypot(last.c[0] - x0, last.c[1] - y0)), scroll: [s0.scrollY, last.scrollY], selectedAnyFrame: frames.some((f) => f.st.sel) };
  await strip(`film__grab__${w}x${h}.jpg`, frames, `Grab the visible lens at ${w}x${h} (${phone ? 'touch' : 'mouse'}); t from press`, phone ? 0.6 : 0.4);
  await context.close();
}
await browser.close();
await writeFile(join(OUT, 'grabfilm-results.json'), JSON.stringify(R, null, 2));
console.log(JSON.stringify(R, null, 1));
