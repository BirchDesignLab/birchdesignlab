// BDL-013 round 5: shoot every state of o5-framework.html for review.
//
//   node scripts/lab/shoot-o5-framework.mjs [WxH]
//
// 5 chapters x Plain/Under the hood x Day/Night, reached by URL params
// (?ch=N&hood=1&scheme=dark), each held 2.5 s so the one move per chapter
// lands. Writes docs/bdl-013/mockups/shots/o5-<W>-ch<N>-<plain|hood>-<scheme>.png
// (gitignored). Flags: console errors, U+2014 in visible text, horizontal
// overflow of any element past the 1440x900 stage, and Plain text under 16px.
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

const [width, height] = (process.argv[2] || '1440x900').split('x').map(Number);
const file = pathToFileURL(join(root, 'docs', 'bdl-013', 'mockups', 'o5-framework.html')).href;
const out = join(root, 'docs', 'bdl-013', 'mockups', 'shots');
await mkdir(out, { recursive: true });

const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
const findings = [];
page.on('console', (m) => m.type() === 'error' && findings.push('console: ' + m.text()));
page.on('pageerror', (e) => findings.push('pageerror: ' + e));

for (let ch = 1; ch <= 5; ch++) {
  for (const hood of [0, 1]) {
    for (const scheme of ['light', 'dark']) {
      await page.goto(`${file}?ch=${ch}&hood=${hood}&scheme=${scheme}`);
      await page.waitForTimeout(2500);
      const tag = `ch${ch}-${hood ? 'hood' : 'plain'}-${scheme}`;
      const r = await page.evaluate(() => {
        const on = document.querySelector('.ch.on');
        const els = [...document.querySelectorAll('#head *'), ...on.querySelectorAll('*')].filter((e) => e.offsetParent !== null || e.closest('svg'));
        const emdash = /\u2014/.test(document.getElementById('head').innerText + on.innerText);
        const overflow = [];
        const small = [];
        const hood = document.body.classList.contains('hood');
        for (const e of els) {
          if (e.closest('svg') || !e.getClientRects().length) continue;
          const b = e.getBoundingClientRect(), st = document.getElementById('stage').getBoundingClientRect();
          const s = st.width / 1440;
          if ((b.right - st.left) / s > 1441 || (b.bottom - st.top) / s > 901) overflow.push(e.className || e.tagName);
          // text clipped inside its box
          if (e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflow !== 'visible' && e.clientWidth) overflow.push('clip:' + (e.className || e.tagName));
          if (!hood && e.childNodes.length && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) {
            const fs = parseFloat(getComputedStyle(e).fontSize);
            if (fs < 16 && !e.closest('.site') && !e.closest('#ctrl') && !e.closest('#nav') && !e.closest('.chip')) small.push(e.textContent.trim().slice(0, 30) + ' ' + fs);
          }
        }
        return { emdash, overflow: [...new Set(overflow)], small: [...new Set(small)] };
      });
      if (r.emdash) findings.push(`${tag}: emdash in visible text`);
      if (r.overflow.length) findings.push(`${tag}: overflow ${r.overflow.join(', ')}`);
      if (r.small.length) findings.push(`${tag}: plain text <16px: ${r.small.join(' | ')}`);
      await page.screenshot({ path: join(out, `o5-${width}-${tag}.png`) });
    }
  }
}
console.log(findings.length ? findings.join('\n') : 'no findings');
await browser.close();
