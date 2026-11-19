/**
 * Stage 6 wave 1, task 2 (glass R1 part 1: crisp backdrop, clear material):
 * the evidence pass. Run once against the snap of the commit before the task
 * and once against the task's own snap, then compare.
 *
 *   LABEL=before node scripts/themes/snap.mjs --name s6-w1-t2-before --reuse --port 4470 -- node scripts/themes/stage6/w1-t2-evidence.mjs
 *   LABEL=after  node scripts/themes/snap.mjs --name s6-w1-t2 --reuse --port 4470 -- node scripts/themes/stage6/w1-t2-evidence.mjs
 *   COMPARE=before,after node scripts/themes/stage6/w1-t2-evidence.mjs
 *
 * What it records (GPU Chromium, renderer checked; prefers-reduced-
 * transparency forced to no-preference; portal prompt suppressed; reduced
 * motion emulated so orbs hold still between the paired shots):
 *   sheets/   whole-page sheets at 1440, 1280, 1024, 820, 390, both schemes,
 *             plus viewport frames at every screen-height scroll offset at
 *             1440 and 390 (the fixed wallpaper paints only the top viewport
 *             of a full-page shot, so glass is judged from these);
 *   frost/    Home at 1440 with the Control Centre's Frost slider at 0 and
 *             100 (driven through the real range input), both schemes;
 *   boundary/ glass beside vaporwave, Home, light, 1440, top viewport;
 *   metrics.json:
 *     detail   mean absolute Laplacian (4-neighbour, luma) of the hero
 *              pane's inner box with the pane hidden (open wallpaper and
 *              orbs) and shown (frosted), text hidden in both; also the
 *              whole viewport with every pane and all content hidden;
 *     hue      light only: for every .glass pane in each viewport frame at
 *              1440, the chroma-weighted circular mean hue of its inner box
 *              shown vs hidden (the wallpaper behind it), and the gap;
 *     frost    mean absolute per-channel change (0 to 255) over the hero
 *              pane's inner box between Frost 0 and Frost 100, text hidden.
 * Output: scripts/themes/.out/stage6/w1/t2/<label>/
 */
import { chromium } from 'playwright';
import sharp from 'sharp';
import { writeFile, mkdir, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '.out', 'stage6', 'w1', 't2');

async function diffShare(a, b) {
  const A = await sharp(a).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const B = await sharp(b).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  if (A.info.width !== B.info.width || A.info.height !== B.info.height) return { size: `${A.info.width}x${A.info.height} vs ${B.info.width}x${B.info.height}` };
  let n = 0;
  for (let i = 0; i < A.data.length; i += 4) {
    const d = Math.max(Math.abs(A.data[i] - B.data[i]), Math.abs(A.data[i + 1] - B.data[i + 1]), Math.abs(A.data[i + 2] - B.data[i + 2]));
    if (d > 2) n++;
  }
  return { share: +(n / (A.data.length / 4)).toFixed(4) };
}

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
  const res = {};
  for (const sub of ['sheets', 'frost', 'boundary']) {
    await mkdir(join(out, sub), { recursive: true });
    const files = (await readdir(join(ROOT, a, sub))).filter((f) => f.endsWith('.png'));
    for (const f of files) {
      const pa = join(ROOT, a, sub, f), pb = join(ROOT, b, sub, f);
      try {
        res[`${sub}/${f}`] = await diffShare(pa, pb);
        await sideBySide(pa, pb, join(out, sub, f));
      } catch (e) { res[`${sub}/${f}`] = { error: String(e).split('\n')[0] }; }
    }
  }
  await writeFile(join(out, 'compare.json'), JSON.stringify(res, null, 2));
  console.log(`${Object.keys(res).length} pairs written to ${out}`);
  process.exit(0);
}

const LABEL = process.env.LABEL || 'run';
const OUT = join(ROOT, LABEL);
for (const sub of ['sheets', 'frost', 'boundary', 'probe']) await mkdir(join(OUT, sub), { recursive: true });
const base = process.env.SNAP_BASE || 'http://127.0.0.1:4470';
const ONLY = (process.env.ONLY || 'sheets,metrics,frost,boundary').split(',');
const browser = await chromium.launch({ headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'] });
const metrics = { label: LABEL, base };
{
  const p = await browser.newPage();
  const renderer = await p.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); });
  await p.close();
  console.log('renderer:', renderer);
  if (/swiftshader|llvmpipe|software/i.test(renderer)) throw new Error('software renderer: evidence invalid');
  metrics.renderer = renderer;
}

async function contextFor(w, h, scheme) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, reducedMotion: 'reduce' });
  await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
  await suppressPrompt(context);
  await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  return { context, page };
}

