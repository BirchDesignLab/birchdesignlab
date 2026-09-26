/**
 * B2 glass fix round 3 (09-26-26), seat glass-fix-r3: measure the lens's orb
 * model against the REAL, visible orb (fix round 3 put the orbs back above
 * the wallpaper). Two measurements at 1440x900, light and dark:
 *
 *   identity  ?lensProbe=identity with the lens at its default start (across
 *             the violet orb's edge): diff against the page with the canvas
 *             hidden; % of disc pixels over 8 levels, and how many of those
 *             lie within 1.5 px of the orb's true edge (the antialiased edge);
 *   seam      ?lensProbe=seam (model on the left half, the true page on the
 *             right), the lens dragged so its seam column crosses the cyan
 *             orb's near-horizontal top edge: the edge row found on the model
 *             side (seam - 3 px) and on the page side (seam + 3 px), at
 *             scroll 0, 10, 20 and 30 (the orbs move under a fixed lens), with
 *             the offset in px; plus 4x nearest crops of the seam.
 *
 * The seam probe must see a real orb edge on the PAGE side before it
 * reports an offset (the re-critic's nit on the old probe's false pass).
 * GPU Chromium (aborts on SwiftShader), reduced transparency forced off,
 * the portal prompt suppressed.
 *
 * Usage: node scripts/themes/glassmorphism/b2r3-glass-fix-seam.mjs --base http://127.0.0.1:4471 [--out <dir>]
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
const OUT = arg('out', join(HERE, '..', '.out', 'stage3-b2', 'glass-fix-r3', 'seam'));
await mkdir(OUT, { recursive: true });
const HOME = `${base}/t/glassmorphism/`;
const R = {};

const browser = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
{
  const p = await browser.newPage();
  R.renderer = await p.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); });
  await p.close();
  console.log('renderer:', R.renderer);
  if (/swiftshader|llvmpipe/i.test(R.renderer)) throw new Error('software renderer; abort');
}

async function ctx(scheme) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: scheme });
  await suppressPrompt(context);
  await context.addInitScript((s) => { try { localStorage.setItem('bdl-scheme', s); } catch {} }, scheme);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }, { name: 'prefers-color-scheme', value: scheme }] });
  return { context, page };
}
async function open(page, scheme, url) {
  await page.goto(url, { waitUntil: 'networkidle' });
  const cur = await page.evaluate(() => document.documentElement.dataset.scheme);
  if (cur !== scheme) { await page.evaluate((s) => { document.documentElement.dataset.scheme = s; }, scheme); await page.waitForTimeout(700); }
  await page.waitForFunction(() => document.querySelector('.lens-poster')?.style.display === 'none', { timeout: 10000 });
  await page.waitForTimeout(400);
}
async function pixels(buf) {
  const im = await loadImage(buf);
  const c = createCanvas(im.width, im.height); const g = c.getContext('2d'); g.drawImage(im, 0, 0);
  return { w: im.width, h: im.height, d: g.getImageData(0, 0, im.width, im.height).data };
}
async function upscale(buf, k) {
  const im = await loadImage(buf);
  const c = createCanvas(im.width * k, im.height * k); const g = c.getContext('2d');
  g.imageSmoothingEnabled = false; g.drawImage(im, 0, 0, im.width * k, im.height * k);
  return c.toBuffer('image/png');
}
async function dragLensTo(page, tx, ty) {
  const b = await (await page.$('.lens-hit')).boundingBox();
  const sx = b.x + b.width / 2, sy = b.y + b.height / 2;
  await page.mouse.move(sx, sy); await page.mouse.down();
  for (let i = 1; i <= 24; i++) { await page.mouse.move(sx + (tx - sx) * i / 24, sy + (ty - sy) * i / 24); await page.waitForTimeout(16); }
  await page.waitForTimeout(200); await page.mouse.up(); await page.waitForTimeout(900);
  await page.mouse.move(5, 5);
}
const orbsNow = (page) => page.evaluate(() => [...document.querySelectorAll('.orb')].map((o) => { const q = o.getBoundingClientRect(); return { cls: o.className, cx: q.left + q.width / 2, cy: q.top + q.height / 2, r: q.width / 2 }; }));

for (const scheme of ['light', 'dark']) {
  /* ---- identity at the default start ---- */
  {
    const { context, page } = await ctx(scheme);
    await open(page, scheme, `${HOME}?lensProbe=identity`);
    const lens = await page.evaluate(() => { const h = document.querySelector('.lens-hit').getBoundingClientRect(); return { cx: h.left + h.width / 2, cy: h.top + h.height / 2, r: h.width / 2 }; });
    const clip = { x: Math.round(lens.cx - lens.r - 4), y: Math.round(lens.cy - lens.r - 4), width: Math.round(2 * lens.r + 8), height: Math.round(2 * lens.r + 8) };
    const orbs = await orbsNow(page);
    const withL = await page.screenshot({ clip });
    await page.evaluate(() => { document.querySelector('.lens-canvas').style.visibility = 'hidden'; });
    await page.waitForTimeout(150);
    const without = await page.screenshot({ clip });
    const a = await pixels(withL), b = await pixels(without);
    let n = 0, over8 = 0, over8Edge = 0, max = 0;
    for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) {
      const gx = clip.x + x + 0.5, gy = clip.y + y + 0.5;
      if (Math.hypot(gx - lens.cx, gy - lens.cy) > lens.r - 1.5) continue; // inside the disc, clear of the lens's own AA rim
      n++;
      const i = (y * a.w + x) * 4;
      let d = 0; for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(a.d[i + c] - b.d[i + c]));
      max = Math.max(max, d);
      if (d > 8) {
        over8++;
        const nearEdge = orbs.some((o) => Math.abs(Math.hypot(gx - o.cx, gy - o.cy) - o.r) <= 1.5);
        if (nearEdge) over8Edge++;
      }
    }
    const crossing = orbs.filter((o) => { const d = Math.hypot(o.cx - lens.cx, o.cy - lens.cy); return d < o.r + lens.r && d > Math.abs(o.r - lens.r); }).map((o) => o.cls);
    R[`identity__${scheme}`] = { lens, crossing, pixels: n, pctOver8: +(over8 / n * 100).toFixed(2), over8, over8WithinEdge1_5px: over8Edge, over8OffEdge: over8 - over8Edge, maxDiff: max };
    await writeFile(join(OUT, `identity__${scheme}__model.png`), withL);
    await writeFile(join(OUT, `identity__${scheme}__page.png`), without);
    await context.close();
  }
  /* ---- seam across the cyan orb's top edge, while scrolling ---- */
  {
    const { context, page } = await ctx(scheme);
    await open(page, scheme, `${HOME}?lensProbe=seam`);
    // Find an orb edge point in OPEN wallpaper at scroll 0 where the edge is
    // not steep (|slope| < 1.4), with room for the lens just below or above
    // it clear of every pane, the header and the switcher.
    const target = await page.evaluate(() => {
      const R = 92, m = R * 1.04 * 1.012 + 8;
      const obs = [...document.querySelectorAll('.glass, .site-header, bdl-switcher')].map((e) => e.getBoundingClientRect()).filter((q) => q.width > 0);
      const open = (x, y) => obs.every((q) => { const nx = Math.min(Math.max(x, q.left), q.right), ny = Math.min(Math.max(y, q.top), q.bottom); return Math.hypot(x - nx, y - ny) >= R + 2; });
      // Only the seam's own neighbourhood must be uncovered (the rest of the disc may sit under a pane).
      const clearAt = (x, y) => obs.every((q) => x < q.left - 14 || x > q.right + 14 || y < q.top - 14 || y > q.bottom + 14);
      for (const o of document.querySelectorAll('.orb')) {
        const q = o.getBoundingClientRect(); const cx = q.left + q.width / 2, cy = q.top + q.height / 2, r = q.width / 2;
        for (let a = 0; a < 360; a += 5) {
          const t = a * Math.PI / 180, px = cx + r * Math.cos(t), py = cy + r * Math.sin(t);
          if (Math.abs(Math.cos(t)) > 0.9) continue; // too steep for a vertical seam
          for (const dy of [30, -30]) {
            const lx = Math.round(px), ly = py + dy;
            if (lx < m || lx > innerWidth - m || ly < 200 || ly > innerHeight - m - 60) continue;
            if (clearAt(lx, py)) return { cls: o.className, idx: [...document.querySelectorAll('.orb')].indexOf(o), lx, ly, px, py, sign: py < cy ? -1 : 1 };
          }
        }
      }
      return null;
    });
    if (!target) { R[`seam__${scheme}`] = { error: 'no open, non-steep orb edge found at scroll 0' }; await context.close(); continue; }
    await dragLensTo(page, target.lx, target.ly);
    R[`seam__${scheme}__target`] = target;
    const rows = [];
    for (const sy of [0, 4, 8, 12]) {
      await page.evaluate((y) => window.scrollTo(0, y), sy);
      await page.waitForTimeout(500);
      const g = await page.evaluate((idx) => {
        const h = document.querySelector('.lens-hit').getBoundingClientRect();
        const o = document.querySelectorAll('.orb')[idx].getBoundingClientRect();
        return { lx: h.left + h.width / 2, ly: h.top + h.height / 2, lr: h.width / 2, ox: o.left + o.width / 2, oy: o.top + o.height / 2, or: o.width / 2 };
      }, target.idx);
      console.log(scheme, 'scroll', sy, JSON.stringify(g));
      const sx = Math.round(g.lx);
      const trueEdgeY = g.oy + target.sign * Math.sqrt(Math.max(0, g.or ** 2 - (sx - g.ox) ** 2));
      const clip = { x: sx - 12, y: Math.round(g.ly - g.lr + 4), width: 24, height: Math.round(2 * g.lr - 8) };
      const buf = await page.screenshot({ clip });
      const p = await pixels(buf);
      // Edge row on one column: the row of the largest colour step.
      const edgeRow = (col) => { let best = -1, bi = -1; for (let y = 1; y < p.h; y++) { const i = (y * p.w + col) * 4, j = ((y - 1) * p.w + col) * 4; const d = Math.abs(p.d[i] - p.d[j]) + Math.abs(p.d[i + 1] - p.d[j + 1]) + Math.abs(p.d[i + 2] - p.d[j + 2]); if (d > best) { best = d; bi = y; } } return { y: clip.y + bi, step: best }; };
      const model = edgeRow(12 - 3), pageSide = edgeRow(12 + 3);
      // The edge is sloped, so each side is compared with the TRUE edge at
      // its own column (sx - 3 and sx + 3); the seam offset is the
      // difference of the two residuals (the row convention cancels).
      const edgeAt = (x) => g.oy + target.sign * Math.sqrt(Math.max(0, g.or ** 2 - (x + 0.5 - g.ox) ** 2));
      const modelRes = model.y - edgeAt(sx - 3), pageRes = pageSide.y - edgeAt(sx + 3);
      const pageEdgeReal = pageSide.step > 60 && Math.abs(pageRes) <= 3;
      rows.push({ scroll: sy, seamX: sx, trueEdgeY: +trueEdgeY.toFixed(1), modelEdgeY: model.y, modelStep: model.step, modelResidual: +modelRes.toFixed(2), pageEdgeY: pageSide.y, pageStep: pageSide.step, pageResidual: +pageRes.toFixed(2), pageEdgeReal, offsetPx: pageEdgeReal ? +Math.abs(modelRes - pageRes).toFixed(2) : null });
      const crop = await page.screenshot({ clip: { x: sx - 24, y: Math.max(0, Math.round(trueEdgeY) - 24), width: 48, height: 48 } });
      await writeFile(join(OUT, `seam__${scheme}__scroll${sy}__4x.png`), await upscale(crop, 4));
    }
    const offs = rows.map((r) => r.offsetPx).filter((v) => v != null);
    R[`seam__${scheme}`] = { rows, measured: offs.length, medianPx: offs.length ? offs.sort((a, b) => a - b)[Math.floor(offs.length / 2)] : null, maxPx: offs.length ? Math.max(...offs) : null };
    await context.close();
  }
}
await browser.close();
await writeFile(join(OUT, 'seam-results.json'), JSON.stringify(R, null, 2));
console.log(JSON.stringify(R, null, 1));
