/**
 * Run a stage's final portal gates against one served build, one after
 * another (nothing films or times while another step runs), and write one
 * summary of every verdict.
 *
 * Written 09-24-26 for the Tier 3 stage 2 wrap-up
 * (HANDOFF-09-24-26-stage2-wrapup.md, step 2), so the gates are one command
 * a later stage can run again instead of a list retyped by hand. It does not
 * build: run `npm run verify` first, then serve a fresh build through the
 * Worker (`npm run dev:worker`, or preview_start worker, on :8787), because
 * smoke --contact needs /api/contact and the timing needs the live cache
 * headers.
 *
 * Steps (--steps, all by default, in this order):
 *   smoke     smoke.mjs --contact (every school walked, every form sent with
 *             the honeypot filled, so no email goes out);
 *   timing    trace-arrival.mjs --fresh-browser: every school arriving from
 *             quiet and quiet arriving from vaporwave, cold, switcher-warm,
 *             warm, and hover with a 1000 ms rest on the row (drawing ahead
 *             as shipped), desktop and mobile, dark and light (--runs each);
 *   switcher  motion.mjs --crop switcher, arrive and page, all six schools,
 *             desktop, mobile and phone, dark and light: every strip must
 *             hold still;
 *   unname    the hold-still negative control (--unname-switcher, arrive,
 *             desktop dark): schools whose arrival moves the root must FAIL,
 *             or the check has gone blind;
 *   wordmark  motion.mjs --crop wordmark, arrive and page, all six schools
 *             and quiet as a destination (from cottagecore), desktop and
 *             mobile, dark and light: overlap, blank <= 80 ms, blink, drawn;
 *   after     full-frame strips, arrive and page, six schools, dark and
 *             light, desktop and mobile (the 48 --before-dir was filmed as);
 *   sheets    compare-strips.mjs, before over after, one .jpg per strip
 *             (JPEG so a phone can open them).
 *
 * Usage:
 *   BDL_GPU=1 node scripts/themes/harness/stage-gates.mjs [--base http://127.0.0.1:8787] \
 *     [--label stage2-gates] [--steps smoke,timing,switcher,unname,wordmark,after,sheets] \
 *     [--before-dir stage2-before] [--after-label stage2-after] [--runs 5] [--reuse]
 * --reuse films and times nothing: it re-reads each step's output (after a
 * strip was re-filmed on its own, say, since motion.mjs merges manifests)
 * and rewrites the verdicts; the sheets step still redraws its sheets.
 * Output: scripts/themes/.out/<label>/gates.json and gates.md (each step's
 * command, exit code, time and verdicts), the steps' own folders
 * (<label>-timing, <label>-switcher, <label>-unname, <label>-wordmark,
 * <after-label>, <after-label>-compare).
 */
import { spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const THEMES = join(HERE, '..');
const OUT_ROOT = join(THEMES, '.out');
function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const list = (name, fallback) => arg(name, fallback).split(',').filter(Boolean);
const base = arg('base', 'http://127.0.0.1:8787').replace(/\/$/, '');
const label = arg('label', 'stage2-gates');
const steps = list('steps', 'smoke,timing,switcher,unname,wordmark,after,sheets');
const beforeDir = arg('before-dir', 'stage2-before');
const afterLabel = arg('after-label', 'stage2-after');
const runs = arg('runs', '5');
const reuse = process.argv.includes('--reuse');
const OUT = join(OUT_ROOT, label);
const SIX = 'vaporwave,glassmorphism,swiss,cottagecore,grandmillennial,bauhaus';
if (process.env.BDL_GPU !== '1') console.warn('stage-gates: BDL_GPU is not 1, so every film and timing runs on the software rasteriser');

await mkdir(OUT, { recursive: true });
const summaryFile = join(OUT, 'gates.json');
const summary = existsSync(summaryFile) ? JSON.parse(await readFile(summaryFile, 'utf8')) : { base, steps: {} };
summary.base = base;

function run(step, script, args) {
  if (reuse) return { cmd: `node scripts/themes/${[script, ...args].join(' ')}`, exit: null, ms: 0, reused: true };
  const cmd = [join(THEMES, script), ...args];
  console.log(`\n=== ${step}: node ${[script, ...args].join(' ')}`);
  const t0 = Date.now();
  const r = spawnSync(process.execPath, cmd, { stdio: 'inherit', env: process.env });
  const out = { cmd: `node scripts/themes/${[script, ...args].join(' ')}`, exit: r.status, ms: Date.now() - t0 };
  console.log(`=== ${step}: exit ${r.status} in ${Math.round(out.ms / 1000)} s`);
  return out;
}
const manifest = async (dir) => {
  const f = join(OUT_ROOT, dir, 'manifest.json');
  return existsSync(f) ? JSON.parse(await readFile(f, 'utf8')) : { made: [], problems: [] };
};
const name = (e) => `${e.school} ${e.scenario}${e.from ? ` from ${e.from}` : ''} ${e.scheme} ${e.viewport}`;

for (const step of steps) {
  const s = { runs: [] };
  if (step === 'smoke') {
    s.runs.push(run(step, 'smoke.mjs', ['--base', base, '--contact']));
    s.pass = s.runs.every((r) => r.exit === 0);
  } else if (step === 'timing') {
    for (const viewport of ['desktop', 'mobile']) for (const scheme of ['dark', 'light']) {
      s.runs.push(run(`${step} ${viewport} ${scheme}`, 'trace-arrival.mjs', ['--base', base, '--schools', SIX, '--returns', 'vaporwave',
        '--conditions', 'cold,switcher-warm,warm,hover', '--rest-before-click', '1000', '--fresh-browser', '--runs', runs,
        '--viewport', viewport, '--scheme', scheme, '--label', `${label}-timing`, '--tag', `${viewport}-${scheme}`]));
    }
    // trace-arrival exits 2 on any problem line, and its own sandboxed-copy
    // console lines ("Blocked script execution in 'about:srcdoc'") are one;
    // read the problems instead of the exit code.
    s.problems = [];
    for (const viewport of ['desktop', 'mobile']) for (const scheme of ['dark', 'light']) {
      const f = join(OUT_ROOT, `${label}-timing`, `${viewport}-${scheme}.runs.json`);
      if (!existsSync(f)) { s.problems.push(`${viewport} ${scheme}: no runs file`); continue; }
      const { problems } = JSON.parse(await readFile(f, 'utf8'));
      s.problems.push(...(problems ?? []).filter((p) => !p.includes("Blocked script execution in 'about:srcdoc'")).map((p) => `${viewport} ${scheme}: ${p}`));
    }
    s.pass = s.problems.length === 0;
  } else if (step === 'switcher') {
    s.runs.push(run(step, 'motion.mjs', ['--base', base, '--schools', SIX, '--scenarios', 'arrive,page', '--viewports', 'desktop,mobile,phone',
      '--schemes', 'dark,light', '--crop', 'switcher', '--label', `${label}-switcher`]));
    const m = await manifest(`${label}-switcher`);
    const judged = m.made.filter((e) => e.holdStill);
    s.strips = m.made.length;
    s.held = judged.filter((e) => e.holdStill.stable).length;
    s.worst = Math.max(0, ...judged.map((e) => e.holdStill.worst?.score ?? 0));
    s.failed = judged.filter((e) => !e.holdStill.stable).map(name);
    s.pass = s.strips === 72 && s.held === s.strips;
  } else if (step === 'unname') {
    s.runs.push(run(step, 'motion.mjs', ['--base', base, '--schools', SIX, '--scenarios', 'arrive', '--viewports', 'desktop',
      '--schemes', 'dark', '--crop', 'switcher', '--unname-switcher', '--label', `${label}-unname`]));
    const m = await manifest(`${label}-unname`);
    s.strips = m.made.length;
    s.failedAsItShould = m.made.filter((e) => e.holdStill && !e.holdStill.stable).map((e) => e.school);
    s.stillHeld = m.made.filter((e) => e.holdStill?.stable).map((e) => e.school);
    // A school whose arrival leaves the root still (none today) could pass;
    // the control needs most of them to fail.
    s.pass = s.failedAsItShould.length >= 5;
  } else if (step === 'wordmark') {
    s.runs.push(run(step, 'motion.mjs', ['--base', base, '--schools', SIX, '--scenarios', 'arrive,page', '--viewports', 'desktop,mobile',
      '--schemes', 'dark,light', '--crop', 'wordmark', '--label', `${label}-wordmark`]));
    s.runs.push(run(`${step} quiet`, 'motion.mjs', ['--base', base, '--schools', 'quiet', '--from', 'cottagecore', '--scenarios', 'arrive,page',
      '--viewports', 'desktop,mobile', '--schemes', 'dark,light', '--crop', 'wordmark', '--label', `${label}-wordmark`]));
    const m = await manifest(`${label}-wordmark`);
    const arrive = m.made.filter((e) => e.scenario === 'arrive');
    const page = m.made.filter((e) => e.scenario === 'page');
    s.strips = m.made.length;
    s.overlap = `${arrive.filter((e) => e.wordmarkOverlap?.pass).length}/${arrive.length}`;
    s.blankMaxMs = Math.max(0, ...arrive.map((e) => e.wordmarkBlank?.ms ?? 0));
    s.blank = `${arrive.filter((e) => e.wordmarkBlank?.pass).length}/${arrive.length}`;
    s.blink = `${page.filter((e) => e.wordmarkBlink?.pass).length}/${page.length}`;
    s.drawnSuspects = m.made.reduce((n, e) => n + (e.wordmarkDrawn?.suspects?.length ?? 0), 0);
    s.failed = m.made.filter((e) => e.failed || (e.problems ?? []).length).map((e) => `${name(e)}: ${(e.problems ?? []).join('; ')}`);
    s.pass = s.strips === 56 && s.failed.length === 0 && s.drawnSuspects === 0
      && arrive.every((e) => e.wordmarkOverlap?.pass && e.wordmarkBlank?.pass) && page.every((e) => e.wordmarkBlink?.pass);
  } else if (step === 'after') {
    s.runs.push(run(step, 'motion.mjs', ['--base', base, '--schools', SIX, '--scenarios', 'arrive,page', '--viewports', 'desktop,mobile',
      '--schemes', 'dark,light', '--label', afterLabel]));
    const m = await manifest(afterLabel);
    s.strips = m.made.length;
    s.problems = m.problems ?? [];
    s.pass = s.strips === 48 && s.problems.length === 0;
  } else if (step === 'sheets') {
    const before = join(OUT_ROOT, beforeDir);
    const after = join(OUT_ROOT, afterLabel);
    const dest = join(OUT_ROOT, `${afterLabel}-compare`);
    await mkdir(dest, { recursive: true });
    const pngs = (await readdir(after)).filter((f) => f.endsWith('.png'));
    s.sheets = 0;
    s.missing = [];
    for (const f of pngs) {
      if (!existsSync(join(before, f))) { s.missing.push(f); continue; }
      const title = f.replace(/\.png$/, '').split('__').join(' ');
      const r = spawnSync(process.execPath, [join(THEMES, 'compare-strips.mjs'), '--before', join(before, f), '--after', join(after, f),
        '--out', join(dest, f.replace(/\.png$/, '.jpg')), '--title', title, '--before-label', `BEFORE (${beforeDir})`, '--after-label', `AFTER (${afterLabel})`],
      { stdio: 'inherit' });
      if (r.status === 0) s.sheets++;
    }
    s.pass = s.sheets === pngs.length && s.missing.length === 0;
  } else throw new Error(`unknown step ${step}`);
  // Re-reading keeps the commands and exit codes of the run that filmed.
  if (reuse && summary.steps[step]?.runs?.length) s.runs = summary.steps[step].runs.map((r) => ({ ...r, verdictsReread: true }));
  summary.steps[step] = s;
  await writeFile(summaryFile, JSON.stringify(summary, null, 2));
}

const md = [`# Gates against ${summary.base}`, ''];
for (const [step, s] of Object.entries(summary.steps)) {
  const { runs: rs, ...rest } = s;
  md.push(`## ${step}: ${s.pass ? 'PASS' : 'FAIL'}`, '', ...rs.map((r) => `- \`${r.cmd}\`: ${r.reused ? 're-read, not re-run' : `exit ${r.exit}, ${Math.round(r.ms / 1000)} s`}`), '', '```', JSON.stringify(rest, null, 2), '```', '');
}
await writeFile(join(OUT, 'gates.md'), md.join('\n'));
console.log(`\n${md.join('\n')}`);