async function open(page, path, school = 'glassmorphism') {
  await page.goto(`${base}/t/${school}/${path}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  if (!path && school === 'glassmorphism') await page.waitForFunction(() => document.querySelector('.lens-canvas')?.style.visibility === 'visible', null, { timeout: 9000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

/** Raw RGB of a viewport-space rect from a fresh screenshot. */
async function grab(page, r) {
  const buf = await page.screenshot({ clip: { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.w), height: Math.round(r.h) } });
  return sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
}

function laplacian({ data, info }) {
  const { width: W, height: H } = info;
  const L = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) L[i] = 0.2126 * data[i * 3] + 0.7152 * data[i * 3 + 1] + 0.0722 * data[i * 3 + 2];
  let s = 0, n = 0;
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    s += Math.abs(4 * L[i] - L[i - 1] - L[i + 1] - L[i - W] - L[i + W]);
    n++;
  }
  return +(s / n).toFixed(3);
}

/* Fix round 1: besides the mean, the share of pixels that are themselves
   mauve to violet (hue 255-345, chroma at least 0.06) and the mean's
   resultant strength R (0 to 1). A box that is half blue and half warm has
   an R near 0.2, and its mean hue lands between the two (about 290) whether
   or not a single pixel is mauve; the mauve share says whether the frost
   actually made any. */
function hueOf({ data }) {
  let sx = 0, sy = 0, sc = 0, n = 0, mauve = 0;
  for (let i = 0; i < data.length; i += 3) {
    const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), c = mx - mn;
    n++;
    if (c < 1e-6) continue;
    let h;
    if (mx === r) h = ((g - b) / c) % 6; else if (mx === g) h = (b - r) / c + 2; else h = (r - g) / c + 4;
    const hd = ((h * 60) % 360 + 360) % 360;
    if (c >= 0.06 && hd >= 255 && hd < 345) mauve++;
    h *= Math.PI / 3;
    sx += c * Math.cos(h); sy += c * Math.sin(h); sc += c;
  }
  let deg = (Math.atan2(sy, sx) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return { hue: +deg.toFixed(1), chroma: +(sc / n).toFixed(3), R: +(Math.hypot(sx, sy) / (sc || 1)).toFixed(2), mauve: +(mauve / n).toFixed(3) };
}

function meanAbs(a, b) {
  let s = 0;
  for (let i = 0; i < a.data.length; i++) s += Math.abs(a.data[i] - b.data[i]);
  return +(s / a.data.length).toFixed(2);
}

const HIDE_TEXT = `[data-theme='glassmorphism'] :is(.glass, .glass-strong) > * { visibility: hidden !important; }`;

async function innerBox(page, sel, inset = 36) {
  return page.evaluate(([sel, inset]) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const x = Math.max(0, r.left + inset), y = Math.max(0, r.top + inset);
    const w = Math.min(innerWidth, r.right - inset) - x, h = Math.min(innerHeight, r.bottom - inset) - y;
    return w > 40 && h > 40 ? { x, y, w, h } : null;
  }, [sel, inset]);
}

const SIZES = [[1440, 900], [1280, 800], [1024, 768], [820, 1180], [390, 844]];
const PAGES = ['', 'about/', 'services/', 'contact/'];

if (ONLY.includes('sheets')) {
  for (const scheme of ['light', 'dark']) {
    for (const [w, h] of SIZES) {
      const { context, page } = await contextFor(w, h, scheme);
      for (const path of PAGES) {
        const tag = `${(path || 'home').replace(/\//g, '')}__${scheme}__${w}`;
        await open(page, path);
        await page.screenshot({ path: join(OUT, 'sheets', `${tag}__full.png`), fullPage: true });
        const total = await page.evaluate(() => document.documentElement.scrollHeight);
        const offsets = w === 1440 || w === 390 ? [] : [0];
        if (!offsets.length) for (let y = 0; y < total - 40; y += h) offsets.push(y);
        for (const y of offsets) {
          await page.evaluate((y) => scrollTo(0, y), y);
          await page.waitForTimeout(450);
          await page.screenshot({ path: join(OUT, 'sheets', `${tag}__vp${String(y).padStart(5, '0')}.png`) });
        }
      }
      await context.close();
      console.log('sheets', scheme, w);
    }
  }
}

