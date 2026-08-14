// Rasterise the locked brand marks from SVG to PNG.
//
// Why this exists: SVG is the better format nearly everywhere, but not
// everywhere. Favicons and web-manifest icons want PNG, OG cards want PNG,
// social avatars want PNG, and plenty of print and upload paths refuse SVG
// outright. This produces those without anyone hand-exporting anything.
//
// THE THING THAT MATTERS HERE: the mark is two overlapping strokes composited
// with mix-blend-mode (screen on the night face, multiply on the day face).
// Most SVG rasterisers silently ignore blend modes and hand back two flat
// strokes, which reads as a different logo. This script verifies the blend
// actually happened rather than trusting it, and fails loudly if it did not.
//
// Run: node scripts/brand/rasterize-logos.mjs
import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'assets/brand/logos/files';
const OUT = 'assets/brand/logos/png';

// The static locked set. The 9/10/11/12 files are animated or exploratory and
// are deliberately excluded: a still frame of an animation is not an asset,
// it is a screenshot.
const STATIC = /^8[a-h]-/;

// Long-edge widths. 512 covers manifest icons and most upload paths; 2048 is
// the "someone wants to print this" size and downsamples cleanly.
const SIZES = [512, 2048];
// The favicon cut has its own job and its own sizes: browser tab, Apple touch
// icon, manifest.
const FAVICON_SIZES = [32, 180, 512];

const render = async (file, width) => {
  const svg = readFileSync(join(SRC, file));
  // density lifts the rasterisation resolution before resize, so hairlines and
  // square stroke caps stay crisp instead of being resampled from a small base.
  return sharp(svg, { density: 384 }).resize({ width }).png({ compressionLevel: 9 }).toBuffer();
};

// Sample three pixels down the vertical stems: stone alone, the overlap, and
// canopy alone. Under `screen` the overlap must be LIGHTER than either stroke;
// under `multiply` it must be DARKER. If the rasteriser dropped the blend, the
// overlap is just the top stroke and equals canopyOnly.
const verifyBlend = async (file, mode) => {
  const svg = readFileSync(join(SRC, file));
  const { data, info } = await sharp(svg, { density: 384 })
    .resize(400, 400).raw().toBuffer({ resolveWithObject: true });
  const at = (x, y) => {
    const i = (y * info.width + x) * info.channels;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const sum = (p) => p[0] + p[1] + p[2];
  // viewBox is 200 wide rendered to 400: scale 2. Stone stem spans x 51-65,
  // canopy 63-77, so the overlap is 63-65 (126-130 rendered).
  //
  // Sample at viewBox y=25 (rendered y=50), ABOVE both chevrons: the stone
  // chevron leaves the stem at y=32 and the canopy at y=28, and lower down a
  // chevron crosses the far stem and reads as a blend there too, which makes a
  // "canopy alone" sample impossible below y~28.
  const stone = at(110, 50);
  const overlap = at(128, 50);
  const canopy = at(144, 50);
  const blended = mode === 'screen'
    ? sum(overlap) > sum(stone) && sum(overlap) > sum(canopy)
    : sum(overlap) < sum(stone) && sum(overlap) < sum(canopy);
  return { stone, overlap, canopy, blended };
};

mkdirSync(OUT, { recursive: true });

const files = readdirSync(SRC).filter((f) => STATIC.test(f) && f.endsWith('.svg')).sort();
if (files.length === 0) throw new Error(`no static marks found in ${SRC}`);

// Prove the blend survives rasterisation before writing 30-odd files that might
// all be silently wrong.
const checks = [
  { file: '8a-mark-night.svg', mode: 'screen' },
  { file: '8a-mark-day.svg', mode: 'multiply' },
];
for (const { file, mode } of checks) {
  const r = await verifyBlend(file, mode);
  console.log(
    `blend ${mode.padEnd(8)} ${file.padEnd(20)} stone=${r.stone} overlap=${r.overlap} canopy=${r.canopy} -> ${r.blended ? 'BLENDED' : 'FLAT'}`,
  );
  if (!r.blended) {
    throw new Error(
      `${file}: mix-blend-mode was dropped by the rasteriser. The PNGs would be a different logo than the SVGs. Stop and use a renderer that supports blend modes.`,
    );
  }
}

let written = 0;
for (const file of files) {
  const base = file.replace(/\.svg$/, '');
  const sizes = base.startsWith('8c-') ? FAVICON_SIZES : SIZES;
  for (const width of sizes) {
    const png = await render(file, width);
    writeFileSync(join(OUT, `${base}-${width}.png`), png);
    written++;
  }
}
console.log(`\n${written} PNGs written to ${OUT} from ${files.length} SVGs`);
