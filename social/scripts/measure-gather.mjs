/**
 * Derive the settle length from the fireflies themselves.
 *
 * The flock is the only thing in this scene that cannot close a loop while it
 * is wandering: it integrates its motion, so it never returns to where it
 * started. The scene's own answer is gather — leave the mark alone for
 * GATHER_AFTER_MS and the flies stop wandering, seek fixed sampled points on
 * the moss, and hover. A take that starts from that state closes by
 * construction, with no dissolve and no change to src/.
 *
 * This measures when that has actually happened, rather than picking a number.
 * It steps the fake clock and reads the flock's real positions each frame —
 * captured straight off the GPU buffer upload by the harness, because pixels
 * cannot see 40 dots against a breathing mark — and reports where the
 * frame-to-frame displacement flattens.
 *
 * No screenshots are taken, so this is far cheaper than a render.
 *
 *   node scripts/measure-gather.mjs [--frames 1400] [--variant A]
 */
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { capture } from '../lib/capture.mjs';
import { requireDevServer, harnessUrl } from '../lib/devserver.mjs';
import { CAPTURE, FPS, GATHER_AFTER_S, TIME_SCALE } from '../render/framing.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SOCIAL_DIR = path.resolve(HERE, '..');
const WORK = path.join(SOCIAL_DIR, 'out', '.gather');

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const FRAMES = Number(arg('frames', '1400'));
const VARIANT = arg('variant', 'A').toUpperCase();

/** Mean per-fly displacement between two position snapshots, in scene units. */
function meanStep(a, b) {
  if (!a || !b || a.length !== b.length) return null;
  let total = 0;
  const n = a.length / 3;
  for (let i = 0; i < n; i++) {
    const dx = b[i * 3] - a[i * 3];
    const dy = b[i * 3 + 1] - a[i * 3 + 1];
    const dz = b[i * 3 + 2] - a[i * 3 + 2];
    total += Math.hypot(dx, dy, dz);
  }
  return total / n;
}

/**
 * Where the curve flattens: the first frame after which the displacement stays
 * within `tol` of the quiet floor and never climbs back out of it. Requiring it
 * to STAY there matters — the flock crosses the floor on the way down.
 */
function findQuiet(series, tol = 1.4) {
  const tail = series.slice(Math.floor(series.length * 0.8)).map((s) => s.step);
  const sorted = [...tail].sort((a, b) => a - b);
  const floor = sorted[Math.floor(sorted.length / 2)] || 0;
  for (let i = 0; i < series.length; i++) {
    if (series.slice(i).every((s) => s.step <= floor * tol + 1e-9)) {
      return { frame: series[i].frame, floor };
    }
  }
  return { frame: null, floor };
}

async function main() {
  await requireDevServer();
  await rm(WORK, { recursive: true, force: true });
  await mkdir(WORK, { recursive: true });

  const sceneSecondsPerFrame = TIME_SCALE / FPS;
  console.log(`gather probe: variant ${VARIANT}, ${FPS}fps x${TIME_SCALE}`);
  console.log(`${FRAMES} frames = ${(FRAMES * sceneSecondsPerFrame).toFixed(1)}s of scene time`);
  console.log(`gather engages at ${GATHER_AFTER_S}s scene time (frame ${Math.ceil(GATHER_AFTER_S / sceneSecondsPerFrame)})\n`);

  const series = [];
  let prev = null;

  await capture({
    url: harnessUrl('bdl-007.html', { variant: VARIANT, framing: 'SQ' }),
    viewport: CAPTURE.SQ,
    deviceScaleFactor: CAPTURE.deviceScaleFactor,
    fps: FPS,
    timeScale: TIME_SCALE,
    seconds: FRAMES / FPS,
    settleFrames: 0,
    framesDir: path.join(WORK, 'frames'),
    readyFlag: '__BDL_MODEL',
    stageFn: '__BDL_STAGE',
    readyTimeoutMs: 60_000,
    loop: false,
    keepFrames: [], // positions only; no screenshots at all
    onFrame: async (page, i) => {
      const flies = await page.evaluate(() => globalThis.__BDL_HARNESS?.flies ?? null);
      if (flies && prev) {
        const step = meanStep(prev, flies);
        if (step !== null) series.push({ frame: i, t: i * sceneSecondsPerFrame, step });
      }
      if (flies) prev = flies;
      if (i % 100 === 0) process.stdout.write(`\r  stepping ${i}/${FRAMES}`);
    },
  });
  process.stdout.write('\r                          \r');

  if (series.length === 0) {
    console.error('no firefly positions captured — the buffer hook did not fire.');
    process.exit(1);
  }

  const { frame, floor } = findQuiet(series);

  console.log('mean per-fly displacement per frame (scene units):\n');
  for (const s of series) {
    if (s.frame % 50 !== 0) continue;
    const bar = '#'.repeat(Math.min(70, Math.max(1, Math.round(s.step * 4000))));
    console.log(`  ${String(s.frame).padStart(4)}  ${s.t.toFixed(1).padStart(5)}s  ${s.step.toFixed(5)}  ${bar}`);
  }

  console.log(`\n  quiet floor: ${floor.toFixed(5)} units/frame`);
  if (frame === null) {
    console.log(`  NOT SETTLED within ${FRAMES} frames.`);
    process.exit(2);
  }

  const margin = 1.15;
  const settle = Math.ceil(frame * margin);
  console.log(`  flock goes quiet at frame ${frame} (${(frame * sceneSecondsPerFrame).toFixed(1)}s scene)`);
  console.log(`\n  SETTLE = ${settle} frames = ${(settle * sceneSecondsPerFrame).toFixed(1)}s scene time (measured + 15%)`);

  // Is the gathered state actually still alive, or has it gone dead still?
  const last = series[series.length - 1].step;
  console.log(`\n  residual motion once gathered: ${last.toFixed(5)} units/frame`);
  console.log(
    last < 1e-4
      ? '  WARNING: the flock is essentially motionless — the loop would be clean but dead.'
      : '  the flock still drifts, so the gathered state is alive rather than frozen.'
  );

  await writeFile(
    path.join(WORK, 'series.json'),
    `${JSON.stringify({ fps: FPS, timeScale: TIME_SCALE, quietAt: frame, settle, floor, series }, null, 2)}\n`,
    'utf8'
  );
}

await main();
