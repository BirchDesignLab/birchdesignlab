/**
 * Wave B2 round 4, seat glass-fix-r4: the proof set for G1 (orbs-clock
 * measure), G2 (B1's phone hero back, the phone lens half under the window's
 * lower corner) and G3 (Control Centre tiles clear of the desktop switcher).
 *
 * Sections (--only a,b,...; default all):
 *   firstview  390x844 and 820x1180 (and the desktop sizes for reference),
 *              light and dark: lens, window and orb geometry, the window and
 *              lens outlined; round 3's firstviews beside them as the before.
 *   pages      whole-page Home at 1440x900 and 390x844, light and dark; a
 *              before/after sheet with round 3's first views and B1's phone
 *              page.
 *   touch      390x844 touch films: a drag starting on the lens's visible
 *              lower half, a swipe starting on the covered upper half (the
 *              window keeps it: the page scrolls, the lens stays), and a
 *              swipe on the hero copy (the page scrolls).
 *   ccsw       every Control Centre tile vs every visible box in the portal
 *              switcher's shadow root at 1440x900, 1280x800, 1024x768: at
 *              scroll 0, with the tiles in view, and a 10 px scroll sweep;
 *              the gap in px.
 *   arrival    a cross-school arrival at glass Home through the real
 *              switcher (vaporwave, then back), 1440x900 and 390x844, as a
 *              timestamped strip.
 * GPU Chromium (aborts on SwiftShader), reduced transparency forced off, the
 * portal prompt suppressed.
 * Usage: node scripts/themes/glassmorphism/b2r4-glass-fix-r4-proof.mjs --base http://127.0.0.1:4471 [--only touch,ccsw]
 */
import { chromium } from 'playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (n, f) => { const i = args.indexOf(`--${n}`); return i === -1 ? f : args[i + 1]; };
const base = arg('base', 'http://127.0.0.1:4471');
const only = arg('only', '').split(',').filter(Boolean);
const B2 = join(HERE, '..', '.out', 'stage3-b2');
const OUT = arg('out', join(B2, 'glass-fix-r4', 'proof'));
const HOME = `${base}/t/glassmorphism/`;
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const R = { base };
{
  const p = await browser.newPage();
  R.renderer = await p.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); });
  await p.close();
  console.log('renderer:', R.renderer);
  if (/swiftshader|llvmpipe/i.test(R.renderer)) { await browser.close(); throw new Error('software renderer; abort'); }
}

async function ctx({ w, h, scheme = 'light', phone = w < 600 }) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, hasTouch: phone, isMobile: phone, deviceScaleFactor: phone ? 2 : 1 });
  await suppressPrompt(context);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }, { name: 'prefers-color-scheme', value: scheme }] });
  return { context, page, cdp, errors };
}
const mountWait = (page) => page.waitForFunction(() => document.querySelector('.lens-poster')?.style.display === 'none', { timeout: 10000 }).then(() => true).catch(() => false);
async function open(page, scheme, url = HOME) {
  await page.goto(url, { waitUntil: 'networkidle' });
  const cur = await page.evaluate(() => document.documentElement.dataset.scheme);
  if (cur !== scheme) { await page.evaluate((s) => { document.documentElement.dataset.scheme = s; }, scheme); await page.waitForTimeout(700); }
  const ok = await mountWait(page);
  await page.waitForTimeout(400);
  return ok;
}
const geo = (page) => page.evaluate(() => {
  const rr = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom].map((v) => Math.round(v)); };
  const hit = document.querySelector('.lens-hit')?.getBoundingClientRect();
  const lens = hit ? { cx: Math.round(hit.left + hit.width / 2), cy: Math.round(hit.top + hit.height / 2), r: Math.round(hit.width / 2) } : null;
  const host = document.querySelector('#glass-lens-host');
  const orbs = [...document.querySelectorAll('.orb')].map((o) => { const r = o.getBoundingClientRect(); return { cls: o.className, cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2), r: Math.round(r.width / 2) }; })
    .filter((o) => o.cy + o.r > 0 && o.cy - o.r < innerHeight);
  const crossed = lens ? orbs.filter((o) => { const d = Math.hypot(o.cx - lens.cx, o.cy - lens.cy); return d < o.r + lens.r && d > Math.abs(o.r - lens.r); }).map((o) => o.cls) : [];
  return { scrollY: Math.round(scrollY), lens, start: host?.dataset.lensStart, cover: host?.dataset.lensCover, source: host?.dataset.lensSource, window: rr(document.querySelector('.hero .window')), cc: rr(document.querySelector('.control-centre')), switcher: rr(document.querySelector('bdl-switcher')), orbsInView: orbs, crossed };
});

