// Review shots of BDL-012 (the data map) at a desktop and a phone width,
// driven the way a visitor would drive it: a journey mid-flight, the label
// switch flipped, the ticket desk sold out, a bingo card called.
//
// Written 11-16-26 because the in-app browser pane changed size mid-session
// and cropped its own captures. Kept because every later change to the stage
// wants the same eight pictures, and because it prints any request that
// failed, which the pane's console only reports as "404" with no URL.
//
// Shoots the built site:
//   npm run build && npm run preview -- --port 4400     (other terminal)
//   node scripts/lab/shoot-bdl-012.mjs [--origin http://localhost:4400] [--out dir]
//
// Output defaults to social/out/review/bdl-012-shots/, which is gitignored.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const origin = arg('origin', 'http://localhost:4400');
const out = arg('out', join(here, '..', '..', 'social', 'out', 'review', 'bdl-012-shots'));
await mkdir(out, { recursive: true });

const SIZES = [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  { name: 'phone', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
];

/** Put an element's top `gap` px below the top of the viewport, without the page's smooth scroll. */
const park = (page, sel, gap = 90) => page.evaluate(([s, g]) => {
  const el = document.querySelector(s);
  scrollTo({ top: el.getBoundingClientRect().top + scrollY - g, behavior: 'instant' });
}, [sel, gap]);

const browser = await chromium.launch();
const failed = new Set();
try {
  for (const size of SIZES) {
    const { name, ...ctx } = size;
    const context = await browser.newContext(ctx);
    const page = await context.newPage();
    page.on('response', (r) => { if (r.status() >= 400) failed.add(`${r.status()} ${r.url()}`); });
    page.on('requestfailed', (r) => failed.add(`failed ${r.url()}`));
    const shot = (n) => page.screenshot({ path: join(out, `${name}-${n}.png`) });

    await page.goto(`${origin}/lab/bdl-012/`, { waitUntil: 'load' });
    await page.waitForSelector('#dm[data-ready]');
    await page.waitForTimeout(2200); // count-up done, wall drifting
    await shot('1-hero');

    if (name === 'desktop') {
      await park(page, '#dm-tour-bar', 70);
      await page.click('#dm-tour button:nth-of-type(2)'); // A ticket sells
      await page.waitForTimeout(10500);                   // into step 4 of 6
      await shot('2-journey');
      await page.click('#dm-tour button.reset');
      await page.click('[data-mode="tech"]');
      await park(page, '#dm-map-main', 200);
      await page.waitForTimeout(900);
      await shot('3-under-the-hood');
      await page.click('[data-mode="plain"]');
    } else {
      await park(page, '.dm .chain[data-key="ticket"]', 70);
      await page.waitForTimeout(6500); // the timeline plays as it comes into view
      await shot('2-journey');
      await page.click('[data-mode="tech"]');
      await park(page, '.dm .chain[data-key="publish"]', 70);
      await page.waitForTimeout(900);
      await shot('3-under-the-hood');
      await page.click('[data-mode="plain"]');
    }

    // Sell the last two tickets, then show the desk and the steps it lit.
    await park(page, name === 'desktop' ? '#dm-steps' : '#dm-desk', name === 'desktop' ? 60 : 70);
    await page.click('#dm-sell');
    await page.waitForFunction(() => !document.getElementById('dm-sell').disabled);
    await page.click('#dm-sell');
    await page.waitForFunction(() => document.getElementById('dm-desk').classList.contains('sold'));
    await page.waitForTimeout(1800);
    await shot('4-ticket-desk-sold-out');

    await park(page, '.dm .demo', name === 'desktop' ? 150 : 60);
    await page.click('#dm-call');
    await page.waitForTimeout(900);
    await page.click('#dm-fact');
    await page.waitForTimeout(1200);
    await shot('5-game-night');

    await context.close();
  }
} finally {
  await browser.close();
}
console.log(`[shots] wrote ${SIZES.length * 5} files to ${out}`);
console.log(failed.size ? `[shots] failed requests:\n  ${[...failed].join('\n  ')}` : '[shots] no failed requests');
