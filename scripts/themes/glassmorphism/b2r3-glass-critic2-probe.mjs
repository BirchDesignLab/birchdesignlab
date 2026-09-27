/**
 * Wave B2 glass RE-CRITIC round 2 (09-26-26). Own evidence for glass fix
 * round 3, against a snap already serving at --base (port 4475):
 *   orbedge  the lens at its default start (1440x900 and 390x844): fresh,
 *            idle 4 s, scrolled 120 px by a real wheel; Clear and Tinted (by a
 *            real click on the hero switch); light and dark. Draw counts and
 *            orb drift per step. One labelled sheet per size.
 *   rim      4x nearest crops where the lens rim crosses a real orb edge at
 *            the default start (no drag), with the lens and with the canvas
 *            hidden, at scroll 0 and 120, light and dark, plus 1x context.
 *   ccsw     the Control Centre vs EVERY visible box in the switcher's shadow
 *            root (not only .bar), scroll 0 to the end at 10 px steps, at
 *            1440x900, 1280x800, 1024x768; a still with the tiles in view and
 *            the switcher rect outlined.
 *   ctxloss  drag, lose the WebGL context, restore: a timestamped strip and
 *            the poster vs lens geometry.
 *   input    panes and links still take input over the lens (1024x768 where
 *            the lens sits partly under the window; 1440 door link and text
 *            selection on the hero headline).
 * GPU Chromium (aborts on SwiftShader), prefers-reduced-transparency forced
 * to no-preference over CDP, the portal prompt suppressed.
 *
 * Usage: BDL_GPU=1 node scripts/themes/glassmorphism/b2r3-glass-critic2-probe.mjs --base http://127.0.0.1:4475 [--only a,b]
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.PROBE_OUT || join(HERE, '..', '.out', 'stage3-b2', 'glass-recritic-r2', 'own');
const args = process.argv.slice(2);
const arg = (n, f) => { const i = args.indexOf(`--${n}`); return i === -1 ? f : args[i + 1]; };
const base = arg('base', 'http://127.0.0.1:4475');
const only = arg('only', '');
const want = (k) => !only || only.split(',').includes(k);
const HOME = `${base}/t/glassmorphism/`;
const R = {};

const browser = await chromium.launch({
  args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
});

async function ctx({ w = 1440, h = 900, phone = false, scheme = 'light' } = {}) {
  const context = await browser.newContext(phone
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
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }, { name: 'prefers-color-scheme', value: scheme }] });
  return { context, page, cdp, errors };
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
}

async function upscale(buf, k) {
  const im = await loadImage(buf);
  const c = createCanvas(im.width * k, im.height * k);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(im, 0, 0, im.width * k, im.height * k);
  return c.toBuffer('image/png');
}

const lensInfo = (page) => page.evaluate(() => {
  const h = document.querySelector('.lens-hit').getBoundingClientRect();
  const host = document.getElementById('glass-lens-host');
  const orbs = [...document.querySelectorAll('.orb')].map((o) => { const q = o.getBoundingClientRect(); return { cls: o.className, cx: q.left + q.width / 2, cy: q.top + q.height / 2, r: q.width / 2, vis: getComputedStyle(o).visibility, op: getComputedStyle(o).opacity }; });
  const p = document.querySelector('.lens-poster').getBoundingClientRect();
  return { cx: h.left + h.width / 2, cy: h.top + h.height / 2, r: h.width / 2, start: host?.dataset.lensStart, cover: host?.dataset.lensCover, source: host?.dataset.lensSource, orbs, poster: { cx: p.left + p.width / 2, cy: p.top + p.height / 2, w: p.width, display: getComputedStyle(document.querySelector('.lens-poster')).display }, draws: window.__draws, scrollY };
});

async function gpuCheck() {
  const { context, page } = await ctx();
  await page.goto('about:blank');
  const r = await page.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); });
  console.log('renderer:', r);
  R.renderer = r;
  await context.close();
  if (/swiftshader|llvmpipe/i.test(r)) throw new Error('software renderer; abort');
}

/* ---------------- orbedge ---------------- */
async function orbedge() {
  R.orbedge = {};
  for (const [w, h, phone] of [[1440, 900, false], [390, 844, true]]) {
    const rows = [];
    for (const scheme of ['light', 'dark']) {
      for (const tint of ['clear', 'tinted']) {
        const { context, page, errors } = await ctx({ w, h, phone, scheme });
        await open(page, scheme);
        if (tint === 'tinted') { await page.click('.hero .switch'); await page.mouse.move(2, 2); await page.waitForTimeout(700); }
        const g0 = await lensInfo(page);
        const pad = phone ? 50 : 80;
        const clip = { x: Math.max(0, Math.round(g0.cx - g0.r - pad)), y: Math.max(0, Math.round(g0.cy - g0.r - pad)), width: Math.round(2 * (g0.r + pad)), height: Math.round(2 * (g0.r + pad)) };
        clip.width = Math.min(clip.width, w - clip.x); clip.height = Math.min(clip.height, h - clip.y);
        const fresh = await page.screenshot({ clip, scale: 'css' });
        const d0 = await page.evaluate(() => window.__draws);
        const orbs0 = await page.evaluate(() => [...document.querySelectorAll('.hero .orb')].map((o) => { const q = o.getBoundingClientRect(); return [q.left, q.top]; }));
        await page.waitForTimeout(4000);
        const d1 = await page.evaluate(() => window.__draws);
        const orbs1 = await page.evaluate(() => [...document.querySelectorAll('.hero .orb')].map((o) => { const q = o.getBoundingClientRect(); return [q.left, q.top]; }));
        const idle = await page.screenshot({ clip, scale: 'css' });
        await page.mouse.move(phone ? 30 : 700, phone ? 300 : 120);
        await page.mouse.wheel(0, 120);
        await page.waitForTimeout(900);
        const d2 = await page.evaluate(() => window.__draws);
        const g2 = await lensInfo(page);
        const scrolled = await page.screenshot({ clip, scale: 'css' });
        const drift = Math.max(...orbs0.map((p, i) => Math.hypot(p[0] - orbs1[i][0], p[1] - orbs1[i][1])));
        R.orbedge[`${w}x${h}__${scheme}__${tint}`] = { lens: { cx: Math.round(g0.cx), cy: Math.round(g0.cy), r: g0.r, start: g0.start, cover: g0.cover, source: g0.source }, idleDraws4s: d1 - d0, idleOrbDriftPx: +drift.toFixed(2), scrollY: g2.scrollY, drawsOnScroll: d2 - d1, errors };
        rows.push([[`${scheme} ${tint}: fresh`, fresh], [`idle 4 s (draws ${d1 - d0})`, idle], [`scrolled ${g2.scrollY}px (draws ${d2 - d1})`, scrolled]]);
        await context.close();
      }
    }
    await sheet(`sheet__orbedge-${w}x${h}.jpg`, rows, { scale: 1, title: `Lens at its default start over an orb edge, ${w}x${h}` });
  }
}

