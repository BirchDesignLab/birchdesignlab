// Stage 6 cottagecore critic: crop/scale evidence images for reading.
// usage: node critic-cottagecore-crop.mjs <in> <out> <x0> <y0> <w> <h> [maxW]
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { writeFileSync } from 'node:fs';
const [inp, out, x0, y0, w, h, maxW = '1400'] = process.argv.slice(2);
const img = await loadImage(inp);
const W = Math.min(+w, img.width - +x0), H = Math.min(+h, img.height - +y0);
const s = Math.min(1, +maxW / W);
const c = createCanvas(Math.round(W * s), Math.round(H * s));
c.getContext('2d').drawImage(img, +x0, +y0, W, H, 0, 0, c.width, c.height);
writeFileSync(out, out.endsWith('.png') ? c.toBuffer('image/png') : c.toBuffer('image/jpeg', 85));
console.log(out, c.width, c.height);
