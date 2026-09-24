/**
 * Tune how long a mouse must rest on a switcher row before its page is drawn
 * ahead (runtime.ts DRAW_DWELL_MS), from measurements, one batch after
 * another so nothing competes with a timing run.
 *
 * Written 09-24-26 for the Tier 3 stage 2 wrap-up. The freeze investigation
 * shipped a 100 ms rest (tier3-stage2/freeze-investigation.md, "Fixer"),
 * which draws every school when the pointer moves down the dialog at a
 * reading pace. The founder's revised call (tier3-briefs/stage0-decisions.md,
 * "Call 1 revised"): keep drawing ahead on a resting mouse, with a longer
 * rest, so browsing at a reading pace draws nothing; a press still draws.
 * Each candidate rest is its own frozen build, snap-rest-<ms> (built by
 * snap.mjs with DRAW_DWELL_MS set to <ms>), served by snap.mjs on --port.
 *
 * Phases (--phases, default browse,click):
 *   browse  draw-ahead-browse.mjs per candidate: the mouse down the rows at
 *           --paces ms a row, then off them (copies drawn, longest
 *           animation-frame gap), and drift (the copy one rest after the
 *           arrival, however the pointer wanders on the row); desktop dark,
 *           from quiet, fresh browser per run;
 *   click   trace-arrival.mjs --conditions hover --rest-before-click <ms>
 *           per candidate and rest-before-click (--clicks), the four heavy
 *           schools and bauhaus arriving from quiet, desktop, --schemes,
 *           fresh browser per run;
 *   base    the same click runs, once, on a snapshot with no drawing ahead
 *           at all (--base-snap, default freeze-d0, HEAD before drawing
 *           ahead), at a 600 ms rest-before-click: the hold without it;
 *   table   (no browser) the tables below from what the other phases wrote.
 *
 * Usage:
 *   node scripts/themes/snap.mjs --name rest-400        # after setting DRAW_DWELL_MS
 *   BDL_GPU=1 node scripts/themes/harness/draw-ahead-rest.mjs --rests 100,200,300,400,500 \
 *     [--phases browse,base,click,table] [--base-snap freeze-d0] [--paces 150,250,300,350,500] [--clicks 400,600,1000] \
 *     [--schemes dark,light] [--runs 5] [--port 4640] [--label rest-wrapup]
 * Output: scripts/themes/.out/<label>/ (browse-rest-<ms>-desktop-dark.json,
 * click-rest-<ms>-<click>-<scheme>.runs.json, tables.md).
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
const rests = list('rests', '100,200,300,400,500');
const phases = list('phases', 'browse,click');
const paces = arg('paces', '150,250,300,350,500');
const clicks = list('clicks', '400,600,1000');
const schemes = list('schemes', 'dark,light');
const runs = arg('runs', '5');
const port = arg('port', '4640');
const label = arg('label', 'rest-wrapup');
const OUT = join(OUT_ROOT, label);
const SCHOOLS = 'grandmillennial,glassmorphism,cottagecore,vaporwave,bauhaus';

const baseSnap = arg('base-snap', 'freeze-d0');

function served(rest, cmd, snap = `rest-${rest}`) {
  console.log(`\n=== snap-${snap}: ${cmd.slice(1).join(' ')}`);
  const r = spawnSync(process.execPath, [SNAP, '--name', snap, '--reuse', '--port', port, '--', ...cmd], { stdio: 'inherit', env: process.env });
  if (r.status) console.log(`(exit ${r.status})`);
}

for (const scheme of phases.includes('base') ? schemes : []) {
  served(null, ['node', join(HERE, '..', 'trace-arrival.mjs'), '--schools', SCHOOLS, '--conditions', 'hover', '--rest-before-click', '600',
    '--fresh-browser', '--runs', runs, '--viewport', 'desktop', '--scheme', scheme, '--label', label, '--tag', `click-base-${scheme}`], baseSnap);
}
for (const phase of phases.filter((p) => p !== 'table' && p !== 'base')) {
  for (const rest of rests) {
    if (phase === 'browse') {
      served(rest, ['node', join(HERE, 'draw-ahead-browse.mjs'), '--modes', 'mouse,drift', '--paces', paces, '--runs', runs,
        '--viewport', 'desktop', '--scheme', 'dark', '--label', label, '--tag', `browse-rest-${rest}`]);
    } else if (phase === 'click') {
      for (const scheme of schemes) for (const click of clicks) {
        served(rest, ['node', join(HERE, '..', 'trace-arrival.mjs'), '--schools', SCHOOLS, '--conditions', 'hover', '--rest-before-click', click,
          '--fresh-browser', '--runs', runs, '--viewport', 'desktop', '--scheme', scheme, '--label', label, '--tag', `click-rest-${rest}-${click}-${scheme}`]);
      }
    } else throw new Error(`unknown phase ${phase}`);
  }
}

if (!phases.includes('table')) process.exit(0);

// ---------------------------------------------------------------- tables
const sorted = (xs) => xs.filter((x) => typeof x === 'number' && Number.isFinite(x)).sort((a, b) => a - b);
const median = (xs) => { const v = sorted(xs); return v.length ? (v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2) : null; };
const cell = (xs) => { const v = sorted(xs); return v.length ? `${Math.round(median(v))} (${Math.round(v[0])} to ${Math.round(v[v.length - 1])})` : 'n/a'; };
const md = [];

md.push('## Browsing: copies drawn, mouse down the rows then off them (desktop dark, from quiet)', '');
md.push(`| rest | ${paces.split(',').map((p) => `${p} ms a row`).join(' | ')} | drift: copy up after arrival |`);
md.push(`|---|${paces.split(',').map(() => '---|').join('')}---|`);
const gapRows = [];
for (const rest of rests) {
  const file = join(OUT, `browse-rest-${rest}-desktop-dark.json`);
  if (!existsSync(file)) continue;
  const { all } = JSON.parse(await readFile(file, 'utf8'));
  const cols = paces.split(',').map(Number).map((p) => {
    const rs = all.filter((r) => r.mode === 'mouse' && r.pace === p);
    return rs.length ? cell(rs.map((r) => r.copies.length)) : 'n/a';
  });
  const drift = all.filter((r) => r.mode === 'drift');
  md.push(`| ${rest} | ${cols.join(' | ')} | ${cell(drift.map((r) => r.copies[0]?.up))} |`);
  gapRows.push(`| ${rest} | ${paces.split(',').map(Number).map((p) => cell(all.filter((r) => r.mode === 'mouse' && r.pace === p).map((r) => r.maxGap))).join(' | ')} |`);
}
md.push('', 'Longest animation-frame gap while browsing (ms):', '', `| rest | ${paces.split(',').map((p) => `${p} ms a row`).join(' | ')} |`, `|---|${paces.split(',').map(() => '---|').join('')}`, ...gapRows);

for (const scheme of schemes) {
  md.push('', `## Before a click: still (ms), desktop ${scheme}, by rest and rest-before-click`, '');
  md.push('still = the longest time the screen showed nothing new from the click to `finished` + 100 ms (draw-ahead-table.mjs); late = how long the click itself waited on a busy main thread; lead = how long the copy had been up at the click (a copy is up about 300 ms for bauhaus, 400 for vaporwave and 470 to 590 for the other three, 3 frames and 100 ms past its first frame included; "press" = no copy before the click, the press started one at the click).', '');
  md.push(`| school | rest | ${clicks.map((c) => `${c} ms: still / late / lead`).join(' | ')} |`);
  md.push(`|---|---|${clicks.map(() => '---|').join('')}`);
  for (const school of SCHOOLS.split(',')) {
    const baseFile = join(OUT, `click-base-${scheme}.runs.json`);
    if (existsSync(baseFile)) {
      const rs = JSON.parse(await readFile(baseFile, 'utf8')).results.filter((r) => r.id === school && r.condition === 'hover');
      md.push(`| ${school} | none (${baseSnap}) | ${cell(rs.map((r) => Math.max(r.firstFrameMs ?? 0, r.screencastGap?.ms ?? 0)))} at 600, the same at any rest |${clicks.slice(1).map(() => ' |').join('')}`);
    }
    for (const rest of rests) {
      const cols = [];
      for (const click of clicks) {
        const file = join(OUT, `click-rest-${rest}-${click}-${scheme}.runs.json`);
        if (!existsSync(file)) { cols.push('n/a'); continue; }
        const { results } = JSON.parse(await readFile(file, 'utf8'));
        const rs = results.filter((r) => r.id === school && r.condition === 'hover');
        const still = rs.map((r) => Math.max(r.firstFrameMs ?? 0, r.screencastGap?.ms ?? 0));
        const late = rs.map((r) => r.restInfo?.late);
        const leads = rs.map((r) => r.restInfo?.copies?.find((c) => c.up < 0)?.up).filter((x) => x != null).map((x) => -x);
        const lead = leads.length === rs.length ? cell(leads) : leads.length ? `${cell(leads)}, press in ${rs.length - leads.length}` : 'press';
        cols.push(`${cell(still)} / ${cell(late)} / ${lead}`);
      }
      md.push(`| ${school} | ${rest} | ${cols.join(' | ')} |`);
    }
  }
}
await mkdir(OUT, { recursive: true });
await writeFile(join(OUT, 'tables.md'), md.join('\n') + '\n');
console.log(md.join('\n'));
