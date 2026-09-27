/**
 * Live Venus bust probe and films (Tier 3 Stage 3, wave B2, fix round 3,
 * seat vw-fix-marble3). Written 09-26-26.
 *
 * Sections (--only a,b,...; default all):
 *   ctx      context loss and restore on About, light and dark: a timestamped
 *            strip (before, lost, restored, a real mouse drag after the
 *            restore), GL clear value, canvas visibility, poster opacity,
 *            console warnings, and a "black square" check (the canvas's
 *            corner pixels against the same corners before the loss).
 *   handoff  poster -> first live frame at 390 and 820 (DPR 2, touch) and
 *            desktop (1440, DPR 1), light and dark: the share of stage pixels
 *            whose summed RGB change exceeds 24 (the critics' metric), a heat
 *            map, and a timestamped strip of the fade from ONE load.
 *   gap      the Venus-to-plinth gap at 1440, 820 and 390: the bust's solid
 *            silhouette (alpha >= 200/255, solved from shots over black and
 *            over white, stage filter off) for the poster and for the live
 *            canvas, against .tier-top's top edge.
 *   arrive   a cross-school arrival at vaporwave About through the REAL
 *            portal switcher (from glassmorphism About, clicked from the top
 *            of the page), timestamped until the bust is live.
 *   touch    a phone (390, touch) horizontal drag on the bust through CDP
 *            touch events, timestamped, plus a vertical swipe that scrolls.
 *
 * GPU Chromium only (aborts on SwiftShader); prefers-reduced-transparency is
 * forced to no-preference; the portal's welcome prompt is suppressed.
 * Usage: node scripts/themes/snap.mjs --name b2r3-vw-marble --reuse --port 4474 -- \
 *          node scripts/themes/vaporwave/b2r3-vw-fix-marble3-probe.mjs [--only ctx,handoff]
 *   (BDL_GPU=1 in the environment). Outputs: scripts/themes/.out/stage3-b2/vw-fix-marble3/
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'stage3-b2', 'vw-fix-marble3');
await mkdir(OUT, { recursive: true });
const argOf = (n, f) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? f : process.argv[i + 1]; };
const base = argOf('base', process.env.SNAP_BASE || 'http://127.0.0.1:4474');
const only = (argOf('only', '') || '').split(',').filter(Boolean);
const want = (k) => only.length === 0 || only.includes(k);
if (process.env.BDL_GPU !== '1') { console.error('set BDL_GPU=1'); process.exit(1); }

const browser = await chromium.launch({
  args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
});
const results = {};
const warnings = [];
const ABOUT = `${base}/t/vaporwave/about/`;

async function newPage({ width = 1440, height = 900, scheme = 'dark', mobile = false, dpr } = {}) {
  const context = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: dpr ?? (mobile ? 2 : 1),
    isMobile: mobile, hasTouch: mobile, colorScheme: scheme, reducedMotion: 'no-preference',
  });
  await suppressPrompt(context);
  await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); localStorage.setItem('theme', s); } catch {} }, scheme);
  await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  const log = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') log.push(`${m.type()}: ${m.text().slice(0, 200)}`); });
  page.on('pageerror', (e) => log.push(`pageerror: ${e.message}`));
  return { context, page, cdp, log };
}

async function gpuCheck() {
  const { context, page } = await newPage();
  await page.goto('about:blank');
  const r = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL);
  });
  await context.close();
  console.log('renderer:', r);
  results.renderer = r;
  if (/swiftshader|llvmpipe/i.test(r)) { await browser.close(); throw new Error('software rasteriser: abort'); }
}

/** A labelled frame strip; labels at 22 px bold. */
async function strip(frames, labels, file, { maxW = 480, enlarge = 1 } = {}) {
  const ims = await Promise.all(frames.map((b) => loadImage(b)));
  const scale = enlarge > 1 ? enlarge : Math.min(1, maxW / ims[0].width);
  const w = Math.round(ims[0].width * scale), h = Math.round(ims[0].height * scale);
  const pad = 8, lab = 34;
  const c = createCanvas(ims.length * (w + pad) + pad, h + lab + pad * 2);
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = enlarge <= 1;
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
  ims.forEach((im, i) => {
    const x = pad + i * (w + pad);
    ctx.fillStyle = '#111'; ctx.font = 'bold 22px sans-serif';
    ctx.fillText(labels[i] ?? '', x, pad + 24, w);
    ctx.drawImage(im, x, pad + lab, w, h);
  });
  await writeFile(join(OUT, file), await c.encode('jpeg', 92));
}
async function px(buf) {
  const im = await loadImage(buf); const c = createCanvas(im.width, im.height); const x = c.getContext('2d');
  x.drawImage(im, 0, 0); return x.getImageData(0, 0, im.width, im.height);
}
const THR = 24;
function diffShare(a, b) {
  let n = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    if (Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]) > THR) n++;
  }
  return n / (a.width * a.height);
}
async function heat(a, b) {
  const c = createCanvas(a.width, a.height); const x = c.getContext('2d');
  const out = x.createImageData(a.width, a.height);
  for (let i = 0; i < a.data.length; i += 4) {
    const d = Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]);
    const g = (a.data[i] + a.data[i + 1] + a.data[i + 2]) / 6 + 100;
    if (d > THR) { out.data[i] = 255; out.data[i + 1] = 0; out.data[i + 2] = 0; } else { out.data[i] = out.data[i + 1] = out.data[i + 2] = g; }
    out.data[i + 3] = 255;
  }
  x.putImageData(out, 0, 0);
  return c.encode('png');
}
const rectOf = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; }, sel);
const clipOf = async (page, sel, padX = 0, padY = 0) => {
  const r = await rectOf(page, sel);
  const vw = page.viewportSize();
  const x = Math.max(0, r.x - padX), y = Math.max(0, r.y - padY);
  return { x, y, width: Math.min(vw.width - x, r.w + padX * 2), height: Math.min(vw.height - y, r.h + padY * 2) };
};
const centre = (page) => page.evaluate(() => document.querySelector('.centerpiece')?.scrollIntoView({ block: 'center' }));
const waitLive = (page, ms = 20000) => page.waitForFunction(() => {
  const p = document.querySelector('[data-marble-poster]');
  return p && getComputedStyle(p).opacity === '0' && Number(document.querySelector('[data-marble-canvas]')?.dataset.draws || 0) > 0;
}, null, { timeout: ms }).then(() => true).catch(() => false);
const bustState = (page) => page.evaluate(() => {
  const cv = document.querySelector('[data-marble-canvas]');
  const gl = cv.getContext('webgl2');
  return {
    clear: gl && !gl.isContextLost() ? [...gl.getParameter(gl.COLOR_CLEAR_VALUE)].map((v) => +v.toFixed(3)) : null,
    lost: gl ? gl.isContextLost() : null,
    visibility: getComputedStyle(cv).visibility,
    poster: getComputedStyle(document.querySelector('[data-marble-poster]')).opacity,
    role: cv.getAttribute('role'), ariaHidden: cv.getAttribute('aria-hidden'), tabIndex: cv.tabIndex,
    draws: Number(cv.dataset.draws), buffer: [cv.width, cv.height], css: [cv.clientWidth, cv.clientHeight],
  };
});
/** Mean RGB of the four 6x6 corners of a region shot (the canvas's own corners, well away from the bust). */
async function corners(buf) {
  const im = await px(buf); const s = 6; const out = [];
  for (const [x0, y0] of [[2, 2], [im.width - s - 2, 2], [2, im.height - s - 2], [im.width - s - 2, im.height - s - 2]]) {
    let r = 0, g = 0, b = 0;
    for (let y = y0; y < y0 + s; y++) for (let x = x0; x < x0 + s; x++) { const i = (y * im.width + x) * 4; r += im.data[i]; g += im.data[i + 1]; b += im.data[i + 2]; }
    out.push([r, g, b].map((v) => Math.round(v / (s * s))));
  }
  return out;
}
const cornerDelta = (a, b) => Math.max(...a.map((c, i) => Math.abs(c[0] - b[i][0]) + Math.abs(c[1] - b[i][1]) + Math.abs(c[2] - b[i][2])));

