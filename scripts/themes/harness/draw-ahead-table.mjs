/**
 * Tables for the drawing-ahead section of the freeze investigation, from
 * trace-arrival.mjs runs files.
 *
 * Written 09-23-26 for Tier 3 stage 2 (agent D,
 * tier3-stage2/freeze-investigation.md). The screencast gap trace-arrival
 * reports (motion.mjs's dense.maxGapMs) is measured between frames after the
 * trigger, so it cannot see a hold that starts at the click: a pick that
 * lands while a copy is being drawn shows its first frame late, not a long
 * gap. This reads each run and reports, per school and condition, the
 * median (min to max) of:
 *   still  the longest time the screen showed nothing new from the click to
 *          `finished` + 100 ms: the larger of the first filmed frame after
 *          the click and the longest gap between frames;
 *   gap    the screencast gap alone (as agent M's tables);
 *   first  the first visible change (trace-arrival's pixel rule);
 *   done   `finished`.
 *
 * Usage:
 *   node scripts/themes/harness/draw-ahead-table.mjs <label>/<tag> [<label>/<tag> ...]
 *   e.g. freeze-d2/hover300-desktop-dark freeze-d0/hover300-desktop-dark
 */
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '.out');
const med = (xs) => {
  const v = xs.filter((x) => typeof x === 'number' && Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return 'n/a';
  const m = v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
  return `${Math.round(m)} (${Math.round(v[0])} to ${Math.round(v[v.length - 1])})`;
};

for (const set of process.argv.slice(2)) {
  const { results } = JSON.parse(await readFile(join(OUT, `${set}.runs.json`), 'utf8'));
  console.log(`\n${set}\n| school | trip | condition | runs | still | gap | first | done |\n|---|---|---|---|---|---|---|---|`);
  const keys = [...new Set(results.map((r) => `${r.id}|${r.dir}|${r.condition}`))];
  for (const k of keys) {
    const rs = results.filter((r) => `${r.id}|${r.dir}|${r.condition}` === k);
    const still = rs.map((r) => Math.max(r.firstFrameMs ?? 0, r.screencastGap?.ms ?? 0));
    const [id, dir, condition] = k.split('|');
    console.log(`| ${id} | ${dir} | ${condition} | ${rs.length} | ${med(still)} | ${med(rs.map((r) => r.screencastGap?.ms))} | ${med(rs.map((r) => r.firstVisible))} | ${med(rs.map((r) => r.at?.['vt-finished']))} |`);
  }
}
