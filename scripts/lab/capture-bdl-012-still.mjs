// Captures a still of BDL-012's main map, the whole thing at its natural
// 1104px width, for the two places that need the map as a picture:
//
//   src/experiments/bdl-012/map-still.png   shown inside <noscript> on the
//                                           BDL-012 page, where a visitor
//                                           without JavaScript otherwise gets
//                                           an empty box where the map is
//   src/content/lab/bdl-005/data-map.png    the picture link from the case
//                                           study (BDL-005) to the map
//
// Both are committed. Re-run after any change to the map's boxes, lines,
// layout or palette, or the still drifts from the thing it stands in for:
//   node scripts/lab/capture-bdl-012-still.mjs [--origin http://localhost:4400]
//
// ?still turns every motion off, so there is nothing to time. The dashed
// lines it leaves are the page's own no-motion rendering of travelling light.
import { chromium } from 'playwright';
import { copyFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const OUT = join(root, 'src', 'experiments', 'bdl-012', 'map-still.png');
const COPY = join(root, 'src', 'content', 'lab', 'bdl-005', 'data-map.png');
const at = process.argv.indexOf('--origin');
const origin = at >= 0 ? process.argv[at + 1] : 'http://localhost:4400';

const browser = await chromium.launch();
try {
  // Wide enough that the map sits at 1:1, tall enough that nothing is fixed over it.
  const page = await browser.newPage({ viewport: { width: 1400, height: 1400 }, deviceScaleFactor: 1.5 });
  await page.goto(`${origin}/lab/bdl-012/?still`, { waitUntil: 'load' });
  await page.waitForSelector('#dm[data-ready]');
  await page.addStyleTag({
    content: `html { scroll-behavior: auto !important; }
      .hatch, details.label, details.plate, .dm .tour-bar, .dm .box-drawer { display: none !important; }
      #dm-view { padding: 0; }`,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  await page.locator('#dm-view').screenshot({ path: OUT });
  await copyFile(OUT, COPY);
  console.log(`[still] wrote ${OUT}\n[still] copied to ${COPY}`);
} finally {
  await browser.close();
}
