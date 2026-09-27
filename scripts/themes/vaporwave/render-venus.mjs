/**
 * Renders vaporwave's Venus stills through the shared marble scene module
 * (src/themes/vaporwave/marble/scene.js): About's live-quality poster, the
 * Home kiosk's still-quality staged shot, and a tints sheet (white, pink,
 * lavender, black) for the founder. Also an --orient mode that renders a
 * grid of yaw angles with a plain material, for picking the bust's facing
 * direction before committing to DEFAULT_VENUS_VIEW in scene.js.
 *
 * Written 09-25-26 for Tier 3 stage 3, wave B2, seat vw-4a. Same GPU
 * Playwright approach as render-marble.mjs (which keeps port 4467); this
 * script defaults to port 4468. Nothing is downloaded; the Venus GLB
 * (src/themes/vaporwave/marble/venus.glb) is process-venus.mjs's output.
 *
 * Outputs (gitignored) under scripts/themes/.out/stage3-b2/vw-4a/:
 *   render/venus-<tint>-live@2048.png, venus-kiosk-<tint>-still@2048.png
 *   stills/venus-1024.{webp,avif}         About's poster (live quality)
 *   stills/venus-kiosk-512.{webp,avif}    the kiosk still (still quality)
 *   tints-venus.png                        white/pink/lavender/black sheet
 *   debug/orient-<label>.png               --orient only
 *   gpu.txt
 *
 * Usage:
 *   BDL_GPU=1 node scripts/themes/vaporwave/render-venus.mjs
 *   BDL_GPU=1 node scripts/themes/vaporwave/render-venus.mjs --orient
 *   BDL_GPU=1 node scripts/themes/vaporwave/render-venus.mjs --port 4468
 */
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import sharp from 'sharp';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const THREE_DIR = join(REPO, 'node_modules', 'three');
const MARBLE_MODULE_DIR = join(REPO, 'src', 'themes', 'vaporwave', 'marble');
const OUT = join(REPO, 'scripts', 'themes', '.out', 'stage3-b2', 'vw-4a');

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i === -1 ? d : argv[i + 1]; };
const PORT = Number(arg('port', '4468'));
const HEADED = argv.includes('--headed');
const ORIENT = argv.includes('--orient');
const DEBUG_MESH = argv.includes('--debug-mesh'); // orient mode against the unsimplified venus-raw.glb

if (process.env.BDL_GPU !== '1') {
  console.error('render-venus: set BDL_GPU=1 (GPU always; software-rendered stills are never shipped).');
  process.exit(1);
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.glb': 'model/gltf-binary' };

function serve(port) {
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const [root, rel] = path.startsWith('/three/') ? [THREE_DIR, path.slice(7)]
      : path.startsWith('/marble/') ? [MARBLE_MODULE_DIR, path.slice(8)]
      : path.startsWith('/debug/') ? [join(OUT, 'debug'), path.slice(7)]
      : [HERE, path.slice(1)];
    const file = normalize(join(root, rel));
    if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(readFileSync(file));
  });
  return new Promise((ok, fail) => { server.once('error', fail); server.listen(port, '127.0.0.1', () => ok(server)); });
}

function resized(img, size) {
  let src = img, w = img.width;
  while (w / 2 >= size) {
    w = Math.round(w / 2);
    const c = createCanvas(w, w);
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = true;
    x.imageSmoothingQuality = 'high';
    x.drawImage(src, 0, 0, w, w);
    src = c;
  }
  if (w !== size) {
    const c = createCanvas(size, size);
    const x = c.getContext('2d');
    x.imageSmoothingQuality = 'high';
    x.drawImage(src, 0, 0, size, size);
    src = c;
  }
  return src;
}

async function main() {
  for (const d of ['render', 'stills', 'debug']) mkdirSync(join(OUT, d), { recursive: true });
  const server = await serve(PORT);
  const browser = await chromium.launch({
    headless: !HEADED,
    args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 800, height: 800 } });
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(`  [page ${m.type()}] ${m.text()}`); });
    page.on('pageerror', (e) => console.log(`  [page error] ${e.message}`));
    await page.goto(`http://127.0.0.1:${PORT}/marble-scene.html`);
    await page.waitForFunction(() => window.marble?.ready, null, { timeout: 30000 });
    const info = await page.evaluate(() => window.marble.info());
    console.log(`render-venus: WEBGL_debug_renderer_info: ${info.vendor} / ${info.renderer} (three r${info.three})`);
    if (/swiftshader|software|llvmpipe/i.test(info.renderer)) throw new Error('software renderer: refusing to ship these pixels');
    writeFileSync(join(OUT, 'gpu.txt'), `${info.vendor}\n${info.renderer}\nthree r${info.three}\n`);

    if (ORIENT) {
      await orientGrid(page);
      return;
    }
    await stills(page);
  } finally {
    await browser.close();
    server.close();
  }
}

/** A grid of yaw angles at a plain, evenly-lit look, so the facing direction
    and up axis can be judged without the marble shader's own contrast. */
