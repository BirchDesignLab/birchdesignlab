// BDL-013 round 6: shoot every state of o7-drawing-set.html for review.
//
//   BDL_GPU=1 node scripts/lab/shoot-o7-drawing-set.mjs [only]
//
// Sheet 1 + Detail 1..3 x Plain/Under the hood x Day/Night, at 1440x900 and
// 390x844, reached by URL params (?detail=N&hood=1&scheme=dark), plus a 1200x627
// OG frame (?og=1). Writes docs/bdl-013/mockups/shots/o7-<W>-<sheet|dN>-<plain|hood>-<scheme>.png
// (gitignored). Phone shots are full page. Optional arg `only` filters tags by substring.
// Flags: console errors, U+2014 in visible text (and in the source), forbidden
// words, time/speed figures, element overflow past the viewport, clipped text,
// and Plain text under 16px (code listings, zone marks and the view controls exempt).
import { createRequire } from 'node:module';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { privateAlt } from './lib/private-words.mjs';
const PRIVATE = privateAlt() ? new RegExp(privateAlt().slice(0, -1), 'i') : null;

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
let chromium;
for (const c of [join(root, 'package.json'), 'C:/git/birchdesignlab/package.json']) {
  try { ({ chromium } = createRequire(c)('playwright')); break; } catch {}
}
if (!chromium) throw new Error('playwright not found');

const only = process.argv[2] || '';
const htmlPath = join(root, 'docs', 'bdl-013', 'mockups', 'o7-drawing-set.html');
const file = pathToFileURL(htmlPath).href;
const out = join(root, 'docs', 'bdl-013', 'mockups', 'shots');
await mkdir(out, { recursive: true });

const gpuArgs = process.env.BDL_GPU ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] : [];
const browser = await chromium.launch({ args: gpuArgs });
const findings = [];

// source-level checks
const src = await readFile(htmlPath, 'utf8');
if (/\u2014/.test(src)) findings.push('source: contains U+2014');
if (new RegExp(`${privateAlt()}compliance`, 'i').test(src)) findings.push('source: forbidden word (private list or compliance)');
if (/\bes\b.*\bvi\b/i.test(src.replace(/<[^>]+>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ''))) {/* visible-text check below is the real one */}

