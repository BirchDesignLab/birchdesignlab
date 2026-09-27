/**
 * Vaporwave B2 ROUND 3 RE-CRITIC probe (seat b2r3-vw-critic, 09-26-26).
 *
 * The critic's own evidence for fix round 3, beside the rerun of the part-2
 * re-critic probe (b2r3-vw-critic-rerun.mjs) and workflow 1's critic probe
 * (b2-vw-critic.mjs --out vw-recritic-r3). Adds what those do not:
 *  - handoff: poster vs first live frame, all six (desktop/820/390 x dark/light)
 *  - gap: the Venus-to-plinth gap measured INDEPENDENTLY of the fixer's
 *    probe (the poster PNG's own alpha, mapped through the poster's rendered
 *    box, against .tier-top) plus 2x plinth crops at 1440, 820, 390
 *  - ctx: context loss and restore with fine timing (+0.05 s after restore)
 *  - attract: scroll position before/after a tap at 1440x900 and 390x844,
 *    and whether the button is back in view after the loop
 *  - pipes: the small window's growth strip, 2x crops, and Preview 2x crops
 *  - caption: press, leave while held, re-enter, release away (with zooms)
 *
 * Usage: BDL_GPU=1 node scripts/themes/vaporwave/b2r3-vw-critic-probe.mjs \
 *   --base http://127.0.0.1:4479 [--only handoff,gap,ctx,attract,pipes,caption]
 * Outputs: scripts/themes/.out/stage3-b2/vw-recritic-r3/ (gitignored)
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'stage3-b2', 'vw-recritic-r3');
await mkdir(OUT, { recursive: true });
const argOf = (n, f) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? f : process.argv[i + 1]; };
const base = argOf('base', 'http://127.0.0.1:4479');
const only = (argOf('only', '') || '').split(',').filter(Boolean);
const want = (k) => only.length === 0 || only.includes(k);
const ABOUT = `${base}/t/vaporwave/about/`;

const browser = await chromium.launch({
  args: ['--hide-scrollbars', '--font-render-hinting=none', '--disable-lcd-text',
    '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
});
const results = {};
const problems = [];

async function newPage({ width = 1440, height = 900, scheme = 'dark', mobile = false, dpr } = {}) {
  const context = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: dpr ?? (mobile ? 2 : 1),
    isMobile: mobile, hasTouch: mobile, colorScheme: scheme, reducedMotion: 'no-preference',
  });
  await suppressPrompt(context);
  await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); localStorage.setItem('theme', s); } catch {} }, scheme);
  await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(`${page.url()} ${m.type()}: ${m.text().slice(0, 200)}`); });
  page.on('pageerror', (e) => problems.push(`${page.url()} pageerror: ${e.message}`));
  return { context, page };
}
{
  const { context, page } = await newPage();
  const r = await page.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl2'); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); });
  await context.close();
  console.log('renderer:', r);
  await writeFile(join(OUT, 'gpu-probe.txt'), r + '\n');
  if (/swiftshader|llvmpipe/i.test(r)) { await browser.close(); throw new Error('software rasteriser'); }
}

async function strip(frames, labels, file, { maxW = 480, enlarge = 1, cols = 0 } = {}) {
  const ims = await Promise.all(frames.map((b) => loadImage(b)));
  const scale = enlarge > 1 ? enlarge : Math.min(1, maxW / ims[0].width);
  const w = Math.round(ims[0].width * scale), h = Math.round(ims[0].height * scale);
  const pad = 8, lab = 34;
  const n = ims.length; const c0 = cols || n; const rows = Math.ceil(n / c0);
  const c = createCanvas(c0 * (w + pad) + pad, rows * (h + lab + pad) + pad);
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = enlarge <= 1;
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
  ims.forEach((im, i) => {
    const x = pad + (i % c0) * (w + pad); const y = pad + Math.floor(i / c0) * (h + lab + pad);
    ctx.fillStyle = '#111'; ctx.font = 'bold 22px sans-serif';
    ctx.fillText(labels[i] ?? '', x, y + 24);
    ctx.drawImage(im, x, y + lab, w, h);
  });
  await writeFile(join(OUT, file), await c.encode('jpeg', 93));
}
async function px(buf) {
  const im = await loadImage(buf); const c = createCanvas(im.width, im.height); const x = c.getContext('2d');
  x.drawImage(im, 0, 0); return x.getImageData(0, 0, im.width, im.height);
}
function diffShare(a, b, thr = 24) {
  let n = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    if (Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]) > thr) n++;
  }
  return n / (a.width * a.height);
}
async function heat(a, b, thr = 24) {
  const c = createCanvas(a.width, a.height); const x = c.getContext('2d');
  const out = x.createImageData(a.width, a.height);
  for (let i = 0; i < a.data.length; i += 4) {
    const d = Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]);
    const g = (a.data[i] + a.data[i + 1] + a.data[i + 2]) / 6 + 100;
    if (d > thr) { out.data[i] = 255; out.data[i + 1] = 0; out.data[i + 2] = 0; } else { out.data[i] = out.data[i + 1] = out.data[i + 2] = g; }
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
const crop = async (buf, sx, sy, sw, sh, k = 2) => {
  const im = await loadImage(buf); const c = createCanvas(Math.round(sw * k), Math.round(sh * k)); const x = c.getContext('2d');
  x.imageSmoothingEnabled = false; x.drawImage(im, sx, sy, sw, sh, 0, 0, sw * k, sh * k); return c.encode('png');
};
const SIZES = [['desktop', 1440, 900, false], ['820', 820, 1180, true], ['390', 390, 844, true]];

/* ---------- handoff, all six ---------- */
if (want('handoff')) {
  results.handoff = {};
  for (const [name, w, h, mobile] of SIZES) for (const scheme of ['dark', 'light']) {
    const a = await newPage({ width: w, height: h, mobile, scheme });
    await a.context.route('**/live-bust*.js', (r) => r.abort());
    await a.page.goto(ABOUT, { waitUntil: 'networkidle' });
    await centre(a.page); await a.page.waitForTimeout(1500);
    const clip = await clipOf(a.page, '.centerpiece-stage');
    const poster = await a.page.screenshot({ clip });
    await a.context.close();
    const b = await newPage({ width: w, height: h, mobile, scheme });
    await b.page.goto(ABOUT, { waitUntil: 'networkidle' });
    await centre(b.page);
    const live = await waitLive(b.page); await b.page.waitForTimeout(200);
    const clipB = await clipOf(b.page, '.centerpiece-stage');
    const first = await b.page.screenshot({ clip: clipB });
    const buf = await b.page.evaluate(() => { const c = document.querySelector('[data-marble-canvas]'); return [c.width, c.height, c.clientWidth]; });
    await b.context.close();
    const pa = await px(poster), pb = await px(first);
    const share = diffShare(pa, pb);
    results.handoff[`${name}-${scheme}`] = { live, share: +(share * 100).toFixed(2), clip, clipB, buf };
    console.log(`handoff ${name} ${scheme}: ${(share * 100).toFixed(2)}%`);
    await strip([poster, first, await heat(pa, pb)], ['poster', `first live ${(share * 100).toFixed(2)}%`, 'changed (red)'], `r3-handoff__${name}__${scheme}.jpg`, { maxW: 600 });
  }
}

