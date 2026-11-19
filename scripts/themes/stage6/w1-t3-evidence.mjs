/**
 * Stage 6 wave 1, task 3 (glass R1 part 2: the bent rim, light that moves,
 * the header, the switch, the tablet Control Centre, About and Contact):
 * the evidence pass. Serve a snap, then run sections by name.
 *
 *   node scripts/themes/snap.mjs --name s6-w1-t3 --reuse --port 4470 -- node scripts/themes/stage6/w1-t3-evidence.mjs
 *   LABEL=before ONLY=sheets node scripts/themes/snap.mjs --name s6-w1-t2-r1 --reuse --port 4470 -- node scripts/themes/stage6/w1-t3-evidence.mjs
 *   COMPARE=before,after node scripts/themes/stage6/w1-t3-evidence.mjs
 *
 * GPU Chromium (--use-angle=d3d11 --enable-gpu), renderer checked through
 * WEBGL_debug_renderer_info; prefers-reduced-transparency forced to
 * no-preference; the portal prompt suppressed. Sections (ONLY=a,b,...):
 *   sheets   whole-page sheets at 1440, 1280, 1024, 820, 390, both schemes,
 *            reduced motion emulated so orbs hold still between the paired
 *            shots, plus viewport frames at every screen-height offset at
 *            1440 and 390 (the fixed wallpaper paints only the top viewport
 *            of a full-page shot);
 *   rim      the rim band on and off (fx.ts's layers stripped, the pane's
 *            own CSS frost back) on Home's window corner and Services' head
 *            card at 1440, both schemes, text hidden, with the detail
 *            (mean |Laplacian|) inside the band;
 *   cursor   films: a cursor pass over Home and Services at 1440, both
 *            schemes (the rim light and highlight follow, orbs ease away);
 *   header   films: a scroll under the header at 1440 and 390, both schemes;
 *   tablet   Home's Control Centre at 820 (and 1024 for reference), both
 *            schemes, Clear and Tinted;
 *   pages    About and Contact at 820 and 1440, both schemes: viewport
 *            frames, and About's gap from the title's ink to the reading pane;
 *   trace    GPU cost at 390: a Chrome trace of a scripted scroll on each
 *            page with the rim layers and without, the GPU main thread's
 *            busy time per frame, and per pane on screen.
 * Output: scripts/themes/.out/stage6/w1/t3/<label>/
 */
import { chromium } from 'playwright';
import sharp from 'sharp';
import { writeFile, mkdir, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '.out', 'stage6', 'w1', 't3');

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
  const files = (await readdir(join(ROOT, a, 'sheets'))).filter((f) => f.endsWith('__full.png'));
  for (const f of files) {
    try { await sideBySide(join(ROOT, a, 'sheets', f), join(ROOT, b, 'sheets', f), join(out, f)); } catch (e) { console.log(f, String(e).split('\n')[0]); }
  }
  console.log(`${files.length} pairs written to ${out}`);
  process.exit(0);
}

const LABEL = process.env.LABEL || 'after';
const OUT = join(ROOT, LABEL);
for (const sub of ['sheets', 'rim', 'films', 'tablet', 'pages']) await mkdir(join(OUT, sub), { recursive: true });
const base = process.env.SNAP_BASE || 'http://127.0.0.1:4470';
const ONLY = (process.env.ONLY || 'sheets,rim,cursor,header,tablet,pages,trace').split(',');
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

async function contextFor(w, h, scheme, opts = {}) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, reducedMotion: opts.reduce ? 'reduce' : 'no-preference', deviceScaleFactor: opts.dsf || 1, isMobile: !!opts.mobile, hasTouch: !!opts.mobile });
  await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
  await suppressPrompt(context);
  await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  return { context, page, cdp };
}

