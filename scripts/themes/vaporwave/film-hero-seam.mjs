/**
 * Film the Home hero's WebGL grid for a full loop cycle plus change, so the
 * F4(b) restart seam (fx.ts, CYCLE = 6.4s) can be looked at directly instead
 * of guessed at from a 3s clip (motion.mjs's `fx` scenario is too short to
 * show even one restart).
 *
 * Written 09-25-26, Tier 3 stage 3 Tier B, vw-2 (the system). Records real
 * video via Playwright (Chromium, GPU by default with BDL_GPU=1) at a fixed
 * frame rate, then hands the raw video to the system ffmpeg for frame
 * extraction (never Playwright's own frame stepping, which is lower
 * fidelity), per the house rule on founder-sheet frames.
 *
 * Usage:
 *   BDL_GPU=1 node scripts/themes/vaporwave/film-hero-seam.mjs --base <url> \
 *     [--scheme dark|light] [--out <dir>] [--seconds 8]
 * Output: <out>/hero-seam.webm plus frame__<t>s.png at 0, 3, 6.2, 6.3, 6.4,
 *   6.5, 6.6, 7 seconds (the seam falls in the first two 60Hz frames after
 *   6.4s of the hero's own clock, which starts close to navigation, not
 *   wall-clock zero, so the window is sampled generously either side).
 */
import { chromium } from 'playwright';
import { mkdir, readdir, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (n, f) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : f; };
const BASE = arg('base', process.env.SNAP_BASE || 'http://127.0.0.1:4472');
const SCHEME = arg('scheme', 'dark');
const OUT = arg('out', join(HERE, '..', '.out', 'stage3-b1', 'vaporwave-strips', 'hero-seam'));
const SECONDS = Number(arg('seconds', '8'));
const TIMES = [0, 3, 6.2, 6.3, 6.4, 6.5, 6.6, 7];

await mkdir(OUT, { recursive: true });

const useGpu = process.env.BDL_GPU === '1';
const browser = await chromium.launch({
  args: ['--hide-scrollbars', ...(useGpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : [])],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: OUT, size: { width: 1280, height: 720 } },
});
const page = await context.newPage();

const check = await page.evaluate(() => {
  const gl = document.createElement('canvas').getContext('webgl');
  const e = gl && gl.getExtension('WEBGL_debug_renderer_info');
  return gl ? (e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) : 'no webgl';
});
console.log('renderer:', check);
if (useGpu && /swiftshader|llvmpipe/i.test(check)) { await browser.close(); process.exit(4); }

await page.addInitScript((scheme) => {
  try { localStorage.setItem('scheme', scheme); } catch {}
}, SCHEME);
await page.goto(`${BASE}/t/vaporwave/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(400); // let the shader link and the first frame settle
const started = Date.now();
await page.waitForTimeout(SECONDS * 1000 - (Date.now() - started));

const videoPath = await page.video().path();
await context.close();
await browser.close();
console.log('video:', videoPath);

for (const t of TIMES) {
  const out = join(OUT, `frame__${t}s.png`);
  execFileSync('ffmpeg', ['-y', '-ss', String(t), '-i', videoPath, '-frames:v', '1', out], { stdio: 'inherit' });
}
const files = (await readdir(OUT)).filter((f) => f.startsWith('frame__'));
console.log(`${files.length} frames -> ${OUT}`);