const check = () => {
  const phone = innerWidth <= 760;
  const og = document.body.classList.contains('og');
  const hood = document.body.classList.contains('hood');
  const stage = document.getElementById('stage');
  const sb = stage.getBoundingClientRect();
  const sc = phone ? 1 : sb.width / (og ? 1200 : 1440);
  const vis = (e) => !!(e.getClientRects().length) && getComputedStyle(e).visibility !== 'hidden';
  const text = document.body.innerText;
  const overflow = [], clipped = [], small = [];
  for (const e of document.querySelectorAll('#stage *')) {
    if (!vis(e) || e.closest('svg') && e.tagName !== 'svg') continue;
    const b = e.getBoundingClientRect();
    if (!b.width && !b.height) continue;
    const tag = (e.className && e.className.baseVal === undefined ? e.className : e.tagName) || e.tagName;
    if (phone) {
      if (b.right > innerWidth + 1 || b.left < -1) overflow.push('x:' + tag);
    } else if (b.right > sb.right + 1 || b.bottom > sb.bottom + 1 || b.left < sb.left - 1 || b.top < sb.top - 1) overflow.push('stage:' + tag);
    // text clipped or spilling out of its own box
    if (!e.matches('.dim,.n') && e.clientWidth && e.scrollWidth > e.clientWidth + 2 && !e.closest('svg')) clipped.push('w:' + tag + ' "' + e.textContent.trim().slice(0, 24) + '"');
    if (!e.matches('.dim,.n') && e.clientHeight && e.scrollHeight > e.clientHeight + 7 && !e.closest('svg') && e.id !== 'stage') clipped.push('h:' + tag + ' "' + e.textContent.trim().slice(0, 24) + '"');
    if (!hood && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) {
      if (e.closest('.code,.zone,#ctrl,#back,.fl,svg,.go,.cue,.open,.mk')) continue;
      const fs = parseFloat(getComputedStyle(e).fontSize) * (phone ? 1 : sc);
      const raw = parseFloat(getComputedStyle(e).fontSize);
      if (raw < 16) small.push(e.textContent.trim().slice(0, 28) + ' ' + raw);
    }
  }
  // svg text sizes (plain only)
  if (!hood) for (const t of document.querySelectorAll('#stage svg text')) {
    if (!vis(t) || getComputedStyle(t).display === 'none') continue;
    const fs = parseFloat(getComputedStyle(t).fontSize);
    if (t.classList.contains('h')) continue;
    if (fs < 16 && !/^[\/+]|^[A-Z_]{6,}$|OrderBoard|^Order$/.test(t.textContent.trim())) small.push('svg:' + t.textContent.trim().slice(0, 20) + ' ' + fs);
  }
  // sequence nav: Next exists, is >= 44px tall, and is on screen (desktop) or in the sticky bar (phone)
  const nav = [];
  if (!og) {
    const d = +document.body.getAttribute('data-detail');
    const nx = document.getElementById('next'), nv = document.getElementById('nav');
    if (d < 3) {
      if (!nx || nx.hidden) nav.push('Next button missing');
      else {
        const r = nx.getBoundingClientRect();
        if (nx.offsetHeight < 44) nav.push('Next shorter than 44px: ' + nx.offsetHeight);
        if (r.top < 0 || r.bottom > innerHeight + 1 || r.left < 0 || r.right > innerWidth + 1) nav.push('Next not in first viewport');
        if (!/^Next: .* →$/.test(nx.textContent.trim())) nav.push('Next label: ' + nx.textContent);
        const bg = getComputedStyle(nx).backgroundColor, fg = getComputedStyle(nx).color;
        if (bg === getComputedStyle(document.body).backgroundColor) nav.push('Next is not filled');
      }
    } else if (document.getElementById('prev').hidden) nav.push('Back to sheet missing on last detail');
    if (phone && getComputedStyle(nv).position !== 'fixed') nav.push('phone nav is not sticky');
    if (document.querySelectorAll('#nav .mk').length !== 4 || !document.querySelector('#nav .mk[aria-current="step"]')) nav.push('progress strip incomplete');
    const cue = document.getElementById('cue');
    const cueShown = !!(cue && cue.getClientRects().length);
    if (d === 0 && !cueShown) nav.push('Try it cue not shown on sheet 1');
    if (d > 0 && cueShown) nav.push('Try it cue shown on a detail sheet');
    if (d === 0) for (const b of document.querySelectorAll('.bub')) if (!b.querySelector('.open')) nav.push('bubble without Open label');
  }
  return {
    nav,
    emdash: /\u2014/.test(text),
    forbidden: (text.match(/compliance|\bPT\b|\ben\b.*\bes\b.*\bvi\b/i) || [])[0] || '',
    text,
    timey: (text.match(/\b\d+\s*(ms|seconds?|minutes?|hours?|days?|weeks?)\b|\bfaster\b|\bfast\b|\bquick(ly)?\b/i) || [])[0] || '',
    overflow: [...new Set(overflow)], clipped: [...new Set(clipped)], small: [...new Set(small)],
  };
};

