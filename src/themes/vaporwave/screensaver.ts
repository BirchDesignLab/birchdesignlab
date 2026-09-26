/**
 * Contact's screensaver.scr window (Tier 3 Stage 3 wave B2, vw-3 item 3).
 *
 * Settings and Preview are real buttons now (Contact.astro; the README's
 * rule for a live control: the visible label sits in an aria-hidden span,
 * the button itself carries an aria-label starting with the words the
 * visitor sees). Settings cycles three loops:
 *   - "sunset": the existing resort horizon (parts/Horizon.astro), a static
 *     CSS scene, unchanged.
 *   - "marble": the marble sphere still (stills/sphere-white-512.webp) in a
 *     DVD-logo bounce, the classic screensaver motion, tinting on every wall
 *     hit.
 *   - "pipes": a 2D read of the Windows 3D Pipes screensaver in the school's
 *     neon palette, elbow-jointed walkers on a grid.
 * Preview runs the current loop full-window (a fixed layer over the
 * viewport) until a click, a key or Escape, then returns focus to Preview.
 *
 * Contract: at most one WebGL canvas on the page (this adds none: both
 * animated loops draw on a plain 2D canvas); everything pauses off-screen
 * and when the tab is hidden; the small preview and the full-window preview
 * are throttled to the school's 30 fps budget and capped at devicePixelRatio
 * 1.5; 2D context loss (`contextlost`/`contextrestored`, which Chromium now
 * fires for accelerated 2D canvases the same as WebGL) is handled; both
 * canvases release their raf loop and listeners on teardown.
 */
import sphereWebp from './stills/sphere-white-512.webp?url';

const THEME = 'vaporwave';
const MAX_DPR = 1.5;
const FRAME_BUDGET = 1000 / 30;
const FRAME_TOLERANCE = 4;

type Mode = 'sunset' | 'marble' | 'pipes';
const MODES: Mode[] = ['sunset', 'marble', 'pipes'];
const MODE_LABEL: Record<Mode, string> = {
  sunset: 'resort sunset',
  marble: 'marble sphere',
  pipes: '3D pipes',
};

const PALETTE_TOKENS = ['--neon-pink', '--neon-cyan', '--neon-mint', '--neon-lav', '--sun-yellow'] as const;

function readPalette(): string[] {
  const cs = getComputedStyle(document.documentElement);
  return PALETTE_TOKENS.map((t) => cs.getPropertyValue(t).trim()).filter(Boolean);
}

interface Bouncer {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
}

interface Pipe {
  /** Pixel position, in the canvas's own drawing-buffer coordinates. */
  x: number;
  y: number;
  /** Unit direction, grid-aligned: exactly one of dx/dy is +/-1. */
  dx: number;
  dy: number;
  color: string;
  /** Px travelled since the last grid vertex (where a pipe may turn). */
  travelled: number;
  /** Vertices turned since this pipe was last recoloured/relocated. */
  age: number;
  /** Where the CURRENT straight run began (the last elbow, or its spawn
      point): see drawPipes' header for why the whole run redraws each
      frame from here, not just the newest bit. */
  runX: number;
  runY: number;
}

/** B2 fix round, item 3: the visible sphere sits well inside the still's own
    512x512 canvas (a transparent margin for its cast shadow), so drawing it
    at a box "a third of the window" left the sphere itself reading smaller
    still. Measured bbox (scripts/themes/vaporwave, sphere-white-512.webp):
    280 of 512px tall. SPHERE_FILL backs that out so the drawn *sphere*, not
    its transparent box, reads at about a third of the window's shorter side. */
const SPHERE_VISIBLE_FRACTION = 280 / 512;
const SPHERE_TARGET = 1 / 3;
const SPHERE_BOX_SCALE = SPHERE_TARGET / SPHERE_VISIBLE_FRACTION;

