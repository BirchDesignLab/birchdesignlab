/**
 * Wave B2 round 5, seat glass-fix-r5: proof for R1 to R5 that the round-4
 * probes (b2r4-glass-critic-probe.mjs, -startrace.mjs, b2r4-glass-fix-r4-*)
 * do not already make.
 *
 * Sections (--only a,b; default poster,orbpath):
 *   poster   the poster against the live lens at the same spot, 1440x900,
 *            820x1180 and 390x844, Clear and Tinted (a real click on the hero
 *            switch), light and dark: the live crop, then the canvas hidden
 *            and the poster shown where lens.ts placed it; the mean and p95
 *            channel difference inside the disc.
 *   orbpath  every hero orb's centre at scroll 0, 200 and 400 at the five
 *            review sizes (light), written to orbpath-<tag>.json. Run once
 *            against B1's snap (--tag b1, snap-b1-final served with
 *            snap.mjs --reuse; glass-drift paused as the round-4 critic did)
 *            and once against this round (--tag r5).
 *   table    orbpath-b1.json vs orbpath-r5.json: the per-orb difference,
 *            plus the window top, as table-orbs.md and table-orbs.json.
 *   compose  B1 | round 4 | round 5 first-view and whole-page sheets per size
 *            from page__<tag>__WxH__scheme.png stacks (b2r4-glass-critic-probe
 *            --only pages --tag r5 --out <this OUT>; the b1 and r4 stacks are
 *            copied in from glass-recritic-r4/own).
 * GPU Chromium (aborts on SwiftShader), prefers-reduced-transparency forced
 * to no-preference over CDP, the portal prompt suppressed.
 *
 * Usage: BDL_GPU=1 node scripts/themes/glassmorphism/b2r5-glass-fix-proof.mjs --base http://127.0.0.1:4471 [--only poster] [--tag r5]
 */
import { chromium } from 'playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (n, f) => { const i = args.indexOf(`--${n}`); return i === -1 ? f : args[i + 1]; };
const base = arg('base', 'http://127.0.0.1:4471');
const tag = arg('tag', 'r5');
const only = arg('only', 'poster,orbpath').split(',').filter(Boolean);
const OUT = arg('out', join(HERE, '..', '.out', 'stage3-b2', 'glass-fix-r5'));
const HOME = `${base}/t/glassmorphism/`;
await mkdir(OUT, { recursive: true });
const SIZES = [[1440, 900], [1280, 800], [1024, 768], [820, 1180], [390, 844]];

