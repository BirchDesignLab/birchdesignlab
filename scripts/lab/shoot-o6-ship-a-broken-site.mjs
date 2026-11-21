// BDL-013 round 6: shoot every state of o6-ship-a-broken-site.html for review.
//
//   BDL_GPU=1 node scripts/lab/shoot-o6-ship-a-broken-site.mjs [WxH]
//
// Default runs both 1440x900 and 390x844. States are reached by URL params
// (?flaw=<k>&ship=1&hood=1&scheme=dark); ship=1 lands the end state with no
// motion, so shots are deterministic. Per size:
//   first frame, each flaw's caught state, and the clean ship, x plain/hood
//   x light/dark; plus each flaw picked (not shipped) in plain/light.
// Also shoots the 1200x627 OG frame (?og=1&flaw=secret&ship=1) to o6-1200x627-og-*.png.
// Also drives the real click flow once (pick, Ship, hold, Try another) and
// checks it lands in the same state as the URL-driven one.
// Writes docs/bdl-013/mockups/shots/o6-<W>-<state>-<plain|hood>-<scheme>.png
// (gitignored). Flags: console errors, U+2014 in visible text, overflow past
// the viewport, clipped text, Plain text under 16px, and (catch frames) the
// red lock and the sentence both fully inside the visible viewport.
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
let chromium;
for (const c of [join(root, 'package.json'), 'C:/git/birchdesignlab/package.json']) {
  try { ({ chromium } = createRequire(c)('playwright')); break; } catch {}
}
if (!chromium) throw new Error('playwright not found');

const sizes = process.argv[2] ? [process.argv[2]] : ['1440x900', '390x844'];
const file = pathToFileURL(join(root, 'docs', 'bdl-013', 'mockups', 'o6-ship-a-broken-site.html')).href;
const out = join(root, 'docs', 'bdl-013', 'mockups', 'shots');
await mkdir(out, { recursive: true });

const FLAWS = ['secret', 'booking', 'contrast', 'spanish', 'tests', 'links'];
const states = [
  { tag: 'first', qs: '' },
  ...FLAWS.map((f) => ({ tag: `caught-${f}`, qs: `flaw=${f}&ship=1`, caught: f })),
  { tag: 'clean', qs: 'ship=1', clean: true }
];

const args = ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'];
const browser = await chromium.launch({ args });
const findings = [];

async function ready(page) {
  await page.waitForFunction(() => document.documentElement.dataset.ready === '1');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(350);
}

