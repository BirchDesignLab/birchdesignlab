// Wraps each built chart in README.md as a <picture> (phone sources where the chart
// has a phone layout, then dark, then the light <img> with real alt text) followed by
// a <details> holding the original Mermaid block, unchanged. Idempotent: an existing
// chart <picture> is regenerated from charts.json, a fence already inside the chart
// <details> is left alone, and charts marked "built": false are skipped.
//
//   node scripts/readme/charts/wrap-readme.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { README, registry, svgName } from './source.mjs';

const CRLF = String.fromCharCode(13, 10);
const LF = String.fromCharCode(10);
const text = readFileSync(README, 'utf8');
const eol = text.includes(CRLF) ? CRLF : LF;
const src = text.split(CRLF).join(LF);
const dir = 'assets/readme/charts';

/** The <picture> for a chart: phone sources first (they match first), then dark, then the light <img>. */
function picture(chart) {
  const lines = ['<picture>'];
  if (chart.phone) {
    lines.push(`  <source media="(max-width: 600px) and (prefers-color-scheme: dark)" srcset="${dir}/${svgName(chart, 'dark', 'phone')}">`);
    lines.push(`  <source media="(max-width: 600px)" srcset="${dir}/${svgName(chart, 'light', 'phone')}">`);
  }
  lines.push(`  <source media="(prefers-color-scheme: dark)" srcset="${dir}/${svgName(chart, 'dark')}">`);
  lines.push(`  <img src="${dir}/${svgName(chart, 'light')}" alt="${chart.alt}" width="830">`);
  lines.push('</picture>');
  return lines.join(LF);
}

// 1. regenerate any chart <picture> already in the README (adds or updates sources, alt)
let out = src.replace(/<picture>[\s\S]*?<\/picture>/g, (whole) => {
  const chart = registry.charts.find((c) => c.built && whole.includes(`/${c.n}-${c.name}.`));
  return chart ? picture(chart) : whole;
});

// 2. wrap any built chart that is still a bare Mermaid fence
let n = 0;
out = out.replace(/```mermaid\n([\s\S]*?)```\n/g, (whole, body, offset) => {
  n++;
  const chart = registry.charts.find((c) => c.n === n);
  if (!chart?.built) return whole;
  const before = out.slice(Math.max(0, offset - 80), offset);
  if (before.includes('<summary>Chart source (Mermaid)</summary>')) return whole;
  return (
    picture(chart) +
    '\n\n<details>\n<summary>Chart source (Mermaid)</summary>\n\n' +
    '```mermaid\n' +
    body +
    '```\n\n</details>\n'
  );
});
if (out !== src) {
  writeFileSync(README, out.split(LF).join(eol));
  console.log('README.md updated');
} else console.log('README.md already wrapped');