async function sheet(file, rows, { scale = 1, title = '' } = {}) {
  const imgs = await Promise.all(rows.map((row) => Promise.all(row.map(async ([l, b]) => [l, await loadImage(b)]))));
  const cw = Math.max(...imgs.flat().map(([, i]) => i.width)) * scale;
  const ch = Math.max(...imgs.flat().map(([, i]) => i.height)) * scale;
  const cols = Math.max(...imgs.map((r) => r.length));
  const lh = 62, pad = 12, th = title ? 44 : 0;
  const c = createCanvas(Math.round(cols * (cw + pad) + pad), Math.round(th + imgs.length * (ch + lh + pad) + pad));
  const g = c.getContext('2d');
  g.fillStyle = '#1c1c1c'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#fff';
  if (title) { g.font = 'bold 26px sans-serif'; g.fillText(title, pad, 32); }
  g.font = '22px sans-serif';
  imgs.forEach((row, ri) => row.forEach(([l, im], ci) => {
    const x = pad + ci * (cw + pad), y = th + pad + ri * (ch + lh + pad);
    g.fillStyle = '#fff';
    // wrap the label to the column width, two lines at most
    const words = l.split(' '); let line = '', ly = y + 24, n = 0;
    for (const wd of words) {
      const t = line ? `${line} ${wd}` : wd;
      if (g.measureText(t).width > cw - 4 && line && n === 0) { g.fillText(line, x, ly); ly += 27; n++; line = wd; } else line = t;
    }
    g.fillText(line, x, ly);
    g.imageSmoothingEnabled = true;
    g.drawImage(im, x, y + lh, im.width * scale, im.height * scale);
  }));
  const path = join(OUT, file);
  await writeFile(path, c.toBuffer('image/jpeg', 92));
  console.log('wrote', path);
}
/** Outlines on a viewport screenshot (CSS px; `k` = device pixel ratio). */
async function outline(buf, k, shapes) {
  const im = await loadImage(buf);
  const c = createCanvas(im.width, im.height); const g = c.getContext('2d'); g.drawImage(im, 0, 0);
  g.lineWidth = 2 * k;
  for (const s of shapes) {
    g.strokeStyle = s.color;
    if (s.rect) g.strokeRect(s.rect[0] * k, s.rect[1] * k, (s.rect[2] - s.rect[0]) * k, (s.rect[3] - s.rect[1]) * k);
    if (s.circle) { g.beginPath(); g.arc(s.circle[0] * k, s.circle[1] * k, s.circle[2] * k, 0, Math.PI * 2); g.stroke(); }
    if (s.dot) { g.fillStyle = s.color; g.beginPath(); g.arc(s.dot[0] * k, s.dot[1] * k, 5 * k, 0, Math.PI * 2); g.fill(); }
  }
  return c.toBuffer('image/png');
}
async function maybe(path) { return existsSync(path) ? readFile(path) : null; }

