/**
 * Render vaporwave's marble stills: glossy, pastel-tinted, over-stylised
 * marble props on a transparent background, encoded to WebP and AVIF at the
 * sizes the site would ship, plus composites on the school's own light and
 * dark palettes and a sheet of every tint.
 *
 * Written 09-25-26 for Tier 3 stage 3 (Tier A proofs). The founder approved
 * F3 as proposed (stage3-decisions.md, Answers item 6): rendered marble,
 * pristine, tinted and glossy, after supyrb's Vapordays and Marbloid.
 * Offline stills dress the rooms (the Home kiosk, the lobby tile, About's
 * centrepiece) and are the poster for About's live bust. Until the founder
 * approves a named CC0 mesh the props are stand-ins that prove the material
 * and the light (marble-scene.js has the scene; this script drives it).
 *
 * How: a small local server maps /three/ to node_modules/three/ and / to
 * this folder; Playwright opens marble-scene.html in Chromium on the GPU
 * (ANGLE D3D11; the renderer string is logged and SwiftShader aborts the
 * run); each prop renders at 2048 px with MSAA and is downsampled here with
 * @napi-rs/canvas to 1024 and 512, then encoded: WebP q82 by @napi-rs/canvas,
 * AVIF q55 (effort 6, 4:4:4) by sharp, which Astro's image service already
 * installs. @napi-rs/canvas 1.0.9's AVIF encoder was tried first and is
 * unusable here: its quality runs backwards (q5 gives 5.8 KB, q100 gives
 * 1.1 KB for the same 1024 px still) and every setting came out visibly
 * smeared. Nothing is downloaded.
 *
 * Outputs (gitignored) under scripts/themes/.out/stage3-proofs/marble/:
 *   png/<prop>-<tint>@2048.png   raw renders
 *   stills/<prop>-<tint>-<size>.{webp,avif}
 *   tints-sheet.png              every render on a checker
 *   composite-light.png, composite-dark.png
 *   sizes.json                   byte sizes of every encoded still
 *
 * Usage:
 *   BDL_GPU=1 node scripts/themes/vaporwave/render-marble.mjs
 *   BDL_GPU=1 node scripts/themes/vaporwave/render-marble.mjs --only column --port 4467
 *   BDL_GPU=1 node scripts/themes/vaporwave/render-marble.mjs --headed   # watch it
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
const OUT = join(REPO, 'scripts', 'themes', '.out', 'stage3-proofs', 'marble');

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i === -1 ? d : argv[i + 1]; };
const PORT = Number(arg('port', '4467'));
const ONLY = arg('only', null);
const HEADED = argv.includes('--headed');

if (process.env.BDL_GPU !== '1') {
  console.error('render-marble: set BDL_GPU=1 (GPU always; software-rendered stills are never shipped).');
  process.exit(1);
}

// What to render: each prop in two or three tints.
const JOBS = [
  ['sphere', 'white'], ['sphere', 'pink'], ['sphere', 'black'],
  ['column', 'white'], ['column', 'pink'], ['column', 'lavender'],
  ['holo', 'pearl'], ['holo', 'pink'], ['holo', 'lavender'],
  ['orb', 'chrome'], ['orb', 'pink'],
].filter(([p]) => !ONLY || p === ONLY);

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };

function serve(port) {
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const [root, rel] = path.startsWith('/three/') ? [THREE_DIR, path.slice(7)] : [HERE, path.slice(1)];
    const file = normalize(join(root, rel));
    if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) {
      console.log(`render-marble: 404 ${path}`);
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(readFileSync(file));
  });
  return new Promise((ok, fail) => { server.once('error', fail); server.listen(port, '127.0.0.1', () => ok(server)); });
}

/** Pull `--name: #hex` tokens out of vaporwave's theme.css, dark block and light block. */
function paletteTokens() {
  const css = readFileSync(join(REPO, 'src', 'themes', 'vaporwave', 'theme.css'), 'utf8');
  const block = (sel) => {
    const at = css.indexOf(sel);
    const body = css.slice(css.indexOf('{', at) + 1, css.indexOf('\n}', at));
    return Object.fromEntries([...body.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => [m[1], m[2]]));
  };
  const dark = block(":root[data-theme='vaporwave'] {");
  const light = { ...dark, ...block(":root[data-theme='vaporwave'][data-scheme='light'] {") };
  return { dark, light };
}

