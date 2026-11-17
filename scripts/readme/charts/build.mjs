// README chart builder.
//
//   node scripts/readme/charts/build.mjs            build every chart
//   node scripts/readme/charts/build.mjs --check    re-render, fail if any committed SVG differs
//   node scripts/readme/charts/build.mjs --only 1   build one chart (by number)
//
// Reads the Mermaid blocks in README.md, lays them out with a pinned Mermaid in
// headless Chromium (layout.mjs), redraws them as brand SVGs in the site's
// palette with Marcellus and Spectral embedded (render.mjs, theme.mjs,
// fonts.mjs), adds each chart's motion (specs.mjs) and writes
// assets/readme/charts/<n>-<name>.{light,dark}.svg. Output is deterministic.
// Each SVG records the sha256 of its source block in <metadata>, which
// tests/readme-charts.test.ts compares against README.md.
//
// Needs: playwright chromium (npx playwright install chromium) and python with
// fonttools + brotli (pip install fonttools brotli) for glyph subsetting.
// Writes a size and contrast report to scripts/readme/.out/charts/report.json.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { OUT_DIR, REPO, mermaidBlocks, registry, sha256, svgPath } from './source.mjs';
import { layoutAll } from './layout.mjs';
import { prepare, renderScheme } from './render.mjs';
import { specs } from './specs.mjs';

const args = process.argv.slice(2);
const check = args.includes('--check');
const onlyIdx = args.indexOf('--only');
const only = onlyIdx >= 0 ? Number(args[onlyIdx + 1]) : null;

const blocks = mermaidBlocks();
const charts = registry.charts.filter((c) => c.built && (only == null || c.n === only));
const mermaidCharts = charts.filter((c) => c.kind === 'mermaid');

const requests = mermaidCharts.map((c) => {
  const src = blocks[c.n - 1];
  if (!src) throw new Error(`README has no mermaid block ${c.n} for chart ${c.name}`);
  return { src, dagre: !specs[c.name]?.layout, ...c.render };
});
const models = await layoutAll(requests);

const report = { charts: [] };
let stale = 0;
const jobs = [];
mermaidCharts.forEach((chart, i) => {
  const spec = specs[chart.name];
  const P = prepare(chart, models[i], spec);
  const sourceHash = sha256(blocks[chart.n - 1]);
  for (const scheme of ['light', 'dark']) jobs.push({ chart, scheme, out: renderScheme(P, scheme, { sourceHash }) });
});

const outDir = resolve(OUT_DIR);
if (!check) mkdirSync(outDir, { recursive: true });
for (const { chart, scheme, out } of jobs) {
  const file = svgPath(chart, scheme);
  const bytes = Buffer.byteLength(out.svg);
  if (check) {
    const cur = existsSync(file) ? readFileSync(file, 'utf8') : null;
    if (cur !== out.svg) {
      stale++;
      console.error(`STALE ${file}`);
    }
  } else {
    writeFileSync(file, out.svg);
  }
  const entry = {
    chart: chart.n,
    name: chart.name,
    scheme,
    bytes,
    minRenderedTextPx: Number(out.minRendered.toFixed(1)),
    fit: out.fit,
    pairs: out.pairs.map((p) => ({ where: p.where, fg: p.fg, bg: p.bg, ratio: Number(p.ratio.toFixed(2)) })),
  };
  report.charts.push(entry);
  const bad = entry.pairs.filter((p) => p.ratio < (p.where.includes('non-text') ? 3 : 4.5));
  console.log(
    `${chart.n}-${chart.name}.${scheme}.svg  ${(bytes / 1024).toFixed(1)} KB  min text ${entry.minRenderedTextPx}px @830  W ${out.W}` +
      (out.fit.length ? `  FIT: ${out.fit.join('; ')}` : '') +
      (bad.length ? `  LOW CONTRAST: ${bad.map((b) => `${b.where} ${b.ratio}`).join('; ')}` : ''),
  );
  if (bytes > 150 * 1024) throw new Error(`${file} is over 150 KB`);
  if (bad.length) process.exitCode = 1;
  if (out.minRendered < 11) {
    console.error(`  text renders below 11px at 830 (${out.minRendered.toFixed(1)})`);
    process.exitCode = 1;
  }
}
if (!check) {
  const rdir = resolve(REPO, 'scripts/readme/.out/charts');
  mkdirSync(rdir, { recursive: true });
  writeFileSync(resolve(rdir, 'report.json'), JSON.stringify(report, null, 1));
}
if (check && stale) {
  console.error(`${stale} chart file(s) are stale: run node scripts/readme/charts/build.mjs`);
  process.exit(1);
}
console.log(check ? 'charts are current' : 'charts built');