/* ---------------- rim ---------------- */
function intersections(lx, ly, lr, ox, oy, or) {
  const dx = ox - lx, dy = oy - ly, d = Math.hypot(dx, dy);
  if (d >= lr + or || d <= Math.abs(lr - or)) return [];
  const a = (lr * lr - or * or + d * d) / (2 * d);
  const hh = Math.sqrt(Math.max(0, lr * lr - a * a));
  const mx = lx + a * dx / d, my = ly + a * dy / d;
  return [[mx + hh * dy / d, my - hh * dx / d], [mx - hh * dy / d, my + hh * dx / d]];
}
async function rim() {
  R.rim = {};
  const rows = [];
  for (const scheme of ['light', 'dark']) {
    const { context, page } = await ctx({ scheme });
    await open(page, scheme);
    for (const scroll of [0, 120]) {
      if (scroll) { await page.mouse.move(700, 120); await page.mouse.wheel(0, scroll); await page.waitForTimeout(900); }
      const g = await lensInfo(page);
      const pts = [];
      for (const o of g.orbs) for (const p of intersections(g.cx, g.cy, g.r, o.cx, o.cy, o.r)) if (p[0] > 30 && p[1] > 30 && p[0] < 1410 && p[1] < 870) pts.push({ p, orb: o.cls });
      R.rim[`${scheme}__scroll${scroll}`] = { lens: [Math.round(g.cx), Math.round(g.cy), g.r], points: pts.map((q) => ({ at: q.p.map(Math.round), orb: q.orb })) };
      const ctxClip = { x: Math.round(g.cx - g.r - 40), y: Math.round(g.cy - g.r - 40), width: Math.round(2 * g.r + 80), height: Math.round(2 * g.r + 80) };
      const ctxShot = await page.screenshot({ clip: ctxClip });
      const row = [[`${scheme} scroll ${scroll}: 1x`, ctxShot]];
      for (const q of pts.slice(0, 2)) {
        const S = 44;
        const clip = { x: Math.round(q.p[0] - S / 2), y: Math.round(q.p[1] - S / 2), width: S, height: S };
        const withL = await upscale(await page.screenshot({ clip }), 4);
        await page.evaluate(() => { for (const e of document.querySelectorAll('.lens-canvas, .lens-shadow, [class*="lens-shadow"]')) e.style.visibility = 'hidden'; });
        await page.waitForTimeout(120);
        const without = await upscale(await page.screenshot({ clip }), 4);
        await page.evaluate(() => { for (const e of document.querySelectorAll('.lens-canvas, .lens-shadow, [class*="lens-shadow"]')) e.style.visibility = ''; });
        await page.waitForTimeout(120);
        row.push([`4x rim x ${q.orb.replace('orb ', '')} @${q.p.map(Math.round)}`, withL], ['4x same spot, lens hidden', without]);
      }
      rows.push(row);
      await writeFile(join(OUT, `rim__${scheme}__scroll${scroll}__1x.png`), ctxShot);
    }
    await context.close();
  }
  await sheet('sheet__rim-default-start.jpg', rows, { scale: 1, title: 'Rim over real orb edges at the default 1440x900 start (no drag)' });
}

