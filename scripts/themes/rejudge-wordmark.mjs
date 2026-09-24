/**
 * Judge a label folder's wordmark strips again from the sample files already
 * beside them, without filming: every `<strip>.wordmark.json` motion.mjs
 * wrote is run through lib/wordmark-judge.mjs as it stands, and the verdicts
 * in the sample file and in the folder's manifest.json are replaced.
 *
 * Written 09-23-26 for Tier 3 stage 2 (tooling hardening before the sweep),
 * so the blank (founder decision b at the P5 checkpoint) could be measured on
 * the P5 films already on disk, and so a change to the judge never needs a
 * re-film to reach old strips.
 *
 * Usage:
 *   node scripts/themes/rejudge-wordmark.mjs --label stage2-p5-proof [--label stage2-p5-head]
 *
 * Per strip it replaces wordmarkOverlap or wordmarkBlink, and adds
 * wordmarkBlank (arrivals) and wordmarkDrawn, then swaps the strip's old
 * wordmark problems for the new ones; every other field and problem stays.
 * The top-level problems list is rebuilt the way motion.mjs merges it. The
 * sheet's title band is not redrawn (it needs the frames), so a re-judged
 * PNG still shows the verdict it was filmed with; the manifest is the record.
 * Samples filmed before the sampler recorded clip-path, transform, visibility,
 * filter and blend per sample are judged on the blend the browser resolved
 * once (manifest `judge.resolved.new.css.mixBlendMode`), and their
 * wordmarkDrawn says `checked: false`.
 *
 * Prints one line per strip and a blank table for the arrivals. Exits 2 when
 * any strip has a wordmark problem.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { judgeStripWordmark, describeWordmark, isWordmarkProblem } from './lib/wordmark-judge.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const labels = process.argv.flatMap((a, i, all) => (all[i - 1] === '--label' ? [a] : []));
if (!labels.length) {
  console.error('usage: node scripts/themes/rejudge-wordmark.mjs --label <folder under scripts/themes/.out> [--label ...]');
  process.exit(1);
}

const VERDICT_KEYS = ['wordmarkOverlap', 'wordmarkBlink', 'wordmarkBlank', 'wordmarkDrawn'];
let bad = 0;
for (const label of labels) {
  const dir = join(HERE, '.out', label);
  let manifest;
  try {
    manifest = JSON.parse(await readFile(join(dir, 'manifest.json'), 'utf8'));
  } catch (e) {
    console.error(`${label}: no manifest.json (${e.message})`);
    process.exitCode = 1;
    continue;
  }
  const oldOwned = new Set((manifest.made ?? []).flatMap((m) => m.problems ?? []));
  const unowned = (manifest.problems ?? []).filter((p) => !oldOwned.has(p));
  const blanks = [];
  let judgedCount = 0;
  for (const m of manifest.made ?? []) {
    if (!m.samplesFile) continue;
    const path = join(dir, m.samplesFile);
    let file;
    try {
      file = JSON.parse(await readFile(path, 'utf8'));
    } catch (e) {
      const msg = `${label}/${m.samplesFile}: sample file unreadable (${e.message})`;
      console.log(msg);
      bad++;
      continue;
    }
    const where = file.where;
    const got = { ...file.judge, ok: !!file.judge?.ok };
    const judged = judgeStripWordmark({ got, samples: file.samples, boxes: file.boxes, scenario: m.scenario, where });
    for (const k of VERDICT_KEYS) {
      delete m[k];
      delete file[k];
    }
    Object.assign(m, judged.fields, { rejudgedAt: new Date().toISOString() });
    m.problems = [...(m.problems ?? []).filter((p) => !isWordmarkProblem(p, where)), ...judged.problems];
    // Verdicts ahead of the samples, as motion.mjs writes them.
    const { samples, ...head } = file;
    await writeFile(path, JSON.stringify({ ...head, ...judged.fields, samples }, null, 1));
    judgedCount++;
    if (judged.problems.length) bad++;
    if (judged.blank) blanks.push({ where, ...judged.blank });
    console.log(`${m.file}  ${describeWordmark(judged, file.judge)}`);
  }
  manifest.problems = [...new Set([...unowned, ...(manifest.made ?? []).flatMap((m) => m.problems ?? [])])];
  await writeFile(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`${label}: re-judged ${judgedCount} strips`);
  if (blanks.length) {
    console.log(`${label}: blank per arrival (both under 0.10; limit 80 ms)`);
    for (const b of blanks.sort((x, y) => (y.ms ?? Infinity) - (x.ms ?? Infinity))) {
      console.log(`  ${b.unsampled ? 'UNSAMPLED' : b.pass ? 'pass' : 'FAIL'}  ${b.unsampled ? `(${b.reason})` : `${String(b.ms).padStart(6)} ms  ${b.ms ? `+${b.start} to +${b.end}` : '(never blank)'}`}  ${b.where}`);
    }
  }
}
if (bad) {
  console.log(`${bad} strip(s) with wordmark problems`);
  process.exitCode = 2;
}
