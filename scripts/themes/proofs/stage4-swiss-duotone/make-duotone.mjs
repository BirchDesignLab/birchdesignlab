/**
 * Stage 4 Tier A proof a1: the red duotone of the Shining Tree still.
 *
 * Source: src/experiments/bdl-007/still.png (592x963, the tree on alpha).
 * Output (next to this script, committed):
 *   tree-red-black.webp  mapping A: shadows #0b0b0b, highlights #da0016,
 *                        field #da0016. Every pixel sits between black and
 *                        the red, so white type holds anywhere on it.
 *   tree-red-paper.webp  mapping B: shadows #da0016, highlights #fafaf7,
 *                        field #da0016. The bark goes pale; white type must
 *                        stay off the tree.
 * Both are the tree on a flat field of the red, cropped to the tree plus a
 * margin, so the CSS can place it with background-position at any size.
 * Prints the byte size of each.
 *
 *   node scripts/themes/proofs/stage4-swiss-duotone/make-duotone.mjs
 */
import sharp from 'sharp';
import { writeFile, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..', '..');
const SRC = join(REPO, 'src', 'experiments', 'bdl-007', 'still.png');

const RED = [0xda, 0x00, 0x16];
const BLACK = [0x0b, 0x0b, 0x0b];
const PAPER = [0xfa, 0xfa, 0xf7];
const SCALE = 1.75; // upscale so a 2x display still has some pixels
const CROP = { left: 0, top: 150, width: 592, height: 813 };

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

async function make(name, shadow, light) {
  const { data, info } = await sharp(SRC).ensureAlpha().extract(CROP).raw().toBuffer({ resolveWithObject: true });
  const n = info.width * info.height;
  // Luminance of the opaque pixels, for a percentile stretch.
  const lum = new Float32Array(n);
  const samples = [];
  for (let i = 0; i < n; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2], a = data[i * 4 + 3];
    lum[i] = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    if (a > 200) samples.push(lum[i]);
  }
  samples.sort((x, y) => x - y);
  const lo = samples[Math.floor(samples.length * 0.02)];
  const hi = samples[Math.floor(samples.length * 0.98)];
  const out = Buffer.alloc(n * 3);
  for (let i = 0; i < n; i++) {
    const a = data[i * 4 + 3] / 255;
    const t = Math.min(1, Math.max(0, (lum[i] - lo) / (hi - lo)));
    const sub = mix(shadow, light, t);
    for (let c = 0; c < 3; c++) out[i * 3 + c] = Math.round(sub[c] * a + RED[c] * (1 - a));
  }
  const w = Math.round(info.width * SCALE), h = Math.round(info.height * SCALE);
  const path = join(HERE, name);
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } })
    .resize(w, h, { kernel: 'lanczos3' })
    .webp({ quality: 82, effort: 6 })
    .toFile(path);
  const { size } = await stat(path);
  console.log(`${name}: ${w}x${h}, ${size} bytes (stretch ${lo.toFixed(3)}..${hi.toFixed(3)})`);
  return { name, w, h, size };
}

const a = await make('tree-red-black.webp', BLACK, RED);
const b = await make('tree-red-paper.webp', RED, PAPER);
await writeFile(join(HERE, 'sizes.json'), JSON.stringify({ a, b }, null, 2) + '\n');
