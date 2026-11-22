/**
 * Stage 6 wave 2, task 13: evidence for vaporwave V1 to V14 on any frozen build.
 *
 *   node scripts/themes/snap.mjs --name s6-w2-t13 --reuse --port 4470 -- \
 *     env LABEL=after ONLY=sheets,crops,swap,boundary node scripts/themes/stage6/w2-t13-evidence.mjs
 *   (and --name stage6-base with LABEL=base for the before side)
 *
 * ONLY is a comma list of: sheets, crops, swap, boundary, aboutswap.
 *   sheets    whole-page sheets of Home, Services, About, Contact at 1440, 1280, 1024, 820, 390, light and dark.
 *   crops     one crop per finding at the sizes it names (and 360 for the phone header), light and dark.
 *   swap      arrival from quiet through the real switcher, and in-school swaps (Home to Services, Services to
 *             About), as timestamped strips at 1440 and 390.
 *   aboutswap About in-school swap at 1440 dark: the bust's image state per frame (when it is complete)
 *             and a strip cropped to the centrepiece at the frames around +400 and +480 ms.
 *   boundary  vaporwave beside glassmorphism, light, 1440 and 390, viewport frames (the glass wallpaper is fixed).
 * Output: scripts/themes/.out/stage6/w2/t13/<LABEL>/<section>/ (gitignored).
 * GPU Chromium, the renderer checked; reduced transparency forced to no-preference; the portal prompt
 * suppressed; the switcher hidden except in the arrival film, which goes through the real switcher.
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const LABEL = process.env.LABEL || 'after';
const OUT = join(HERE, '..', '.out', 'stage6', 'w2', 't13', LABEL);
const BASE = process.env.BASE || process.env.SNAP_BASE || 'http://127.0.0.1:4470';
const ONLY = (process.env.ONLY || 'sheets').split(',');
for (const sub of ['sheets', 'crops', 'swap', 'aboutswap', 'boundary']) await mkdir(join(OUT, sub), { recursive: true });
const VPS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '1280', width: 1280, height: 800 },
  { name: '1024', width: 1024, height: 768 },
  { name: '820', width: 820, height: 1180, mobile: true },
  { name: '390', width: 390, height: 844, mobile: true },
];
const vp = (n) => VPS.find((v) => v.name === n) ?? { name: n, width: Number(n), height: 844, mobile: true };
const T = '/t/vaporwave';

const browser = await chromium.launch({ headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'] });
{
  const p = await browser.newPage();
  const renderer = await p.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); });
  await p.close();
  console.log('renderer:', renderer);
  if (/swiftshader|llvmpipe|software/i.test(renderer)) throw new Error('software renderer: evidence invalid');
  await writeFile(join(OUT, 'renderer.txt'), `${renderer}\n`);
}

async function newCtx(v, scheme, { dpr = 1, touch } = {}) {
  const ctx = await browser.newContext({ viewport: { width: v.width, height: v.height }, deviceScaleFactor: dpr, isMobile: !!v.mobile, hasTouch: touch ?? !!v.mobile, colorScheme: scheme, reducedMotion: 'no-preference' });
  await suppressPrompt(ctx);
  await ctx.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
  return ctx;
}
async function forceMedia(ctx, page) {
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  return cdp;
}
async function settleScroll(page) {
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 90)); } scrollTo(0, 0); });
}
async function open(v, scheme, path, opts = {}) {
  const ctx = await newCtx(v, scheme, opts);
  const page = await ctx.newPage();
  await forceMedia(ctx, page);
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  if (!opts.keepSwitcher) await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(opts.settle ?? 1800);
  return { ctx, page };
}

/** Film `ms` after the trigger over the screencast; frames carry their time. */
async function film(page, ms, trigger) {
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    frames.push({ data, at: metadata.timestamp });
    try { await cdp.send('Page.screencastFrameAck', { sessionId }); } catch {}
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 88, everyNthFrame: 1 });
  await page.waitForTimeout(200);
  if (!frames.length) {
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 88 });
    frames.push({ data, at: Date.now() / 1000 });
  }
  const t0 = Date.now() / 1000;
  await trigger();
  await page.waitForTimeout(ms);
  await cdp.send('Page.stopScreencast');
  await cdp.detach();
  const before = frames.filter((f) => f.at < t0).slice(-1);
  const after = frames.filter((f) => f.at >= t0);
  return { t0, frames: [...before, ...after].map((f) => ({ ...f, ms: Math.round((f.at - t0) * 1000) })) };
}
function thin(frames, n) {
  if (frames.length <= n) return frames;
  const out = [];
  for (let i = 0; i < n; i++) out.push(frames[Math.round((i * (frames.length - 1)) / (n - 1))]);
  return out;
}
/** A timestamped strip: the frames cropped to `box` (CSS px), each labelled. */
async function strip(frames, file, { cols = 4, cellW = 360, box = null, vpWidth, title = '' }) {
  const images = await Promise.all(frames.map((f) => loadImage(Buffer.from(f.data, 'base64'))));
  const k = box ? images[0].width / vpWidth : 1;
  const src = box ? { x: box.x * k, y: box.y * k, w: box.w * k, h: box.h * k } : { x: 0, y: 0, w: images[0].width, h: images[0].height };
  const cellH = Math.round((src.h / src.w) * cellW);
  const PAD = 10, CAP = 24, HEAD = title ? 30 : 0;
  const rows = Math.ceil(images.length / cols);
  const canvas = createCanvas(PAD + cols * (cellW + PAD), HEAD + PAD + rows * (cellH + CAP + PAD));
  const c = canvas.getContext('2d');
  c.fillStyle = '#1b1b1d'; c.fillRect(0, 0, canvas.width, canvas.height);
  c.font = '600 14px sans-serif'; c.textBaseline = 'middle'; c.fillStyle = '#e8e6e1';
  if (title) c.fillText(title, PAD, HEAD / 2 + 2);
  images.forEach((img, i) => {
    const x = PAD + (i % cols) * (cellW + PAD), y = HEAD + PAD + Math.floor(i / cols) * (cellH + CAP + PAD);
    c.drawImage(img, src.x, src.y, src.w, src.h, x, y, cellW, cellH);
    c.fillStyle = '#e8e6e1';
    c.fillText(frames[i].ms < 0 ? 'before' : `+${frames[i].ms} ms`, x, y + cellH + CAP / 2);
  });
  await writeFile(file, await canvas.encode('png'));
}

