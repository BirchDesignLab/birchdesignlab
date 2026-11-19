/**
 * Stage 6 wave 1, task 5: join the reveal frames from w1-t5-evidence.mjs into
 * one timestamped strip.
 *   node scripts/themes/stage6/w1-t5-strip.mjs <evDir> <scheme> <width> <out.png> [cropTop] [cropHeight]
 */
import sharp from 'sharp';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const [dir, scheme, w, out, top = '0', height = '1200'] = process.argv.slice(2);
const frames = readdirSync(dir).filter((f) => f.startsWith(`${scheme}-${w}-2-reveal-`)).sort();
const tiles = [];
for (const f of frames) {
  const ms = f.match(/reveal-(\d+)ms/)[1];
  const img = await sharp(join(dir, f)).extract({ left: 0, top: +top, width: +w, height: +height }).toBuffer();
  const label = Buffer.from(`<svg width="${w}" height="28" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#000"/><text x="8" y="20" font-family="monospace" font-size="18" fill="#fff">${+ms} ms</text></svg>`);
  tiles.push(await sharp({ create: { width: +w, height: +height + 28, channels: 3, background: '#000' } }).composite([{ input: label, top: 0, left: 0 }, { input: img, top: 28, left: 0 }]).png().toBuffer());
}
await sharp({ create: { width: (+w + 8) * tiles.length, height: +height + 28, channels: 3, background: '#888' } })
  .composite(tiles.map((input, i) => ({ input, left: i * (+w + 8), top: 0 })))
  .png()
  .toFile(out);
console.log('wrote', out, tiles.length, 'frames');
