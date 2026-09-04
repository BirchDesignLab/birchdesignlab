/**
 * Deterministic frame recorder.
 *
 * The point of this module is that two runs of the same URL produce
 * byte-comparable frames. Three things are pinned to get there:
 *
 *   1. `page.clock.install()` runs BEFORE `page.goto()`. If it runs after, the
 *      page has already sampled the real clock and seeded its own animation
 *      phase from it — the first frame is then whatever wall-clock time it
 *      happened to be, and the loop seam moves between runs.
 *   2. Math.random is replaced, via an init script on the CONTEXT, with a
 *      seeded mulberry32. Init scripts on the context run before any page
 *      script on every frame, including iframes.
 *   3. Time advances in explicit `clock.runFor()` steps, never by waiting.
 *      Nothing is left to how fast the GPU happened to be. This needs BOTH
 *      `clock.install()` and `clock.pauseAt()` — install on its own leaves the
 *      clock ticking with real time. See the call site.
 *
 * The 30fps step is 33.333ms, which is not an integer. Stepping a flat 33ms
 * drifts 10ms per second — a full frame every 3 seconds, so an 8s loop ends
 * 2.5 frames early and the seam does not close. See stepCycle().
 */
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { frameName } from './frames.mjs';

/** Fixed wall-clock the faked page clock starts from. Arbitrary, but pinned. */
const EPOCH = new Date('2026-09-01T12:00:00.000Z');

/**
 * Steps run after the model resolves and before anything is staged or kept.
 * Fixed, not load-dependent: the point is that the absolute fake time at
 * frame 0 is the same number in every run. Four is enough for the first draw
 * plus the lazy shader compiles behind it.
 */
const PRIME_FRAMES = 4;

/** Default Math.random seed. Change it to reshuffle every stochastic field. */
export const DEFAULT_SEED = 20260902;

/**
 * Integer ms steps for one second of OUTPUT video, distributed so their sum is
 * exact and the remainder is spread evenly rather than bunched at the front.
 *
 * 30fps is 33.333ms, which is not an integer. A flat 33ms drifts a full frame
 * every three seconds, so an 8s loop ends ~2.5 frames early and never closes.
 * Bresenham gives 33,33,34,33,33,34,... — exact sum, even spread.
 *
 * `timeScale` compresses or dilates scene time against video time. At 2.5, one
 * second of 30fps video advances the scene 2.5 seconds, so a 20s breath fits
 * inside an 8s clip. The steps stay integers and still sum exactly.
 */
export function stepCycle(fps, timeScale = 1) {
  const total = Math.round(1000 * timeScale); // scene-ms per second of video
  return Array.from(
    { length: fps },
    (_, i) => Math.floor((total * (i + 1)) / fps) - Math.floor((total * i) / fps)
  );
}

/**
 * Init script source. Stringified and injected, so it cannot close over
 * anything in this module — the seed is interpolated in by the caller.
 */
function seedScript(seed) {
  return `(() => {
    let a = ${seed} >>> 0;
    const mulberry32 = () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    Math.random = mulberry32;
    // Anything reaching for crypto entropy gets the same stream, so a field
    // that seeds itself from getRandomValues is pinned too.
    if (globalThis.crypto && globalThis.crypto.getRandomValues) {
      const original = globalThis.crypto.getRandomValues.bind(globalThis.crypto);
      globalThis.crypto.getRandomValues = (arr) => {
        if (!ArrayBuffer.isView(arr)) return original(arr);
        for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(mulberry32() * 256);
        return arr;
      };
    }
    globalThis.__BDL_DETERMINISTIC = ${seed};
  })();`;
}

