/**
 * VERIFIER (round 4), this seat b2r4-glass-verify: additional timestamped
 * films the case scripts don't already produce (they check numbers; these
 * make the driven-input evidence a reviewer can look at directly).
 *
 *   fling   case 1 redo as a real film: a drag fling toward each bound with
 *           timestamped frames (peak stretch, no reversal, visually).
 *   idle    case 24 as a film: 5 frames over 4s at rest on Home, to look for
 *           any visible redraw/drift by eye alongside the draw-count number.
 *   identity a film of the ?lensProbe=identity probe at rest, then dragged
 *           onto an orb edge, light and dark.
 *
 * GPU Chromium (BDL_GPU=1), prefers-reduced-transparency forced off, portal
 * prompt suppressed.
 * Usage: BDL_GPU=1 node scripts/themes/glassmorphism/b2r4-glass-verify-films.mjs --base http://127.0.0.1:4478 --only fling,idle,identity
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const OUT = process.env.PROBE_OUT || join(REPO, 'scripts', 'themes', '.out', 'stage3-b2', 'glass-reverify-r4');
await mkdir(OUT, { recursive: true });

const args = process.argv.slice(2);
const arg = (n, f) => { const i = args.indexOf(`--${n}`); return i === -1 ? f : args[i + 1]; };
const base = arg('base', 'http://127.0.0.1:4478');
const onlyArg = arg('only', null);
const only = onlyArg ? new Set(onlyArg.split(',')) : null;
const run = (id) => !only || only.has(id);
const HOME = `${base}/t/glassmorphism/`;

async function forceRT(context, page) {
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  return cdp;
}
async function ctx(browser, opts = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, ...opts });
  await suppressPrompt(context);
  const page = await context.newPage();
  const cdp = await forceRT(context, page);
  return { context, page, cdp };
}
async function mountLens(page) {
  return page.waitForFunction(() => document.querySelector('.lens-poster')?.style.display === 'none', { timeout: 8000 }).then(() => true).catch(() => false);
}
async function sheet(file, rows, { scale = 1, title = '' } = {}) {
  const imgs = await Promise.all(rows.map((row) => Promise.all(row.map(async ([l, b]) => [l, await loadImage(b)]))));
  const cw = Math.max(...imgs.flat().map(([, i]) => i.width)) * scale;
  const ch = Math.max(...imgs.flat().map(([, i]) => i.height)) * scale;
  const cols = Math.max(...imgs.map((r) => r.length));
  const lh = 44, pad = 12, th = title ? 40 : 0;
  const c = createCanvas(Math.round(cols * (cw + pad) + pad), Math.round(th + imgs.length * (ch + lh + pad) + pad));
  const g = c.getContext('2d');
  g.fillStyle = '#1c1c1c'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#fff';
  if (title) { g.font = 'bold 22px sans-serif'; g.fillText(title, pad, 28); }
  g.font = '18px sans-serif';
  imgs.forEach((row, ri) => row.forEach(([l, im], ci) => {
    const x = pad + ci * (cw + pad), y = th + pad + ri * (ch + lh + pad);
    g.fillStyle = '#fff';
    g.fillText(l, x, y + 18);
    g.drawImage(im, x, y + lh, im.width * scale, im.height * scale);
  }));
  const path = join(OUT, file);
  await writeFile(path, c.toBuffer('image/jpeg', 90));
  console.log('wrote', path);
  return path;
}

async function main() {
  const browser = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
  const { page: warm, context: warmCtx } = await ctx(browser);
  await warm.goto('about:blank');
  const renderer = await warm.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'no webgl';
  });
  console.log('renderer:', renderer);
  if (/swiftshader|llvmpipe/i.test(renderer)) { await browser.close(); throw new Error('software renderer; abort'); }
  await warmCtx.close();

  if (run('fling')) {
    const { context, page } = await ctx(browser);
    await page.goto(HOME, { waitUntil: 'networkidle' });
    await mountLens(page);
    const dirs = [['top', 0, -700], ['bottom', 0, 700], ['left', -700, 0], ['right', 700, 0]];
    const rows = [];
    for (const [name, dx, dy] of dirs) {
      const hit = await page.$('.lens-hit');
      const box0 = await hit.boundingBox();
      const restX = box0.x + box0.width / 2, restY = box0.y + box0.height / 2;
      const frames = [];
      const t0 = Date.now();
      await page.mouse.move(restX, restY);
      await page.mouse.down();
      const steps = 16;
      for (let i = 1; i <= steps; i++) {
        await page.mouse.move(restX + (dx * i) / steps, restY + (dy * i) / steps, { steps: 1 });
        if (i % 4 === 0) frames.push([`${name} +${Date.now() - t0}ms`, await page.screenshot({ clip: { x: 0, y: 150, width: 900, height: 560 } })]);
      }
      await page.mouse.up();
      frames.push([`${name} released +${Date.now() - t0}ms`, await page.screenshot({ clip: { x: 0, y: 150, width: 900, height: 560 } })]);
      await page.waitForTimeout(250);
      frames.push([`${name} settled +${Date.now() - t0}ms`, await page.screenshot({ clip: { x: 0, y: 150, width: 900, height: 560 } })]);
      rows.push(frames);
      await page.mouse.move(restX, restY); // reset-ish; next iteration reads its own box
      await page.waitForTimeout(200);
    }
    await sheet('film__fling.jpg', rows, { scale: 0.42, title: 'Fling into each bound: mid-drag frames, release, settle (1440x900)' });
    await context.close();
  }

  if (run('idle')) {
    const { context, page } = await ctx(browser);
    await context.addInitScript(() => {
      window.__draws = 0;
      const hook = (proto) => { if (!proto) return; const o = proto.drawArrays; proto.drawArrays = function (...a) { window.__draws++; return o.apply(this, a); }; };
      hook(window.WebGLRenderingContext && window.WebGLRenderingContext.prototype);
      hook(window.WebGL2RenderingContext && window.WebGL2RenderingContext.prototype);
    });
    await page.goto(HOME, { waitUntil: 'networkidle' });
    await mountLens(page);
    await page.waitForTimeout(1200);
    await page.evaluate(() => { window.__draws = 0; });
    const t0 = Date.now();
    const frames = [];
    for (const wait of [0, 1000, 2000, 3000, 4000]) {
      await page.waitForTimeout(Math.max(0, wait - (Date.now() - t0)));
      const d = await page.evaluate(() => window.__draws);
      frames.push([`+${Date.now() - t0}ms draws=${d}`, await page.screenshot({ clip: { x: 0, y: 150, width: 900, height: 560 } })]);
    }
    await sheet('film__idle-rest.jpg', [frames], { scale: 0.42, title: 'At rest on Home, 4s: cumulative WebGL draw count per frame (should stay flat)' });
    await context.close();
  }

  if (run('identity')) {
    for (const scheme of ['light', 'dark']) {
      const { context, page } = await ctx(browser, { colorScheme: scheme });
      await page.goto(`${HOME}?lensProbe=identity`, { waitUntil: 'networkidle' });
      await mountLens(page);
      await page.waitForTimeout(500);
      const t0 = Date.now();
      const frames = [{ label: `rest +${Date.now() - t0}ms` }];
      const restShot = await page.screenshot({ clip: { x: 0, y: 150, width: 900, height: 560 } });
      const orbInfo = await page.evaluate(() => {
        const lens = document.querySelector('.lens-hit')?.getBoundingClientRect();
        const orbs = [...document.querySelectorAll('.orb')].map((o) => o.getBoundingClientRect());
        if (!lens || !orbs.length) return null;
        const lcx = lens.x + lens.width / 2, lcy = lens.y + lens.height / 2;
        orbs.sort((a, b) => Math.hypot(a.x + a.width / 2 - lcx, a.y + a.height / 2 - lcy) - Math.hypot(b.x + b.width / 2 - lcx, b.y + b.height / 2 - lcy));
        const o = orbs[0];
        return { lcx, lcy, ocx: o.x + o.width / 2, ocy: o.y + o.height / 2, r: o.width / 2 };
      });
      let overOrbShot = restShot;
      if (orbInfo) {
        const { lcx, lcy, ocx, ocy, r } = orbInfo;
        const dx = ocx - lcx, dy = ocy - lcy, dist = Math.hypot(dx, dy) || 1;
        await page.mouse.move(lcx, lcy);
        await page.mouse.down();
        await page.mouse.move(ocx - (dx / dist) * r * 0.3, ocy - (dy / dist) * r * 0.3, { steps: 8 });
        await page.mouse.up();
        await page.waitForTimeout(200);
        overOrbShot = await page.screenshot({ clip: { x: 0, y: 150, width: 900, height: 560 } });
      }
      await sheet(`film__identity-${scheme}.jpg`, [[[`rest +0ms`, restShot], [`dragged onto orb edge +${Date.now() - t0}ms`, overOrbShot]]], { scale: 0.5, title: `?lensProbe=identity, ${scheme}: at rest, then dragged onto an orb edge` });
      await context.close();
    }
  }

  if (run('ccscroll')) {
    const { context, page } = await ctx(browser, { viewport: { width: 1440, height: 900 } });
    await page.goto(HOME, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const t0 = Date.now();
    const frames = [];
    for (const y of [0, 300, 600, 900, 1200]) {
      await page.evaluate((yy) => window.scrollTo(0, yy), y);
      await page.waitForTimeout(150);
      const gap = await page.evaluate(() => {
        const cc = document.querySelector('.control-centre');
        const sw = document.querySelector('bdl-switcher');
        if (!cc || !sw) return null;
        const c = cc.getBoundingClientRect(), s = sw.getBoundingClientRect();
        const overlapX = c.x < s.x + s.width && s.x < c.x + c.width;
        const overlapY = c.y < s.y + s.height && s.y < c.y + c.height;
        return overlapX && overlapY ? 'OVERLAP' : Math.round(Math.max(c.y - (s.y + s.height), s.y - (c.y + c.height), c.x - (s.x + s.width), s.x - (c.x + c.width)));
      });
      frames.push([`scroll ${y} +${Date.now() - t0}ms gap=${gap}`, await page.screenshot({ clip: { x: 900, y: 0, width: 540, height: 900 } })]);
    }
    await sheet('film__cc-scroll-sweep.jpg', [frames], { scale: 0.42, title: 'Control Centre vs desktop switcher while scrolling, 1440x900 (gap in px, negative would mean overlap)' });
    await context.close();
  }

  if (run('cornersettle')) {
    const rows = [];
    for (const [w, h] of [[390, 844], [820, 1180]]) {
      const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
      await suppressPrompt(context);
      const page = await context.newPage();
      await forceRT(context, page);
      const t0 = Date.now();
      await page.goto(HOME, { waitUntil: 'commit' });
      const frames = [];
      for (const wait of [0, 150, 300, 500, 900]) {
        await page.waitForTimeout(Math.max(0, wait - (Date.now() - t0))).catch(() => {});
        const g = await page.evaluate(() => {
          const hit = document.querySelector('.lens-hit');
          const poster = document.querySelector('.lens-poster');
          const r = hit ? hit.getBoundingClientRect() : null;
          return { posterVisible: poster ? getComputedStyle(poster).display !== 'none' : null, lens: r ? { x: Math.round(r.x), y: Math.round(r.y) } : null };
        }).catch(() => ({}));
        frames.push([`+${Date.now() - t0}ms poster=${g.posterVisible} lens=${g.lens ? `${g.lens.x},${g.lens.y}` : 'n/a'}`, await page.screenshot()]);
      }
      rows.push(frames);
      await context.close();
    }
    await sheet('film__corner-start-mount.jpg', rows, { scale: 0.28, title: 'Corner-start mount sequence, 390x844 and 820x1180: poster hands off to the live lens at the same spot' });
  }

  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
