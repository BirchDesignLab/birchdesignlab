// BDL-013 (The Drawing Set): shoot every state of the built /lab/bdl-013/ page
// and flag what the mockup's own shoot script flagged, plus the Lab plumbing.
//
//   npm run build && npx astro preview --port 4474     (other terminal)
//   BDL_GPU=1 SNAP_BASE=http://127.0.0.1:4474 node scripts/lab/shoot-bdl-013.mjs [only] [--all-sizes]
//
// Port of scripts/lab/shoot-o7-drawing-set.mjs against a served build (the
// mockup script drives the file; this one drives the real page, so it also
// checks that the stage stays clear of the Lab pill, the wall label and the
// specimen plate strip, and that the stage never touches the site's theme).
//
// Base: SNAP_BASE env or --base, default http://127.0.0.1:4400. Path
// /lab/bdl-013/. Sheet 1 + Detail 1..3 x Plain/Under the hood x Day/Night, at
// 1440x900 and 390x844 (add --all-sizes for 1280x800, 1024x768, 820x1180),
// reached by URL params (?detail=N&hood=1&scheme=dark), plus the 1200x630 OG
// frame (?og=1). Desktop shots are the viewport; phone shots are full page.
// Writes scripts/themes/.out/bdl-013-shots/ (gitignored). Optional first arg
// `only` filters tags by substring.
//
// Flags: console errors, U+2014 in visible text (and in the page source),
// forbidden words, time/speed figures, element overflow past the stage,
// clipped text, Plain text under 16px (code listings, zone marks and the view
// controls exempt), the sequence nav (Next filled, 44px, in the first view,
// not covered), the stage covered by the pill / label / plate, and the
// scheme leaving the stage.
//
// Film with the GPU: BDL_GPU=1 adds --use-angle=d3d11 --enable-gpu. The
// renderer is printed so a software frame never mixes into a delivery.
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { privateAlt } from './lib/private-words.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
let chromium;
for (const c of [join(root, 'package.json'), 'C:/git/birchdesignlab/package.json']) {
  try { ({ chromium } = createRequire(c)('playwright')); break; } catch {}
}
if (!chromium) throw new Error('playwright not found');
const { suppressPrompt } = await import(pathToFileURL(join(root, 'scripts', 'themes', 'lib', 'portal-prompt.mjs')).href);

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const only = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--base') || '';
const base = (opt('base', process.env.SNAP_BASE || 'http://127.0.0.1:4400')).replace(/\/$/, '');
const PATH = '/lab/bdl-013/';
const url = (q = '') => base + PATH + q;
const out = join(root, 'scripts', 'themes', '.out', 'bdl-013-shots');
await mkdir(out, { recursive: true });

const gpuArgs = process.env.BDL_GPU ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] : [];
const browser = await chromium.launch({ args: gpuArgs });
const findings = [];

// The renderer the frames are made with, so software and GPU never mix.
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto('about:blank');
  const gl = await page.evaluate(() => {
    const c = document.createElement('canvas');
    const g = c.getContext('webgl2') || c.getContext('webgl');
    const x = g && g.getExtension('WEBGL_debug_renderer_info');
    return x ? g.getParameter(x.UNMASKED_RENDERER_WEBGL) : 'unknown';
  });
  console.log('renderer:', gl, process.env.BDL_GPU ? '(BDL_GPU=1)' : '(software: set BDL_GPU=1 for the GPU)');
  await ctx.close();
}

// Words and figures the sheet must never show. Word edges are spelled with
// lookarounds so the patterns carry no backslashes.
const WB = '(?<![A-Za-z0-9_])';
const WE = '(?![A-Za-z0-9_])';
const FORBIDDEN = new RegExp(`${privateAlt()}compliance|${WB}PT${WE}|${WB}en${WE}.*${WB}es${WE}.*${WB}vi${WE}`, 'i');
const TIMEY = new RegExp(`${WB}[0-9]+ ?(ms|seconds?|minutes?|hours?|days?|weeks?)${WE}|${WB}faster${WE}|${WB}fast${WE}|${WB}quick(ly)?${WE}`, 'i');
const EMDASH = new RegExp(String.fromCharCode(0x2014));