/** Bounding box of the solid (not shadow) pixels of an image. */
function solidBox(img) {
  const c = createCanvas(img.width, img.height);
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, img.width, img.height).data;
  let x0 = img.width, y0 = img.height, x1 = 0, y1 = 0;
  for (let y = 0; y < img.height; y += 2) {
    for (let xx = 0; xx < img.width; xx += 2) {
      if (d[(y * img.width + xx) * 4 + 3] > 235) {
        if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}

function resized(img, size) {
  // Halve step by step for a clean downsample.
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
  for (const d of ['png', 'stills']) mkdirSync(join(OUT, d), { recursive: true });
  const server = await serve(PORT);
  const browser = await chromium.launch({
    headless: !HEADED,
    args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
  });
  const renders = {};
  try {
    const page = await browser.newPage({ viewport: { width: 800, height: 800 } });
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(`  [page ${m.type()}] ${m.text()}`); });
    page.on('pageerror', (e) => console.log(`  [page error] ${e.message}`));
    await page.goto(`http://127.0.0.1:${PORT}/marble-scene.html`);
    await page.waitForFunction(() => window.marble?.ready, null, { timeout: 30000 });
    const info = await page.evaluate(() => window.marble.info());
    console.log(`render-marble: WEBGL_debug_renderer_info: ${info.vendor} / ${info.renderer} (three r${info.three})`);
    if (/swiftshader|software|llvmpipe/i.test(info.renderer)) throw new Error('software renderer: refusing to ship these pixels');
    writeFileSync(join(OUT, 'gpu.txt'), `${info.vendor}\n${info.renderer}\nthree r${info.three}\n`);

    for (const [prop, tint] of JOBS) {
      const t0 = Date.now();
      const url = await page.evaluate((o) => window.marble.render(o), { prop, tint, size: 2048 });
      const png = Buffer.from(url.split(',')[1], 'base64');
      const file = join(OUT, 'png', `${prop}-${tint}@2048.png`);
      writeFileSync(file, png);
      renders[`${prop}-${tint}`] = file;
      console.log(`render-marble: ${prop}-${tint} ${Date.now() - t0} ms`);
    }
  } finally {
    await browser.close();
    server.close();
  }

  // Encode.
  const sizes = {};
  for (const [name, file] of Object.entries(renders)) {
    const img = await loadImage(readFileSync(file));
    sizes[name] = {};
    for (const size of [1024, 512]) {
      const c = resized(img, size);
      const webp = await c.encode('webp', 82);
      const avif = await sharp(await c.encode('png')).avif({ quality: 55, effort: 6, chromaSubsampling: '4:4:4' }).toBuffer();
      writeFileSync(join(OUT, 'stills', `${name}-${size}.webp`), webp);
      writeFileSync(join(OUT, 'stills', `${name}-${size}.avif`), avif);
      sizes[name][size] = { webp: webp.length, avif: avif.length };
    }
  }
  writeFileSync(join(OUT, 'sizes.json'), JSON.stringify(sizes, null, 2));
  console.log('\nstill              1024 webp  1024 avif   512 webp   512 avif');
  for (const [n, s] of Object.entries(sizes)) {
    const k = (b) => `${(b / 1024).toFixed(1)} KB`.padStart(10);
    console.log(`${n.padEnd(18)}${k(s[1024].webp)} ${k(s[1024].avif)} ${k(s[512].webp)} ${k(s[512].avif)}`);
  }

  if (ONLY) return;
  await tintsSheet(renders);
  const tokens = paletteTokens();
  await composite(renders, tokens.light, 'light');
  await composite(renders, tokens.dark, 'dark');
  await codecSheet(tokens.light);
}

/** Decoded WebP beside decoded AVIF, at 512 and as a 1:1 crop of a 1024,
    on the light field, so codec damage is judged by eye, not by bytes. */
async function codecSheet(t) {
  const dir = join(OUT, 'stills');
  const decode = async (file, crop) => {
    let s = sharp(join(dir, file));
    if (crop) s = s.extract({ left: 300, top: 300, width: 512, height: 512 });
    return loadImage(await s.png().toBuffer());
  };
  const c = createCanvas(2048, 1024 + 40);
  const x = c.getContext('2d');
  x.fillStyle = t['field'];
  x.fillRect(0, 0, c.width, c.height);
  const cells = [
    ['column-white-512.webp'], ['column-white-512.avif'], ['holo-pink-512.webp'], ['holo-pink-512.avif'],
    ['sphere-black-1024.webp', true], ['sphere-black-1024.avif', true], ['orb-chrome-1024.webp', true], ['orb-chrome-1024.avif', true],
  ];
  x.font = '16px Arial';
  for (let i = 0; i < cells.length; i++) {
    const [file, crop] = cells[i];
    const cx = (i % 4) * 512, cy = Math.floor(i / 4) * 532;
    x.drawImage(await decode(file, crop), cx, cy);
    x.fillStyle = t['mark'];
    x.fillText(`${file}${crop ? ' (1:1 crop)' : ''}`, cx + 8, cy + 526);
  }
  writeFileSync(join(OUT, 'codec-check.png'), await c.encode('png'));
}