/* B2 fix round, item 4 (founder, 09-25-26: shaded 3D-looking tubes). The
   Windows 3D Pipes look on a 2D canvas. Each pipe is a persistent grid
   walker, ball-jointed at every grid vertex where it may turn. Nothing here
   fades: the field fills up solid, the way the original's pipework does,
   then the whole canvas clears and a fresh set of pipes starts.

   Fix round 3 (three attempts before this one held): the original draw drew
   only each frame's newest bit of tube, as three separate round-capped
   strokes (a base colour, then a highlight and a shadow offset
   perpendicular to travel) -- the B2 critic's "fine ribbing across every
   tube" was those strokes' round caps compositing at every frame's own
   seam, and its "cartoon eyes on each growing head" was the same two
   strokes' own round caps sitting side by side at the tip.

   Collapsing the three strokes into one gradient stroke, then making every
   colour opaque, then pinning the gradient's own anchor so it does not
   drift frame to frame, each removed one plausible cause and each still
   rippled: canvas rasterises every stroke() call's antialiasing on its own,
   so drawing a tube as many short abutting (or slightly overlapping)
   per-frame segments leaves a seam at every call's own edge regardless of
   colour, cap or anchor. The fix that actually held restrokes the pipe's
   WHOLE current run every frame -- from `runX, runY` (the last elbow, or
   its spawn point) to its current tip, as ONE call -- instead of adding
   just the newest bit to what an earlier frame already drew. That costs
   re-touching already-correct pixels every frame, but every colour is
   opaque, so redrawing them is a no-op (identical input, identical
   output); what does change is that there is now only ONE antialiasing
   pass for the pipe's entire visible length, not one per frame. Runs reset
   at every real turn and at relocation, so this never redraws more than
   one grid cell's worth of frames' growth. `round` caps read as a single
   smoothly shaded capsule at the tip, not the two-round-cap eyes above. */
const PIPE_GEN_FRAMES = 480;

/** Mixes a `#rrggbb` colour toward an RGB target and returns an opaque
    `rgb()` string -- used for every pipe gradient/halo stop so none of
    them carry any alpha (see the file header for why that matters here). */
function shadeTowards(hex: string, target: readonly [number, number, number], amount: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  const [r, g, b] = m ? [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)] : [255, 255, 255];
  const mix = (c: number, t: number) => Math.round(c + (t - c) * amount);
  return `rgb(${mix(r, target[0])}, ${mix(g, target[1])}, ${mix(b, target[2])})`;
}
/** The pipes canvas's own resting fill (#0a0220), as the dark end of every
    tube's shading mixes toward it, not toward flat black. */
const PIPE_BG: readonly [number, number, number] = [10, 2, 32];
/** The depth-cue shadow's colour: opaque for the same reason as the tube
    and halo strokes (see the file header), so it does not depend on any
    one pipe's own colour. */
const PIPE_DEPTH_SHADOW = 'rgb(5, 1, 14)';

/** One animated 2D-canvas loop, shared shape for the small preview and the
    full-window one. Each instance owns its own rAF, resize and visibility
    plumbing so the two can run independently (only one is ever visible: the
    small one pauses while Preview's full-window copy is open). */
