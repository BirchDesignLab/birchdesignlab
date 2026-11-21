// BDL-013 O2a probe: structural checks on docs/bdl-013/mockups/o2a-socket-drawer.html.
//
//   node scripts/lab/probe-o2a-socket-drawer.mjs
//
// For each face (Day, Night) at 1440x900, and again at 390x844 (Night):
//   - fails on any element with a computed border-radius above 0 unless it is [data-round]
//   - scans innerText plus window.__copy for U+2014 and the forbidden words
//   - clicks Under the hood, asserts the copy changed, re-scans, screenshots
//   - clicks Day/Night, asserts data-scheme flips, re-scans, screenshots
//   - prints console errors, and a horizontal-overflow check at 390
// Screenshots land in docs/bdl-013/mockups/shots/o2a-probe-*.png. Exit code 1 on any failure.
// Playwright comes from this checkout's node_modules, or from the main checkout's when run in a worktree.
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
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

const file = join(root, 'docs', 'bdl-013', 'mockups', 'o2a-socket-drawer.html');
const out = join(root, 'docs', 'bdl-013', 'mockups', 'shots');
await mkdir(out, { recursive: true });

const BAD = new RegExp(String.raw`\b(${privateAlt()}framework|template|generator|scaffold\w*|boilerplate|spine)\b`, 'i');
const EXTRA = /create-client-site|sync-from-base|\.spine-version/;
let failures = 0;
const fail = (m) => { failures++; console.log('FAIL: ' + m); };

async function scan(page, label) {
  const r = await page.evaluate(() => {
    const radii = [];
    for (const el of document.querySelectorAll('body *')) {
      if (el.hasAttribute('data-round')) continue;
      const cs = getComputedStyle(el);
      for (const p of ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius']) {
        if (parseFloat(cs[p]) > 0) { radii.push(el.tagName + '.' + el.className + ' ' + p + '=' + cs[p]); break; }
      }
    }
    const text = document.body.innerText + '\n' + (window.__copy || []).join('\n');
    return { radii, text, copyLen: (window.__copy || []).length };
  });
  if (r.radii.length) fail(`${label}: ${r.radii.length} element(s) with border-radius above 0, first: ${r.radii.slice(0, 3).join(' | ')}`);
  if (r.text.includes('\u2014')) fail(`${label}: emdash found`);
  const m = r.text.match(BAD) || r.text.match(EXTRA);
  if (m) fail(`${label}: forbidden word "${m[0]}"`);
  if (!r.copyLen) fail(`${label}: window.__copy is empty`);
  return r;
}

const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });

async function run(width, height, scheme) {
  const tag = `${width}-${scheme}`;
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, colorScheme: scheme });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(pathToFileURL(file).href);
  await page.waitForTimeout(1800);

  const start = await page.evaluate(() => document.documentElement.getAttribute('data-scheme'));
  const want = scheme === 'light' ? 'light' : 'dark';
  if (start !== want) fail(`${tag}: default data-scheme is ${start}, expected ${want} from prefers-color-scheme`);
  const plain = await scan(page, `${tag} plain`);
  await page.screenshot({ path: join(out, `o2a-probe-${tag}-plain.png`) });

  // Under the hood
  await page.click('button[data-m="hood"]');
  await page.waitForTimeout(700);
  const hood = await scan(page, `${tag} hood`);
  if (hood.text === plain.text) fail(`${tag}: Under the hood did not change the copy`);
  if (!/modules\.generated\.ts/.test(hood.text)) fail(`${tag}: hood copy missing the manifest chain`);
  await page.click('#replay');
  await page.waitForTimeout(4600);
  await page.screenshot({ path: join(out, `o2a-probe-${tag}-hood.png`) });
  await page.click('#replay');
  await page.waitForTimeout(12200);
  await page.screenshot({ path: join(out, `o2a-probe-${tag}-hood-request.png`) });

  // Day / Night flip, in hood and then back in plain
  const flip = scheme === 'light' ? 'dark' : 'light';
  await page.click(`button[data-s="${flip}"]`);
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => document.documentElement.getAttribute('data-scheme'));
  if (after !== flip) fail(`${tag}: data-scheme did not flip to ${flip} (is ${after})`);
  await scan(page, `${tag} hood after flip`);
  await page.screenshot({ path: join(out, `o2a-probe-${tag}-hood-${flip}.png`) });
  await page.click('button[data-m="plain"]');
  await page.waitForTimeout(500);
  await scan(page, `${tag} plain after flip`);
  await page.screenshot({ path: join(out, `o2a-probe-${tag}-plain-${flip}.png`) });

  if (width < 820) {
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (over > 0) fail(`${tag}: horizontal overflow of ${over}px`);
    await page.screenshot({ path: join(out, `o2a-probe-${tag}-full.png`), fullPage: true });
  }
  if (errors.length) fail(`${tag}: console errors:\n  ${errors.join('\n  ')}`);
  else console.log(`${tag}: no console errors`);
  await page.close();
}

await run(1440, 900, 'light');
await run(1440, 900, 'dark');
await run(390, 844, 'dark');
await run(390, 844, 'light');
await browser.close();
console.log(failures ? `${failures} failure(s)` : 'probe clean');
process.exit(failures ? 1 : 0);