async function orientGrid(page) {
  const yaws = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
  const elevations = [0.16, 0.45];
  const cell = 500;
  const c = createCanvas(cell * yaws.length, cell * elevations.length + 30);
  const x = c.getContext('2d');
  x.fillStyle = '#3a3048';
  x.fillRect(0, 0, c.width, c.height);
  for (let ei = 0; ei < elevations.length; ei++) {
    for (let yi = 0; yi < yaws.length; yi++) {
      const url = await page.evaluate((o) => window.marble.render(o), { prop: 'venus', tint: 'white', size: 900, yaw: yaws[yi], elevation: elevations[ei], quality: 'still', venusUrl: DEBUG_MESH ? '/debug/venus-raw.glb' : undefined });
      const img = await loadImage(Buffer.from(url.split(',')[1], 'base64'));
      x.drawImage(img, yi * cell, ei * cell, cell, cell);
      x.fillStyle = '#fff';
      x.font = '16px Arial';
      x.fillText(`yaw ${yaws[yi].toFixed(2)} elev ${elevations[ei]}`, yi * cell + 8, ei * cell + cell - 8);
    }
  }
  writeFileSync(join(OUT, 'debug', 'orient-grid.png'), await c.encode('png'));
  console.log(`render-venus: wrote ${join(OUT, 'debug', 'orient-grid.png')}`);
}

async function stills(page) {
  // About's poster: live quality, the exact pose the live bust's first frame
  // will use (DEFAULT_VENUS_VIEW in scene.js; passed here explicitly too so
  // this script's intent reads standalone).
  const posterUrl = await page.evaluate((o) => window.marble.render(o),
    { prop: 'venus', tint: 'white', size: 2048, quality: 'live', yaw: 0.28, elevation: 0.16, pad: 1.08 });
  writeFileSync(join(OUT, 'render', 'venus-white-live@2048.png'), Buffer.from(posterUrl.split(',')[1], 'base64'));

  // The kiosk still: still quality, on its own small drum, white.
  const kioskUrl = await page.evaluate((o) => window.marble.render(o),
    { prop: 'venus-kiosk', tint: 'white', size: 2048, quality: 'still', yaw: 0.28, elevation: 0.22, pad: 1.05 });
  writeFileSync(join(OUT, 'render', 'venus-kiosk-white-still@2048.png'), Buffer.from(kioskUrl.split(',')[1], 'base64'));

  // Tints sheet: all four tints, live quality, the poster's pose.
  const tints = ['white', 'pink', 'lavender', 'black'];
  const tintPngs = {};
  for (const tint of tints) {
    const url = await page.evaluate((o) => window.marble.render(o),
      { prop: 'venus', tint, size: 1024, quality: 'live', yaw: 0.28, elevation: 0.16, pad: 1.08 });
    tintPngs[tint] = Buffer.from(url.split(',')[1], 'base64');
  }
  const cell = 340;
  const sheet = createCanvas(cell * tints.length, cell + 30);
  const sx = sheet.getContext('2d');
  for (let yy = 0; yy < sheet.height; yy += 20) for (let xx = 0; xx < sheet.width; xx += 20) {
    sx.fillStyle = ((xx + yy) / 20) % 2 ? '#d8d4dc' : '#efedf1';
    sx.fillRect(xx, yy, 20, 20);
  }
  for (let i = 0; i < tints.length; i++) {
    const img = await loadImage(tintPngs[tints[i]]);
    sx.drawImage(img, i * cell, 0, cell, cell);
    sx.fillStyle = '#2a0a4a';
    sx.font = '18px Arial';
    sx.fillText(`venus-${tints[i]}`, i * cell + 10, cell + 22);
  }
  writeFileSync(join(OUT, 'tints-venus.png'), await sheet.encode('png'));

  // Encode the poster and kiosk still at their shipped sizes.
  const posterImg = await loadImage(readFileSync(join(OUT, 'render', 'venus-white-live@2048.png')));
  const posterC = resized(posterImg, 1024);
  writeFileSync(join(OUT, 'stills', 'venus-1024.webp'), await posterC.encode('webp', 82));
  writeFileSync(join(OUT, 'stills', 'venus-1024.avif'), await sharp(await posterC.encode('png')).avif({ quality: 55, effort: 6, chromaSubsampling: '4:4:4' }).toBuffer());

  const kioskImg = await loadImage(readFileSync(join(OUT, 'render', 'venus-kiosk-white-still@2048.png')));
  const kioskC = resized(kioskImg, 512);
  writeFileSync(join(OUT, 'stills', 'venus-kiosk-512.webp'), await kioskC.encode('webp', 82));
  writeFileSync(join(OUT, 'stills', 'venus-kiosk-512.avif'), await sharp(await kioskC.encode('png')).avif({ quality: 55, effort: 6, chromaSubsampling: '4:4:4' }).toBuffer());

  console.log('render-venus: wrote poster (venus-1024), kiosk (venus-kiosk-512), tints-venus.png');
}

await main();
