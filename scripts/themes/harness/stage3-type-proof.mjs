/**
 * Glassmorphism D8 heading-face proof: Plus Jakarta Sans (today) vs Inter
 * Display via Inter's `opsz` axis, shown side by side, dark and light.
 *
 * Written 09-25-26 for Tier 3 stage 3 (Tier A proofs), glassmorphism.md D8;
 * revised 09-25-26 in the Tier A fix round after an Opus critic pass:
 * comparison sheets rebuilt as PNG with 20px+ labels (were low-quality
 * JPEGs), the specimen re-shot on an isolated blank field in both schemes
 * instead of over the live page, and the Inter Display weight bumped from
 * 700 to 740 (700 read light against Jakarta 760 at card sizes; 740 was
 * the closest visual match found by eye in the 720-760 range the critic
 * suggested trying).
 *
 * The founder asked to see both faces at Tier A before committing to
 * either. Serves the frozen Stage 3 base build (snap.mjs), so no edits
 * under src/ are needed: this script overrides --font-head on the live
 * page with a page.addStyleTag/evaluate pass and, for Inter Display,
 * injects an @font-face for 'Inter Display Proof' from Inter's opsz-axis
 * woff2 as a data URI (the file @fontsource-variable/inter ships that the
 * site does not load today: files/inter-latin-opsz-normal.woff2, 72.9 KB).
 *
 * Settings used (stated here, not just in the notes file, so the numbers
 * travel with the code):
 *   Plus Jakarta Sans (today, unchanged): font-weight 760, letter-spacing
 *     -0.03em, word-spacing 0.05em (theme.css's existing h1/h2/h3 rule).
 *   Inter Display: font-weight 740 (was 700 in the first pass; see above),
 *     letter-spacing -0.022em, word-spacing 0 (Inter does not need
 *     Jakarta's word-space give-back), opsz pinned near display size via
 *     font-variation-settings: 'opsz' 32 (explicit, not
 *     font-optical-sizing: auto, so the proof shows the same opsz at
 *     every heading size rather than one that drifts with font-size).
 * The gradient "Design Lab" billboard span keeps its current colour;
 * vibrancy (D4) is Tier B's change, not this proof's.
 *
 * Usage (serve the frozen Stage 3 base build first):
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name stage3-base --reuse --port 4462 -- \
 *     node scripts/themes/harness/stage3-type-proof.mjs --label stage3-proofs/type
 *
 * Output: scripts/themes/.out/<label>/*.png (raw shots), sheet-home.png,
 * sheet-services.png, sheet-about.png (side-by-side, labelled with face,
 * weight, tracking and scheme, 20px+ label text), and specimen.png (a
 * varied-letter line at three sizes, both faces, both schemes, on an
 * isolated blank field). All PNG: the earlier JPEG sheets posterised at
 * small file sizes and the brief calls for PNG or JPEG q90+.
 */
import { chromium } from 'playwright';
import { mkdir, readFile } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const base = (arg('base', process.env.SNAP_BASE || 'http://127.0.0.1:4462')).replace(/\/$/, '');
const label = arg('label', 'stage3-proofs/type');
const outDir = join(REPO, 'scripts', 'themes', '.out', label);
await mkdir(outDir, { recursive: true });

const INTER_OPSZ_PATH = join(REPO, 'node_modules', '@fontsource-variable', 'inter', 'files', 'inter-latin-opsz-normal.woff2');
const interOpszB64 = (await readFile(INTER_OPSZ_PATH)).toString('base64');
console.log(`Inter opsz file: ${INTER_OPSZ_PATH} (${(interOpszB64.length * 0.75 / 1024).toFixed(1)} KB decoded)`);

const FACES = {
  jakarta: { label: 'Plus Jakarta Sans (today)', css: null }, // no override: the theme's own rule
  inter: {
    label: 'Inter Display',
    css: `
      @font-face {
        font-family: 'Inter Display Proof';
        font-style: normal;
        font-weight: 100 900;
        font-display: block;
        src: url(data:font/woff2;base64,${interOpszB64}) format('woff2-variations');
      }
      :where([data-theme='glassmorphism']) :is(h1, h2, h3) {
        font-family: 'Inter Display Proof', var(--font-head);
        font-weight: 740;
        font-variation-settings: 'opsz' 32;
        font-optical-sizing: none;
        letter-spacing: -0.022em;
        word-spacing: 0;
      }
    `,
  },
};

