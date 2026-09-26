/**
 * Wave B2 glass RE-CRITIC round 1 (09-26-26). Own evidence for the fix round
 * (4fb2b69 + e0585ea), against a snap already serving at --base (port 4477):
 *   firstview  first-view stills at 1440x900, 1280x800, 1024x768, 390x844,
 *              light and dark, with the lens's start geometry (pane cover
 *              fraction, orb edge crossing) and the Control Centre's rect;
 *   ccsweep    the Control Centre tiles vs the portal switcher's bar at every
 *              scroll position (10 px steps) at 1440x900, 1280x800, 390x844,
 *              plus stills with the tiles scrolled into view;
 *   rim        4x nearest-neighbour crops where the lens rim crosses an orb
 *              edge (normal render) and where the seam probe's seam crosses it
 *              (?lensProbe=seam), light and dark, fresh and after 60 px scroll;
 *   identity   ?lensProbe=identity at the default 1440x900 start: diff heatmap
 *              and a 4x crop of the worst region, plus the normal render there;
 *   phoneswipe 390x844 touch swipes starting on the hero headline and lead
 *              copy: page scroll vs lens movement, frame strip;
 *   frost      slider driven by real mouse clicks at 0/50/100: computed
 *              backdrop-filter, frost-step, and a pixel sharpness metric on a
 *              pane over an orb; a crop strip;
 *   webkit     frost step attribute + computed -webkit-backdrop-filter in WebKit;
 *   services   Services pane, desktop and phone, light and dark, baseline and
 *              off-switch contrast measurements;
 *   switch     hero switch and CC tint tile crops, clear and tinted, both schemes;
 *   tod        a time-of-day switch filmed with CDP screencast (blank/mismatch);
 *   arrival    tinted + dusk + frost 100 set by real clicks, out to vaporwave and
 *              back through the real switcher, filmed with CDP screencast, with a
 *              per-rAF attribute log for visible flips.
 * GPU Chromium (aborts on SwiftShader), prefers-reduced-transparency forced
 * to no-preference over CDP, the portal prompt suppressed.
 *
 * Usage: BDL_GPU=1 node scripts/themes/glassmorphism/b2r3-glass-critic1-probe.mjs --base http://127.0.0.1:4477 [--only a,b]
 */
import { chromium, webkit } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
// PROBE_OUT (added by glass-fix-r3): rerun into another seat's folder.
const OUT = process.env.PROBE_OUT || join(HERE, '..', '.out', 'stage3-b2', 'glass-recritic-r1');
const args = process.argv.slice(2);
const arg = (n, f) => { const i = args.indexOf(`--${n}`); return i === -1 ? f : args[i + 1]; };
const base = arg('base', 'http://127.0.0.1:4477');
const only = arg('only', '');
const want = (k) => !only || only.split(',').includes(k);
const R = {};
const HOME = `${base}/t/glassmorphism/`;

const browser = await chromium.launch({
  args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
});

async function ctx({ w = 1440, h = 900, phone = false, scheme = 'light', rt = 'no-preference', b = browser } = {}) {
  const context = await b.newContext(phone
    ? { viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, colorScheme: scheme }
    : { viewport: { width: w, height: h }, deviceScaleFactor: 1, colorScheme: scheme });
  await suppressPrompt(context);
  await context.addInitScript((sch) => {
    try { localStorage.setItem('bdl-scheme', sch); } catch {}
    window.__draws = 0;
    const p = WebGLRenderingContext.prototype;
    const o = p.drawArrays;
    p.drawArrays = function (...a) { window.__draws++; return o.apply(this, a); };
  }, scheme);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  let cdp = null;
  if (b === browser) {
    cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: rt }, { name: 'prefers-color-scheme', value: scheme }] });
  }
  return { context, page, cdp, errors };
}

async function gpuCheck() {
  const { context, page } = await ctx();
  await page.goto('about:blank');
  const r = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl');
    return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL);
  });
  console.log('renderer:', r);
  R.renderer = r;
  await context.close();
  if (/swiftshader|llvmpipe/i.test(r)) throw new Error('software renderer; abort');
}

const mountWait = (page) => page.waitForFunction(() => document.querySelector('.lens-poster')?.style.display === 'none', { timeout: 10000 }).then(() => true).catch(() => false);

async function open(page, scheme, url = HOME) {
  await page.goto(url, { waitUntil: 'networkidle' });
  const cur = await page.evaluate(() => document.documentElement.dataset.scheme);
  if (cur !== scheme) { await page.evaluate((s) => { document.documentElement.dataset.scheme = s; }, scheme); await page.waitForTimeout(700); }
  const ok = await mountWait(page);
  await page.waitForTimeout(400);
  return ok;
}

async function readImg(buf) {
  const img = await loadImage(buf);
  const c = createCanvas(img.width, img.height);
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  return { img, width: img.width, height: img.height, data: g.getImageData(0, 0, img.width, img.height).data };
}

/** A labelled sheet: rows of [label, buffer] cells, each drawn at `scale`,
    labels 22 px, written JPEG q92. */
async function sheet(file, rows, { scale = 1, title = '' } = {}) {
  const imgs = await Promise.all(rows.map((row) => Promise.all(row.map(async ([l, b]) => [l, await loadImage(b)]))));
  const cw = Math.max(...imgs.flat().map(([, i]) => i.width)) * scale;
  const ch = Math.max(...imgs.flat().map(([, i]) => i.height)) * scale;
  const cols = Math.max(...imgs.map((r) => r.length));
  const lh = 32, pad = 10, th = title ? 40 : 0;
  const c = createCanvas(Math.round(cols * (cw + pad) + pad), Math.round(th + imgs.length * (ch + lh + pad) + pad));
  const g = c.getContext('2d');
  g.fillStyle = '#1c1c1c'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#fff';
  if (title) { g.font = 'bold 24px sans-serif'; g.fillText(title, pad, 30); }
  g.font = '22px sans-serif';
  imgs.forEach((row, ri) => row.forEach(([l, im], ci) => {
    const x = pad + ci * (cw + pad), y = th + pad + ri * (ch + lh + pad);
    g.fillStyle = '#fff'; g.fillText(l, x, y + 24);
    g.imageSmoothingEnabled = scale < 1;
    g.drawImage(im, x, y + lh, im.width * scale, im.height * scale);
  }));
  await writeFile(join(OUT, file), c.toBuffer('image/jpeg', 92));
  return join(OUT, file);
}

