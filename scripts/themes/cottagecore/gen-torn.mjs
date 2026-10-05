/* Stage 5 B2 task 2 (brief item 9, hide the repeats): the torn-edge masks for
   cottagecore.

   The old tile was 240px and repeated along every torn sheet, so a 700px note
   showed the same tear three times. This writes a 1200px tile (wider than the
   widest torn sheet, 74rem = 1184px), a seeded random walk with the old tile's
   character (x steps of 3 to 8px, a tear between about 2.4 and 8.9px deep), and
   patches the two custom properties in src/themes/cottagecore/theme.css.
   Top and bottom edges use different seeds, so a sheet's two tears differ.
   Each torn sheet then starts its window at its own --torn-x, so the three
   sheets (Lab note, About letter, Services method) show different stretches.

   Run:  node scripts/themes/cottagecore/gen-torn.mjs
   Rerunning with the same seeds writes the same bytes. */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const W = 1200;
const H = 14;
const css = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'src', 'themes', 'cottagecore', 'theme.css');

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Tear depths (y of the paper's edge inside the 14px band). Each step is a
   draw pulled a third of the way back toward the previous one so the edge
   wanders rather than jitters, with the odd sharp bite. */
function depths(seed) {
  const r = rng(seed);
  const pts = [[0, 6]];
  let x = 0;
  let y = 6;
  while (x < W - 8) {
    x += 3 + Math.floor(r() * 6);
    const target = 2.4 + r() * 6.5;
    y = y + (target - y) * (r() < 0.18 ? 1 : 0.66);
    pts.push([x, Math.round(y * 10) / 10]);
  }
  pts.push([W, 6]);
  return pts;
}

const n = (v) => String(v);

/* top: the paper fills below the tear, so the path closes along the bottom
   (M0 14 H W, then back along the tear from right to left). */
function topPath(pts) {
  const back = [...pts].reverse().map(([x, y]) => `L${n(x)} ${n(y)}`).join('');
  return `M0 ${H}H${W}${back.replace(/^L/, 'L')}Z`;
}
/* bottom: the mirror, the paper fills above the tear. */
function bottomPath(pts) {
  const back = [...pts].reverse().map(([x, y]) => `L${n(x)} ${n(Math.round((H - y) * 10) / 10)}`).join('');
  return `M0 0H${W}${back}Z`;
}

const uri = (d) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${W} ${H}' preserveAspectRatio='none'%3E%3Cpath d='${d}'/%3E%3C/svg%3E")`;

const top = uri(topPath(depths(240913)));
const bottom = uri(bottomPath(depths(77031)));

let s = readFileSync(css, 'utf8');
const crlf = s.includes('\r\n');
s = s.replace(/\r\n/g, '\n');
const reTop = /^(\s*)--torn-top: url\(.*\);$/m;
const reBottom = /^(\s*)--torn-bottom: url\(.*\);$/m;
if (!reTop.test(s) || !reBottom.test(s)) throw new Error('torn custom properties not found in theme.css');
s = s.replace(reTop, (_m, ind) => `${ind}--torn-top: ${top};`).replace(reBottom, (_m, ind) => `${ind}--torn-bottom: ${bottom};`);
writeFileSync(css, crlf ? s.replace(/\n/g, '\r\n') : s);
console.log(`torn tiles: ${W}x${H}, top ${top.length} chars, bottom ${bottom.length} chars`);
