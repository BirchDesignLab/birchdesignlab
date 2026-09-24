/**
 * One contender for the render lock: take it, hold it two seconds, log in
 * and out, release it (twice, which must be harmless).
 *
 * Written 09-23-26 for Tier 3 stage 2, when three school builders began
 * sharing scripts/themes/lib/render-lock.mjs through snap.mjs and render.mjs.
 * Run several at once and read the log: the in/out spans must never overlap,
 * and a lock planted by a dead pid must be broken by exactly one of them.
 *
 * Usage (bash):
 *   export LOG=scripts/themes/.out/lock-race.log; rm -f "$LOG"
 *   for w in A B C; do node scripts/themes/harness/lock-race.mjs $w & done; wait
 *   cat "$LOG"
 */
import { acquireLock, releaseLock } from '../lib/render-lock.mjs';
import { appendFileSync } from 'node:fs';

const who = process.argv[2];
if (!who || !process.env.LOG) {
  console.error('usage: LOG=<file> node scripts/themes/harness/lock-race.mjs <name>');
  process.exit(1);
}
await acquireLock(who, who);
appendFileSync(process.env.LOG, `${who} in ${Date.now()}\n`);
await new Promise((r) => setTimeout(r, 2000));
appendFileSync(process.env.LOG, `${who} out ${Date.now()}\n`);
releaseLock();
releaseLock();
