/**
 * Stage 6 wave 2, task 12: evidence for the bauhaus process diagram, unequal
 * doors, findable toys (pick-me beat, hover lift, phone swipe), footer join and
 * the questionnaire card fixes, on any frozen build.
 *
 *   node scripts/themes/snap.mjs --name s6-w2-t12 --reuse --port 4470 -- \
 *     env LABEL=after ONLY=sheets node scripts/themes/stage6/w2-t12-evidence.mjs
 *   (and --name stage6-base with LABEL=base for the before side)
 *
 * ONLY is a comma list of: sheets, footer, beat, hover, swipe, card, swap.
 * Output: scripts/themes/.out/stage6/w2/t12/<LABEL>/<section>/ (gitignored).
 * GPU Chromium, the renderer checked; reduced transparency forced to
 * no-preference; the portal prompt suppressed; the switcher hidden except in
 * the arrival film, which goes through the real switcher.
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const LABEL = process.env.LABEL || 'after';
const OUT = join(HERE, '..', '.out', 'stage6', 'w2', 't12', LABEL);
const BASE = process.env.BASE || process.env.SNAP_BASE || 'http://127.0.0.1:4470';
const ONLY = (process.env.ONLY || 'sheets').split(',');
for (const sub of ['sheets', 'footer', 'beat', 'hover', 'swipe', 'card', 'swap']) await mkdir(join(OUT, sub), { recursive: true });
const VPS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '1280', width: 1280, height: 800 },
  { name: '1024', width: 1024, height: 768 },
  { name: '820', width: 820, height: 1180, mobile: true },
  { name: '390', width: 390, height: 844, mobile: true },
];
const vp = (n) => VPS.find((v) => v.name === n);

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
async function open(v, scheme, path, opts = {}) {
  const ctx = await newCtx(v, scheme, opts);
  const page = await ctx.newPage();
  const cdp = await forceMedia(ctx, page);
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(opts.settle ?? 2400);
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
// Whole-page sheets of the four pages this task changes, at every review size, light and dark;
// plus the process band and the doors alone, which is where the changes are.
if (ONLY.includes('sheets')) {
  const pages = [['home', '/t/bauhaus/'], ['services', '/t/bauhaus/services/'], ['about', '/t/bauhaus/about/'], ['contact', '/t/bauhaus/contact/']];
  for (const v of VPS) for (const scheme of ['light', 'dark']) {
    const ctx = await newCtx(v, scheme);
    const page = await ctx.newPage();
    await forceMedia(ctx, page);
    for (const [id, path] of pages) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
      await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
      await page.evaluate(() => document.fonts.ready);
      // Settle every below-the-fold assembly: scroll the page through once.
      await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 90)); } scrollTo(0, 0); });
      await page.waitForTimeout(1800);
      await page.screenshot({ path: join(OUT, 'sheets', `${id}__${scheme}__${v.name}__full.png`), fullPage: true });
      const sel = id === 'services' ? '.process' : id === 'home' ? '.doors' : null;
      if (sel) await page.locator(sel).first().screenshot({ path: join(OUT, 'sheets', `${id}-${sel.slice(1)}__${scheme}__${v.name}.png`) });
    }
    await ctx.close();
    console.log('sheets', v.name, scheme);
  }
}

// ---------------------------------------------------------------- doors820
// Does 820 have room for the 7 and 5 split? The split forced on at 820 (and 780), against the stacked doors that ship.
if (ONLY.includes('doors820')) {
  for (const w of [820, 780]) for (const scheme of ['light', 'dark']) {
    const v = { name: String(w), width: w, height: 1180, mobile: true };
    const { ctx, page } = await open(v, scheme, '/t/bauhaus/', { settle: 600 });
    await page.addStyleTag({ content: '.door:nth-child(1){grid-column:span 7!important}.door:nth-child(2){grid-column:span 5!important}' });
    await page.waitForTimeout(300);
    await page.locator('.doors').screenshot({ path: join(OUT, 'sheets', `doors-split-forced__${scheme}__${w}.png`) });
    console.log('doors820', w, scheme, JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('.door')].map((d) => ({ w: Math.round(d.getBoundingClientRect().width), h: Math.round(d.getBoundingClientRect().height), scrollW: d.scrollWidth - d.clientWidth })))));
    await ctx.close();
  }
}

// ------------------------------------------------------------------ footer
// The join between the closing band and the footer, About, Services and Contact, light and dark, 1440 and 390.
if (ONLY.includes('footer')) {
  for (const v of [vp('1440'), vp('390')]) for (const scheme of ['light', 'dark']) {
    const ctx = await newCtx(v, scheme);
    const page = await ctx.newPage();
    await forceMedia(ctx, page);
    for (const [id, path] of [['about', '/t/bauhaus/about/'], ['services', '/t/bauhaus/services/'], ['contact', '/t/bauhaus/contact/']]) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
      await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 90)); } });
      await page.waitForTimeout(1600);
      const at = await page.evaluate(() => { const f = document.querySelector('.site-footer').getBoundingClientRect(); const cs = getComputedStyle(document.querySelector('.site-footer')); return { top: f.top + scrollY, border: cs.borderTopColor, bw: cs.borderTopWidth, bg: cs.backgroundColor }; });
      await page.evaluate((t) => scrollTo(0, Math.max(0, t - 260)), at.top);
      await page.waitForTimeout(200);
      await page.screenshot({ path: join(OUT, 'footer', `${id}__${scheme}__${v.name}.png`) });
      console.log('footer', id, scheme, v.name, JSON.stringify(at));
    }
    await ctx.close();
  }
}

// -------------------------------------------------------------------- beat
// The pick-me beat: when it starts (ms after the last assembly animation ends), how far the red square lifts
// (screen px), and that it never plays again on an in-school return. Home and Sent, 1440 and 390.
if (ONLY.includes('beat')) {
  for (const v of [vp('1440'), vp('390')]) for (const [id, path, svgSel] of [['home', '/t/bauhaus/', 'svg.poster'], ['sent', '/t/bauhaus/contact/sent/', 'svg.landed']]) {
    const ctx = await newCtx(v, 'light');
    // The sampler: every frame, the red square's top edge and the end of the last assembly animation.
    await ctx.addInitScript((sel) => {
      window.__beat = { samples: [], lastEnd: 0, base: null };
      const loop = () => {
        const svg = document.querySelector(sel);
        const el = svg && svg.querySelector('[data-pick-me]');
        if (el) {
          const top = el.getBoundingClientRect().top;
          const anims = svg.getAnimations({ subtree: true });
          const busy = anims.some((a) => a.playState !== 'finished' && a.playState !== 'idle' && !(a.effect && a.effect.getComputedTiming && a.effect.target === el && a.effect.getKeyframes().some((k) => 'translate' in k)));
          window.__beat.samples.push([Math.round(performance.now()), +top.toFixed(2), busy ? 1 : 0]);
        }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }, svgSel);
    const page = await ctx.newPage();
    await forceMedia(ctx, page);
    page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
    await page.goto(`${BASE}/t/bauhaus/`, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
    // Sent is reached by a full load here (the form posts there); Home is the first load.
    const navTo = async (p) => { if (p !== '/t/bauhaus/') { await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded' }); await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' }); } };
    await navTo(path);
    const f = await film(page, 4200, async () => { await page.reload({ waitUntil: 'domcontentloaded' }); await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' }); });
    const s = await page.evaluate(() => window.__beat.samples);
    // The beat is the first stretch after the build where the square's top moves.
    let lastBusy = -1;
    s.forEach((r, i) => { if (r[2]) lastBusy = i; });
    const rest = s[lastBusy + 1] ? s[lastBusy + 1][1] : s[s.length - 1][1];
    const after = s.slice(lastBusy + 1);
    const first = after.findIndex((r) => Math.abs(r[1] - rest) > 0.4);
    const tLanded = s[lastBusy] ? s[lastBusy][0] : 0;
    const tBeat = first >= 0 ? after[first][0] : null;
    const peak = after.reduce((m, r) => Math.max(m, rest - r[1]), 0);
    const over = after.reduce((m, r) => Math.min(m, rest - r[1]), 0);
    console.log('beat', id, v.name, JSON.stringify({ lastBusyAt: tLanded, beatStartsAt: tBeat, afterLandMs: tBeat === null ? null : tBeat - tLanded, peakLiftPx: +peak.toFixed(2), overshootPx: +(-over).toFixed(2), samples: s.length }));
    const box = await page.evaluate((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return { x: Math.max(0, r.left - 10), y: Math.max(0, r.top - 30), w: Math.min(innerWidth, r.width + 20), h: Math.min(innerHeight, r.height + 40) }; }, svgSel);
    // Frames around the beat: from 150 ms before it starts to 150 ms after it ends.
    const wall = f.frames.filter((r) => true);
    await strip(thin(wall, 30), join(OUT, 'beat', `${id}__${v.name}__whole-load.png`), { cols: 6, cellW: v.mobile ? 150 : 250, box, vpWidth: v.width, title: `${id} ${v.name}: load, build, then the one pick-me beat` });
    // In-school return: leave and come back, nothing plays again.
    if (id === 'home') {
      await page.evaluate(() => { window.__beat.samples.length = 0; });
      await page.locator('nav a', { hasText: /^About$/i }).first().click();
      await page.waitForTimeout(1500);
      await page.locator('a[href$="/t/bauhaus/"]').first().click();
      await page.waitForTimeout(5000);
      const again = await page.evaluate(() => { const s = window.__beat.samples; if (!s.length) return null; const mx = Math.max(...s.map((r) => r[1])), mn = Math.min(...s.map((r) => r[1])); return { n: s.length, range: +(mx - mn).toFixed(2) }; });
      console.log('beat', id, v.name, 'back on', await page.evaluate(() => location.pathname), 'with', await page.evaluate(() => document.querySelectorAll('svg.poster [data-loose]').length), 'loose shapes');
      console.log('beat', id, v.name, 'after an in-school return, samples and range of the square top (the build moves it; a beat would be 12px after it):', JSON.stringify(again));
      const rec = await page.evaluate(() => { const s = window.__beat.samples; let lb = -1; s.forEach((r, i) => { if (r[2]) lb = i; }); const a = s.slice(lb + 1); if (!a.length) return null; const rest = a[0][1]; return { afterBuildSamples: a.length, maxMove: +Math.max(...a.map((r) => Math.abs(r[1] - rest))).toFixed(2) }; });
      console.log('beat', id, v.name, 'return, after the rebuild finished:', JSON.stringify(rec));
    }
    await ctx.close();
  }
}

// ------------------------------------------------------------------- hover
if (ONLY.includes('hover')) {
  for (const scheme of ['light', 'dark']) {
    const v = vp('1440');
    const { ctx, page } = await open(v, scheme, '/t/bauhaus/', { dpr: 2, touch: false });
    const box = await page.evaluate(() => { const r = document.querySelector('svg.poster').getBoundingClientRect(); return { x: r.left - 12, y: r.top - 12, w: r.width + 24, h: r.height + 24 }; });
    const shot = (name) => page.screenshot({ path: join(OUT, 'hover', `${scheme}__${name}.png`), clip: { x: box.x, y: Math.max(0, box.y), width: box.w, height: Math.min(box.h, 900 - Math.max(0, box.y)) } });
    await page.mouse.move(5, 5);
    await shot('0-rest');
    const centre = async (label) => page.evaluate((l) => { const r = document.querySelector(`[aria-label^="${l}"]`).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }; }, label);
    const meas = async (label) => page.evaluate((l) => { const e = document.querySelector(`[aria-label^="${l}"]`); const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { top: +r.top.toFixed(2), left: +r.left.toFixed(2), translate: cs.translate, shadowOn: !!document.querySelector('.lshadow[data-on]') }; }, label);
    for (const [label, key] of [['Blue circle', 'circle'], ['Red square', 'square'], ['Yellow triangle', 'triangle']]) {
      await page.mouse.move(5, 5); await page.waitForTimeout(300);
      const before = await meas(label);
      const c = await centre(label);
      await page.mouse.move(c.x, c.y, { steps: 4 });
      await page.waitForTimeout(350);
      const during = await meas(label);
      await shot(`1-hover-${key}`);
      console.log('hover', scheme, key, 'dx,dy px', +(during.left - before.left).toFixed(2), +(during.top - before.top).toFixed(2), 'shadow on', during.shadowOn);
      await page.mouse.move(5, 5); await page.waitForTimeout(300);
      const gone = await meas(label);
      console.log('hover', scheme, key, 'after leaving: dy', +(gone.top - before.top).toFixed(2), 'shadow on', gone.shadowOn);
    }
    // Press on the square, then drag it away and let go.
    const c = await centre('Red square');
    await page.mouse.move(c.x, c.y, { steps: 3 }); await page.waitForTimeout(250);
    await page.mouse.down(); await page.waitForTimeout(250);
    await shot('2-press-square');
    for (let i = 1; i <= 8; i++) { await page.mouse.move(c.x - i * 22, c.y + i * 12); await page.waitForTimeout(16); }
    await shot('3-dragged-square');
    await page.mouse.up(); await page.waitForTimeout(160);
    await shot('4-released-mid-fall');
    await page.waitForTimeout(700);
    await shot('5-settled');
    await ctx.close();
  }
}

// ------------------------------------------------------------------- swipe
// Phones, 390: a vertical swipe starting on the hero circle scrolls the page and does not pick it up; a horizontal
// drag picks it up; a held press (200 ms) then moving up carries it and does not scroll. Home hero and Sent.
if (ONLY.includes('swipe')) {
  const v = vp('390');
  for (const [id, path, label] of [['home', '/t/bauhaus/', 'Blue circle'], ['sent', '/t/bauhaus/contact/sent/', 'Blue circle']]) {
    const { ctx, page, cdp } = await open(v, 'light', path, { settle: 3200 });
    const centre = () => page.evaluate((l) => { const r = document.querySelector(`[aria-label^="${l}"]`).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }; }, label);
    const state = () => page.evaluate((l) => { const e = document.querySelector(`[aria-label^="${l}"]`); return { scrollY: Math.round(scrollY), held: e.hasAttribute('data-held'), translate: e.style.translate || 'none' }; }, label);
    const send = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    const run = async (name, steps) => {
      await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(500);
      const c = await centre();
      const out = [];
      await page.evaluate(() => { window.__pe = []; if (!window.__peOn) { window.__peOn = true; for (const t of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'lostpointercapture']) addEventListener(t, (e) => window.__pe.push(`${t.replace('pointer', 'p-')}:${e.target.tagName}${e.cancelable ? '' : '!'}`), true); } });
      await send('touchStart', c.x, c.y);
      await steps(c, send, async () => out.push(await state()));
      await send('touchEnd', 0, 0);
      await page.waitForTimeout(600);
      const end = await state();
      const pe = await page.evaluate(() => { const o = {}; for (const k of window.__pe) o[k] = (o[k] || 0) + 1; return o; });
      console.log('swipe', id, name, 'pointer events', JSON.stringify(pe));
      console.log('swipe', id, name, JSON.stringify({ duringHeld: out.map((s) => s.held), duringTranslate: out.map((s) => s.translate), scrollYDuring: out.map((s) => s.scrollY), after: end }));
    };
    // 1. vertical swipe up on the circle (finger moves up, page scrolls down).
    await run('vertical-swipe', async (c, send, rec) => { for (let i = 1; i <= 8; i++) { await send('touchMove', c.x, c.y - i * 18); await page.waitForTimeout(18); } await rec(); });
    // 2. horizontal drag.
    await run('horizontal-drag', async (c, send, rec) => { for (let i = 1; i <= 8; i++) { await send('touchMove', c.x - i * 14, c.y + i); await page.waitForTimeout(18); } await rec(); });
    // 3. press 260 ms, then move up: carried, page stays.
    await run('press-then-up', async (c, send, rec) => { await page.waitForTimeout(260); for (let i = 1; i <= 8; i++) { await send('touchMove', c.x, c.y - i * 14); await page.waitForTimeout(18); } await rec(); });
    // 4. tap: nothing carried.
    await run('tap', async (c, send, rec) => { await page.waitForTimeout(60); await rec(); });
    await ctx.close();
  }
}

// -------------------------------------------------------------------- card
if (ONLY.includes('card')) {
  const measure = (page) => page.evaluate(() => {
    const card = document.querySelector('.qcard');
    const cr = card.getBoundingClientRect();
    const cs = getComputedStyle(card.querySelector('.qbody'));
    const inner = { l: cr.left + 2 + parseFloat(cs.paddingLeft), r: cr.right - 2 - parseFloat(cs.paddingRight) };
    const over = (sel) => [...card.querySelectorAll(sel)].map((e) => +(e.getBoundingClientRect().right - inner.r).toFixed(1)).reduce((m, x) => Math.max(m, x), -999);
    return { cardW: Math.round(cr.width), innerW: Math.round(inner.r - inner.l), colourRowOverInner: over('.qcolours .qbar'), shapeRowOverInner: over('.qshapes .qshape'), cardOverflowX: card.scrollWidth - card.clientWidth };
  });
  for (const w of [1440, 390, 375, 360]) {
    const v = { name: String(w), width: w, height: w >= 1024 ? 900 : 780, mobile: w < 900 };
    for (const scheme of w === 390 ? ['light', 'dark'] : ['light']) {
      const { ctx, page } = await open(v, scheme, '/t/bauhaus/about/', { settle: 800 });
      await page.locator('[data-quiz] .qcard').scrollIntoViewIfNeeded();
      await page.waitForTimeout(1500);
      const card = page.locator('[data-quiz] .qcard');
      const tag = `${scheme}__${w}`;
      console.log('card', tag, 'rest', JSON.stringify(await measure(page)));
      await card.screenshot({ path: join(OUT, 'card', `${tag}__0-empty.png`) });
      // Two colours given, so a used bar would show a marker.
      await page.locator('[data-shape="triangle"]').click();
      await page.locator('[data-pick="red"]').click();
      await page.waitForTimeout(500);
      await page.locator('[data-pick="blue"]').click();
      await page.locator('[data-shape="circle"]').click();
      await page.waitForTimeout(500);
      await card.screenshot({ path: join(OUT, 'card', `${tag}__1-two-colours-used.png`) });
      const used = await page.evaluate(() => [...document.querySelectorAll('.qbar')].map((b) => ({ cls: b.className, after: getComputedStyle(b.querySelector('.qswatch'), '::after').content })));
      console.log('card', tag, 'bars (no is-used class, no ::after):', JSON.stringify(used));
      // Reset, then "show the answer" on an empty form.
      await page.locator('[data-qagain]').click(); await page.waitForTimeout(400);
      const y0 = await page.evaluate(() => scrollY);
      await page.locator('[data-qshow]').click();
      await page.waitForTimeout(1800);
      const y1 = await page.evaluate(() => scrollY);
      const empty = await page.evaluate(() => ({ status: document.querySelector('[data-qstatus]').textContent, tallyVisible: [...document.querySelectorAll('[data-tally]')].some((e) => e.offsetParent !== null), tallyBlock: getComputedStyle(document.querySelector('.qtally')).display, house: !!document.querySelector('.qhouse').offsetParent, stamps: [...document.querySelectorAll('.qstamp')].filter((e) => getComputedStyle(e).display !== 'none').length }));
      console.log('card', tag, 'empty reveal', JSON.stringify(empty), 'scroll', y0, '->', y1);
      await card.screenshot({ path: join(OUT, 'card', `${tag}__2-empty-answer.png`) });
      // Filled, all wrong: still says none.
      await page.locator('[data-qagain]').click(); await page.waitForTimeout(500);
      for (const [s, c] of [['triangle', 'red'], ['square', 'blue'], ['circle', 'yellow']]) { await page.locator(`[data-shape="${s}"]`).click(); await page.locator(`[data-pick="${c}"]`).click(); await page.waitForTimeout(260); }
      const y2 = await page.evaluate(() => scrollY);
      await page.waitForTimeout(2600);
      const y3 = await page.evaluate(() => scrollY);
      console.log('card', tag, 'wrong fill status:', await page.locator('[data-qstatus]').textContent(), '| auto reveal scroll', y2, '->', y3);
      await card.screenshot({ path: join(OUT, 'card', `${tag}__3-all-wrong-none.png`) });
      // Filled with the answer: stamps on all three, measured against the shapes.
      await page.locator('[data-qagain]').click(); await page.waitForTimeout(500);
      for (const [s, c] of [['triangle', 'yellow'], ['square', 'red'], ['circle', 'blue']]) { await page.locator(`[data-shape="${s}"]`).click(); await page.locator(`[data-pick="${c}"]`).click(); await page.waitForTimeout(260); }
      await page.waitForTimeout(2800);
      const stamps = await page.evaluate(() => [...document.querySelectorAll('.qkey-item')].map((li) => {
        const sh = li.querySelector('.qkey-box svg:first-child path').getBoundingClientRect();
        const st = li.querySelector('.qstamp').getBoundingClientRect();
        const box = li.querySelector('.qkey-box').getBoundingClientRect();
        return { key: li.dataset.key, stampBottomLeft: [+(st.left - box.left).toFixed(1), +(st.bottom - box.top).toFixed(1)], boxSize: +box.width.toFixed(1), stamp: +st.width.toFixed(1), overlapsShapeBox: st.left < box.right && st.right > box.left && st.top < box.bottom && st.bottom > box.top };
      }));
      console.log('card', tag, 'stamps', JSON.stringify(stamps));
      await card.screenshot({ path: join(OUT, 'card', `${tag}__4-all-three.png`) });
      await ctx.close();
    }
  }
}

// -------------------------------------------------------------------- swap
// An arrival from quiet through the real switcher and an in-school swap (Home to Services, Services to Home),
// at 1440 and 390; compare the same strips from LABEL=base.
if (ONLY.includes('swap')) {
  for (const v of [vp('1440'), vp('390')]) {
    {
      const { ctx, page } = await open(v, 'light', '/t/bauhaus/', { settle: 1800 });
      const f = await film(page, 1300, async () => { await page.locator('nav a', { hasText: /^Services$/i }).first().click(); });
      await strip(thin(f.frames, 20), join(OUT, 'swap', `in-school__home-to-services__${v.name}.png`), { cols: 5, cellW: v.mobile ? 150 : 270, vpWidth: v.width, title: `in-school swap Home to Services (${v.name})` });
      await page.waitForTimeout(2200);
      const g = await film(page, 1300, async () => { await page.locator('a[href$="/t/bauhaus/"]').first().click(); });
      await strip(thin(g.frames, 20), join(OUT, 'swap', `in-school__services-to-home__${v.name}.png`), { cols: 5, cellW: v.mobile ? 150 : 270, vpWidth: v.width, title: `in-school swap Services to Home (${v.name})` });
      await ctx.close();
    }
    {
      const ctx = await newCtx(v, 'light');
      const page = await ctx.newPage();
      await forceMedia(ctx, page);
      await page.goto(`${BASE}/t/quiet/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);
      const f = await film(page, 3600, async () => {
        await page.evaluate(() => {
          const sw = document.querySelector('bdl-switcher');
          const btn = [...sw.shadowRoot.querySelectorAll('button, a')].find((b) => /bauhaus/i.test(b.getAttribute('data-theme') || b.getAttribute('aria-label') || b.textContent || ''));
          if (btn) btn.click(); else console.log('no bauhaus button');
        });
      });
      await strip(thin(f.frames, 24), join(OUT, 'swap', `arrival__quiet-to-bauhaus__${v.name}.png`), { cols: 6, cellW: v.mobile ? 120 : 220, vpWidth: v.width, title: `arrival from quiet through the switcher, ${v.name}` });
      // Then to Services, in school.
      await page.waitForTimeout(800);
      const g = await film(page, 3000, async () => { await page.locator('nav a', { hasText: /^Services$/i }).first().click(); });
      await strip(thin(g.frames, 24), join(OUT, 'swap', `arrival-then-services__${v.name}.png`), { cols: 6, cellW: v.mobile ? 120 : 220, vpWidth: v.width, title: `then Services in school, ${v.name}` });
      await ctx.close();
    }
    console.log('swap', v.name);
  }
}
await browser.close();
