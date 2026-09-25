/**
 * Critic check (second pass) for the vaporwave CSS floor: freeze the
 * `.vw-floor::before` animation at fixed fractions of its cycle on every page
 * that uses Horizon.astro (Home closer, Services ask, Contact side scene,
 * Sent stage), dark and light, for the frozen "before" build and for the
 * "after" build's two loop variants, plus one reduced-motion frame each, and
 * compose them into one labelled PNG sheet per page.
 *
 * Written 09-25-26 for Tier 3 stage 3, Tier A fix round, critic second pass.
 * The fix round's own crop strips only show the frames either side of each
 * seam, so they cannot show what the floor looks like at 60-95% of the cycle
 * or with motion reduced; this does, by pausing every animation on the floor
 * layer and setting its currentTime directly (no film, no timing jitter).
 *
 * Usage (serve both builds first, e.g. snap.mjs --reuse --hold):
 *   BDL_GPU=1 node scripts/themes/harness/vw-floor-critic2.mjs \
 *     --before http://127.0.0.1:4468 --after http://127.0.0.1:4469
 *
 * Output: scripts/themes/.out/stage3-proofs/critic2/floor__<page>__<scheme>.png
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'stage3-proofs', 'critic2');
const arg = (n, f) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : f; };
const BEFORE = arg('before');
const AFTER = arg('after');
if (!BEFORE || !AFTER) { console.error('need --before and --after'); process.exit(2); }

const PAGES = [
  { key: 'home', path: '/t/vaporwave/', sel: '.closer-band' },
  { key: 'services', path: '/t/vaporwave/services/', sel: '.ask-band' },
  { key: 'contact', path: '/t/vaporwave/contact/', sel: '.side-scene' },
  { key: 'sent', path: '/t/vaporwave/contact/sent/', sel: '.stage-horizon' },
];
const FRACS = [0, 0.6, 0.8, 0.95];
const COLS = [
  { label: 'before (frozen base)', base: BEFORE, q: '' },
  { label: 'after, restart (default)', base: AFTER, q: '' },
  { label: 'after, tear (?vwLoop=tear)', base: AFTER, q: '?vwLoop=tear' },
];

const useGpu = process.env.BDL_GPU === '1';
const browser = await chromium.launch({
  args: ['--hide-scrollbars', ...(useGpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : [])],
});
{
  const p = await browser.newPage();
  const r = await p.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl');
    const e = gl && gl.getExtension('WEBGL_debug_renderer_info');
    return gl ? (e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) : 'no webgl';
  });
  console.log('renderer:', r);
  if (useGpu && /swiftshader|llvmpipe/i.test(r)) { await browser.close(); process.exit(4); }
  await p.close();
}

async function shoot(base, path, q, sel, scheme, reduced, frac) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: scheme, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await ctx.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
  await suppressPrompt(ctx);
  await ctx.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await ctx.newPage();
  await page.goto(base + path + q, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: 'center' }), sel);
  await page.waitForTimeout(400);
  const info = await page.evaluate((f) => {
    const floor = document.querySelector('.vw-floor');
    if (!floor) return 'no floor';
    const anims = floor.getAnimations({ subtree: true });
    for (const a of anims) {
      a.pause();
      const d = a.effect.getTiming().duration;
      a.currentTime = f * d;
    }
    return anims.map((a) => `${a.animationName}@${Math.round(a.currentTime)}`).join(',') || 'none';
  }, frac);
  await page.waitForTimeout(150);
  const buf = await page.locator(sel).first().screenshot();
  await ctx.close();
  return { buf, info };
}

await mkdir(OUT, { recursive: true });
const log = [];
for (const pg of PAGES) {
  for (const scheme of ['dark', 'light']) {
    const rows = [];
    for (const f of [...FRACS, 'reduced']) {
      const row = [];
      for (const c of COLS) {
        const reduced = f === 'reduced';
        const r = await shoot(c.base, pg.path, c.q, pg.sel, scheme, reduced, reduced ? 0 : f);
        log.push(`${pg.key} ${scheme} ${f} ${c.label}: ${r.info}`);
        row.push(await loadImage(r.buf));
      }
      rows.push({ f, row });
    }
    const scale = Math.min(1, 620 / rows[0].row[0].width);
    const cw = Math.round(rows[0].row[0].width * scale);
    const ch = Math.max(...rows.flatMap((r) => r.row.map((i) => Math.round(i.height * scale))));
    const LBL = 40, RL = 150;
    const cv = createCanvas(RL + cw * 3 + 20, LBL + rows.length * (ch + 10));
    const g = cv.getContext('2d');
    g.fillStyle = '#111'; g.fillRect(0, 0, cv.width, cv.height);
    g.fillStyle = '#fff'; g.font = 'bold 22px sans-serif';
    COLS.forEach((c, i) => g.fillText(c.label, RL + i * (cw + 10), 28));
    rows.forEach((r, j) => {
      const y = LBL + j * (ch + 10);
      g.fillStyle = '#fff'; g.font = 'bold 22px sans-serif';
      g.fillText(r.f === 'reduced' ? 'reduced' : `${Math.round(r.f * 100)}%`, 10, y + 30);
      r.row.forEach((img, i) => g.drawImage(img, RL + i * (cw + 10), y, Math.round(img.width * scale), Math.round(img.height * scale)));
    });
    const file = join(OUT, `floor__${pg.key}__${scheme}.png`);
    await writeFile(file, cv.toBuffer('image/png'));
    console.log('wrote', file);
  }
}
await writeFile(join(OUT, 'floor-log.txt'), log.join('\n') + '\n');
await browser.close();