/* ---------------- firstview ---------------- */
async function firstview() {
  R.firstview = {};
  const rows = [];
  for (const [w, h] of [[390, 844], [820, 1180], [1440, 900], [1280, 800], [1024, 768]]) {
    const row = [];
    for (const scheme of ['light', 'dark']) {
      const { context, page, errors } = await ctx({ w, h, scheme });
      const mounted = await open(page, scheme);
      const g = await geo(page);
      const k = w < 600 ? 2 : 1;
      const raw = await page.screenshot();
      await writeFile(join(OUT, `firstview__${w}x${h}__${scheme}.png`), raw);
      const buf = await outline(raw, k, [{ color: 'rgba(0,200,255,0.9)', rect: g.window }, ...(g.lens ? [{ color: 'rgba(255,40,40,0.95)', circle: [g.lens.cx, g.lens.cy, g.lens.r] }] : [])]);
      R.firstview[`${w}x${h}__${scheme}`] = { mounted, ...g, errors };
      if (w < 900) row.push([`${w}x${h} ${scheme}: lens (${g.lens?.cx},${g.lens?.cy}) r${g.lens?.r}, window bottom ${g.window?.[3]}, cover ${g.cover}, ${g.source}, crosses ${g.crossed.join('/') || 'none'}`, buf]);
      await context.close();
    }
    if (row.length) rows.push(row);
  }
  // phone before/after: round 3 (the re-critic's own first view) and B1.
  const r3 = await maybe(join(B2, 'glass-fix-r3', 'critic-rerun', 'firstview__390x844__light.png'));
  const r3d = await maybe(join(B2, 'glass-fix-r3', 'critic-rerun', 'firstview__390x844__dark.png'));
  // B1: the live B1 build (snap-b1-final served with snap.mjs --reuse and
  // this same section run with --out .../glass-fix-r4/b1-live).
  const b1 = await maybe(join(B2, 'glass-fix-r4', 'b1-live', 'firstview__390x844__light.png'));
  const b1d = await maybe(join(B2, 'glass-fix-r4', 'b1-live', 'firstview__390x844__dark.png'));
  const aL = await readFile(join(OUT, 'firstview__390x844__light.png'));
  const aD = await readFile(join(OUT, 'firstview__390x844__dark.png'));
  // B1's phone stills are 1x; scale the others to match (sheet draws at a fixed scale, so pre-scale here).
  const norm = async (buf) => { const im = await loadImage(buf); if (im.width <= 400) { const c = createCanvas(im.width * 2, im.height * 2); const g = c.getContext('2d'); g.drawImage(im, 0, 0, im.width * 2, im.height * 2); return c.toBuffer('image/png'); } return buf; };
  const cmp = [];
  if (b1 && r3 && !OUT.includes('b1-live')) cmp.push([['B1 (approved, live snap-b1-final) light', await norm(b1)], ['round 3 (before) light', await norm(r3)], ['round 4 (after) light', aL]]);
  if (b1d && r3d && !OUT.includes('b1-live')) cmp.push([['B1 (approved, live snap-b1-final) dark', await norm(b1d)], ['round 3 (before) dark', await norm(r3d)], ['round 4 (after) dark', aD]]);
  const t1 = await maybe(join(B2, 'glass-fix-r4', 'b1-live', 'firstview__820x1180__light.png'));
  const t3 = await maybe(join(B2, 'glass-fix-r3', 'layout__820x1180.png'));
  if (t1 && t3 && !OUT.includes('b1-live')) await sheet('sheet__tablet-firstview-b1-r3-r4.jpg', [[['B1 (live snap-b1-final) light', t1], ['round 3 (before) light', t3], ['round 4 (after) light', await readFile(join(OUT, 'firstview__820x1180__light.png'))]]], { scale: 0.5, title: 'Home first view, 820x1180: B1, round 3, round 4' });
  if (cmp.length) await sheet('sheet__phone-firstview-b1-r3-r4.jpg', cmp, { scale: 0.5, title: 'Home first view, 390x844: B1, round 3, round 4' });
  await sheet('sheet__firstview-corner.jpg', rows, { scale: 0.5, title: 'Lens start (red) half under the hero window (blue) lower corner' });
}

