/**
 * Stage 6 glass critic: tile the live-probe viewport shots into small sheets
 * (one per page x scheme x viewport x mode, offsets left to right) so a
 * reviewer can read the whole scroll at once. Args: [scale] (default 0.5).
 */
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { readdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '.out', 'stage6-critic-glassmorphism');
const scale = Number(process.argv[2] || 0.5);
const files = (await readdir(DIR)).filter((f) => /__\d\d\.png$/.test(f));
const groups = {};
for (const f of files) { const k = f.replace(/__\d\d\.png$/, ''); (groups[k] ||= []).push(f); }
for (const [k, list] of Object.entries(groups)) {
  list.sort();
  const imgs = await Promise.all(list.map((f) => loadImage(join(DIR, f))));
  const w = Math.round(imgs[0].width * scale), h = Math.round(imgs[0].height * scale);
  const cols = Math.min(imgs.length, 3), rows = Math.ceil(imgs.length / cols);
  const c = createCanvas(cols * w + (cols - 1) * 6, rows * h + (rows - 1) * 6);
  const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
  imgs.forEach((im, i) => g.drawImage(im, (i % cols) * (w + 6), Math.floor(i / cols) * (h + 6), w, h));
  await writeFile(join(DIR, `sheet-${k}.jpg`), c.toBuffer('image/jpeg', 82));
}
console.log(Object.keys(groups).length, 'sheets');
