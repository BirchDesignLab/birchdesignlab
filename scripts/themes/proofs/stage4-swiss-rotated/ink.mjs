/**
 * Stage 4 proof a3: measure the rotated word's ink from the section 02 crops.
 * For each 'left' / 'right' crop it scans columns from the frame edge for the
 * run of columns holding dark ink (the word), and reports ink thickness,
 * vertical extent against the section height, and the gap to the first text.
 *   node scripts/themes/proofs/stage4-swiss-rotated/ink.mjs [variant]
 */
import { loadImage, createCanvas } from '@napi-rs/canvas';
import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const out = join(HERE, '..', '..', '.out', 'stage4-proofs', 'swiss-rotated');
const checks = JSON.parse(await readFile(join(out, process.argv.includes('--partial') ? 'checks-partial.json' : 'checks.json'), 'utf8'));
const rows = [];
for (const c of checks) {
  if (!c.word || c.scheme !== 'light' || c.variant === 'drop') continue;
  const img = await loadImage(join(out, 'shots', `ink__${c.variant}__light__${c.size}.png`));
  const cv = createCanvas(img.width, img.height); const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, img.width, img.height).data;
  const scale = img.height / (c.word.secH + 80);
  let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1;
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
    const i = (y * img.width + x) * 4;
    if (d[i] < 128) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  }
  const a = minX, b = maxX + 1;
  const ys = [minY, maxY + 1];
  const pad = 40 * scale;
  rows.push({ variant: c.variant, size: c.size, inkL: +(a / scale).toFixed(1), inkR: +(b / scale).toFixed(1), thick: +((b - a) / scale).toFixed(1),
    inkTop: +((ys[0] - pad) / scale).toFixed(1), inkBottom: +((ys[1] - pad) / scale).toFixed(1), secH: +c.word.secH.toFixed(1),
    textL: Math.min(...c.clear.items.map((i) => i.l - c.word.secL)).toFixed(1), textR: Math.max(...c.clear.items.map((i) => i.r - c.word.secL)).toFixed(1) });
}
console.table(rows);
await writeFile(join(out, 'ink.json'), JSON.stringify(rows, null, 2) + '\n');
