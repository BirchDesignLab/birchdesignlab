/**
 * Cut a few rows out of a dense motion.mjs strip at full resolution, so the
 * frames around a swap's midpoint can be read without the whole sheet.
 *
 * Written 09-23-26 for Tier 3 stage 2 (cottagecore item 2): a dense sheet of
 * 40+ frames is scaled far down when viewed whole, and a faint double
 * exposure is only visible at full size.
 *
 * Usage:
 *   node scripts/themes/harness/strip-rows.mjs --in <strip.png> --out <crop.png> \
 *     --rows 2,3 [--cols 4] [--head 40]
 * --rows are 0-based rows of frames; --cols the frames per row (4 for
 * desktop dense sheets); --head the title band's height in px.
 */
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { writeFile } from 'node:fs/promises';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const im = await loadImage(arg('in'));
const cols = Number(arg('cols', 4));
const head = Number(arg('head', 40));
const rows = arg('rows', '0').split(',').map(Number);
const cellW = im.width / cols;
// Cells are as tall as they are wide times the frame's aspect; find the
// row pitch from the cell count instead of guessing it.
const totalRows = Number(arg('total-rows', 0));
const pitch = totalRows ? (im.height - head) / totalRows : Number(arg('pitch'));
const canvas = createCanvas(im.width, Math.round(pitch * rows.length));
const g = canvas.getContext('2d');
rows.forEach((r, k) => g.drawImage(im, 0, head + r * pitch, im.width, pitch, 0, k * pitch, im.width, pitch));
await writeFile(arg('out'), canvas.toBuffer('image/png'));
