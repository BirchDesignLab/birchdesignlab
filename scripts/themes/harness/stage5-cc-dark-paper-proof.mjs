/**
 * Stage 5 Tier A proof a5: cottagecore, paper in the dark scheme (D4).
 *
 * Three papers, dark scheme only, Home and About:
 *   a  today (lamp-brown papers everywhere), nothing injected;
 *   b  dimmed cream papers everywhere (proofs/stage5-cc-dark-paper/paper-b.css);
 *   c  the hybrid: brown cards and notes kept, the mounted herbarium sheets
 *      lifted to a board (paper-c.css).
 * b and c both carry shared.css (item 3 pressed flat, item 5 dark cloth) and
 * mount.js (the cc-board class and the hero's gum strips). Nothing under src/
 * changes; the CSS and the script are injected into the frozen build.
 *
 * Captures: Home and About whole page at 1440, 820 and 390 (2x) for a, b, c;
 * 2x crops of the sheets, cards, note, letter, hoop, valance, hem and the Lab
 * band; contrast measured from the live computed colours (text colour against
 * the paper under it, plus the worst case under the lamp overlays); and the
 * fireflies (D7) in variant c with the canvas left on: a timestamped strip and
 * a pixel count of lit canvas inside and outside the page's text blocks.
 *
 * Output: scripts/themes/.out/stage5-proofs/cc-dark-paper/
 *   shots/, crops/, frames/, measures.json, contrast-table.md,
 *   contrast-entries.txt, renderer.txt, index.md, sheet-*.jpg
 * and proofs/stage5-cc-dark-paper/strips.json (the gum strip placements).
 *
 * Usage (BDL_GPU=1 required; exits 2 on a software renderer):
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name stage5-base --reuse --port 4460 -- \
 *     node scripts/themes/harness/stage5-cc-dark-paper-proof.mjs
 *   --sheets-only   rebuild sheets and index from existing shots
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const PROOF = join(REPO, 'scripts', 'themes', 'proofs', 'stage5-cc-dark-paper');
const out = join(REPO, 'scripts', 'themes', '.out', 'stage5-proofs', 'cc-dark-paper');
const shots = join(out, 'shots');
const crops = join(out, 'crops');
const frames = join(out, 'frames');
for (const d of [shots, crops, frames]) await mkdir(d, { recursive: true });
const base = (process.env.SNAP_BASE || '').replace(/\/$/, '');

const SIZES = [
  { id: '1440', w: 1440, h: 900, dpr: 1 },
  { id: '820', w: 820, h: 1180, dpr: 1 },
  { id: '390', w: 390, h: 844, dpr: 2, mobile: true },
];
const BIG = { id: '1440x2', w: 1440, h: 900, dpr: 2 };
const PAGES = [['home', ''], ['about', 'about/']];
const VARIANTS = ['a', 'b', 'c'];
const VNAME = { a: '(a) today', b: '(b) dimmed cream everywhere', c: '(c) hybrid: boards only' };
const scheme = 'dark';
const HIDE = 'bdl-switcher{display:none!important} *{scroll-behavior:auto!important}';
const NOMOTES = '.cc-motes{display:none!important}';
const shotPath = (page, v, size) => join(shots, `${page}__${v}__${size}.png`);
const cropPath = (name, v) => join(crops, `${name}__${v}.png`);

const readCss = (f) => readFile(join(PROOF, f), 'utf8');
const css = {
  shared: await readCss('shared.css'),
  b: await readCss('paper-b.css'),
  c: await readCss('paper-c.css'),
  mount: await readCss('mount.js'),
};

async function newPage(browser, sz) {
  const context = await browser.newContext({
    viewport: { width: sz.w, height: sz.h }, deviceScaleFactor: sz.dpr,
    isMobile: !!sz.mobile, hasTouch: !!sz.mobile, colorScheme: scheme, reducedMotion: 'no-preference',
  });
  await suppressPrompt(context);
  await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); localStorage.setItem('theme', s); } catch {} }, scheme);
  await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [
      { name: 'prefers-color-scheme', value: scheme },
      { name: 'prefers-reduced-motion', value: 'no-preference' },
      { name: 'prefers-reduced-transparency', value: 'no-preference' },
    ],
  });
  return { context, page };
}

/* Open a page in a variant. motes: leave the firefly canvas on. */
async function open(page, path, v, { motes = false, fixed = null, scan = false } = {}) {
  await page.goto(`${base}/t/cottagecore/${path}`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: HIDE + (motes ? '' : NOMOTES) });
  let strips = [];
  if (v !== 'a') {
    await page.addStyleTag({ content: css.shared });
    await page.addStyleTag({ content: css[v] });
    await page.addScriptTag({ content: css.mount });
  }
  await page.evaluate(async () => { await document.fonts.ready; });
  if (v !== 'a') strips = await page.evaluate((fx) => window.__ccMount({ strips: !!document.querySelector('.hero .sheet'), fixed: fx.fixed, scan: fx.scan }), { fixed, scan });
  await page.waitForTimeout(500);
  const got = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, scheme: document.documentElement.dataset.scheme }));
  if (got.theme !== 'cottagecore' || got.scheme !== scheme) console.warn(`WARN theme=${got.theme} scheme=${got.scheme} (wanted ${scheme})`);
  return strips;
}

