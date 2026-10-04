// Quick look at the pattern on a plain page.
// node preview.mjs <out.png> [x y w h] [deviceScale] [ink]
import { chromium } from 'playwright';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const out = process.argv[2];
const [x = 0, y = 0, w = 1440, h = 900] = process.argv.slice(3, 7).map(Number);
const scale = Number(process.argv[7] || 1);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: scale });
await p.goto(pathToFileURL(join(HERE, 'toile-preview.html')).href);
await p.screenshot({ path: out, clip: { x, y, width: w, height: h } });
await b.close();
