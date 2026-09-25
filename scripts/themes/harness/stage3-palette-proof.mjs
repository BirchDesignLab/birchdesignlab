/**
 * The glass wallpaper palette proof: does glass (today, warm Big Sur, blue
 * Bloom) read clearly apart from vaporwave at sheet scale?
 *
 * Written 09-25-26 for Tier 3 stage 3 (Tier A proofs). Read-only against a
 * served build (snap.mjs sets SNAP_BASE). For each column
 *   vaporwave | glass today | glass warm | glass blue
 * it loads Home, Services and About in dark and light, at desktop 1440x900
 * (1x) and phone 390x844 (2x, touch), injecting the variant sheet
 * (scripts/themes/proofs/stage3-palette/<warm|blue>.css) with addStyleTag
 * after load. Comp-only CSS for every column: the portal switcher is hidden
 * (portal chrome, not palette), and on glass columns the orb drift is paused
 * so the three glass columns are not caught at different drift phases.
 *
 * Capture caveat: glass's wallpaper (main::before) and vaporwave's
 * atmosphere are position: fixed, and a full-page screenshot paints a fixed
 * layer only in the top viewport. So every page is STITCHED from
 * viewport-sized captures at scroll offsets 0, vh, 2vh ... and a last one
 * flush with the bottom; the wallpaper is left fixed, so each band shows it
 * as a reader at that scroll would. Sticky and fixed chrome (the header bar)
 * is hidden in every band after the first, so it appears once, at the top.
 *
 * Output (scripts/themes/.out/stage3-proofs/palette/):
 *   pages/<col>__<page>__<scheme>__<vp>.png   stitched full pages
 *   pages/unstitched__<col>__<scheme>__<first|mid>.png
 *                                             raw, un-stitched Home viewport
 *                                             captures at 1440 (see below)
 *   thumb-dark.jpg, thumb-light.jpg           the three pages per column,
 *                                             each scaled to 320 px wide;
 *                                             captioned re: the stitch seam
 *   hero-desktop.jpg                          first 900 px of Home, both schemes
 *   phone.jpg                                 top two screens of Home at 390;
 *                                             captioned re: the stitch seam
 *   unstitched.jpg                            Home at 1440, dark/light x
 *                                             first-screen/mid-page, each an
 *                                             unstitched raw screenshot, so
 *                                             the fixed wallpaper is seen
 *                                             whole and not through the
 *                                             stitching method's seams
 *   renderer.txt                              WEBGL_debug_renderer_info
 *
 * Usage:
 *   node scripts/themes/snap.mjs --name stage3-base --reuse --port 4461 -- \
 *     node scripts/themes/harness/stage3-palette-proof.mjs     (with BDL_GPU=1)
 *   node scripts/themes/harness/stage3-palette-proof.mjs --sheets-only
 * Flags: --base <url> (default SNAP_BASE), --cols vaporwave,today,warm,blue.
 * Exits 2 if the GPU is not in use (SwiftShader is a failure here).
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
function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const base = arg('base', process.env.SNAP_BASE || '').replace(/\/$/, '');
const out = join(HERE, '..', '.out', 'stage3-proofs', 'palette');
const pagesDir = join(out, 'pages');
await mkdir(pagesDir, { recursive: true });

const COLS = [
  { id: 'vaporwave', label: 'vaporwave', school: 'vaporwave' },
  { id: 'today', label: 'glass today', school: 'glassmorphism' },
  { id: 'warm', label: 'glass warm (Big Sur)', school: 'glassmorphism', css: 'warm.css' },
  { id: 'blue', label: 'glass blue (Bloom)', school: 'glassmorphism', css: 'blue.css' },
];
const wanted = arg('cols', COLS.map((c) => c.id).join(',')).split(',');
const PAGES = [{ id: 'home', path: '' }, { id: 'services', path: 'services/' }, { id: 'about', path: 'about/' }];
const SCHEMES = ['dark', 'light'];
const VPS = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};
const file = (col, pg, scheme, vp) => join(pagesDir, `${col}__${pg}__${scheme}__${vp}.png`);
const unstitchedFile = (col, scheme, shot) => join(pagesDir, `unstitched__${col}__${scheme}__${shot}.png`);

async function capture() {
  if (!base) { console.error('no --base and no SNAP_BASE; run through snap.mjs'); process.exit(1); }
  const gpu = process.env.BDL_GPU === '1';
  if (!gpu) { console.error('BDL_GPU=1 is required: software-rendered pixels are not shipped'); process.exit(2); }
  const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
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
  const sheets = {};
  for (const c of COLS) if (c.css) sheets[c.id] = await readFile(join(REPO, 'scripts', 'themes', 'proofs', 'stage3-palette', c.css), 'utf8');
  const comp = 'bdl-switcher{display:none!important}';
  const compGlass = comp + ' html[data-theme="glassmorphism"] .orb{animation-play-state:paused!important}';

  for (const col of COLS.filter((c) => wanted.includes(c.id))) {
    for (const [vp, opts] of Object.entries(VPS)) {
      for (const scheme of SCHEMES) {
        const context = await browser.newContext({ ...opts, colorScheme: scheme });
        await suppressPrompt(context);
        await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
        const page = await context.newPage();
        for (const pg of PAGES) {
          await page.goto(`${base}/t/${col.school}/${pg.path}`, { waitUntil: 'networkidle' });
          await page.addStyleTag({ content: col.school === 'glassmorphism' ? compGlass : comp });
          if (sheets[col.id]) await page.addStyleTag({ content: sheets[col.id] });
          await page.evaluate(async () => { await document.fonts.ready; document.documentElement.style.scrollBehavior = 'auto'; });
          await page.waitForTimeout(col.school === 'vaporwave' ? 1500 : 900);
          const got = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, scheme: document.documentElement.dataset.scheme }));
          if (got.theme !== col.school || got.scheme !== scheme) console.warn(`WARN ${col.id} ${pg.id}: page says theme=${got.theme} scheme=${got.scheme}`);
          await stitch(page, opts, file(col.id, pg.id, scheme, vp));
          console.log(`ok ${col.id} ${pg.id} ${scheme} ${vp}`);
          if (pg.id === 'home' && vp === 'desktop') {
            await captureUnstitched(page, col.id, scheme);
            console.log(`ok ${col.id} home ${scheme} unstitched`);
          }
        }
        await context.close();
      }
    }
  }
  await browser.close();
}

async function stitch(page, opts, path) {
  const dpr = opts.deviceScaleFactor;
  const { vw, vh, H } = await page.evaluate(() => {
    window.scrollTo(0, 0);
    return { vw: document.documentElement.clientWidth, vh: window.innerHeight, H: document.documentElement.scrollHeight };
  });
  const offsets = [];
  for (let y = 0; y < H - vh; y += vh) offsets.push(y);
  offsets.push(Math.max(0, H - vh));
  const canvas = createCanvas(vw * dpr, H * dpr);
  const g = canvas.getContext('2d');
  for (let k = 0; k < offsets.length; k++) {
    const y = offsets[k];
    await page.evaluate(({ y, hide }) => {
      window.scrollTo(0, y);
      if (hide && !window.__bandHidden) {
        window.__bandHidden = [];
        for (const el of document.querySelectorAll('body *')) {
          const cs = getComputedStyle(el);
          if ((cs.position === 'fixed' || cs.position === 'sticky') && el.getBoundingClientRect().height < innerHeight * 0.5) {
            window.__bandHidden.push([el, el.style.visibility]);
            el.style.visibility = 'hidden';
          }
        }
      }
    }, { y, hide: k > 0 });
    await page.waitForTimeout(220);
    const real = await page.evaluate(() => window.scrollY);
    const buf = await page.screenshot();
    g.drawImage(await loadImage(buf), 0, real * dpr);
  }
  await page.evaluate(() => {
    for (const [el, v] of window.__bandHidden || []) el.style.visibility = v;
    window.__bandHidden = null;
    window.scrollTo(0, 0);
  });
  await writeFile(path, canvas.toBuffer('image/png'));
}

/**
 * Finding 1 (Tier A fix round): the stitched full pages step the fixed
 * wallpaper every viewport height, which reads as banding at thumbnail
 * scale. That step is the stitching method, not the wallpaper. This
 * captures the wallpaper whole and unstitched instead: one raw viewport
 * screenshot at the top of Home, and one at roughly the middle of the page.
 */
