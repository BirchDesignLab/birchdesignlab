/**
 * Stage 5 Tier A proof a1: the grandmillennial toile de Jouy.
 *
 * Injects scripts/themes/proofs/stage5-gm-toile/proof.css and the pattern
 * markup (toile-defs.svg.html, drawn by build-toile.mjs) into a frozen build;
 * nothing under src/ changes. Captures, at 1440, 1280, 1024, 820 and 390 (2x),
 * for four variants (light oxblood, light porcelain blue, dark gold on hunter,
 * dark gold on the raised field):
 *   - the Services No. 2 swatch, with the toile injected, and the frozen
 *     build's own swatch as the "before";
 *   - the Services page, whole page;
 *   - a full-bleed wall of the toile (plain, and with a faux raised card on it,
 *     for item 2 and a2);
 *   - 100% crops of every vignette off the 1440 wall;
 * and measures the pattern's paint cost against #gm-porcelaine and #gm-chintz.
 *
 * Output: scripts/themes/.out/stage5-proofs/gm-toile/
 *   shots/*.png, crops/*.png, measures.json, renderer.txt, index.md and the
 *   founder sheets (*.jpg).
 *
 * Usage (BDL_GPU=1 required; exits 2 on a software renderer):
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name stage5-base --reuse --port 4460 -- \
 *     node scripts/themes/harness/stage5-gm-toile-proof.mjs
 *   --sheets-only   rebuild the sheets and index from existing shots
 *   --skip-paint    skip the paint-cost measure
 *   (the swatch cuttings are the gm-toile-swatch patterns in toile-defs.svg.html,
 *   from find-swatch-frames.mjs)
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
const PROOF = join(REPO, 'scripts', 'themes', 'proofs', 'stage5-gm-toile');
const out = join(REPO, 'scripts', 'themes', '.out', 'stage5-proofs', 'gm-toile');
const shots = join(out, 'shots');
const crops = join(out, 'crops');
await mkdir(shots, { recursive: true });
await mkdir(crops, { recursive: true });
const base = (process.env.SNAP_BASE || '').replace(/\/$/, '');
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};

const SIZES = [
  { id: '1440', w: 1440, h: 900, dpr: 1 },
  { id: '1280', w: 1280, h: 800, dpr: 1 },
  { id: '1024', w: 1024, h: 768, dpr: 1 },
  { id: '820', w: 820, h: 1180, dpr: 1 },
  { id: '390', w: 390, h: 844, dpr: 2, mobile: true },
];
const VARIANTS = [
  { id: 'ox', scheme: 'light', label: 'light, oxblood', attrs: {} },
  { id: 'blue', scheme: 'light', label: 'light, porcelain blue', attrs: { 'data-toile-ink': 'porcelain' } },
  { id: 'gold', scheme: 'dark', label: 'dark, gold on hunter', attrs: {} },
  { id: 'goldfield', scheme: 'dark', label: 'dark, gold on raised field', attrs: { 'data-toile-ground': 'field' } },
];
const shot = (what, variant, size) => join(shots, `${what}__${variant}__${size}.png`);
const comp = 'bdl-switcher{display:none!important} *{scroll-behavior:auto!important}';

async function newPage(browser, scheme, sz) {
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

async function openServices(page, scheme, inject) {
  await page.goto(`${base}/t/grandmillennial/services/`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: comp });
  if (inject) {
    await page.addStyleTag({ content: inject.css });
    await page.evaluate(({ defs, attrs }) => {
      const doc = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${defs}</svg>`, 'image/svg+xml');
      const target = document.querySelector('.gm-defs defs');
      for (const n of [...doc.documentElement.childNodes]) target.appendChild(document.importNode(n, true));
      for (const [k, v] of Object.entries(attrs)) document.documentElement.setAttribute(k, v);
      /* The swatch rect moves into a nested svg anchored at the swatch centre, so the
         gm-toile-swatch cutting frames the same at every swatch size (the CSS in
         proof.css picks the 16:9 cutting on a phone). */
      document.querySelectorAll('.swatch.porcelain > svg').forEach((svg) => {
        svg.innerHTML = '<svg x="50%" y="50%" overflow="visible"><rect class="toile-fill" x="-1000" y="-1000" width="2000" height="2000"/></svg>';
      });
    }, { defs: inject.defs, attrs: inject.attrs });
  }
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(900);
  const got = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, scheme: document.documentElement.dataset.scheme }));
  if (got.theme !== 'grandmillennial' || got.scheme !== scheme) console.warn(`WARN theme=${got.theme} scheme=${got.scheme} (wanted ${scheme})`);
}

