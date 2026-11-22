/**
 * Stage 6 wave 3, task 27: close-ups at 2x of the finished stitches and knots, both threads, both schemes.
 *   DSF=2 node scripts/themes/snap.mjs --name s6-w3-t27 --reuse --port 4470 -- node scripts/themes/stage6/w3-t27-zoom.mjs
 * Output: scripts/themes/.out/stage6/w3/t27/zoom-<scheme>.png (a band across the middle of the hoop).
 */
import { join } from 'node:path';
import { launch, arriveAbout, reach, hoopGeo, stitchState, OUT } from './w3-t27-lib.mjs';

const { browser } = await launch();
for (const scheme of (process.env.SCHEMES || 'light,dark').split(',')) {
  const { ctx, page } = await arriveAbout(browser, { width: 1440, scheme });
  await reach(page, '.hoop');
  const g = await hoopGeo(page);
  // one rose thread by drag (a loop and a straight run), one sage thread by taps, each knotted
  await page.mouse.move(g.body.x, g.body.y);
  await page.mouse.down();
  const pts = [[-0.6, 0.3], [-0.45, 0.1], [-0.3, 0.2], [-0.15, 0.45], [0.05, 0.55], [0.3, 0.45], [0.45, 0.25]];
  for (const [fx, fy] of pts) { await page.mouse.move(g.cx + g.linenR * fx, g.cy + g.linenR * fy, { steps: 14 }); }
  await page.mouse.up();
  await page.waitForTimeout(700);
  for (const [fx, fy] of [[-0.5, -0.05], [-0.2, -0.2], [0.1, -0.55], [0.35, -0.3]]) {
    await page.mouse.click(g.cx + g.linenR * fx, g.cy + g.linenR * fy);
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(2600);
  console.log(scheme, JSON.stringify(await stitchState(page)));
  await page.screenshot({ path: join(OUT, `zoom-${scheme}.png`), clip: { x: g.cx - g.linenR, y: g.cy - g.linenR * 0.75, width: g.linenR * 2, height: g.linenR * 1.5 } });
  await ctx.close();
}
await browser.close();
