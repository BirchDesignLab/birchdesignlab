/**
 * The build lock every script that writes dist/ takes first
 * (scripts/themes/.out/.render-lock), so authors building at once queue
 * instead of corrupting each other's dist/ and .astro/.
 *
 * Moved out of render.mjs 09-23-26 for Tier 3 stage 2, so snap.mjs queues on
 * the very same lock. The lock is a directory (mkdir is atomic) holding
 * owner.json; a lock older than 15 minutes is taken to be abandoned and
 * broken.
 *
 *   await acquireLock('vaporwave');   // waits its turn
 *   try { ...build... } finally { releaseLock(); }
 *
 * `who` names the holder in owner.json (render.mjs passes the school, snap.mjs
 * `snap:<name>`); `tag` prefixes the waiting and stale-lock messages.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '.out');
export const LOCK = join(OUT, '.render-lock');
const STALE_MS = 15 * 60 * 1000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function acquireLock(who, tag = 'render') {
  mkdirSync(OUT, { recursive: true });
  let waited = 0;
  for (;;) {
    try {
      mkdirSync(LOCK);
      writeFileSync(join(LOCK, 'owner.json'), JSON.stringify({ theme: who, pid: process.pid, at: Date.now() }));
      return;
    } catch {
      let owner = null;
      try {
        owner = JSON.parse(readFileSync(join(LOCK, 'owner.json'), 'utf8'));
      } catch {}
      if (owner && Date.now() - owner.at > STALE_MS) {
        console.log(`${tag}: breaking a stale lock held by ${owner.theme} (pid ${owner.pid})`);
        rmSync(LOCK, { recursive: true, force: true });
        continue;
      }
      if (waited % 30000 === 0) console.log(`${tag}: waiting for the build lock (held by ${owner?.theme ?? 'someone'})...`);
      await sleep(3000);
      waited += 3000;
    }
  }
}

export function releaseLock() {
  rmSync(LOCK, { recursive: true, force: true });
}
