// Stage 6 vaporwave critic: crop a region of a capture PNG (device px) to a jpg.
// Usage: node scripts/themes/stage6/critic-vaporwave-crop.mjs <png> <x> <y> <w> <h> <outName> [scale]
import { createCanvas, loadImage } from '@napi-rs/canvas';
import fs from 'node:fs';
const [src, x, y, w, h, name, sc = '1'] = process.argv.slice(2);
const OUT = 'scripts/themes/.out/stage6-critic-vaporwave/crops';
fs.mkdirSync(OUT, { recursive: true });
const img = await loadImage(src);
const s = Number(sc);
const c = createCanvas(Math.round(w * s), Math.round(h * s));
c.getContext('2d').drawImage(img, +x, +y, +w, +h, 0, 0, c.width, c.height);
fs.writeFileSync(`${OUT}/${name}.jpg`, await c.encode('jpeg', 90));
console.log(`${OUT}/${name}.jpg`, img.width, img.height);
