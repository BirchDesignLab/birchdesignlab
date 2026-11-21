// BDL-013 round 6: shoot every state of o5b-framework.html for review.
//
//   BDL_GPU=1 node scripts/lab/shoot-o5b-framework.mjs [WxH ...]
//
// Default sizes: 1440x900 (desktop stage) and 390x844 (phone, deviceScaleFactor
// 2, full-page). 5 chapters x Plain/Under the hood x Day/Night, reached by URL
// params (?ch=N&hood=1&scheme=dark), each held 2.5 s so the one move per
// chapter lands. Chapters 2, 4 and 5 are interactive: ch2 and ch5 get an "-end"
// shot after the visitor's own click (switch ordering off, send the fix); ch4
// plays itself, so it gets "-mid" (3 checks) and "-end" (deploy lit), and the
// script asserts the run completes on its own. Each Try it cue and button must
// be in the first viewport, the button at least 44px tall. Writes
// docs/bdl-013/mockups/shots/o5b-<W>-ch<N>-<plain|hood>-<scheme>[-end].png
// (gitignored). Flags: console errors, U+2014 in visible text, horizontal
// overflow (past the 1440x900 stage, or past the phone viewport), clipped text,
// and Plain text under 16px at its rendered size.
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

// `og` as the only argument shoots just the poster
const args = process.argv.slice(2);
const sizes = (args.includes('og') ? [] : args.length ? args : ['1440x900', '390x844']).map((s) => s.split('x').map(Number));
const dsfPhone = +(process.env.DSF || 2);
const file = pathToFileURL(join(root, 'docs', 'bdl-013', 'mockups', 'o5b-framework.html')).href;
const out = join(root, 'docs', 'bdl-013', 'mockups', 'shots');
await mkdir(out, { recursive: true });

const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const findings = [];

// Interactive chapters. ch2 and ch5 wait for the visitor's click ('' = before,
// '-end' = after). ch4 plays itself: '-mid' is the shot after 3 checks, '-end'
// is after deploy lights; both are waited for, which also asserts the run
// completes on its own.
const plan = { 2: ['', '-end'], 4: ['-mid', '-end'], 5: ['', '-end'] };
const act = {
  2: { '-end': async (page) => { await page.click('#ordBtn'); await page.waitForTimeout(1600); } },
  4: {
    '-mid': async (page) => { await page.waitForFunction(() => /Running check 4 of 7/.test(document.getElementById('gstat').textContent), null, { timeout: 20000 }); },
    '-end': async (page) => {
      await page.waitForFunction(() => document.getElementById('dep').classList.contains('lit') && document.querySelectorAll('.gate.lit').length === 7 && document.querySelector('.runp').classList.contains('done'), null, { timeout: 30000 });
      await page.waitForTimeout(600);
    },
  },
  5: { '-end': async (page) => { await page.click('#sendFix'); await page.waitForTimeout(4600); } },
};

// the "Try it" signifier: cue and button in the first viewport, button at least 44px tall
async function checkTry(page, t, state) {
  const r = await page.evaluate(() => {
    const on = document.querySelector('.ch.on');
    const box = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom, h: b.height, shown: getComputedStyle(e).display !== 'none' && b.width > 0 }; };
    const btn = on.querySelector('.try-btn');
    const cue = on.querySelector('.cue');
    return { btn: box(btn), cue: box(cue), w: innerWidth, h: innerHeight, ch: +on.dataset.ch, dep: !!document.querySelector('.dep.lit'), lit: document.querySelectorAll('.gate.lit').length, running: document.querySelectorAll('.gate.run').length, stat: (document.getElementById('gstat') || {}).textContent, text: on.innerText };
  });
  const inView = (b) => b && b.l >= -1 && b.r <= r.w + 1 && b.t >= -1 && b.b <= r.h + 1;
  if (r.ch === 4) {
    if (state === '-mid') {
      if (r.dep) findings.push(t + ': deploy lit before the last check');
      if (r.lit !== 3 || r.running !== 1) findings.push(t + ': ch4 mid expected 3 lit and 1 running, got ' + r.lit + ' / ' + r.running);
    }
    if (state === '-end') {
      if (!/7 of 7 passed/.test(r.stat)) findings.push(t + ': ch4 counter reads "' + r.stat + '"');
      if (r.lit !== 7 || !r.dep) findings.push(t + ': ch4 run did not finish (' + r.lit + ' lit, deploy ' + r.dep + ')');
      if (!r.btn || r.btn.h < 43.5) findings.push(t + ': run-again button missing or under 44px');
    }
    return;
  }
  if (state === '' && r.ch === 5 && /Updated|Merged|patch applied|merge-file, clean/.test(r.text)) findings.push(t + ': ch5 already says Updated/Merged before the fix is sent');
  if (state === '') {
    if (!r.btn || !r.cue) { findings.push(t + ': missing Try it cue or button'); return; }
    if (!inView(r.btn)) findings.push(t + ': button not in viewport ' + JSON.stringify(r.btn));
    if (!r.cue.shown || !inView(r.cue)) findings.push(t + ': cue not shown in viewport ' + JSON.stringify(r.cue));
    if (r.btn.h < 43.5) findings.push(t + ': button under 44px (' + r.btn.h + ')');
  } else if (r.cue && r.cue.shown) findings.push(t + ': cue still shown after the control was used');
}

