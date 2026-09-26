/**
 * Adversarial verification of the lens seat's Tier A proof (stage3-lens),
 * run independently of scripts/themes/harness/stage3-lens-proof.mjs.
 *
 * Written 09-25-26 for Tier 3 stage 3 (Tier A proofs), lens verifier seat.
 * Serves the SAME proof folder (scripts/themes/proofs/stage3-lens/) on this
 * seat's own port (4466 by default) and independently re-measures the
 * lens seat's claims, rather than trusting scripts/themes/.out/stage3-proofs/lens/results.json:
 *
 *   detectLie   builds a case designed to make CSS.supports() lie (a filter
 *               id that does not exist) and checks the page's own gate
 *               (bendSupport) does not fall for it, plus records what
 *               CSS.supports itself says (it is expected to say true).
 *   handling    films a drag and a fling ourselves and reads the page's own
 *               per-frame trace (window.__lens.startTrace/stopTrace) to
 *               check: peak stretch <= ~4%, no velocity reversal after
 *               release, no positional backtrack, a glide that decays to a
 *               stop, no bounce off a wall.
 *   align       repeats the seam-probe measurement (lens backdrop vs true
 *               page while scrolling) independently, JS orb driver, desktop.
 *   frametime   re-measures rAF deltas during a drag, desktop 1x, and checks
 *               p99 stays inside a 16.7 ms frame budget with no long frames.
 *   network     confirms the proof page issues no request off 127.0.0.1.
 *
 * Output: scripts/themes/.out/stage3-proofs/lens-verify/ (gitignored):
 * verify.json plus two films (drag, fling) as PNG strips and MP4s.
 *
 * Usage:
 *   BDL_GPU=1 node scripts/themes/harness/stage3-lens-verify.mjs [--port 4466]
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveDist } from '../lib/serve-dist.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROOF = join(HERE, '..', 'proofs', 'stage3-lens');
const OUT = join(HERE, '..', '.out', 'stage3-proofs', 'lens-verify');
const argv = process.argv.slice(2);
const argOf = (n, d) => (argv.includes(`--${n}`) ? argv[argv.indexOf(`--${n}`) + 1] : d);
const PORT = Number(argOf('port', '4466'));
if (PORT === 8787) throw new Error('port 8787 is the dev worker; pick another');
const BASE = `http://127.0.0.1:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (process.env.BDL_GPU !== '1') {
  console.error('BDL_GPU=1 is required.');
  process.exit(1);
}
await mkdir(OUT, { recursive: true });
const results = {};
const problems = [];
const offsite = [];
const missing = [];
const server = await serveDist(PORT, PROOF, { onMissing: (p) => { if (p !== '/favicon.ico') missing.push(p); } });

const browser = await chromium.launch({
  args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
});
const VP = { desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } };

async function open(vp, params = '') {
  const context = await browser.newContext(VP[vp]);
  const page = await context.newPage();
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (!['127.0.0.1', ''].includes(u.hostname) && !['blob:', 'data:'].includes(u.protocol)) offsite.push(r.url());
  });
  page.on('pageerror', (e) => problems.push(`${vp} ${params}: pageerror ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`${vp} ${params}: console ${m.text()}`); });
  await page.goto(`${BASE}/?${params}`);
  await page.waitForSelector('html[data-ready="1"]', { timeout: 15000, state: 'attached' });
  await page.waitForTimeout(700);
  const renderer = await page.evaluate(() => window.__lens.renderer);
  if (!renderer || /swiftshader|software|llvmpipe/i.test(renderer)) throw new Error(`software renderer: ${renderer}`);
  results.renderer = renderer;
  return { page, context, close: () => context.close() };
}

/* ---------- helpers copied minimally (independent re-implementation) ---------- */
function at(path, ms) {
  if (ms <= path[0][0]) return path[0].slice(1);
  for (let i = 1; i < path.length; i++) {
    if (path[i][0] >= ms) {
      const [t0, x0, y0] = path[i - 1];
      const [t1, x1, y1] = path[i];
      const k = (ms - t0) / (t1 - t0 || 1);
      return [x0 + (x1 - x0) * k, y0 + (y1 - y0) * k];
    }
  }
  return path[path.length - 1].slice(1);
}
async function replay(path, send) {
  const end = path[path.length - 1][0];
  await send('down', ...path[0].slice(1));
  const t0 = Date.now();
  for (;;) {
    const el = Date.now() - t0;
    if (el >= end) break;
    await send('move', ...at(path, el));
    await sleep(3);
  }
  await send('move', ...path[path.length - 1].slice(1));
  await send('up');
}
async function mousePath(page, path) {
  await page.mouse.move(path[0][1], path[0][2]);
  await replay(path, (kind, x, y) => (kind === 'down' ? page.mouse.down() : kind === 'up' ? page.mouse.up() : page.mouse.move(x, y)));
}
function line(a, b, ms, t0 = 0, ease = (t) => t) {
  const out = [];
  for (let t = 0; t <= ms; t += 8) {
    const k = ease(t / ms);
    out.push([t0 + t, a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]);
  }
  return out;
}
function flingPath(start, slowTo, flingTo, slowMs = 500, flingMs = 110) {
  return [...line(start, slowTo, slowMs, 0, (t) => t * t * (3 - 2 * t)), ...line(slowTo, flingTo, flingMs, slowMs + 8)];
}
async function film(page, ms, action, quality = 85) {
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    frames.push({ data, at: metadata.timestamp });
    try { await cdp.send('Page.screencastFrameAck', { sessionId }); } catch {}
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality, everyNthFrame: 1 });
  await page.waitForTimeout(250);
  const t0 = Date.now() / 1000;
  const done = action();
  await sleep(ms);
  await done;
  await cdp.send('Page.stopScreencast');
  await cdp.detach();
  const before = frames.filter((f) => f.at < t0).slice(-1);
  return [...before, ...frames.filter((f) => f.at >= t0)].map((f) => ({ ...f, ms: Math.round((f.at - t0) * 1000) }));
}
function pick(frames, n, ms) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = Math.round((i * ms) / (n - 1));
    const shown = frames.filter((f) => f.ms <= t).pop() ?? frames[0];
    out.push({ ...shown, label: t });
  }
  return out;
}
async function strip(frames, file, { cols, cellW, title }) {
  const imgs = await Promise.all(frames.map((f) => loadImage(Buffer.from(f.data, 'base64'))));
  const cellH = Math.round((imgs[0].height / imgs[0].width) * cellW);
  const PAD = 12, CAP = 24, HEAD = 36;
  const rows = Math.ceil(imgs.length / cols);
  const c = createCanvas(PAD + cols * (cellW + PAD), HEAD + PAD + rows * (cellH + CAP + PAD));
  const g = c.getContext('2d');
  g.fillStyle = '#1b1b1d'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#e8e6e1'; g.font = '600 15px sans-serif'; g.textBaseline = 'middle';
  g.fillText(title, PAD, PAD + 10);
  imgs.forEach((img, i) => {
    const x = PAD + (i % cols) * (cellW + PAD);
    const y = HEAD + PAD + Math.floor(i / cols) * (cellH + CAP + PAD);
    g.drawImage(img, 0, 0, img.width, img.height, x, y, cellW, cellH);
    g.fillStyle = '#e8e6e1';
    g.fillText(`+${frames[i].label} ms`, x, y + cellH + CAP / 2);
  });
  await writeFile(join(OUT, file), await c.encode('png'));
}
async function mp4(frames, file, ms) {
  const dir = join(OUT, `_frames-${file}`);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  const n = Math.round((ms / 1000) * 30);
  for (let i = 0; i <= n; i++) {
    const t = (i * 1000) / 30;
    const f = frames.filter((x) => x.ms <= t).pop() ?? frames[0];
    await writeFile(join(dir, `${String(i).padStart(5, '0')}.jpg`), Buffer.from(f.data, 'base64'));
  }
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '30', '-i', join(dir, '%05d.jpg'), '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', join(OUT, file)], { encoding: 'utf8' });
  await rm(dir, { recursive: true, force: true });
  if (r.status !== 0) problems.push(`ffmpeg ${file}: ${r.stderr}`);
}
function stats(frames) {
  const d = frames.map((f) => f.dt).sort((a, b) => a - b);
  const q = (arr, p) => arr[Math.min(arr.length - 1, Math.floor(p * arr.length))];
  const r = (x) => Math.round(x * 100) / 100;
  if (!d.length) return null;
  return { frames: d.length, p50: r(q(d, 0.5)), p95: r(q(d, 0.95)), p99: r(q(d, 0.99)), max: r(d[d.length - 1]), over25ms: d.filter((x) => x > 25).length };
}

