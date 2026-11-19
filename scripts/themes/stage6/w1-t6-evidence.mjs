/**
 * Stage 6 wave 1, task 6 (swiss: the timetable, the typophoto, About's field):
 * the evidence pass. Serve a build (snap) or the dev server and run sections
 * by name.
 *
 *   node scripts/themes/snap.mjs --name s6-w1-t6 --reuse --port 4470 -- node scripts/themes/stage6/w1-t6-evidence.mjs
 *   LABEL=dev BASE=http://127.0.0.1:4470 ONLY=sheets PAGES=services,about node scripts/themes/stage6/w1-t6-evidence.mjs
 *
 * GPU Chromium (--use-angle=d3d11 --enable-gpu), renderer checked through
 * WEBGL_debug_renderer_info; prefers-reduced-transparency forced to
 * no-preference; the portal prompt suppressed; the dial's first-visit hint
 * marked seen. Sections (ONLY=a,b,...):
 *   sheets   whole-page sheets of Home, Services and About at 1440, 1280,
 *            1024, 820 and 390, light and dark (PAGES= narrows them);
 *   crops    the bands up close: the timetable, Home's lab band and About's
 *            field, at 1440, 820 and 390, light and dark;
 *   measure  numbers: each numeral's ink against its title's column line, row
 *            heights against the 24px line, the About foot gap, image weight;
 *   swap     an in-school swap Home to Services and an arrival from quiet, at
 *            1440 and 390, frame by frame (timestamped strips).
 * Output: scripts/themes/.out/stage6/w1/t6/<label>/<section>/
 */
import { chromium } from 'playwright';
import sharp from 'sharp';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '.out', 'stage6', 'w1', 't6');
const LABEL = process.env.LABEL || 'after';
const OUT = join(ROOT, LABEL);
const BASE = process.env.BASE || process.env.SNAP_BASE || 'http://127.0.0.1:4470';
const ONLY = (process.env.ONLY || 'sheets,crops,measure,swap').split(',');
const PAGES = (process.env.PAGES || 'home,services,about').split(',');
for (const sub of ['sheets', 'crops', 'measure', 'swap']) await mkdir(join(OUT, sub), { recursive: true });
const VPS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '1280', width: 1280, height: 800 },
  { name: '1024', width: 1024, height: 768 },
  { name: '820', width: 820, height: 1180, mobile: true },
  { name: '390', width: 390, height: 844, mobile: true },
];
const HINT_KEY = 'bdl-swiss-dial-hint';
const PATHS = { home: '/t/swiss/', services: '/t/swiss/services/', about: '/t/swiss/about/' };

const browser = await chromium.launch({ headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'] });
{
  const p = await browser.newPage();
  const renderer = await p.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); });
  await p.close();
  console.log('renderer:', renderer);
  if (/swiftshader|llvmpipe|software/i.test(renderer)) throw new Error('software renderer: evidence invalid');
  await writeFile(join(OUT, 'renderer.txt'), `${renderer}\n`);
}

async function open(vp, scheme, path, { dpr = 1 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: dpr, isMobile: !!vp.mobile, hasTouch: !!vp.mobile, colorScheme: scheme, reducedMotion: 'no-preference' });
  await suppressPrompt(ctx);
  await ctx.addInitScript(([s, key]) => { try { localStorage.setItem('scheme', s); sessionStorage.setItem(key, '1'); } catch {} }, [scheme, HINT_KEY]);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  await settle(page, path);
  return { ctx, page, cdp };
}

/** Load a page, hide the switcher, force every lazy image, wait for fonts. */
async function settle(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'bdl-switcher,astro-dev-toolbar{display:none!important}' });
  await page.evaluate(async () => {
    document.querySelectorAll('img[loading=lazy]').forEach((i) => { i.loading = 'eager'; });
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))));
    // Decode off-screen images too, or a full-page shot paints them late.
    await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
  });
  await page.waitForTimeout(350);
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
const thin = (frames, n) => (frames.length <= n ? frames : Array.from({ length: n }, (_, i) => frames[Math.round((i * (frames.length - 1)) / (n - 1))]));

