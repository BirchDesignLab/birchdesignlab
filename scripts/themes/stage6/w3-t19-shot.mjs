/**
 * Stage 6 wave 3, task 19: one-off shots. A clip of one element (padded), the
 * whole page, or the top viewport, at one width and scheme.
 *
 *   node scripts/themes/stage6/w3-t19-shot.mjs <path> <width> <scheme> <selector|full|top> [out-name] [pad] [scrollTo selector]
 *
 * Writes scripts/themes/.out/stage6/w3/t19/<out-name>.png (gitignored). BASE
 * env picks the server (default http://127.0.0.1:4470).
 */
import { launch, open, OUT, renderer } from './w3-t19-lib.mjs';
import { join } from 'node:path';

const [path, widthArg, scheme, what, nameArg, padArg] = process.argv.slice(2);
const width = Number(widthArg);
const browser = await launch();
const { page } = await open(browser, { path, width, scheme });
const name = nameArg || `${path.replace(/\W+/g, '_')}_${width}_${scheme}_${what.replace(/\W+/g, '')}`;
const file = join(OUT, `${name}.png`);
if (what === 'full') await page.screenshot({ path: file, fullPage: true });
else if (what === 'top') await page.screenshot({ path: file });
else {
  const pad = Number(padArg || 0);
  const box = await page.locator(what).first().boundingBox();
  const sy = await page.evaluate(() => scrollY);
  await page.screenshot({ path: file, fullPage: true, clip: { x: Math.max(0, box.x - pad), y: Math.max(0, box.y + sy - pad), width: Math.min(width, box.width + 2 * pad), height: box.height + 2 * pad } });
}
console.log(file, '|', await renderer(page));
await browser.close();
