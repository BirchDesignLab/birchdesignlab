/**
 * Stage 6 wave 3, task 18 (fixes A): films, sheets and probes.
 *
 *   LABEL=head ONLY=<sections> node scripts/themes/snap.mjs --name s6-w3-t18 --reuse --port 4470 -- node scripts/themes/stage6/w3-t18-evidence.mjs
 *   LABEL=base ONLY=business,swaps node scripts/themes/snap.mjs --name stage6-base --reuse --port 4470 -- node scripts/themes/stage6/w3-t18-evidence.mjs
 *   COMPARE=base,head node scripts/themes/stage6/w3-t18-evidence.mjs     (side-by-side pairs, business diff)
 *
 * GPU Chromium, renderer checked (exits on a software renderer); every page
 * forces prefers-reduced-transparency: no-preference through CDP; the portal
 * prompt is suppressed; arrivals go through the real switcher. Sections:
 *   business   the live business pages (Home, Services, About, Contact, Lab):
 *              whole-page sheets at 1440 and 390, both schemes; at 1440 a
 *              real mouse hover on a header link and on the theme toggle; at
 *              390 a real tap on a link (navigation held) and two taps on the
 *              toggle (no stuck colour); every link and button forced into
 *              :hover through CDP on touch (nothing may change) and on the
 *              mouse (the change list, which must match the base build's).
 *   glasstap   390 and 820 touch: a tap with 3px of jitter in 8 directions on
 *              the corner start, by touch and by mouse: the lens stays put.
 *   glassthrow 1024 both schemes: the lens carried to an open corner, then
 *              thrown toward the hero window's edge so it slides along it.
 *   glassorbs  1440: the pointer parked ON a pushed orb, every page, then no
 *              style writes for 2 s; and on Home the push read before and
 *              after a scroll (it re-targets).
 *   bauhaus    1440: Home hero hover (film); a grab during the pick-me beat
 *              (beat cancelled, shape held); a press with no ink block yet
 *              (block shown); a release over the shape (one settle into the
 *              lift, never back to 0).
 *   swisskey   the grid key latched at 820 and 1024 touch: the cleared column
 *              tag sits on a baseline-grid line.
 *   swissswap  the in-school swap with the dial dragged left, About clicked
 *              about 175 ms after release (mid-return), 1440 and 390.
 *   swaps      arrival through the switcher and the in-school Home to
 *              Services swap, 1440 and 390, light, for quiet, glass, swiss
 *              and bauhaus (run on stage6-base too, then COMPARE).
 * Output: scripts/themes/.out/stage6/w3/t18/<LABEL>/
 */
import { chromium } from 'playwright';
import sharp from 'sharp';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { writeFile, mkdir, readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '.out', 'stage6', 'w3', 't18');

/* ------------------------------------------------------------- compare */
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
/** Share of pixels that differ by more than 8 on any channel (same size only). */
async function pixelDiff(pa, pb) {
  const [a, b] = await Promise.all([sharp(pa).raw().toBuffer({ resolveWithObject: true }), sharp(pb).raw().toBuffer({ resolveWithObject: true })]);
  if (a.info.width !== b.info.width || a.info.height !== b.info.height) return { size: `${a.info.width}x${a.info.height} vs ${b.info.width}x${b.info.height}` };
  let n = 0;
  const ch = a.info.channels;
  for (let i = 0; i < a.data.length; i += ch) {
    if (Math.abs(a.data[i] - b.data[i]) > 8 || Math.abs(a.data[i + 1] - b.data[i + 1]) > 8 || Math.abs(a.data[i + 2] - b.data[i + 2]) > 8) n++;
  }
  return { share: +(n / (a.data.length / ch)).toFixed(6) };
}
if (process.env.COMPARE) {
  const [A, B] = process.env.COMPARE.split(',');
  const out = join(ROOT, `${A}-vs-${B}`);
  await mkdir(out, { recursive: true });
  const report = { pairs: 0, staticDiff: {}, mouseHover: {} };
  for (const sub of ['business', 'swaps']) {
    const da = join(ROOT, A, sub), db = join(ROOT, B, sub);
    if (!existsSync(da) || !existsSync(db)) continue;
    await mkdir(join(out, sub), { recursive: true });
    for (const f of (await readdir(da)).filter((x) => x.endsWith('.png'))) {
      if (!existsSync(join(db, f))) continue;
      await sideBySide(join(da, f), join(db, f), join(out, sub, f));
      report.pairs++;
      if (f.startsWith('static__')) report.staticDiff[f] = await pixelDiff(join(da, f), join(db, f));
    }
  }
  const ja = join(ROOT, A, 'business', 'business.json'), jb = join(ROOT, B, 'business', 'business.json');
  if (existsSync(ja) && existsSync(jb)) {
    const [a, b] = [JSON.parse(await readFile(ja, 'utf8')), JSON.parse(await readFile(jb, 'utf8'))];
    for (const k of Object.keys(a.forced)) if (k.startsWith('mouse')) {
      const same = JSON.stringify(a.forced[k].changes) === JSON.stringify(b.forced[k]?.changes);
      report.mouseHover[k] = { same, [A]: a.forced[k].changes.length, [B]: b.forced[k]?.changes.length };
    }
  }
  await writeFile(join(out, 'compare.json'), JSON.stringify(report, null, 1));
  console.log(JSON.stringify(report, null, 1));
  process.exit(0);
}

