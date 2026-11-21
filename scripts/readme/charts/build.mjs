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
// assets/readme/charts/<n>-<name>[.phone].{light,dark}.svg. The two showpieces
// (portal.mjs, timeline.mjs) are drawn in code from data/*.json instead. Every
// chart has a desktop SVG (830 wide) and, where "phone" is set in charts.json, a
// tall one for the README's `(max-width: 600px)` <source>. Output is
// deterministic. Each SVG records the sha256 of its source (the normalized
// Mermaid block, or the JSON file) in <metadata>, which
// tests/readme-charts.test.ts compares against README.md.
//
// Needs: playwright chromium (npx playwright install chromium) and python with
// fonttools + brotli (pip install fonttools brotli) for glyph subsetting.
// Writes a size and contrast report to scripts/readme/.out/charts/report.json.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { OUT_DIR, REPO, mermaidBlocks, registry, sha256, svgPath, variantsOf } from './source.mjs';
import { layoutAll } from './layout.mjs';
import { handLaid, prepare, renderScheme } from './render.mjs';
import { specs } from './specs.mjs';
import { buildPortal } from './portal.mjs';
import { buildTimeline } from './timeline.mjs';

const SHOWPIECES = { 'portal-schools': buildPortal, timeline: buildTimeline };

const args = process.argv.slice(2);
const check = args.includes('--check');
const onlyIdx = args.indexOf('--only');
const only = onlyIdx >= 0 ? Number(args[onlyIdx + 1]) : null;

const blocks = mermaidBlocks();
const charts = registry.charts.filter((c) => c.built && (only == null || c.n === only));
const effective = (chart, variant) => ({
  ...chart,
  render: { ...chart.render, ...(variant === 'phone' ? chart.render?.phone : {}) },
});

// one layout request per (mermaid chart, variant)
const reqs = [];
for (const c of charts.filter((x) => x.kind === 'mermaid')) {
  for (const variant of variantsOf(c)) {
    const eff = effective(c, variant);
    const src = blocks[c.n - 1];
    if (!src) throw new Error(`README has no mermaid block ${c.n} for chart ${c.name}`);
    const spec = specs[c.name];
    reqs.push({ chart: c, eff, variant, req: { src, dagre: !handLaid(spec, variant), ...eff.render } });
  }
}
// Text floor: nothing may render under MIN_PX at the README's width (830 desktop, 360
// phone). A chart's type sizes are raised until its scale (rendered width over layout
// width) lets the smallest land on the floor; a bigger size changes the layout, so lay
// out again until nothing moves.
const MIN_PX = 12.6;
let models;
for (let pass = 0; pass < 6; pass++) {
  models = await layoutAll(reqs.map((r) => r.req));
  let changed = false;
  reqs.forEach((r, i) => {
    const P = prepare(r.eff, models[i], specs[r.chart.name], r.variant);
    const need = Math.ceil((MIN_PX / P.scale) * 10) / 10;
    const rr = r.eff.render;
    const next = { headSize: Math.max(rr.headSize, need), fontSize: Math.max(rr.fontSize, need), edgeSize: Math.max(rr.edgeSize, need), clusterSize: Math.max(rr.clusterSize, need) };
    if (Object.keys(next).some((k) => next[k] !== rr[k])) {
      r.eff.render = { ...rr, ...next };
      r.req = { ...r.req, ...next };
      changed = true;
    }
  });
  if (!changed) break;
}

/** The smallest font size the finished SVG draws, in px at the README's width. */
function minFontPx(svg, width) {
  const vb = Number(/viewBox="0 0 ([\d.]+) /.exec(svg)[1]);
  const sans = svg.replace(/url\(data:[^)]*\)/g, '');
  const sizes = [...sans.matchAll(/font(?:-size)?:\s*(?:italic\s+)?([\d.]+)px/g)].map((m) => Number(m[1]));
  return Math.min(...sizes) * (width / vb);
}

const report = { charts: [] };
let stale = 0;
const jobs = [];
reqs.forEach((r, i) => {
  const P = prepare(r.eff, models[i], specs[r.chart.name], r.variant);
  const sourceHash = sha256(blocks[r.chart.n - 1]);
  for (const scheme of ['light', 'dark']) jobs.push({ chart: r.chart, variant: r.variant, scheme, out: renderScheme(P, scheme, { sourceHash }) });
});
for (const c of charts.filter((x) => x.kind === 'showpiece')) {
  const build = SHOWPIECES[c.name];
  if (!build) throw new Error(`no builder for showpiece ${c.name}`);
  const raw = readFileSync(resolve(REPO, c.data), 'utf8');
  const data = JSON.parse(raw);
  for (const variant of variantsOf(c)) {
    for (const scheme of ['light', 'dark']) jobs.push({ chart: c, variant, scheme, out: build(c, data, scheme, variant, { sourceHash: sha256(raw) }) });
  }
}

const outDir = resolve(OUT_DIR);
if (!check) mkdirSync(outDir, { recursive: true });
for (const { chart, variant, scheme, out } of jobs) {
  const file = svgPath(chart, scheme, variant);
  const bytes = Buffer.byteLength(out.svg);
  const label = `${chart.n}-${chart.name}${variant === 'phone' ? '.phone' : ''}.${scheme}.svg`;
  if (check) {
    // a Windows checkout may have turned the committed LF into CRLF
    const cur = existsSync(file) ? readFileSync(file, 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10)) : null;
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
    variant,
    scheme,
    bytes,
    minRenderedTextPx: Number(Math.min(out.minRendered, minFontPx(out.svg, variant === 'phone' ? 360 : 830)).toFixed(1)),
    fit: out.fit,
    pairs: out.pairs.map((p) => ({ where: p.where, fg: p.fg, bg: p.bg, ratio: Number(p.ratio.toFixed(2)) })),
  };
  report.charts.push(entry);
  const bad = entry.pairs.filter((p) => p.ratio < (p.where.includes('non-text') ? 3 : 4.5));
  console.log(
    `${label}  ${(bytes / 1024).toFixed(1)} KB  min text ${entry.minRenderedTextPx}px @${variant === 'phone' ? 360 : 830}  W ${out.W}x${out.H}` +
      (out.fit.length ? `  FIT: ${out.fit.join('; ')}` : '') +
      (bad.length ? `  LOW CONTRAST: ${bad.map((b) => `${b.where} ${b.ratio}`).join('; ')}` : ''),
  );
  if (bytes > 150 * 1024) throw new Error(`${file} is over 150 KB`);
  if (bad.length) process.exitCode = 1;
  if (entry.minRenderedTextPx < 12.5) {
    console.error(`  text renders below 12.5px (${entry.minRenderedTextPx})`);
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
