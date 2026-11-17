/**
 * Stage 5 Tier A proof a4: cottagecore, three hands and three Fraunces wetnesses.
 *
 * Injects scripts/themes/proofs/stage5-cc-hands/proof.css into a frozen build
 * (nothing under src/ changes) and captures, before and after, in light and dark:
 *   - Home, Services, Contact and About whole page at 1440, 820 and 390 (2x phone);
 *   - 2x crops side by side: a kicker, a margin note, a label, a form label;
 *   - 2x crops of the wetness roles: billboard, h2 sheet title, h3 card title;
 *   - the italic pull quotes in SuperSoft and in Sharp beside the billboard;
 * and measures, from the live computed colours, the contrast of every new ink
 * against --paper, --note and --field (and the lamp glow over --field in dark),
 * plus what each role actually computes to (weight, ink, tilt, SOFT/WONK).
 *
 * Output: scripts/themes/.out/stage5-proofs/cc-hands/
 *   shots/*.png, crops/*.png, measures.json, contrast-entries.txt, renderer.txt,
 *   index.md, sheet-*.jpg
 *
 * Usage (BDL_GPU=1 required; exits 2 on a software renderer):
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name stage5-base --reuse --port 4460 -- \
 *     node scripts/themes/harness/stage5-cc-hands-proof.mjs
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
const PROOF = join(REPO, 'scripts', 'themes', 'proofs', 'stage5-cc-hands');
const out = join(REPO, 'scripts', 'themes', '.out', 'stage5-proofs', 'cc-hands');
const shots = join(out, 'shots');
const crops = join(out, 'crops');
await mkdir(shots, { recursive: true });
await mkdir(crops, { recursive: true });
const base = (process.env.SNAP_BASE || '').replace(/\/$/, '');

const SIZES = [
  { id: '1440', w: 1440, h: 900, dpr: 1 },
  { id: '820', w: 820, h: 1180, dpr: 1 },
  { id: '390', w: 390, h: 844, dpr: 2, mobile: true },
];
const PAGES = [['home', ''], ['services', 'services/'], ['contact', 'contact/'], ['about', 'about/']];
const SCHEMES = ['light', 'dark'];
const STATES = ['before', 'after'];
const comp = 'bdl-switcher{display:none!important} *{scroll-behavior:auto!important} .cc-motes{display:none!important}';
const shotPath = (page, state, scheme, size) => join(shots, `${page}__${state}__${scheme}__${size}.png`);
const cropPath = (name, state, scheme) => join(crops, `${name}__${state}__${scheme}.png`);

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

async function open(page, scheme, path, css, pull) {
  await page.goto(`${base}/t/cottagecore/${path}`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: comp });
  if (css) await page.addStyleTag({ content: css });
  if (pull) await page.evaluate((p) => document.documentElement.setAttribute('data-pull', p), pull);
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(500);
  const got = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, scheme: document.documentElement.dataset.scheme }));
  if (got.theme !== 'cottagecore' || got.scheme !== scheme) console.warn(`WARN theme=${got.theme} scheme=${got.scheme} (wanted ${scheme})`);
}

/* Crop one element (with padding) at the page's scale from a full-page frame. */
async function cropEl(page, selector, path, pad = 22, nth = 0) {
  const loc = page.locator(selector).nth(nth);
  await loc.scrollIntoViewIfNeeded();
  await page.waitForTimeout(80);
  const box = await loc.evaluate((el) => {
    const r = el.getBoundingClientRect();
    /* tight to the text for block elements that run the full column */
    const rg = document.createRange(); rg.selectNodeContents(el);
    const t = rg.getBoundingClientRect();
    const w = t.width > 0 && t.width < r.width ? t.width : r.width;
    const x = t.width > 0 && t.width < r.width ? t.left : r.left;
    return { x: x + scrollX, y: r.top + scrollY, w, h: r.height };
  });
  const vw = await page.evaluate(() => document.documentElement.scrollWidth);
  const x = Math.max(0, box.x - pad), y = Math.max(0, box.y - pad);
  const w = Math.min(vw - x, box.w + 2 * pad), h = box.h + 2 * pad;
  await page.screenshot({ path, fullPage: true, clip: { x, y, width: w, height: h } });
}