/* ------------------------------------------------------------- set-up */
const LABEL = process.env.LABEL || 'head';
const OUT = join(ROOT, LABEL);
const BASE = process.env.SNAP_BASE || 'http://127.0.0.1:4470';
const ONLY = (process.env.ONLY || 'business,glasstap,glassthrow,glassorbs,bauhaus,swisskey,swissswap,swaps').split(',');
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'] });
const R = { base: BASE, label: LABEL };
{
  const p = await browser.newPage();
  R.renderer = await p.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); });
  await p.close();
  console.log('renderer:', R.renderer);
  if (/swiftshader|llvmpipe|software/i.test(R.renderer)) { await browser.close(); throw new Error('software renderer: evidence invalid'); }
}
const fails = [];

async function newPage(w, h, scheme, { mobile = false, dpr = 1 } = {}) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, colorScheme: scheme, reducedMotion: 'no-preference', isMobile: mobile, hasTouch: mobile });
  await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); sessionStorage.setItem('bdl-swiss-dial-hint', '1'); } catch {} }, scheme);
  await suppressPrompt(context);
  await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  return { context, page, errors, cdp };
}
async function startFilm(page) {
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    frames.push({ data, at: metadata.timestamp });
    try { await cdp.send('Page.screencastFrameAck', { sessionId }); } catch {}
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 82, everyNthFrame: 1 });
  await page.waitForTimeout(200);
  if (!frames.length) {
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 82 });
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
/** n frames at even times over `ms` (the first is the frame before the trigger). */
function pick(frames, n, ms) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const at = i === 0 ? -1 : Math.round((i * ms) / (n - 1));
    const shown = frames.filter((f) => f.ms <= at).pop() ?? frames[0];
    out.push({ ...shown, ms: at, real: shown.ms });
  }
  return out;
}
async function strip(frames, file, title, { cols = 5, cellW = 300, box = null, vpWidth = 0 } = {}) {
  const images = await Promise.all(frames.map((f) => loadImage(Buffer.from(f.data, 'base64'))));
  const k = box ? images[0].width / vpWidth : 1;
  const src = box ? { x: box.x * k, y: box.y * k, w: box.w * k, h: box.h * k } : { x: 0, y: 0, w: images[0].width, h: images[0].height };
  const cellH = Math.round((src.h / src.w) * cellW);
  const PAD = 10, CAP = 24, HEAD = 30;
  const rows = Math.ceil(images.length / cols);
  const canvas = createCanvas(PAD + cols * (cellW + PAD), HEAD + PAD + rows * (cellH + CAP + PAD));
  const c = canvas.getContext('2d');
  c.fillStyle = '#1b1b1d'; c.fillRect(0, 0, canvas.width, canvas.height);
  c.font = '600 14px sans-serif'; c.textBaseline = 'middle'; c.fillStyle = '#e8e6e1';
  c.fillText(title, PAD, HEAD / 2 + 2);
  images.forEach((img, i) => {
    const x = PAD + (i % cols) * (cellW + PAD), y = HEAD + PAD + Math.floor(i / cols) * (cellH + CAP + PAD);
    c.drawImage(img, src.x, src.y, src.w, src.h, x, y, cellW, cellH);
    c.fillStyle = '#e8e6e1';
    c.fillText(frames[i].ms < 0 ? 'before' : `+${frames[i].ms} ms`, x, y + cellH + CAP / 2);
  });
  await writeFile(file, await canvas.encode('png'));
}
async function sub(name) { const d = join(OUT, name); await mkdir(d, { recursive: true }); return d; }

