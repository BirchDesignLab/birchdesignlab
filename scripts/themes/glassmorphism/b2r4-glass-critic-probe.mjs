/**
 * Wave B2 round 4, seat b2r4-glass-critic (the glass RE-CRITIC, 09-26-26).
 * Own evidence for round 4's G1 (orbs-clock measure), G2 (B1's phone hero,
 * the phone lens half under the window's lower corner) and G3, against a snap
 * already serving at --base (port 4475).
 *
 * Sections (--only a,b; default all but compose):
 *   pages      whole-page Home as a reader sees it: viewport captures stacked
 *              at every scroll step (fixed layers and view()-linked orbs as
 *              they really sit, unlike a fullPage capture), at 1440x900,
 *              1280x800, 1024x768, 820x1180 and 390x844, light and dark, plus
 *              the orb circles at scroll 0. --tag b1 runs it against B1's
 *              snap (glass-drift paused there, so the orbs sit at B1's rest).
 *   compose    B1 | round 4 side by side per size, same crops, 22 px labels.
 *   firstview  390x844, 430x932, 375x667 and 820x1180, light and dark: lens,
 *              window, Control Centre, switcher outlined; the disc sampled by
 *              elementFromPoint (lens-hit below the window, the window above).
 *   touch      390x844 and 820x1180 touch through CDP: a drag started on the
 *              lens's visible half, a swipe on its covered half, a swipe on
 *              the hero copy; timestamped strips.
 *   identity   ?lensProbe=identity at the 390x844 corner start, light and dark.
 *   rim        4x crops where the 390x844 lens rim crosses an orb edge on its
 *              visible half, with and without the canvas.
 *   arrival    390x844 with Tinted held (a real tap), and 1440x900 Clear:
 *              out to vaporwave and back through the real switcher, frames
 *              as fast as the camera allows, with poster and lens geometry.
 * GPU Chromium (aborts on SwiftShader), prefers-reduced-transparency forced
 * to no-preference over CDP, the portal prompt suppressed.
 *
 * Usage: BDL_GPU=1 node scripts/themes/glassmorphism/b2r4-glass-critic-probe.mjs --base http://127.0.0.1:4475 [--only a,b] [--tag r4|b1]
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
const base = arg('base', 'http://127.0.0.1:4475');
const tag = arg('tag', 'r4');
const only = arg('only', '').split(',').filter(Boolean);
const OUT = arg('out', join(HERE, '..', '.out', 'stage3-b2', 'glass-recritic-r4', 'own'));
const HOME = `${base}/t/glassmorphism/`;
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
const R = { base, tag };
{
  const p = await browser.newPage();
  R.renderer = await p.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); });
  await p.close();
  console.log('renderer:', R.renderer);
  if (/swiftshader|llvmpipe/i.test(R.renderer)) { await browser.close(); throw new Error('software renderer; abort'); }
}

async function ctx({ w, h, scheme = 'light', touch = w < 900 }) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, hasTouch: touch, isMobile: touch, deviceScaleFactor: touch ? 2 : 1 });
  await suppressPrompt(context);
  await context.addInitScript((sch) => {
    try { localStorage.setItem('bdl-scheme', sch); } catch {}
    window.__draws = 0;
    const p = WebGLRenderingContext.prototype; const o = p.drawArrays;
    p.drawArrays = function (...a) { window.__draws++; return o.apply(this, a); };
  }, scheme);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }, { name: 'prefers-color-scheme', value: scheme }] });
  return { context, page, cdp, errors };
}
const mountWait = (page) => page.waitForFunction(() => document.querySelector('.lens-poster')?.style.display === 'none', { timeout: 10000 }).then(() => true).catch(() => false);
async function open(page, scheme, url = HOME) {
  await page.goto(url, { waitUntil: 'networkidle' });
  const cur = await page.evaluate(() => document.documentElement.dataset.scheme);
  if (cur !== scheme) { await page.evaluate((s) => { document.documentElement.dataset.scheme = s; }, scheme); await page.waitForTimeout(700); }
  const ok = tag === 'b1' ? true : await mountWait(page);
  if (tag === 'b1') await page.addStyleTag({ content: '.orb { animation-name: none, glass-orb-scroll !important; }' });
  await page.waitForTimeout(500);
  return ok;
}
const geo = (page) => page.evaluate(() => {
  const rr = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom].map((v) => Math.round(v)); };
  const hit = document.querySelector('.lens-hit')?.getBoundingClientRect();
  const lens = hit ? { cx: Math.round(hit.left + hit.width / 2), cy: Math.round(hit.top + hit.height / 2), r: Math.round(hit.width / 2) } : null;
  const p = document.querySelector('.lens-poster'); const pr = p?.getBoundingClientRect();
  const host = document.querySelector('#glass-lens-host');
  const orbs = [...document.querySelectorAll('.orb')].map((o) => { const r = o.getBoundingClientRect(); return { cls: o.className, cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2), r: Math.round(r.width / 2) }; });
  const inView = orbs.filter((o) => o.cy + o.r > 0 && o.cy - o.r < innerHeight && o.cx + o.r > 0 && o.cx - o.r < innerWidth);
  const crossed = lens ? inView.filter((o) => { const d = Math.hypot(o.cx - lens.cx, o.cy - lens.cy); return d < o.r + lens.r && d > Math.abs(o.r - lens.r); }).map((o) => o.cls) : [];
  const sw = document.querySelector('bdl-switcher')?.shadowRoot?.querySelector('.bar');
  return { scrollY: Math.round(scrollY), docH: document.documentElement.scrollHeight, lens, poster: p ? { display: getComputedStyle(p).display, cx: Math.round(pr.left + pr.width / 2), cy: Math.round(pr.top + pr.height / 2), w: Math.round(pr.width) } : null, start: host?.dataset.lensStart, cover: host?.dataset.lensCover, source: host?.dataset.lensSource, window: rr(document.querySelector('.hero .window')), hero: rr(document.querySelector('.hero')), cc: rr(document.querySelector('.control-centre')), switcherBar: rr(sw), orbs, orbsInView: inView.map((o) => o.cls), crossed, tint: document.documentElement.dataset.glassTint ?? null };
});

async function sheet(file, rows, { scale = 1, title = '', maxH = 0 } = {}) {
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
  return path;
}
async function outline(buf, k, shapes) {
  const im = await loadImage(buf);
  const c = createCanvas(im.width, im.height); const g = c.getContext('2d'); g.drawImage(im, 0, 0);
  g.lineWidth = 2 * k;
  for (const s of shapes) {
    g.strokeStyle = s.color;
    if (s.rect) g.strokeRect(s.rect[0] * k, s.rect[1] * k, (s.rect[2] - s.rect[0]) * k, (s.rect[3] - s.rect[1]) * k);
    if (s.circle) { g.beginPath(); g.arc(s.circle[0] * k, s.circle[1] * k, s.circle[2] * k, 0, Math.PI * 2); g.stroke(); }
  }
  return c.toBuffer('image/png');
}
async function upscale(buf, k) {
  const im = await loadImage(buf);
  const c = createCanvas(im.width * k, im.height * k); const g = c.getContext('2d');
  g.imageSmoothingEnabled = false; g.drawImage(im, 0, 0, im.width * k, im.height * k);
  return c.toBuffer('image/png');
}
async function readImg(buf) {
  const img = await loadImage(buf);
  const c = createCanvas(img.width, img.height); const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  return { width: img.width, height: img.height, data: g.getImageData(0, 0, img.width, img.height).data };
}

const SIZES = [[1440, 900], [1280, 800], [1024, 768], [820, 1180], [390, 844]];

/* ---------------- pages ---------------- */
async function pages() {
  R.pages = {};
  for (const [w, h] of SIZES) {
    for (const scheme of ['light', 'dark']) {
      const { context, page, errors } = await ctx({ w, h, scheme });
      await open(page, scheme);
      const g0 = await geo(page);
      const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      const c = createCanvas(w, max + h); const g = c.getContext('2d');
      for (let y = 0; ; y += h) {
        const yy = Math.min(y, max);
        await page.evaluate((v) => scrollTo(0, v), yy); await page.waitForTimeout(400);
        const at = await page.evaluate(() => Math.round(scrollY));
        g.drawImage(await loadImage(await page.screenshot({ scale: 'css' })), 0, at);
        if (yy >= max) break;
      }
      const file = `page__${tag}__${w}x${h}__${scheme}.png`;
      await writeFile(join(OUT, file), c.toBuffer('image/png'));
      R.pages[`${w}x${h}__${scheme}`] = { scroll0: g0, docH: max + h, errors };
      console.log(tag, w, h, scheme, 'docH', max + h, 'orbsInView', g0.orbsInView.join(' | '), 'lens', JSON.stringify(g0.lens), g0.source ?? '');
      await context.close();
    }
  }
}