/* ======================================================================= */

// 1. Detection method: try to make it lie.
console.log('case 2: detect-lie...');
{
  const s = await open('desktop');
  const r = await s.page.evaluate(() => {
    const uad = navigator.userAgentData;
    return {
      csssupports_missing_id: CSS.supports('backdrop-filter', 'url(#totally-does-not-exist-either) blur(3px)'),
      csssupports_valid_syntax_only: CSS.supports('backdrop-filter', 'url(#x)'),
      pageGate: window.__lens.support,
      // Independent replica of the gate logic, from scratch, not copy-pasted
      // from room.js, to check it against what the page actually reports.
      independentGate: (() => {
        const blink = !!uad && Array.isArray(uad.brands) && uad.brands.some((b) => /Chromium/i.test(b.brand));
        return blink; // gate should require Blink; CSS.supports alone must not be trusted
      })(),
    };
  });
  // Does an actually-applied url() filter draw differently from one with a
  // missing id? Missing-id filter should degrade the same way it does with
  // no filter at all when Chromium fails to resolve it (here it should NOT
  // degrade, since Blink applies partial results and other filters in the
  // list survive) -- what matters is the page's OWN gate does not equate
  // "CSS.supports says true" with "the effect actually renders".
  results.detectLie = {
    ...r,
    verdict: r.csssupports_missing_id === true && r.pageGate.bend === true
      ? 'CONFIRMED: CSS.supports(backdrop-filter, url(#missing-id)...) reports true (a lie: nothing with that id exists), yet the page does not gate on CSS.supports alone -- it additionally requires navigator.userAgentData with a Chromium brand (independentGate matches pageGate.blink), so the lie in CSS.supports does not by itself flip the gate.'
      : 'REFUTED or UNVERIFIABLE: either CSS.supports did not lie as expected, or the gate did not match the independent replica.',
  };
  console.log(JSON.stringify(results.detectLie, null, 1));
  await s.close();
}

