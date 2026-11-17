// Review shots of BDL-005 (the Cheer and Chatter case study) at a desktop and
// a phone width: the picture link to the data map, the shape-of-the-work
// chart, and the working miniature of the live app.
//
// Written 11-16-26 when the page gained its first in-page piece
// (src/studies/bdl-005/Extra.astro). Same reason as shoot-bdl-012.mjs: the
// pictures are wanted again after every change, and the pane crops its own.
//
//   node scripts/lab/shoot-bdl-005.mjs [--origin http://localhost:4400] [--out dir]
//
// Output defaults to social/out/review/bdl-005-shots/, which is gitignored.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const origin = arg('origin', 'http://localhost:4400');
const out = arg('out', join(here, '..', '..', 'social', 'out', 'review', 'bdl-005-shots'));
await mkdir(out, { recursive: true });

const SIZES = [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  { name: 'phone', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
];
const park = (page, sel, gap = 90) => page.evaluate(([s, g]) => {
  const el = document.querySelector(s);
  scrollTo({ top: el.getBoundingClientRect().top + scrollY - g, behavior: 'instant' });
}, [sel, gap]);

const browser = await chromium.launch();
const problems = new Set();
try {
  for (const { name, ...ctx } of SIZES) {
    const context = await browser.newContext(ctx);
    const page = await context.newPage();
    page.on('response', (r) => { if (r.status() >= 400) problems.add(`${r.status()} ${r.url()}`); });
    page.on('pageerror', (e) => problems.add(`${name}: ${e.message}`));
    const shot = (n) => page.screenshot({ path: join(out, `${name}-${n}.png`) });
    await page.goto(`${origin}/lab/bdl-005/`, { waitUntil: 'load' });
    await page.waitForTimeout(800);

    await park(page, '.prose a[href="/lab/bdl-012/"] img', 120);
    await page.waitForTimeout(500);
    await shot('1-map-link');

    await park(page, '.s5', 60);
    await page.waitForTimeout(700);
    await shot('2-shape');
    await park(page, '.s5-tiles', name === 'phone' ? 300 : 500);
    await page.waitForTimeout(500);
    await shot('3-figures');

    await park(page, '.s5-mini', 70);
    await (name === 'phone' ? page.tap('#dm-call') : page.click('#dm-call'));
    await page.waitForTimeout(900);
    await (name === 'phone' ? page.tap('#dm-fact') : page.click('#dm-fact'));
    await page.waitForTimeout(1200);
    await shot('4-miniature');
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(`[shots] wrote ${SIZES.length * 4} files to ${out}`);
console.log(problems.size ? `[shots] problems:\n  ${[...problems].join('\n  ')}` : '[shots] no failed requests, no page errors');
