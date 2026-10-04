/**
 * Stage 5 Tier A proof a3: the chinoiserie scenic wall and the botanical birch on About.
 *
 * Injects scripts/themes/proofs/stage5-gm-chinoiserie/{proof.css, scene-defs.svg.html,
 * birch.svg.html, frame2.html} (drawn by build-scene.mjs) into a frozen build;
 * nothing under src/ changes. On About it wraps the intro and the founder's
 * letter in one painted wall, lays the story on a --field-raised card, swaps the
 * oval's birch for the redrawn one, hangs the oval off-centre beside a small
 * second frame, and captures, in light and dark:
 *   - About whole page at 1440, 1280, 1024, 820 and 390 (390 at 2x), and the
 *     page as built at 1440 and 390 (the before);
 *   - the hero (first viewport) at every size;
 *   - the plain wall (room hidden) at every size, so the crops are visible;
 *   - the oval and its neighbour at 2x, new and as built;
 * and measures: the contrast of every text pair on the page, that no text sits
 * on the painting (every text's nearest opaque background is a card), the cards
 * against the wall, that no visible word changed, how the wall crops at each
 * width, and the byte sizes.
 *
 * Output: scripts/themes/.out/stage5-proofs/gm-chinoiserie/
 *   shots/*.png, measures.json, renderer.txt, index.md, *.jpg sheets.
 *
 * Usage (BDL_GPU=1 required; exits 2 on a software renderer):
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name stage5-base --reuse --port 4460 -- \
 *     node scripts/themes/harness/stage5-gm-chinoiserie-proof.mjs
 *   --sheets-only   rebuild the sheets and index from existing shots and measures.json
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const PROOF = join(REPO, 'scripts', 'themes', 'proofs', 'stage5-gm-chinoiserie');
const out = join(REPO, 'scripts', 'themes', '.out', 'stage5-proofs', 'gm-chinoiserie');
const shots = join(out, 'shots');
await mkdir(shots, { recursive: true });
const base = (process.env.SNAP_BASE || '').replace(/\/$/, '');

const SIZES = [
  { id: '1440', w: 1440, h: 900, dpr: 1 },
  { id: '1280', w: 1280, h: 800, dpr: 1 },
  { id: '1024', w: 1024, h: 768, dpr: 1 },
  { id: '820', w: 820, h: 1180, dpr: 1 },
  { id: '390', w: 390, h: 844, dpr: 2, mobile: true },
];
const SCHEMES = ['light', 'dark'];
const shot = (what, scheme, size) => join(shots, `${what}__${scheme}__${size}.png`);
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

/* About with the proof injected. `inject` null leaves the page as built. */
async function openAbout(page, scheme, inject) {
  await page.goto(`${base}/t/grandmillennial/about/`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: comp });
  const words = await page.evaluate(() => document.querySelector('main')?.innerText.replace(/\s+/g, ' ').trim() ?? '');
  if (inject) {
    await page.addStyleTag({ content: inject.css });
    await page.evaluate(({ scene, birch, frame2 }) => {
      const host = document.createElement('div');
      host.innerHTML = scene;
      const defs = host.querySelector('.gm-scene-defs');
      const [wide, pa, pb] = [...host.querySelectorAll('.gm-scene-art')];
      document.body.prepend(defs);
      const intro = document.querySelector('.intro');
      const founder = document.querySelector('.founder');
      if (!intro || !founder) throw new Error('About markup not as expected');
      const mk = (cls) => { const d = document.createElement('div'); d.className = cls; d.setAttribute('aria-hidden', 'true'); return d; };
      const wall = document.createElement('div');
      wall.className = 'gm-scene';
      const partA = document.createElement('div'); partA.className = 'gm-scene-part';
      const partB = document.createElement('div'); partB.className = 'gm-scene-part';
      intro.before(wall);
      partA.append(pa, intro);
      partB.append(pb, founder);
      wall.append(mk('gm-scene-band'), wide, partA, mk('gm-scene-band mid'), partB, mk('gm-scene-band'));
      /* The redrawn birch goes in the oval; the second frame hangs beside it. */
      const oval = document.querySelector('.oval');
      oval.innerHTML = birch;
      const cid = [...oval.parentElement.attributes].find((a) => a.name.startsWith('data-astro-cid'));
      document.querySelector('.sitter').insertAdjacentHTML('beforeend', frame2);
      void cid;
    }, inject);
  }
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(700);
  const got = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, scheme: document.documentElement.dataset.scheme }));
  if (got.theme !== 'grandmillennial' || got.scheme !== scheme) console.warn(`WARN theme=${got.theme} scheme=${got.scheme} (wanted ${scheme})`);
  return words;
}

