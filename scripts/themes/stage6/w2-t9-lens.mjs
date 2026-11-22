/**
 * Stage 6 wave 2, task 9: the lens, light and transition films and probes
 * (G1, T1 C1 to C3, T3 C2 to C4, and the header's arrival and swap).
 *
 *   LABEL=after  node scripts/themes/snap.mjs --name s6-w2-t9 --reuse --port 4470 -- node scripts/themes/stage6/w2-t9-lens.mjs
 *   LABEL=before ONLY=throw,swap node scripts/themes/snap.mjs --name s6-w2-t9-before --reuse --port 4470 -- node scripts/themes/stage6/w2-t9-lens.mjs
 *   LABEL=base   ONLY=swap node scripts/themes/snap.mjs --name stage6-base --reuse --port 4470 -- node scripts/themes/stage6/w2-t9-lens.mjs
 *
 * GPU Chromium, renderer checked; prefers-reduced-transparency forced to
 * no-preference; portal prompt suppressed; arrivals through the real
 * switcher. Sections (ONLY=a,b,...):
 *   throw    1024, both schemes: a throw from the start toward the Control
 *            Centre and a zero-velocity drop deep on the hero window, filmed,
 *            the grabbable share sampled every 100 ms (hidden = under 0.5);
 *   resize   1280 to 1088 (no touch after), the rest check;
 *   corner   390 and 820: the corner start's cover, then focus and blur on
 *            the lens (a rest check) must leave it where it is;
 *   contrast prefers-contrast more then no-preference mid-visit: the lens
 *            tears down, then mounts again;
 *   still    the pointer parked near an orb for 2 s on every page at 1440:
 *            orb style writes counted (none once settled);
 *   scroll   Home, a still pointer, a scroll: the orb push re-targets;
 *   e10      prefers-contrast more, About: pointer over an orb and a pane,
 *            no push, no lit pane;
 *   swap     an arrival from quiet through the switcher and an in-school
 *            swap Home to Services, 1440 and 390, light.
 * Output: scripts/themes/.out/stage6/w2/t9/<label>/lens/
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'stage6', 'w2', 't9', process.env.LABEL || 'run', 'lens');
await mkdir(OUT, { recursive: true });
const base = process.env.SNAP_BASE || 'http://127.0.0.1:4470';
const ONLY = (process.env.ONLY || 'throw,resize,corner,contrast,still,scroll,e10,swap').split(',');

const browser = await chromium.launch({ headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'] });
const R = { base, label: process.env.LABEL };
{
  const p = await browser.newPage();
  R.renderer = await p.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); });
  await p.close();
  console.log('renderer:', R.renderer);
  if (/swiftshader|llvmpipe|software/i.test(R.renderer)) throw new Error('software renderer: evidence invalid');
}

async function newPage(w, h, scheme, mobile = false) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, reducedMotion: 'no-preference', isMobile: mobile, hasTouch: mobile });
  await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
  await suppressPrompt(context);
  await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const cdp = await context.newCDPSession(page);
  const media = async (extra = []) => cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }, ...extra] });
  await media();
  return { context, page, errors, media };
}
const waitLens = (page) => page.waitForFunction(() => document.querySelector('.lens-canvas')?.style.visibility === 'visible', null, { timeout: 9000 }).then(() => true).catch(() => false);

async function lensState(page) {
  return page.evaluate(() => {
    const hits = document.querySelectorAll('.lens-hit');
    const hit = hits[hits.length - 1];
    if (!hit) return { hits: 0, canvases: document.querySelectorAll('.lens-canvas').length };
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
    return { c: [Math.round(cx), Math.round(cy)], r: Math.round(r), grab: n ? +(on / n).toFixed(3) : 0, open: best && best.map(Math.round), hits: hits.length, canvases: document.querySelectorAll('.lens-canvas').length, cover: document.getElementById('glass-lens-host')?.dataset.lensCover };
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
async function drag(page, from, to, hold) {
  await page.mouse.move(from[0], from[1]);
  await page.mouse.down();
  for (let i = 1; i <= 16; i++) {
    await page.mouse.move(from[0] + ((to[0] - from[0]) * i) / 16, from[1] + ((to[1] - from[1]) * i) / 16, { steps: 2 });
    await page.waitForTimeout(hold ? 20 : 8);
  }
  if (hold) await page.waitForTimeout(150);
  await page.mouse.up();
}
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
/** The longest run (ms) of samples with the disc under half grabbable. */
const hiddenMs = (path) => { let run = 0, best = 0, prev = null; for (const p of path) { if (p.grab < 0.5) { run += prev == null ? 0 : p.t - prev; best = Math.max(best, run); } else run = 0; prev = p.t; } return best; };