async function tintsSheet(renders) {
  const names = Object.keys(renders);
  const cell = 400, cols = 6, rows = Math.ceil(names.length / cols);
  const c = createCanvas(cols * cell, rows * (cell + 30));
  const x = c.getContext('2d');
  for (let yy = 0; yy < c.height; yy += 20) for (let xx = 0; xx < c.width; xx += 20) {
    x.fillStyle = ((xx + yy) / 20) % 2 ? '#d8d4dc' : '#efedf1';
    x.fillRect(xx, yy, 20, 20);
  }
  for (let i = 0; i < names.length; i++) {
    const img = await loadImage(readFileSync(renders[names[i]]));
    const cx = (i % cols) * cell, cy = Math.floor(i / cols) * (cell + 30);
    x.drawImage(img, cx, cy, cell, cell);
    x.fillStyle = '#2a0a4a';
    x.font = '18px Arial';
    x.fillText(names[i], cx + 10, cy + cell + 20);
  }
  writeFileSync(join(OUT, 'tints-sheet.png'), await c.encode('png'));
}

/** The props on the school's palette: field gradient, flattened lobby tile, sheen. */
async function composite(renders, t, scheme) {
  const W = 2400, H = 1300, FLOOR = 560;
  const c = createCanvas(W, H);
  const x = c.getContext('2d');
  const sky = x.createLinearGradient(0, 0, 0, FLOOR);
  sky.addColorStop(0, t['field-top']);
  sky.addColorStop(1, t['field']);
  x.fillStyle = sky;
  x.fillRect(0, 0, W, FLOOR);
  // Lobby tile: a high camera, so the vanishing is gentle.
  const floor = x.createLinearGradient(0, FLOOR, 0, H);
  floor.addColorStop(0, t['field-raised']);
  floor.addColorStop(1, t['field-foot']);
  x.fillStyle = floor;
  x.fillRect(0, FLOOR, W, H - FLOOR);
  x.strokeStyle = t['rule'];
  x.lineWidth = 2;
  const vx = W / 2, spread = 1.9;
  for (let i = -24; i <= 24; i++) {
    const topX = vx + i * 100, botX = vx + i * 100 * spread;
    x.beginPath(); x.moveTo(topX, FLOOR); x.lineTo(botX, H); x.stroke();
  }
  for (let r = 0, y = FLOOR; y < H; r++) {
    x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke();
    y += 30 + r * 12;
  }
  const sheen = x.createLinearGradient(0, FLOOR, 0, FLOOR + 160);
  sheen.addColorStop(0, scheme === 'light' ? 'rgba(255,255,255,0.55)' : 'rgba(185,103,255,0.18)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = sheen;
  x.fillRect(0, FLOOR, W, 160);

  // Props: [render, target solid height px, centre x, floor y offset].
  const placed = [
    ['column-white', 680, 1000, 250],
    ['column-lavender', 600, 1760, 160],
    ['holo-pearl', 360, 330, 300],
    ['holo-pink', 300, 2200, 290],
    ['sphere-pink', 300, 1390, 420],
    ['sphere-black', 250, 640, 520],
    ['orb-chrome', 170, 1960, 560],
  ];
  for (const [name, hpx, cx, dy] of placed) {
    if (!renders[name]) continue;
    const img = await loadImage(readFileSync(renders[name]));
    const b = solidBox(img);
    const k = hpx / b.h;
    const w = img.width * k, h = img.height * k;
    const left = cx - (b.x0 + b.w / 2) * k;
    const top = FLOOR + dy - (b.y1 * k);
    x.drawImage(img, left, top, w, h);
  }
  x.fillStyle = t['mark'];
  x.font = '22px Arial';
  x.fillText(`vaporwave ${scheme}: --field-top ${t['field-top']}  --field ${t['field']}  --field-raised ${t['field-raised']}  --field-foot ${t['field-foot']}  tile --rule ${t['rule']}`, 32, 44);
  x.fillText('stand-ins: holo form, marble spheres, fluted columns on stepped plinths, chrome orb (no bust mesh yet)', 32, 76);
  writeFileSync(join(OUT, `composite-${scheme}.png`), await c.encode('png'));
}

await main();
