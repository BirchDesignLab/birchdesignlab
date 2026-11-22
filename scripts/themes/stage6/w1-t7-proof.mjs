/**
 * Stage 6 wave 1, task 7: film, sheet, trace and hit-test the R2 proof
 * (scripts/themes/proofs/stage6-glass-r2/). Written 11-19-26.
 *
 * Serves the frozen build with the proof injected into glass Home
 * (proofs/stage6-glass-r2/serve.mjs) on --port (4470), opens GPU Chromium
 * (exits 2 on a software renderer), forces prefers-reduced-transparency:
 * no-preference and suppresses the portal prompt.
 *
 * Stages (no flag: all):
 *   --look     one viewport frame per size and scheme, lens parked on the
 *              headline (quick look while tuning)
 *   --films    1440 light and dark: the lens dragged across "Birch Design
 *              Lab" and on over a paragraph; the header with content
 *              scrolling under it; the pill ruler slid over text. 390: one
 *              frame, plus a short touch-sized drag. Timestamped strips.
 *   --sheet    the founder sheet (key frames from the films, side by side)
 *   --hits     hit testing: across the lens face, which element the pointer
 *              lands on vs which element the eye sees there (the sampled
 *              point), over links; the rim catches; a link click through
 *              the face
 *   --trace    frame cost at 1440 and 390: a scripted 3 s drag of (a) the
 *              R2 lens, (b) today's WebGL lens (the page as built, ?r2=off),
 *              and (c) a scroll under the R2 header; Chrome trace per run,
 *              summarised as presented/dropped frames, rAF intervals and GPU
 *              main-thread busy time per frame
 *   --arrival  from /t/quiet/ through the real switcher into glass Home:
 *              does the proof mount after a ClientRouter swap
 *
 * Usage:
 *   node scripts/themes/snap.mjs --name s6-w1-t7        # freeze once
 *   BDL_GPU=1 node scripts/themes/stage6/w1-t7-proof.mjs [--look] [--films] ...
 * Output: scripts/themes/.out/stage6/w1/t7/ (frames, strips, traces, results.json)
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';
import { serveProof } from '../proofs/stage6-glass-r2/serve.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const OUT = join(HERE, '..', '.out', 'stage6', 'w1', 't7');
const arg = (n, f) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? f : process.argv[i + 1]; };
const PORT = Number(arg('port', '4470'));
const SNAP = arg('snap', 's6-w1-t7');
const base = `http://127.0.0.1:${PORT}`;
const HOME = '/t/glassmorphism/';
const STAGES = ['look', 'films', 'sheet', 'hits', 'trace', 'arrival'];
const only = STAGES.filter((s) => process.argv.includes(`--${s}`));
const want = (s) => only.length === 0 || only.includes(s);
for (const d of ['frames', 'strips', 'traces']) await mkdir(join(OUT, d), { recursive: true });
const resultsPath = join(OUT, 'results.json');
const R = existsSync(resultsPath) ? JSON.parse(await readFile(resultsPath, 'utf8')) : {};
const save = () => writeFile(resultsPath, JSON.stringify(R, null, 2));

if (process.env.BDL_GPU !== '1') { console.error('BDL_GPU=1 required'); process.exit(2); }
const dist = join(REPO, 'scripts', 'themes', '.out', `snap-${SNAP}`);
if (!existsSync(dist)) { console.error(`no ${dist}`); process.exit(1); }
const server = await serveProof(PORT, dist);

const browser = await chromium.launch({
  headless: true,
  args: ['--hide-scrollbars', '--font-render-hinting=none', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
});
const done = async (code = 0) => { await browser.close(); server.close(); process.exit(code); };
{
  const p = await browser.newPage();
  R.renderer = await p.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); });
  await p.close();
  console.log('renderer:', R.renderer);
  if (/swiftshader|llvmpipe|software/i.test(R.renderer)) { console.error('software renderer: evidence invalid'); await done(2); }
}

const SIZES = { 1440: { w: 1440, h: 900, dpr: 1 }, 390: { w: 390, h: 844, dpr: 2, mobile: true } };

async function open(sizeId, scheme, { path = HOME, query = '' } = {}) {
  const sz = SIZES[sizeId];
  const context = await browser.newContext({
    viewport: { width: sz.w, height: sz.h }, deviceScaleFactor: sz.dpr,
    isMobile: !!sz.mobile, hasTouch: !!sz.mobile, colorScheme: scheme, reducedMotion: 'no-preference',
  });
  await suppressPrompt(context);
  await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
  await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [
      { name: 'prefers-color-scheme', value: scheme },
      { name: 'prefers-reduced-motion', value: 'no-preference' },
      { name: 'prefers-reduced-transparency', value: 'no-preference' },
    ],
  });
  await page.goto(`${base}${path}${query}`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'bdl-switcher{opacity:0!important;pointer-events:none!important} *{scroll-behavior:auto!important}' }).catch(() => {});
  if (path === HOME && !query.includes('r2=off')) {
    await page.waitForFunction(() => window.__r2?.mounted && document.querySelector('.r2-bar-lens')?.style.backdropFilter, null, { timeout: 8000 });
  }
  // fx.ts mounts its panes once the page goes idle.
  await page.waitForTimeout(1200);
  return { context, page, cdp, errors, sz };
}

/** The ink box of an element's text (a Range), not its layout box. */
const textRect = (page, sel) => page.evaluate((sel) => { const el = document.querySelector(sel); if (!el) return null; const rg = document.createRange(); rg.selectNodeContents(el); const r = rg.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }; }, sel);
const rect = (page, sel) => page.evaluate((sel) => { const r = document.querySelector(sel)?.getBoundingClientRect(); return r && { x: r.left, y: r.top, w: r.width, h: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }; }, sel);
const objAt = (page, n) => page.evaluate((n) => { const r = document.querySelector(`.r2-${n}`)?.getBoundingClientRect(); return r && [r.left + r.width / 2, r.top + r.height / 2]; }, n);
const shot = async (page, file) => writeFile(file, await page.screenshot({ type: 'png' }));