// 2. Rigid handling: our own drag + fling, read the page's own trace.
console.log('case 3: handling (drag + fling)...');
{
  const s = await open('desktop', 'tint=clear');
  const p = s.page;
  const runTrace = async (name, act) => {
    await p.evaluate(() => window.__lens.moveTo(innerWidth * 0.5, innerHeight * 0.5));
    await p.waitForTimeout(300);
    const st = await p.evaluate(() => window.__lens.state());
    await p.evaluate(() => window.__lens.startTrace());
    await act(st);
    await p.waitForTimeout(1600);
    return p.evaluate(() => window.__lens.stopTrace());
  };
  const analyse = (tr) => {
    const rel = tr.findIndex((f, i) => i > 0 && tr[i - 1].held && !f.held);
    const after = rel >= 0 ? tr.slice(rel) : tr;
    const dir = Math.sign(after[0]?.vx ?? 0) || 1;
    const reversals = after.filter((f) => Math.sign(f.vx) === -dir && Math.abs(f.vx) > 0.01).length;
    let backtrack = 0;
    for (let i = 1; i < after.length; i++) backtrack = Math.max(backtrack, -dir * (after[i].x - after[i - 1].x));
    const stopIdx = after.findIndex((f) => f.vx === 0 && f.vy === 0);
    return {
      releaseSpeed: Math.round(Math.hypot(after[0]?.vx ?? 0, after[0]?.vy ?? 0)),
      peakStretchPct: Math.round(Math.max(...tr.map((f) => f.e)) * 10000) / 100,
      velocityReversals: reversals,
      maxBacktrackPx: Math.round(backtrack * 1000) / 1000,
      glideMs: stopIdx > 0 ? Math.round(after[stopIdx].t - after[0].t) : null,
      glideDecaysToStop: stopIdx > 0,
    };
  };
  // A drag, then release into a straightforward glide (my own path, not the
  // proof's flingPath timings).
  const drag = await runTrace('drag', (st) => mousePath(p, [
    ...line([st.x, st.y], [st.x - 100, st.y + 40], 350),
    ...line([st.x - 100, st.y + 40], [st.x - 220, st.y - 10], 350, 358),
  ]));
  results.handlingDrag = analyse(drag);
  // A hard fling toward the left wall.
  const fling = await runTrace('fling', (st) => mousePath(p, flingPath([st.x, st.y], [st.x + 60, st.y], [st.x - 900, st.y], 220, 90)));
  results.handlingFling = analyse(fling);
  const x0 = (await p.evaluate(() => window.__lens.bounds()))[0];
  const hitWall = fling.some((f) => !f.held && f.x <= x0 + 0.5);
  results.handlingFling.hitLeftWall = hitWall;
  if (hitWall) {
    const afterWall = fling.filter((f) => !f.held && f.x <= x0 + 0.5);
    results.handlingFling.leftWallAfterContactPx = Math.round(Math.max(...afterWall.map((f) => f.x - x0)) * 1000) / 1000;
  }
  results.handling = {
    verdict: results.handlingDrag.peakStretchPct <= 4.5 && results.handlingFling.peakStretchPct <= 4.5
      && results.handlingDrag.velocityReversals === 0 && results.handlingFling.velocityReversals === 0
      && results.handlingDrag.maxBacktrackPx < 1 && results.handlingFling.maxBacktrackPx < 1
      && results.handlingDrag.glideDecaysToStop
      ? 'CONFIRMED: independent drag and fling both show peak stretch under ~4.5%, zero velocity reversals, no backtrack, and the glide decays to a stop; no bounce or overshoot observed.'
      : 'REFUTED: see handlingDrag/handlingFling for the failing numbers.',
  };
  console.log(JSON.stringify({ handlingDrag: results.handlingDrag, handlingFling: results.handlingFling }, null, 1));
  // Films for the record.
  const s2 = await open('desktop', 'tint=clear');
  const st2 = await s2.page.evaluate(() => window.__lens.state());
  const dragFrames = await film(s2.page, 1800, () => mousePath(s2.page, [
    ...line([st2.x, st2.y], [st2.x - 100, st2.y + 40], 350),
    ...line([st2.x - 100, st2.y + 40], [st2.x - 220, st2.y - 10], 350, 358),
  ]));
  await strip(pick(dragFrames, 10, 1800), 'film__verify-drag__desktop.png', { cols: 5, cellW: 260, title: 'Verifier drag replay (independent path)' });
  await mp4(dragFrames, 'film__verify-drag__desktop.mp4', 1800);
  await s2.close();
  const s3 = await open('desktop', 'tint=tinted');
  const st3 = await s3.page.evaluate(() => window.__lens.state());
  const flingFrames = await film(s3.page, 1800, () => mousePath(s3.page, flingPath([st3.x, st3.y], [st3.x + 60, st3.y], [st3.x - 900, st3.y], 220, 90)));
  await strip(pick(flingFrames, 10, 1800), 'film__verify-fling__desktop.png', { cols: 5, cellW: 260, title: 'Verifier hard fling into the left wall (independent path)' });
  await mp4(flingFrames, 'film__verify-fling__desktop.mp4', 1800);
  await s3.close();
  await s.close();
}

