// BDL-013 O2b (the spectrum) probe. Checks the mockup against the brief's rules:
//   - no computed border-radius above 0, except under [data-round]
//   - no U+2014 and none of the banned words in innerText or window.__copy,
//     sampled across the whole 26s loop in Plain and Under the hood, plus the
//     hover, pinned-ghost and source-switch states
//   - Under the hood and Day/Night toggles flip state and re-scan clean
//   - no horizontal scroll at 390x844
// Writes a screenshot of each state to docs/bdl-013/mockups/shots/o2b-probe-*.png
// and prints console errors. Exits 1 on any finding.
//
//   node scripts/lab/probe-o2b-spectrum.mjs [WxH:light|dark]   (no arg = all four passes)
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

const file = join(root, 'docs', 'bdl-013', 'mockups', 'o2b-spectrum.html');
if (!existsSync(file)) throw new Error(`no such mockup: ${file}`);
const out = join(root, 'docs', 'bdl-013', 'mockups', 'shots');
await mkdir(out, { recursive: true });

const EMDASH = /\u2014/;
const BANNED = new RegExp(String.raw`\b(${privateAlt()}framework|template|generator|scaffold\w*|boilerplate|spine)\b|create-client-site|sync-from-base|\.spine-version`, 'i');
const findings = [];
const errors = [];
const note = (m) => {
  findings.push(m);
  console.log('FAIL ' + m);
};

const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });

async function scan(page, label) {
  const r = await page.evaluate(() => ({
    text: document.body.innerText,
    copy: window.__copy || [],
    radius: [...document.querySelectorAll('*')]
      .filter((el) => !el.closest('[data-round]'))
      .filter((el) => {
        const cs = getComputedStyle(el);
        return ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius'].some(
          (k) => parseFloat(cs[k]) > 0,
        );
      })
      .map((el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className : '')),
    rects: [...document.querySelectorAll('svg rect')].filter((e) => parseFloat(e.getAttribute('rx') || 0) > 0).length,
    scheme: document.documentElement.getAttribute('data-scheme'),
    hood: document.body.classList.contains('hood'),
  }));
  if (r.radius.length) note(`${label}: border-radius > 0 on ${r.radius.slice(0, 6).join(', ')}`);
  if (r.rects) note(`${label}: svg rect with rx`);
  const all = [r.text, ...r.copy].join('\n');
  if (EMDASH.test(all)) note(`${label}: em dash in visible text`);
  const bad = all.match(BANNED);
  if (bad) note(`${label}: banned word "${bad[0]}"`);
  return r;
}

async function run(size, scheme) {
  const [width, height] = size.split('x').map(Number);
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, colorScheme: scheme });
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(pathToFileURL(file).href);
  await page.waitForTimeout(800);
  const tag = `${width}-${scheme}`;

  // default face follows prefers-color-scheme
  const dflt = await page.evaluate(() => document.documentElement.getAttribute('data-scheme'));
  if (dflt !== scheme) note(`${tag}: default data-scheme is ${dflt}, expected ${scheme}`);

  // sample the whole loop in Plain and Under the hood
  for (const mode of ['Plain English', 'Under the hood']) {
    await page.getByRole('button', { name: mode, exact: true }).click();
    await page.click('#replay');
    for (let s = 0; s < 26; s += 2) {
      await page.waitForTimeout(2000);
      await scan(page, `${tag} ${mode} t~${s + 2}s`);
    }
  }

  // toggles
  await page.click('#replay');
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: 'Plain English', exact: true }).click();
  await page.screenshot({ path: join(out, `o2b-probe-${tag}-plain.png`) });
  await page.getByRole('button', { name: 'Under the hood', exact: true }).click();
  const r1 = await scan(page, `${tag} hood toggle`);
  if (!r1.hood) note(`${tag}: Under the hood did not set the hood state`);
  await page.screenshot({ path: join(out, `o2b-probe-${tag}-hood.png`) });
  const other = scheme === 'light' ? 'Night' : 'Day';
  await page.getByRole('button', { name: other, exact: true }).click();
  const r2 = await scan(page, `${tag} ${other} toggle`);
  if (r2.scheme === scheme) note(`${tag}: Day/Night toggle did not flip data-scheme`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(out, `o2b-probe-${tag}-flipped.png`) });
  await page.getByRole('button', { name: other === 'Night' ? 'Day' : 'Night', exact: true }).click();

  // hover a band, pin a ghost, switch source
  for (const mode of ['Plain English', 'Under the hood']) {
    await page.getByRole('button', { name: mode, exact: true }).click();
    await page.click('#replay');
    // the source switch freezes the timeline at its settled frame (everything revealed), so hover targets stay put
    await page.getByRole('button', { name: 'Restaurant', exact: true }).click();
    await page.waitForTimeout(1500);
    const box = async (i) => {
      const b = await page.locator('#art rect[style*="cursor"]').nth(i).boundingBox();
      return { x: b.x + b.width / 2, y: b.y + Math.min(b.height / 2, 60) };
    };
    const m = mode === 'Plain English' ? 'plain' : 'hood';
    const p5 = await box(5);
    await page.mouse.move(p5.x, p5.y);
    await page.waitForTimeout(1500);
    await scan(page, `${tag} ${m} hover ordering`);
    await page.screenshot({ path: join(out, `o2b-probe-${tag}-${m}-hover-ordering.png`) });
    const p2 = await box(2);
    await page.mouse.move(p2.x, p2.y);
    await page.waitForTimeout(1500);
    await scan(page, `${tag} ${m} hover languages`);
    await page.mouse.move(2, 2); // let the lens settle before aiming at a ghost band
    await page.waitForTimeout(1500);
    const p9 = await box(9);
    await page.mouse.move(p9.x, p9.y);
    await page.mouse.click(p9.x, p9.y);
    await page.waitForTimeout(1500);
    await scan(page, `${tag} ${m} pinned ghost form`);
    await page.screenshot({ path: join(out, `o2b-probe-${tag}-${m}-ghost-form.png`) });
    await page.mouse.move(2, 2);
    await page.getByRole('button', { name: 'Salon', exact: true }).click();
    await page.waitForTimeout(1800);
    await scan(page, `${tag} ${m} salon switch`);
    await page.screenshot({ path: join(out, `o2b-probe-${tag}-${m}-salon.png`) });
    await page.getByRole('button', { name: 'Restaurant', exact: true }).click();
  }

  if (width <= 400) {
    const sw = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    if (sw[0] > sw[1]) note(`${tag}: horizontal scroll (${sw[0]} > ${sw[1]})`);
  }
  await page.close();
}

// optional filter, e.g. `node probe-o2b-spectrum.mjs 390x844:dark` to run one pass
const passes = [['1440x900', 'light'], ['1440x900', 'dark'], ['390x844', 'light'], ['390x844', 'dark']];
const only = process.argv[2];
for (const [size, scheme] of passes) {
  if (only && only !== `${size}:${scheme}`) continue;
  await run(size, scheme);
}
await browser.close();

console.log(errors.length ? `CONSOLE ERRORS:\n${errors.join('\n')}` : 'no console errors');
if (findings.length || errors.length) {
  console.log(`\n${findings.length} finding(s)`);
  process.exit(1);
}
console.log('clean');