/* ---------- films ---------- */

async function startFilm(page) {
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    frames.push({ data, at: metadata.timestamp });
    try { await cdp.send('Page.screencastFrameAck', { sessionId }); } catch {}
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 85, everyNthFrame: 1 });
  await page.waitForTimeout(200);
  if (!frames.length) {
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 85 });
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

async function strip(frames, file, title, cols = 5, cellW = 420) {
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

/** Grab object `n` by its rim (left edge of the ring, inside the clip) and
    move it through `points` over `ms`. */
async function dragObj(page, n, points, ms) {
  const info = await page.evaluate((n) => {
    const el = document.querySelector(`.r2-${n}`);
    const r = el.getBoundingClientRect();
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width, h: r.height };
  }, n);
  const rimInset = 6;
  const grab = [info.cx - info.w / 2 + rimInset, info.cy];
  const off = [grab[0] - info.cx, grab[1] - info.cy];
  await page.mouse.move(grab[0], grab[1]);
  await page.mouse.down();
  const legs = [[info.cx, info.cy], ...points];
  const steps = Math.max(10, Math.round(ms / 25));
  const per = Math.max(1, Math.round(steps / (legs.length - 1)));
  for (let l = 1; l < legs.length; l++) {
    const [a, b] = [legs[l - 1], legs[l]];
    for (let i = 1; i <= per; i++) {
      await page.mouse.move(a[0] + ((b[0] - a[0]) * i) / per + off[0], a[1] + ((b[1] - a[1]) * i) / per + off[1]);
      await page.waitForTimeout(Math.round(ms / steps) - 8);
    }
  }
  await page.mouse.up();
}

async function filmed(page, label, title, fn, ms, n = 10) {
  const film = await startFilm(page);
  const t = Date.now();
  await fn();
  const left = ms - (Date.now() - t);
  if (left > 0) await page.waitForTimeout(left);
  const frames = await film.stop();
  await strip(pick(frames, n, ms), join(OUT, 'strips', `${label}.png`), title);
  return frames;
}

if (want('look')) {
  for (const scheme of ['light', 'dark']) for (const s of ['1440', '390']) {
    const { context, page, errors } = await open(s, scheme);
    const h1 = await rect(page, '.billboard');
    await page.evaluate(([x, y]) => window.__r2.place('lens', x, y), [h1.x + Math.min(h1.w * 0.32, 200), h1.cy]);
    await page.waitForTimeout(300);
    await shot(page, join(OUT, 'frames', `look__${scheme}__${s}.png`));
    (R.look ??= {})[`${scheme}__${s}`] = { r2: await page.evaluate(() => ({ ...window.__r2, place: undefined })), errors };
    await context.close();
  }
  await save();
}

