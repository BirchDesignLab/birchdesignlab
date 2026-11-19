/**
 * Serve a frozen build with the R2 proof (proof.js, proof.css) injected into
 * glass Home only. Stage 6 wave 1, task 7, 11-19-26.
 *
 * Every other path is the build as frozen, so the switcher, About and the
 * arrival into Home are the real ones. The proof's files are served under
 * /__r2/ and linked just before </head> of /t/glassmorphism/.
 *
 * Usage:
 *   node scripts/themes/snap.mjs --name s6-w1-t7          # build and freeze once
 *   node scripts/themes/proofs/stage6-glass-r2/serve.mjs --snap s6-w1-t7 --port 4470
 *   open http://127.0.0.1:4470/t/glassmorphism/  (Chrome or Edge; ?r2=off for the page as built)
 *
 * As a module: `const server = await serveProof(port, snapDir)`.
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, extname, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { TYPES } from '../../lib/serve-dist.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..', '..');
const HOME = '/t/glassmorphism/';
const TAGS = '<link rel="stylesheet" href="/__r2/proof.css"><script type="module" src="/__r2/proof.js"></script>';

export function serveProof(port, dist) {
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path === '/__r2/proof.js' || path === '/__r2/proof.css') {
      const file = join(HERE, path.slice(6));
      // Read on every request, so an edit shows on reload.
      res.writeHead(200, { 'content-type': TYPES[extname(file)], 'cache-control': 'no-store' });
      res.end(readFileSync(file));
      return;
    }
    let file = normalize(join(dist, path));
    if (!file.startsWith(dist)) { res.writeHead(403).end(); return; }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    let status = 200;
    if (!existsSync(file)) { file = join(dist, '404.html'); status = 404; console.log(`serve: 404 ${path}`); }
    let body = readFileSync(file);
    if (path === HOME || path === `${HOME}index.html`) {
      body = Buffer.from(body.toString('utf8').replace('</head>', `${TAGS}</head>`), 'utf8');
    }
    res.writeHead(status, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = (n, f) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? f : process.argv[i + 1]; };
  const snap = arg('snap', 's6-w1-t7');
  const port = Number(arg('port', '4470'));
  const dist = join(REPO, 'scripts', 'themes', '.out', `snap-${snap}`);
  if (!existsSync(dist)) { console.error(`no ${dist}: freeze it with snap.mjs first`); process.exit(1); }
  await serveProof(port, dist);
  console.log(`serve: http://127.0.0.1:${port}${HOME} (R2 proof injected; Ctrl+C to stop)`);
}