/* ---------------- compose ---------------- */
async function compose() {
  for (const [w, h] of SIZES) {
    const rows = [];
    for (const scheme of ['light', 'dark']) {
      const a = join(OUT, `page__b1__${w}x${h}__${scheme}.png`), b = join(OUT, `page__r4__${w}x${h}__${scheme}.png`);
      if (!existsSync(a) || !existsSync(b)) continue;
      rows.push([[`B1 approved (543520b snap, drift paused) ${scheme}`, await readFile(a)], [`Round 4 ${scheme}`, await readFile(b)]]);
    }
    if (!rows.length) continue;
    // cap the sheet near 9000 px tall
    const tallest = Math.max(...await Promise.all(rows.flat().map(async ([, b]) => (await loadImage(b)).height)));
    const scale = Math.min(w < 600 ? 0.8 : 0.5, 4200 / tallest);
    await sheet(`sheet__page-b1-vs-r4-${w}x${h}.jpg`, rows.length === 2 ? [[rows[0][0], rows[0][1], rows[1][0], rows[1][1]]] : rows, { scale, title: `Home, whole page as read (viewport stacks), ${w}x${h}: B1 | round 4, light then dark` });
  }
  // first-view side by side from the stacks (top h px)
  for (const [w, h] of SIZES) {
    const cells = [];
    for (const scheme of ['light', 'dark']) for (const t of ['b1', 'r4']) {
      const f = join(OUT, `page__${t}__${w}x${h}__${scheme}.png`);
      if (!existsSync(f)) continue;
      const im = await loadImage(await readFile(f));
      const c = createCanvas(w, h); c.getContext('2d').drawImage(im, 0, 0, w, h, 0, 0, w, h);
      cells.push([`${t === 'b1' ? 'B1' : 'Round 4'} ${scheme} first view`, c.toBuffer('image/png')]);
    }
    if (cells.length) await sheet(`sheet__firstview-b1-vs-r4-${w}x${h}.jpg`, [cells], { scale: w < 900 ? 0.6 : 0.4, title: `First view ${w}x${h}: B1 | round 4 (light), B1 | round 4 (dark)` });
  }
}

