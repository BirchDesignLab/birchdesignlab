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
  x: number;
  y: number;
  dx: number;
  dy: number;
  color: string;
  age: number;
}

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
    const size = Math.min(canvas.width, canvas.height) * 0.4;
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
    for (let i = 0; i < 4; i++) {
      pipes.push({
        x: Math.random() * (canvas.width || 1),
        y: Math.random() * (canvas.height || 1),
        dx: Math.random() < 0.5 ? 1 : -1,
        dy: 0,
        color: palette[i % palette.length] ?? '#01cdfe',
        age: 0,
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
    const size = Math.min(w, h) * 0.4;
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

  const drawPipes = () => {
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    if (!pipes.length) resetPipes();
    // A translucent wash instead of a hard clear: the elbow trail persists
    // and fades, the shape of the classic screensaver's endless pipework.
    ctx.fillStyle = 'rgba(10, 2, 32, 0.08)';
    ctx.fillRect(0, 0, w, h);
    const cell = Math.max(14, Math.min(w, h) / 18);
    const lineW = Math.max(4, cell * 0.32);
    for (const pipe of pipes) {
      const fromX = pipe.x;
      const fromY = pipe.y;
      pipe.age += 1;
      // Turn onto the other axis every so often, elbow-jointed like Pipes.
      if (pipe.age % 14 === 0 || fromX <= 0 || fromX >= w || fromY <= 0 || fromY >= h) {
        if (pipe.dx !== 0) {
          pipe.dx = 0;
          pipe.dy = Math.random() < 0.5 ? 1 : -1;
        } else {
          pipe.dy = 0;
          pipe.dx = Math.random() < 0.5 ? 1 : -1;
        }
        pipe.x = Math.min(Math.max(fromX, cell), w - cell);
        pipe.y = Math.min(Math.max(fromY, cell), h - cell);
      }
      const toX = pipe.x + pipe.dx * cell;
      const toY = pipe.y + pipe.dy * cell;
      ctx.strokeStyle = pipe.color;
      ctx.lineWidth = lineW;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = pipe.color;
      ctx.shadowBlur = lineW;
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();
      pipe.x = toX;
      pipe.y = toY;
      if (pipe.age > 400) {
        pipe.age = 0;
        pipe.x = Math.random() * w;
        pipe.y = Math.random() * h;
        pipe.color = palette[Math.floor(Math.random() * palette.length)] ?? pipe.color;
      }
    }
    ctx.shadowBlur = 0;
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
