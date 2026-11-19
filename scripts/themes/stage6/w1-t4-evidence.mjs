/**
 * Stage 6 wave 1, task 4 (swiss: poster scale, width dial, programme
 * revealed): the evidence pass. Serve a build (snap) and run sections by name.
 *
 *   node scripts/themes/snap.mjs --name s6-w1-t4 --reuse --port 4470 -- node scripts/themes/stage6/w1-t4-evidence.mjs
 *   LABEL=before ONLY=sheets BASE=http://127.0.0.1:4471 node scripts/themes/stage6/w1-t4-evidence.mjs
 *   COMPARE=before,after node scripts/themes/stage6/w1-t4-evidence.mjs
 *
 * GPU Chromium (--use-angle=d3d11 --enable-gpu), renderer checked through
 * WEBGL_debug_renderer_info; prefers-reduced-transparency forced to
 * no-preference; the portal prompt suppressed; the first-visit hint marked
 * seen except in its own section. Sections (ONLY=a,b,...):
 *   sheets  whole-page sheets of every swiss page at 1440, 1280, 1024, 820
 *           and 390, light and dark;
 *   grid    the grid key at rest, held, tapped (latched), tapped again, and
 *           after Esc, at 1440 and 390 (and the tablet header at 820, 1024);
 *   dial    films: the dial dragged at 1440, 1024, 820 and 390 (mouse, and
 *           touch on the smaller two), keyboard steps, snap-back;
 *   hint    the first-visit hint at 1440 and 390, from a fresh session;
 *   swap    an arrival from quiet and an in-school swap with the dial
 *           mid-return, at 1440 and 390, frame by frame.
 * Output: scripts/themes/.out/stage6/w1/t4/<label>/<section>/
 */
import { chromium } from 'playwright';
import sharp from 'sharp';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { writeFile, mkdir, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '.out', 'stage6', 'w1', 't4');

async function sideBySide(pa, pb, out, cwMax = 720) {
  const [ma, mb] = await Promise.all([sharp(pa).metadata(), sharp(pb).metadata()]);
  const cw = Math.min(ma.width, cwMax);
  const ha = Math.round((ma.height / ma.width) * cw), hb = Math.round((mb.height / mb.width) * cw);
  const [ta, tb] = await Promise.all([sharp(pa).resize(cw, ha).toBuffer(), sharp(pb).resize(cw, hb).toBuffer()]);
  await sharp({ create: { width: cw * 2 + 36, height: Math.max(ha, hb) + 24, channels: 3, background: '#1b1b1d' } })
    .composite([{ input: ta, left: 12, top: 12 }, { input: tb, left: cw + 24, top: 12 }])
    .png()
    .toFile(out);
}

if (process.env.COMPARE) {
  const [a, b] = process.env.COMPARE.split(',');
  const out = join(ROOT, `${a}-vs-${b}`);
  await mkdir(out, { recursive: true });
  const files = (await readdir(join(ROOT, a, 'sheets'))).filter((f) => f.endsWith('.png'));
  for (const f of files) {
    try { await sideBySide(join(ROOT, a, 'sheets', f), join(ROOT, b, 'sheets', f), join(out, f)); } catch (e) { console.log(f, String(e).split('\n')[0]); }
  }
  console.log(`${files.length} pairs written to ${out}`);
  process.exit(0);
}

const LABEL = process.env.LABEL || 'after';
const OUT = join(ROOT, LABEL);
const BASE = process.env.BASE || process.env.SNAP_BASE || 'http://127.0.0.1:4470';
const ONLY = (process.env.ONLY || 'sheets,grid,dial,hint,swap').split(',');
for (const sub of ['sheets', 'grid', 'dial', 'hint', 'swap']) await mkdir(join(OUT, sub), { recursive: true });
const VPS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '1280', width: 1280, height: 800 },
  { name: '1024', width: 1024, height: 768 },
  { name: '820', width: 820, height: 1180, mobile: true },
  { name: '390', width: 390, height: 844, mobile: true },
];
const HINT_KEY = 'bdl-swiss-dial-hint';

