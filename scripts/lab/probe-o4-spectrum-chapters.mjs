// BDL-013 round 4 probe: o4-spectrum-chapters.html (the spectrum, in chapters).
// The page waits for the visitor, so every shot is reached by clicking Next
// (or a chapter mark). Checks the brief's rules:
//   - no computed border-radius above 0, except under [data-round]
//   - no U+2014 and none of the banned words in innerText or window.__copy
//   - Next / Back / progress marks / arrow keys move the chapter; Play advances,
//     then stops on the next click; Under the hood and Day/Night flip state
//   - Plain headline and sub text is 16px or larger
//   - no horizontal scroll at 390x844; swipe left/right advances on mobile
//   - no console errors
// Writes shots to docs/bdl-013/mockups/shots/o4-*.png. Exits 1 on any finding.
//
//   node scripts/lab/probe-o4-spectrum-chapters.mjs [WxH:light|dark]   (no arg = all passes)
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

const file = join(root, 'docs', 'bdl-013', 'mockups', 'o4-spectrum-chapters.html');
if (!existsSync(file)) throw new Error(`no such mockup: ${file}`);
const out = join(root, 'docs', 'bdl-013', 'mockups', 'shots');
await mkdir(out, { recursive: true });

const EMDASH = /\u2014/;
const BANNED = new RegExp(String.raw`\b(${privateAlt()}framework|template|generator|scaffold\w*|boilerplate|spine|compliance)\b|create-client-site|sync-from-base|\.spine-version`, 'i');
const findings = [];
const errors = [];
const note = (m) => {
  findings.push(m);
  console.log('FAIL ' + m);
};

const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const SETTLE = 1500; // one move is 1.1s; wait it out

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
      .map((el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '')),
    rx: [...document.querySelectorAll('svg rect')].filter((e) => parseFloat(e.getAttribute('rx') || 0) > 0).length,
    scheme: document.documentElement.getAttribute('data-scheme'),
    state: window.__state,
  }));
  if (r.radius.length) note(`${label}: border-radius > 0 on ${r.radius.slice(0, 6).join(', ')}`);
  if (r.rx) note(`${label}: svg rect with rx`);
  const all = [r.text, ...r.copy].join('\n');
  if (EMDASH.test(all)) note(`${label}: em dash in visible text`);
  const bad = all.match(BANNED);
  if (bad) note(`${label}: banned word "${bad[0]}"`);
  return r;
}
async function fontCheck(page, label) {
  const sizes = await page.evaluate(() => {
    const a = parseFloat(getComputedStyle(document.querySelector('#h1')).fontSize);
    const ps = [...document.querySelectorAll('#sub p:not(.mn)')].map((p) => parseFloat(getComputedStyle(p).fontSize));
    return { h: a, p: ps };
  });
  if (sizes.h < 16) note(`${label}: headline ${sizes.h}px`);
  for (const p of sizes.p) if (p < 16) note(`${label}: plain sub ${p}px`);
}
const chapter = (page) => page.evaluate(() => window.__state.ch);
const step = (page) => page.evaluate(() => window.__state.step);