/** Strip frames cropped to a band (CSS px * dpr handled by the jpeg size). */
async function cropFrames(frames, [x, y, w, h], scale) {
  return Promise.all(frames.map(async (f) => {
    const img = await loadImage(Buffer.from(f.data, 'base64'));
    const c = createCanvas(Math.round(w * scale), Math.round(h * scale));
    c.getContext('2d').drawImage(img, x * scale, y * scale, w * scale, h * scale, 0, 0, c.width, c.height);
    return { ...f, data: (await c.encode('jpeg', 90)).toString('base64') };
  }));
}

const keep = {}; // key frames for the sheet: name -> base64 png/jpeg

if (want('films')) {
  R.films = {};
  for (const scheme of ['light', 'dark']) {
    const F = (R.films[scheme] = {});
    // A. the lens across "Birch Design Lab", on over a paragraph, then the Control Centre
    {
      const { context, page, errors } = await open('1440', scheme);
      const b1 = await textRect(page, '.billboard .b1');
      const b2 = await textRect(page, '.billboard .b2');
      const lead = await textRect(page, '.hero .sub');
      F.boxes = { b1, b2, lead };
      await page.evaluate(([x, y]) => window.__r2.place('lens', x, y), [b1.x - 40, b1.cy]);
      await page.waitForTimeout(300);
      const path = [[b1.x + b1.w + 30, b1.cy], [b2.x + 40, b2.cy], [b2.x + b2.w - 30, b2.cy], [lead.x + lead.w * 0.6, lead.cy], [lead.x + 140, lead.cy]];
      F.headline = { path: path.map((p) => p.map(Math.round)) };
      const frames = await filmed(page, `lens-drag__${scheme}__1440`, `R2 lens dragged by its rim across "Birch Design Lab" and on over the paragraph, ${scheme} 1440x900`, () => dragObj(page, 'lens', path, 3000), 4200, 15);
      // Key frames: the lens on each word and on the paragraph, as stills.
      for (const [k, p] of [['birch', [b1.x + b1.w * 0.55, b1.cy]], ['design', [b2.x + b2.w * 0.3, b2.cy]], ['lab', [b2.x + b2.w * 0.82, b2.cy]], ['para', [lead.x + lead.w * 0.45, lead.cy]]]) {
        await page.evaluate(([x, y]) => window.__r2.place('lens', x, y), p);
        await page.waitForTimeout(200);
        const f = join(OUT, 'frames', `lens-${k}__${scheme}__1440.png`);
        await shot(page, f);
        keep[`lens-${k}__${scheme}`] = f;
      }
      // The Control Centre: scroll it into the middle and park the lens on it.
      await page.evaluate(() => document.querySelector('.control-centre').scrollIntoView({ block: 'center' }));
      await page.waitForTimeout(400);
      const cc = await rect(page, '.control-centre');
      await page.evaluate(([x, y]) => window.__r2.place('lens', x, y), [cc.x + cc.w * 0.42, cc.cy]);
      await page.waitForTimeout(250);
      const fcc = join(OUT, 'frames', `lens-cc__${scheme}__1440.png`);
      await shot(page, fcc);
      keep[`lens-cc__${scheme}`] = fcc;
      F.headline.frames = frames.length;
      F.headline.errors = errors;
      await context.close();
    }
    // B. the header with content scrolling under it (lens parked at the side)
    {
      const { context, page, errors } = await open('1440', scheme);
      await page.evaluate(() => window.__r2.place('lens', document.documentElement.clientWidth - 150, 560));
      await page.evaluate(() => window.__r2.place('pill', -999, 2000));
      await page.mouse.move(720, 500);
      const bar = await rect(page, '.site-header .bar');
      const frames = await filmed(page, `header-scroll-full__${scheme}__1440`, `R2 header: content scrolling under the clear lensing bar, ${scheme} 1440x900`, async () => {
        for (let i = 0; i < 40; i++) { await page.mouse.wheel(0, 30); await page.waitForTimeout(45); }
      }, 2600, 10);
      const band = [bar.x - 20, 0, bar.w + 40, bar.y + bar.h + 60];
      await strip(pick(await cropFrames(frames, band, 1), 10, 2600), join(OUT, 'strips', `header-scroll__${scheme}__1440.png`), `R2 header bar, cropped to the bar: content scrolling under it, ${scheme} 1440`, 2, 700);
      // Stills at three offsets, cropped, for the sheet.
      // Offsets that put a line of text across the bar's middle.
      const barMid = bar.y + bar.h / 2;
      const offs = await page.evaluate((barMid) => ['.billboard .b2', '.hero .sub', '.control-centre .cc-tile-label'].map((sel) => {
        const el = document.querySelector(sel);
        const rg = document.createRange(); rg.selectNodeContents(el);
        const r = rg.getClientRects()[0] || el.getBoundingClientRect();
        return Math.round(r.top + r.height / 2 + window.scrollY - barMid);
      }), barMid);
      F.headerOffsets = offs;
      for (const [k, y] of [['headline', offs[0]], ['paragraph', offs[1]], ['controls', offs[2]]]) {
        await page.evaluate((y) => window.scrollTo(0, y), y);
        await page.waitForTimeout(350);
        const buf = await page.screenshot({ type: 'png', clip: { x: band[0], y: band[1], width: band[2], height: band[3] } });
        const f = join(OUT, 'frames', `header-${k}__${scheme}__1440.png`);
        await writeFile(f, buf);
        keep[`header-${k}__${scheme}`] = f;
      }
      F.header = { bar, frames: frames.length, errors };
      await context.close();
    }
    // C. the pill ruler slid along the lines of a paragraph
    {
      const { context, page, errors } = await open('1440', scheme);
      const lead = await textRect(page, '.hero .sub');
      await page.evaluate(([x, y]) => window.__r2.place('lens', x, y), [1440 - 150, 820]);
      const lh = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.hero .sub')).lineHeight) || 32);
      await page.evaluate(([x, y]) => window.__r2.place('pill', x, y), [lead.x + 120, lead.y + lh / 2]);
      await page.waitForTimeout(250);
      const path = [[lead.x + lead.w - 170, lead.y + lh / 2], [lead.x + lead.w - 170, lead.y + lh * 1.5], [lead.x + 170, lead.y + lh * 1.5], [lead.x + 170, lead.y + lh * 2.5], [lead.x + lead.w * 0.6, lead.y + lh * 2.5]];
      await filmed(page, `pill__${scheme}__1440`, `R2 toy: the glass ruler slid along the paragraph's lines, ${scheme} 1440x900`, () => dragObj(page, 'pill', path, 2600), 3600, 10);
      await page.evaluate(([x, y]) => window.__r2.place('pill', x, y), [lead.x + lead.w * 0.45, lead.y + lh * 1.5]);
      await page.waitForTimeout(200);
      const f = join(OUT, 'frames', `pill__${scheme}__1440.png`);
      await shot(page, f);
      keep[`pill__${scheme}`] = f;
      F.pill = { errors };
      await context.close();
    }
    // D. 390: one frame (the lens on the headline, the ruler on the paragraph) and a short drag
    {
      const { context, page, errors } = await open('390', scheme);
      const b2 = await textRect(page, '.billboard .b2');
      const lead = await textRect(page, '.hero .sub');
      await page.evaluate(([x, y]) => window.__r2.place('lens', x, y), [b2.x + 110, b2.cy]);
      await page.evaluate(([x, y]) => window.__r2.place('pill', x, y), [195, lead.y + 70]);
      await page.waitForTimeout(300);
      const f = join(OUT, 'frames', `phone__${scheme}__390.png`);
      await shot(page, f);
      keep[`phone__${scheme}`] = f;
      await filmed(page, `lens-drag__${scheme}__390`, `R2 lens dragged by its rim across the headline, ${scheme} 390x844`, () => dragObj(page, 'lens', [[b2.x + b2.w - 60, b2.cy], [b2.x + 80, b2.cy + 120]], 1800), 2800, 10);
      F.phone = { errors };
      await context.close();
    }
    console.log('films', scheme, 'done');
  }
  await writeFile(join(OUT, 'keep.json'), JSON.stringify(keep, null, 2));
  await save();
}