const browser = await chromium.launch({ headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'] });
{
  const p = await browser.newPage();
  const renderer = await p.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); });
  await p.close();
  console.log('renderer:', renderer);
  if (/swiftshader|llvmpipe|software/i.test(renderer)) throw new Error('software renderer: evidence invalid');
  await writeFile(join(OUT, 'renderer.txt'), `${renderer}\n`);
}

async function open(vp, scheme, path, { hint = false, dpr = 1 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: dpr, isMobile: !!vp.mobile, hasTouch: !!vp.mobile, colorScheme: scheme, reducedMotion: 'no-preference' });
  await suppressPrompt(ctx);
  await ctx.addInitScript(([s, hint, key]) => { try { localStorage.setItem('scheme', s); if (!hint) sessionStorage.setItem(key, '1'); } catch {} }, [scheme, hint, HINT_KEY]);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  return { ctx, page, cdp };
}

/** Film `ms` after the trigger over the screencast; frames carry their time. */
async function film(page, ms, trigger) {
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    frames.push({ data, at: metadata.timestamp });
    try { await cdp.send('Page.screencastFrameAck', { sessionId }); } catch {}
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 86, everyNthFrame: 1 });
  await page.waitForTimeout(200);
  if (!frames.length) {
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 86 });
    frames.push({ data, at: Date.now() / 1000 });
  }
  const t0 = Date.now() / 1000;
  await trigger();
  await page.waitForTimeout(ms);
  await cdp.send('Page.stopScreencast');
  await cdp.detach();
  const before = frames.filter((f) => f.at < t0).slice(-1);
  const after = frames.filter((f) => f.at >= t0);
  return [...before, ...after].map((f) => ({ ...f, ms: Math.round((f.at - t0) * 1000) }));
}

/** At most n frames, spread evenly by time over the film, always the first and the last. */
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

/** The hero's box (header to the fold of the poster), CSS px. */
const heroBox = (page, vp) => page.evaluate((vh) => {
  const h = document.querySelector('.hero-sheet').getBoundingClientRect();
  return { x: 0, y: Math.max(0, h.top), w: innerWidth, h: Math.min(vh - Math.max(0, h.top), h.height) };
}, vp.height);

// ------------------------------------------------------------------ sheets
if (ONLY.includes('sheets')) {
  const pages = [['home', '/t/swiss/'], ['services', '/t/swiss/services/'], ['about', '/t/swiss/about/'], ['contact', '/t/swiss/contact/'], ['sent', '/t/swiss/contact/sent/']];
  for (const vp of VPS) for (const scheme of ['light', 'dark']) {
    const { ctx, page } = await open(vp, scheme, '/t/swiss/');
    for (const [id, path] of pages) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
      await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(250);
      await page.screenshot({ path: join(OUT, 'sheets', `${id}__${scheme}__${vp.name}__full.png`), fullPage: true });
    }
    await ctx.close();
    console.log('sheets', vp.name, scheme);
  }
}

