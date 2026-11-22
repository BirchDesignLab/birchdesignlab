/**
 * Stage 6 wave 3, task 27: functional probe for cottagecore's needle and thread. Output: scripts/themes/.out/stage6/w3/t27/.
 *
 *   node scripts/themes/snap.mjs --name s6-w3-t27 --reuse --port 4470 -- node scripts/themes/stage6/w3-t27-probe.mjs
 *   WIDTH=1440 SCHEME=light node ...
 *
 * Arrives on About through the real switcher, then: reads the idle state (no inline style, no frame running),
 * drags the needle with the mouse and taps the linen, and prints what the layer holds. Crops of the hoop at
 * each step are written beside the numbers (quick-look.png).
 */
import { join } from 'node:path';
import { launch, arriveAbout, reach, hoopGeo, stitchState, dragMouse, boxOf, OUT } from './w3-t27-lib.mjs';

const width = Number(process.env.WIDTH || 1440);
const scheme = process.env.SCHEME || 'light';
const { browser } = await launch();
const { ctx, page, mobile, errors } = await arriveAbout(browser, { width, scheme });
// The one-shot nudge: scrolled out of view, then in; data-nudge goes on, the needle's picture runs nd-nudge once, the attribute goes off.
await page.evaluate(() => scrollTo(0, 0));
await page.waitForTimeout(400);
await page.evaluate(() => {
  const n = document.querySelector('.needle');
  window.__nudge = { on: 0, off: 0, anims: [] };
  new MutationObserver(() => {
    if (n.hasAttribute('data-nudge')) { window.__nudge.on++; window.__nudge.anims = n.getAnimations({ subtree: true }).map((a) => a.animationName); } else window.__nudge.off++;
  }).observe(n, { attributes: true, attributeFilter: ['data-nudge'] });
  n.scrollIntoView({ block: 'center' });
});
await page.waitForTimeout(2200);
console.log('nudge', JSON.stringify(await page.evaluate(() => window.__nudge)));
await reach(page, '.hoop');
const box = await boxOf(page, '.hoop', 40);
const clip = { x: box.x, y: box.y, width: box.w, height: box.h };

const idle = await stitchState(page);
console.log('idle', JSON.stringify(idle));
await page.screenshot({ path: join(OUT, `look-idle-${scheme}-${width}.png`), clip });

if (!mobile) {
  const geo = await hoopGeo(page);
  console.log('geo', JSON.stringify(geo));
  await dragMouse(page, geo, { release: false });
  console.log('mid drag', JSON.stringify(await stitchState(page)));
  await page.screenshot({ path: join(OUT, `look-drag-${scheme}-${width}.png`), clip });
  await page.mouse.up();
  await page.waitForTimeout(900);
  console.log('after release', JSON.stringify(await stitchState(page)));
  await page.screenshot({ path: join(OUT, `look-knot-${scheme}-${width}.png`), clip });
  // taps
  const g = await hoopGeo(page);
  for (const [fx, fy] of [[-0.45, -0.1], [-0.1, 0.35], [0.4, 0.2], [0.2, -0.5]]) {
    await page.mouse.click(g.cx + g.linenR * fx, g.cy + g.linenR * fy);
    await page.waitForTimeout(450);
  }
  console.log('taps', JSON.stringify(await stitchState(page)));
  await page.screenshot({ path: join(OUT, `look-taps-${scheme}-${width}.png`), clip });
  await page.waitForTimeout(2200);
  console.log('tied', JSON.stringify(await stitchState(page)));
  await page.screenshot({ path: join(OUT, `look-tied-${scheme}-${width}.png`), clip });
}
console.log('errors', JSON.stringify(errors));
await ctx.close();
await browser.close();
