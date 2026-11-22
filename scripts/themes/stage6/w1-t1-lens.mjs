/**
 * Stage 6 wave 1, task 1: the glass lens after the fixes (one lens per Home
 * visit, never at rest under a pane). Real mouse drags on GPU Chromium at
 * 1440, 1280 and 1024, both schemes, prefers-reduced-transparency forced to
 * no-preference, the portal prompt suppressed.
 *
 * Per size and scheme:
 *   - load: how much of the disc is grabbable (elementFromPoint finds the hit
 *     button) at mount;
 *   - drop: drag the lens onto the hero window and hold still before release
 *     (a zero-velocity release); filmed;
 *   - throw: fling it toward the Control Centre; filmed;
 *   - idle: wait 6 s, drag again from the most open point;
 *   - resize: shrink the window to 85% width, drag again;
 *   - arrival: from /t/quiet/ through the real switcher, then About, then
 *     Home again in-school; counts every `+lens-hit` mount and the live hit
 *     buttons and canvases; the arrival and the return are filmed.
 * Pass: every landed disc at least 50% grabbable, every later drag moves it,
 * exactly one `+lens-hit` per Home visit and one live lens.
 *
 * Usage: BDL_GPU=1 node scripts/themes/snap.mjs --name s6-w1-t1 --reuse --port 4470 -- node scripts/themes/stage6/w1-t1-lens.mjs
 * Output: scripts/themes/.out/stage6/w1/t1/lens/ (strips + results.json)
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'stage6', 'w1', 't1', process.env.LABEL || 'lens');
await mkdir(OUT, { recursive: true });
const base = process.env.SNAP_BASE || 'http://127.0.0.1:4470';
const only = process.env.ONLY || '';

const browser = await chromium.launch({ headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'] });
const R = { base, cases: {} };
{
  const p = await browser.newPage();
  R.renderer = await p.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); });
  await p.close();
  console.log('renderer:', R.renderer);
  if (/swiftshader|llvmpipe|software/i.test(R.renderer)) throw new Error('software renderer: evidence invalid');
}

async function newPage(w, h, scheme) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, reducedMotion: 'no-preference' });
  await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
  await suppressPrompt(context);
  await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  await context.addInitScript(() => {
    window.__log = [];
    const t0 = performance.now();
    const log = (m) => window.__log.push(`${Math.round(performance.now() - t0)} ${m}`);
    new MutationObserver((recs) => {
      for (const r of recs) {
        for (const n of r.addedNodes) if (n.nodeType === 1 && n.classList.contains('lens-hit')) log(`+lens-hit ${location.pathname}`);
        for (const n of r.removedNodes) if (n.nodeType === 1 && n.classList.contains('lens-hit')) log(`-lens-hit ${location.pathname}`);
      }
    }).observe(document, { childList: true, subtree: true });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  return { context, page, errors };
}

const waitLens = (page) => page.waitForFunction(() => document.querySelector('.lens-canvas')?.style.visibility === 'visible', null, { timeout: 9000 }).then(() => true).catch(() => false);

/** The lens's centre, radius, how much of its disc the hit button is on top
    at (0..1), and the most open such point. */
async function lensState(page) {
  return page.evaluate(() => {
    const hits = document.querySelectorAll('.lens-hit');
    const hit = hits[hits.length - 1];
    if (!hit) return null;
    const q = hit.getBoundingClientRect();
    const cx = q.left + q.width / 2, cy = q.top + q.height / 2, r = q.width / 2;
    let n = 0, on = 0, best = null, bestD = -1;
    for (let y = -r + 3; y < r; y += 6) for (let x = -r + 3; x < r; x += 6) {
      if (x * x + y * y > r * r) continue;
      n++;
      if (document.elementFromPoint(cx + x, cy + y) === hit) {
        on++;
        const d = -Math.hypot(x, y);
        if (d > bestD || !best) { bestD = d; best = [cx + x, cy + y]; }
      }
    }
    return { c: [Math.round(cx), Math.round(cy)], r: Math.round(r), grab: n ? +(on / n).toFixed(3) : 0, open: best && best.map(Math.round), hits: hits.length, canvases: document.querySelectorAll('.lens-canvas').length };
  });
}