/* Crop one element (with padding) at the page's scale from a full-page frame. */
async function cropEl(page, selector, path, pad = 22, nth = 0) {
  const loc = page.locator(selector).nth(nth);
  await loc.scrollIntoViewIfNeeded();
  await page.waitForTimeout(80);
  const box = await loc.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height };
  });
  const vw = await page.evaluate(() => document.documentElement.scrollWidth);
  const x = Math.max(0, box.x - pad), y = Math.max(0, box.y - pad);
  const w = Math.min(vw - x, box.w + 2 * pad), h = box.h + 2 * pad;
  await page.screenshot({ path, fullPage: true, clip: { x, y, width: w, height: h } });
}

/* ---------- contrast: the live text colour against the paper under it ---------- */
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = ({ r, g, b }) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const mix = (a, b, t) => ({ r: a.r * (1 - t) + b.r * t, g: a.g * (1 - t) + b.g * t, b: a.b * (1 - t) + b.b * t });
const hex = (c) => '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
/* Overlays the paper carries at their strongest under text: a today's amber
   wash lightens the brown (worst for cream text), b and c's foot dimming darkens
   the cream (worst for ink). */
const WORST = { a: { c: { r: 255, g: 200, b: 120 }, t: 0.14 }, b: { c: { r: 40, g: 25, b: 10 }, t: 0.1 }, c: { c: { r: 40, g: 25, b: 10 }, t: 0.1 } };

const SURFACE = '.cc-paper, .note, .letter, .cc-board, .cloth';
/* [name, selector, kind]: kind 'text' needs 4.5, 'line' (non-text) needs 3 */
const TEXTS = {
  home: [
    ['card title h3', '.card h3', 'text'], ['card body', '.card p.cc-ruled', 'text'], ['card numeral', '.card .no', 'text'],
    ['note kicker', '.note .cc-hand', 'text'], ['note pull quote', '.note .pull', 'text'], ['note designation', '.note .des', 'text'],
    ['note summary', '.note .sum', 'text'], ['note link', '.note .cc-note-link', 'text'],
    ['hero herb-label scribble', '.hero .herb-label .hl-hand', 'stroke'], ['hero herb-label rule (decorative)', '.hero .herb-label', 'decor'],
  ],
  about: [
    ['sheet h1', '.herbarium h1', 'text'], ['sheet label text', '.label p', 'text'], ['sheet label strong', '.label strong', 'text'],
    ['sheet etymology', '.etym-more', 'text'], ['sheet label rule', '.label', 'border'],
    ['letter h2', '.letter h2', 'text'], ['letter body', '.letter p', 'text'], ['hoop manifesto', '.manifesto', 'text'],
  ],
};
const READ = ({ rows, surface }) => rows.map(([name, sel, kind]) => {
  const el = document.querySelector(sel);
  if (!el) return { name, sel, kind, missing: true };
  const cs = getComputedStyle(el);
  const s = el.closest(surface);
  const bs = s ? getComputedStyle(s) : null;
  const fg = kind === 'stroke' ? cs.stroke : (kind === 'border' || kind === 'decor') ? cs.borderTopColor : cs.color;
  const op = kind === 'stroke' ? cs.opacity : '1';
  return { name, sel, kind, fg, op, bg: bs && bs.backgroundColor, text: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 28), size: cs.fontSize, weight: cs.fontWeight };
});
const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };

