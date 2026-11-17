// Wraps each built chart's bare Mermaid fence in README.md as
//   <picture> (light + dark SVG, real alt text) followed by
//   <details> holding the original Mermaid block, unchanged.
// Idempotent: a fence that is already inside the chart <details> is left alone,
// and charts marked "built": false in charts.json are skipped (so charts 4 and 7
// stay plain Mermaid until their showpiece SVGs exist).
//
//   node scripts/readme/charts/wrap-readme.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { README, registry, svgName } from './source.mjs';

const text = readFileSync(README, 'utf8');
const eol = text.includes('\r\n') ? '\r\n' : '\n';
const src = text.replace(/\r\n/g, '\n');
let n = 0;
const out = src.replace(/```mermaid\n([\s\S]*?)```\n/g, (whole, body, offset) => {
  n++;
  const chart = registry.charts.find((c) => c.n === n);
  if (!chart?.built) return whole;
  const before = src.slice(Math.max(0, offset - 80), offset);
  if (before.includes('<summary>Chart source (Mermaid)</summary>')) return whole;
  const dir = 'assets/readme/charts';
  return (
    '<picture>\n' +
    `  <source media="(prefers-color-scheme: dark)" srcset="${dir}/${svgName(chart, 'dark')}">\n` +
    `  <img src="${dir}/${svgName(chart, 'light')}" alt="${chart.alt}" width="830">\n` +
    '</picture>\n\n' +
    '<details>\n<summary>Chart source (Mermaid)</summary>\n\n' +
    '```mermaid\n' +
    body +
    '```\n\n</details>\n'
  );
});
if (out !== src) {
  writeFileSync(README, out.replace(/\n/g, eol));
  console.log('README.md updated');
} else console.log('README.md already wrapped');