/* In-page contrast and "no text on the painting" audit. */
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
  const name = (e) => e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).filter((c) => !c.startsWith('astro')).join('.') : '');
  const ownText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
  const wall = document.querySelector('.gm-scene');
  const rows = [];
  const els = [...document.querySelectorAll('.intro *, .founder *, .intro, .founder')].filter((el) => ownText(el));
  for (const el of els) {
    const fg = parse(getComputedStyle(el).color);
    let bg = null, bgEl = null;
    for (let n = el; n; n = n.parentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c.a >= 0.99) { bg = c; bgEl = n; break; }
    }
    if (!bg) { bg = { r: 255, g: 255, b: 255, a: 1 }; bgEl = document.documentElement; }
    const cs = getComputedStyle(el);
    const card = bgEl.matches('.story, .gm-framed');
    rows.push({
      text: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 34),
      el: name(el), fg: hex(fg), bg: hex(bg), bgEl: name(bgEl),
      size: parseFloat(cs.fontSize), weight: Number(cs.fontWeight) || 400,
      onCard: card, onWall: !!wall && !card && (bgEl === wall || bgEl.classList.contains('gm-scene-part')),
      ratio: +ratio(fg, bg).toFixed(2),
    });
  }
  const px = (sel) => { const e = document.querySelector(sel); return e ? parse(getComputedStyle(e).backgroundColor) : null; };
  const story = px('.story'), letter = px('.gm-framed');
  const wallBg = wall ? parse(getComputedStyle(wall).backgroundColor) : null;
  return {
    rows,
    cardStory: story && hex(story), cardLetter: letter && hex(letter), wallGround: wallBg && hex(wallBg),
    ratioStoryVsWallGround: story && wallBg ? +ratio(story, wallBg).toFixed(2) : null,
    ratioLetterVsWallGround: letter && wallBg ? +ratio(letter, wallBg).toFixed(2) : null,
  };
};

/* How a slice-cropped viewBox shows in its box: which part of the drawing is seen. */
const visibleRegion = (vb, box, par) => {
  const [vx, vy, vw, vh] = vb;
  const s = Math.max(box.w / vw, box.h / vh);
  const visW = box.w / s, visH = box.h / s;
  const ax = /xMin/.test(par) ? 0 : /xMax/.test(par) ? 1 : 0.5;
  const ay = /YMin/.test(par) ? 0 : /YMax/.test(par) ? 1 : 0.5;
  const x0 = vx + (vw - visW) * ax, y0 = vy + (vh - visH) * ay;
  return { scale: +s.toFixed(3), x: [Math.round(x0), Math.round(x0 + visW)], y: [Math.round(y0), Math.round(y0 + visH)], pctOfWidth: +(100 * visW / vw).toFixed(0), pctOfHeight: +(100 * visH / vh).toFixed(0) };
};

