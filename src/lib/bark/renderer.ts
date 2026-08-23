/** Draw layer. WebGL2 instanced quads; canvas2D static fallback. */
import type { Dash } from './pattern';
import { drawBarkDashes, parseColor } from './draw2d';
export { parseColor } from './draw2d';

export const BARK_VERT_SOURCE = `#version 300 es
layout(location=0) in vec2 aCorner;             // unit quad corners
layout(location=1) in vec4 aRect;               // x,y,w,h normalized
layout(location=2) in vec2 aRotShade;           // rot, shade
uniform vec2 uResolution;
uniform float uTime;
uniform float uScroll;
uniform float uGrowth;                          // grow-in progress; 1 = fully grown
uniform float uGust;                            // wind gusts on/off
uniform vec3 uPointer;                          // x,y normalized; z = wake strength
uniform float uAspectLock;                      // 1 = keep dash shape square-referenced
out vec2 vLocal;
out float vShade;
out float vBoost;
void main() {
  vLocal = aCorner;
  vShade = aRotShade.y;
  float rot = aRotShade.x;
  // breathing: each dash drifts a hair, phased by its shade
  float breathe = sin(uTime * 0.35 + vShade * 6.2831) * 0.003;
  // depth parallax: paler (higher-shade) dashes ride closer to the viewer
  // and move more with scroll; positions wrap so the field never empties
  float depth = mix(0.35, 1.0, vShade);
  vec2 center = vec2(aRect.x, fract(aRect.y + breathe + uScroll * depth));
  // wind gust: an episodic swell that sweeps the field left to right,
  // so dashes sway together as weather rather than jitter alone
  float gustE = max(sin(uTime * 0.09), 0.0);
  gustE *= gustE * uGust;
  float sway = sin(uTime * 0.5 - aRect.x * 5.0 + vShade * 1.5);
  center.x += sway * 0.006 * gustE * depth;
  rot += sway * 0.06 * gustE;
  // pointer wake: nearby dashes brighten, no displacement (founder verdict:
  // the scatter read as distortion; light responding to a hand reads better)
  vec2 dvec = center - uPointer.xy;
  dvec.x *= uResolution.x / max(uResolution.y, 1.0);
  float infl = smoothstep(0.22, 0.0, length(dvec)) * uPointer.z;
  // growth: dashes appear staggered by band and shade, scaling in
  float order = fract(aRect.y * 7.13 + vShade * 3.71) * 0.7;
  float appear = smoothstep(order, order + 0.3, uGrowth);
  vBoost = appear * (1.0 + 1.6 * infl);
  vec2 halfSize = aRect.zw * 0.5 * mix(0.2, 1.0, appear);
  vec2 p = aCorner * halfSize;
  float c = cos(rot), s = sin(rot);
  p = vec2(p.x * c - p.y * s, p.x * s + p.y * c);
  // aspect lock: treat the rotated offset as measured in canvas-height units and
  // divide x back into normalized space, so the dash keeps its shape (and its
  // rotation stays rigid) on a short-wide field instead of streaking sideways
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  p.x /= mix(1.0, aspect, uAspectLock);
  vec2 pos = (center + p) * 2.0 - 1.0;
  gl_Position = vec4(pos.x, -pos.y, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision mediump float;
in vec2 vLocal;
in float vShade;
in float vBoost;
uniform vec3 uMark;
uniform highp float uTime;
uniform float uAlphaLo;
uniform float uAlphaHi;
out vec4 outColor;
void main() {
  // soft-edged rounded dash
  vec2 d = abs(vLocal);
  float edge = 1.0 - smoothstep(0.72, 1.0, max(d.x, d.y));
  float alpha = edge * mix(uAlphaLo, uAlphaHi, vShade);
  alpha *= 1.0 + 0.25 * sin(uTime * 0.3 + vShade * 6.2831); // slow shimmer
  alpha *= vBoost; // grow-in fade and pointer-wake brightening
  outColor = vec4(uMark, clamp(alpha, 0.0, 1.0));
}`;

export interface BarkRenderer {
  start(): void;
  renderOnce(): void;
  stop(): void;
  resize(): void;
  setColors(mark: string): void;
  setAlpha(lo: number, hi: number): void;
  setScroll(offset: number): void;
  setDashes(dashes: Dash[]): void;
  /** Replay the grow-in: dashes scale and fade in staggered (~1.4s). */
  growTree(): void;
  setGust(on: boolean): void;
  /** Pointer in canvas-normalized [0,1] coords; strength 0 releases the wake. */
  setPointer(x: number, y: number, strength: number): void;
  destroy(): void;
}

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(sh) ?? 'shader compile failed');
  }
  return sh;
}

function dashBuffer(dashes: Dash[]): Float32Array {
  const out = new Float32Array(dashes.length * 6);
  dashes.forEach((d, i) => {
    out.set([d.x, d.y, d.w, d.h, d.rot, d.shade], i * 6);
  });
  return out;
}

