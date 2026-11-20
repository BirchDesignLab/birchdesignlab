/**
 * Stage 6 wave 2, V14: the light scheme's "Clouds" wallpaper for vaporwave.
 *
 * The pastel-dawn atmosphere (theme.css, `--field-atmo` under
 * [data-scheme='light']) used to be three blurred white radial blobs, which
 * drift toward glassmorphism's soft light. This draws the Windows 95 "Clouds"
 * wallpaper idea instead: hard-edged, stair-stepped pixel clouds, two tones
 * (white body, a lilac belly), tiled on a 340px cell (the size body::before
 * already uses). Every edge falls on a whole 10px step and the image is
 * `shape-rendering: crispEdges`, so nothing anywhere is soft.
 *
 *   node scripts/themes/vaporwave/clouds-bitmap.mjs          prints the CSS value
 *   node scripts/themes/vaporwave/clouds-bitmap.mjs --svg    prints the bare SVG
 *
 * Paste the value into theme.css when the clouds change. A cloud is a list of
 * rows, each [first column, length], top to bottom; the last row is the belly.
 */
const UNIT = 10;
const CELL = 34; // units: 340px
const BODY = '#ffffff';
const BELLY = '#e6d0ff';

const CLOUDS = [
  { x: 2, y: 4, rows: [[6, 4], [4, 8], [2, 12], [1, 15], [0, 16], [2, 13]] },
  { x: 19, y: 17, rows: [[4, 3], [2, 7], [1, 9], [0, 11], [1, 9]] },
  { x: 6, y: 26, rows: [[3, 3], [1, 6], [0, 8], [1, 6]] },
];

function layer(fill, rects) {
  const d = rects.map(([x, y, w]) => `M${x * UNIT} ${y * UNIT}h${w * UNIT}v${UNIT}h${-w * UNIT}z`).join('');
  return `<path fill='${fill}' fill-opacity='.72' d='${d}'/>`;
}

const body = [];
const belly = [];
for (const { x, y, rows } of CLOUDS) {
  rows.forEach(([c, len], i) => {
    const rect = [x + c, y + i, len];
    (i === rows.length - 1 ? belly : body).push(rect);
  });
}
const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${CELL * UNIT}' height='${CELL * UNIT}' shape-rendering='crispEdges'>${layer(BODY, body)}${layer(BELLY, belly)}</svg>`;

if (process.argv.includes('--svg')) console.log(svg);
else console.log(`url("data:image/svg+xml,${svg.replace(/#/g, '%23').replace(/</g, '%3C').replace(/>/g, '%3E')}")`);