function rate(rows, v) {
  return rows.map((r) => {
    if (r.missing || !r.bg) return r;
    const fg0 = parse(r.fg), bg = parse(r.bg);
    const a = (fg0.a ?? 1) * parseFloat(r.op);
    const bgc = { r: bg.r, g: bg.g, b: bg.b };
    const worst = mix(bgc, WORST[v].c, WORST[v].t);
    const fg = mix(bgc, fg0, a);
    const fgw = mix(worst, fg0, a);
    const min = r.kind === 'text' ? 4.5 : r.kind === 'decor' ? 0 : 3;
    return { name: r.name, text: r.text, kind: r.kind, size: r.size, weight: r.weight, fg: hex(fg), bg: hex(bgc), ratio: +ratio(fg, bgc).toFixed(2), worstBg: hex(worst), worstRatio: +ratio(fgw, worst).toFixed(2), min };
  });
}

/* ---------- fireflies (D7) ---------- */
const MOTES = () => {
  const cv = document.querySelector('[data-cc-motes]');
  if (!cv) return null;
  const ctx = cv.getContext('2d');
  const sx = cv.width / innerWidth, sy = cv.height / innerHeight;
  const img = ctx.getImageData(0, 0, cv.width, cv.height);
  const main = document.querySelector('main');
  const rects = Array.from(main.querySelectorAll('h1, h2, h3, p, li, a')).map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0 && r.bottom > 0 && r.top < innerHeight);
  const inText = new Uint8Array(cv.width * cv.height);
  for (const r of rects) {
    const x0 = Math.max(0, Math.floor(r.left * sx)), x1 = Math.min(cv.width, Math.ceil(r.right * sx));
    const y0 = Math.max(0, Math.floor(r.top * sy)), y1 = Math.min(cv.height, Math.ceil(r.bottom * sy));
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) inText[y * cv.width + x] = 1;
  }
  let litIn = 0, litOut = 0, maxIn = 0, maxOut = 0;
  for (let i = 0; i < inText.length; i++) {
    const a = img.data[i * 4 + 3];
    if (inText[i]) { if (a > 24) litIn++; if (a > maxIn) maxIn = a; } else { if (a > 24) litOut++; if (a > maxOut) maxOut = a; }
  }
  const hdr = cv.closest('header, .cc-header') || cv.parentElement;
  const papers = Array.from(document.querySelectorAll('.cc-paper, .cc-board, .note, .letter')).map((e) => parseFloat(getComputedStyle(e).backgroundColor.split(/[ ,/]+/)[3] ?? '1'));
  return {
    canvas: [cv.width, cv.height], textRects: rects.length, litInText: litIn, litOutsideText: litOut, maxAlphaInText: maxIn, maxAlphaOutsideText: maxOut,
    zIndex: { header: getComputedStyle(hdr).zIndex, canvas: getComputedStyle(cv).zIndex, main: getComputedStyle(main).zIndex },
    paperBackgroundAlphaMin: papers.length ? Math.min(...papers.map((a) => (Number.isNaN(a) ? 1 : a))) : null,
  };
};