async function captureUnstitched(page, colId, scheme) {
  const { vh, H } = await page.evaluate(() => {
    window.scrollTo(0, 0);
    return { vh: window.innerHeight, H: document.documentElement.scrollHeight };
  });
  await page.waitForTimeout(150);
  await writeFile(unstitchedFile(colId, scheme, 'first'), await page.screenshot());
  const mid = Math.max(0, Math.round((H - vh) / 2));
  await page.evaluate((y) => window.scrollTo(0, y), mid);
  await page.waitForTimeout(220);
  await writeFile(unstitchedFile(colId, scheme, 'mid'), await page.screenshot());
  await page.evaluate(() => window.scrollTo(0, 0));
}

/* ---------- sheets ---------- */

const BG = '#1b1b1f', INK = '#f2f2f2', CAPTION = '#c9c9d0', LH = 34, CAPH = 26, GAP = 14, SIDE = 110;
function header(g, x, y, text, size = 18) {
  g.fillStyle = INK; g.font = `600 ${size}px sans-serif`; g.fillText(text, x, y);
}
function caption(g, x, y, text) {
  g.fillStyle = CAPTION; g.font = `italic 15px sans-serif`; g.fillText(text, x, y);
}
async function load(p) { return existsSync(p) ? loadImage(p) : null; }

/**
 * rows x cols of cells; cell(r, c) returns { img, sx, sy, sw, sh } or null.
 * `captionText`, when given, is a legible one-line note under the title
 * (e.g. flagging a capture-method artifact so it does not read as a defect).
 */