const fails = [];

if (ONLY.includes('throw')) {
  R.throw = {};
  for (const scheme of ['light', 'dark']) {
    const tag = `${scheme}__1024`;
    const { context, page, errors } = await newPage(1024, 768, scheme);
    await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
    await waitLens(page);
    await page.waitForTimeout(500);
    const C = (R.throw[tag] = { load: await lensState(page) });
    // Throw toward the Control Centre.
    const cc = await paneCentre(page, '.control-centre');
    let s0 = await lensState(page);
    const from = s0.open ?? s0.c;
    const aim = [from[0] + (cc[0] - s0.c[0]) * 0.55, from[1] + (cc[1] - s0.c[1]) * 0.55];
    let film = await startFilm(page);
    await drag(page, from, aim, false);
    C.throwPath = await track(page, 2200);
    await strip(pick(await film.stop(), 10, 2200), join(OUT, `throw__${tag}.png`), `throw toward the Control Centre, ${scheme} 1024x768 (start ${s0.c})`);
    C.throwEnd = await lensState(page);
    C.throwHiddenMs = hiddenMs(C.throwPath);
    if (C.throwHiddenMs > 500) fails.push(`${tag} throw hidden ${C.throwHiddenMs} ms`);
    if (C.throwEnd.grab < 0.5) fails.push(`${tag} throw ends grab ${C.throwEnd.grab}`);
    // Drop deep on the hero window, nearer its right side: eases to the nearest corner.
    const win = await paneCentre(page, '.hero .window');
    s0 = await lensState(page);
    const to = [win[0] + 200, win[1] + 40];
    film = await startFilm(page);
    await drag(page, s0.open ?? s0.c, [to[0] + ((s0.open ?? s0.c)[0] - s0.c[0]), to[1] + ((s0.open ?? s0.c)[1] - s0.c[1])], true);
    C.dropPath = await track(page, 1800);
    await strip(pick(await film.stop(), 10, 1800), join(OUT, `drop__${tag}.png`), `drop on the hero window right of centre, zero velocity, ${scheme} 1024x768`);
    C.dropAt = to;
    C.dropEnd = await lensState(page);
    if (C.dropEnd.grab < 0.5) fails.push(`${tag} drop ends grab ${C.dropEnd.grab}`);
    if (C.dropEnd.c[0] < 512) fails.push(`${tag} drop right of centre ended on the left (${C.dropEnd.c})`);
    C.errors = errors;
    await context.close();
    console.log('throw', tag, JSON.stringify({ hidden: C.throwHiddenMs, end: C.throwEnd.c, grab: C.throwEnd.grab, drop: C.dropEnd.c, dropGrab: C.dropEnd.grab }));
  }
}

if (ONLY.includes('resize')) {
  R.resize = {};
  for (const scheme of ['light', 'dark']) {
    const { context, page } = await newPage(1280, 800, scheme);
    await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
    await waitLens(page);
    await page.waitForTimeout(600);
    const before = await lensState(page);
    const film = await startFilm(page);
    await page.setViewportSize({ width: 1088, height: 800 });
    const path = await track(page, 1500);
    await strip(pick(await film.stop(), 10, 1500), join(OUT, `resize__${scheme}.png`), `resize 1280 to 1088, no touch after, ${scheme}`, 5, 300);
    const after = await lensState(page);
    R.resize[scheme] = { before, after, path };
    // The rest rule allows half the disc covered; elementFromPoint also loses
    // the rim ring, so a disc resting at exactly half reads about 0.48.
    if (after.grab < 0.45) fails.push(`resize ${scheme} grab ${after.grab}`);
    await context.close();
    console.log('resize', scheme, before.c, before.grab, '->', after.c, after.grab);
  }
}