// ------------------------------------------------------------------ sheets
if (ONLY.includes('sheets')) {
  const pages = [['home', `${T}/`], ['services', `${T}/services/`], ['about', `${T}/about/`], ['contact', `${T}/contact/`]];
  for (const v of VPS) for (const scheme of ['light', 'dark']) {
    const ctx = await newCtx(v, scheme);
    const page = await ctx.newPage();
    await forceMedia(ctx, page);
    for (const [id, path] of pages) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
      await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
      await page.evaluate(() => document.fonts.ready);
      await settleScroll(page);
      await page.waitForTimeout(1500);
      await page.screenshot({ path: join(OUT, 'sheets', `${id}__${scheme}__${v.name}__full.png`), fullPage: true });
    }
    await ctx.close();
    console.log('sheets', v.name, scheme);
  }
}

// ------------------------------------------------------------------- crops
// One crop per finding, at the sizes it names, light and dark.
if (ONLY.includes('crops')) {
  const CROPS = [
    ['v1-services-intro', `${T}/services/`, '.intro', ['1440', '1280', '1024', '820', '761']],
    ['v2-home-hero', `${T}/`, '.hero', ['1024', '820', '761', '1440']],
    ['v3-kiosk', `${T}/`, '.kiosk', ['390', '820', '1024', '1440']],
    ['v3-closer', `${T}/`, '.closer-band', ['390', '600', '820', '1440']],
    ['v4-closer', `${T}/`, '.closer', ['1440', '390']],
    ['v5-temple', `${T}/about/`, '.temple', ['1440', '1280', '1024', '820', '390']],
    ['v7-footer', `${T}/`, 'footer.foot', ['1440', '1280', '820', '621', '390']],
    ['v8-header', `${T}/`, 'header.taskbar', ['390', '375', '360']],
    ['v9-contact-windows', `${T}/contact/`, '.desk', ['1440', '390']],
    ['v9-about-windows', `${T}/about/`, '.etym', ['1440', '390']],
    ['v9-services-windows', `${T}/services/`, '.wizard', ['1440', '390']],
    ['v10-screensaver', `${T}/contact/`, '.side-scene', ['1440', '390']],
    ['v11-hero', `${T}/`, '.hero', ['390', '360']],
    ['v12-ask', `${T}/services/`, '.ask', ['1440', '1024', '820', '390']],
    ['v13-plinth', `${T}/about/`, '.plinth-wrap', ['1440', '820', '390']],
    ['v14-services-top', `${T}/services/`, 'main', ['1440', '390']],
    ['v14-contact-top', `${T}/contact/`, 'main', ['1440', '390']],
  ];
  for (const [id, path, sel, sizes] of CROPS) for (const scheme of ['light', 'dark']) for (const sz of sizes) {
    const v = vp(sz);
    const { ctx, page } = await open(v, scheme, path, { settle: 600 });
    await settleScroll(page);
    await page.waitForTimeout(1200);
    const el = page.locator(sel).first();
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const file = join(OUT, 'crops', `${id}__${scheme}__${sz}.png`);
    if (id.startsWith('v14')) {
      // The top of the page, viewport frame (the cloud wallpaper is fixed).
      await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(200);
      await page.screenshot({ path: file });
    } else {
      await el.screenshot({ path: file });
    }
    await ctx.close();
  }
  console.log('crops done');
}

