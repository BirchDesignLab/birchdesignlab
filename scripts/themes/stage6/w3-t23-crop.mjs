/**
 * Stage 6 wave 3, task 23: crop a whole-page sheet to its bottom or a region, for looking. Usage:
 *   node scripts/themes/stage6/w3-t23-crop.mjs <in.png> <out.png> <x> <y> <w> <h>   (y negative = from the bottom)
 */
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { writeFile } from 'node:fs/promises';
const [inp, out, x, y, w, h] = process.argv.slice(2);
const img = await loadImage(inp);
const sy = Number(y) < 0 ? img.height + Number(y) : Number(y);
const c = createCanvas(Number(w), Number(h));
c.getContext('2d').drawImage(img, Number(x), sy, Number(w), Number(h), 0, 0, Number(w), Number(h));
await writeFile(out, await c.encode('png'));