/* ---------- gap: poster PNG alpha through the poster's rendered box ---------- */
if (want('gap')) {
  results.gap = {};
  for (const [name, w, h, mobile] of SIZES) {
    const { context, page } = await newPage({ width: w, height: h, mobile, scheme: 'dark' });
    await context.route('**/live-bust*.js', (r) => r.abort()); // the poster stays up, unfaded
    await page.goto(ABOUT, { waitUntil: 'networkidle' });
    await centre(page); await page.waitForTimeout(1200);
    const m = await page.evaluate(async () => {
      const img = document.querySelector('[data-marble-poster] img');
      await img.decode().catch(() => {});
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height).data;
      let bottom200 = -1, bottom128 = -1;
      for (let y = 0; y < c.height; y++) for (let xx = Math.floor(c.width * 0.15); xx < c.width * 0.85; xx++) {
        const a = d[(y * c.width + xx) * 4 + 3];
        if (a >= 200) bottom200 = y; if (a >= 128) bottom128 = y;
      }
      const r = img.getBoundingClientRect();
      const fit = getComputedStyle(img).objectFit;
      const tier = document.querySelector('.centerpiece-steps .tier-top').getBoundingClientRect();
      // object-fit contain on a square box with a square image: 1:1 mapping.
      const k = r.height / c.height;
      return { natural: [c.width, c.height], box: [r.x, r.y, r.width, r.height], fit, tierTop: tier.top,
        gap200: +(tier.top - (r.y + (bottom200 + 1) * k)).toFixed(2), gap128: +(tier.top - (r.y + (bottom128 + 1) * k)).toFixed(2),
        stageTransform: getComputedStyle(document.querySelector('.centerpiece-stage')).transform };
    });
    results.gap[name] = m;
    console.log(`gap ${name}:`, JSON.stringify(m));
    const clip = await clipOf(page, '.centerpiece', 10, 10);
    const full = await page.screenshot({ clip });
    // A 2x crop around the base and the top tier.
    const im = await loadImage(full); const dpr = mobile ? 2 : 1;
    const baseY = (m.tierTop - clip.y) * dpr;
    const cw = im.width * 0.6, ch = Math.min(120 * dpr, im.height);
    const z = await crop(full, im.width * 0.2, Math.max(0, baseY - ch * 0.6), cw, ch, mobile ? 1.5 : 2);
    await strip([full], [`About plinth ${name} (gap ${m.gap200}px)`], `r3-plinth__${name}.jpg`, { maxW: 700 });
    await writeFile(join(OUT, `r3-plinth-zoom__${name}.png`), z);
    await context.close();
  }
}

