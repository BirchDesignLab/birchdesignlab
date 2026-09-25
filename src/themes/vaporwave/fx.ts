/**
 * Vaporwave's home-hero horizon: a night (or dawn) sky, a striped sun setting
 * behind low-poly mountains, and a neon grid scrolling toward the viewer.
 * One full-screen fragment shader on one WebGL canvas.
 *
 * Contract (src/themes/README.md, Motion and backgrounds): mounted per page
 * through onMount, and only when this school owns the document, because the
 * module stays loaded after the visitor walks into another school; DPR capped
 * at 1.5; paused while the tab is hidden or the hero is off-screen; context
 * loss handled like src/components/BarkField.astro; the context released on
 * teardown (once the swap's snapshot of the hero is gone); reduced motion
 * draws one still frame. The hero paints the same
 * sky in CSS underneath, so a blank canvas still reads. Arriving from another
 * school, the program links behind the CRT's beam line rather than holding
 * the page's first render (mountHorizon).
 *
 * Colours come from the --hz-* tokens in theme.css, re-read when the scheme
 * flips, so the shader never hardcodes a palette.
 */
const THEME = 'vaporwave';
const MAX_DPR = 1.5;
/** The frame drawn under reduced motion: stars lit, stripes mid-drift. */
const STILL_TIME = 7.3;
/**
 * F4(b) (Tier 3 stage 3 brief, "the grid: drive or loop"): the hero's grid now
 * visibly restarts every CYCLE seconds instead of driving forever. 6.4s is
 * exactly four turns of the CSS floors' existing 1.6s per-cell scroll
 * (.vw-floor::before, theme.css), the low-middle of the brief's 4-8s band, so
 * every loop in the school (this canvas and every CSS floor) shares one
 * period and one seam. The scroll rate itself is unchanged (F4: "same speed
 * as today"); only the seam is new.
 */
const CYCLE = 6.4;
/* The tracking hiccup at the seam: a one-to-two-frame horizontal tear on the
   floor grid (E1's tape language), not a hue shift or a brightness flash. Two
   discrete offsets (not eased between them) so it reads as a stutter, then
   the grid snaps back to true for the rest of the cycle. Shared by both loop
   variants below: the tear is the one thing the brief asks both to carry. */
const SEAM_FRAME_1 = 1 / 60;
const SEAM_FRAME_2 = 2 / 60;
const SEAM_OFFSET_1 = 0.16;
const SEAM_OFFSET_2 = -0.06;

/**
 * Fix round (Tier A critique, finding 2): "loop" (b) was really only a tear
 * every CYCLE seconds bolted onto a scroll that never stops - honest for the
 * tear, not for a "cycle that visibly restarts". Two real variants, so the
 * founder can see both before Tier B commits to one:
 *   'tear'    the drive never resets: uScroll/uStripe run off raw session
 *             time, same as before this fix, so the grid looks like it never
 *             stopped except for the tear.
 *   'restart' uScroll/uStripe run off `time % CYCLE` instead, so the instant
 *             the cycle wraps, the scroll snaps from wherever CYCLE*0.55 mod 1
 *             landed back to 0 - a real phase jump, not just the tear -
 *             because 6.4 * 0.55 is not a whole number of turns.
 * The default is 'restart', the brief's reading of F4(b); the founder picks
 * between the two at the Tier A stop, and the loser and the query go in
 * Tier B. See readLoopVariant for how a proof picks one.
 */
type LoopVariant = 'tear' | 'restart';
const DEFAULT_VARIANT: LoopVariant = 'restart';

/**
 * proof-only: `?vwLoop=tear` or `?vwLoop=restart` on the URL picks a variant
 * for scripts/themes/harness/vw-loop-proof.mjs to film, without a rebuild.
 * Any other value, or no query at all - the case for every real visit -
 * resolves to DEFAULT_VARIANT with no trace of having asked: mountHorizon
 * only sets the proof timing hook (`__vwHeroStarted`) when the query named a
 * variant explicitly. A production load, which carries no `vwLoop` query,
 * writes nothing.
 */