await gpuCheck();

/* ---------------- context loss and restore ---------------- */
if (want('ctx')) {
  results.ctx = {};
  for (const scheme of ['dark', 'light']) {
    const { context, page, log } = await newPage({ scheme });
    await page.goto(ABOUT, { waitUntil: 'networkidle' });
    await centre(page);
    await waitLive(page);
    await page.waitForTimeout(400);
    await page.evaluate(() => document.activeElement?.blur());
    const clip = await clipOf(page, '.centerpiece', 30, 30);
    const cvClip = await clipOf(page, '[data-marble-canvas]');
    const T0 = Date.now();
    const t = () => ((Date.now() - T0) / 1000).toFixed(2);
    const frames = []; const labels = []; const states = [];
    const shoot = async (label) => { frames.push(await page.screenshot({ clip })); labels.push(`${t()}s ${label}`); states.push({ label, t: t(), ...(await bustState(page)) }); };
    const cBefore = await corners(await page.screenshot({ clip: cvClip }));
    await shoot('live, before loss');
    await page.evaluate(() => {
      const cv = document.querySelector('[data-marble-canvas]');
      window.__ext = cv.getContext('webgl2').getExtension('WEBGL_lose_context');
      window.__ext.loseContext();
    });
    await page.waitForTimeout(100); await shoot('lost +0.1s');
    await page.waitForTimeout(500); await shoot('lost +0.6s');
    await page.evaluate(() => window.__ext.restoreContext());
    await page.waitForTimeout(100); await shoot('restore +0.1s');
    await page.waitForTimeout(400); await shoot('restore +0.5s');
    await page.waitForTimeout(1500); await shoot('restore +2s');
    const cRestored = await corners(await page.screenshot({ clip: cvClip }));
    // A real mouse drag after the restore, filmed while held and after release.
    const cv = await rectOf(page, '[data-marble-canvas]');
    const y = cv.y + cv.h * 0.45;
    await page.mouse.move(cv.x + cv.w * 0.3, y); await page.mouse.down();
    await page.mouse.move(cv.x + cv.w * 0.5, y, { steps: 5 }); await shoot('drag held (+0.2w)');
    await page.mouse.move(cv.x + cv.w * 0.75, y, { steps: 5 }); await shoot('drag held (+0.45w)');
    await page.mouse.up();
    await page.waitForTimeout(1500); await shoot('after drag +1.5s');
    const cAfterDrag = await corners(await page.screenshot({ clip: cvClip }));
    // Scroll away and back.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await page.waitForTimeout(400);
    await centre(page); await page.waitForTimeout(800);
    await shoot('scrolled away + back');
    await strip(frames, labels, `ctx-film__${scheme}.jpg`, { maxW: 320 });
    results.ctx[scheme] = {
      states,
      cornersBefore: cBefore, cornersRestored: cRestored, cornersAfterDrag: cAfterDrag,
      blackSquare: { restoredCornerDelta: cornerDelta(cBefore, cRestored), afterDragCornerDelta: cornerDelta(cBefore, cAfterDrag) },
      console: log,
    };
    console.log(`ctx ${scheme}: corner delta restored ${results.ctx[scheme].blackSquare.restoredCornerDelta}, after drag ${results.ctx[scheme].blackSquare.afterDragCornerDelta}; clear ${JSON.stringify(states.at(-1).clear)}; console ${log.length}`);
    await context.close();
  }
}

