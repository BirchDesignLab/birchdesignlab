// BDL-013 o5b: lay a tall phone shot out as columns so it can be reviewed at
// readable size. node scripts/lab/sheet-o5b-shots.mjs <shot.png> [cols=2] [sliceH=1700]
// Writes <shot>-sheet.png next to it (gitignored shots dir).
import { createRequire } from 'node:module';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const sharp = createRequire(join(root, 'package.json'))('sharp');
const [src, cols = 2, sliceH = 1700] = process.argv.slice(2);
const img = sharp(src), { width, height } = await img.metadata();
const n = Math.ceil(height / +sliceH), pad = 16;
const parts = [];
for (let i = 0; i < n; i++) {
  const h = Math.min(+sliceH, height - i * +sliceH);
  parts.push({ input: await sharp(src).extract({ left: 0, top: i * +sliceH, width, height: h }).toBuffer(), left: (i % +cols) * (width + pad), top: Math.floor(i / +cols) * (+sliceH + pad) });
}
const rows = Math.ceil(n / +cols);
await sharp({ create: { width: +cols * (width + pad), height: rows * (+sliceH + pad), channels: 3, background: '#888' } }).composite(parts).png().toFile(src.replace(/\.png$/, '-sheet.png'));
console.log(src.replace(/\.png$/, '-sheet.png'), n, 'slices');
