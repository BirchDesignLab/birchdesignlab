/**
 * How long does the firefly scatter transient actually last?
 *
 * Why this is not a pixel measurement
 * -----------------------------------
 * Both obvious pixel metrics were tried on real captures and both are blind here:
 *
 *   - whole-frame PSNR / mean difference is dominated by the mark itself. The
 *     moss breath changes a large, bright area every frame; 40 dots a few pixels
 *     across do not move that average. Measured decay ratio over 4s: 1.38, and
 *     still falling — that is the breath, not the flock.
 *   - peak pixel difference saturates. One additive bright dot arriving on a
 *     near-black background pins the peak at ~155/255 whether the flock is
 *     exploding or idling.
 *
 * So measure the thing itself. src/experiments/bdl-007/fireflies.ts is pure,
 * seeded, and free of three.js and the DOM precisely so it can be held to
 * account without WebGL — this imports the shipped module and runs the shipped
 * dynamics. Node strips the type annotations natively.
 *
 * Method: two runs of the real model, identical in every way except that one
 * gets the scatter impulse the harness's idle-yaw tap causes. The transient is
 * over when the scattered flock's mean speed has come back down to the control's.
 *
 *   node scripts/measure-scatter-decay.mjs [--time-scale 1] [--fps 30]
 */
import { createFlies, scatter, stepFlies } from '../../src/experiments/bdl-007/fireflies.ts';

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const TIME_SCALE = Number(arg('time-scale', '1'));
const FPS = Number(arg('fps', '30'));

// Mirrors of the constants in stage.ts. If they drift there, this drifts here —
// which is why the numbers are printed rather than baked into the framing table.
const FLY_COUNT = 40;
const FLY_BOUNDS = 1.9;
const FLY_SEED = 20260818;
const SCATTER_STRENGTH = 0.8;

/**
 * The scene renders on its own 30fps ambient throttle, so at timeScale 1 only
 * about two thirds of captured frames trigger a step — measured directly off a
 * real capture: 83 rendered out of 119. Above timeScale ~1.2 every captured
 * frame clears the throttle and steps once.
 */
const RENDER_RATIO = TIME_SCALE >= 1.2 ? 1 : 83 / 119;

const meanSpeed = (flies) =>
  flies.reduce((sum, f) => sum + Math.hypot(f.vel[0], f.vel[1], f.vel[2]), 0) / flies.length;

function makeFlies() {
  return createFlies(FLY_COUNT, FLY_BOUNDS, FLY_SEED);
}

function main() {
  const control = makeFlies();
  const kicked = makeFlies();

  // The harness taps once the clock is already frozen, so the seed the scene
  // derives from performance.now() is a fixed number. Its exact value does not
  // change the decay rate — the impulse is the same magnitude in a random
  // direction per fly — so any fixed seed measures the same curve.
  scatter(kicked, SCATTER_STRENGTH, 12345);

  const sceneDt = TIME_SCALE / FPS;
  const opts = { mode: 'wander', dt: sceneDt, targets: [], bounds: FLY_BOUNDS };

  console.log(`scatter decay: timeScale ${TIME_SCALE}, ${FPS}fps, scene dt ${(sceneDt * 1000).toFixed(1)}ms`);
  console.log(`impulse ${SCATTER_STRENGTH}, ${FLY_COUNT} flies, seed ${FLY_SEED}\n`);
  console.log('  frame   scene s    kicked    control    excess');

  const rows = [];
  let convergedAt = null;

  for (let i = 0; i <= 400; i++) {
    const t = i * sceneDt;
    stepFlies(control, { ...opts, time: t });
    stepFlies(kicked, { ...opts, time: t });

    const c = meanSpeed(control);
    const k = meanSpeed(kicked);
    // How much faster the kicked flock still is, relative to the control's own
    // cruising speed. This is the visible part: flies that are moving wrong.
    const excess = c > 1e-9 ? (k - c) / c : 0;
    rows.push({ frame: i, t, kicked: k, control: c, excess });

    if (convergedAt === null && Math.abs(excess) < 0.05 && i > 0) convergedAt = i;

    if (i % 15 === 0 && i <= 240) {
      console.log(
        `  ${String(i).padStart(5)}   ${t.toFixed(2).padStart(7)}   ${k.toFixed(4)}    ${c.toFixed(4)}   ` +
          `${(excess * 100).toFixed(1).padStart(6)}%`
      );
    }
  }

  console.log('');
  if (convergedAt === null) {
    console.log('  never fell under 5% excess within 400 steps.');
    return;
  }

  const sceneSeconds = convergedAt * sceneDt;
  // Steps are RENDERS; captured frames are what the recorder counts. Below
  // timeScale ~1.2 the ambient throttle means not every captured frame renders,
  // so more captured frames are needed than steps.
  const capturedFrames = Math.ceil(convergedAt / RENDER_RATIO);

  console.log(`  excess speed under 5% after ${convergedAt} render steps`);
  console.log(`  = ${sceneSeconds.toFixed(2)}s of scene time`);
  console.log(`  = ${capturedFrames} captured frames at timeScale ${TIME_SCALE} (render ratio ${RENDER_RATIO.toFixed(2)})`);
  console.log(`  = ${(capturedFrames / FPS).toFixed(2)}s of video`);
  console.log(`\n  RECOMMENDED settleFrames: ${Math.ceil(capturedFrames * 1.15)} (measured + 15% headroom)`);

  const analytic = Math.log(1 / 0.05) / 2.0; // STEER = 2.0 in fireflies.ts
  console.log(`  (analytic check: velocity error decays as exp(-STEER*t), 5% at ${analytic.toFixed(2)}s)`);
}

main();
