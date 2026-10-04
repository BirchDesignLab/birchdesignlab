/**
 * Stage 5 B1 task 1: builds the grandmillennial pattern files from their sources.
 *
 *   node scripts/themes/proofs/stage5-gm-toile/build-toile.mjs    (the toile drawing, seeded)
 *   node scripts/themes/proofs/stage5-gm-walls/build-wall.mjs     (the chintz wall layout, seeded)
 *   node scripts/themes/grandmillennial/build-patterns.mjs        (this: packs both, writes the files below)
 *
 * Writes:
 *   src/themes/grandmillennial/assets/toile-light.svg, toile-dark.svg
 *       the 704 x 800 toile tile, ink baked (oxblood by day, gold-light in the
 *       lacquered room), no ground: the swatch and the wall paint the ground in
 *       CSS (--toile-ground, --wall-ground). Loaded by theme.css as a cached URL.
 *   src/themes/grandmillennial/assets/chintz-wall-light.svg, chintz-wall-dark.svg
 *       the 928 x 544 chintz wall, inks baked from theme.css's --c-* tokens, the
 *       ink layer at 0.6 opacity (decision F), aged: every motif printed twice
 *       (a plain copy a hair off true, then the copy with the thin brown line),
 *       rose variants, a static grain under the ink.
 *   the tile block of src/themes/grandmillennial/parts/Defs.astro (between the
 *       gm:tile markers): the 200px #gm-chintz repeat, same scale as before
 *       (protect item 5), aged the same way.
 *
 * Motifs are read out of Defs.astro, the inks out of theme.css, so nothing is
 * drawn twice. Seeded: a run is repeatable.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const GM = join(REPO, 'src', 'themes', 'grandmillennial');
const read = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const save = (p, s) => writeFileSync(p, s);

/* ---------- inks from theme.css ---------- */

const css = read(join(GM, 'theme.css'));
const lightBlock = css.slice(css.indexOf(":root[data-theme='grandmillennial'] {"), css.indexOf(":root[data-theme='grandmillennial'][data-scheme='dark'] {"));
const darkBlock = css.slice(css.indexOf(":root[data-theme='grandmillennial'][data-scheme='dark'] {"), css.indexOf(':where([data-theme'));
const decls = (block) => Object.fromEntries([...block.matchAll(/^\s*(--[a-z0-9-]+):\s*([^;]+);/gm)].map((m) => [m[1], m[2].trim()]));
const light = decls(lightBlock), dark = decls(darkBlock);
const INK_KEYS = ['--c-ground', '--c-rose', '--c-rose-lt', '--c-rose-dk', '--c-leaf', '--c-leaf-lt', '--c-blue', '--c-dot', '--c-brown', '--c-grain-d', '--c-grain-l'];
for (const k of INK_KEYS) for (const [n, d] of [['light', light], ['dark', dark]]) if (!d[k]) throw new Error(`theme.css has no ${k} in the ${n} block`);
const inksOf = (d) => Object.fromEntries(INK_KEYS.map((k) => [k, d[k]]));
const SCHEMES = {
  light: { inks: inksOf(light), toileInk: light['--oxblood'] },
  dark: { inks: inksOf(dark), toileInk: light['--gold-light'] },
};

/* The class rules, baked. Mirrors Defs.astro's style block. */
const KCSS = (inks) =>
  `:root{${Object.entries(inks).map(([k, v]) => `${k}:${v}`).join(';')}}` +
  '.k-rose,.k-rose-lt,.k-rose-dk,.k-leaf,.k-leaf-lt,.k-blue{stroke:var(--o-line,none);stroke-width:.5;stroke-linejoin:round}' +
  '.k-rose{fill:var(--c-rose)}.k-rose-lt{fill:var(--c-rose-lt)}.k-rose-dk{fill:var(--c-rose-dk)}' +
  '.k-leaf{fill:var(--c-leaf)}.k-leaf-lt{fill:var(--c-leaf-lt)}.k-blue{fill:var(--c-blue)}.k-dot{fill:var(--c-dot)}' +
  '.k-grain-d{fill:var(--c-grain-d)}.k-grain-l{fill:var(--c-grain-l)}' +
  '.k-line{fill:none;stroke:var(--c-rose-dk);stroke-width:1.3;stroke-linecap:round}' +
  '.k-vein{fill:none;stroke:var(--c-ground);stroke-width:.9;stroke-linecap:round;opacity:.7}' +
  '.k-stem{fill:none;stroke:var(--c-leaf);stroke-width:1.4;stroke-linecap:round}' +
  '.o{--o-line:var(--c-brown)}';