async function open(page, path) {
  await page.goto(`${base}/t/glassmorphism/${path}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  if (!path) await page.waitForFunction(() => document.querySelector('.lens-canvas')?.style.visibility === 'visible', null, { timeout: 9000 }).catch(() => {});
  // The rim layers land one pane per idle slot after arrival.
  await page.waitForFunction(() => {
    const panes = document.querySelectorAll('.glass, .glass-strong').length;
    const rims = document.querySelectorAll('.glass-rim').length;
    return rims === 0 ? !document.querySelector('.glass') : rims >= panes;
  }, null, { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(800);
}

const HIDE_TEXT = `[data-theme='glassmorphism'] :is(.glass, .glass-strong) > :not(.glass-rim, .glass-frost) { visibility: hidden !important; }`;
/** The largest cursor offset on any orb right now (px): Home's folds into
    the clock's translate, every other page's is a margin. */
const ORB_OFFSET = () => {
  let m = 0;
  for (const o of document.querySelectorAll('.orb')) {
    const t = /calc\(-50% \+ (-?[\d.]+)px\) calc\(-50% - (-?[\d.]+)px\)/.exec(o.style.translate);
    const x = t ? Math.abs(Number(t[1])) : Math.abs(parseFloat(o.style.marginLeft) || 0);
    const y = Math.abs(parseFloat(o.style.marginTop) || 0);
    m = Math.max(m, Math.hypot(x, y));
  }
  return Math.round(m * 10) / 10;
};
const STRIP_RIM = () => {
  document.querySelectorAll('.glass-rim, .glass-frost').forEach((n) => n.remove());
  document.querySelectorAll('.glass, .glass-strong').forEach((p) => p.style.removeProperty('backdrop-filter'));
};

function laplacian({ data, info }) {
  const { width: W, height: H } = info;
  const ch = info.channels;
  const L = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) L[i] = 0.2126 * data[i * ch] + 0.7152 * data[i * ch + 1] + 0.0722 * data[i * ch + 2];
  let s = 0, n = 0;
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    s += Math.abs(4 * L[i] - L[i - 1] - L[i + 1] - L[i - W] - L[i + W]);
    n++;
  }
  return +(s / n).toFixed(3);
}

/** A timestamped strip: frames left to right, wrapping at `cols`, the time
    since the first frame under each. */
async function strip(frames, out, cols = 4, cw = 480) {
  const m = await sharp(frames[0].buf).metadata();
  const ch = Math.round((m.height / m.width) * cw);
  const rows = Math.ceil(frames.length / cols);
  const comps = [];
  for (let i = 0; i < frames.length; i++) {
    const x = 12 + (i % cols) * (cw + 12), y = 12 + Math.floor(i / cols) * (ch + 34);
    comps.push({ input: await sharp(frames[i].buf).resize(cw, ch).toBuffer(), left: x, top: y });
    const label = `${Math.round(frames[i].t)} ms${frames[i].note ? '  ' + frames[i].note : ''}`;
    comps.push({ input: Buffer.from(`<svg width="${cw}" height="24" xmlns="http://www.w3.org/2000/svg"><text x="2" y="17" font-family="Segoe UI, Arial" font-size="15" fill="#eee">${label}</text></svg>`), left: x, top: y + ch + 4 });
  }
  await sharp({ create: { width: 12 + cols * (cw + 12), height: 12 + rows * (ch + 34), channels: 3, background: '#1b1b1d' } }).composite(comps).png().toFile(out);
}

const SIZES = [[1440, 900], [1280, 800], [1024, 768], [820, 1180], [390, 844]];
const PAGES = ['', 'about/', 'services/', 'contact/'];

if (ONLY.includes('sheets')) {
  for (const scheme of ['light', 'dark']) {
    for (const [w, h] of SIZES) {
      const { context, page } = await contextFor(w, h, scheme, { reduce: true });
      for (const path of PAGES) {
        const tag = `${(path || 'home').replace(/\//g, '')}__${scheme}__${w}`;
        await open(page, path);
        await page.mouse.move(1, h - 1);
        await page.screenshot({ path: join(OUT, 'sheets', `${tag}__full.png`), fullPage: true });
        if (w === 1440 || w === 390) {
          const total = await page.evaluate(() => document.documentElement.scrollHeight);
          for (let y = 0; y < total - 40; y += h) {
            await page.evaluate((y) => scrollTo(0, y), y);
            await page.waitForTimeout(450);
            await page.screenshot({ path: join(OUT, 'sheets', `${tag}__vp${String(y).padStart(5, '0')}.png`) });
          }
        }
      }
      await context.close();
      console.log('sheets', scheme, w);
    }
  }
}

