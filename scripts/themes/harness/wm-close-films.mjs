/**
 * Film the set that closes held item 3's soft spots, against one frozen
 * build, into one label folder.
 *
 * Written 09-23-26 for Tier 3 stage 2. cea8db5 took the departing wordmark
 * out of the morph on a swap clicked from low down a page; its builder and
 * critic left two soft spots (swiss's held header sitting with an empty
 * wordmark slot, bauhaus's new wordmark fading in over the old page) and
 * one case never filmed (the wordmark part on screen). The cure also takes
 * the arriving wordmark out of the morph on such a swap. This films the same
 * set on the build before the cure and the build after it, so each strip can
 * be laid over its twin with compare-strips.mjs:
 *   in-school     every school, footer About link from the bottom of Home,
 *                 header band (--top 160) and full frame;
 *   cross-school  quiet to cottagecore, swiss to vaporwave, grandmillennial
 *                 to bauhaus, from the bottom of Home to the other school's
 *                 About, header band and full frame;
 *   seen          swiss, cottagecore and quiet, footer About link with the
 *                 wordmark about 30% and about 70% on screen, header band;
 *   regression    motion.mjs --crop wordmark, arrive (from quiet) and page,
 *                 all six schools; --crop switcher arrive and page on the
 *                 phone for swiss and bauhaus.
 * Every film runs dark desktop and light mobile.
 *
 * Usage (snap.mjs sets SNAP_BASE; BDL_GPU=1 is passed on to every film):
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name wm-close --reuse --port 4497 -- \
 *     node scripts/themes/harness/wm-close-films.mjs --label stage2-wm-close [--only in-school,seen]
 * Exit code 1 if any film failed; each film's own output is printed as it runs.
 */
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const THEMES = join(dirname(fileURLToPath(import.meta.url)), '..');
function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const label = arg('label', '');
const only = (arg('only', '') || '').split(',').filter(Boolean);
if (!/^[a-z0-9][a-z0-9-]{0,60}$/.test(label) || !process.env.SNAP_BASE) {
  console.error('usage (under snap.mjs): node scripts/themes/harness/wm-close-films.mjs --label <label> [--only in-school,cross-school,seen,regression]');
  process.exit(1);
}
const want = (part) => !only.length || only.includes(part);
const env = { ...process.env, BDL_GPU: '1' };
const COMBOS = [['dark', 'desktop'], ['light', 'mobile']];
const SCHOOLS = ['vaporwave', 'glassmorphism', 'swiss', 'cottagecore', 'grandmillennial', 'bauhaus'];

let failed = 0;
function run(script, args) {
  console.log(`\n== ${script} ${args.join(' ')}`);
  const r = spawnSync(process.execPath, [join(THEMES, script), ...args], { env, stdio: 'inherit' });
  if (r.status !== 0) {
    failed++;
    console.log(`!! exit ${r.status}`);
  }
}
const probe = (args) => {
  for (const [scheme, vp] of COMBOS) {
    for (const top of [['--top', '160'], []]) {
      if (args.includes('--seen') && !top.length) continue;
      run('probe-scrolled-swap.mjs', [...args, '--schemes', scheme, '--viewports', vp, '--label', label, ...top]);
    }
  }
};

if (want('in-school')) for (const school of ['quiet', ...SCHOOLS]) probe(['--school', school]);
if (want('cross-school')) {
  for (const [from, to] of [['quiet', 'cottagecore'], ['swiss', 'vaporwave'], ['grandmillennial', 'bauhaus']]) {
    probe(['--school', from, '--to-school', to, '--to', 'about']);
  }
}
if (want('seen')) {
  for (const school of ['swiss', 'cottagecore', 'quiet']) {
    for (const f of ['0.3', '0.7']) probe(['--school', school, '--seen', f]);
  }
}
if (want('regression')) {
  for (const [scheme, vp] of COMBOS) {
    run('motion.mjs', ['--schools', SCHOOLS.join(','), '--scenarios', 'arrive,page', '--crop', 'wordmark',
      '--schemes', scheme, '--viewports', vp, '--label', label]);
  }
  run('motion.mjs', ['--schools', 'swiss,bauhaus', '--scenarios', 'arrive,page', '--crop', 'switcher',
    '--schemes', 'light', '--viewports', 'mobile', '--label', label]);
}
console.log(`\nwm-close-films: ${failed ? `${failed} film(s) failed` : 'every film ran'}`);
process.exit(failed ? 1 : 0);
