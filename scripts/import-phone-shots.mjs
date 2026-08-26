// Import BDL-005 console shots captured on a real phone, as opposed to the
// Playwright sweep that scripts/import-specimen-shots.mjs consumes. The host
// runs the night from a phone, so a phone capture is the truer portrait; the
// cost is iOS chrome, which this script removes.
//
//   node scripts/import-phone-shots.mjs
//
// Two cleanups, both about chrome rather than content:
//
//   1. The iOS status bar and Safari's floating URL pill are cropped off. On a
//      shot taken while the page is scrolled, the sticky app header tucks UP
//      under the status bar, so the clock and the wifi/battery glyphs land ON
//      TOP of the app's own header. Cropping there would behead the Mirror
//      button, so those glyphs are painted out with the flat field colour
//      first, and the crop then starts above the header. The button outlines
//      are left untouched: the fill rectangles are inset between them.
//   2. The "On the TV <url>" line is blurred. The pairing code it shows is a
//      working room address and the TV side takes no auth, so a published
//      screenshot must never hand one out. Same rule as the sweep importer.
//
// Coordinates are physical pixels in a 1320x2868 iPhone capture and are
// per-source by necessity: how far the header has tucked depends on the scroll
// position at the moment of capture. Re-measure if you reshoot.
//
// Compress after:
//   node scripts/compress-specimen-images.mjs src/content/lab/bdl-005/*.png
import sharp from 'sharp';
import path from 'node:path';

const SRC = process.argv[2] ?? 'C:/Users/thesk/Pictures/iCloud Photos/Photos';
const DST = 'src/content/lab/bdl-005';

// Sampled off the field itself, not guessed from the palette: the capture is
// display-P3 and the token's sRGB hex does not survive the conversion.
const FIELD = { r: 61, g: 64, b: 48 };
const OUT_WIDTH = 750; // matches the shots already in bdl-005/

const shots = [
  {
    src: 'IMG_2413.PNG',
    dst: 'host-trivia.png',
    // Light face, and scrolled far enough that the clock lands ON the event
    // title, so the header cannot be cleaned the way the console one can.
    // Cropped to start above the question card instead: the title and Mirror
    // button are lost, but so is the "On the TV" line, which is why this one
    // needs no blur. The question on screen names Taylor Swift, so the frame
    // still reads as the Swiftie night without the title bar.
    crop: { top: 308, bottom: 2610 },
    paint: [],
    urlBox: null,
  },
  {
    src: 'IMG_2409.PNG',
    dst: 'host-console.png',
    // Scrolled: the clock and the wifi/battery cluster sit over the app header.
    crop: { top: 40, bottom: 2606 },
    paint: [
      { left: 140, top: 50, width: 215, height: 70 },  // clock + location arrow
      { left: 920, top: 66, width: 56, height: 56 },   // cellular bars, outside the button
      { left: 982, top: 70, width: 305, height: 50 },  // wifi + battery, inside the button
    ],
    urlBox: { left: 248, top: 205, width: 706, height: 60 },
  },
];

for (const shot of shots) {
  const base = sharp(path.join(SRC, shot.src));
  const { width } = await base.metadata();

  // Paint before cropping so the rectangles stay in source coordinates.
  const patched = shot.paint.length
    ? await base
        .composite(
          shot.paint.map(rect => ({
            input: {
              create: { width: rect.width, height: rect.height, channels: 4, background: FIELD },
            },
            left: rect.left,
            top: rect.top,
          })),
        )
        .toBuffer()
    : await base.toBuffer();

  const cropped = await sharp(patched)
    .extract({ left: 0, top: shot.crop.top, width, height: shot.crop.bottom - shot.crop.top })
    .toBuffer();

  // Composite and resize are deliberately separate passes. sharp applies its
  // operations in a fixed internal order in which composite runs AFTER resize,
  // so chaining them would place this patch at the given coordinates in the
  // already-shrunk image rather than over the URL. Blur at full size, flatten,
  // then scale the finished frame.
  let masked = cropped;
  if (shot.urlBox) {
    const blurred = await sharp(cropped).extract(shot.urlBox).blur(18).toBuffer();
    masked = await sharp(cropped)
      .composite([{ input: blurred, left: shot.urlBox.left, top: shot.urlBox.top }])
      .toBuffer();
  }

  await sharp(masked).resize({ width: OUT_WIDTH }).toFile(path.join(DST, shot.dst));

  const notes = [shot.paint.length ? 'chrome painted out' : null, shot.urlBox ? 'url blurred' : 'url cropped out']
    .filter(Boolean)
    .join(', ');
  console.log(`${shot.dst} <- ${shot.src} (${notes}, ${OUT_WIDTH}px wide)`);
}