if (ONLY.includes('corner')) {
  R.corner = {};
  for (const [w, h] of [[390, 844], [820, 1180]]) {
    for (const scheme of ['light', 'dark']) {
      const tag = `${scheme}__${w}`;
      const { context, page } = await newPage(w, h, scheme, true);
      await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
      await waitLens(page);
      await page.waitForTimeout(600);
      const a = await lensState(page);
      await page.focus('.lens-hit');
      await page.evaluate(() => document.activeElement?.blur());
      await page.waitForTimeout(900);
      const b = await lensState(page);
      R.corner[tag] = { start: a, afterBlur: b };
      if (Math.hypot(a.c[0] - b.c[0], a.c[1] - b.c[1]) > 1) fails.push(`corner ${tag} moved ${a.c} -> ${b.c}`);
      await page.screenshot({ path: join(OUT, `corner__${tag}.png`) });
      await context.close();
      console.log('corner', tag, a.c, a.cover, '->', b.c);
    }
  }
}

if (ONLY.includes('contrast')) {
  const { context, page, errors, media } = await newPage(1440, 900, 'light');
  await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
  await waitLens(page);
  await page.waitForTimeout(500);
  const s = [['start', await lensState(page)]];
  await media([{ name: 'prefers-contrast', value: 'more' }]);
  await page.waitForTimeout(800);
  s.push(['more', await lensState(page)]);
  await page.screenshot({ path: join(OUT, 'contrast__more.png') });
  await media([{ name: 'prefers-contrast', value: 'no-preference' }]);
  await waitLens(page);
  await page.waitForTimeout(800);
  s.push(['no-preference', await lensState(page)]);
  await page.screenshot({ path: join(OUT, 'contrast__back.png') });
  R.contrast = { states: s, errors };
  if (s[1][1].hits !== 0) fails.push(`contrast more: ${s[1][1].hits} lens left`);
  if (s[2][1].hits !== 1 || s[2][1].canvases !== 1) fails.push(`contrast back: ${JSON.stringify(s[2][1])}`);
  await context.close();
  console.log('contrast', s.map(([k, v]) => `${k}:${v.hits}`).join(' '));
}

