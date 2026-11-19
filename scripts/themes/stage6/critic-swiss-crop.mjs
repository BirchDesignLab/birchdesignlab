// Crop a region of a PNG for review. node critic-swiss-crop.mjs in out x y w h [scale]
import { loadImage, createCanvas } from '@napi-rs/canvas';
import fs from 'node:fs';
const [,, inp, out, x, y, w, h, s = '1'] = process.argv;
const img = await loadImage(inp);
const W = Math.min(+w, img.width - +x), H = Math.min(+h, img.height - +y);
const c = createCanvas(Math.round(W * +s), Math.round(H * +s));
c.getContext('2d').drawImage(img, +x, +y, W, H, 0, 0, c.width, c.height);
fs.writeFileSync(out, c.toBuffer('image/jpeg', 85));
