/**
 * Run the drawing-ahead measurement batches (agent D of the freeze
 * investigation) one after another, so nothing else competes with a timing
 * run.
 *
 * Written 09-23-26 for Tier 3 stage 2 (tier3-stage2/freeze-investigation.md,
 * "D: drawing ahead, the portal side"). runtime.ts draws a script-less copy
 * of each page warmPages() warms over the current page at opacity 0.001, so
 * the GPU compiles its programs before the click. Each batch is one
 * trace-arrival.mjs invocation against whatever snapshot $SNAP_BASE serves
 * (freeze-d0 is HEAD without it, freeze-d1 with it); output lands under
 * scripts/themes/.out/<label>/, one tag per batch.
 *
 * Phases (--phases, default shipped):
 *   shipped  (named for the first try, freeze-d1, which drew every school
 *            when the dialog opened; not what ships) every school arriving
 *            from quiet, and quiet arriving from vaporwave, under
 *            switcher-warm (the dialog opened, the warm-up and the drawing
 *            ahead let finish, the dialog closed, the link followed), fresh
 *            browser per run, desktop and mobile, dark and light;
 *   pick     the visitor's own path: the dialog opened on quiet, the
 *            destination's row clicked --pick-after ms later (default 700,
 *            1500 and 3000), the four heavy schools, fresh browser;
 *   intent   drawing ahead on intent (what runtime.ts ships after the first
 *            try): on desktop the mouse rests on the destination's row in
 *            the dialog (after its warm-up) or on the page's own link to
 *            About, --leads ms before the click (default 150,300); on
 *            mobile a touch goes down on the row 80 ms before the click.
 *            The heavy schools and bauhaus arriving, the heavy schools'
 *            Home to About.
 *
 * Usage:
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name freeze-d1 --reuse --port 4492 -- \
 *     node scripts/themes/harness/draw-ahead-batch.mjs [--phases shipped,pick] \
 *     [--runs 5] [--label freeze-d1] [--viewports desktop,mobile] [--schemes dark,light] \
 *     [--picks 700,1500,3000] [--leads 150,300]
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
const phases = list('phases', 'shipped');
const runs = arg('runs', '5');
const label = arg('label', 'freeze-d1');
const viewports = list('viewports', 'desktop,mobile');
const schemes = list('schemes', 'dark,light');
const picks = list('picks', '700,1500,3000');
const leads = list('leads', '150,300');
const HEAVY = 'grandmillennial,cottagecore,vaporwave,glassmorphism';

function run(args) {
  console.log(`\n=== trace-arrival ${args.join(' ')}`);
  const r = spawnSync(process.execPath, [TRACE, ...args, '--label', label], { stdio: 'inherit', env: process.env });
  if (r.status && r.status !== 2) console.log(`(exit ${r.status})`);
}

for (const phase of phases) {
  for (const vp of viewports) {
    for (const scheme of schemes) {
      const common = ['--viewport', vp, '--scheme', scheme, '--fresh-browser', '--runs', runs];
      if (phase === 'shipped') {
        run([...common, '--returns', 'vaporwave', '--conditions', 'switcher-warm', '--tag', `drawn-${vp}-${scheme}`]);
      } else if (phase === 'pick') {
        for (const ms of picks) {
          run([...common, '--schools', HEAVY, '--conditions', 'switcher-pick', '--pick-after', ms, '--tag', `pick${ms}-${vp}-${scheme}`]);
        }
      } else if (phase === 'intent') {
        if (vp === 'mobile') {
          run([...common, '--schools', HEAVY + ',bauhaus', '--conditions', 'tap', '--hover-lead', '80', '--tag', `tap80-${vp}-${scheme}`]);
        } else {
          for (const ms of leads) {
            run([...common, '--schools', HEAVY + ',bauhaus', '--pages', HEAVY, '--conditions', 'hover', '--hover-lead', ms, '--tag', `hover${ms}-${vp}-${scheme}`]);
          }
        }
      } else {
        throw new Error(`unknown phase ${phase}`);
      }
    }
  }
}