if (ONLY.includes('still')) {
  R.still = {};
  for (const path of ['', 'about/', 'services/', 'contact/']) {
    const { context, page } = await newPage(1440, 900, 'light');
    await page.goto(`${base}/t/glassmorphism/${path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    // Park beside the first visible orb's edge.
    const at = await page.evaluate(() => {
      for (const o of document.querySelectorAll('.orb')) {
        const r = o.getBoundingClientRect();
        if (r.width > 0 && r.top > 80 && r.bottom < innerHeight - 80 && r.right < innerWidth - 40) return [Math.round(r.right + 20), Math.round(r.top + r.height / 2)];
      }
      return [700, 450];
    });
    await page.mouse.move(at[0] - 60, at[1] - 30);
    await page.mouse.move(at[0], at[1], { steps: 8 });
    await page.waitForTimeout(4000); // the push eases out (tau 520 ms)
    const writes = await page.evaluate(() => new Promise((res) => {
      let n = 0;
      const mo = new MutationObserver((recs) => { n += recs.length; });
      document.querySelectorAll('.orb').forEach((o) => mo.observe(o, { attributes: true, attributeFilter: ['style'] }));
      setTimeout(() => { mo.disconnect(); res(n); }, 2000);
    }));
    const offset = await page.evaluate(() => { let m = 0; for (const o of document.querySelectorAll('.orb')) { const t = /calc\(-50% \+ (-?[\d.]+)px\)/.exec(o.style.translate); m = Math.max(m, Math.abs(t ? Number(t[1]) : parseFloat(o.style.marginLeft) || 0), Math.abs(parseFloat(o.style.marginTop) || 0)); } return m; });
    R.still[path || 'home'] = { at, writes, offset };
    if (writes > 0) fails.push(`still ${path || 'home'}: ${writes} orb style writes in 2 s`);
    await context.close();
    console.log('still', path || 'home', at, 'writes', writes, 'offset', offset);
  }
}

if (ONLY.includes('scroll')) {
  const { context, page } = await newPage(1440, 900, 'light');
  await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
  await waitLens(page);
  await page.waitForTimeout(800);
  const read = () => page.evaluate(() => [...document.querySelectorAll('.orbs[data-js-driven] .orb')].map((o) => o.style.translate));
  await page.mouse.move(720, 600, { steps: 6 });
  await page.waitForTimeout(3000);
  const a = await read();
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(3000);
  const b = await read();
  // The push's x offset per orb (orbs-clock folds it into the translate).
  const pushed = (arr) => arr.map((t) => { const m = /calc\(-50% \+ (-?[\d.]+)px\)/.exec(t); return m ? +m[1] : 0; });
  R.scroll = { pushedBefore: pushed(a), pushedAfter: pushed(b), before: a, after: b };
  await context.close();
  console.log('scroll x offsets', JSON.stringify(R.scroll.pushedBefore), '->', JSON.stringify(R.scroll.pushedAfter));
}

if (ONLY.includes('e10')) {
  R.e10 = {};
  for (const path of ['about/', 'services/', '']) {
    const { context, page, media } = await newPage(1440, 900, 'light');
    await media([{ name: 'prefers-contrast', value: 'more' }]);
    await page.goto(`${base}/t/glassmorphism/${path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const orb = await page.evaluate(() => { for (const o of document.querySelectorAll('.orb')) { const r = o.getBoundingClientRect(); if (r.width > 0 && r.top > 80 && r.bottom < innerHeight) return [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)]; } return [700, 400]; });
    await page.mouse.move(orb[0] - 80, orb[1], { steps: 10 });
    await page.mouse.move(orb[0], orb[1], { steps: 10 });
    await page.waitForTimeout(1500);
    const pane = await paneCentre(page, 'main .glass');
    await page.mouse.move(pane[0], pane[1], { steps: 10 });
    await page.waitForTimeout(800);
    const st = await page.evaluate(() => {
      let m = 0;
      for (const o of document.querySelectorAll('.orb')) { const t = /calc\(-50% \+ (-?[\d.]+)px\)/.exec(o.style.translate); m = Math.max(m, Math.abs(t ? Number(t[1]) : parseFloat(o.style.marginLeft) || 0), Math.abs(parseFloat(o.style.marginTop) || 0)); }
      return { push: m, lit: document.querySelectorAll('[data-lit]').length };
    });
    R.e10[path || 'home'] = st;
    if (st.push > 0 || st.lit > 0) fails.push(`e10 ${path || 'home'}: ${JSON.stringify(st)}`);
    await context.close();
    console.log('e10', path || 'home', JSON.stringify(st));
  }
}

if (ONLY.includes('swap')) {
  for (const [w, h, mobile] of [[1440, 900, false], [390, 844, true]]) {
    {
      const { context, page } = await newPage(w, h, 'light', mobile);
      await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      const film = await startFilm(page);
      await page.locator('.site-header a[href$="/t/glassmorphism/services/"]:visible').first().click();
      await page.waitForTimeout(1300);
      await strip(pick(await film.stop(), 10, 1200), join(OUT, `swap__home-to-services__${w}.png`), `in-school swap Home to Services, light ${w}`, 5, mobile ? 200 : 340);
      await context.close();
    }
    {
      const { context, page } = await newPage(w, h, 'light', mobile);
      await page.goto(`${base}/t/quiet/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      await page.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('.open').click());
      await page.waitForTimeout(700);
      const film = await startFilm(page);
      await page.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('a[data-school="glassmorphism"]').click());
      await page.waitForTimeout(1800);
      await strip(pick(await film.stop(), 10, 1600), join(OUT, `arrival__quiet-to-glass__${w}.png`), `arrival quiet to glass, Home, light ${w}`, 5, mobile ? 200 : 340);
      await context.close();
    }
    console.log('swap', w);
  }
}

await browser.close();
R.fails = fails;
await writeFile(join(OUT, `results-${ONLY.join('-')}.json`), JSON.stringify(R, null, 2));
console.log(fails.length ? `FAIL\n${fails.join('\n')}` : 'PASS');
process.exitCode = fails.length ? 1 : 0;