// -------------------------------------------------------------------- grid
if (ONLY.includes('grid')) {
  for (const vp of [VPS[0], VPS[2], VPS[3], VPS[4]]) {
    for (const [id, path] of [['home', '/t/swiss/'], ['services', '/t/swiss/services/']]) {
      const { ctx, page } = await open(vp, 'light', path);
      const key = page.locator('[data-sw-grid-key]');
      const kb = await key.boundingBox();
      const cx = kb.x + kb.width / 2, cy = kb.y + kb.height / 2;
      const shot = (name) => page.screenshot({ path: join(OUT, 'grid', `${id}__${vp.name}__${name}.png`) });
      await shot('1-rest');
      // Held: down, wait past the tap limit, shoot, release (momentary).
      await page.mouse.move(cx, cy); await page.mouse.down(); await page.waitForTimeout(450);
      await shot('2-held');
      await page.mouse.up(); await page.waitForTimeout(120);
      const afterHold = await page.evaluate(() => ({ hidden: document.querySelector('[data-sw-guides]').hidden, pressed: document.querySelector('[data-sw-grid-key]').getAttribute('aria-pressed') }));
      // Tapped: a quick press latches.
      await page.mouse.down(); await page.waitForTimeout(80); await page.mouse.up(); await page.waitForTimeout(250);
      await shot('3-latched');
      const latched = await page.evaluate(() => ({ hidden: document.querySelector('[data-sw-guides]').hidden, pressed: document.querySelector('[data-sw-grid-key]').getAttribute('aria-pressed') }));
      // Scroll while latched: the layer follows.
      await page.evaluate(() => scrollBy(0, innerHeight * 0.8)); await page.waitForTimeout(400);
      await shot('4-latched-scrolled');
      await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(300);
      // A second tap clears.
      await page.mouse.down(); await page.waitForTimeout(80); await page.mouse.up(); await page.waitForTimeout(150);
      const second = await page.evaluate(() => ({ hidden: document.querySelector('[data-sw-guides]').hidden, pressed: document.querySelector('[data-sw-grid-key]').getAttribute('aria-pressed') }));
      // Latch again, Esc clears.
      await page.mouse.down(); await page.waitForTimeout(80); await page.mouse.up(); await page.waitForTimeout(150);
      await page.keyboard.press('Escape'); await page.waitForTimeout(150);
      const esc = await page.evaluate(() => ({ hidden: document.querySelector('[data-sw-guides]').hidden, pressed: document.querySelector('[data-sw-grid-key]').getAttribute('aria-pressed') }));
      // Latch, then blur clears (focus moves off the key).
      await page.mouse.down(); await page.waitForTimeout(80); await page.mouse.up(); await page.waitForTimeout(150);
      await page.evaluate(() => document.querySelector('[data-sw-grid-key]').blur()); await page.waitForTimeout(150);
      const blur = await page.evaluate(() => ({ hidden: document.querySelector('[data-sw-guides]').hidden, pressed: document.querySelector('[data-sw-grid-key]').getAttribute('aria-pressed') }));
      // G is momentary, and a latched grid ignores it.
      await page.keyboard.down('g'); await page.waitForTimeout(100);
      const gDown = await page.evaluate(() => !document.querySelector('[data-sw-guides]').hidden);
      await page.keyboard.up('g'); await page.waitForTimeout(100);
      const gUp = await page.evaluate(() => !document.querySelector('[data-sw-guides]').hidden);
      // The tags: how many of each, and their text.
      await page.mouse.down(); await page.waitForTimeout(450);
      const tags = await page.evaluate(() => ({
        cols: getComputedStyle(document.querySelector('.guides span:nth-child(1)'), '::before').content,
        spans: [...document.querySelectorAll('[data-sw-marks] .span')].map((s) => s.textContent),
        counts: [...document.querySelectorAll('[data-sw-marks] .count')].map((s) => s.textContent),
        spec: [...document.querySelectorAll('[data-sw-marks] .spec')].map((s) => s.textContent),
      }));
      await page.mouse.up(); await page.waitForTimeout(100);
      const keyBox = kb;
      console.log('grid', id, vp.name, JSON.stringify({ key: [Math.round(keyBox.x), Math.round(keyBox.y), Math.round(keyBox.width)], afterHold, latched, second, esc, blur, gDown, gUp, tags }));
      await ctx.close();
    }
  }
}

