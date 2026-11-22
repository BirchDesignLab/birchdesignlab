// Captures BDL-013's own link-preview card: the drawing sheet's share frame
// (title block plus the elevation with its leaders), Plain, Day (ink on
// cream), at the 1200x630 every other OG card uses.
//
// Why a card of its own: same reason as BDL-012. The shared Lab cards are a
// wordmark on bark and say nothing about the piece; this one exists to be
// shared. The capture is committed (src/experiments/bdl-013/og.png) and
// scripts/og/generate.ts copies it into public/og/ at prebuild.
//
// It shoots the built site, not the dev server, so the card is what ships.
// Re-run after any change to the sheet's layout, copy or palette:
//   npm run build
//   npm run preview -- --port 4400        (leave running, other terminal)
//   node scripts/og/capture-bdl-013.mjs [--origin http://localhost:4400]
//
// ?og=1 switches the stage to its 1200x630 share frame and hides the Lab pill,
// wall label and plate; ?scheme=light pins Day whatever the OS prefers. The
// sheet has no motion past a 0.9s ink-in fade, so the wait below covers it.
import { chromium } from 'playwright';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '..', '..', 'src', 'experiments', 'bdl-013', 'og.png');
const at = process.argv.indexOf('--origin');
const origin = at >= 0 ? process.argv[at + 1] : 'http://localhost:4400';

const W = 1200, H = 630;
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1, colorScheme: 'light' });
  await page.goto(`${origin}/lab/bdl-013/?og=1&scheme=light`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  const bad = await page.evaluate(() => {
    const s = document.getElementById('stage');
    const r = s ? s.getBoundingClientRect() : null;
    const faces = [...document.fonts].filter((f) => f.status !== 'loaded' && /Marcellus|Spectral|Plex/.test(f.family)).map((f) => f.family);
    return {
      stage: r ? [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] : null,
      scroll: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
      faces,
    };
  });
  // The frame must sit exactly on the viewport at scale 1, with nothing past it.
  if (!bad.stage || bad.stage.join() !== `0,0,${W},${H}` || bad.scroll.join() !== `${W},${H}`) {
    throw new Error(`[og] frame is off: stage ${bad.stage}, document ${bad.scroll}`);
  }
  // Faces that are declared but never used report "unloaded"; only fail on
  // the three families the sheet draws with if none of their faces loaded.
  const loaded = [...new Set(await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family)))];
  for (const fam of ['Marcellus', 'Spectral', 'IBM Plex Mono']) {
    if (!loaded.some((l) => l.replace(/["']/g, '') === fam)) throw new Error(`[og] font not loaded: ${fam} (loaded: ${loaded.join(', ')})`);
  }
  await page.screenshot({ path: OUT, type: 'png', clip: { x: 0, y: 0, width: W, height: H } });
  console.log(`[og] wrote ${OUT}`);
} finally {
  await browser.close();
}