/* ------------------------------------------------------------- business */
if (ONLY.includes('business')) {
  const D = await sub('business');
  const PAGES = [['home', '/'], ['services', '/services/'], ['about', '/about/'], ['contact', '/contact/'], ['lab', '/lab/']];
  const PROPS = ['color', 'opacity', 'borderTopColor', 'backgroundColor', 'textDecorationColor', 'transform'];
  const B = (R.business = { forced: {}, taps: {}, hovers: {} });
  const settle = async (page) => { await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(600); };
  for (const [w, h, mobile] of [[1440, 900, false], [390, 844, true]]) {
    for (const scheme of ['light', 'dark']) {
      const tag = `${mobile ? 'touch' : 'mouse'}__${scheme}__${w}`;
      const { context, page, errors, cdp } = await newPage(w, h, scheme, { mobile, dpr: mobile ? 2 : 1 });
      const forced = (B.forced[tag] = { seen: 0, changes: [] });
      for (const [id, path] of PAGES) {
        await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
        await settle(page);
        if (id === 'home' && scheme === 'light') B[`media__${tag}`] = await page.evaluate(() => ({ hoverHover: matchMedia('(hover: hover)').matches, fine: matchMedia('(pointer: fine)').matches }));
        // Whole-page sheet, then the same with every canvas hidden (the bark field moves) for the pixel compare.
        await page.screenshot({ path: join(D, `sheet__${id}__${scheme}__${w}.png`), fullPage: true });
        await page.addStyleTag({ content: 'canvas{visibility:hidden!important}' });
        await page.waitForTimeout(150);
        await page.screenshot({ path: join(D, `static__${id}__${scheme}__${w}.png`), fullPage: true });
        await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
        await settle(page);
        // Forced :hover on every visible link and button.
        await cdp.send('DOM.enable');
        await cdp.send('CSS.enable');
        const n = await page.evaluate(() => { document.querySelectorAll('a, button').forEach((e, i) => e.setAttribute('data-probe', String(i))); return document.querySelectorAll('[data-probe]').length; });
        const read = (i) => page.evaluate(({ i, PROPS }) => {
          const e = document.querySelector(`[data-probe="${i}"]`);
          const r = e.getBoundingClientRect();
          const cs = getComputedStyle(e);
          const o = {};
          for (const k of PROPS) o[k] = cs[k];
          const arw = e.querySelector('.arw, .fill, .lbl');
          if (arw) { const a = getComputedStyle(arw); o.childTransform = a.transform; o.childColor = a.color; }
          return { vis: r.width > 0 && r.height > 0, label: (e.textContent || e.getAttribute('aria-label') || e.id || '').trim().replace(/\s+/g, ' ').slice(0, 30), o };
        }, { i, PROPS });
        const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
        for (let i = 0; i < n; i++) {
          const before = await read(i);
          if (!before.vis) continue;
          const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: `[data-probe="${i}"]` });
          await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['hover'] });
          await page.waitForTimeout(450);
          const after = await read(i);
          await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] });
          forced.seen++;
          const diff = Object.keys(before.o).filter((k) => before.o[k] !== after.o[k]);
          if (diff.length) forced.changes.push(`${id} [${before.label}] ${diff.map((k) => `${k} ${before.o[k]} -> ${after.o[k]}`).join('; ')}`);
        }
        await cdp.send('CSS.disable');
        await cdp.send('DOM.disable');
        if (!mobile) {
          // A real mouse hover on the first header link, then on the toggle.
          await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
          await settle(page);
          const link = page.locator('header nav a:visible').first();
          const rest = await link.evaluate((e) => getComputedStyle(e).color);
          await link.hover();
          await page.waitForTimeout(450);
          const hov = await link.evaluate((e) => getComputedStyle(e).color);
          await page.screenshot({ path: join(D, `hover-link__${id}__${scheme}__${w}.png`) });
          const tog = page.locator('#theme-toggle');
          const togRest = await tog.evaluate((e) => getComputedStyle(e).borderTopColor);
          await tog.hover();
          await page.waitForTimeout(450);
          const togHov = await tog.evaluate((e) => getComputedStyle(e).borderTopColor);
          const tb = await tog.boundingBox();
          await page.screenshot({ path: join(D, `hover-toggle__${id}__${scheme}__${w}.png`), clip: { x: Math.max(0, tb.x - 300), y: 0, width: Math.min(w - Math.max(0, tb.x - 300), 420), height: Math.max(120, tb.y + tb.height + 30) } });
          B.hovers[`${id}__${scheme}`] = { link: [rest, hov], toggle: [togRest, togHov] };
          await page.mouse.move(5, h - 5);
        } else {
          // A real tap on a link (navigation held) and two taps on the toggle.
          await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
          await settle(page);
          const link = page.locator('main a:not(.skip):visible').first();
          await link.scrollIntoViewIfNeeded();
          await page.evaluate(() => document.addEventListener('click', (e) => { if (e.target.closest('a')) e.preventDefault(); }, true));
          const rest = await link.evaluate((e) => getComputedStyle(e).color);
          await link.tap();
          await page.waitForTimeout(600);
          const after = await link.evaluate((e) => getComputedStyle(e).color);
          await page.screenshot({ path: join(D, `tap-link__${id}__${scheme}__${w}.png`) });
          const tog = page.locator('#theme-toggle:visible');
          let togs = null;
          if (await tog.count()) {
            await tog.scrollIntoViewIfNeeded();
            const togRest = await tog.evaluate((e) => getComputedStyle(e).borderTopColor);
            await tog.tap(); await page.waitForTimeout(500); await tog.tap(); await page.waitForTimeout(700);
            const togAfter = await tog.evaluate((e) => getComputedStyle(e).borderTopColor);
            await page.screenshot({ path: join(D, `tap-toggle__${id}__${scheme}__${w}.png`) });
            togs = [togRest, togAfter];
            if (togRest !== togAfter) fails.push(`business ${tag} ${id}: toggle border stuck ${togRest} -> ${togAfter}`);
          }
          B.taps[`${id}__${scheme}`] = { link: [rest, after], toggle: togs };
          if (rest !== after) fails.push(`business ${tag} ${id}: link colour stuck after tap ${rest} -> ${after}`);
        }
      }
      // The Lab index's own catalog components (SpecimenCatalog, SpecimenCard)
      // carry their own ungated hovers: outside this task's three shared files,
      // recorded apart and reported, not failed here.
      if (mobile) {
        forced.outOfScope = forced.changes.filter((c) => c.startsWith('lab '));
        const inScope = forced.changes.filter((c) => !c.startsWith('lab '));
        if (inScope.length) fails.push(`business ${tag}: ${inScope.length} change(s) under forced :hover on touch`);
      }
      if (!mobile && forced.changes.length === 0) fails.push(`business ${tag}: mouse control changed nothing`);
      forced.errors = errors;
      console.log('business', tag, 'seen', forced.seen, 'changes', forced.changes.length, 'errors', errors.length);
      await context.close();
    }
  }
  await writeFile(join(D, 'business.json'), JSON.stringify(B, null, 1));
}

