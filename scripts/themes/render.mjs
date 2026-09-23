/**
 * Build the site with one school enabled, capture it, and run its guards.
 *
 * Written 09-22-26 for the theme-schools build, where several schools are
 * designed at once in one working tree. Builds write dist/ and .astro/, so
 * two at once corrupt each other; this takes a lock first, so authors simply
 * queue. A school under construction keeps its route disabled
 * (src/pages/t/<id>/_[...page].astro); this enables it for its own build and
 * restores the name afterwards, so another author's half-written school can
 * never break yours.
 *
 * Steps, all under the lock:
 *   1. enable the school's route (if disabled);
 *   2. astro build;
 *   3. serve dist/ on its own port (a small static server: Astro 7 allows one
 *      `astro preview` per project, and the author may already have one);
 *   4. capture every requested page, both schemes, desktop and phone, on the
 *      GPU (scripts/themes/capture.mjs), full page;
 *   5. contrast check for the school (scripts/themes/check-contrast.ts);
 *   6. the built-site tests whose names mention the school;
 *   7. stop the server, restore the route name, release the lock.
 *
 * Usage:
 *   node scripts/themes/render.mjs --theme vaporwave [--pages home,about] [--schemes dark]
 *     [--viewports desktop] [--motion] [--label vaporwave-r3] [--no-tests]
 * Output: scripts/themes/.out/<label>/ (PNGs + index.html contact sheet).
 */
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(REPO, 'scripts', 'themes', '.out');
const LOCK = join(OUT, '.render-lock');
const PORT = 4455;
const STALE_MS = 15 * 60 * 1000;
const ASTRO = join(REPO, 'node_modules', 'astro', 'bin', 'astro.mjs');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const flag = (name) => process.argv.includes(`--${name}`);

const theme = arg('theme');
if (!theme || !/^[a-z][a-z0-9-]{0,31}$/.test(theme)) {
  console.error('usage: node scripts/themes/render.mjs --theme <id> [--pages ...] [--schemes ...] [--viewports ...]');
  process.exit(1);
}
const PAGE_SEG = { home: '', about: 'about/', services: 'services/', contact: 'contact/', sent: 'contact/sent/' };
const pages = arg('pages', 'home,about,services,contact,sent').split(',');
const routes = pages.map((p) => {
  if (!(p in PAGE_SEG)) throw new Error(`unknown page ${p}`);
  return `/t/${theme}/${PAGE_SEG[p]}`;
});
const label = arg('label', `${theme}-${new Date().toISOString().slice(11, 19).replace(/:/g, '')}`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function acquireLock() {
  mkdirSync(OUT, { recursive: true });
  let waited = 0;
  for (;;) {
    try {
      mkdirSync(LOCK);
      writeFileSync(join(LOCK, 'owner.json'), JSON.stringify({ theme, pid: process.pid, at: Date.now() }));
      return;
    } catch {
      let owner = null;
      try {
        owner = JSON.parse(readFileSync(join(LOCK, 'owner.json'), 'utf8'));
      } catch {}
      if (owner && Date.now() - owner.at > STALE_MS) {
        console.log(`render: breaking a stale lock held by ${owner.theme} (pid ${owner.pid})`);
        rmSync(LOCK, { recursive: true, force: true });
        continue;
      }
      if (waited % 30000 === 0) console.log(`render: waiting for the build lock (held by ${owner?.theme ?? 'someone'})...`);
      await sleep(3000);
      waited += 3000;
    }
  }
}

function releaseLock() {
  rmSync(LOCK, { recursive: true, force: true });
}

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts });
  return { code: res.status ?? 1, out: `${res.stdout ?? ''}${res.stderr ?? ''}` };
}

const tail = (text, n) => text.split('\n').slice(-n).join('\n');

/** Async twin of run(): the static server lives in this process, so anything
    that talks to it (the capture) must not block the event loop. */
function runAsync(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd: REPO, ...opts });
    let out = '';
    child.stdout?.on('data', (d) => (out += d));
    child.stderr?.on('data', (d) => (out += d));
    child.on('close', (code) => resolve({ code: code ?? 1, out }));
  });
}

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.glb': 'model/gltf-binary', '.wasm': 'application/wasm', '.xml': 'application/xml', '.txt': 'text/plain',
  '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json',
};

