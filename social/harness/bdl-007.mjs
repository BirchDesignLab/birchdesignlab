/**
 * BDL-007 render harness — the module half.
 *
 * Mounts the real scene, applies a variant framing, and raises
 * window.__BDL_READY once the stage has genuinely drawn.
 *
 * ---------------------------------------------------------------------------
 * On how variants are driven, and why it looks indirect
 * ---------------------------------------------------------------------------
 * stage.ts keeps yaw, pitch and zoom in module-scope closure variables. It
 * exposes no camera API — mountStage(canvas, {onReady, onError}) is the entire
 * public surface. So the harness cannot set the camera directly, and adding a
 * parameter to mountStage would mean editing src/, which is out of bounds.
 *
 * What the scene DOES expose is its input handlers, and those are exact:
 *
 *     pointermove while dragging  ->  yaw   += dx * 0.005
 *                                     pitch += dy * 0.004   (clamped +-35deg)
 *     wheel                       ->  zoom  *= 1.07 up / 0.93 down
 *
 * So a synthesised pointer gesture sets the camera to an exactly computable
 * value. That is the mechanism used below. It is indirect, but it is precise,
 * it is deterministic, and it drives the shipped scene rather than a fork of it.
 *
 * One consequence has to be understood rather than worked around: the first
 * pointerdown sets `everGrabbed`, which is also what STOPS the autonomous idle
 * yaw (IDLE_YAW, one revolution per 60s). That is required for a loop — see
 * the note on variant A.
 */

import { mountStage } from '/src/experiments/bdl-007/stage.ts';

const params = new URLSearchParams(location.search);
const variant = (params.get('variant') ?? 'A').toUpperCase();
const framing = (params.get('framing') ?? 'SQ').toUpperCase();

/**
 * Variant B's angle is a framing decision, not a constant, so it comes in on
 * the query string and the candidates live in the script that renders them.
 * Defaults are the first candidate; ?yaw=&pitch=&zoom= override.
 *
 * pitch is clamped by the scene to +-35deg (0.611 rad). Negative pitch tips the
 * top of the mark toward the camera, which is the low angle that puts the moss
 * in the foreground.
 */
const num = (key, fallback) => {
  const v = Number(params.get(key));
  return Number.isFinite(v) && params.has(key) ? v : fallback;
};
const B_YAW = num('yaw', 0.55);
const B_PITCH = num('pitch', -0.42);
const B_ZOOM = num('zoom', 6);
/** Revolutions of orbit per loop, for variant C. */
const C_TURNS = num('turns', 1);
/**
 * Alternative to a full revolution: sweep back and forth by this many radians.
 *
 * The mark is a flat relief, not a solid. Turned 90 degrees it collapses to a
 * green edge-on sliver, so a full revolution loses the wordmark twice per loop
 * and a half revolution ends mirrored, which does not close on yaw at all.
 * A sine sweep never reaches edge-on and returns to exactly 0 at the end of the
 * loop, so it closes by construction. 0 disables it and restores the orbit.
 */
const C_SWEEP = num('sweep', 0);

/**
 * Regression hook, for scripts/selftest-capture.mjs only. Skips waiting for the
 * bump textures to decode, so the test can prove that gate is load-bearing
 * rather than assert it. Never set this for a real render.
 */
const SKIP_DECODE_GATE = params.get('unsafeSkipDecodeGate') === '1';

const state = window.__BDL_HARNESS;
const canvas = document.getElementById('scene');

/** Report a fatal to the recorder rather than hanging on the ready flag. */
function fail(reason, detail) {
  window.__BDL_ERROR = { reason, detail: String(detail ?? '') };
  console.error(`[harness] ${reason}`, detail ?? '');
}

// ---------------------------------------------------------------------------
// Synthetic input
// ---------------------------------------------------------------------------

const rect = () => canvas.getBoundingClientRect();

function pointer(type, x, y, extra = {}) {
  canvas.dispatchEvent(
    new PointerEvent(type, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: x,
      clientY: y,
      bubbles: true,
      cancelable: true,
      ...extra,
    })
  );
}

/**
 * Take hold of the model without moving it.
 *
 * This exists for one reason: `everGrabbed`. Until the scene has been grabbed
 * once it applies IDLE_YAW every frame — a full revolution per 60 seconds. An
 * 8s loop under idle yaw ends 48 degrees from where it started, so frame N can
 * never match frame 0 and NO loop closes. Grabbing once, with zero movement,
 * stops it and leaves yaw exactly where it was.
 *
 * The cost, stated plainly: pointerdown calls the scene's markInteraction(),
 * which calls scatter() on the fireflies with a seed derived from
 * performance.now(). Under a faked clock that seed is a fixed number and the
 * scatter is reproducible. Under a real clock it is different on every run and
 * the flies alone make the render nondeterministic. Which one is true is
 * exactly what scripts/probe-determinism.mjs measures.
 */