/* What a role computes to, so the write-up's numbers are the page's. */
const COMPUTE = (selectors) => {
  const rows = {};
  for (const [name, sel] of Object.entries(selectors)) {
    const el = document.querySelector(sel);
    if (!el) { rows[name] = null; continue; }
    const cs = getComputedStyle(el);
    rows[name] = { sel, text: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 30), family: cs.fontFamily.split(',')[0].replace(/['"]/g, ''), weight: cs.fontWeight, size: cs.fontSize, color: cs.color, rotate: cs.rotate, fvs: cs.fontVariationSettings };
  }
  return rows;
};

/* Resolve a token to an rgb triple through a probe element. */
const TOKENS = (names) => {
  const probe = document.createElement('i');
  probe.style.cssText = 'position:absolute;visibility:hidden';
  document.body.appendChild(probe);
  const out = {};
  for (const n of names) {
    probe.style.color = ''; probe.style.color = `var(${n})`;
    const c = getComputedStyle(probe).color;
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (m) { const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); out[n] = { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
    else out[n] = null;
  }
  probe.remove();
  return out;
};

const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = ({ r, g, b }) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
const hex = (c) => '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

const BROWSER_ARGS = ['--hide-scrollbars', '--font-render-hinting=none', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'];
const INK_TOKENS = ['--hand-kicker-ink', '--hand-note-ink', '--hand-label-ink'];
const SURFACES = ['--paper', '--note', '--field'];
const ROLES = {
  homeLead: '.hero .lead', homeKicker: '.doors .kicker', labKicker: '.lab .cc-hand', homeMore: '.doors .more', labMore: '.lab .cc-note-link',
  footerLoc: '.f-loc', cardNo: '.card .no', billboard: '.billboard .b1', billboardB2: '.billboard .b2', cardH3: '.card h3', closerLead: '.closer-lead', pull: '.pull', wmName: '.wm-name',
  /* the roles the scoped page rules fought over (fix round 1) */
  servicesKicker: '.kicker', servicesNum: '.num', contactKicker: '.kicker', contactLabel: '.field label',
  aboutLetterH2: '.letter h2',
};
/* Roles read per page, so each page's own kicker size is in the table. */
const PAGE_ROLES = {
  home: ['homeLead', 'homeKicker', 'labKicker', 'homeMore', 'labMore', 'footerLoc', 'cardNo', 'billboard', 'billboardB2', 'cardH3', 'closerLead', 'pull', 'wmName'],
  services: ['servicesKicker', 'servicesNum', 'footerLoc'],
  contact: ['contactKicker', 'contactLabel', 'footerLoc'],
  about: ['aboutLetterH2', 'footerLoc'],
};
const pickRoles = (name) => Object.fromEntries(PAGE_ROLES[name].map((k) => [k, ROLES[k]]));

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
  const css = await readFile(join(PROOF, 'proof.css'), 'utf8');
  const measures = { contrast: {}, computed: {}, fails: [] };

  /* whole pages, before and after */
  for (const scheme of SCHEMES) for (const sz of SIZES) for (const [name, path] of PAGES) for (const state of STATES) {
    const { context, page } = await newPage(browser, scheme, sz);
    await open(page, scheme, path, state === 'after' ? css : null, state === 'after' ? 'sharp' : null);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: shotPath(name, state, scheme, sz.id), fullPage: true });
    measures.computed[`${scheme}__${sz.id}__${name}__${state}`] = await page.evaluate(COMPUTE, pickRoles(name));
    if (sz.id === '1440' && name === 'home') {
      if (state === 'after') {
        const toks = await page.evaluate(TOKENS, [...INK_TOKENS, ...SURFACES, '--glow', '--accent', '--link', '--mark-muted']);
        const surf = { '--paper': toks['--paper'], '--note': toks['--note'], '--field': toks['--field'] };
        if (scheme === 'dark') surf['--glow over --field'] = over(toks['--glow'], toks['--field']);
        const rows = [];
        for (const ink of INK_TOKENS) for (const [sName, sc] of Object.entries(surf)) {
          const r = +ratio(toks[ink], sc).toFixed(2);
          rows.push({ ink, inkHex: hex(toks[ink]), surface: sName, surfaceHex: hex(sc), ratio: r });
          if (r < 4.5) measures.fails.push(`${scheme} ${ink} on ${sName}: ${r}`);
        }
        measures.contrast[scheme] = rows;
      }
    }
    await context.close();
  }

  /* 2x crops: the hands side by side, and the wetness roles */
  const big = { id: '1440x2', w: 1440, h: 900, dpr: 2 };
  for (const scheme of SCHEMES) for (const state of STATES) {
    const { context, page } = await newPage(browser, scheme, big);
    const apply = state === 'after' ? css : null;
    await open(page, scheme, '', apply, apply && 'sharp');
    await cropEl(page, '.hero .lead', cropPath('hand-lead', state, scheme));
    await cropEl(page, '.doors .kicker', cropPath('hand-kicker', state, scheme));
    await cropEl(page, '.doors .more', cropPath('hand-note', state, scheme));
    await cropEl(page, '.card .no', cropPath('hand-numeral', state, scheme), 34);
    await cropEl(page, '.lab .cc-hand', cropPath('hand-lab', state, scheme));
    await cropEl(page, '.f-loc', cropPath('hand-footer', state, scheme));
    await cropEl(page, '.billboard', cropPath('wet-billboard', state, scheme), 30);
    await cropEl(page, '.card h3', cropPath('wet-h3', state, scheme), 20);
    await open(page, scheme, 'contact/', apply, apply && 'sharp');
    await cropEl(page, '.field label', cropPath('hand-label', state, scheme), 22, 0);
    await cropEl(page, '.field', cropPath('hand-field', state, scheme), 14, 2);
    await cropEl(page, '.kicker', cropPath('hand-contact-kicker', state, scheme), 22);
    await open(page, scheme, 'about/', apply, apply && 'sharp');
    await cropEl(page, '.letter h2', cropPath('hand-letter', state, scheme), 22);
    await open(page, scheme, 'services/', apply, apply && 'sharp');
    await cropEl(page, '.recipe h2', cropPath('wet-h2', state, scheme), 20);
    await cropEl(page, '.num', cropPath('hand-num', state, scheme), 20);
    await context.close();
  }
  /* the mobile nav in the note voice, 390 at 2x */
  for (const scheme of SCHEMES) for (const state of STATES) {
    const { context, page } = await newPage(browser, scheme, SIZES[2]);
    await open(page, scheme, '', state === 'after' ? css : null, state === 'after' ? 'sharp' : null);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: cropPath('nav-390', state, scheme), clip: { x: 0, y: 0, width: 390, height: 190 } });
    await context.close();
  }

  /* the italic pull quotes, both treatments */
  for (const scheme of SCHEMES) for (const pull of ['supersoft', 'sharp']) {
    const { context, page } = await newPage(browser, scheme, big);
    await open(page, scheme, '', css, pull);
    await cropEl(page, '.billboard', cropPath(`pull-billboard-${pull}`, 'after', scheme), 30);
    await cropEl(page, '.lab .pull', cropPath(`pull-lab-${pull}`, 'after', scheme), 18);
    await cropEl(page, '.closer-lead', cropPath(`pull-closer-${pull}`, 'after', scheme), 18);
    await open(page, scheme, 'services/', css, pull);
    await cropEl(page, '.pull', cropPath(`pull-services-${pull}`, 'after', scheme), 18);
    await open(page, scheme, 'about/', css, pull);
    await cropEl(page, '.manifesto', cropPath(`pull-manifesto-${pull}`, 'after', scheme), 18);
    await context.close();
  }
  await browser.close();
  await writeFile(join(out, 'measures.json'), JSON.stringify(measures, null, 2) + '\n');
  return measures;
}

