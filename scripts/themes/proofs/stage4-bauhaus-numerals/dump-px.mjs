/* Print the green channel of a window of a shot: node dump-px.mjs <png> x0 y0 x1 y1 */
import { createCanvas, loadImage } from '@napi-rs/canvas';
const [f, x0, y0, x1, y1] = process.argv.slice(2); const im = await loadImage(f);
const c = createCanvas(im.width, im.height); const g = c.getContext('2d'); g.drawImage(im, 0, 0);
const d = g.getImageData(0, 0, im.width, im.height).data;
for (let y = +y0; y <= +y1; y++) { let row = String(y).padStart(3) + ':'; for (let x = +x0; x <= +x1; x++) row += String(d[(y * im.width + x) * 4 + 1]).padStart(4); console.log(row); }
