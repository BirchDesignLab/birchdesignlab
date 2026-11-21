// BDL-013 o5b: debugging probe for the phone layout (what is wider than the
// viewport, what a tap would hit).
//   node scripts/lab/probe-o5b-phone.mjs <ch>
import { createRequire } from 'node:module';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const { chromium } = createRequire(join(root, 'package.json'))('playwright');
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto(pathToFileURL(join(root, 'docs/bdl-013/mockups/o5b-framework.html')).href + '?ch=' + (process.argv[2] || 2));
await p.waitForTimeout(1500);
console.log(await p.evaluate(() => {
  const wide = [...document.querySelectorAll('body *')].filter((e) => e.getBoundingClientRect().right > 392 && e.offsetParent).slice(0, 12)
    .map((e) => e.tagName + '.' + e.className + '#' + e.id + ' ' + Math.round(e.getBoundingClientRect().right));
  return JSON.stringify({ iw: innerWidth, sw: screen.width, cw: document.documentElement.clientWidth, cls: document.documentElement.className, wide }, null, 1);
}));
await b.close();
