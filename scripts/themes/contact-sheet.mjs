/**
 * Compose a capture run into one sheet per school: every page side by side,
 * dark then light, so a whole school reads at a glance.
 *
 * Written 09-23-26 for the founder's review of the six tranche-1 schools on
 * mobile. capture.mjs leaves one PNG per route, scheme and viewport; sixty
 * separate files are hard to compare, one tall sheet per school is not.
 *
 * Usage (after capture.mjs):
 *   node scripts/themes/contact-sheet.mjs --label mobile-review [--scale 0.5] [--quality 88]
 * Reads scripts/themes/.out/<label>/manifest.json, writes
 * scripts/themes/.out/<label>/sheets/<school>.jpg, or <school>__<viewport>.jpg
 * when the run holds more than one viewport (never mixed on one sheet).
 */
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

const label = arg('label');
if (!label) {
  console.error('usage: node scripts/themes/contact-sheet.mjs --label <capture label> [--scale 0.5] [--quality 88]');
  process.exit(1);
}
const scale = Number(arg('scale', 0.5));
const quality = Number(arg('quality', 88));
const dir = join(HERE, '.out', label);
const { shots } = JSON.parse(await readFile(join(dir, 'manifest.json'), 'utf8'));

const PAGE_ORDER = ['', 'about', 'services', 'contact', 'contact/sent'];
const pageOf = (route) => route.split('/').slice(3).filter(Boolean).join('/');
const schoolOf = (route) => route.split('/')[2];

const viewports = new Set(shots.map((s) => s.vpName));
const bySheet = new Map();
for (const shot of shots) {
  if (!shot.route.startsWith('/t/')) continue;
  const key = viewports.size > 1 ? `${schoolOf(shot.route)}__${shot.vpName}` : schoolOf(shot.route);
  if (!bySheet.has(key)) bySheet.set(key, []);
  bySheet.get(key).push(shot);
}

const GUTTER = 24;
const HEAD = 56;
await mkdir(join(dir, 'sheets'), { recursive: true });

for (const [id, list] of bySheet) {
  // Page-major, dark before light: each page's two schemes sit together.
  list.sort(
    (a, b) =>
      PAGE_ORDER.indexOf(pageOf(a.route)) - PAGE_ORDER.indexOf(pageOf(b.route)) ||
      (a.scheme === b.scheme ? 0 : a.scheme === 'dark' ? -1 : 1),
  );
  const images = await Promise.all(list.map((s) => loadImage(join(dir, s.file))));
  const cols = images.map((img) => ({ w: Math.round(img.width * scale), h: Math.round(img.height * scale) }));
  const width = cols.reduce((sum, c) => sum + c.w, 0) + GUTTER * (cols.length + 1);
  const height = HEAD + Math.max(...cols.map((c) => c.h)) + GUTTER;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1b1b1d';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#e8e6e1';
  ctx.font = '600 20px sans-serif';
  ctx.textBaseline = 'middle';

  let x = GUTTER;
  list.forEach((shot, i) => {
    const page = pageOf(shot.route) || 'home';
    ctx.fillText(`${page} · ${shot.scheme} · ${shot.vpName}`, x, HEAD / 2);
    ctx.drawImage(images[i], x, HEAD, cols[i].w, cols[i].h);
    x += cols[i].w + GUTTER;
  });

  const out = join(dir, 'sheets', `${id}.jpg`);
  await writeFile(out, await canvas.encode('jpeg', quality));
  console.log(`${id}: ${list.length} captures, ${width}x${height} -> ${out}`);
}
