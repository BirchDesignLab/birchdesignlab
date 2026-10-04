/**
 * Finds the patternTransform for the Services No. 2 swatch.
 *
 * A pattern fill is anchored to the top-left of the svg that holds it, and the
 * swatch changes size and aspect per breakpoint (portrait 258 to 353 wide,
 * 16:9 at 353 x 199 on a phone), so one fixed transform cannot frame them. The
 * swatch rect therefore sits in a nested <svg x="50%" y="50%" overflow="visible">
 * so the pattern is anchored at the swatch CENTRE, and the window is always
 * [-W/2, W/2] x [-H/2, H/2] around that origin. This searches the translate
 * (and two scales) for the frame that holds the most whole islands, and cuts
 * the fewest, across every size a shape takes (worst case of the set).
 *
 * Usage: node scripts/themes/proofs/stage5-gm-toile/find-swatch-frames.mjs [scales]
 * The winners are baked into the harness defaults, gm-toile-swatch (portrait)
 * and gm-toile-swatch-wide (16:9).
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const layout = JSON.parse(readFileSync(join(HERE, 'toile-layout.json'), 'utf8'));
const [TW, TH] = layout.tile;
const SCALES = (process.argv[2] || '0.66,0.72').split(',').map(Number);
const MAJOR = new Set(['grove', 'grove2', 'desk', 'reader', 'parasol', 'urn']);

/* CSS sizes the swatch takes (1440/1280, 1024, 820; 390). */
const SHAPES = {
  portrait: [[353, 441], [321, 402], [258, 322]],
  wide: [[353, 199]],
};

const boxes = [];
for (const it of layout.items) {
  if (!MAJOR.has(it.id)) continue;
  const hw = (it.w / 2) * it.s, up = it.h * it.s, down = 30;
  const yn = ((it.y % TH) + TH) % TH;
  for (let ky = -1; ky < 3; ky++) for (let kx = -1; kx < 3; kx++) {
    boxes.push({ x0: it.x + kx * TW - hw, x1: it.x + kx * TW + hw, y0: yn + ky * TH - up, y1: yn + ky * TH + down });
  }
}

/* Window centred on the origin; the pattern is translated by (tx, ty). */
function score(W, H, s, tx, ty) {
  const wx0 = (-W / 2 - tx) / s, wy0 = (-H / 2 - ty) / s, wx1 = (W / 2 - tx) / s, wy1 = (H / 2 - ty) / s;
  let whole = 0, cut = 0;
  for (const b of boxes) {
    const ix = Math.min(b.x1, wx1) - Math.max(b.x0, wx0), iy = Math.min(b.y1, wy1) - Math.max(b.y0, wy0);
    if (ix <= 0 || iy <= 0) continue;
    const frac = (ix * iy) / ((b.x1 - b.x0) * (b.y1 - b.y0));
    if (frac > 0.97) whole++;
    else if (frac > 0.1) cut += 1 - frac;
  }
  return whole * 10 - cut * 6;
}

for (const [name, sizes] of Object.entries(SHAPES)) {
  let best = null;
  for (const s of SCALES) {
    for (let tx = -TW * s; tx <= 0; tx += 2) for (let ty = -TH * s; ty <= 0; ty += 2) {
      const v = Math.min(...sizes.map(([W, H]) => score(W, H, s, tx, ty)));
      if (!best || v > best.v) best = { v, s, tx, ty };
    }
  }
  console.log(`${name}: patternTransform="translate(${best.tx} ${best.ty}) scale(${best.s})" worst-case score ${best.v.toFixed(1)}`);
}