/* ---------------- poster -> live handoff ---------------- */
if (want('handoff')) {
  results.handoff = {};
  const sizes = [['390', 390, 844, true], ['820', 820, 1180, true], ['desktop', 1440, 900, false]];
  for (const [name, w, h, mobile] of sizes) for (const scheme of ['dark', 'light']) {
    // Poster alone: the live chunk blocked.
    const a = await newPage({ width: w, height: h, mobile, scheme });
    await a.context.route('**/live-bust*.js', (r) => r.abort());
    await a.page.goto(ABOUT, { waitUntil: 'networkidle' });
    await centre(a.page); await a.page.waitForTimeout(1500);
    const clipA = await clipOf(a.page, '.centerpiece-stage');
    const poster = await a.page.screenshot({ clip: clipA });
    await a.context.close();
    // One load, filmed through the fade.
    const b = await newPage({ width: w, height: h, mobile, scheme });
    await b.page.goto(ABOUT, { waitUntil: 'networkidle' });
    await centre(b.page);
    const clipB = await clipOf(b.page, '.centerpiece-stage');
    const film = []; const filmLab = [];
    const tStart = Date.now();
    await b.page.waitForFunction(() => { const p = document.querySelector('[data-marble-poster]'); return p && Number(getComputedStyle(p).opacity) < 1; }, null, { timeout: 20000, polling: 'raf' }).catch(() => {});
    const tFade = Date.now();
    for (let i = 0; i < 6; i++) {
      film.push(await b.page.screenshot({ clip: clipB }));
      filmLab.push(`fade +${((Date.now() - tFade) / 1000).toFixed(2)}s`);
    }
    await waitLive(b.page); await b.page.waitForTimeout(150);
    const first = await b.page.screenshot({ clip: clipB });
    const st = await bustState(b.page);
    await b.context.close();
    const pa = await px(poster), pb = await px(first);
    const share = diffShare(pa, pb);
    const hm = await heat(pa, pb);
    results.handoff[`${name}-${scheme}`] = { share: +(share * 100).toFixed(2), clipA, clipB, buffer: st.buffer, css: st.css, fadeStartMs: tFade - tStart };
    console.log(`handoff ${name} ${scheme}: ${(share * 100).toFixed(2)}%  buffer ${st.buffer} css ${st.css}`);
    await strip([poster, ...film, first, hm], ['poster', ...filmLab, `live (${(share * 100).toFixed(2)}%)`, 'changed px'], `handoff-film__${name}__${scheme}.jpg`, { maxW: 300 });
  }
}

