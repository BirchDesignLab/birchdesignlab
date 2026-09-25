/**
 * Sonnet-fixer verification for the seam-throttle blocker (fx.ts): confirms
 * the throttle now draws close to 30fps (not ~20fps) and that the F4(b)
 * restart seam fires on every cycle, not just 3 of 5, by instrumenting the
 * real WebGL calls instead of reading video frames (uSeam's on-screen
 * displacement is too subtle to eyeball in a still).
 *
 * Method: before the page's own scripts run, wrap
 * WebGLRenderingContext.prototype.{uniform1f, drawArrays} to record every
 * call's timestamp; uniform1f calls are matched against fx.ts's own
 * SEAM_OFFSET_1/2 constants (0.16, -0.06) to find seam-carrying draws
 * without needing to know which uniform location is uSeam.
 *
 * Usage: BDL_GPU=1 node scripts/themes/vaporwave/verify-seam-throttle.mjs
 *   [--base <url>] [--seconds 33]
 * Output: scripts/themes/.out/b1-vw-ver/seam-throttle.json
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'b1-vw-ver');
const arg = (n, f) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : f; };
const BASE = arg('base', process.env.SNAP_BASE || 'http://127.0.0.1:4473');
const SECONDS = Number(arg('seconds', '33'));
const CYCLE = 6.4;
const SEAM_OFFSET_1 = 0.16;
const SEAM_OFFSET_2 = -0.06;
const EPS = 0.001;

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

await page.addInitScript(() => {
  window.__draws = [];
  window.__seams = [];
  const proto = WebGLRenderingContext.prototype;
  const origUniform1f = proto.uniform1f;
  proto.uniform1f = function (loc, v) {
    if (v === 0.16 || v === -0.06) window.__seams.push({ t: performance.now(), v });
    return origUniform1f.call(this, loc, v);
  };
  const origDraw = proto.drawArrays;
  proto.drawArrays = function (...a) {
    window.__draws.push(performance.now());
    return origDraw.apply(this, a);
  };
});

const renderer = await page.evaluate(() => {
  const c = document.createElement('canvas');
  const gl = c.getContext('webgl');
  const e = gl && gl.getExtension('WEBGL_debug_renderer_info');
  return gl ? (e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) : 'no webgl';
});
if (/swiftshader|llvmpipe/i.test(renderer)) {
  console.error('GPU check failed:', renderer);
  await browser.close();
  process.exit(4);
}

await page.goto(BASE + '/t/vaporwave/', { waitUntil: 'networkidle' });
await page.waitForTimeout(SECONDS * 1000);

const { draws, seams } = await page.evaluate(() => ({ draws: window.__draws, seams: window.__seams }));
await browser.close();

const gaps = draws.slice(1).map((t, i) => t - draws[i]).sort((a, b) => a - b);
const median = gaps[Math.floor(gaps.length / 2)];
const p90 = gaps[Math.floor(gaps.length * 0.9)];
const cyclesElapsed = Math.floor((SECONDS * 1000) / (CYCLE * 1000));
// A "cycle with a seam" = at least one seam-value draw inside any given
// CYCLE-length wall-clock window measured from the first draw.
const t0 = draws[0] ?? 0;
const seamCycles = new Set(seams.map((s) => Math.floor((s.t - t0) / (CYCLE * 1000))));

const result = {
  renderer,
  seconds: SECONDS,
  drawCount: draws.length,
  fps: (draws.length / (SECONDS)).toFixed(1),
  medianGapMs: median?.toFixed(1),
  p90GapMs: p90?.toFixed(1),
  cyclesElapsed,
  seamEventCount: seams.length,
  seamValuesSeen: [...new Set(seams.map((s) => s.v))],
  cyclesWithASeam: seamCycles.size,
  seamHitRate: `${seamCycles.size}/${cyclesElapsed}`,
};
console.log(JSON.stringify(result, null, 2));
await writeFile(join(OUT, 'seam-throttle.json'), JSON.stringify(result, null, 2));