/** Nearest-neighbour upscale of a buffer, with an optional crosshair. */
async function upscale(buf, k, mark) {
  const im = await loadImage(buf);
  const c = createCanvas(im.width * k, im.height * k);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(im, 0, 0, im.width * k, im.height * k);
  if (mark) { g.strokeStyle = 'rgba(255,0,0,0.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(mark[0] * k - 20, mark[1] * k); g.lineTo(mark[0] * k - 6, mark[1] * k); g.moveTo(mark[0] * k + 6, mark[1] * k); g.lineTo(mark[0] * k + 20, mark[1] * k); g.stroke(); }
  return c.toBuffer('image/png');
}

const lensGeom = (page) => page.evaluate(() => {
  const hit = document.querySelector('.lens-hit');
  if (!hit) return null;
  const h = hit.getBoundingClientRect();
  const cx = h.left + h.width / 2, cy = h.top + h.height / 2, r = h.width / 2;
  const rects = [...document.querySelectorAll('.glass, .site-header')].map((e) => e.getBoundingClientRect()).filter((q) => q.width > 0);
  let n = 0, covered = 0;
  for (let y = -r; y <= r; y += 4) for (let x = -r; x <= r; x += 4) {
    if (x * x + y * y > r * r) continue;
    n++;
    const px = cx + x, py = cy + y;
    if (rects.some((q) => px >= q.left && px <= q.right && py >= q.top && py <= q.bottom)) covered++;
  }
  const orbs = [...document.querySelectorAll('.orb')].map((o) => { const q = o.getBoundingClientRect(); return { cx: q.left + q.width / 2, cy: q.top + q.height / 2, r: q.width / 2, cls: o.className }; });
  const crossing = orbs.filter((o) => { const d = Math.hypot(o.cx - cx, o.cy - cy); return d < o.r + r && d > Math.abs(o.r - r); }).map((o) => o.cls);
  const top = document.elementFromPoint(cx, cy);
  return { cx: Math.round(cx), cy: Math.round(cy), r, start: document.getElementById('glass-lens-host')?.dataset.lensStart ?? null, paneCoverPct: +(covered / n * 100).toFixed(1), crossingOrbs: crossing, topAtCentre: top ? `${top.tagName.toLowerCase()}.${[...top.classList].join('.')}` : null, zCanvas: getComputedStyle(document.querySelector('.lens-canvas')).zIndex, zOrbs: getComputedStyle(document.querySelector('.orbs')).zIndex };
});

const switcherRects = (page) => page.evaluate(() => {
  const host = document.querySelector('bdl-switcher');
  const bar = host?.shadowRoot?.querySelector('.bar');
  const list = [];
  if (bar) { const q = bar.getBoundingClientRect(); list.push({ what: 'bar', l: q.left, t: q.top, r: q.right, b: q.bottom }); }
  if (host) { const q = host.getBoundingClientRect(); list.push({ what: 'host', l: q.left, t: q.top, r: q.right, b: q.bottom }); }
  return list;
});

/* ---------------- firstview ---------------- */
async function firstview() {
  R.firstview = {};
  const cells = { light: [], dark: [] };
  for (const [w, h, phone] of [[1440, 900, false], [1280, 800, false], [1024, 768, false], [390, 844, true]]) {
    for (const scheme of ['light', 'dark']) {
      const { context, page, errors } = await ctx({ w, h, phone, scheme });
      const ok = await open(page, scheme);
      const geom = await lensGeom(page);
      const cc = await page.evaluate(() => { const q = document.querySelector('.control-centre').getBoundingClientRect(); return [q.left, q.top, q.right, q.bottom].map(Math.round); });
      const win = await page.evaluate(() => { const q = document.querySelector('.hero .window').getBoundingClientRect(); return [q.left, q.top, q.right, q.bottom].map(Math.round); });
      const sw = await switcherRects(page);
      const buf = await page.screenshot();
      await writeFile(join(OUT, `firstview__${w}x${h}__${scheme}.png`), buf);
      R.firstview[`${w}x${h}__${scheme}`] = { mounted: ok, lens: geom, controlCentre: cc, heroWindow: win, switcher: sw, errors };
      cells[scheme].push([`${w}x${h} ${scheme} start=${geom?.start} cover=${geom?.paneCoverPct}%`, buf]);
      await context.close();
    }
  }
  await sheet('sheet__firstview-desktop.jpg', [cells.light.slice(0, 3), cells.dark.slice(0, 3)], { scale: 0.45, title: 'First view, desktop sizes (light row, dark row)' });
  await sheet('sheet__firstview-phone.jpg', [[cells.light[3], cells.dark[3]]], { scale: 0.5, title: 'First view, 390x844' });
}

/* ---------------- ccsweep ---------------- */
async function ccsweep() {
  R.ccsweep = {};
  for (const [w, h, phone] of [[1440, 900, false], [1280, 800, false], [390, 844, true]]) {
    const { context, page } = await ctx({ w, h, phone });
    await open(page, 'light');
    const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    const hits = [];
    let worst = { area: 0 };
    for (let y = 0; y <= Math.min(max, 2400); y += 10) {
      await page.evaluate((yy) => window.scrollTo(0, yy), y);
      await page.waitForTimeout(20);
      const r = await page.evaluate(() => {
        const bar = document.querySelector('bdl-switcher')?.shadowRoot?.querySelector('.bar')?.getBoundingClientRect();
        if (!bar) return null;
        const out = [];
        for (const t of document.querySelectorAll('.control-centre .cc-tile, .control-centre .cc-seg, .control-centre .cc-frost, .control-centre .cc-switch')) {
          const q = t.getBoundingClientRect();
          const ix = Math.max(0, Math.min(q.right, bar.right) - Math.max(q.left, bar.left));
          const iy = Math.max(0, Math.min(q.bottom, bar.bottom) - Math.max(q.top, bar.top));
          if (ix * iy > 0) out.push({ el: t.className + (t.dataset.tod ? `[${t.dataset.tod}]` : ''), area: Math.round(ix * iy) });
        }
        return { bar: [bar.left, bar.top, bar.right, bar.bottom].map(Math.round), out };
      });
      if (r?.out.length) {
        hits.push({ y, ...r });
        const a = r.out.reduce((s, o) => s + o.area, 0);
        if (a > worst.area) worst = { area: a, y };
      }
    }
    // Stills: the tiles scrolled to the middle of the view, and the worst-overlap scroll.
    await page.evaluate(() => document.querySelector('.control-centre').scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(400);
    const centred = await page.screenshot();
    await writeFile(join(OUT, `cc__${w}x${h}__centred.png`), centred);
    // One wheel/scroll step from the top: where does the first natural scroll leave them?
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);
    const oneStep = await page.evaluate(() => Math.max(0, Math.round(document.querySelector('.control-centre').getBoundingClientRect().bottom + scrollY - innerHeight + 24)));
    await page.evaluate((yy) => window.scrollTo(0, yy), oneStep);
    await page.waitForTimeout(300);
    const justIn = await page.screenshot();
    await writeFile(join(OUT, `cc__${w}x${h}__just-scrolled-in.png`), justIn);
    let worstShot = null;
    if (worst.y != null) {
      await page.evaluate((yy) => window.scrollTo(0, yy), worst.y);
      await page.waitForTimeout(300);
      worstShot = await page.screenshot();
      await writeFile(join(OUT, `cc__${w}x${h}__worst-overlap-y${worst.y}.png`), worstShot);
    }
    R.ccsweep[`${w}x${h}`] = { scrollMax: max, stepsWithOverlap: hits.length, firstOverlapY: hits[0]?.y ?? null, lastOverlapY: hits.at(-1)?.y ?? null, worst, sampleHits: hits.filter((_, i) => i % 4 === 0).slice(0, 12), justScrolledInY: oneStep };
    await context.close();
  }
}

/* ---------------- rim ---------------- */
async function dragLensTo(page, tx, ty) {
  const b = await (await page.$('.lens-hit')).boundingBox();
  const sx = b.x + b.width / 2, sy = b.y + b.height / 2;
  await page.mouse.move(sx, sy); await page.mouse.down();
  for (let i = 1; i <= 20; i++) { await page.mouse.move(sx + (tx - sx) * i / 20, sy + (ty - sy) * i / 20); await page.waitForTimeout(16); }
  await page.waitForTimeout(150); await page.mouse.up(); await page.waitForTimeout(700);
  await page.mouse.move(5, 5);
}

async function rim() {
  R.rim = {};
  const rows = [];
  for (const scheme of ['light', 'dark']) {
    for (const mode of ['normal', 'seam']) {
      const { context, page } = await ctx({ scheme });
      await open(page, scheme, mode === 'seam' ? `${HOME}?lensProbe=seam` : HOME);
      const orb = await page.evaluate(() => { const o = document.querySelector('.hero .orb.pink').getBoundingClientRect(); return { cx: o.left + o.width / 2, cy: o.top + o.height / 2, r: o.width / 2 }; });
      // Put the lens centre on the orb's upper-left rim direction, 0.9 r out.
      const tx = Math.max(110, orb.cx - orb.r * 0.72), ty = Math.max(200, orb.cy - orb.r * 0.72);
      await dragLensTo(page, tx, ty);
      const row = [];
      for (const scroll of [0, 60]) {
        await page.evaluate((y) => window.scrollTo(0, y), scroll);
        await page.waitForTimeout(500);
        const g = await page.evaluate(() => {
          const h = document.querySelector('.lens-hit').getBoundingClientRect();
          const o = document.querySelector('.hero .orb.pink').getBoundingClientRect();
          return { lx: h.left + h.width / 2, ly: h.top + h.height / 2, lr: h.width / 2, ox: o.left + o.width / 2, oy: o.top + o.height / 2, or: o.width / 2 };
        });
        let px, py;
        if (mode === 'normal') {
          // circle-circle intersection nearest the top
          const dx = g.ox - g.lx, dy = g.oy - g.ly, d = Math.hypot(dx, dy);
          const a = (g.lr * g.lr - g.or * g.or + d * d) / (2 * d);
          const hh = Math.sqrt(Math.max(0, g.lr * g.lr - a * a));
          const mx = g.lx + a * dx / d, my = g.ly + a * dy / d;
          const p1 = [mx + hh * dy / d, my - hh * dx / d], p2 = [mx - hh * dy / d, my + hh * dx / d];
          [px, py] = p1[1] < p2[1] ? p1 : p2;
        } else {
          // the seam (lens centre x) meets the orb's upper edge
          px = g.lx; const dx = px - g.ox; py = g.oy - Math.sqrt(Math.max(0, g.or * g.or - dx * dx));
        }
        const S = 48;
        const clip = { x: Math.round(px - S / 2), y: Math.round(py - S / 2), width: S, height: S };
        const small = await page.screenshot({ clip });
        const big = await upscale(small, 4, [S / 2, S / 2]);
        const ctxClip = { x: Math.round(g.lx - 130), y: Math.round(g.ly - 130), width: 260, height: 260 };
        const ctxShot = await page.screenshot({ clip: ctxClip });
        await writeFile(join(OUT, `rim__${scheme}__${mode}__scroll${scroll}__4x.png`), big);
        await writeFile(join(OUT, `rim__${scheme}__${mode}__scroll${scroll}__1x.png`), ctxShot);
        row.push([`${scheme} ${mode} scroll ${scroll} (1x)`, ctxShot], [`${scheme} ${mode} scroll ${scroll} 4x`, big]);
        R.rim[`${scheme}__${mode}__${scroll}`] = { point: [Math.round(px), Math.round(py)], geom: g };
      }
      rows.push(row);
      await context.close();
    }
  }
  await sheet('sheet__rim-4x.jpg', rows, { scale: 1, title: 'Lens rim over the pink orb edge: 1x context and 4x nearest crop (normal render; seam probe)' });
}

/* ---------------- identity ---------------- */
async function identity() {
  R.identity = {};
  const rows = [];
  for (const scheme of ['light', 'dark']) {
    const { context, page } = await ctx({ scheme });
    await open(page, scheme, `${HOME}?lensProbe=identity`);
    const box = await page.locator('.lens-canvas').boundingBox();
    const hit = await page.evaluate(() => { const h = document.querySelector('.lens-hit').getBoundingClientRect(); return { cx: h.left + h.width / 2, cy: h.top + h.height / 2, r: h.width / 2 }; });
    const clip = { x: Math.round(hit.cx - hit.r - 4), y: Math.round(hit.cy - hit.r - 4), width: Math.round(hit.r * 2 + 8), height: Math.round(hit.r * 2 + 8) };
    const withL = await page.screenshot({ clip });
    await page.evaluate(() => { document.querySelector('.lens-canvas').style.visibility = 'hidden'; });
    await page.waitForTimeout(150);
    const without = await page.screenshot({ clip });
    await page.evaluate(() => { document.querySelector('.lens-canvas').style.visibility = 'visible'; });
    const a = await readImg(withL), b = await readImg(without);
    const heat = createCanvas(a.width, a.height); const hg = heat.getContext('2d'); const hd = hg.createImageData(a.width, a.height);
    let max = 0, over8 = 0, n = 0, sum = 0, bx0 = 1e9, by0 = 1e9, bx1 = -1, by1 = -1, wx = 0, wy = 0, inner = 0, innerOver8 = 0;
    for (let y = 0; y < a.height; y++) for (let x = 0; x < a.width; x++) {
      const i = (y * a.width + x) * 4;
      let d = 0;
      for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(a.data[i + c] - b.data[i + c]));
      const rr = Math.hypot(x - a.width / 2, y - a.height / 2);
      if (rr > hit.r + 1) continue;
      n++; sum += d;
      if (d > max) { max = d; wx = x; wy = y; }
      if (d > 8) { over8++; bx0 = Math.min(bx0, x); by0 = Math.min(by0, y); bx1 = Math.max(bx1, x); by1 = Math.max(by1, y); }
      if (rr < hit.r - 3) { inner++; if (d > 8) innerOver8++; }
      const v = Math.min(255, d * 4);
      hd.data[i] = v; hd.data[i + 1] = d > 8 ? 0 : v; hd.data[i + 2] = d > 8 ? 0 : v; hd.data[i + 3] = 255;
    }
    hg.putImageData(hd, 0, 0);
    const heatBuf = heat.toBuffer('image/png');
    await writeFile(join(OUT, `identity__${scheme}__with.png`), withL);
    await writeFile(join(OUT, `identity__${scheme}__without.png`), without);
    await writeFile(join(OUT, `identity__${scheme}__heat.png`), heatBuf);
    // 4x crop of the worst spot, model vs page
    const S = 40;
    const wc = { x: clip.x + Math.max(0, wx - S / 2), y: clip.y + Math.max(0, wy - S / 2), width: S, height: S };
    const wWith = await page.screenshot({ clip: wc });
    await page.evaluate(() => { document.querySelector('.lens-canvas').style.visibility = 'hidden'; });
    await page.waitForTimeout(150);
    const wWithout = await page.screenshot({ clip: wc });
    await page.evaluate(() => { document.querySelector('.lens-canvas').style.visibility = 'visible'; });
    // The normal render (no probe) at the same default start.
    await page.goto(HOME, { waitUntil: 'networkidle' });
    await mountWait(page); await page.waitForTimeout(500);
    const normal = await page.screenshot({ clip });
    const normalWorst = await page.screenshot({ clip: wc });
    R.identity[scheme] = { lens: hit, maxDiff: max, meanDiff: +(sum / n).toFixed(3), pctOver8: +(over8 / n * 100).toFixed(2), innerPctOver8: +(innerOver8 / inner * 100).toFixed(2), over8Box: over8 ? [bx0, by0, bx1, by1] : null, worstAt: [wx, wy], worstRadiusFromCentre: +Math.hypot(wx - a.width / 2, wy - a.height / 2).toFixed(1) };
    rows.push([[`${scheme} identity model`, withL], [`${scheme} true page`, without], [`${scheme} diff x4 (red >8)`, heatBuf], [`${scheme} normal lens`, normal]]);
    rows.push([[`worst 4x model`, await upscale(wWith, 4)], [`worst 4x page`, await upscale(wWithout, 4)], [`worst 4x normal lens`, await upscale(normalWorst, 4)]]);
    await context.close();
  }
  await sheet('sheet__identity.jpg', rows, { scale: 1, title: 'Identity probe at the default 1440x900 start' });
}

