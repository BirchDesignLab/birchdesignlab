// Review shots of BDL-012 (the data map) at a desktop and a phone width,
// driven the way a visitor would drive it: the hero with its cards in the
// air, a journey mid-flight (the phone's camera following it), a line read,
// a box's drawer open, the label switch flipped, the ticket desk selling out
// across its own map, a bingo card called.
//
// Written 11-16-26 because the in-app browser pane changed size mid-session
// and cropped its own captures. Kept because every later change to the stage
// wants the same pictures, and because it prints any request that failed,
// which the pane's console only reports as "404" with no URL.
//
// Shoots a running site, the dev server or the built one:
//   node scripts/lab/shoot-bdl-012.mjs [--origin http://localhost:4400] [--out dir] [--only desktop|phone]
//
// Output defaults to social/out/review/bdl-012-shots/, which is gitignored.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const origin = arg('origin', 'http://localhost:4400');
const only = arg('only', '');
const out = arg('out', join(here, '..', '..', 'social', 'out', 'review', 'bdl-012-shots'));
await mkdir(out, { recursive: true });

const SIZES = [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  { name: 'phone', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
].filter((s) => !only || s.name === only);

/** Put an element's top `gap` px below the top of the viewport, without the page's smooth scroll. */
const park = (page, sel, gap = 90) => page.evaluate(([s, g]) => {
  const el = document.querySelector(s);
  scrollTo({ top: el.getBoundingClientRect().top + scrollY - g, behavior: 'instant' });
}, [sel, gap]);

const browser = await chromium.launch();
const failed = new Set();
const errors = new Set();
let count = 0;
try {
  for (const size of SIZES) {
    const { name, ...ctx } = size;
    const phone = name === 'phone';
    const context = await browser.newContext(ctx);
    const page = await context.newPage();
    page.on('response', (r) => { if (r.status() >= 400) failed.add(`${r.status()} ${r.url()}`); });
    page.on('requestfailed', (r) => failed.add(`failed ${r.url()}`));
    page.on('pageerror', (e) => errors.add(`${name}: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.add(`${name}: ${m.text()}`); });
    const shot = (n) => { count++; return page.screenshot({ path: join(out, `${name}-${n}.png`) }); };
    const tap = (sel) => (phone ? page.tap(sel) : page.click(sel));

    await page.goto(`${origin}/lab/bdl-012/`, { waitUntil: 'load' });
    await page.waitForSelector('#dm[data-ready]');
    await page.waitForTimeout(3600); // cards in the air, the library count running
    await shot('1-hero');
    if (phone) {
      await park(page, '#dm-hero', 150);
      await page.waitForTimeout(900);
      await shot('1b-hero-map');
    }

    // A journey. On the phone the camera has flown to the step.
    await park(page, '#dm-tour-bar', 70);
    await tap('#dm-tour button:nth-of-type(2)'); // A ticket sells
    await page.waitForTimeout(phone ? 5200 : 10500);
    await shot('2-journey');
    if (phone) { await page.waitForTimeout(6300); await shot('2b-journey-later'); }
    await tap('#dm-tour button.reset');
    await page.waitForTimeout(1000);

    // A line, read. (Hover on a pointer, a tap on a phone.)
    const line = await page.evaluate(() => {
      const hit = document.querySelectorAll('#dm-map-main path.hit')[9]; // Ticket Tailor -> watcher
      const r = hit.getBoundingClientRect();
      const p = hit.getPointAtLength(hit.getTotalLength() / 2), m = hit.getScreenCTM();
      return { x: p.x * m.a + p.y * m.c + m.e, y: p.x * m.b + p.y * m.d + m.f, w: r.width };
    });
    if (phone) await page.touchscreen.tap(line.x, line.y); else await page.mouse.move(line.x, line.y);
    await page.waitForTimeout(500);
    await shot('3-line');
    if (!phone) await page.mouse.move(10, 400);

    // A box's drawer, on one of the five with the deeper notes.
    await tap('#dm-map-main .node[data-id="watcher"]');
    await page.waitForTimeout(700);
    await shot('4-drawer');
    await tap('#dm-drawer-close');
    await page.waitForTimeout(500);

    if (phone) {
      // The zoom button, then a drag: the map should pan, not the page.
      await tap('#dm-zoom');
      await page.waitForTimeout(1100);
      await shot('5-zoomed');
      await tap('#dm-zoom');
      await page.waitForTimeout(900);
    }

    await tap('[data-mode="tech"]');
    await park(page, phone ? '#dm-view' : '#dm-map-main', phone ? 120 : 200);
    await page.waitForTimeout(900);
    await shot('6-under-the-hood');
    await tap('[data-mode="plain"]');

    // The content library: twelve cards. (Shot since 11-16-26, when a class
    // name shared with the new box drawer hid every one of them unnoticed.)
    await park(page, '.dm .drawers', phone ? 90 : 160);
    await page.waitForTimeout(400);
    await shot('6b-content-library');

    // Sell the last two tickets: once mid-flight, once sold out.
    await park(page, '#dm-desk', phone ? 70 : 60);
    await tap('#dm-sell');
    await page.waitForFunction(() => !document.getElementById('dm-sell').disabled, null, { timeout: 20000 });
    await tap('#dm-sell');
    if (phone) await park(page, '.dm .desk-map', 90);
    await page.waitForFunction(() => /Sold Out: on/.test(document.querySelector('#dm-map-desk .node[data-id="sanity"] .n-chip')?.textContent ?? ''), null, { timeout: 20000 });
    await page.waitForTimeout(450);
    await shot('7-desk-mid-flight');
    await page.waitForFunction(() => document.getElementById('dm-desk').classList.contains('sold'), null, { timeout: 20000 });
    await page.waitForTimeout(1500);
    await shot('8-desk-sold-out');
    if (!phone) {
      // The big map remembers it.
      await park(page, '#dm-map-main', 200);
      await page.waitForTimeout(600);
      await shot('8b-map-flag');
    }

    await park(page, '.tvd .demo', phone ? 60 : 150);
    await tap('#dm-call');
    await page.waitForTimeout(900);
    await tap('#dm-fact');
    await page.waitForTimeout(1200);
    await shot('9-game-night');

    await context.close();
  }
} finally {
  await browser.close();
}
console.log(`[shots] wrote ${count} files to ${out}`);
console.log(failed.size ? `[shots] failed requests:\n  ${[...failed].join('\n  ')}` : '[shots] no failed requests');
console.log(errors.size ? `[shots] page errors:\n  ${[...errors].join('\n  ')}` : '[shots] no page errors');