function grabAndHold() {
  const r = rect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  pointer('pointerdown', cx, cy);
  pointer('pointerup', cx, cy);
}

/**
 * Press and keep pressing, for the whole take. Required for 60fps.
 *
 * stage.ts throttles its ambient motion to AMBIENT_FPS = 30 and skips the
 * render otherwise, so at a 41.67ms step (60fps x2.5) the scene still only
 * redraws every 33.3ms and roughly every other captured frame is a duplicate.
 * The result encodes and verifies happily and is 30fps content in a 60fps
 * container — and worse, it makes consecutive frames near-identical, which
 * trips the verifier's "static scene" branch and turns the loop-seam check into
 * a vacuous pass.
 *
 * The scene bypasses that throttle whenever `interacting` is true, and holding
 * the pointer down keeps `dragging` true without moving anything. So every
 * captured frame renders, and the take is genuinely 60fps.
 */
function holdPointerDown() {
  const r = rect();
  pointer('pointerdown', r.left + r.width / 2, r.top + r.height / 2);
}

/** Turn the rig by an exact number of radians, via the scene's own handler. */
function turn(dYaw, dPitch = 0) {
  const r = rect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  pointer('pointerdown', cx, cy);
  // The handler reads deltas against its own lastX/lastY, so one move of the
  // full delta is equivalent to many small ones, minus the momentum.
  pointer('pointermove', cx + dYaw / 0.005, cy + dPitch / 0.004, { buttons: 1 });
  // A second move with zero delta zeroes yawVel/pitchVel, so releasing does
  // not hand the rig a momentum coast that would never settle inside a loop.
  pointer('pointermove', cx + dYaw / 0.005, cy + dPitch / 0.004, { buttons: 1 });
  pointer('pointerup', cx + dYaw / 0.005, cy + dPitch / 0.004);
}

/** Zoom by repeated wheel notches, matching the scene's 1.07 / 0.93 steps. */
function zoomBy(notches) {
  const r = rect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  for (let i = 0; i < Math.abs(notches); i++) {
    canvas.dispatchEvent(
      new WheelEvent('wheel', {
        deltaY: notches > 0 ? -1 : 1,
        clientX: cx,
        clientY: cy,
        bubbles: true,
        cancelable: true,
      })
    );
  }
}

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

/**
 * Per-variant staging, applied once after the model resolves and before the
 * recorder keeps frame 0.
 *
 * A — full wordmark on its pedestal, centred, static camera. Grab once to kill
 *     idle yaw; touch nothing else. The only motion left is the breath and the
 *     fireflies.
 * B — close-up / low angle, moss in the foreground. Pitch down and zoom in.
 * C — one slow orbit per loop. Staged the same as A; the orbit itself is
 *     driven per frame by the recorder through window.__BDL_ORBIT (below),
 *     because the turn has to advance in lockstep with the fake clock.
 */
const VARIANTS = {
  A() {
    // NOTHING. Deliberately.
    //
    // The idle rotation IS the shot — the mark spinning undisturbed on its
    // pedestal. Every earlier take sent a pointerdown here to stop the idle yaw
    // so the loop would close on a static frame, which produced a static tree
    // seven times over. stage.ts stops that rotation the first time the model is
    // grabbed (`everGrabbed`), and a synthetic pointerdown counts as a grab.
    //
    // So: no pointerdown, no markInteraction(), no firefly scatter, nothing.
    // The scene is recorded exactly as a visitor who never touches it sees it.
    //
    // It also closes by construction. IDLE_YAW is one revolution per 60s and
    // the moss breath is 20s, so 60s of scene time is exactly one turn and
    // exactly three breaths.
  },
  B() {
    grabAndHold();
    // Low angle: tilt the rig so the view rakes up through the moss. The scene
    // clamps pitch to +-35deg; these stay inside it deliberately.
    turn(B_YAW, B_PITCH);
    zoomBy(B_ZOOM);
    // turn() ends on a pointerup, so re-press and hold for the take — see
    // holdPointerDown() on why 60fps depends on it.
    holdPointerDown();
  },
  C() {
    // No grabAndHold here: the orbit itself holds the pointer down for the
    // whole take, which is what sets everGrabbed and stops the idle yaw.
    beginOrbitDrag();
  },
};

/**
 * Variant C's orbit, exposed for the recorder to step.
 *
 * The recorder calls this once per captured frame with the fraction of the
 * loop elapsed, so exactly one revolution is spread across exactly the frames
 * that are kept. Driving it from inside a rAF would tie the orbit to how many
 * frames the browser happened to run, which is the thing the fake clock exists
 * to remove.
 */
