/**
 * Dev server discovery. Loud, never silent.
 *
 * The one rule this module exists to enforce: if the local dev server is not
 * up, the run STOPS. It does not quietly re-point at production. A render that
 * silently swapped sources would produce assets that look right and represent
 * the wrong commit, and nothing downstream would catch it.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Where the site is served from. The dev server, by default.
 *
 * BDL_BASE points the PAGE recorders (render/screens.mjs) at a build of the
 * checked-out tree instead, for when `astro dev` will not start: on this
 * machine it deadlocks while loading its own logger module and never binds
 * :4321, which is why the theme scripts all serve a built dist (the "preview"
 * config on :4400, or `npm run dev:worker` on :8787). The rule this guards is
 * unchanged: every run renders the current tree, never production and never a
 * cached copy. A build made from the working tree just before the run keeps it.
 * The WebGL harness still needs Vite's /@fs/ route, so loops.mjs needs the real
 * dev server.
 */
export const DEV_ORIGIN = (process.env.BDL_BASE ?? 'http://localhost:4321').replace(/\/$/, '');

const SOCIAL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Astro's dev server does not serve files from the repo root — only `public/`
 * and its own routes. Adding `public/social/` would mean writing site files,
 * which this pipeline is not allowed to do.
 *
 * Vite's `/@fs/` prefix is the way through: it serves any file inside the
 * project root straight off disk, query strings included. So the harness lives
 * in `social/harness/`, is committed with the pipeline, and is still served
 * same-origin from :4321 — which is what makes `import '/src/...'` resolve
 * through Vite's own transform pipeline and load the real scene module.
 */
export function harnessUrl(file, params = {}) {
  const abs = path.resolve(SOCIAL_DIR, 'harness', file).replace(/\\/g, '/');
  const query = new URLSearchParams(params).toString();
  return `${DEV_ORIGIN}/@fs/${abs}${query ? `?${query}` : ''}`;
}

/** A page on the site itself (the specimen pages V005 captures). */
export function siteUrl(pathname) {
  return `${DEV_ORIGIN}${pathname}`;
}

/**
 * Confirm the dev server is up and is actually this repo's dev server.
 * Throws with the command to run if it is not.
 */
export async function requireDevServer({ timeoutMs = 4000, harness = true } = {}) {
  let res;
  try {
    res = await fetch(`${DEV_ORIGIN}/`, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'cache-control': 'no-cache' },
    });
  } catch (err) {
    throw new Error(
      `Dev server is not responding at ${DEV_ORIGIN} (${err.message}).\n\n` +
        `Start it from the repo root, in another terminal:\n` +
        `    npm run dev\n\n` +
        `This pipeline will NOT fall back to https://birchdesignlab.com. Rendering\n` +
        `against production would silently produce assets from a different commit\n` +
        `than the one checked out.`
    );
  }

  if (!res.ok) {
    throw new Error(`Dev server at ${DEV_ORIGIN} answered ${res.status}. Expected 200.`);
  }

  // Page recorders read ordinary routes and need nothing more.
  if (!harness) return DEV_ORIGIN;

  // Cheap identity check: confirm Vite's /@fs/ route is live, since every
  // harness URL depends on it. A plain static server on :4321 would pass the
  // fetch above and then fail confusingly at capture time.
  const probe = await fetch(harnessUrl('_probe.html'), {
    signal: AbortSignal.timeout(timeoutMs),
  }).catch(() => null);

  if (!probe?.ok) {
    throw new Error(
      `${DEV_ORIGIN} is up, but Vite's /@fs/ route did not serve the harness probe.\n` +
        `Is that really this repo's \`npm run dev\`? The harness cannot be served without it.`
    );
  }

  return DEV_ORIGIN;
}

/** Never let a stale render pass for a fresh one: what commit is checked out. */
export async function currentCommit() {
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const run = promisify(execFile);
  try {
    const { stdout } = await run('git', ['rev-parse', 'HEAD'], { cwd: path.resolve(SOCIAL_DIR, '..') });
    return stdout.trim();
  } catch {
    return null;
  }
}
