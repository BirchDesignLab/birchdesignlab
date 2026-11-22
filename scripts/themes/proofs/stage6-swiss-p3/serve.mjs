/**
 * Serve a frozen build with the P3 re-division proof (proof.js, proof.css)
 * injected into swiss Home only. Stage 6 wave 1, task 8, 11-19-26.
 *
 * Nothing under src/themes/swiss/ changes: the proof lays its division over
 * the page as built (the real markup, the real styles, the real dial and
 * grid key), the way the R2 proof does for glass. Every other path is the
 * build as frozen. The proof's files are served under /__p3/ and linked just
 * before </head> of /t/swiss/.
 *
 * Usage:
 *   node scripts/themes/snap.mjs --name s6-w1-t8          # build and freeze once
 *   node scripts/themes/proofs/stage6-swiss-p3/serve.mjs --snap s6-w1-t8 --port 4470
 *   open http://127.0.0.1:4470/t/swiss/  (?div=2|3|4|6 starts on a division)
 *
 * As a module: `const server = await serveProof(port, snapDir)`.
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, extname, normalize, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { TYPES } from '../../lib/serve-dist.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..', '..');
const HOME = '/t/swiss/';
const TAGS = '<link rel="stylesheet" href="/__p3/proof.css"><script type="module" src="/__p3/proof.js"></script>';

export function serveProof(port, distIn) {
  const dist = resolve(distIn);
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path === '/__p3/proof.js' || path === '/__p3/proof.css') {
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
  return new Promise((resolveP, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolveP(server));
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = (n, f) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? f : process.argv[i + 1]; };
  const snap = arg('snap', 's6-w1-t8');
  const port = Number(arg('port', '4470'));
  const dist = join(REPO, 'scripts', 'themes', '.out', `snap-${snap}`);
  if (!existsSync(dist)) { console.error(`no ${dist}: freeze it with snap.mjs first`); process.exit(1); }
  await serveProof(port, dist);
  console.log(`serve: http://127.0.0.1:${port}${HOME} (P3 proof injected; Ctrl+C to stop)`);
}
