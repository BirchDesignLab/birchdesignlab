/**
 * Stage 6 wave 3, task 23: baseline whole-page sheets of the pages the toys land on (Home closer, Contact,
 * Sent), before the change. Output: scripts/themes/.out/stage6/w3/t23/base-*.png.
 *   node scripts/themes/snap.mjs --name s6-w3-t22 --reuse --port 4470 -- node scripts/themes/stage6/w3-t23-base.mjs
 */
import { join } from 'node:path';
import { launch, open, OUT } from './w3-t23-lib.mjs';

const { browser } = await launch();
for (const scheme of ['light', 'dark']) for (const width of [1440, 820, 390]) {
  for (const [name, path] of [['home', '/t/cottagecore/'], ['contact', '/t/cottagecore/contact/'], ['sent', '/t/cottagecore/contact/sent/']]) {
    const { ctx, page } = await open(browser, { path, width, scheme });
    await page.screenshot({ path: join(OUT, `base-${name}-${scheme}-${width}.png`), fullPage: true });
    await ctx.close();
  }
}
await browser.close();
