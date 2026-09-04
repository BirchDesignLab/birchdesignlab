/**
 * Thin promise wrapper around ffmpeg/ffprobe, plus the perceptual frame diff
 * that both the encoder (seam test before dropping a frame) and the verifier
 * (seam test on the finished mp4) rely on.
 *
 * Doing the diff through ffmpeg's own psnr filter keeps the dependency list at
 * exactly one external binary. A PNG decoder in JS would be a second one.
 */
import { spawn } from 'node:child_process';

/** Run a binary, capture both pipes, resolve/reject on exit code. */
export function run(bin, args, { cwd } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { cwd, windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('error', (err) =>
      reject(new Error(`${bin} failed to start: ${err.message}`))
    );
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${bin} exited ${code}\n${tail(stderr, 24)}`));
    });
  });
}

function tail(s, lines) {
  return s.trim().split('\n').slice(-lines).join('\n');
}

/** `ffprobe -show_streams -show_format`, parsed. */
export async function probe(file) {
  const { stdout } = await run('ffprobe', [
    '-v', 'error',
    '-print_format', 'json',
    '-show_streams',
    '-show_format',
    file,
  ]);
  return JSON.parse(stdout);
}

/**
 * Perceptual difference between two images or two decoded frames.
 *
 * Returns PSNR in dB, where higher means more similar:
 *   Infinity  identical, pixel for pixel
 *   > 45 dB   visually indistinguishable
 *   ~ 30 dB   an ordinary 1/30s step in a slow scene
 *   < 20 dB   a hard cut
 *
 * `Infinity` at a loop seam is not a pass — it means a doubled frame, which is
 * the exact stutter the loop mode exists to remove.
 */
export async function psnr(fileA, fileB) {
  const { stderr } = await run('ffmpeg', [
    '-hide_banner',
    '-i', fileA,
    '-i', fileB,
    '-lavfi', 'psnr',
    '-f', 'null',
    '-',
  ]);

  // ffmpeg prints: [Parsed_psnr_0 @ ...] PSNR y:41.2 u:.. v:.. average:40.9 ...
  const avg = stderr.match(/average:\s*([0-9.]+|inf)/i);
  if (!avg) throw new Error(`could not parse psnr from ffmpeg output:\n${tail(stderr, 8)}`);
  return /inf/i.test(avg[1]) ? Infinity : Number(avg[1]);
}

/** Extract one frame of a video, by index, to a PNG. */
export async function extractFrame(video, index, outPng) {
  await run('ffmpeg', [
    '-hide_banner',
    '-y',
    '-i', video,
    '-vf', `select=eq(n\\,${index})`,
    '-vsync', '0',
    '-frames:v', '1',
    outPng,
  ]);
  return outPng;
}

/** Number of decoded video frames. Counted, not inferred from duration. */
export async function frameCount(video) {
  const { stdout } = await run('ffprobe', [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-count_frames',
    '-show_entries', 'stream=nb_read_frames',
    '-print_format', 'default=nokey=1:noprint_wrappers=1',
    video,
  ]);
  return Number(stdout.trim());
}

/** Parse ffprobe's "30/1" rational into a number. */
export function rational(value) {
  if (!value) return NaN;
  const [n, d] = String(value).split('/').map(Number);
  return d ? n / d : n;
}

/**
 * Peak and mean absolute difference between two images, on the luma plane.
 *
 * PSNR is a whole-frame average, which makes it almost blind to the fireflies:
 * 40 dots a few pixels across, moving, barely move a 2160x2160 mean. The peak
 * delta does see them, because an additive bright dot arriving on a near-black
 * background is a large local change.
 *
 * Returns { max, avg } in 0-255 luma units.
 */
export async function lumaDelta(fileA, fileB) {
  const { stderr } = await run('ffmpeg', [
    '-hide_banner',
    '-i', fileA,
    '-i', fileB,
    '-lavfi',
    'blend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YMAX,metadata=print:key=lavfi.signalstats.YAVG',
    '-f', 'null',
    '-',
  ]);

  const max = stderr.match(/lavfi\.signalstats\.YMAX=([0-9.]+)/);
  const avg = stderr.match(/lavfi\.signalstats\.YAVG=([0-9.]+)/);
  if (!max) throw new Error(`could not parse signalstats from ffmpeg output:\n${tail(stderr, 6)}`);
  return { max: Number(max[1]), avg: avg ? Number(avg[1]) : NaN };
}
