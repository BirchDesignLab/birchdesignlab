// BDL-013 O1b probe: structural checks on docs/bdl-013/mockups/o1b-pick-and-place.html.
//
//   node scripts/lab/probe-o1b-pick-and-place.mjs
//
// Fails (exit 1) on: any computed border-radius above 0 unless inside [data-round];
// an emdash (U+2014) or a banned word in innerText, textContent or window.__copyAll()
// (every string the canvas can draw, both modes); a Day/Night toggle that does not flip
// data-scheme; horizontal scroll at 390x844; any console error. Screenshots each state
// into docs/bdl-013/mockups/shots/probe-o1b-*.png. Playwright lookup mirrors the shoot script.
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

const file = join(root, 'docs', 'bdl-013', 'mockups', 'o1b-pick-and-place.html');
if (!existsSync(file)) throw new Error(`no such mockup: ${file}`);
const out = join(root, 'docs', 'bdl-013', 'mockups', 'shots');
await mkdir(out, { recursive: true });

const BANNED = new RegExp(String.raw`\b(${privateAlt()}framework|template|generator|scaffold\w*|boilerplate|spine)\b`, 'i');
const EMDASH = /\u2014/;
const problems = [];
const errors = [];
const fail = (m) => problems.push(m);

async function scan(page, label) {
  const { inner, text, copy } = await page.evaluate(() => ({
    inner: document.body.innerText,
    text: document.body.textContent,
    copy: [...(window.__copyAll ? window.__copyAll() : []), ...(window.__copy || [])],
  }));
  const hay = [['innerText', inner], ['textContent', text], ...copy.map((s) => ['__copy', s])];
  for (const [src, s] of hay) {
    if (EMDASH.test(s)) fail(`${label}: emdash in ${src}: ${s.slice(0, 80)}`);
    const m = s.match(BANNED);
    if (m) fail(`${label}: banned word "${m[0]}" in ${src}: ${s.slice(0, 80)}`);
  }
  return copy.length;
}

async function radii(page, label) {
  const bad = await page.evaluate(() => {
    const res = [];
    for (const el of document.querySelectorAll('*')) {
      if (el.closest('[data-round]')) continue;
      const cs = getComputedStyle(el);
      for (const k of ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius']) {
        const v = cs[k];
        if (v && parseFloat(v) > 0) res.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${el.className} ${k}=${v}`);
      }
    }
    return res;
  });
  bad.forEach((b) => fail(`${label}: radius ${b}`));
}

const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1, colorScheme: 'dark' });
  page.on('console', (m) => m.type() === 'error' && errors.push(`[${w}] ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`[${w}] ${String(e)}`));
  await page.goto(pathToFileURL(file).href);
  await page.waitForTimeout(800);

  const tag = (s) => join(out, `probe-o1b-${w}-${s}.png`);
  const scheme = () => page.evaluate(() => document.documentElement.dataset.scheme);

  let n = await scan(page, `${w} dark plain`);
  console.log(`[${w}] strings scanned (copy): ${n}`);
  await radii(page, `${w} dark plain`);
  await page.screenshot({ path: tag('dark-plain') });

  await page.click('#m-tech');
  await page.waitForTimeout(400);
  if (!(await page.evaluate(() => document.body.classList.contains('tech')))) fail(`${w}: Under the hood did not engage`);
  await scan(page, `${w} dark hood`);
  await radii(page, `${w} dark hood`);
  await page.screenshot({ path: tag('dark-hood') });

  const before = await scheme();
  await page.click('#f-light');
  await page.waitForTimeout(400);
  const after = await scheme();
  if (before !== 'dark' || after !== 'light') fail(`${w}: Day toggle ${before} -> ${after}`);
  await scan(page, `${w} light hood`);
  await radii(page, `${w} light hood`);
  await page.screenshot({ path: tag('light-hood') });

  await page.click('#m-plain');
  await page.waitForTimeout(400);
  await scan(page, `${w} light plain`);
  await page.screenshot({ path: tag('light-plain') });

  await page.click('#f-dark');
  await page.waitForTimeout(400);
  if ((await scheme()) !== 'dark') fail(`${w}: Night toggle did not flip back`);

  // ghost click opens the empty manifest form (six blank fields)
  await page.evaluate(() => window.__seek(13.5));
  await page.waitForTimeout(500);
  const box = await page.locator('#cv').boundingBox();
  const g = (await page.evaluate(() => window.__hits())).find((h) => h.id.startsWith('idea:'));
  if (!g) fail(`${w}: no ghost footprint hit region at 13.5s`);
  else {
    await page.mouse.click(box.x + g.x, box.y + g.y);
    await page.waitForTimeout(300);
    const n = await page.evaluate(() => (document.querySelector('#form').hidden ? -1 : document.querySelectorAll('#form input').length));
    if (n !== 6) fail(`${w}: ghost click did not open a six-field form (got ${n})`);
    await scan(page, `${w} form open`);
    await page.screenshot({ path: tag('form') });
    await page.click('#fclose');
  }
  await radii(page, `${w} after toggles`);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 0) fail(`${w}: horizontal overflow ${overflow}px`);
  await page.close();
}
await browser.close();

console.log(errors.length ? `CONSOLE ERRORS:\n${errors.join('\n')}` : 'no console errors');
if (errors.length) problems.push('console errors present');
if (problems.length) {
  console.log(`FAIL (${problems.length}):\n${problems.join('\n')}`);
  process.exit(1);
}
console.log('probe clean: radii, emdash and banned words, toggles, overflow');