if (want('sheet')) {
  const K = existsSync(join(OUT, 'keep.json')) ? JSON.parse(await readFile(join(OUT, 'keep.json'), 'utf8')) : keep;
  const tile = async (cells, file, title, cols, cellW) => {
    const imgs = await Promise.all(cells.map(([, p]) => loadImage(p)));
    const PAD = 14, CAP = 26;
    const heights = imgs.map((im) => Math.round((im.height / im.width) * cellW));
    const rows = [];
    for (let i = 0; i < imgs.length; i += cols) rows.push(Math.max(...heights.slice(i, i + cols)));
    const H = PAD + CAP + PAD + rows.reduce((a, h) => a + h + CAP + PAD, 0);
    const c = createCanvas(PAD + cols * (cellW + PAD), H);
    const g = c.getContext('2d');
    g.fillStyle = '#1b1b1d'; g.fillRect(0, 0, c.width, c.height);
    g.font = '600 17px sans-serif'; g.textBaseline = 'middle'; g.fillStyle = '#e8e6e1';
    g.fillText(title, PAD, PAD + CAP / 2);
    let y = PAD + CAP + PAD;
    imgs.forEach((im, i) => {
      const col = i % cols;
      if (i && col === 0) y += rows[Math.floor(i / cols) - 1] + CAP + PAD;
      const x = PAD + col * (cellW + PAD);
      g.drawImage(im, x, y, cellW, heights[i]);
      g.fillStyle = '#e8e6e1'; g.font = '500 14px sans-serif';
      g.fillText(cells[i][0], x, y + heights[i] + CAP / 2);
    });
    await writeFile(file, await c.encode('png'));
  };
  for (const scheme of ['light', 'dark']) {
    await tile([
      ['lens on "Birch"', K[`lens-birch__${scheme}`]],
      ['lens on "Design"', K[`lens-design__${scheme}`]],
      ['lens on "Lab"', K[`lens-lab__${scheme}`]],
      ['lens on the paragraph', K[`lens-para__${scheme}`]],
      ['lens on the Control Centre', K[`lens-cc__${scheme}`]],
      ['glass ruler on the paragraph', K[`pill__${scheme}`]],
    ], join(OUT, `sheet-1440-${scheme}.png`), `R2 proof, glass Home 1440x900, ${scheme}: the lens bends the real page (displacement only, no blur)`, 2, 900);
    await tile([
      ['header over the headline, second line', K[`header-headline__${scheme}`]],
      ['header over the paragraph', K[`header-paragraph__${scheme}`]],
      ['header over the Control Centre labels', K[`header-controls__${scheme}`]],
    ], join(OUT, `sheet-header-${scheme}.png`), `R2 header bar, 1440, ${scheme}: content warps under the clear bar as it scrolls`, 1, 1300);
  }
  await tile([['390 light', K['phone__light']], ['390 dark', K['phone__dark']]], join(OUT, 'sheet-390.png'), 'R2 proof at 390x844: lens on the headline, ruler on the paragraph', 2, 420);
  console.log('sheets done');
}

