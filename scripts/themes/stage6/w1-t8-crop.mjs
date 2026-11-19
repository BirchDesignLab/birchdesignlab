/** Stage 6 w1 t8: crop the top of a whole-page frame (args: in out height). */
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { writeFile } from 'node:fs/promises';
const [inp, out, h] = process.argv.slice(2);
const img = await loadImage(inp);
const c = createCanvas(img.width, Number(h));
c.getContext('2d').drawImage(img, 0, 0);
await writeFile(out, await c.encode('png'));
