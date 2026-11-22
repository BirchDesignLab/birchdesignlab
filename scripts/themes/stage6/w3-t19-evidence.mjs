/**
 * Stage 6 wave 3, task 19: the evidence sheets, shot against a built snapshot (never the dev server):
 *   node scripts/themes/snap.mjs --name w3t19 --reuse --port 4470 -- node scripts/themes/stage6/w3-t19-evidence.mjs [sheets|crops|all]
 * (SNAP_BASE is set by snap.mjs; BASE overrides.) GPU Chromium, reduced transparency forced to no-preference,
 * the portal prompt suppressed, the switcher hidden. Writes under scripts/themes/.out/stage6/w3/t19/ev/ (gitignored):
 *   sheets  whole-page, both schemes: vaporwave Services at 1440, 820, 390 and Home at 390 and 820; grandmillennial
 *           Home at 873, 1024, 1101, 1180, 1440 and Contact at 390; cottagecore Home at 641, 700, 820 and 1440.
 *   crops   the Services lobby band at 1440, 820, 390; the Home kiosk at 360, 390, 820; the vaporwave header at
 *           360 and 375; the Home hero top at 390 (the CSS sky vs the shader); the ribbon tape at 360 and 390.
 */
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { launch, open, OUT, renderer } from './w3-t19-lib.mjs';

const WHAT = process.argv[2] || 'all';
const EV = join(OUT, 'ev');
await mkdir(EV, { recursive: true });
const browser = await launch();
let shown = false;

async function shoot(path, width, scheme, name, what = 'full', pad = 8) {
  const { ctx, page } = await open(browser, { path, width, scheme, settle: 1500 });
  if (!shown) { console.log('renderer:', await renderer(page)); shown = true; }
  const file = join(EV, `${name}-${width}-${scheme}.png`);
  if (what === 'full') await page.screenshot({ path: file, fullPage: true });
  else if (what === 'top') await page.screenshot({ path: file });
  else {
    const loc = page.locator(what).first();
    await loc.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const box = await loc.boundingBox();
    const sy = await page.evaluate(() => scrollY);
    await page.screenshot({ path: file, fullPage: true, clip: { x: Math.max(0, box.x - pad), y: Math.max(0, box.y + sy - pad), width: Math.min(width, box.width + 2 * pad), height: box.height + 2 * pad } });
  }
  console.log(file);
  await ctx.close();
}

const schemes = ['light', 'dark'];
if (WHAT === 'sheets' || WHAT === 'all') {
  for (const s of schemes) {
    for (const w of [1440, 820, 390]) await shoot('/t/vaporwave/services/', w, s, 'vw-services');
    for (const w of [820, 390]) await shoot('/t/vaporwave/', w, s, 'vw-home');
    for (const w of [873, 1024, 1101, 1180, 1440]) await shoot('/t/grandmillennial/', w, s, 'gm-home');
    await shoot('/t/grandmillennial/contact/', 390, s, 'gm-contact');
    for (const w of [641, 700, 820, 1440]) await shoot('/t/cottagecore/', w, s, 'cc-home');
  }
}
if (WHAT === 'crops' || WHAT === 'all') {
  for (const s of schemes) {
    for (const w of [1440, 820, 390]) await shoot('/t/vaporwave/services/', w, s, 'vw-lobby', '.ask-band', 10);
    for (const w of [360, 390, 820]) await shoot('/t/vaporwave/', w, s, 'vw-kiosk', '.kiosk', 24);
    for (const w of [360, 375]) await shoot('/t/vaporwave/', w, s, 'vw-header', '.taskbar', 8);
    await shoot('/t/vaporwave/', 390, s, 'vw-hero-top', 'top');
    for (const w of [360, 390]) await shoot('/t/grandmillennial/contact/', w, s, 'gm-tape', '.trust', 14);
  }
}
await browser.close();
