/**
 * Stage 6 wave 1, task 1: the Portal ignores prefers-reduced-transparency for
 * glass (stop 1 call 1 answer (a)) and keeps prefers-contrast: more.
 *
 * For every glass page at 1440, 1024 and 390, both schemes, viewport frames
 * at scroll 0 and at one screen down are taken three ways on GPU Chromium:
 *   default   prefers-reduced-transparency: no-preference
 *   reduce    prefers-reduced-transparency: reduce
 *   contrast  prefers-contrast: more (with reduce too)
 * Pass: reduce equals default pixel for pixel (per-channel difference over 2
 * on no more than 0.05% of pixels, GPU noise), and contrast still takes the
 * fallback: panes with no backdrop-filter, a flat wallpaper, no lens mounted
 * on Home and the poster shown.
 *
 * Usage: BDL_GPU=1 node scripts/themes/snap.mjs --name s6-w1-t1 --reuse --port 4470 -- node scripts/themes/stage6/w1-t1-media.mjs
 *   LABEL=media-before against snap-stage6-base shows the old behaviour.
 * Output: scripts/themes/.out/stage6/w1/t1/<LABEL>/ (frames, a side-by-side
 * sheet per page and results.json)
 */
import { chromium } from 'playwright';
import sharp from 'sharp';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'stage6', 'w1', 't1', process.env.LABEL || 'media');
await mkdir(OUT, { recursive: true });
const base = process.env.SNAP_BASE || 'http://127.0.0.1:4470';

const browser = await chromium.launch({ headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'] });
const R = { base, pages: {} };
{
  const p = await browser.newPage();
  R.renderer = await p.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); });
  await p.close();
  console.log('renderer:', R.renderer);
  if (/swiftshader|llvmpipe|software/i.test(R.renderer)) throw new Error('software renderer: evidence invalid');
}

const MODES = {
  default: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }, { name: 'prefers-contrast', value: 'no-preference' }],
  reduce: [{ name: 'prefers-reduced-transparency', value: 'reduce' }, { name: 'prefers-contrast', value: 'no-preference' }],
  contrast: [{ name: 'prefers-reduced-transparency', value: 'reduce' }, { name: 'prefers-contrast', value: 'more' }],
};
const PAGES = ['', 'about/', 'services/', 'contact/'];
const SIZES = [[1440, 900], [1024, 768], [390, 844]];

async function shoot(w, h, scheme, path, mode) {
  // Reduced motion in every mode, only so the orbs' drift cannot differ
  // between two separately loaded pages; it is the same in all three modes.
  const context = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, reducedMotion: 'reduce' });
  await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
  await suppressPrompt(context);
  await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: MODES[mode] });
  await page.goto(`${base}/t/glassmorphism/${path}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  if (path === '' && mode !== 'contrast') await page.waitForFunction(() => document.querySelector('.lens-canvas')?.style.visibility === 'visible', null, { timeout: 9000 }).catch(() => {});
  await page.waitForTimeout(2200);
  const info = await page.evaluate(() => {
    const pane = document.querySelector('.glass');
    const poster = document.querySelector('.lens-poster');
    return {
      reduceMatches: matchMedia('(prefers-reduced-transparency: reduce)').matches,
      contrastMatches: matchMedia('(prefers-contrast: more)').matches,
      paneBackdrop: pane ? getComputedStyle(pane).backdropFilter : null,
      wallpaper: getComputedStyle(document.querySelector('main'), '::before').backgroundImage.slice(0, 40),
      lensHits: document.querySelectorAll('.lens-hit').length,
      lensCanvases: document.querySelectorAll('.lens-canvas').length,
      posterDisplay: poster ? getComputedStyle(poster).display : null,
    };
  });
  const shots = [];
  for (const y of [0, h]) {
    await page.evaluate((y) => scrollTo(0, y), y);
    await page.waitForTimeout(500);
    shots.push(await page.screenshot());
  }
  await context.close();
  return { info, shots };
}

async function diff(a, b) {
  const A = await sharp(a).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const B = await sharp(b).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  if (A.info.width !== B.info.width || A.info.height !== B.info.height) return { size: 'differs', share: 1 };
  let n = 0, max = 0;
  for (let i = 0; i < A.data.length; i += 4) {
    const d = Math.max(Math.abs(A.data[i] - B.data[i]), Math.abs(A.data[i + 1] - B.data[i + 1]), Math.abs(A.data[i + 2] - B.data[i + 2]));
    if (d > max) max = d;
    if (d > 2) n++;
  }
  return { share: +(n / (A.data.length / 4)).toFixed(5), max };
}

async function sideBySide(bufs, file) {
  const metas = await Promise.all(bufs.map((b) => sharp(b).metadata()));
  const cw = 480;
  const ch = Math.round((metas[0].height / metas[0].width) * cw);
  const tiles = await Promise.all(bufs.map((b) => sharp(b).resize(cw, ch).toBuffer()));
  await sharp({ create: { width: cw * tiles.length + 12 * (tiles.length + 1), height: ch + 24, channels: 3, background: '#1b1b1d' } })
    .composite(tiles.map((t, i) => ({ input: t, left: 12 + i * (cw + 12), top: 12 })))
    .png()
    .toFile(file);
}

const fails = [];
for (const scheme of ['light', 'dark']) {
  for (const [w, h] of SIZES) {
    for (const path of PAGES) {
      const tag = `${(path || 'home').replace(/\//g, '')}__${scheme}__${w}`;
      const got = {};
      for (const mode of Object.keys(MODES)) got[mode] = await shoot(w, h, scheme, path, mode);
      const d0 = await diff(got.default.shots[0], got.reduce.shots[0]);
      const d1 = await diff(got.default.shots[1], got.reduce.shots[1]);
      const c = got.contrast.info;
      const entry = { reduceVsDefault: [d0, d1], info: { default: got.default.info, reduce: got.reduce.info, contrast: c } };
      R.pages[tag] = entry;
      for (const d of [d0, d1]) if (d.share > 0.0005) fails.push(`${tag} reduce differs from default on ${(d.share * 100).toFixed(2)}% of pixels (max ${d.max})`);
      if (c.paneBackdrop && c.paneBackdrop !== 'none') fails.push(`${tag} contrast: pane backdrop ${c.paneBackdrop}`);
      if (c.wallpaper !== 'none') fails.push(`${tag} contrast: wallpaper ${c.wallpaper}`);
      if (path === '' && (c.lensHits || c.lensCanvases || c.posterDisplay === 'none')) fails.push(`${tag} contrast: lens ${c.lensHits}/${c.lensCanvases}, poster ${c.posterDisplay}`);
      await sideBySide([got.default.shots[0], got.reduce.shots[0], got.contrast.shots[0]], join(OUT, `${tag}__default-reduce-contrast.png`));
      console.log(tag, JSON.stringify({ d0, d1, contrastBackdrop: c.paneBackdrop, lens: c.lensHits }));
    }
  }
}
await browser.close();
R.fails = fails;
await writeFile(join(OUT, 'results.json'), JSON.stringify(R, null, 2));
console.log(fails.length ? `FAIL\n${fails.join('\n')}` : 'PASS');
process.exitCode = fails.length ? 1 : 0;