/* ---------------- firstview ---------------- */
const discSamples = (page) => page.evaluate(() => {
  const h = document.querySelector('.lens-hit').getBoundingClientRect();
  const cx = h.left + h.width / 2, cy = h.top + h.height / 2, r = h.width / 2;
  const win = document.querySelector('.hero .window');
  const wr = win.getBoundingClientRect();
  const rad = parseFloat(getComputedStyle(win).borderTopLeftRadius) || 0;
  const inWin = (x, y) => {
    if (x < wr.left || x > wr.right || y < wr.top || y > wr.bottom) return false;
    const qx = x < wr.left + rad ? wr.left + rad : x > wr.right - rad ? wr.right - rad : x;
    const qy = y < wr.top + rad ? wr.top + rad : y > wr.bottom - rad ? wr.bottom - rad : y;
    return Math.hypot(x - qx, y - qy) <= rad;
  };
  const out = { n: 0, lensHitOutsideWindow: 0, windowInsideWindow: 0, lensHitInsideWindow: 0, otherOutsideWindow: {}, otherInsideWindow: {} };
  for (let y = -r + 2; y <= r - 2; y += 4) for (let x = -r + 2; x <= r - 2; x += 4) {
    if (x * x + y * y > (r - 2) * (r - 2)) continue;
    const px = cx + x, py = cy + y;
    if (Math.abs(py - wr.bottom) < 3 || Math.abs(px - wr.left) < 3 || Math.abs(px - wr.right) < 3) continue; // skip the edge itself
    const e = document.elementFromPoint(px, py); if (!e) continue;
    out.n++;
    const k = e.tagName.toLowerCase() + '.' + [...e.classList].join('.');
    const iw = inWin(px, py);
    if (e.classList.contains('lens-hit')) { if (iw) out.lensHitInsideWindow++; else out.lensHitOutsideWindow++; }
    else if (iw && e.closest('.window')) out.windowInsideWindow++;
    else if (iw) out.otherInsideWindow[k] = (out.otherInsideWindow[k] || 0) + 1;
    else out.otherOutsideWindow[k] = (out.otherOutsideWindow[k] || 0) + 1;
  }
  return out;
});
async function firstview() {
  R.firstview = {};
  const rows = [];
  for (const [w, h] of [[390, 844], [430, 932], [375, 667], [820, 1180]]) {
    const row = [];
    for (const scheme of ['light', 'dark']) {
      const { context, page, errors } = await ctx({ w, h, scheme });
      await open(page, scheme);
      const g = await geo(page);
      const samples = g.lens ? await discSamples(page) : null;
      const buf = await page.screenshot();
      await writeFile(join(OUT, `firstview__${w}x${h}__${scheme}.png`), buf);
      const shapes = [{ color: 'rgba(0,150,255,0.9)', rect: g.window }, { color: 'rgba(0,200,120,0.9)', rect: g.cc }, { color: 'rgba(255,200,0,0.9)', rect: g.switcherBar }];
      if (g.lens) shapes.push({ color: 'rgba(255,0,0,0.9)', circle: [g.lens.cx, g.lens.cy, g.lens.r] });
      row.push([`${w}x${h} ${scheme}: lens (${g.lens?.cx},${g.lens?.cy}) ${g.source} cover ${g.cover}; crosses ${g.crossed.map((c) => c.replace('orb ', '')).join(', ') || 'none'}`, await outline(buf, 2, shapes)]);
      R.firstview[`${w}x${h}__${scheme}`] = { ...g, orbs: undefined, samples, errors };
      console.log(w, h, scheme, JSON.stringify({ lens: g.lens, source: g.source, cover: g.cover, window: g.window, cc: g.cc, bar: g.switcherBar, crossed: g.crossed, samples }));
      await context.close();
    }
    rows.push(row);
  }
  await sheet('sheet__firstview-phones-tablet.jpg', rows, { scale: 0.42, title: 'First view (blue window, red lens, green Control Centre, yellow switcher bar)' });
}