async function check(page, tag, mobile) {
  return page.evaluate((mobile) => {
    const on = document.querySelector('.ch.on');
    const hoodMode = document.body.classList.contains('hood');
    const els = [...document.querySelectorAll('#head *'), ...on.querySelectorAll('*')].filter((e) => e.offsetParent !== null || e.closest('svg'));
    const emdash = /\u2014/.test(document.getElementById('head').innerText + on.innerText);
    const st = document.getElementById('stage').getBoundingClientRect();
    const s = mobile ? 1 : st.width / 1440;
    const overflow = [];
    const small = [];
    for (const e of els) {
      if (e.closest('svg') || !e.getClientRects().length) continue;
      const b = e.getBoundingClientRect();
      if (e.closest('.shot')) { // cropped screenshot, by design
      } else if (mobile) {
        if (b.right > innerWidth + 1 && !e.closest('.code')) overflow.push((e.className || e.tagName) + '@' + Math.round(b.right));
      } else if ((b.right - st.left) / s > 1441 || (b.bottom - st.top) / s > 901) overflow.push(e.className || e.tagName);
      if (!e.closest('.shot') && !e.closest('.code') && e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflow !== 'visible' && e.clientWidth) overflow.push('clip:' + (e.className || e.tagName));
      if (!hoodMode && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) {
        const fs = parseFloat(getComputedStyle(e).fontSize) * s;
        if (fs < 15.95 && !e.closest('.mock') && !e.closest('.try-btn') && !e.closest('.cue') && !e.closest('#ctrl') && !e.closest('#nav') && !e.closest('.chip') && !e.closest('.nmtag') && !e.closest('.links a small')) small.push(e.textContent.trim().slice(0, 30) + ' ' + fs.toFixed(1));
      }
    }
    if (mobile && document.documentElement.scrollWidth > innerWidth + 1) overflow.push('page scrollWidth ' + document.documentElement.scrollWidth);
    return { emdash, overflow: [...new Set(overflow)], small: [...new Set(small)] };
  }, mobile);
}

for (const [width, height] of sizes) {
  const mobile = width <= 720;
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: mobile ? dsfPhone : 1, isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage();
  page.on('console', (m) => m.type() === 'error' && findings.push(`${width}: console: ` + m.text()));
  page.on('pageerror', (e) => findings.push(`${width}: pageerror: ` + e));
  page.on('requestfailed', (r) => { if (!/fonts\.(googleapis|gstatic)/.test(r.url())) findings.push(`${width}: request failed ${r.url()}`); });

  for (let ch = 1; ch <= 5; ch++) {
    for (const hood of [0, 1]) {
      for (const scheme of ['light', 'dark']) {
        await page.goto(`${file}?ch=${ch}&hood=${hood}&scheme=${scheme}`);
        await page.waitForTimeout(2500);
        const tag = `${width}-ch${ch}-${hood ? 'hood' : 'plain'}-${scheme}`;
        for (const state of plan[ch] || ['']) {
          const t = tag + state;
          try { if (act[ch] && act[ch][state]) await act[ch][state](page); } catch (e) { findings.push(t + ': ' + String(e).split('\n')[0]); }
          if (plan[ch]) await checkTry(page, t, state);
          const r = await check(page, tag, mobile);
          if (r.emdash) findings.push(`${t}: emdash in visible text`);
          if (r.overflow.length) findings.push(`${t}: overflow ${r.overflow.join(', ')}`);
          if (r.small.length) findings.push(`${t}: plain text <16px: ${r.small.join(' | ')}`);
          await page.screenshot({ path: join(out, `o5b-${t}.png`), fullPage: mobile });
        }
      }
    }
  }
  await ctx.close();
}
// the 1200x627 poster (?og=1): headline plus the ch3 "0"
{
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 627 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('console', (m) => m.type() === 'error' && findings.push('og: console: ' + m.text()));
  page.on('pageerror', (e) => findings.push('og: pageerror: ' + e));
  for (const scheme of ['light', 'dark']) {
    await page.goto(`${file}?og=1&scheme=${scheme}`);
    await page.waitForTimeout(1500);
    const r = await page.evaluate(() => {
      const og = document.getElementById('og');
      const bad = [...og.querySelectorAll('*')].filter((e) => { const b = e.getBoundingClientRect(); return b.right > 1201 || b.bottom > 628 || b.left < -1; }).map((e) => e.className || e.tagName);
      return { emdash: /—/.test(og.innerText), bad, size: [og.offsetWidth, og.offsetHeight] };
    });
    if (r.emdash) findings.push(`og-${scheme}: emdash`);
    if (r.bad.length) findings.push(`og-${scheme}: outside poster ${r.bad.join(', ')}`);
    await page.screenshot({ path: join(out, `o5b-og-${scheme}.png`) });
  }
  await ctx.close();
}
console.log(findings.length ? findings.join('\n') : 'no findings');
await browser.close();
