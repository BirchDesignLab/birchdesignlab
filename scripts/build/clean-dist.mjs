/**
 * Empty dist/ before every build, and fail loudly if anything survives.
 *
 * Written 09-22-26. Astro 7 empties the output directory itself, but its
 * emptyDir() returns early on the first ENOENT and swallows a failed Windows
 * EPERM retry, so a build can finish "successfully" on top of pages that no
 * longer exist in the source. That happened during the theme-schools build: a
 * deleted school's pages survived three builds in dist/, and the built-site
 * tests read them as real. Stale pages must never reach a deploy or a test.
 *
 * Empties the directory rather than removing it: a running preview server
 * holds dist/ itself open, and Windows will not delete an open directory
 * (the likely trigger for Astro's silent failure). Its contents can go.
 * Retries briefly per entry, then exits non-zero naming what it could not
 * remove.
 */
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'dist');

if (existsSync(DIST)) {
  const failed = [];
  for (const entry of readdirSync(DIST)) {
    const path = join(DIST, entry);
    try {
      rmSync(path, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
    } catch (err) {
      failed.push(`${entry}: ${err.code ?? err.message}`);
    }
  }
  const left = readdirSync(DIST);
  if (failed.length || left.length) {
    console.error(`clean-dist: could not empty ${DIST}`);
    for (const f of failed) console.error(`  ${f}`);
    if (!failed.length) console.error(`  still present: ${left.join(', ')}`);
    console.error('clean-dist: something is holding files in dist/ open; stop it and build again.');
    process.exit(1);
  }
}
