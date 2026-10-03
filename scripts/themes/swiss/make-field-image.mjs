/**
 * Stage 4 B1 task 3 (swiss D1): the red-and-paper duotone of the Shining Tree,
 * the one image on About's manifesto field.
 *
 * Method from scripts/themes/proofs/stage4-swiss-duotone/make-duotone.mjs
 * (mapping B): luminance of the tree, stretched between its 2nd and 98th
 * percentile, runs from #da0016 (shadows, the moss) to #fafaf7 (highlights,
 * the bark). Two changes from the proof: the source is the large GPU render
 * (render-tree-still.mjs, 1597x2622, no upscale), and the output keeps the
 * tree's alpha instead of flattening onto red, so no lossy-WebP edge can
 * show against the field's CSS red.
 *
 * The output is the single swappable asset: src/assets/swiss-field.webp,
 * imported once in src/themes/swiss/pages/About.astro. To swap it for a
 * different logo or image, replace the file (or change that import) and set
 * --fld-ratio (height over width) on .manifesto to the new image's ratio.
 *
 *   node scripts/themes/swiss/make-field-image.mjs
 */
import sharp from 'sharp';
import { stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const SRC = join(HERE, 'tree-still-large.png');
const OUT = join(REPO, 'src', 'assets', 'swiss-field.webp');

const SHADOW = [0xda, 0x00, 0x16];
const LIGHT = [0xfa, 0xfa, 0xf7];
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const n = info.width * info.height;
const lum = new Float32Array(n);
const samples = [];
for (let i = 0; i < n; i++) {
  const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2], a = data[i * 4 + 3];
  lum[i] = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  if (a > 200 && i % 7 === 0) samples.push(lum[i]);
}
samples.sort((x, y) => x - y);
const lo = samples[Math.floor(samples.length * 0.02)];
const hi = samples[Math.floor(samples.length * 0.98)];
const out = Buffer.alloc(n * 4);
for (let i = 0; i < n; i++) {
  const t = Math.min(1, Math.max(0, (lum[i] - lo) / (hi - lo)));
  const c = mix(SHADOW, LIGHT, t);
  out[i * 4] = c[0]; out[i * 4 + 1] = c[1]; out[i * 4 + 2] = c[2]; out[i * 4 + 3] = data[i * 4 + 3];
}
await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
  .webp({ quality: 80, alphaQuality: 90, effort: 6 })
  .toFile(OUT);
const { size } = await stat(OUT);
console.log(`${OUT}: ${info.width}x${info.height}, ${size} bytes, ratio ${(info.height / info.width).toFixed(4)} (stretch ${lo.toFixed(3)}..${hi.toFixed(3)})`);