/* ------------------------------------------------------------- glass */
const waitLens = (page) => page.waitForFunction(() => document.querySelector('.lens-canvas')?.style.visibility === 'visible', null, { timeout: 9000 }).then(() => true).catch(() => false);
async function lensState(page) {
  return page.evaluate(() => {
    const hits = document.querySelectorAll('.lens-hit');
    const hit = hits[hits.length - 1];
    if (!hit) return { hits: 0 };
    const q = hit.getBoundingClientRect();
    const cx = q.left + q.width / 2, cy = q.top + q.height / 2, r = q.width / 2;
    let n = 0, on = 0, best = null, bestD = -1;
    for (let y = -r + 3; y < r; y += 6) for (let x = -r + 3; x < r; x += 6) {
      if (x * x + y * y > r * r) continue;
      n++;
      if (document.elementFromPoint(cx + x, cy + y) === hit) { on++; const d = -Math.hypot(x, y); if (d > bestD || !best) { bestD = d; best = [cx + x, cy + y]; } }
    }
    return { c: [+cx.toFixed(1), +cy.toFixed(1)], r: Math.round(r), grab: n ? +(on / n).toFixed(3) : 0, open: best && best.map(Math.round), hits: hits.length, source: document.getElementById('glass-lens-host')?.dataset.lensSource };
  });
}
async function track(page, ms) {
  const path = [];
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { const s = await lensState(page); path.push({ t: Date.now() - t0, c: s.c, grab: s.grab }); await page.waitForTimeout(80); }
  return path;
}
const hiddenMs = (path) => { let run = 0, best = 0, prev = null; for (const p of path) { if (p.grab < 0.45) { run += prev == null ? 0 : p.t - prev; best = Math.max(best, run); } else run = 0; prev = p.t; } return best; };

if (ONLY.includes('glasstap')) {
  const D = await sub('glass');
  R.glasstap = {};
  const DIRS = [[3, 0], [-3, 0], [0, 3], [0, -3], [2, 2], [-2, 2], [2, -2], [-2, -2]];
  for (const [w, h] of [[390, 844], [820, 1180]]) {
    for (const how of ['touch', 'mouse']) {
      const tag = `${how}__${w}`;
      const cases = (R.glasstap[tag] = []);
      for (const [dx, dy] of DIRS) {
        const { context, page, cdp } = await newPage(w, h, 'light', { mobile: true });
        await page.goto(`${BASE}/t/glassmorphism/`, { waitUntil: 'networkidle' });
        await waitLens(page);
        await page.waitForTimeout(700);
        const a = await lensState(page);
        const p = a.open ?? a.c;
        if (how === 'touch') {
          const pt = (x, y) => [{ x, y, id: 1, radiusX: 4, radiusY: 4, force: 1 }];
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(p[0], p[1]) });
          await page.waitForTimeout(16);
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(p[0] + dx / 2, p[1] + dy / 2) });
          await page.waitForTimeout(16);
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(p[0] + dx, p[1] + dy) });
          await page.waitForTimeout(16);
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        } else {
          await page.mouse.move(p[0], p[1]);
          await page.mouse.down();
          await page.mouse.move(p[0] + dx / 2, p[1] + dy / 2);
          await page.waitForTimeout(16);
          await page.mouse.move(p[0] + dx, p[1] + dy);
          await page.waitForTimeout(16);
          await page.mouse.up();
        }
        await page.waitForTimeout(1500);
        const b = await lensState(page);
        const moved = +Math.hypot(b.c[0] - a.c[0], b.c[1] - a.c[1]).toFixed(1);
        cases.push({ jitter: [dx, dy], start: a.c, source: a.source, end: b.c, moved });
        if (a.source !== 'corner') fails.push(`glasstap ${tag}: start is ${a.source}, not the corner`);
        if (moved > 1) fails.push(`glasstap ${tag} jitter ${dx},${dy}: lens moved ${moved}px`);
        if (dx === 3 && dy === 0) await page.screenshot({ path: join(D, `tap__${tag}__after.png`) });
        await context.close();
      }
      console.log('glasstap', tag, cases.map((c) => c.moved).join(' '));
    }
  }
}