export function createBarkRenderer(
  canvas: HTMLCanvasElement,
  dashes: Dash[],
  /** Opt in to keep dash shape on a non-square field. Off leaves every existing field untouched. */
  lockAspect = false,
): BarkRenderer | null {
  const gl = canvas.getContext('webgl2', { alpha: true, antialias: true });
  if (!gl) return null;

  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, BARK_VERT_SOURCE));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);

  const quad = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
  const quadBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const instBuf = gl.createBuffer();
  let count = dashes.length;
  const uploadDashes = (ds: Dash[]) => {
    count = ds.length;
    gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
    gl.bufferData(gl.ARRAY_BUFFER, dashBuffer(ds), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 24, 0);
    gl.vertexAttribDivisor(1, 1);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 24, 16);
    gl.vertexAttribDivisor(2, 1);
  };
  uploadDashes(dashes);

  const uTime = gl.getUniformLocation(prog, 'uTime');
  const uMark = gl.getUniformLocation(prog, 'uMark');
  const uResolution = gl.getUniformLocation(prog, 'uResolution');
  const uAlphaLo = gl.getUniformLocation(prog, 'uAlphaLo');
  const uAlphaHi = gl.getUniformLocation(prog, 'uAlphaHi');
  const uScroll = gl.getUniformLocation(prog, 'uScroll');
  const uGrowth = gl.getUniformLocation(prog, 'uGrowth');
  const uGust = gl.getUniformLocation(prog, 'uGust');
  const uPointer = gl.getUniformLocation(prog, 'uPointer');
  const uAspectLock = gl.getUniformLocation(prog, 'uAspectLock');
  gl.uniform1f(uAspectLock, lockAspect ? 1 : 0);
  gl.uniform1f(uAlphaLo, 0.05);
  gl.uniform1f(uAlphaHi, 0.22);
  gl.uniform1f(uScroll, 0);
  // inert defaults: fully grown, no gust, no wake (site background unchanged)
  gl.uniform1f(uGrowth, 1);
  gl.uniform1f(uGust, 0);
  gl.uniform3f(uPointer, 0, 0, 0);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  let raf = 0;
  // The bark is a slow, delicate background texture; 60fps is wasted on it.
  // Cap the animated loop at BARK_FPS to roughly halve its GPU cost. renderOnce
  // (reduced-motion and the static 2D fallback) is unaffected.
  const BARK_FPS = 30;
  const FRAME_INTERVAL = 1000 / BARK_FPS;
  let lastDraw = 0;
  const t0 = performance.now();
  let growthStart = -1; // -1 = fully grown, no animation pending
  const pointerTarget = { x: 0, y: 0, s: 0 };
  const pointerCur = { x: 0, y: 0, s: 0 };

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    gl.uniform2f(uResolution, w, h);
  };

  const frame = (now: number) => {
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(uTime, (now - t0) / 1000);
    if (growthStart >= 0) {
      const t = Math.min(1, Math.max(0, (now - growthStart) / 1400));
      gl.uniform1f(uGrowth, 1 - Math.pow(1 - t, 3)); // ease-out cubic
      if (t >= 1) growthStart = -1;
    }
    // ease the wake toward the pointer so it trails rather than snaps
    pointerCur.x += (pointerTarget.x - pointerCur.x) * 0.12;
    pointerCur.y += (pointerTarget.y - pointerCur.y) * 0.12;
    pointerCur.s += (pointerTarget.s - pointerCur.s) * 0.08;
    gl.uniform3f(uPointer, pointerCur.x, pointerCur.y, pointerCur.s);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
  };

  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    if (now - lastDraw < FRAME_INTERVAL) return;
    lastDraw = now;
    frame(now);
  };

  resize();

  return {
    start() { this.stop(); lastDraw = 0; raf = requestAnimationFrame(loop); },
    renderOnce() { resize(); frame(t0); },
    stop() { if (raf) cancelAnimationFrame(raf); raf = 0; },
    resize,
    setColors(mark: string) {
      const [r, g, b] = parseColor(mark);
      gl.uniform3f(uMark, r, g, b);
    },
    setAlpha(lo: number, hi: number) {
      gl.uniform1f(uAlphaLo, lo);
      gl.uniform1f(uAlphaHi, hi);
    },
    setScroll(offset: number) {
      gl.uniform1f(uScroll, offset);
    },
    setDashes(ds: Dash[]) { uploadDashes(ds); },
    growTree() { growthStart = performance.now(); },
    setGust(on: boolean) { gl.uniform1f(uGust, on ? 1 : 0); },
    setPointer(x: number, y: number, strength: number) {
      pointerTarget.x = x; pointerTarget.y = y; pointerTarget.s = strength;
    },
    destroy() {
      this.stop();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}

/** Static canvas2D fallback: same pattern, one frame, no motion. */
export function renderBark2D(
  canvas: HTMLCanvasElement,
  dashes: Dash[],
  mark: string,
  alphaLo = 0.05,
  alphaHi = 0.22,
  lockAspect = false,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(canvas.clientWidth * dpr);
  canvas.height = Math.round(canvas.clientHeight * dpr);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBarkDashes(ctx, dashes, mark, canvas.width, canvas.height, alphaLo, alphaHi, lockAspect);
}