async function strip(frames, file, { cols = 4, cellW = 360, title = '' }) {
  const images = await Promise.all(frames.map((f) => loadImage(Buffer.from(f.data, 'base64'))));
  const cellH = Math.round((images[0].height / images[0].width) * cellW);
  const PAD = 10, CAP = 24, HEAD = title ? 30 : 0;
  const rows = Math.ceil(images.length / cols);
  const canvas = createCanvas(PAD + cols * (cellW + PAD), HEAD + PAD + rows * (cellH + CAP + PAD));
  const c = canvas.getContext('2d');
  c.fillStyle = '#1b1b1d'; c.fillRect(0, 0, canvas.width, canvas.height);
  c.font = '600 14px sans-serif'; c.textBaseline = 'middle'; c.fillStyle = '#e8e6e1';
  if (title) c.fillText(title, PAD, HEAD / 2 + 2);
  images.forEach((img, i) => {
    const x = PAD + (i % cols) * (cellW + PAD), y = HEAD + PAD + Math.floor(i / cols) * (cellH + CAP + PAD);
    c.drawImage(img, 0, 0, img.width, img.height, x, y, cellW, cellH);
    c.fillStyle = '#e8e6e1';
    c.fillText(frames[i].ms < 0 ? 'before' : `+${frames[i].ms} ms`, x, y + cellH + CAP / 2);
  });
  await writeFile(file, await canvas.encode('png'));
}

// ------------------------------------------------------------------ sheets
if (ONLY.includes('sheets')) {
  for (const vp of VPS) for (const scheme of ['light', 'dark']) {
    const { ctx, page } = await open(vp, scheme, '/t/swiss/');
    for (const id of PAGES) {
      await settle(page, PATHS[id]);
      await page.screenshot({ path: join(OUT, 'sheets', `${id}__${scheme}__${vp.name}__full.png`), fullPage: true });
    }
    await ctx.close();
    console.log('sheets', vp.name, scheme);
  }
}

// ------------------------------------------------------------------- crops
if (ONLY.includes('crops')) {
  const targets = [['services', '.process'], ['home', '.lab-wrap'], ['about', '.manifesto-wrap']];
  for (const vp of [VPS[0], VPS[3], VPS[4]]) for (const scheme of ['light', 'dark']) {
    for (const [id, sel] of targets) {
      const { ctx, page } = await open(vp, scheme, PATHS[id]);
      const box = await page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { y: r.top + scrollY, h: r.height }; }, sel);
      await page.screenshot({ path: join(OUT, 'crops', `${id}__${scheme}__${vp.name}.png`), fullPage: true, clip: { x: 0, y: Math.max(0, box.y - 20), width: vp.width, height: box.h + 40 } });
      await ctx.close();
    }
  }
  console.log('crops done');
}

