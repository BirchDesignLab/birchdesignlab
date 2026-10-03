/**
 * Stage 4 Tier A proof a3: swiss rotated condensed "Birch" on About (D2).
 *
 * Injects scripts/themes/proofs/stage4-swiss-rotated/proof.css (and the
 * Archivo width-axis face, served from node_modules) into a frozen build, plus
 * one aria-hidden <span class="sw-birch"> in About's section 02. Nothing under
 * src/ changes. Modes:
 *   --probe         print section 02's height and the word's advance ratio at
 *                   each size (the numbers the fit rule is solved from)
 *   (default)       capture everything, then sheets
 *   --sheets-only   rebuild sheets from existing shots
 *
 * Capture (shots/):
 *   full__<variant>__<scheme>__<size>   whole About page
 *   crop__<variant>__<scheme>__<size>   section 02 alone
 *   variants: before (frozen), left, right (1440 and 1280 only), and at 390 /
 *   360: run, drop. checks.json: horizontal overflow, word length against the
 *   section height, ink extents, and the accessibility-tree comparison.
 *
 * Usage (BDL_GPU=1 required; exits 2 on a software renderer):
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name stage4-base --reuse --port 4460 -- \
 *     node scripts/themes/harness/stage4-swiss-rotated-proof.mjs
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
const PROOF = join(REPO, 'scripts', 'themes', 'proofs', 'stage4-swiss-rotated');
const out = join(REPO, 'scripts', 'themes', '.out', 'stage4-proofs', 'swiss-rotated');
const shots = join(out, 'shots');
await mkdir(shots, { recursive: true });
const base = (process.env.SNAP_BASE || '').replace(/\/$/, '');
const FONT = join(REPO, 'node_modules', '@fontsource-variable', 'archivo', 'files', 'archivo-latin-wdth-normal.woff2');

const SCHEMES = ['light', 'dark'];
const SIZES = [
  { id: '1440', w: 1440, h: 900, dpr: 1 },
  { id: '1280', w: 1280, h: 800, dpr: 1 },
  { id: '1024', w: 1024, h: 768, dpr: 1 },
  { id: '820', w: 820, h: 1180, dpr: 1 },
  { id: '390', w: 390, h: 844, dpr: 2, mobile: true },
  { id: '360', w: 360, h: 800, dpr: 2, mobile: true },
];
/* variant -> [edge, phone] */
const VARIANTS = {
  before: null,
  left: ['left', 'run'],
  right: ['right', 'run'],
  run: ['left', 'run'],
  drop: ['off', 'drop'],
};
const variantsFor = (sz) => {
  if (sz.w >= 640) return ['before', 'left', ...(sz.w >= 1280 ? ['right'] : []), ...(sz.w < 1024 ? ['drop'] : [])];
  return ['before', 'run', 'drop'];
};
const only = (process.argv.find((a) => a.startsWith('--sizes=')) || '').slice(8).split(',').filter(Boolean);
const only2 = only.length ? SIZES.filter((z) => only.includes(z.id)) : SIZES;
const shot = (...parts) => join(shots, parts.join('__') + '.png');

