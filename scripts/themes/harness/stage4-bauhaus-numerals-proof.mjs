/**
 * Stage 4 Tier A proof a4: bauhaus constructed numerals (E3).
 *
 * Injects scripts/themes/proofs/stage4-bauhaus-numerals/proof.css, the built
 * numerals (numerals.svg through inject.js) into a frozen build. Nothing
 * under src/ changes. Capture (shots/ under .out/stage4-proofs/bauhaus-numerals):
 *   spec__<variant>__<scheme>__<size>     specimen page, digits 0 to 9 at three
 *                                         sizes; variant old (Unbounded) / new
 *   page__<page>__<variant>__<scheme>__<size>   whole page, home + services
 *   crop__<part>__<page>__<variant>__<scheme>__<size>   doors, offering,
 *                                         steps, lab
 *   zoom__<part>__<variant>__<scheme>     the first numeral of each part at 1440, 3x
 *   asm__<scheme>-<n>                     specimen assembly frames (timestamps)
 *   checks.json: parity (text, accessibility tree), overflow, Unbounded
 *   users, stroke thickness in px for every numeral
 *
 * Usage (BDL_GPU=1 required; exits 2 on a software renderer):
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name stage4-base --reuse --port 4460 -- \
 *     node scripts/themes/harness/stage4-bauhaus-numerals-proof.mjs
 *   add --sheets-only to rebuild the sheets from existing shots.
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
const PROOF = join(REPO, 'scripts', 'themes', 'proofs', 'stage4-bauhaus-numerals');
const out = join(REPO, 'scripts', 'themes', '.out', 'stage4-proofs', 'bauhaus-numerals');
const shots = join(out, 'shots');
await mkdir(shots, { recursive: true });
const base = (process.env.SNAP_BASE || '').replace(/\/$/, '');

const SCHEMES = ['light', 'dark'];
const SIZES = [
  { id: '1440', w: 1440, h: 900, dpr: 1 },
  { id: '1280', w: 1280, h: 800, dpr: 1 },
  { id: '1024', w: 1024, h: 768, dpr: 1 },
  { id: '820', w: 820, h: 1180, dpr: 1 },
  { id: '390', w: 390, h: 844, dpr: 2, mobile: true },
];
const PAGES = { home: '', services: 'services' };
/* part -> [page, selector] */
const PARTS = { doors: ['home', '.doors'], lab: ['home', '.lab'], offering: ['services', '.offering'], steps: ['services', '.process'] };
const shot = (...parts) => join(shots, parts.join('__') + '.png');
const COMP = 'bdl-switcher{display:none!important} *{scroll-behavior:auto!important}';
const SPEC_SIZES = { desktop: [36, 72, 144], phone: [24, 44, 64] };

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

/* The ten symbols' inner markup, read from the committed numerals.svg. */
async function symbols() {
  const svg = await readFile(join(PROOF, 'numerals.svg'), 'utf8');
  const map = {};
  for (const m of svg.matchAll(/<symbol id="n(\d)"[^>]*>([\s\S]*?)<\/symbol>/g)) map[m[1]] = m[2];
  if (Object.keys(map).length !== 10) throw new Error('numerals.svg: expected 10 symbols');
  return map;
}

async function newCtx(browser, sz, scheme) {
  const context = await browser.newContext({
    viewport: { width: sz.w, height: sz.h }, deviceScaleFactor: sz.dpr,
    isMobile: !!sz.mobile, hasTouch: !!sz.mobile, colorScheme: scheme, reducedMotion: 'no-preference',
  });
  await suppressPrompt(context);
  await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
  const page = await context.newPage();
  await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'no-preference', reducedTransparency: 'no-preference' });
  return { context, page };
}

let SYM = null, CSS = null, INJECT = null;
async function loadProof() {
  SYM = await symbols();
  CSS = await readFile(join(PROOF, 'proof.css'), 'utf8');
  INJECT = await readFile(join(PROOF, 'inject.js'), 'utf8');
}

