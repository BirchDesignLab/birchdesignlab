/**
 * Stage 6 wave 1, task 6 (swiss P4, typophoto): derive the two web images from
 * the founder-approved CC0 photographs. See src/assets/swiss-photos-SOURCE.md
 * for the sources, licence and the processing applied.
 *
 * The untouched originals are staged in the gitignored
 * scripts/themes/.out/stage6/photos/ and are never committed. This script reads
 * them and writes the derivatives (AVIF and WebP, at web sizes) to src/assets/:
 *
 *   swiss-lab-band-<w>.avif|webp     Home's lab band: a hard threshold of the
 *       birch bark. One colour, carried by the alpha channel: black marks on
 *       transparent. The page shows it as it is, on a white band (a white field
 *       at the head of the black sheet in light, the white sheet in dark), so
 *       one file serves both schemes.
 *   swiss-field-<w>.avif|webp        About's red field: the upward trunk as
 *       a red duotone. Paper-coloured pixels whose alpha is the tone, so over
 *       the field's own red (#da0016, never remapped in dark) the mix between
 *       the two is exactly a red-to-paper duotone and there is no rectangle
 *       edge to show: the sky and the branches fall to alpha 0, the red.
 *
 *   node scripts/themes/stage6/w1-t6-photos.mjs            # write src/assets
 *   PREVIEW=1 node scripts/themes/stage6/w1-t6-photos.mjs  # also write
 *       previews (over the field colours) to scripts/themes/.out/stage6/w1/t6/
 *
 * Tunables are the constants below; the image weight before and after is
 * printed at the end.
 */
import sharp from 'sharp';
import { mkdir, stat, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const PHOTOS = join(REPO, 'scripts', 'themes', '.out', 'stage6', 'photos');
const ASSETS = join(REPO, 'src', 'assets');
const PREV = join(REPO, 'scripts', 'themes', '.out', 'stage6', 'w1', 't6');
const PREVIEW = !!process.env.PREVIEW;

/* ---- Home band: the threshold ---------------------------------------- */
const BAND_SRC = join(PHOTOS, 'Part_of_birch_trunk_in_Norrkila.jpg');
const BAND_WIDTHS = [1200, 2000];
/* Grey level (0 to 255) at or below which a pixel is a mark. The bark body is
   about 190 to 235, the lenticels 60 to 130, the furrowed bark under 90. */
const BAND_THRESHOLD = Number(process.env.BAND_T || 150);
/* A little blur before the cut so grain does not become speckle. */
const BAND_BLUR = Number(process.env.BAND_BLUR || 2.2);

/* ---- About: the red duotone ------------------------------------------- */
const FIELD_SRC = join(PHOTOS, 'Birch_trunk_in_Norrkila_1.jpg');
const FIELD_WIDTHS = [720, 1200, 1800];
const PAPER = [0xfa, 0xfa, 0xf7];
/* Tone curve: alpha is a smoothstep of the red channel between these two
   levels (of 255). The red channel, not luminance: it is what separates the
   blue sky (red about 60 to 130) from the white bark (200 and up) and the dark
   branches (under 80), so the sky falls to nothing, the field's own red, and
   no edge of the image's rectangle shows. */
const FIELD_LO = Number(process.env.FIELD_LO || 145);
const FIELD_HI = Number(process.env.FIELD_HI || 225);
/* Crop (fractions of the original) before the resize: the trunk on its
   diagonal, a little off the left where the lens falls away. */
const FIELD_CROP = { left: 0.04, top: 0.0, width: 0.96, height: 1.0 };

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

async function alphaImage(gray, w, h, alphaOf, rgb) {
  const out = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    out[i * 4] = rgb[0]; out[i * 4 + 1] = rgb[1]; out[i * 4 + 2] = rgb[2];
    out[i * 4 + 3] = alphaOf(gray[i]);
  }
  return sharp(out, { raw: { width: w, height: h, channels: 4 } });
}

async function write(img, base, label) {
  const sizes = {};
  for (const [fmt, opts] of [['avif', { quality: 62, effort: 7 }], ['webp', { quality: 80, alphaQuality: 90, effort: 6 }]]) {
    const file = `${base}.${fmt}`;
    await img.clone()[fmt](opts).toFile(file);
    sizes[fmt] = (await stat(file)).size;
  }
  console.log(label, JSON.stringify(sizes));
  return sizes;
}

async function preview(src, file, bg) {
  const m = await sharp(src).metadata();
  await sharp({ create: { width: m.width, height: m.height, channels: 3, background: bg } })
    .composite([{ input: src }])
    .png()
    .toFile(file);
}

await mkdir(PREV, { recursive: true });

// ---------------------------------------------------------------- Home band
for (const w of BAND_WIDTHS) {
  const { data, info } = await sharp(BAND_SRC).resize(w).greyscale().blur(BAND_BLUR).raw().toBuffer({ resolveWithObject: true });
  const img = await alphaImage(data, info.width, info.height, (g) => (g <= BAND_THRESHOLD ? 255 : 0), [0, 0, 0]);
  await write(img, join(ASSETS, `swiss-lab-band-${w}`), `band ${w}x${info.height}`);
  if (PREVIEW && w === BAND_WIDTHS[0]) {
    const png = await img.clone().png().toBuffer();
    await preview(png, join(PREV, 'band-on-white.png'), '#ffffff');
    // The same marks as the black sheet prints them in light: white on black.
    const inv = await sharp(png).ensureAlpha().linear([-1, -1, -1, 1], [255, 255, 255, 0]).png().toBuffer();
    await preview(inv, join(PREV, 'band-on-black.png'), '#0b0b0b');
  }
}

// ---------------------------------------------------------------- About field
for (const w of FIELD_WIDTHS) {
  const meta = await sharp(FIELD_SRC).metadata();
  const crop = {
    left: Math.round(meta.width * FIELD_CROP.left),
    top: Math.round(meta.height * FIELD_CROP.top),
    width: Math.round(meta.width * FIELD_CROP.width),
    height: Math.round(meta.height * FIELD_CROP.height),
  };
  const { data, info } = await sharp(FIELD_SRC).extract(crop).resize(w).extractChannel('red').raw().toBuffer({ resolveWithObject: true });
  const img = await alphaImage(data, info.width, info.height, (g) => Math.round(255 * smooth(FIELD_LO, FIELD_HI, g)), PAPER);
  await write(img, join(ASSETS, `swiss-field-${w}`), `field ${w}x${info.height}`);
  if (PREVIEW && w === FIELD_WIDTHS[1]) {
    await preview(await img.clone().png().toBuffer(), join(PREV, 'field-on-red.png'), '#da0016');
  }
}

const files = (await readdir(ASSETS)).filter((f) => f.startsWith('swiss-'));
let total = 0;
for (const f of files) { const s = (await stat(join(ASSETS, f))).size; total += s; console.log(f.padEnd(34), s); }
console.log('total src/assets/swiss-*', total);