const check = () => {
  const ds = document.getElementById('ds');
  const phone = innerWidth <= 760;
  const og = ds.classList.contains('og');
  const hood = ds.classList.contains('hood');
  const stage = document.getElementById('stage');
  const sb = stage.getBoundingClientRect();
  const vis = (e) => !!(e.getClientRects().length) && getComputedStyle(e).visibility !== 'hidden';
  const overflow = [], clipped = [], small = [], covered = [];
  const pill = document.querySelector('.hatch');
  const label = document.querySelector('details.label');
  const plate = document.querySelector('details.plate > summary');
  const fixed = [['pill', pill], ['label', label], ['plate', plate]].filter(([, e]) => e && vis(e)).map(([n, e]) => [n, e.getBoundingClientRect()]);
  const hit = (b, r) => b.left < r.right && b.right > r.left && b.top < r.bottom && b.bottom > r.top;
  for (const e of document.querySelectorAll('#stage *')) {
    if (!vis(e) || (e.closest('svg') && e.tagName !== 'svg')) continue;
    const b = e.getBoundingClientRect();
    if (!b.width && !b.height) continue;
    const tag = (e.className && e.className.baseVal === undefined ? e.className : e.tagName) || e.tagName;
    if (phone) {
      if (b.right > innerWidth + 1 || b.left < -1) overflow.push('x:' + tag);
    } else if (b.right > sb.right + 1 || b.bottom > sb.bottom + 1 || b.left < sb.left - 1 || b.top < sb.top - 1) overflow.push('stage:' + tag);
    // the stage's furniture may sit under the pill (frame, margin marks); content may not
    // (desktop only: on the phone the sheet scrolls under the fixed chrome by design)
    if (!og && !phone && !e.matches('.frame,.zone,.tick') && !e.closest('.frame') && (!e.children.length || e.matches('.sl,.bub,.strip,#tb,.go,.seg,.zero,.bom,.rev'))) {
      for (const [n, r] of fixed) if (hit(b, r)) covered.push(n + ':' + tag);
    }
    if (!e.matches('.dim,.n') && e.clientWidth && e.scrollWidth > e.clientWidth + 2 && !e.closest('svg')) clipped.push('w:' + tag + ' "' + e.textContent.trim().slice(0, 24) + '"');
    if (!e.matches('.dim,.n') && e.clientHeight && e.scrollHeight > e.clientHeight + 7 && !e.closest('svg') && e.id !== 'stage') clipped.push('h:' + tag + ' "' + e.textContent.trim().slice(0, 24) + '"');
    if (!hood && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) {
      if (e.closest('.code,.zone,#ctrl,.fl,svg,.go,.cue,.open,.mk')) continue;
      const raw = parseFloat(getComputedStyle(e).fontSize);
      if (raw < 16) small.push(e.textContent.trim().slice(0, 28) + ' ' + raw);
    }
  }
  if (!hood) for (const t of document.querySelectorAll('#stage svg text')) {
    if (!vis(t) || getComputedStyle(t).display === 'none') continue;
    const fs = parseFloat(getComputedStyle(t).fontSize);
    if (t.classList.contains('h')) continue;
    if (fs < 16 && !/^[/+]|^[A-Z_]{6,}$|OrderBoard|^Order$/.test(t.textContent.trim())) small.push('svg:' + t.textContent.trim().slice(0, 20) + ' ' + fs);
  }
  // Phone: the sticky bar's controls and the switches must clear the Lab's own fixed
  // chrome by rectangle (not just at their centres). The site pins the pill on every
  // size and the folded label up to 721px+; at 720px and below the label is in flow,
  // so only fixed ones count. The switches are checked at the top of the page only.
  if (phone && !og) {
    const sel = ['#nav .go', '#nav .mk'];
    if (scrollY < 2) sel.push('#ctrl button');
    for (const q of sel) {
      for (const el of document.querySelectorAll(q)) {
        if (!vis(el)) continue;
        const b = el.getBoundingClientRect();
        if (b.bottom < 0 || b.top > innerHeight) continue;
        for (const [n, e] of [['pill', pill], ['label', label], ['plate', plate]]) {
          if (!e || !vis(e) || getComputedStyle(n === 'plate' ? e.parentElement : e).position !== 'fixed') continue;
          if (hit(b, e.getBoundingClientRect())) covered.push('phone ' + q + ' under ' + n);
        }
      }
    }
  }
  // Key controls must be the topmost thing at their centre (nothing laid over them).
  const nav = [];
  if (!og) {
    // (on the phone the sheet scrolls under the sticky bar, so only the bar's own controls and the switches are checked)
    for (const sel of phone ? ['#next', '#prev', '#nav .mk'] : ['#next', '#prev', '#nav .mk', '#mode button', '#scheme button', '.bub', '.tree .th a']) {
      for (const el of document.querySelectorAll(sel)) {
        if (!vis(el)) continue;
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        if (cy < 0 || cy > innerHeight || cx < 0 || cx > innerWidth) continue;
        const top = document.elementFromPoint(cx, cy);
        if (top && !el.contains(top)) nav.push('covered control ' + sel + ' by ' + (top.className || top.tagName).toString().slice(0, 30));
      }
    }
    const d = +ds.getAttribute('data-detail');
    const nx = document.getElementById('next'), nv = document.getElementById('nav');
    if (d < 3) {
      if (!nx || nx.hidden) nav.push('Next button missing');
      else {
        const r = nx.getBoundingClientRect();
        if (nx.offsetHeight < 44) nav.push('Next shorter than 44px: ' + nx.offsetHeight);
        if (r.top < 0 || r.bottom > innerHeight + 1 || r.left < 0 || r.right > innerWidth + 1) nav.push('Next not in first viewport');
        if (!/^Next: .* →$/.test(nx.textContent.trim())) nav.push('Next label: ' + nx.textContent);
        if (getComputedStyle(nx).backgroundColor === getComputedStyle(ds).backgroundColor) nav.push('Next is not filled');
      }
    } else if (document.getElementById('prev').hidden) nav.push('Back to sheet missing on last detail');
    if (phone && getComputedStyle(nv).position !== 'sticky') nav.push('phone nav is not sticky');
    if (!phone && ds.getBoundingClientRect().height < innerHeight - 2) nav.push('stage box is not one viewport tall');
    if (document.querySelectorAll('#nav .mk').length !== 4 || !document.querySelector('#nav .mk[aria-current="step"]')) nav.push('progress strip incomplete');
    const cue = document.getElementById('cue');
    const cueShown = !!(cue && cue.getClientRects().length);
    if (d === 0 && !cueShown) nav.push('Try it cue not shown on sheet 1');
    if (d > 0 && cueShown) nav.push('Try it cue shown on a detail sheet');
    if (d === 0) for (const b of document.querySelectorAll('.bub')) if (!b.querySelector('.open')) nav.push('bubble without Open label');
    if (d === 1) {
      const a = document.querySelector('.tree .th b a');
      if (!a || a.getAttribute('href') !== '/lab/bdl-008/') nav.push('Detail 1 salon heading does not link to /lab/bdl-008/');
    }
  }
  // OG: the Lab chrome steps aside and the frame is exactly the share size.
  const ogProblems = [];
  if (og) {
    for (const [n, e] of [['pill', pill], ['label', label], ['plate', document.querySelector('details.plate')]]) if (e && vis(e)) ogProblems.push(n + ' visible in og frame');
    if (Math.round(sb.width) !== 1200 || Math.round(sb.height) !== 630) ogProblems.push('og stage is ' + sb.width + 'x' + sb.height);
    if (document.documentElement.scrollHeight > innerHeight + 1) ogProblems.push('og page scrolls');
  }
  return {
    text: stage.innerText,
    html: document.documentElement.outerHTML,
    nav, ogProblems,
    overflow: [...new Set(overflow)], clipped: [...new Set(clipped)], small: [...new Set(small)], covered: [...new Set(covered)],
    scale: phone ? 1 : +(sb.width / (og ? 1200 : 1440)).toFixed(3),
  };
};

