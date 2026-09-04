/**
 * End-to-end self-test of encode + verify, with no browser and no dev server.
 *
 * Synthesises a frame sequence that is a known-good loop by construction —
 * colour is a periodic function of the frame index, with a period of exactly
 * `frames`, so frame N is bit-identical to frame 0 — then encodes it and runs
 * the real verifier over the result.
 *
 * The point is to be able to prove the encoder emits a spec-compliant file and
 * the seam logic reads it correctly, without waiting on a WebGL capture. If a
 * render run produces a file that fails verification, run this first: it says
 * whether the fault is in the pipeline or in the scene.
 *
 *   node scripts/selftest.mjs
 */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { encode } from '../lib/encode.mjs';
import { frameName } from '../lib/frames.mjs';
import { run } from '../lib/ffmpeg.mjs';
import { verifyFile } from '../lib/verify.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SOCIAL_DIR = path.resolve(HERE, '..');
const WORK = path.join(SOCIAL_DIR, 'out', '.selftest');

const FPS = 30;
const SECONDS = 2;
const FRAMES = FPS * SECONDS; // 60
const SIZE = 1080; // SQ

/**
 * Colour for frame i. Period is exactly FRAMES, so frame FRAMES === frame 0.
 * Amplitude is large enough that adjacent frames differ well below the
 * duplicate threshold — otherwise the seam check would read the whole thing as
 * a static scene and pass vacuously.
 */
function colorFor(i) {
  const t = (2 * Math.PI * i) / FRAMES;
  const ch = (phase) => Math.round(128 + 120 * Math.sin(t + phase));
  return [ch(0), ch((2 * Math.PI) / 3), ch((4 * Math.PI) / 3)];
}

function hex([r, g, b]) {
  return `0x${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

async function main() {
  await rm(WORK, { recursive: true, force: true });
  await mkdir(WORK, { recursive: true });

  const framesDir = path.join(WORK, 'frames');
  await mkdir(framesDir, { recursive: true });

  // FRAMES + 1 shots: index FRAMES is the seam probe the encoder will drop.
  process.stdout.write(`generating ${FRAMES + 1} frames at ${SIZE}x${SIZE}`);
  for (let i = 0; i <= FRAMES; i++) {
    await run('ffmpeg', [
      '-v', 'error', '-y',
      '-f', 'lavfi',
      '-i', `color=c=${hex(colorFor(i))}:s=${SIZE}x${SIZE}:d=1`,
      '-frames:v', '1',
      path.join(framesDir, frameName(i)),
    ]);
    if (i % 15 === 0) process.stdout.write('.');
  }
  process.stdout.write('\n');

  const outFile = path.join(WORK, 'SELFTEST-SQ.mp4');
  const enc = await encode({ framesDir, frameCount: FRAMES, outFile, fps: FPS, loop: true });

  console.log(
    `\nencoded ${enc.frames} frames, ${(enc.bytes / 1024).toFixed(0)} KB, ` +
      `seam probe ${enc.seamPsnr === Infinity ? 'identical' : `${enc.seamPsnr?.toFixed(1)}dB`}, ` +
      `duplicate dropped: ${enc.droppedDuplicate}`
  );

  const result = await verifyFile(outFile, { expectSeconds: SECONDS, fps: FPS, loop: true });

  console.log('');
  for (const c of result.checks) {
    console.log(`  ${c.pass ? 'ok  ' : 'FAIL'}  ${c.name}: ${c.detail}`);
  }

  // The construction guarantees the loop closes, so a seam failure here is a
  // bug in the pipeline, not in any scene.
  const expectations = [
    ['encoder dropped the duplicate frame', enc.droppedDuplicate === true],
    ['seam probe was identical to frame 0', enc.seamPsnr === Infinity],
    ['every verifier check passed', result.pass === true],
    [`file holds exactly ${FRAMES} frames`, result.frames === FRAMES],
  ];

  console.log('');
  let ok = true;
  for (const [label, pass] of expectations) {
    console.log(`  ${pass ? 'ok  ' : 'FAIL'}  ${label}`);
    if (!pass) ok = false;
  }

  await writeFile(
    path.join(WORK, 'result.json'),
    `${JSON.stringify({ encode: enc, verify: result }, null, 2)}\n`,
    'utf8'
  );

  console.log(`\nartifacts left in ${path.relative(SOCIAL_DIR, WORK)} for inspection.`);
  console.log(ok ? '\nselftest passed.' : '\nselftest FAILED.');
  process.exit(ok ? 0 : 1);
}

await main();