const FACE_CSS = `
@font-face{font-family:'Archivo Variable';font-style:normal;font-display:block;font-weight:100 900;font-stretch:62% 125%;
  src:url(/__proof/archivo-wdth.woff2) format('woff2-variations');
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

const fontBytes = await readFile(FONT);

async function newCtx(browser, sz, scheme) {
  const context = await browser.newContext({
    viewport: { width: sz.w, height: sz.h }, deviceScaleFactor: sz.dpr,
    isMobile: !!sz.mobile, hasTouch: !!sz.mobile, colorScheme: scheme, reducedMotion: 'no-preference',
  });
  await suppressPrompt(context);
  await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
  await context.route('**/__proof/archivo-wdth.woff2', (r) => r.fulfill({ body: fontBytes, contentType: 'font/woff2' }));
  const page = await context.newPage();
  await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'no-preference', reducedTransparency: 'no-preference' });
  return { context, page };
}

/** Load About; with a variant inject the face, sheet, markup and tags. */
async function prep(page, scheme, variant, css) {
  await page.goto(`${base}/t/swiss/about/`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: COMP });
  const v = VARIANTS[variant];
  if (v) {
    await page.evaluate(([edge, phone]) => {
      const root = document.documentElement;
      root.dataset.proofEdge = edge;
      root.dataset.proofPhone = phone;
      const sec = document.querySelector('.founder');
      const s = document.createElement('span');
      s.className = 'sw-birch';
      s.setAttribute('aria-hidden', 'true');
      s.textContent = 'Birch';
      sec.appendChild(s);
    }, v);
    await page.addStyleTag({ content: FACE_CSS + '\n' + css });
  }
  await page.evaluate(async () => {
    await Promise.all([document.fonts.load("400 17px 'Archivo Variable'"), document.fonts.load("900 200px 'Archivo Variable'")]);
    await document.fonts.ready;
  });
  await page.waitForTimeout(700);
  const got = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, scheme: document.documentElement.dataset.scheme }));
  if (got.theme !== 'swiss' || got.scheme !== scheme) console.warn(`WARN theme=${got.theme} scheme=${got.scheme}`);
}

/* In-page: the word's advance (inline extent of its text) and box. */
const WORD_FN = `() => {
  const w = document.querySelector('.sw-birch');
  const sec = document.querySelector('.founder');
  if (!w) return null;
  const r = document.createRange(); r.selectNodeContents(w);
  const t = r.getBoundingClientRect();
  const b = w.getBoundingClientRect();
  const s = sec.getBoundingClientRect();
  const cs = getComputedStyle(w);
  return { secTop: s.top + scrollY, secH: s.height, secL: s.left, secR: s.right,
    advance: t.height, thick: t.width, boxL: b.left, boxR: b.right, boxH: b.height,
    font: parseFloat(cs.fontSize), stretch: cs.fontStretch, weight: cs.fontWeight };
}`;

async function probe() {
  const browser = await launch();
  const css = await readFile(join(PROOF, 'proof.css'), 'utf8');
  for (const sz of [{ id: '1920', w: 1920, h: 1080, dpr: 1 }, { id: '2560', w: 2560, h: 1300, dpr: 1 }, ...SIZES]) {
    const { context, page } = await newCtx(browser, sz, 'light');
    await prep(page, 'light', sz.w >= 640 ? 'left' : 'run', css);
    const m = await page.evaluate(`(${WORD_FN})()`);
    const r = await page.evaluate(() => {
      const w = document.querySelector('.sw-birch');
      w.style.setProperty('font-size', '100px', 'important');
      const rg = document.createRange(); rg.selectNodeContents(w);
      const q = rg.getBoundingClientRect();
      return { adv100: q.height, thick100: q.width };
    });
    if (sz.id === '1440') {
      const tbl = await page.evaluate(() => {
        const w = document.querySelector('.sw-birch');
        const o = {};
        for (const wd of [62, 70, 75, 80, 85, 90, 100, 110, 125]) {
          w.style.setProperty('--sw-bwdth', String(wd));
          w.style.setProperty('font-size', '100px', 'important');
          const rg = document.createRange(); rg.selectNodeContents(w);
          o[wd] = +(rg.getBoundingClientRect().height / 100).toFixed(4);
        }
        return o;
      });
      console.log('advance ratio by width axis (weight 900):', JSON.stringify(tbl));
    }
    console.log(sz.id, JSON.stringify({ secH: +m.secH.toFixed(1), font: +m.font.toFixed(1), advance: +m.advance.toFixed(1), r: +(r.adv100 / 100).toFixed(4), thick100: r.thick100, vw: sz.w, ratioHvw: +(m.secH / sz.w).toFixed(4), boxL: +m.boxL.toFixed(1), boxR: +m.boxR.toFixed(1), secL: +m.secL.toFixed(1) }));
    await context.close();
  }
  await browser.close();
}

async function capture() {
  const browser = await launch();
  const css = await readFile(join(PROOF, 'proof.css'), 'utf8');
  const report = [];
  for (const sz of only2) {
    for (const scheme of SCHEMES) {
      const { context, page } = await newCtx(browser, sz, scheme);
      for (const variant of variantsFor(sz)) {
        await prep(page, scheme, variant, css);
        await page.screenshot({ path: shot('full', variant, scheme, sz.id), fullPage: true });
        const sec = page.locator('.founder').first();
        await sec.scrollIntoViewIfNeeded();
        await page.waitForTimeout(150);
        await sec.screenshot({ path: shot('crop', variant, scheme, sz.id) });
        if (VARIANTS[variant] && scheme === 'light') {
          /* Ink only: everything but the word hidden, 40px of the page above and below the section. */
          const st = await page.addStyleTag({ content: 'body *{visibility:hidden!important} .sw-birch{visibility:visible!important} body{background:#fff!important} html{background:#fff!important}' });
          const sb = await page.evaluate(() => { const r = document.querySelector('.founder').getBoundingClientRect(); return { y: r.top + scrollY, h: r.height }; });
          await page.screenshot({ path: shot('ink', variant, scheme, sz.id), fullPage: true, clip: { x: 0, y: Math.max(0, sb.y - 40), width: sz.w, height: sb.h + 80 } });
          await st.evaluate((n) => n.remove());
        }
        const doc = await page.evaluate(() => ({ scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth, bodyScrollW: document.body.scrollWidth }));
        const w = await page.evaluate(`(${WORD_FN})()`);
        const kick = await page.evaluate(() => { const k = document.querySelector('.kicker'); const cs = getComputedStyle(k); return { writingMode: cs.writingMode, transform: cs.transform }; });
        /* Text-clearance: the left-most and right-most text rectangles in the section. */
        const clear = await page.evaluate(() => {
          const sec = document.querySelector('.founder');
          const w = document.querySelector('.sw-birch');
          const wb = w ? w.getBoundingClientRect() : null;
          const items = [...sec.querySelectorAll('.kicker, .founder-lead, .founder-p')].map((e) => {
            const r = document.createRange(); r.selectNodeContents(e); const b = r.getBoundingClientRect();
            return { cls: e.className, l: Math.round(b.left), r: Math.round(b.right), t: Math.round(b.top + scrollY), b: Math.round(b.bottom + scrollY) };
          });
          const wr = wb && { l: Math.round(wb.left), r: Math.round(wb.right) };
          return { word: wr, items };
        });
        let tree = null;
        if (VARIANTS[variant]) {
          const withWord = await page.locator('body').ariaSnapshot();
          await page.evaluate(() => document.querySelector('.sw-birch').remove());
          const without = await page.locator('body').ariaSnapshot();
          tree = { identical: withWord === without, wordInTree: /sw-birch/.test(withWord) };
        }
        report.push({ variant, scheme, size: sz.id, ...doc, noOverflow: doc.scrollW <= doc.clientW, word: w, kicker: kick, clear, tree });
        console.log(`ok ${variant} ${scheme} ${sz.id} scroll ${doc.scrollW}/${doc.clientW}` + (w ? ` secH ${w.secH.toFixed(0)} advance ${w.advance.toFixed(0)} font ${w.font.toFixed(0)} tree ${tree && tree.identical}` : ''));
      }
      await context.close();
    }
  }
  await writeFile(join(out, only.length ? 'checks-partial.json' : 'checks.json'), JSON.stringify(report, null, 2) + '\n');
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
  const img = async (...p) => { const i = await load(shot(...p)); return i && { img: i }; };
  /* Section 02 crops across sizes: before against the word, per scheme. */
  for (const scheme of SCHEMES) {
    await sheet(join(out, `sec02-${scheme}.jpg`), `About section 02, ${scheme}: frozen build (left) against the word on the left edge (right)`,
      ['1440', '1280', '1024', '820'], ['before', 'left edge'], 640,
      (r, c) => img('crop', ['before', 'left'][c], scheme, ['1440', '1280', '1024', '820'][r]));
    await sheet(join(out, `edges-${scheme}.jpg`), `Which edge, ${scheme}: left frame edge against column 12 (section 02 crops)`,
      ['1440', '1280'], ['left edge', 'right (col 12)'], 640,
      (r, c) => img('crop', ['left', 'right'][c], scheme, ['1440', '1280'][r]));
    await sheet(join(out, `edges-full-${scheme}.jpg`), `Which edge, ${scheme}, whole About page at 1440`,
      ['1440'], ['frozen', 'left edge', 'right (col 12)'], 520,
      (r, c) => img('full', ['before', 'left', 'right'][c], scheme, '1440'), null, 2600);
    await sheet(join(out, `phone-${scheme}.jpg`), `Phone section 02, ${scheme}: frozen, word running up the edge, word dropped`,
      ['390', '360'], ['before', 'run up the edge', 'dropped'], 360,
      (r, c) => img('crop', ['before', 'run', 'drop'][c], scheme, ['390', '360'][r]));
    await sheet(join(out, `full-${scheme}.jpg`), `About whole page, the answer: word on the left edge from 1024, dropped at 820 and 390 (${scheme})`,
      ['page'], ['1440', '1280', '1024', '820', '390'], 300,
      (r, c) => img('full', ['left', 'left', 'left', 'drop', 'drop'][c], scheme, ['1440', '1280', '1024', '820', '390'][c]), null, 2200);
  }
}

if (process.argv.includes('--probe')) await probe();
else {
  if (!process.argv.includes('--sheets-only')) await capture();
  await sheets();
}
