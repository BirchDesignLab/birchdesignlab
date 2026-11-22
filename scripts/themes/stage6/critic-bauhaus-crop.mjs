// Stage 6 bauhaus critic: crop tall captures into readable tiles.
// usage: node scripts/themes/stage6/critic-bauhaus-crop.mjs <src.png> <tileHeight> [scale] [x0] [x1]
// Writes tiles to scripts/themes/.out/stage6-critic-bauhaus/<basename>__NN.png
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', '.out', 'stage6-critic-bauhaus');
mkdirSync(out, { recursive: true });

const [src, th = '1200', sc = '0.6', xa, xb] = process.argv.slice(2);
const img = await loadImage(src);
const tileH = Number(th);
const scale = Number(sc);
const x0 = xa ? Number(xa) : 0;
const x1 = xb ? Number(xb) : img.width;
const w = x1 - x0;
let n = 0;
for (let y = 0; y < img.height; y += tileH) {
  const h = Math.min(tileH, img.height - y);
  const c = createCanvas(Math.round(w * scale), Math.round(h * scale));
  const g = c.getContext('2d');
  g.drawImage(img, x0, y, w, h, 0, 0, c.width, c.height);
  const name = `${basename(src).replace(/\.\w+$/, '')}__${String(n++).padStart(2, '0')}.png`;
  writeFileSync(join(out, name), c.toBuffer('image/png'));
  console.log(join(out, name));
}