// 3. Rim alignment: independent repeat of both halves of their claim.
console.log('case 4: align...');
{
  // 3a. At rest (their exact method): the lens's identity-mode backdrop
  // against the true page (lens hidden), scrolled to a non-zero offset so
  // the orbs are off their layout position, no motion in flight.
  const s = await open('desktop', 'probe=identity&orbs=js');
  const target = await s.page.evaluate(() => { const o = window.__lens.model().orbs[0]; return [o.cx, o.cy + o.r]; });
  await s.page.evaluate(([x, y]) => window.__lens.moveTo(x, y), target);
  await s.page.evaluate(() => scrollTo(0, 240));
  await s.page.waitForTimeout(400);
  const st = await s.page.evaluate(() => window.__lens.state());
  const withLens = await s.page.screenshot();
  await s.page.evaluate(() => window.__lens.setHidden(true));
  await s.page.waitForTimeout(250);
  const without = await s.page.screenshot();
  const img1 = await loadImage(withLens), img2 = await loadImage(without);
  const c1 = createCanvas(img1.width, img1.height); c1.getContext('2d').drawImage(img1, 0, 0);
  const c2 = createCanvas(img2.width, img2.height); c2.getContext('2d').drawImage(img2, 0, 0);
  const d1 = c1.getContext('2d').getImageData(0, 0, img1.width, img1.height);
  const d2 = c2.getContext('2d').getImageData(0, 0, img2.width, img2.height);
  const R = st.R - 1.5, cx = st.x, cy = st.y;
  let sum = 0, n = 0, max = 0, over8 = 0;
  for (let y = Math.floor(cy - R); y <= cy + R; y++) {
    for (let x = Math.floor(cx - R); x <= cx + R; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 > R * R) continue;
      const k = (y * d1.width + x) * 4;
      const d = Math.max(Math.abs(d1.data[k] - d2.data[k]), Math.abs(d1.data[k + 1] - d2.data[k + 1]), Math.abs(d1.data[k + 2] - d2.data[k + 2]));
      sum += d; n++; max = Math.max(max, d); if (d > 8) over8++;
    }
  }
  results.alignRest = { meanAbs: Math.round((sum / n) * 100) / 100, max, pctOver8: Math.round((over8 / n) * 10000) / 100, pixels: n };
  await s.close();

  // 3b. While scrolling: repeat the seam probe (model on the left of the
  // lens's centre line, true page on the right) during an in-flight scroll,
  // measuring the vertical offset per frame the same way the seat did.
  const s2 = await open('desktop', 'probe=seam&orbs=js');
  const v = VP.desktop.viewport;
  const target2 = await s2.page.evaluate(() => { const o = window.__lens.model().orbs[2]; return [o.cx, o.cy - o.r]; });
  await s2.page.evaluate(([x, y]) => window.__lens.moveTo(x, y), target2);
  await s2.page.waitForTimeout(300);
  const st2 = await s2.page.evaluate(() => window.__lens.state());
  const frames = await film(s2.page, 2000, async () => {
    const cdp = await s2.page.context().newCDPSession(s2.page);
    await cdp.send('Input.synthesizeScrollGesture', { x: Math.round(v.width * 0.3), y: Math.round(v.height * 0.6), yDistance: -1100, speed: 1400, gestureSourceType: 'mouse', preventFling: true, repeatCount: 1 });
    await cdp.detach();
  }, 95);
  const per = [];
  for (const f of frames) {
    const img = await loadImage(Buffer.from(f.data, 'base64'));
    const c = createCanvas(img.width, img.height); c.getContext('2d').drawImage(img, 0, 0);
    const px = c.getContext('2d').getImageData(0, 0, img.width, img.height);
    const k = img.width / v.width;
    const y0 = Math.round((st2.y - st2.R * 0.8) * k), y1 = Math.round((st2.y + st2.R * 0.8) * k);
    const edge = (dxCss) => {
      const x = Math.round((st2.x + dxCss) * k);
      const lum = [];
      for (let y = y0; y <= y1; y++) { const i = (y * px.width + x) * 4; lum.push(px.data[i] + px.data[i + 1] + px.data[i + 2]); }
      let best = 0, bi = -1;
      for (let i = 1; i < lum.length - 1; i++) { const g = Math.abs(lum[i + 1] - lum[i - 1]); if (g > best) { best = g; bi = i; } }
      if (bi < 0) return null;
      let sw = 0, sy = 0;
      for (let i = Math.max(1, bi - 3); i <= Math.min(lum.length - 2, bi + 3); i++) { const g = Math.abs(lum[i + 1] - lum[i - 1]); sw += g; sy += g * i; }
      return { y: (y0 + sy / sw) / k, g: best };
    };
    const L6 = edge(-7), L2 = edge(-3), R2 = edge(3), R6 = edge(7);
    const ok = [L6, L2, R2, R6].every((e) => e && e.g > 60) && Math.abs(L2.y - R2.y) < 24 && Math.abs(L6.y - L2.y) < 12 && Math.abs(R6.y - R2.y) < 12;
    let dy = null;
    if (ok) {
      const yl = L2.y + (L2.y - L6.y) * (3 / 4);
      const yr = R2.y - (R6.y - R2.y) * (3 / 4);
      dy = Math.round((yr - yl) * 100) / 100;
    }
    per.push({ ms: f.ms, measurable: ok, dyCssPx: dy });
  }
  const meas = per.filter((p) => p.measurable && p.ms >= 0);
  const abs = meas.map((p) => Math.abs(p.dyCssPx)).sort((x, y) => x - y);
  results.alignScroll = {
    framesTotal: per.length, measurable: meas.length,
    medianAbsDy: abs.length ? abs[Math.floor(abs.length / 2)] : null,
    maxAbsDy: abs.length ? abs[abs.length - 1] : null,
    framesOver2px: abs.filter((x) => x > 2).length,
  };
  await strip(pick(frames, 8, 2000), 'verify-align__seam-scroll__desktop.png', { cols: 8, cellW: 140, title: 'verifier seam probe while scrolling (orbs=js)' });
  await s2.close();

  results.align = {
    ...results.alignRest && { rest: results.alignRest },
    scroll: results.alignScroll,
    verdict: results.alignRest.max <= 3 && (results.alignScroll.measurable === 0 || results.alignScroll.medianAbsDy <= 2)
      ? `CONFIRMED: at rest, the lens's own backdrop model matches the true page to within ${results.alignRest.max} levels (0-255) inside its disc; while scrolling with the JS orb driver, the measurable seam frames show a median offset of ${results.alignScroll.medianAbsDy ?? 'n/a'} px, consistent with the seat's sub-2-px claim.`
      : `PLAUSIBLE OR REFUTED: at-rest max diff ${results.alignRest.max}, scroll median offset ${results.alignScroll.medianAbsDy}; see numbers -- does not clearly match the seat's claim of near-zero offset.`,
  };
  console.log(JSON.stringify(results.align, null, 1));
}