/** Load a bauhaus page. variant 'new' injects the proof; 'old' is the frozen build. */
async function prep(page, scheme, route, variant, opts = {}) {
  await page.goto(`${base}/t/bauhaus/${route ? route + '/' : ''}`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: COMP });
  if (variant === 'new') {
    await page.addStyleTag({ content: CSS });
    await page.addScriptTag({ content: INJECT });
    await page.evaluate(([s, o]) => window.bdlBuildNumerals(s, o), [SYM, opts]);
  }
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(900);
  const got = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, scheme: document.documentElement.dataset.scheme }));
  if (got.theme !== 'bauhaus' || got.scheme !== scheme) console.warn(`WARN theme=${got.theme} scheme=${got.scheme}`);
  /* Everything below the fold is parked until the reveal observer settles it;
     scroll through once so the whole page is drawn, then back to the top. */
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 90)); }
    scrollTo(0, 0);
  });
  await page.waitForTimeout(1500);
}

/** Replace the main content of the About page with the specimen (theme CSS stays live). */
async function specimen(page, scheme, variant, sz) {
  await page.goto(`${base}/t/bauhaus/about/`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: COMP });
  const sizes = sz.w >= 640 ? SPEC_SIZES.desktop : SPEC_SIZES.phone;
  await page.evaluate(([sizes, variant]) => {
    const main = document.querySelector('main');
    const rows = sizes.map((px) => {
      const cls = variant === 'old' ? 'sp-old' : 'num';
      return `<div class="sp-row"><span class="sp-px">${px}px</span><div class="sp-set"><span class="${cls}" style="font-size:${px}px;">0123456789</span></div>` +
        `<div class="sp-set sp-yellow block-yellow"><span class="${cls}" style="font-size:${px}px;">0123456789</span></div></div>`;
    }).join('');
    const css = document.createElement('style');
    css.textContent = `.sp{padding:24px var(--gutter,24px) 40px;display:grid;gap:18px}.sp-row{display:grid;gap:10px;align-items:start}` +
      `.sp-px{font:600 13px/1 system-ui;opacity:.7}.sp-set{padding:14px 18px;overflow:hidden}.sp-yellow{background:var(--yellow);color:var(--on-yellow)}` +
      `.sp-old{font-family:var(--font-num);font-weight:800;line-height:.8;letter-spacing:-.04em;font-variant-numeric:tabular-nums;white-space:nowrap}`;
    document.head.appendChild(css);
    main.innerHTML = `<section class="sp">${rows}</section>`;
    main.querySelectorAll('[data-reveal]').forEach((n) => n.classList.add('is-settled'));
  }, [sizes, variant]);
  if (variant === 'new') {
    await page.addStyleTag({ content: CSS });
    await page.addScriptTag({ content: INJECT });
    await page.evaluate((s) => window.bdlBuildNumerals(s, {}), SYM);
  }
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(500);
}

const CHECK_FN = `() => {
  const unb = [...document.querySelectorAll('body *')].filter((e) => /unbounded/i.test(getComputedStyle(e).fontFamily)).length;
  const nums = [...document.querySelectorAll('.num')].map((e) => {
    const s = e.querySelector('.nm');
    const b = s ? s.getBoundingClientRect() : null;
    const r = e.getBoundingClientRect();
    return { text: e.textContent.trim(), built: !!s, digits: e.querySelectorAll('.nm').length,
      h: b ? +b.height.toFixed(1) : null, w: b ? +b.width.toFixed(1) : null,
      stroke: b ? +(b.height * 0.2).toFixed(2) : null, hole: b ? +(b.height * 0.2).toFixed(2) : null,
      boxW: +r.width.toFixed(1), boxH: +r.height.toFixed(1), fontSize: parseFloat(getComputedStyle(e).fontSize),
      ariaHidden: !!e.closest('[aria-hidden="true"]') };
  });
  const des = [...document.querySelectorAll('.designation')].map((e) => ({ text: e.textContent.trim(), family: getComputedStyle(e).fontFamily.slice(0, 40), weight: getComputedStyle(e).fontWeight, tnum: getComputedStyle(e).fontVariantNumeric }));
  return { unboundedUsers: unb, nums, designations: des,
    scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth,
    text: document.body.innerText.replace(/\\s+/g, ' ').trim(), textContent: document.body.textContent.replace(/\\s+/g, ' ').trim() };
}`;

