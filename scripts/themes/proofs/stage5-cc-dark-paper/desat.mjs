/**
 * Stage 5 proof a5: the petal fills desaturated 10% for the mounted sheets
 * (brief item 3 asks 8 to 12%). Prints the light-scheme pressed-flower petal
 * tokens before and after (HSL saturation times 0.90), the values pasted into
 * paper-c.css and paper-b.css.
 *
 *   node scripts/themes/proofs/stage5-cc-dark-paper/desat.mjs
 */
const PETALS = {
  '--cc-petal': '#fffdf7', '--cc-petal-back': '#f1e7d2', '--cc-rose-petal': '#e8aeaa',
  '--cc-blush': '#fff4e4', '--cc-lav': '#a493cc',
};
const K = 0.9;
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
function toHsl([r, g, b]) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}
function fromHsl([h, s, l]) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return '#' + [r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
}
for (const [k, v] of Object.entries(PETALS)) {
  const [h, s, l] = toHsl(rgb(v));
  console.log(`${k}: ${v} -> ${fromHsl([h, s * K, l])}  (s ${s.toFixed(2)} -> ${(s * K).toFixed(2)})`);
}