// -------------------------------------------------------------------- dial
if (ONLY.includes('dial')) {
  for (const vp of [VPS[0], VPS[2], VPS[3], VPS[4]]) {
    for (const mode of vp.mobile ? ['mouse', 'touch'] : ['mouse']) {
      const { ctx, page, cdp } = await open(vp, 'light', '/t/swiss/');
      const box = await heroBox(page, vp);
      const dbox = await page.evaluate(() => { const b = document.querySelector('[data-sw-dial]').getBoundingClientRect(); const r = document.createRange(); r.selectNodeContents(document.querySelectorAll('.billboard .ln')[1]); const t = r.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, wordR: t.right }; });
      const y = (dbox.t + dbox.b) / 2;
      const x0 = vp.mobile ? 30 : dbox.l + 120;
      const x1 = vp.mobile ? Math.min(vp.width - 20, x0 + 330) : x0 + 360;
      const send = (type, x, yy = y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y: yy }] });
      // Widen, hold, release, return.
      const trigger = async () => {
        if (mode === 'mouse') {
          await page.mouse.move(x0, y); await page.mouse.down();
          for (let i = 1; i <= 14; i++) { await page.mouse.move(x0 + ((x1 - x0) * i) / 14, y); await page.waitForTimeout(20); }
          await page.waitForTimeout(250); await page.mouse.up();
        } else {
          await send('touchStart', x0);
          for (let i = 1; i <= 14; i++) { await send('touchMove', x0 + ((x1 - x0) * i) / 14); await page.waitForTimeout(20); }
          await page.waitForTimeout(250); await send('touchEnd', 0);
        }
      };
      let frames = await film(page, 1300, trigger);
      await strip(thin(frames, 16), join(OUT, 'dial', `widen__${mode}__${vp.name}.png`), { cols: 4, cellW: vp.mobile ? 190 : 340, box, vpWidth: vp.width, title: `dial: ${mode} drag to the right, hold, release, snap back (${vp.name})` });
      // Condense from the word's right.
      const xr = Math.min(vp.width - 20, dbox.wordR - 30);
      const xl = Math.max(20, xr - (vp.mobile ? 330 : 420));
      const trigger2 = async () => {
        if (mode === 'mouse') {
          await page.mouse.move(xr, y); await page.mouse.down();
          for (let i = 1; i <= 14; i++) { await page.mouse.move(xr + ((xl - xr) * i) / 14, y); await page.waitForTimeout(20); }
          await page.waitForTimeout(250); await page.mouse.up();
        } else {
          await send('touchStart', xr);
          for (let i = 1; i <= 14; i++) { await send('touchMove', xr + ((xl - xr) * i) / 14); await page.waitForTimeout(20); }
          await page.waitForTimeout(250); await send('touchEnd', 0);
        }
      };
      await page.waitForTimeout(700);
      frames = await film(page, 1300, trigger2);
      await strip(thin(frames, 16), join(OUT, 'dial', `condense__${mode}__${vp.name}.png`), { cols: 4, cellW: vp.mobile ? 190 : 340, box, vpWidth: vp.width, title: `dial: ${mode} drag to the left, hold, release, snap back (${vp.name})` });
      if (mode === 'mouse') {
        // Keyboard: focus, steps, Home, End, Esc.
        await page.waitForTimeout(500);
        await page.focus('[data-sw-dial]');
        frames = await film(page, 900, async () => {
          for (const k of ['Shift+ArrowLeft', 'Shift+ArrowLeft', 'Home']) { await page.keyboard.press(k); await page.waitForTimeout(140); }
          await page.keyboard.press('End'); await page.waitForTimeout(140);
          await page.keyboard.press('Escape');
        });
        await strip(thin(frames, 12), join(OUT, 'dial', `keys__${vp.name}.png`), { cols: 4, cellW: vp.mobile ? 190 : 340, box, vpWidth: vp.width, title: `dial: keyboard (shift-left x2, Home, End, Esc) at ${vp.name}` });
      }
      await ctx.close();
      console.log('dial', vp.name, mode);
    }
  }
}

