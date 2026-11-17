// Two probes of BDL-012 (the data map) that the review shots do not cover:
// the page with JavaScript off, and the page driven by keyboard alone.
//
// Written 11-16-26 for the wrap-up pass, when neither had ever been looked
// at. Kept because both regress silently: nothing in `npm run verify` loads
// the page without script or presses Tab.
//
// Probes the built site:
//   npm run build && npm run preview -- --port 4400     (other terminal)
//   node scripts/lab/probe-bdl-012.mjs [--origin http://localhost:4400] [--out dir]
//
// Output: full-page PNGs of the no-JS page (desktop + phone) and a keyboard
// report on stdout. PNGs default to social/out/review/bdl-012-shots/, which
// is gitignored.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const origin = arg('origin', 'http://localhost:4400');
const out = arg('out', join(here, '..', '..', 'social', 'out', 'review', 'bdl-012-shots'));
await mkdir(out, { recursive: true });
const url = `${origin}/lab/bdl-012/`;

const browser = await chromium.launch();
try {
  /* ---------- 1. JavaScript off ---------- */
  for (const [name, viewport] of [['desktop', { width: 1440, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
    const ctx = await browser.newContext({ viewport, javaScriptEnabled: false, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'load' });
    await page.screenshot({ path: join(out, `nojs-${name}.png`), fullPage: true });
    // No evaluate() with JS off, so measure through locators.
    const box = async (sel) => {
      const b = await page.locator(sel).first().boundingBox().catch(() => null);
      return b ? `${Math.round(b.width)}x${Math.round(b.height)}` : 'not rendered';
    };
    console.log(`[nojs ${name}]`);
    for (const sel of ['#dm-wall', '#dm-tour', '#dm-caption', '#dm-map-main', '#dm-chains', '#dm-map-night', '#dm-night-m',
      '#dm-map-live', '#dm-live-m', '#dm-map-forms', '#dm-forms-m', '#dm-screen', '#dm-desk', '#dm-matrix', '.dm .stats', 'noscript']) {
      console.log(`  ${sel.padEnd(16)} ${await box(sel)}`);
    }
    await ctx.close();
  }

  /* ---------- 2. Keyboard only ---------- */
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForSelector('#dm[data-ready]');
  await page.waitForTimeout(800);

  const describe = () => page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const inDm = !!el.closest('#dm');
    const name = (el.getAttribute('aria-label') || el.querySelector?.('.n-title')?.textContent || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 44);
    return {
      inDm,
      tag: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.classList.contains('node') ? '.node' : ''),
      name,
      ring: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0,
      onScreen: r.bottom > 0 && r.top < innerHeight,
      covered: (() => { // is the focused element hidden under the sticky bar or another layer?
        const x = r.left + Math.min(r.width / 2, 20), y = r.top + Math.min(r.height / 2, 12);
        if (y < 0 || y > innerHeight) return false;
        const top = document.elementFromPoint(x, y);
        return !!top && top !== el && !el.contains(top) && !top.contains(el);
      })(),
    };
  });

  const stops = [];
  let leftDm = false;
  for (let i = 0; i < 140 && !leftDm; i++) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(450); // the page scrolls smoothly; measure after it lands
    const d = await describe();
    if (!d) continue;
    if (stops.some((s) => s.inDm) && !d.inDm) leftDm = true;
    stops.push(d);
  }
  const inside = stops.filter((s) => s.inDm);
  console.log(`[keyboard] ${stops.length - inside.length - (leftDm ? 1 : 0)} stops before the stage, ${inside.length} inside it`);
  inside.forEach((s, i) => console.log(
    `  ${String(i + 1).padStart(2)} ${s.tag.padEnd(22)} ${s.name.padEnd(44)} ${s.ring ? 'ring' : 'NO RING'}${s.onScreen ? '' : ' OFFSCREEN'}${s.covered ? ' COVERED' : ''}`));

  // Drive the things a mouse can drive.
  const focusAnd = async (sel, key) => { await page.focus(sel); await page.keyboard.press(key); };
  const report = (label, ok) => console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}`);
  console.log('[keyboard] actions');

  await focusAnd('#dm-tour button:nth-of-type(2)', 'Enter');
  await page.waitForTimeout(600);
  report('Enter on a journey button starts it', await page.evaluate(() =>
    document.querySelector('#dm-tour button:nth-of-type(2)').getAttribute('aria-pressed') === 'true'
    && /step 1 of/.test(document.getElementById('dm-caption').textContent)));

  await focusAnd('#dm-map-main .node[role="button"]', ' ');
  await page.waitForTimeout(500);
  report('Space on a box stops the journey, lights the box and opens its drawer', await page.evaluate(() =>
    document.querySelector('#dm-map-main .node[role="button"]').classList.contains('lit')
    && document.querySelector('#dm-tour button:nth-of-type(2)').getAttribute('aria-pressed') === 'false'
    && document.getElementById('dm-drawer').classList.contains('open')));
  report('focus moves into the drawer', await page.evaluate(() => !!document.activeElement?.closest('#dm-drawer')));
  report('the drawer names the box and lists its lines', await page.evaluate(() =>
    !!document.getElementById('dm-drawer-title')?.textContent && document.querySelectorAll('#dm-drawer .dr-lines li').length > 0));

  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  report('Escape closes the drawer and hands focus back to the box', await page.evaluate(() =>
    !document.getElementById('dm-drawer').classList.contains('open')
    && document.activeElement === document.querySelector('#dm-map-main .node[role="button"]')));
  report('a closed drawer is out of the tab order', await page.evaluate(() => getComputedStyle(document.getElementById('dm-drawer')).visibility === 'hidden'));

  await focusAnd('[data-mode="tech"]', 'Enter');
  await page.waitForTimeout(400);
  report('Enter on Under the hood swaps the labels', await page.evaluate(() => !!document.querySelector('#dm-map-main .n-sub.is-tech')));
  report('focus survives the label swap', await page.evaluate(() => document.activeElement?.dataset?.mode === 'tech'));
  await focusAnd('[data-mode="plain"]', 'Enter');

  await focusAnd('#dm-sell', 'Enter');
  await page.waitForFunction(() => !document.getElementById('dm-sell').disabled, null, { timeout: 15000 });
  await focusAnd('#dm-sell', 'Enter');
  await page.waitForFunction(() => document.getElementById('dm-desk').classList.contains('sold'), null, { timeout: 15000 });
  report('Enter twice on Sell a ticket sells the night out', true);
  // The page flips to sold out one beat before the buttons come back, and
  // focus is handed back only then.
  await page.waitForFunction(() => !document.getElementById('dm-refund').disabled, null, { timeout: 15000 });
  report('focus is still on a live control after selling out (Sell is now disabled)', await page.evaluate(() => {
    const el = document.activeElement;
    return !!el && el !== document.body && !el.disabled;
  }));

  // The TV calls by itself until somebody takes the phone, so compare, do not assume 23.
  const calledBefore = Number(await page.textContent('#dm-n-called'));
  await focusAnd('#dm-call', 'Enter');
  await page.waitForTimeout(700);
  report('Enter on Call next advances the TV', Number(await page.textContent('#dm-n-called')) === calledBefore + 1);

  // Things that only answer a pointer.
  console.log('[keyboard] pointer-only');
  const titled = await page.evaluate(() => document.querySelectorAll('#dm [title]').length);
  const labelled = await page.evaluate(() => [...document.querySelectorAll('#dm [title]')].filter((el) => el.closest('[aria-label]')).length);
  console.log(`  ${titled} elements carry detail in a title attribute (hover only); ${labelled} of them sit inside a labelled group`);
  await ctx.close();
} finally {
  await browser.close();
}
