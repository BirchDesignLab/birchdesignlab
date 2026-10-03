/**
 * Stage 4 Tier A proof a1: swiss red duotone Shining Tree on About (D1).
 *
 * Injects scripts/themes/proofs/stage4-swiss-duotone/proof.css into a frozen
 * build (nothing under src/ changes), for two duotone mappings
 *   black = tree-red-black.webp   (shadows black, highlights red)
 *   paper = tree-red-paper.webp   (shadows red, highlights paper)
 * and captures, at 1440, 1280, 1024, 820 and 390 (2x), light and dark:
 *   about full page, the manifesto field crop, Home first screen (before =
 *   the frozen build, after = rectangle dropped), and measures the contrast of
 *   white type against the pixels under each line of the manifesto.
 *
 * Output: scripts/themes/.out/stage4-proofs/swiss-duotone/
 *   shots/<map>__<what>__<scheme>__<size>.png, contrast.json, renderer.txt,
 *   index.md, and the founder sheets (*.jpg).
 *
 * Usage (BDL_GPU=1 required; exits 2 on a software renderer):
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name stage4-base --reuse --port 4460 -- \
 *     node scripts/themes/harness/stage4-swiss-duotone-proof.mjs
 *   ... --sheets-only   rebuild sheets from existing shots
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
const PROOF = join(REPO, 'scripts', 'themes', 'proofs', 'stage4-swiss-duotone');
const out = join(REPO, 'scripts', 'themes', '.out', 'stage4-proofs', 'swiss-duotone');
const shots = join(out, 'shots');
await mkdir(shots, { recursive: true });
const base = (process.env.SNAP_BASE || '').replace(/\/$/, '');

const MAPS = { black: 'tree-red-black.webp', paper: 'tree-red-paper.webp' };
const SIZES = [
  { id: '1440', w: 1440, h: 900, dpr: 1 },
  { id: '1280', w: 1280, h: 800, dpr: 1 },
  { id: '1024', w: 1024, h: 768, dpr: 1 },
  { id: '820', w: 820, h: 1180, dpr: 1 },
  { id: '390', w: 390, h: 844, dpr: 2, mobile: true },
];
const SCHEMES = ['light', 'dark'];
const shot = (map, what, scheme, size) => join(shots, `${map}__${what}__${scheme}__${size}.png`);

/** Luminance of an sRGB 0..255 triple. */
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratioWhite = (L) => 1.05 / (L + 0.05);

