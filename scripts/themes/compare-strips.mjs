/**
 * Stack two motion strips, before over after, on one labelled sheet.
 *
 * Written 09-23-26 for the Tier 3 stage 1 founder review: the founder asked
 * to see the view-transition naming contract working ("i might have to see it
 * to understand fully"), so each comparison puts the strip filmed at the
 * pre-Stage-1 commit above the same strip filmed on the Stage 1 build.
 *
 * Usage:
 *   node scripts/themes/compare-strips.mjs --before <png> --after <png> \
 *     --out <png> [--title "..."] [--before-label "..."] [--after-label "..."] \
 *     [--quality 86]
 *
 * An --out ending in .jpg writes a JPEG (quality 86 by default) instead of a
 * PNG. Added 09-23-26 (Tier 3 stage 2): tall phone sheets run past 5 MB as
 * PNG, too big to reach the founder's phone. --quality added 09-25-26 (Tier
 * 3 stage 3, Tier B) for founder sheets that need q90+; the default is
 * unchanged so every existing caller keeps its own result.
 */
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

const beforePath = arg('before');
const afterPath = arg('after');
const out = arg('out');
if (!beforePath || !afterPath || !out) {
  console.error('usage: node scripts/themes/compare-strips.mjs --before <png> --after <png> --out <png> [--title ...]');
  process.exit(1);
}
const title = arg('title', '');
const beforeLabel = arg('before-label', 'BEFORE');
const afterLabel = arg('after-label', 'AFTER');
const quality = Number(arg('quality', '86'));

const [before, after] = await Promise.all([loadImage(beforePath), loadImage(afterPath)]);
const PAD = 16;
const HEAD = title ? 44 : 0;
const TAG = 40;
const width = Math.max(before.width, after.width) + PAD * 2;
const height = HEAD + TAG + before.height + PAD + TAG + after.height + PAD;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#111113';
ctx.fillRect(0, 0, width, height);
ctx.textBaseline = 'middle';

let y = 0;
if (title) {
  ctx.fillStyle = '#f4f0e6';
  ctx.font = '600 20px sans-serif';
  ctx.fillText(title, PAD, HEAD / 2 + 4);
  y = HEAD;
}
function block(img, label, colour) {
  ctx.fillStyle = colour;
  ctx.fillRect(PAD, y + 8, 6, TAG - 16);
  ctx.fillStyle = '#f4f0e6';
  ctx.font = '600 20px sans-serif';
  ctx.fillText(label, PAD + 16, y + TAG / 2);
  y += TAG;
  ctx.drawImage(img, PAD, y);
  y += img.height + PAD;
}
block(before, beforeLabel, '#c0504d');
block(after, afterLabel, '#a3bd8f');

await mkdir(dirname(out), { recursive: true });
await writeFile(out, /\.jpe?g$/i.test(out) ? await canvas.encode('jpeg', quality) : await canvas.encode('png'));
console.log(out);
