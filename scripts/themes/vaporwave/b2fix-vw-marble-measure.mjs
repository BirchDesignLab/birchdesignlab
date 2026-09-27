#!/usr/bin/env node
/**
 * One-off measurement for the B2 fix round (seat vw-fix-marble): prints the
 * Venus mesh's own object-space bounding box and a coarse per-band profile
 * (x half-width, z front extent) so the face-mask ellipsoid in
 * src/themes/vaporwave/marble/scene.js (marbleMaterial's `faceMask` option)
 * can be sized from real numbers instead of a guess. Object space here means
 * the geometry's own local vertex coordinates, exactly as process-venus.mjs
 * writes them (base cut at y=0, centred on X/Z) -- NOT world space, which
 * rotates with the live bust's yaw.
 *
 * Usage: BDL_GPU=1 node scripts/themes/vaporwave/b2fix-vw-marble-measure.mjs
 * Nothing is written; this only prints to stdout.
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const THREE_DIR = join(REPO, 'node_modules', 'three');
const MARBLE_MODULE_DIR = join(REPO, 'src', 'themes', 'vaporwave', 'marble');
const PORT = 4477;

if (process.env.BDL_GPU !== '1') {
  console.error('measure: set BDL_GPU=1');
  process.exit(1);
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.glb': 'model/gltf-binary' };
function serve(port) {
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const [root, rel] = path.startsWith('/three/') ? [THREE_DIR, path.slice(7)]
      : path.startsWith('/marble/') ? [MARBLE_MODULE_DIR, path.slice(8)]
      : [HERE, path.slice(1)];
    const file = normalize(join(root, rel));
    if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(readFileSync(file));
  });
  return new Promise((ok, fail) => { server.once('error', fail); server.listen(port, '127.0.0.1', () => ok(server)); });
}

const server = await serve(PORT);
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('[page error]', e.message));
  await page.goto(`http://127.0.0.1:${PORT}/marble-scene.html`);
  await page.waitForFunction(() => window.marble?.ready);
  const stats = await page.evaluate(async () => {
    const { loadVenus } = await import('/marble/scene.js');
    const mesh = await loadVenus('/marble/venus.glb');
    const pos = mesh.geometry.attributes.position;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
    const height = maxY - minY;
    // Per-band profile: for each 5% band of height, the x half-width (max
    // |x|) and the z range, so the face's front plane and the ears' x extent
    // can be read off directly instead of guessed.
    const bands = [];
    for (let b = 0; b < 20; b++) {
      const y0 = minY + height * (b / 20), y1 = minY + height * ((b + 1) / 20);
      let bMinX = Infinity, bMaxX = -Infinity, bMinZ = Infinity, bMaxZ = -Infinity, n = 0;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        if (y < y0 || y >= y1) continue;
        n++;
        const x = pos.getX(i), z = pos.getZ(i);
        if (x < bMinX) bMinX = x; if (x > bMaxX) bMaxX = x;
        if (z < bMinZ) bMinZ = z; if (z > bMaxZ) bMaxZ = z;
      }
      bands.push({ b, y0: +y0.toFixed(4), y1: +y1.toFixed(4), n, xHalf: n ? +Math.max(Math.abs(bMinX), Math.abs(bMaxX)).toFixed(4) : null, zMin: n ? +bMinZ.toFixed(4) : null, zMax: n ? +bMaxZ.toFixed(4) : null });
    }
    return { count: pos.count, bbox: { minX, maxX, minY, maxY, minZ, maxZ }, height, bands };
  });
  console.log(JSON.stringify(stats, null, 2));
} finally {
  await browser.close();
  server.close();
}
