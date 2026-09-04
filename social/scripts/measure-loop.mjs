/**
 * Does the loop actually close? Measured at the seam, not argued from theory.
 *
 * For each candidate duration this captures frames 0, 1 and N — where N is one
 * full loop period after frame 0 — and reports:
 *
 *   seam      PSNR(frame N, frame 0). How close the wrap is to a match.
 *   adjacent  PSNR(frame 0, frame 1). The scene's own per-frame change, i.e.
 *             the bar the seam has to clear. A seam at or above this is
 *             invisible in motion; far below it is a jump.
 *
 * The clock still steps through every intermediate frame, so the scene evolves
 * exactly as it would in a real take; only the screenshots are skipped.
 *
 *   node scripts/measure-loop.mjs --durations 6.667,10,20
 *   node scripts/measure-loop.mjs --durations 8 --time-scale 2.5
 */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { capture } from '../lib/capture.mjs';
import { psnr } from '../lib/ffmpeg.mjs';
import { frameName } from '../lib/frames.mjs';
import { requireDevServer } from '../lib/devserver.mjs';
import { resolveRow } from '../render/framing.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SOCIAL_DIR = path.resolve(HERE, '..');
const WORK = path.join(SOCIAL_DIR, 'out', '.loopcheck');

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const DURATIONS = arg('durations', '6.667,10,20').split(',').map(Number);
const TIME_SCALE = Number(arg('time-scale', '1'));
const VARIANT = arg('variant', 'A').toUpperCase();
const FRAMING = arg('framing', 'SQ').toUpperCase();
const FPS = 30;
// From scripts/measure-scatter-decay.mjs, not from a guess.
const SETTLE = Number(arg('settle', TIME_SCALE >= 1.2 ? '17' : '60'));

async function measure(seconds) {
  const frameCount = Math.round(seconds * FPS);
  const framesDir = path.join(WORK, `d${seconds}-ts${TIME_SCALE}`);

  const row = resolveRow({
    id: 'LOOPCHECK', variant: VARIANT, kind: 'harness', framing: FRAMING,
    fps: FPS, seconds, settle: SETTLE, loop: true,
  });

  await capture({
    url: row.url,
    viewport: row.viewport,
    deviceScaleFactor: row.deviceScaleFactor,
    fps: FPS,
    timeScale: TIME_SCALE,
    seconds,
    settleFrames: SETTLE,
    framesDir,
    readyFlag: row.readyFlag ?? undefined,
    stageFn: row.stageFn ?? undefined,
    readyTimeoutMs: 60_000,
    loop: true,
    keepFrames: [0, 1, frameCount],
    onFrame:
      VARIANT === 'C'
        ? async (page, i, total) => { await page.evaluate((f) => globalThis.__BDL_ORBIT?.(f), i / total); }
        : undefined,
    onProgress: (i, t) => process.stdout.write(`\r    stepping ${i}/${t}`),
  });
  process.stdout.write('\r                              \r');

  const f0 = path.join(framesDir, frameName(0));
  const f1 = path.join(framesDir, frameName(1));
  const fN = path.join(framesDir, frameName(frameCount));

  return {
    seconds,
    frames: frameCount,
    sceneSeconds: +(seconds * TIME_SCALE).toFixed(3),
    breaths: +((seconds * TIME_SCALE) / 20).toFixed(4),
    seam: await psnr(fN, f0),
    adjacent: await psnr(f0, f1),
  };
}

const fmt = (v) => (v === Infinity ? 'identical' : `${v.toFixed(2)}dB`);

async function main() {
  await requireDevServer();
  await rm(WORK, { recursive: true, force: true });
  await mkdir(WORK, { recursive: true });

  console.log(`loop seam check: variant ${VARIANT} ${FRAMING}, timeScale ${TIME_SCALE}, settle ${SETTLE}`);
  console.log(`the 20s moss breath is the only strictly periodic motion in the scene\n`);

  const results = [];
  for (const seconds of DURATIONS) {
    console.log(`  ${seconds}s (${Math.round(seconds * FPS)} frames)...`);
    results.push(await measure(seconds));
  }

  console.log('\n  video s   scene s   breaths     seam      adjacent   verdict');
  console.log('  -------   -------   -------   ---------   ---------   -------');
  for (const r of results) {
    // A seam that clears the scene's own per-frame change is indistinguishable
    // from any other frame step. Anything well below it reads as a jump.
    const verdict = r.seam >= r.adjacent - 1 ? 'CLOSES' : r.seam > r.adjacent - 6 ? 'close' : 'JUMPS';
    console.log(
      `  ${String(r.seconds).padStart(7)}   ${String(r.sceneSeconds).padStart(7)}   ` +
        `${String(r.breaths).padStart(7)}   ${fmt(r.seam).padStart(9)}   ${fmt(r.adjacent).padStart(9)}   ${verdict}`
    );
  }

  await writeFile(
    path.join(WORK, `seams-ts${TIME_SCALE}.json`),
    `${JSON.stringify({ timeScale: TIME_SCALE, variant: VARIANT, framing: FRAMING, settle: SETTLE, results }, null, 2)}\n`,
    'utf8'
  );
  console.log(`\n  ${path.relative(SOCIAL_DIR, path.join(WORK, `seams-ts${TIME_SCALE}.json`))}`);
}

await main();