const BROWSER_ARGS = ['--hide-scrollbars', '--font-render-hinting=none', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'];

async function capture() {
  if (!base) { console.error('no SNAP_BASE; run through snap.mjs'); process.exit(1); }
  if (process.env.BDL_GPU !== '1') { console.error('BDL_GPU=1 is required'); process.exit(2); }
  const browser = await chromium.launch({ args: BROWSER_ARGS });
  {
    const p = await browser.newPage();
    const r = await p.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl');
      const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
      return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'no webgl';
    });
    await p.close();
    console.log(`renderer: ${r}`);
    await writeFile(join(out, 'renderer.txt'), r + '\n');
    if (/swiftshader|llvmpipe|software|no webgl/i.test(r)) { console.error('software renderer: aborting'); await browser.close(); process.exit(2); }
  }
  const measures = { contrast: {}, strips: {}, fireflies: {}, built: {} };

  /* strips: one table for every size. Each size reports every t where a strip
     is clear (mount.js scan); the table takes, per sprig, the t nearest to
     0.30 and 0.64 among those clear at ALL sizes, at least 0.2 apart. Every
     strip is then replayed and re-tested at each size below. */
  const scans = {};
  for (const sz of [...SIZES, BIG]) {
    const { context, page } = await newPage(browser, sz);
    const r = await open(page, '', 'c', { scan: true });
    scans[sz.id] = Object.fromEntries(r.map((x) => [x.sprig, x.scan]));
    await context.close();
  }
  const table1440 = [];
  for (const name of ['fern', 'lavender', 'rose', 'daisy']) {
    const ok = scans['1440'][name].filter((t) => Object.values(scans).every((sc) => sc[name].includes(t)));
    const taken = [];
    for (const want of [0.3, 0.64]) {
      const t = ok.filter((c) => !taken.some((u) => Math.abs(u - c) < 0.2)).sort((a, b) => Math.abs(a - want) - Math.abs(b - want) || a - b)[0];
      if (t === undefined) { table1440.push({ sprig: name, t: null, skipped: 'no bare stem clear at every size' }); continue; }
      taken.push(t);
      table1440.push({ sprig: name, t });
    }
  }
  measures.scans = Object.fromEntries(Object.entries(scans).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).map(([n, a]) => [n, a.length]))]));

  /* whole pages */
  for (const sz of SIZES) for (const [name, path] of PAGES) for (const v of VARIANTS) {
    const { context, page } = await newPage(browser, sz);
    const strips = await open(page, path, v, { fixed: name === 'home' ? table1440 : null });
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: shotPath(name, v, sz.id), fullPage: true });
    if (name === 'home' && v === 'c') measures.strips[sz.id] = strips;
    if (sz.id === '1440') {
      const rows = await page.evaluate(READ, { rows: TEXTS[name], surface: SURFACE });
      measures.contrast[`${name}__${v}`] = rate(rows, v);
    }
    await context.close();
  }
  /* strips: the placements must not depend on the size */
  {
    const s = measures.strips;
    const base1 = s['1440'] || [];
    let drift = 0;
    for (const k of ['820', '390']) (s[k] || []).forEach((t, i) => { if (base1[i] && t.t !== null && base1[i].t !== null && base1[i].sprig === t.sprig && base1[i].t === t.t) drift = Math.max(drift, Math.abs(t.left - base1[i].left), Math.abs(t.top - base1[i].top)); });
    measures.stripDriftPercent = +drift.toFixed(2);
    measures.stripAllClearAtEverySize = Object.values(s).flat().every((t) => t.t === null || t.clear);
    measures.cropStripsAllClear = null; // filled after the crops, below
    measures.stripSameSet = ['820', '390'].every((k) => JSON.stringify((s[k] || []).map((t) => [t.sprig, t.t])) === JSON.stringify(base1.filter((t) => t.t !== null).map((t) => [t.sprig, t.t])));
    await writeFile(join(PROOF, 'strips.json'), JSON.stringify({ note: 'percent of the hero sheet (its own tilted frame); rotate is the strip across the stem, degrees; t is the distance along the stem path; each strip sits where a hit test finds bare stem under it at 1440, 820 and 390 alike (off-screen samples fail), so a sprig can carry fewer than two', strips: base1.filter((t) => t.t !== null) }, null, 2) + '\n');
  }

  /* The crops replay the 1440 table (a fresh placement at another size could
     land somewhere the table never was), and report whether it is still clear. */
  measures.cropStrips = {};
  /* 2x crops at 1440 */
  for (const v of VARIANTS) {
    const { context, page } = await newPage(browser, BIG);
    measures.cropStrips[`1440x2__${v}`] = await open(page, '', v, { fixed: table1440 });
    await cropEl(page, '.hero .sheet', cropPath('home-sheet', v), 34);
    await cropEl(page, '.card', cropPath('home-card', v), 30, 0);
    await cropEl(page, '.note-lift', cropPath('home-note', v), 30);
    await cropEl(page, '.lab', cropPath('home-lab', v), 0);
    await cropEl(page, '.valance', cropPath('valance', v), 0);
    await cropEl(page, '.hem', cropPath('hem', v), 0);
    await open(page, 'about/', v);
    await cropEl(page, '.herbarium .sheet', cropPath('about-sheet', v), 34);
    await cropEl(page, '.letter-lift', cropPath('about-letter', v), 30);
    await cropEl(page, '.hoop', cropPath('about-hoop', v), 30);
    await context.close();
  }
  /* 2x crops at 390 */
  for (const v of VARIANTS) {
    const { context, page } = await newPage(browser, SIZES[2]);
    measures.cropStrips[`390__${v}`] = await open(page, '', v, { fixed: table1440 });
    await cropEl(page, '.hero .sheet', cropPath('home-sheet-390', v), 24);
    await open(page, 'about/', v);
    await cropEl(page, '.herbarium .sheet', cropPath('about-sheet-390', v), 24);
    await context.close();
  }

  /* D7: the fireflies, canvas left on, variant c (b is the same over the cloth) */
  for (const sz of [SIZES[0], SIZES[2]]) {
    const { context, page } = await newPage(browser, sz);
    await open(page, '', 'c', { motes: true });
    await page.evaluate(() => scrollTo(0, 0));
    const log = [];
    const T = [1000, 2500, 4000, 5500, 7000, 8500];
    let t0 = Date.now();
    for (let i = 0; i < T.length; i++) {
      await page.waitForTimeout(Math.max(0, T[i] - (Date.now() - t0)));
      const at = Date.now() - t0;
      await page.screenshot({ path: join(frames, `fireflies__c__${sz.id}__${i}.png`) });
      const m = await page.evaluate(MOTES);
      log.push({ frame: i, ms: at, ...m });
    }
    measures.fireflies[sz.id] = log;
    await context.close();
  }
  await browser.close();
  {
    /* every crop that carried strips replayed the 1440 table: same set, all clear */
    const key = (a) => JSON.stringify(a.filter((t) => t.t !== null).map((t) => [t.sprig, t.t]));
    const want = key(measures.strips['1440'] || []);
    measures.cropStripsAllClear = Object.entries(measures.cropStrips).filter(([k]) => !k.endsWith('__a')).every(([, a]) => a.length > 0 && key(a) === want && a.every((t) => t.clear));
  }
  await writeFile(join(out, 'measures.json'), JSON.stringify(measures, null, 2) + '\n');
  return measures;
}

