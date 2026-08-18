// Recompress specimen PNGs in place before commit. Astro already serves
// optimized formats at build time; this is about repo weight — screenshots
// land from capture tools at 1-5MB and history keeps every byte forever.
//
//   node scripts/compress-specimen-images.mjs src/content/lab/bdl-005/*.png
//
// Lossy palette quantization (like pngquant). Screenshots of flat UI survive
// it invisibly; photographic heroes usually do too, but eyeball the result —
// if banding shows, re-run the single file with QUALITY=95 or skip it.
import sharp from 'sharp';
import { statSync, writeFileSync } from 'node:fs';

const QUALITY = Number(process.env.QUALITY ?? 90);
const files = process.argv.slice(2);
if (!files.length) {
  console.error('usage: node scripts/compress-specimen-images.mjs <png...>');
  process.exit(1);
}

for (const file of files) {
  const before = statSync(file).size;
  const buf = await sharp(file)
    .png({ palette: true, quality: QUALITY, compressionLevel: 9, effort: 10 })
    .toBuffer();
  if (buf.length >= before) {
    console.log(`skip ${file}: already smaller than palette result`);
    continue;
  }
  writeFileSync(file, buf);
  const after = statSync(file).size;
  console.log(`${file}: ${(before / 1e6).toFixed(2)}MB -> ${(after / 1e6).toFixed(2)}MB`);
}
