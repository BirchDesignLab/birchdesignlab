// Quick look at one chart while tuning it: settles the one-shot motion, then
// screenshots the SVG as an <img> (as GitHub serves it) on GitHub's page colours.
//
//   node scripts/readme/charts/peek.mjs 4 [light|dark] [desktop|phone] [scale]   -> scripts/readme/.out/charts/peek/<name>.png
//   node scripts/readme/charts/peek.mjs 4 light desktop 2 --crop 36,90,260,260   (crop in svg px)
import { mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { REPO, registry, svgPath } from './source.mjs';

const require = createRequire(resolve(REPO, 'package.json'));
const { chromium } = require('playwright');
const [n, scheme = 'light', variant = 'desktop', scale = '1'] = process.argv.slice(2);
const cropAt = process.argv.indexOf('--crop');
const crop = cropAt >= 0 ? process.argv[cropAt + 1].split(',').map(Number) : null;
const chart = registry.charts.find((c) => c.n === Number(n));
const svg = readFileSync(svgPath(chart, scheme, variant), 'utf8');
const bg = scheme === 'dark' ? '#0d1117' : '#ffffff';
const width = variant === 'phone' ? 360 : 830;
const dir = resolve(REPO, 'scripts/readme/.out/charts/peek');
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: width + 40, height: 800 }, deviceScaleFactor: Number(scale) });
  await page.setContent(`<body style="margin:0;padding:20px;background:${bg}"><img id="i" src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" style="display:block;width:${width}px"></body>`);
  await page.waitForFunction(() => document.getElementById('i').complete);
  await page.waitForTimeout(3800);
  const file = resolve(dir, `${n}-${scheme}-${variant}${crop ? '-crop' : ''}.png`);
  await page.screenshot(crop ? { path: file, clip: { x: 20 + crop[0], y: 20 + crop[1], width: crop[2], height: crop[3] } } : { path: file, fullPage: true });
  console.log(file);
} finally {
  await browser.close();
}
