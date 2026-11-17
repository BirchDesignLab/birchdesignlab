/* B2 task 6: render a standalone SVG file to a PNG (the oval birch check).
   node scripts/themes/grandmillennial/b2-t6-svg-shot.mjs <in.svg> <out.png> [scale] */
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const [inp, out, sc = '2'] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 360, height: 420 }, deviceScaleFactor: +sc });
await p.goto(pathToFileURL(resolve(inp)).href);
await p.waitForTimeout(300);
await p.screenshot({ path: out });
await b.close();
