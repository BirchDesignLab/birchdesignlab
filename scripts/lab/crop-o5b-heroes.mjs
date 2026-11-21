// BDL-013 o5b: crop the two live-demo hero screenshots to the nav row plus the
// headline (no subline, no language toggle) for the framework mockup.
//
//   node scripts/lab/crop-o5b-heroes.mjs
//
// Sources: src/content/lab/bdl-008/hero.png (Magnolia & Mane) and
// bdl-009/hero.png (Bayou Kitchen), 3200x1194 at 2x. Writes
// docs/bdl-013/mockups/assets/{magnolia,bayou}-hero.png. Crop boxes are in
// source pixels, found by eye: x 0..2300 drops the toggle at the right; the
// bottom edge sits between the headline and the subline.
import { createRequire } from 'node:module';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const sharp = createRequire(join(root, 'package.json'))('sharp');
const jobs = [
  ['src/content/lab/bdl-008/hero.png', 'magnolia-hero.png', 740],
  ['src/content/lab/bdl-009/hero.png', 'bayou-hero.png', 805],
];
for (const [src, dst, h] of jobs) {
  await sharp(join(root, src)).extract({ left: 0, top: 0, width: 2300, height: h }).toFile(join(root, 'docs/bdl-013/mockups/assets', dst));
  console.log(dst, 2300, h);
}
