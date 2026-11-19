/**
 * Stage 6 Tier A0: regenerate the set's evidence for the re-review panel.
 *
 * Written 11-19-26 for the Stage 6 set re-review
 * (docs/superpowers/specs/theme-schools-research/tier3-stage6/stage6-plan.md).
 * Run it under snap.mjs so the build cannot change mid-capture:
 *
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name stage6-base --reuse --port 4460 \
 *     -- node scripts/themes/stage6/a0-evidence.mjs [--only captures,sheets,motion,boundary]
 *
 * Steps (each one a separate script, so a failure names its step):
 *   captures  all six schools, five pages, dark and light, desktop (1440),
 *             tablet (820, 2x touch) and mobile (390, 2x touch), full page,
 *             switcher hidden -> .out/stage6-a0-captures/
 *   sheets    one contact sheet per school per viewport (contact-sheet.mjs)
 *   motion    arrive, page and fx strips, both schemes, desktop and mobile,
 *             every school -> .out/stage6-a0-motion/
 *   boundary  the three confusable pairs side by side at thumbnail scale
 *             (a0-boundary-sheets.mjs) -> .out/stage6-a0-captures/boundary/
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const THEMES = join(HERE, '..');
const base = process.env.SNAP_BASE;
if (!base) {
  console.error('SNAP_BASE is not set: run this under scripts/themes/snap.mjs (see header).');
  process.exit(1);
}
if (process.env.BDL_GPU !== '1') {
  console.error('BDL_GPU=1 is required: captures and films must use the real GPU.');
  process.exit(1);
}

const SCHOOLS = ['vaporwave', 'grandmillennial', 'glassmorphism', 'cottagecore', 'bauhaus', 'swiss'];
const PAGES = ['', 'about/', 'services/', 'contact/', 'contact/sent/'];
const routes = SCHOOLS.flatMap((s) => PAGES.map((p) => `/t/${s}/${p}`)).join(',');

const i = process.argv.indexOf('--only');
const only = i === -1 ? null : new Set(process.argv[i + 1].split(','));
const want = (step) => !only || only.has(step);

/* motion.mjs exits 2 when it reports problems; on 11-19-26 the only ones
   were "fx: nothing moved" for grandmillennial and swiss, which have no
   idle background motion. Read its problem list in the log; it is not fatal. */
function run(step, args, okCodes = [0]) {
  console.log(`\n== ${step}: node ${args.join(' ')}`);
  const r = spawnSync(process.execPath, args, { stdio: 'inherit', env: { ...process.env, MSYS_NO_PATHCONV: '1' } });
  if (r.status !== 0 && okCodes.includes(r.status)) console.warn(`${step} exited ${r.status}: read its problems above`);
  else if (r.status !== 0) {
    console.error(`${step} failed with exit ${r.status}`);
    process.exit(r.status || 1);
  }
}

if (want('captures')) {
  run('captures', [
    join(THEMES, 'capture.mjs'), '--base', base, '--routes', routes, '--label', 'stage6-a0-captures',
    '--schemes', 'dark,light', '--viewports', 'desktop,tablet,mobile', '--full-page', '--hide-switcher',
  ]);
}
if (want('sheets')) {
  run('sheets', [join(THEMES, 'contact-sheet.mjs'), '--label', 'stage6-a0-captures', '--scale', '0.5', '--quality', '86']);
}
if (want('motion')) {
  run('motion', [
    join(THEMES, 'motion.mjs'), '--base', base, '--schools', SCHOOLS.join(','),
    '--scenarios', 'arrive,page,fx', '--viewports', 'desktop,mobile', '--schemes', 'dark,light',
    '--label', 'stage6-a0-motion',
  ], [0, 2]);
}
if (want('boundary')) {
  run('boundary', [join(HERE, 'a0-boundary-sheets.mjs'), '--label', 'stage6-a0-captures']);
}
console.log('\nA0 evidence done.');