async function capture() {
  const browser = await launch();
  await loadProof();
  const report = [];
  for (const scheme of SCHEMES) {
    for (const sz of SIZES) {
      const { context, page } = await newCtx(browser, sz, scheme);
      if (sz.id === '1440' || sz.id === '390') {
        for (const variant of ['old', 'new']) {
          await specimen(page, scheme, variant, sz);
          await page.screenshot({ path: shot('spec', variant, scheme, sz.id), fullPage: true });
        }
      }
      for (const [pname, route] of Object.entries(PAGES)) {
        const per = {};
        for (const variant of ['old', 'new']) {
          await prep(page, scheme, route, variant);
          await page.screenshot({ path: shot('page', pname, variant, scheme, sz.id), fullPage: true });
          for (const [part, [pp, sel]] of Object.entries(PARTS)) {
            if (pp !== pname) continue;
            const loc = page.locator(sel).first();
            if (!(await loc.count())) { console.warn(`no ${sel} on ${pname}`); continue; }
            await loc.scrollIntoViewIfNeeded();
            await page.waitForTimeout(250);
            await loc.screenshot({ path: shot('crop', part, pname, variant, scheme, sz.id) });
            if (sz.id === '1440') {
              const num = loc.locator('.num').first();
              if (await num.count()) {
                await page.evaluate(() => {});
                const bb = await num.boundingBox();
                await page.screenshot({ path: shot('zoom', part, variant, scheme), clip: { x: Math.max(0, bb.x - 12), y: Math.max(0, bb.y - 12), width: bb.width + 24, height: bb.height + 24 } });
              }
            }
          }
          const c = await page.evaluate(`(${CHECK_FN})()`);
          const tree = await page.locator('body').ariaSnapshot();
          per[variant] = { c, tree };
          console.log(`ok ${pname} ${variant} ${scheme} ${sz.id} unbounded=${c.unboundedUsers} nums=${c.nums.length} scroll ${c.scrollW}/${c.clientW}`);
        }
        const o = per.old, n = per.new;
        report.push({
          page: pname, scheme, size: sz.id,
          noOverflow: n.c.scrollW <= n.c.clientW, oldNoOverflow: o.c.scrollW <= o.c.clientW,
          textParity: o.c.text === n.c.text, textContentParity: o.c.textContent === n.c.textContent,
          treeParity: o.tree === n.tree,
          unboundedUsersOld: o.c.unboundedUsers, unboundedUsersNew: n.c.unboundedUsers,
          numsOld: o.c.nums.length, numsNew: n.c.nums.length, allBuilt: n.c.nums.every((x) => x.built && x.ariaHidden),
          nums: n.c.nums, numsBefore: o.c.nums.map((x) => ({ text: x.text, boxW: x.boxW, boxH: x.boxH, fontSize: x.fontSize })),
          designations: n.c.designations, designationsBefore: o.c.designations,
        });
      }
      await context.close();
    }
  }
  await writeFile(join(out, 'checks.json'), JSON.stringify(report, null, 2) + '\n');
  await assembly(browser);
  await browser.close();
}

/* Assembly: the specimen's 0 to 4 with the existing .asm machinery, paused and
   stepped on the Web Animations clock so the frames are exact timestamps. */