/* ---------- contrast table and meta.contrast entries ---------- */
async function tables(m) {
  const lines = ['| page | paper | element | kind | ink | surface | ratio | worst surface | worst ratio | needs |', '|---|---|---|---|---|---|---|---|---|---|'];
  const fails = [];
  for (const [key, rows] of Object.entries(m.contrast)) {
    const [page, v] = key.split('__');
    for (const r of rows) {
      if (r.missing) { lines.push(`| ${page} | ${v} | ${r.name} | MISSING |  |  |  |  |  |  |`); continue; }
      lines.push(`| ${page} | ${v} | ${r.name} (${r.text || r.kind}) | ${r.kind} | ${r.fg} | ${r.bg} | ${r.ratio} | ${r.worstBg} | ${r.worstRatio} | ${r.min} |`);
      if (v !== 'a' && (r.ratio < r.min || r.worstRatio < r.min)) fails.push(`${page} ${v} ${r.name}: ${r.ratio} / worst ${r.worstRatio} (needs ${r.min})`);
    }
  }
  await writeFile(join(out, 'contrast-table.md'), lines.join('\n') + '\n');
  const e = [
    '// Paste into src/themes/cottagecore/meta.ts contrast (Tier B), whichever paper the founder picks.',
    '// (c), recommended: tokens --board, --board-ink, --board-ink-muted, --board-accent, --board-link (paper-c.css).',
    "    { fg: '--board-ink', bg: ['--board'], min: 4.5, note: 'About sheet h1, label and etymology on the mounted board' },",
    "    { fg: '--board-ink-muted', bg: ['--board'], min: 4.5, note: 'About sheet secondary text on the board' },",
    "    { fg: '--board-accent', bg: ['--board'], min: 4.5, note: 'About sheet label emphasis on the board' },",
    "    { fg: '--board-link', bg: ['--board'], min: 4.5, note: 'links on the board' },",
    '// (b), in case: tokens --paper and --note change; --paper-ink, --paper-ink-muted, --paper-accent, --paper-link are new (paper-b.css).',
    "    { fg: '--paper-ink', bg: ['--paper'], min: 4.5, note: 'card, letter and sheet text on dimmed cream' },",
    "    { fg: '--paper-ink-muted', bg: ['--paper'], min: 4.5, note: 'card body on dimmed cream' },",
    "    { fg: '--paper-accent', bg: ['--paper'], min: 4.5, note: 'handwritten numerals and kickers on dimmed cream' },",
    "    { fg: '--paper-link', bg: ['--paper'], min: 4.5, note: 'links on dimmed cream' },",
    "    { fg: '--paper-ink', bg: ['--note'], min: 4.5, note: 'butter note text on dimmed butter' },",
    "    { fg: '--paper-ink-muted', bg: ['--note'], min: 4.5, note: 'butter note secondary text' },",
    "    { fg: '--paper-accent', bg: ['--note'], min: 4.5, note: 'handwriting and designations on the note' },",
    "    { fg: '--paper-link', bg: ['--note'], min: 4.5, note: 'links on the note' },",
  ];
  await writeFile(join(out, 'contrast-entries.txt'), e.join('\n') + '\n');
  return fails;
}