/* ---------- contrast entries, ready to paste into meta.contrast ---------- */
async function entries(m) {
  const lines = [
    '// Paste into src/themes/cottagecore/meta.ts contrast (Tier B). Tokens --hand-kicker-ink,',
    '// --hand-note-ink and --hand-label-ink are defined in proofs/stage5-cc-hands/proof.css.',
    '// Kicker ink is --accent and label ink is --link: their entries already exist for --paper,',
    '// --note and the glow; these repeat them under the new names so the roles stay checked if',
    '// either token is later retuned on its own.',
  ];
  const kind = { '--hand-kicker-ink': 'kickers', '--hand-note-ink': 'margin notes and the mobile nav', '--hand-label-ink': 'form labels and numerals' };
  for (const ink of INK_TOKENS) {
    lines.push(`    { fg: '${ink}', bg: ['--paper'], min: 4.5, note: '${kind[ink]} on a card' },`);
    lines.push(`    { fg: '${ink}', bg: ['--note'], min: 4.5, note: '${kind[ink]} on a butter note' },`);
    lines.push(`    { fg: '${ink}', bg: ['--glow', '--field'], min: 4.5, note: '${kind[ink]} on the table' },`);
  }
  await writeFile(join(out, 'contrast-entries.txt'), lines.join('\n') + '\n');
  const tab = ['| scheme | ink | hex | surface | surface hex | ratio |', '|---|---|---|---|---|---|'];
  for (const scheme of SCHEMES) for (const r of m.contrast[scheme]) tab.push(`| ${scheme} | ${r.ink} | ${r.inkHex} | ${r.surface} | ${r.surfaceHex} | ${r.ratio} |`);
  await writeFile(join(out, 'contrast-table.md'), tab.join('\n') + '\n');
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
  const rows4 = ['light before', 'light after', 'dark before', 'dark after'];
  const rs = (r) => [SCHEMES[r >> 1], STATES[r % 2]];
  /* one sheet per page: 1440 light and dark, before over after */
  for (const [name] of PAGES) {
    await sheet(join(out, `sheet-${name}-1440.jpg`), `${name} at 1440, before and after`, ['before', 'after'], ['light', 'dark'], 700, async (r, c) => {
      const img = await load(shotPath(name, STATES[r], SCHEMES[c], '1440'));
      return img && { img };
    });
    await sheet(join(out, `sheet-${name}-820-390.jpg`), `${name} at 820 and 390 (390 is 2x, shown at half), before and after`,
      rows4, ['820', '390'], 420, async (r, c) => {
        const [scheme, state] = rs(r);
        const img = await load(shotPath(name, state, scheme, c ? '390' : '820'));
        if (!img) return null;
        return { img, w: c ? Math.min(210, img.width / 2) : 420 };
      });
  }
  /* the hands: kicker, lead, margin note, numeral, lab kicker, footer, form label, services numeral */
  const handCols = [['hand-kicker', 'kicker'], ['hand-lead', 'lead (kicker voice)'], ['hand-lab', 'From the lab (label)'], ['hand-note', 'How we build (note)'], ['hand-footer', 'footer place (note)'], ['hand-numeral', 'No. 1 (label)'], ['hand-label', 'form label (label)'], ['hand-contact-kicker', 'Contact kicker'], ['hand-letter', 'About letter h2 (kicker)'], ['hand-num', 'method numeral (label)']];
  await sheet(join(out, 'sheet-hands.jpg'), 'Three hands: kicker, margin note, label (2x crops all drawn at the same scale: 1 CSS px = 1 px; before above after)', rows4, handCols.map((c) => c[1]), 330, async (r, c) => {
    const [scheme, state] = rs(r);
    const img = await load(cropPath(handCols[c][0], state, scheme));
    /* one scale for every cell (1 CSS px = 1 sheet px, from the 2x crop), so a size change shows */
    return img && { img, w: img.width / 2 };
  });
  await sheet(join(out, 'sheet-nav-390.jpg'), 'The mobile nav: before and after (390, 2x, shown at half)', rows4, ['nav'], 390, async (r) => {
    const [scheme, state] = rs(r);
    const img = await load(cropPath('nav-390', state, scheme));
    return img && { img, w: img.width / 2 };
  });
  /* the wetness roles */
  const wetCols = [['wet-billboard', 'billboard, SOFT 100'], ['wet-h2', 'h2 sheet title, SOFT 50'], ['wet-h3', 'h3 card title, SOFT 0 WONK 0']];
  await sheet(join(out, 'sheet-wetness.jpg'), 'Three wetnesses by role (2x crops, before above after)', rows4, wetCols.map((c) => c[1]), 520, async (r, c) => {
    const [scheme, state] = rs(r);
    const img = await load(cropPath(wetCols[c][0], state, scheme));
    return img && { img, w: Math.min(520, img.width / 1.6) };
  });
  /* pull quotes against the billboard */
  const pullCols = [['pull-billboard', 'billboard (the yardstick)'], ['pull-lab', 'Home lab pull'], ['pull-closer', 'Home closer'], ['pull-services', 'Services ask'], ['pull-manifesto', 'About manifesto']];
  const pullRows = ['light SuperSoft', 'light Sharp', 'dark SuperSoft', 'dark Sharp'];
  await sheet(join(out, 'sheet-pull-quotes.jpg'), 'Italic pull quotes: SuperSoft (SOFT 100) against Sharp (SOFT 0), beside the billboard', pullRows, pullCols.map((c) => c[1]), 400, async (r, c) => {
    const scheme = SCHEMES[r >> 1], pull = r % 2 ? 'sharp' : 'supersoft';
    const img = await load(cropPath(`${pullCols[c][0]}-${pull}`, 'after', scheme));
    return img && { img, w: Math.min(400, img.width / 1.6) };
  });
}

