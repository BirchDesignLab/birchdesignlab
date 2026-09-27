/**
 * Wave B2 glass RE-CRITIC round 2 (09-26-26): is the frost slider visible in
 * pixels where a pane crosses a real orb edge? 1440x900 light and dark, the
 * hero window over the violet orb's edge, frost set by real keys (Home, End,
 * and 5 PageUps from Home) on the slider, the page at scroll 0 each time.
 * Writes a labelled sheet and the per-step mean pixel difference vs frost 50.
 * GPU Chromium, reduced transparency forced off, prompt suppressed.
 * Usage: BDL_GPU=1 node scripts/themes/glassmorphism/b2r3-glass-critic2-frost.mjs --base http://127.0.0.1:4475
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'stage3-b2', 'glass-recritic-r2', 'own');
const base = process.argv[process.argv.indexOf('--base') + 1] || 'http://127.0.0.1:4475';
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const R = {};
const cells = [];
async function px(buf) { const i = await loadImage(buf); const c = createCanvas(i.width, i.height); const g = c.getContext('2d'); g.drawImage(i, 0, 0); return g.getImageData(0, 0, i.width, i.height).data; }
for (const scheme of ['light', 'dark']) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: scheme });
  await suppressPrompt(context);
  await context.addInitScript((s) => { try { localStorage.setItem('bdl-scheme', s); } catch {} }, scheme);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }, { name: 'prefers-color-scheme', value: scheme }] });
  const renderer = await page.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); });
  if (/swiftshader|llvmpipe/i.test(renderer)) throw new Error('software renderer; abort');
  R.renderer = renderer;
  await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
  if ((await page.evaluate(() => document.documentElement.dataset.scheme)) !== scheme) { await page.evaluate((s) => { document.documentElement.dataset.scheme = s; }, scheme); }
  await page.waitForFunction(() => document.querySelector('.lens-poster')?.style.display === 'none', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(600);
  const clip = { x: 280, y: 182, width: 420, height: 150 };
  const shots = {};
  for (const [label, keys] of [['0', ['Home']], ['50', ['Home', 'PageUp', 'PageUp', 'PageUp', 'PageUp', 'PageUp']], ['100', ['End']]]) {
    await page.focus('.cc-frost');
    for (const k of keys) await page.keyboard.press(k);
    await page.evaluate(() => { document.activeElement.blur(); window.scrollTo(0, 0); });
    await page.waitForTimeout(500);
    const v = await page.evaluate(() => ({ value: document.querySelector('.cc-frost').value, bf: getComputedStyle(document.querySelector('.hero .window')).backdropFilter }));
    shots[label] = await page.screenshot({ clip });
    R[`${scheme}__${label}`] = v;
    cells.push([`${scheme} frost ${label}: ${v.bf.replace(/url\([^)]*\)\s*/, '').split(' ')[0]}`, shots[label]]);
  }
  const b = await px(shots['50']);
  for (const l of ['0', '100']) {
    const a = await px(shots[l]);
    let s = 0, over8 = 0; const n = a.length / 4;
    for (let i = 0; i < a.length; i += 4) { const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])); s += d; if (d > 8) over8++; }
    R[`${scheme}__${l}_vs_50`] = { meanDiff: +(s / n).toFixed(2), pctOver8: +(over8 / n * 100).toFixed(1) };
  }
  await context.close();
}
{
  const imgs = await Promise.all(cells.map(async ([l, b]) => [l, await loadImage(b)]));
  const w = 420, h = 150, lh = 30, pad = 10;
  const c = createCanvas(3 * (w + pad) + pad, 2 * (h + lh + pad) + pad + 40);
  const g = c.getContext('2d'); g.fillStyle = '#1c1c1c'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#fff'; g.font = 'bold 22px sans-serif'; g.fillText('Frost 0 / 50 / 100 (real keys): hero window over the violet orb edge', pad, 28);
  g.font = '20px sans-serif';
  imgs.forEach(([l, im], i) => { const x = pad + (i % 3) * (w + pad), y = 40 + pad + Math.floor(i / 3) * (h + lh + pad); g.fillText(l, x, y + 20); g.drawImage(im, x, y + lh); });
  await writeFile(join(OUT, 'sheet__frost-orb-edge.jpg'), c.toBuffer('image/jpeg', 92));
}
await writeFile(join(OUT, 'frost-orb-edge.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R));
await browser.close();
