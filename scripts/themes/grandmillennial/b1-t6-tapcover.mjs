/**
 * B1 task 6: who is on top of the live bird's tap target? Tallies elementFromPoint over the
 * .wb-hit rect at home, per size.   node scripts/themes/grandmillennial/b1-t6-tapcover.mjs [--base URL]
 */
import { chromium } from 'playwright';
import { open } from './t2-common.mjs';
const i = process.argv.indexOf('--base');
const base = (i < 0 ? 'http://127.0.0.1:4460' : process.argv[i + 1]).replace(/\/$/, '');
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const sz of [{ id: '820', w: 820, h: 1180, dpr: 1, mobile: true }, { id: '390', w: 390, h: 844, dpr: 2, mobile: true }]) {
  const { context, page } = await open(browser, 'light', sz);
  await page.goto(`${base}/t/grandmillennial/about/`, { waitUntil: 'networkidle' });
  const r = await page.evaluate(() => {
    const g = [...document.querySelectorAll('.wb')].find((e) => getComputedStyle(e.closest('svg')).display !== 'none');
    const h = g.querySelector('.wb-hit');
    const r0 = h.getBoundingClientRect();
    window.scrollTo(0, Math.max(0, r0.top + scrollY - innerHeight / 2));
    const r = h.getBoundingClientRect();
    const tally = {};
    for (let y = r.top + 1; y < r.bottom; y += 3) for (let x = r.left + 1; x < r.right; x += 3) {
      const e = document.elementFromPoint(x, y);
      const k = e === h ? 'TAP' : `${e?.tagName}.${e?.getAttribute?.('class')?.split(' ')[0] ?? ''}`;
      tally[k] = (tally[k] || 0) + 1;
    }
    return { rect: [r.left, r.top, r.width, r.height].map(Math.round), tally, pe: getComputedStyle(document.querySelector('.sitter')).pointerEvents };
  });
  console.log(sz.id, JSON.stringify(r));
  await context.close();
}
await browser.close();
