/**
 * BDL-011 (Field Guide to the Schools) hero: the same Home view in all six
 * schools, cut into six vertical slices side by side, in the switcher's order
 * of era, each school in its own native scheme.
 *
 * Written 11-22-26. The study's first hero was a single-school capture of the
 * Portal; the entry's own note asked for one that shows more than one school.
 * Each slice is one sixth of the hero's width, taken from the part of that
 * school's capture that says the school fastest (SRC, in CSS px from the
 * left; by default the same x range as the slice): bauhaus's see-saw of
 * primaries, glass's frosted window, cottagecore's pressed-flower sheet.
 *
 * /lab/[slug] renders the hero full-bleed, cover-cropped at about 62vh with a
 * veil and the title over its lower half, so the slices are taken from the top
 * of Home (header and billboard) and sized like the other study heroes
 * (3200 x 1194 at scale 2, about 2.7:1).
 *
 * Needs a served build. snap.mjs builds and serves one and sets SNAP_BASE:
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name bdl011-hero --port 4473 -- node scripts/lab/capture-bdl-011-hero.mjs
 * Options: --out <png> (default src/content/lab/bdl-011/hero.png), --settle <ms>
 * (default 3500, long enough for bauhaus's assembly and the WebGL fields),
 * --keep <dir> to also save each school's full capture.
 * GPU Chromium (d3d11) with the renderer checked: a software renderer draws
 * vaporwave's sunset and glass's lens differently, so it refuses to run on one.
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { suppressPrompt } from '../themes/lib/portal-prompt.mjs';

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i === -1 ? fallback : process.argv[i + 1]; };
const BASE = process.env.SNAP_BASE || 'http://127.0.0.1:4473';
const out = arg('out', 'src/content/lab/bdl-011/hero.png');
const settle = Number(arg('settle', 3500));
const keep = arg('keep', null);

// The switcher's order (meta.ts `order`), each school in its native scheme,
// with the slice's source x (CSS px at 1600 wide) where the default misses.
const SCHOOLS = [
  ['bauhaus', 'light', 932],
  ['swiss', 'light'],
  ['vaporwave', 'dark'],
  ['cottagecore', 'light', 992],
  ['grandmillennial', 'light'],
  ['glassmorphism', 'light', 384],
];
const W = 1600, H = 597, SCALE = 2;

const browser = await chromium.launch({ headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'] });
{
  const p = await browser.newPage();
  const renderer = await p.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl');
    const e = gl?.getExtension('WEBGL_debug_renderer_info');
    return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown';
  });
  await p.close();
  console.log('renderer:', renderer);
  if (/swiftshader|llvmpipe|software|unknown/i.test(renderer)) { await browser.close(); throw new Error(`software renderer: ${renderer}`); }
}

const shots = [];
for (const [id, scheme] of SCHOOLS) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: SCALE, colorScheme: scheme, reducedMotion: 'no-preference' });
  await suppressPrompt(ctx);
  await ctx.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
  await ctx.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}/t/${id}/`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(settle);
  const got = await page.evaluate(() => [document.documentElement.dataset.theme, document.documentElement.dataset.scheme]);
  if (got[0] !== id || (got[1] && got[1] !== scheme)) throw new Error(`${id}: page says theme ${got[0]}, scheme ${got[1]}`);
  if (errors.length) console.warn(`${id}: page errors`, errors);
  const png = await page.screenshot();
  if (keep) { await mkdir(keep, { recursive: true }); await writeFile(join(keep, `${id}.png`), png); }
  shots.push(await loadImage(png));
  console.log('captured', id, scheme);
  await ctx.close();
}
await browser.close();

const cw = W * SCALE, ch = H * SCALE;
const c = createCanvas(cw, ch);
const g = c.getContext('2d');
SCHOOLS.forEach(([, , src], i) => {
  const x0 = Math.round((i * cw) / SCHOOLS.length);
  const x1 = Math.round(((i + 1) * cw) / SCHOOLS.length);
  const sx = src === undefined ? x0 : Math.min(src * SCALE, cw - (x1 - x0));
  g.drawImage(shots[i], sx, 0, x1 - x0, ch, x0, 0, x1 - x0, ch);
});
await mkdir(dirname(out), { recursive: true });
await writeFile(out, await c.encode('png'));
console.log('wrote', out, cw, 'x', ch);