if (ONLY.includes('glassthrow')) {
  const D = await sub('glass');
  R.glassthrow = {};
  for (const scheme of ['light', 'dark']) {
    const tag = `${scheme}__1024`;
    const { context, page, errors } = await newPage(1024, 768, scheme);
    await page.goto(`${BASE}/t/glassmorphism/`, { waitUntil: 'networkidle' });
    await waitLens(page);
    await page.waitForTimeout(600);
    const s0 = await lensState(page);
    const win = await page.evaluate(() => { const r = document.querySelector('.hero .window').getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; });
    // At 1024x768 the hero window fills the travel box but for its margins,
    // so the page is scrolled until the window's foot sits mid-screen: open
    // wallpaper below it. The lens (fixed) starts in the open bottom-left
    // corner, carried there slowly (no throw) and let rest, before each throw.
    await page.evaluate((y) => scrollTo(0, y), Math.round(win.b - 420));
    await page.waitForTimeout(1500);
    const winS = await page.evaluate(() => { const r = document.querySelector('.hero .window').getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; });
    R.glassthrow[tag] = { window: win, windowScrolled: winS, start: s0.c, throws: {}, errors };
    const toCorner = async () => {
      const s = await lensState(page);
      const g = s.open ?? s.c;
      const off = [g[0] - s.c[0], g[1] - s.c[1]];
      await page.mouse.move(g[0], g[1]);
      await page.mouse.down();
      const to = [off[0], 768 + off[1]]; // past the bottom-left: clamps to the travel box's corner
      for (let i = 1; i <= 24; i++) { await page.mouse.move(g[0] + ((to[0] - g[0]) * i) / 24, g[1] + ((to[1] - g[1]) * i) / 24, { steps: 2 }); await page.waitForTimeout(20); }
      await page.waitForTimeout(200);
      await page.mouse.up();
      await page.waitForTimeout(1500);
      return lensState(page);
    };
    // Up and right into the window's foot (it slides along it); nearly straight up into it; along under it.
    for (const [name, dir] of [['diagonal-into-edge', [1, -0.7]], ['up-into-edge', [0.15, -1]], ['along-under-edge', [1, 0]]]) {
      const s1 = await toCorner();
      const g = s1.open ?? s1.c;
      const film = await startFilm(page);
      await page.mouse.move(g[0], g[1]);
      await page.mouse.down();
      for (let i = 1; i <= 10; i++) { await page.mouse.move(g[0] + dir[0] * i * 14, g[1] + dir[1] * i * 14); await page.waitForTimeout(8); }
      await page.mouse.up();
      const path = await track(page, 2200);
      await strip(pick(await film.stop(), 10, 2200), join(D, `throw-${name}__${tag}.png`), `glass throw ${name} from the open bottom-left corner (start ${s1.c}, window foot at y ${Math.round(winS.b)}), ${scheme} 1024x768`, { cols: 5, cellW: 320 });
      const end = await lensState(page);
      const C = (R.glassthrow[tag].throws[name] = { corner: s1.c, cornerGrab: s1.grab, end: end.c, endGrab: end.grab, hiddenMs: hiddenMs(path), path });
      if (C.hiddenMs > 500) fails.push(`glassthrow ${tag} ${name}: hidden ${C.hiddenMs} ms`);
      if (end.grab < 0.45) fails.push(`glassthrow ${tag} ${name}: ends grab ${end.grab}`);
      console.log('glassthrow', tag, name, JSON.stringify({ corner: s1.c, cornerGrab: s1.grab, end: end.c, grab: end.grab, hidden: C.hiddenMs, far: Math.max(...path.map((p) => Math.hypot(p.c[0] - s1.c[0], p.c[1] - s1.c[1]))).toFixed(0) }));
    }
    await context.close();
  }
}