const WALL_SVG = (id) => `<svg xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="url(#${id})"/></svg>`;
const CARD = '<div class="card"><i class="h"></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>';
async function addWall(page, { card = false, id = 'gm-toile' } = {}) {
  await page.evaluate(({ svg, card, cardHtml }) => {
    const w = document.createElement('div');
    w.id = 'proof-wall';
    w.innerHTML = svg + (card ? cardHtml : '');
    document.body.appendChild(w);
  }, { svg: WALL_SVG(id), card, cardHtml: CARD });
}
const dropWall = (page) => page.evaluate(() => document.getElementById('proof-wall')?.remove());

async function capture() {
  if (!base) { console.error('no SNAP_BASE; run through snap.mjs'); process.exit(1); }
  if (process.env.BDL_GPU !== '1') { console.error('BDL_GPU=1 is required'); process.exit(2); }
  const browser = await chromium.launch({
    args: ['--hide-scrollbars', '--font-render-hinting=none', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
  });
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
  const inject = {
    css: await readFile(join(PROOF, 'proof.css'), 'utf8'),
    defs: await readFile(join(PROOF, 'toile-defs.svg.html'), 'utf8'),
  };
  const layout = JSON.parse(await readFile(join(PROOF, 'toile-layout.json'), 'utf8'));

  /* The frozen build's own No. 2 swatch, as the before. */
  for (const scheme of ['light', 'dark']) {
    for (const sz of SIZES) {
      const { context, page } = await newPage(browser, scheme, sz);
      await openServices(page, scheme, null);
      const hang = page.locator('.swatch-hang').nth(1);
      await hang.scrollIntoViewIfNeeded();
      await page.waitForTimeout(250);
      await hang.screenshot({ path: shot('swatch2-before', scheme, sz.id) });
      await context.close();
    }
  }

  for (const v of VARIANTS) {
    for (const sz of SIZES) {
      const { context, page } = await newPage(browser, v.scheme, sz);
      await openServices(page, v.scheme, { ...inject, attrs: v.attrs });
      /* The swatch. */
      const hang = page.locator('.swatch-hang').nth(1);
      await hang.scrollIntoViewIfNeeded();
      await page.waitForTimeout(250);
      await hang.screenshot({ path: shot('swatch2', v.id, sz.id) });
      /* The whole Services page (the alternate dark ground is a swatch-only question). */
      if (v.id !== 'goldfield') {
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: shot('services', v.id, sz.id), fullPage: true });
      }
      /* The wall, plain and carded. */
      await page.evaluate(() => scrollTo(0, 0));
      await addWall(page);
      await page.waitForTimeout(250);
      await page.screenshot({ path: shot('wall', v.id, sz.id) });
      if (sz.id === '1440' || sz.id === '390') {
        await dropWall(page);
        await addWall(page, { card: true });
        await page.waitForTimeout(250);
        await page.screenshot({ path: shot('wallcard', v.id, sz.id) });
      }
      /* 100% crops of every vignette off the 1440 wall (ox and gold only). */
      if (sz.id === '1440' && (v.id === 'ox' || v.id === 'gold')) {
        await dropWall(page);
        await addWall(page);
        await page.waitForTimeout(250);
        const [TW, TH] = layout.tile;
        for (const id of ['grove', 'reader', 'desk', 'urn', 'grove2', 'parasol']) {
          const it = layout.items.find((i) => i.id === id);
          const hw = (it.w / 2) * it.s, up = it.h * it.s;
          const yn = ((it.y % TH) + TH) % TH;
          let box = null;
          for (let ky = 0; ky < 2 && !box; ky++) for (let kx = 0; kx < 3 && !box; kx++) {
            const px = it.x + kx * TW, py = yn + ky * TH;
            if (px - hw - 8 >= 0 && px + hw + 8 <= sz.w && py - up - 8 >= 0 && py + 30 <= sz.h) box = { px, py };
          }
          if (!box) { console.warn(`no whole instance of ${id} in the 1440 view`); continue; }
          const clip = { x: Math.round(box.px - hw - 8), y: Math.round(box.py - up - 8), width: Math.round(2 * hw + 16), height: Math.round(up + 38) };
          await page.screenshot({ path: join(crops, `crop-${id}__${v.id}.png`), clip });
        }
      }
      await context.close();
    }
  }
  await browser.close();
}

