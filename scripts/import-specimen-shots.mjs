// Import BDL-005 specimen shots from the Cheer & Chatter sweep output
// (scripts/screenshots/sweep-live-shots.mjs in that repo, run with
// --base https://cheerandchatter.com so headers show the real domain).
//
//   node scripts/import-specimen-shots.mjs [path-to-sweep-output-dir]
//
// Console (phone) shots get the art-precache toast cropped off the top and
// the desktop scrollbar off the right: both are real, neither belongs in a
// portrait of the console. The live-app URL line is blurred so the specimen
// never hands out a working room address. TV shots copy through untouched.
// Compress after:
//
//   node scripts/compress-specimen-images.mjs src/content/lab/bdl-005/*.png
import sharp from 'sharp';
import { copyFileSync } from 'node:fs';
import path from 'node:path';

const SRC = process.argv[2] ?? 'C:/git/websites/cheerAndChatter/files/docs/manual-images/live';
const DST = 'src/content/lab/bdl-005';

// crop values are physical px at deviceScaleFactor 2 (390x844 viewport)
const TOAST_PX = 106;
const SCROLLBAR_PX = 30;

const consoleShots = [
  ['04b-console-fact.png', 'host-console.png'],
  ['05-console-trivia.png', 'host-trivia.png'],
];
const tvShots = [
  ['12-tv-fact.png', 'tv-screen.png'],
  ['18b-tv-showcase-bdl.png', 'showcase-bdl.png'],
];

// The "On the TV <url>" line, in cropped-image coordinates. Codes are
// transient, but a screenshot should not hand out a room address at all.
const URL_BOX = { left: 155, top: 108, width: 470, height: 58 };

for (const [src, dst] of consoleShots) {
  const img = sharp(path.join(SRC, src));
  const { width, height } = await img.metadata();
  const cropped = await img
    .extract({ left: 0, top: TOAST_PX, width: width - SCROLLBAR_PX, height: height - TOAST_PX })
    .toBuffer();
  const blurred = await sharp(cropped).extract(URL_BOX).blur(14).toBuffer();
  await sharp(cropped)
    .composite([{ input: blurred, left: URL_BOX.left, top: URL_BOX.top }])
    .toFile(path.join(DST, dst));
  console.log(`${dst} <- ${src} (cropped, url blurred)`);
}
for (const [src, dst] of tvShots) {
  copyFileSync(path.join(SRC, src), path.join(DST, dst));
  console.log(`${dst} <- ${src}`);
}