/**
 * Record a run of frames.
 *
 * @param {object} opts
 * @param {string}   opts.url                page to record
 * @param {{width:number,height:number}} opts.viewport
 * @param {number}  [opts.deviceScaleFactor=1]
 * @param {number}  [opts.fps=30]
 * @param {number}  [opts.timeScale=1]       scene-seconds per video-second. 2.5
 *                                           fits a 20s breath into an 8s clip.
 * @param {number}   opts.seconds            loop length; frame count is seconds*fps
 * @param {{x:number,y:number,width:number,height:number}} [opts.clip]
 * @param {string[]}[opts.launchArgs=[]]     extra chromium flags
 * @param {string}   opts.framesDir          where PNGs land (wiped first)
 * @param {string}  [opts.readyFlag='__BDL_READY']  window flag to await
 * @param {string}  [opts.readySelector]     selector to await instead/as well
 * @param {number}  [opts.readyTimeoutMs=30000]
 * @param {number}  [opts.settleFrames=0]    frames stepped and discarded before
 *                                           frame 0, to let a field reach its
 *                                           steady state off-camera
 * @param {number}  [opts.seed]
 * @param {string}  [opts.stageFn]           name of a global the page exposes for
 *                                           variant staging, called once after the
 *                                           clock is frozen and primed
 * @param {string[]}[opts.initScripts=[]]    extra context init scripts, run
 *                                           before any page script (used by the
 *                                           determinism probe to instrument
 *                                           Math.random / performance.now)
 * @param {(page:object,i:number,total:number)=>Promise<void>} [opts.onFrame]
 *                                           called before each kept frame, after
 *                                           the clock step. Variant C's orbit
 *                                           advances here so the turn stays
 *                                           locked to the fake clock rather than
 *                                           to however many frames the browser ran.
 * @param {boolean} [opts.loop=true]         capture one extra frame (index N)
 *                                           so the encoder can test the seam
 * @returns {Promise<{framesDir:string,frameCount:number,extraFrame:string|null,
 *                    width:number,height:number,fps:number,seconds:number}>}
 */
