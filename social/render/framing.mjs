/**
 * The per-asset framing table — the config of record for every video asset.
 *
 * Standing rules:
 *
 *   - No clip rectangles. The harness sizes its stage to the frame.
 *   - Letterboxing is forbidden. VT reframes the camera; it never pads SQ.
 *     The harness stage is fixed to the viewport so the scene's own
 *     measureBand()/frameCamera() fit the mark to the frame's aspect. Verified:
 *     1080x1920 renders full-bleed, reframed rather than padded.
 *   - Settle frames are stepped on the fake clock before frame 0 is kept, so
 *     the burn-in is as deterministic as the take.
 *
 * ---------------------------------------------------------------------------
 * The timing, and why every number in it is forced
 * ---------------------------------------------------------------------------
 * The shot is the mark's UNDISTURBED idle rotation — the harness touches
 * nothing, because any pointer event sets `everGrabbed` in stage.ts and stops
 * the rotation permanently.
 *
 * Three periods have to agree, and one grid:
 *
 *   IDLE_YAW      one revolution per 60s
 *   PULSE_PERIOD  the moss breath, 20s
 *   rAF           fires every 16ms exactly under Playwright's fake clock
 *
 * 60s of scene time is therefore exactly one revolution AND exactly three
 * breaths — the only duration where both close. Compressing 60s into a 12.5s
 * clip at 60fps is TIME_SCALE 4.8, which makes the per-frame step 80ms, which
 * is exactly five 16ms redraws.
 *
 * That last part is not a nicety. If the step is not a whole multiple of the
 * redraw interval, each captured frame shows a state 0-16ms stale by a varying
 * amount, and the result visibly skips. Measured at an earlier 125ms step
 * (TIME_SCALE 7.5): per-frame motion swung 42% in an alternating beat. At 80ms
 * it is 15%, and smooth.
 *
 * So: change any one of duration, fps or TIME_SCALE and the others must move
 * with it. Valid combinations satisfy BOTH
 *
 *   seconds * TIME_SCALE === 60          (one revolution, three breaths)
 *   1000 * TIME_SCALE / fps  is a multiple of 16   (aligned to the rAF grid)
 *
 * 12.5s at 4.8x is one. 6.25s at 9.6x (160ms = 10 redraws) is another.
 * 8s at 7.5x is NOT, and skips.
 */
import { harnessUrl, siteUrl } from '../lib/devserver.mjs';

/** Delivery dimensions per framing code. */
export const OUTPUT = {
  SQ: { width: 1080, height: 1080 },
  PT: { width: 1080, height: 1350 },
  VT: { width: 1080, height: 1920 },
};

/**
 * Capture viewports, at dPR 1.5.
 *
 * 1.5 is not arbitrary: stage.ts caps itself at
 * `setPixelRatio(Math.min(window.devicePixelRatio, 1.5))`, so raising
 * deviceScaleFactor alone buys nothing beyond it — the WebGL buffer stays put
 * and the compositor merely stretches it. Extra resolution has to come from
 * CSS SIZE, and the buffer is always CSS * 1.5.
 *
 * Verified that the larger viewport does not move the framing
 * (scripts/measure-supersample.mjs): 46.2dB between a 1080-CSS and a 1440-CSS
 * render normalised to the same size, residual confined to thin edge halos.
 * Everything the camera derives is a ratio, so the crop is identical.
 *
 * KNOWN DEFECT: this normalises the LONG EDGE to 1440 CSS, which yields a true
 * 2x supersample only for square. The rule looks symmetric and is not:
 *
 *     SQ  1440x1440 -> buffer 2160x2160 -> 1080x1080   2.000x
 *     PT  1152x1440 -> buffer 1728x2160 -> 1080x1350   1.600x
 *     VT   810x1440 -> buffer 1215x2160 -> 1080x1920   1.125x
 *
 * VT gets almost none of the antialiasing SQ gets. The correct rule is
 * buffer = 2x output in BOTH dimensions, i.e. CSS = output * 2 / 1.5, which
 * for VT is 1440x2560 and a 2160x3840 buffer — 3.16x the pixels. Cheap on the
 * GPU, so fix it there. Tracked in docs/socials-backlog.md.
 */
export const CAPTURE = {
  SQ: { width: 1440, height: 1440 },
  PT: { width: Math.round((1080 * 1440) / 1350), height: 1440 },
  VT: { width: Math.round((1080 * 1440) / 1920), height: 1440 },
  deviceScaleFactor: 1.5,
};

/** Delivery frame rate. */
export const FPS = 60;

