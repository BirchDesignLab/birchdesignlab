/**
 * Stage 6 wave 1, task 1: whole-page sheets of every glass page at every
 * review size (1440, 1280, 1024, 820, 390), light and dark, plus viewport
 * frames at scroll 0 and one screen down (the fixed wallpaper only paints the
 * top viewport of a full-page shot, so glass is judged from those).
 * GPU Chromium, prefers-reduced-transparency forced to no-preference, the
 * portal prompt suppressed, reduced motion emulated so two snaps diff cleanly.
 *
 * Two passes and a compare:
 *   LABEL=sheets-before  node scripts/themes/snap.mjs --name stage6-base --reuse --port 4470 -- node scripts/themes/stage6/w1-t1-sheets.mjs
 *   LABEL=sheets-after   node scripts/themes/snap.mjs --name s6-w1-t1 --reuse --port 4470 -- node scripts/themes/stage6/w1-t1-sheets.mjs
 *   COMPARE=sheets-before,sheets-after node scripts/themes/stage6/w1-t1-sheets.mjs
 * The compare writes a before|after sheet per shot and the changed-pixel
 * share (per-channel difference over 2) to compare.json.
 * Output: scripts/themes/.out/stage6/w1/t1/<label>/
 */
import { chromium } from 'playwright';
import sharp from 'sharp';
import { writeFile, mkdir, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '.out', 'stage6', 'w1', 't1');

async function diff(a, b) {
  const A = await sharp(a).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const B = await sharp(b).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  if (A.info.width !== B.info.width || A.info.height !== B.info.height) return { size: `${A.info.width}x${A.info.height} vs ${B.info.width}x${B.info.height}`, share: 1 };
  let n = 0, max = 0;
  for (let i = 0; i < A.data.length; i += 4) {
    const d = Math.max(Math.abs(A.data[i] - B.data[i]), Math.abs(A.data[i + 1] - B.data[i + 1]), Math.abs(A.data[i + 2] - B.data[i + 2]));
    if (d > max) max = d;
    if (d > 2) n++;
  }
  return { share: +(n / (A.data.length / 4)).toFixed(5), max };
}

if (process.env.COMPARE) {
  const [a, b] = process.env.COMPARE.split(',');
  const out = join(ROOT, `${a}-vs-${b}`);
  await mkdir(out, { recursive: true });
  const files = (await readdir(join(ROOT, a))).filter((f) => f.endsWith('.png'));
  const res = {};
  for (const f of files) {
    const pa = join(ROOT, a, f), pb = join(ROOT, b, f);
    try {
      res[f] = await diff(pa, pb);
      const [ma, mb] = await Promise.all([sharp(pa).metadata(), sharp(pb).metadata()]);
      const cw = Math.min(ma.width, 720);
      const ha = Math.round((ma.height / ma.width) * cw), hb = Math.round((mb.height / mb.width) * cw);
      const [ta, tb] = await Promise.all([sharp(pa).resize(cw, ha).toBuffer(), sharp(pb).resize(cw, hb).toBuffer()]);
      await sharp({ create: { width: cw * 2 + 36, height: Math.max(ha, hb) + 24, channels: 3, background: '#1b1b1d' } })
        .composite([{ input: ta, left: 12, top: 12 }, { input: tb, left: cw + 24, top: 12 }])
        .png()
        .toFile(join(out, f));
    } catch (e) { res[f] = { error: String(e).split('\n')[0] }; }
  }
  await writeFile(join(out, 'compare.json'), JSON.stringify(res, null, 2));
  const changed = Object.entries(res).filter(([, v]) => v.share > 0.0005 || v.error || v.size);
  console.log(`${files.length} shots, ${changed.length} changed`);
  for (const [k, v] of changed) console.log(k, JSON.stringify(v));
  process.exit(0);
}

const OUT = join(ROOT, process.env.LABEL || 'sheets');
await mkdir(OUT, { recursive: true });
const base = process.env.SNAP_BASE || 'http://127.0.0.1:4470';
const browser = await chromium.launch({ headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'] });
{
  const p = await browser.newPage();
  const renderer = await p.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); });
  await p.close();
  console.log('renderer:', renderer);
  if (/swiftshader|llvmpipe|software/i.test(renderer)) throw new Error('software renderer: evidence invalid');
  await writeFile(join(OUT, 'renderer.txt'), renderer);
}
const SIZES = [[1440, 900], [1280, 800], [1024, 768], [820, 1180], [390, 844]];
const PAGES = ['', 'about/', 'services/', 'contact/'];
for (const scheme of ['light', 'dark']) {
  for (const [w, h] of SIZES) {
    const context = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, reducedMotion: 'reduce' });
    await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
    await suppressPrompt(context);
    await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
    for (const path of PAGES) {
      const tag = `${(path || 'home').replace(/\//g, '')}__${scheme}__${w}`;
      await page.goto(`${base}/t/glassmorphism/${path}`, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      if (!path) await page.waitForFunction(() => document.querySelector('.lens-canvas')?.style.visibility === 'visible', null, { timeout: 9000 }).catch(() => {});
      await page.waitForTimeout(2000);
      await page.screenshot({ path: join(OUT, `${tag}__full.png`), fullPage: true });
      for (const y of [0, h]) {
        await page.evaluate((y) => scrollTo(0, y), y);
        await page.waitForTimeout(500);
        await page.screenshot({ path: join(OUT, `${tag}__vp${y}.png`) });
      }
    }
    await context.close();
    console.log('done', scheme, w);
  }
}
await browser.close();