/* ---------------- Venus-to-plinth gap ---------------- */
if (want('gap')) {
  results.gap = {};
  const sizes = [['1440', 1440, 900, false], ['820', 820, 1180, true], ['390', 390, 844, true]];
  for (const [name, w, h, mobile] of sizes) {
    const { context, page } = await newPage({ width: w, height: h, mobile, scheme: 'dark' });
    await page.goto(ABOUT, { waitUntil: 'networkidle' });
    await centre(page);
    await waitLive(page);
    await page.waitForTimeout(400);
    const dpr = mobile ? 2 : 1;
    // Freeze the idle turn out of the measurement: the live frame is the
    // first-pose frame only until the idle turn starts (4 s); measure fast.
    const tier = await rectOf(page, '.centerpiece-steps .tier-top');
    const stageR = await rectOf(page, '.centerpiece-stage');
    const clip = { x: stageR.x, y: stageR.y, width: stageR.w, height: Math.min(stageR.h, tier.y + tier.h - stageR.y + 4) };
    const setMode = (mode, bg) => page.evaluate(([mode, bg]) => {
      const st = document.querySelector('.centerpiece-stage');
      st.style.filter = 'none'; st.style.background = bg;
      document.querySelector('.centerpiece-steps').style.visibility = 'hidden';
      const cv = document.querySelector('[data-marble-canvas]');
      const po = document.querySelector('[data-marble-poster]');
      po.style.transition = 'none';
      if (mode === 'poster') { cv.style.visibility = 'hidden'; po.style.opacity = '1'; } else { cv.style.visibility = ''; po.style.opacity = '0'; }
    }, [mode, bg]);
    const out = {};
    const sheets = [];
    for (const mode of ['live', 'poster']) {
      await setMode(mode, '#000'); await page.waitForTimeout(80);
      const k = await px(await page.screenshot({ clip }));
      await setMode(mode, '#fff'); await page.waitForTimeout(80);
      const wv = await px(await page.screenshot({ clip }));
      // alpha = 1 - (white - black) / 255, per channel, averaged.
      let bottom = -1; let bottomLoose = -1;
      for (let y = 0; y < k.height; y++) {
        for (let x = Math.floor(k.width * 0.15); x < k.width * 0.85; x++) {
          const i = (y * k.width + x) * 4;
          const al = 1 - ((wv.data[i] - k.data[i]) + (wv.data[i + 1] - k.data[i + 1]) + (wv.data[i + 2] - k.data[i + 2])) / (3 * 255);
          if (al >= 200 / 255) bottom = y;
          if (al >= 0.5) bottomLoose = y;
        }
      }
      const bottomCss = clip.y + (bottom + 1) / dpr;
      out[mode] = { silhouetteBottomCss: +bottomCss.toFixed(2), gapPx: +(tier.y - bottomCss).toFixed(2), gapPxAlpha50: +(tier.y - (clip.y + (bottomLoose + 1) / dpr)).toFixed(2) };
      sheets.push(await page.screenshot({ clip }));
    }
    // Restore the page and shoot the real composite for the record.
    await page.evaluate(() => {
      const st = document.querySelector('.centerpiece-stage'); st.style.filter = ''; st.style.background = '';
      document.querySelector('.centerpiece-steps').style.visibility = '';
      document.querySelector('[data-marble-canvas]').style.visibility = '';
    });
    await page.waitForTimeout(100);
    const seat = await page.screenshot({ clip: await clipOf(page, '.centerpiece', 10, 10) });
    results.gap[name] = { tierTopCss: tier.y, ...out, pass: ['live', 'poster'].every((m) => out[m].gapPx >= 0 && out[m].gapPx <= 2) };
    console.log(`gap ${name}: live ${out.live.gapPx}px poster ${out.poster.gapPx}px (tier top ${tier.y.toFixed(2)})`);
    await strip([sheets[0], sheets[1], seat], [`live gap ${out.live.gapPx}px`, `poster gap ${out.poster.gapPx}px`, 'composite'], `gap__${name}.jpg`, { maxW: 360 });
    await context.close();
  }
}

