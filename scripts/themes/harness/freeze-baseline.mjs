/**
 * Run the freeze investigation's measurement batches one after another, so
 * nothing else on the machine competes with a timing run.
 *
 * Written 09-23-26 for Tier 3 stage 2 (the freeze investigation,
 * tier3-stage2/freeze-investigation.md). Each batch is one
 * trace-arrival.mjs invocation; this only loops over viewports, schemes and
 * phases and passes $SNAP_BASE through, so every batch films the same frozen
 * snapshot. Output lands under scripts/themes/.out/<label>/ (default
 * freeze-base), one tag per batch.
 *
 * Phases (--phases, default baseline,pages):
 *   baseline  every school arriving from quiet, and quiet arriving from
 *             vaporwave, under cold (fresh browser per run), warm (the
 *             second arrival in that browser), switcher-warm, pf-render and
 *             pf-raster, desktop and mobile, dark and light;
 *   pages     the in-school swap (Home to About) for the four heavy schools,
 *             cold, pf-raster and warm, desktop and mobile, dark and light;
 *   traces    Chrome traces of cold arrivals for the four heavy schools,
 *             desktop dark and light and mobile dark, filmed and not filmed;
 *   stubs     one layer taken out at a time (harness/freeze-stubs.mjs) for
 *             each heavy school, cold: what each layer adds to the freeze;
 *   residual  what drawing ahead (pf-raster) leaves for cottagecore and
 *             vaporwave: traced, and with the 2D canvas or WebGL stubbed;
 *   seasoned  (see trace-arrival's --fresh-browser) cold runs in a browser
 *             that shares one process for every run, so the GPU's shaders
 *             survive from the first run on: a stand-in for a visitor whose
 *             Chrome has drawn this kind of paint before.
 *
 * Usage:
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name freeze-base --reuse --port 4491 -- \
 *     node scripts/themes/harness/freeze-baseline.mjs [--phases baseline,pages,traces] \
 *     [--runs 5] [--label freeze-base] [--viewports desktop,mobile] [--schemes dark,light]
 */
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const TRACE = join(HERE, '..', 'trace-arrival.mjs');
function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const list = (name, fallback) => arg(name, fallback).split(',').filter(Boolean);
const phases = list('phases', 'baseline,pages');
const runs = arg('runs', '5');
const label = arg('label', 'freeze-base');
const viewports = list('viewports', 'desktop,mobile');
const schemes = list('schemes', 'dark,light');
const HEAVY = 'grandmillennial,cottagecore,vaporwave,glassmorphism';

function run(args) {
  console.log(`\n=== trace-arrival ${args.join(' ')}`);
  const r = spawnSync(process.execPath, [TRACE, ...args, '--label', label], { stdio: 'inherit', env: process.env });
  if (r.status && r.status !== 2) console.log(`(exit ${r.status})`);
}

for (const phase of phases) {
  for (const vp of viewports) {
    for (const scheme of schemes) {
      const common = ['--viewport', vp, '--scheme', scheme];
      if (phase === 'baseline') {
        run([...common, '--fresh-browser', '--runs', runs, '--returns', 'vaporwave',
          '--conditions', 'cold,warm,switcher-warm,pf-render,pf-raster', '--tag', `base-${vp}-${scheme}`]);
      } else if (phase === 'pages') {
        run([...common, '--fresh-browser', '--runs', runs, '--schools', '', '--pages', HEAVY,
          '--conditions', 'cold,warm,pf-raster', '--tag', `pages-${vp}-${scheme}`]);
      } else if (phase === 'traces') {
        if (vp === 'mobile' && scheme === 'light') continue;
        run([...common, '--fresh-browser', '--runs', '0', '--schools', HEAVY + ',bauhaus,swiss', '--trace', HEAVY + ',bauhaus,swiss',
          '--trace-runs', '3', '--tag', `traces-${vp}-${scheme}`]);
        run([...common, '--fresh-browser', '--runs', '0', '--schools', HEAVY, '--trace', HEAVY,
          '--trace-runs', '2', '--no-film', '--tag', `traces-nofilm-${vp}-${scheme}`]);
      } else if (phase === 'stubs') {
        // One layer out at a time, cold in a fresh browser (--stub,
        // harness/freeze-stubs.mjs), for the school whose freeze it may fill.
        const PLAN = {
          grandmillennial: ['svg', 'mask', 'bgimage', 'shadow', 'text'],
          cottagecore: ['svg', 'filter', 'shadow', 'canvas2d', 'bgimage'],
          vaporwave: ['webgl', 'filter', 'vtfilter', 'bgimage', 'text'],
          glassmorphism: ['filter', 'shadow', 'bgimage', 'vtfilter'],
        };
        for (const [id, list] of Object.entries(PLAN)) {
          for (const stub of list) {
            run([...common, '--fresh-browser', '--runs', runs, '--schools', id, '--stub', stub, '--conditions', 'cold',
              '--tag', `stub-${vp}-${scheme}-${id}-${stub}`]);
          }
        }
      } else if (phase === 'residual') {
        // What pf-raster leaves: traced arrivals drawn ahead, and the same
        // with WebGL or the 2D canvas stubbed out.
        run([...common, '--fresh-browser', '--runs', '0', '--schools', 'cottagecore,vaporwave', '--trace', 'cottagecore,vaporwave',
          '--trace-condition', 'pf-raster', '--trace-runs', '2', '--no-film', '--tag', `residual-${vp}-${scheme}`]);
        run([...common, '--fresh-browser', '--runs', runs, '--schools', 'vaporwave', '--stub', 'webgl', '--conditions', 'pf-raster',
          '--tag', `residual-${vp}-${scheme}-vaporwave-webgl`]);
        run([...common, '--fresh-browser', '--runs', runs, '--schools', 'cottagecore', '--stub', 'canvas2d', '--conditions', 'pf-raster',
          '--tag', `residual-${vp}-${scheme}-cottagecore-canvas2d`]);
      } else if (phase === 'seasoned') {
        run([...common, '--runs', runs, '--returns', 'vaporwave', '--conditions', 'cold,warm', '--tag', `seasoned-${vp}-${scheme}`]);
      } else {
        throw new Error(`unknown phase ${phase}`);
      }
    }
  }
}
