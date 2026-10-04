/**
 * Stage 4 Tier A proof a2: swiss one family (Archivo against Inter) and the
 * phone poster (brief items 7 and 9).
 *
 * Injects scripts/themes/proofs/stage4-swiss-type/proof.css (and the two
 * faces, served from node_modules) into a frozen build; nothing under src/
 * changes. Modes:
 *   --probe     measure each phone giant's widest line against the measure at
 *               a grid of font-stretch values and print the table (no images)
 *   (default)   capture everything
 *   --sheets-only   rebuild sheets from existing shots
 *
 * Capture:
 *   body__<page>__<face>__<scheme>__<size>   whole page, services + about,
 *       1440 / 1024 / 390, archivo and inter side by side
 *   crop__<page>__<face>__<size>             one body block at 2x
 *   first__<page>__<variant>__<scheme>__<size>   first screen at 390 and 360
 *       (variant before = frozen build, after = proof), 4 pages
 *   overflow.json  scrollWidth against clientWidth and every giant's box
 *
 * Usage (BDL_GPU=1 required; exits 2 on a software renderer):
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name stage4-base --reuse --port 4460 -- \
 *     node scripts/themes/harness/stage4-swiss-type-proof.mjs
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
const PROOF = join(REPO, 'scripts', 'themes', 'proofs', 'stage4-swiss-type');
const out = join(REPO, 'scripts', 'themes', '.out', 'stage4-proofs', 'swiss-type');
const shots = join(out, 'shots');
await mkdir(shots, { recursive: true });
const base = (process.env.SNAP_BASE || '').replace(/\/$/, '');
const FILES = join(REPO, 'node_modules', '@fontsource-variable');

const PAGES = {
  home: { path: '', giant: '.billboard' },
  about: { path: 'about/', giant: '.hero .title' },
  services: { path: 'services/', giant: '.hero .title' },
  contact: { path: 'contact/', giant: '.hero .title' },
};
const SCHEMES = ['light', 'dark'];
const BODY_SIZES = [
  { id: '1440', w: 1440, h: 900, dpr: 1 },
  { id: '1024', w: 1024, h: 768, dpr: 1 },
  { id: '390', w: 390, h: 844, dpr: 2, mobile: true },
];
const PHONES = [
  { id: '390', w: 390, h: 844, dpr: 2, mobile: true },
  { id: '360', w: 360, h: 800, dpr: 2, mobile: true },
];
const shot = (...parts) => join(shots, parts.join('__') + '.png');

/* Faces served from node_modules. Archivo is declared under the frozen
   build's own family name, last, so it replaces the wght-only Latin face. */
const FACE_CSS = `
@font-face{font-family:'Archivo Variable';font-style:normal;font-display:block;font-weight:100 900;font-stretch:62% 125%;
  src:url(/__proof/archivo-standard.woff2) format('woff2-variations');
  unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:'Inter Variable';font-style:normal;font-display:block;font-weight:100 900;
  src:url(/__proof/inter-standard.woff2) format('woff2-variations');
  unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
`;
const COMP = 'bdl-switcher{display:none!important} *{scroll-behavior:auto!important}';

async function launch() {
  if (!base) { console.error('no SNAP_BASE; run through snap.mjs'); process.exit(1); }
  if (process.env.BDL_GPU !== '1') { console.error('BDL_GPU=1 is required'); process.exit(2); }
  const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
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
  return browser;
}

const archivoBytes = await readFile(join(FILES, 'archivo', 'files', 'archivo-latin-standard-normal.woff2'));
const interBytes = await readFile(join(FILES, 'inter', 'files', 'inter-latin-standard-normal.woff2'));

async function newCtx(browser, sz, scheme) {
  const context = await browser.newContext({
    viewport: { width: sz.w, height: sz.h }, deviceScaleFactor: sz.dpr,
    isMobile: !!sz.mobile, hasTouch: !!sz.mobile, colorScheme: scheme, reducedMotion: 'no-preference',
  });
  await suppressPrompt(context);
  await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
  await context.route('**/__proof/archivo-standard.woff2', (r) => r.fulfill({ body: archivoBytes, contentType: 'font/woff2' }));
  await context.route('**/__proof/inter-standard.woff2', (r) => r.fulfill({ body: interBytes, contentType: 'font/woff2' }));
  const page = await context.newPage();
  await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'no-preference' });
  return { context, page };
}

/** Load a swiss page; with `proof` inject the faces, the proof sheet and the page tag. */
async function prep(page, scheme, name, { proof, face = 'archivo', css = '' }) {
  await page.goto(`${base}/t/swiss/${PAGES[name].path}`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: COMP });
  if (proof) {
    await page.evaluate((f) => {
      document.documentElement.dataset.proofPage = f.name;
      document.documentElement.classList.toggle('sw-body-inter', f.face === 'inter');
    }, { name, face });
    await page.addStyleTag({ content: FACE_CSS + '\n' + css });
  }
  await page.evaluate(async () => {
    await Promise.all([
      document.fonts.load("400 17px 'Archivo Variable'"), document.fonts.load("700 100px 'Archivo Variable'"),
      document.fonts.load("400 17px 'Inter Variable'"),
    ]);
    await document.fonts.ready;
  });
  await page.waitForTimeout(700);
  const got = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, scheme: document.documentElement.dataset.scheme }));
  if (got.theme !== 'swiss' || got.scheme !== scheme) console.warn(`WARN ${name}: theme=${got.theme} scheme=${got.scheme}`);
}

