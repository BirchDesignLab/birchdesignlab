/**
 * Stage 6 wave 3, task 19 (cottagecore phone seeds): a timestamped strip of the top of a view at 390 light, one
 * frame every STEP ms for SECS seconds, laid out side by side (each frame is the viewport's top HEIGHT px), so
 * the seeds in the header cloth can be seen arriving, drifting and leaving, and counted.
 *
 *   BASE=... node scripts/themes/stage6/w3-t19-cc-seeds-strip.mjs <path> [secs=12] [step=1500] [height=300] [out-name]
 *
 * Writes scripts/themes/.out/stage6/w3/t19/<out-name>.png (gitignored).
 */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { launch, open, OUT } from './w3-t19-lib.mjs';

const [path, secsArg, stepArg, heightArg, nameArg] = process.argv.slice(2);
const SECS = Number(secsArg || 12), STEP = Number(stepArg || 1500), H = Number(heightArg || 300);
const browser = await launch();
const { page } = await open(browser, { path, width: 390, scheme: 'light', settle: 2500 });
const frames = [];
const t0 = Date.now();
while (Date.now() - t0 < SECS * 1000) {
  frames.push({ ms: Date.now() - t0, buf: await page.screenshot({ clip: { x: 0, y: 0, width: 390, height: H } }) });
  await page.waitForTimeout(STEP);
}
const pad = 6, top = 22;
const c = createCanvas(frames.length * (390 + pad), H + top);
const g = c.getContext('2d');
g.fillStyle = '#222'; g.fillRect(0, 0, c.width, c.height);
for (const [k, f] of frames.entries()) {
  g.drawImage(await loadImage(f.buf), k * (390 + pad), top);
  g.fillStyle = '#fff'; g.font = '15px sans-serif'; g.fillText(`+${(f.ms / 1000).toFixed(1)} s`, k * (390 + pad) + 6, 16);
}
const file = join(OUT, `${nameArg || 'seeds-strip'}.png`);
await writeFile(file, c.toBuffer('image/png'));
console.log(file, frames.length, 'frames');
await browser.close();
