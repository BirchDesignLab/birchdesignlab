/**
 * Offline handoff estimator for the live Venus bust (Tier 3 Stage 3, wave B2,
 * fix round 3, seat vw-fix-marble3). Written 09-26-26.
 *
 * The phone handoff (poster -> first live frame) changed 3.64% of the stage's
 * pixels at 390 px. The poster is a 2048 px render downsampled to 1024 and
 * then again by the browser to the canvas's device pixels; the live frame is
 * rendered straight at its drawing-buffer size (CSS px x the DPR cap) and
 * scaled by the compositor. This script reproduces both paths through the
 * SAME scene module (src/themes/vaporwave/marble/scene.js, served live, so an
 * edit to the shader is measured on the next run) and prints the share of
 * pixels whose summed RGB difference exceeds 24 (the critic's metric), for
 * several (device px, buffer px) pairs, over a dark and a light backdrop.
 * It is an estimator for iterating on the shader and the DPR cap without a
 * site build; the real numbers come from b2r3-vw-fix-marble3-probe.mjs.
 *
 * Usage: BDL_GPU=1 node scripts/themes/vaporwave/b2r3-vw-fix-marble3-aa.mjs [--port 4474] [--tag name]
 * Outputs: scripts/themes/.out/stage3-b2/vw-fix-marble3/aa-<tag>.jpg
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
const MARBLE_DIR = join(REPO, 'src', 'themes', 'vaporwave', 'marble');
const OUT = join(REPO, 'scripts', 'themes', '.out', 'stage3-b2', 'vw-fix-marble3');
mkdirSync(OUT, { recursive: true });
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i === -1 ? d : argv[i + 1]; };
const PORT = Number(arg('port', '4474'));
const TAG = arg('tag', 'run');
if (process.env.BDL_GPU !== '1') { console.error('set BDL_GPU=1'); process.exit(1); }

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.glb': 'model/gltf-binary' };
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const [root, rel] = path.startsWith('/three/') ? [THREE_DIR, path.slice(7)]
    : path.startsWith('/marble/') ? [MARBLE_DIR, path.slice(8)] : [HERE, path.slice(1)];
  const file = normalize(join(root, rel));
  if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
  res.end(readFileSync(file));
});
await new Promise((ok) => server.listen(PORT, '127.0.0.1', ok));

/** render-venus.mjs's halving downscale (the poster's own path to 1024). */
function halve(img, size) {
  let src = img; let w = img.width;
  while (w / 2 >= size) {
    const c = createCanvas(w / 2, w / 2); const x = c.getContext('2d');
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.drawImage(src, 0, 0, w / 2, w / 2); src = c; w /= 2;
  }
  if (w !== size) { const c = createCanvas(size, size); const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, size, size); src = c; }
  return src;
}
function over(src, size, bg) {
  const c = createCanvas(size, size); const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, size, size);
  x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
  x.drawImage(src, 0, 0, size, size);
  return c;
}
function share(a, b) {
  const A = a.getContext('2d').getImageData(0, 0, a.width, a.height).data;
  const B = b.getContext('2d').getImageData(0, 0, b.width, b.height).data;
  let n = 0;
  for (let i = 0; i < A.length; i += 4) if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) > 24) n++;
  return n / (a.width * a.height);
}