function createLoop(canvas: HTMLCanvasElement, sphere: HTMLImageElement) {
  const ctx = canvas.getContext('2d');
  let mode: Mode = 'marble';
  let running = false;
  let inView = true;
  let frame = 0;
  let lastDrawn = 0;
  let bouncer: Bouncer | null = null;
  let pipes: Pipe[] = [];
  let pipesAge = 0;
  let palette = readPalette();
  let lost = false;

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, MAX_DPR);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  };

  const resetMarble = () => {
    if (!canvas.width || !canvas.height) return;
    const size = Math.min(canvas.width, canvas.height) * SPHERE_BOX_SCALE;
    bouncer = {
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: size * 0.012 * (Math.random() < 0.5 ? -1 : 1),
      vy: size * 0.012 * (Math.random() < 0.5 ? -1 : 1),
      color: palette[0] ?? '#ff71ce',
    };
  };

  const resetPipes = () => {
    pipes = [];
    const w = canvas.width || 1;
    const h = canvas.height || 1;
    const cell = Math.max(18, Math.min(w, h) / 14);
    for (let i = 0; i < 4; i++) {
      // Snapped to the grid from the start, so the first segment a pipe
      // draws is already a true grid step, not a fractional one.
      const gx = Math.round((Math.random() * w) / cell);
      const gy = Math.round((Math.random() * h) / cell);
      pipes.push({
        x: gx * cell,
        y: gy * cell,
        dx: Math.random() < 0.5 ? 1 : -1,
        dy: 0,
        color: palette[i % palette.length] ?? '#01cdfe',
        travelled: 0,
        age: 0,
        runX: gx * cell,
        runY: gy * cell,
      });
    }
  };

  const drawMarble = () => {
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#0a0220';
    ctx.fillRect(0, 0, w, h);
    if (!bouncer) resetMarble();
    if (!bouncer || !sphere.complete || sphere.naturalWidth === 0) return;
    const size = Math.min(w, h) * SPHERE_BOX_SCALE;
    bouncer.x += bouncer.vx;
    bouncer.y += bouncer.vy;
    let bounced = false;
    if (bouncer.x - size / 2 <= 0 || bouncer.x + size / 2 >= w) {
      bouncer.vx *= -1;
      bouncer.x = Math.min(Math.max(bouncer.x, size / 2), w - size / 2);
      bounced = true;
    }
    if (bouncer.y - size / 2 <= 0 || bouncer.y + size / 2 >= h) {
      bouncer.vy *= -1;
      bouncer.y = Math.min(Math.max(bouncer.y, size / 2), h - size / 2);
      bounced = true;
    }
    if (bounced) {
      const next = palette[(palette.indexOf(bouncer.color) + 1 + palette.length) % palette.length];
      bouncer.color = next ?? bouncer.color;
    }
    ctx.save();
    ctx.shadowColor = bouncer.color;
    ctx.shadowBlur = size * 0.35;
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(sphere, bouncer.x - size / 2, bouncer.y - size / 2, size, size);
    ctx.restore();
  };

  /** Fills the canvas with the pipes' resting colour and starts a fresh set
      of walkers: the loop's "clearing and starting again" moment. */
  const startPipeGen = () => {
    if (ctx) {
      ctx.fillStyle = '#0a0220';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    pipesAge = 0;
    resetPipes();
  };

  const drawPipes = () => {
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    if (!pipes.length) startPipeGen();
    pipesAge += 1;
    if (pipesAge > PIPE_GEN_FRAMES) {
      startPipeGen();
      return;
    }
    const cell = Math.max(18, Math.min(w, h) / 14);
    const lineW = Math.max(6, cell * 0.42);
    const halfW = lineW / 2;
    const jointR = lineW * 0.62;
    const step = cell * 0.05;
    for (const pipe of pipes) {
      pipe.x += pipe.dx * step;
      pipe.y += pipe.dy * step;
      pipe.travelled += step;
      const lo = shadeTowards(pipe.color, PIPE_BG, 0.72);
      const hi = shadeTowards(pipe.color, [255, 255, 255], 0.62);
      const haloColor = shadeTowards(pipe.color, [255, 255, 255], 0.12);

      // Every layer below strokes the pipe's WHOLE current run, from
      // `runX, runY` (the last elbow, or its spawn point) to its current
      // tip, as ONE call -- not the newest bit alone, added to what an
      // earlier frame already drew. Two earlier cuts tried the
      // per-frame-increment route and both still rippled: canvas
      // rasterises every stroke() call's antialiasing on its own, so many
      // short abutting (or slightly overlapping) segments always show a
      // seam at each call's own edge, whatever colour or cap is used for
      // it. Restroking the whole run fixes that at the root -- there is
      // only ONE call, so only one antialiasing pass, for the pipe's
      // entire visible length. It costs re-touching already-correct pixels
      // every frame, but every colour here is opaque (see the file
      // header), so that is a no-op: identical input, identical output.
      // Runs reset at every real turn (below) and at relocation, so this
      // never redraws more than one grid cell's worth of frames' growth.
      ctx.save();
      ctx.strokeStyle = PIPE_DEPTH_SHADOW;
      ctx.lineWidth = lineW * 1.05;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(pipe.runX + 3, pipe.runY + 3);
      ctx.lineTo(pipe.x + 3, pipe.y + 3);
      ctx.stroke();
      ctx.restore();

      // A neon halo, under the tube: a plain wider opaque stroke, not
      // `shadowBlur` (its Gaussian falloff is computed fresh per call too,
      // which was the same per-frame-seam problem one layer out).
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = haloColor;
      ctx.lineWidth = lineW * 1.9;
      ctx.beginPath();
      ctx.moveTo(pipe.runX, pipe.runY);
      ctx.lineTo(pipe.x, pipe.y);
      ctx.stroke();
      ctx.restore();

      // The tube itself: a linear gradient perpendicular to the direction
      // of travel, dark at both silhouette edges with a highlight band
      // offset toward one side, so the width shades like a lit cylinder.
      // The anchor sits at the run's own fixed start (`runX, runY`), which
      // never moves during the run, so the gradient itself never drifts
      // either -- the same reasoning as the whole-run stroke above, applied
      // to the gradient's own inputs. `round` caps read as a smoothly
      // shaded capsule at the tip (one gradient, one shape) rather than the
      // separate highlight/shadow strokes' two round caps sitting side by
      // side that the B2 critic read as cartoon eyes.
      const nx = -pipe.dy;
      const ny = pipe.dx;
      const grad = ctx.createLinearGradient(
        pipe.runX - nx * halfW, pipe.runY - ny * halfW,
        pipe.runX + nx * halfW, pipe.runY + ny * halfW,
      );
      grad.addColorStop(0, lo);
      grad.addColorStop(0.24, lo);
      grad.addColorStop(0.5, pipe.color);
      grad.addColorStop(0.72, hi);
      grad.addColorStop(1, lo);
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = grad;
      ctx.lineWidth = lineW;
      ctx.beginPath();
      ctx.moveTo(pipe.runX, pipe.runY);
      ctx.lineTo(pipe.x, pipe.y);
      ctx.stroke();
      ctx.restore();

      // A grid vertex: maybe turn onto the other axis, ball-jointed like the
      // Windows original, elbow shaded the same light-to-dark way the tube
      // is (a small radial gradient stands in for the cylinder's curve).
      if (pipe.travelled >= cell) {
        pipe.travelled = 0;
        const atEdge = pipe.x <= cell || pipe.x >= w - cell || pipe.y <= cell || pipe.y >= h - cell;
        let turned = false;
        if (atEdge || Math.random() < 0.4) {
          turned = true;
          ctx.save();
          const g = ctx.createRadialGradient(
            pipe.x - lineW * 0.18, pipe.y - lineW * 0.18, lineW * 0.05,
            pipe.x, pipe.y, jointR,
          );
          g.addColorStop(0, hi);
          g.addColorStop(0.55, pipe.color);
          g.addColorStop(1, lo);
          ctx.fillStyle = g;
          ctx.shadowColor = pipe.color;
          ctx.shadowBlur = lineW * 0.4;
          ctx.beginPath();
          ctx.arc(pipe.x, pipe.y, jointR, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          if (pipe.dx !== 0) {
            pipe.dx = 0;
            pipe.dy = Math.random() < 0.5 ? 1 : -1;
          } else {
            pipe.dy = 0;
            pipe.dx = Math.random() < 0.5 ? 1 : -1;
          }
        }
        pipe.x = Math.min(Math.max(pipe.x, cell), w - cell);
        pipe.y = Math.min(Math.max(pipe.y, cell), h - cell);
        // The run's own start moves up to the elbow just turned (its ball
        // joint already covers the seam this would otherwise leave), but
        // only when it actually turned: a vertex passed without turning is
        // still one straight run, and redrawing it as ONE stroke all the
        // way back to the last real elbow is exactly the point above.
        if (turned) {
          pipe.runX = pipe.x;
          pipe.runY = pipe.y;
        }
        pipe.age += 1;
        // A pipe that has grown a long way relocates and repaints, the way
        // the original starts a fresh pipe once one has run its course,
        // without waiting for the whole field to clear.
        if (pipe.age > 48) {
          pipe.age = 0;
          const gx = Math.round((Math.random() * w) / cell);
          const gy = Math.round((Math.random() * h) / cell);
          pipe.x = Math.min(Math.max(gx * cell, cell), w - cell);
          pipe.y = Math.min(Math.max(gy * cell, cell), h - cell);
          pipe.dx = Math.random() < 0.5 ? 1 : -1;
          pipe.dy = 0;
          pipe.runX = pipe.x;
          pipe.runY = pipe.y;
          pipe.color = palette[Math.floor(Math.random() * palette.length)] ?? pipe.color;
        }
      }
    }
  };

  const draw = () => {
    if (!ctx || lost) return;
    if (mode === 'marble') drawMarble();
    else if (mode === 'pipes') drawPipes();
  };

  const tick = (t: number = Infinity) => {
    frame = 0;
    if (!running || mode === 'sunset') return;
    if (t - lastDrawn >= FRAME_BUDGET - FRAME_TOLERANCE) {
      lastDrawn = Number.isFinite(t) ? t : performance.now();
      draw();
    }
    if (running && inView && !document.hidden) frame = requestAnimationFrame(tick);
  };

  const stopLoop = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  };

  const sync = () => {
    stopLoop();
    if (running && inView && !document.hidden && mode !== 'sunset') {
      resize();
      lastDrawn = 0;
      tick();
    }
  };

  const setMode = (m: Mode) => {
    mode = m;
    bouncer = null;
    pipes = [];
    resize();
    if (mode === 'sunset' && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    sync();
  };

  const start = () => {
    running = true;
    sync();
  };
  const stop = () => {
    running = false;
    stopLoop();
  };
  const setPalette = () => {
    palette = readPalette();
  };

  const onContextLost = (event: Event) => {
    event.preventDefault();
    lost = true;
    stopLoop();
  };
  const onContextRestored = () => {
    lost = false;
    sync();
  };
  canvas.addEventListener('contextlost', onContextLost);
  canvas.addEventListener('contextrestored', onContextRestored);

  const intersection = new IntersectionObserver((entries) => {
    inView = entries[0]?.isIntersecting ?? true;
    sync();
  });
  intersection.observe(canvas);

  const resizer = new ResizeObserver(() => {
    resize();
    draw();
  });
  resizer.observe(canvas);

  const onVisibility = () => sync();
  document.addEventListener('visibilitychange', onVisibility);

  return {
    setMode,
    start,
    stop,
    setPalette,
    destroy() {
      stop();
      canvas.removeEventListener('contextlost', onContextLost);
      canvas.removeEventListener('contextrestored', onContextRestored);
      intersection.disconnect();
      resizer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    },
  };
}

export function mountScreensaver(): (() => void) | void {
  if (document.documentElement.dataset.theme !== THEME) return;
  const settingsBtn = document.querySelector<HTMLButtonElement>('[data-scr-settings]');
  const previewBtn = document.querySelector<HTMLButtonElement>('[data-scr-preview-btn]');
  const smallCanvas = document.querySelector<HTMLCanvasElement>('[data-scr-canvas]');
  const smallSunset = document.querySelector<HTMLElement>('[data-scr-sunset]');
  const fullscreen = document.querySelector<HTMLElement>('[data-scr-fullscreen]');
  const fsCanvas = document.querySelector<HTMLCanvasElement>('[data-scr-fs-canvas]');
  const fsSunset = document.querySelector<HTMLElement>('[data-scr-fs-sunset]');
  if (!settingsBtn || !previewBtn || !smallCanvas || !smallSunset || !fullscreen || !fsCanvas || !fsSunset) return;

  const sphere = new Image();
  sphere.decoding = 'async';
  sphere.src = sphereWebp;

  const small = createLoop(smallCanvas, sphere);
  const big = createLoop(fsCanvas, sphere);

  let mode: Mode = 'sunset';
  const applyMode = () => {
    const showCanvas = mode !== 'sunset';
    smallCanvas.classList.toggle('on', showCanvas);
    smallSunset.classList.toggle('scr-hidden', showCanvas);
    small.setMode(mode);
    fsCanvas.classList.toggle('on', showCanvas);
    fsSunset.classList.toggle('scr-hidden', showCanvas);
    big.setMode(mode);
  };
  applyMode();
  small.start();

  const onSettings = () => {
    mode = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
    applyMode();
    settingsBtn.setAttribute('aria-label', `Settings: cycle the screensaver loop (now ${MODE_LABEL[mode]})`);
  };
  settingsBtn.addEventListener('click', onSettings);

  let open = false;
  const closePreview = () => {
    if (!open) return;
    open = false;
    fullscreen.hidden = true;
    big.stop();
    small.start();
    document.removeEventListener('keydown', onKey, true);
    fullscreen.removeEventListener('click', closePreview);
    previewBtn.focus();
  };
  const onKey = (event: KeyboardEvent) => {
    event.preventDefault();
    closePreview();
  };
  const openPreview = () => {
    if (open) return;
    open = true;
    small.stop();
    fullscreen.hidden = false;
    big.start();
    document.addEventListener('keydown', onKey, true);
    fullscreen.addEventListener('click', closePreview);
  };
  previewBtn.addEventListener('click', openPreview);

  const schemeWatch = new MutationObserver(() => {
    small.setPalette();
    big.setPalette();
  });
  schemeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-scheme'] });

  return () => {
    closePreview();
    settingsBtn.removeEventListener('click', onSettings);
    previewBtn.removeEventListener('click', openPreview);
    schemeWatch.disconnect();
    small.destroy();
    big.destroy();
  };
}