let browser = null;
const R = { base, tag };
async function launch() {
  if (browser) return;
  browser = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
  const p = await browser.newPage();
  R.renderer = await p.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); });
  await p.close();
  console.log('renderer:', R.renderer);
  if (/swiftshader|llvmpipe/i.test(R.renderer)) { await browser.close(); throw new Error('software renderer; abort'); }
}
async function ctx({ w, h, scheme = 'light', touch = w < 900 }) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, hasTouch: touch, isMobile: touch, deviceScaleFactor: touch ? 2 : 1 });
  await suppressPrompt(context);
  await context.addInitScript((sch) => { try { localStorage.setItem('bdl-scheme', sch); } catch {} }, scheme);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }, { name: 'prefers-color-scheme', value: scheme }] });
  return { context, page };
}
async function open(page, scheme) {
  await page.goto(HOME, { waitUntil: 'networkidle' });
  const cur = await page.evaluate(() => document.documentElement.dataset.scheme);
  if (cur !== scheme) { await page.evaluate((s) => { document.documentElement.dataset.scheme = s; }, scheme); await page.waitForTimeout(700); }
  if (tag === 'b1') await page.addStyleTag({ content: '.orb { animation-name: none, glass-orb-scroll !important; }' });
  else await page.waitForFunction(() => document.querySelector('.lens-poster')?.style.display === 'none', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(500);
}
async function readImg(buf) {
  const img = await loadImage(buf);
  const c = createCanvas(img.width, img.height); const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  return { img, width: img.width, height: img.height, data: g.getImageData(0, 0, img.width, img.height).data };
}
async function upscale(buf, k) {
  const im = await loadImage(buf);
  const c = createCanvas(Math.round(im.width * k), Math.round(im.height * k)); const g = c.getContext('2d');
  g.imageSmoothingEnabled = k < 1; g.drawImage(im, 0, 0, im.width * k, im.height * k);
  return c.toBuffer('image/png');
}
async function sheet(file, rows, { scale = 1, title = '' } = {}) {
  const imgs = await Promise.all(rows.map((row) => Promise.all(row.map(async ([l, b]) => [l, await loadImage(b)]))));
  const cw = Math.max(...imgs.flat().map(([, i]) => i.width)) * scale;
  const ch = Math.max(...imgs.flat().map(([, i]) => i.height)) * scale;
  const cols = Math.max(...imgs.map((r) => r.length));
  const lh = 58, pad = 12, th = title ? 44 : 0;
  const c = createCanvas(Math.round(cols * (cw + pad) + pad), Math.round(th + imgs.length * (ch + lh + pad) + pad));
  const g = c.getContext('2d');
  g.fillStyle = '#1c1c1c'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#fff';
  if (title) { g.font = 'bold 26px sans-serif'; g.fillText(title, pad, 32); }
  g.font = '22px sans-serif';
  imgs.forEach((row, ri) => row.forEach(([l, im], ci) => {
    const x = pad + ci * (cw + pad), y = th + pad + ri * (ch + lh + pad);
    g.fillStyle = '#fff';
    const words = l.split(' '); let line = '', ly = y + 24, n = 0;
    for (const wd of words) { const t = line ? `${line} ${wd}` : wd; if (g.measureText(t).width > cw - 4 && line && n === 0) { g.fillText(line, x, ly); ly += 26; n++; line = wd; } else line = t; }
    g.fillText(line, x, ly);
    g.imageSmoothingEnabled = scale < 1;
    g.drawImage(im, x, y + lh, im.width * scale, im.height * scale);
  }));
  const path = join(OUT, file);
  await writeFile(path, c.toBuffer('image/jpeg', 92));
  console.log('wrote', path);
}

/* ---------------- poster ---------------- */
async function poster() {
  await launch();
  R.poster = {};
  const rows = [];
  for (const [w, h] of [[1440, 900], [820, 1180], [390, 844]]) {
    for (const scheme of ['light', 'dark']) {
      const row = [];
      for (const tint of ['clear', 'tinted']) {
        const { context, page } = await ctx({ w, h, scheme });
        await open(page, scheme);
        if (tint === 'tinted') { await page.locator('.hero .window-bar .switch').click(); await page.waitForTimeout(1200); }
        const L = await page.evaluate(() => { const r = document.querySelector('.lens-hit').getBoundingClientRect(); return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, r: r.width / 2 }; });
        const m = 36;
        const clip = { x: Math.max(0, Math.round(L.cx - L.r - m)), y: Math.max(0, Math.round(L.cy - L.r - m)) };
        clip.width = Math.min(w - clip.x, Math.round(2 * L.r + 2 * m)); clip.height = Math.min(h - clip.y, Math.round(2 * L.r + 2 * m));
        const live = await page.screenshot({ clip, scale: 'css' });
        await page.evaluate(() => {
          for (const e of document.querySelectorAll('.lens-canvas, .lens-shadow')) e.style.visibility = 'hidden';
          document.querySelector('.lens-poster').style.removeProperty('display');
        });
        await page.waitForTimeout(250);
        const post = await page.screenshot({ clip, scale: 'css' });
        const a = await readImg(live), b = await readImg(post);
        const diffs = [];
        for (let y = 0; y < a.height; y++) for (let x = 0; x < a.width; x++) {
          if (Math.hypot(x + clip.x - L.cx, y + clip.y - L.cy) > L.r - 1) continue;
          const i = (y * a.width + x) * 4;
          diffs.push((Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2])) / 3);
        }
        diffs.sort((p, q) => p - q);
        const mean = diffs.reduce((s, v) => s + v, 0) / diffs.length;
        const key = `${w}x${h}__${scheme}__${tint}`;
        R.poster[key] = { lens: L, meanDiff: +mean.toFixed(1), p95Diff: +diffs[Math.floor(diffs.length * 0.95)].toFixed(1) };
        console.log('poster', key, JSON.stringify(R.poster[key]));
        const k = w < 900 ? 1.5 : 1;
        row.push([`${w} ${scheme} ${tint}: live lens`, await upscale(live, k)], [`poster (mean diff ${mean.toFixed(1)})`, await upscale(post, k)]);
        await context.close();
      }
      rows.push(row);
    }
  }
  await sheet('sheet__poster-vs-live.jpg', rows, { scale: 1, title: 'Poster vs live lens at the same spot: Clear | Tinted, light and dark (phones and tablet at 1.5x)' });
}

/* ---------------- orbpath ---------------- */
async function orbpath() {
  await launch();
  const out = {};
  for (const [w, h] of SIZES) {
    const { context, page } = await ctx({ w, h, scheme: 'light' });
    await open(page, 'light');
    out[`${w}x${h}`] = {};
    for (const y of [0, 200, 400]) {
      await page.evaluate((v) => scrollTo(0, v), y);
      await page.waitForTimeout(450);
      out[`${w}x${h}`][y] = await page.evaluate(() => ({
        scrollY: Math.round(scrollY),
        window: (() => { const r = document.querySelector('.hero .window').getBoundingClientRect(); return [r.left, r.top + scrollY, r.right, r.bottom + scrollY].map((v) => Math.round(v)); })(),
        orbs: [...document.querySelectorAll('.hero .orb')].map((o) => { const r = o.getBoundingClientRect(); return { hue: o.className.split(' ')[1], cx: +(r.left + r.width / 2).toFixed(1), cy: +(r.top + r.height / 2).toFixed(1), r: +(r.width / 2).toFixed(1) }; }),
      }));
    }
    console.log(tag, w, h, JSON.stringify(out[`${w}x${h}`][0].orbs));
    await context.close();
  }
  await writeFile(join(OUT, `orbpath-${tag}.json`), JSON.stringify(out, null, 1));
}