/* ---------------- touch ---------------- */
async function touchFilm(page, cdp, from, to, steps = 14) {
  const frames = [];
  const t0 = Date.now();
  const snap = async (label) => { frames.push([`+${Date.now() - t0} ms ${label}`, await page.screenshot({ scale: 'css' })]); };
  await snap('before');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from[0], y: from[1] }] });
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from[0] + (to[0] - from[0]) * i / steps, y: from[1] + (to[1] - from[1]) * i / steps }] });
    await page.waitForTimeout(16);
    if (i % 5 === 0) await snap(`move ${i}/${steps}`);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await snap('released');
  await page.waitForTimeout(900);
  await snap('settled');
  return frames;
}
async function touch() {
  R.touch = {};
  for (const [w, h] of [[390, 844], [820, 1180]]) {
    const rows = [];
    for (const kind of ['lens-visible-half', 'lens-visible-half-near-edge', 'lens-covered-half', 'hero-copy']) {
      const { context, page, cdp, errors } = await ctx({ w, h, scheme: 'light' });
      await open(page, 'light');
      const g = await geo(page);
      const dir = g.lens.cx > w / 2 ? -1 : 1;
      let from, to;
      if (kind === 'lens-visible-half') { from = [g.lens.cx, g.lens.cy + g.lens.r * 0.5]; to = [g.lens.cx + dir * 180, g.lens.cy + g.lens.r * 0.5 + 20]; }
      else if (kind === 'lens-visible-half-near-edge') { from = [g.lens.cx + dir * 20, g.window[3] + 6]; to = [from[0] + dir * 140, from[1] + 60]; }
      else if (kind === 'lens-covered-half') { from = [g.lens.cx + dir * 10, g.lens.cy - g.lens.r * 0.5]; to = [from[0], from[1] - 220]; }
      else { const r = await page.evaluate(() => { const q = document.querySelector('.hero .lead').getBoundingClientRect(); return [q.left + q.width / 2, q.top + q.height / 2]; }); from = r; to = [r[0], r[1] - 240]; }
      const startEl = await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? `${e.tagName.toLowerCase()}.${[...e.classList].join('.')}` : null; }, from);
      const frames = await touchFilm(page, cdp, from, to);
      const g2 = await geo(page);
      const sel = await page.evaluate(() => String(getSelection()));
      R.touch[`${w}x${h}__${kind}`] = { from: from.map(Math.round), to: to.map(Math.round), startEl, lensBefore: g.lens, lensAfter: g2.lens, lensMoved: Math.round(Math.hypot(g2.lens.cx - g.lens.cx, g2.lens.cy - g.lens.cy)), scrollAfter: g2.scrollY, selection: sel, errors };
      console.log(w, kind, JSON.stringify(R.touch[`${w}x${h}__${kind}`]));
      rows.push(frames.map(([l, b]) => [`${kind}: ${l} ${l.includes('settled') ? `(scroll ${g2.scrollY}, lens moved ${R.touch[`${w}x${h}__${kind}`].lensMoved}px)` : ''}`, b]));
      await context.close();
    }
    await sheet(`film__touch-${w}x${h}.jpg`, rows, { scale: w < 600 ? 0.62 : 0.32, title: `${w}x${h} touch (CDP): drag on the lens's visible half; near the window edge; swipe on its covered half; swipe on the hero copy` });
  }
}

