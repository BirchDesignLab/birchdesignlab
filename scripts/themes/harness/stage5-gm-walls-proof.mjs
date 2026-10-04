/**
 * Stage 5 Tier A proof a2: how loud the grandmillennial papered walls go.
 *
 * Injects scripts/themes/proofs/stage5-gm-walls/proof.css and wall-defs.svg.html
 * (drawn by build-wall.mjs) into a frozen build; nothing under src/ changes. On
 * Contact it wraps the .desk in a full-bleed chintz wall with a stripe band top
 * and bottom, and captures, for three loudnesses (100, 60 and 40 percent ink)
 * in light and dark:
 *   - Contact whole page at 1440, 1280, 1024, 820 and 390 (2x);
 *   - the viewports at the top and the foot of the wall (1440 and 390);
 *   - the plain wall, with the room hidden, 1440 wide, new and the old 200px
 *     #gm-chintz as the control, with the tile seams drawn on a copy;
 * and measures: the contrast of every text pair the wall touches, that no text
 * sits on pattern, the card against the wall, and the wall's repeat (the
 * autocorrelation of its luminance along each axis).
 *
 * Output: scripts/themes/.out/stage5-proofs/gm-walls/
 *   shots/*.png, crops/*.png, measures.json, renderer.txt, index.md, *.jpg sheets.
 *
 * Usage (BDL_GPU=1 required; exits 2 on a software renderer):
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name stage5-base --reuse --port 4460 -- \
 *     node scripts/themes/harness/stage5-gm-walls-proof.mjs
 *   --sheets-only   rebuild the sheets and index from existing shots and measures.json
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
const PROOF = join(REPO, 'scripts', 'themes', 'proofs', 'stage5-gm-walls');
const out = join(REPO, 'scripts', 'themes', '.out', 'stage5-proofs', 'gm-walls');
const shots = join(out, 'shots');
const crops = join(out, 'crops');
await mkdir(shots, { recursive: true });
await mkdir(crops, { recursive: true });
const base = (process.env.SNAP_BASE || '').replace(/\/$/, '');

const SIZES = [
  { id: '1440', w: 1440, h: 900, dpr: 1 },
  { id: '1280', w: 1280, h: 800, dpr: 1 },
  { id: '1024', w: 1024, h: 768, dpr: 1 },
  { id: '820', w: 820, h: 1180, dpr: 1 },
  { id: '390', w: 390, h: 844, dpr: 2, mobile: true },
];
const INKS = ['100', '60', '40'];
const SCHEMES = ['light', 'dark'];
const TILE = JSON.parse(await readFile(join(PROOF, 'wall-stats.json'), 'utf8')).tile;
const shot = (what, ink, scheme, size) => join(shots, `${what}__${ink}__${scheme}__${size}.png`);
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

/* Open Contact with the proof injected. `wall` false leaves the page as built. */
async function openContact(page, scheme, inject, ink) {
  await page.goto(`${base}/t/grandmillennial/contact/`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: comp });
  if (inject) {
    await page.addStyleTag({ content: inject.css });
    await page.evaluate(({ defs, ink }) => {
      const doc = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${defs}</svg>`, 'image/svg+xml');
      if (doc.querySelector('parsererror')) throw new Error('defs do not parse: ' + doc.querySelector('parsererror').textContent.slice(0, 200));
      const target = document.querySelector('.gm-defs defs');
      /* Defs.astro's styles are Astro-scoped: elements need the page's data-astro-cid attribute (Tier B markup inside Defs.astro gets it for free). */
      const cid = [...document.querySelector('#gm-rose').attributes].find((a) => a.name.startsWith('data-astro-cid'));
      for (const n of [...doc.documentElement.childNodes]) {
        const el = document.importNode(n, true);
        if (cid && el.nodeType === 1) { el.setAttribute(cid.name, cid.value); el.querySelectorAll('*').forEach((c) => c.setAttribute(cid.name, cid.value)); }
        target.appendChild(el);
      }
      document.documentElement.setAttribute('data-wall', ink);
      const desk = document.querySelector('.desk');
      const wall = document.createElement('div');
      wall.className = 'gm-wall';
      wall.innerHTML =
        '<div class="gm-wall-band" aria-hidden="true"></div>' +
        '<svg class="gm-wall-art" aria-hidden="true" focusable="false"><rect width="100%" height="100%" fill="url(#gm-chintz-wall)"/></svg>' +
        '<div class="gm-wall-room"></div>' +
        '<div class="gm-wall-band" aria-hidden="true"></div>';
      desk.before(wall);
      wall.querySelector('.gm-wall-room').appendChild(desk);
    }, { defs: inject.defs, ink });
  }
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(700);
  const got = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, scheme: document.documentElement.dataset.scheme }));
  if (got.theme !== 'grandmillennial' || got.scheme !== scheme) console.warn(`WARN theme=${got.theme} scheme=${got.scheme} (wanted ${scheme})`);
}

/* In-page contrast and "no text on pattern" audit. */
const AUDIT = () => {
  const parse = (c) => {
    let m = c.match(/^rgba?\(([^)]+)\)/);
    if (m) { const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
    m = c.match(/^color\(srgb ([^)]+)\)/);
    if (m) { const p = m[1].split(/[ /]+/).filter(Boolean).map(Number); return { r: p[0] * 255, g: p[1] * 255, b: p[2] * 255, a: p.length > 3 ? p[3] : 1 }; }
    return { r: 0, g: 0, b: 0, a: 0 };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const hex = (c) => '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  const rows = [];
  const wall = document.querySelector('.gm-wall');
  const seen = new Set();
  const ownText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
  const els = [...document.querySelectorAll('.intro *, .desk *, .intro, .desk')].filter((el) => ownText(el) || el.matches('input, textarea'));
  for (const el of els) {
    if (seen.has(el)) continue; seen.add(el);
    const fg = parse(getComputedStyle(el).color);
    let bgEl = el, bg = null;
    for (let n = el; n; n = n.parentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c.a >= 0.99) { bg = c; bgEl = n; break; }
    }
    if (!bg) { bg = { r: 255, g: 255, b: 255, a: 1 }; bgEl = document.documentElement; }
    const onWall = !!wall && wall.contains(el) && (bgEl === wall || wall.contains(bgEl) === false || bgEl.classList.contains('gm-wall-room') || bgEl.classList.contains('desk') || bgEl.classList.contains('gm-wall'));
    const name = (e) => e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).filter((c) => !c.startsWith('astro')).join('.') : '');
    const cs = getComputedStyle(el);
    rows.push({
      text: (el.matches('input, textarea') ? '[' + (el.name || el.tagName.toLowerCase()) + ' field text]' : el.textContent.trim().replace(/\s+/g, ' ').slice(0, 34)),
      el: name(el), fg: hex(fg), bg: hex(bg), bgEl: name(bgEl),
      size: parseFloat(cs.fontSize), weight: Number(cs.fontWeight) || 400,
      group: wall && wall.contains(el) ? 'wall' : 'intro',
      onWall, ratio: +ratio(fg, bg).toFixed(2),
    });
  }
  const card = parse(getComputedStyle(document.querySelector('.envelope, .gm-framed') || document.body).backgroundColor);
  return { rows, cardPaper: hex(card), cardL: lum(card) };
};

/* ---------- capture ---------- */
const BROWSER_ARGS = ['--hide-scrollbars', '--font-render-hinting=none', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'];
const OVERLAY = (fill) => `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><rect width="100%" height="100%" fill="url(#${fill})"/></svg>`;

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
  const inject = { css: await readFile(join(PROOF, 'proof.css'), 'utf8'), defs: await readFile(join(PROOF, 'wall-defs.svg.html'), 'utf8') };
  const measures = { contrast: {}, wall: {}, repeat: {}, geometry: {} };

  /* The page as built (the before), light and dark, 1440 and 390. */
  for (const scheme of SCHEMES) for (const sz of [SIZES[0], SIZES[4]]) {
    const { context, page } = await newPage(browser, scheme, sz);
    await openContact(page, scheme, null);
    await page.screenshot({ path: shot('contact-before', 'na', scheme, sz.id), fullPage: true });
    await context.close();
  }

  for (const scheme of SCHEMES) for (const ink of INKS) for (const sz of SIZES) {
    const { context, page } = await newPage(browser, scheme, sz);
    await openContact(page, scheme, inject, ink);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: shot('contact', ink, scheme, sz.id), fullPage: true });
    if (sz.id === '1440' || sz.id === '390') {
      const geo = await page.evaluate(() => {
        const r = document.querySelector('.gm-wall').getBoundingClientRect();
        return { top: r.top + scrollY, bottom: r.bottom + scrollY, height: r.height, width: r.width, left: r.left, vw: innerWidth, vh: innerHeight };
      });
      measures.geometry[`${scheme}__${ink}__${sz.id}`] = geo;
      await page.evaluate((y) => scrollTo(0, y), Math.max(0, geo.top - 70));
      await page.waitForTimeout(150);
      await page.screenshot({ path: shot('viewport-top', ink, scheme, sz.id) });
      await page.evaluate((y) => scrollTo(0, y), Math.max(0, geo.bottom - geo.vh + 70));
      await page.waitForTimeout(150);
      await page.screenshot({ path: shot('viewport-foot', ink, scheme, sz.id) });
      const a = await page.evaluate(AUDIT);
      measures.contrast[`${scheme}__${ink}__${sz.id}`] = a;
    }
    await context.close();
  }

  /* The plain wall at 1440 (room hidden), new at each loudness, and the old #gm-chintz as the control. */
  const tall = { id: 'plain', w: 1440, h: 1700, dpr: 1 };
  for (const scheme of SCHEMES) {
    for (const [ink, fill] of [['100', 'gm-chintz-wall'], ['60', 'gm-chintz-wall'], ['40', 'gm-chintz-wall'], ['old', 'gm-chintz']]) {
      const { context, page } = await newPage(browser, scheme, tall);
      await openContact(page, scheme, inject, ink === 'old' ? '60' : ink);
      await page.evaluate((svg) => {
        const o = document.createElement('div');
        o.id = 'proof-plain';
        o.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#888';
        o.innerHTML = svg;
        document.body.appendChild(o);
      }, OVERLAY(fill));
      await page.waitForTimeout(300);
      await page.screenshot({ path: shot('plain', ink, scheme, '1440') });
      await context.close();
    }
  }
  await browser.close();
  await writeFile(join(out, 'measures-capture.json'), JSON.stringify(measures, null, 2) + '\n');
  return measures;
}

/* ---------- analysis of the plain wall shots ---------- */
const lumaOf = (r, g, b) => {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
async function analysePlain(scheme, ink) {
  const img = await loadImage(shot('plain', ink, scheme, '1440'));
  const cv = createCanvas(img.width, img.height); const g = cv.getContext('2d');
  g.drawImage(img, 0, 0);
  const { data } = g.getImageData(0, 0, img.width, img.height);
  const N = img.width * img.height;
  /* relative luminance mean and standard deviation (linear), and 8-bit gray at half size for the lag scan. */
  let sum = 0, sum2 = 0;
  const gw = img.width >> 1, gh = img.height >> 1;
  const gray = new Float32Array(gw * gh);
  for (let i = 0; i < N; i++) { const L = lumaOf(data[4 * i], data[4 * i + 1], data[4 * i + 2]); sum += L; sum2 += L * L; }
  const meanL = sum / N, sdL = Math.sqrt(Math.max(0, sum2 / N - meanL * meanL));
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
    let s = 0;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) { const i = 4 * ((2 * y + dy) * img.width + 2 * x + dx); s += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]; }
    gray[y * gw + x] = s / 4;
  }
  let m = 0; for (const v of gray) m += v; m /= gray.length;
  for (let i = 0; i < gray.length; i++) gray[i] -= m;
  const corr = (dx, dy) => {
    let num = 0, a2 = 0, b2 = 0;
    for (let y = 0; y < gh - dy; y++) {
      const ro = y * gw, ro2 = (y + dy) * gw;
      for (let x = 0; x < gw - dx; x++) { const a = gray[ro + x], b = gray[ro2 + x + dx]; num += a * b; a2 += a * a; b2 += b * b; }
    }
    return num / Math.sqrt(a2 * b2 || 1);
  };
  const [TW, TH] = TILE;
  const lag = (dx, dy) => +corr(Math.round(dx / 2), Math.round(dy / 2)).toFixed(3);
  /* Peaks away from both 0 and the tile period (80 px clear of each) along each axis: a visible row or column of repeats is a high value here. */
  const scan = (axis, period) => {
    let best = { c: -1, at: 0 };
    for (let d = 80; d <= period - 80; d += 4) {
      const c = axis === 'x' ? corr(d >> 1, 0) : corr(0, d >> 1);
      if (c > best.c) best = { c: +c.toFixed(3), at: d };
    }
    return best;
  };
  /* Banding: SD of the row means (and of the column means) over the pixel SD. A row of similar motifs at one height raises the row figure; the x/y-only lag scan cannot see it. */
  const profile = (byRow) => {
    const n = byRow ? img.height : img.width, k = byRow ? img.width : img.height;
    const means = new Float64Array(n);
    for (let i = 0; i < n; i++) { let t = 0; for (let j = 0; j < k; j++) { const q = byRow ? i * img.width + j : j * img.width + i; t += lumaOf(data[4 * q], data[4 * q + 1], data[4 * q + 2]); } means[i] = t / k; }
    let mm = 0; for (const v of means) mm += v; mm /= n;
    let v2 = 0; for (const v of means) v2 += (v - mm) ** 2;
    return +(Math.sqrt(v2 / n) / (sdL || 1)).toFixed(3);
  };
  const rowBand = profile(true), colBand = profile(false);
  const isOld = ink === 'old';
  const [pw, ph] = isOld ? [200, 200] : [TW, TH];
  return {
    meanL: +meanL.toFixed(4), sdL: +sdL.toFixed(4),
    atTileX: lag(pw, 0), atTileY: lag(0, ph),
    atHalfDrop: lag(pw / 2, ph / 2),
    atHalfX: lag(pw / 2, 0), atHalfY: lag(0, ph / 2),
    peakAlongX: scan('x', pw), peakAlongY: scan('y', ph),
    rowBand, colBand,
    columnsAt1440: +(1440 / pw).toFixed(2),
    tile: [pw, ph],
  };
}

/* ---------- seams crop ---------- */
async function seamsCrop(scheme, ink) {
  const img = await loadImage(shot('plain', ink, scheme, '1440'));
  const h = 900;
  const cv = createCanvas(1440, h); const g = cv.getContext('2d');
  g.drawImage(img, 0, 0, 1440, h, 0, 0, 1440, h);
  await writeFile(join(crops, `wall-1440__${ink}__${scheme}.png`), cv.toBuffer('image/png'));
  const [pw, ph] = ink === 'old' ? [200, 200] : TILE;
  g.strokeStyle = 'rgba(255,40,40,0.8)'; g.lineWidth = 1; g.setLineDash([6, 6]);
  for (let x = pw; x < 1440; x += pw) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, h); g.stroke(); }
  for (let y = ph; y < h; y += ph) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(1440, y + 0.5); g.stroke(); }
  await writeFile(join(crops, `wall-1440-seams__${ink}__${scheme}.png`), cv.toBuffer('image/png'));
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
  const rows = SCHEMES.map((s) => s);
  const inkLabels = ['100% ink', '60% ink (recommended)', '40% ink'];
  for (const [sz, cw] of [['1440', 600], ['390', 340]]) {
    await sheet(join(out, `sheet-loudness-${sz}.jpg`), `Contact at ${sz}: the chintz wall at three loudnesses`,
      rows, inkLabels, cw, async (r, c) => {
        const img = await load(shot('contact', INKS[c], SCHEMES[r], sz));
        return img && { img };
      });
  }
  await sheet(join(out, 'sheet-fold-1440.jpg'), 'Contact at 1440, one viewport at the top band and one at the foot band, 60% ink',
    ['light, top', 'light, foot', 'dark, top', 'dark, foot'], ['1440 viewport'], 900, async (r) => {
      const img = await load(shot(r % 2 ? 'viewport-foot' : 'viewport-top', '60', SCHEMES[r >> 1], '1440'));
      return img && { img };
    });
  await sheet(join(out, 'sheet-recommended-sizes.jpg'), 'Contact with the 60% wall at 1280, 1024, 820 and 390 (390 is a 2x capture shown at half)',
    ['light', 'dark'], ['1280', '1024', '820', '390'], 400, async (r, c) => {
      const id = ['1280', '1024', '820', '390'][c];
      const img = await load(shot('contact', '60', SCHEMES[r], id));
      if (!img) return null;
      return { img, w: id === '390' ? Math.min(400, img.width / 2) : 400 };
    });
  await sheet(join(out, 'sheet-before-after.jpg'), 'Contact as built, and with the 60% wall (1440 and 390)',
    ['light before', 'light 60%', 'dark before', 'dark 60%'], ['1440', '390 (2x, half)'], 600, async (r, c) => {
      const sz = c ? '390' : '1440';
      const img = await load(r % 2 ? shot('contact', '60', SCHEMES[r >> 1], sz) : shot('contact-before', 'na', SCHEMES[r >> 1], sz));
      if (!img) return null;
      return { img, w: c ? Math.min(300, img.width / 2) : 600 };
    });
  await sheet(join(out, 'sheet-seams-1440.jpg'), 'The plain wall at 1440 (900 tall, 100%): the new repeat against the old 200px #gm-chintz (red dashes mark tile edges)',
    ['new, light', 'old, light', 'new, dark', 'old, dark'], ['seams marked', 'as seen'], 700, async (r, c) => {
      const ink = r % 2 ? 'old' : '60';
      const img = await load(join(crops, `${c ? 'wall-1440' : 'wall-1440-seams'}__${ink}__${SCHEMES[r >> 1]}.png`));
      return img && { img };
    });
  await sheet(join(out, 'sheet-loudness-walls.jpg'), 'The plain wall at 100, 60 and 40 percent ink (1440 crop, shown at half)',
    SCHEMES, inkLabels, 640, async (r, c) => {
      const img = await load(join(crops, `wall-1440__${INKS[c]}__${SCHEMES[r]}.png`));
      return img && { img };
    });
}

/* ---------- index ---------- */
async function index(m) {
  const renderer = existsSync(join(out, 'renderer.txt')) ? (await readFile(join(out, 'renderer.txt'), 'utf8')).trim() : 'unknown';
  const lines = [
    '# Stage 5 proof a2: grandmillennial chintz wall, images',
    '',
    `Renderer: ${renderer}`,
    `Wall pattern: ${JSON.stringify(JSON.parse(await readFile(join(PROOF, 'wall-stats.json'), 'utf8')))}`,
    '',
    '## Founder sheets (read these first)',
    '- sheet-loudness-1440.jpg, sheet-loudness-390.jpg: Contact at 100, 60 and 40 percent ink, light and dark',
    '- sheet-fold-1440.jpg: one 1440x900 viewport at the top band and at the foot band, 60 percent',
    '- sheet-recommended-sizes.jpg: the 60 percent wall at 1280, 1024, 820, 390',
    '- sheet-before-after.jpg: Contact as built beside the 60 percent wall, 1440 and 390',
    '- sheet-seams-1440.jpg: the plain wall at 1440, new repeat against the old 200px chintz, tile edges marked',
    '- sheet-loudness-walls.jpg: the plain wall alone at each loudness',
    '',
    '## Single images',
    '- shots/contact__<100|60|40>__<light|dark>__<size>.png: Contact whole page, size 1440, 1280, 1024, 820, 390 (2x)',
    '- shots/contact-before__na__<light|dark>__<1440|390>.png: Contact as built',
    '- shots/viewport-top__ and viewport-foot__<ink>__<scheme>__<1440|390>.png: one viewport at each band',
    '- shots/plain__<100|60|40|old>__<scheme>__1440.png: wall alone in a 1440x1700 viewport (the measure source)',
    '- crops/wall-1440__<ink>__<scheme>.png and wall-1440-seams__...: 1440x900 crop at 100%, with and without tile edges marked',
    '',
    '`measures.json` holds the contrast audit, the card-against-wall numbers and the repeat measures.',
    '',
  ];
  await writeFile(join(out, 'index.md'), lines.join('\n'));
}

/* ---------- main ---------- */
let measures;
const mpath = join(out, 'measures.json');
if (process.argv.includes('--sheets-only')) {
  measures = JSON.parse(await readFile(mpath, 'utf8'));
} else {
  measures = await capture();
  measures.wall = {}; measures.repeat = {};
  for (const scheme of SCHEMES) for (const ink of ['100', '60', '40', 'old']) {
    const a = await analysePlain(scheme, ink);
    measures.wall[`${scheme}__${ink}`] = a;
    await seamsCrop(scheme, ink);
    console.log(scheme, ink, JSON.stringify(a));
  }
  /* Gate: the new wall must band less than the old 200px tile along rows, in both schemes at every loudness. */
  for (const scheme of SCHEMES) for (const ink of ['100', '60', '40']) {
    const n = measures.wall[`${scheme}__${ink}`], o = measures.wall[`${scheme}__old`];
    if (!(n.rowBand < o.rowBand * 0.85)) { console.error(`FAIL row banding ${scheme} ${ink}: new ${n.rowBand} vs old ${o.rowBand}`); process.exitCode = 1; }
  }
  await writeFile(mpath, JSON.stringify(measures, null, 2) + '\n');
}
await sheets();
await index(measures);
