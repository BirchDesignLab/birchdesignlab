/**
 * B2 task 6 fix round 1: whole-page About sheets for the painted birds, per size and scheme.
 *
 *   node scripts/themes/grandmillennial/b2-t6-fix1-birds-shot.mjs <outDir> [--base http://127.0.0.1:4460] [--sizes 820,390]
 *
 * The geometry probe (b1-t6-birds.mjs) says where a bird's box falls against the cards; this is the
 * picture of the same thing, so a bird that reads as half-hidden is seen, not only counted.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { open } from './t2-common.mjs';

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i < 0 ? d : process.argv[i + 1]; };
const out = process.argv[2];
const base = arg('base', 'http://127.0.0.1:4460').replace(/\/$/, '');
const ALL = [
  { id: '1440', w: 1440, h: 900, dpr: 1 }, { id: '1024', w: 1024, h: 768, dpr: 1 },
  { id: '820', w: 820, h: 1180, dpr: 1, mobile: true }, { id: '390', w: 390, h: 844, dpr: 2, mobile: true },
];
const want = arg('sizes', '1440,1024,820,390').split(',');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const scheme of ['light', 'dark']) {
  for (const sz of ALL.filter((s) => want.includes(s.id))) {
    const { context, page } = await open(browser, scheme, sz);
    await page.goto(`${base}/t/grandmillennial/about/`, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: join(out, `birds__${scheme}__${sz.id}.jpg`), fullPage: true, type: 'jpeg', quality: 80 });
    await context.close();
  }
}
await browser.close();
