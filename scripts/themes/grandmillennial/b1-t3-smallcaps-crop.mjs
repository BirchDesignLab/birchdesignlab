/** B1 task 3: before | after crops of the small-caps change (nav, kicker, Contact labels) for the founder.
 *  node scripts/themes/grandmillennial/b1-t3-smallcaps-crop.mjs  -> .out/stage5/b1/t3/smallcaps__<scheme>.png */
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '.out', 'stage5', 'b1', 't3');
for (const scheme of ['light', 'dark']) {
  const a = await loadImage(join(OUT, 'shots', `before__contact__${scheme}__1440.jpg`));
  const b = await loadImage(join(OUT, 'shots', `after__contact__${scheme}__1440.jpg`));
  const crops = [[300, 70, 780, 110, 'nav'], [560, 250, 320, 50, 'kicker'], [180, 780, 560, 160, 'labels']];
  const W = 1000, rowH = 140;
  const cv = createCanvas(W, crops.length * (rowH + 20) + 20); const g = cv.getContext('2d');
  g.fillStyle = '#777'; g.fillRect(0, 0, cv.width, cv.height);
  crops.forEach(([x, y, w, h], i) => {
    const s = Math.min((W / 2 - 20) / w, rowH / h);
    g.drawImage(a, x, y, w, h, 10, 10 + i * (rowH + 20), w * s, h * s);
    g.drawImage(b, x, y, w, h, W / 2 + 10, 10 + i * (rowH + 20), w * s, h * s);
  });
  await writeFile(join(OUT, `smallcaps__${scheme}.png`), cv.toBuffer('image/png'));
}
