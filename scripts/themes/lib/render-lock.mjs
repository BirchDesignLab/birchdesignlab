/**
 * The build lock every script that writes dist/ takes first
 * (scripts/themes/.out/.render-lock), so authors building at once queue
 * instead of corrupting each other's dist/ and .astro/.
 *
 * Moved out of render.mjs 09-23-26 for Tier 3 stage 2, so snap.mjs queues on
 * the very same lock. The lock is a directory (mkdir is atomic) holding
 * owner.json: who holds it, their pid, when they took it, a heartbeat the
 * holder refreshes every minute while its event loop runs, and a token
 * unique to this acquisition.
 *
 * Hardened 09-23-26 before three builders share it (the P5 critic's
 * follow-up):
 *   - a lock is broken only when its owner is gone (process.kill(pid, 0)
 *     throws ESRCH) or its heartbeat is older than the stale limit (15
 *     minutes; a holder blocked in a synchronous build cannot beat, so the
 *     limit sits well past a build). A lock whose owner.json is missing or
 *     unreadable for more than a minute (its owner died between mkdir and
 *     writing it) counts as ownerless and is broken too;
 *   - it is broken by renaming the directory to a unique name first, which
 *     only one waiter can do, and then checking the renamed owner.json is
 *     the one judged dead: a waiter that raced and renamed a fresh lock
 *     instead puts it back;
 *   - releaseLock() removes the lock only when owner.json carries this
 *     acquisition's token, so a late release never frees another builder's
 *     lock.
 * Left: Windows reuses pids, so a dead owner whose pid was reused looks alive
 * and is waited out to the stale limit; and a three-way race (a waiter
 * renaming a fresh lock while a third builder takes the empty name) cannot
 * put the fresh lock back and says so.
 *
 *   await acquireLock('vaporwave');   // waits its turn
 *   try { ...build... } finally { releaseLock(); }
 *
 * `who` names the holder in owner.json (render.mjs passes the school, snap.mjs
 * `snap:<name>`); `tag` prefixes the waiting and stale-lock messages.
 */
import { mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '.out');
export const LOCK = join(OUT, '.render-lock');
const STALE_MS = 15 * 60 * 1000;
const OWNERLESS_MS = 60 * 1000;
const BEAT_MS = 60 * 1000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** This process's hold: its token and heartbeat timer. */
let held = null;

function readOwner(dir = LOCK) {
  try {
    return JSON.parse(readFileSync(join(dir, 'owner.json'), 'utf8'));
  } catch {
    return null;
  }
}

/** Is `pid` a running process? ESRCH is the only proof it is not; EPERM
    means it runs under someone else. */
export function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code !== 'ESRCH';
  }
}

/** Why this lock may be broken, or null while it is held. */
function breakable(owner) {
  if (!owner) {
    let age = 0;
    try {
      age = Date.now() - statSync(LOCK).mtimeMs;
    } catch {
      return null; // gone already
    }
    return age > OWNERLESS_MS ? `no owner.json for ${Math.round(age / 1000)} s` : null;
  }
  if (!pidAlive(owner.pid)) return `its owner (pid ${owner.pid}) is gone`;
  const age = Date.now() - (owner.beat ?? owner.at ?? 0);
  if (age > STALE_MS) return `no heartbeat for ${Math.round(age / 60000)} min`;
  return null;
}

const sameOwner = (a, b) => (a && b ? (a.token ?? `${a.pid}@${a.at}`) === (b.token ?? `${b.pid}@${b.at}`) : a === b);

/** Break the lock judged dead as `owner`: rename it aside (only one waiter
    can), check it is the lock judged, and remove it. */
function breakLock(owner, why, tag) {
  const aside = `${LOCK}.broken-${process.pid}-${randomUUID()}`;
  try {
    renameSync(LOCK, aside);
  } catch {
    return; // another waiter got there first, or the owner released it
  }
  const found = readOwner(aside);
  if (!sameOwner(found, owner)) {
    // A fresh lock took the name between our look and our rename: put it back.
    try {
      renameSync(aside, LOCK);
      return;
    } catch {
      console.log(`${tag}: renamed ${found?.theme ?? 'a fresh'} lock aside and could not put it back (${aside}); two builders may now build at once`);
      return;
    }
  }
  console.log(`${tag}: breaking the lock held by ${owner?.theme ?? 'nobody'}${owner ? ` (pid ${owner.pid})` : ''}: ${why}`);
  rmSync(aside, { recursive: true, force: true });
}

export async function acquireLock(who, tag = 'render') {
  mkdirSync(OUT, { recursive: true });
  let waited = 0;
  for (;;) {
    let made = false;
    try {
      mkdirSync(LOCK);
      made = true;
    } catch {}
    if (made) {
      const now = Date.now();
      const me = { theme: who, pid: process.pid, at: now, beat: now, token: randomUUID() };
      writeFileSync(join(LOCK, 'owner.json'), JSON.stringify(me));
      const beat = setInterval(() => {
        if (!sameOwner(readOwner(), me)) return;
        // Written aside and renamed over, so a waiter never reads half a file.
        try {
          const tmp = join(LOCK, `owner.${process.pid}.tmp`);
          writeFileSync(tmp, JSON.stringify({ ...me, beat: Date.now() }));
          renameSync(tmp, join(LOCK, 'owner.json'));
        } catch {}
      }, BEAT_MS);
      beat.unref();
      held = { me, beat };
      return;
    }
    const owner = readOwner();
    const why = breakable(owner);
    if (why) {
      breakLock(owner, why, tag);
      continue;
    }
    if (waited % 30000 === 0) console.log(`${tag}: waiting for the build lock (held by ${owner?.theme ?? 'someone'})...`);
    await sleep(3000);
    waited += 3000;
  }
}

/** Release the lock this process took; anything else is left alone. Safe to
    call more than once. */
export function releaseLock() {
  if (!held) return;
  clearInterval(held.beat);
  const owner = readOwner();
  if (sameOwner(owner, held.me)) rmSync(LOCK, { recursive: true, force: true });
  held = null;
}