if (ONLY.includes('rim')) {
  metrics.rim = {};
  for (const scheme of ['light', 'dark']) {
    for (const [path, sel] of [['', '.window'], ['services/', '.head-card']]) {
      const { context, page } = await contextFor(1440, 900, scheme);
      await open(page, path);
      await page.mouse.move(1, 899);
      await page.addStyleTag({ content: HIDE_TEXT });
      const layers = await page.evaluate((sel) => document.querySelector(sel)?.querySelectorAll(':scope > .glass-rim, :scope > .glass-frost').length ?? 0, sel);
      const r = await page.evaluate((sel) => { const b = document.querySelector(sel).getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; }, sel);
      // A corner crop (bottom-left) and a strip along the left edge, inside the band.
      const corner = { x: Math.max(0, Math.round(r.x - 40)), y: Math.round(Math.min(900 - 260, r.y + r.h - 220)), width: 300, height: 260 };
      const band = { x: Math.round(r.x + 3), y: Math.round(r.y + 60), width: 14, height: Math.round(Math.min(300, r.h - 120)) };
      const tag = `${(path || 'home').replace(/\//g, '')}__${scheme}`;
      await page.waitForTimeout(300);
      const onC = await page.screenshot({ clip: corner });
      const onB = laplacian(await sharp(await page.screenshot({ clip: band })).raw().toBuffer({ resolveWithObject: true }));
      await page.evaluate(STRIP_RIM);
      await page.waitForTimeout(400);
      const offC = await page.screenshot({ clip: corner });
      const offB = laplacian(await sharp(await page.screenshot({ clip: band })).raw().toBuffer({ resolveWithObject: true }));
      await writeFile(join(OUT, 'rim', `${tag}__on.png`), onC);
      await writeFile(join(OUT, 'rim', `${tag}__off.png`), offC);
      await strip([{ buf: onC, t: 0, note: 'rim band on' }, { buf: offC, t: 0, note: 'layers stripped (plain frost)' }], join(OUT, 'rim', `${tag}__pair.png`), 2, 420);
      metrics.rim[tag] = { layers, bandDetailOn: onB, bandDetailOff: offB };
      console.log('rim', tag, JSON.stringify(metrics.rim[tag]));
      await context.close();
    }
  }
}

if (ONLY.includes('cursor')) {
  for (const scheme of ['light', 'dark']) {
    for (const path of ['', 'services/']) {
      const { context, page } = await contextFor(1440, 900, scheme);
      await open(page, path);
      const sel = path ? '.head-card' : '.window';
      const r = await page.evaluate((sel) => { const b = document.querySelector(sel).getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; }, sel);
      await page.mouse.move(4, 896);
      await page.waitForTimeout(600);
      // A pass in from the left gutter, across the pane's top, down its right side, out low left.
      const path_ = [[r.x - 120, r.y + r.h * 0.5], [r.x + 40, r.y + 50], [r.x + r.w * 0.5, r.y + 40], [r.x + r.w - 40, r.y + 60], [r.x + r.w - 50, r.y + r.h - 50], [r.x + r.w * 0.3, r.y + r.h - 30], [r.x - 140, r.y + r.h + 40]];
      const frames = [];
      let maxOff = 0;
      const t0 = Date.now();
      frames.push({ buf: await page.screenshot(), t: 0, note: 'pointer away' });
      for (let i = 1; i < path_.length; i++) {
        await page.mouse.move(path_[i][0], path_[i][1], { steps: 14 });
        await page.waitForTimeout(250);
        const off = await page.evaluate(ORB_OFFSET);
        maxOff = Math.max(maxOff, off);
        frames.push({ buf: await page.screenshot(), t: Date.now() - t0, note: `at ${Math.round(path_[i][0])},${Math.round(path_[i][1])}, orb push ${off}px` });
      }
      await page.waitForTimeout(900);
      frames.push({ buf: await page.screenshot(), t: Date.now() - t0, note: 'settled away' });
      const tag = `${(path || 'home').replace(/\//g, '')}__${scheme}`;
      await strip(frames, join(OUT, 'films', `cursor__${tag}.png`), 3, 560);
      // Crops at 2x of the pane's top-right corner while lit and unlit.
      const crop = { x: Math.round(r.x + r.w - 420), y: Math.round(Math.max(0, r.y - 30)), width: 450, height: 300 };
      await page.mouse.move(r.x + r.w - 80, r.y + 40, { steps: 8 });
      await page.waitForTimeout(500);
      const lit = await page.screenshot({ clip: crop });
      await page.mouse.move(4, 896, { steps: 8 });
      await page.waitForTimeout(700);
      const unlit = await page.screenshot({ clip: crop });
      await strip([{ buf: lit, t: 0, note: 'lit' }, { buf: unlit, t: 0, note: 'unlit' }], join(OUT, 'films', `cursor-crop__${tag}.png`), 2, 450);
      metrics[`cursor_${tag}`] = { maxOrbPushDuringPass: maxOff, orbPushAfterLeave: await page.evaluate(ORB_OFFSET), litAttr: await page.evaluate(() => document.querySelectorAll('[data-lit]').length) };
      await context.close();
      console.log('cursor', tag);
    }
  }
}