/* ---------------- pages ---------------- */
async function pages() {
  R.pages = {};
  const rows = [];
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const row = [];
    for (const scheme of ['light', 'dark']) {
      const { context, page, errors } = await ctx({ w, h, scheme });
      await open(page, scheme);
      const g = await geo(page);
      // scroll through once so reveal-on-scroll content is in its settled state, then back to the top
      const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      for (let y = 0; y <= max; y += Math.round(h * 0.8)) { await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(120); }
      await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(600);
      const buf = await page.screenshot({ fullPage: true });
      await writeFile(join(OUT, `page__home__${w}x${h}__${scheme}.png`), buf);
      R.pages[`${w}x${h}__${scheme}`] = { docH: max + h, lens: g.lens, errors };
      row.push([`${w}x${h} ${scheme} (whole page, after)`, buf]);
      await context.close();
    }
    await sheet(`sheet__page-home-${w}x${h}.jpg`, [row], { scale: w < 600 ? 0.5 : 0.35, title: `Home, whole page, ${w}x${h}, round 4` });
    rows.push(row);
  }
}

/* ---------------- compare (no browser) ----------------
   Whole-page before/after: B1 = snap-b1-final and round 3 = snap-b2r3-glass-critic2
   (8c94f34's code, before the fringe halving), each served with
   `snap.mjs --reuse` and filmed with `--only pages --out glass-fix-r4/b1-live`
   and `--out glass-fix-r4/before-r3`; round 4 = this run's pages. */
async function compare() {
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const rows = [];
    for (const scheme of ['light', 'dark']) {
      const f = `page__home__${w}x${h}__${scheme}.png`;
      const cols = [];
      for (const [label, dir] of [['B1 (snap-b1-final)', join(B2, 'glass-fix-r4', 'b1-live')], ['round 3, before (8c94f34)', join(B2, 'glass-fix-r4', 'before-r3')], ['round 4, after', OUT]]) {
        const buf = await maybe(join(dir, f));
        if (buf) cols.push([`${label}, ${w}x${h} ${scheme}`, buf]);
      }
      rows.push(cols);
    }
    await sheet(`sheet__page-before-after-${w}x${h}.jpg`, rows, { scale: w < 600 ? 0.5 : 0.3, title: `Home whole page ${w}x${h}: B1, round 3 (before), round 4 (after)` });
  }
}

/* ---------------- touch ---------------- */
async function touchFilm(page, cdp, name, from, to, steps = 14) {
  const frames = [];
  const t0 = Date.now();
  const snap = async (label) => { frames.push([`+${Date.now() - t0} ms ${label}`, await page.screenshot({ scale: 'css' })]); };
  await snap('before');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from[0], y: from[1] }] });
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from[0] + (to[0] - from[0]) * i / steps, y: from[1] + (to[1] - from[1]) * i / steps }] });
    await page.waitForTimeout(16);
    if (i % 4 === 0) await snap(`move ${i}/${steps}`);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await snap('released');
  await page.waitForTimeout(900);
  await snap('settled');
  return frames;
}
async function touch() {
  R.touch = {};
  const rows = [];
  for (const [kind, pick] of [
    ['lens-visible-half', (g) => [[g.lens.cx, g.lens.cy + g.lens.r * 0.5], [g.lens.cx - 200, g.lens.cy + 16]]],
    ['lens-covered-half', (g) => [[g.lens.cx, g.lens.cy - g.lens.r * 0.5], [g.lens.cx, g.lens.cy - g.lens.r * 0.5 - 220]]],
    ['hero-copy', () => null],
  ]) {
    const { context, page, cdp, errors } = await ctx({ w: 390, h: 844, scheme: 'light', phone: true });
    await open(page, 'light');
    const g = await geo(page);
    let from, to;
    if (kind === 'hero-copy') {
      const r = await page.evaluate(() => { const q = document.querySelector('.hero .lead').getBoundingClientRect(); return [q.left + q.width / 2, q.top + q.height / 2]; });
      from = r; to = [r[0], r[1] - 240];
    } else [from, to] = pick(g);
    const startEl = await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? `${e.tagName.toLowerCase()}.${[...e.classList].join('.')}` : null; }, from);
    const frames = await touchFilm(page, cdp, kind, from, to);
    const g2 = await geo(page);
    const sel = await page.evaluate(() => String(getSelection()));
    R.touch[kind] = { from: from.map(Math.round), to: to.map(Math.round), startEl, lensBefore: g.lens, lensAfter: g2.lens, lensMoved: Math.round(Math.hypot(g2.lens.cx - g.lens.cx, g2.lens.cy - g.lens.cy + (g2.scrollY - g.scrollY) * 0)), scrollBefore: g.scrollY, scrollAfter: g2.scrollY, selection: sel, errors };
    console.log(kind, JSON.stringify(R.touch[kind]));
    rows.push(frames.map(([l, b]) => [`${kind}: ${l}`, b]));
    await context.close();
  }
  await sheet('film__phone-touch.jpg', rows, { scale: 0.62, title: '390x844 touch: drag on the lens visible half; swipe on its covered half; swipe on the hero copy' });
}