/* ---------- sheets ---------- */
const BG = '#1b1b1f', INK = '#f2f2f2', CAP = '#c9c9d0', GAP = 14, SIDE = 150;
async function load(p) { return existsSync(p) ? loadImage(p) : null; }
async function sheet(path, title, rowLabels, colLabels, cellW, cellFn, note) {
  const cells = []; const rowH = [];
  for (let r = 0; r < rowLabels.length; r++) {
    cells.push([]); let h = 0;
    for (let c = 0; c < colLabels.length; c++) {
      const cell = await cellFn(r, c); cells[r].push(cell);
      if (cell) h = Math.max(h, Math.round(cell.img.height * ((cell.w || cellW) / cell.img.width)));
    }
    rowH.push(h || 100);
  }
  const top = 50 + (note ? 26 : 0) + 34;
  const W = SIDE + colLabels.length * (cellW + GAP) + GAP;
  const H = top + rowH.reduce((a, b) => a + b + GAP, 0) + GAP;
  const cv = createCanvas(W, H); const g = cv.getContext('2d');
  g.fillStyle = BG; g.fillRect(0, 0, W, H);
  g.fillStyle = INK; g.font = '600 22px sans-serif'; g.fillText(title, GAP, 32);
  if (note) { g.fillStyle = CAP; g.font = 'italic 15px sans-serif'; g.fillText(note, GAP, 54); }
  g.fillStyle = INK; g.font = '600 18px sans-serif';
  colLabels.forEach((l, c) => g.fillText(l, SIDE + GAP + c * (cellW + GAP), top - 10));
  let y = top;
  for (let r = 0; r < rowLabels.length; r++) {
    g.font = '600 15px sans-serif'; g.fillStyle = INK;
    rowLabels[r].split('\n').forEach((ln, i) => g.fillText(ln, GAP, y + 24 + i * 18));
    for (let c = 0; c < colLabels.length; c++) {
      const cell = cells[r][c]; const x = SIDE + GAP + c * (cellW + GAP);
      if (!cell) { g.fillStyle = '#522'; g.fillRect(x, y, cellW, 60); continue; }
      const w = cell.w || cellW;
      g.drawImage(cell.img, x, y, w, Math.round(cell.img.height * (w / cell.img.width)));
      if (cell.label) { g.fillStyle = 'rgba(0,0,0,0.65)'; g.fillRect(x, y, 78, 20); g.fillStyle = INK; g.font = '600 13px sans-serif'; g.fillText(cell.label, x + 6, y + 15); }
    }
    y += rowH[r] + GAP;
  }
  await writeFile(path, cv.toBuffer('image/jpeg', 92));
  console.log(`sheet ${path} ${W}x${H}`);
}

