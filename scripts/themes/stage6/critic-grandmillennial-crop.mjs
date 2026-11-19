// Stage 6 grandmillennial critic: slice a tall capture into readable tiles.
// node critic-grandmillennial-crop.mjs <in.png> <outPrefix> [tileH=1400] [scale=0.6] [x0 y0 w h]
import { loadImage, createCanvas } from '@napi-rs/canvas';
import { writeFileSync } from 'node:fs';
const [, , inp, out, tileHArg, scaleArg, ...rect] = process.argv;
const img = await loadImage(inp);
const tileH = Number(tileHArg || 1400), scale = Number(scaleArg || 0.6);
let [x0, y0, w, h] = rect.length ? rect.map(Number) : [0, 0, img.width, img.height];
console.log(inp, img.width, img.height);
let n = 0;
for (let y = y0; y < y0 + h; y += tileH) {
  const th = Math.min(tileH, y0 + h - y);
  const c = createCanvas(Math.round(w * scale), Math.round(th * scale));
  c.getContext('2d').drawImage(img, x0, y, w, th, 0, 0, c.width, c.height);
  const f = `${out}-${String(n++).padStart(2, '0')}.png`;
  writeFileSync(f, c.toBuffer('image/png'));
  console.log(f, y, th);
}
