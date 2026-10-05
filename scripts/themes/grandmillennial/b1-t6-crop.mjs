/**
 * B1 task 6: crop the same region out of several shots and lay them side by side.
 *   node scripts/themes/grandmillennial/b1-t6-crop.mjs <out.png> <x> <y> <w> <h> <shot> [<shot> ...]
 * Shots are names under scripts/themes/.out/stage5/b1/t6/shots (without .jpg).
 */
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '.out', 'stage5', 'b1', 't6', 'shots');
const [out, x, y, w, h, ...names] = process.argv.slice(2);
const cv = createCanvas(names.length * (+w + 12) + 12, +h + 12);
const g = cv.getContext('2d');
g.fillStyle = '#777'; g.fillRect(0, 0, cv.width, cv.height);
for (const [i, n] of names.entries()) {
  const img = await loadImage(await readFile(join(DIR, `${n}.jpg`)));
  g.drawImage(img, +x, +y, +w, +h, 12 + i * (+w + 12), 6, +w, +h);
}
await writeFile(out, cv.toBuffer('image/png'));