let orbitOrigin = null;

/**
 * Press and HOLD, once, for the whole take.
 *
 * The obvious implementation of the orbit — a full down/move/up gesture per
 * frame — is wrong twice over. Every pointerdown calls the scene's
 * markInteraction(), which scatters the fireflies, so the flock would be kicked
 * thirty times a second. And every pointerup hands the rig a momentum coast
 * that then fights the next frame's drag.
 *
 * Holding one drag open avoids both: onPointerMove applies yaw directly and
 * momentum is only ever read when NOT dragging, so the turn is exactly the sum
 * of the deltas and nothing else.
 */
function beginOrbitDrag() {
  const r = rect();
  orbitOrigin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  pointer('pointerdown', orbitOrigin.x, orbitOrigin.y);
}

/**
 * Variant C's orbit, stepped by the recorder once per captured frame.
 *
 * Absolute, not incremental: the handler derives its delta from its own lastX,
 * so moving to an absolute offset makes the total turn a pure function of the
 * frame index. One revolution is spread across exactly the frames that are
 * kept, and the probe frame one period later lands back at 2*PI — a closed loop
 * by construction rather than by luck.
 */
window.__BDL_ORBIT = (fraction) => {
  if (!orbitOrigin) return;
  const yawTotal = C_SWEEP
    ? C_SWEEP * Math.sin(fraction * Math.PI * 2)
    : fraction * Math.PI * 2 * C_TURNS;
  pointer('pointermove', orbitOrigin.x + yawTotal / 0.005, orbitOrigin.y, { buttons: 1 });
};

// ---------------------------------------------------------------------------
// Ready flag
// ---------------------------------------------------------------------------

/**
 * A fallback face would ship a card in the wrong type without anyone noticing,
 * so the harness refuses to declare itself ready until every declared face has
 * actually loaded. This stage draws no text, so the set is empty and the check
 * passes immediately — it is here so the card template inherits it rather than
 * reinventing it.
 */
async function fontsSettled() {
  if (!document.fonts) return true;
  await document.fonts.ready;
  const declared = [...document.fonts];
  const unloaded = declared.filter((f) => f.status !== 'loaded');
  if (unloaded.length > 0) {
    fail('fonts-fallback', unloaded.map((f) => `${f.family} ${f.weight} ${f.status}`).join(', '));
    return false;
  }
  return true;
}

/**
 * Readiness is two flags, not one, because loading and staging happen on two
 * different clocks.
 *
 *   __BDL_MODEL  the glb decoded and the scene graph is populated. The recorder
 *                waits for this in REAL time, with the fake clock frozen — no
 *                rAF is needed to reach it, which matters because a frozen
 *                clock fires no rAF at all.
 *   __BDL_READY  staging is applied and the shot is composed. Set by
 *                __BDL_STAGE(), which the recorder calls once the clock is
 *                frozen and primed, so anything the staging reads off the clock
 *                is the same number on every run.
 *
 * Collapsing these into one flag is what deadlocks: a ready flag that waits on
 * rAF can never be set while the clock that drives rAF is stopped.
 */

// Started at load, awaited by the stage call. No text is drawn on this stage,
// so the set is empty and it settles immediately; it is here so the card
// template inherits the same guarantee rather than reinventing it.
let fontsOk = null;
const fontsPromise = fontsSettled().then((ok) => {
  fontsOk = ok;
  state.fontsReady = ok;
  return ok;
});

window.__BDL_STAGE = () => {
  if (fontsOk === false) {
    fail('fonts-fallback', 'refusing to stage with a fallback face in use');
    return false;
  }
  const apply = VARIANTS[variant];
  if (!apply) {
    fail('unknown-variant', variant);
    return false;
  }
  apply();
  window.__BDL_READY = true;
  return true;
};

let mounted = false;

try {
  mountStage(canvas, {
    onError: (err) => fail('stage-error', err),
    onReady: () => {
      // The glb decoded and the scene graph is populated. Nothing has been
      // drawn with it yet — that is the recorder's prime pass, not ours.
      state.modelReady = true;
      // Fonts, then every tracked image DECODED — not merely downloaded. The
      // canopy and stone bump maps are loaded by a bare TextureLoader.load()
      // in stage.ts that nothing awaits, so without this the frames shade
      // differently depending on how much real time elapsed before frame 0.
      void fontsPromise
        .then(() => (SKIP_DECODE_GATE ? 0 : window.__BDL_IMAGES_DECODED()))
        .then((n) => {
          state.imagesTracked = n;
          window.__BDL_MODEL = true;
        });
    },
  });
  mounted = true;
} catch (err) {
  fail('mount-threw', err);
}

if (mounted) {
  document.title = `BDL-007 ${variant} ${framing}`;
}