/* In-page: the widest line of the giant, in px, from the range's line boxes. */
const MEASURE_FN = `(sel) => {
  const el = document.querySelector(sel);
  const lines = {};
  const rects = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent.trim()) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    rects.push(...range.getClientRects());
  }
  for (const r of rects) {
    if (r.width < 1) continue;
    const k = Math.round(r.top);
    const a = lines[k] || (lines[k] = { l: r.left, r: r.right });
    a.l = Math.min(a.l, r.left); a.r = Math.max(a.r, r.right);
  }
  const ls = Object.values(lines).map((a) => a.r - a.l);
  const box = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  return { widest: Math.max(...ls), lines: ls.length, boxW: box.width, boxL: box.left, boxR: box.right, boxH: box.height, font: parseFloat(cs.fontSize), stretch: cs.fontStretch };
}`;

async function probe() {
  const browser = await launch();
  const css = await readFile(join(PROOF, 'proof.css'), 'utf8');
  const { context, page } = await newCtx(browser, PHONES[0], 'light');
  const table = {};
  for (const name of Object.keys(PAGES)) {
    await prep(page, 'light', name, { proof: true, css });
    const sel = PAGES[name].giant;
    const row = await page.evaluate(async ({ sel, fn }) => {
      const measure = 358;
      const m = eval(fn);
      const res = {};
      const el = document.querySelector(sel);
      const marginPx = el.getBoundingClientRect().left;
      for (const k of [0.3, 0.33, 0.36, 0.4, 0.45, 0.5]) {
        for (const s of [62, 70, 78, 85, 90, 100, 110, 125]) {
          el.style.setProperty('font-size', `${measure * k}px`, 'important');
          el.style.setProperty('font-stretch', `${s}%`, 'important');
          el.style.setProperty('max-width', 'none', 'important');
          await document.fonts.ready;
          const r = m(sel);
          res[`${k}@${s}`] = +(r.widest / measure).toFixed(3) + ` L${r.lines}`;
        }
      }
      return { measure, marginPx, res };
    }, { sel, fn: MEASURE_FN });
    table[name] = row;
    console.log(name, 'measure', row.measure, 'left', row.marginPx);
    for (const [k, v] of Object.entries(row.res)) process.stdout.write(`  ${k}=${v}`);
    console.log();
  }
  await writeFile(join(out, 'probe.json'), JSON.stringify(table, null, 2) + '\n');
  await context.close();
  await browser.close();
}

