/**
 * Stage 6 wave 3, task 23: does a touch tap on the date stamp take focus from the field being typed in? (390, touch.)
 *   node scripts/themes/snap.mjs --name s6-w3-t23 --reuse --port 4470 -- node scripts/themes/stage6/w3-t23-focus.mjs
 */
import { launch, open, reach, centre } from './w3-t23-lib.mjs';
const { browser } = await launch();
const { ctx, page } = await open(browser, { path: '/t/cottagecore/contact/', width: 390, scheme: 'light', settle: 800 });
await reach(page, '#cf-message');
await page.focus('#cf-message');
await page.evaluate(() => {
  window.__log = [];
  for (const t of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'touchstart', 'touchend', 'focusout', 'blur'])
    document.addEventListener(t, (e) => window.__log.push(`${t}:${e.target.tagName || e.target.nodeName}${e.defaultPrevented ? '(prevented)' : ''}`), true);
});
await page.evaluate(() => { const e = document.querySelector('[data-cc-toy="stamp"]'); const r = e.getBoundingClientRect(); window.scrollBy(0, r.top - 500); });
await page.waitForTimeout(400);
await page.focus('#cf-message');
const [x, y] = await centre(page, '[data-cc-toy="stamp"]');
await page.touchscreen.tap(x, y);
await page.waitForTimeout(400);
console.log(await page.evaluate(() => ({ active: document.activeElement.id || document.activeElement.tagName, log: window.__log })));
await ctx.close();
await browser.close();