/* ---------------- ccsw ---------------- */
async function ccsw() {
  R.ccsw = {};
  const shots = [];
  const measure = (page) => page.evaluate(() => {
    const host = document.querySelector('bdl-switcher');
    const sw = [];
    for (const e of host.shadowRoot.querySelectorAll('*')) {
      const q = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      if (q.width < 1 || q.height < 1 || cs.visibility === 'hidden' || cs.display === 'none' || e.closest('[hidden]') || e.closest('dialog:not([open])')) continue;
      sw.push({ l: q.left, t: q.top, r: q.right, b: q.bottom });
    }
    const hr = host.getBoundingClientRect();
    sw.push({ l: hr.left, t: hr.top, r: hr.right, b: hr.bottom });
    const u = sw.reduce((a, s) => ({ l: Math.min(a.l, s.l), t: Math.min(a.t, s.t), r: Math.max(a.r, s.r), b: Math.max(a.b, s.b) }), { l: 1e9, t: 1e9, r: -1e9, b: -1e9 });
    const tiles = [];
    for (const t of document.querySelectorAll('.control-centre, .control-centre .cc-tile')) {
      const q = t.getBoundingClientRect();
      let gap = Infinity, area = 0;
      for (const s of sw) {
        const dx = Math.max(s.l - q.right, q.left - s.r);
        const dy = Math.max(s.t - q.bottom, q.top - s.b);
        gap = Math.min(gap, Math.max(dx, dy));
        const ix = Math.max(0, Math.min(q.right, s.r) - Math.max(q.left, s.l));
        const iy = Math.max(0, Math.min(q.bottom, s.b) - Math.max(q.top, s.t));
        area += ix * iy;
      }
      tiles.push({ el: t.className.replace('cc-tile ', '').split(' ')[0], rect: [q.left, q.top, q.right, q.bottom].map(Math.round), gapPx: Math.round(gap), overlapPx2: Math.round(area) });
    }
    return { scrollY: Math.round(scrollY), switcher: [u.l, u.t, u.r, u.b].map(Math.round), boxes: sw.length, tiles };
  });
  for (const [w, h] of [[1440, 900], [1280, 800], [1024, 768]]) {
    const { context, page } = await ctx({ w, h });
    await open(page, 'light');
    const at0 = await measure(page);
    const shot0 = await page.screenshot();
    await page.evaluate(() => { const q = document.querySelector('.control-centre').getBoundingClientRect(); window.scrollTo(0, Math.max(0, q.bottom + scrollY - innerHeight + 24)); });
    await page.waitForTimeout(400);
    const inView = await measure(page);
    const shot1 = await page.screenshot();
    const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    let worst = { gapPx: Infinity }; let overlapSteps = 0;
    for (let y = 0; y <= Math.min(max, 2400); y += 10) {
      await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(16);
      const m = await measure(page);
      // only tiles at least partly in the viewport can meet the switcher
      const vis = m.tiles.filter((t) => t.rect[3] > 0 && t.rect[1] < h);
      if (vis.some((t) => t.overlapPx2 > 0)) overlapSteps++;
      for (const t of vis) if (t.gapPx < worst.gapPx) worst = { ...t, scrollY: y };
    }
    R.ccsw[`${w}x${h}`] = { scroll0: at0, tilesInView: inView, sweep: { overlapSteps, worstGap: worst } };
    const minGap = (m) => Math.min(...m.tiles.map((t) => t.gapPx));
    const ann = (m) => [{ color: 'rgba(255,0,0,0.9)', rect: m.switcher }, ...m.tiles.map((t) => ({ color: 'rgba(0,170,255,0.9)', rect: t.rect }))];
    shots.push([[`${w}x${h} scroll 0: min tile-switcher gap ${minGap(at0)} px`, await outline(shot0, 1, ann(at0))], [`${w}x${h} scroll ${inView.scrollY} (tiles in view): min gap ${minGap(inView)} px`, await outline(shot1, 1, ann(inView))]]);
    console.log(`${w}x${h}`, 'scroll0 min gap', minGap(at0), 'inView min gap', minGap(inView), 'sweep overlap steps', overlapSteps, 'worst', JSON.stringify(worst));
    await context.close();
  }
  await sheet('sheet__cc-vs-switcher.jpg', shots, { scale: 0.5, title: 'Control Centre tiles (blue) vs the portal switcher (red, every visible box)' });
}

