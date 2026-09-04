/**
 * Regression tests for the two determinism guards in lib/capture.mjs.
 *
 * Both guards were found by measurement, and both fail SILENTLY when removed —
 * the render still succeeds, the file still verifies, and the frames are simply
 * different every time. Nothing downstream would attribute that to either
 * cause. So each one gets a test that proves removing it actually reintroduces
 * the drift, rather than a comment asserting that it would.
 *
 *   1. clock.pauseAt   `clock.install()` alone leaves the clock ticking with
 *                      real time. Without the pause, load time leaks into the
 *                      scene's own clock and frame 0 lands at a different point
 *                      in the 20s breath on every run.
 * WHAT IS AND IS NOT ASSERTED HERE, and why
 * -----------------------------------------
 * Only clock.pauseAt is asserted, because it is the only guard that fails
 * reliably on demand: disabled, it reproduces ~32-38dB of drift every time.
 *
 * Three other guards exist and are NOT asserted:
 *
 *   - the harness performance.now pin. page.clock fakes performance.now with
 *     about a millisecond of slop, and stage.ts seeds the firefly scatter with
 *     `(performance.now() | 0) % 100000` — so that slop can become an entirely
 *     different PRNG seed and start the flock somewhere else. It DOES happen:
 *     the determinism probe reproduced it at 37.7dB. But it only triggers when
 *     something perturbs real timing enough to push the truncation across an
 *     integer, and the probe's own instrumentation (a stack capture on every
 *     Math.random call) was what did the perturbing. A clean 6-frame run does
 *     not reliably cross it.
 *   - capture()'s waitForNetworkQuiet, and the harness's image-decode gate.
 *     Both WERE demonstrable before the performance.now pin — disabling
 *     network-quiet alone used to reproduce ~32dB. With the scatter seed
 *     pinned, disabling both together no longer moves a frame past the
 *     threshold.
 *
 * All three stay. The races they close are real and were measured; they are
 * cheap; and the page captures against /lab/bdl-005 run without a harness and
 * so have no decode gate of their own. A guard that cannot currently be shown
 * to matter is not the same as a guard that does not matter — but asserting
 * one that only fails sometimes would put a permanent flake in this suite,
 * which is worse than documenting it here.
 *
 * Each case renders a few frames twice and asks whether the two runs match.
 * The guard is working when ON is identical and OFF is not.
 *
 * Needs the dev server. ~4 short captures, about a minute.
 *
 *   node scripts/selftest-capture.mjs
 */
import { mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { capture } from '../lib/capture.mjs';
import { psnr } from '../lib/ffmpeg.mjs';
import { frameName } from '../lib/frames.mjs';
import { harnessUrl, requireDevServer } from '../lib/devserver.mjs';
import { CAPTURE, FPS, TIME_SCALE, settleFramesFor } from '../render/framing.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SOCIAL_DIR = path.resolve(HERE, '..');
const WORK = path.join(SOCIAL_DIR, 'out', '.selftest-capture');

const FRAMES = 6;

async function runOnce(label, opts, urlParams = {}) {
  const framesDir = path.join(WORK, label);
  await capture({
    url: harnessUrl('bdl-007.html', { variant: 'A', framing: 'SQ', ...urlParams }),
    viewport: CAPTURE.SQ,
    deviceScaleFactor: CAPTURE.deviceScaleFactor,
    fps: FPS,
    timeScale: TIME_SCALE,
    seconds: FRAMES / FPS,
    settleFrames: settleFramesFor(FPS, TIME_SCALE),
    framesDir,
    readyFlag: '__BDL_MODEL',
    stageFn: '__BDL_STAGE',
    readyTimeoutMs: 60_000,
    loop: false,
    ...opts,
  });
  return framesDir;
}

/**
 * Bit-identity is NOT achieved, and chasing it further is not worth it. Measured
 * over repeated runs of the identical configuration, the pipeline lands in one
 * of two stable regimes: every frame pair at 83.1dB, or every frame pair at
 * 56.4dB. Uniform across frames and constant within a run, which is the
 * signature of a discrete state difference — the bump textures being uploaded
 * to the GPU before or after the first kept frame — not of accumulating drift.
 *
 * Both regimes are far below what survives an H.264 CRF 18 encode, so neither
 * is visible in a deliverable. What matters is the difference in KIND: real
 * scene drift (a firefly in the wrong place, the breath at the wrong phase)
 * shows up in the 30-40dB range, well under this threshold. That is the
 * distinction this number is drawing.
 */
const VISUALLY_IDENTICAL_DB = 50;

/** Render twice with the same options; report how many frames matched. */
async function pairIdentical(name, opts, urlParams) {
  const a = await runOnce(`${name}-a`, opts, urlParams);
  const b = await runOnce(`${name}-b`, opts, urlParams);
  let same = 0;
  let worst = Infinity;
  for (let i = 0; i < FRAMES; i++) {
    const p = await psnr(path.join(a, frameName(i)), path.join(b, frameName(i)));
    if (p >= VISUALLY_IDENTICAL_DB) same++;
    else worst = Math.min(worst, p);
  }
  return { identical: same, worst };
}

async function main() {
  await requireDevServer();
  await rm(WORK, { recursive: true, force: true });
  await mkdir(WORK, { recursive: true });

  console.log(`capture regression tests: ${FRAMES} frames, each case rendered twice\n`);

  const cases = [
    {
      name: 'clock-pause-ON',
      guard: 'clock.pauseAt',
      expect: 'identical',
      opts: {},
    },
    {
      name: 'clock-pause-OFF',
      guard: 'clock.pauseAt',
      expect: 'differs',
      opts: { __unsafeSkipClockPause: true },
    },
  ];

  const results = [];
  for (const c of cases) {
    process.stdout.write(`  ${c.name.padEnd(20)} `);
    const { identical, worst } = await pairIdentical(c.name, c.opts, c.urlParams);
    const allSame = identical === FRAMES;
    const pass = c.expect === 'identical' ? allSame : !allSame;
    results.push({ ...c, identical, worst, pass });
    console.log(
      `${identical}/${FRAMES} identical` +
        (allSame ? '' : `, worst ${worst.toFixed(1)}dB`) +
        `  -> expected ${c.expect}: ${pass ? 'PASS' : 'FAIL'}`
    );
  }

  console.log('');
  for (const r of results) {
    if (r.pass) continue;
    if (r.expect === 'differs') {
      console.log(
        `  FAIL ${r.name}: disabling ${r.guard} did NOT reintroduce drift.\n` +
          `       Either the guard is no longer load-bearing, or the scene changed.\n` +
          `       Do not delete the guard on the strength of this — find out which.`
      );
    } else {
      console.log(`  FAIL ${r.name}: the pipeline is not deterministic even with ${r.guard} on.`);
    }
  }

  console.log('not asserted (see the header): the performance.now pin,');
  console.log('waitForNetworkQuiet, and the image-decode gate. All three close');
  console.log('races that were measured; none fails reliably enough on demand');
  console.log('to assert without putting a flake in this suite.');

  const pass = results.every((r) => r.pass);
  console.log(`\n${pass ? 'capture regressions passed.' : 'capture regressions FAILED.'}`);
  process.exit(pass ? 0 : 1);
}

await main();