/* ---------------- phoneswipe ---------------- */
async function phoneswipe() {
  R.phoneswipe = {};
  const rows = [];
  for (const target of ['h1', '.hero p.lead', '.hero p.sub']) {
    const { context, page, cdp } = await ctx({ w: 390, h: 844, phone: true });
    await open(page, 'light');
    const el = await page.evaluate((sel) => { const e = document.querySelector(sel); const q = e.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2, text: e.textContent.trim().slice(0, 30) }; }, target);
    const lens0 = await lensGeom(page);
    const frames = [['before', await page.screenshot({ scale: 'css' })]];
    const before = await page.evaluate(() => scrollY);
    const y0 = Math.min(800, el.y + 60), y1 = y0 - 260;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: el.x, y: y0 }] });
    for (let i = 1; i <= 14; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: el.x, y: y0 + (y1 - y0) * i / 14 }] });
      await page.waitForTimeout(16);
      if (i === 7) frames.push(['mid-swipe', await page.screenshot({ scale: 'css' })]);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(900);
    frames.push(['after +900ms', await page.screenshot({ scale: 'css' })]);
    const after = await page.evaluate(() => scrollY);
    const lens1 = await lensGeom(page);
    const startTop = await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? `${e.tagName.toLowerCase()}.${[...e.classList].join('.')}` : null; }, [el.x, y0]);
    R.phoneswipe[target] = { startPoint: [Math.round(el.x), Math.round(y0)], topElementAtStart: startTop, scrollBefore: before, scrollAfter: after, lensBefore: [lens0.cx, lens0.cy], lensAfter: [lens1.cx, lens1.cy], lensStart: lens0.start, lensPaneCover: lens0.paneCoverPct };
    rows.push(frames.map(([l, b]) => [`swipe on ${target}: ${l}`, b]));
    await context.close();
  }
  await sheet('sheet__phone-swipe.jpg', rows, { scale: 0.75, title: '390x844 touch swipes starting on hero copy' });
}