async function capture() {
  const browser = await launch();
  const css = await readFile(join(PROOF, 'proof.css'), 'utf8');
  const report = { phones: [], body: [] };

  /* 1. Body faces: Services and About (plus Home and Contact for the record) at 1440 / 1024 / 390. */
  for (const sz of BODY_SIZES) {
    for (const scheme of SCHEMES) {
      const { context, page } = await newCtx(browser, sz, scheme);
      for (const name of ['services', 'about']) {
        for (const face of ['archivo', 'inter']) {
          await prep(page, scheme, name, { proof: true, face, css });
          await page.screenshot({ path: shot('body', name, face, scheme, sz.id), fullPage: true });
          const m = await page.evaluate(() => {
            const p = document.querySelector('.offering-body p, .etym p:not(:first-child), .founder-p');
            const cs = getComputedStyle(p);
            const r = p.getBoundingClientRect();
            const doc = document.documentElement;
            return { family: cs.fontFamily.split(',')[0], size: cs.fontSize, line: cs.lineHeight, width: Math.round(r.width), scrollW: doc.scrollWidth, clientW: doc.clientWidth };
          });
          report.body.push({ name, face, scheme, size: sz.id, ...m });
          if (scheme === 'light' && sz.id !== '1024') {
            const target = page.locator(name === 'services' ? '.offering-body' : '.etym').first();
            await target.scrollIntoViewIfNeeded();
            await page.waitForTimeout(150);
            await target.screenshot({ path: shot('crop', name, face, scheme, sz.id) });
          }
          console.log(`ok body ${name} ${face} ${scheme} ${sz.id} ${m.family} ${m.size}/${m.line} scroll ${m.scrollW}/${m.clientW}`);
        }
      }
      await context.close();
    }
  }

  /* 2. Phone first screens: before (frozen) and after (proof), with giant boxes. */
  for (const sz of PHONES) {
    for (const scheme of SCHEMES) {
      const { context, page } = await newCtx(browser, sz, scheme);
      for (const name of Object.keys(PAGES)) {
        for (const variant of ['before', 'after']) {
          await prep(page, scheme, name, { proof: variant === 'after', css });
          await page.screenshot({ path: shot('first', name, variant, scheme, sz.id) });
          if (variant === 'after' && scheme === 'light') await page.screenshot({ path: shot('full', name, variant, scheme, sz.id), fullPage: true });
          const g = await page.evaluate(`(${MEASURE_FN})(${JSON.stringify(PAGES[name].giant)})`);
          const doc = await page.evaluate(() => ({ scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth, bodyScrollW: document.body.scrollWidth, vw: innerWidth }));
          const measure = doc.clientW - 2 * (await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--margin')) || 16));
          const row = { name, variant, scheme, size: sz.id, ...doc, ...g, measure, fill: +(g.widest / measure).toFixed(3) };
          report.phones.push(row);
          console.log(`ok first ${name} ${variant} ${scheme} ${sz.id} scroll ${doc.scrollW}/${doc.clientW} giant ${g.widest.toFixed(1)}/${measure} (${row.fill}) font ${g.font.toFixed(1)} ${g.stretch} lines ${g.lines} boxR ${g.boxR.toFixed(1)}`);
        }
      }
      await context.close();
    }
  }
  await writeFile(join(out, 'overflow.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}

/* ---------- sheets ---------- */
const BG = '#1b1b1f', INK = '#f2f2f2', CAP = '#c9c9d0', GAP = 14, SIDE = 120;
async function load(p) { return existsSync(p) ? loadImage(p) : null; }
async function sheet(path, title, rowLabels, colLabels, cellW, cellFn, note, maxH) {
  const cells = []; const rowH = [];
  for (let r = 0; r < rowLabels.length; r++) {
    cells.push([]); let h = 0;
    for (let c = 0; c < colLabels.length; c++) {
      const cell = await cellFn(r, c); cells[r].push(cell);
      if (cell) h = Math.max(h, Math.min(maxH || 1e9, Math.round(cell.img.height * (cellW / cell.img.width))));
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
    g.font = '600 17px sans-serif'; g.fillStyle = INK; g.fillText(rowLabels[r], GAP, y + 24);
    for (let c = 0; c < colLabels.length; c++) {
      const cell = cells[r][c]; const x = SIDE + GAP + c * (cellW + GAP);
      if (!cell) { g.fillStyle = '#522'; g.fillRect(x, y, cellW, 60); continue; }
      const full = Math.round(cell.img.height * (cellW / cell.img.width));
      const h = Math.min(maxH || 1e9, full);
      const sh = h < full ? cell.img.height * (h / full) : cell.img.height;
      g.drawImage(cell.img, 0, 0, cell.img.width, sh, x, y, cellW, h);
    }
    y += rowH[r] + GAP;
  }
  await writeFile(path, cv.toBuffer('image/jpeg', 92));
  console.log(`sheet ${path} ${W}x${H}`);
}

async function sheets() {
  const FACES = ['archivo', 'inter'];
  /* Whole pages, archivo against inter, one sheet per page and scheme. */
  for (const name of ['services', 'about']) {
    for (const scheme of SCHEMES) {
      await sheet(join(out, `body-${name}-${scheme}.jpg`),
        `${name}: body in Archivo (left of each pair) against Inter (right), ${scheme}, whole page`,
        ['1440', '1024', '390'], ['Archivo 1440', 'Inter 1440'].slice(0, 0).concat(['Archivo', 'Inter']), 560,
        async (r, c) => {
          const img = await load(shot('body', name, FACES[c], scheme, ['1440', '1024', '390'][r]));
          return img && { img };
        }, null, 1500);
    }
  }
  /* Body crops: the face at reading size. */
  await sheet(join(out, 'body-crops.jpg'), 'Body paragraphs at reading size (light): Archivo 400 / wdth 100 against Inter 400, both 17px on a 24px line',
    ['services 1440', 'about 1440', 'services 390', 'about 390'], ['Archivo', 'Inter'], 700, async (r, c) => {
      const [name, sz] = [['services', '1440'], ['about', '1440'], ['services', '390'], ['about', '390']][r];
      const img = await load(shot('crop', name, FACES[c], 'light', sz));
      return img && { img };
    });
  /* Phone first screens: before and after, per size and scheme. */
  for (const sz of PHONES) {
    for (const scheme of SCHEMES) {
      await sheet(join(out, `phone-first-${sz.id}-${scheme}.jpg`),
        `Phone first screen at ${sz.id}, ${scheme}: frozen build (top) against the proof (bottom)`,
        ['before', 'after'], Object.keys(PAGES), 360, async (r, c) => {
          const img = await load(shot('first', Object.keys(PAGES)[c], ['before', 'after'][r], scheme, sz.id));
          return img && { img };
        });
    }
  }
  await sheet(join(out, 'phone-full-390.jpg'), 'Phone pages whole, proof, light, 390',
    ['after'], Object.keys(PAGES), 360, async (r, c) => {
      const img = await load(shot('full', Object.keys(PAGES)[c], 'after', 'light', '390'));
      return img && { img };
    }, null, 2400);
}

if (process.argv.includes('--probe')) await probe();
else {
  if (!process.argv.includes('--sheets-only')) await capture();
  await sheets();
}
