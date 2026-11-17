/* B2 task 5 r2 verifier: founder sheets, whole page, before (stage5-base) | after (head ed3e9a3), dark then light, five pages x five sizes.
   Reads v-r2/base/sheet and v-r2/head/sheet (written by b2-t5-seeds.mjs 'sheets'); writes sheets/r2/whole-<page>__<size>.jpg.
   Run: node scripts/themes/cottagecore/b2-t5-r2-compose.mjs */
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const ROOT = 'scripts/themes/.out/stage5/b2/s5-b2-t5';
const V = join(ROOT, 'v-r2');
const OUT = join(ROOT, 'sheets', 'r2');
const PAGES = ['home', 'about', 'services', 'contact', 'sent'];
const SIZES = ['1440', '1280', '1024', '820', '390'];
const SCHEMES = ['dark', 'light'];
/* founder sheets */
await mkdir(OUT, { recursive: true });
const SCALE = { '1440': 0.4, '1280': 0.45, '1024': 0.5, '820': 0.6, '390': 0.5 };
for (const page of PAGES) for (const size of SIZES) {
  const panels = [];
  for (const scheme of SCHEMES) for (const [lab, dir] of [['before (stage5-base)', 'base'], ['after (head ed3e9a3)', 'head']]) {
    panels.push({ cap: `${page} ${scheme} ${size}  ${lab}`, img: await loadImage(join(V, dir, 'sheet', `${page}__${scheme}__${size}.png`)) });
  }
  const sc = SCALE[size];
  const ws = panels.map((p) => Math.round(p.img.width * sc));
  const hs = panels.map((p) => Math.round(p.img.height * sc));
  const G = 16, HEAD = 34;
  const cv = createCanvas(ws.reduce((a, b) => a + b, 0) + G * (panels.length + 1), HEAD + Math.max(...hs) + G);
  const g = cv.getContext('2d');
  g.fillStyle = '#1b1b1d'; g.fillRect(0, 0, cv.width, cv.height);
  g.font = '18px sans-serif';
  let x = G;
  panels.forEach((p, i) => { g.fillStyle = '#e8e6e1'; g.fillText(p.cap, x, 22); g.drawImage(p.img, x, HEAD, ws[i], hs[i]); x += ws[i] + G; });
  await writeFile(join(OUT, `whole-${page}__${size}.jpg`), cv.toBuffer('image/jpeg', 84));
  console.log('sheet', page, size, cv.width, cv.height);
}