/** Serve dist/ the way Workers Static Assets does for our purposes:
    directories resolve to index.html, anything missing is the 404 page. */
function serveDist(port) {
  const dist = join(REPO, 'dist');
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = normalize(join(dist, path));
    if (!file.startsWith(dist)) { res.writeHead(403).end(); return; }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    let status = 200;
    if (!existsSync(file)) { file = join(dist, '404.html'); status = 404; }
    res.writeHead(status, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

async function waitForServer(url, ms) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {}
    await sleep(500);
  }
  return false;
}

const routeDir = join(REPO, 'src', 'pages', 't', theme);
const enabled = join(routeDir, '[...page].astro');
const disabled = join(routeDir, '_[...page].astro');

await acquireLock();
let renamed = false;
let server = null;
let failed = false;
const cleanup = () => {
  if (server) {
    try { server.close(); } catch {}
    server = null;
  }
  if (renamed && existsSync(enabled)) renameSync(enabled, disabled);
  renamed = false;
  releaseLock();
};
process.on('SIGINT', () => { cleanup(); process.exit(130); });

try {
  if (!existsSync(enabled)) {
    if (!existsSync(disabled)) throw new Error(`no route for ${theme}: expected ${disabled}`);
    renameSync(disabled, enabled);
    renamed = true;
  }

  console.log(`render: building with ${theme} enabled...`);
  const clean = run(process.execPath, [join(REPO, 'scripts', 'build', 'clean-dist.mjs')]);
  if (clean.code !== 0) {
    console.log(clean.out);
    throw new Error('could not clean dist/');
  }
  const build = run(process.execPath, [ASTRO, 'build']);
  if (build.code !== 0) {
    failed = true;
    console.log('render: BUILD FAILED\n' + tail(build.out, 80));
    throw new Error('build failed');
  }
  const warnings = build.out.split('\n').filter((l) => /\b(error|warn)/i.test(l) && !/draco|rollup-plugin-build-css|chunks are larger|chunkSizeWarningLimit|Rolldown/.test(l));
  if (warnings.length) console.log('render: build warnings\n' + warnings.slice(0, 20).join('\n'));

  server = await serveDist(PORT);
  if (!(await waitForServer(`http://127.0.0.1:${PORT}/t/${theme}/`, 10000))) throw new Error('static server did not come up');

  console.log(`render: capturing ${routes.length} pages...`);
  const captureArgs = [
    join(REPO, 'scripts', 'themes', 'capture.mjs'),
    '--base', `http://127.0.0.1:${PORT}`,
    '--routes', routes.join(','),
    '--label', label,
    '--schemes', arg('schemes', 'dark,light'),
    '--viewports', arg('viewports', 'desktop,phone'),
    '--full-page',
    ...(flag('motion') ? ['--motion', '--wait', '2500'] : []),
  ];
  const capture = await runAsync(process.execPath, captureArgs, { env: { ...process.env, BDL_GPU: '1', MSYS_NO_PATHCONV: '1' } });
  console.log(tail(capture.out, 30));
  if (capture.code !== 0) failed = true;

  console.log('render: contrast...');
  const contrast = run(process.execPath, [join(REPO, 'node_modules', 'tsx', 'dist', 'cli.mjs'), join(REPO, 'scripts', 'themes', 'check-contrast.ts'), '--theme', theme]);
  console.log(tail(contrast.out, 40));
  if (contrast.code !== 0) failed = true;

  if (!flag('no-tests')) {
    console.log('render: built-site tests for this school...');
    const vitest = join(REPO, 'node_modules', 'vitest', 'vitest.mjs');
    const tests = run(process.execPath, [vitest, 'run', '--config', 'vitest.dist.config.ts', '-t', theme]);
    const lines = tests.out.split('\n').filter((l) => /✓|×|FAIL|Tests|AssertionError|Expected|Received|missing|extra/.test(l));
    console.log(lines.slice(-60).join('\n'));
    if (tests.code !== 0) failed = true;
  }
} catch (e) {
  failed = true;
  console.log(`render: ${e.message}`);
} finally {
  cleanup();
}

console.log(`\nrender: captures in scripts/themes/.out/${label}/ (open index.html, or Read the PNGs)`);
console.log(failed ? 'render: FAILED (see above)' : 'render: all checks passed');
process.exitCode = failed ? 2 : 0;