async function newPage(opts, scheme) {
  const ctx = await browser.newContext({ ...opts, colorScheme: scheme === 'dark' ? 'dark' : 'light', reducedMotion: 'no-preference' });
  await suppressPrompt(ctx);
  const page = await ctx.newPage();
  // Force prefers-reduced-transparency: no-preference so the pill's blur never varies.
  try {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  } catch {}
  return { ctx, page };
}

async function shoot(ctxOpts, tag, query, fullPage, name, scheme) {
  if (only && !tag.includes(only)) return;
  const { ctx, page } = await newPage(ctxOpts, scheme);
  page.on('console', (m) => m.type() === 'error' && !/favicon|net::ERR/.test(m.text()) && findings.push(`${tag}: console: ${m.text()}`));
  page.on('pageerror', (e) => findings.push(`${tag}: pageerror: ${e}`));
  page.on('requestfailed', (r) => findings.push(`${tag}: request failed: ${r.url()}`));
  await page.goto(url(query));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1400);
  const r = await page.evaluate(check);
  if (r.nav.length) findings.push(`${tag}: nav: ${[...new Set(r.nav)].join('; ')}`);
  if (EMDASH.test(r.text) || EMDASH.test(r.html)) findings.push(`${tag}: U+2014 in the page`);
  const bad = r.text.match(FORBIDDEN);
  if (bad) findings.push(`${tag}: forbidden word: ${bad[0]}`);
  const timey = r.text.match(TIMEY);
  if (timey) findings.push(`${tag}: time/speed wording: ${timey[0]}`);
  if (r.ogProblems.length) findings.push(`${tag}: og: ${r.ogProblems.join('; ')}`);
  if (r.overflow.length) findings.push(`${tag}: overflow ${r.overflow.slice(0, 8).join(', ')}`);
  if (r.covered.length) findings.push(`${tag}: stage content under Lab chrome ${r.covered.slice(0, 8).join(', ')}`);
  if (r.clipped.length) findings.push(`${tag}: clipped ${r.clipped.slice(0, 8).join(' | ')}`);
  if (r.small.length) findings.push(`${tag}: plain text <16px: ${r.small.slice(0, 8).join(' | ')}`);
  await page.screenshot({ path: join(out, `${name}.png`), fullPage });
  console.log(`${tag}: scale ${r.scale}`);
  await ctx.close();
}

