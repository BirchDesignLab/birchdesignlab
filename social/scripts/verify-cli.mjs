/**
 * `npm run verify` — probe every mp4 in out/ and write out/report.md.
 *
 * Duration targets come from manifest.json, so a file that encoded cleanly but
 * ran short against what the calendar asked for still fails.
 */
import { readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { verifyAll } from '../lib/verify.mjs';
import { flatten, readManifest } from './manifest.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SOCIAL_DIR = path.resolve(HERE, '..');
const OUT_DIR = path.join(SOCIAL_DIR, 'out');

if (!existsSync(OUT_DIR)) {
  console.error(`nothing to verify: ${path.relative(SOCIAL_DIR, OUT_DIR)} does not exist yet.`);
  console.error('run `npm run loops` first.');
  process.exit(1);
}

const files = (await readdir(OUT_DIR))
  .filter((f) => f.endsWith('.mp4'))
  .sort()
  .map((f) => path.join(OUT_DIR, f));

if (files.length === 0) {
  console.error(`no .mp4 files in ${path.relative(SOCIAL_DIR, OUT_DIR)}.`);
  process.exit(1);
}

// Per-file expectations, keyed by basename.
const rows = flatten(await readManifest());
const byId = new Map(rows.map((r) => [r.id, r]));
const specs = {};
for (const file of files) {
  const base = path.basename(file);
  const id = base.replace(/-(SQ|PT|VT|OG)\.mp4$/, '');
  const row = byId.get(id);
  specs[base] = {
    expectSeconds: row?.duration_s ?? undefined,
    loop: row?.kind !== 'slideshow-reel', // reels play once, they do not wrap
  };
}

const { results, reportPath, pass } = await verifyAll(files, { outDir: OUT_DIR, specs });

for (const r of results) {
  const failed = r.checks.filter((c) => !c.pass);
  console.log(`${r.pass ? 'pass' : 'FAIL'}  ${path.basename(r.file)}`);
  for (const c of failed) console.log(`        ${c.name}: ${c.detail}`);
}

console.log(`\nreport: ${path.relative(SOCIAL_DIR, reportPath)}`);
process.exit(pass ? 0 : 1);
