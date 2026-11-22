/**
 * Stage 6 wave 3, task 25: a quick look while building. Whole-page and
 * viewport shots of Sent (rest, a selected icon, each window open) and the
 * Home kiosk elevator at the review widths, into scripts/themes/.out/stage6/w3/t25/look/.
 *   node scripts/themes/snap.mjs --name t25 --reuse --port 4470 -- node scripts/themes/stage6/w3-t25-look.mjs
 *   WIDTHS=1440,390 SCHEMES=dark ...
 */
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { OUT, launch, open } from './w3-t25-lib.mjs';

const WIDTHS = (process.env.WIDTHS || '1440,820,390').split(',').map(Number);
const SCHEMES = (process.env.SCHEMES || 'light,dark').split(',');
const D = join(OUT, 'look');
await mkdir(D, { recursive: true });
const { browser } = await launch();
for (const scheme of SCHEMES) {
  for (const width of WIDTHS) {
    const { ctx, page, errors } = await open(browser, { path: '/t/vaporwave/contact/sent/', width, scheme, settle: 600 });
    const tag = `${width}-${scheme}`;
    await page.screenshot({ path: join(D, `sent-rest-${tag}.png`), fullPage: true });
    await page.click('[data-desk-icon="computer"]');
    await page.screenshot({ path: join(D, `sent-selected-${tag}.png`) });
    for (const key of ['computer', 'bin', 'readme']) {
      await page.dblclick(`[data-desk-icon="${key}"]`);
      await page.waitForTimeout(200);
    }
    await page.screenshot({ path: join(D, `sent-open-${tag}.png`), fullPage: true });
    console.log(tag, 'errors', errors);
    await ctx.close();

    const k = await open(browser, { path: '/t/vaporwave/', width, scheme, settle: 600 });
    await k.page.locator('.kiosk-stand').scrollIntoViewIfNeeded();
    await k.page.waitForTimeout(300);
    await k.page.screenshot({ path: join(D, `home-kiosk-${tag}.png`) });
    await k.page.click('[data-floor="2"]');
    await k.page.waitForTimeout(1200);
    await k.page.screenshot({ path: join(D, `home-kiosk-2f-${tag}.png`) });
    console.log(tag, 'kiosk errors', k.errors);
    await k.ctx.close();
  }
}
await browser.close();
