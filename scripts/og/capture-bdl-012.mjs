// Captures BDL-012's own link-preview card: the data map with the "A ticket
// sells" journey lit, at the 1200x630 every other OG card uses.
//
// Why this entry gets a card of its own when the rest of the Lab shares two:
// the generic cards are a wordmark on bark, which says nothing about what is
// behind the link, and this piece exists to be shared. The capture is
// committed (src/experiments/bdl-012/og.png) and scripts/og/generate.ts
// copies it into public/og/ at prebuild, next to the generated cards.
//
// It shoots the built site, not the dev server, so what is on the card is
// what ships. Re-run after any change to the map's layout or palette:
//   npm run build
//   npm run preview -- --port 4400        (leave running, other terminal)
//   node scripts/og/capture-bdl-012.mjs [--origin http://localhost:4400]
//
// ?still turns all motion off, and with it a journey plays to its end state
// at once, so there is nothing to time.
import { chromium } from 'playwright';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '..', '..', 'src', 'experiments', 'bdl-012', 'og.png');
const at = process.argv.indexOf('--origin');
const origin = at >= 0 ? process.argv[at + 1] : 'http://localhost:4400';

// 1400x735 CSS pixels at a 6/7 device scale is 1200x630 output. The wider
// stage gives the 1104px map some margin and fits the journey's lowest box.
const W = 1400, H = 735;
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1200 / W });
  await page.goto(`${origin}/lab/bdl-012/?still&play=ticket`, { waitUntil: 'load' });
  await page.waitForSelector('#dm[data-ready]');
  // The journey starts half a second after the stage is ready.
  await page.waitForFunction(() => document.querySelectorAll('#dm-map-main .node.lit').length >= 6, null, { timeout: 15000 });
  await page.addStyleTag({
    content: `html { scroll-behavior: auto !important; }
      .hatch, details.label, details.plate, .dm .tour-bar, .dm .map-tools { display: none !important; }`,
  });
  await page.evaluate(() => {
    const m = document.getElementById('dm-map-main');
    scrollTo(0, m.getBoundingClientRect().top + scrollY - 26);
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: OUT, type: 'png', clip: { x: 0, y: 0, width: W, height: H } });
  console.log(`[og] wrote ${OUT}`);
} finally {
  await browser.close();
}