async function startFilm(page) {
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    frames.push({ data, at: metadata.timestamp });
    try { await cdp.send('Page.screencastFrameAck', { sessionId }); } catch {}
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 80, everyNthFrame: 1 });
  await page.waitForTimeout(200);
  if (!frames.length) {
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 80 });
    frames.push({ data, at: Date.now() / 1000 });
  }
  const t0 = Date.now() / 1000;
  return {
    async stop() {
      await cdp.send('Page.stopScreencast');
      await cdp.detach();
      const before = frames.filter((f) => f.at < t0).slice(-1);
      return [...before, ...frames.filter((f) => f.at >= t0)].map((f) => ({ ...f, ms: Math.round((f.at - t0) * 1000) }));
    },
  };
}

function pick(frames, n, ms) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const at = i === 0 ? -1 : Math.round((i * ms) / (n - 1));
    const shown = frames.filter((f) => f.ms <= at).pop() ?? frames[0];
    out.push({ ...shown, ms: at });
  }
  return out;
}

async function strip(frames, file, title, cols = 5, cellW = 360) {
  const images = await Promise.all(frames.map((f) => loadImage(Buffer.from(f.data, 'base64'))));
  const cellH = Math.round((images[0].height / images[0].width) * cellW);
  const PAD = 12, CAP = 26, HEAD = CAP + PAD;
  const rows = Math.ceil(images.length / cols);
  const canvas = createCanvas(PAD + cols * (cellW + PAD), HEAD + PAD + rows * (cellH + CAP + PAD));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1b1b1d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = '600 15px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e8e6e1';
  ctx.fillText(title, PAD, PAD + CAP / 2);
  images.forEach((img, i) => {
    const x = PAD + (i % cols) * (cellW + PAD);
    const y = HEAD + PAD + Math.floor(i / cols) * (cellH + CAP + PAD);
    ctx.drawImage(img, x, y, cellW, cellH);
    ctx.fillStyle = '#e8e6e1';
    ctx.fillText(frames[i].ms < 0 ? 'before' : `+${frames[i].ms} ms`, x, y + cellH + CAP / 2);
  });
  await writeFile(file, await canvas.encode('png'));
}

/** Drag from `from` to `to` in 16 moves. `hold`: stop and wait before
    release (zero velocity); otherwise release mid-motion (a throw). */
async function drag(page, from, to, hold) {
  await page.mouse.move(from[0], from[1]);
  await page.mouse.down();
  for (let i = 1; i <= 16; i++) {
    await page.mouse.move(from[0] + ((to[0] - from[0]) * i) / 16, from[1] + ((to[1] - from[1]) * i) / 16, { steps: 2 });
    await page.waitForTimeout(hold ? 20 : 8);
  }
  if (hold) await page.waitForTimeout(150);
  // Where the lens is while still held: a drag that "moves it" follows the
  // pointer here, whatever checkRest does after the release.
  const heldAt = hold ? await page.evaluate(() => { const q = [...document.querySelectorAll('.lens-hit')].at(-1)?.getBoundingClientRect(); return q ? [Math.round(q.left + q.width / 2), Math.round(q.top + q.height / 2)] : null; }) : null;
  await page.mouse.up();
  return heldAt;
}

/** Lens centre and grabbable share every 100 ms for `ms` after a release. */
async function track(page, ms) {
  const path = [];
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const s = await lensState(page);
    path.push({ t: Date.now() - t0, c: s?.c, grab: s?.grab });
    await page.waitForTimeout(100);
  }
  return path;
}

const paneCentre = (page, sel) => page.evaluate((sel) => { const r = document.querySelector(sel)?.getBoundingClientRect(); return r ? [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)] : null; }, sel);

async function filmedMove(page, label, title, fn, ms = 1600) {
  const film = await startFilm(page);
  await fn();
  const path = await track(page, ms);
  const frames = await film.stop();
  await strip(pick(frames, 10, ms), join(OUT, `${label}.png`), title);
  return path;
}

