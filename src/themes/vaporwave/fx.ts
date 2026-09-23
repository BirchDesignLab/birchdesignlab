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
 * teardown; reduced motion draws one still frame. The hero paints the same
 * sky in CSS underneath, so a blank canvas still reads.
 *
 * Colours come from the --hz-* tokens in theme.css, re-read when the scheme
 * flips, so the shader never hardcodes a palette.
 */
const THEME = 'vaporwave';
const MAX_DPR = 1.5;
/** The frame drawn under reduced motion: stars lit, stripes mid-drift. */
const STILL_TIME = 7.3;

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
    float wx = p.x * z * 1.6;
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

function createScene(canvas: HTMLCanvasElement): Scene | null {
  const gl = canvas.getContext('webgl', { antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
  if (!gl) return null;

  const compile = (type: number, src: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  const program = gl.createProgram();
  if (!vs || !fs || !program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
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
    gl.uniform1f(uScroll, (time * 0.55) % 1);
    gl.uniform1f(uStripe, (time * 0.06) % 1);
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
  if (!canvas) return;

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let scene = createScene(canvas);
  if (!scene) return;

  let frame = 0;
  let lost = false;
  let inView = true;
  let pageVisible = !document.hidden;
  const started = performance.now();
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
  sync();

  const onContextLost = (event: Event) => {
    event.preventDefault();
    lost = true;
    stop();
  };
  const onContextRestored = () => {
    scene = createScene(canvas);
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

  return () => {
    stop();
    // Loss listeners first: releasing the context fires a loss on purpose.
    canvas.removeEventListener('webglcontextlost', onContextLost, false);
    canvas.removeEventListener('webglcontextrestored', onContextRestored, false);
    intersection.disconnect();
    resizer.disconnect();
    schemeWatch.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    reducedMotion.removeEventListener('change', sync);
    canvas.getContext('webgl')?.getExtension('WEBGL_lose_context')?.loseContext();
    scene = null;
  };
}