if (ONLY.includes('header')) {
  for (const scheme of ['light', 'dark']) {
    for (const [w, h] of [[1440, 900], [390, 844]]) {
      for (const path of ['', 'services/']) {
        const { context, page } = await contextFor(w, h, scheme);
        await open(page, path);
        await page.mouse.move(w / 2, h - 4);
        const frames = [];
        const t0 = Date.now();
        const clip = { x: 0, y: 0, width: w, height: w > 600 ? 200 : 170 };
        for (let i = 0; i < 12; i++) {
          frames.push({ buf: await page.screenshot({ clip }), t: Date.now() - t0, note: `scrollY ${await page.evaluate(() => Math.round(scrollY))}` });
          await page.mouse.wheel(0, i < 2 ? 30 : 110);
          await page.waitForTimeout(140);
        }
        const tag = `${(path || 'home').replace(/\//g, '')}__${scheme}__${w}`;
        await strip(frames, join(OUT, 'films', `header__${tag}.png`), w > 600 ? 2 : 4, w > 600 ? 720 : 300);
        await context.close();
        console.log('header', tag);
      }
    }
  }
}

if (ONLY.includes('tablet')) {
  metrics.tablet = {};
  for (const scheme of ['light', 'dark']) {
    for (const [w, h] of [[820, 1180], [1024, 768]]) {
      const { context, page } = await contextFor(w, h, scheme);
      await open(page, '');
      const geo = await page.evaluate(() => {
        const cc = document.querySelector('.control-centre').getBoundingClientRect();
        const win = document.querySelector('.window').getBoundingClientRect();
        const tiles = [...document.querySelectorAll('.cc-tile')].map((t) => { const b = t.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; });
        const sw = document.querySelector('bdl-switcher')?.getBoundingClientRect();
        return { cc: [Math.round(cc.left), Math.round(cc.top), Math.round(cc.width), Math.round(cc.height)], win: [Math.round(win.left), Math.round(win.width), Math.round(win.bottom)], tiles, switcherTop: sw ? Math.round(sw.top) : null, segRowDir: getComputedStyle(document.querySelector('.cc-seg-row')).flexDirection };
      });
      metrics.tablet[`${scheme}__${w}`] = geo;
      await page.screenshot({ path: join(OUT, 'tablet', `home__${scheme}__${w}__clear.png`) });
      await page.click('.control-centre .cc-tint-switch');
      await page.waitForTimeout(600);
      await page.screenshot({ path: join(OUT, 'tablet', `home__${scheme}__${w}__tinted.png`) });
      metrics.tablet[`${scheme}__${w}`].tint = await page.evaluate(() => [document.documentElement.dataset.glassTint, document.querySelector('.cc-tint-switch').getAttribute('aria-checked'), !!document.querySelector('.window-bar .switch')]);
      await page.click('.control-centre .cc-tint-switch');
      await context.close();
      console.log('tablet', scheme, w, JSON.stringify(geo));
    }
  }
}

if (ONLY.includes('pages')) {
  metrics.pages = {};
  for (const scheme of ['light', 'dark']) {
    for (const [w, h] of [[820, 1180], [1440, 900], [1024, 768], [1280, 800]]) {
      const { context, page } = await contextFor(w, h, scheme, { reduce: true });
      for (const path of ['about/', 'contact/']) {
        await open(page, path);
        await page.mouse.move(1, h - 1);
        const tag = `${path.replace(/\//g, '')}__${scheme}__${w}`;
        if (path === 'about/') {
          metrics.pages[tag] = await page.evaluate(() => {
            const h1 = document.querySelector('.title-card h1');
            const range = document.createRange();
            range.selectNodeContents(h1);
            const rects = [...range.getClientRects()];
            const inkBottom = Math.max(...rects.map((r) => r.bottom));
            const reading = document.querySelector('.reading').getBoundingClientRect();
            // Descenders reach about 0.21em below the baseline; the line box at 0.92 clips them.
            const fs = parseFloat(getComputedStyle(h1).fontSize);
            return { lineBoxBottom: Math.round(inkBottom), readingTop: Math.round(reading.top), descenderReach: Math.round(fs * 0.25), gapLessDescender: Math.round(reading.top - inkBottom - fs * 0.25), overlapsTitleColumns: reading.left < h1.getBoundingClientRect().right };
          });
        }
        if (w === 820 || w === 1440) {
          await page.screenshot({ path: join(OUT, 'pages', `${tag}__vp0.png`) });
          await page.evaluate(() => scrollTo(0, innerHeight * 0.8));
          await page.waitForTimeout(400);
          await page.screenshot({ path: join(OUT, 'pages', `${tag}__vp1.png`) });
          await page.evaluate(() => scrollTo(0, 0));
        }
      }
      await context.close();
      console.log('pages', scheme, w);
    }
  }
}