/* ---------- paint cost ---------- */
async function paintCost() {
  const browser = await chromium.launch({
    args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
  });
  const inject = {
    css: await readFile(join(PROOF, 'proof.css'), 'utf8'),
    defs: await readFile(join(PROOF, 'toile-defs.svg.html'), 'utf8'),
  };
  const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
  const result = {};
  for (const id of ['gm-toile', 'gm-porcelaine', 'gm-chintz']) {
    const runs = [];
    for (let i = 0; i < 7; i++) {
      const { context, page } = await newPage(browser, 'light', SIZES[0]);
      await openServices(page, 'light', { ...inject, attrs: {} });
      await page.waitForTimeout(500);
      await browser.startTracing(page, { categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'cc', 'gpu'] });
      await addWall(page, { id });
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      await page.waitForTimeout(600);
      const buf = await browser.stopTracing();
      const events = JSON.parse(buf.toString()).traceEvents || [];
      const sum = (names) => events.filter((e) => e.ph === 'X' && names.includes(e.name)).reduce((a, e) => a + (e.dur || 0), 0) / 1000;
      runs.push({
        paintMs: sum(['Paint']),
        rasterMs: sum(['RasterTask', 'GPUTask']),
        layerizeMs: sum(['Layerize', 'PrePaint']),
      });
      await context.close();
    }
    result[id] = {
      paintMs: +median(runs.map((r) => r.paintMs)).toFixed(2),
      rasterMs: +median(runs.map((r) => r.rasterMs)).toFixed(2),
      runs: runs.map((r) => [+r.paintMs.toFixed(2), +r.rasterMs.toFixed(2)]),
    };
    console.log(id, JSON.stringify(result[id]));
  }
  await browser.close();
  return result;
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
    g.font = '600 15px sans-serif'; g.fillStyle = INK; g.fillText(rowLabels[r], GAP, y + 24);
    for (let c = 0; c < colLabels.length; c++) {
      const cell = cells[r][c]; const x = SIDE + GAP + c * (cellW + GAP);
      if (!cell) { g.fillStyle = '#522'; g.fillRect(x, y, cellW, 60); continue; }
      const w = cell.w || cellW;
      g.drawImage(cell.img, x, y, w, Math.round(cell.img.height * (w / cell.img.width)));
    }
    y += rowH[r] + GAP;
  }
  await writeFile(path, cv.toBuffer('image/jpeg', 92));
  console.log(`sheet ${path} ${W}x${H}`);
}

