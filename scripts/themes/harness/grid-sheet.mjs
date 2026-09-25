/**
 * Lay a folder's PNGs out on one labelled grid sheet, for reading many phone
 * shots in one look.
 *
 * Written 09-24-26 for Tier 3 stage 2's review panel (visual lens), to read
 * phone-review-390.mjs's per-school shots (prompt, scrolled header, dialog)
 * side by side across the six schools.
 *
 * Usage:
 *   node scripts/themes/harness/grid-sheet.mjs --dir <folder> --match <regex> \
 *     --out <sheet.jpg> [--cols 12] [--scale 0.25]
 * Files are sorted by name; each cell is labelled with its file name.
 */
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { readdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const dir = arg('dir');
const re = new RegExp(arg('match', '\\.png$'));
const cols = Number(arg('cols', 12));
const scale = Number(arg('scale', 0.25));
const files = readdirSync(dir).filter((f) => re.test(f)).sort();
const imgs = await Promise.all(files.map((f) => loadImage(join(dir, f))));
const cw = Math.round(Math.max(...imgs.map((i) => i.width)) * scale);
const ch = Math.round(Math.max(...imgs.map((i) => i.height)) * scale);
const lh = 28;
const rows = Math.ceil(imgs.length / cols);
const c = createCanvas(cols * (cw + 8), rows * (ch + lh + 8));
const g = c.getContext('2d');
g.fillStyle = '#222'; g.fillRect(0, 0, c.width, c.height);
g.font = '11px sans-serif'; g.fillStyle = '#fff';
imgs.forEach((im, k) => {
  const x = (k % cols) * (cw + 8), y = Math.floor(k / cols) * (ch + lh + 8);
  g.fillText(files[k].replace(/\.png$/, '').slice(0, 40), x + 2, y + 12);
  g.drawImage(im, x, y + lh, im.width * scale, im.height * scale);
});
await writeFile(arg('out'), c.toBuffer('image/jpeg', 88));
console.log(`${files.length} images -> ${arg('out')} ${c.width}x${c.height}`);
