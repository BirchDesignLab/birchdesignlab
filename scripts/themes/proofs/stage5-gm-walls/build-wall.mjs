/**
 * Stage 5 Tier A proof a2: the chintz of its own for papered walls.
 *
 * Writes wall-defs.svg.html (two new motifs and <pattern id="gm-chintz-wall">,
 * ready to append to parts/Defs.astro beside the existing #gm-rose, #gm-bud,
 * #gm-sprig, #gm-leafpair and #gm-floret) and wall-stats.json.
 *
 * The tile is 928 x 544: two 464-wide half-drop pairs side by side (1440 / 928 is 1.55,
 * so no motif repeats more than twice across a 1440 wall; a 464 tile showed the same
 * rose and bloom at the same height three times in a straight line). The big cabbage
 * roses and blooms sit in four columns (x = 116, 348, 580, 812), each with two
 * heroes 272 apart, the columns dropped by 0, 136, 68 and 204, so no two columns share
 * a height. Everything else is filled by seeded best-candidate sampling on a torus,
 * and a big filler is also kept off the height (torus dy) of every other big motif, so
 * the fillers cannot form a row with the heroes. Anything that crosses a tile edge is
 * emitted again one tile over, so there is no seam.
 *
 * The ink is one group (class k-wall-ink) whose opacity is --wall-ink, over a
 * ground rect filled with --wall-ground: that is the loudness knob.
 *
 * Usage: node scripts/themes/proofs/stage5-gm-walls/build-wall.mjs
 */
import { writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const W = 928, H = 544;

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
const rand = rng(20261004);
const between = (a, b) => a + (b - a) * rand();
const r1 = (n) => Math.round(n * 10) / 10;

/* Approximate reach (px at scale 1) of each motif from its origin. */
const REACH = { rose: 44, bloom: 30, vine: 64, bud: 30, sprig: 38, leafpair: 26 };

const items = [];
const add = (type, x, y, rot, s) => items.push({ type, x, y, rot, s, r: REACH[type] * s });

/* Heroes: four columns, each with two big motifs 272 apart (drops 0, 136, 68, 204). */
const COLS = [
  { x: 116, y: 114, a: ['rose', 1.55, [-30, 30]], b: ['rose', 1.3, [100, 160]] },
  { x: 348, y: 250, a: ['rose', 1.45, [-120, -60]], b: ['bloom', 1.5, [0, 360]] },
  { x: 580, y: 182, a: ['bloom', 1.5, [0, 360]], b: ['rose', 1.4, [30, 90]] },
  { x: 812, y: 318, a: ['rose', 1.5, [160, 220]], b: ['rose', 1.3, [-60, 0]] },
];
for (const c of COLS) {
  add(c.a[0], c.x, c.y, between(...c.a[2]), c.a[1]);
  add(c.b[0], c.x, (c.y + 272) % H, between(...c.b[2]), c.b[1]);
}
const isBig = (o) => (o.type === 'rose' || o.type === 'bloom') && o.s >= 0.9;

const tdist = (a, b) => {
  const dx = Math.min(Math.abs(a.x - b.x), W - Math.abs(a.x - b.x));
  const dy = Math.min(Math.abs(a.y - b.y), H - Math.abs(a.y - b.y));
  return Math.hypot(dx, dy);
};
const ROW_CLEAR = 34;
function place(type, s, rotRange) {
  const cand = { type, s, r: REACH[type] * s };
  let best = null, bestScore = -1;
  for (let i = 0; i < 4000; i++) {
    cand.x = rand() * W; cand.y = rand() * H;
    let worst = Infinity;
    for (const o of items) worst = Math.min(worst, tdist(cand, o) / (cand.r + o.r));
    /* A big motif keeps off the height of every other big one (torus dy): no row of roses across a wide wall. */
    if (isBig(cand)) for (const o of items) if (isBig(o)) worst = Math.min(worst, Math.min(Math.abs(cand.y - o.y), H - Math.abs(cand.y - o.y)) / ROW_CLEAR);
    if (worst > bestScore) { bestScore = worst; best = { x: cand.x, y: cand.y }; }
  }
  add(type, best.x, best.y, between(rotRange[0], rotRange[1]), s);
}
/* Large to small, so the big shapes get the room. */
for (const s of [1.25, 1.1, 1.35, 1.2, 1.05, 1.3]) place('rose', s, [0, 360]);
for (const s of [1.1, 0.95, 1.0, 1.05, 0.9, 1.15]) place('bloom', s, [0, 360]);
for (const s of [1.2, 1.0, 1.15, 0.95, 1.1, 1.0, 1.2, 0.9]) place('vine', s, [0, 360]);
for (const s of [1.1, 0.9, 1.0, 0.85, 1.05, 0.8, 1.0, 0.95, 0.9, 1.1, 0.85, 0.8]) place('sprig', s, [0, 360]);
for (const s of [1.1, 0.95, 0.85, 1.0, 0.9, 0.8, 1.05, 0.9, 1.0, 0.85, 0.95, 1.1, 0.8, 0.9, 1.05, 0.85]) place('leafpair', s, [0, 360]);
for (const s of [1.0, 0.85, 0.95, 0.8, 0.9, 1.1, 0.75, 0.9, 1.0, 0.85, 0.8, 1.05, 0.95, 0.9]) place('bud', s, [0, 360]);

/* Dots: bead-size gold, filling the last gaps. */
const dots = [];
for (let i = 0; i < 36; i++) {
  const cand = { x: 0, y: 0 };
  let best = null, bestScore = -1;
  for (let k = 0; k < 400; k++) {
    cand.x = rand() * W; cand.y = rand() * H;
    let worst = Infinity;
    for (const o of items) worst = Math.min(worst, tdist(cand, o) - o.r * 0.7);
    for (const d of dots) worst = Math.min(worst, tdist(cand, d) - 12);
    if (worst > bestScore) { bestScore = worst; best = { x: cand.x, y: cand.y }; }
  }
  dots.push({ x: best.x, y: best.y, r: between(1.2, 2) });
}

const ORDER = ['vine', 'leafpair', 'rose', 'bloom', 'sprig', 'bud'];
const SYMBOL = { rose: 'gm-rose', bloom: 'gm-wall-bloom', vine: 'gm-wall-vine', bud: 'gm-bud', sprig: 'gm-sprig', leafpair: 'gm-leafpair' };
const lines = [];
let uses = 0;
for (const type of ORDER) {
  for (const it of items.filter((i) => i.type === type)) {
    for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
      const x = it.x + ox * W, y = it.y + oy * H;
      if (x + it.r < 0 || x - it.r > W || y + it.r < 0 || y - it.r > H) continue;
      lines.push(`      <use href="#${SYMBOL[type]}" transform="translate(${r1(x)} ${r1(y)}) rotate(${r1(it.rot)}) scale(${it.s})" />`);
      uses++;
    }
  }
}
for (const d of dots) {
  for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
    const x = d.x + ox * W, y = d.y + oy * H;
    if (x + 3 < 0 || x - 3 > W || y + 3 < 0 || y - 3 > H) continue;
    lines.push(`      <circle class="k-dot" cx="${r1(x)}" cy="${r1(y)}" r="${r1(d.r)}" />`);
    uses++;
  }
}

