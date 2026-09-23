/**
 * Pixel-diff two capture sets made by capture.mjs.
 *
 * Written 09-22-26. The theme-schools build promises the root pages stay
 * visually untouched while their bodies move into theme components, and each
 * dependency major promises the same for root and Lab pages. A screenshot
 * compared by eye misses a 2px shift; this does not.
 *
 * Compares every PNG present in both sets. A pixel counts as changed when any
 * channel differs by more than --tolerance (default 8 of 255, which absorbs
 * GPU antialiasing jitter but not a moved glyph). Writes a red-on-grey diff
 * image for each file over --max-ratio (default 0.0005, i.e. 0.05%).
 *
 * Usage:
 *   node scripts/themes/diff-captures.mjs --a astro5 --b astro7 [--tolerance 8] [--max-ratio 0.0005]
 */
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const HERE = dirname(fileURLToPath(import.meta.url));
function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

const a = arg('a');
const b = arg('b');
if (!a || !b) {
  console.error('usage: --a <label> --b <label>');
  process.exit(1);
}
const tolerance = Number(arg('tolerance', 8));
const maxRatio = Number(arg('max-ratio', 0.0005));
const dirA = join(HERE, '.out', a);
const dirB = join(HERE, '.out', b);
const outDir = join(HERE, '.out', `diff-${a}-vs-${b}`);
await mkdir(outDir, { recursive: true });

async function pixels(path) {
  const img = await loadImage(await readFile(path));
  const c = createCanvas(img.width, img.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  return { w: img.width, h: img.height, data: ctx.getImageData(0, 0, img.width, img.height).data };
}

const filesA = new Set((await readdir(dirA)).filter((f) => f.endsWith('.png')));
const filesB = (await readdir(dirB)).filter((f) => f.endsWith('.png'));
const common = filesB.filter((f) => filesA.has(f)).sort();
const onlyA = [...filesA].filter((f) => !filesB.includes(f));
const onlyB = filesB.filter((f) => !filesA.has(f));

let failures = 0;
const report = [];
for (const file of common) {
  const pa = await pixels(join(dirA, file));
  const pb = await pixels(join(dirB, file));
  if (pa.w !== pb.w || pa.h !== pb.h) {
    failures++;
    report.push(`${file}: size ${pa.w}x${pa.h} vs ${pb.w}x${pb.h}`);
    continue;
  }
  const diff = createCanvas(pa.w, pa.h);
  const dctx = diff.getContext('2d');
  const out = dctx.createImageData(pa.w, pa.h);
  let changed = 0;
  for (let i = 0; i < pa.data.length; i += 4) {
    const d = Math.max(
      Math.abs(pa.data[i] - pb.data[i]),
      Math.abs(pa.data[i + 1] - pb.data[i + 1]),
      Math.abs(pa.data[i + 2] - pb.data[i + 2]),
    );
    const grey = (pa.data[i] + pa.data[i + 1] + pa.data[i + 2]) / 12 + 40;
    if (d > tolerance) {
      changed++;
      out.data[i] = 255; out.data[i + 1] = 0; out.data[i + 2] = 0;
    } else {
      out.data[i] = grey; out.data[i + 1] = grey; out.data[i + 2] = grey;
    }
    out.data[i + 3] = 255;
  }
  const ratio = changed / (pa.w * pa.h);
  const bad = ratio > maxRatio;
  if (bad) {
    failures++;
    dctx.putImageData(out, 0, 0);
    await writeFile(join(outDir, file), diff.toBuffer('image/png'));
  }
  report.push(`${bad ? 'CHANGED' : 'same   '} ${file}: ${(ratio * 100).toFixed(4)}% (${changed} px)`);
}

for (const line of report) console.log(line);
if (onlyA.length) console.log(`only in ${a}: ${onlyA.join(', ')}`);
if (onlyB.length) console.log(`only in ${b}: ${onlyB.join(', ')}`);
console.log(`${common.length} compared, ${failures} over threshold; diffs in ${outDir}`);
process.exitCode = failures ? 2 : 0;
