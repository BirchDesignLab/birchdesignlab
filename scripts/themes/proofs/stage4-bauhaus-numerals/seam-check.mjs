/* Seam check: for each zoom shot, find ink and background levels, then count
 * interior pixels (ink on both sides along a row or column) that are not ink.
 * Usage: node seam-check.mjs <dir>/zoom__*__new__*.png */
import { createCanvas, loadImage } from '@napi-rs/canvas';
for (const f of process.argv.slice(2)) {
  const im = await loadImage(f); const c = createCanvas(im.width, im.height); const g = c.getContext('2d'); g.drawImage(im, 0, 0);
  const d = g.getImageData(0, 0, im.width, im.height).data; const L = (x, y) => d[(y * im.width + x) * 4 + 1];
  const bg = L(1, 1); let ink = bg, lo = 255, hi = 0;
  for (let y = 0; y < im.height; y++) for (let x = 0; x < im.width; x++) { lo = Math.min(lo, L(x, y)); hi = Math.max(hi, L(x, y)); }
  ink = Math.abs(lo - bg) > Math.abs(hi - bg) ? lo : hi; const span = Math.abs(ink - bg), tol = span * 0.15;
  const isInk = (v) => Math.abs(v - ink) < tol; let bad = 0;
  const scan = (n, m, get) => { for (let a = 0; a < n; a++) { let last = -1; for (let b = 0; b < m; b++) { if (isInk(get(a, b))) { if (last >= 0 && b - last > 1 && b - last <= 3) { let all = true; for (let k = last + 1; k < b; k++) if (isInk(get(a, k)) ) all = false; if (all) bad++; } last = b; } } } };
  scan(im.height, im.width, (a, b) => L(b, a)); scan(im.width, im.height, (a, b) => L(a, b));
  console.log(f.split(/[\/]/).pop(), im.width + 'x' + im.height, 'thin-gap pixels inside ink:', bad);
}