/* ---------- context loss and restore, fine timing ---------- */
if (want('ctx')) {
  results.ctx = {};
  for (const scheme of ['dark', 'light']) {
    const { context, page } = await newPage({ scheme });
    await page.goto(ABOUT, { waitUntil: 'networkidle' });
    await centre(page); await waitLive(page); await page.waitForTimeout(300);
    const clip = await clipOf(page, '.centerpiece', 20, 20);
    const st = () => page.evaluate(() => { const cv = document.querySelector('[data-marble-canvas]'); return { vis: getComputedStyle(cv).visibility, poster: getComputedStyle(document.querySelector('[data-marble-poster]')).opacity, role: cv.getAttribute('role'), tab: cv.tabIndex, draws: cv.dataset.draws }; });
    const frames = [await page.screenshot({ clip })]; const labels = ['live'];
    const states = { live: await st() };
    await page.evaluate(() => { const cv = document.querySelector('[data-marble-canvas]'); window.__e = cv.getContext('webgl2').getExtension('WEBGL_lose_context'); window.__e.loseContext(); });
    await page.waitForTimeout(60); frames.push(await page.screenshot({ clip })); labels.push('lost +0.06s'); states.lost0 = await st();
    await page.waitForTimeout(700); frames.push(await page.screenshot({ clip })); labels.push('lost +0.8s'); states.lost1 = await st();
    await page.evaluate(() => window.__e.restoreContext());
    const t0 = Date.now();
    for (const t of [50, 250, 600, 1500, 3000]) { await page.waitForTimeout(Math.max(0, t - (Date.now() - t0))); frames.push(await page.screenshot({ clip })); labels.push(`restore +${t / 1000}s`); }
    states.restored = await st();
    const cv = await rectOf(page, '[data-marble-canvas]');
    await page.mouse.move(cv.x + cv.w * 0.3, cv.y + cv.h * 0.45); await page.mouse.down();
    await page.mouse.move(cv.x + cv.w * 0.75, cv.y + cv.h * 0.45, { steps: 8 });
    frames.push(await page.screenshot({ clip })); labels.push('restored, drag held');
    await page.mouse.up(); await page.waitForTimeout(1200);
    frames.push(await page.screenshot({ clip })); labels.push('after drag');
    states.after = await st();
    results.ctx[scheme] = states;
    await strip(frames, labels, `r3-ctx__${scheme}.jpg`, { maxW: 300, cols: 5 });
    await context.close();
  }
}