if (want('hits')) {
  R.hits = {};
  for (const s of ['1440', '390']) {
    const { context, page, errors } = await open(s, 'light');
    // Park the lens on a run of links: the header nav at 1440 is under the
    // lens's own layer (the bar is in the page), so use the lab list's links.
    const target = await page.evaluate(() => {
      const links = [...document.querySelectorAll('main a[href]')].filter((a) => { const r = a.getBoundingClientRect(); return r.width > 40 && r.height > 14; });
      const a = links.find((l) => /lab\//.test(l.getAttribute('href'))) || links[0];
      a.scrollIntoView({ block: 'center' });
      const r = a.getBoundingClientRect();
      return { href: a.getAttribute('href'), text: a.textContent.trim().slice(0, 60), cx: r.left + Math.min(r.width / 2, 160), cy: r.top + r.height / 2 };
    });
    await page.waitForTimeout(400);
    const t2 = await page.evaluate((href) => { const a = document.querySelector(`main a[href="${href}"]`); const r = a.getBoundingClientRect(); return { cx: r.left + Math.min(r.width / 2, 160), cy: r.top + r.height / 2 }; }, target.href);
    await page.evaluate(([x, y]) => window.__r2.place('lens', x, y), [t2.cx, t2.cy]);
    await page.evaluate(() => window.__r2.place('pill', -999, 4000));
    await page.waitForTimeout(250);
    const H = await page.evaluate(() => {
      const lens = document.querySelector('.r2-lens');
      const rim = lens.querySelector('.r2-rim');
      const r = lens.getBoundingClientRect();
      const R = r.width / 2, cx = r.left + R, cy = r.top + R;
      const ring = 16;
      const ctl = (el) => el?.closest('a[href],button,input,label,[role="switch"],[role="radio"]') || null;
      const name = (el) => el ? `${el.tagName.toLowerCase()}${el.getAttribute('href') ? `[${el.getAttribute('href')}]` : ''}${el.getAttribute('aria-label') ? `(${el.getAttribute('aria-label').slice(0, 20)})` : ''}` : null;
      let face = 0, faceOnCtl = 0, mismatch = 0, seenCtlNotHit = 0, hitCtlNotSeen = 0, ringN = 0, ringRim = 0, faceRim = 0;
      let maxOff = 0;
      const examples = [];
      for (let y = -R + 2; y < R; y += 4) for (let x = -R + 2; x < R; x += 4) {
        const d = Math.hypot(x, y);
        if (d > R - 1) continue;
        const px = cx + x, py = cy + y;
        const top = document.elementFromPoint(px, py);
        if (d > R - ring + 1) { ringN++; if (top === rim) ringRim++; continue; }
        if (d < R - ring - 2) {
          face++;
          if (top === rim) { faceRim++; continue; }
          const s = window.__r2.sampleAt('lens', px, py);
          if (!s) continue;
          maxOff = Math.max(maxOff, Math.hypot(s[0] - px, s[1] - py));
          const hit = ctl(top);
          const seen = ctl(document.elementFromPoint(s[0], s[1]));
          if (hit || seen) {
            faceOnCtl++;
            if (hit !== seen) {
              mismatch++;
              if (seen && !hit) seenCtlNotHit++;
              if (hit && !seen) hitCtlNotSeen++;
              if (examples.length < 4) examples.push({ at: [Math.round(x), Math.round(y)], hit: name(hit), seen: name(seen) });
            }
          }
        }
      }
      return { R, ring, face, faceRim, faceOnCtl, mismatch, mismatchShare: faceOnCtl ? +(mismatch / faceOnCtl).toFixed(3) : 0, seenCtlNotHit, hitCtlNotSeen, maxOffset: +maxOff.toFixed(1), ringPoints: ringN, ringCatch: +(ringRim / ringN).toFixed(3), examples };
    });
    // A real click through the centre of the face lands on the page.
    const clickP = page.evaluate(() => new Promise((res) => {
      const on = (e) => { e.preventDefault(); res({ tag: e.target.tagName, link: e.target.closest('a')?.getAttribute('href') ?? null }); };
      document.addEventListener('click', on, { once: true, capture: true });
      setTimeout(() => res(null), 2000);
    }));
    await page.mouse.click(t2.cx, t2.cy);
    H.clickThroughCentre = await clickP;
    // The rim grabs: a press on the ring, a move, and the lens follows.
    const before = await objAt(page, 'lens');
    await page.mouse.move(before[0] - H.R + 6, before[1]);
    await page.mouse.down();
    await page.mouse.move(before[0] - H.R + 6 + 60, before[1] + 30, { steps: 6 });
    await page.mouse.up();
    const after = await objAt(page, 'lens');
    H.rimDrag = { before: before.map(Math.round), after: after.map(Math.round) };
    // Keyboard: focus the rim, three right arrows.
    await page.focus('.r2-lens .r2-rim');
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Shift+ArrowDown');
    const keyed = await objAt(page, 'lens');
    H.keys = { from: after.map(Math.round), to: keyed.map(Math.round) };
    H.target = target;
    await shot(page, join(OUT, 'frames', `hits__${s}.png`));
    H.errors = errors;
    R.hits[s] = H;
    console.log('hits', s, JSON.stringify({ ...H, examples: undefined }));
    await context.close();
  }
  await save();
}

/* ---------- frame cost ---------- */

function summarise(trace, t0us, t1us) {
  const ev = trace.traceEvents;
  const threads = {};
  for (const e of ev) if (e.ph === 'M' && e.name === 'thread_name') threads[`${e.pid}:${e.tid}`] = e.args.name;
  const busy = (name) => {
    const iv = ev.filter((e) => e.ph === 'X' && threads[`${e.pid}:${e.tid}`] === name && e.ts >= t0us && e.ts <= t1us && e.dur).map((e) => [e.ts, e.ts + e.dur]).sort((a, b) => a[0] - b[0]);
    let tot = 0, end = -1, s0 = -1;
    for (const [a, b] of iv) {
      if (a > end) { if (end > 0) tot += end - s0; s0 = a; end = b; } else end = Math.max(end, b);
    }
    if (end > 0) tot += end - s0;
    return tot / 1000;
  };
  const rep = ev.filter((e) => e.name === 'PipelineReporter' && e.ph === 'b' && e.ts >= t0us && e.ts <= t1us);
  const states = {};
  for (const e of rep) { const st = (e.args?.frame_reporter ?? e.args?.chrome_frame_reporter)?.state ?? 'unknown'; states[st] = (states[st] || 0) + 1; }
  const secs = (t1us - t0us) / 1e6;
  return { secs: +secs.toFixed(2), gpuMainBusyMs: +busy('CrGpuMain').toFixed(1), vizBusyMs: +busy('VizCompositorThread').toFixed(1), rendererMainBusyMs: +busy('CrRendererMain').toFixed(1), compositorBusyMs: +busy('Compositor').toFixed(1), frameStates: states };
}

if (want('trace')) {
  R.trace = {};
  for (const s of ['1440', '390']) {
    for (const run of ['r2-lens', 'webgl-lens', 'r2-scroll', 'base-scroll']) {
      const off = run === 'webgl-lens' || run === 'base-scroll';
      const { context, page, errors, sz } = await open(s, 'light', { query: off ? '?r2=off' : '' });
      if (off) await page.waitForFunction(() => document.querySelector('.lens-canvas')?.style.visibility === 'visible', null, { timeout: 9000 }).catch(() => {});
      await page.waitForTimeout(1500);
      // Where to grab, and the circle to drag round.
      const grab = await page.evaluate((off) => {
        if (off) {
          const h = [...document.querySelectorAll('.lens-hit')].at(-1);
          if (!h) return null;
          const r = h.getBoundingClientRect();
          return { at: [r.left + r.width / 2, r.top + r.height / 2], c: [r.left + r.width / 2, r.top + r.height / 2] };
        }
        const r = document.querySelector('.r2-lens').getBoundingClientRect();
        return { at: [r.left + 6, r.top + r.height / 2], c: [r.left + r.width / 2, r.top + r.height / 2] };
      }, off);
      const rad = s === '1440' ? 160 : 70;
      const centre = s === '1440' ? [720, 450] : [195, 420];
      if (run.endsWith('lens') && grab) {
        // Bring it to the circle's start first (outside the trace).
        await page.mouse.move(grab.at[0], grab.at[1]);
        await page.mouse.down();
        const off2 = [grab.at[0] - grab.c[0], grab.at[1] - grab.c[1]];
        await page.mouse.move(centre[0] + rad + off2[0], centre[1] + off2[1], { steps: 12 });
        await page.evaluate(() => { window.__rafT = []; const tick = (t) => { window.__rafT.push(t); window.__rafId = requestAnimationFrame(tick); }; window.__rafId = requestAnimationFrame(tick); });
        await browser.startTracing(page, { path: join(OUT, 'traces', `${run}__${s}.json`), categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline.frame', 'benchmark', 'cc', 'viz', 'gpu', 'toplevel'] });
        const t0 = await page.evaluate(() => { window.__tw0 = performance.now(); return performance.timeOrigin * 1000 + window.__tw0 * 1000; });
        const T = 3000, t = Date.now();
        while (Date.now() - t < T) {
          const a = ((Date.now() - t) / T) * Math.PI * 2;
          await page.mouse.move(centre[0] + rad * Math.cos(a) + off2[0], centre[1] + rad * Math.sin(a) + off2[1]);
          await page.waitForTimeout(8);
        }
        const t1 = await page.evaluate(() => { window.__tw1 = performance.now(); return performance.timeOrigin * 1000 + window.__tw1 * 1000; });
        await browser.stopTracing();
        await page.mouse.up();
        R.trace[`${run}__${s}`] = { t0, t1 };
      } else if (run.endsWith('scroll')) {
        await page.mouse.move(centre[0], centre[1]);
        await page.evaluate(() => { window.__rafT = []; const tick = (t) => { window.__rafT.push(t); window.__rafId = requestAnimationFrame(tick); }; window.__rafId = requestAnimationFrame(tick); });
        await browser.startTracing(page, { path: join(OUT, 'traces', `${run}__${s}.json`), categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline.frame', 'benchmark', 'cc', 'viz', 'gpu', 'toplevel'] });
        const t0 = await page.evaluate(() => { window.__tw0 = performance.now(); return performance.timeOrigin * 1000 + window.__tw0 * 1000; });
        for (let i = 0; i < 60; i++) { await page.mouse.wheel(0, i < 30 ? 40 : -40); await page.waitForTimeout(42); }
        const t1 = await page.evaluate(() => { window.__tw1 = performance.now(); return performance.timeOrigin * 1000 + window.__tw1 * 1000; });
        await browser.stopTracing();
        R.trace[`${run}__${s}`] = { t0, t1 };
      } else {
        R.trace[`${run}__${s}`] = { note: 'no lens to grab' };
        await context.close();
        continue;
      }
      const raf = await page.evaluate(() => { cancelAnimationFrame(window.__rafId); const t = window.__rafT.filter((x) => x >= window.__tw0 && x <= window.__tw1); const d = []; for (let i = 1; i < t.length; i++) d.push(t[i] - t[i - 1]); d.sort((a, b) => a - b); return { n: d.length, median: d[Math.floor(d.length / 2)], p95: d[Math.floor(d.length * 0.95)], max: d.at(-1), over20: d.filter((x) => x > 20).length }; });
      const trace = JSON.parse(await readFile(join(OUT, 'traces', `${run}__${s}.json`), 'utf8'));
      // The trace clock is the browser's monotonic clock; take the window
      // from the trace's own TracingStartedInBrowser to its last event.
      const ts = trace.traceEvents.filter((e) => e.ts).map((e) => e.ts);
      const startEv = trace.traceEvents.find((e) => e.name === 'TracingStartedInBrowser');
      const a = startEv ? startEv.ts : ts.reduce((x, y) => Math.min(x, y), Infinity);
      const b = ts.reduce((x, y) => Math.max(x, y), 0);
      const sum = summarise(trace, a, b);
      // Frames: the presented ones in the trace window (PipelineReporter).
      const presented = sum.frameStates.STATE_PRESENTED_ALL ?? 0;
      const frames = Math.max(1, presented);
      const per = (ms) => +(ms / frames).toFixed(2);
      // Busy ms per second of trace window: the comparable figure when two
      // runs present different frame counts (per frame divides by them).
      const perSec = (ms) => +(ms / sum.secs).toFixed(1);
      R.trace[`${run}__${s}`] = { ...sum, presentedPerSec: +(presented / sum.secs).toFixed(1), raf: { ...raf, median: +raf.median.toFixed(2), p95: +raf.p95.toFixed(2), max: +raf.max.toFixed(2) }, busyMsPerSec: { gpuMain: perSec(sum.gpuMainBusyMs), viz: perSec(sum.vizBusyMs), compositor: perSec(sum.compositorBusyMs), rendererMain: perSec(sum.rendererMainBusyMs) }, perFrameMs: { gpuMain: per(sum.gpuMainBusyMs), viz: per(sum.vizBusyMs), compositor: per(sum.compositorBusyMs), rendererMain: per(sum.rendererMainBusyMs) }, errors };
      console.log('trace', run, s, JSON.stringify(R.trace[`${run}__${s}`]));
      await context.close();
    }
  }
  await save();
}

if (want('arrival')) {
  R.arrival = {};
  for (const s of ['1440', '390']) {
    const sz = SIZES[s];
    const context = await browser.newContext({ viewport: { width: sz.w, height: sz.h }, deviceScaleFactor: sz.dpr, isMobile: !!sz.mobile, hasTouch: !!sz.mobile, colorScheme: 'light', reducedMotion: 'no-preference' });
    await suppressPrompt(context);
    await context.addInitScript(() => { try { localStorage.setItem('scheme', 'light'); } catch {} });
    await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
    await page.goto(`${base}/t/quiet/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const openBtn = await page.evaluate(() => { const b = document.querySelector('bdl-switcher').shadowRoot.querySelector('.open').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; });
    await page.mouse.click(openBtn[0], openBtn[1]);
    await page.waitForTimeout(500);
    const row = await page.evaluate(() => { const a = document.querySelector('bdl-switcher').shadowRoot.querySelector('a[data-school="glassmorphism"]'); a.scrollIntoView({ block: 'nearest' }); const b = a.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; });
    const film = await startFilm(page);
    await page.mouse.click(row[0], row[1]);
    await page.waitForURL(/glassmorphism\/$/, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(3600);
    const frames = await film.stop();
    await strip(pick(frames, 10, 3400), join(OUT, 'strips', `arrival__light__${s}.png`), `arrival from quiet through the real switcher into glass Home with the proof, light ${s}`);
    R.arrival[s] = await page.evaluate(() => ({ url: location.pathname, mounted: !!window.__r2?.mounted, objects: document.querySelectorAll('.r2-glass').length, bar: !!document.querySelector('.r2-bar-lens'), webglHidden: document.documentElement.classList.contains('r2-on'), proofScript: !!document.querySelector('script[src="/__r2/proof.js"]') }));
    R.arrival[s].errors = errors;
    console.log('arrival', s, JSON.stringify(R.arrival[s]));
    await context.close();
  }
  await save();
}

await done(0);