const fails = [];
const sizes = [[1440, 900], [1280, 800], [1024, 768]];
for (const scheme of ['light', 'dark']) {
  for (const [w, h] of sizes) {
    const tag = `${scheme}__${w}`;
    if (only && !tag.includes(only)) continue;
    const C = (R.cases[tag] = {});
    // ---------- direct load, drop, throw, idle, resize ----------
    {
      const { context, page, errors } = await newPage(w, h, scheme);
      await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
      C.mounted = await waitLens(page);
      await page.waitForTimeout(500);
      C.load = await lensState(page);
      if (!C.load || C.load.grab < 0.5) fails.push(`${tag} load grab ${C.load?.grab}`);

      // drop onto the hero window, zero velocity
      const win = await paneCentre(page, '.hero .window');
      let s0 = await lensState(page);
      const dropTo = [win[0] + Math.round(w * 0.12), win[1]];
      C.drop = { from: s0.c, to: dropTo };
      C.drop.path = await filmedMove(page, `drop__${tag}`, `drop on the hero window, zero-velocity release, ${scheme} ${w}x${h}`, () => drag(page, s0.open ?? s0.c, [dropTo[0] + (s0.open ? s0.open[0] - s0.c[0] : 0), dropTo[1] + (s0.open ? s0.open[1] - s0.c[1] : 0)], true));
      C.drop.end = await lensState(page);
      if (C.drop.end.grab < 0.5) fails.push(`${tag} drop landed grab ${C.drop.end.grab}`);

      // throw toward the Control Centre
      const cc = await paneCentre(page, '.control-centre');
      s0 = await lensState(page);
      const from = s0.open ?? s0.c;
      const aim = [from[0] + (cc[0] - s0.c[0]) * 0.55, from[1] + (cc[1] - s0.c[1]) * 0.55];
      C.throw = { from: s0.c, aim: aim.map(Math.round), cc };
      C.throw.path = await filmedMove(page, `throw__${tag}`, `throw toward the Control Centre, ${scheme} ${w}x${h}`, () => drag(page, from, aim, false), 2000);
      C.throw.end = await lensState(page);
      if (C.throw.end.grab < 0.5) fails.push(`${tag} throw landed grab ${C.throw.end.grab}`);

      // after idle
      await page.waitForTimeout(6000);
      s0 = await lensState(page);
      if (s0.open) {
        const dir = [Math.sign(w / 2 - s0.c[0]) || 1, Math.sign(h / 2 - s0.c[1]) || 1]; // into the box, never into a wall
        const held = await drag(page, s0.open, [s0.open[0] + dir[0] * 120, s0.open[1] + dir[1] * 60], true);
        await page.waitForTimeout(1200);
        const e = await lensState(page);
        C.idle = { from: s0.c, grabBefore: s0.grab, heldAt: held, moved: Math.round(Math.hypot(held[0] - s0.c[0], held[1] - s0.c[1])), rest: e.c, grabAfter: e.grab };
        if (e.grab < 0.5) fails.push(`${tag} idle drag landed grab ${e.grab}`);
      } else C.idle = { from: s0.c, grabBefore: s0.grab, moved: 0, note: 'no grabbable point' };
      if (!(C.idle.moved > 20)) fails.push(`${tag} idle drag did not move`);

      // after resize
      await page.setViewportSize({ width: Math.round(w * 0.85), height: h });
      await page.waitForTimeout(800);
      s0 = await lensState(page);
      if (s0.open) {
        const vw = Math.round(w * 0.85);
        const dir = [Math.sign(vw / 2 - s0.c[0]) || 1, Math.sign(h / 2 - s0.c[1]) || 1];
        const held = await drag(page, s0.open, [s0.open[0] + dir[0] * 80, s0.open[1] + dir[1] * 60], true);
        await page.waitForTimeout(1200);
        const e = await lensState(page);
        C.resize = { from: s0.c, grabBefore: s0.grab, heldAt: held, moved: Math.round(Math.hypot(held[0] - s0.c[0], held[1] - s0.c[1])), rest: e.c, grabAfter: e.grab };
        if (e.grab < 0.5) fails.push(`${tag} resize drag landed grab ${e.grab}`);
      } else C.resize = { from: s0.c, grabBefore: s0.grab, moved: 0, note: 'no grabbable point' };
      if (!(C.resize.moved > 20)) fails.push(`${tag} resize drag did not move`);
      C.hitsAtEnd = (await lensState(page)).hits;
      C.errors = errors;
      if (errors.length) fails.push(`${tag} errors: ${errors.join(' | ')}`);
      await context.close();
    }
    // ---------- arrival through the switcher, About, back to Home ----------
    {
      const { context, page, errors } = await newPage(w, h, scheme);
      await page.goto(`${base}/t/quiet/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      const open = await page.evaluate(() => { const b = document.querySelector('bdl-switcher').shadowRoot.querySelector('.open').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; });
      await page.mouse.click(open[0], open[1]);
      await page.waitForTimeout(500);
      const row = await page.evaluate(() => { const a = document.querySelector('bdl-switcher').shadowRoot.querySelector('a[data-school="glassmorphism"]'); a.scrollIntoView({ block: 'nearest' }); const b = a.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; });
      let film = await startFilm(page);
      await page.mouse.click(row[0], row[1]);
      await page.waitForURL(/glassmorphism\/$/, { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(3600); // past the old 2500 ms safety timer
      let frames = await film.stop();
      await strip(pick(frames, 10, 3000), join(OUT, `arrive__${tag}.png`), `arrival from quiet through the switcher, ${scheme} ${w}x${h}`);
      C.arrive = { url: page.url(), state: await lensState(page) };
      await page.click('.site-header a[href$="/t/glassmorphism/about/"]');
      await page.waitForURL(/about\/$/, { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(1500);
      C.about = await page.evaluate(() => ({ hits: document.querySelectorAll('.lens-hit').length, canvases: document.querySelectorAll('.lens-canvas').length }));
      film = await startFilm(page);
      await page.click('.site-header a[href$="/t/glassmorphism/"]');
      await page.waitForURL(/glassmorphism\/$/, { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(3600);
      frames = await film.stop();
      await strip(pick(frames, 10, 3000), join(OUT, `return__${tag}.png`), `About back to Home in-school, ${scheme} ${w}x${h}`);
      C.back = await lensState(page);
      C.log = await page.evaluate(() => window.__log);
      const plus = C.log.filter((l) => l.includes('+lens-hit')).length;
      const minus = C.log.filter((l) => l.includes('-lens-hit')).length;
      C.mounts = { plus, minus };
      if (plus !== 2) fails.push(`${tag} arrival+return: ${plus} +lens-hit for 2 Home visits`);
      if (!C.arrive.state || C.arrive.state.hits !== 1 || C.arrive.state.canvases !== 1) fails.push(`${tag} arrival: ${JSON.stringify(C.arrive.state)}`);
      if (!C.back || C.back.hits !== 1 || C.back.canvases !== 1) fails.push(`${tag} return: ${JSON.stringify(C.back)}`);
      if (C.about.hits !== 0) fails.push(`${tag} About still holds ${C.about.hits} lens`);
      C.arrivalErrors = errors;
      if (errors.length) fails.push(`${tag} arrival errors: ${errors.join(' | ')}`);
      await context.close();
    }
    console.log('done', tag, JSON.stringify({ load: C.load?.grab, drop: C.drop?.end?.grab, throw: C.throw?.end?.grab, idle: C.idle?.moved, resize: C.resize?.moved, mounts: C.mounts }));
  }
}
await browser.close();
R.fails = fails;
await writeFile(join(OUT, 'results.json'), JSON.stringify(R, null, 2));
console.log(fails.length ? `FAIL\n${fails.join('\n')}` : 'PASS');
process.exitCode = fails.length ? 1 : 0;
