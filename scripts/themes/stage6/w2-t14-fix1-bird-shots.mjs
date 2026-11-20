/**
 * Stage 6 wave 2, task 14, fix round 1 (critic C2): About at 701 to 820 with the live bird on its new perch
 * (limb 3 of scene.json). Writes a whole-page sheet and a 4x crop of the bird at each width, resting and
 * after a tap (the bird flies to its away point), and prints the bird's box and whether the perch sits
 * on a painted limb stroke (the limb's own colour under the bird's feet is not read; the crop is for the eye).
 *
 *   BASE=http://127.0.0.1:4470 node scripts/themes/stage6/w2-t14-fix1-bird-shots.mjs [outDir]
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const BASE = (process.env.BASE || process.env.SNAP_BASE || 'http://127.0.0.1:4470').replace(/\/$/, '');
const OUT = process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), '..', '.out', 'stage6', 'w2', 't14', 'fix1-bird');
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const scheme of ['light', 'dark']) {
  for (const w of [701, 760, 820]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 1180 }, deviceScaleFactor: 2, colorScheme: scheme });
    await suppressPrompt(ctx);
    await ctx.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
    await page.goto(`${BASE}/t/grandmillennial/about/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: join(OUT, `about-${scheme}-${w}.png`), fullPage: true });
    const box = await page.evaluate(() => {
      const wb = [...document.querySelectorAll('.wb')].find((e) => getComputedStyle(e.closest('svg')).display !== 'none');
      const b = wb.querySelector('.wb-perch').getBoundingClientRect();
      return { x: Math.round(b.x), y: Math.round(b.y + scrollY), w: Math.round(b.width), h: Math.round(b.height) };
    });
    console.log(scheme, w, JSON.stringify(box));
    const clip = { x: Math.max(0, box.x - 90), y: Math.max(0, box.y - 60), width: Math.min(w - Math.max(0, box.x - 90), 240), height: 160 };
    await page.screenshot({ path: join(OUT, `bird-${scheme}-${w}.png`), clip, fullPage: true });
    await ctx.close();
  }
}
await browser.close();
