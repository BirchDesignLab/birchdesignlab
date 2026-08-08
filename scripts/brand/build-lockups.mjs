// scripts/brand/build-lockups.mjs
// Generates assets/brand/lockup-sideby.svg and lockup-canopy.svg with the
// Marcellus wordmark outlined to paths, so the SVGs render with no font
// installed. Rerun after any geometry or tracking change; output is
// deterministic. Font is fetched once into scripts/brand/.cache (gitignored).
//
// Live-text source of truth (kept here, echoed as a comment in each SVG):
//   side-by-side: BIRCH / DESIGN / LAB, 30px, tracking 0.16em, line-height 1.4
//   canopy:       BIRCH DESIGN LAB, 26px, tracking 0.24em
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import opentype from 'opentype.js';

const CACHE = path.join('scripts', 'brand', '.cache');
const TTF = path.join(CACHE, 'Marcellus-Regular.ttf');
const FONT_URL =
  'https://raw.githubusercontent.com/google/fonts/main/ofl/marcellus/Marcellus-Regular.ttf';
const OUT = path.join('assets', 'brand');

const PAPER = '#f4f0e6';
const MOSS = '#a3bd8f';

// x, y, w, h, moss? — spec geometry, verbatim.
const DENSE = [
  [14, 16, 48, 3], [70, 18, 24, 2.5], [34, 34, 62, 3.5],
  [10, 52, 26, 3], [48, 54, 40, 4, true], [20, 72, 52, 2.5],
  [82, 74, 20, 3], [30, 92, 38, 3.5], [76, 94, 14, 2.5],
];
const CANOPY = [
  [18, 6, 58, 3], [94, 8, 30, 2.5], [140, 6, 52, 3.5], [206, 8, 20, 2.5],
  [42, 24, 34, 3], [92, 22, 48, 4, true], [156, 24, 40, 2.5],
  [26, 42, 24, 2.5], [66, 40, 56, 3], [138, 42, 30, 3.5], [184, 40, 38, 2.5],
];

const rect = ([x, y, w, h, moss], dx = 0, dy = 0, s = 1) =>
  `<rect x="${x * s + dx}" y="${y * s + dy}" width="${w * s}" height="${h * s}" ` +
  `rx="${(h * s) / 2}" fill="${moss ? MOSS : PAPER}"/>`;

async function ensureFont() {
  try { await access(TTF, constants.F_OK); return; } catch {}
  const res = await fetch(FONT_URL);
  if (!res.ok) throw new Error(`font fetch failed: ${res.status}`);
  await mkdir(CACHE, { recursive: true });
  await writeFile(TTF, Buffer.from(await res.arrayBuffer()));
}

function line(font, text, x, baseline, size, tracking) {
  const opts = { kerning: true, letterSpacing: tracking };
  const d = font.getPath(text, x, baseline, size, opts).toPathData(2);
  const w = font.getAdvanceWidth(text, size, opts);
  return { d, w };
}

function svg(viewW, viewH, body, comment) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewW} ${viewH}">\n` +
    `<!-- ${comment} -->\n${body}\n</svg>\n`;
}

async function main() {
  await ensureFont();
  const buf = await readFile(TTF);
  const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));

  // --- side-by-side: mark | hairline | BIRCH / DESIGN / LAB ---
  {
    const size = 30, track = 0.16, lead = size * 1.4;
    const textX = 160;
    const lines = ['BIRCH', 'DESIGN', 'LAB'].map((t, i) =>
      line(font, t, textX, 30 + i * lead, size, track));
    const width = Math.ceil(textX + Math.max(...lines.map((l) => l.w)) + 6);
    const body = [
      ...DENSE.map((r) => rect(r)),
      `<rect x="136" y="8" width="1" height="104" fill="${PAPER}" opacity="0.2"/>`,
      ...lines.map((l) => `<path d="${l.d}" fill="${PAPER}"/>`),
    ].join('\n');
    await writeFile(path.join(OUT, 'lockup-sideby.svg'),
      svg(width, 120, body, 'BIRCH / DESIGN / LAB — Marcellus 30px, tracking 0.16em, outlined'));
  }

  // --- canopy: bark band over BIRCH DESIGN LAB ---
  {
    const size = 26, track = 0.24;
    const word = line(font, 'BIRCH DESIGN LAB', 0, 0, size, track);
    const bandW = word.w * 1.15;
    const s = bandW / 240;                    // scale 240-unit band to bandW
    const bandH = 54 * s;
    const gap = 18;
    const baseline = bandH + gap + size * 0.75;
    const height = Math.ceil(baseline + size * 0.28);
    const wordX = (bandW - word.w) / 2;
    const placed = line(font, 'BIRCH DESIGN LAB', wordX, baseline, size, track);
    const body = [
      ...CANOPY.map((r) => rect(r, 0, 0, s)),
      `<path d="${placed.d}" fill="${PAPER}"/>`,
    ].join('\n');
    await writeFile(path.join(OUT, 'lockup-canopy.svg'),
      svg(Math.ceil(bandW), height, body, 'BIRCH DESIGN LAB — Marcellus 26px, tracking 0.24em, outlined'));
  }

  console.log('wrote lockup-sideby.svg, lockup-canopy.svg');
}

main();
