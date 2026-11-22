/**
 * BDL-011 (Field Guide to the Schools) hero: the same Home view in all six
 * schools, cut into six vertical slices side by side, in the switcher's order
 * of era, each school in its own native scheme.
 *
 * Written 11-22-26. The study's first hero was a single-school capture of the
 * Portal; the entry's own note asked for one that shows more than one school.
 * Each slice is one sixth of the hero's width. Version 2 (after two critiques,
 * 11-22-26): every slice starts below its school's header, so no nav word is
 * cut at a seam, and is aligned on the school's largest headline in main (the
 * billboard): the headline's first line starts a fixed distance in from the
 * slice's left edge and lands at the same height in all six, so the six read
 * as one page. The lower half is darkened in the image itself, so the study
 * page's kicker and summary read over the pale schools without touching the
 * shared layout. A phone's cover-crop still shows only the middle two slices.
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

// The switcher's order (meta.ts `order`), each school in its native scheme.
const SCHOOLS = [
  ['bauhaus', 'light'],
  ['swiss', 'light'],
  ['vaporwave', 'dark'],
  ['cottagecore', 'light'],
  ['grandmillennial', 'light'],
  ['glassmorphism', 'light'],
];
// The hero is W x H CSS px at SCALE; each school is captured in a taller
// viewport (VH) so the slice can start below its header.
const W = 1600, H = 597, VH = 1400, SCALE = 2;
const INSET = 18; // the headline's left edge, in from the slice's left edge
const TOP_MAX = 150; // the headline's top, down from the hero's top, at most

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
  const ctx = await browser.newContext({ viewport: { width: W, height: VH }, deviceScaleFactor: SCALE, colorScheme: scheme, reducedMotion: 'no-preference' });
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
  // The billboard: the largest-font text in main (its first line's box), and the header's bottom.
  const geo = await page.evaluate(() => {
    let best = null;
    const walker = document.createTreeWalker(document.querySelector('main') ?? document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent.trim()) continue;
      const el = n.parentElement;
      if (el.closest('[aria-hidden="true"]') && !el.closest('h1')) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue;
      const r = document.createRange();
      r.selectNodeContents(n);
      const box = r.getClientRects()[0];
      if (!box || box.width < 20 || box.top > innerHeight) continue;
      const fs = parseFloat(cs.fontSize);
      if (!best || fs > best.fs) best = { fs, text: n.textContent.trim().slice(0, 24), left: box.left, top: box.top, width: box.width, height: box.height };
    }
    const head = document.querySelector('header');
    return { best, headBottom: head ? head.getBoundingClientRect().bottom : 0 };
  });
  if (!geo.best) throw new Error(`${id}: no headline found`);
  console.log(id, 'headline', JSON.stringify(geo.best.text), Math.round(geo.best.fs) + 'px', 'at', Math.round(geo.best.left), Math.round(geo.best.top), 'header ends', Math.round(geo.headBottom));
  const png = await page.screenshot();
  if (keep) { await mkdir(keep, { recursive: true }); await writeFile(join(keep, `${id}.png`), png); }
  const img = await loadImage(png);
  // Line boxes differ by school (line-height, font metrics), so align on ink: the first row of the
  // headline's first letter (the box's left half-em, which is also what the slice shows; vaporwave's
  // katakana overlaps the right of its line box) where a few percent of the pixels differ sharply from
  // the same column just above the box (per column, so a gradient ground does not count as ink).
  const cv = createCanvas(img.width, img.height);
  const cg = cv.getContext('2d');
  cg.drawImage(img, 0, 0);
  const bx = Math.round(geo.best.left * SCALE), bw = Math.round(Math.min(geo.best.width, geo.best.fs * 0.5) * SCALE);
  const by = Math.round(geo.best.top * SCALE), bh = Math.round(geo.best.height * SCALE);
  const ref = cg.getImageData(bx, Math.max(0, by - 4), bw, 1).data;
  let inkTop = geo.best.top;
  for (let y = by; y < by + bh; y++) {
    const row = cg.getImageData(bx, y, bw, 1).data;
    let n = 0;
    for (let i = 0; i < row.length; i += 4) if (Math.abs(row[i] - ref[i]) + Math.abs(row[i + 1] - ref[i + 1]) + Math.abs(row[i + 2] - ref[i + 2]) > 150) n++;
    if (n > bw * 0.05) { inkTop = y / SCALE; break; }
  }
  console.log(id, 'ink starts', Math.round(inkTop - geo.best.top), 'px into the line box');
  shots.push({ img, ...geo, inkTop });
  console.log('captured', id, scheme);
  await ctx.close();
}
await browser.close();

const cw = W * SCALE, ch = H * SCALE;
const c = createCanvas(cw, ch);
const g = c.getContext('2d');
// One height for every headline: as high as TOP_MAX, but never so high that a
// slice would start above its own header's bottom edge.
const top = Math.max(24, Math.min(TOP_MAX, ...shots.map((s) => s.inkTop - s.headBottom)));
SCHOOLS.forEach(([id], i) => {
  const s = shots[i];
  const x0 = Math.round((i * cw) / SCHOOLS.length);
  const x1 = Math.round(((i + 1) * cw) / SCHOOLS.length);
  const sx = Math.max(0, Math.min((s.best.left - INSET) * SCALE, s.img.width - (x1 - x0)));
  const sy = Math.max(0, Math.min(Math.round((s.inkTop - top) * SCALE), s.img.height - ch));
  g.drawImage(s.img, sx, sy, x1 - x0, ch, x0, 0, x1 - x0, ch);
  console.log(id, 'slice from', Math.round(sx / SCALE), Math.round(sy / SCALE));
});
// The lower part darkened to nearly the page's own ground, for the study page's title, kicker and
// summary: aligned on the headline, each slice's lower half is that school's body copy, and text
// over text read badly (worst on a phone, where the title wraps lower).
const shade = g.createLinearGradient(0, ch * 0.3, 0, ch);
shade.addColorStop(0, 'rgba(27, 25, 21, 0)');
shade.addColorStop(0.45, 'rgba(27, 25, 21, 0.82)');
shade.addColorStop(1, 'rgba(27, 25, 21, 0.94)');
g.fillStyle = shade;
g.fillRect(0, 0, cw, ch);
await mkdir(dirname(out), { recursive: true });
await writeFile(out, await c.encode('png'));
console.log('wrote', out, cw, 'x', ch);
