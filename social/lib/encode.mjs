/**
 * PNG sequence -> delivery mp4.
 *
 * Every platform we post to re-encodes what it is given, so the job here is to
 * hand them the cleanest possible source: H.264 High, yuv420p (nothing else
 * decodes reliably on older phones), CRF 18, faststart so the moov atom is at
 * the front and the first frame paints before the file finishes downloading.
 *
 * The silent audio track is not decoration. X and Facebook both treat a
 * video-only mp4 as suspect — some clients refuse to autoplay it, some show a
 * broken mute control. A real 48kHz stereo AAC track of silence costs a few KB
 * and removes the whole class of problem.
 */
import { mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { FRAME_PATTERN, frameName } from './frames.mjs';
import { psnr, run } from './ffmpeg.mjs';

/** PSNR at or above which two frames count as the same frame. */
export const DUPLICATE_PSNR_DB = 45;

/** Output file for an asset id and framing, e.g. V007-SQ -> out/V007-SQ.mp4 */
export function outputPath(outDir, assetId, framing) {
  return path.join(outDir, `${assetId}-${framing}.mp4`);
}

/**
 * @param {object} opts
 * @param {string}  opts.framesDir     directory of %06d.png
 * @param {number}  opts.frameCount    frames to encode (excluding the seam probe)
 * @param {string}  opts.outFile       destination .mp4
 * @param {number} [opts.fps=30]
 * @param {number} [opts.crf=18]
 * @param {boolean}[opts.loop=false]   drop frame N when it matches frame 0
 * @param {{width:number,height:number}} [opts.size]  scale, if frames are off-spec
 * @param {number} [opts.dissolveSeconds=0]  cross-dissolve the tail into the head
 *                                           over this long, to hide a seam that
 *                                           does not close on its own
 * @returns {Promise<{outFile:string,frames:number,droppedDuplicate:boolean,
 *                    seamPsnr:number|null,bytes:number,seconds:number}>}
 */
export async function encode(opts) {
  const {
    framesDir,
    frameCount,
    outFile,
    fps = 30,
    crf = 18,
    loop = false,
    size,
    dissolveSeconds = 0,
  } = opts;

  if (!framesDir) throw new Error('encode: framesDir is required');
  if (!frameCount || frameCount < 1) throw new Error('encode: frameCount must be >= 1');
  if (!outFile) throw new Error('encode: outFile is required');

  await mkdir(path.dirname(outFile), { recursive: true });
  await rm(outFile, { force: true });

  // capture() shot frames 0..frameCount inclusive when looping, so the file
  // always gets exactly `frameCount` frames (indices 0..frameCount-1) and the
  // probe frame at index `frameCount` stays on disk, unencoded. What the loop
  // check decides is not how many frames to write — it is whether that dropped
  // frame was in fact a duplicate of frame 0, i.e. whether the loop closes.
  const framesToEncode = frameCount;
  let seamPsnr = null;
  let droppedDuplicate = false;

  if (loop) {
    const first = path.join(framesDir, frameName(0));
    const wrap = path.join(framesDir, frameName(frameCount));

    try {
      seamPsnr = await psnr(first, wrap);
    } catch {
      seamPsnr = null; // no probe frame on disk; nothing to compare
    }

    // Frame N matching frame 0 is the good case: encoding both would show the
    // same picture twice at the wrap, a visible hitch every time the loop
    // repeats. Dropping it lets playback supply frame 0 again instead.
    // A mismatch means the scene never returned to its starting state — the
    // file still encodes, but the wrap will jump, and verify will say so.
    droppedDuplicate = seamPsnr !== null && seamPsnr >= DUPLICATE_PSNR_DB;
  }

  const vf = [];
  if (size) vf.push(`scale=${size.width}:${size.height}:flags=lanczos`);
  vf.push('format=yuv420p');

  // Cross-dissolve the tail into the head.
  //
  // For a scene whose motion is integrated rather than periodic — the BDL-007
  // fireflies steer and accumulate position, so they never return to where they
  // started however long the clip — no duration closes the loop. A dissolve is
  // the honest fix: the last `dissolveSeconds` fade into a copy of the opening
  // frames, so the wrap has nothing to pop against. It costs those frames their
  // full opacity, which is why it is opt-in and always reported.
  const dissolveFrames = Math.round(dissolveSeconds * fps);
  const useDissolve = dissolveFrames > 0 && dissolveFrames * 2 < framesToEncode;

  const args = [
    '-hide_banner',
    '-y',
    // video: the PNG sequence, read at the target rate
    '-framerate', String(fps),
    '-start_number', '0',
    '-i', path.join(framesDir, FRAME_PATTERN),
  ];

  if (useDissolve) {
    // A second read of the same sequence, limited to the opening frames, faded
    // up and laid over the faded-down tail of the first.
    args.push('-framerate', String(fps), '-start_number', '0', '-i', path.join(framesDir, FRAME_PATTERN));
  }

  args.push(
    // audio: generated silence, not a file on disk
    '-f', 'lavfi',
    '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
  );

  if (useDissolve) {
    // Correct seamless-loop crossfade.
    //
    // The obvious version — fade the tail into the head and append it — is
    // WRONG, and this file shipped it unexercised until the seam check caught
    // it. That version ends the file on head frame D-1, so playback then wraps
    // to frame 0: a backwards jump of D-1 frames, which is a worse seam than
    // the one the dissolve was added to fix.
    //
    // The right shape uses the D frames shot BEYOND the loop. Those are what
    // "would have come next" after the last frame, so they are exactly what the
    // opening frames have to be mixed out of:
    //
    //   out[i] for i in [0, D)   lerp(capture[N+i], capture[i], i/D)
    //   out[i] for i in [D, N)   capture[i]
    //
    // Then out[N-1] is capture[N-1] and out[0] is capture[N] — two consecutive
    // captured frames — so the wrap costs exactly one ordinary frame step.
    const dur = (dissolveFrames / fps).toFixed(6);
    const scalePart = size ? `scale=${size.width}:${size.height}:flags=lanczos,` : '';
    args.push(
      '-filter_complex',
      // outgoing: the frames past the end of the loop, fading away.
      `[0:v]trim=start_frame=${framesToEncode}:end_frame=${framesToEncode + dissolveFrames},setpts=PTS-STARTPTS[outgoing];` +
        // incoming: the opening frames, fading up underneath them.
        `[1:v]trim=start_frame=0:end_frame=${dissolveFrames},setpts=PTS-STARTPTS[incoming];` +
        // body: the rest of the loop, untouched.
        `[0:v]trim=start_frame=${dissolveFrames}:end_frame=${framesToEncode},setpts=PTS-STARTPTS[body];` +
        `[outgoing][incoming]blend=all_expr='A*(1-(T/${dur}))+B*(T/${dur})'[mix];` +
        // The mix goes FIRST: it is the opening of the file, not its end.
        `[mix][body]concat=n=2:v=1:a=0[joined];` +
        `[joined]${scalePart}format=yuv420p[v]`,
      '-map', '[v]',
      '-map', '2:a',
    );
  } else {
    args.push('-frames:v', String(framesToEncode), '-vf', vf.join(','));
  }

  args.push(
    '-c:v', 'libx264',
    '-profile:v', 'high',
    // 4.2, not 4.0. At 60fps these exceed Level 4.0's 245,760 macroblocks/sec
    // (1080x1080 needs 277,440; 1080x1920 needs 489,600), and declaring a level
    // the stream does not fit is not cosmetic: strict hardware decoders on
    // older phones and TVs can refuse the file or drop to software decoding.
    // 4.2 allows 522,240 and covers both.
    '-level', '4.2',
    '-preset', 'slow',
    '-crf', String(crf),
    '-pix_fmt', 'yuv420p',
    '-r', String(fps),
    // Two-second keyframe interval: platforms seek on it, and it keeps the
    // re-encode they will do on their end from starting from a long GOP.
    '-g', String(fps * 2),
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ar', '48000',
    '-ac', '2',
    '-shortest',
    '-movflags', '+faststart',
    outFile,
  );

  await run('ffmpeg', args);

  const { size: bytes } = await stat(outFile);

  return {
    outFile,
    frames: framesToEncode,
    dissolveFrames: useDissolve ? dissolveFrames : 0,
    droppedDuplicate,
    seamPsnr,
    bytes,
    seconds: framesToEncode / fps,
  };
}