/* ---------------- identity ---------------- */
async function identity() {
  R.identity = {};
  const rows = [];
  for (const scheme of ['light', 'dark']) {
    const { context, page } = await ctx({ w: 390, h: 844, scheme });
    await open(page, scheme, `${HOME}?lensProbe=identity`);
    const g = await geo(page);
    const clip = { x: Math.max(0, g.lens.cx - g.lens.r - 4), y: g.lens.cy - g.lens.r - 4, width: Math.min(390 - Math.max(0, g.lens.cx - g.lens.r - 4), g.lens.r * 2 + 8), height: g.lens.r * 2 + 8 };
    const withL = await page.screenshot({ clip, scale: 'css' });
    await page.evaluate(() => { document.querySelector('.lens-canvas').style.visibility = 'hidden'; }); await page.waitForTimeout(200);
    const without = await page.screenshot({ clip, scale: 'css' });
    await page.evaluate(() => { document.querySelector('.lens-canvas').style.visibility = ''; });
    const a = await readImg(withL), b = await readImg(without);
    const lcx = g.lens.cx - clip.x, lcy = g.lens.cy - clip.y;
    const heat = createCanvas(a.width, a.height); const hg = heat.getContext('2d'); const hd = hg.createImageData(a.width, a.height);
    let n = 0, over8 = 0, max = 0, visN = 0, visOver8 = 0;
    for (let y = 0; y < a.height; y++) for (let x = 0; x < a.width; x++) {
      if (Math.hypot(x - lcx, y - lcy) > g.lens.r + 1) continue;
      const i = (y * a.width + x) * 4; let d = 0;
      for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(a.data[i + c] - b.data[i + c]));
      n++; if (d > 8) over8++; max = Math.max(max, d);
      if (y + clip.y > g.window[3]) { visN++; if (d > 8) visOver8++; }
      const v = Math.min(255, d * 4); hd.data[i] = v; hd.data[i + 1] = d > 8 ? 0 : v; hd.data[i + 2] = d > 8 ? 0 : v; hd.data[i + 3] = 255;
    }
    hg.putImageData(hd, 0, 0);
    R.identity[scheme] = { lens: g.lens, source: g.source, maxDiff: max, pctOver8: +(over8 / n * 100).toFixed(2), visibleHalfPctOver8: +(visOver8 / visN * 100).toFixed(2) };
    console.log('identity', scheme, JSON.stringify(R.identity[scheme]));
    rows.push([[`${scheme} identity model`, await upscale(withL, 2)], [`${scheme} true page`, await upscale(without, 2)], [`diff x4 (red > 8)`, await upscale(heat.toBuffer('image/png'), 2)]]);
    await context.close();
  }
  await sheet('sheet__identity-390.jpg', rows, { scale: 1, title: 'Identity probe at the 390x844 corner start (2x)' });
}