/* Two motifs of the wall's own. Same k-* classes as parts/Defs.astro. */
const petals = (n, rx, ry, cy, cls, phase = 0) =>
  Array.from({ length: n }, (_, i) => `      <ellipse class="${cls}" cx="0" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${r1(phase + (360 / n) * i)})" />`).join('\n');

const defs = `<!-- Stage 5 proof a2: the chintz wall. Appends to the defs of parts/Defs.astro,
     after gm-rose, gm-bud, gm-sprig and gm-leafpair. Needs two classes in its
     style block: k-wall-ground (fill from the wall-ground token) and k-wall-ink
     (opacity from the wall-ink token, 0.6 by default). -->
<g id="gm-wall-bloom">
${petals(9, 8.5, 15, -17, 'k-rose-lt', 0)}
${petals(9, 6.5, 12, -12, 'k-rose', 20)}
      <path class="k-line" d="M-12-8A13 13 0 0 1 4-14M13-6A13 13 0 0 1 8 10M-4 13A13 13 0 0 1-14 3" />
      <circle class="k-rose-dk" r="3.4" />
      <circle class="k-dot" r="1.7" />
      <circle class="k-dot" cx="5" cy="-2" r="0.9" />
      <circle class="k-dot" cx="-4" cy="4" r="0.9" />
      <circle class="k-dot" cx="1" cy="6" r="0.9" />
    </g>
<g id="gm-wall-vine">
      <path class="k-stem" d="M-52 22C-34-8-12 30 6 2S40-22 54-4" />
      <path class="k-leaf" d="M-34 4C-42-6-36-16-26-16C-26-8-28-2-34 4Z" />
      <path class="k-leaf-lt" d="M-20 18C-14 28-4 28 2 22C-4 16-12 14-20 18Z" />
      <path class="k-leaf" d="M6 2C0-8 4-18 14-18C14-10 12-4 6 2Z" />
      <path class="k-leaf-lt" d="M22-8C28 2 38 2 44-4C38-10 30-12 22-8Z" />
      <path class="k-leaf" d="M-50 22C-58 18-60 10-56 4C-50 8-48 14-50 22Z" />
      <path class="k-vein" d="M-33 3C-31-3-29-8-26-15M-19 18C-12 24-6 24 1 22M7 1C5-6 7-12 13-17" />
      <path class="k-stem" d="M54-4C60-8 66-4 63 1C60 5 55 2 57-1" />
      <use href="#gm-floret" transform="translate(-52 22)" />
      <use href="#gm-floret" transform="translate(20 -14) scale(0.8)" />
    </g>`;

const pattern = `<pattern id="gm-chintz-wall" width="${W}" height="${H}" patternUnits="userSpaceOnUse">
      <rect class="k-wall-ground" width="${W}" height="${H}" />
      <g class="k-wall-ink">
${lines.join('\n')}
      </g>
    </pattern>`;

/* The ids inside the new groups are indented by the template literal; tidy. */
const out = `${defs.replace(/^ {4}<\/g>/gm, '</g>')}\n    ${pattern}\n`;
await writeFile(join(HERE, 'wall-defs.svg.html'), out);
const stats = {
  tile: [W, H],
  halfDrop: 'four hero columns at x=116 (y=114, 386), 348 (250, 522), 580 (182, 454), 812 (318, 46); drops 0, 136, 68, 204 against 272 spacing, so no two columns share a height',
  items: items.length,
  byType: Object.fromEntries(ORDER.map((t) => [t, items.filter((i) => i.type === t).length])),
  dots: dots.length,
  useElements: uses,
  bytes: Buffer.byteLength(out),
};
await writeFile(join(HERE, 'wall-stats.json'), JSON.stringify(stats, null, 2) + '\n');
console.log(JSON.stringify(stats));
