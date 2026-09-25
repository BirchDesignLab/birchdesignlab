/**
 * Fix round 2 verification for the seam-tear-step-lottery blocker (fx.ts):
 * proves the two-draw latch, not just that a seam draws somewhere near each
 * wrap. Instruments the real WebGL calls (getUniformLocation + uniform1f +
 * drawArrays, tagged by uniform name, the b1-recritic.mjs pattern) over two
 * SEPARATE page loads, each long enough for at least 5 wraps of the 6.4s
 * cycle, and asserts for every wrap: the draw at the wrap itself carries
 * SEAM_OFFSET_1 (0.16) and the very next draw carries SEAM_OFFSET_2 (-0.06) -
 * whatever cyclePos either draw happens to land on, whatever the frame rate.
 * The round 1 fix picked the offset from cyclePos, which meant a whole
 * session's worth of wraps could draw only one of the two offsets, depending
 * on where rAF's phase happened to fall relative to the cycle's own start;
 * that is exactly the failure this re-runs across two independent loads (two
 * independent rAF phases) to catch.
 *
 * Usage: BDL_GPU=1 node scripts/themes/vaporwave/verify-seam-latch.mjs
 *   [--base <url>] [--seconds 40] [--loads 2]
 * Output: scripts/themes/.out/b1-vw-ver2/seam-latch.json, exit 1 on any
 * wrap that fails the "0.16 then -0.06" check.
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'b1-vw-ver2');
const arg = (n, f) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : f; };
const BASE = arg('base', process.env.SNAP_BASE || 'http://127.0.0.1:4472');
const SECONDS = Number(arg('seconds', '40'));
const LOADS = Number(arg('loads', '2'));
const CYCLE = 6.4;
const SEAM_OFFSET_1 = 0.16;
const SEAM_OFFSET_2 = -0.06;
const EPS = 0.001;

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });

async function oneLoad(loadIndex) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, colorScheme: 'dark' });
  await ctx.addInitScript(() => {
    window.__log = [];
    const proto = WebGLRenderingContext.prototype;
    const gul = proto.getUniformLocation;
    proto.getUniformLocation = function (prog, name) {
      const loc = gul.call(this, prog, name);
      if (loc) loc.__name = name;
      return loc;
    };
    const origUniform1f = proto.uniform1f;
    proto.uniform1f = function (loc, v) {
      if (loc && loc.__name) (window.__cur ||= {})[loc.__name] = v;
      return origUniform1f.call(this, loc, v);
    };
    const origDraw = proto.drawArrays;
    proto.drawArrays = function (...a) {
      if (this.canvas && this.canvas.hasAttribute && this.canvas.hasAttribute('data-vw-horizon')) {
        window.__log.push({ t: performance.now(), ...(window.__cur || {}) });
      }
      return origDraw.apply(this, a);
    };
  });
  const page = await ctx.newPage();

  const renderer = await page.evaluate(() => {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl');
    const e = gl && gl.getExtension('WEBGL_debug_renderer_info');
    return gl ? (e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) : 'no webgl';
  });
  if (/swiftshader|llvmpipe/i.test(renderer)) {
    console.error(`load ${loadIndex}: GPU check failed:`, renderer);
    await ctx.close();
    process.exitCode = 4;
    return null;
  }

  await page.goto(BASE + '/t/vaporwave/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(SECONDS * 1000);

  const log = await page.evaluate(() => window.__log);
  await ctx.close();

  // uStripe/0.06 tracks cyclePos 1:1 (fx.ts: uStripe = (cyclePos*0.06)%1),
  // same trick b1-recritic.mjs uses, since uSeam alone can't distinguish "no
  // seam because holding at 0" from "no seam because not yet instrumented".
  const cps = log.filter((d) => d.uStripe != null && d.uSeam != null).map((d) => ({ t: d.t, cp: d.uStripe / 0.06, seam: d.uSeam }));
  const wraps = [];
  for (let i = 1; i < cps.length; i++) {
    if (cps[i].cp < cps[i - 1].cp - 0.001) {
      wraps.push({
        i,
        wrapSeam: cps[i].seam,
        nextSeam: cps[i + 1] ? cps[i + 1].seam : null,
        thirdSeam: cps[i + 2] ? cps[i + 2].seam : null,
        wrapCp: cps[i].cp,
      });
    }
  }
  const ok = wraps.every((w) =>
    Math.abs(w.wrapSeam - SEAM_OFFSET_1) < EPS &&
    w.nextSeam != null && Math.abs(w.nextSeam - SEAM_OFFSET_2) < EPS &&
    (w.thirdSeam == null || Math.abs(w.thirdSeam) < EPS),
  );
  return { loadIndex, renderer, draws: cps.length, wraps, wrapCount: wraps.length, allWrapsCorrect: ok };
}

const results = [];
for (let i = 0; i < LOADS; i++) {
  const r = await oneLoad(i);
  if (r) results.push(r);
}
await browser.close();

const allCorrect = results.length === LOADS && results.every((r) => r.allWrapsCorrect && r.wrapCount >= 5);
const totalWraps = results.reduce((a, r) => a + r.wrapCount, 0);
const summary = { base: BASE, seconds: SECONDS, loads: LOADS, totalWraps, allCorrect, results };
console.log(JSON.stringify({ totalWraps, allCorrect, perLoad: results.map((r) => ({ loadIndex: r.loadIndex, wrapCount: r.wrapCount, allWrapsCorrect: r.allWrapsCorrect })) }, null, 2));
await writeFile(join(OUT, 'seam-latch.json'), JSON.stringify(summary, null, 2));
if (!allCorrect) {
  console.error('FAIL: not every wrap in every load drew 0.16 then -0.06 (see seam-latch.json), or fewer than 5 wraps in some load');
  process.exitCode = 1;
}