async function capture() {
  if (!base) { console.error('no SNAP_BASE; run through snap.mjs'); process.exit(1); }
  if (process.env.BDL_GPU !== '1') { console.error('BDL_GPU=1 is required'); process.exit(2); }
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
  const css = await readFile(join(PROOF, 'proof.css'), 'utf8');
  const comp = 'bdl-switcher{display:none!important} *{scroll-behavior:auto!important}';
  const contrast = [];

  for (const [map, file] of Object.entries(MAPS)) {
    const treeBytes = await readFile(join(PROOF, file));
    for (const sz of SIZES) {
      for (const scheme of SCHEMES) {
        const context = await browser.newContext({
          viewport: { width: sz.w, height: sz.h }, deviceScaleFactor: sz.dpr,
          isMobile: !!sz.mobile, hasTouch: !!sz.mobile, colorScheme: scheme,
          reducedMotion: 'no-preference',
        });
        await suppressPrompt(context);
        await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
        await context.route('**/__proof/tree.webp', (route) => route.fulfill({ body: treeBytes, contentType: 'image/webp' }));
        const page = await context.newPage();
        await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'no-preference' });

        const prep = async (path, withProof) => {
          await page.goto(`${base}/t/swiss/${path}`, { waitUntil: 'networkidle' });
          await page.addStyleTag({ content: comp });
          if (withProof) await page.addStyleTag({ content: `:root{--sw-tree:url(/__proof/tree.webp)}\n${css}` });
          await page.evaluate(async () => { await document.fonts.ready; });
          await page.waitForTimeout(900);
          const got = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, scheme: document.documentElement.dataset.scheme }));
          if (got.theme !== 'swiss' || got.scheme !== scheme) console.warn(`WARN ${path}: theme=${got.theme} scheme=${got.scheme}`);
        };

        /* About, with the proof. Wait for the image to decode. */
        await prep('about/', true);
        await page.evaluate(async () => {
          const u = getComputedStyle(document.querySelector('.manifesto')).backgroundImage;
          const m = /url\("?([^")]+)"?\)/.exec(u);
          if (m) { const i = new Image(); i.src = m[1]; await i.decode(); }
        });
        await page.screenshot({ path: shot(map, 'about', scheme, sz.id), fullPage: true });
        const field = page.locator('.manifesto');
        await field.scrollIntoViewIfNeeded();
        await page.waitForTimeout(200);
        await field.screenshot({ path: shot(map, 'field', scheme, sz.id) });

        /* Geometry and the bleed check. */
        const geo = await page.evaluate(() => {
          const el = document.querySelector('.manifesto');
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          const doc = document.documentElement;
          return {
            left: r.left, right: r.right, top: r.top + scrollY, height: r.height, vw: doc.clientWidth,
            bgSize: cs.backgroundSize, bgPos: cs.backgroundPosition, bg: cs.backgroundColor, color: cs.color,
            overflowX: doc.scrollWidth - doc.clientWidth,
          };
        });

        /* Contrast: hide the type, shoot the field, sample under each line. */
        const lines = await page.evaluate(() => {
          const el = document.querySelector('.manifesto');
          const origin = el.getBoundingClientRect();
          const rects = [];
          const grab = (node, tag) => {
            const range = document.createRange();
            range.selectNodeContents(node);
            for (const r of range.getClientRects()) {
              if (r.width < 2 || r.height < 2) continue;
              rects.push({ tag, x: r.left - origin.left, y: r.top - origin.top, w: r.width, h: r.height,
                size: parseFloat(getComputedStyle(node.nodeType === 1 ? node : node.parentElement).fontSize),
                weight: getComputedStyle(node.nodeType === 1 ? node : node.parentElement).fontWeight });
            }
          };
          grab(el.querySelector('.manifesto-text'), 'manifesto');
          grab(el.querySelector('.sw-idx'), 'index');
          return rects;
        });
        await page.addStyleTag({ content: '.manifesto .manifesto-text,.manifesto .sw-idx,.manifesto .cta{visibility:hidden!important}' });
        const bgPng = await field.screenshot();
        const { data, info } = await (await import('sharp')).default(bgPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        const rows = [];
        for (const tag of ['manifesto', 'index']) {
          const L = [];
          for (const r of lines.filter((l) => l.tag === tag)) {
            const x0 = Math.max(0, Math.floor(r.x * sz.dpr)), x1 = Math.min(info.width, Math.ceil((r.x + r.w) * sz.dpr));
            const y0 = Math.max(0, Math.floor(r.y * sz.dpr)), y1 = Math.min(info.height, Math.ceil((r.y + r.h) * sz.dpr));
            for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
              const i = (y * info.width + x) * 4;
              L.push(lum(data[i], data[i + 1], data[i + 2]));
            }
          }
          if (!L.length) continue;
          L.sort((a, b) => a - b);
          const q = (p) => L[Math.min(L.length - 1, Math.floor(L.length * p))];
          const sizes = lines.filter((l) => l.tag === tag).map((l) => l.size);
          rows.push({
            map, scheme, size: sz.id, tag, fontPx: Math.round(Math.max(...sizes)), pixels: L.length,
            darkest: +(ratioWhite(q(0))).toFixed(2), lightestWorst: +(ratioWhite(q(1))).toFixed(2),
            p999Worst: +(ratioWhite(q(0.999))).toFixed(2), medianContrast: +(ratioWhite(q(0.5))).toFixed(2),
            lightestLuminance: +q(1).toFixed(4),
          });
        }
        contrast.push(...rows.map((r) => ({ ...r, geo })));
        console.log(`ok about ${map} ${scheme} ${sz.id} bleed L${geo.left.toFixed(1)} R${(geo.vw - geo.right).toFixed(1)} ovfX${geo.overflowX}  contrast ` +
          rows.map((r) => `${r.tag}: worst ${r.lightestWorst} p99.9 ${r.p999Worst}`).join(' | '));

        /* Home, first screen: frozen build (before) and with the proof (after). */
        if (map === 'black') {
          await prep('', false);
          await page.screenshot({ path: shot('home', 'before', scheme, sz.id) });
          await prep('', true);
          await page.screenshot({ path: shot('home', 'after', scheme, sz.id) });
          await page.screenshot({ path: shot('home', 'after-full', scheme, sz.id), fullPage: true });
          console.log(`ok home ${scheme} ${sz.id}`);
        }
        await context.close();
      }
    }
  }
  await writeFile(join(out, 'contrast.json'), JSON.stringify(contrast, null, 2) + '\n');
  await browser.close();
}