async function heat(a, b) {
  const A = a.getContext('2d').getImageData(0, 0, a.width, a.height);
  const B = b.getContext('2d').getImageData(0, 0, b.width, b.height).data;
  const c = createCanvas(a.width * 3, a.height); const x = c.getContext('2d');
  const o = x.createImageData(a.width, a.height);
  for (let i = 0; i < A.data.length; i += 4) {
    const d = Math.abs(A.data[i] - B[i]) + Math.abs(A.data[i + 1] - B[i + 1]) + Math.abs(A.data[i + 2] - B[i + 2]);
    const g = (A.data[i] + A.data[i + 1] + A.data[i + 2]) / 6 + 100;
    o.data[i] = d > 24 ? 255 : g; o.data[i + 1] = d > 24 ? 0 : g; o.data[i + 2] = d > 24 ? 0 : g; o.data[i + 3] = 255;
  }
  x.drawImage(a, 0, 0); x.drawImage(b, a.width, 0); x.putImageData(o, a.width * 2, 0);
  return c.encode('png');
}
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: { width: 800, height: 800 } });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(`  [page ${m.type()}] ${m.text()}`); });
  await page.goto(`http://127.0.0.1:${PORT}/marble-scene.html`);
  await page.waitForFunction(() => window.marble?.ready, null, { timeout: 30000 });
  const info = await page.evaluate(() => window.marble.info());
  console.log('renderer:', info.renderer);
  if (/swiftshader|llvmpipe/i.test(info.renderer)) throw new Error('software renderer');
  const pose = { prop: 'venus', tint: 'white', quality: 'live', yaw: 0.28, elevation: 0.16, pad: 1.08 };
  const png = async (size, supersample = false) => loadImage(Buffer.from((await page.evaluate((o) => window.marble.render(o), { ...pose, size, supersample })).split(',')[1], 'base64'));
  const poster1024 = halve(await png(2048), 1024);
  // [label, device px of the canvas, drawing-buffer px]
  // A fourth field, when present, renders the live frame at that size and
  // downsamples it to the buffer first (supersampling inside the buffer).
  const cases = [
    ['390 ss2 into 166', 222, 166, 332], ['820 ss2 into 207', 276, 207, 414],
    ['390 GPU ss 166', 222, 166, 'gpu'], ['820 GPU ss 207', 276, 207, 'gpu'], ['desktop GPU ss', 218, 218, 'gpu'],
    ['390 dpr2, cap1.25', 222, 138], ['390 dpr2, cap1.5', 222, 166], ['390 dpr2, full', 222, 222],
    ['820 dpr2, cap1.25', 276, 172], ['820 dpr2, cap1.5', 276, 207],
    ['desktop dpr1', 218, 218],
  ];
  const rows = [];
  const cols = [];
  for (const [label, D, Bpx, SS] of cases) {
    const live = SS === 'gpu' ? await png(Bpx, true) : SS ? halve(await png(SS), Bpx) : await png(Bpx);
    const r = { label, D, B: Bpx };
    for (const [scheme, bg] of [['dark', '#2b1850'], ['light', '#f3d9ef']]) {
      const p = over(poster1024, D, bg); const l = over(live, D, bg);
      r[scheme] = share(p, l);
      if (scheme === 'dark') cols.push([label, p, l]);
      if (scheme === 'dark') writeFileSync(join(OUT, `aa-${TAG}-heat-${label.replace(/[^a-z0-9]+/gi, '_')}.png`), await heat(p, l));
    }
    rows.push(r);
    console.log(`${label.padEnd(20)} D${D} B${Bpx}  dark ${(r.dark * 100).toFixed(2)}%  light ${(r.light * 100).toFixed(2)}%`);
  }
  // Sheet: poster over live for each case, enlarged x2 nearest.
  const W = 280 * 2; const sheet = createCanvas(cols.length * (W + 10) + 10, W * 2 + 80);
  const sx = sheet.getContext('2d'); sx.fillStyle = '#fff'; sx.fillRect(0, 0, sheet.width, sheet.height);
  sx.imageSmoothingEnabled = false; sx.font = 'bold 20px sans-serif'; sx.fillStyle = '#111';
  cols.forEach(([label, p, l], i) => {
    const x = 10 + i * (W + 10);
    sx.fillText(label, x, 26);
    sx.drawImage(p, x, 40, p.width * 2, p.height * 2);
    sx.drawImage(l, x, 50 + W, l.width * 2, l.height * 2);
  });
  writeFileSync(join(OUT, `aa-${TAG}.jpg`), await sheet.encode('jpeg', 92));
  writeFileSync(join(OUT, `aa-${TAG}.json`), JSON.stringify(rows, null, 1));
} finally {
  await browser.close();
  server.close();
}
