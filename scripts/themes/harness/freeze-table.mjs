/**
 * Gather the freeze investigation's trace-arrival summaries into the tables
 * freeze-investigation.md reads, so the report's numbers come from the files
 * and not from hand copying.
 *
 * Written 09-23-26 for Tier 3 stage 2 (the freeze investigation,
 * tier3-stage2/freeze-investigation.md). Reads every <tag>.summary.json
 * under scripts/themes/.out/<label>/ whose tag starts with --prefix, and
 * every <tag>.traces.json, and prints Markdown:
 *   - per trip, viewport and scheme, one row per condition: the longest
 *     screencast gap, the longest rAF gap, first visible, ready, finished
 *     (median, min to max);
 *   - per trace: the longest presented-frame gap, where it sits, Skia's
 *     shader compiles inside it, and the busiest thread's top work.
 *
 * --compact prints the report's summary tables instead (cold by viewport and
 * scheme; each condition's longest gap; the in-school swap).
 *
 * Usage:
 *   node scripts/themes/harness/freeze-table.mjs [--label freeze-base] [--prefix base-] [--traces traces-]
 *   node scripts/themes/harness/freeze-table.mjs --compact
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const label = arg('label', 'freeze-base');
const prefix = arg('prefix', 'base-');
const tracePrefix = arg('traces', 'traces-');
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', '.out', label);
const files = await readdir(dir);

const cell = (s) => (s ? `${Math.round(s.median)} (${Math.round(s.min)} to ${Math.round(s.max)})` : 'n/a');
const ORDER = ['cold', 'warm', 'switcher-warm', 'pf-render', 'pf-raster'];
const out = [];

// --compact: the report's two summary tables instead of the per-batch ones.
// (1) cold, per destination and viewport/scheme: gap, first visible, ready,
// finished; (2) the longest screencast gap per condition, with pf-raster
// taken from the raster3-* batches (the copy wears the runtime's carry-over).
if (process.argv.includes('--compact')) {
  const load = async (tag) => {
    try { return JSON.parse(await readFile(join(dir, `${tag}.summary.json`), 'utf8')).summary; } catch { return null; }
  };
  const med = (s) => (s ? Math.round(s.median) : 'n/a');
  const rng = (s) => (s ? `${Math.round(s.median)} (${Math.round(s.min)} to ${Math.round(s.max)})` : 'n/a');
  const combos = ['desktop-dark', 'desktop-light', 'mobile-dark', 'mobile-light'];
  const trips = [...['grandmillennial', 'cottagecore', 'vaporwave', 'glassmorphism', 'bauhaus', 'swiss'].map((id) => [id, 'arrive']), ['vaporwave', 'return']];
  const name = (id, dir) => (dir === 'return' ? 'quiet (from vaporwave)' : id);
  const lines = ['#### Cold arrival, fresh browser: longest screencast gap (median, min to max), then first visible / ready / finished medians', ''];
  lines.push(`| destination | ${combos.join(' | ')} |`, `|---|${combos.map(() => '---|').join('')}`);
  const base = {};
  for (const c of combos) base[c] = await load(`base-${c}`);
  for (const [id, dir] of trips) {
    const cells = combos.map((c) => {
      const r = base[c]?.find((x) => x.id === id && x.dir === dir && x.condition === 'cold');
      return r ? `${rng(r.screencastGap)}; ${med(r.firstVisible)} / ${med(r.ready)} / ${med(r.finished)}` : 'n/a';
    });
    lines.push(`| ${name(id, dir)} | ${cells.join(' | ')} |`);
  }
  for (const c of combos) {
    const raster2 = await load(`raster3-${c}`);
    lines.push('', `#### Longest screencast gap by condition, ${c} (median, min to max)`, '');
    lines.push('| destination | cold | warm | switcher-warm | pf-render | pf-raster |', '|---|---|---|---|---|---|');
    for (const [id, dir] of trips) {
      const get = (cond) => {
        const src = cond === 'pf-raster' && raster2?.some((x) => x.id === id && x.dir === dir) ? raster2 : base[c];
        return rng(src?.find((x) => x.id === id && x.dir === dir && x.condition === cond)?.screencastGap);
      };
      lines.push(`| ${name(id, dir)} | ${['cold', 'warm', 'switcher-warm', 'pf-render', 'pf-raster'].map(get).join(' | ')} |`);
    }
  }
  lines.push('', '#### In-school swap, Home to About (longest screencast gap, median, min to max)', '');
  lines.push(`| school | ${combos.map((c) => `${c} cold | ${c} warm | ${c} pf-raster`).join(' | ')} |`, `|---|${combos.map(() => '---|---|---|').join('')}`);
  const pages = {};
  for (const c of combos) pages[c] = { base: await load(`pages-${c}`), r2: await load(`raster3-pages-${c}`) };
  for (const id of ['grandmillennial', 'cottagecore', 'vaporwave', 'glassmorphism']) {
    const cells = combos.flatMap((c) => ['cold', 'warm', 'pf-raster'].map((cond) => {
      const src = cond === 'pf-raster' && pages[c].r2 ? pages[c].r2 : pages[c].base;
      return rng(src?.find((x) => x.id === id && x.dir === 'page' && x.condition === cond)?.screencastGap);
    }));
    lines.push(`| ${id} | ${cells.join(' | ')} |`);
  }
  console.log(lines.join('\n'));
  process.exit(0);
}

const sums = files.filter((f) => f.startsWith(prefix) && f.endsWith('.summary.json')).sort();
for (const f of sums) {
  const { meta, summary } = JSON.parse(await readFile(join(dir, f), 'utf8'));
  out.push(`### ${f.replace('.summary.json', '')} (${meta.viewport}, ${meta.scheme}, ${meta.runs} runs${meta.freshBrowser ? ', fresh browser per run' : ''}${meta.stubs?.length ? `, stubs ${meta.stubs.join('+')}` : ''})`, '');
  out.push('| trip | condition | screencast gap | rAF gap | first visible | ready | finished |', '|---|---|---|---|---|---|---|');
  const rows = summary.slice().sort((a, b) => (a.id + a.dir).localeCompare(b.id + b.dir) || ORDER.indexOf(a.condition) - ORDER.indexOf(b.condition));
  for (const r of rows) {
    const trip = r.dir === 'arrive' ? r.id : r.dir === 'return' ? `quiet (from ${r.id})` : `${r.id} Home to About`;
    out.push(`| ${trip} | ${r.condition} | ${cell(r.screencastGap)} | ${cell(r.rafGap)} | ${cell(r.firstVisible)} | ${cell(r.ready)} | ${cell(r.finished)} |`);
  }
  out.push('');
}

const traces = files.filter((f) => f.startsWith(tracePrefix) && f.endsWith('.traces.json')).sort();
for (const f of traces) {
  const list = JSON.parse(await readFile(join(dir, f), 'utf8'));
  out.push(`### ${f.replace('.traces.json', '')}`, '');
  out.push('| trace | screencast gap | presented gap (at) | long presented gaps | shader compiles in gap | GPU busy in gap | main busy in gap | new-state render (main) |', '|---|---|---|---|---|---|---|---|');
  for (const t of list) {
    const p = t.presented || {};
    const g = p.maxGap;
    const nr = (t.windows || []).find((w) => w.from === 'vt-update-end');
    out.push(`| ${t.file.split(/[\\/]/).pop().replace('.json', '')} | ${t.run.phases.screencastGap ?? 'n/a'} | ${g ? `${g.ms} (+${g.from} to +${g.to})` : 'n/a'} | ${(p.longGaps || []).map((x) => `${x.ms}@${Math.round(x.from)}`).join(', ')} | ${p.shaderCompiles?.inMaxGap ? `${p.shaderCompiles.inMaxGap.count} (${p.shaderCompiles.inMaxGap.ms} ms)` : 'n/a'} | ${p.freeze?.['gpu process']?.busy ?? 0} | ${p.freeze?.main?.busy ?? 0} | ${nr ? `${nr.ms} ms, main ${nr.threads.main?.busy ?? 0}` : 'n/a'} |`);
  }
  out.push('');
}
console.log(out.join('\n'));