async function assembly(browser) {
  const FRAMES = [0, 120, 240, 400, 600, 1250];
  for (const scheme of SCHEMES) {
    const { context, page } = await newCtx(browser, { w: 1440, h: 900, dpr: 1 }, scheme);
    await page.goto(`${base}/t/bauhaus/about/`, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: COMP });
    await page.evaluate(() => {
      const main = document.querySelector('main');
      main.innerHTML = '<section style="padding:30px var(--gutter,24px)"><div class="num" style="font-size:150px">0123456789</div></section>';
    });
    await page.addStyleTag({ content: CSS });
    await page.addScriptTag({ content: INJECT });
    await page.evaluate(([s, o]) => window.bdlBuildNumerals(s, o), [SYM, { asm: true, step: 55 }]);
    await page.evaluate(() => document.getAnimations().forEach((a) => a.pause()));
    const n = await page.evaluate(() => document.getAnimations().length);
    const el = page.locator('.num').first();
    for (let i = 0; i < FRAMES.length; i++) {
      await page.evaluate((t) => document.getAnimations().forEach((a) => { a.currentTime = t; }), FRAMES[i]);
      await page.waitForTimeout(80);
      await el.screenshot({ path: shot('asm', scheme, String(i)) });
    }
    console.log(`asm ${scheme}: ${n} animations`);
    await context.close();
  }
  await writeFile(join(out, 'asm-frames.json'), JSON.stringify(FRAMES) + '\n');
}

/* ---------- sheets ---------- */
const BG = '#1b1b1f', INK = '#f2f2f2', CAP = '#c9c9d0', GAP = 14, SIDE = 130;
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
  const ids = SIZES.map((s) => s.id);
  for (const scheme of SCHEMES) {
    await sheet(join(out, `specimen-${scheme}.jpg`), `Numerals 0 to 9 at three sizes, ${scheme}: Unbounded (left) against built (right), plain and on yellow`,
      ['1440', '390'], ['Unbounded', 'built'], 700, (r, c) => img('spec', ['old', 'new'][c], scheme, ['1440', '390'][r]));
    for (const [part, [pp]] of Object.entries(PARTS)) {
      await sheet(join(out, `${part}-${scheme}.jpg`), `${part}, ${scheme}: Unbounded (left) against built (right), every size`,
        ids, ['Unbounded', 'built'], 640, (r, c) => img('crop', part, pp, ['old', 'new'][c], scheme, ids[r]), null, 700);
    }
    await sheet(join(out, `zoom-${scheme}.jpg`), `First numeral of each part at 1440, 3x not applied: Unbounded (left) against built (right), ${scheme}`,
      Object.keys(PARTS), ['Unbounded', 'built'], 420, (r, c) => img('zoom', Object.keys(PARTS)[r], ['old', 'new'][c], scheme));
    for (const pname of Object.keys(PAGES)) {
      await sheet(join(out, `page-${pname}-${scheme}.jpg`), `${pname} whole page, ${scheme}: Unbounded (left) against built (right)`,
        ['1440', '390'], ['Unbounded', 'built'], 520, (r, c) => img('page', pname, ['old', 'new'][c], scheme, ['1440', '390'][r]), null, 2600);
    }
    const fr = JSON.parse(await readFile(join(out, 'asm-frames.json'), 'utf8'));
    const cells = await Promise.all(fr.map((_, i) => load(shot('asm', scheme, String(i)))));
    if (cells.every(Boolean)) {
      const w = 900, hs = cells.map((c) => Math.round(c.height * (w / c.width)));
      const H = 60 + hs.reduce((a, b) => a + b + 34, 0);
      const cv = createCanvas(w + 28, H); const g = cv.getContext('2d');
      g.fillStyle = BG; g.fillRect(0, 0, cv.width, H);
      g.fillStyle = INK; g.font = '600 22px sans-serif'; g.fillText(`Assembly strip, ${scheme}: the existing .asm machinery on the elements (Web Animations clock, exact times)`, 14, 32);
      let y = 52;
      cells.forEach((c, i) => { g.fillStyle = CAP; g.font = '600 16px sans-serif'; g.fillText(`t = ${fr[i]} ms`, 14, y + 16); y += 24; g.drawImage(c, 14, y, w, hs[i]); y += hs[i] + 10; });
      await writeFile(join(out, `asm-${scheme}.jpg`), cv.toBuffer('image/jpeg', 92));
      console.log(`sheet asm-${scheme}.jpg`);
    }
  }
}

if (!process.argv.includes('--sheets-only')) await capture();
await sheets();
