/**
 * Stage 6: controller evidence at a founder stop. The A0 set (captures,
 * per-school contact sheets, boundary sheets) re-shot at the current head
 * under its own label, then each school's contact sheet laid beside the A0
 * one (A0 left, now right) so the stop shows what the wave changed.
 *
 * Written 11-20-26 for stop 3: several wave 2 tasks skipped whole-page or
 * swap films their briefs asked for, so the controller shoots the whole set.
 * Run it under snap.mjs so the build cannot change mid-capture:
 *
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name stage6-w2 --port 4460 \
 *     -- node scripts/themes/stage6/stop-evidence.mjs --label stage6-w2 \
 *        [--only captures,sheets,motion,boundary,compare]
 *
 * Output: scripts/themes/.out/<label>-captures/ (captures, sheets/, boundary/),
 * <label>-motion/, <label>-captures/compare/<school>__<viewport>.jpg.
 * capture.mjs forces prefers-reduced-transparency: no-preference.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const HERE = dirname(fileURLToPath(import.meta.url));
const THEMES = join(HERE, '..');
const OUT = join(THEMES, '.out');
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const label = arg('label');
if (!label || label.startsWith('stage6-a0')) {
  console.error('usage: --label <name> (not stage6-a0*, which is the baseline)');
  process.exit(1);
}
const base = process.env.SNAP_BASE;
const onlyArg = arg('only');
const only = onlyArg ? new Set(onlyArg.split(',')) : null;
const want = (step) => !only || only.has(step);
const needsServer = ['captures', 'motion'].some(want);
if (needsServer && !base) {
  console.error('SNAP_BASE is not set: run this under scripts/themes/snap.mjs (see header).');
  process.exit(1);
}
if (needsServer && process.env.BDL_GPU !== '1') {
  console.error('BDL_GPU=1 is required: captures and films must use the real GPU.');
  process.exit(1);
}

const SCHOOLS = ['vaporwave', 'grandmillennial', 'glassmorphism', 'cottagecore', 'bauhaus', 'swiss'];
const PAGES = ['', 'about/', 'services/', 'contact/', 'contact/sent/'];
const routes = SCHOOLS.flatMap((s) => PAGES.map((p) => `/t/${s}/${p}`)).join(',');
const CAP = `${label}-captures`;

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
    join(THEMES, 'capture.mjs'), '--base', base, '--routes', routes, '--label', CAP,
    '--schemes', 'dark,light', '--viewports', 'desktop,tablet,mobile', '--full-page', '--hide-switcher',
  ]);
}
if (want('sheets')) {
  run('sheets', [join(THEMES, 'contact-sheet.mjs'), '--label', CAP, '--scale', '0.5', '--quality', '86']);
}
if (want('motion')) {
  run('motion', [
    join(THEMES, 'motion.mjs'), '--base', base, '--schools', SCHOOLS.join(','),
    '--scenarios', 'arrive,page', '--viewports', 'desktop,mobile', '--schemes', 'dark,light',
    '--label', `${label}-motion`,
  ], [0, 2]);
}
if (want('boundary')) {
  run('boundary', [join(HERE, 'a0-boundary-sheets.mjs'), '--label', CAP]);
}
if (want('compare')) {
  const dir = join(OUT, CAP, 'compare');
  mkdirSync(dir, { recursive: true });
  for (const school of SCHOOLS) {
    for (const vp of ['desktop', 'tablet', 'mobile']) {
      const a = join(OUT, 'stage6-a0-captures', 'sheets', `${school}__${vp}.jpg`);
      const b = join(OUT, CAP, 'sheets', `${school}__${vp}.jpg`);
      if (!existsSync(a) || !existsSync(b)) {
        console.warn(`compare: missing ${existsSync(a) ? b : a}`);
        continue;
      }
      const [ma, mb] = await Promise.all([sharp(a).metadata(), sharp(b).metadata()]);
      const gap = 24;
      const w = ma.width + mb.width + gap;
      const h = Math.max(ma.height, mb.height);
      await sharp({ create: { width: w, height: h, channels: 3, background: '#202020' } })
        .composite([{ input: a, left: 0, top: 0 }, { input: b, left: ma.width + gap, top: 0 }])
        .jpeg({ quality: 82 })
        .toFile(join(dir, `${school}__${vp}.jpg`));
      console.log(`compare: ${school}__${vp}.jpg`);
    }
  }
}
console.log(`\nStop evidence (${label}) done.`);
