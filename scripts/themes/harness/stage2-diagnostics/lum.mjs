import { loadImage, createCanvas } from '@napi-rs/canvas';
import { readFile } from 'node:fs/promises';

const [,, sheetPath, manifestPath, key] = process.argv;
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const entry = manifest[key];
if (!entry) { console.error('no entry', key, Object.keys(manifest).slice(0,5)); process.exit(1); }
const img = await loadImage(sheetPath);
const canvas = createCanvas(img.width, img.height);
const ctx = canvas.getContext('2d');
ctx.drawImage(img, 0, 0);
// entry.frames: array of {t, x,y,w,h} tile positions? inspect structure
console.log(JSON.stringify(entry, null, 2).slice(0, 2000));
