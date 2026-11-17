/**
 * Stage 5 B1 task 2: packs the grandmillennial chinoiserie scene into its files.
 *
 *   node scripts/themes/proofs/stage5-gm-chinoiserie/build-scene.mjs   (the seeded drawing -> scene.json, birch.svg.html)
 *   node scripts/themes/grandmillennial/build-chinoiserie.mjs          (this: packs them, writes the files below)
 *
 * Writes:
 *   src/themes/grandmillennial/assets/chinoiserie-light.svg, -hunter.svg, -dark.svg, -darkroom.svg
 *       the 1600 x 1300 wall, never tiled, three colourways with the inks baked
 *       (chinoiserie-palettes.json): the day parlour, the hunter lacquer room that
 *       holds the founder's letter in the light scheme, and the dark scheme's room.
 *       About loads them as cached CSS backgrounds (cover), never inline.
 *   src/themes/grandmillennial/parts/ChinoiserieShapes.astro
 *       the hidden defs the INLINE pieces use (the perched bird, the flying bird,
 *       the leaf pair and the catkin) with their unprefixed class rules, which have
 *       to be unprefixed because Chromium does not match ancestor selectors inside
 *       a <use> shadow tree.
 *   src/themes/grandmillennial/assets/birch-light.svg, birch-dark.svg
 *       the oval's botanical birch, redrawn in the same hand, inks baked (a cached file, not inline).
 *
 * Seeded drawing, so a run repeats.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const GM = join(REPO, 'src', 'themes', 'grandmillennial');
const PROOF = join(REPO, 'scripts', 'themes', 'proofs', 'stage5-gm-chinoiserie');
const scene = JSON.parse(readFileSync(join(PROOF, 'scene.json'), 'utf8'));
const palettes = JSON.parse(readFileSync(join(HERE, 'chinoiserie-palettes.json'), 'utf8'));

/* color-mix(in srgb, a p%, b) */
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const unhex = (v) => '#' + v.map((n) => Math.round(n).toString(16).padStart(2, '0')).join('');
const mix = (a, p, b) => unhex(hex(a).map((x, i) => (x * p) / 100 + (hex(b)[i] * (100 - p)) / 100));

/** The scene's class rules, baked for one colourway. */
function sceneCss(p) {
  const bird = (c) => `--bird-body:${p[c]};--bird-wing:${mix(p[c], 70, '#000000')};--bird-tail:${mix(p[c], 80, p.trunk)};--bird-belly:${mix(p[c], 35, p.trunk)}`;
  return [
    `.sc-ln{fill:none;stroke:${p.line};stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}`,
    `.sc-ln2{fill:none;stroke:${p.line};stroke-width:.9;stroke-linecap:round;stroke-linejoin:round;opacity:.85}`,
    `.sc-hill1{fill:${p.hill1}}.sc-hill2{fill:${p.hill2}}.g-farT{opacity:.5}.sc-ground{fill:${p.ground2}}`,
    `.sc-trunk{fill:${p.trunk}}.sc-shade{fill:${p.shade};opacity:.8}`,
    `.sc-lent{fill:none;stroke:${p.lent};stroke-width:2.8;stroke-linecap:round}`,
    `.sc-curl{fill:${p.curl};stroke:${p.line};stroke-width:.8;stroke-linejoin:round}.sc-eye2{fill:${p.lent}}`,
    `.sc-limb{fill:${p.limb};stroke:${p.line};stroke-width:.8;stroke-linejoin:round}`,
    `.sc-hl{fill:none;stroke:${p.hl};stroke-width:1;stroke-linecap:round;opacity:.8}`,
    `.sc-twig{fill:none;stroke:${p.limb};stroke-width:1.5;stroke-linecap:round}`,
    `.sc-lf{fill:${p.lf};stroke:${p.line};stroke-width:.6;stroke-linejoin:round}`,
    `.sc-lf2{fill:${p.lf2};stroke:${p.line};stroke-width:.6;stroke-linejoin:round}`,
    `.sc-vein{fill:none;stroke:${p.line};stroke-width:.45;opacity:.6;stroke-linecap:round}`,
    `.sc-cat{fill:${p.cat};stroke:${p.line};stroke-width:.6}`,
    `.sc-rock{fill:${p.rock}}.sc-rockshade{fill:${p.rockshade};opacity:.75}`,
    `.sc-hole{fill:${p.ground2};stroke:${p.line};stroke-width:1}`,
    `.sc-grass{fill:none;stroke:${p.line};stroke-width:1.2;stroke-linecap:round;opacity:.8}`,
    `.sc-fern{fill:${p.lf2};stroke:${p.line};stroke-width:.5;stroke-linejoin:round}`,
    `.sc-petal{fill:${mix(p.oxb, 35, p.trunk)};stroke:${p.line};stroke-width:.6}.sc-gold{fill:${p.gold}}`,
    `.sc-birdA{${bird('oxb')}}.sc-birdB{${bird('blue')}}`,
    '.sc-body,.sc-crest{fill:var(--bird-body)}.sc-belly{fill:var(--bird-belly)}.sc-wing,.sc-wing2{fill:var(--bird-wing)}.sc-tail,.sc-tail2{fill:var(--bird-tail)}',
    `.sc-beak{fill:${p.gold};stroke:${p.line};stroke-width:.6}.sc-eye{fill:${p.line}}`,
  ].join('');
}