const sizes = [
  { w: 1440, h: 900, opts: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }, full: false },
  { w: 390, h: 844, opts: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, full: true },
  // 721 to 760px: the phone layout while the site still fixes the pill and the folded label
  { w: 740, h: 900, opts: { viewport: { width: 740, height: 900 }, deviceScaleFactor: 1 }, full: true },
];
if (flag('all-sizes')) {
  for (const [w, h] of [[1280, 800], [1024, 768], [820, 1180]]) sizes.push({ w, h, opts: { viewport: { width: w, height: h }, deviceScaleFactor: 1 }, full: false });
}
for (const s of sizes) {
  for (const d of [0, 1, 2, 3]) {
    for (const hood of [0, 1]) {
      for (const scheme of ['light', 'dark']) {
        const sheet = d ? `d${d}` : 'sheet';
        const mode = hood ? 'hood' : 'plain';
        const tag = `${s.w}-${sheet}-${mode}-${scheme}`;
        await shoot(s.opts, tag, `?detail=${d}&hood=${hood}&scheme=${scheme}`, s.full, tag, scheme);
      }
    }
  }
}
// first-viewport shots on the phone (sticky bar / Try it cue / Next visible without scrolling)
for (const [d, scheme] of [[0, 'light'], [0, 'dark'], [1, 'light'], [3, 'light']]) {
  const phoneOpts = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
  const t = `390-view-${d ? 'd' + d : 'sheet'}-${scheme}`;
  await shoot(phoneOpts, t, `?detail=${d}&scheme=${scheme}`, false, t, scheme);
  const bandOpts = { viewport: { width: 740, height: 900 }, deviceScaleFactor: 1 };
  const tb = `740-view-${d ? 'd' + d : 'sheet'}-${scheme}`;
  await shoot(bandOpts, tb, `?detail=${d}&scheme=${scheme}`, false, tb, scheme);
}

