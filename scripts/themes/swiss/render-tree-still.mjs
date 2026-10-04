/**
 * Stage 4 B1 task 3 (swiss D1): re-render the Shining Tree large, from the
 * live BDL-007 scene, on the GPU.
 *
 * The committed src/experiments/bdl-007/still.png is 592x963, too soft for a
 * full-bleed field on a 2x phone. This loads the built Lab page for BDL-007,
 * stretches the stage to 2400 css px tall at devicePixelRatio 1.5 (the stage
 * caps its pixel ratio at 1.5), hides everything but the WebGL canvas, and
 * screenshots the canvas with a transparent background. The pedestal is then
 * cleared and the mark cropped by the same rules as scripts/lab/prepare-still.mjs.
 *
 *   BDL_GPU=1 node scripts/themes/swiss/render-tree-still.mjs [snapDir]
 *
 * snapDir defaults to scripts/themes/.out/snap-stage4-base (a frozen build).
 * Output: scripts/themes/.out/stage4/tree-raw.png (the canvas) and
 * scripts/themes/swiss/tree-still-large.png (cleared and cropped, committed
 * input for make-field-image.mjs). The renderer string is printed and written
 * to scripts/themes/.out/stage4/tree-renderer.txt. Exits 2 on a software
 * renderer.
 */
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveDist } from '../lib/serve-dist.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const OUT = join(REPO, 'scripts', 'themes', '.out', 'stage4');
const snap = process.argv[2] ? join(REPO, process.argv[2]) : join(REPO, 'scripts', 'themes', '.out', 'snap-stage4-base');
const PORT = 4460;
// Arrow presses from yaw 0 for the shipped still: a three-quarter view like the
// proof's still.png, which the founder approved (10-03-26); picked from a sweep.
const DEFAULT_YAW = -5;
await mkdir(OUT, { recursive: true });

if (process.env.BDL_GPU !== '1') { console.error('BDL_GPU=1 is required'); process.exit(2); }

const server = await serveDist(PORT, snap);
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
try {
  const context = await browser.newContext({ viewport: { width: 1400, height: 2400 }, deviceScaleFactor: 1.5 });
  const page = await context.newPage();
  const renderer = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl');
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'no webgl';
  });
  console.log(`renderer: ${renderer}`);
  await writeFile(join(OUT, 'tree-renderer.txt'), renderer + '\n');
  if (/swiftshader|llvmpipe|software|no webgl/i.test(renderer)) { console.error('software renderer: aborting'); process.exit(2); }

  await page.goto(`http://127.0.0.1:${PORT}/lab/bdl-007/`, { waitUntil: 'load' });
  await page.addStyleTag({ content: `
    html, body { background: transparent !important; }
    body * { visibility: hidden !important; }
    .stage { height: 2400px !important; background: transparent !important; visibility: visible !important; }
    canvas.scene { visibility: visible !important; opacity: 1 !important; }` });
  await page.evaluate(() => document.querySelector('[data-stage]').scrollIntoView());
  await page.waitForSelector('.stage.is-live', { timeout: 60000 });
  await page.waitForTimeout(2500);
  // The scene idles through a slow turn, so the angle depended on timing (the
  // first large render came out front-on). Take keyboard control instead:
  // Home eases the model back to yaw 0, then each arrow press turns it 0.12
  // rad and stops the idle turn, so the angle is fixed and repeatable.
  // TREE_YAW (presses, negative turns left) picks the angle; TREE_SWEEP
  // ("-8,-4,0,4,8") writes one raw capture per value and stops, for choosing.
  const canvas = page.locator('canvas.scene');
  const turnTo = async (presses) => {
    await canvas.focus();
    await page.keyboard.press('Home');
    await page.waitForTimeout(2500);
    for (let k = 0; k < Math.abs(presses); k++) await page.keyboard.press(presses < 0 ? 'ArrowLeft' : 'ArrowRight');
    await page.waitForTimeout(1500);
  };
  if (process.env.TREE_SWEEP) {
    for (const v of process.env.TREE_SWEEP.split(',').map(Number)) {
      await turnTo(v);
      await canvas.screenshot({ path: join(OUT, `tree-sweep__${v}.png`), omitBackground: true });
      console.log(`sweep ${v} written`);
    }
    process.exit(0);
  }
  await turnTo(Number(process.env.TREE_YAW ?? DEFAULT_YAW));
  const size = await page.evaluate(() => { const c = document.querySelector('canvas.scene'); return [c.width, c.height]; });
  console.log(`canvas ${size[0]}x${size[1]}`);
  const raw = join(OUT, 'tree-raw.png');
  await page.locator('canvas.scene').screenshot({ path: raw, omitBackground: true });

  // Clear the pedestal and crop, as scripts/lab/prepare-still.mjs does.
  const src = sharp(raw);
  const { width, height } = await src.metadata();
  const buf = await src.ensureAlpha().raw().toBuffer();
  const OPAQUE = 250, BLACKISH = 40;
  // 1. Clear the pedestal (partial alpha, no colour).
  for (let i = 0; i < width * height; i++) {
    const o = i * 4, a = buf[o + 3];
    if (a > 0 && a < OPAQUE && buf[o] < BLACKISH && buf[o + 1] < BLACKISH && buf[o + 2] < BLACKISH) buf[o + 3] = 0;
  }
  // 2. Keep the mark only: label the 8-connected pieces of non-transparent
  //    pixels and drop the small ones (the fireflies), which would be specks
  //    of paper on the red in the duotone.
  const label = new Int32Array(width * height);
  const areas = [0];
  const stack = new Int32Array(width * height);
  for (let start = 0; start < width * height; start++) {
    if (buf[start * 4 + 3] === 0 || label[start]) continue;
    const id = areas.length;
    let n = 0, sp = 0;
    stack[sp++] = start; label[start] = id;
    while (sp) {
      const i = stack[--sp]; n++;
      const x = i % width, y = (i - x) / width;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const j = ny * width + nx;
        if (!label[j] && buf[j * 4 + 3] > 0) { label[j] = id; stack[sp++] = j; }
      }
    }
    areas.push(n);
  }
  const biggest = Math.max(...areas);
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let i = 0; i < width * height; i++) {
    const id = label[i];
    if (!id) continue;
    if (areas[id] < biggest * 0.03) { buf[i * 4 + 3] = 0; continue; }
    const x = i % width, y = (i - x) / width;
    if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  console.log('pieces kept: ' + areas.filter((n) => n >= biggest * 0.03).length + ' of ' + (areas.length - 1));
  const boxW = maxX - minX + 1, boxH = maxY - minY + 1;
  const pad = Math.round(Math.max(boxW, boxH) * 0.04);
  const left = Math.max(0, minX - pad), top = Math.max(0, minY - pad);
  const cropW = Math.min(width - left, boxW + pad * 2), cropH = Math.min(height - top, boxH + pad * 2);
  const outFile = join(HERE, 'tree-still-large.png');
  const info = await sharp(buf, { raw: { width, height, channels: 4 } })
    .extract({ left, top, width: cropW, height: cropH })
    .png({ compressionLevel: 9 })
    .toFile(outFile);
  console.log(`content ${boxW}x${boxH} at ${minX},${minY}; written ${outFile} ${info.width}x${info.height} ${info.size} bytes`);
} finally {
  await browser.close();
  server.close();
}