/* ---------------- rim ---------------- */
function intersections(lx, ly, lr, ox, oy, or) {
  const dx = ox - lx, dy = oy - ly, d = Math.hypot(dx, dy);
  if (d >= lr + or || d <= Math.abs(lr - or)) return [];
  const a = (lr * lr - or * or + d * d) / (2 * d); const hh = Math.sqrt(Math.max(0, lr * lr - a * a));
  const mx = lx + a * dx / d, my = ly + a * dy / d;
  return [[mx + hh * dy / d, my - hh * dx / d], [mx - hh * dy / d, my + hh * dx / d]];
}
async function rim() {
  R.rim = {};
  const rows = [];
  for (const scheme of ['light', 'dark']) {
    const { context, page } = await ctx({ w: 390, h: 844, scheme });
    await open(page, scheme);
    const g = await geo(page);
    const pts = [];
    for (const o of g.orbs) for (const p of intersections(g.lens.cx, g.lens.cy, g.lens.r, o.cx, o.cy, o.r)) if (p[1] > g.window[3] + 4 && p[0] > 24 && p[0] < 366) pts.push({ p, orb: o.cls });
    const ctxClip = { x: Math.max(0, g.lens.cx - g.lens.r - 40), y: g.lens.cy - g.lens.r - 40, width: Math.min(390 - Math.max(0, g.lens.cx - g.lens.r - 40), 2 * g.lens.r + 80), height: 2 * g.lens.r + 80 };
    const row = [[`${scheme} 1x context (2x)`, await upscale(await page.screenshot({ clip: ctxClip, scale: 'css' }), 2)]];
    // the lens's own rim on the open half, over the orb inside it (no crossing needed)
    const edge = { p: [g.lens.cx, g.lens.cy + g.lens.r], orb: 'bottom rim' };
    for (const q of [...pts.slice(0, 2), edge]) {
      const S = 40;
      const clip = { x: Math.round(q.p[0] - S / 2), y: Math.round(q.p[1] - S / 2), width: S, height: S };
      const withL = await upscale(await page.screenshot({ clip, scale: 'css' }), 4);
      await page.evaluate(() => { for (const e of document.querySelectorAll('.lens-canvas')) e.style.visibility = 'hidden'; }); await page.waitForTimeout(150);
      const without = await upscale(await page.screenshot({ clip, scale: 'css' }), 4);
      await page.evaluate(() => { for (const e of document.querySelectorAll('.lens-canvas')) e.style.visibility = ''; }); await page.waitForTimeout(150);
      row.push([`4x ${q.orb.replace('orb ', '')} @${q.p.map(Math.round)}`, withL], ['4x same, canvas hidden', without]);
    }
    R.rim[scheme] = { lens: g.lens, crossings: pts.map((q) => ({ at: q.p.map(Math.round), orb: q.orb })) };
    rows.push(row);
    await context.close();
  }
  await sheet('sheet__rim-390.jpg', rows, { scale: 1, title: '390x844 lens rim over orb edges on its visible half, 4x nearest (with and without the canvas)' });
}