async function sheet(path, title, rowLabels, colLabels, cellW, cellFn, captionText) {
  const cells = [];
  let rowH = [];
  for (let r = 0; r < rowLabels.length; r++) {
    cells.push([]);
    let h = 0;
    for (let c = 0; c < colLabels.length; c++) {
      const cell = await cellFn(r, c);
      cells[r].push(cell);
      if (cell) h = Math.max(h, Math.round(cell.sh * (cellW / cell.sw)));
    }
    rowH.push(h || 100);
  }
  const capH = captionText ? CAPH : 0;
  const W = SIDE + colLabels.length * (cellW + GAP) + GAP;
  const Htot = 50 + capH + LH + rowH.reduce((a, b) => a + b + GAP, 0) + GAP;
  const cv = createCanvas(W, Htot);
  const g = cv.getContext('2d');
  g.fillStyle = BG; g.fillRect(0, 0, W, Htot);
  header(g, GAP, 32, title, 22);
  if (captionText) caption(g, GAP, 32 + 22, captionText);
  colLabels.forEach((l, c) => header(g, SIDE + GAP + c * (cellW + GAP), 50 + capH + 24, l));
  let y = 50 + capH + LH;
  for (let r = 0; r < rowLabels.length; r++) {
    header(g, GAP, y + 24, rowLabels[r], 17);
    for (let c = 0; c < colLabels.length; c++) {
      const cell = cells[r][c];
      const x = SIDE + GAP + c * (cellW + GAP);
      if (!cell) { g.fillStyle = '#522'; g.fillRect(x, y, cellW, 60); continue; }
      const h = Math.round(cell.sh * (cellW / cell.sw));
      g.drawImage(cell.img, cell.sx, cell.sy, cell.sw, cell.sh, x, y, cellW, h);
    }
    y += rowH[r] + GAP;
  }
  await writeFile(path, cv.toBuffer('image/jpeg', 92));
  console.log(`sheet ${path} ${W}x${Htot}`);
}

async function sheets() {
  const colLabels = COLS.map((c) => c.label);
  const STEP_CAPTION = 'Hard steps every 900 px are the stitch seam, not a wallpaper defect: see unstitched.jpg for the whole wallpaper.';
  for (const scheme of SCHEMES) {
    await sheet(join(out, `thumb-${scheme}.jpg`), `Palette proof, ${scheme}: full pages at 1440, scaled to 320 px (stitched; fixed wallpaper kept fixed)`,
      PAGES.map((p) => p.id), colLabels, 320, async (r, c) => {
        const img = await load(file(COLS[c].id, PAGES[r].id, scheme, 'desktop'));
        return img && { img, sx: 0, sy: 0, sw: img.width, sh: img.height };
      }, STEP_CAPTION);
  }
  await sheet(join(out, 'hero-desktop.jpg'), 'Palette proof: Home, first 900 px at 1440 (shown at half size)',
    SCHEMES, colLabels, 720, async (r, c) => {
      const img = await load(file(COLS[c].id, 'home', SCHEMES[r], 'desktop'));
      return img && { img, sx: 0, sy: 0, sw: img.width, sh: Math.min(900, img.height) };
    });
  const PHONE_CAPTION = 'Hard steps every 844 px are the stitch seam, not a wallpaper defect: see unstitched.jpg for the whole wallpaper.';
  await sheet(join(out, 'phone.jpg'), 'Palette proof: Home at 390 (2x), top two screens (1688 css px), shown at 1x',
    SCHEMES, colLabels, 390, async (r, c) => {
      const img = await load(file(COLS[c].id, 'home', SCHEMES[r], 'phone'));
      return img && { img, sx: 0, sy: 0, sw: img.width, sh: Math.min(1688 * 2, img.height) };
    }, PHONE_CAPTION);

  /* Finding 1: unstitched viewport captures, so the fixed wallpaper is seen
     whole rather than through the stitching method's per-band seams. */
  const shotRows = [
    { label: 'dark: first screen', scheme: 'dark', shot: 'first' },
    { label: 'dark: mid-page', scheme: 'dark', shot: 'mid' },
    { label: 'light: first screen', scheme: 'light', shot: 'first' },
    { label: 'light: mid-page', scheme: 'light', shot: 'mid' },
  ];
  await sheet(join(out, 'unstitched.jpg'), 'Palette proof: unstitched viewport captures, Home at 1440, dark and light',
    shotRows.map((r) => r.label), colLabels, 320, async (r, c) => {
      const row = shotRows[r];
      const img = await load(unstitchedFile(COLS[c].id, row.scheme, row.shot));
      return img && { img, sx: 0, sy: 0, sw: img.width, sh: img.height };
    }, 'Each cell is one raw, un-stitched screenshot: no seam, the wallpaper as a reader actually sees it at that scroll.');
}

if (!process.argv.includes('--sheets-only')) await capture();
await sheets();
