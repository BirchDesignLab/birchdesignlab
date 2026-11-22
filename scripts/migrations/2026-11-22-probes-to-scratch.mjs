/**
 * Move one-off agent probe scripts out of git into the gitignored
 * scripts/scratch/ folder (still on disk, still in the repo folder).
 *
 * Why (founder, 11-22-26): workflow agents followed "scripts stay in the repo"
 * for every throwaway probe, so ~400 one-time crops, probes and verifies were
 * committed to a public repo (Stage 6 alone: 190 in scripts/themes/stage6/).
 * New rule: probes live in scripts/scratch/ (gitignored, in the repo folder,
 * never the system temp); only tools worth running again are committed.
 * Git history keeps the old copies; nothing is rewritten.
 *
 * Candidates (by name, conservative):
 *   - everything in scripts/themes/stage6/;
 *   - in scripts/themes/<school>/: task/round-prefixed names (b1-, b2-,
 *     b2fix-, b2r3-, t2-...), critic/recritic, probe-, verify-, film-, shoot-,
 *     founder-crops, zoom-, preview-, strip-sheet, scroll-viewport-capture;
 *     builders and generators (build-, render-, process-, paint-, gen-,
 *     make-, measure-, *-util, data .json/.html/.js) stay;
 *   - in scripts/lab/: BDL-013 exploration probes (probe-o*, shoot-o*,
 *     sheet-o*, count-o5b, crop-o5b).
 * A candidate STAYS if any tracked file outside the move set names it
 * (stage reports citing evidence, imports from kept scripts, package.json).
 *
 * Usage: node scripts/migrations/2026-11-22-probes-to-scratch.mjs [--apply]
 * Without --apply it prints the plan. With --apply it moves each file to
 * scripts/scratch/<path under scripts/>, untracks the old path, and writes the
 * moved list next to this script (committed, so the record survives).
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, renameSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, basename, posix } from 'node:path';

const REPO = join(import.meta.dirname, '..', '..');
const git = (...a) => execFileSync('git', a, { cwd: REPO, encoding: 'utf8', maxBuffer: 64 << 20 });
const tracked = git('ls-files').split('\n').filter(Boolean);

const SCHOOLS = ['vaporwave', 'grandmillennial', 'cottagecore', 'bauhaus', 'swiss', 'glassmorphism'];
const SCHOOL_ONE_OFF = /^(b\d|b2fix|b2r\d|t\d|w\d|critic|recritic|probe-|verify-|film-|shoot-|founder-crops|zoom-|preview-|strip-sheet|scroll-viewport-capture)/;
const LAB_ONE_OFF = /^(probe-o|shoot-o|sheet-o|count-o5b|crop-o5b)/;

const candidates = tracked.filter((p) => {
  const name = posix.basename(p);
  if (p.startsWith('scripts/themes/stage6/')) return true;
  const school = SCHOOLS.find((s) => p.startsWith(`scripts/themes/${s}/`));
  if (school) return /\.(mjs|cjs)$/.test(name) && SCHOOL_ONE_OFF.test(name);
  if (p.startsWith('scripts/lab/') && !p.includes('/lib/')) return LAB_ONE_OFF.test(name);
  return false;
});

// Keep a candidate any tracked non-candidate file names (fixpoint: a kept
// script's own references keep what it names too).
const set = new Set(candidates);
const textual = (p) => /\.(md|mjs|cjs|js|ts|astro|svelte|json|jsonc|css|html|txt|yml|yaml)$/.test(p) || p === '.gitignore';
let changed = true;
const keptBecause = new Map();
while (changed) {
  changed = false;
  const outside = tracked.filter((p) => !set.has(p) && textual(p));
  for (const c of [...set]) {
    const name = posix.basename(c);
    let hits = '';
    try { hits = git('grep', '-l', '-F', name, '--', ...outside.length ? ['.'] : []); } catch { hits = ''; }
    const refs = hits.split('\n').filter((f) => f && !set.has(f) && f !== c && textual(f) && !f.startsWith('scripts/migrations/'));
    if (refs.length) { set.delete(c); keptBecause.set(c, refs.slice(0, 3)); changed = true; }
  }
}
const move = [...set].sort();
const kept = [...keptBecause.keys()].sort();

console.log(`candidates ${candidates.length}, moving ${move.length}, kept because referenced ${kept.length}`);
for (const k of kept) console.log(`  keep ${k}  <- ${keptBecause.get(k).join(', ')}`);
const byDir = {};
for (const m of move) { const d = posix.dirname(m); byDir[d] = (byDir[d] ?? 0) + 1; }
for (const [d, n] of Object.entries(byDir)) console.log(`  move ${n.toString().padStart(3)}  ${d}/`);

if (!process.argv.includes('--apply')) { console.log('\ndry run: pass --apply to move'); process.exit(0); }

for (const m of move) {
  const dest = join(REPO, 'scripts', 'scratch', m.slice('scripts/'.length));
  mkdirSync(dirname(dest), { recursive: true });
  if (existsSync(dest)) throw new Error(`refusing to overwrite ${dest}`);
  renameSync(join(REPO, m), dest);
}
// Untrack in batches (the files are already gone from their old paths).
for (let i = 0; i < move.length; i += 100) git('rm', '--cached', '--quiet', '--', ...move.slice(i, i + 100));
writeFileSync(join(import.meta.dirname, `${basename(import.meta.filename, '.mjs')}.moved.txt`),
  `# Moved to scripts/scratch/<path under scripts/> on 2026-11-22 (gitignored). Git history keeps the originals.\n${move.join('\n')}\n`);
console.log(`\nmoved ${move.length} files to scripts/scratch/ and untracked them`);
