/**
 * Stage 5 proof a4: pick the margin-note sepia (light) and tan (dark) by
 * contrast. Prints WCAG ratios of candidate inks against the three surfaces
 * every hand ink must clear (--paper, --note, --field; in dark also the lamp
 * glow laid over --field at its brightest) and the distance each candidate
 * keeps from the inks it must not be mistaken for (--mark-muted, --accent).
 *
 *   node scripts/themes/proofs/stage5-cc-hands/pick-inks.mjs
 */
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const L = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const over = (fg, bg, a) => fg.map((v, i) => v * a + bg[i] * (1 - a));

const light = { paper: hex('#fffaf0'), note: hex('#fbefc4'), field: hex('#f5eddd') };
const darkField = hex('#1f1813');
const dark = { paper: hex('#2c221a'), note: hex('#4a3818'), field: darkField, glow: over([240, 165, 80], darkField, 0.26) };

const sets = {
  light: { surf: light, inks: { '--mark-muted': '#6b5242', '--accent': '#9b4652', '--link': '#4e6a45', 'sepia a': '#7a5230', 'sepia b': '#6e4a2a', 'sepia c': '#74502f' } },
  dark: { surf: dark, inks: { '--mark-muted': '#d3c2a3', '--accent': '#eab86a', '--link': '#a9c294', 'tan a': '#d9b48a', 'tan b': '#cfae88', 'tan c': '#dcbd96' } },
};
for (const [scheme, { surf, inks }] of Object.entries(sets)) {
  console.log(`\n${scheme}`);
  for (const [name, h] of Object.entries(inks)) {
    const row = Object.entries(surf).map(([s, bg]) => `${s} ${ratio(hex(h), bg).toFixed(2)}`).join('  ');
    console.log(`${name.padEnd(14)} ${h}  ${row}`);
  }
}