/* ---------------- ccsw ---------------- */
async function ccsw() {
  R.ccsw = {};
  const shots = [];
  for (const [w, h] of [[1440, 900], [1280, 800], [1024, 768]]) {
    const { context, page } = await ctx({ w, h });
    await open(page, 'light');
    const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    const hits = [];
    let boxes = null;
    for (let y = 0; y <= Math.min(max, 2400); y += 10) {
      await page.evaluate((yy) => window.scrollTo(0, yy), y);
      await page.waitForTimeout(20);
      const r = await page.evaluate(() => {
        const host = document.querySelector('bdl-switcher');
        const sw = [];
        for (const e of host.shadowRoot.querySelectorAll('*')) {
          const q = e.getBoundingClientRect();
          const cs = getComputedStyle(e);
          if (q.width < 1 || q.height < 1 || cs.visibility === 'hidden' || cs.display === 'none' || e.closest('[hidden]') || e.closest('dialog:not([open])')) continue;
          sw.push({ tag: e.tagName.toLowerCase() + '.' + [...e.classList].join('.'), l: q.left, t: q.top, r: q.right, b: q.bottom });
        }
        const out = [];
        for (const t of document.querySelectorAll('.control-centre, .control-centre .cc-tile, .control-centre .cc-seg, .control-centre .cc-frost, .control-centre .cc-switch')) {
          const q = t.getBoundingClientRect();
          for (const s of sw) {
            const ix = Math.max(0, Math.min(q.right, s.r) - Math.max(q.left, s.l));
            const iy = Math.max(0, Math.min(q.bottom, s.b) - Math.max(q.top, s.t));
            if (ix * iy > 0) out.push({ el: t.className + (t.dataset.tod ? `[${t.dataset.tod}]` : ''), sw: s.tag, area: Math.round(ix * iy) });
          }
        }
        const cc = document.querySelector('.control-centre').getBoundingClientRect();
        let sl = 1e9, st = 1e9;
        for (const s of sw) { sl = Math.min(sl, s.l); st = Math.min(st, s.t); }
        return { out, cc: [cc.left, cc.top, cc.right, cc.bottom].map(Math.round), swLeft: Math.round(sl), swTop: Math.round(st), n: sw.length };
      });
      if (!boxes) boxes = r;
      if (r.out.length) hits.push({ y, out: r.out.slice(0, 6) });
    }
    // Still: tiles fully in view near the bottom (the worst natural spot), switcher outlined.
    await page.evaluate(() => { const q = document.querySelector('.control-centre').getBoundingClientRect(); window.scrollTo(0, Math.max(0, q.bottom + scrollY - innerHeight + 30)); });
    await page.waitForTimeout(400);
    const geo = await page.evaluate(() => { const host = document.querySelector('bdl-switcher'); const bar = host.shadowRoot.querySelector('.bar').getBoundingClientRect(); const cc = document.querySelector('.control-centre').getBoundingClientRect(); return { bar: [bar.left, bar.top, bar.right, bar.bottom].map(Math.round), cc: [cc.left, cc.top, cc.right, cc.bottom].map(Math.round), y: scrollY }; });
    const shot = await page.screenshot();
    const im = await loadImage(shot);
    const c = createCanvas(im.width, im.height); const g = c.getContext('2d'); g.drawImage(im, 0, 0);
    g.strokeStyle = 'rgba(255,0,0,0.85)'; g.lineWidth = 2;
    g.strokeRect(geo.bar[0] - 2, geo.bar[1] - 2, geo.bar[2] - geo.bar[0] + 4, geo.bar[3] - geo.bar[1] + 4);
    g.strokeStyle = 'rgba(0,160,255,0.85)';
    g.strokeRect(geo.cc[0] - 2, geo.cc[1] - 2, geo.cc[2] - geo.cc[0] + 4, geo.cc[3] - geo.cc[1] + 4);
    const buf = c.toBuffer('image/png');
    await writeFile(join(OUT, `ccsw__${w}x${h}__tiles-in-view.png`), buf);
    shots.push([`${w}x${h} scroll ${geo.y}: CC right ${geo.cc[2]} vs bar left ${geo.bar[0]} (red = switcher bar)`, buf]);
    R.ccsw[`${w}x${h}`] = { scrollMax: max, switcherBoxesChecked: boxes?.n, ccAtTop: boxes?.cc, switcherLeft: boxes?.swLeft, switcherTop: boxes?.swTop, stepsWithOverlap: hits.length, hits: hits.slice(0, 8), stillGeo: geo };
    await context.close();
  }
  await sheet('sheet__cc-vs-switcher.jpg', shots.map((s) => [s]), { scale: 0.6, title: 'Control Centre scrolled into view vs the portal switcher' });
}