async function sheets() {
  const cols = VARIANTS.map((v) => VNAME[v]);
  /* one founder sheet per page: 1440, 820, 390, a b c side by side */
  for (const [name] of PAGES) {
    const scale = { '1440': 0.375, '820': 0.5, '390': 0.375 };
    const rows = [['1440', '1440 (scaled .375)'], ['820', '820 (scaled .5)'], ['390', '390, 2x (shown at .75 CSS)']];
    await sheet(join(out, `sheet-${name}.jpg`), `${name}, dark: three papers side by side (a today, b dimmed cream, c hybrid)`, rows.map((r) => r[1]), cols, 540, async (r, c) => {
      const id = rows[r][0];
      const img = await load(shotPath(name, VARIANTS[c], id));
      if (!img) return null;
      const cssW = id === '390' ? img.width / 2 : img.width;
      return { img, w: Math.round(cssW * (id === '390' ? 0.75 : scale[id])) };
    }, 'b and c carry items 3 (pressed flat, gum strips) and 5 (dark cloth); a is the site as it is today');
  }
  const pair = async (path, title, rows, note) => sheet(path, title, rows.map((r) => r[1]), cols, 520, async (r, c) => {
    const img = await load(cropPath(rows[r][0], VARIANTS[c]));
    if (!img) return null;
    return { img, w: Math.min(520, rows[r][2] ? img.width / rows[r][2] : img.width / 2) };
  }, note);
  await pair(join(out, 'sheet-sheets.jpg'), 'The mounted sheets (Home hero, About), 2x crops, desktop and phone', [
    ['home-sheet', 'Home hero\n1440', 2], ['home-sheet-390', 'Home hero\n390 (2x)', 1.4], ['about-sheet', 'About sheet\n1440', 2.6], ['about-sheet-390', 'About sheet\n390 (2x)', 1.4],
  ], 'gum strips, no halo, petals 10% less saturated: b and c only');
  await pair(join(out, 'sheet-papers.jpg'), 'The other papers: card, butter note, letter, hoop (2x crops)', [
    ['home-card', 'Home card', 1.5], ['home-note', 'Home butter note', 2], ['about-letter', 'About letter', 2], ['about-hoop', 'About hoop', 2],
  ], 'c keeps these as they are today; b turns the card, note and letter cream; the hoop cloth is untouched in both (open question)');
  /* the cloth: today against items 3 and 5 (b and c are the same cloth) */
  const clothRows = [['valance', 'valance'], ['home-lab', 'Lab band'], ['hem', 'hem']];
  await sheet(join(out, 'sheet-cloth.jpg'), 'The dark cloth: today against item 5 (b and c share it)', clothRows.map((r) => r[1]), ['(a) today', 'item 5 (b and c)'], 700, async (r, c) => {
    const img = await load(cropPath(clothRows[r][0], c ? 'c' : 'a'));
    if (!img) return null;
    return { img, w: Math.min(700, img.width / 2) };
  });
  /* fireflies: timestamped strips */
  const T = [1000, 2500, 4000, 5500, 7000, 8500];
  for (const id of ['1440', '390']) {
    await sheet(join(out, `sheet-fireflies-${id}.jpg`), `Fireflies, (c) dark Home at ${id}: canvas on, frames at 1.0 to 8.5 s (motes over the cloth, under the sheets)`,
      T.map((t, i) => `frame ${i}\n${(t / 1000).toFixed(1)} s`), ['(c)'], id === '1440' ? 900 : 360, async (r) => {
        const img = await load(join(frames, `fireflies__c__${id}__${r}.png`));
        return img && { img, w: id === '1440' ? 900 : 360 };
      });
  }
}