/** The moss breath period, from PULSE_PERIOD in stage.ts. */
export const PULSE_PERIOD_S = 20;

/** One full idle revolution, from IDLE_YAW in stage.ts. */
export const REVOLUTION_S = 60;

/**
 * Scene-seconds per video-second. See the module header: 4.8 puts one 60s
 * revolution into a 12.5s clip and lands the step on 80ms, five 16ms redraws.
 */
export const TIME_SCALE = 4.8;

/** Clip length. seconds * TIME_SCALE must equal REVOLUTION_S. */
export const CLIP_S = REVOLUTION_S / TIME_SCALE; // 12.5

/**
 * Scene seconds of burn-in before frame 0 is kept.
 *
 * 60s, i.e. one whole revolution, for one reason: yaw accumulates from mount,
 * so frame 0 only lands head-on where scene time is a multiple of 60s. At the
 * previous 29.6s the take opened on the BACK of the mark (yaw ~178deg).
 *
 * It also puts the fireflies where they should be. Undisturbed, the scene's own
 * gather engages at GATHER_AFTER_MS and the flock is quiet ~5.7s later
 * (measured: scripts/measure-gather.mjs, quiet at 25.7s from mount). With the
 * stock 20000ms that means they are long settled before frame 0 — see the note
 * on recording-only stage.ts overrides in docs/socials-backlog.md for how the
 * shipped take got them airborne-then-settling instead.
 */
export const SETTLE_SCENE_S = REVOLUTION_S;

export function settleFramesFor(fps, timeScale) {
  return Math.ceil(SETTLE_SCENE_S / (timeScale / fps));
}

/**
 * Cross-dissolve length. ZERO: the loop closes on its own.
 *
 * A dissolve was added once on the strength of a seam measured on the encoded
 * mp4 — which turned out to be measuring H.264 rather than the animation (see
 * seamFromFrames() in lib/verify.mjs). On the source frames the wrap costs
 * about what the next frame would have cost. There is nothing to hide.
 *
 * The machinery stays, proven by scripts/selftest-dissolve.mjs, for a scene
 * that genuinely does not close. Set this above 0 and capture() shoots the
 * extra frames it needs.
 */
export const DISSOLVE_S = 0;

/**
 * GATHER_AFTER_MS in stage.ts, in seconds. Leave the mark alone this long and
 * the fireflies stop wandering and seek fixed sampled points on the moss.
 * Read by scripts/measure-gather.mjs.
 */
export const GATHER_AFTER_S = 20;

/**
 * The table. `seconds` is video seconds; scene time is seconds * timeScale.
 * Every looping row must use CLIP_S — see the module header.
 */
export const FRAMING = [
  { id: 'V007',  variant: 'A', kind: 'harness', framing: 'SQ', fps: FPS, seconds: CLIP_S, loop: true },
  { id: 'V007',  variant: 'A', kind: 'harness', framing: 'PT', fps: FPS, seconds: CLIP_S, loop: true },
  { id: 'V007',  variant: 'A', kind: 'harness', framing: 'VT', fps: FPS, seconds: CLIP_S, loop: true },
  { id: 'V007B', variant: 'B', kind: 'harness', framing: 'SQ', fps: FPS, seconds: CLIP_S, loop: true },
  { id: 'V007B', variant: 'B', kind: 'harness', framing: 'VT', fps: FPS, seconds: CLIP_S, loop: true },
  { id: 'V007C', variant: 'C', kind: 'harness', framing: 'SQ', fps: FPS, seconds: CLIP_S, loop: true },
  { id: 'V007C', variant: 'C', kind: 'harness', framing: 'VT', fps: FPS, seconds: CLIP_S, loop: true },
  // The scroll captures are one-shots, not loops: no wrap, no time compression.
  { id: 'V005', variant: 'scroll', kind: 'page', page: '/lab/bdl-005', framing: 'VT', fps: FPS, seconds: 11, settle: 30, loop: false, timeScale: 1 },
  { id: 'V005', variant: 'frame',  kind: 'page', page: '/lab/bdl-005', framing: 'SQ', fps: FPS, seconds: 11, settle: 30, loop: false, timeScale: 1 },
];

/**
 * Prose from the calendar, kept next to the table it constrains.
 *
 * A's note diverges from calendar.html deliberately. The calendar says "static
 * camera"; what ships is the undisturbed idle rotation, because the launch post
 * is "we're getting spun up" and the spin IS the shot. Holding the mark still
 * requires a synthetic pointer event, which stops the rotation for good.
 */
