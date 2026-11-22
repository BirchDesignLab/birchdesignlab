/**
 * Build public/favicon.ico from the locked mark's favicon.svg.
 *
 * Why: browsers and crawlers that ignore <link rel="icon"> request
 * /favicon.ico by default, and it 404'd (11-16-26 inventory). The ICO holds
 * PNG frames (16, 32, 48), which every browser since IE 11 reads.
 *
 * Usage: node scripts/brand/make-favicon-ico.mjs
 * Re-run after any change to public/favicon.svg.
 */
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const svg = await readFile(join(ROOT, 'public', 'favicon.svg'));
const sizes = [16, 32, 48];
const pngs = await Promise.all(sizes.map((s) => sharp(svg, { density: 384 }).resize(s, s).png().toBuffer()));

// ICONDIR (6 bytes) + one ICONDIRENTRY (16 bytes) per image, then the PNGs.
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((s, i) => {
  const e = 6 + 16 * i;
  header.writeUInt8(s, e); // width (256 would be 0)
  header.writeUInt8(s, e + 1); // height
  header.writeUInt8(0, e + 2); // palette colours
  header.writeUInt8(0, e + 3); // reserved
  header.writeUInt16LE(1, e + 4); // colour planes
  header.writeUInt16LE(32, e + 6); // bits per pixel
  header.writeUInt32LE(pngs[i].length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += pngs[i].length;
});
const out = join(ROOT, 'public', 'favicon.ico');
await writeFile(out, Buffer.concat([header, ...pngs]));
console.log(`wrote ${out} (${sizes.join(', ')} px, ${offset} bytes)`);
