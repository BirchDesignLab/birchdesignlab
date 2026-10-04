/**
 * Stage 5 B1 task 1 (item 7, "age the prints"): prints the --c-* pattern inks
 * with their chroma cut by a fixed fraction in OKLCH, lightness and hue kept.
 * The result is pasted into src/themes/grandmillennial/theme.css by hand, so
 * the numbers stay readable there; this script is how they were derived.
 *
 * Usage: node scripts/themes/grandmillennial/age-inks.mjs [cut=0.2]
 */
/* Self-contained OKLab math (Bjorn Ottosson), so the script runs under plain node. */
const lin = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const gam = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
function hexToOklch(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => lin(v / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { l: L, c: Math.hypot(A, B), h: Math.atan2(B, A) };
}
function oklchToHex({ l: L, c, h }) {
  const A = c * Math.cos(h), B = c * Math.sin(h);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  return '#' + rgb.map((v) => Math.round(Math.min(1, Math.max(0, gam(v))) * 255).toString(16).padStart(2, '0')).join('');
}

const cut = Number(process.argv[2] ?? 0.2);
const INKS = {
  light: {
    '--c-ground': '#f5e5dc', '--c-rose': '#c9576b', '--c-rose-lt': '#f0c0b8', '--c-rose-dk': '#7d1f2b',
    '--c-leaf': '#2f5e41', '--c-leaf-lt': '#8aa981', '--c-blue': '#3a64a8', '--c-dot': '#b8933f',
  },
  dark: {
    '--c-ground': '#1b3a2a', '--c-rose': '#b04458', '--c-rose-lt': '#d99a9c', '--c-rose-dk': '#5d1422',
    '--c-leaf': '#4b7d59', '--c-leaf-lt': '#7f9c73', '--c-blue': '#86a6d8', '--c-dot': '#c9a95c',
  },
};
for (const [scheme, inks] of Object.entries(INKS)) {
  console.log(`/* ${scheme}, chroma x ${1 - cut} */`);
  for (const [name, hex] of Object.entries(inks)) {
    const o = hexToOklch(hex);
    const aged = oklchToHex({ ...o, c: o.c * (1 - cut) });
    console.log(`  ${name}: ${aged};  /* was ${hex}, C ${o.c.toFixed(3)} -> ${(o.c * (1 - cut)).toFixed(3)} */`);
  }
}