/* ---------------- ctxloss ---------------- */
async function ctxloss() {
  R.ctxloss = {};
  const { context, page } = await ctx();
  await open(page, 'light');
  const g0 = await lensInfo(page);
  // drag the lens 300 px right, 60 down
  await page.mouse.move(g0.cx, g0.cy); await page.mouse.down();
  for (let i = 1; i <= 20; i++) { await page.mouse.move(g0.cx + 15 * i, g0.cy + 3 * i); await page.waitForTimeout(16); }
  await page.mouse.up(); await page.mouse.move(2, 2); await page.waitForTimeout(900);
  const g1 = await lensInfo(page);
  await page.evaluate(() => { const c = document.querySelector('.lens-canvas'); const gl = c.getContext('webgl') || c.getContext('experimental-webgl'); window.__lc = gl.getExtension('WEBGL_lose_context'); window.__lc.loseContext(); });
  const frames = [];
  const t0 = Date.now();
  const clip = { x: 0, y: 150, width: 900, height: 560 };
  for (const wait of [0, 150, 500]) { await page.waitForTimeout(Math.max(0, wait - (Date.now() - t0))); frames.push([`lost +${Date.now() - t0}ms`, await page.screenshot({ clip }), 0]); }
  const gLost = await lensInfo(page);
  const canvasLost = await page.evaluate(() => getComputedStyle(document.querySelector('.lens-canvas')).visibility);
  await page.evaluate(() => window.__lc.restoreContext());
  const t1 = Date.now();
  for (const wait of [50, 300, 800]) { await page.waitForTimeout(Math.max(0, wait - (Date.now() - t1))); frames.push([`restored +${Date.now() - t1}ms`, await page.screenshot({ clip }), 0]); }
  const gBack = await lensInfo(page);
  const canvasBack = await page.evaluate(() => getComputedStyle(document.querySelector('.lens-canvas')).visibility);
  R.ctxloss = { dragged: { from: [Math.round(g0.cx), Math.round(g0.cy)], to: [Math.round(g1.cx), Math.round(g1.cy)] }, lost: { poster: gLost.poster, lens: [Math.round(gLost.cx), Math.round(gLost.cy), gLost.r], canvasVisibility: canvasLost }, restored: { poster: gBack.poster, canvasVisibility: canvasBack, draws: gBack.draws } };
  await sheet('film__ctxloss.jpg', [frames.slice(0, 3).map(([l, b]) => [l, b]), frames.slice(3).map(([l, b]) => [l, b])], { scale: 0.6, title: 'Context loss after a drag, then restore (1440x900 light)' });
  await context.close();
}

