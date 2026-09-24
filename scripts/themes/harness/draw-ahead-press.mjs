/**
 * Should a press on a switcher row still draw its page ahead? Measured with
 * a real press's lead, one batch after another so nothing competes with a
 * timing run.
 *
 * Written 09-24-26 for the Tier 3 stage 2 wrap-up's first question
 * (HANDOFF-09-24-26-stage2-wrapup.md, step 1). Since cfe6df8 a mouse must
 * rest 400 ms on a row before its page is drawn ahead, but a press on a row
 * (runtime.ts drawOnIntent, pointerdown) still draws at once. A real press
 * goes down about 0.1 s before the click; the wrap-up's gain-by-lead table
 * (freeze-investigation.md, "Wrap-up: a longer mouse rest") put a copy
 * started 100 ms before the click at worse than none for glassmorphism and
 * bauhaus, but that copy was started by a rest, not a press, and the older
 * tap80 rows had the film's 400 ms idle watch between the touch and the
 * click, so their lead is unknown. This films the question directly, on one
 * build of what is live:
 *   nopress     the click with no press at all: exactly what dropping the
 *               press trigger gives a quick click (the rest never fires);
 *   press-<ms>  the press going down <ms> before the click (--press-leads),
 *               which draws the copy, the click waiting on it as a real
 *               release would.
 * Every run: trace-arrival.mjs --conditions hover --rest-before-click
 * (--rest, default 350: under the 400 ms rest, so only the press draws),
 * arriving from quiet with the dialog opened and warmed, fresh browser per
 * run, the four heavy schools and bauhaus. Mobile is the 390x844 emulation
 * on this desktop's CPU and GPU (not phone numbers), and its press says
 * pointerType touch.
 *
 * Usage:
 *   node scripts/themes/snap.mjs --name wrapup-main          # build and freeze
 *   BDL_GPU=1 node scripts/themes/harness/draw-ahead-press.mjs [--snap wrapup-main] [--port 4650] \
 *     [--phases run,table] [--press-leads 60,100,140] [--rest 350] \
 *     [--viewports desktop,mobile] [--schemes dark,light] [--runs 5] [--label press-wrapup]
 * Output: scripts/themes/.out/<label>/press-<variant>-<viewport>-<scheme>.runs.json
 * (and .summary.*), tables.md.
 */
import { spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SNAP = join(HERE, '..', 'snap.mjs');
const OUT_ROOT = join(HERE, '..', '.out');
function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const list = (name, fallback) => arg(name, fallback).split(',').filter(Boolean);
const snap = arg('snap', 'wrapup-main');
const port = arg('port', '4650');
const phases = list('phases', 'run,table');
const leads = list('press-leads', '60,100,140');
const rest = arg('rest', '350');
const viewports = list('viewports', 'desktop,mobile');
const schemes = list('schemes', 'dark,light');
const runs = arg('runs', '5');
const label = arg('label', 'press-wrapup');
const OUT = join(OUT_ROOT, label);
const SCHOOLS = 'grandmillennial,glassmorphism,cottagecore,vaporwave,bauhaus';
const variants = ['nopress', ...leads.map((l) => `press-${l}`)];

if (phases.includes('run')) {
  for (const viewport of viewports) for (const scheme of schemes) for (const v of variants) {
    const press = v === 'nopress' ? ['--no-press'] : ['--press-lead', v.slice('press-'.length)];
    const cmd = ['node', join(HERE, '..', 'trace-arrival.mjs'), '--schools', SCHOOLS, '--conditions', 'hover',
      '--rest-before-click', rest, ...press, '--fresh-browser', '--runs', runs, '--viewport', viewport, '--scheme', scheme,
      '--label', label, '--tag', `press-${v === 'nopress' ? 'none' : v.slice('press-'.length)}-${viewport}-${scheme}`];
    console.log(`\n=== snap-${snap}: ${v}, ${viewport} ${scheme}`);
    const r = spawnSync(process.execPath, [SNAP, '--name', snap, '--reuse', '--port', port, '--', ...cmd], { stdio: 'inherit', env: process.env });
    if (r.status) console.log(`(exit ${r.status})`);
  }
}

if (!phases.includes('table')) process.exit(0);

// ---------------------------------------------------------------- tables
const sorted = (xs) => xs.filter((x) => typeof x === 'number' && Number.isFinite(x)).sort((a, b) => a - b);
const median = (xs) => { const v = sorted(xs); return v.length ? (v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2) : null; };
const cell = (xs) => { const v = sorted(xs); return v.length ? `${Math.round(median(v))} (${Math.round(v[0])} to ${Math.round(v[v.length - 1])})` : 'n/a'; };
const md = [
  "# Does a press on a row still draw ahead? (the wrap-up's press question)",
  '',
  `One build (snap-${snap}), the mouse on the row ${rest} ms before the release (under the 400 ms rest, so only a press draws), arriving from quiet through the warmed dialog, fresh browser per run, ${runs} runs, median (min to max).`,
  '',
  'wait = what the visitor sees from letting go of the button: late + still. late = how long the click itself waited on a busy main thread (a press copy parses and lays out its page in one block, so the click queues behind it, as a real release would). still = the longest time the screen showed nothing new from the click to `finished` + 100 ms: max(first frame after the click, longest screencast gap), as the freeze tables read it. Nothing on screen moves during late either (the copy is at opacity 0.001), so the two add. press = how long before the release the press really went down (should match the column). Copies after the click: runs in which a copy went up at or after the click (must be 0).',
  '',
];
const problems = [];
const load = async (v, viewport, scheme) => {
  const file = join(OUT, `press-${v === 'nopress' ? 'none' : v.slice(6)}-${viewport}-${scheme}.runs.json`);
  return existsSync(file) ? JSON.parse(await readFile(file, 'utf8')) : null;
};
const head = (f) => [`| school | ${variants.map(f).join(' | ')} |`, `|---|${variants.map(() => '---|').join('')}`];
const colName = (v) => (v === 'nopress' ? 'no press (dropped)' : `press ${v.slice(6)} ms before release`);
for (const viewport of viewports) for (const scheme of schemes) {
  const rows = { wait: [], still: [], press: [] };
  for (const school of SCHOOLS.split(',')) {
    const cols = { wait: [], still: [], press: [] };
    for (const v of variants) {
      const data = await load(v, viewport, scheme);
      if (!data) { for (const k in cols) cols[k].push('n/a'); continue; }
      const rs = data.results.filter((r) => r.id === school && r.condition === 'hover');
      for (const x of data.problems ?? []) if (x.startsWith(school)) problems.push(`${viewport} ${scheme} ${v}: ${x}`);
      const still = (r) => Math.max(r.firstFrameMs ?? 0, r.screencastGap?.ms ?? 0);
      const after = rs.filter((r) => (r.restInfo?.copies ?? []).some((c) => c.up >= 0)).length;
      const withCopy = rs.filter((r) => (r.restInfo?.copies ?? []).some((c) => c.up < 0)).length;
      if (after) problems.push(`${viewport} ${scheme} ${v} ${school}: a copy went up after the click in ${after} of ${rs.length} runs`);
      if (v === 'nopress' && withCopy) problems.push(`${viewport} ${scheme} ${v} ${school}: a copy was drawn before the click in ${withCopy} runs`);
      if (v !== 'nopress' && withCopy !== rs.length) problems.push(`${viewport} ${scheme} ${v} ${school}: the press drew a copy in only ${withCopy} of ${rs.length} runs`);
      cols.wait.push(cell(rs.map((r) => still(r) + (r.restInfo?.late ?? 0))));
      cols.still.push(`${cell(rs.map(still))} / ${cell(rs.map((r) => r.restInfo?.late))}`);
      // pressAt is from the click as it really ran; the release was due `late` earlier.
      cols.press.push(v === 'nopress' ? '' : cell(rs.map((r) => (r.restInfo?.pressAt == null ? null : -r.restInfo.pressAt - (r.restInfo.late ?? 0)))));
    }
    for (const k in rows) rows[k].push(`| ${school} | ${cols[k].join(' | ')} |`);
  }
  md.push(`## ${viewport} ${scheme}`, '', 'wait from the release (late + still), ms:', '', ...head(colName), ...rows.wait, '');
  md.push('still / late, ms:', '', ...head(colName), ...rows.still, '');
  md.push('press before the release, measured, ms:', '', ...head(colName), ...rows.press, '');
}
md.push('## Problems', '', ...(problems.length ? problems.map((p) => `- ${p}`) : ['none']), '');
await mkdir(OUT, { recursive: true });
await writeFile(join(OUT, 'tables.md'), md.join('\n'));
console.log(md.join('\n'));