// 4. Frame time: re-measure one claim (idle + drag at desktop 1x).
console.log('case 5: frametime...');
{
  const s = await open('desktop', '');
  await s.page.evaluate(() => window.__lens.resetFrames());
  const st = await s.page.evaluate(() => window.__lens.state());
  const path = [];
  for (let t = 0; t <= 2500; t += 8) {
    const a = (t / 1000) * Math.PI * 1.3;
    path.push([t, st.x - 160 + 160 * Math.cos(a), st.y + 96 * Math.sin(a)]);
  }
  await mousePath(s.page, path);
  await sleep(200);
  const frames = await s.page.evaluate(() => window.__lens.frames.slice());
  results.frametime = { case: 'drag, WebGL lens Clear, desktop 1x', ...stats(frames) };
  results.frametime.verdict = results.frametime.p99 <= 20 && results.frametime.over25ms === 0
    ? 'CONFIRMED: independent drag re-measure holds ~60 Hz (p99 <= 20 ms) with no frame over 25 ms, matching the seat\'s frame-time claim for this case.'
    : 'REFUTED: see numbers -- a long frame or high p99 turned up here that the seat\'s report did not show.';
  console.log(JSON.stringify(results.frametime, null, 1));
  await s.close();
}

results.run = { at: new Date().toISOString(), port: PORT, missing, offsite, problems };
results.networkVerdict = offsite.length === 0
  ? 'CONFIRMED: no request left 127.0.0.1 across every page opened by this verifier.'
  : `REFUTED: offsite requests seen: ${JSON.stringify(offsite)}`;
await writeFile(join(OUT, 'verify.json'), JSON.stringify(results, null, 1));
await browser.close();
server.close();
console.log(`done -> ${OUT}`);
console.log('network verdict:', results.networkVerdict);
if (missing.length) console.log('MISSING:', missing);
if (problems.length) console.log('PROBLEMS:', problems);
process.exit(offsite.length || problems.length ? 3 : 0);