if (ONLY.includes('trace')) {
  metrics.trace = {};
  for (const path of PAGES) {
    for (const mode of ['rim', 'plain']) {
      const { context, page, cdp } = await contextFor(390, 844, 'light', { dsf: 2, mobile: true });
      await open(page, path);
      if (mode === 'plain') { await page.evaluate(STRIP_RIM); await page.waitForTimeout(300); }
      const chunks = [];
      cdp.on('Tracing.dataCollected', (e) => chunks.push(...e.value));
      const done = new Promise((res) => cdp.once('Tracing.tracingComplete', res));
      await cdp.send('Tracing.start', { categories: 'gpu,viz,cc,benchmark,toplevel,disabled-by-default-devtools.timeline.frame', transferMode: 'ReportEvents' });
      const run = await page.evaluate(async () => {
        const max = document.documentElement.scrollHeight - innerHeight;
        let frames = 0, panesSeen = 0;
        const panes = [...document.querySelectorAll('.glass, .glass-strong')];
        const t0 = performance.now();
        await new Promise((res) => {
          const step = () => {
            const t = performance.now() - t0;
            if (t > 3000) return res();
            const y = (max * (0.5 - 0.5 * Math.cos((t / 3000) * Math.PI * 2)));
            scrollTo(0, y);
            frames++;
            panesSeen += panes.filter((p) => { const r = p.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }).length;
            requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        });
        return { frames, avgPanes: +(panesSeen / Math.max(1, frames)).toFixed(2), ms: Math.round(performance.now() - t0) };
      });
      await cdp.send('Tracing.end');
      await done;
      // The GPU process's main thread and the Viz compositor thread (work moves
      // between the two): each one's busy time as the union of its complete
      // events; per frame is their sum over the frames scrolled.
      const names = new Map();
      for (const e of chunks) if (e.ph === 'M' && e.name === 'thread_name') names.set(`${e.pid}:${e.tid}`, e.args.name);
      const gpuKeys = [...names].filter(([, n]) => n === 'CrGpuMain' || n === 'VizCompositorThread').map(([k, n]) => [k, n]);
      const busy = {};
      for (const [key, n] of gpuKeys) {
        const iv = chunks.filter((e) => e.ph === 'X' && `${e.pid}:${e.tid}` === key && e.dur).map((e) => [e.ts, e.ts + e.dur]).sort((a, b) => a[0] - b[0]);
        let total = 0, cur = null;
        for (const [s, f] of iv) { if (!cur || s > cur[1]) { if (cur) total += cur[1] - cur[0]; cur = [s, f]; } else cur[1] = Math.max(cur[1], f); }
        if (cur) total += cur[1] - cur[0];
        busy[n] = +(total / 1000).toFixed(1);
      }
      const tag = `${(path || 'home').replace(/\//g, '')}__${mode}`;
      metrics.trace[tag] = { ...run, gpuBusyMs: busy, gpuMsPerFrame: +(((busy.CrGpuMain || 0) + (busy.VizCompositorThread || 0)) / Math.max(1, run.frames)).toFixed(3) };
      console.log('trace', tag, JSON.stringify(metrics.trace[tag]));
      await context.close();
    }
    const a = metrics.trace[`${(path || 'home').replace(/\//g, '')}__rim`], b = metrics.trace[`${(path || 'home').replace(/\//g, '')}__plain`];
    metrics.trace[`${(path || 'home').replace(/\//g, '')}__perPaneMs`] = +((a.gpuMsPerFrame - b.gpuMsPerFrame) / Math.max(0.5, a.avgPanes)).toFixed(3);
  }
}

await writeFile(join(OUT, `metrics-${ONLY.join('-')}.json`), JSON.stringify(metrics, null, 2));
await browser.close();
console.log('done', OUT);
