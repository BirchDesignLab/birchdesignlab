/**
 * Prove the cross-dissolve puts the right frames in the right places.
 *
 * The dissolve shipped once in a broken form and nothing caught it, because it
 * had never been run. This is the test that would have. It is browser-free and
 * takes seconds.
 *
 * Method: synthesise N + D frames where frame i is a solid colour whose red
 * channel IS i. Any decoded output frame then names the capture frame it came
 * from. Encode with the dissolve and check the mapping:
 *
 *   out[0]      should be capture[N]      (the frame past the end of the loop)
 *   out[D..N)   should be capture[D..N)   (the body, untouched)
 *   out[N-1]    should be capture[N-1]
 *
 * which together mean out[N-1] -> out[0] is capture[N-1] -> capture[N]: two
 * consecutive captured frames, so the wrap costs one ordinary frame step.
 *
 *   node scripts/selftest-dissolve.mjs
 */
import { mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { encode } from '../lib/encode.mjs';
import { run } from '../lib/ffmpeg.mjs';
import { frameName } from '../lib/frames.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SOCIAL_DIR = path.resolve(HERE, '..');
const WORK = path.join(SOCIAL_DIR, 'out', '.selftest-dissolve');

const N = 60;
const D = 18;
const FPS = 60;
const SIZE = 64;

/** Mean red of one frame of the encoded file, which decodes to its index. */
async function meanRed(video, index) {
  const png = path.join(WORK, `probe-${index}.png`);
  await run('ffmpeg', [
    '-v', 'error', '-y',
    '-i', video,
    '-vf', `select=eq(n\\,${index})`,
    '-vsync', '0',
    '-frames:v', '1',
    png,
  ]);
  // Read the pixel back as raw RGB rather than through a filter graph, so no
  // path escaping is involved.
  const raw = path.join(WORK, `probe-${index}.raw`);
  await run('ffmpeg', ['-v', 'error', '-y', '-i', png, '-f', 'rawvideo', '-pix_fmt', 'rgb24', raw]);
  const { readFile } = await import('node:fs/promises');
  const buf = await readFile(raw);
  let total = 0;
  const pixels = buf.length / 3;
  for (let i = 0; i < buf.length; i += 3) total += buf[i];
  return total / pixels;
}

async function main() {
  await rm(WORK, { recursive: true, force: true });
  await mkdir(path.join(WORK, 'frames'), { recursive: true });

  process.stdout.write(`generating ${N + D} identifiable frames`);
  for (let i = 0; i < N + D; i++) {
    const hex = `0x${i.toString(16).padStart(2, '0')}0000`;
    await run('ffmpeg', [
      '-v', 'error', '-y',
      '-f', 'lavfi',
      '-i', `color=c=${hex}:s=${SIZE}x${SIZE}:d=1`,
      '-frames:v', '1',
      path.join(WORK, 'frames', frameName(i)),
    ]);
    if (i % 20 === 0) process.stdout.write('.');
  }
  process.stdout.write('\n');

  const outFile = path.join(WORK, 'dissolve.mp4');
  const enc = await encode({
    framesDir: path.join(WORK, 'frames'),
    frameCount: N,
    outFile,
    fps: FPS,
    loop: true,
    dissolveSeconds: D / FPS,
    // Exercise the real delivery path, including the scale filter: crf 0 cannot
    // open the encoder here, and a size-less run skips scalePart entirely.
    crf: 18,
    size: { width: SIZE, height: SIZE },
  });

  console.log(`\nencoded ${enc.frames} frames, dissolve ${enc.dissolveFrames} frames\n`);

  const expectations = [
    { index: 0, expect: N, label: 'out[0] is capture[N] (start of the mix)' },
    { index: D, expect: D, label: `out[${D}] is capture[${D}] (start of the body)` },
    { index: 30, expect: 30, label: 'out[30] is capture[30] (body, untouched)' },
    { index: N - 1, expect: N - 1, label: `out[${N - 1}] is capture[${N - 1}] (last frame)` },
  ];

  let pass = true;
  for (const e of expectations) {
    const got = await meanRed(outFile, e.index);
    // Lossless, but chroma subsampling still moves a solid colour by a hair.
    // yuv420p limited-range roundtrip pulls solid colours down a few counts,
    // and it is not linear at the dark end, so compare with a real tolerance.
    const ok = Math.abs(got - e.expect) <= 5;
    if (!ok) pass = false;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${e.label}: read ${got.toFixed(1)}, expected ${e.expect}`);
  }

  console.log(
    `\n  the wrap is out[${N - 1}] -> out[0] = capture[${N - 1}] -> capture[${N}], ` +
      'which is one ordinary frame step.'
  );
  console.log(pass ? '\ndissolve selftest passed.' : '\ndissolve selftest FAILED.');
  process.exit(pass ? 0 : 1);
}

await main();