/* ---------------- table ---------------- */
async function table() {
  const a = JSON.parse(await readFile(join(OUT, 'orbpath-b1.json'), 'utf8'));
  const b = JSON.parse(await readFile(join(OUT, 'orbpath-r5.json'), 'utf8'));
  const lines = ['| size | scroll | orb | B1 centre | round 5 centre | dx | dy |', '|---|---|---|---|---|---|---|'];
  const res = { worst: 0, rows: [], windowTop: {} };
  for (const size of Object.keys(a)) {
    res.windowTop[size] = { b1: a[size][0].window[1], r5: b[size][0].window[1] };
    for (const y of Object.keys(a[size])) {
      a[size][y].orbs.forEach((o, i) => {
        const q = b[size][y].orbs[i];
        const dx = +(q.cx - o.cx).toFixed(1), dy = +(q.cy - o.cy).toFixed(1);
        res.worst = Math.max(res.worst, Math.abs(dx), Math.abs(dy));
        res.rows.push({ size, scroll: +y, hue: o.hue, b1: [o.cx, o.cy], r5: [q.cx, q.cy], dx, dy });
        lines.push(`| ${size} | ${y} | ${o.hue} | ${o.cx}, ${o.cy} | ${q.cx}, ${q.cy} | ${dx} | ${dy} |`);
      });
    }
  }
  lines.push('', `Worst |dx| or |dy|: ${res.worst} px`, '', '| size | window top B1 | window top round 5 |', '|---|---|---|');
  for (const [s, t] of Object.entries(res.windowTop)) lines.push(`| ${s} | ${t.b1} | ${t.r5} |`);
  await writeFile(join(OUT, 'table-orbs.md'), lines.join('\n') + '\n');
  await writeFile(join(OUT, 'table-orbs.json'), JSON.stringify(res, null, 1));
  console.log(lines.join('\n'));
}

/* ---------------- compose ---------------- */
async function compose() {
  const names = { b1: 'B1 approved', r4: 'Round 4', r5: 'Round 5' };
  for (const [w, h] of SIZES) {
    const cells = [];
    for (const scheme of ['light', 'dark']) for (const t of ['b1', 'r4', 'r5']) {
      const f = join(OUT, 'pages', `page__${t}__${w}x${h}__${scheme}.png`);
      if (!existsSync(f)) continue;
      const im = await loadImage(await readFile(f));
      const c = createCanvas(w, h); c.getContext('2d').drawImage(im, 0, 0, w, h, 0, 0, w, h);
      cells.push([`${names[t]} ${scheme}`, c.toBuffer('image/png')]);
    }
    if (cells.length) await sheet(`sheet__firstview-b1-r4-r5-${w}x${h}.jpg`, [cells.slice(0, 3), cells.slice(3)], { scale: w < 900 ? 0.6 : 0.42, title: `First view ${w}x${h}: B1 | round 4 | round 5, light then dark` });
    const rows = [];
    for (const scheme of ['light', 'dark']) {
      const row = [];
      for (const t of ['b1', 'r4', 'r5']) {
        const f = join(OUT, 'pages', `page__${t}__${w}x${h}__${scheme}.png`);
        if (existsSync(f)) row.push([`${names[t]} ${scheme}`, await readFile(f)]);
      }
      if (row.length) rows.push(row);
    }
    if (rows.length) {
      const tallest = Math.max(...await Promise.all(rows.flat().map(async ([, b]) => (await loadImage(b)).height)));
      await sheet(`sheet__page-b1-r4-r5-${w}x${h}.jpg`, [rows.flat()], { scale: Math.min(w < 600 ? 0.7 : 0.4, 3600 / tallest), title: `Home, whole page as read (viewport stacks), ${w}x${h}: B1 | round 4 | round 5, light then dark` });
    }
  }
}

const all = { poster, orbpath, table, compose };
for (const k of only) {
  try { console.log('==', k); await all[k](); } catch (e) { R[`${k}Error`] = String(e?.stack || e); console.error('ERR', k, e); }
}
if (browser) await browser.close();
const rf = join(OUT, `proof-${tag}.json`);
const prev = existsSync(rf) ? JSON.parse(await readFile(rf, 'utf8')) : {};
await writeFile(rf, JSON.stringify({ ...prev, ...R }, null, 1));
console.log('done');
