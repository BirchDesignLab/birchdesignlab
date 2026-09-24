/**
 * Run the cheaper-first-draw measurement batches (agent L of the freeze
 * investigation) one after another, so nothing else competes with a timing
 * run.
 *
 * Written 09-23-26 for Tier 3 stage 2 (tier3-stage2/freeze-investigation.md,
 * "L: cheaper first draw, the school side"). Agent M put what a script-less
 * copy drawn ahead cannot warm at vaporwave's WebGL sunset (the main thread
 * waiting about 70 ms for its program to link) and cottagecore's fireflies
 * (a 2D canvas, about 30 to 44 ms). This times those two schools against
 * whatever snapshot $SNAP_BASE serves (freeze-l0 is the tree as agent D left
 * it; freeze-l1 and on carry the school-side changes), one trace-arrival.mjs
 * invocation per batch, output under scripts/themes/.out/<label>/, one tag
 * per batch:
 *   cold   vaporwave and cottagecore arriving from quiet, and cottagecore's
 *          Home to About (its fireflies are on every page), nothing drawn
 *          ahead, fresh browser per run: the first-visit cost with no copy;
 *   hover  the same trips with the mouse resting --leads ms on the row or
 *          link first, so agent D's copy is drawn ahead (desktop only);
 *   tap    a touch going down on the row 80 ms before the click (mobile).
 *
 * Usage:
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name freeze-l0 --reuse --port 4493 -- \
 *     node scripts/themes/harness/lighter-batch.mjs --label freeze-l0 \
 *     [--phases cold,hover,tap] [--runs 5] [--viewports desktop,mobile] \
 *     [--schemes dark,light] [--leads 300] [--schools vaporwave,cottagecore] \
 *     [--pages cottagecore]
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
const phases = list('phases', 'cold,hover,tap');
const runs = arg('runs', '5');
const label = arg('label', 'freeze-l0');
const viewports = list('viewports', 'desktop,mobile');
const schemes = list('schemes', 'dark,light');
const leads = list('leads', '300');
const schools = arg('schools', 'vaporwave,cottagecore');
const pages = arg('pages', 'cottagecore');

function run(args) {
  console.log(`\n=== trace-arrival ${args.join(' ')}`);
  const r = spawnSync(process.execPath, [TRACE, ...args, '--label', label], { stdio: 'inherit', env: process.env });
  if (r.status && r.status !== 2) console.log(`(exit ${r.status})`);
}

for (const phase of phases) {
  for (const vp of viewports) {
    for (const scheme of schemes) {
      const common = ['--viewport', vp, '--scheme', scheme, '--fresh-browser', '--runs', runs, '--schools', schools];
      const withPages = pages ? ['--pages', pages] : [];
      if (phase === 'cold') {
        run([...common, ...withPages, '--conditions', 'cold', '--tag', `cold-${vp}-${scheme}`]);
      } else if (phase === 'hover' && vp === 'desktop') {
        for (const ms of leads) {
          run([...common, ...withPages, '--conditions', 'hover', '--hover-lead', ms, '--tag', `hover${ms}-${vp}-${scheme}`]);
        }
      } else if (phase === 'tap' && vp === 'mobile') {
        run([...common, '--conditions', 'tap', '--hover-lead', '80', '--tag', `tap80-${vp}-${scheme}`]);
      }
    }
  }
}