async function index() {
  const renderer = existsSync(join(out, 'renderer.txt')) ? (await readFile(join(out, 'renderer.txt'), 'utf8')).trim() : 'unknown';
  const lines = [
    '# Stage 5 proof a5: cottagecore, paper in the dark scheme, images', '',
    `Renderer: ${renderer}`, '',
    'Variants: a = today; b = dimmed cream papers everywhere; c = hybrid, only the mounted sheets lifted. b and c carry items 3 and 5.', '',
    '## Founder sheets (read these first)',
    '- sheet-home.jpg, sheet-about.jpg: whole page, dark, a b c side by side at 1440, 820, 390',
    '- sheet-sheets.jpg: the Home hero sheet and the About sheet, 2x crops, desktop and phone',
    '- sheet-papers.jpg: card, butter note, letter, hoop (what b changes and c keeps)',
    '- sheet-cloth.jpg: valance, Lab band and hem, today against item 5',
    '- sheet-fireflies-1440.jpg, sheet-fireflies-390.jpg: timestamped frames with the firefly canvas on (D7)', '',
    '## Single images',
    '- shots/<home|about>__<a|b|c>__<1440|820|390>.png: whole page (390 is 2x)',
    '- crops/<name>__<a|b|c>.png: 2x crops (home-sheet, home-card, home-note, home-lab, valance, hem, about-sheet, about-letter, about-hoop, *-390)',
    '- frames/fireflies__c__<1440|390>__<0..5>.png: the firefly frames',
    '', '`measures.json`: contrast rows, strip placements per size, firefly canvas counts. `contrast-table.md` and `contrast-entries.txt`: the same as a table and as meta.contrast entries.',
    'The switcher is hidden in every frame; the firefly canvas is hidden in all but the firefly frames (random clocks).', '',
  ];
  await writeFile(join(out, 'index.md'), lines.join('\n'));
}

if (!process.argv.includes('--sheets-only')) {
  const m = await capture();
  const fails = await tables(m);
  if (fails.length) { console.error('CONTRAST FAILS:\n' + fails.join('\n')); process.exitCode = 1; }
  else console.log('contrast: every text and line pair on b and c clears its minimum at base and at the darkest overlay');
}
await sheets();
await index();