async function run(size, scheme) {
  const [width, height] = size.split('x').map(Number);
  const mobile = width < 800;
  const poster = width === 1200;
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, colorScheme: scheme, hasTouch: mobile });
  const page = await ctx.newPage();
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(pathToFileURL(file).href);
  await page.waitForTimeout(1200);
  const tag = `${width}${poster ? 'x627' : ''}-${scheme}`;
  const shot = (name) => page.screenshot({ path: join(out, `o4-${tag}-${name}.png`) });

  const dflt = await page.evaluate(() => document.documentElement.getAttribute('data-scheme'));
  if (dflt !== scheme) note(`${tag}: default data-scheme is ${dflt}, expected ${scheme}`);

  // the page waits: nothing changes on its own clock
  await scan(page, `${tag} ch1 initial`);
  await page.waitForTimeout(2500);
  if ((await chapter(page)) !== 1) note(`${tag}: page moved off chapter 1 on its own`);
  await fontCheck(page, `${tag} ch1`);
  await shot('plain-ch1');
  if (poster) {
    await page.close();
    await ctx.close();
    return;
  }

  // Plain: Next through all five
  for (let c = 2; c <= 5; c++) {
    await page.click('#next');
    await page.waitForTimeout(SETTLE);
    if ((await chapter(page)) !== c) note(`${tag}: Next did not reach chapter ${c}`);
    await scan(page, `${tag} plain ch${c}`);
    await fontCheck(page, `${tag} plain ch${c}`);
    await shot(`plain-ch${c}`);
  }
  if (!(await page.locator('#next').isDisabled())) note(`${tag}: Next is enabled on the last Plain chapter`);
  if ((await page.locator('#marks .mk').count()) !== 5) note(`${tag}: Plain should show 5 progress marks`);

  // Back, keys, marks
  await page.click('#back');
  await page.waitForTimeout(400);
  if ((await chapter(page)) !== 4) note(`${tag}: Back did not reach chapter 4`);
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(300);
  if ((await chapter(page)) !== 3) note(`${tag}: ArrowLeft did not reach chapter 3`);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(300);
  if ((await chapter(page)) !== 4) note(`${tag}: ArrowRight did not reach chapter 4`);
  await page.click('#marks .mk >> nth=0');
  await page.waitForTimeout(SETTLE);
  if ((await chapter(page)) !== 1) note(`${tag}: mark 1 did not reach chapter 1`);

  // hover (desktop) / tap a built band on chapter 1
  const box = async (i) => {
    const b = await page.locator('#art rect[style*="cursor"]').nth(i).boundingBox();
    return { x: b.x + b.width / 2, y: b.y + Math.min(b.height / 2, 50) };
  };
  if (!mobile) {
    const p = await box(5);
    await page.mouse.move(p.x, p.y);
    await page.waitForTimeout(500);
    await scan(page, `${tag} hover ordering`);
    await shot('plain-hover-ordering');
    await page.mouse.move(2, 2);
  }

  // chapter 4: tap an idea -> blank manifest form
  await page.click('#marks .mk >> nth=3');
  await page.waitForTimeout(SETTLE);
  {
    const p = await box(9);
    await page.mouse.click(p.x, p.y);
    await page.waitForTimeout(500);
    const on = await page.locator('#detail.on').count();
    if (!on) note(`${tag}: clicking an idea did not open the form`);
    const txt = await page.locator('#detail').innerText().catch(() => '');
    if (!/idea, not built/i.test(txt)) note(`${tag}: idea form is not labelled "idea, not built"`);
    await scan(page, `${tag} idea form (plain)`);
    await shot('plain-ch4-ideaform');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }

  // Under the hood
  await page.getByRole('button', { name: 'Under the hood', exact: true }).click();
  await page.waitForTimeout(400);
  if (!(await page.evaluate(() => document.body.classList.contains('hood')))) note(`${tag}: Under the hood did not set the hood state`);
  if ((await page.locator('#marks .mk').count()) !== 6) note(`${tag}: Hood should show 6 progress marks`);
  for (const c of [2, 4]) {
    await page.click(`#marks .mk >> nth=${c - 1}`);
    await page.waitForTimeout(SETTLE);
    await scan(page, `${tag} hood ch${c}`);
    await shot(`hood-ch${c}`);
  }
  {
    const p = await box(9);
    await page.mouse.click(p.x, p.y);
    await page.waitForTimeout(400);
    await scan(page, `${tag} idea form (hood)`);
    await shot('hood-ch4-ideaform');
    await page.keyboard.press('Escape');
  }
  await page.click('#marks .mk >> nth=5');
  await page.waitForTimeout(SETTLE);
  if ((await chapter(page)) !== 6) note(`${tag}: mark 6 did not reach chapter 6`);
  for (let s = 0; s < 6; s++) {
    if (s > 0) {
      await page.click('#next');
      await page.waitForTimeout(1300);
      if ((await step(page)) !== s) note(`${tag}: ch6 Next did not reach step ${s + 1}`);
    }
    await scan(page, `${tag} hood ch6 step ${s + 1}`);
    if (s === 0 || s === 2 || s === 3 || s === 5) await shot(`hood-ch6-step${s + 1}`);
  }
  if (!(await page.locator('#next').isDisabled())) note(`${tag}: Next is enabled on the last trace step`);
  // Plain again drops ch6
  await page.getByRole('button', { name: 'Plain English', exact: true }).click();
  await page.waitForTimeout(SETTLE);
  if ((await chapter(page)) !== 5) note(`${tag}: switching to Plain from ch6 should land on ch5`);

  // Day/Night
  const other = scheme === 'light' ? 'Night' : 'Day';
  await page.click('#marks .mk >> nth=2');
  await page.waitForTimeout(SETTLE);
  await page.getByRole('button', { name: other, exact: true }).click();
  const r2 = await scan(page, `${tag} ${other} toggle`);
  if (r2.scheme === scheme) note(`${tag}: Day/Night toggle did not flip data-scheme`);
  await page.waitForTimeout(300);
  await shot('flipped-ch3');
  await page.getByRole('button', { name: other === 'Night' ? 'Day' : 'Night', exact: true }).click();

  if (mobile) {
    const sw = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    if (sw[0] > sw[1]) note(`${tag}: horizontal scroll (${sw[0]} > ${sw[1]})`);
    // swipe: left = next, right = back
    await page.click('#marks .mk >> nth=0');
    await page.waitForTimeout(SETTLE);
    const swipe = (dx) =>
      page.evaluate((dx) => {
        const mkT = (x) => new Touch({ identifier: 1, target: document.body, clientX: x, clientY: 400 });
        document.dispatchEvent(new TouchEvent('touchstart', { touches: [mkT(200)], changedTouches: [mkT(200)], bubbles: true }));
        document.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [mkT(200 + dx)], bubbles: true }));
      }, dx);
    await swipe(-140);
    await page.waitForTimeout(400);
    if ((await chapter(page)) !== 2) note(`${tag}: swipe left did not advance`);
    await swipe(140);
    await page.waitForTimeout(400);
    if ((await chapter(page)) !== 1) note(`${tag}: swipe right did not go back`);
  } else if (scheme === 'light') {
    // Play: advances after a hold, then stops on a click
    await page.click('#marks .mk >> nth=0');
    await page.waitForTimeout(SETTLE);
    await page.click('#play');
    await page.waitForTimeout(500);
    if (!(await page.evaluate(() => window.__state.playing))) note(`${tag}: Play did not start`);
    await page.waitForTimeout(8700);
    if ((await chapter(page)) !== 2) note(`${tag}: Play did not advance to chapter 2 (at ${await chapter(page)})`);
    await page.mouse.click(700, 120);
    await page.waitForTimeout(200);
    if (await page.evaluate(() => window.__state.playing)) note(`${tag}: a click did not stop Play`);
    await page.waitForTimeout(8700);
    if ((await chapter(page)) !== 2) note(`${tag}: Play kept advancing after a click`);
    // a key stops it too
    await page.click('#play');
    await page.waitForTimeout(300);
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(300);
    if (await page.evaluate(() => window.__state.playing)) note(`${tag}: a key did not stop Play`);
  }

  await page.close();
  await ctx.close();
}

const passes = [
  ['1440x900', 'light'],
  ['1440x900', 'dark'],
  ['1200x627', 'light'],
  ['1200x627', 'dark'],
  ['390x844', 'light'],
  ['390x844', 'dark'],
];
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