// interaction flow: Next, arrow keys, strip marks, Try it cue gone after first use, keys ignored off-stage
if (!only || 'flow'.includes(only)) {
  for (const [name, opts] of [['1440', { viewport: { width: 1440, height: 900 } }], ['390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }]]) {
    const { ctx, page } = await newPage(opts, 'light');
    await page.goto(url('?scheme=light'));
    await page.waitForTimeout(600);
    const st = () => page.evaluate(() => ({ d: document.getElementById('ds').getAttribute('data-detail'), cue: !!document.getElementById('cue').getClientRects().length, next: document.getElementById('next').hidden ? '' : document.getElementById('next').textContent.trim() }));
    const exp = (cond, msg) => { if (!cond) findings.push(`flow-${name}: ${msg}`); };
    let s0 = await st(); exp(s0.d === '0' && s0.cue && s0.next === 'Next: Off is gone →', 'initial state ' + JSON.stringify(s0));
    await page.click('#next'); let s1 = await st(); exp(s1.d === '1' && !s1.cue && /What ordering needs/.test(s1.next), 'after Next ' + JSON.stringify(s1));
    await page.keyboard.press('ArrowRight'); let s2 = await st(); exp(s2.d === '2', 'ArrowRight -> ' + s2.d);
    await page.keyboard.press('ArrowRight'); let s3 = await st(); exp(s3.d === '3' && s3.next === '', 'ArrowRight to last ' + JSON.stringify(s3));
    await page.keyboard.press('ArrowLeft'); exp((await st()).d === '2', 'ArrowLeft');
    await page.keyboard.press('Escape'); exp((await st()).d === '0', 'Escape back to the sheet');
    await page.click('#next'); await page.click('#nav .mk[data-go="0"]'); let s4 = await st(); exp(s4.d === '0' && !s4.cue, 'strip mark to sheet; cue stays gone ' + JSON.stringify(s4));
    // history: Next pushes #detail-1, Back pops to the sheet
    await page.click('#next'); exp(/#detail-1$/.test(page.url()), 'Next pushes #detail-1: ' + page.url());
    await page.goBack(); await page.waitForTimeout(150); exp((await st()).d === '0', 'Back pops to the sheet');
    // keys do nothing from the specimen plate / wall label summaries
    await page.evaluate(() => document.querySelector('details.plate > summary').focus());
    await page.keyboard.press('ArrowRight'); exp((await st()).d === '0', 'ArrowRight from the plate summary moved the sheet');
    // leader hover: pointing at a file line lights its leader and layer, and dims the rest (desktop pointer only)
    if (name === '1440') {
      await page.hover('.fl[data-r="2"] .tk');
      await page.waitForTimeout(150);
      exp(await page.evaluate(() => document.getElementById('ds').classList.contains('hovering') && !!document.querySelector('.sl[data-r="2"].hl') && !!document.querySelector('.ld[data-r="2"].hl')), 'leader hover did not light row 2');
      await page.mouse.move(5, 5);
      await page.waitForTimeout(150);
    }
    // page-level hood switch
    await page.click('#mode button[data-v="hood"]');
    exp(await page.evaluate(() => document.getElementById('ds').classList.contains('hood')), 'Under the hood switch');
    await ctx.close();
  }
  // deep links
  {
    const { ctx, page } = await newPage({ viewport: { width: 1440, height: 900 } }, 'light');
    await page.goto(url('#detail-2'));
    await page.waitForTimeout(400);
    exp2(await page.evaluate(() => document.getElementById('ds').getAttribute('data-detail')) === '2', '#detail-2 deep link');
    await page.goto(url('?detail=3&hood=1'));
    await page.waitForTimeout(400);
    exp2(await page.evaluate(() => document.getElementById('ds').getAttribute('data-detail') + document.getElementById('ds').classList.contains('hood')) === '3true', '?detail=3&hood=1 deep link');
    await ctx.close();
  }
  function exp2(cond, msg) { if (!cond) findings.push(`deeplink: ${msg}`); }
}

// scheme: Night on the stage never touches the site's theme or storage
if (!only || 'scheme'.includes(only)) {
  for (const siteScheme of ['light', 'dark']) {
    const { ctx, page } = await newPage({ viewport: { width: 1440, height: 900 } }, siteScheme);
    await page.goto(url());
    await page.waitForTimeout(500);
    const read = () => page.evaluate(() => ({ html: document.documentElement.getAttribute('data-scheme'), ds: document.getElementById('ds').getAttribute('data-scheme'), stored: (() => { try { return localStorage.getItem('scheme'); } catch { return 'blocked'; } })() }));
    const before = await read();
    const toggle = siteScheme === 'light' ? 'dark' : 'light';
    await page.click(`#scheme button[data-v="${toggle}"]`);
    const mid = await read();
    if (mid.ds !== toggle) findings.push(`scheme(${siteScheme}): switch did not set the stage to ${toggle}: ${JSON.stringify(mid)}`);
    if (mid.html !== before.html || mid.stored !== before.stored) findings.push(`scheme(${siteScheme}): stage switch touched the site theme: ${JSON.stringify({ before, mid })}`);
    await page.goto(base + '/lab/');
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => ({ html: document.documentElement.getAttribute('data-scheme'), stored: (() => { try { return localStorage.getItem('scheme'); } catch { return 'blocked'; } })() }));
    if (after.html !== before.html || after.stored !== before.stored) findings.push(`scheme(${siteScheme}): /lab/ lost the site theme: ${JSON.stringify({ before, after })}`);
    await page.screenshot({ path: join(out, `scheme-after-${siteScheme}.png`) });
    await ctx.close();
  }
}

// scroll: desktop is one screen (the plate is a fixed strip); the phone sheet scrolls and its nav leaves with the stage
if (!only || 'scroll'.includes(only)) {
  {
    const { ctx, page } = await newPage({ viewport: { width: 1440, height: 900 } }, 'light');
    await page.goto(url());
    await page.waitForTimeout(600);
    const sh = await page.evaluate(() => ({ doc: document.documentElement.scrollHeight, vh: innerHeight }));
    console.log(`scroll-1440: document ${sh.doc}px, viewport ${sh.vh}px (the specimen plate is a fixed strip)`);
    await page.click('details.plate > summary');
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(out, 'scroll-1440-plate-open.png') });
    await ctx.close();
  }
  // 390 (label in flow) and 740 (pill and folded label still fixed by the site)
  for (const [w, h, dpr, mobile] of [[390, 844, 2, true], [740, 900, 1, false]]) {
    const { ctx, page } = await newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile }, 'light');
    await page.goto(url('?scheme=light'));
    await page.waitForTimeout(800);
    const probe = () => page.evaluate(() => {
      const nav = document.getElementById('nav').getBoundingClientRect();
      const plate = document.querySelector('details.plate > summary').getBoundingClientRect();
      const label = document.querySelector('details.label');
      const lf = label && getComputedStyle(label).position === 'fixed' ? label.getBoundingClientRect() : null;
      const stage = document.getElementById('stage').getBoundingClientRect();
      return { navBottom: nav.bottom, plateTop: plate.top, labelTop: lf ? lf.top : null, navTop: nav.top, stageBottom: stage.bottom, innerHeight };
    });
    const judge = (where, r) => {
      if (r.navBottom > r.plateTop + 1) findings.push(`scroll-${w} ${where}: sticky nav runs under the plate strip: ${JSON.stringify(r)}`);
      if (r.labelTop !== null && r.navBottom > r.labelTop + 1) findings.push(`scroll-${w} ${where}: sticky nav runs under the wall label: ${JSON.stringify(r)}`);
    };
    await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'instant' }));
    await page.waitForTimeout(300);
    judge('mid', await probe());
    await page.screenshot({ path: join(out, `scroll-${w}-mid.png`) });
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    await page.waitForTimeout(300);
    judge('end', await probe());
    await page.screenshot({ path: join(out, `scroll-${w}-end.png`) });
    await ctx.close();
  }
}

// OG, 1200x630 (plain, both schemes)
for (const scheme of ['light', 'dark']) {
  const tag = `og-${scheme}`;
  await shoot({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 }, tag, `?og=1&scheme=${scheme}`, false, tag, scheme);
}
console.log(findings.length ? findings.join('\n') : 'no findings');
await browser.close();