// in-page checks; returns a list of problem strings
function audit({ w, h, caught, clean, shipped }) {
  const problems = [];
  const vw = innerWidth, vh = innerHeight;
  if (/\u2014/.test(document.body.innerText)) problems.push('emdash in visible text');
  const de = document.documentElement;
  if (de.scrollWidth > vw + 1) problems.push(`horizontal overflow: scrollWidth ${de.scrollWidth} > ${vw}`);
  if (w >= 900 && de.scrollHeight > vh + 1) problems.push(`vertical overflow on desktop: ${de.scrollHeight} > ${vh}`);
  const hood = document.body.classList.contains('hood');
  const siteEl = document.querySelector('#site');
  if (siteEl.scrollHeight > siteEl.clientHeight + 1) problems.push(`site card content overflows its card by ${siteEl.scrollHeight - siteEl.clientHeight}px`);
  const bad = [], clip = [], small = [];
  for (const e of document.querySelectorAll('.app *')) {
    if (e.closest('svg') || !e.getClientRects().length || e.closest('.site') || e.closest('.leaf')) continue;
    if (e.classList.contains('frame')) continue; // overflow hidden on purpose: the leaf swings inside it
    const r = e.getBoundingClientRect();
    if (r.width && r.right > vw + 1) bad.push((e.className || e.tagName) + ' right ' + Math.round(r.right));
    if (r.width && r.left < -1) bad.push((e.className || e.tagName) + ' left ' + Math.round(r.left));
    const cs = getComputedStyle(e);
    if (e.clientWidth && cs.overflow !== 'visible' && (e.scrollWidth > e.clientWidth + 2 || e.scrollHeight > e.clientHeight + 2)) clip.push(e.className || e.tagName);
    if (!hood && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) {
      const fs = parseFloat(cs.fontSize);
      if (fs < 16 && !e.closest('#ctrl') && !e.closest('#eyebrow') && !e.closest('.term')) small.push(e.textContent.trim().slice(0, 30) + ' ' + fs);
    }
  }
  if (bad.length) problems.push('past viewport: ' + [...new Set(bad)].join(', '));
  if (clip.length) problems.push('clipped: ' + [...new Set(clip)].join(', '));
  if (small.length) problems.push('plain text <16px: ' + [...new Set(small)].join(' | '));
  if (shipped) {
    const bar = w < 900 ? document.querySelector('.actions').getBoundingClientRect().top : vh;
    const inView = (el) => { const r = el.getBoundingClientRect(); return r.top >= -1 && r.bottom <= bar + 1; };
    // phone: the verdict block (or, after a clean ship, the end line) is what must be on screen
    const res = document.querySelector(w < 900 ? (clean ? '.rend' : '.rvw') : '#result');
    if (!inView(res)) problems.push('sentence not fully inside the visible viewport');
    if (caught) {
      const red = document.querySelector('.lock[data-s="bad"]');
      const reds = document.querySelectorAll('.lock[data-s="bad"]').length;
      if (reds !== 1) problems.push(`expected 1 red lock, got ${reds}`);
      else if (!inView(red)) problems.push('red lock not fully inside the visible viewport');
      // a failed assert-suite-ran stops the e2e job before check:links runs, so that lock is skipped, not green
      const okN = document.querySelectorAll('.lock[data-s="ok"]').length, skN = document.querySelectorAll('.lock[data-s="skip"]').length;
      const wantSkip = caught === 'tests' ? 1 : 0;
      if (skN !== wantSkip || okN !== 5 - wantSkip) problems.push(`locks: ${okN} green, ${skN} skipped (want ${5 - wantSkip}, ${wantSkip})`);
      if (getComputedStyle(document.querySelector('#site')).filter === 'none') problems.push('caught: docked site is not dimmed');
      if (document.querySelectorAll('.hole').length) problems.push('hole element left behind');
      if (document.querySelector('#door').classList.contains('open')) problems.push('door opened on a catch');
    }
    if (clean) {
      if (document.querySelectorAll('.lock[data-s="ok"]').length !== 6) problems.push('clean ship: expected 6 green locks');
      if (!document.querySelector('#door').classList.contains('open')) problems.push('clean ship: door not open');
    }
  }
  return problems;
}

