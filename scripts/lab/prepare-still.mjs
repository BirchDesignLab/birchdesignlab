/**
 * Turn a raw capture off the BDL-007 stage into a shippable still.
 *
 * The capture comes straight from the live WebGL canvas (see
 * receive-capture.mjs), so it carries everything the renderer drew,
 * including the pedestal: a soft black radial-gradient plane under the
 * mark. On the dark field that blob reads as a shadow. As a standalone
 * transparent asset it is a grey smudge, and it is wanted gone.
 *
 * It cannot be cropped away, because it overlaps the base of the mark. It
 * can be separated by pixel, because the three things in the frame are
 * built differently:
 *
 *   the mark       solid geometry, alpha 255, warm cream and green
 *   the fireflies  additive sprites, partial alpha, bright and coloured
 *   the pedestal   a black gradient, partial alpha, no colour at all
 *
 * So: drop partially transparent pixels that are also essentially black.
 * The mark survives because it is opaque; its antialiased edges survive
 * because they carry the cream and green of the thing they belong to; the
 * fireflies survive because they are bright.
 *
 * Then crop to what is left and scale to a sane delivery size.
 *
 * Usage:
 *   node scripts/lab/prepare-still.mjs <in.png> <out.png> [maxWidth]
 */
import sharp from 'sharp';

const [, , inFile, outFile, maxWidthArg] = process.argv;
if (!inFile || !outFile) {
  console.error('usage: node scripts/lab/prepare-still.mjs <in.png> <out.png> [maxWidth]');
  process.exit(1);
}
const MAX_WIDTH = Number(maxWidthArg ?? 1600);

/** Partial alpha below this, with no channel above BLACKISH, is pedestal. */
const OPAQUE = 250;
const BLACKISH = 40;
/** Ignore near-nothing pixels when working out the crop. */
const CROP_ALPHA = 12;

const src = sharp(inFile);
const { width, height } = await src.metadata();
const raw = await src.ensureAlpha().raw().toBuffer();

let cleared = 0;
let minX = width, minY = height, maxX = -1, maxY = -1;

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    const a = raw[i + 3];
    if (a === 0) continue;

    if (a < OPAQUE && raw[i] < BLACKISH && raw[i + 1] < BLACKISH && raw[i + 2] < BLACKISH) {
      raw[i + 3] = 0;
      cleared++;
      continue;
    }
    if (a > CROP_ALPHA) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}

if (maxX < 0) {
  console.error('nothing left after clearing; check the thresholds');
  process.exit(1);
}

const boxW = maxX - minX + 1;
const boxH = maxY - minY + 1;
const pad = Math.round(Math.max(boxW, boxH) * 0.04);
const left = Math.max(0, minX - pad);
const top = Math.max(0, minY - pad);
const cropW = Math.min(width - left, boxW + pad * 2);
const cropH = Math.min(height - top, boxH + pad * 2);

const out = sharp(raw, { raw: { width, height, channels: 4 } })
  .extract({ left, top, width: cropW, height: cropH });

if (cropW > MAX_WIDTH) out.resize({ width: MAX_WIDTH });

const info = await out.png({ compressionLevel: 9, palette: false }).toFile(outFile);

console.log(`source        ${width}x${height}`);
console.log(`pedestal      ${cleared} pixels cleared`);
console.log(`content box   ${boxW}x${boxH} at ${minX},${minY}`);
console.log(`written       ${outFile} ${info.width}x${info.height} ${info.size} bytes`);