async function index() {
  const renderer = existsSync(join(out, 'renderer.txt')) ? (await readFile(join(out, 'renderer.txt'), 'utf8')).trim() : 'unknown';
  const lines = [
    '# Stage 5 proof a4: cottagecore hands and Fraunces wetness, images', '',
    `Renderer: ${renderer}`, '',
    '## Founder sheets (read these first)',
    '- sheet-hands.jpg: kicker, lead, From the lab, How we build, footer place, No. 1, form label, method numeral: before above after, light and dark, 2x crops',
    '- sheet-wetness.jpg: billboard, h2 sheet title, h3 card title, before above after',
    '- sheet-pull-quotes.jpg: SuperSoft against Sharp beside the billboard, five placements',
    '- sheet-nav-390.jpg: the mobile nav in the margin-note voice',
    '- sheet-<home|services|contact|about>-1440.jpg: whole page, before over after, light and dark',
    '- sheet-<page>-820-390.jpg: whole page at 820 and 390, before and after, light and dark', '',
    '## Single images',
    '- shots/<page>__<before|after>__<light|dark>__<1440|820|390>.png: whole page (390 is 2x)',
    '- crops/<name>__<before|after>__<scheme>.png: 2x element crops (hand-*, wet-*, nav-390)',
    '- crops/pull-<place>-<supersoft|sharp>__after__<scheme>.png', '',
    '`measures.json` holds the contrast rows and what each role computes to; `contrast-table.md` and',
    '`contrast-entries.txt` are the same numbers as a table and as paste-ready meta.contrast entries.',
    'Fireflies are hidden in every frame (random clocks would make before and after differ); the switcher is hidden.', '',
  ];
  await writeFile(join(out, 'index.md'), lines.join('\n'));
}

if (!process.argv.includes('--sheets-only')) {
  const m = await capture();
  await entries(m);
  if (m.fails.length) { console.error('CONTRAST FAILS:\n' + m.fails.join('\n')); process.exitCode = 1; }
  else console.log('contrast: every new ink clears 4.5:1 on every surface, both schemes');
}
await sheets();
await index();