async function shoot(ctxOpts, tag, query, fullPage, name) {
  if (only && !tag.includes(only)) return;
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  page.on('console', (m) => m.type() === 'error' && !/favicon|fonts\.g|net::ERR/.test(m.text()) && findings.push(`${tag}: console: ${m.text()}`));
  page.on('pageerror', (e) => findings.push(`${tag}: pageerror: ${e}`));
  await page.goto(file + query);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1400);
  const r = await page.evaluate(check);
  if (r.nav.length) findings.push(`${tag}: nav: ${r.nav.join('; ')}`);
  if (r.emdash) findings.push(`${tag}: U+2014 in visible text`);
  if (PRIVATE && PRIVATE.test(r.text)) findings.push(`${tag}: forbidden word (private list): ${r.text.match(PRIVATE)[0]}`);
  if (r.forbidden) findings.push(`${tag}: forbidden word: ${r.forbidden}`);
  if (r.timey) findings.push(`${tag}: time/speed wording: ${r.timey}`);
  if (r.overflow.length) findings.push(`${tag}: overflow ${r.overflow.slice(0, 8).join(', ')}`);
  if (r.clipped.length) findings.push(`${tag}: clipped ${r.clipped.slice(0, 8).join(' | ')}`);
  if (r.small.length) findings.push(`${tag}: plain text <16px: ${r.small.slice(0, 8).join(' | ')}`);
  await page.screenshot({ path: join(out, `o7-${name}.png`), fullPage });
  await ctx.close();
}

const sizes = [
  { w: 1440, h: 900, opts: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }, full: false },
  { w: 390, h: 844, opts: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, full: true },
];
for (const s of sizes) {
  for (const d of [0, 1, 2, 3]) {
    for (const hood of [0, 1]) {
      for (const scheme of ['light', 'dark']) {
        const sheet = d ? `d${d}` : 'sheet';
        const mode = hood ? 'hood' : 'plain';
        const tag = `${s.w}-${sheet}-${mode}-${scheme}`;
        await shoot(s.opts, tag, `?detail=${d}&hood=${hood}&scheme=${scheme}`, s.full, tag);
      }
    }
  }
}
// first-viewport shots (sticky bar / Try it cue / Next visible without scrolling)
for (const [d, scheme] of [[0, 'light'], [0, 'dark'], [1, 'light'], [3, 'light']]) {
  const phoneOpts = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
  await shoot(phoneOpts, `390-view-${d ? 'd' + d : 'sheet'}-${scheme}`, `?detail=${d}&scheme=${scheme}`, false, `390-view-${d ? 'd' + d : 'sheet'}-${scheme}`);
}
// interaction flow: Next, arrow keys, strip marks, Try it cue gone after first use
if (!only || 'flow'.includes(only)) {
  for (const [name, opts] of [['1440', { viewport: { width: 1440, height: 900 } }], ['390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }]]) {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    await page.goto(file + '?scheme=light');
    await page.waitForTimeout(600);
    const st = () => page.evaluate(() => ({ d: document.body.getAttribute('data-detail'), cue: !!document.getElementById('cue').getClientRects().length, next: document.getElementById('next').hidden ? '' : document.getElementById('next').textContent.trim() }));
    const exp = (cond, msg) => { if (!cond) findings.push(`flow-${name}: ${msg}`); };
    let s0 = await st(); exp(s0.d === '0' && s0.cue && s0.next === 'Next: Off is gone →', 'initial state ' + JSON.stringify(s0));
    await page.click('#next'); let s1 = await st(); exp(s1.d === '1' && !s1.cue && /What ordering needs/.test(s1.next), 'after Next ' + JSON.stringify(s1));
    await page.keyboard.press('ArrowRight'); let s2 = await st(); exp(s2.d === '2', 'ArrowRight -> ' + s2.d);
    await page.keyboard.press('ArrowRight'); let s3 = await st(); exp(s3.d === '3' && s3.next === '', 'ArrowRight to last ' + JSON.stringify(s3));
    await page.keyboard.press('ArrowLeft'); exp((await st()).d === '2', 'ArrowLeft');
    await page.click('#nav .mk[data-go="0"]'); let s4 = await st(); exp(s4.d === '0' && !s4.cue, 'strip mark to sheet; cue stays gone ' + JSON.stringify(s4));
    await ctx.close();
  }
}
// OG, 1200x627 (plain, both schemes)
for (const scheme of ['light', 'dark']) {
  const tag = `og-${scheme}`;
  await shoot({ viewport: { width: 1200, height: 627 }, deviceScaleFactor: 1 }, tag, `?og=1&scheme=${scheme}`, false, tag);
}
console.log(findings.length ? findings.join('\n') : 'no findings');
await browser.close();
