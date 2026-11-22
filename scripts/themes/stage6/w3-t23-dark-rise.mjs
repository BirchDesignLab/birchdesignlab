/**
 * Stage 6 wave 3, task 23: a close timestamped strip of the clock tapped in the dark scheme (does a firefly rise?).
 *   node scripts/themes/snap.mjs --name s6-w3-t23 --reuse --port 4470 -- node scripts/themes/stage6/w3-t23-dark-rise.mjs [path] [width]
 */
import { join } from 'node:path';
import { launch, open, reach, centre, startFilm, pickAt, strip, boxOf, OUT } from './w3-t23-lib.mjs';
const [path = '/t/cottagecore/', widthArg = '1440'] = process.argv.slice(2);
const width = Number(widthArg);
const { browser } = await launch();
const { ctx, page, mobile } = await open(browser, { path, width, scheme: 'dark', settle: 1500 });
await reach(page, '[data-cc-toy="dandelion"]');
const [x, y] = await centre(page, '[data-cc-toy="dandelion"] .dc-head');
const box = await boxOf(page, '[data-cc-toy="dandelion"]', 110);
const film = await startFilm(page);
if (mobile) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
await page.waitForTimeout(3600);
const frames = await film.stop();
await strip(pickAt(frames, [0, 100, 200, 300, 450, 600, 800, 1000, 1300, 1600, 2000, 2600]), join(OUT, `dark-rise-${width}.png`), `dark rise ${width}`, { cols: 6, cellW: 280, box, vpWidth: width });
await ctx.close();
await browser.close();
