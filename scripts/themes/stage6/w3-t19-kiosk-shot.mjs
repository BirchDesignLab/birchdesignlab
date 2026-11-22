/**
 * Stage 6 wave 3, task 19 fix round 2: crop of the Home kiosk at phone widths,
 * to see the props whole (nothing cut by the kiosk's overflow-x: clip).
 *   node scripts/themes/stage6/w3-t19-kiosk-shot.mjs <outdir>
 */
import { launch, open } from './w3-t19-lib.mjs';
const out = process.argv[2];
const browser = await launch();
for (const width of [360, 390]) {
  const { ctx, page } = await open(browser, { path: '/t/vaporwave/', width, scheme: 'dark', settle: 300 });
  await page.locator('.kiosk-stand').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const b = await page.evaluate(() => { const r = document.querySelector('.kiosk').getBoundingClientRect(); return { y: Math.max(0, r.top - 40), h: r.height + 80 }; });
  await page.screenshot({ path: `${out}/kiosk-${width}.png`, clip: { x: 0, y: b.y, width, height: Math.min(b.h, 700) } });
  await ctx.close();
}
await browser.close();