export const VARIANT_NOTES = {
  A: 'full wordmark on its pedestal, centered, undisturbed idle rotation — one revolution per clip',
  B: 'close-up or low angle, moss in the foreground, one firefly crossing frame',
  C: 'a slow sweep across the pedestal, once per loop',
};

/** Variant B's angle. Founder's pick: B2, from scripts/render-candidates.mjs. */
export const B_ANGLE = { yaw: 0.55, pitch: -0.42, zoom: 6 };

/**
 * Variant C's motion. Founder's pick: C4, a +-26deg sine sweep.
 *
 * NOT an orbit, despite the calendar's wording. The mark is a flat relief, so a
 * real revolution collapses it to an edge-on green sliver twice per loop, and a
 * half revolution ends mirrored and never closes on yaw. Both were rendered as
 * contact sheets before either could ship.
 *
 * The sweep is `sweep * sin(2*PI*fraction)`, so its period equals the loop
 * period exactly:
 *
 *   loop_seconds / sweep_period = 1        a whole number
 *   position at the seam  sin(0) = sin(2*PI) = 0
 *   velocity at the seam  cos(0) = cos(2*PI) = 1
 *
 * Continuous in both position and velocity at the wrap, with no direction flip.
 *
 * NOTE, before re-rendering B or C: both stage themselves with a synthetic
 * pointer gesture, which sets `everGrabbed` and stops the idle rotation. If
 * they should spin like A now does, their staging needs rethinking first —
 * stage.ts exposes no way to set the camera without also grabbing the model.
 */
export const C_ORBIT = { sweep: 0.45 };

/** Resolve one table row into everything capture() needs. */
export function resolveRow(row) {
  const out = OUTPUT[row.framing];
  if (!out) throw new Error(`unknown framing ${row.framing} on ${row.id}`);

  const capture = CAPTURE[row.framing];
  const dsf = CAPTURE.deviceScaleFactor;

  const params = { variant: row.variant, framing: row.framing };
  if (row.variant === 'B' && B_ANGLE) Object.assign(params, B_ANGLE);
  if (row.variant === 'C' && C_ORBIT) Object.assign(params, { turns: 0, ...C_ORBIT });

  const url = row.kind === 'harness' ? harnessUrl('bdl-007.html', params) : siteUrl(row.page);
  const timeScale = row.timeScale ?? (row.loop ? TIME_SCALE : 1);

  // A looping row whose timing does not close is a silent defect: it renders,
  // verifies on conformance, and simply jumps at the wrap. Refuse it here.
  if (row.loop) {
    const sceneSeconds = row.seconds * timeScale;
    if (Math.abs(sceneSeconds - REVOLUTION_S) > 1e-6) {
      throw new Error(
        `${row.id}-${row.framing}: ${row.seconds}s at ${timeScale}x is ${sceneSeconds}s of scene ` +
          `time, but a loop must be exactly ${REVOLUTION_S}s (one revolution, three breaths).`
      );
    }
    const stepMs = (1000 * timeScale) / row.fps;
    if (Math.abs(stepMs / 16 - Math.round(stepMs / 16)) > 1e-9) {
      throw new Error(
        `${row.id}-${row.framing}: a ${stepMs}ms step is not a whole multiple of the 16ms rAF ` +
          `grid, so the render will visibly judder. See the module header.`
      );
    }
  }

  return {
    ...row,
    url,
    viewport: capture,
    deviceScaleFactor: dsf,
    output: out,
    captureSize: { width: Math.round(capture.width * dsf), height: Math.round(capture.height * dsf) },
    timeScale,
    stepMs: (1000 * timeScale) / row.fps,
    settle: row.settle ?? settleFramesFor(row.fps, timeScale),
    dissolveSeconds: row.loop ? DISSOLVE_S : 0,
    dissolveFrames: row.loop ? Math.round(DISSOLVE_S * row.fps) : 0,
    sceneSeconds: +(row.seconds * timeScale).toFixed(3),
    breaths: +((row.seconds * timeScale) / PULSE_PERIOD_S).toFixed(4),
    // The recorder waits on __BDL_MODEL (the glb resolved) with the clock
    // frozen, then calls __BDL_STAGE() once time is pinned. The specimen page
    // raises neither, so page captures wait on its live canvas instead.
    readyFlag: row.kind === 'harness' ? '__BDL_MODEL' : null,
    readySelector: row.kind === 'harness' ? null : '.stage.is-live canvas.scene',
    stageFn: row.kind === 'harness' ? '__BDL_STAGE' : null,
    outFile: `${row.id}-${row.framing}.mp4`,
  };
}

export function resolveAll() {
  return FRAMING.map(resolveRow);
}
