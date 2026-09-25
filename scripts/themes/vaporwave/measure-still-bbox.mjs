#!/usr/bin/env node
/**
 * Measures the opaque bounding box (alpha > threshold) of each stand-in
 * still in src/themes/vaporwave/stills/, as a fraction of the square canvas.
 *
 * Why: the B1 critic found the stills' subjects floating above their bases
 * (about-sphere-floats). The renders carry transparent margin below the
 * subject (room for a baked contact shadow that never reaches the canvas
 * edge), so a still stacked directly against a plinth or step reads as
 * hovering. This prints each still's bottom-margin fraction so a CSS fix
 * (negative margin / translate) can close exactly that gap instead of
 * guessing at a pixel value that only happens to look right at one size.
 *
 * Usage: node scripts/themes/vaporwave/measure-still-bbox.mjs [files...]
 * With no args, measures every .webp in src/themes/vaporwave/stills/.
 */
import sharp from 'sharp';
import { readdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const STILLS_DIR = join(import.meta.dirname, '..', '..', '..', 'src', 'themes', 'vaporwave', 'stills');
const ALPHA_THRESHOLD = 12; // out of 255; ignore near-transparent anti-aliasing fringe

async function measure(file) {
  const img = sharp(file);
  const { width, height } = await img.metadata();
  const { data, info } = await img.raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  let top = height, bottom = -1, left = width, right = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data[(y * width + x) * channels + 3];
      if (a > ALPHA_THRESHOLD) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }
  const bottomMarginFrac = (height - 1 - bottom) / height;
  const topMarginFrac = top / height;
  return { file: basename(file), width, height, top, bottom, left, right, topMarginFrac, bottomMarginFrac };
}

const args = process.argv.slice(2);
const files = args.length > 0 ? args : readdirSync(STILLS_DIR).filter((f) => f.endsWith('.webp')).map((f) => join(STILLS_DIR, f));

for (const file of files) {
  const r = await measure(file);
  console.log(
    `${r.file}: ${r.width}x${r.height}, opaque bbox y[${r.top},${r.bottom}] x[${r.left},${r.right}], ` +
      `bottom margin ${(r.bottomMarginFrac * 100).toFixed(1)}%, top margin ${(r.topMarginFrac * 100).toFixed(1)}%`,
  );
}