const out = {};
const R = [];
for (const name of ['light', 'hunter', 'dark', 'darkroom']) {
  const p = palettes[name];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1300" viewBox="0 0 1600 1300"><style>${sceneCss(p)}</style>` +
    `<defs>${scene.defs}</defs><rect width="1600" height="1300" fill="${p.ground}"/>${scene.sceneG.replace(/\n/g, '')}</svg>\n`;
  writeFileSync(join(GM, 'assets', `chinoiserie-${name}.svg`), svg);
  R.push(`chinoiserie-${name}.svg: ${Buffer.byteLength(svg)} B raw, ${gzipSync(svg).length} B gzip`);
}

/* ---------- the inline pieces' shared shapes ---------- */

const inlineCss = `
  /* Unprefixed on purpose: ancestor selectors do not match inside a <use> shadow tree. The inks are the --sc-* tokens (theme.css). */
  .sc-ln { fill: none; stroke: var(--sc-line); stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
  .sc-ln2 { fill: none; stroke: var(--sc-line); stroke-width: 0.9; stroke-linecap: round; stroke-linejoin: round; opacity: 0.85; }
  .sc-limb { fill: var(--sc-limb); stroke: var(--sc-line); stroke-width: 0.8; stroke-linejoin: round; }
  .sc-lf { fill: var(--sc-lf); stroke: var(--sc-line); stroke-width: 0.6; stroke-linejoin: round; }
  .sc-lf2 { fill: var(--sc-lf2); stroke: var(--sc-line); stroke-width: 0.6; stroke-linejoin: round; }
  .sc-vein { fill: none; stroke: var(--sc-line); stroke-width: 0.45; opacity: 0.6; stroke-linecap: round; }
  .sc-cat { fill: var(--sc-cat); stroke: var(--sc-line); stroke-width: 0.6; }
  .sc-birdA { --bird-body: var(--sc-oxb); --bird-wing: color-mix(in srgb, var(--sc-oxb) 70%, #000); --bird-tail: color-mix(in srgb, var(--sc-oxb) 80%, var(--sc-trunk)); --bird-belly: color-mix(in srgb, var(--sc-oxb) 35%, var(--sc-trunk)); }
  .sc-birdB { --bird-body: var(--sc-blue); --bird-wing: color-mix(in srgb, var(--sc-blue) 70%, #000); --bird-tail: color-mix(in srgb, var(--sc-blue) 75%, var(--sc-trunk)); --bird-belly: color-mix(in srgb, var(--sc-blue) 30%, var(--sc-trunk)); }
  .sc-body, .sc-crest { fill: var(--bird-body); }
  .sc-belly { fill: var(--bird-belly); }
  .sc-wing, .sc-wing2 { fill: var(--bird-wing); }
  .sc-tail, .sc-tail2 { fill: var(--bird-tail); }
  .sc-beak { fill: var(--sc-gold); stroke: var(--sc-line); stroke-width: 0.6; }
  .sc-eye { fill: var(--sc-line); }`;
const shapes = `---
/** GENERATED by scripts/themes/grandmillennial/build-chinoiserie.mjs (from
    scripts/themes/proofs/stage5-gm-chinoiserie/build-scene.mjs). Do not edit by hand.
    The hidden defs the inline chinoiserie pieces use: the second frame's bough,
    the perched and the flying bird of the wall, one hand with the wall file. */
---
<svg class="sc-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>
${scene.defs}
</defs></svg>

<style is:global>
  .sc-defs { position: absolute; width: 0; height: 0; overflow: hidden; pointer-events: none; }${inlineCss}
</style>
`;
writeFileSync(join(GM, 'parts', 'ChinoiserieShapes.astro'), shapes.replace(/\n/g, '\r\n'));