/* ---------- capture ---------- */
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
  const inject = {
    css: await readFile(join(PROOF, 'proof.css'), 'utf8'),
    scene: await readFile(join(PROOF, 'scene-defs.svg.html'), 'utf8'),
    birch: await readFile(join(PROOF, 'birch.svg.html'), 'utf8'),
    frame2: await readFile(join(PROOF, 'frame2.html'), 'utf8'),
  };
  const measures = { contrast: {}, geometry: {}, crops: {}, words: {} };

  /* The page as built (the before), light and dark, every size (full page, hero, the oval). */
  for (const scheme of SCHEMES) for (const sz of SIZES) {
    const { context, page } = await newPage(browser, scheme, sz);
    const words = await openAbout(page, scheme, null);
    measures.words[`${scheme}__${sz.id}__before`] = words;
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: shot('about-before', scheme, sz.id), fullPage: true });
    if (sz.id === '1440' || sz.id === '390') {
      await page.screenshot({ path: shot('hero-before', scheme, sz.id) });
      const box = await page.evaluate(() => { const r = document.querySelector('.sitter').getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }; });
      await page.screenshot({ path: shot('oval-before', scheme, sz.id), fullPage: true, clip: { x: Math.max(0, box.x - 30), y: box.y - 30, width: box.w + 60, height: box.h + 60 } });
    }
    await context.close();
  }

  for (const scheme of SCHEMES) for (const sz of SIZES) {
    const { context, page } = await newPage(browser, scheme, sz);
    const words = await openAbout(page, scheme, inject);
    measures.words[`${scheme}__${sz.id}__after`] = words;
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: shot('about', scheme, sz.id), fullPage: true });
    await page.screenshot({ path: shot('hero', scheme, sz.id) });
    const geo = await page.evaluate(() => {
      const q = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) }; };
      const art = [...document.querySelectorAll('.gm-scene-art')].map((e) => ({ cls: e.getAttribute('class'), shown: getComputedStyle(e).display !== 'none', par: e.getAttribute('preserveAspectRatio'), vb: e.getAttribute('viewBox').split(' ').map(Number), box: (() => { const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; })() }));
      return { wall: q('.gm-scene'), sitter: q('.sitter'), oval: q('.gilt-oval'), frame2: q('.gm-frame2'), story: q('.story'), letter: q('.gm-framed'), art, vw: innerWidth, docW: document.documentElement.scrollWidth };
    });
    measures.geometry[`${scheme}__${sz.id}`] = geo;
    if (scheme === 'light') {
      measures.crops[sz.id] = geo.art.filter((a) => a.shown).map((a) => ({ which: a.cls, box: a.box, ...visibleRegion(a.vb, a.box, a.par) }));
    }
    measures.contrast[`${scheme}__${sz.id}`] = await page.evaluate(AUDIT);
    /* The oval and its neighbour at 2x (1440 and 390). */
    if (sz.id === '1440' || sz.id === '390') {
      await page.screenshot({ path: shot('hero-vp', scheme, sz.id) });
      const box = await page.evaluate(() => {
        const a = document.querySelector('.sitter').getBoundingClientRect(), b = document.querySelector('.gm-frame2').getBoundingClientRect();
        const x0 = Math.min(a.left, b.left), x1 = Math.max(a.right, b.right), y0 = Math.min(a.top, b.top) + scrollY, y1 = Math.max(a.bottom, b.bottom) + scrollY;
        return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
      });
      await page.screenshot({ path: shot('oval', scheme, sz.id), fullPage: true, clip: { x: Math.max(0, box.x - 30), y: box.y - 30, width: Math.min(sz.w, box.w + 60), height: box.h + 60 } });
    }
    /* The plain wall: the room hidden, so every crop of the drawing is visible. */
    await page.addStyleTag({ content: '.gm-scene .intro,.gm-scene .founder{visibility:hidden}.gm-scene .founder{min-height:0}' });
    await page.screenshot({ path: shot('plain', scheme, sz.id), fullPage: true });
    await context.close();
  }
  await browser.close();
  await writeFile(join(out, 'measures.json'), JSON.stringify(measures, null, 2) + '\n');
  return measures;
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
  const half = (id, cw) => (id === '390' ? Math.min(cw, 195) : cw);
  await sheet(join(out, 'sheet-founder-1440.jpg'), 'About at 1440: as built, and with the chinoiserie wall and the botanical birch',
    ['light, as built', 'light, new', 'dark, as built', 'dark, new'], ['About, whole page'], 700, async (r) => {
      const img = await load(shot(r % 2 ? 'about' : 'about-before', SCHEMES[r >> 1], '1440'));
      return img && { img };
    });
  await sheet(join(out, 'sheet-hero.jpg'), 'The hero (first viewport) at every size, new',
    SCHEMES, ['1440', '1280', '1024', '820', '390 (2x, half)'], 340, async (r, c) => {
      const id = SIZES[c].id;
      const img = await load(shot('hero', SCHEMES[r], id));
      if (!img) return null;
      return { img, w: id === '390' ? 160 : 340 };
    });
  await sheet(join(out, 'sheet-sizes.jpg'), 'About, whole page, at 1280, 1024, 820 and 390 (390 is 2x, shown narrow)',
    SCHEMES, ['1280', '1024', '820', '390'], 400, async (r, c) => {
      const id = ['1280', '1024', '820', '390'][c];
      const img = await load(shot('about', SCHEMES[r], id));
      if (!img) return null;
      return { img, w: id === '390' ? 190 : 400 };
    });
  await sheet(join(out, 'sheet-wall-plain.jpg'), 'The wall alone (room hidden): how the one drawing crops at each width',
    SCHEMES, ['1440', '1024', '820', '390 (2x, half)'], 400, async (r, c) => {
      const id = ['1440', '1024', '820', '390'][c];
      const img = await load(shot('plain', SCHEMES[r], id));
      if (!img) return null;
      return { img, w: id === '390' ? 190 : 400 };
    });
  await sheet(join(out, 'sheet-oval.jpg'), 'The oval and its neighbour at 2x: as built, and redrawn (1440 crop, 390 crop)',
    ['light, as built', 'light, new', 'dark, as built', 'dark, new'], ['1440', '390'], 520, async (r, c) => {
      const id = c ? '390' : '1440';
      const img = await load(shot(r % 2 ? 'oval' : 'oval-before', SCHEMES[r >> 1], id));
      return img && { img, w: id === '390' ? 360 : 520 };
    });
  await sheet(join(out, 'sheet-before-after-390.jpg'), 'About at 390 (2x, half): as built and new',
    ['light as built', 'light new', 'dark as built', 'dark new'], ['whole page'], 250, async (r) => {
      const img = await load(shot(r % 2 ? 'about' : 'about-before', SCHEMES[r >> 1], '390'));
      return img && { img, w: 250 };
    });
}