// -------------------------------------------------------------------- hint
if (ONLY.includes('hint')) {
  for (const vp of [VPS[0], VPS[4]]) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.mobile, hasTouch: !!vp.mobile, colorScheme: 'light', reducedMotion: 'no-preference' });
    await suppressPrompt(ctx);
    await ctx.addInitScript(() => { try { localStorage.setItem('scheme', 'light'); } catch {} });
    const page = await ctx.newPage();
    const cdp0 = await ctx.newCDPSession(page);
    await cdp0.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
    await page.goto(`${BASE}/t/swiss/`, { waitUntil: 'domcontentloaded' });
    const frames = await film(page, 3200, async () => { await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' }); });
    const box = await heroBox(page, vp);
    await strip(thin(frames, 20), join(OUT, 'hint', `hint__${vp.name}.png`), { cols: 5, cellW: vp.mobile ? 150 : 270, box, vpWidth: vp.width, title: `first-visit hint at ${vp.name}: 600 ms after the page lands, narrows, holds, returns` });
    const stored = await page.evaluate((k) => sessionStorage.getItem(k), HINT_KEY);
    // A second visit in the same session: no hint.
    await page.reload({ waitUntil: 'networkidle' });
    const again = await film(page, 2200, async () => {});
    const moved = new Set();
    await page.evaluate(() => {});
    console.log('hint', vp.name, 'stored', stored, 'frames first visit', frames.length, 'second visit frames', again.length);
    await ctx.close();
  }
}

// -------------------------------------------------------------------- swap
if (ONLY.includes('swap')) {
  for (const vp of [VPS[0], VPS[4]]) {
    // In-school swap with the dial mid-return: drag, release, click About within the hold.
    {
      const { ctx, page } = await open(vp, 'light', '/t/swiss/');
      const dbox = await page.evaluate(() => { const b = document.querySelector('[data-sw-dial]').getBoundingClientRect(); return { l: b.left, t: b.top, b: b.bottom }; });
      const y = (dbox.t + dbox.b) / 2;
      const x0 = vp.mobile ? 30 : dbox.l + 120;
      await page.mouse.move(x0, y); await page.mouse.down();
      for (let i = 1; i <= 10; i++) { await page.mouse.move(x0 + i * 30, y); await page.waitForTimeout(16); }
      const frames = await film(page, 1100, async () => {
        await page.mouse.up(); await page.waitForTimeout(60);
        await page.locator('nav a', { hasText: 'About' }).first().click();
      });
      await strip(thin(frames, 20), join(OUT, 'swap', `in-school__mid-return__${vp.name}.png`), { cols: 5, cellW: vp.mobile ? 150 : 270, vpWidth: vp.width, title: `in-school swap to About with the dial mid-return, ${vp.name}` });
      await ctx.close();
    }
    // Arrival from quiet through the real switcher.
    {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.mobile, hasTouch: !!vp.mobile, colorScheme: 'light', reducedMotion: 'no-preference' });
      await suppressPrompt(ctx);
      await ctx.addInitScript(() => { try { localStorage.setItem('scheme', 'light'); } catch {} });
      const page = await ctx.newPage();
      const cdp0 = await ctx.newCDPSession(page);
      await cdp0.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
      await page.goto(`${BASE}/t/quiet/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);
      const frames = await film(page, 3600, async () => {
        await page.evaluate(() => {
          const sw = document.querySelector('bdl-switcher');
          const btn = [...sw.shadowRoot.querySelectorAll('button, a')].find((b) => /swiss/i.test(b.getAttribute('data-theme') || b.getAttribute('aria-label') || b.textContent || ''));
          if (btn) btn.click(); else console.log('no swiss button');
        });
      });
      await strip(thin(frames, 24), join(OUT, 'swap', `arrival__quiet-to-swiss__${vp.name}.png`), { cols: 6, cellW: vp.mobile ? 120 : 220, vpWidth: vp.width, title: `arrival from quiet through the switcher, ${vp.name}; the hint is due 600 ms after it lands` });
      const stored = await page.evaluate((k) => sessionStorage.getItem(k), HINT_KEY);
      console.log('swap arrival', vp.name, 'hint stored after arrival:', stored);
      await ctx.close();
    }
    console.log('swap', vp.name);
  }
}
await browser.close();