/* ---------- motifs from Defs.astro ---------- */

const defsSrc = read(join(GM, 'parts', 'Defs.astro'));
const motif = (id) => {
  const m = defsSrc.match(new RegExp(`<g id="${id}">[\\s\\S]*?</g>`));
  if (!m) throw new Error(`Defs.astro has no #${id}`);
  return m[0].replace(/\n\s*/g, '');
};
const wallSrc = read(join(REPO, 'scripts', 'themes', 'proofs', 'stage5-gm-walls', 'wall-defs.svg.html'));
const wallMotif = (id) => {
  const m = wallSrc.match(new RegExp(`<g id="${id}">[\\s\\S]*?</g>`));
  if (!m) throw new Error(`wall-defs.svg.html has no #${id}`);
  return m[0].replace(/\n\s*/g, '').replace(/ \/>/g, '/>');
};

/* ---------- seeded helpers ---------- */

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
const r1 = (n) => Math.round(n * 10) / 10;
const r2 = (n) => Math.round(n * 100) / 100;

/** Static grain: flecks of two tints. `cell` is the repeat the specks fill. */
function grain(seed, w, h, dark, light) {
  const R = rng(seed);
  const specks = [];
  for (let i = 0; i < dark; i++) specks.push(`<circle class="k-grain-d" cx="${r1(R() * w)}" cy="${r1(R() * h)}" r="${r2(0.35 + R() * 0.45)}"/>`);
  for (let i = 0; i < light; i++) specks.push(`<circle class="k-grain-l" cx="${r1(R() * w)}" cy="${r1(R() * h)}" r="${r2(0.3 + R() * 0.45)}"/>`);
  return specks.join('');
}

/** A motif printed twice: the plain fill a hair off true, then the true copy with the brown line. */
const REG = 'translate(-.7 -.5)';
const printed = (id, t) => `<use href="#${id}" transform="${REG} ${t}"/><use class="o" href="#${id}" transform="${t}"/>`;

/* ---------- the 200px tile in Defs.astro ---------- */

const TILE = [
  ['gm-leafpair', 'translate(96 84) rotate(20)'],
  ['gm-leafpair', 'translate(12 118) rotate(-70) scale(.9)'],
  ['gm-leafpair', 'translate(176 118) rotate(160) scale(.85)'],
  ['gm-rose', 'translate(54 56) scale(1.2)'],
  ['gm-rose-b', 'translate(146 150) rotate(140)'],
  ['gm-rose-c', 'translate(152 42) rotate(70) scale(.66)'],
  ['gm-rose', 'translate(56 160) rotate(-110) scale(.6)'],
  ['gm-sprig', 'translate(94 124) rotate(-24)'],
  ['gm-sprig', 'translate(166 96) rotate(-150) scale(.85)'],
  ['gm-sprig', 'translate(8 50) rotate(60) scale(.8)'],
  ['gm-bud', 'translate(106 26) rotate(28) scale(.9)'],
  ['gm-bud', 'translate(118 158) rotate(-35) scale(.8)'],
  ['gm-bud', 'translate(186 176) rotate(15) scale(.6)'],
  ['gm-bud', 'translate(22 104) rotate(-160) scale(.7)'],
];
const TILE_DOTS = [[94, 108, 1.6], [190, 10, 1.6], [12, 192, 1.6], [120, 60, 1.3], [100, 190, 1.3], [192, 60, 1.3], [30, 10, 1.3]];
const tile =
  '    <pattern id="gm-chintz" width="200" height="200" patternUnits="userSpaceOnUse">\n' +
  '      <rect class="k-ground" width="200" height="200" />\n' +
  `      ${grain(1792, 200, 200, 70, 36)}\n` +
  TILE.map(([id, t]) => `      ${printed(id, t)}\n`).join('') +
  TILE_DOTS.map(([x, y, r]) => `      <circle class="k-dot" cx="${x}" cy="${y}" r="${r}" />\n`).join('') +
  '    </pattern>\n';
