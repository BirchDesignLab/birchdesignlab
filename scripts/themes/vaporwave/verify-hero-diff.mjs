/**
 * Sonnet-verifier: pixel-diff Home hero screenshots, before (stage3-base)
 * vs after (b1-vw), both schemes/viewports. Not a permanent tool.
 * Usage: node scripts/themes/vaporwave/verify-hero-diff.mjs
 */
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
const HERE = dirname(fileURLToPath(import.meta.url));
const BEFORE = join(HERE, '..', '.out', 'b1-vw-ver-before');
const AFTER = join(HERE, '..', '.out', 'b1-vw-ver-after');
const OUT = join(HERE, '..', '.out', 'b1-vw-ver-hero-diff');
await mkdir(OUT, { recursive: true });
const combos = ['dark__desktop', 'dark__phone', 'light__desktop', 'light__phone'];
const results = {};
for (const combo of combos) {
  const b = await loadImage(join(BEFORE, `t-vaporwave__${combo}.png`));
  const a = await loadImage(join(AFTER, `t-vaporwave__${combo}.png`));
  const w = Math.min(b.width, a.width), h = Math.min(b.height, a.height);
  const cb = createCanvas(w, h); const ctxb = cb.getContext('2d'); ctxb.drawImage(b, 0, 0);
  const ca = createCanvas(w, h); const ctxa = ca.getContext('2d'); ctxa.drawImage(a, 0, 0);
  const db = ctxb.getImageData(0, 0, w, h).data;
  const da = ctxa.getImageData(0, 0, w, h).data;
  let diffCount = 0; let maxDiff = 0;
  const diffCanvas = createCanvas(w, h); const dctx = diffCanvas.getContext('2d');
  const dimg = dctx.createImageData(w, h);
  for (let i = 0; i < db.length; i += 4) {
    const dr = Math.abs(db[i] - da[i]), dg = Math.abs(db[i+1] - da[i+1]), dbb = Math.abs(db[i+2] - da[i+2]);
    const diff = dr + dg + dbb;
    if (diff > 30) { diffCount++; maxDiff = Math.max(maxDiff, diff); dimg.data[i] = 255; dimg.data[i+1] = 0; dimg.data[i+2] = 0; dimg.data[i+3] = 255; }
    else { dimg.data[i] = da[i]; dimg.data[i+1] = da[i+1]; dimg.data[i+2] = da[i+2]; dimg.data[i+3] = 60; }
  }
  dctx.putImageData(dimg, 0, 0);
  await writeFile(join(OUT, `diff-${combo}.png`), await diffCanvas.encode('png'));
  results[combo] = { totalPixels: w * h, diffPixels: diffCount, pctDiff: (diffCount / (w * h) * 100).toFixed(3), maxDiff };
}
console.log(JSON.stringify(results, null, 1));
