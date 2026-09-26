/**
 * @module vaporwave/marble/live-bust
 *
 * About's one WebGL canvas: the live, draggable Venus bust (Tier 3 Stage 3,
 * wave B2, seat vw-4b; the plan is proofs/marble.md, "The live-bust plan").
 * Loaded only by a dynamic `import()` from About.astro's small mount script,
 * once the centrepiece nears the viewport and the main thread is idle, so
 * three.js and the GLB never ship on any other vaporwave page. Built on the
 * shared scene module (./scene.js) so the live pose, material and lighting
 * can never drift from the offline poster the same module renders.
 *
 * Contract with About.astro: the caller has already mounted a <canvas> and
 * a poster element (the still `<picture>`) as siblings, absolutely
 * positioned over the same box. This module renders the first live frame in
 * the poster's exact pose (DEFAULT_VENUS_VIEW from scene.js), then fades the
 * poster out over FADE_MS; the poster stays in the DOM so a context loss (or
 * a script error) can bring it back.
 *
 * Interaction, rigid on purpose (the founder dislikes rubbery motion):
 *   - Drag: yaw follows the pointer 1:1 (no smoothing lag, no spring). No
 *     pitch control (a founder-facing call: see the report's
 *     `calls_for_founder` -- the alternative the plan allows, "or none").
 *   - Release: an exponential glide (time constant RELEASE_TAU_S, capped
 *     release velocity), decaying to a stop with no bounce or settle-back.
 *   - Idle turn: one turn per 60s at 30fps, resuming IDLE_RESUME_MS after
 *     the last drag or key input, eased in over IDLE_EASE_MS.
 *   - Keyboard: the canvas is focusable once live (aria-label, role
 *     "application"); ArrowLeft/ArrowRight turn it by a fixed step.
 * Render on demand only: a rAF loop runs while dragging, gliding or idle
 * turning, and stops completely otherwise (a `setTimeout` wakes it again
 * when the idle-turn threshold arrives). Off-screen or a hidden tab holds
 * the loop stopped regardless (`setVisible`, called by About.astro's mount
 * script from its own IntersectionObserver/`visibilitychange`).
 */
import * as THREE from 'three';
import { createStage, loadVenus, DEFAULT_VENUS_VIEW, MARBLE_TINTS } from './scene.js';
// Vite/Astro's `*?url` convention (see src/experiments/bdl-007/stage.ts):
// emits the GLB into /_astro/ under a content-hashed name instead of
// shipping it as a public/ path, so it is cached immutably and a future
// mesh swap self-invalidates under a new URL.
import venusUrl from './venus.glb?url';

type MarbleTintName = keyof typeof MARBLE_TINTS;

/** stage3-decisions.md, "Answers at the start of B2" item 1: Venus default
    tint is white marble with pastel rims (the pink/cyan rim lights carry
    the pastel read, not the stone tint). */
const TINT: MarbleTintName = 'white';

const IDLE_TURN_RADS_PER_S = (Math.PI * 2) / 60; // one turn per 60s
const IDLE_FPS = 30;
const IDLE_FRAME_MS = 1000 / IDLE_FPS;
const IDLE_RESUME_MS = 4000; // resumes ~4s after the last input
const IDLE_EASE_MS = 1200; // eases in over ~1.2s
const RELEASE_TAU_S = 0.35; // exponential glide time constant
const RELEASE_MAX_VEL = Math.PI * 2.2; // rad/s cap on a flicked release
// rad/s below which the glide is "stopped". B2 fix round: 0.0015 let an
// imperceptible tail keep the render loop alive for several extra seconds
// after a flick (the W1 critic measured ~26 draws/s of motion nobody could
// see); at the release cap of RELEASE_MAX_VEL and tau 0.35s, 0.02 rad/s is
// still under a visible drift (about 1 degree over 1s) while stopping the
// loop noticeably sooner.
const YAW_VELOCITY_EPS = 0.02;
const FADE_MS = 200;
const KEY_STEP_RAD = THREE.MathUtils.degToRad(6);
// Dragging the full canvas width turns the bust this many radians. Chosen so
// a full-width drag reads as "about a quarter turn", the 1:1 feel the plan
// asks for without needing the pointer to travel multiple screens for a
// full turn.
const DRAG_RADIANS_PER_WIDTH = Math.PI * 0.9;
const DPR_CAP_FINE = 1.5;
const DPR_CAP_COARSE = 1.25;
const NARROW_VIEWPORT_PX = 700;
// A flick's release velocity is measured over the pointer's last samples
// within this window, so a drag that pauses before release (no flick
// intended) reads as zero velocity rather than an average over the whole
// drag.
const VELOCITY_SAMPLE_MS = 90;