/* ---------- attract from the tap: scroll before/after ---------- */
if (want('attract')) {
  results.attract = {};
  for (const [name, w, h, mobile] of [['desktop', 1440, 900, false], ['1024', 1024, 768, false], ['390', 390, 844, true]]) {
    const { context, page } = await newPage({ width: w, height: h, mobile, scheme: 'dark' });
    await page.goto(`${base}/t/vaporwave/`, { waitUntil: 'load' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(600);
    // A visitor scrolls just far enough to see the button at the bottom of the screen.
    await page.evaluate(() => { const b = document.querySelector('[data-kiosk-attract-btn]').getBoundingClientRect(); if (b.bottom > innerHeight - 40) window.scrollBy(0, b.bottom - innerHeight + 60); });
    await page.waitForTimeout(400);
    const geo = () => page.evaluate(() => { const r = (s) => { const b = document.querySelector(s).getBoundingClientRect(); return [Math.round(b.top), Math.round(b.bottom)]; }; return { scrollY: Math.round(scrollY), vh: innerHeight, btn: r('[data-kiosk-attract-btn]'), screen: r('[data-kiosk-attract-screen]'), kana: r('.attract-kana') }; });
    const before = await geo();
    const frames = [await page.screenshot()]; const labels = ['before tap'];
    if (mobile) await page.tap('[data-kiosk-attract-btn]'); else await page.click('[data-kiosk-attract-btn]');
    const t0 = Date.now();
    const during = [];
    for (const t of [150, 1500, 3500, 5000, 6200]) { await page.waitForTimeout(Math.max(0, t - (Date.now() - t0))); frames.push(await page.screenshot()); labels.push(`+${t / 1000}s`); during.push(await geo()); }
    results.attract[name] = { before, during };
    console.log(`attract ${name}:`, JSON.stringify({ before, after: during[0], end: during.at(-1) }));
    await strip(frames, labels, `r3-attract__${name}.jpg`, { maxW: mobile ? 260 : 420, cols: 3 });
    await context.close();
  }
}

/* ---------- pipes: window growth strip + 2x crops, Preview 2x crops ---------- */
if (want('pipes')) {
  results.pipes = {};
  for (const scheme of ['dark', 'light']) {
    const { context, page } = await newPage({ scheme, dpr: 2 });
    await page.goto(`${base}/t/vaporwave/contact/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.querySelector('.screensaver')?.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(400);
    // sunset -> marble -> pipes
    await page.click('[data-scr-settings]'); await page.waitForTimeout(200);
    const marbleClip = await clipOf(page, '.screensaver-preview');
    const mf = []; const ml = []; let t0 = Date.now();
    for (const t of [300, 2000, 4000]) { await page.waitForTimeout(Math.max(0, t - (Date.now() - t0))); mf.push(await page.screenshot({ clip: marbleClip })); ml.push(`marble +${t / 1000}s`); }
    await strip(mf, ml, `r3-sphere-window__${scheme}.jpg`, { maxW: 520 });
    await page.click('[data-scr-settings]');
    const aria = await page.getAttribute('[data-scr-settings]', 'aria-label');
    const clip = await clipOf(page, '.screensaver-preview');
    const f = []; const l = []; t0 = Date.now();
    for (const t of [500, 3000, 6000, 9000, 12000, 15000, 17500]) { await page.waitForTimeout(Math.max(0, t - (Date.now() - t0))); f.push(await page.screenshot({ clip })); l.push(`+${t / 1000}s`); }
    await strip(f, l, `r3-pipes-window-growth__${scheme}.jpg`, { maxW: 420, cols: 4 });
    const im = await loadImage(f[3]);
    await writeFile(join(OUT, `r3-pipes-window-2x__${scheme}.png`), await crop(f[3], 0, 0, im.width / 2, im.height / 2, 2));
    // Preview, full window
    await page.click('[data-scr-preview-btn]');
    const pf = []; const pl = []; t0 = Date.now();
    for (const t of [1500, 6000, 12000]) { await page.waitForTimeout(Math.max(0, t - (Date.now() - t0))); pf.push(await page.screenshot()); pl.push(`Preview +${t / 1000}s`); }
    await strip(pf, pl, `r3-pipes-preview__${scheme}.jpg`, { maxW: 560 });
    await writeFile(join(OUT, `r3-pipes-preview-2x__${scheme}.png`), await crop(pf[2], 700, 400, 700, 450, 1));
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    results.pipes[scheme] = { aria, focusBack: await page.evaluate(() => document.activeElement?.hasAttribute('data-scr-preview-btn')) };
    await context.close();
  }
}

/* ---------- pipes2: 2x crops centred on the pipes themselves ---------- */
async function busiest(buf, cw, ch) {
  const d = await px(buf); const { width: W, height: H } = d;
  const bg = [d.data[0], d.data[1], d.data[2]];
  const cs = 20; const gw = Math.ceil(W / cs), gh = Math.ceil(H / cs); const g = new Float32Array(gw * gh);
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) { const i = (y * W + x) * 4; if (Math.abs(d.data[i] - bg[0]) + Math.abs(d.data[i + 1] - bg[1]) + Math.abs(d.data[i + 2] - bg[2]) > 60) g[Math.floor(y / cs) * gw + Math.floor(x / cs)]++; }
  let best = -1, bx = 0, by = 0; const kw = Math.floor(cw / cs), kh = Math.floor(ch / cs);
  for (let y = 0; y + kh <= gh; y++) for (let x = 0; x + kw <= gw; x++) { let s = 0; for (let yy = 0; yy < kh; yy++) for (let xx = 0; xx < kw; xx++) s += g[(y + yy) * gw + x + xx]; if (s > best) { best = s; bx = x * cs; by = y * cs; } }
  return [bx, by];
}
if (want('pipes2')) {
  for (const scheme of ['dark', 'light']) {
    const { context, page } = await newPage({ scheme });
    await page.goto(`${base}/t/vaporwave/contact/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.querySelector('.screensaver')?.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(400);
    await page.click('[data-scr-settings]'); await page.waitForTimeout(150);
    await page.click('[data-scr-settings]');
    const clip = await clipOf(page, '.screensaver-preview');
    await page.waitForTimeout(10000);
    const win = await page.screenshot({ clip });
    const [wx, wy] = await busiest(win, 160, 100);
    await writeFile(join(OUT, `r3-pipes-window-2x__${scheme}.png`), await crop(win, wx, wy, 160, 100, 3));
    await page.click('[data-scr-preview-btn]');
    await page.waitForTimeout(11000);
    const full = await page.screenshot();
    const [fx, fy] = await busiest(full, 420, 280);
    await writeFile(join(OUT, `r3-pipes-preview-2x__${scheme}.png`), await crop(full, fx, fy, 420, 280, 2));
    await page.keyboard.press('Escape');
    await context.close();
  }
}

/* ---------- caption press, leave, re-enter, release ---------- */
if (want('caption')) {
  const { context, page } = await newPage({ dpr: 2 });
  await page.goto(`${base}/t/vaporwave/`, { waitUntil: 'networkidle' });
  const sel = '.vw-win-btns .max';
  await page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: 'center' }), sel);
  await page.waitForTimeout(400);
  const b = await rectOf(page, sel);
  const clip = { x: b.x - 60, y: b.y - 14, width: 110, height: b.h + 28 };
  const win = await page.evaluate((s) => { const w = document.querySelector(s).closest('.vw-win, [class*="win"]'); return w ? w.className : null; }, sel);
  const st = () => page.evaluate((s) => { const e = document.querySelector(s); const w = e.closest('.vw-win') || e.parentElement.parentElement.parentElement; return { pressed: e.classList.contains('pressed'), border: getComputedStyle(e).borderTopColor, winTransform: w.style.transform, sel: getSelection().toString().length }; }, sel);
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  const fr = []; const lb = []; const ss = {};
  fr.push(await page.screenshot({ clip })); lb.push('rest'); ss.rest = await st();
  await page.mouse.move(cx, cy); await page.mouse.down(); await page.waitForTimeout(80);
  fr.push(await page.screenshot({ clip })); lb.push('down'); ss.down = await st();
  await page.mouse.move(cx + 150, cy + 60, { steps: 8 }); await page.waitForTimeout(80);
  fr.push(await page.screenshot({ clip })); lb.push('left, held'); ss.left = await st();
  await page.mouse.move(cx, cy, { steps: 8 }); await page.waitForTimeout(80);
  fr.push(await page.screenshot({ clip })); lb.push('re-entered'); ss.reenter = await st();
  await page.mouse.move(cx + 150, cy + 60, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(80);
  fr.push(await page.screenshot({ clip })); lb.push('released away'); ss.releasedAway = await st();
  await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(80);
  fr.push(await page.screenshot({ clip })); lb.push('click on it'); ss.click = await st();
  results.caption = { win, ...ss };
  console.log('caption', JSON.stringify(results.caption));
  await strip(fr, lb, 'r3-caption-press__dark.jpg', { enlarge: 2 });
  await context.close();
}

console.log('problems:', JSON.stringify([...new Set(problems)], null, 1));
await writeFile(join(OUT, `r3-results${only.length ? '-' + only.join('-') : ''}.json`), JSON.stringify({ results, problems: [...new Set(problems)] }, null, 1));
await browser.close();
