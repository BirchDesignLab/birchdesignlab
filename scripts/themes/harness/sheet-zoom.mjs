/**
 * Cut one band (the same rectangle) out of every frame of a dense motion.mjs
 * strip and lay the bands out side by side, scaled up, so something small in
 * a frame (a faint wordmark over a nav row) can be read frame by frame.
 *
 * Written 09-23-26 for Tier 3 stage 2 (bauhaus small call 1): on a phone
 * arrival the old wordmark and bauhaus's new nav row share the top 60 px of
 * each frame, which a whole-sheet view shrinks past reading.
 *
 * Usage:
 *   node scripts/themes/harness/sheet-zoom.mjs --in <strip.png> --out <zoom.png> \
 *     --cols 8 --total-rows 7 [--head 40] [--frames 8-23] \
 *     [--x 0 --y 0 --w 1 --h 0.15] [--scale 2]
 * --frames is a 0-based inclusive range of cells; --x/--y/--w/--h are the
 * band as fractions of a cell's picture (the time label below each picture
 * is kept out by --label-h, default 30 px of the cell's pitch).
 */
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { writeFile } from 'node:fs/promises';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const im = await loadImage(arg('in'));
const cols = Number(arg('cols', 8));
const head = Number(arg('head', 40));
const totalRows = Number(arg('total-rows'));
const labelH = Number(arg('label-h', 30));
const [f0, f1] = arg('frames', '0-7').split('-').map(Number);
const fx = Number(arg('x', 0)), fy = Number(arg('y', 0)), fw = Number(arg('w', 1)), fh = Number(arg('h', 0.15));
const scale = Number(arg('scale', 2));
const cellW = im.width / cols;
const pitch = (im.height - head) / totalRows;
const picH = pitch - labelH;
const sw = cellW * fw, sh = picH * fh;
const n = f1 - f0 + 1;
const perRow = Math.max(1, Math.floor(1800 / (sw * scale)));
const rows = Math.ceil(n / perRow);
const c = createCanvas(Math.round(perRow * sw * scale), Math.round(rows * (sh * scale + 4)));
const ctx = c.getContext('2d');
ctx.fillStyle = '#222';
ctx.fillRect(0, 0, c.width, c.height);
for (let k = 0; k < n; k++) {
  const i = f0 + k;
  const sx = (i % cols) * cellW + fx * cellW;
  const sy = head + Math.floor(i / cols) * pitch + fy * picH;
  const dx = (k % perRow) * sw * scale;
  const dy = Math.floor(k / perRow) * (sh * scale + 4);
  ctx.drawImage(im, sx, sy, sw, sh, dx, dy, sw * scale, sh * scale);
}
await writeFile(arg('out'), c.toBuffer('image/png'));
console.log(arg('out'), `${n} bands`);