function readLoopVariant(): { variant: LoopVariant; isProof: boolean } {
  try {
    const q = new URLSearchParams(location.search).get('vwLoop');
    if (q === 'tear' || q === 'restart') return { variant: q, isProof: true };
  } catch {
    /* location/URLSearchParams unavailable (SSR, an odd embed): fall through
       to the shipped default exactly as a query-free visit would. */
  }
  return { variant: DEFAULT_VARIANT, isProof: false };
}

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform float uTime;
uniform float uScroll;
uniform float uStripe;
uniform float uHorizonY;
uniform float uSunR;
uniform float uStars;
uniform float uGlow;
uniform float uFade;
uniform float uHaze;
uniform float uGridGlow;
uniform float uSeam;
uniform vec3 uSkyTop;
uniform vec3 uSkyMid;
uniform vec3 uHorizon;
uniform vec3 uGround;
uniform vec3 uGrid;
uniform vec3 uSunA;
uniform vec3 uSunB;
uniform vec3 uSunC;
uniform vec3 uMount;
uniform vec3 uRim;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// Piecewise-linear noise: straight ridgelines, so the mountains read low-poly.
float ridgeNoise(float x) {
  float i = floor(x);
  return mix(hash(vec2(i, 1.7)), hash(vec2(i + 1.0, 1.7)), fract(x));
}