export interface MountOptions {
  canvas: HTMLCanvasElement;
  poster: HTMLElement;
  /** Called once the first live frame has rendered and the poster's fade has
      started (About.astro uses this only for its own bookkeeping/logging;
      not required for correctness). */
  onLive?: () => void;
}

export interface LiveBustHandle {
  /** Disposes every GPU resource (geometry, materials, the PMREM render
      target) and releases the WebGL context. Call at most once. */
  dispose(): void;
  /** Called by About.astro's mount script from its own IntersectionObserver
      and `visibilitychange` listeners. Off-screen or a hidden tab holds the
      render loop fully stopped regardless of drag/glide/idle state. */
  setVisible(visible: boolean): void;
}

const coarsePointer = () => matchMedia('(pointer: coarse)').matches;
const narrowViewport = () => innerWidth < NARROW_VIEWPORT_PX;
// min(devicePixelRatio, cap): B2 fix round found this returning the cap
// unconditionally, so a DPR-1 desktop rendered at 1.5x for nothing (the W1
// critic measured a 327px drawing buffer for a 218 CSS px canvas). The cap
// is still a ceiling for high-DPR/coarse-pointer devices, not a floor.
const devicePixelRatioCap = () => Math.min(devicePixelRatio, coarsePointer() || narrowViewport() ? DPR_CAP_COARSE : DPR_CAP_FINE);

const LIVE_LABEL =
  'The Venus bust in three dimensions, live. Drag to turn it, or use the left and right arrow keys.';

/**
 * Mounts the live bust onto `canvas` and returns a teardown function that
 * disposes every GPU resource (geometry, materials, the PMREM render
 * target) and releases the WebGL context. Safe to call at most once per
 * canvas; About.astro's mount script never calls it twice without an
 * intervening teardown.
 */