export async function capture(opts) {
  const {
    url,
    viewport,
    deviceScaleFactor = 1,
    fps = 30,
    timeScale = 1,
    seconds,
    clip,
    launchArgs = [],
    framesDir,
    readyFlag = '__BDL_READY',
    readySelector,
    readyTimeoutMs = 30_000,
    settleFrames = 0,
    seed = DEFAULT_SEED,
    initScripts = [],
    stageFn,
    onFrame,
    // Only screenshot these frame indices. The clock still steps through every
    // frame, so the scene evolves identically — this just skips writing PNGs
    // nobody is going to look at. A 20s seam check needs frames 0, 1 and N;
    // shooting the other 598 at 2160x2160 is most of the wall-clock cost.
    keepFrames = null,
    // Frames shot BEYOND the loop period. 1 is enough to test whether the wrap
    // closes; a cross-dissolve needs a whole dissolve's worth, because it mixes
    // the frames that would have come next into the opening frames.
    extraFrames = 1,
    // Regression hooks. Production callers must never set these; they exist so
    // scripts/selftest-capture.mjs can prove that removing either guard
    // actually reintroduces nondeterminism, rather than asserting it does.
    __unsafeSkipClockPause = false,
    __unsafeSkipNetworkQuiet = false,
    loop = true,
    onProgress,
  } = opts;

  if (!url) throw new Error('capture: url is required');
  if (!viewport?.width || !viewport?.height) throw new Error('capture: viewport {width,height} is required');
  if (!seconds || seconds <= 0) throw new Error('capture: seconds must be > 0');
  if (!framesDir) throw new Error('capture: framesDir is required');

  const frameCount = Math.round(seconds * fps);
  // For a loop we shoot one past the end. Frame `frameCount` sits exactly one
  // period after frame 0, so encode can prove the seam closes before dropping it.
  const shots = loop ? frameCount + Math.max(1, extraFrames) : frameCount;
  const steps = stepCycle(fps, timeScale);

  await rm(framesDir, { recursive: true, force: true });
  await mkdir(framesDir, { recursive: true });

  /**
   * GPU rasterisation, opt-in via BDL_GPU=1.
   *
   * Playwright's headless Chromium defaults to SwiftShader — pure software
   * rasterisation. Confirmed on this machine:
   *
   *   ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)
   *
   * So every pixel of a WebGL scene is rendered on the CPU, which is why a
   * 1500-step take pegs every core for ~20 minutes and never touches the
   * discrete GPU (an RTX 3070 here). d3d11 hands it to the real driver.
   *
   * NOT the default, and it should not become one without a check first:
   * changing rasteriser changes pixels. Antialiasing, shader precision and the
   * ACES tone-mapping roll-off all differ between SwiftShader and a hardware
   * driver, so a GPU render is not a drop-in sibling for a SwiftShader one —
   * do not mix the two within a set that ships together.
   *
   * To adopt: render one asset both ways, diff them with lib/ffmpeg.mjs
   * lumaDelta, and look at the frames. If the difference is edge-level, switch
   * everything over and re-render the whole set as a matched pair.
   */
  const useGpu = process.env.BDL_GPU === '1';

  const browser = await chromium.launch({
    args: [
      // A consistent GL backend beats whatever the host would otherwise pick.
      '--force-color-profile=srgb',
      '--disable-lcd-text',
      '--hide-scrollbars',
      ...(useGpu
        ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization']
        : []),
      ...launchArgs,
    ],
  });

  try {
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor,
      colorScheme: 'light',
      reducedMotion: 'no-preference',
      timezoneId: 'UTC',
      locale: 'en-US',
    });

    // (b) seed BEFORE any page script has a chance to sample entropy.
    await context.addInitScript(seedScript(seed));
    // Instrumentation goes in after the seed so a probe can observe the seeded
    // Math.random rather than replacing it.
    for (const src of initScripts) await context.addInitScript(src);

    const page = await context.newPage();

    // (a) install the clock BEFORE goto. Order matters, see the module header.
    //
    // install() alone is NOT enough, and the failure is silent. An installed
    // clock still ticks along with real time; runFor() only jumps it further
    // forward. So a page that spends 8 real seconds decoding a 3.2MB glb has
    // already advanced its own clock by 8 seconds before frame 0 is taken, and
    // that number is different on every run. Measured, not assumed:
    //
    //     install only      3s real idle advanced performance.now by 3003ms
    //     install + pauseAt 3s real idle advanced performance.now by    0ms
    //
    // pauseAt() freezes it, so runFor() is the ONLY thing that moves time and
    // two runs see an identical clock. Removing this line reintroduces a
    // nondeterminism that no test downstream would obviously attribute here.
    await page.clock.install({ time: EPOCH });
    if (!__unsafeSkipClockPause) await page.clock.pauseAt(EPOCH);

    await page.goto(url, { waitUntil: 'load', timeout: readyTimeoutMs });

    // (c) Wait for the model in REAL time, against a frozen clock.
    //
    // This split is the whole trick, and it is worth being explicit about.
    // Loading is not deterministic: fetching 3.2MB of glb, decoding it through
    // the Draco worker, and decoding two texture images take whatever they
    // take. If the fake clock advanced during that window, frame 0 would sit
    // at a different absolute time on every run — and the moss breath is a
    // function of absolute time, so every frame would differ.
    //
    // None of that loading needs the clock: fetch, worker messages and image
    // decode are event-driven, not timer-driven. So the clock stays frozen at
    // EPOCH while we wait in real time, and only then does time move, in a
    // FIXED number of fixed-size steps. Everything from frame 0 onward is
    // therefore at an identical absolute instant in every run.
    await waitForReady(page, { readyFlag, readySelector, readyTimeoutMs });

    // The model resolving is NOT the same as the scene being fully dressed.
    // stage.ts kicks off two standalone bump textures (canopy, stone) through
    // THREE.TextureLoader and never waits for them — they are wired onto the
    // materials whenever they happen to decode. Start recording before that and
    // the early frames shade differently from run to run, purely on who won the
    // race. So: wait for the network to actually go quiet.
    //
    // Counted here in Node, off Playwright's request events, rather than with
    // waitForLoadState('networkidle') — the page's own clock is frozen, and a
    // quiet-period timer that runs on that clock would never elapse.
    if (!__unsafeSkipNetworkQuiet) {
      await waitForNetworkQuiet(page, { quietMs: 600, timeoutMs: readyTimeoutMs });
    }

    // Prime: a fixed handful of steps so the first real draw happens and the
    // moss/lichen shader programs (built lazily on first render, via
    // onBeforeCompile) are compiled before anything is staged or kept.
    for (let i = 0; i < PRIME_FRAMES; i++) {
      await page.clock.runFor(steps[i % steps.length]);
    }

    // Variant staging, at a now-fixed fake instant. Anything the staging does
    // that reads the clock — and in this scene the firefly scatter seeds
    // itself from performance.now() — therefore sees the same number every run.
    if (stageFn) {
      const staged = await page.evaluate((fn) => {
        if (typeof globalThis[fn] !== 'function') return false;
        globalThis[fn]();
        return true;
      }, stageFn);
      if (!staged) throw new Error(`capture: page exposes no ${stageFn}() to stage the shot`);
    }

    // Burn-in: step the clock without recording, so any startup transient
    // (a fade-in, the staging gesture settling, a field reaching steady state)
    // is over before frame 0 defines the loop.
    for (let i = 0; i < settleFrames; i++) {
      await page.clock.runFor(steps[(PRIME_FRAMES + i) % steps.length]);
    }

      const keep = keepFrames ? new Set(keepFrames) : null;

    const shotOpts = { type: 'png', animations: 'allow', caret: 'hide', scale: 'device' };
    if (clip) shotOpts.clip = clip;

    for (let i = 0; i < shots; i++) {
      // Frame 0 is the state at t=0 — shot before the first step, so that
      // frame `frameCount` lands exactly one period later, not one step past it.
      // Frame-locked staging (variant C's orbit) goes BEFORE the step, not
      // after. The scene only redraws inside runFor(), so staging applied after
      // it would not be on screen until the NEXT frame — and whether the
      // compositor happened to catch it before the screenshot was a race that
      // showed up as a handful of near-identical-but-not-equal frames.
      // `frameCount`, not `shots`, is the period: the probe frame at index
      // frameCount must land exactly one full revolution on.
      if (onFrame) await onFrame(page, i, frameCount);
      if (i > 0) await page.clock.runFor(steps[(i - 1) % steps.length]);
      if (!keep || keep.has(i)) {
        await page.screenshot({ ...shotOpts, path: path.join(framesDir, frameName(i)) });
      }
      if (onProgress && i % 30 === 0) onProgress(i, shots);
    }

    const outW = Math.round((clip?.width ?? viewport.width) * deviceScaleFactor);
    const outH = Math.round((clip?.height ?? viewport.height) * deviceScaleFactor);

    return {
      framesDir,
      frameCount,
      extraFrame: loop ? path.join(framesDir, frameName(frameCount)) : null,
      extraFrames: loop ? Math.max(1, extraFrames) : 0,
      width: outW,
      height: outH,
      fps,
      seconds,
      timeScale,
      sceneSeconds: +(seconds * timeScale).toFixed(6),
    };
  } finally {
    await browser.close();
  }
}

