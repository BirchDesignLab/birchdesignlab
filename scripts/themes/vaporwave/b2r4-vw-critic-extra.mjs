/**
 * Vaporwave B2 ROUND 4 RE-CRITIC extras (seat b2r4-vw-critic, 09-26-26).
 *
 * Beside b2r4-vw-critic-probe.mjs / b2r4-vw-critic-rerun.mjs (copies of the
 * round-3 critic probes) and b2-vw-critic.mjs --out vw-recritic-r4/w1, this
 * adds what round 4 changed and those do not cover:
 *  - attract: the no-scroll phone attract loop at 390 and 820 (and desktop)
 *    from THREE scroll positions a visitor could tap from (button at the
 *    bottom of the viewport, mid, near the top), scrollY before/after, how
 *    much of the attract content is on screen AND inside the CRT box, and a
 *    double tap (one loop, not two)
 *  - burst: the pipes over ~1.2 s in 10 frames, the same 2x crop, in the
 *    Contact window and in full-window Preview, so a ball joint that is
 *    buried a frame after a turn would show
 *  - arrivecontact: glassmorphism Contact to vaporwave Contact through the
 *    real portal switcher, clicked from the top of the page
 *
 * Usage (serve a snap first: snap.mjs --name b2r4-vw-critic --port 4479 --hold):
 *   BDL_GPU=1 node scripts/themes/vaporwave/b2r4-vw-critic-extra.mjs \
 *     --base http://127.0.0.1:4479 [--only attract,burst,arrivecontact]
 * Outputs: scripts/themes/.out/stage3-b2/vw-recritic-r4/ (gitignored)
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'stage3-b2', 'vw-recritic-r4');
await mkdir(OUT, { recursive: true });
const argOf = (n, f) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? f : process.argv[i + 1]; };
const base = argOf('base', 'http://127.0.0.1:4479');
const only = (argOf('only', '') || '').split(',').filter(Boolean);
const want = (k) => only.length === 0 || only.includes(k);

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
  await writeFile(join(OUT, 'gpu-extra.txt'), r + '\n');
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
const crop = async (buf, sx, sy, sw, sh, k = 2) => {
  const im = await loadImage(buf); const c = createCanvas(Math.round(sw * k), Math.round(sh * k)); const x = c.getContext('2d');
  x.imageSmoothingEnabled = false; x.drawImage(im, sx, sy, sw, sh, 0, 0, sw * k, sh * k); return c.encode('png');
};
async function busiest(buf, cw, ch) {
  const d = await px(buf); const { width: W, height: H } = d;
  const b0 = ((12 * W) + 12) * 4; const bg = [d.data[b0], d.data[b0 + 1], d.data[b0 + 2]];
  const cs = 20; const gw = Math.ceil(W / cs), gh = Math.ceil(H / cs); const g = new Float32Array(gw * gh);
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) { const i = (y * W + x) * 4; if (Math.abs(d.data[i] - bg[0]) + Math.abs(d.data[i + 1] - bg[1]) + Math.abs(d.data[i + 2] - bg[2]) > 60) g[Math.floor(y / cs) * gw + Math.floor(x / cs)]++; }
  let best = -1, bx = 0, by = 0; const kw = Math.floor(cw / cs), kh = Math.floor(ch / cs);
  for (let y = 0; y + kh <= gh; y++) for (let x = 0; x + kw <= gw; x++) { let s = 0; for (let yy = 0; yy < kh; yy++) for (let xx = 0; xx < kw; xx++) s += g[(y + yy) * gw + x + xx]; if (s > best) { best = s; bx = x * cs; by = y * cs; } }
  return [bx, by];
}

/* ---------- attract: no scroll, three tap positions, 390 / 820 / desktop ---------- */
if (want('attract')) {
  results.attract = {};
  const combos = [
    ['390', 390, 844, true, 'dark'], ['390', 390, 844, true, 'light'],
    ['820', 820, 1180, true, 'dark'], ['820', 820, 1180, true, 'light'],
    ['desktop', 1440, 900, false, 'dark'],
  ];
  for (const [name, w, h, mobile, scheme] of combos) for (const where of ['btn-bottom', 'btn-mid', 'btn-top']) {
    const { context, page } = await newPage({ width: w, height: h, mobile, scheme });
    await page.goto(`${base}/t/vaporwave/`, { waitUntil: 'load' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(600);
    // Put the button where a visitor could plausibly tap it from.
    await page.evaluate((wh) => {
      const b = document.querySelector('[data-kiosk-attract-btn]').getBoundingClientRect();
      const target = wh === 'btn-bottom' ? innerHeight - 70 - b.height : wh === 'btn-mid' ? innerHeight / 2 - b.height / 2 : 90;
      window.scrollBy(0, b.top - target);
    }, where);
    await page.waitForTimeout(500);
    const geo = () => page.evaluate(() => {
      const r = (s) => { const b = document.querySelector(s).getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), h: Math.round(b.height) }; };
      const scr = document.querySelector('[data-kiosk-attract-screen]');
      const s = scr.getBoundingClientRect();
      const c = document.querySelector('.attract-content').getBoundingClientRect();
      const kana = document.querySelector('.attract-kana').getBoundingClientRect();
      // On-screen AND inside the (overflow hidden) screen box.
      const vis = (b) => { const t = Math.max(b.top, s.top, 0), bo = Math.min(b.bottom, s.bottom, innerHeight); return b.height > 0 ? Math.max(0, bo - t) / b.height : 0; };
      return { scrollY: Math.round(scrollY), vh: innerHeight, btn: r('[data-kiosk-attract-btn]'), screen: r('[data-kiosk-attract-screen]'),
        content: { top: Math.round(c.top), bottom: Math.round(c.bottom), h: Math.round(c.height) },
        contentVisible: +vis(c).toFixed(3), kanaVisible: +vis(kana).toFixed(3),
        screenOnScreenPx: Math.max(0, Math.min(s.bottom, innerHeight) - Math.max(s.top, 0)),
        on: scr.classList.contains('on'), attractTop: scr.style.getPropertyValue('--attract-top') };
    });
    const before = await geo();
    const frames = [await page.screenshot()]; const labels = [`before, y=${before.scrollY}`];
    if (mobile) await page.tap('[data-kiosk-attract-btn]'); else await page.click('[data-kiosk-attract-btn]');
    const t0 = Date.now();
    const during = [];
    for (const t of [250, 1500, 3000, 4800, 6000]) {
      await page.waitForTimeout(Math.max(0, t - (Date.now() - t0)));
      const g = await geo(); during.push({ t, ...g });
      frames.push(await page.screenshot()); labels.push(`+${t / 1000}s y=${g.scrollY} ${g.on ? 'on' : 'off'} vis ${Math.round(g.contentVisible * 100)}%`);
    }
    const r = { before, during, scrollUnchanged: during.every((d) => d.scrollY === before.scrollY) };
    results.attract[`${name}-${scheme}-${where}`] = r;
    console.log(`attract ${name} ${scheme} ${where}:`, JSON.stringify({ y: before.scrollY, screenOn: before.screenOnScreenPx, btn: before.btn, screen: before.screen, d: during.map((d) => [d.t, d.scrollY, d.on, d.contentVisible, d.kanaVisible, d.attractTop]) }));
    await strip(frames, labels, `x-attract__${name}__${scheme}__${where}.jpg`, { maxW: mobile ? (w > 500 ? 300 : 250) : 420, cols: 3 });
    await context.close();
  }
  // Double tap at 390: one loop, ending ~5.2 s after the first tap.
  {
    const { context, page } = await newPage({ width: 390, height: 844, mobile: true });
    await page.goto(`${base}/t/vaporwave/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => { const b = document.querySelector('[data-kiosk-attract-btn]').getBoundingClientRect(); window.scrollBy(0, b.top - (innerHeight - 140)); });
    await page.waitForTimeout(400);
    await page.tap('[data-kiosk-attract-btn]'); await page.waitForTimeout(120); await page.tap('[data-kiosk-attract-btn]');
    const t0 = Date.now(); let offAt = null;
    while (Date.now() - t0 < 9000) {
      const on = await page.evaluate(() => document.querySelector('[data-kiosk-attract-screen]').classList.contains('on'));
      if (!on) { offAt = Date.now() - t0; break; }
      await page.waitForTimeout(100);
    }
    results.doubleTap = { offAtMsAfterSecondTap: offAt };
    console.log('double tap: off at', offAt, 'ms after the second tap');
    await context.close();
  }
}

/* ---------- burst: pipes over ~1.2 s, same 2x crop, window and Preview ---------- */
if (want('burst')) {
  results.burst = {};
  for (const scheme of ['dark', 'light']) {
    const { context, page } = await newPage({ scheme, dpr: 2 });
    await page.goto(`${base}/t/vaporwave/contact/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.querySelector('.screensaver')?.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(400);
    await page.click('[data-scr-settings]'); await page.waitForTimeout(150);
    await page.click('[data-scr-settings]');
    results.burst[scheme] = { aria: await page.getAttribute('[data-scr-settings]', 'aria-label') };
    const clip = await (async () => { const b = await page.evaluate(() => { const r = document.querySelector('.screensaver-preview').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }); return b; })();
    await page.waitForTimeout(7000);
    const shots = [];
    for (let i = 0; i < 10; i++) { shots.push(await page.screenshot({ clip })); await page.waitForTimeout(120); }
    const [wx, wy] = await busiest(shots[0], 240, 150);
    const crops = []; for (const s of shots) crops.push(await crop(s, wx, wy, 240, 150, 2));
    await strip(crops, shots.map((_, i) => `window +${(i * 0.12 + 7).toFixed(2)}s`), `x-pipes-window-burst__${scheme}.jpg`, { maxW: 480, cols: 5 });
    await writeFile(join(OUT, `x-pipes-window-full__${scheme}.png`), shots[9]);
    // Preview, full window
    await page.click('[data-scr-preview-btn]');
    await page.waitForTimeout(9000);
    const ps = [];
    for (let i = 0; i < 10; i++) { ps.push(await page.screenshot()); await page.waitForTimeout(120); }
    const [fx, fy] = await busiest(ps[0], 720, 480);
    const pc = []; for (const s of ps) pc.push(await crop(s, fx, fy, 720, 480, 1));
    await strip(pc, ps.map((_, i) => `Preview +${(i * 0.12 + 9).toFixed(2)}s`), `x-pipes-preview-burst__${scheme}.jpg`, { maxW: 480, cols: 5 });
    await page.waitForTimeout(8000);
    const late = await page.screenshot();
    await writeFile(join(OUT, `x-pipes-preview-full-late__${scheme}.jpg`), await (async () => { const im = await loadImage(late); const c = createCanvas(im.width / 2, im.height / 2); c.getContext('2d').drawImage(im, 0, 0, im.width / 2, im.height / 2); return c.encode('jpeg', 92); })());
    const [lx, ly] = await busiest(late, 600, 400);
    await writeFile(join(OUT, `x-pipes-preview-late-2x__${scheme}.png`), await crop(late, lx, ly, 600, 400, 1.5));
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    results.burst[scheme].focusBack = await page.evaluate(() => document.activeElement?.hasAttribute('data-scr-preview-btn'));
    results.burst[scheme].ctx = await page.evaluate(() => [...document.querySelectorAll('canvas')].map((c) => c.className || c.getAttribute('data-scr-canvas') || c.id || 'canvas'));
    await context.close();
  }
}

/* ---------- arrive at Contact through the real switcher ---------- */
if (want('arrivecontact')) {
  results.arrivecontact = {};
  for (const scheme of ['dark', 'light']) {
    const { context, page } = await newPage({ scheme });
    await page.goto(`${base}/t/glassmorphism/contact/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.evaluate(() => window.scrollTo(0, 500)); await page.waitForTimeout(200);
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300);
    const frames = [await page.screenshot()]; const labels = ['glass contact'];
    await page.click('bdl-switcher .open');
    await page.waitForTimeout(350);
    frames.push(await page.screenshot()); labels.push('switcher open');
    await page.click('bdl-switcher a[data-school="vaporwave"]');
    const t0 = Date.now();
    for (const t of [150, 400, 900, 1600]) { await page.waitForTimeout(Math.max(0, t - (Date.now() - t0))); frames.push(await page.screenshot()); labels.push(`+${t}ms`); }
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'vaporwave', null, { timeout: 8000 }).catch(() => {});
    await page.evaluate(() => document.querySelector('.screensaver')?.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(1500);
    const a = await px(await page.screenshot());
    await page.waitForTimeout(1200);
    const bshot = await page.screenshot(); const b = await px(bshot);
    let n = 0; for (let i = 0; i < a.data.length; i += 4) if (Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]) > 24) n++;
    frames.push(bshot); labels.push('screensaver in view');
    const st = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, path: location.pathname, canvases: document.querySelectorAll('canvas').length, settings: document.querySelector('[data-scr-settings]')?.getAttribute('aria-label') }));
    results.arrivecontact[scheme] = { ...st, changed1_2s: +(n / (a.width * a.height) * 100).toFixed(2) };
    console.log('arrive contact', scheme, JSON.stringify(results.arrivecontact[scheme]));
    await strip(frames, labels, `x-arrive-contact__${scheme}.jpg`, { maxW: 340, cols: 4 });
    await context.close();
  }
}

console.log('problems:', JSON.stringify([...new Set(problems)], null, 1));
await writeFile(join(OUT, `x-results${only.length ? '-' + only.join('-') : ''}.json`), JSON.stringify({ results, problems: [...new Set(problems)] }, null, 1));
await browser.close();