for (const size of sizes) {
  const [width, height] = size.split('x').map(Number);
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  page.on('console', (m) => m.type() === 'error' && findings.push(`${width}: console: ${m.text()}`));
  page.on('pageerror', (e) => findings.push(`${width}: pageerror: ${e}`));

  const shoot = async (tag, qs, opts = {}) => {
    await page.goto(`${file}?${qs}`);
    await ready(page);
    const probs = await page.evaluate(audit, { w: width, h: height, ...opts });
    probs.forEach((p) => findings.push(`${width} ${tag}: ${p}`));
    await page.screenshot({ path: join(out, `o6-${width}-${tag}.png`) });
  };

  for (const st of states) {
    for (const hood of [0, 1]) {
      for (const scheme of ['light', 'dark']) {
        const qs = [st.qs, `hood=${hood}`, `scheme=${scheme}`].filter(Boolean).join('&');
        await shoot(`${st.tag}-${hood ? 'hood' : 'plain'}-${scheme}`, qs, { caught: st.caught || false, clean: !!st.clean, shipped: st.tag !== 'first' });
      }
    }
  }
  for (const f of FLAWS) await shoot(`picked-${f}-plain-light`, `flaw=${f}&scheme=light`, {});

  // phone: also the whole page, once, so the stack can be read top to bottom
  if (width < 900) {
    for (const [tag, qs] of [['first', 'scheme=light'], ['caught-secret', 'flaw=secret&ship=1&scheme=light'], ['caught-secret-hood', 'flaw=secret&ship=1&hood=1&scheme=light']]) {
      await page.goto(`${file}?${qs}`);
      await ready(page);
      await page.screenshot({ path: join(out, `o6-${width}-fullpage-${tag}.png`), fullPage: true });
    }
  }

  // real click flow: pick, Ship, hold, Try another. Must match the URL-driven end state.
  for (const hood of [0, 1]) {
    await page.goto(`${file}?hood=${hood}&scheme=light`);
    await ready(page);
    await page.click('.card[data-k="secret"]');
    await page.click('#go');
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(out, `o6-${width}-flow-mid-${hood ? 'hood' : 'plain'}-light.png`) });
    await page.waitForTimeout(1800);
    const flow = await page.evaluate(() => ({
      locks: [...document.querySelectorAll('.lock')].map((l) => l.dataset.s).join(','),
      open: document.querySelector('#door').classList.contains('open'),
      on: document.querySelector('#result').classList.contains('on'),
      label: document.querySelector('#go').textContent
    }));
    if (flow.locks !== 'bad,ok,ok,ok,ok,ok' || flow.open || !flow.on || flow.label !== 'Try another') findings.push(`${width} flow catch: ${JSON.stringify(flow)}`);
    const held = await page.evaluate(() => document.querySelector('#rv').textContent);
    await page.waitForTimeout(1500);
    if (held !== (await page.evaluate(() => document.querySelector('#rv').textContent))) findings.push(`${width} flow: state changed on its own`);
    await page.screenshot({ path: join(out, `o6-${width}-flow-held-${hood ? 'hood' : 'plain'}-light.png`) });
    await page.click('#go');
    await page.waitForTimeout(1500);
    const back = await page.evaluate(() => ({
      locks: [...document.querySelectorAll('.lock')].map((l) => l.dataset.s).join(','),
      on: document.querySelector('#result').classList.contains('on'),
      xf: document.querySelector('#site').style.transform,
      label: document.querySelector('#go').textContent,
      pressed: document.querySelectorAll('.card[aria-pressed="true"]').length,
      home: document.querySelector('#site').parentNode.classList.contains('slot')
    }));
    if (!back.home) findings.push(`${width} flow reset: site did not return to its place`);
    if (back.locks !== 'idle,idle,idle,idle,idle,idle' || back.on || back.xf || back.pressed !== 0 || back.label !== 'Ship it clean') findings.push(`${width} flow reset: ${JSON.stringify(back)}`);
    // clean ship by click
    await page.click('#go');
    await page.waitForTimeout(3200);
    const clean = await page.evaluate(() => ({
      locks: [...document.querySelectorAll('.lock')].map((l) => l.dataset.s).join(','),
      open: document.querySelector('#door').classList.contains('open')
    }));
    if (clean.locks !== 'ok,ok,ok,ok,ok,ok' || !clean.open) findings.push(`${width} flow clean: ${JSON.stringify(clean)}`);
  }
  await page.close();
}

// OG frame, 1200x627: headline, the held verdict, the dark door with one red lock
{
  const page = await browser.newPage({ viewport: { width: 1200, height: 627 }, deviceScaleFactor: 1 });
  page.on('console', (m) => m.type() === 'error' && findings.push(`og: console: ${m.text()}`));
  page.on('pageerror', (e) => findings.push(`og: pageerror: ${e}`));
  for (const [hood, scheme] of [[0, 'light'], [0, 'dark'], [1, 'light']]) {
    await page.goto(`${file}?og=1&flaw=secret&ship=1&hood=${hood}&scheme=${scheme}`);
    await ready(page);
    const tag = `og-${hood ? 'hood' : 'plain'}-${scheme}`;
    const probs = await page.evaluate(audit, { w: 1200, h: 627, caught: 'secret', clean: false, shipped: true });
    probs.forEach((p) => findings.push(`1200 ${tag}: ${p}`));
    await page.screenshot({ path: join(out, `o6-1200x627-${tag}.png`) });
  }
  await page.close();
}

console.log(findings.length ? findings.join('\n') : 'no findings');
await browser.close();
