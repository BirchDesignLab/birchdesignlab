/**
 * Sonnet-verifier: freeze Contact's .vw-floor::before at fixed cycle
 * fractions and screenshot, per vw-floor-critic2.mjs's pattern. Not a
 * permanent tool.
 * Usage: BDL_GPU=1 node scripts/themes/vaporwave/verify-floor-cycle.mjs
 * Output: scripts/themes/.out/b1-vw-ver/floor-cycle/*.png
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'b1-vw-ver', 'floor-cycle');
const BASE = process.env.SNAP_BASE || 'http://127.0.0.1:4476';
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
await page.goto(BASE + '/t/vaporwave/contact/', { waitUntil: 'networkidle' });
await page.evaluate(() => {
  const f = document.querySelector('.vw-floor');
  f.scrollIntoView({ block: 'center' });
});
await page.waitForTimeout(300);
const fractions = [0, 0.6, 0.8, 0.95];
const CYCLE_MS = 1600; // vw-floor's own animation cycle
const results = {};
for (const frac of fractions) {
  await page.evaluate((t) => {
    const f = document.querySelector('.vw-floor');
    const anims = f.getAnimations({ subtree: true }).concat(f.getAnimations());
    // also grab pseudo-element animations
    const allAnims = document.getAnimations().filter(a => a.effect && a.effect.target === f);
    for (const a of allAnims) { a.pause(); a.currentTime = t; }
  }, frac * CYCLE_MS);
  await page.waitForTimeout(80);
  const box = await page.locator('.vw-floor').boundingBox();
  await page.screenshot({ path: join(OUT, `frac-${frac}.png`), clip: { x: box.x - 20, y: box.y - 20, width: box.width + 40, height: box.height + 40 } });
  const transform = await page.evaluate(() => {
    const f = document.querySelector('.vw-floor');
    const cs = getComputedStyle(f, '::before');
    return { transform: cs.transform, transformOrigin: cs.transformOrigin };
  });
  results[frac] = transform;
}
console.log(JSON.stringify(results, null, 1));
await browser.close();