const B = '<!-- gm:tile-begin (written by scripts/themes/grandmillennial/build-patterns.mjs; do not edit by hand) -->';
const E = '<!-- gm:tile-end -->';
const a = defsSrc.indexOf(B), z = defsSrc.indexOf(E);
if (a < 0 || z < 0) throw new Error('Defs.astro lost its gm:tile markers');
const newDefs = defsSrc.slice(0, a) + B + '\n' + tile + '    ' + defsSrc.slice(z);
save(join(GM, 'parts', 'Defs.astro'), newDefs.replace(/\n/g, '\r\n'));

/* ---------- the chintz wall ---------- */

const W = 928, H = 544;
// the pattern block only (the vine's own floret use sits inside <g id="gm-wall-vine">)
const patternBlock = wallSrc.slice(wallSrc.indexOf('<pattern id="gm-chintz-wall"'));
const placed = [...patternBlock.matchAll(/<use href="#([a-z-]+)" transform="([^"]+)" \/>|<circle class="k-dot" ([^>]*)\/>/g)];
const ROSES = ['gm-rose', 'gm-rose-b', 'gm-rose-c'];
const wallInk = placed.map((m) => {
  if (m[3] !== undefined) return `<circle class="k-dot" ${m[3].trim()}/>`;
  let id = m[1];
  if (id === 'gm-rose') {
    // Variant keyed on the position wrapped to the tile, so a rose cut by the
    // tile edge and its wrap copy are the same bloom (no seam).
    const t = /translate\(\s*(-?[\d.]+)[ ,]+(-?[\d.]+)/.exec(m[2]);
    const wx = Math.round((((+t[1] % W) + W) % W) * 10) % (W * 10), wy = Math.round((((+t[2] % H) + H) % H) * 10) % (H * 10);
    id = ROSES[(wx * 31 + wy * 17) % 3];
  }
  return printed(id, m[2]);
}).join('');

const WALL_INK_OPACITY = 0.6;
function wallFile(scheme) {
  const { inks } = SCHEMES[scheme];
  const defs = ['gm-floret', 'gm-leafpair', 'gm-rose', 'gm-rose-b', 'gm-rose-c', 'gm-bud', 'gm-sprig'].map(motif).join('') +
    wallMotif('gm-wall-bloom') + wallMotif('gm-wall-vine');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<style>${KCSS(inks)}</style><defs>${defs}` +
    `<pattern id="g" width="97" height="89" patternUnits="userSpaceOnUse">${grain(20261004, 97, 89, 26, 14)}</pattern></defs>` +
    `<rect width="${W}" height="${H}" fill="url(#g)"/>` +
    `<g opacity="${WALL_INK_OPACITY}">${wallInk}</g></svg>\n`;
}

/* ---------- the toile ---------- */

const toile = JSON.parse(readFileSync(join(REPO, 'scripts', 'themes', 'proofs', 'stage5-gm-toile', 'toile-tile.json'), 'utf8'));
const [TW, TH] = toile.tile;
const toileUses = toile.uses.map((u) => u.replace(/ ?\/>$/, '/>')).join('');
function toileFile(scheme) {
  const ink = SCHEMES[scheme].toileInk;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${TW}" height="${TH}" viewBox="0 0 ${TW} ${TH}">` +
    `<style>g.k{fill:none;stroke:${ink};stroke-width:.9;stroke-linecap:round;stroke-linejoin:round}</style>` +
    `<defs>${toile.defs.join('')}</defs><g class="k">${toileUses}</g></svg>\n`;
}

/* ---------- write ---------- */

const out = join(GM, 'assets');
mkdirSync(out, { recursive: true });
const report = {};
for (const scheme of ['light', 'dark']) {
  for (const [name, text] of [[`toile-${scheme}.svg`, toileFile(scheme)], [`chintz-wall-${scheme}.svg`, wallFile(scheme)]]) {
    save(join(out, name), text);
    report[name] = { bytes: Buffer.byteLength(text), gzip: gzipSync(text).length };
  }
}
report['Defs.astro'] = { bytes: Buffer.byteLength(newDefs), gzip: gzipSync(newDefs).length };
console.log(JSON.stringify(report, null, 1));
