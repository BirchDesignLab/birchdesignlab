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

async function load(dir, tag) {
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