/* ---------------- frost ---------------- */
function sharpness(img, x0, y0, w, h) {
  let s = 0, n = 0;
  for (let y = y0 + 1; y < y0 + h - 1; y++) for (let x = x0 + 1; x < x0 + w - 1; x++) {
    const i = (y * img.width + x) * 4, j = i + 4, k = i + img.width * 4;
    const l = (q) => img.data[q] * 0.3 + img.data[q + 1] * 0.59 + img.data[q + 2] * 0.11;
    s += Math.abs(l(j) - l(i)) + Math.abs(l(k) - l(i)); n++;
  }
  return +(s / n).toFixed(3);
}

async function frost() {
  R.frost = {};
  const { context, page } = await ctx();
  await open(page, 'light');
  await page.evaluate(() => document.querySelector('.control-centre').scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(400);
  const cells = [];
  for (const [label, frac] of [['0', 0.0], ['50', 0.5], ['100', 1.0]]) {
    const r = await page.evaluate(() => { const q = document.querySelector('.cc-frost').getBoundingClientRect(); return { x: q.left, y: q.top + q.height / 2, w: q.width }; });
    // A real click at the track's position (native range input): 0 and 100 at the ends.
    const x = r.x + Math.max(1, Math.min(r.w - 1, r.w * frac));
    await page.mouse.click(x, r.y);
    await page.mouse.move(5, 5);
    await page.waitForTimeout(500);
    const info = await page.evaluate(() => {
      const panes = [...document.querySelectorAll('.glass')].slice(0, 12).map((e) => ({ cls: e.className.split(' ').slice(0, 3).join('.'), bf: getComputedStyle(e).backdropFilter.match(/blur\([^)]*\)/)?.[0] ?? getComputedStyle(e).backdropFilter }));
      return { value: document.querySelector('.cc-frost').value, frostVar: document.documentElement.style.getPropertyValue('--glass-frost'), step: document.documentElement.dataset.glassFrostStep ?? null, stored: sessionStorage.getItem(Object.keys(sessionStorage).find((k) => /glass/i.test(k)) ?? ''), panes };
    });
    // Pixels: the hero window over whatever is behind it (scroll to top), a 360x200 crop.
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    const win = await page.evaluate(() => { const q = document.querySelector('.hero .window').getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, h: q.height }; });
    // pick a pane crop over an orb: the doors or lab panel are further down; use the window's right half, bottom
    const clip = { x: Math.round(win.x + win.w * 0.55), y: Math.round(win.y + win.h * 0.55), width: 360, height: 200 };
    const buf = await page.screenshot({ clip });
    const im = await readImg(buf);
    info.sharpness = sharpness(im, 0, 0, im.width, im.height);
    const doors = await page.evaluate(() => { const e = document.querySelector('.door, .doors .glass, .lab-panel'); if (!e) return null; e.scrollIntoView({ block: 'center' }); const q = e.getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, h: q.height, cls: e.className }; });
    await page.waitForTimeout(400);
    let dbuf = null;
    if (doors) {
      const dclip = { x: Math.round(doors.x), y: Math.round(doors.y), width: Math.round(Math.min(doors.w, 420)), height: Math.round(Math.min(doors.h, 260)) };
      dbuf = await page.screenshot({ clip: dclip });
      info.doorSharpness = sharpness(await readImg(dbuf), 0, 0, dclip.width, dclip.height);
      info.doorCls = doors.cls;
    }
    R.frost[label] = info;
    cells.push([`frost ${label}: window`, buf]);
    if (dbuf) cells.push([`frost ${label}: ${doors.cls.split(' ')[0]}`, dbuf]);
    await page.evaluate(() => document.querySelector('.control-centre').scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(300);
  }
  await sheet('sheet__frost.jpg', [cells.filter((_, i) => i % 2 === 0), cells.filter((_, i) => i % 2 === 1)], { scale: 1, title: 'Frost slider by real clicks: 0 / 50 / 100' });
  await context.close();
}

