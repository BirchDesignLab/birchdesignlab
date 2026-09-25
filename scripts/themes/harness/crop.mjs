/**
 * Cut one rectangle out of a still or a sheet, optionally scaled, so a detail
 * in a tall founder sheet can be read at full size.
 *
 * Written 09-25-26 for Tier 3 stage 3 (Tier B review): the vaporwave
 * before/after sheets are 1472 x 8400 px, which shrink past reading whole.
 *
 * Usage:
 *   node scripts/themes/harness/crop.mjs --in <png|jpg> --out <png|jpg> \
 *     --x 0 --y 0 --w 1472 --h 1200 [--scale 1]
 * x, y, w, h are source pixels; w and h clamp to the image. A .jpg --out
 * writes JPEG q92.
 */
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const im = await loadImage(arg('in'));
const x = Number(arg('x', '0'));
const y = Number(arg('y', '0'));
const w = Math.min(Number(arg('w', String(im.width))), im.width - x);
const h = Math.min(Number(arg('h', String(im.height))), im.height - y);
const scale = Number(arg('scale', '1'));
const out = arg('out');

const canvas = createCanvas(Math.round(w * scale), Math.round(h * scale));
const ctx = canvas.getContext('2d');
ctx.drawImage(im, x, y, w, h, 0, 0, canvas.width, canvas.height);
await mkdir(dirname(out), { recursive: true });
await writeFile(out, /\.jpe?g$/i.test(out) ? await canvas.encode('jpeg', 92) : await canvas.encode('png'));
console.log(`${out} ${canvas.width}x${canvas.height}`);