/**
 * Resolve once no request has been in flight for `quietMs` of REAL time.
 *
 * Deliberately Node-side: the page clock is frozen during loading, so any
 * quiet-period timer living in the page would never fire.
 */
async function waitForNetworkQuiet(page, { quietMs = 600, timeoutMs = 30_000 } = {}) {
  let inFlight = 0;
  const onRequest = () => { inFlight++; };
  const onSettled = () => { inFlight = Math.max(0, inFlight - 1); };

  page.on('request', onRequest);
  page.on('requestfinished', onSettled);
  page.on('requestfailed', onSettled);

  try {
    const deadline = Date.now() + timeoutMs;
    let quietSince = inFlight === 0 ? Date.now() : null;

    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 50));
      if (inFlight > 0) {
        quietSince = null;
      } else if (quietSince === null) {
        quietSince = Date.now();
      } else if (Date.now() - quietSince >= quietMs) {
        return;
      }
    }
    throw new Error(`capture: network never went quiet for ${quietMs}ms within ${timeoutMs}ms`);
  } finally {
    page.off('request', onRequest);
    page.off('requestfinished', onSettled);
    page.off('requestfailed', onSettled);
  }
}

/**
 * Wait for the page to say it is ready to be recorded.
 *
 * Prefers an explicit `window.__BDL_READY` flag. No page on the site sets one
 * today, so a selector is the working fallback — but the flag is checked first
 * and cheaply, so a scene can opt in later without touching this file.
 */
async function waitForReady(page, { readyFlag, readySelector, readyTimeoutMs }) {
  if (readySelector) {
    await page.waitForSelector(readySelector, { state: 'visible', timeout: readyTimeoutMs });
  }

  if (!readyFlag) return;

  const flagSeen = await page
    .waitForFunction(
      (flag) => Boolean(globalThis[flag]),
      readyFlag,
      // Short poll: if no page sets the flag, fall through to the selector
      // rather than burning the full timeout on every single capture.
      { timeout: readySelector ? 2_000 : readyTimeoutMs, polling: 100 }
    )
    .then(() => true)
    .catch(() => false);

  if (!flagSeen && !readySelector) {
    throw new Error(
      `capture: neither window.${readyFlag} nor a readySelector resolved within ${readyTimeoutMs}ms`
    );
  }
}