/* ---------------- arrival ---------------- */
async function viaSwitcher(page, school) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('.open[aria-haspopup="dialog"]').first().click();
  const link = page.locator(`a[data-school="${school}"]`).first();
  await link.waitFor({ state: 'visible', timeout: 5000 });
  await link.click();
}
async function arrival() {
  R.arrival = {};
  const rows = [];
  const list = arg('arrivals', '390x844:tinted,1440x900:clear').split(',').map((s) => { const [wh, t] = s.split(':'); const [w, h] = wh.split('x').map(Number); return [w, h, t]; });
  for (const [w, h, tint] of list) {
    const { context, page, errors } = await ctx({ w, h, scheme: 'light' });
    await open(page, 'light');
    if (tint === 'tinted') { await page.tap('.hero .window-bar .switch'); await page.waitForTimeout(1200); }
    const before = await geo(page);
    const tintBefore = await page.evaluate(() => document.querySelector('.hero .window-bar .switch').getAttribute('aria-checked'));
    await viaSwitcher(page, 'vaporwave');
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'vaporwave', { timeout: 8000 });
    await page.waitForTimeout(2500);
    await viaSwitcher(page, 'glassmorphism');
    const t0 = Date.now();
    const frames = []; const data = [];
    while (Date.now() - t0 < 1700) {
      const buf = await page.screenshot({ scale: 'css' });
      const at = Date.now() - t0;
      const d = await page.evaluate(() => { const p = document.querySelector('.lens-poster'); const pr = p?.getBoundingClientRect(); const hit = document.querySelector('.lens-hit')?.getBoundingClientRect(); const c = document.querySelector('.lens-canvas'); return { theme: document.documentElement.dataset.theme, poster: p ? { display: getComputedStyle(p).display, cx: Math.round(pr.left + pr.width / 2), cy: Math.round(pr.top + pr.height / 2), w: Math.round(pr.width) } : null, lens: hit ? { cx: Math.round(hit.left + hit.width / 2), cy: Math.round(hit.top + hit.height / 2), w: Math.round(hit.width) } : null, canvas: c ? getComputedStyle(c).visibility : null, sw: document.querySelector('.hero .window-bar .switch')?.getAttribute('aria-checked') ?? null, draws: window.__draws }; });
      data.push({ at, ...d });
      frames.push([`+${at} ms ${d.theme ?? ''} poster ${d.poster?.display ?? '-'} ${d.poster ? `(${d.poster.cx},${d.poster.cy})` : ''} lens ${d.lens ? `(${d.lens.cx},${d.lens.cy})` : '-'} canvas ${d.canvas ?? '-'} tint ${d.sw}`, buf]);
    }
    await page.waitForTimeout(1500);
    const after = await geo(page);
    frames.push([`+${Date.now() - t0} ms settled lens (${after.lens?.cx},${after.lens?.cy})`, await page.screenshot({ scale: 'css' })]);
    R.arrival[`${w}x${h}__${tint}`] = { before: { lens: before.lens, tint: tintBefore }, after: { lens: after.lens, poster: after.poster }, frames: data, errors };
    console.log(w, tint, JSON.stringify(data.map((d) => [d.at, d.poster?.display, d.poster?.cx, d.poster?.cy, d.lens?.cx, d.lens?.cy, d.canvas, d.sw])));
    // keep at most 10 frames: every glass frame up to the lens taking over, then thin out
    const pick = frames.length <= 10 ? frames : frames.filter((_, i) => i % Math.ceil(frames.length / 10) === 0 || i === frames.length - 1);
    for (let i = 0; i < pick.length; i += 5) rows.push(pick.slice(i, i + 5).map(([l, b]) => [`${w}x${h} ${tint}: ${l}`, b]));
    await writeFile(join(OUT, `arrival-frames__${w}x${h}.json`), JSON.stringify(data, null, 1));
    // every frame of this arrival as its own strip, for the close look
    await sheet(`film__arrival-${w}x${h}-${tint}__all.jpg`, Array.from({ length: Math.ceil(frames.length / 6) }, (_, i) => frames.slice(i * 6, i * 6 + 6)), { scale: Number(arg('arrscale', w < 600 ? '0.5' : '0.25')), title: `Arrival at glass Home via the real switcher, ${w}x${h}, ${tint} held (every frame captured)` });
    await context.close();
  }
}

const all = { pages, compose, firstview, touch, identity, rim, arrival };
for (const [k, fn] of Object.entries(all)) {
  if (only.length ? !only.includes(k) : k === 'compose') continue;
  try { console.log('==', k); await fn(); } catch (e) { R[`${k}Error`] = String(e?.stack || e); console.error('ERR', k, e); }
}
await browser.close();
const rf = join(OUT, `results-${tag}.json`);
const prev = existsSync(rf) ? JSON.parse(await readFile(rf, 'utf8')) : {};
await writeFile(rf, JSON.stringify({ ...prev, ...R }, null, 1));
console.log('done');
