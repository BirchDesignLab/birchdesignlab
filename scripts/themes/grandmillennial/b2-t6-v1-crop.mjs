/* B2 task 6 verifier: crop a region out of a whole-page sheet so a reviewer can read it.
 *   node scripts/themes/grandmillennial/b2-t6-v1-crop.mjs <in.jpg> <out.jpg> <x> <y> <w> <h> [scaleOut]
 * Coordinates are in the sheet's own pixels. */
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { writeFileSync } from 'node:fs';

const [inp, out, x, y, w, h, s = '1'] = process.argv.slice(2);
const img = await loadImage(inp);
const k = Number(s);
const c = createCanvas(Math.round(Number(w) * k), Math.round(Number(h) * k));
c.getContext('2d').drawImage(img, Number(x), Number(y), Number(w), Number(h), 0, 0, c.width, c.height);
writeFileSync(out, c.toBuffer('image/jpeg', 88));