export function mountLiveBust(opts: MountOptions): LiveBustHandle {
  const { canvas, poster, onLive } = opts;

  let disposed = false;
  let contextLost = false;
  let visible = true; // combines "in view" and "tab visible"; set by the caller
  let raf = 0;
  let idleWakeTimer: ReturnType<typeof setTimeout> | undefined;
  let drawCount = 0;
  // Set the instant initStage() calls createStage({ canvas }) (which itself
  // calls canvas.getContext(...) synchronously). dispose()'s own
  // WEBGL_lose_context probe uses this to avoid calling canvas.getContext()
  // -- which creates a context on first call -- before any renderer has
  // asked for one, e.g. a teardown that lands before the dynamic import of
  // this module even resolves.
  let contextCreated = false;

  let dragging = false;
  let activePointerId = -1;
  let lastX = 0;
  let lastMoveTime = 0;
  let yawOffset = 0; // radians, relative to DEFAULT_VENUS_VIEW.yaw
  let yawVel = 0; // rad/s, used only during the post-release glide
  let lastFrameTime = 0;
  let lastInteraction = performance.now();
  // A short ring of the last few pointermove samples, for a flick's release
  // velocity (an instantaneous last-delta would be noisy; averaging the
  // whole drag would ignore a deliberate stop-then-release).
  const samples: Array<{ t: number; x: number }> = [];

  let stage: ReturnType<typeof createStage> | null = null;
  let group: THREE.Object3D | null = null;

  const drawCountAttr = () => {
    canvas.dataset.draws = String(drawCount);
  };
  drawCountAttr();

  function setLiveA11y(live: boolean) {
    if (live) {
      canvas.removeAttribute('aria-hidden');
      canvas.setAttribute('role', 'application');
      canvas.setAttribute('aria-label', LIVE_LABEL);
      canvas.tabIndex = 0;
    } else {
      canvas.setAttribute('aria-hidden', 'true');
      canvas.removeAttribute('role');
      canvas.removeAttribute('aria-label');
      canvas.tabIndex = -1;
    }
  }

  function showPoster() {
    poster.style.opacity = '1';
  }
  function hidePosterSoon() {
    // Fade, don't hide instantly: the plan's "no visible jump" only holds
    // because the live canvas is already drawing the identical pose
    // underneath while the poster is still the only thing on screen.
    requestAnimationFrame(() => {
      poster.style.transition = `opacity ${FADE_MS}ms ease`;
      poster.style.opacity = '0';
    });
  }

  function isActiveNow(now: number): boolean {
    if (dragging) return true;
    if (Math.abs(yawVel) > YAW_VELOCITY_EPS) return true;
    if (now - lastInteraction > IDLE_RESUME_MS) return true;
    return false;
  }

  function scheduleIdleWake(now: number) {
    clearTimeout(idleWakeTimer);
    if (disposed || contextLost) return;
    const wait = Math.max(0, lastInteraction + IDLE_RESUME_MS - now);
    idleWakeTimer = setTimeout(() => {
      if (!disposed && !contextLost) requestFrame();
    }, wait + 16);
  }

  function requestFrame() {
    if (raf || disposed || contextLost || !visible) return;
    raf = requestAnimationFrame(tick);
  }

  function renderFrame() {
    if (!stage) return;
    stage.renderer.render(stage.scene, stage.camera);
    drawCount++;
    drawCountAttr();
  }

  function tick(now: number) {
    raf = 0;
    if (disposed || contextLost || !visible || !stage || !group) return;

    const idleOnly = !dragging && Math.abs(yawVel) <= YAW_VELOCITY_EPS;
    if (idleOnly) {
      // Idle-turn frames are throttled to IDLE_FPS; dragging and the
      // release glide render every rAF for crispness.
      if (now - lastFrameTime < IDLE_FRAME_MS) {
        if (isActiveNow(now)) requestFrame();
        else scheduleIdleWake(now);
        return;
      }
    }
    const dt = Math.min((now - (lastFrameTime || now)) / 1000, 1 / 15);
    lastFrameTime = now;

    if (!dragging) {
      if (Math.abs(yawVel) > YAW_VELOCITY_EPS) {
        yawOffset += yawVel * dt;
        yawVel *= Math.exp(-dt / RELEASE_TAU_S);
        if (Math.abs(yawVel) < YAW_VELOCITY_EPS) yawVel = 0;
      } else if (now - lastInteraction > IDLE_RESUME_MS) {
        const easeT = Math.min(1, (now - lastInteraction - IDLE_RESUME_MS) / IDLE_EASE_MS);
        yawOffset += IDLE_TURN_RADS_PER_S * easeT * dt;
      }
    }

    group.rotation.y = DEFAULT_VENUS_VIEW.yaw + yawOffset;
    renderFrame();

    if (isActiveNow(now)) requestFrame();
    else scheduleIdleWake(now);
  }

  function velocityFromSamples(now: number): number {
    // Drop samples older than the window, then use the oldest remaining one
    // and `now` as the two ends: a flick's speed, not the whole drag's.
    while (samples.length && now - samples[0].t > VELOCITY_SAMPLE_MS) samples.shift();
    if (samples.length < 2) return 0;
    const first = samples[0];
    const last = samples[samples.length - 1];
    const dt = (last.t - first.t) / 1000;
    if (dt <= 0) return 0;
    const dx = last.x - first.x;
    const radiansPerPx = DRAG_RADIANS_PER_WIDTH / Math.max(1, canvas.clientWidth);
    return THREE.MathUtils.clamp((dx * radiansPerPx) / dt, -RELEASE_MAX_VEL, RELEASE_MAX_VEL);
  }

  function onPointerDown(e: PointerEvent) {
    if (contextLost || !stage) return;
    // Only the primary button/touch/pen contact; a secondary button drag
    // (e.g. right-click) should not spin the bust.
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    dragging = true;
    activePointerId = e.pointerId;
    lastX = e.clientX;
    lastMoveTime = performance.now();
    yawVel = 0;
    samples.length = 0;
    samples.push({ t: lastMoveTime, x: e.clientX });
    lastInteraction = lastMoveTime;
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('is-dragging');
    requestFrame();
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging || e.pointerId !== activePointerId) return;
    const now = performance.now();
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    lastMoveTime = now;
    const radiansPerPx = DRAG_RADIANS_PER_WIDTH / Math.max(1, canvas.clientWidth);
    // 1:1, applied straight to the offset every event -- no smoothing, no
    // spring, exactly the plan's "no lag" requirement.
    yawOffset += dx * radiansPerPx;
    lastInteraction = now;
    samples.push({ t: now, x: e.clientX });
    requestFrame();
  }

  function endDrag(e: PointerEvent) {
    if (e.pointerId !== activePointerId) return;
    const now = performance.now();
    yawVel = velocityFromSamples(now);
    dragging = false;
    activePointerId = -1;
    lastInteraction = now;
    canvas.classList.remove('is-dragging');
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    if (Math.abs(yawVel) > YAW_VELOCITY_EPS) requestFrame();
    else scheduleIdleWake(now);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (contextLost || !group) return;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    yawVel = 0;
    yawOffset += e.key === 'ArrowLeft' ? -KEY_STEP_RAD : KEY_STEP_RAD;
    lastInteraction = performance.now();
    requestFrame();
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('keydown', onKeyDown);

  function onContextLost(e: Event) {
    e.preventDefault();
    contextLost = true;
    cancelAnimationFrame(raf);
    raf = 0;
    clearTimeout(idleWakeTimer);
    setLiveA11y(false);
    showPoster();
  }

  function onContextRestored() {
    // The plan calls for a rebuild on restore, not just resuming the loop:
    // rebuildLive() disposes whatever the lost context left behind and
    // reruns the same init-and-reveal sequence the first mount used.
    void rebuildLive();
  }

  canvas.addEventListener('webglcontextlost', onContextLost, false);
  canvas.addEventListener('webglcontextrestored', onContextRestored, false);

  // `skipGpuDispose`: on a real context loss, the GPU resources a stage's
  // dispose() would delete are already invalid (the WebGL spec: every object
  // from a lost context stops being renderable and must be recreated, not
  // cleaned up). B2 fix round: calling stage.dispose() -> renderer.dispose()
  // here anyway (three.js's own dispose forces a second, redundant context
  // loss internally) produced the W1 critic's "delete: object does not
  // belong to this context" console warnings on restore. Dropping the JS
  // references without issuing GL delete calls avoids that noise; the real
  // GPU memory was already freed by the loss itself.
  function disposeStage(skipGpuDispose = false) {
    if (!stage) return;
    if (!skipGpuDispose) stage.dispose();
    stage = null;
    group = null;
  }

  async function rebuildLive() {
    // contextLost is still true here (onContextRestored -> rebuildLive,
    // before the next line resets it): the stage disposeStage() is about to
    // drop belongs to the context that just loss/restored, so skip its GPU
    // dispose calls (see disposeStage's own comment).
    disposeStage(contextLost);
    contextLost = false;
    yawOffset = 0;
    yawVel = 0;
    dragging = false;
    lastInteraction = performance.now();
    try {
      await initStage();
      setLiveA11y(true);
      hidePosterSoon();
      onLive?.();
    } catch (err) {
      // A restore that fails to rebuild (e.g. the GLB fetch fails on a
      // flaky connection) leaves the poster up -- correct per the README
      // ("the page must read fine with the canvas blank").
      console.error('[vaporwave] live bust failed to rebuild after context restore', err);
      contextLost = true; // keep the loop stopped; the poster is already back
    }
  }

  async function initStage() {
    // readback: false -- the live path never wants render()'s PNG (see
    // scene.js's createStage doc comment); explicit here even though
    // `!canvas` already defaults to it, since this call always passes a
    // canvas and the point is worth stating at the call site.
    const built = createStage({ quality: 'live', canvas, readback: false });
    contextCreated = true;
    // A dispose guard for an in-flight build (B2 fix round): dispose() can
    // land while this function is still awaiting loadVenus (teardown during
    // a view-transition swap races the dynamic import + GLB fetch that
    // preceded this call). Finishing the build anyway would assign a fresh
    // renderer/PMREM/env-map to the module-level `stage` after the module
    // considers itself torn down -- a real GPU leak, since nothing then ever
    // disposes it, and About.astro's contract promises teardown before the
    // next body replaces this one. Bail and dispose what was already built.
    if (disposed) { built.dispose(); return; }
    built.renderer.setPixelRatio(devicePixelRatioCap());
    const venusMesh = await loadVenus(venusUrl);
    if (disposed) { built.dispose(); return; }
    built.setVenusMesh(venusMesh);
    const size = Math.max(1, canvas.clientWidth || canvas.clientHeight || 256);
    built.render({
      prop: 'venus',
      tint: TINT,
      size,
      yaw: DEFAULT_VENUS_VIEW.yaw,
      elevation: DEFAULT_VENUS_VIEW.elevation,
      pad: DEFAULT_VENUS_VIEW.pad,
    });
    stage = built;
    group = built.getCurrentProp();
    drawCount++;
    drawCountAttr();
  }

  function onResize() {
    if (disposed || contextLost || !stage) return;
    stage.renderer.setPixelRatio(devicePixelRatioCap());
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    stage.renderer.setSize(w, h, false);
    // No aspect update: the stage's camera is fixed at aspect 1 (the offline
    // stills and this canvas are both square boxes -- see scene.js), so a
    // resize never needs to re-fit the framing, only the drawing buffer.
    if (visible) renderFrame();
  }
  const resizeObserver = new ResizeObserver(onResize);
  resizeObserver.observe(canvas);

  const ready = (async () => {
    try {
      await initStage();
      setLiveA11y(true);
      hidePosterSoon();
      onLive?.();
    } catch (err) {
      console.error('[vaporwave] live bust failed to start', err);
      // Leave the poster up and the canvas inert; the page still reads fine.
      disposeStage();
    }
  })();

  function setVisible(next: boolean) {
    visible = next;
    if (!visible) {
      cancelAnimationFrame(raf);
      raf = 0;
      clearTimeout(idleWakeTimer);
      return;
    }
    const now = performance.now();
    if (isActiveNow(now)) requestFrame();
    else scheduleIdleWake(now);
  }

  function dispose() {
    disposed = true;
    void ready;
    cancelAnimationFrame(raf);
    raf = 0;
    clearTimeout(idleWakeTimer);
    resizeObserver.disconnect();
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', endDrag);
    canvas.removeEventListener('pointercancel', endDrag);
    canvas.removeEventListener('keydown', onKeyDown);
    canvas.removeEventListener('webglcontextlost', onContextLost, false);
    canvas.removeEventListener('webglcontextrestored', onContextRestored, false);
    disposeStage(contextLost);
    // Release the context explicitly (the README's teardown rule), rather
    // than leaving it to garbage collection -- but only probe for one if a
    // renderer actually created it: canvas.getContext() creates a context on
    // its first call, so calling it here unconditionally could hand a
    // still-in-flight initStage() (see its own dispose guard) a context that
    // was created with none of the attributes createStage() asks for, the
    // instant this teardown races ahead of that build's first render.
    if (contextCreated) {
      const ext = canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context')
        ?? canvas.getContext('webgl')?.getExtension('WEBGL_lose_context');
      ext?.loseContext();
    }
  }

  return { dispose, setVisible };
}