// -------------------------------------------------------------------- swap
// An arrival from quiet through the real switcher, and in-school swaps (Home to Services, Services to About),
// at 1440 and 390; compare the same strips from LABEL=base.
if (ONLY.includes('swap')) {
  for (const v of [vp('1440'), vp('390')]) for (const scheme of ['dark', 'light']) {
    {
      const ctx = await newCtx(v, scheme);
      const page = await ctx.newPage();
      await forceMedia(ctx, page);
      await page.goto(`${BASE}/t/quiet/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);
      const f = await film(page, 3600, async () => {
        await page.evaluate(() => {
          const sw = document.querySelector('bdl-switcher');
          const btn = [...sw.shadowRoot.querySelectorAll('button, a')].find((b) => /vaporwave/i.test(b.getAttribute('data-theme') || b.getAttribute('aria-label') || b.textContent || ''));
          if (btn) btn.click(); else console.log('no vaporwave button');
        });
      });
      await strip(thin(f.frames, 24), join(OUT, 'swap', `arrival__quiet-to-vaporwave__${scheme}__${v.name}.png`), { cols: 6, cellW: v.mobile ? 120 : 220, vpWidth: v.width, title: `arrival from quiet through the switcher, ${scheme} ${v.name}` });
      await ctx.close();
    }
    {
      const { ctx, page } = await open(v, scheme, `${T}/`, { settle: 1800 });
      const f = await film(page, 1300, async () => { await page.locator('nav a', { hasText: /^Services$/i }).first().click(); });
      await strip(thin(f.frames, 20), join(OUT, 'swap', `in-school__home-to-services__${scheme}__${v.name}.png`), { cols: 5, cellW: v.mobile ? 150 : 270, vpWidth: v.width, title: `in-school swap Home to Services (${scheme} ${v.name})` });
      await page.waitForTimeout(2200);
      const g = await film(page, 1300, async () => { await page.locator('nav a', { hasText: /^About$/i }).first().click(); });
      await strip(thin(g.frames, 20), join(OUT, 'swap', `in-school__services-to-about__${scheme}__${v.name}.png`), { cols: 5, cellW: v.mobile ? 150 : 270, vpWidth: v.width, title: `in-school swap Services to About (${scheme} ${v.name})` });
      await ctx.close();
    }
    console.log('swap', v.name, scheme);
  }
}

// -------------------------------------------------------------- aboutswap
// About in-school swap, 1440 dark: when the bust's image is complete (ms after the click), and the frames.
if (ONLY.includes('aboutswap')) {
  const v = vp('1440');
  for (let run = 1; run <= 3; run++) {
    const { ctx, page } = await open(v, 'dark', `${T}/services/`, { settle: 1800 });
    await page.evaluate(() => {
      window.__bust = { click: 0, samples: [] };
      document.addEventListener('click', () => { window.__bust.click = performance.now(); }, true);
      const loop = () => {
        if (window.__bust.click) {
          const img = document.querySelector('.centerpiece-prop img');
          const poster = document.querySelector('[data-marble-poster]');
          const r = img ? img.getBoundingClientRect() : null;
          window.__bust.samples.push([Math.round(performance.now() - window.__bust.click), img ? (img.complete && img.naturalWidth > 0 ? 1 : 0) : -1, img ? img.loading : '', r ? Math.round(r.width) : 0, poster ? getComputedStyle(poster).opacity : '']);
        }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    });
    const f = await film(page, 1400, async () => { await page.locator('nav a', { hasText: /^About$/i }).first().click(); });
    const s = await page.evaluate(() => window.__bust.samples);
    const firstReady = s.find((r) => r[1] === 1);
    const firstImg = s.find((r) => r[1] >= 0);
    console.log('aboutswap', LABEL, 'run', run, 'first sample with the img element', JSON.stringify(firstImg), 'first complete', JSON.stringify(firstReady));
    if (run === 1) {
      const box = await page.evaluate(() => { const r = document.querySelector('.centerpiece').getBoundingClientRect(); return { x: Math.max(0, r.left - 40), y: Math.max(0, r.top - 40), w: Math.min(innerWidth, r.width + 80), h: Math.min(innerHeight, r.height + 80) }; });
      const near = f.frames.filter((fr) => fr.ms >= 250 && fr.ms <= 800);
      await strip(near.length ? near : thin(f.frames, 12), join(OUT, 'aboutswap', `services-to-about__dark__1440__centerpiece.png`), { cols: 5, cellW: 260, box, vpWidth: v.width, title: `About in-school swap, dark 1440, the bust from +250 to +800 ms (${LABEL})` });
      await strip(thin(f.frames, 20), join(OUT, 'aboutswap', `services-to-about__dark__1440__whole.png`), { cols: 5, cellW: 270, vpWidth: v.width, title: `About in-school swap, dark 1440 (${LABEL})` });
    }
    await ctx.close();
  }
}

// ---------------------------------------------------------------- boundary
// Vaporwave beside glassmorphism in light, viewport frames at two scroll offsets (the glass wallpaper is fixed and
// paints only in the top viewport of a full-page shot), 1440 and 390.
if (ONLY.includes('boundary')) {
  for (const v of [vp('1440'), vp('390')]) {
    const THUMB = v.mobile ? 300 : 640;
    const tiles = [];
    for (const [id, sub] of [['home', ''], ['services', 'services/'], ['about', 'about/'], ['contact', 'contact/']]) {
      for (const off of id === 'home' ? [0] : [0, 700]) {
        const pair = [];
        for (const school of ['vaporwave', 'glassmorphism']) {
          const { ctx, page } = await open(v, 'light', `/t/${school}/${sub}`, { settle: 1200 });
          await settleScroll(page);
          await page.evaluate((o) => scrollTo(0, o), off);
          await page.waitForTimeout(900);
          pair.push(await page.screenshot());
          await ctx.close();
        }
        tiles.push({ label: `${id} @${off}`, pair });
      }
    }
    const imgs = await Promise.all(tiles.map(async (t) => ({ label: t.label, a: await loadImage(t.pair[0]), b: await loadImage(t.pair[1]) })));
    const cellH = Math.round((v.height / v.width) * THUMB);
    const G = 12, HEAD = 34, CAP = 22;
    const cols = v.mobile ? 2 : 1;
    const rowsN = Math.ceil(imgs.length / cols);
    const w = G + cols * (THUMB * 2 + G * 2);
    const canvas = createCanvas(w, HEAD + rowsN * (cellH + CAP + G) + G);
    const c = canvas.getContext('2d');
    c.fillStyle = '#1b1b1d'; c.fillRect(0, 0, canvas.width, canvas.height);
    c.fillStyle = '#e8e6e1'; c.font = '600 15px sans-serif'; c.textBaseline = 'middle';
    c.fillText(`vaporwave (left) beside glassmorphism (right), light, ${v.name}, viewport frames (${LABEL})`, G, HEAD / 2);
    imgs.forEach((t, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const x = G + col * (THUMB * 2 + G * 2), y = HEAD + row * (cellH + CAP + G);
      c.drawImage(t.a, x, y + CAP, THUMB, cellH);
      c.drawImage(t.b, x + THUMB + G, y + CAP, THUMB, cellH);
      c.fillStyle = '#e8e6e1'; c.font = '13px sans-serif';
      c.fillText(t.label, x, y + CAP / 2);
    });
    await writeFile(join(OUT, 'boundary', `vaporwave-vs-glassmorphism__light__${v.name}.png`), await canvas.encode('png'));
    console.log('boundary', v.name);
  }
}
await browser.close();
