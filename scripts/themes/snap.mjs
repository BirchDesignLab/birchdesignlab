/**
 * Freeze a build and serve it, so several builders can film their own work
 * without another builder's rebuild changing what they film.
 *
 * Written 09-23-26 for Tier 3 stage 2. Every build writes dist/, which the
 * Worker and render.mjs serve, and a build that lands mid-film swaps the site
 * under the camera. This builds under the same lock render.mjs takes
 * (scripts/themes/.out/.render-lock, lib/render-lock.mjs), copies dist/ to
 * scripts/themes/.out/snap-<name>/, releases the lock at once, and then
 * serves the copy on its own port with render.mjs's static server
 * (lib/serve-dist.mjs), however long the filming takes.
 *
 * Modes:
 *   build      (default) run what `npm run build` runs (the og prebuild,
 *              clean-dist, astro build), then copy dist/ to snap-<name>/;
 *   --reuse    skip the build and serve an existing snap-<name>/;
 * then either
 *   -- <cmd>   run <cmd> with SNAP_BASE=http://127.0.0.1:<port> in its
 *              environment (motion.mjs reads it as its default --base), stop
 *              the server and exit with the command's code; a first word of
 *              `node` runs this Node without a shell, anything else runs
 *              through the shell;
 *   --hold     keep serving until killed.
 *
 * Every request that falls through to the 404 page is printed as it happens
 * and counted at the end (exit code 3 if the command succeeded but anything
 * was missing), so a missing font, model or script is loud, never a silent
 * 404 inside a film. motion.mjs also reports every 4xx beside its strip.
 *
 * Usage:
 *   node scripts/themes/snap.mjs --name head --port 4460 -- node scripts/themes/motion.mjs --schools swiss ...
 *   node scripts/themes/snap.mjs --name head --reuse --port 4460 --hold
 *   node scripts/themes/snap.mjs --name head            # build and freeze only
 */
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { acquireLock, releaseLock } from './lib/render-lock.mjs';
import { serveDist, waitForServer } from './lib/serve-dist.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const dash = process.argv.indexOf('--');
const own = dash === -1 ? process.argv.slice(2) : process.argv.slice(2, dash);
const command = dash === -1 ? [] : process.argv.slice(dash + 1);
function arg(name, fallback) {
  const i = own.indexOf(`--${name}`);
  return i === -1 ? fallback : own[i + 1];
}
const flag = (name) => own.includes(`--${name}`);

const name = arg('name');
if (!name || !/^[a-z0-9][a-z0-9-]{0,40}$/.test(name)) {
  console.error('usage: node scripts/themes/snap.mjs --name <name> [--reuse] [--port 4460] [--hold | -- <command...>]');
  process.exit(1);
}
const port = Number(arg('port', '4460'));
const snapDir = join(REPO, 'scripts', 'themes', '.out', `snap-${name}`);
const tail = (text, n) => text.split('\n').slice(-n).join('\n');

if (!flag('reuse')) {
  await acquireLock(`snap:${name}`, 'snap');
  let ok = false;
  try {
    console.log(`snap: building (npm run build) for snap-${name}...`);
    // Through the shell so npm resolves on Windows (npm.cmd).
    const build = spawnSync('npm run build', { cwd: REPO, shell: true, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    if (build.status !== 0) {
      console.log('snap: BUILD FAILED\n' + tail(`${build.stdout ?? ''}${build.stderr ?? ''}`, 80));
    } else {
      rmSync(snapDir, { recursive: true, force: true });
      cpSync(join(REPO, 'dist'), snapDir, { recursive: true });
      ok = true;
      console.log(`snap: froze dist/ as ${snapDir}`);
    }
  } finally {
    releaseLock();
  }
  if (!ok) process.exit(2);
} else if (!existsSync(join(snapDir, 'index.html'))) {
  console.error(`snap: --reuse, but ${snapDir} holds no build`);
  process.exit(1);
}

if (!command.length && !flag('hold')) process.exit(0);

const missing = new Map();
let server;
try {
  server = await serveDist(port, snapDir, {
    onMissing: (path) => {
      missing.set(path, (missing.get(path) ?? 0) + 1);
      console.error(`snap: 404 ${path}`);
    },
  });
} catch (e) {
  console.error(`snap: could not serve on port ${port}: ${e.message}`);
  process.exit(1);
}
const base = `http://127.0.0.1:${port}`;
if (!(await waitForServer(`${base}/`, 10000))) {
  console.error('snap: the static server did not come up');
  server.close();
  process.exit(1);
}
console.log(`snap: serving snap-${name} at ${base}`);

const report = () => {
  if (!missing.size) return;
  console.error(`snap: ${missing.size} path(s) fell through to the 404 page:`);
  for (const [p, n] of missing) console.error(`  ${p} (${n}x)`);
};

if (flag('hold')) {
  const stop = () => {
    server.close();
    report();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
} else {
  const [cmd, ...rest] = command;
  const viaNode = cmd === 'node';
  const child = spawn(viaNode ? process.execPath : cmd, rest, {
    cwd: REPO,
    stdio: 'inherit',
    shell: !viaNode,
    env: { ...process.env, SNAP_BASE: base, MSYS_NO_PATHCONV: '1' },
  });
  const code = await new Promise((resolve) => child.on('close', (c) => resolve(c ?? 1)));
  server.close();
  report();
  process.exit(code === 0 && missing.size ? 3 : code);
}