/* ---------------- input ---------------- */
async function input() {
  R.input = {};
  {
    const { context, page } = await ctx({ w: 1024, h: 768 });
    await open(page, 'light');
    const g = await lensInfo(page);
    // points on the disc: which element takes them
    const samples = await page.evaluate(([cx, cy, r]) => {
      const out = { lensHit: 0, pane: 0, other: {} };
      for (let y = -r; y <= r; y += 8) for (let x = -r; x <= r; x += 8) {
        if (x * x + y * y > r * r) continue;
        const e = document.elementFromPoint(cx + x, cy + y);
        if (!e) continue;
        if (e.classList.contains('lens-hit')) out.lensHit++;
        else if (e.closest('.glass, .site-header')) out.pane++;
        else { const k = e.tagName.toLowerCase() + '.' + [...e.classList].join('.'); out.other[k] = (out.other[k] || 0) + 1; }
      }
      return out;
    }, [g.cx, g.cy, g.r]);
    // a drag from a point inside the disc that sits under the window: must select text / not move the lens
    const win = await page.evaluate(() => { const q = document.querySelector('.hero .window').getBoundingClientRect(); return [q.left, q.top, q.right, q.bottom]; });
    let under = null;
    for (let y = -g.r + 6; y <= g.r - 6 && !under; y += 6) for (let x = -g.r + 6; x <= g.r - 6; x += 6) {
      const px = g.cx + x, py = g.cy + y;
      if (x * x + y * y < (g.r - 6) ** 2 && px > win[0] + 10 && py > win[1] + 10) { under = [px, py]; break; }
    }
    let underRes = null;
    if (under) {
      const top = await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e.tagName.toLowerCase() + '.' + [...e.classList].join('.'); }, under);
      await page.mouse.move(under[0], under[1]); await page.mouse.down(); await page.mouse.move(under[0] + 120, under[1] + 10, { steps: 10 }); await page.mouse.up();
      await page.waitForTimeout(500);
      const g2 = await lensInfo(page);
      underRes = { point: under.map(Math.round), top, lensMoved: +Math.hypot(g2.cx - g.cx, g2.cy - g.cy).toFixed(1) };
    }
    R.input['1024x768'] = { lens: [Math.round(g.cx), Math.round(g.cy), g.r], start: g.start, cover: g.cover, source: g.source, window: win.map(Math.round), samples, dragUnderWindow: underRes };
    await page.screenshot({ path: join(OUT, 'input__1024x768.png') });
    await context.close();
  }
  {
    const { context, page } = await ctx();
    await open(page, 'light');
    // headline drag selects text (panes keep input)
    const h = await page.evaluate(() => { const q = document.querySelector('.hero h1').getBoundingClientRect(); return [q.left + 10, q.top + q.height / 2, q.right - 10]; });
    await page.mouse.move(h[0], h[1]); await page.mouse.down(); await page.mouse.move(h[2], h[1], { steps: 10 }); await page.mouse.up();
    const sel = await page.evaluate(() => String(getSelection()));
    await page.evaluate(() => getSelection().removeAllRanges());
    // every link/button in Home's sections: centre point hits itself
    const links = await page.evaluate(async () => {
      const bad = [];
      let n = 0;
      for (const a of document.querySelectorAll('main section a, main section button, main section input')) {
        a.scrollIntoView({ block: 'center' });
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const q = a.getBoundingClientRect();
        if (q.width < 1) continue;
        n++;
        const e = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
        if (!e || !(a === e || a.contains(e))) bad.push({ el: a.className || a.tagName, got: e ? e.className || e.tagName : null });
      }
      return { n, bad };
    });
    // text in the lower sections is selectable (door text, lab pull)
    const selDoor = await page.evaluate(() => { const p = document.querySelector('.door p'); p.scrollIntoView({ block: 'center' }); const q = p.getBoundingClientRect(); return [q.left + 4, q.top + 8, q.right - 4]; });
    await page.waitForTimeout(300);
    await page.mouse.move(selDoor[0], selDoor[1]); await page.mouse.down(); await page.mouse.move(selDoor[2], selDoor[1], { steps: 8 }); await page.mouse.up();
    const sel2 = await page.evaluate(() => String(getSelection()).slice(0, 40));
    R.input['1440x900'] = { headlineSelection: sel, doorTextSelection: sel2, controlsHitThemselves: links };
    await context.close();
  }
}

await mkdir(OUT, { recursive: true });
await gpuCheck();
for (const [k, fn] of [['orbedge', orbedge], ['rim', rim], ['ccsw', ccsw], ['ctxloss', ctxloss], ['input', input]]) {
  if (!want(k)) continue;
  try { console.log('==', k); await fn(); } catch (e) { console.log('ERR', k, e.stack); R[`${k}Error`] = String(e); }
  await writeFile(join(OUT, `results${only ? '-' + only.replace(/,/g, '_') : ''}.json`), JSON.stringify(R, null, 1));
}
await browser.close();
console.log('done');
