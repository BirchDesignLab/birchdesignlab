/**
 * Stage 3 wave B2 round 4: compare two gate timing runs (trace-arrival.mjs
 * summaries) school by school, so the founder's "glass arrives a little
 * later, re-measure after B2" call can be answered with numbers.
 *
 * Usage: node scripts/themes/harness/b2r4-timing-compare.mjs \
 *   [--before stage2-gates-timing] [--after stage3-gates-timing] [--metric firstVisible]
 * Output: prints a markdown table and writes it to
 *   scripts/themes/.out/<after>/compare-<before>-<metric>.md
 */
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out');
const arg = (n, f) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? f : process.argv[i + 1]; };
const before = arg('before', 'stage2-gates-timing');
const after = arg('after', 'stage3-gates-timing');
const metric = arg('metric', 'firstVisible');
const TAGS = ['desktop-dark', 'desktop-light', 'mobile-dark', 'mobile-light'];

// land90: when the new page is on screen, the first frame whose changed share
// is at least 90% of the last frame's (b2r5-glass-timing-ab.mjs's rule). It is
// not a summary column, so it is recomputed from each run's frame series.
// firstVisible alone can fire on the old page's fade-out (round-5 finding).
const median = (xs) => { const s = xs.filter((x) => x != null).sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };
async function loadLand90(dir, tag) {
  const f = join(OUT, dir, `${tag}.runs.json`);
  if (!existsSync(f)) return new Map();
  const runs = new Map();
  for (const r of JSON.parse(await readFile(f, 'utf8')).results) {
    const s = r.series || [];
    const fin = s.length ? s[s.length - 1][1] : 0;
    const land = s.find((p) => p[1] >= 0.9 * fin && fin > 0.05);
    const k = `${r.id}|${r.dir}|${r.condition}`;
    if (!runs.has(k)) runs.set(k, []);
    runs.get(k).push(land ? land[0] : null);
  }
  return new Map([...runs].map(([k, xs]) => [k, median(xs)]));
}

async function load(dir, tag) {
  if (metric === 'land90') return loadLand90(dir, tag);
  const f = join(OUT, dir, `${tag}.summary.json`);
  if (!existsSync(f)) return new Map();
  const j = JSON.parse(await readFile(f, 'utf8'));
  return new Map(j.summary.map((r) => [`${r.id}|${r.dir}|${r.condition}`, r[metric]?.median ?? null]));
}

const md = [`# ${metric} median, ${before} vs ${after} (ms, delta = after - before)`, ''];
for (const tag of TAGS) {
  const [b, a] = [await load(before, tag), await load(after, tag)];
  md.push(`## ${tag}`, '', '| school | trip | condition | before | after | delta |', '|---|---|---|---|---|---|');
  for (const [k, av] of a) {
    const bv = b.get(k);
    const [id, dir, cond] = k.split('|');
    const d = bv == null || av == null ? 'n/a' : `${av - bv > 0 ? '+' : ''}${Math.round(av - bv)}`;
    md.push(`| ${id} | ${dir} | ${cond} | ${bv == null ? 'n/a' : Math.round(bv)} | ${av == null ? 'n/a' : Math.round(av)} | ${d} |`);
  }
  md.push('');
}
const text = md.join('\n');
console.log(text);
await writeFile(join(OUT, after, `compare-${before}-${metric}.md`), text);
