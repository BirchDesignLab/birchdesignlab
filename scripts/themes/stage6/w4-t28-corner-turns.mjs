/**
 * Stage 6 wave 4, task 28 fix round 1 (critic C1): the footer corner square's
 * hover lift and ink block must sit on the same side at every turn count.
 * Taps the square 0..4 times with a mouse, parks the mouse over it, and saves
 * a still of the corner per turn count, plus the lift group's computed
 * translate and filter and the group's own turn (it must stay 0).
 * Run against a built snapshot: node scripts/themes/snap.mjs --name t28-fix --port 4470 -- node scripts/themes/stage6/w4-t28-corner-turns.mjs
 * Stills: scripts/themes/.out/stage6/w4/t28/corner-turns-<scheme>-<n>.png
 */
import { launch, open, reach, OUT } from './w4-t28-lib.mjs';
import { join } from 'node:path';

const { browser } = await launch();
let bad = 0;
for (const scheme of ['light', 'dark']) {
  const { page, ctx, errors } = await open(browser, { path: '/t/bauhaus/', width: 1440, scheme });
  await reach(page, 'footer svg.corner');
  const g = await page.evaluate(() => {
    const r = document.querySelector('footer svg.corner').getBoundingClientRect();
    return { l: r.left, t: r.top, k: r.width / 240 };
  });
  const on = [g.l + 85 * g.k, g.t + 55 * g.k];
  for (let n = 0; n <= 4; n++) {
    if (n > 0) { await page.mouse.move(...on); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(500); }
    await page.mouse.move(g.l + 200 * g.k, g.t + 140 * g.k);
    await page.waitForTimeout(250);
    await page.mouse.move(...on, { steps: 4 });
    await page.waitForTimeout(300);
    const s = await page.evaluate(() => {
      const lift = document.querySelector('footer [data-lift]');
      const spin = document.querySelector('footer [data-spin]');
      return { hot: document.querySelector('footer svg.corner').hasAttribute('data-hot'), translate: getComputedStyle(lift).translate, filter: getComputedStyle(lift).filter, spinFilter: getComputedStyle(spin).filter, rotate: getComputedStyle(spin).rotate };
    });
    const ok = s.hot && s.translate === '-4px -4px' && /drop-shadow/.test(s.filter) && s.spinFilter === 'none';
    if (!ok) bad++;
    console.log(scheme, 'turns', n, ok ? 'PASS' : 'FAIL', JSON.stringify(s));
    await page.screenshot({ path: join(OUT, `corner-turns-${scheme}-${n}.png`), clip: { x: Math.max(0, g.l - 20), y: Math.max(0, g.t - 10), width: 280 * g.k, height: 170 * g.k } });
  }
  if (errors.length) { bad++; console.log('page errors', errors); }
  await ctx.close();
}
await browser.close();
process.exit(bad ? 1 : 0);
