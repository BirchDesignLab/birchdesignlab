/**
 * Wave B1 glass fix round 2, fix B, item 3: the S3 thumbnail sheet — glass
 * and vaporwave Home, dark and light, side by side at thumbnail scale, so
 * the founder can compare both schools' current look in one glance.
 * Vaporwave is captured live from the current tree (another seat's build),
 * not filmed by this script.
 *
 * Usage: node scripts/themes/glassmorphism/b1-fixB-s3-sheet.mjs
 * Input: scripts/themes/.out/b1-glass-fixB/s3-<school>-<scheme>.png (four)
 * Output: scripts/themes/.out/stage3-b1/glass-final/s3-thumbnails.jpg
 */
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const IN = join(HERE, '..', '.out', 'b1-glass-fixB');
const OUT = join(HERE, '..', '.out', 'stage3-b1', 'glass-final', 's3-thumbnails.jpg');

const cells = [
  ['glass', 'light', 'Glassmorphism · light'],
  ['glass', 'dark', 'Glassmorphism · dark'],
  ['vaporwave', 'light', 'Vaporwave · light'],
  ['vaporwave', 'dark', 'Vaporwave · dark'],
];

const THUMB_W = 480; // 1440 source -> 1/3 scale thumbnail
const SCALE = THUMB_W / 1440;
const THUMB_H = Math.round(900 * SCALE);
const PAD = 16;
const LABEL_H = 28;
const cols = 2, rows = 2;
const width = PAD + cols * (THUMB_W + PAD);
const height = PAD + 32 + rows * (LABEL_H + THUMB_H + PAD);

const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#111113';
ctx.fillRect(0, 0, width, height);
ctx.fillStyle = '#f4f0e6';
ctx.font = '600 22px sans-serif';
ctx.textBaseline = 'middle';
ctx.fillText('Stage 3, wave B1: glass (this fix round) and vaporwave (current tree), Home', PAD, PAD + 12);

for (let i = 0; i < cells.length; i++) {
  const [school, scheme, label] = cells[i];
  const col = i % cols, row = Math.floor(i / cols);
  const x = PAD + col * (THUMB_W + PAD);
  const y = PAD + 32 + row * (LABEL_H + THUMB_H + PAD);
  ctx.fillStyle = school === 'glass' ? '#a3bd8f' : '#c084fc';
  ctx.fillRect(x, y + 4, 6, LABEL_H - 8);
  ctx.fillStyle = '#f4f0e6';
  ctx.font = '600 20px sans-serif';
  ctx.fillText(label, x + 16, y + LABEL_H / 2);
  const img = await loadImage(join(IN, `s3-${school}-${scheme}.png`));
  ctx.drawImage(img, x, y + LABEL_H, THUMB_W, THUMB_H);
  ctx.strokeStyle = 'rgba(244,240,230,0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y + LABEL_H, THUMB_W, THUMB_H);
}

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, await canvas.encode('jpeg', 92));
console.log(OUT);