async function webkitFrost() {
  let wk;
  try { wk = await webkit.launch(); } catch (e) { R.webkit = { error: String(e).slice(0, 200) }; return; }
  const context = await wk.newContext({ viewport: { width: 1440, height: 900 } });
  await suppressPrompt(context);
  const page = await context.newPage();
  await page.goto(HOME, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const out = {};
  for (const v of [0, 50, 100]) {
    await page.$eval('.cc-frost', (el, val) => { el.value = String(val); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, v);
    await page.waitForTimeout(300);
    out[v] = await page.evaluate(() => {
      const w = document.querySelector('.hero .window');
      const cs = getComputedStyle(w);
      return { step: document.documentElement.dataset.glassFrostStep ?? null, webkitBf: cs.webkitBackdropFilter || cs.getPropertyValue('-webkit-backdrop-filter'), bf: cs.backdropFilter, inline: w.style.cssText.slice(0, 160) };
    });
  }
  const gl = await page.evaluate(() => { const c = document.createElement('canvas').getContext('webgl'); const e = c?.getExtension('WEBGL_debug_renderer_info'); return c ? (e ? c.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'webgl, no debug info') : 'no webgl'; });
  const lens = await page.evaluate(() => ({ poster: document.querySelector('.lens-poster')?.style.display ?? null, canvas: !!document.querySelector('.lens-canvas'), vis: document.querySelector('.lens-canvas')?.style.visibility ?? null }));
  R.webkit = { renderer: gl, frost: out, lens };
  await page.screenshot({ path: join(OUT, 'webkit__home.png') });
  await wk.close();
}

/* ---------------- services ---------------- */
async function services() {
  R.services = {};
  const cells = [];
  for (const [w, h, phone] of [[1440, 900, false], [390, 844, true]]) for (const scheme of ['light', 'dark']) {
    const { context, page } = await ctx({ w, h, phone, scheme });
    await page.goto(`${base}/t/glassmorphism/services/`, { waitUntil: 'networkidle' });
    const cur = await page.evaluate(() => document.documentElement.dataset.scheme);
    if (cur !== scheme) { await page.evaluate((s) => { document.documentElement.dataset.scheme = s; }, scheme); }
    await page.waitForTimeout(700);
    const el = await page.$('.settings-pane');
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    const buf = await el.screenshot();
    await writeFile(join(OUT, `services__${w}__${scheme}.png`), buf);
    R.services[`${w}__${scheme}`] = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('.settings-row')];
      const ctrl = rows.map((r) => { const c = r.querySelector('.settings-controls').getBoundingClientRect(); return { top: Math.round(c.top), bottom: Math.round(c.bottom) }; });
      const sw = [...document.querySelectorAll('.mini-switch')].map((s) => ({ on: s.closest('[data-on], .on') ? true : s.getAttribute('data-state') || s.className, bg: getComputedStyle(s).backgroundColor, border: getComputedStyle(s).borderColor }));
      const pane = getComputedStyle(document.querySelector('.settings-pane')).backgroundColor;
      const focusables = document.querySelectorAll('.settings-controls a, .settings-controls button, .settings-controls input, .settings-controls [tabindex]:not([tabindex="-1"])').length;
      const hiddenAll = [...document.querySelectorAll('.settings-controls')].every((e) => e.getAttribute('aria-hidden') === 'true');
      return { controlsTop: ctrl.map((c) => c.top), controlsBottom: ctrl.map((c) => c.bottom), switches: sw, pane, focusables, hiddenAll, hscroll: document.documentElement.scrollWidth > innerWidth };
    });
    cells.push([`${w} ${scheme}`, buf]);
    await context.close();
  }
  await sheet('sheet__services-desktop.jpg', [[cells[0]], [cells[1]]], { scale: 0.8, title: 'Services settings pane, 1440 light / dark' });
  await sheet('sheet__services-phone.jpg', [[cells[2], cells[3]]], { scale: 0.5, title: 'Services settings pane, 390 light / dark' });
}