async function sheets() {
  const ids = SIZES.map((s) => s.id);
  /* Swatch at CSS size: every cell drawn at its CSS width (a 2x capture is halved). */
  const rows = [
    { what: 'swatch2-before', v: 'light', label: 'before, light' },
    { what: 'swatch2', v: 'ox', label: 'oxblood, light' },
    { what: 'swatch2', v: 'blue', label: 'porcelain, light' },
    { what: 'swatch2-before', v: 'dark', label: 'before, dark' },
    { what: 'swatch2', v: 'gold', label: 'gold on hunter' },
    { what: 'swatch2', v: 'goldfield', label: 'gold on raised field' },
  ];
  await sheet(join(out, 'sheet-swatch.jpg'), 'Services No. 2 swatch with the toile, every size (CSS size; 390 is a 2x capture shown at half)',
    rows.map((r) => r.label), ids, 360, async (r, c) => {
      const img = await load(shot(rows[r].what, rows[r].v, ids[c]));
      if (!img) return null;
      const css = SIZES[c].dpr === 2 ? img.width / 2 : img.width;
      return { img, w: Math.min(360, css) };
    });
  const vlabels = VARIANTS.map((v) => v.label);
  for (const [sz, cw] of [['1440', 700], ['390', 330]]) {
    await sheet(join(out, `sheet-wall-${sz}.jpg`), `Full-bleed toile wall at ${sz}: plain, and with a raised card on it (no words, bars only)`,
      vlabels, ['plain', 'with card'], cw, async (r, c) => {
        const img = await load(shot(c ? 'wallcard' : 'wall', VARIANTS[r].id, sz));
        return img && { img };
      });
  }
  await sheet(join(out, 'sheet-wall-sizes.jpg'), 'Toile wall at 1280, 1024 and 820 (viewport)',
    vlabels, ['1280', '1024', '820'], 440, async (r, c) => {
      const img = await load(shot('wall', VARIANTS[r].id, ['1280', '1024', '820'][c]));
      return img && { img };
    });
  const vig = ['grove', 'grove2', 'desk', 'reader', 'parasol', 'urn'];
  await sheet(join(out, 'sheet-crops.jpg'), '100% crops off the 1440 wall: line, not blobs (light oxblood, dark gold)',
    vig, ['light', 'dark'], 460, async (r, c) => {
      const img = await load(join(crops, `crop-${vig[r]}__${c ? 'gold' : 'ox'}.png`));
      return img && { img, w: img.width };
    });
  await sheet(join(out, 'sheet-services-full.jpg'), 'Services, whole page, toile on the No. 2 swatch (each cell one fifth of its capture width at most)',
    ['light, oxblood', 'light, porcelain', 'dark, gold'], ids, 300, async (r, c) => {
      const v = ['ox', 'blue', 'gold'][r];
      const img = await load(shot('services', v, ids[c]));
      return img && { img };
    });
}

/* ---------- index ---------- */
async function index(measures, stats) {
  const lines = [
    '# Stage 5 proof a1: grandmillennial toile, images',
    '',
    `Renderer: ${existsSync(join(out, 'renderer.txt')) ? (await readFile(join(out, 'renderer.txt'), 'utf8')).trim() : 'unknown'}`,
    `Pattern: ${JSON.stringify(stats)}`,
    `Paint cost (median of 7 cold first paints of a 1440x900 wall, ms): ${JSON.stringify(measures)}`,
    '',
    '## Founder sheets',
    '- sheet-swatch.jpg: the Services No. 2 swatch, before and with the toile, every size, light inks and dark grounds',
    '- sheet-wall-1440.jpg, sheet-wall-390.jpg: full-bleed wall, plain and with a raised card, four variants',
    '- sheet-wall-sizes.jpg: the wall at 1280, 1024, 820',
    '- sheet-crops.jpg: 100% crops of every vignette, light and dark',
    '- sheet-services-full.jpg: whole Services page at every size',
    '',
    '## Single images',
    '- shots/swatch2-before__<light|dark>__<size>.png: the frozen build swatch',
    '- shots/swatch2__<ox|blue|gold|goldfield>__<size>.png: swatch with the toile',
    '- shots/services__<ox|blue|gold>__<size>.png: whole page',
    '- shots/wall__<variant>__<size>.png: viewport wall; shots/wallcard__<variant>__<1440|390>.png: with a card',
    '- crops/crop-<vignette>__<ox|gold>.png: 100% crops at 1440',
    '',
  ];
  await writeFile(join(out, 'index.md'), lines.join('\n'));
}

if (!process.argv.includes('--sheets-only')) await capture();
let measures = {};
const mpath = join(out, 'measures.json');
if (!process.argv.includes('--sheets-only') && !process.argv.includes('--skip-paint')) {
  measures = await paintCost();
  await writeFile(mpath, JSON.stringify(measures, null, 2) + '\n');
} else if (existsSync(mpath)) measures = JSON.parse(await readFile(mpath, 'utf8'));
await sheets();
await index(measures, JSON.parse(await readFile(join(PROOF, 'toile-stats.json'), 'utf8')));