// ----------------------------------------------------------------- measure
if (ONLY.includes('measure')) {
  const report = {};
  for (const vp of VPS) {
    const { ctx, page } = await open(vp, 'light', PATHS.services, { dpr: 2 });
    // Numeral ink against the title's left edge, and the ink's own height.
    const rows = await page.evaluate(() => [...document.querySelectorAll('.step')].map((s) => {
      const r = (el) => el.getBoundingClientRect();
      const n = s.querySelector('.num'), t = s.querySelector('.step-title'), b = s.querySelector('.step-body');
      const cs = getComputedStyle(n);
      return { step: r(s).height, num: { x: r(n).left, y: r(n).top + scrollY, h: r(n).height, fs: parseFloat(cs.fontSize), w: r(n).width }, title: { x: r(t).left, y: r(t).top + scrollY }, body: { x: r(b).left, y: r(b).top + scrollY, h: r(b).height }, u: 24 };
    }));
    const inks = [];
    const frameLeft = await page.evaluate(() => document.querySelector('.process').getBoundingClientRect().left);
    const inkOf = async (clip, dark = 100) => {
      const buf = await page.screenshot({ fullPage: true, clip });
      const { data, info } = await sharp(buf).greyscale().raw().toBuffer({ resolveWithObject: true });
      let l = info.width, r = 0, t = info.height, b = 0;
      for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[y * info.width + x] < dark) { if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > b) b = y; }
      return { l: clip.x + l / 2, r: clip.x + r / 2, t: clip.y + t / 2, b: clip.y + (b + 1) / 2 };
    };
    for (let i = 0; i < rows.length; i++) {
      const n = rows[i].num, t = rows[i].title;
      // The numeral's own line box only (the rule above the row is outside it), widened to the left of the frame.
      const ni = await inkOf({ x: Math.max(0, n.x - 30), y: n.y, width: Math.min(vp.width - Math.max(0, n.x - 30), n.w + 30), height: n.h });
      const ti = await inkOf({ x: t.x - 4, y: t.y - 4, width: 120, height: 32 });
      inks.push({ inkLeft: +ni.l.toFixed(1), inkRight: +ni.r.toFixed(1), inkTop: +ni.t.toFixed(1), inkBottom: +ni.b.toFixed(1), titleInkTop: +ti.t.toFixed(1), titleInkLeft: +ti.l.toFixed(1) });
    }
    report[vp.name] = rows.map((r, i) => ({ row: i + 1, stepHeightLines: +(r.step / 24).toFixed(3), fs: +r.num.fs.toFixed(1), numBoxH: r.num.h, titleX: +r.title.x.toFixed(1), bodyX: +r.body.x.toFixed(1), frameLeft, ...inks[i], numInkLeftMinusFrame: +(inks[i].inkLeft - frameLeft).toFixed(2), numInkTopMinusTitleInkTop: +(inks[i].inkTop - inks[i].titleInkTop).toFixed(1), inkHeightLines: +((inks[i].inkBottom - inks[i].inkTop) / 24).toFixed(2) }));
    await ctx.close();
    // The page must not scroll sideways.
    const ctx2 = await open(vp, 'light', PATHS.about);
    report[vp.name + '__about'] = await ctx2.page.evaluate(() => {
      const m = document.querySelector('.manifesto').getBoundingClientRect();
      const t = document.querySelector('.manifesto-text').getBoundingClientRect();
      const c = document.querySelector('.manifesto .cta').getBoundingClientRect();
      const i = document.querySelector('.field-img img').getBoundingClientRect();
      return { sw: document.documentElement.scrollWidth, iw: innerWidth, field: { top: m.top + scrollY, h: m.height, bottom: m.bottom + scrollY }, text: { top: t.top + scrollY, bottom: t.bottom + scrollY }, cta: { top: c.top + scrollY, bottom: c.bottom + scrollY }, img: { left: i.left, right: i.right, top: i.top + scrollY, bottom: i.bottom + scrollY }, footGap: m.bottom + scrollY - (c.bottom + scrollY) };
    });
    await ctx2.ctx.close();
    const ctx3 = await open(vp, 'light', PATHS.home);
    report[vp.name + '__home'] = await ctx3.page.evaluate(() => {
      const h = document.querySelector('.lab-head').getBoundingClientRect();
      const p = document.querySelector('.lab-photo').getBoundingClientRect();
      return { sw: document.documentElement.scrollWidth, iw: innerWidth, head: { top: h.top + scrollY, h: h.height }, photo: { left: p.left, right: p.right, top: p.top + scrollY, bottom: p.bottom + scrollY }, img: document.querySelector('.lab-photo img').currentSrc.split('/').pop() };
    });
    await ctx3.ctx.close();
    console.log('measure', vp.name);
  }
  await writeFile(join(OUT, 'measure', 'measure.json'), JSON.stringify(report, null, 1));
}

// -------------------------------------------------------------------- swap
if (ONLY.includes('swap')) {
  for (const vp of [VPS[0], VPS[4]]) {
    // An in-school swap, Home to Services, through the nav link.
    {
      const { ctx, page } = await open(vp, 'light', PATHS.home);
      const frames = await film(page, 1100, async () => {
        const link = page.locator('a[href="/t/swiss/services/"]:visible').first();
        await link.click();
      });
      await strip(thin(frames, 12), join(OUT, 'swap', `inschool__home-to-services__${vp.name}.png`), { cols: 4, cellW: vp.mobile ? 190 : 340, title: `in-school swap Home to Services (${vp.name})` });
      await ctx.close();
    }
    // An arrival from quiet through the real switcher.
    {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.mobile, hasTouch: !!vp.mobile, colorScheme: 'light', reducedMotion: 'no-preference' });
      await suppressPrompt(ctx);
      await ctx.addInitScript(([key]) => { try { sessionStorage.setItem(key, '1'); } catch {} }, [HINT_KEY]);
      const page = await ctx.newPage();
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
      await page.goto(`${BASE}/t/quiet/services/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      // Open the portal's dialog first (not filmed), then film the choice of Swiss.
      await page.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('.open').click());
      await page.waitForTimeout(700);
      const frames = await film(page, 1500, async () => {
        await page.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('a[data-school="swiss"]').click());
      });
      await strip(thin(frames, 12), join(OUT, 'swap', `arrival__quiet-to-swiss__${vp.name}.png`), { cols: 4, cellW: vp.mobile ? 190 : 340, title: `arrival quiet to swiss, Services (${vp.name})` });
      await ctx.close();
    }
    console.log('swap', vp.name);
  }
}

await browser.close();
