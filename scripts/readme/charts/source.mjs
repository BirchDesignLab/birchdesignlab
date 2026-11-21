// README parsing shared by the builder and tests/readme-charts.test.ts. No
// browser, no fonts: just text, hashes and the chart registry.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const REPO = resolve(here, '../../..');
export const README = resolve(REPO, 'README.md');
export const OUT_DIR = resolve(REPO, 'assets/readme/charts');
export const registry = JSON.parse(readFileSync(resolve(here, 'charts.json'), 'utf8'));

export const sha256 = (s) => createHash('sha256').update(s).digest('hex');

/** LF endings, no trailing spaces, no leading or trailing blank lines. */
export function normalizeMermaid(block) {
  return block
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .join('\n')
    .replace(/^\n+|\n+$/g, '');
}

export const readmeText = () => readFileSync(README, 'utf8').replace(/\r\n/g, '\n');

/** Every fenced mermaid block in README order, normalized. */
export function mermaidBlocks(text = readmeText()) {
  return [...text.matchAll(/```mermaid\n([\s\S]*?)```/g)].map((m) => normalizeMermaid(m[1]));
}

export const svgName = (chart, scheme, variant = 'desktop') =>
  `${chart.n}-${chart.name}${variant === 'phone' ? '.phone' : ''}.${scheme}.svg`;
export const svgPath = (chart, scheme, variant = 'desktop') => resolve(OUT_DIR, svgName(chart, scheme, variant));
/** Variants a chart is built in: every chart has a desktop SVG; `phone` adds a tall one. */
export const variantsOf = (chart) => (chart.phone ? ['desktop', 'phone'] : ['desktop']);
