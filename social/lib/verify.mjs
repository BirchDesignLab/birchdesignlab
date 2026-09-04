/**
 * Post-encode verification.
 *
 * Nothing here trusts what encode.mjs believes it produced — every check reads
 * the finished file back through ffprobe. A pipeline that verifies its own
 * intentions verifies nothing.
 *
 * Two classes of check:
 *   - container/stream conformance: the things a platform silently re-encodes,
 *     downgrades, or rejects (wrong pix_fmt, missing audio, wrong dimensions)
 *   - the loop seam: whether the wrap actually wraps
 */
import { mkdtemp, open, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { extractFrame, frameCount, lumaDelta, probe, psnr, rational } from './ffmpeg.mjs';
import { frameName } from './frames.mjs';

/** Canonical output dimensions per framing code. */
export const FORMAT_DIMS = {
  SQ: [1080, 1080],
  PT: [1080, 1350],
  VT: [1080, 1920],
  OG: [1200, 630],
};

export const MAX_BYTES = 50 * 1024 * 1024;

/** Parse V007-SQ.mp4 -> {assetId:'V007', framing:'SQ'} */
export function parseOutputName(file) {
  const base = path.basename(file, path.extname(file));
  const m = base.match(/^(.+)-(SQ|PT|VT|OG)$/);
  if (!m) return { assetId: base, framing: null };
  return { assetId: m[1], framing: m[2] };
}

function check(name, pass, detail) {
  return { name, pass, detail };
}

/**
 * Verify one encoded file.
 *
 * @param {string} file
 * @param {object} [spec]
 * @param {number} [spec.expectSeconds]  target duration from the manifest
 * @param {number} [spec.fps=30]
 * @param {boolean}[spec.loop=true]      run the seam check
 * @param {string} [spec.framing]        override the framing parsed from the name
 */
export async function verifyFile(file, spec = {}) {
  const { fps = 30, loop = true, expectSeconds } = spec;
  const { assetId, framing: parsedFraming } = parseOutputName(file);
  const framing = spec.framing ?? parsedFraming;

  const checks = [];
  const info = await probe(file);

  const video = (info.streams ?? []).find((s) => s.codec_type === 'video');
  const audio = (info.streams ?? []).find((s) => s.codec_type === 'audio');

  // --- video stream ------------------------------------------------------
  if (!video) {
    checks.push(check('video stream', false, 'no video stream found'));
  } else {
    checks.push(check('codec', video.codec_name === 'h264', `codec_name=${video.codec_name}`));
    checks.push(
      check('profile', video.profile === 'High', `profile=${video.profile}`)
    );
    checks.push(
      check('pix_fmt', video.pix_fmt === 'yuv420p', `pix_fmt=${video.pix_fmt}`)
    );

    const dims = FORMAT_DIMS[framing];
    if (dims) {
      const ok = video.width === dims[0] && video.height === dims[1];
      checks.push(
        check('dimensions', ok, `${video.width}x${video.height}, expected ${dims[0]}x${dims[1]}`)
      );
    } else {
      checks.push(
        check('dimensions', false, `unknown framing "${framing}" — cannot check ${video.width}x${video.height}`)
      );
    }

    const rate = rational(video.avg_frame_rate);
    checks.push(
      check('frame rate', Math.abs(rate - fps) < 0.01, `avg_frame_rate=${video.avg_frame_rate} (${rate.toFixed(3)})`)
    );
  }

  // --- audio stream ------------------------------------------------------
  if (!audio) {
    checks.push(check('audio stream', false, 'no audio stream — some players will not autoplay'));
  } else {
    checks.push(check('audio codec', audio.codec_name === 'aac', `codec_name=${audio.codec_name}`));
    checks.push(check('audio channels', Number(audio.channels) === 2, `channels=${audio.channels}`));
    checks.push(
      check('audio rate', Number(audio.sample_rate) === 48000, `sample_rate=${audio.sample_rate}`)
    );
  }

  // --- container ---------------------------------------------------------
  const duration = Number(info.format?.duration);
  const nFrames = await frameCount(file);

  if (expectSeconds != null) {
    // Compare on frames, not on the container's float duration — frames are
    // what the encoder actually wrote, and duration is derived from them.
    const expectFrames = Math.round(expectSeconds * fps);
    checks.push(
      check(
        'duration',
        nFrames === expectFrames,
        `${nFrames} frames (${(nFrames / fps).toFixed(3)}s), expected ${expectFrames} (${expectSeconds}s)`
      )
    );
  } else {
    checks.push(
      check(
        'duration',
        Number.isFinite(duration) && duration > 0,
        `${duration}s / ${nFrames} frames (no manifest target to compare)`
      )
    );
  }

  const bytes = Number(info.format?.size ?? 0);
  checks.push(
    check('file size', bytes > 0 && bytes < MAX_BYTES, `${(bytes / 1024 / 1024).toFixed(2)} MB, limit 50 MB`)
  );

  const faststart = await hasFaststart(file);
  checks.push(check('faststart', faststart, faststart ? 'moov before mdat' : 'moov atom is not at the front'));

  // --- loop seam ---------------------------------------------------------
  let seam = null;
  if (loop && nFrames >= 3) {
    seam = await seamCheck(file, nFrames, fps);
    checks.push(
      check(
        'loop seam',
        seam.pass,
        `mean delta wrap ${seam.seam.toFixed(4)} vs adjacent ${seam.adjacent.toFixed(4)} — ${seam.verdict}`
      )
    );
  }

  return {
    file,
    assetId,
    framing,
    bytes,
    duration,
    frames: nFrames,
    seam,
    checks,
    pass: checks.every((c) => c.pass),
  };
}

function fmtDb(v) {
  if (v === Infinity) return 'identical';
  return `${v.toFixed(1)}dB`;
}

/**
 * Compare frame 0 against the frame that follows the last one during looped
 * playback — which, by definition of a loop, is frame 0 again. So the real
 * question is whether the step from the last frame into frame 0 looks like any
 * other frame step in this scene, or like a jump.
 *
 * Measured on the MEAN of the difference, not on PSNR.
 *
 * PSNR was tried first and is actively misleading here. It is a mean of SQUARED
 * error, so a few very bright pixels dominate it: the fireflies (a handful of
 * bright dots) swamp the moss breath (a large dim area), which is exactly
 * backwards for judging whether a loop closes. Measured across candidate
 * durations, PSNR rated a loop whose entire mark was at the wrong breath phase
 * (38.41dB) as indistinguishable from one that closed properly (38.55dB), while
 * the mean of the difference separated them cleanly at 2.54x versus 1.24x of an
 * ordinary frame step.
 *
 * So the test is a ratio against the scene's own per-frame change:
 *
 *   ratio ~ 1.0   the wrap costs what any other frame costs — invisible
 *   ratio ~ 0     the last frame duplicates frame 0 — a stutter, not a loop
 *
 * The limit has to scale with fps, or it silently measures a different physical
 * thing at 60 than at 30. A loop's residual discontinuity — here, fireflies that
 * integrate their motion and so never return to where they started — is a fixed
 * displacement. Doubling the frame rate halves the motion in one frame step, so
 * the same physical jump reads as twice the ratio while looking exactly the
 * same. 1.5 was calibrated at 30fps against real cases (a closing loop measured
 * 0.93; a loop a third of a breath out of phase measured 2.54; half a breath
 * out, 8.11), so the limit is that figure scaled by fps/30.
 */
const SEAM_RATIO_LIMIT_AT_30 = 1.5;

/** Below this the scene genuinely is not moving and there is no seam to judge. */
const STATIC_SCENE_DELTA = 0.002;

async function seamCheck(file, nFrames, fps = 30) {
  const dir = await mkdtemp(path.join(tmpdir(), 'bdl-seam-'));
  try {
    const f0 = await extractFrame(file, 0, path.join(dir, 'f0.png'));
    const f1 = await extractFrame(file, 1, path.join(dir, 'f1.png'));
    const fLast = await extractFrame(file, nFrames - 1, path.join(dir, 'flast.png'));

    const adjacent = (await lumaDelta(f0, f1)).avg;
    const seam = (await lumaDelta(fLast, f0)).avg;

    // Kept for the report: useful for spotting an exactly duplicated frame,
    // which comes back as infinity.
    const seamDb = await psnr(fLast, f0);
    const adjacentDb = await psnr(f0, f1);

    const ratio = adjacent > 0 ? seam / adjacent : Infinity;
    const limit = SEAM_RATIO_LIMIT_AT_30 * (fps / 30);

    let verdict;
    let pass;

    if (adjacent < STATIC_SCENE_DELTA) {
      // Nothing is moving between consecutive frames. On this pipeline that has
      // meant a throttled scene sampled faster than it redraws, not a still
      // life, so it is reported rather than waved through.
      verdict = `scene barely moves between frames (${adjacent.toFixed(5)}) — is it actually rendering at this fps?`;
      pass = false;
    } else if (seamDb === Infinity) {
      verdict = 'last frame duplicates frame 0; playback will stutter on wrap';
      pass = false;
    } else if (ratio <= limit) {
      verdict = `wrap costs ${ratio.toFixed(2)}x an ordinary frame step (limit ${limit.toFixed(2)} at ${fps}fps)`;
      pass = true;
    } else {
      verdict =
        `wrap costs ${ratio.toFixed(2)}x an ordinary frame step ` +
        `(limit ${limit.toFixed(2)} at ${fps}fps); the loop does not close`;
      pass = false;
    }

    return { seamDb, adjacentDb, seam, adjacent, ratio, limit, verdict, pass };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/**
 * True when the moov atom precedes mdat.
 *
 * ffprobe does not report this directly, so read the atom headers off the front
 * of the file. Whichever of moov/mdat appears first wins.
 */
async function hasFaststart(file) {
  const fh = await open(file, 'r');
  try {
    const buf = Buffer.alloc(64 * 1024);
    const { bytesRead } = await fh.read(buf, 0, buf.length, 0);
    const head = buf.subarray(0, bytesRead).toString('latin1');
    const moov = head.indexOf('moov');
    const mdat = head.indexOf('mdat');
    if (moov === -1) return false;
    return mdat === -1 || moov < mdat;
  } finally {
    await fh.close();
  }
}

/** Verify a list of files and write social/out/report.md. */
export async function verifyAll(files, { outDir, specs = {} } = {}) {
  const results = [];
  for (const f of files) {
    try {
      results.push(await verifyFile(f, specs[path.basename(f)] ?? {}));
    } catch (err) {
      results.push({
        file: f,
        ...parseOutputName(f),
        checks: [check('probe', false, err.message)],
        pass: false,
      });
    }
  }

  const md = renderReport(results);
  const reportPath = path.join(outDir, 'report.md');
  await writeFile(reportPath, md, 'utf8');
  return { results, reportPath, pass: results.every((r) => r.pass) };
}

export function renderReport(results) {
  const stamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
  const passed = results.filter((r) => r.pass).length;

  const lines = [
    '# Social asset verification',
    '',
    `Run ${stamp} UTC — ${passed}/${results.length} passed.`,
    '',
    '| Asset | Format | Frames | Size | Seam | Result |',
    '| --- | --- | --- | --- | --- | --- |',
  ];

  for (const r of results) {
    const size = r.bytes ? `${(r.bytes / 1024 / 1024).toFixed(1)} MB` : '—';
    const seam = r.seam ? `${r.seam.ratio.toFixed(2)}x` : '—';
    lines.push(
      `| ${r.assetId} | ${r.framing ?? '?'} | ${r.frames ?? '—'} | ${size} | ${seam} | ${r.pass ? 'pass' : '**FAIL**'} |`
    );
  }

  for (const r of results) {
    lines.push('', `## ${path.basename(r.file)}`, '');
    for (const c of r.checks) {
      lines.push(`- ${c.pass ? 'ok' : '**FAIL**'} — ${c.name}: ${c.detail}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Measure the loop seam on the CAPTURED FRAMES, before encoding.
 *
 * This is the only place the question can honestly be asked. Measuring it on
 * the finished mp4 measures the encoder instead: frame 0 is an IDR keyframe at
 * full quality and the last frame sits at the end of a GOP carrying the most
 * accumulated prediction error, and a field of sparse bright dots on near-black
 * is exactly where that error lives. The gap between those two swamped the real
 * seam by roughly 3x and stayed almost constant no matter what was done to the
 * scene — which is what made a closing loop look broken:
 *
 *     scene state          mp4 wrap    capture wrap
 *     wandering            0.3132      0.1007
 *     gathered             0.2251      -
 *     wandering+dissolve   0.3054      0.1007
 *
 * The capture-domain numbers are the animation. The mp4 numbers were H.264.
 *
 * Baseline is the mean of several ordinary frame steps sampled across the loop,
 * not just frame 0 to 1, because per-frame motion varies through the breath.
 */
export async function seamFromFrames({ framesDir, frameCount, fps = 30 }) {
  const at = (i) => path.join(framesDir, frameName(i));
  const mid = Math.floor(frameCount / 2);
  const samples = [0, mid, frameCount - 2];

  const adjacents = [];
  for (const i of samples) adjacents.push((await lumaDelta(at(i), at(i + 1))).avg);
  const adjacent = adjacents.reduce((a, b) => a + b, 0) / adjacents.length;

  const wrap = (await lumaDelta(at(frameCount - 1), at(0))).avg;
  const ratio = adjacent > 0 ? wrap / adjacent : Infinity;

  // A closing loop's wrap costs what the frame that would have come next costs.
  // 2.0 leaves room for the breath being at its fastest at the seam without
  // waving through a real jump: an unclosed loop measured 2.54x and 8.11x.
  const limit = 2.0;
  const pass = ratio <= limit;

  return {
    adjacent,
    wrap,
    ratio,
    limit,
    pass,
    verdict: pass
      ? `wrap costs ${ratio.toFixed(2)}x an ordinary frame step`
      : `wrap costs ${ratio.toFixed(2)}x an ordinary frame step (limit ${limit}); the loop does not close`,
  };
}