// Label text for sheet/legend and specimen: face, weight and tracking
// travel with every image so a viewer never has to cross-reference the
// notes file. Two lines (name, then detail) so a narrow column never has
// to fit both on one line without wrapping.
const FACE_NAME = { jakarta: 'Plus Jakarta Sans', inter: 'Inter Display' };
const FACE_DETAIL = {
  jakarta: 'wght 760 · tracking -0.03em',
  inter: 'wght 740 · tracking -0.022em',
};
function fullLabel(faceKey, scheme, extra) {
  const bits = [FACE_DETAIL[faceKey], `${scheme} scheme`];
  if (extra) bits.push(extra);
  return `${FACE_NAME[faceKey]}\n${bits.join(' · ')}`;
}

const VIEWPORTS = {
  desktop: { width: 1440, height: 900, scale: 1, mobile: false },
  mobile: { width: 390, height: 844, scale: 2, mobile: true },
};

const useGpu = process.env.BDL_GPU === '1';
const browser = await chromium.launch({
  args: ['--hide-scrollbars', '--font-render-hinting=none', '--disable-lcd-text',
    ...(useGpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : [])],
});

async function openPage(context, path) {
  const page = await context.newPage();
  await page.goto(`${base}/t/glassmorphism/${path}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: 'bdl-switcher { display: none !important; }' });
  return page;
}

async function shot(context, path, applyFace, cb) {
  const page = await openPage(context, path);
  if (applyFace) await page.addStyleTag({ content: applyFace });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  await cb(page);
  await page.close();
}

const shots = {}; // key -> {file, label}
function record(key, file, lbl) { shots[key] = { file, label: lbl }; }

for (const scheme of ['light', 'dark']) {
  for (const [faceKey, face] of Object.entries(FACES)) {
    const context = await browser.newContext({
      viewport: { width: VIEWPORTS.desktop.width, height: VIEWPORTS.desktop.height },
      deviceScaleFactor: 1, colorScheme: scheme, reducedMotion: 'reduce',
    });
    await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); localStorage.setItem('theme', s); } catch {} }, scheme);
    await suppressPrompt(context);
    await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());

    // --- Home hero, desktop, first 900px ---
    await shot(context, '', face.css, async (page) => {
      const file = `home__${faceKey}__${scheme}__desktop.png`;
      await page.screenshot({ path: join(outDir, file), clip: { x: 0, y: 0, width: 1440, height: 900 } });
      record(`home__${scheme}__desktop__${faceKey}`, file, fullLabel(faceKey, scheme, 'desktop'));
    });

    // --- Services head card, desktop ---
    await shot(context, 'services/', face.css, async (page) => {
      const file = `services-head__${faceKey}__${scheme}.png`;
      await page.locator('.head-card').first().screenshot({ path: join(outDir, file) });
      record(`services__${scheme}__${faceKey}`, file, fullLabel(faceKey, scheme));
    });

    // --- About title card, desktop ---
    await shot(context, 'about/', face.css, async (page) => {
      const file = `about-title__${faceKey}__${scheme}.png`;
      await page.locator('.title-card').first().screenshot({ path: join(outDir, file) });
      record(`about__${scheme}__${faceKey}`, file, fullLabel(faceKey, scheme));
    });

    await context.close();

    // --- Home hero, phone, first screen ---
    const mctx = await browser.newContext({
      viewport: { width: VIEWPORTS.mobile.width, height: VIEWPORTS.mobile.height },
      deviceScaleFactor: VIEWPORTS.mobile.scale, isMobile: true, hasTouch: true,
      colorScheme: scheme, reducedMotion: 'reduce',
    });
    await mctx.addInitScript((s) => { try { localStorage.setItem('scheme', s); localStorage.setItem('theme', s); } catch {} }, scheme);
    await suppressPrompt(mctx);
    await mctx.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
    await shot(mctx, '', face.css, async (page) => {
      const file = `home__${faceKey}__${scheme}__mobile.png`;
      await page.screenshot({ path: join(outDir, file) });
      record(`home__${scheme}__mobile__${faceKey}`, file, fullLabel(faceKey, scheme, 'phone'));
    });
    await mctx.close();
  }
}

// --- Specimen: a varied-letter line at three sizes, both faces, both
// schemes, on a clean isolated field (no live-page chrome underneath).
// --well is translucent by design (it frosts glass panels), which is why
// the first pass let header chrome show through; --field-raised is the
// theme's actual opaque panel colour, so that is the plain field here.
{
  const SPECIMEN_TEXT = 'Birch Design Lab, agency 2026';
  const sizes = [96, 56, 28];
  const specimenShots = []; // {faceKey, scheme, file}
  for (const scheme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width: 1600, height: 1400 }, colorScheme: scheme, reducedMotion: 'reduce' });
    await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); localStorage.setItem('theme', s); } catch {} }, scheme);
    await suppressPrompt(context);
    await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
    for (const [faceKey, face] of Object.entries(FACES)) {
      // Fresh page per face so one face's override CSS never bleeds into the next.
      const page = await openPage(context, '');
      if (face.css) await page.addStyleTag({ content: face.css });
      // Hide every real page element and cover the viewport with an opaque
      // rig of our own, so nothing from the live page shows through.
      await page.addStyleTag({ content: 'body > :not(#specimen-rig) { display: none !important; }' });
      await page.evaluate(({ sizes, text }) => {
        const rig = document.createElement('div');
        rig.id = 'specimen-rig';
        rig.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:var(--field-raised,#fff);' +
          'padding:48px;display:flex;flex-direction:column;justify-content:center;gap:40px;';
        for (const size of sizes) {
          const h = document.createElement('h2');
          h.textContent = text;
          h.style.fontSize = size + 'px';
          h.style.lineHeight = '1.15';
          h.style.color = 'var(--mark)';
          h.style.margin = '0';
          h.dataset.size = String(size);
          rig.appendChild(h);
        }
        document.body.appendChild(rig);
      }, { sizes, text: SPECIMEN_TEXT });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(100);
      const file = `specimen__${faceKey}__${scheme}.png`;
      await page.locator('#specimen-rig').screenshot({ path: join(outDir, file) });
      specimenShots.push({ faceKey, scheme, file });
      await page.close();
    }
    await context.close();
  }

  const imgs = await Promise.all(specimenShots.map(async (s) => ({ ...s, img: await loadImage(join(outDir, s.file)) })));
  const pad = 20, labelH = 24, cap = labelH * 2 + 12;
  const W = Math.max(...imgs.map((s) => s.img.width)) + pad * 2;
  const H = imgs.reduce((h, s) => h + s.img.height + cap + pad, pad);
  const cv = createCanvas(W, H);
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#1c1c1f'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.fillStyle = '#e8e8e8';
  let y = pad;
  for (const s of imgs) {
    const [name, detail] = fullLabel(s.faceKey, s.scheme).split('\n');
    ctx.font = `bold ${labelH - 4}px sans-serif`;
    ctx.fillText(name, pad, y + labelH - 6);
    ctx.font = `${labelH - 4}px sans-serif`;
    ctx.fillText(detail, pad, y + labelH * 2 - 8);
    ctx.drawImage(s.img, pad, y + cap);
    y += s.img.height + cap + pad;
  }
  writeFileSync(join(outDir, 'specimen.png'), cv.toBuffer('image/png'));
  console.log('specimen ->', join(outDir, 'specimen.png'));
}

await browser.close();

// --- Side-by-side sheets: Plus Jakarta Sans | Inter Display, per page/scheme ---
function sheetFor(prefix, keyFn, pages) {
  return (async () => {
    const rows = [];
    for (const scheme of ['light', 'dark']) {
      for (const vp of pages) {
        const a = shots[keyFn(scheme, vp, 'jakarta')];
        const b = shots[keyFn(scheme, vp, 'inter')];
        if (a && b) rows.push({ scheme, vp, a, b });
      }
    }
    if (rows.length === 0) return;
    const loaded = await Promise.all(rows.map(async (r) => ({
      ...r, a: { ...r.a, img: await loadImage(join(outDir, r.a.file)) }, b: { ...r.b, img: await loadImage(join(outDir, r.b.file)) },
    })));
    // Labels need to be readable (20px+) and every row's two columns need
    // the same crop/scale/position so a side-by-side comparison is fair —
    // one shared scale per row (not per column) keyed off the taller of
    // the pair, drawn at the same x/y offset in both columns. Labels are
    // two lines (face name, then weight/tracking/scheme detail); the
    // column has to be at least as wide as the label text or the two
    // columns' labels run into each other (happened with narrow cards).
    const pad = 20, rowLabelH = 24, faceLineH = 24, gapAfterLabels = 10;
    const cap = rowLabelH + faceLineH * 2 + gapAfterLabels;
    const cellScale = (vp) => (vp === 'mobile' ? 0.5 : 0.55);
    const measureCanvas = createCanvas(10, 10);
    const measureCtx = measureCanvas.getContext('2d');
    function labelWidth(label) {
      measureCtx.font = `${faceLineH - 4}px sans-serif`;
      return Math.max(...label.split('\n').map((line) => measureCtx.measureText(line).width));
    }
    const rowHeights = loaded.map((r) => Math.max(r.a.img.height, r.b.img.height) * cellScale(r.vp) + cap);
    const colWidth = Math.max(
      ...loaded.map((r) => Math.max(r.a.img.width, r.b.img.width) * cellScale(r.vp))),
      labelColWidth = Math.max(...loaded.flatMap((r) => [labelWidth(r.a.label), labelWidth(r.b.label)])),
      finalColWidth = Math.max(colWidth, labelColWidth);
    const W = finalColWidth * 2 + pad * 3;
    const H = rowHeights.reduce((a, b) => a + b, 0) + pad * (loaded.length + 1);
    const cv = createCanvas(Math.ceil(W), Math.ceil(H));
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#1c1c1f'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = '#e8e8e8';
    function drawLabel(label, x, yTop) {
      const [name, detail] = label.split('\n');
      ctx.font = `bold ${faceLineH - 4}px sans-serif`;
      ctx.fillText(name, x, yTop + faceLineH - 6);
      ctx.font = `${faceLineH - 4}px sans-serif`;
      ctx.fillText(detail, x, yTop + faceLineH * 2 - 8);
    }
    let y = pad;
    for (const r of loaded) {
      const k = cellScale(r.vp);
      const rowLabel = `${r.scheme} · ${r.vp}`;
      ctx.font = `bold ${rowLabelH - 4}px sans-serif`;
      ctx.fillText(rowLabel, pad, y + rowLabelH - 4);
      drawLabel(r.a.label, pad, y + rowLabelH);
      ctx.drawImage(r.a.img, pad, y + cap, r.a.img.width * k, r.a.img.height * k);
      const x2 = pad * 2 + finalColWidth;
      drawLabel(r.b.label, x2, y + rowLabelH);
      ctx.drawImage(r.b.img, x2, y + cap, r.b.img.width * k, r.b.img.height * k);
      y += rowHeights[loaded.indexOf(r)];
    }
    writeFileSync(join(outDir, `sheet-${prefix}.png`), cv.toBuffer('image/png'));
    console.log(`sheet-${prefix} ->`, join(outDir, `sheet-${prefix}.png`));
  })();
}

await sheetFor('home', (scheme, vp, face) => `home__${scheme}__${vp}__${face}`, ['desktop', 'mobile']);
await sheetFor('services', (scheme, _vp, face) => `services__${scheme}__${face}`, ['card']);
await sheetFor('about', (scheme, _vp, face) => `about__${scheme}__${face}`, ['card']);

console.log(`${Object.keys(shots).length} raw shots -> ${outDir}`);