/* ---------- the oval's birch ---------- */

/* B1 fix (deferred minor C7): the birch is two cached files (birch-light.svg,
   birch-dark.svg) with the inks baked, no longer 19 KB of inline markup on About.
   The viewBox is the drawing's 240 x 300 plus 60 units on every side: the trunk runs
   past the old viewBox and the oval, not the drawing, ends it, so About lays the file
   in a box 150% x 140% of the old svg's (left and right -25%, top and bottom -20%),
   which keeps the scale and the centring exactly. The leaf, catkin and bark classes
   are baked into the file; the leaf and catkin inks come from theme.css. */
const unix = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const themeCss = unix(join(GM, 'theme.css'));
const lightBlock = themeCss.slice(themeCss.indexOf(":root[data-theme='grandmillennial'] {"), themeCss.indexOf(":root[data-theme='grandmillennial'][data-scheme='dark'] {"));
const darkBlock = themeCss.slice(themeCss.indexOf(":root[data-theme='grandmillennial'][data-scheme='dark'] {"), themeCss.indexOf(':where([data-theme'));
const tok = (block, name) => {
  const m = block.match(new RegExp('^\\s*' + name + ':\\s*([^;]+);', 'm'));
  if (!m) throw new Error('theme.css has no ' + name);
  return m[1].trim();
};
const BB = {
  light: { paper: '#f7f3ea', shade: '#ddd3bb', line: '#3a3225', dark: '#2b2a26', limb: '#6b4a2e' },
  dark: { paper: '#d8cfb6', shade: '#a69c82', line: '#e0cf98', dark: '#1d1b15', limb: '#8a6a46' },
};
const birchInner = unix(join(PROOF, 'birch.svg.html')).trim().replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/\n/g, '');
const birchCss = (c, leaf, leafLt, catkin) =>
  `.bb-ln{fill:none;stroke:${c.line};stroke-width:1.3;stroke-linecap:round;stroke-linejoin:round}.bb-ln2{fill:none;stroke:${c.line};stroke-width:.8;stroke-linecap:round;stroke-linejoin:round}` +
  `.bb-trunk{fill:${c.paper}}.bb-shade{fill:${c.shade};opacity:.85}.bb-lent{fill:none;stroke:${c.dark};stroke-width:2.1;stroke-linecap:round}` +
  `.bb-curl{fill:${c.paper};stroke:${c.line};stroke-width:.6;stroke-linejoin:round}.bb-limb{fill:${c.limb};stroke:${c.line};stroke-width:.6;stroke-linejoin:round}` +
  `.bb-eye{fill:${c.dark}}.bb-twig{fill:none;stroke:${c.limb};stroke-width:1.1;stroke-linecap:round}` +
  `.bb-lf{fill:${leaf};stroke:${c.line};stroke-width:.5;stroke-linejoin:round}.bb-lf2{fill:${leafLt};stroke:${c.line};stroke-width:.5;stroke-linejoin:round}` +
  `.bb-vein{fill:none;stroke:${c.line};stroke-width:.4;opacity:.55;stroke-linecap:round}.bb-cat{fill:${catkin};stroke:${c.line};stroke-width:.5}` +
  `.bb-ground{fill:none;stroke:${c.line};stroke-width:1;stroke-linecap:round;opacity:.5}.bb-grass{fill:none;stroke:${c.line};stroke-width:.9;stroke-linecap:round;opacity:.55}` +
  `.bb-stone{fill:${c.shade};stroke:${c.line};stroke-width:.7;opacity:.8}`;
for (const [name, block] of [['light', lightBlock], ['dark', darkBlock]]) {
  const css = birchCss(BB[name], tok(block, '--c-leaf'), tok(block, '--c-leaf-lt'), tok(block, '--catkin'));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="420" viewBox="-60 -60 360 420"><style>${css}</style>${birchInner}</svg>\n`;
  writeFileSync(join(GM, 'assets', `birch-${name}.svg`), svg);
  R.push(`birch-${name}.svg: ${Buffer.byteLength(svg)} B raw, ${gzipSync(svg).length} B gzip`);
}

console.log(R.join('\n'));