if (ONLY.includes('glassorbs')) {
  const D = await sub('glass');
  R.glassorbs = { still: {} };
  // The push is the x token of the inline translate: Home writes
  // 'calc(-50% - 54.17px) calc(...)' (sign spelled out), the other pages a
  // margin. Anchored at the start so the y token's scroll offset never reads as a push.
  const offsetOf = (page) => page.evaluate(() => { let m = 0; for (const o of document.querySelectorAll('.orb')) { const t = /^calc\(-50% ([+-]) ([\d.]+)px\)/.exec(o.style.translate); m = Math.max(m, Math.abs(t ? Number(t[2]) : parseFloat(o.style.marginLeft) || 0), Math.abs(parseFloat(o.style.marginTop) || 0)); } return +m.toFixed(2); });
  const orbCentre = (page) => page.evaluate(() => {
    for (const o of document.querySelectorAll('.orb')) {
      const r = o.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (r.width > 0 && cy > 120 && cy < innerHeight - 120 && cx > 60 && cx < innerWidth - 60) return [Math.round(cx + r.width * 0.12), Math.round(cy + r.height * 0.08)]; // just off centre: the push then has an x part (read below)
    }
    return null;
  });
  for (const path of ['', 'about/', 'services/', 'contact/']) {
    const { context, page } = await newPage(1440, 900, 'light');
    await page.goto(`${BASE}/t/glassmorphism/${path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const at = (await orbCentre(page)) ?? [700, 450];
    await page.mouse.move(at[0] - 120, at[1] - 40);
    await page.mouse.move(at[0], at[1], { steps: 10 });
    await page.waitForTimeout(4000);
    const offset = await offsetOf(page);
    const writes = await page.evaluate(() => new Promise((res) => { let n = 0; const mo = new MutationObserver((r) => { n += r.length; }); document.querySelectorAll('.orb').forEach((o) => mo.observe(o, { attributes: true, attributeFilter: ['style'] })); setTimeout(() => { mo.disconnect(); res(n); }, 2000); }));
    await page.screenshot({ path: join(D, `still__${path.replace('/', '') || 'home'}.png`) });
    R.glassorbs.still[path || 'home'] = { at, offset, writes };
    if (offset === 0) fails.push(`glassorbs still ${path || 'home'}: the parked pointer pushed nothing (probe tests nothing)`);
    if (writes > 0) fails.push(`glassorbs still ${path || 'home'}: ${writes} orb style writes in 2 s`);
    console.log('still', path || 'home', at, 'offset', offset, 'writes', writes);
    await context.close();
  }
  {
    const { context, page } = await newPage(1440, 900, 'light');
    await page.goto(`${BASE}/t/glassmorphism/`, { waitUntil: 'networkidle' });
    await waitLens(page);
    await page.waitForTimeout(1200);
    const read = () => page.evaluate(() => [...document.querySelectorAll('.orbs[data-js-driven] .orb')].map((o) => { const m = /^calc\(-50% ([+-]) ([\d.]+)px\)/.exec(o.style.translate); return m ? +((m[1] === '-' ? -1 : 1) * m[2]).toFixed(2) : 0; }));
    const at = (await orbCentre(page)) ?? [720, 600];
    await page.mouse.move(at[0] - 120, at[1], { steps: 4 });
    await page.mouse.move(at[0], at[1], { steps: 10 });
    await page.waitForTimeout(3000);
    const a = await read();
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(3000);
    const b = await read();
    R.glassorbs.scroll = { at, before: a, after: b };
    if (!a.some((x) => Math.abs(x) > 0.5)) fails.push('glassorbs scroll: nothing pushed before the scroll');
    if (JSON.stringify(a) === JSON.stringify(b)) fails.push('glassorbs scroll: the push did not re-target');
    console.log('scroll', at, JSON.stringify(a), '->', JSON.stringify(b));
    await context.close();
  }
}

/* ------------------------------------------------------------- bauhaus */
if (ONLY.includes('bauhaus')) {
  const D = await sub('bauhaus');
  const B = (R.bauhaus = {});
  const builtDone = (page) => page.waitForFunction(() => {
    const svg = document.querySelector('svg[data-beat]');
    return svg && svg.getAnimations({ subtree: true }).every((a) => a.playState === 'finished' || a.playState === 'idle');
  }, null, { timeout: 15000 });
  const centre = (page, sel) => page.evaluate((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, sel);
  // Hover on the hero square (the pick-me shape), after the beat.
  for (const scheme of ['light', 'dark']) {
    const { context, page } = await newPage(1440, 900, scheme);
    await page.goto(`${BASE}/t/bauhaus/`, { waitUntil: 'networkidle' });
    await builtDone(page);
    await page.waitForTimeout(1400);
    const c = await centre(page, '[data-pick-me]');
    const box = await page.evaluate(() => { const r = document.querySelector('svg[data-beat]').getBoundingClientRect(); return { x: Math.max(0, r.left - 20), y: Math.max(0, r.top - 20), w: Math.min(innerWidth, r.width + 40), h: Math.min(innerHeight - Math.max(0, r.top - 20), r.height + 40) }; });
    await page.mouse.move(c[0] - 300, c[1] + 200);
    const film = await startFilm(page);
    await page.mouse.move(c[0], c[1], { steps: 8 });
    await page.waitForTimeout(500);
    await page.mouse.move(c[0] - 300, c[1] + 200, { steps: 8 });
    await page.waitForTimeout(400);
    await strip(pick(await film.stop(), 10, 1100), join(D, `home-hover__${scheme}__1440.png`), `bauhaus Home: hover onto the hero square and off, ${scheme} 1440`, { cols: 5, cellW: 300, box, vpWidth: 1440 });
    await context.close();
  }
  // A grab during the pick-me beat.
  {
    const { context, page } = await newPage(1440, 900, 'light');
    await page.goto(`${BASE}/t/bauhaus/`, { waitUntil: 'networkidle' });
    await builtDone(page);
    const c = await centre(page, '[data-pick-me]');
    await page.mouse.move(c[0] - 400, c[1] + 250);
    await page.waitForFunction(() => document.querySelector('[data-pick-me]').getAnimations().some((a) => a.playState === 'running'), null, { timeout: 3000, polling: 'raf' });
    const film = await startFilm(page);
    await page.waitForTimeout(120); // mid-beat
    const midBeat = await page.evaluate(() => document.querySelector('[data-pick-me]').getAnimations().filter((a) => a.playState === 'running').length);
    await page.mouse.move(c[0], c[1], { steps: 2 });
    await page.mouse.down();
    const afterDown = await page.evaluate(() => { const el = document.querySelector('[data-pick-me]'); return { running: el.getAnimations().filter((a) => a.playState === 'running' && !(a instanceof CSSTransition)).length, held: el.hasAttribute('data-held'), block: !!el.parentNode.querySelector('.lshadow[data-on]') }; });
    for (let i = 1; i <= 8; i++) { await page.mouse.move(c[0] + i * 12, c[1] - i * 6); await page.waitForTimeout(16); }
    await page.waitForTimeout(150);
    const carried = await page.evaluate(() => document.querySelector('[data-pick-me]').style.translate);
    await page.mouse.up();
    await page.mouse.move(c[0] - 400, c[1] + 250);
    await page.waitForTimeout(600);
    const box = await page.evaluate(() => { const r = document.querySelector('svg[data-beat]').getBoundingClientRect(); return { x: Math.max(0, r.left - 20), y: Math.max(0, r.top - 20), w: Math.min(innerWidth, r.width + 40), h: Math.min(innerHeight - Math.max(0, r.top - 20), r.height + 40) }; });
    await strip(pick(await film.stop(), 10, 1300), join(D, 'grab-during-beat__light__1440.png'), 'bauhaus Home: press on the square 120 ms into the pick-me beat, drag, release', { cols: 5, cellW: 300, box, vpWidth: 1440 });
    B.grabDuringBeat = { midBeat, afterDown, carried };
    if (midBeat < 1) fails.push('bauhaus: the beat was not running when the grab started');
    if (afterDown.running !== 0 || !afterDown.held) fails.push(`bauhaus grab during beat: ${JSON.stringify(afterDown)}`);
    console.log('bauhaus grab during beat', JSON.stringify(B.grabDuringBeat));
    await context.close();
  }
  // Hover during the beat, and an arrow key during the beat.
  for (const how of ['hover', 'key']) {
    const { context, page } = await newPage(1440, 900, 'light');
    await page.goto(`${BASE}/t/bauhaus/`, { waitUntil: 'networkidle' });
    await builtDone(page);
    const c = await centre(page, '[data-pick-me]');
    await page.mouse.move(c[0] - 400, c[1] + 250);
    if (how === 'key') await page.focus('[data-pick-me]');
    await page.waitForFunction(() => document.querySelector('[data-pick-me]').getAnimations().some((a) => a.playState === 'running'), null, { timeout: 3000, polling: 'raf' });
    await page.waitForTimeout(100);
    if (how === 'hover') await page.mouse.move(c[0], c[1], { steps: 2 }); else await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(60);
    const st = await page.evaluate(() => { const el = document.querySelector('[data-pick-me]'); return { running: el.getAnimations().filter((a) => a.playState === 'running' && !(a instanceof CSSTransition)).length, lift: el.hasAttribute('data-lift'), held: el.hasAttribute('data-held'), translate: el.style.translate }; });
    B[`${how}DuringBeat`] = st;
    if (st.running !== 0 || (how === 'hover' ? !st.lift : !st.held)) fails.push(`bauhaus ${how} during beat: ${JSON.stringify(st)}`);
    console.log('bauhaus', how, 'during beat', JSON.stringify(st));
    await context.close();
  }
  // A press with no ink block yet (pointer entered during the build), and the release over the shape.
  {
    const { context, page } = await newPage(1440, 900, 'light');
    const sel = '[data-loose]:not([data-pick-me])';
    await page.goto(`${BASE}/t/bauhaus/`, { waitUntil: 'networkidle' });
    await builtDone(page);
    const c = await centre(page, sel); // where the shape rests once built
    // A new visit with the pointer already there: it enters while the poster
    // is still building (refused: no lift, no block) and never leaves.
    await page.goto(`${BASE}/t/bauhaus/services/`, { waitUntil: 'networkidle' });
    await page.mouse.move(c[0], c[1]);
    await page.goto(`${BASE}/t/bauhaus/`, { waitUntil: 'domcontentloaded' });
    await page.mouse.move(c[0] + 1, c[1]);
    await builtDone(page);
    await page.waitForTimeout(1600); // past the beat
    const pre = await page.evaluate((sel) => !!document.querySelector(sel).parentNode.querySelector('.lshadow'), sel);
    await page.mouse.down();
    const onPress = await page.evaluate((sel) => { const el = document.querySelector(sel); return { block: !!el.parentNode.querySelector('.lshadow[data-on]'), held: el.hasAttribute('data-held') }; }, sel);
    // Release in place: record translate every frame for 600 ms.
    const samples = page.evaluate((sel) => new Promise((res) => {
      const el = document.querySelector(sel);
      const out = [];
      const t0 = performance.now();
      const tick = () => { const t = performance.now() - t0; out.push([Math.round(t), getComputedStyle(el).translate]); if (t < 650) requestAnimationFrame(tick); else res(out); };
      requestAnimationFrame(tick);
    }), sel);
    await page.waitForTimeout(30);
    await page.mouse.up();
    const ys = (await samples).map(([t, tr]) => [t, tr === 'none' ? 0 : parseFloat(tr.split(' ')[1] ?? tr.split(' ')[0])]);
    const lift = await page.evaluate((sel) => { const el = document.querySelector(sel); return getComputedStyle(el).translate; }, sel);
    const minY = Math.min(...ys.map((y) => y[1])), maxY = Math.max(...ys.map((y) => y[1]));
    B.pressRelease = { blockBeforePress: pre, onPress, endTranslate: lift, minY, maxY, samples: ys };
    if (!onPress.block) fails.push('bauhaus press: no ink block on a mouse press');
    if (maxY > -0.01) fails.push(`bauhaus release over the shape: translate reached ${maxY} (back to 0 before the lift)`);
    console.log('bauhaus press/release', JSON.stringify({ pre, onPress, minY, maxY, end: lift }));
    await context.close();
  }
}

/* ------------------------------------------------------------- swiss */
if (ONLY.includes('swisskey')) {
  const D = await sub('swiss');
  R.swisskey = {};
  for (const [w, h] of [[820, 1180], [1024, 768]]) {
    const { context, page } = await newPage(w, h, 'light', { mobile: true, dpr: 2 });
    await page.goto(`${BASE}/t/swiss/`, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    await page.locator('[data-sw-grid-key]').tap();
    await page.waitForTimeout(400);
    const info = await page.evaluate(() => {
      const key = document.querySelector('[data-sw-grid-key]');
      const kr = key.getBoundingClientRect();
      const u = kr.height;
      const g = document.querySelector('[data-sw-guides]');
      const clearY = parseFloat(g.style.getPropertyValue('--clear-y'));
      const cleared = [...g.children].filter((c) => c.hasAttribute('data-clear')).map((c) => { const cs = getComputedStyle(c, '::before'); return { top: parseFloat(cs.top), content: cs.content }; });
      return { pressed: key.getAttribute('aria-pressed'), u, keyBottom: kr.bottom, clearY, onGrid: Math.abs(clearY / u - Math.round(clearY / u)) < 0.01, cleared };
    });
    R.swisskey[w] = info;
    if (!info.onGrid) fails.push(`swisskey ${w}: --clear-y ${info.clearY} is not a whole number of ${info.u}px lines`);
    await page.screenshot({ path: join(D, `key-latched__${w}__touch.png`), clip: { x: 0, y: 0, width: w, height: Math.min(h, 240) } });
    console.log('swisskey', w, JSON.stringify(info));
    await context.close();
  }
}
if (ONLY.includes('swissswap')) {
  const D = await sub('swiss');
  R.swissswap = {};
  for (const [w, h, mobile] of [[1440, 900, false], [390, 844, true]]) {
    const { context, page } = await newPage(w, h, 'light', { mobile });
    await page.goto(`${BASE}/t/swiss/`, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    const dbox = await page.evaluate(() => { const b = (document.querySelector('[data-sw-dial]') || document.querySelector('main h1')).getBoundingClientRect(); return { l: b.left, t: b.top, b: b.bottom }; });
    const y = (dbox.t + dbox.b) / 2;
    const x0 = mobile ? 330 : dbox.l + 700;
    await page.mouse.move(x0, y); await page.mouse.down();
    for (let i = 1; i <= 10; i++) { await page.mouse.move(x0 - i * 30, y); await page.waitForTimeout(16); }
    const readW = () => page.evaluate(() => { const d = document.querySelector('[data-sw-dial]'); return d ? Number(d.getAttribute('aria-valuenow')) : null; });
    const atRelease = await readW();
    const film = await startFilm(page);
    await page.mouse.up();
    // Sample the dial value every frame until the click lands, so the click is shown to be mid-travel.
    const trace = page.evaluate(() => new Promise((res) => { const out = []; const t0 = performance.now(); const tick = () => { const d = document.querySelector('[data-sw-dial]'); out.push([Math.round(performance.now() - t0), d ? Number(d.getAttribute('aria-valuenow')) : null]); if (performance.now() - t0 < 400) requestAnimationFrame(tick); else res(out); }; requestAnimationFrame(tick); }));
    await page.waitForTimeout(175);
    const atClick = await readW();
    await page.locator('nav a', { hasText: 'About' }).first().click();
    await page.waitForTimeout(1100);
    const frames = await film.stop();
    await strip(pick(frames, 12, 1100), join(D, `swap-mid-return__${w}.png`), `swiss in-school swap to About, dial dragged left, About clicked 175 ms after release (mid-return), ${w}`, { cols: 6, cellW: mobile ? 150 : 230 });
    R.swissswap[w] = { atRelease, atClick, trace: await trace.catch(() => null) };
    console.log('swissswap', w, 'release', atRelease, 'click', atClick);
    await context.close();
  }
}

/* ------------------------------------------------------------- swaps */
if (ONLY.includes('swaps')) {
  const D = await sub('swaps');
  for (const school of ['quiet', 'glassmorphism', 'swiss', 'bauhaus']) {
    const from = school === 'quiet' ? 'swiss' : 'quiet';
    for (const [w, h, mobile] of [[1440, 900, false], [390, 844, true]]) {
      {
        const { context, page } = await newPage(w, h, 'light', { mobile });
        await page.goto(`${BASE}/t/${from}/`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(800);
        await page.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('.open').click());
        await page.waitForTimeout(700);
        const film = await startFilm(page);
        await page.evaluate((s) => document.querySelector('bdl-switcher').shadowRoot.querySelector(`a[data-school="${s}"]`).click(), school);
        await page.waitForTimeout(2000);
        await strip(pick(await film.stop(), 10, 1800), join(D, `arrival__${from}-to-${school}__${w}.png`), `${LABEL}: arrival ${from} to ${school} through the switcher, Home, light ${w}`, { cols: 5, cellW: mobile ? 180 : 300 });
        await context.close();
      }
      {
        const { context, page } = await newPage(w, h, 'light', { mobile });
        await page.goto(`${BASE}/t/${school}/`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1500);
        const film = await startFilm(page);
        await page.locator(`a[href$="/t/${school}/services/"]:visible`).first().click();
        await page.waitForTimeout(1500);
        await strip(pick(await film.stop(), 10, 1300), join(D, `swap__${school}-home-to-services__${w}.png`), `${LABEL}: in-school swap Home to Services, ${school}, light ${w}`, { cols: 5, cellW: mobile ? 180 : 300 });
        await context.close();
      }
      console.log('swaps', school, w);
    }
  }
}

await browser.close();
R.fails = fails;
await writeFile(join(OUT, `results-${ONLY.join('-')}.json`), JSON.stringify(R, null, 1));
console.log(fails.length ? `FAIL\n${fails.join('\n')}` : 'PASS');
process.exitCode = fails.length ? 1 : 0;