if (ONLY.includes('metrics')) {
  metrics.detail = {};
  metrics.hue = {};
  for (const scheme of ['light', 'dark']) {
    const { context, page } = await contextFor(1440, 900, scheme);
    await open(page, '');
    const hide = await page.addStyleTag({ content: HIDE_TEXT });
    const box = await innerBox(page, '.window');
    const shown = await grab(page, box);
    await page.evaluate(() => { document.querySelector('.window').style.visibility = 'hidden'; });
    await page.waitForTimeout(300);
    const open_ = await grab(page, box);
    await page.evaluate(() => { document.querySelector('.window').style.visibility = ''; });
    await page.addStyleTag({ content: `[data-theme='glassmorphism'] :is(.glass, .glass-strong, .surface-solid, .chip, .btn, .lens-host, .lens-poster, header, footer, bdl-switcher) { visibility: hidden !important; }` });
    await page.waitForTimeout(300);
    const wall = await grab(page, { x: 0, y: 0, w: 1440, h: 900 });
    await sharp(wall.data, { raw: { width: wall.info.width, height: wall.info.height, channels: 3 } }).png().toFile(join(OUT, 'probe', `open-wallpaper__${scheme}.png`));
    metrics.detail[scheme] = { heroOpen: laplacian(open_), heroFrosted: laplacian(shown), viewportOpen: laplacian(wall), box };
    await hide.evaluate((n) => n.remove()).catch(() => {});
    await context.close();
    console.log('detail', scheme, JSON.stringify(metrics.detail[scheme]));
  }
  // Pane hue vs the wallpaper behind it, light, 1440, every page, every screen.
  for (const path of PAGES) {
    const { context, page } = await contextFor(1440, 900, 'light');
    await open(page, path);
    await page.addStyleTag({ content: HIDE_TEXT });
    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    const rows = [];
    for (let y = 0; y < total - 40; y += 900) {
      await page.evaluate((y) => scrollTo(0, y), y);
      await page.waitForTimeout(400);
      const n = await page.evaluate(() => document.querySelectorAll('main .glass, main .surface-solid.settings-pane').length);
      for (let i = 0; i < n; i++) {
        const sel = `main :is(.glass, .surface-solid.settings-pane) >> nth=${i}`;
        const info = await page.evaluate((i) => {
          const el = document.querySelectorAll('main .glass, main .surface-solid.settings-pane')[i];
          el.dataset.t2probe = String(i);
          const r = el.getBoundingClientRect();
          const x = Math.max(0, r.left + 24), yy = Math.max(0, r.top + 24);
          const w = Math.min(innerWidth, r.right - 24) - x, h = Math.min(innerHeight, r.bottom - 24) - yy;
          return { cls: el.className, box: w > 40 && h > 40 ? { x, y: yy, w, h } : null };
        }, i);
        if (!info.box) continue;
        const s = hueOf(await grab(page, info.box));
        await page.evaluate((i) => { document.querySelector(`[data-t2probe="${i}"]`).style.visibility = 'hidden'; }, i);
        await page.waitForTimeout(200);
        const o = hueOf(await grab(page, info.box));
        await page.evaluate((i) => { document.querySelector(`[data-t2probe="${i}"]`).style.visibility = ''; }, i);
        let gap = Math.abs(s.hue - o.hue); if (gap > 180) gap = 360 - gap;
        rows.push({ scroll: y, pane: info.cls.replace(/astro-\w+/g, '').trim(), pane_hue: s.hue, pane_chroma: s.chroma, pane_R: s.R, pane_mauve: s.mauve, behind_hue: o.hue, behind_chroma: o.chroma, behind_R: o.R, behind_mauve: o.mauve, gap: +gap.toFixed(1) });
        void sel;
      }
    }
    metrics.hue[path || 'home'] = rows;
    await context.close();
    console.log('hue', path || 'home', rows.map((r) => `${r.pane.split(' ')[0]}@${r.scroll}:${r.pane_hue}/${r.behind_hue}`).join(' '));
  }
}

if (ONLY.includes('frost')) {
  metrics.frost = {};
  for (const scheme of ['light', 'dark']) {
    const { context, page } = await contextFor(1440, 900, scheme);
    await open(page, '');
    const shots = {};
    for (const v of ['0', '100']) {
      await page.locator('.cc-frost').fill(v);
      await page.waitForTimeout(900);
      await page.screenshot({ path: join(OUT, 'frost', `home__${scheme}__frost${v}.png`) });
      const hide = await page.addStyleTag({ content: HIDE_TEXT });
      await page.waitForTimeout(200);
      shots[v] = await grab(page, await innerBox(page, '.window'));
      await hide.evaluate((n) => n.remove());
    }
    const a = shots['0'].data, b = shots['100'].data;
    let over8 = 0;
    for (let i = 0; i < a.length; i += 3) if (Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])) > 8) over8++;
    metrics.frost[scheme] = { heroMeanAbs: meanAbs(shots['0'], shots['100']), shareOver8: +(over8 / (a.length / 3)).toFixed(3) };
    await context.close();
    console.log('frost', scheme, JSON.stringify(metrics.frost[scheme]));
  }
}

if (ONLY.includes('boundary')) {
  const shots = [];
  for (const school of ['glassmorphism', 'vaporwave']) {
    const { context, page } = await contextFor(1440, 900, 'light');
    await open(page, '', school);
    const f = join(OUT, 'boundary', `${school}__light__1440.png`);
    await page.screenshot({ path: f });
    shots.push(f);
    await context.close();
  }
  await sideBySide(shots[0], shots[1], join(OUT, 'boundary', 'glass-vs-vaporwave__light__1440.png'), 1440);
}

if (Object.keys(metrics).length > 3) await writeFile(join(OUT, `metrics${ONLY.length < 4 ? '-' + ONLY.join('-') : ''}.json`), JSON.stringify(metrics, null, 2));
await browser.close();
