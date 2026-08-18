/**
 * Sample dominant colours out of a reference photograph.
 *
 * Written for BDL-007: the bdlOrganic model's moss-star and lichen-crust
 * materials ship with no baseColorTexture and no baseColorFactor in every
 * export we have (draco glb, uncompressed glb, obj/mtl all say white), so
 * their albedo has to be authored. The reference photographs the model was
 * built from are the closest thing to source data that exists, and reading
 * the colour out of them beats picking a hex by eye.
 *
 * Buckets pixels into coarse hue/lightness families and prints the mean
 * colour of each, largest family first, so "the green in this photo" is an
 * answer rather than an impression.
 *
 * Usage: node scripts/lab/sample-reference-colors.mjs <image> [maxFamilies]
 */
import sharp from 'sharp';

const file = process.argv[2];
const maxFamilies = Number(process.argv[3] ?? 6);
if (!file) {
  console.error('usage: node scripts/lab/sample-reference-colors.mjs <image> [maxFamilies]');
  process.exit(1);
}

const SIZE = 160;   // plenty of pixels, fast
const { data } = await sharp(file)
  .resize(SIZE, SIZE, { fit: 'inside' })
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const hex = (r, g, b) =>
  '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

/** coarse quantisation: 4 levels per channel, so families not individual pixels */
const families = new Map();
for (let i = 0; i < data.length; i += 3) {
  const r = data[i], g = data[i + 1], b = data[i + 2];
  const key = `${r >> 6}-${g >> 6}-${b >> 6}`;
  const f = families.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
  f.n++; f.r += r; f.g += g; f.b += b;
  families.set(key, f);
}

const total = data.length / 3;
const ranked = [...families.values()].sort((a, b) => b.n - a.n).slice(0, maxFamilies);

console.log(file);
for (const f of ranked) {
  const r = f.r / f.n, g = f.g / f.n, b = f.b / f.n;
  const share = ((f.n / total) * 100).toFixed(1).padStart(5);
  const greenish = g > r && g > b ? '  <- green' : '';
  console.log(`  ${share}%  ${hex(r, g, b)}  rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})${greenish}`);
}
