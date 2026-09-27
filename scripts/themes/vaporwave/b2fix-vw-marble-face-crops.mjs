#!/usr/bin/env node
/**
 * B2 fix round (seat vw-fix-marble), item 1 proof: renders the Venus at
 * yaws -60, -30, 0, 30, 60 degrees (both 'still' and 'live' quality) and
 * writes a 1:1 face-crop contact sheet for each, so the object-space face
 * mask in src/themes/vaporwave/marble/scene.js can be checked by eye at
 * every yaw the live bust's drag and idle turn actually reach -- not just
 * the poster's fixed DEFAULT_VENUS_VIEW.yaw.
 *
 * Usage: BDL_GPU=1 node scripts/themes/vaporwave/b2fix-vw-marble-face-crops.mjs
 * Output: scripts/themes/.out/stage3-b2/vw-fix-marble/face-crops-{still,live}.jpg
 */
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const THREE_DIR = join(REPO, 'node_modules', 'three');
const MARBLE_MODULE_DIR = join(REPO, 'src', 'themes', 'vaporwave', 'marble');
const OUT = join(REPO, 'scripts', 'themes', '.out', 'stage3-b2', 'vw-fix-marble');
mkdirSync(OUT, { recursive: true });
const PORT = 4479;

if (process.env.BDL_GPU !== '1') { console.error('set BDL_GPU=1'); process.exit(1); }

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.glb': 'model/gltf-binary' };
function serve(port) {
  const server = createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const [root, rel] = p.startsWith('/three/') ? [THREE_DIR, p.slice(7)]
      : p.startsWith('/marble/') ? [MARBLE_MODULE_DIR, p.slice(8)]
      : [join(REPO, 'scripts', 'themes', 'vaporwave'), p.slice(1)];
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
  const info = await page.evaluate(() => window.marble.info());
  console.log('renderer:', info.renderer);
  if (/swiftshader|software|llvmpipe/i.test(info.renderer)) throw new Error('software renderer');

  const yawsDeg = [-60, -30, 0, 30, 60];
  for (const quality of ['still', 'live']) {
    const cellSize = 640;
    const sheet = createCanvas(cellSize * yawsDeg.length, cellSize + 40);
    const sx = sheet.getContext('2d');
    sx.fillStyle = '#2a0a4a'; sx.fillRect(0, 0, sheet.width, sheet.height);
    for (let i = 0; i < yawsDeg.length; i++) {
      const yawRad = (yawsDeg[i] * Math.PI) / 180;
      const url = await page.evaluate((o) => window.marble.render(o),
        { prop: 'venus', tint: 'white', size: 1400, quality, yaw: yawRad, elevation: 0.16, pad: 1.1 });
      const full = await loadImage(Buffer.from(url.split(',')[1], 'base64'));
      // A tight 1:1 crop centred on the face (the render's own auto-fit
      // framing keeps the whole bust centred in the square canvas, so a
      // fixed centred crop lands on the face at every yaw here too).
      const cropSize = Math.round(full.width * 0.62);
      const cx = Math.round(full.width * 0.5 - cropSize * 0.5);
      const cy = Math.round(full.height * 0.28);
      sx.fillStyle = '#ffffff';
      sx.drawImage(full, cx, cy, cropSize, cropSize, i * cellSize, 40, cellSize, cellSize);
      sx.fillStyle = '#fff'; sx.font = 'bold 22px Arial';
      sx.fillText(`yaw ${yawsDeg[i]}°`, i * cellSize + 10, 28);
    }
    const outPath = join(OUT, `face-crops-${quality}.jpg`);
    writeFileSync(outPath, await sheet.encode('jpeg', 92));
    console.log(`wrote ${outPath}`);
  }
} finally {
  await browser.close();
  server.close();
}