/* ---------------- arrival ---------------- */
async function viaSwitcher(page, school) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('.open[aria-haspopup="dialog"]').first().click();
  const link = page.locator(`a[data-school="${school}"]`).first();
  await link.waitFor({ state: 'visible', timeout: 5000 });
  await link.click();
}
async function arrival() {
  R.arrival = {};
  const rows = [];
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const { context, page, errors } = await ctx({ w, h });
    await open(page, 'light');
    await viaSwitcher(page, 'vaporwave');
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'vaporwave', { timeout: 8000 });
    await page.waitForTimeout(2500);
    await viaSwitcher(page, 'glassmorphism');
    const t0 = Date.now();
    const frames = []; const data = [];
    for (const ms of [0, 120, 250, 400, 600, 900, 1300, 2000, 3000]) {
      const wait = ms - (Date.now() - t0); if (wait > 0) await page.waitForTimeout(wait);
      const at = Date.now() - t0;
      const buf = await page.screenshot({ scale: 'css' });
      const d = await page.evaluate(() => { const p = document.querySelector('.lens-poster'); const pr = p?.getBoundingClientRect(); const hit = document.querySelector('.lens-hit')?.getBoundingClientRect(); return { theme: document.documentElement.dataset.theme, poster: p ? { display: getComputedStyle(p).display, cx: Math.round(pr.left + pr.width / 2), cy: Math.round(pr.top + pr.height / 2), w: Math.round(pr.width) } : null, lens: hit ? { cx: Math.round(hit.left + hit.width / 2), cy: Math.round(hit.top + hit.height / 2) } : null, canvas: !!document.querySelector('.lens-canvas') }; });
      data.push({ at, ...d });
      frames.push([`${w}x${h} +${at} ms ${d.theme} poster ${d.poster?.display ?? '-'} ${d.poster ? `(${d.poster.cx},${d.poster.cy})` : ''} lens ${d.lens ? `(${d.lens.cx},${d.lens.cy})` : '-'}`, buf]);
    }
    R.arrival[`${w}x${h}`] = { frames: data, errors };
    console.log(`${w}x${h}`, JSON.stringify(data));
    rows.push(frames.slice(0, 5), frames.slice(5));
    await context.close();
  }
  await sheet('film__arrival-via-switcher.jpg', rows, { scale: 0.34, title: 'Cross-school arrival at glass Home through the real switcher (vaporwave, then back)' });
}

const all = { firstview, pages, touch, ccsw, arrival, compare };
for (const [k, fn] of Object.entries(all)) {
  if (only.length && !only.includes(k)) continue;
  try { await fn(); } catch (e) { R[`${k}Error`] = String(e?.stack || e); console.error('ERR', k, e); }
}
await browser.close();
const prev = existsSync(join(OUT, 'results.json')) ? JSON.parse(await readFile(join(OUT, 'results.json'), 'utf8')) : {};
await writeFile(join(OUT, 'results.json'), JSON.stringify({ ...prev, ...R }, null, 1));
console.log('done');