/* ---------------- switch ---------------- */
async function switchCrops() {
  const cells = [];
  R.switch = {};
  for (const scheme of ['light', 'dark']) {
    const { context, page } = await ctx({ scheme });
    await open(page, scheme);
    const row = [];
    for (const state of ['clear', 'tinted']) {
      if (state === 'tinted') { await page.click('.hero .window-bar .switch'); await page.mouse.move(5, 5); await page.waitForTimeout(500); }
      const bar = await page.$('.hero .window-bar');
      const bb = await bar.boundingBox();
      const sw = await (await page.$('.hero .window-bar .switch')).boundingBox();
      const clip = { x: Math.round(sw.x - 60), y: Math.round(bb.y), width: Math.round(sw.width + 120), height: Math.round(bb.height) };
      const b1 = await page.screenshot({ clip });
      row.push([`${scheme} ${state} hero`, await upscale(b1, 3)]);
      await page.evaluate(() => document.querySelector('.cc-tile-tint').scrollIntoView({ block: 'center' }));
      await page.waitForTimeout(300);
      const tile = await (await page.$('.cc-tile-tint')).screenshot();
      row.push([`${scheme} ${state} CC tile`, await upscale(tile, 2)]);
      R.switch[`${scheme}__${state}`] = await page.evaluate(() => {
        const a = document.querySelector('.hero .window-bar .switch'), b = document.querySelector('.cc-tint-switch');
        const cs = getComputedStyle(a);
        return { heroChecked: a.getAttribute('aria-checked'), tileChecked: b.getAttribute('aria-checked'), bg: cs.backgroundColor, padding: cs.padding, border: cs.borderStyle, tint: document.documentElement.dataset.glassTint };
      });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(300);
    }
    cells.push(row);
    await context.close();
  }
  await sheet('sheet__switch.jpg', cells, { scale: 1, title: 'Hero window-bar switch (3x) and the CC tint tile (2x)' });
}

