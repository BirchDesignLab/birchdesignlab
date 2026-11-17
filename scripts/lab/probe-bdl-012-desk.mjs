// Probe: a sale in flight on BDL-012's ticket desk keeps its light when the
// page rebuilds maps under it.
//
// Written 11-16-26 for the bug where the Plain English / Under the hood switch
// (and crossing the 760px breakpoint) rebuilt the desk map mid-sale: the
// travelling light kept animating inside the old, detached SVG, so it vanished
// from the page while the desk's state stayed right. The fix leaves the desk
// map alone on the label switch (it is titles and chips only, the same in
// both voices) and has send() re-send a light caught in a breakpoint rebuild.
//
// Sells the last two tickets, flipping the label switch while a light is on a
// line each time, then refunds one and crosses the breakpoint mid-flight. At
// each point it counts the lights drawn in the desk map that is on the page,
// and at the end checks the desk, the page mock and the big map's flags agree.
//
//   node scripts/lab/probe-bdl-012-desk.mjs [--origin http://localhost:4400]
//
// Exits 1 on any failure. Needs a built site (npm run build, then the preview).
import { chromium } from 'playwright';

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const origin = arg('origin', 'http://localhost:4400');

let bad = 0;
const check = (ok, what) => { console.log(`${ok ? 'pass' : 'FAIL'}  ${what}`); if (!ok) bad++; };

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${origin}/lab/bdl-012/`, { waitUntil: 'load' });
  await page.waitForSelector('#dm[data-ready]');
  const toDesk = () => page.evaluate(() => document.getElementById('dm-sell').scrollIntoView({ block: 'center', behavior: 'instant' }));
  await toDesk();
  await page.waitForTimeout(300);

  /** Lights currently drawn in the desk map that is attached to the page. */
  const lights = () => page.evaluate(() => document.querySelectorAll('#dm-map-desk circle.comet').length);
  /** Tag the desk map's first box, to tell afterwards whether it was rebuilt. */
  const mark = () => page.evaluate(() => { document.querySelector('#dm-map-desk .node').dataset.probe = '1'; });
  const marked = () => page.evaluate(() => !!document.querySelector('#dm-map-desk .node[data-probe]'));
  const idle = () => page.waitForFunction(() => !document.querySelector('#dm-sell').disabled || !document.querySelector('#dm-refund').disabled, null, { timeout: 15000 })
    .then(() => page.waitForFunction(() => document.querySelectorAll('#dm-map-desk circle.comet').length === 0, null, { timeout: 15000 }));
  const state = () => page.evaluate(() => ({
    sold: document.getElementById('dm-sold').textContent,
    page: document.getElementById('dm-state').textContent,
    avail: document.getElementById('dm-g-avail').textContent,
    sanity: document.querySelector('#dm-map-desk .node[data-id="sanity"] .n-chip')?.textContent,
    site: document.querySelector('#dm-map-desk .node[data-id="site"] .n-chip')?.textContent,
    flags: document.querySelectorAll('#dm-map-main .n-flag').length,
  }));

  // 1. Label switch mid-flight, on an ordinary sale (38 -> 39).
  await page.click('#dm-sell');
  await page.waitForTimeout(150);
  check((await lights()) >= 1, 'a light is on the desk map once Sell is pressed');
  await mark();
  await page.click('[data-mode="tech"]');
  await toDesk();
  await page.waitForTimeout(100);
  check((await lights()) >= 1, 'the light is still on the page after switching to Under the hood');
  check(await marked(), 'the label switch did not rebuild the desk map');
  await idle();

  // 2. Label switch mid-flight, on the last seat (39 -> 40, sold out).
  await page.click('#dm-sell');
  await page.waitForTimeout(150);
  await page.click('[data-mode="plain"]');
  await toDesk();
  await page.waitForTimeout(100);
  check((await lights()) >= 1, 'the light is still on the page after switching back to Plain English');
  await idle();
  let s = await state();
  check(s.sold === '40' && s.page === 'Sold out' && s.avail === 'Sold out', `sold out on the page mock and the listing (${JSON.stringify(s)})`);
  check(s.sanity === 'Sold Out: on' && s.site === 'Sold out', 'desk chips say sold out');
  check(s.flags === 2, 'the big map carries both sold-out flags');

  // 3. The phone breakpoint mid-flight, on a refund (40 -> 39, back on sale).
  await mark();
  await page.click('#dm-refund');
  await page.waitForTimeout(150);
  await page.setViewportSize({ width: 390, height: 844 });
  await toDesk();
  await page.waitForTimeout(200);
  check(!(await marked()), 'crossing the breakpoint rebuilt the desk map into its phone layout');
  check((await lights()) >= 1, 'a light is on the new desk map after the rebuild');
  await idle();
  s = await state();
  check(s.sold === '39' && s.page === 'On sale' && s.avail === 'In stock', `back on sale (${JSON.stringify(s)})`);
  check(s.sanity === 'Sold Out: off' && s.site === 'On sale', 'desk chips say on sale');
  check(s.flags === 0, 'the big map dropped its flags');

  check(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
} finally {
  await browser.close();
}
console.log(bad ? `\n${bad} check(s) failed` : '\nall checks passed');
process.exit(bad ? 1 : 0);
