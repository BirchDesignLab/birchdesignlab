// BDL-013 O1a probe: house-rule checks for docs/bdl-013/mockups/o1a-socket-rail.html.
//
//   node scripts/lab/probe-o1a-socket-rail.mjs [WxH]
//
// For each state (Plain/Day, Plain/Night, Hood/Night, Hood/Day) it:
//   - fails on any element whose computed border-radius is above 0 unless [data-round]
//   - scans innerText plus window.__copy for U+2014 and the banned words
//   - flips the Under the hood and Day/Night controls and asserts data-scheme follows
//   - screenshots the state to docs/bdl-013/mockups/shots/probe-o1a-*.png
// and prints console errors. Exit code 1 on any failure. Playwright lookup is
// copied from shoot-bdl-013-mockups.mjs.
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { privateAlt } from './lib/private-words.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const candidates = [join(root, 'package.json'), 'C:/git/birchdesignlab/package.json'];
let chromium;
for (const c of candidates) {
  try {
    ({ chromium } = createRequire(c)('playwright'));
    break;
  } catch {}
}
if (!chromium) throw new Error('playwright not found in this checkout or C:/git/birchdesignlab');

const size = process.argv[2] || '1440x900';
const [width, height] = size.split('x').map(Number);
const file = join(root, 'docs', 'bdl-013', 'mockups', 'o1a-socket-rail.html');
if (!existsSync(file)) throw new Error(`no such mockup: ${file}`);
const out = join(root, 'docs', 'bdl-013', 'mockups', 'shots');
await mkdir(out, { recursive: true });

const EMDASH = String.fromCharCode(8212);
const BANNED = new RegExp('(^|[^A-Za-z])(' + privateAlt() + 'framework|template|generator|scaffold[a-z]*|boilerplate|spine)([^A-Za-z]|$)', 'i');
const failures = [];
const fail = (m) => { failures.push(m); console.log('FAIL: ' + m); };

const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, colorScheme: 'light' });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(pathToFileURL(file).href);
await page.waitForTimeout(600);

async function scan(label) {
  const r = await page.evaluate(() => {
    const bad = [];
    for (const el of document.querySelectorAll('*')) {
      if (el.closest('[data-round]')) continue;
      const cs = getComputedStyle(el);
      for (const p of ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius']) {
        if (parseFloat(cs[p]) > 0) { bad.push(el.tagName + '.' + (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className) + ' ' + p + '=' + cs[p]); break; }
      }
    }
    return { bad, text: document.body.innerText, copy: (window.__copy || []).join('\n'), scheme: document.documentElement.getAttribute('data-scheme') };
  });
  if (r.bad.length) fail(`${label}: border-radius above 0 on ${r.bad.slice(0, 5).join(' | ')}`);
  for (const [src, txt] of [['innerText', r.text], ['__copy', r.copy]]) {
    if (txt.includes(EMDASH)) fail(`${label}: U+2014 in ${src}`);
    const m = txt.match(BANNED);
    if (m) fail(`${label}: banned word "${m[2]}" in ${src}`);
  }
  console.log(`ok ${label}: scheme=${r.scheme}, copy strings=${r.copy ? r.copy.split('\n').length : 0}`);
  return r.scheme;
}
async function shot(name) {
  const p = join(out, `probe-o1a-${width}-${name}.png`);
  await page.screenshot({ path: p });
  console.log(p);
}
const scheme = () => page.evaluate(() => document.documentElement.getAttribute('data-scheme'));
// The page has no seek hook by design: replay and wait in real time between scans.
async function realtimeScan(label) {
  await page.click('#replay');
  const t0 = Date.now();
  for (const ms of [500, 3000, 7000, 11000, 14500, 20500, 23500]) {
    const wait = ms - (Date.now() - t0);
    if (wait > 0) await page.waitForTimeout(wait);
    await scan(`${label} @${ms}`);
    if (ms === 11000) await shot(label.replace(/[^a-z0-9]+/gi, '-') + '-11000');
  }
}

const s0 = await scheme();
console.log('initial scheme (prefers light):', s0);
if (s0 !== 'light') fail('default scheme should follow prefers-color-scheme (light)');

// state 1: Plain / Day
await realtimeScan('plain-day');

// click test: a ghost dock opens an empty manifest form with six blank fields
{
  await page.click('#replay');
  await page.waitForTimeout(13400);
  const hit = await page.evaluate(() => {
    const h = (window.__hits || [])[0];
    if (!h) return null;
    const g = document.getElementById('stage').getBoundingClientRect();
    const x = h.pts.reduce((a, p) => a + p[0], 0) / h.pts.length + g.left;
    const y = h.pts.reduce((a, p) => a + p[1], 0) / h.pts.length + g.top;
    return { x, y, i: h.i };
  });
  if (!hit) fail('no ghost dock hit region at 13.4s');
  else {
    await page.mouse.click(hit.x, hit.y);
    await page.waitForTimeout(150);
    const f = await page.evaluate(() => {
      const el = document.getElementById('mform');
      return { shown: getComputedStyle(el).display !== 'none', blanks: el.querySelectorAll('.fb').length, text: el.innerText };
    });
    if (!f.shown || f.blanks !== 6) fail(`ghost click: form shown=${f.shown} blanks=${f.blanks}`);
    else console.log('ok ghost click opens the empty manifest form (6 blank fields)');
    await scan('manifest-form-open');
    await shot('manifest-form-open');
    await page.click('#fclose');
  }
}

// state 2: flip Day/Night
await page.click('#f-dark');
if ((await scheme()) !== 'dark') fail('Night toggle did not set data-scheme=dark');
await scan('plain-night');
await shot('plain-night-after-flip');
// state 3: Under the hood in Night, full realtime scan
await page.click('#m-tech');
if (!(await page.evaluate(() => document.body.classList.contains('tech')))) fail('Under the hood did not engage');
await realtimeScan('hood-night');
// state 4: back to Day under the hood
await page.click('#f-light');
if ((await scheme()) !== 'light') fail('Day toggle did not set data-scheme=light');
await scan('hood-day');
await shot('hood-day-after-flip');
// plain again
await page.click('#m-plain');
await scan('plain-day-again');

const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
if (overflow) fail('horizontal overflow');

console.log(errors.length ? `CONSOLE ERRORS:\n${errors.join('\n')}` : 'no console errors');
if (errors.length) failures.push('console errors');
await browser.close();
console.log(failures.length ? `\n${failures.length} FAILURE(S)` : '\nall clean');
process.exit(failures.length ? 1 : 0);