/* ---------- sheets ---------- */
const BG = '#1b1b1f', INK = '#f2f2f2', CAP = '#c9c9d0', GAP = 14, SIDE = 120;
async function load(p) { return existsSync(p) ? loadImage(p) : null; }
async function sheet(path, title, rowLabels, colLabels, cellW, cellFn, note) {
  const cells = []; const rowH = [];
  for (let r = 0; r < rowLabels.length; r++) {
    cells.push([]); let h = 0;
    for (let c = 0; c < colLabels.length; c++) {
      const cell = await cellFn(r, c); cells[r].push(cell);
      if (cell) h = Math.max(h, Math.round(cell.img.height * (cellW / cell.img.width)));
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
      g.drawImage(cell.img, x, y, cellW, Math.round(cell.img.height * (cellW / cell.img.width)));
    }
    y += rowH[r] + GAP;
  }
  await writeFile(path, cv.toBuffer('image/jpeg', 92));
  console.log(`sheet ${path} ${W}x${H}`);
}

async function sheets() {
  const sizeLabels = SIZES.map((s) => s.id);
  for (const map of Object.keys(MAPS)) {
    await sheet(join(out, `field-${map}.jpg`), `About manifesto field, ${map} mapping: every size, light and dark (each shown at one third width, except 390 at one third of its 2x capture)`,
      SCHEMES, sizeLabels, 330, async (r, c) => {
        const img = await load(shot(map, 'field', SCHEMES[r], SIZES[c].id));
        return img && { img };
      });
    await sheet(join(out, `about-full-${map}.jpg`), `About, whole page, ${map} mapping`,
      SCHEMES, ['1440', '820', '390'], 440, async (r, c) => {
        const img = await load(shot(map, 'about', SCHEMES[r], ['1440', '820', '390'][c]));
        return img && { img };
      });
  }
  await sheet(join(out, 'mapping-compare.jpg'), 'Mapping A (black) against B (paper): the manifesto field, light',
    ['1440 black', '1440 paper', '390 black', '390 paper'], ['field'], 760, async (r) => {
      const [sz, map] = [['1440', 'black'], ['1440', 'paper'], ['390', 'black'], ['390', 'paper']][r];
      const img = await load(shot(map, 'field', 'light', sz));
      return img && { img };
    });
  await sheet(join(out, 'home-billboard.jpg'), 'Home first screen: before (frozen build) and after (red rectangle dropped)',
    SCHEMES.flatMap((s) => [`${s} before`, `${s} after`]), ['1440', '1024', '820', '390'], 360, async (r, c) => {
      const scheme = SCHEMES[Math.floor(r / 2)]; const which = r % 2 === 0 ? 'before' : 'after';
      const img = await load(shot('home', which, scheme, ['1440', '1024', '820', '390'][c]));
      return img && { img };
    });
}

if (!process.argv.includes('--sheets-only')) await capture();
await sheets();