void main() {
  vec2 fc = gl_FragCoord.xy;
  float H = uRes.y;
  float px = 1.0 / H;
  // Origin on the horizon at the centre; units of canvas height.
  vec2 p = vec2(fc.x - 0.5 * uRes.x, fc.y - uHorizonY * H) / H;
  vec3 col;

  if (p.y >= 0.0) {
    float t = p.y / (1.0 - uHorizonY);
    col = mix(uHorizon, uSkyMid, smoothstep(0.0, 0.42, t));
    col = mix(col, uSkyTop, smoothstep(0.3, 1.0, t));

    // Stars, twinkling, thinning toward the horizon glow.
    vec2 sp = p * 60.0;
    vec2 cell = floor(sp);
    float h = hash(cell);
    if (h > 0.955) {
      vec2 off = vec2(hash(cell + 3.1), hash(cell + 7.7)) - 0.5;
      float d = length(fract(sp) - 0.5 - off * 0.6);
      float tw = 0.5 + 0.5 * sin(uTime * (0.8 + h * 2.4) + h * 40.0);
      col += uStars * tw * smoothstep(0.1, 0.0, d) * smoothstep(0.15, 0.6, t);
    }

    // The sun: a vertical gradient, slit in its lower half, the slits
    // widening downward and drifting slowly.
    vec2 sc = vec2(0.0, uSunR * 0.12);
    float d = length(p - sc);
    col += uSunB * 0.3 * exp(-max(d - uSunR, 0.0) * 7.0);
    float k = clamp((p.y - (sc.y - uSunR)) / (2.0 * uSunR), 0.0, 1.0);
    vec3 sun = mix(uSunC, uSunB, smoothstep(0.0, 0.5, k));
    sun = mix(sun, uSunA, smoothstep(0.45, 0.95, k));
    float cut = 0.0;
    float below = (sc.y + uSunR * 0.5 - p.y) / uSunR;
    if (below > 0.0) {
      float band = fract(below * 6.5 + uStripe);
      cut = step(band, mix(0.08, 0.6, clamp(below / 0.65, 0.0, 1.0)));
    }
    float disc = smoothstep(uSunR, uSunR - 1.5 * px, d);
    col = mix(col, sun, disc * (1.0 - cut));

    // Mountains: parted in the middle so the sun sets between them.
    float ax = abs(p.x);
    float ridge = 0.09 * (0.6 * ridgeNoise(p.x * 5.0 + 11.0) + 0.4 * ridgeNoise(p.x * 13.0 + 3.0));
    ridge *= smoothstep(uSunR * 0.55, uSunR * 2.2, ax);
    ridge += 0.012 * smoothstep(uSunR * 1.4, uSunR * 3.0, ax);
    if (p.y < ridge) {
      float m = p.y / max(ridge, 1e-4);
      vec3 rock = mix(uMount * 0.55, uMount, m);
      // Faint wireframe facets, the cheap-3D look.
      float facet = abs(fract(p.x * 26.0 + p.y * 12.0) - 0.5);
      rock = mix(rock, uRim, 0.12 * smoothstep(0.06, 0.0, facet) * m);
      col = mix(rock, uRim, smoothstep(2.5 * px, 0.0, ridge - p.y));
    }
  } else {
    // Perspective floor: depth z from the height under the horizon, world
    // x from the screen x scaled by depth. GRID sets how many cells fit.
    const float GRID = 7.0;
    float dy = -p.y;
    float z = 0.12 * GRID / dy;
    // uSeam: a brief lateral tear at the loop's seam (F4b), zero the rest of
    // the cycle. Added to wx (not p.x) so it rides the same perspective scale
    // as the grid lines: a tracking error the depth of the floor, not a flat
    // screen-space shove.
    float wx = p.x * z * 1.6 + uSeam;
    col = mix(uHorizon, uGround, smoothstep(0.0, uHaze, dy));
    // The sun's reflection, a soft streak on the floor.
    col += uSunB * 0.25 * exp(-abs(p.x) * 7.0) * exp(-dy * 9.0);

    float lineW = 1.6 * px;
    float wz = lineW * 0.12 * GRID / (dy * dy);
    float dz = 0.5 - abs(fract(z + uScroll) - 0.5);
    float wxx = lineW * z * 1.6;
    float dx = 0.5 - abs(fract(wx) - 0.5);
    float fade = smoothstep(0.0, uFade, dy) * (1.0 - smoothstep(0.08, 0.3, wz));
    float line = max(1.0 - smoothstep(0.0, wz, dz), 1.0 - smoothstep(0.0, wxx, dx)) * fade;
    float glow = max(exp(-dz / (wz * 5.0)), exp(-dx / (wxx * 5.0))) * fade;
    col = mix(col, uGrid, clamp(line, 0.0, 1.0));
    col += uGrid * glow * uGridGlow;
  }

  col += uHorizon * uGlow * exp(-abs(p.y) * 70.0);
  col += (hash(fc) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}
`;

const UNIFORM_COLORS = {
  uSkyTop: '--hz-sky-top',
  uSkyMid: '--hz-sky-mid',
  uHorizon: '--hz-horizon',
  uGround: '--hz-ground',
  uGrid: '--hz-grid',
  uSunA: '--hz-sun-a',
  uSunB: '--hz-sun-b',
  uSunC: '--hz-sun-c',
  uMount: '--hz-mount',
  uRim: '--hz-rim',
} as const;

function hexToRgb(value: string): [number, number, number] {
  const hex = value.trim().replace('#', '');
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  const n = parseInt(full, 16);
  if (full.length !== 6 || Number.isNaN(n)) return [0, 0, 0];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

interface Scene {
  draw(time: number): void;
  resize(): void;
  setColors(): void;
}

/** A program handed to the driver and not yet asked about. */
interface Linking {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  vs: WebGLShader;
  fs: WebGLShader;
  /** Whether asking about the link now would return at once. */
  settled(): boolean;
}

/**
 * Compile and link without asking how either went. Any question about a
 * program (its status, a uniform's location) makes the main thread wait for
 * the GPU to finish linking it, about 70 ms the first time in a browser
 * (Tier 3 Stage 2 freeze investigation), so the questions wait for
 * finishScene.
 */
function startScene(canvas: HTMLCanvasElement): Linking | null {
  // No preserveDrawingBuffer: the swap's snapshot of the hero holds because
  // the teardown keeps the context until the transition finishes (below),
  // so the buffer copy it costs every frame buys nothing (Tier 3 brief E1a).
  const gl = canvas.getContext('webgl', {
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
  });
  if (!gl) return null;

  const compile = (type: number, src: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    return shader;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  const program = gl.createProgram();
  if (!vs || !fs || !program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  // Send the work to the GPU now, so it links while the page renders.
  gl.flush();
  // Where the driver links off the main thread, this says when it is done;
  // elsewhere the question simply waits, as it always did.
  const parallel = gl.getExtension('KHR_parallel_shader_compile');
  const settled = () => !parallel || gl.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR) !== false;
  return { gl, program, vs, fs, settled };
}

function finishScene(canvas: HTMLCanvasElement, linking: Linking, variant: LoopVariant): Scene | null {
  const { gl, program, vs, fs } = linking;
  // A shader that failed to compile fails the link too.
  const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
  // Shaders are only needed until link time; free them either way, and free
  // the program too on a failed link so a driver reset never leaks GL objects.
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!linked) {
    gl.deleteProgram(program);
    return null;
  }
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const u = (name: string) => gl.getUniformLocation(program, name);
  const uRes = u('uRes');
  const uTime = u('uTime');
  const uScroll = u('uScroll');
  const uStripe = u('uStripe');
  const uHorizonY = u('uHorizonY');
  const uSunR = u('uSunR');
  const uStars = u('uStars');
  const uGlow = u('uGlow');
  const uFade = u('uFade');
  const uHaze = u('uHaze');
  const uGridGlow = u('uGridGlow');
  const uSeam = u('uSeam');

  const setColors = () => {
    const cs = getComputedStyle(document.documentElement);
    for (const [uniform, token] of Object.entries(UNIFORM_COLORS)) {
      gl.uniform3fv(u(uniform), hexToRgb(cs.getPropertyValue(token)));
    }
    gl.uniform1f(uStars, parseFloat(cs.getPropertyValue('--hz-stars')) || 0);
    gl.uniform1f(uGlow, parseFloat(cs.getPropertyValue('--hz-glow')) || 0);
    gl.uniform1f(uFade, parseFloat(cs.getPropertyValue('--hz-fade')) || 0.1);
    gl.uniform1f(uHaze, parseFloat(cs.getPropertyValue('--hz-haze')) || 0.08);
    gl.uniform1f(uGridGlow, parseFloat(cs.getPropertyValue('--hz-grid-glow')) || 0.35);
  };

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, MAX_DPR);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    gl.uniform2f(uRes, w, h);
    // Portrait screens get a smaller sun and a lower horizon, so the sun
    // never outgrows the width and the billboard keeps the sky.
    const aspect = w / h;
    gl.uniform1f(uSunR, Math.min(0.22, 0.36 * aspect));
    gl.uniform1f(uHorizonY, aspect < 1 ? 0.3 : 0.32);
  };

  const draw = (time: number) => {
    // Phases wrap here, in double precision, so the shader's floats stay small.
    gl.uniform1f(uTime, time % 1000);
    // F4(b) fix round: 'restart' drives the scroll and the stripe drift off
    // the cycle's own clock, so both visibly jump back at the seam instead of
    // sailing through it; 'tear' keeps driving off raw time, as before this
    // round, so only the seam interrupts it. See readLoopVariant.
    const cyclePos = time % CYCLE;
    const loopTime = variant === 'restart' ? cyclePos : time;
    gl.uniform1f(uScroll, (loopTime * 0.55) % 1);
    gl.uniform1f(uStripe, (loopTime * 0.06) % 1);
    // The seam itself: cyclePos re-zeros every CYCLE seconds; for its first
    // two frames the grid tears sideways in two discrete steps, then holds at
    // zero for the rest of the cycle. Shared by both variants.
    const seam = cyclePos < SEAM_FRAME_2 ? (cyclePos < SEAM_FRAME_1 ? SEAM_OFFSET_1 : SEAM_OFFSET_2) : 0;
    gl.uniform1f(uSeam, seam);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  setColors();
  resize();
  return { draw, resize, setColors };
}

/** onMount body for the home hero. */
export function mountHorizon(): (() => void) | void {
  if (document.documentElement.dataset.theme !== THEME) return;
  const canvas = document.querySelector<HTMLCanvasElement>('canvas[data-vw-horizon]');

  // F4(b) fix round: which loop variant this load draws, and whether it was
  // asked for by the proof (never by a real visit). Only the hero's grid has
  // variants; the CSS floors carry the same seam in one shape (theme.css).
  const { variant, isProof } = readLoopVariant();

  if (!canvas) return;

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let linking = startScene(canvas);
  if (!linking) return;
  let scene: Scene | null = null;
  // Arriving from another school, the new page opens as the CRT's beam line
  // for its first 190 ms, so the sunset can finish linking behind it while
  // the page renders, instead of holding that render. Everywhere else (a
  // hard load, a swap within the school, where the picture is on screen
  // from the first frame) it is linked before the first frame, as always.
  const from = document.documentElement.dataset.fromTheme;
  if (!from || from === THEME) {
    scene = finishScene(canvas, linking, variant);
    linking = null;
    if (!scene) return;
  }

  let frame = 0;
  let waiting = 0;
  let lost = false;
  let inView = true;
  let pageVisible = !document.hidden;
  const started = performance.now();
  // Proof-only hook for scripts/themes/harness/vw-loop-proof.mjs: the loop's
  // clock zero, so the F4(b) seam's wall-clock moment can be computed instead
  // of guessed at from pixels. Gated on `isProof` (finding 6 of the Tier A
  // fix round): a production load carries no `vwLoop` query, so `isProof` is
  // false and this global is never created. Read nowhere else.
  if (isProof) (window as unknown as { __vwHeroStarted?: number }).__vwHeroStarted = started;
  const now = () => (reducedMotion.matches ? STILL_TIME : (performance.now() - started) / 1000);

  const shouldAnimate = () => inView && pageVisible && !reducedMotion.matches && !lost;
  const tick = () => {
    frame = 0;
    if (!scene || lost) return;
    scene.draw(now());
    if (shouldAnimate()) frame = requestAnimationFrame(tick);
  };
  const stop = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  };
  const sync = () => {
    if (!scene || lost) return;
    if (shouldAnimate()) {
      if (!frame) frame = requestAnimationFrame(tick);
    } else {
      stop();
      scene.draw(now());
    }
  };
  // Asked once a frame until the link is done, then the first frame is drawn
  // in that same frame. A failed link leaves the CSS sky, as a failed
  // context always has.
  const settle = () => {
    waiting = 0;
    if (!linking || lost) return;
    if (!linking.settled()) {
      waiting = requestAnimationFrame(settle);
      return;
    }
    scene = finishScene(canvas, linking, variant);
    linking = null;
    if (scene && shouldAnimate()) tick();
    else sync();
  };
  if (linking) waiting = requestAnimationFrame(settle);
  else sync();

  const onContextLost = (event: Event) => {
    event.preventDefault();
    lost = true;
    stop();
  };
  const onContextRestored = () => {
    if (waiting) cancelAnimationFrame(waiting);
    waiting = 0;
    linking = startScene(canvas);
    scene = linking && finishScene(canvas, linking, variant);
    linking = null;
    // If the rebuild fails (a shader that no longer compiles after the driver
    // reset), stay in the lost state so every caller keeps treating this as
    // a no-op instead of drawing with a null scene.
    lost = !scene;
    sync();
  };
  canvas.addEventListener('webglcontextlost', onContextLost, false);
  canvas.addEventListener('webglcontextrestored', onContextRestored, false);

  const intersection = new IntersectionObserver((entries) => {
    inView = entries[0].isIntersecting;
    sync();
  });
  intersection.observe(canvas);

  const onVisibility = () => {
    pageVisible = !document.hidden;
    sync();
  };
  document.addEventListener('visibilitychange', onVisibility);

  const resizer = new ResizeObserver(() => {
    if (!scene || lost) return;
    scene.resize();
    scene.draw(now());
  });
  resizer.observe(canvas);

  const schemeWatch = new MutationObserver(() => {
    if (!scene || lost) return;
    scene.setColors();
    scene.draw(now());
  });
  schemeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-scheme'] });

  reducedMotion.addEventListener('change', sync);

  // The swap that tears this hero down. Its outgoing snapshot keeps drawing
  // from the canvas until the transition finishes, so releasing the context
  // at once blanked the hero to grey-white mid-swap (Tier 3 brief E1a). The
  // router's before-swap carries the transition; a capture listener on
  // window runs before the document listener that calls the teardown.
  let swap: ViewTransition | undefined;
  const onBeforeSwap = (event: Event) => {
    swap = (event as Event & { viewTransition?: ViewTransition }).viewTransition;
  };
  window.addEventListener('astro:before-swap', onBeforeSwap, true);

  return () => {
    stop();
    if (waiting) cancelAnimationFrame(waiting);
    waiting = 0;
    linking = null;
    // Loss listeners first: releasing the context fires a loss on purpose.
    canvas.removeEventListener('webglcontextlost', onContextLost, false);
    canvas.removeEventListener('webglcontextrestored', onContextRestored, false);
    intersection.disconnect();
    resizer.disconnect();
    schemeWatch.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    reducedMotion.removeEventListener('change', sync);
    window.removeEventListener('astro:before-swap', onBeforeSwap, true);
    scene = null;
    // Released as soon as nothing shows it: at once on a real pagehide, or
    // once the swap's snapshot is gone.
    const release = () => canvas.getContext('webgl')?.getExtension('WEBGL_lose_context')?.loseContext();
    if (swap) swap.finished.then(release, release);
    else release();
  };
}
