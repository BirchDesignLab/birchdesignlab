/**
 * A small static server for a built site, shared by render.mjs (which serves
 * dist/) and snap.mjs (which serves a frozen copy of it).
 *
 * Moved out of render.mjs 09-23-26 for Tier 3 stage 2, unchanged in what it
 * serves: Astro 7 allows one `astro preview` per project and the author may
 * already have one, so each script runs its own server on its own port.
 * Directories resolve to index.html and anything missing is the 404 page,
 * the way Workers Static Assets does for our purposes.
 *
 *   const server = await serveDist(4455);               // dist/
 *   const server = await serveDist(4460, snapDir, { onMissing });
 *
 * `onMissing(path)` is called for every request that fell through to the
 * 404 page, so a caller can make a missing font or model loud instead of a
 * silent 404 inside a film.
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

export const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.glb': 'model/gltf-binary', '.wasm': 'application/wasm', '.xml': 'application/xml', '.txt': 'text/plain',
  '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json',
};

/** Serve `dist` (default: the repo's dist/) on 127.0.0.1:`port`. Resolves
    with the http.Server once it is listening; rejects if the port is taken. */
export function serveDist(port, dist = join(REPO, 'dist'), { onMissing } = {}) {
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = normalize(join(dist, path));
    if (!file.startsWith(dist)) { res.writeHead(403).end(); return; }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    let status = 200;
    if (!existsSync(file)) {
      file = join(dist, '404.html');
      status = 404;
      onMissing?.(path);
    }
    res.writeHead(status, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Poll `url` until it answers 2xx, for up to `ms`. */
export async function waitForServer(url, ms) {
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