/* ---------------- screencast film helper ---------------- */
async function film(cdp, page, ms, { maxWidth = 1440 } = {}) {
  const frames = [];
  const t0 = Date.now();
  const handler = async (f) => {
    frames.push({ t: Date.now() - t0, data: f.data });
    try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch {}
  };
  cdp.on('Page.screencastFrame', handler);
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 85, maxWidth, maxHeight: 2000, everyNthFrame: 1 });
  return {
    frames,
    t0,
    async stop() { await page.waitForTimeout(ms); await cdp.send('Page.stopScreencast'); cdp.off('Page.screencastFrame', handler); return frames; },
  };
}

/* ---------------- tod ---------------- */
async function tod() {
  R.tod = {};
  const { context, page, cdp } = await ctx();
  await open(page, 'light');
  // Put the lens in view with the CC: scroll so the tiles are just in view; the lens is fixed.
  await page.evaluate(() => document.querySelector('.control-centre').scrollIntoView({ block: 'end' }));
  await page.waitForTimeout(500);
  const rows = [];
  for (const t of ['dusk', 'dawn']) {
    await page.evaluate(() => {
      window.__todLog = [];
      const tick = () => {
        const h = document.documentElement;
        window.__todLog.push([Math.round(performance.now()), h.dataset.glassTod, document.querySelector('.lens-poster')?.style.display ?? null, document.querySelector('.lens-canvas')?.style.visibility ?? null]);
        if (window.__todLog.length < 120) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    const f = await film(cdp, page, 1400, { maxWidth: 720 });
    await page.click(`.cc-seg[data-tod="${t}"]`);
    const frames = await f.stop();
    const log = await page.evaluate(() => window.__todLog);
    const changes = log.filter((e, i) => i === 0 || JSON.stringify(e.slice(1)) !== JSON.stringify(log[i - 1].slice(1)));
    R.tod[t] = { frameCount: frames.length, stateChanges: changes };
    const pick = frames.filter((_, i) => i % Math.max(1, Math.floor(frames.length / 8)) === 0).slice(0, 8);
    rows.push(pick.map((fr) => [`${t} +${fr.t}ms`, Buffer.from(fr.data, 'base64')]));
    await page.mouse.move(5, 5);
    await page.waitForTimeout(600);
  }
  await sheet('film__tod-switch.jpg', rows.map((r) => r.slice(0, 4)).concat(rows.map((r) => r.slice(4, 8))), { scale: 0.5, title: 'Time of day switch, screencast frames (Day->Dusk, Dusk->Dawn)' });
  await context.close();
}

/* ---------------- arrival ---------------- */
async function viaSwitcher(page, school) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  await page.locator('.open[aria-haspopup="dialog"]').first().click();
  const link = page.locator(`a[data-school="${school}"]`).first();
  await link.waitFor({ state: 'visible', timeout: 5000 });
  await link.click();
}

async function arrival() {
  R.arrival = {};
  for (const scheme of ['light', 'dark']) {
    const { context, page, cdp, errors } = await ctx({ scheme });
    await open(page, scheme);
    await page.click('.hero .window-bar .switch');
    await page.evaluate(() => document.querySelector('.control-centre').scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(300);
    await page.click('.cc-seg[data-tod="dusk"]');
    const r = await page.evaluate(() => { const q = document.querySelector('.cc-frost').getBoundingClientRect(); return { x: q.right - 1, y: q.top + q.height / 2 }; });
    await page.mouse.click(r.x, r.y);
    await page.waitForTimeout(800);
    const set = await page.evaluate(() => ({ tint: document.documentElement.dataset.glassTint, tod: document.documentElement.dataset.glassTod, frost: document.documentElement.style.getPropertyValue('--glass-frost'), step: document.documentElement.dataset.glassFrostStep ?? null }));
    await viaSwitcher(page, 'vaporwave');
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'vaporwave', { timeout: 8000 });
    await page.waitForTimeout(2500);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    // per-rAF attribute log that survives the swap (document element persists)
    await page.evaluate(() => {
      window.__attrLog = [];
      const t0 = performance.now();
      const tick = () => {
        const h = document.documentElement;
        const w = document.querySelector('.hero .window');
        window.__attrLog.push([Math.round(performance.now() - t0), h.dataset.theme, h.dataset.glassTint ?? '-', h.dataset.glassTod ?? '-', h.dataset.glassFrostStep ?? '-', h.style.getPropertyValue('--glass-frost') || '-', w ? (getComputedStyle(w).backdropFilter.match(/blur\([^)]*\)/)?.[0] ?? 'none') : '-']);
        if (window.__attrLog.length < 300) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    const f = await film(cdp, page, 2600, { maxWidth: 720 });
    await viaSwitcher(page, 'glassmorphism');
    const frames = await f.stop();
    await mountWait(page);
    const log = await page.evaluate(() => window.__attrLog);
    const glassRows = log.filter((e) => e[1] === 'glassmorphism');
    const changes = glassRows.filter((e, i) => i === 0 || JSON.stringify(e.slice(1)) !== JSON.stringify(glassRows[i - 1].slice(1)));
    const final = await page.evaluate(() => ({ tint: document.documentElement.dataset.glassTint, tod: document.documentElement.dataset.glassTod, frost: document.documentElement.style.getPropertyValue('--glass-frost'), step: document.documentElement.dataset.glassFrostStep ?? null, sliderValue: document.querySelector('.cc-frost')?.value, tileChecked: document.querySelector('.cc-tint-switch')?.getAttribute('aria-checked'), heroChecked: document.querySelector('.hero .window-bar .switch')?.getAttribute('aria-checked'), todChecked: document.querySelector('.cc-seg[aria-checked="true"]')?.dataset.tod, winBf: getComputedStyle(document.querySelector('.hero .window')).backdropFilter.match(/blur\([^)]*\)/)?.[0] }));
    // Draws still happen after the arrival (not frozen)
    await page.evaluate(() => { window.__draws = 0; });
    await page.mouse.wheel(0, 60); await page.waitForTimeout(400);
    const drawsOnScroll = await page.evaluate(() => window.__draws);
    R.arrival[scheme] = { setBeforeLeaving: set, finalAfterReturn: final, glassStateChanges: changes.slice(0, 20), frames: frames.length, drawsOnScrollAfterArrival: drawsOnScroll, errors };
    // a dense strip: every frame of the first 900 ms, then sparse
    const early = frames.filter((fr) => fr.t < 1100);
    const late = frames.filter((fr) => fr.t >= 1100).filter((_, i, a) => i % Math.max(1, Math.floor(a.length / 4)) === 0).slice(0, 4);
    const pick = early.filter((_, i, a) => i % Math.max(1, Math.floor(a.length / 12)) === 0).slice(0, 12).concat(late);
    const cells = pick.map((fr) => [`+${fr.t}ms`, Buffer.from(fr.data, 'base64')]);
    const rows = []; for (let i = 0; i < cells.length; i += 4) rows.push(cells.slice(i, i + 4));
    await sheet(`film__arrival-held__${scheme}.jpg`, rows, { scale: 0.5, title: `Vaporwave -> glass via the switcher, Tinted+Dusk+Frost100 held (${scheme}); t from the switcher click` });
    await context.close();
  }
}

/* ---------------- fling into the right wall, screencast ---------------- */
async function fling() {
  const { context, page, cdp } = await ctx();
  await open(page, 'light');
  const b = await (await page.$('.lens-hit')).boundingBox();
  const sx = b.x + b.width / 2, sy = b.y + b.height / 2;
  const samples = [];
  await page.evaluate(() => {
    window.__fl = [];
    const t0 = performance.now();
    const tick = () => {
      const t = document.querySelector('.lens-shadow-rest')?.style.transform || '';
      const m = t.match(/matrix\(([^)]*)\)/);
      const h = document.querySelector('.lens-hit').getBoundingClientRect();
      window.__fl.push([Math.round(performance.now() - t0), Math.round(h.left + h.width / 2), m ? m[1].split(',').slice(0, 4).map((v) => +(+v).toFixed(4)) : null, document.documentElement.classList.contains('lens-held')]);
      if (window.__fl.length < 400) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const f = await film(cdp, page, 1500, { maxWidth: 720 });
  await page.mouse.move(sx, sy); await page.mouse.down();
  for (let i = 1; i <= 8; i++) { await page.mouse.move(sx + i * 25, sy + i * 6); await page.waitForTimeout(16); }
  for (let i = 1; i <= 6; i++) { await page.mouse.move(sx + 200 + i * 110, sy + 48); await page.waitForTimeout(8); }
  await page.mouse.up();
  const frames = await f.stop();
  const log = await page.evaluate(() => window.__fl);
  const xs = log.map((e) => e[1]);
  const maxX = Math.max(...xs);
  const finalX = xs.at(-1);
  const maxStretch = Math.max(...log.filter((e) => e[2]).map((e) => Math.max(Math.abs(e[2][0]), Math.abs(e[2][3]))));
  const selection = await page.evaluate(() => String(getSelection()));
  R.fling = { start: [Math.round(sx), Math.round(sy)], maxX, finalX, backtrackPx: maxX - finalX, maxStretch, selectedText: selection, logSparse: log.filter((_, i) => i % 6 === 0).slice(0, 30) };
  const pick = frames.filter((_, i, a) => i % Math.max(1, Math.floor(a.length / 12)) === 0).slice(0, 12);
  const cells = pick.map((fr) => [`+${fr.t}ms`, Buffer.from(fr.data, 'base64')]);
  const rows = []; for (let i = 0; i < cells.length; i += 4) rows.push(cells.slice(i, i + 4));
  await sheet('film__fling-wall.jpg', rows, { scale: 0.5, title: 'Drag then fling into the right wall, 1440x900 (screencast; t from film start)' });
  await context.close();
}

/* ---------------- idle / leak ---------------- */
async function idle() {
  const { context, page } = await ctx();
  await open(page, 'light');
  await page.waitForTimeout(1000);
  await page.evaluate(() => { window.__draws = 0; });
  // count rAF callbacks the page itself schedules and long tasks for 4 s idle
  const r = await page.evaluate(async () => {
    const pos = () => [...document.querySelectorAll('.hero .orb')].map((o) => { const q = o.getBoundingClientRect(); return [q.left, q.top]; });
    const a = pos();
    await new Promise((res) => setTimeout(res, 4000));
    const b = pos();
    return { draws: window.__draws, orbDrift: a.map((p, i) => +Math.hypot(b[i][0] - p[0], b[i][1] - p[1]).toFixed(2)) };
  });
  // hidden tab: draws while document.hidden
  R.idle = r;
  await context.close();
}

await mkdir(OUT, { recursive: true });
await gpuCheck();
for (const [k, fn] of [['firstview', firstview], ['ccsweep', ccsweep], ['rim', rim], ['identity', identity], ['phoneswipe', phoneswipe], ['frost', frost], ['webkit', webkitFrost], ['services', services], ['switch', switchCrops], ['tod', tod], ['arrival', arrival], ['fling', fling], ['idle', idle]]) {
  if (!want(k)) continue;
  try { await fn(); console.log('done', k); } catch (e) { R[`${k}_error`] = String(e.stack || e).slice(0, 600); console.log('ERR', k, e.message); }
}
await browser.close();
await writeFile(join(OUT, `results${only ? '-' + only.replace(/,/g, '_') : ''}.json`), JSON.stringify(R, null, 2));
console.log('written');