/* ---------- index ---------- */
async function index(m) {
  const renderer = existsSync(join(out, 'renderer.txt')) ? (await readFile(join(out, 'renderer.txt'), 'utf8')).trim() : 'unknown';
  const stats = JSON.parse(await readFile(join(PROOF, 'scene-stats.json'), 'utf8'));
  const lines = [
    '# Stage 5 proof a3: chinoiserie wall and botanical birch, images',
    '',
    `Renderer: ${renderer}`,
    `Bytes: ${JSON.stringify(stats)}`,
    '',
    '## Sheets (founder)',
    '- sheet-founder-1440.jpg: About at 1440, as built and new, light and dark.',
    '- sheet-hero.jpg: the hero (first viewport) at every size, new.',
    '- sheet-sizes.jpg: About whole page at 1280, 1024, 820, 390.',
    '- sheet-wall-plain.jpg: the wall alone at 1440, 1024, 820, 390 (the crops).',
    '- sheet-oval.jpg: the oval and the second frame at 2x, as built and redrawn.',
    '- sheet-before-after-390.jpg: About at 390, as built and new.',
    '',
    '## Shots (shots/)',
    '- about__<scheme>__<size>.png: About whole page, new. about-before__...: as built.',
    '- hero__<scheme>__<size>.png: first viewport, new. hero-before__: as built (1440, 390).',
    '- plain__<scheme>__<size>.png: whole page with the room hidden (the wall alone).',
    '- oval__<scheme>__<1440|390>.png: the oval and second frame, 2x clip, new. oval-before__: as built.',
    '',
    'Measures: measures.json (contrast rows, geometry, crops, words).',
  ];
  await writeFile(join(out, 'index.md'), lines.join('\n') + '\n');
}

if (process.argv.includes('--sheets-only')) {
  await sheets();
  await index();
} else {
  const m = await capture();
  await sheets();
  await index(m);
  console.log('done');
}