/* ---------------- cross-school arrival through the real switcher ---------------- */
if (want('arrive')) {
  results.arrive = {};
  for (const scheme of ['dark', 'light']) {
    const { context, page, log } = await newPage({ scheme });
    await page.goto(`${base}/t/glassmorphism/about/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator('.open[aria-haspopup="dialog"]').first().click();
    const link = page.locator('a[data-school="vaporwave"]').first();
    await link.waitFor({ state: 'visible', timeout: 5000 });
    const T0 = Date.now();
    await link.click();
    const frames = []; const labels = []; const samples = [];
    for (const ms of [80, 200, 400, 700, 1100, 1600, 2400, 3500, 5000]) {
      const wait = ms - (Date.now() - T0); if (wait > 0) await page.waitForTimeout(wait);
      frames.push(await page.screenshot());
      const s = await page.evaluate(() => {
        const cv = document.querySelector('[data-marble-canvas]'); const po = document.querySelector('[data-marble-poster]');
        return { theme: document.documentElement.dataset.theme, path: location.pathname, poster: po ? getComputedStyle(po).opacity : null, draws: cv ? Number(cv.dataset.draws) : null, canvasVis: cv ? getComputedStyle(cv).visibility : null, canvases: document.querySelectorAll('canvas').length };
      });
      labels.push(`+${((Date.now() - T0) / 1000).toFixed(2)}s ${s.theme} poster ${s.poster} draws ${s.draws}`);
      samples.push({ ms: Date.now() - T0, ...s });
    }
    // Then scroll the centrepiece in and confirm it goes live and drags.
    await centre(page);
    const live = await waitLive(page);
    await page.waitForTimeout(300);
    frames.push(await page.screenshot()); labels.push(`+${((Date.now() - T0) / 1000).toFixed(2)}s centred, live ${live}`);
    await strip(frames, labels, `arrive-film__${scheme}.jpg`, { maxW: 420 });
    results.arrive[scheme] = { samples, live, console: log };
    console.log(`arrive ${scheme}: live ${live}, last ${JSON.stringify(samples.at(-1))}`);
    await context.close();
  }
}

/* ---------------- phone touch drag ---------------- */
if (want('touch')) {
  const { context, page, cdp, log } = await newPage({ width: 390, height: 844, mobile: true, scheme: 'dark' });
  await page.goto(ABOUT, { waitUntil: 'networkidle' });
  await centre(page);
  await waitLive(page);
  await page.waitForTimeout(400);
  const cv = await rectOf(page, '[data-marble-canvas]');
  const clip = await clipOf(page, '.centerpiece', 20, 20);
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  const T0 = Date.now(); const t = () => ((Date.now() - T0) / 1000).toFixed(2);
  const frames = [await page.screenshot({ clip })]; const labels = [`${t()}s before`];
  const y = cv.y + cv.h * 0.5; const x0 = cv.x + cv.w * 0.2;
  const scroll0 = await page.evaluate(() => scrollY);
  const d0 = await page.evaluate(() => Number(document.querySelector('[data-marble-canvas]').dataset.draws));
  await touch('touchStart', x0, y);
  for (let i = 1; i <= 12; i++) {
    await touch('touchMove', x0 + i * (cv.w * 0.6 / 12), y);
    await page.waitForTimeout(16);
    if (i % 4 === 0) { frames.push(await page.screenshot({ clip })); labels.push(`${t()}s touch drag ${i}/12`); }
  }
  await touch('touchEnd');
  await page.waitForTimeout(600);
  frames.push(await page.screenshot({ clip })); labels.push(`${t()}s released +0.6s`);
  const d1 = await page.evaluate(() => Number(document.querySelector('[data-marble-canvas]').dataset.draws));
  const scroll1 = await page.evaluate(() => scrollY);
  // A vertical swipe that starts on the bust must scroll the page (pan-y).
  await touch('touchStart', cv.x + cv.w * 0.5, cv.y + cv.h * 0.7);
  for (let i = 1; i <= 10; i++) { await touch('touchMove', cv.x + cv.w * 0.5, cv.y + cv.h * 0.7 - i * 15); await page.waitForTimeout(16); }
  await touch('touchEnd');
  await page.waitForTimeout(500);
  const scroll2 = await page.evaluate(() => scrollY);
  frames.push(await page.screenshot({ clip: { x: 0, y: 0, width: 390, height: 844 } })); labels.push(`${t()}s after vertical swipe`);
  const pa = await px(frames[0]), pb = await px(frames[3]);
  const turned = diffShare(pa, pb);
  await strip(frames.slice(0, 5), labels.slice(0, 5), 'touch-film__390__dark.jpg', { maxW: 300 });
  results.touch = { drawsDuringDrag: d1 - d0, turnedShare: +(turned * 100).toFixed(2), scrollDuringHorizontal: scroll1 - scroll0, scrollFromVerticalSwipe: scroll2 - scroll1, console: log };
  console.log(`touch: ${JSON.stringify(results.touch)}`);
  await context.close();
}

await browser.close();
const file = join(OUT, `results-${only.length ? only.join('-') : 'all'}.json`);
await writeFile(file, JSON.stringify(results, null, 1));
console.log('wrote', file, warnings.length ? warnings : '');
