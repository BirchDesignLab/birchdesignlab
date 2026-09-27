/**
 * The production glass lens: a draggable WebGL puck that bends the wallpaper
 * and orbs behind it, ported from `scripts/themes/proofs/stage3-lens/lens.js`
 * (Tier A proof) into TypeScript for the Home page.
 *
 * What changed from the proof, and why:
 * - The texture is the SAME wallpaper file the CSS background shows for the
 *   current scheme and time of day (`wallpaper-images.ts`), not a canvas
 *   painted at runtime: one wallpaper source, so the rim can never disagree
 *   with the page (proofs/lens.md).
 * - Orbs are read from the real `.orb` elements already on the page
 *   (`resolveOrbs`), not a synthetic layout list.
 * - The hit area is a real, focusable `<button>` with an `aria-label`
 *   (README's control rule): arrow keys nudge it in fixed steps against the
 *   same wall stops a drag respects. A `role="slider"`/`"spinbutton"` would
 *   claim a single scalar value, which this is not (it is a 2D position);
 *   there is no ARIA role for "draggable 2D object", so a plain button with
 *   a label that states both interactions (drag, arrow keys) is the least
 *   misleading choice available.
 * - A mouse or pen drag on the hit area must never select page text (the
 *   WebKit run's finding): `user-select: none` on the hit area,
 *   `preventDefault()` on `pointerdown`, `touch-action: none`, and a
 *   document-level `selectstart` swallowed for the drag's duration (belt and
 *   braces: the CSS alone was not enough in the WebKit run because the
 *   selection there started from a `mousedown` inside the hit area's
 *   ancestors before the CSS property took hold on some paths).
 * - Context loss/restore, an off-screen and hidden-tab pause, draw-on-change,
 *   a DPR cap of 1.5 and full teardown, matching the house WebGL rules
 *   (src/components/BarkField.astro's pattern) and README's list.
 * - The poster (`.lens-poster`, plain CSS, no script dependency) is the
 *   fallback: visible until the canvas's first real frame, again on context
 *   loss, and permanently when WebGL is unavailable or the E10 off state
 *   applies. It needs no code here to show correctly in the portal's
 *   drawn-ahead copy or with reduced transparency: those paths never run
 *   this script at all (drawn-ahead copies strip every `<script>`; a failed
 *   `mountLens()` call below leaves the poster exactly as the server
 *   rendered it). The same poster-first gate also covers a live scheme flip
 *   (dawn/day/dusk, or light/dark): `loadTexture()` re-shows the poster and
 *   hides the canvas the instant a new file starts loading, not only on the
 *   very first mount, so the canvas never shows the OLD scheme's texture
 *   against the NEW CSS wallpaper while the new file decodes.
 *
 * B2 fix round (the glass critic's blocking #1-#3 plus the verification
 * gap):
 * - Layering: the lens now sits between the orbs and the panes on Home
 *   (`.orbs[data-js-driven]` moves to z-index -2 in theme.css, the lens
 *   stays at -1), so it covers the orb it refracts instead of the orb
 *   painting over it, and its hit control moves from z-index 2 (above every
 *   pane) to -1 (the lens's own layer, under panes and text).
 * - Redraw: a `scroll` listener invalidates every frame the page scrolls
 *   (natural scroll moves `.orb` elements in the viewport with no JS
 *   involved, so a redraw is all that is needed), and `orbs-clock.ts`'s
 *   `onMove` hook invalidates whenever it actually repositions an orb.
 *   `.orbs[data-js-driven] .orb`'s idle CSS wobble (`glass-drift`) is
 *   dropped in theme.css, the source of the critic's 17-32 px of idle
 *   drift with zero corresponding draws; the scroll-linked parallax is
 *   still driven by `orbs-clock.ts`.
 * - Start position: computed at mount from the live layout (every `.glass`
 *   pane, the header, the portal switcher), not a fixed fraction of the
 *   viewport (`physics.ts`'s `findStartPosition`), so it lands in open
 *   wallpaper across an orb edge and adapts if another seat reshapes the
 *   Control Centre.
 * - The per-idle-frame `computeBounds()` call (two `getBoundingClientRect`s)
 *   only runs when something has actually invalidated the frame, not on
 *   every idle tick (the critic's nit on the loop's own idle cost).
 * - Probes: `?lensProbe=identity` draws the model with no bending, rim,
 *   tint or shadow (so it should vanish into the true page if the model
 *   matches); `?lensProbe=seam` does the same, clipped to the left half, so
 *   a vertical scan across the seam measures the offset while scrolling.
 *   Both cost one float uniform and a string compare when absent.
 */
import { FEEL, Lag2, releaseVelocity, capThrow, lensBounds, clampToBounds, stepGlide, stretchMatrix, stretchTarget, coverRect, chooseStart, cornerStart, type Bounds, type RectLike, type ChosenStart } from './physics';
import { loadWallpaperImage, WALL_W, WALL_H, type Scheme } from './wallpaper-images';
import { orbGradientAt } from '../fx';
import type { Tint, TimeOfDay } from './settings';

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 uBoxOrigin;
uniform vec2 uBoxSize;
uniform float uDpr;
uniform vec2 uCenter;
uniform float uR;
uniform mat2 uM;
uniform mat2 uMinv;
uniform sampler2D uWall;
uniform vec4 uWallRect;
uniform vec4 uOrb[8];
uniform vec3 uOrbCol[8];
uniform vec3 uOrbHiCol[8];
uniform int uOrbN;
uniform float uTint;
uniform vec3 uVeil;
uniform float uIdentity;
// The orbs' own box-shadow glow (theme.css --orb-glow: transparent in light,
// a wide ember glow in dark), glass fix round 3: without it the model's
// wallpaper beside a dark orb read up to 70 levels darker than the page
// (identity probe, 22% of pixels over 8). rgb + alpha, then (sigma, spread):
// CSS blurs a shadow with a Gaussian of standard deviation half the blur
// radius, and the spread grows the disc first.
uniform vec4 uGlow;
uniform vec2 uGlowShape;

// theme.css's real .orb: background: linear-gradient(155deg, --hi 8%, --lo
// 78%), not a flat fill (B2 fix round item A). GRAD_DIR is the CSS gradient
// line's unit direction for a 155deg angle in DOM (y-down) coordinates:
// (sin 155deg, -cos 155deg). GRAD_LEN_RATIO is that line's length divided by
// the orb's radius for a square box at this angle: |sin| + |cos|, doubled
// (the line spans corner to corner, i.e. 2x the box's half-extent in this
// direction). Both are constants because every orb shares the same 155deg
// angle (theme.css declares no per-hue variation).
const vec2 GRAD_DIR = vec2(0.42261826, 0.90630779);
const float GRAD_LEN_RATIO = 2.65784892;

vec3 orbGradient(vec3 hi, vec3 lo, vec2 rel, float r) {
  float t = 0.5 + dot(rel, GRAD_DIR) / (r * GRAD_LEN_RATIO);
  t = clamp((t - 0.08) / 0.7, 0.0, 1.0); // stops at 8% and 78%, per theme.css
  return mix(hi, lo, t);
}

// The standard normal CDF (a tanh fit, max error about 2e-4): a blurred
// straight edge's profile, close enough for a disc of 100+ px radius.
// (tanh itself is GLSL ES 3.0; WebGL 1 spells it with exp. Callers clamp x
// to +-6, so exp stays far inside highp range.)
float phi(float x) {
  float t = exp(2.0 * 0.7978845608 * (x + 0.044715 * x * x * x));
  return 0.5 * (1.0 + (t - 1.0) / (t + 1.0));
}

vec3 backdrop(vec2 s) {
  vec2 uv = (s - uWallRect.xy) / uWallRect.zw;
  vec3 c = texture2D(uWall, clamp(uv, 0.0, 1.0)).rgb;
  for (int i = 0; i < 8; i++) {
    if (i >= uOrbN) break;
    vec2 rel = s - uOrb[i].xy;
    float d = length(rel) - uOrb[i].z;
    if (uGlow.a > 0.0) {
      // Painted under this orb and over everything before it, as CSS
      // paints an element's outer shadow just before its background.
      c = mix(c, uGlow.rgb, uGlow.a * phi(clamp((uGlowShape.y - d) / uGlowShape.x, -6.0, 6.0)));
    }
    vec3 orbCol = orbGradient(uOrbHiCol[i], uOrbCol[i], rel, uOrb[i].z);
    c = mix(c, orbCol, clamp(0.5 - d * uDpr, 0.0, 1.0));
  }
  return c;
}

void main() {
  vec2 frag = vec2(gl_FragCoord.x, uBoxSize.y * uDpr - gl_FragCoord.y) / uDpr;
  vec2 p = uBoxOrigin + frag;
  vec2 q = (uMinv * (p - uCenter)) / uR;
  float r = length(q);
  float px = 1.0 / (uR * uDpr);
  float alpha = clamp((1.0 - r) / px + 0.5, 0.0, 1.0);
  if (alpha <= 0.0) { gl_FragColor = vec4(0.0); return; }
  if (uIdentity > 0.5) {
    // The seam/identity probes (lensProbe=identity|seam): the model's own
    // backdrop, undisplaced, at the true world position p (not the bent,
    // lens-relative q), so it can be diffed pixel for pixel against the
    // true page with the lens hidden (identity) or scanned across a
    // vertical seam against the real orbs beside it (seam, JS-side clip).
    gl_FragColor = vec4(backdrop(p) * alpha, alpha);
    return;
  }
  float e = smoothstep(0.5, 1.0, r);
  float m = 0.8 + 0.5 * e * e;
  // Halved from 0.03 (founder, 09-26-26): the full split drew a thin dark
  // olive line where an orb edge crossed the rim, visible at normal size.
  float disp = 0.015 * e;
  vec2 sG = uCenter + uM * (q * m) * uR;
  vec2 sR = uCenter + uM * (q * m * (1.0 + disp)) * uR;
  vec2 sB = uCenter + uM * (q * m * (1.0 - disp)) * uR;
  vec3 col = vec3(backdrop(sR).r, backdrop(sG).g, backdrop(sB).b);
  if (uTint > 0.001) {
    vec3 f = backdrop(sG) * 0.12;
    for (int k = 0; k < 8; k++) {
      float a = float(k) * 0.785398;
      f += backdrop(sG + vec2(cos(a), sin(a)) * 2.5) * 0.06;
      f += backdrop(sG + vec2(cos(a + 0.3927), sin(a + 0.3927)) * 5.5) * 0.05;
    }
    col = mix(col, f, 0.85 * uTint);
    col = mix(col, uVeil, 0.34 * uTint);
  }
  col *= 1.04;
  vec2 n = r > 0.0001 ? q / r : vec2(0.0);
  float l = dot(n, vec2(-0.7071, -0.7071));
  float band = smoothstep(0.9, 0.985, r);
  float spec = band * (0.1 + 0.8 * pow(max(l, 0.0), 2.5)) + band * 0.32 * pow(max(-l, 0.0), 3.0);
  col += spec * 0.85 * (1.0 - col * 0.35);
  col += 0.035 * max(l, 0.0) * r;
  col *= 1.0 - 0.08 * smoothstep(0.78, 0.97, r) * max(-l, 0.0);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0) * alpha, alpha);
}
`;

const KEY_STEP = 12; // px per arrow-key nudge
const KEY_STEP_FAST = 48; // px with Shift

interface ModelOrb { cx: number; cy: number; r: number; rgb: [number, number, number]; hiRgb: [number, number, number] }

interface Sample { t: number; x: number; y: number }

export interface LensOptions {
  /** Where the lens's parts mount: a fixed-position container the caller
      already placed (Home.astro's `.lens-host`), positioned so its origin is
      the viewport. */
  host: HTMLElement;
  /** The `.lens-poster` element already in the DOM (server-rendered, no
      script dependency): shown until the first frame, on context loss, and
      whenever WebGL is unavailable. */
  poster: HTMLElement;
  phone: boolean;
  initialTint: Tint;
  initialTod: TimeOfDay;
  /** Reads the live scheme ('light' | 'dark') off `<html data-scheme>`. */
  scheme(): Scheme;
  /** The lens's usable travel box in viewport coordinates: normally the
      whole viewport, narrowed to sit below the header bar and above the
      bottom chrome (README, "position: fixed ... bounded to the viewport
      minus a small inset"). Read only when a frame is already doing work
      (an invalidate fired), never on an idle tick. */
  chromeInsets(): { top: number; bottom: number };
  /** `?lensProbe=identity|seam` (README, item 5): draws the model with no
      bending, rim, tint or shadow, so it can be measured against the true
      page. Omit or `null` for normal operation; costs one float uniform. */
  probe?: 'identity' | 'seam' | null;
  /** Round 5 (R1): the start home-boot.ts already planned and put the poster
      on. The lens starts exactly there (a visitor has seen the poster at
      that spot) instead of re-planning; omitted, it plans for itself. */
  plan?: (ChosenStart & { radius: number }) | null;
}

export interface LensHandle {
  setTint(t: Tint): void;
  setTod(tod: TimeOfDay): void;
  /** Forces a redraw on the next frame: `home-boot.ts` wires this to
      `orbs-clock.ts`'s `onMove` hook and to this module's own `scroll`
      listener, so the lens's copy of the orbs never goes stale while
      something is actually moving them. */
  invalidate(): void;
  destroy(): void;
}

function link(gl: WebGLRenderingContext, vs: string, fs: string): WebGLProgram {
  const compile = (type: number, src: string) => {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error(log ?? 'shader compile failed');
    }
    return sh;
  };
  const p = gl.createProgram()!;
  gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'program link failed');
  return p;
}

/** The up-to-8 orbs nearest the lens, in viewport coordinates, with their
    resolved colour. Cheap enough to run every frame (typically 12 to 16
    `.orb` elements on Home). */
function resolveOrbs(centerX: number, centerY: number): ModelOrb[] {
  const els = document.querySelectorAll<HTMLElement>('.orb');
  const all: (ModelOrb & { order: number })[] = [];
  let order = 0;
  for (const el of els) {
    order++;
    const r = el.getBoundingClientRect();
    if (r.width <= 0) continue;
    const grad = orbGradientAt(el);
    if (!grad) continue;
    all.push({ cx: r.left + r.width / 2, cy: r.top + r.height / 2, r: r.width / 2, rgb: grad.lo, hiRgb: grad.hi, order });
  }
  all.sort((a, b) => {
    const da = (a.cx - centerX) ** 2 + (a.cy - centerY) ** 2;
    const db = (b.cx - centerX) ** 2 + (b.cy - centerY) ** 2;
    return da - db;
  });
  // The nearest 8, then back into document order (glass fix round 3): the
  // shader paints them in array order, later over earlier, which must be the
  // page's own paint order wherever two orbs overlap.
  return all.slice(0, 8).sort((a, b) => a.order - b.order);
}

interface Glow { rgb: [number, number, number]; alpha: number; sigma: number; spread: number }
const NO_GLOW: Glow = { rgb: [0, 0, 0], alpha: 0, sigma: 1, spread: 0 };

/** The orbs' shared box-shadow glow (theme.css --orb-glow), read off the
    first `.orb`'s computed style: "rgba(r, g, b, a) 0px 0px B px S px", or
    "none". Every orb shares the one token, so one read covers all. */
function orbGlow(): Glow {
  const el = document.querySelector<HTMLElement>('.orb');
  if (!el) return NO_GLOW;
  const bs = getComputedStyle(el).boxShadow;
  const m = /rgba?\(([^)]+)\)\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px(?:\s+(-?[\d.]+)px)?/.exec(bs);
  if (!m) return NO_GLOW;
  const parts = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  const alpha = parts.length > 3 ? parts[3] : 1;
  if (!(alpha > 0)) return NO_GLOW;
  const blur = Number(m[4]);
  return { rgb: [parts[0] / 255, parts[1] / 255, parts[2] / 255], alpha, sigma: Math.max(0.5, blur / 2), spread: Number(m[5] ?? 0) };
}

function rectOf(el: Element | null): RectLike | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return null;
  const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
  return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, radius };
}

/** Every `.glass` pane plus the header and the portal switcher (the
    `bdl-switcher` host, fixed to the viewport's bottom edge), in viewport
    coordinates, with their corner radii: the obstructions the lens's start
    must clear. Glass fix round 3: this used to read `[data-portal-tail]`,
    which is the 76 px spacer at the END of the document, not the switcher,
    so the start search never saw the switcher at all. */
function collectObstructions(): RectLike[] {
  const out: RectLike[] = [];
  for (const el of [document.querySelector('.site-header'), document.querySelector('bdl-switcher'), ...document.querySelectorAll('.glass')]) {
    const r = rectOf(el);
    if (r) out.push(r);
  }
  return out;
}

/** The lens radius: half the poster's CSS width (Home.astro sizes the poster
    per breakpoint), so the frosted stand-in and the live lens are always
    the same size. Falls back to the old fixed sizes if the poster has no
    width (it always has one in practice). */
export function lensRadiusFor(poster: HTMLElement, phone: boolean): number {
  const w = poster.getBoundingClientRect().width || parseFloat(getComputedStyle(poster).width);
  return w > 0 ? w / 2 : phone ? 64 : 92;
}

/** Moves the poster so its disc is centred on (x, y) with radius r, in the
    fixed viewport frame the lens uses. Inline left/top override the CSS
    spot; right/bottom are cleared so they cannot fight it. */
export function placePoster(poster: HTMLElement, x: number, y: number, r: number): void {
  poster.style.left = `${(x - r).toFixed(1)}px`;
  poster.style.top = `${(y - r).toFixed(1)}px`;
  poster.style.right = 'auto';
  poster.style.bottom = 'auto';
  poster.style.width = `${(2 * r).toFixed(1)}px`;
}

/** The travel box for a lens of radius r, below the header bar and above
    the bottom chrome (shared by the mount and the early poster placement). */
function boundsFor(radius: number, insets: { top: number; bottom: number }): Bounds {
  const [x0, y0, x1, y1] = lensBounds(radius, window.innerWidth, window.innerHeight);
  return [x0, Math.max(y0, insets.top + radius + 4), x1, Math.min(y1, window.innerHeight - insets.bottom - radius - 4)];
}

/** Where the lens starts half under the hero window's lower corner (round 4,
    G2): phones, and portrait tablets, where the window runs nearly edge to
    edge like a phone's. Matches Home.astro's phone and portrait poster
    rules. */
const CORNER_START_MQ = '(max-width: 720px), (min-width: 721px) and (max-width: 1279px) and (orientation: portrait)';

/** Glass fix round 3: the one start-position decision, used both as soon as
    Home mounts (home-boot.ts moves the poster there at once, long before the
    lens itself mounts at idle) and again by the lens at its own mount (by
    then the poster already sits on the chosen spot, so the answer holds and
    nothing jumps). The poster's CSS spot is the preferred start
    (physics.ts's chooseStart). */
export function planLensStart(poster: HTMLElement, phone: boolean, insets: { top: number; bottom: number }, keepPoster = true): ChosenStart & { radius: number } {
  const radius = lensRadiusFor(poster, phone);
  const pr = poster.getBoundingClientRect();
  const preferred: [number, number] = pr.width > 0 ? [pr.left + pr.width / 2, pr.top + pr.height / 2] : [window.innerWidth / 2, window.innerHeight / 2];
  const bounds = boundsFor(radius, insets);
  const obstructions = collectObstructions();
  const orbs = allOrbCircles();
  // Round 4 (G2): phones and portrait tablets start half under the hero
  // window's lower corner (physics.ts cornerStart); every other size keeps
  // round 3's search, which the founder accepted.
  if (window.matchMedia(CORNER_START_MQ).matches) {
    const win = rectOf(document.querySelector('.hero .window'));
    if (win) {
      const others = obstructions.filter((r) => !(r.left === win.left && r.top === win.top && r.right === win.right && r.bottom === win.bottom));
      // Round 5 (R1): the corner start is planned ONCE, in home-boot.ts
      // (keepPoster false: the poster's CSS stand-in spot must not bias the
      // choice), after the orb clock has written its positions; the lens's
      // own mount re-plans with keepPoster true, so while the poster's spot
      // is still a clear corner candidate it stays exactly there.
      const corner = cornerStart(win, radius, bounds, others, orbs, keepPoster && pr.width > 0 ? preferred : null);
      if (corner) return { ...corner, radius };
    }
  }
  const chosen = chooseStart(bounds, radius, preferred, obstructions, orbs);
  return { ...chosen, radius };
}

/** Every `.orb` on the page right now, as plain circles (no colour: the
    start-position search only needs geometry). Unlike `resolveOrbs`, this is
    not sorted or capped at 8: the search needs every orb that might be
    crossable, not only the ones nearest an already-chosen centre. */
function allOrbCircles(): { cx: number; cy: number; r: number }[] {
  const out: { cx: number; cy: number; r: number }[] = [];
  for (const el of document.querySelectorAll<HTMLElement>('.orb')) {
    const r = el.getBoundingClientRect();
    if (r.width > 0) out.push({ cx: r.left + r.width / 2, cy: r.top + r.height / 2, r: r.width / 2 });
  }
  return out;
}

/** Reads a 1x1-wide probe element sized `height: 100lvh` to get the exact
    pixel value the browser resolves for the largest viewport height, the
    same unit the wallpaper (`main::before`) is sized with, so the lens's
    cover-rect math tracks it exactly, including through a mobile toolbar
    collapsing or expanding mid-scroll (README, "Keep the wallpaper at a
    stable 100lvh"). */
function makeLvhProbe(): { read(): number; remove(): void } {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;left:0;top:0;width:0;height:100lvh;visibility:hidden;pointer-events:none;';
  document.body.appendChild(el);
  return {
    read: () => el.getBoundingClientRect().height || window.innerHeight,
    remove: () => el.remove(),
  };
}

export function mountLens(opts: LensOptions): LensHandle | null {
  const { host, poster } = opts;
  const canvas = document.createElement('canvas');
  canvas.className = 'lens-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const hit = document.createElement('button');
  hit.type = 'button';
  hit.className = 'lens-hit';
  hit.setAttribute('aria-label', 'Glass lens. Drag, or focus and use the arrow keys, to move it across the wallpaper.');
  const shadowRest = document.createElement('div');
  shadowRest.className = 'lens-shadow lens-shadow-rest';
  shadowRest.setAttribute('aria-hidden', 'true');
  const shadowHeld = document.createElement('div');
  shadowHeld.className = 'lens-shadow lens-shadow-held';
  shadowHeld.setAttribute('aria-hidden', 'true');

  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false }) as WebGLRenderingContext | null;
  if (!gl) {
    // No WebGL: the poster stands in permanently. Nothing else mounts.
    return null;
  }

  host.appendChild(shadowRest);
  host.appendChild(shadowHeld);
  host.appendChild(canvas);
  host.appendChild(hit);

  const dpr = Math.min(1.5, window.devicePixelRatio || 1);
  // Before the poster can be hidden: its spot and size are the lens's own
  // (glass fix round 3, the critic's arrival jump).
  const plan = opts.plan ?? planLensStart(poster, opts.phone, opts.chromeInsets());
  const radius = plan.radius;
  const lvh = makeLvhProbe();

  let prog: WebGLProgram;
  let buf: WebGLBuffer;
  let tex: WebGLTexture;
  const U: Record<string, WebGLUniformLocation | null> = {};
  let lost = false;

  function setup() {
    prog = link(gl!, VERT, FRAG);
    gl!.useProgram(prog);
    buf = gl!.createBuffer()!;
    gl!.bindBuffer(gl!.ARRAY_BUFFER, buf);
    gl!.bufferData(gl!.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl!.STATIC_DRAW);
    const aPos = gl!.getAttribLocation(prog, 'aPos');
    gl!.enableVertexAttribArray(aPos);
    gl!.vertexAttribPointer(aPos, 2, gl!.FLOAT, false, 0, 0);
    for (const n of ['uBoxOrigin', 'uBoxSize', 'uDpr', 'uCenter', 'uR', 'uM', 'uMinv', 'uWall', 'uWallRect', 'uOrb', 'uOrbCol', 'uOrbHiCol', 'uOrbN', 'uTint', 'uVeil', 'uIdentity', 'uGlow', 'uGlowShape']) {
      U[n] = gl!.getUniformLocation(prog, n);
    }
    tex = gl!.createTexture()!;
    gl!.bindTexture(gl!.TEXTURE_2D, tex);
    gl!.pixelStorei(gl!.UNPACK_FLIP_Y_WEBGL, false);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
    gl!.uniform1i(U.uWall, 0);
  }
  setup();

  const s = {
    x: 0, y: 0, vx: 0, vy: 0, held: false,
    grab: [0, 0] as [number, number],
    samples: [] as Sample[],
    ex: new Lag2(FEEL.stretchTau), ey: new Lag2(FEEL.stretchTau),
    lift: new Lag2(FEEL.liftTau), tint: new Lag2(FEEL.tintTau, opts.initialTint === 'tinted' ? 1 : 0),
    tintTarget: opts.initialTint === 'tinted' ? 1 : 0,
    e: 0, ang: 0, liftV: 0, tintV: opts.initialTint === 'tinted' ? 1 : 0,
    box: 0,
  };

  let tod: TimeOfDay = opts.initialTod;
  let scheme: Scheme = opts.scheme();
  let textureReady = false;
  let visible = !document.hidden;
  let onScreen = true;
  let destroyed = false;

  function sizeCanvas() {
    s.box = Math.ceil(2 * radius * (1 + FEEL.maxStretch) * (1 + FEEL.liftScale) + 6);
    canvas.style.width = `${s.box}px`;
    canvas.style.height = `${s.box}px`;
    canvas.width = Math.round(s.box * dpr);
    canvas.height = Math.round(s.box * dpr);
    hit.style.width = `${2 * radius}px`;
    hit.style.height = `${2 * radius}px`;
    shadowRest.style.width = shadowHeld.style.width = `${2 * radius}px`;
    shadowRest.style.height = shadowHeld.style.height = `${2 * radius}px`;
  }
  sizeCanvas();

  function computeBounds(): Bounds {
    return boundsFor(radius, opts.chromeInsets());
  }

  function startPosition(): [number, number] {
    // Computed from the live layout (README, item 3), preferring the
    // poster's own spot (planLensStart above): open wallpaper where there is
    // any, else the least-covered point. `host.dataset.lensStart` records
    // 'open' or 'partial' and `lensCover` the covered fraction, for the
    // verify probes; a console note covers the case a probe was not
    // watching for.
    host.dataset.lensStart = plan.open ? 'open' : 'partial';
    host.dataset.lensCover = plan.cover.toFixed(3);
    host.dataset.lensSource = plan.source;
    if (!plan.open && plan.source !== 'corner') {
      console.info('[glass lens] no fully open spot at this viewport; starting at the least-covered point.');
    }
    return clampToBounds(plan.x, plan.y, computeBounds());
  }
  [s.x, s.y] = startPosition();
  placePoster(poster, s.x, s.y, radius);

  /* ---------- wallpaper texture ---------- */
  // A small CPU-side copy of whichever wallpaper image is current, for the
  // veil sample (sampleModel below): the same trick room.js's wallSample
  // uses, so the veil reads the wallpaper's own colour instead of a flat
  // stand-in whenever the lens sits over open sky rather than an orb.
  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = 160;
  sampleCanvas.height = 100;
  const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
  let wallSample: ImageData | null = null;

  /** Shows the poster and hides the canvas right away: the state to be in
      while a texture is pending, whether that is the very first load or a
      scheme/tod change on an already-mounted lens (the nit: "the lens keeps
      the old scheme's texture until the new file decodes"). Idempotent, so
      calling it on the initial load (when the canvas is already hidden by
      the stylesheet's default) does nothing extra. */
  function showPosterUntilReady() {
    // Where the lens is now, not the CSS spot: a context loss or a time of
    // day change after a drag must not show the stand-in somewhere else.
    placePoster(poster, s.x, s.y, radius);
    poster.style.removeProperty('display');
    canvas.style.visibility = 'hidden';
    shadowRest.style.visibility = shadowHeld.style.visibility = 'hidden';
  }

  let textureEpoch = 0;
  async function loadTexture() {
    const epoch = ++textureEpoch;
    textureReady = false;
    showPosterUntilReady();
    try {
      const img = await loadWallpaperImage(scheme, tod);
      if (destroyed || epoch !== textureEpoch || lost) return;
      gl!.bindTexture(gl!.TEXTURE_2D, tex);
      gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, img);
      if (sampleCtx) {
        sampleCtx.drawImage(img, 0, 0, 160, 100);
        wallSample = sampleCtx.getImageData(0, 0, 160, 100);
      }
      textureReady = true;
      invalidate();
    } catch {
      // A failed decode leaves the poster up; the lens simply never gets a
      // texture until the next scheme/tod change tries again.
      textureReady = false;
    }
  }
  void loadTexture();

  /* ---------- input ---------- */
  let dirty = true;
  function invalidate() { dirty = true; }

  let suppressingSelection = false;
  function onSelectStart(ev: Event) { ev.preventDefault(); }
  function beginSelectionGuard() {
    if (suppressingSelection) return;
    suppressingSelection = true;
    document.addEventListener('selectstart', onSelectStart);
    document.documentElement.classList.add('lens-held');
  }
  function endSelectionGuard() {
    if (!suppressingSelection) return;
    suppressingSelection = false;
    document.removeEventListener('selectstart', onSelectStart);
    document.documentElement.classList.remove('lens-held');
  }

  function onPointerDown(ev: PointerEvent) {
    ev.preventDefault();
    try { hit.setPointerCapture(ev.pointerId); } catch { /* a non-live pointerId: ignore, as a real drag never hits this */ }
    s.held = true;
    s.vx = 0;
    s.vy = 0;
    s.grab = [ev.clientX - s.x, ev.clientY - s.y];
    s.samples = [{ t: ev.timeStamp, x: s.x, y: s.y }];
    beginSelectionGuard();
    invalidate();
  }
  function onPointerMove(ev: PointerEvent) {
    if (!s.held) return;
    const events: PointerEvent[] = typeof ev.getCoalescedEvents === 'function' ? ev.getCoalescedEvents() : [ev];
    const bounds = computeBounds();
    for (const e of events.length ? events : [ev]) {
      const [x, y] = clampToBounds(e.clientX - s.grab[0], e.clientY - s.grab[1], bounds);
      s.x = x;
      s.y = y;
      s.samples.push({ t: e.timeStamp, x, y });
    }
    const now = ev.timeStamp;
    while (s.samples.length > 2 && now - s.samples[0].t > 100) s.samples.shift();
    invalidate();
  }
  function release(ev: PointerEvent) {
    if (!s.held) return;
    s.held = false;
    endSelectionGuard();
    const samplesArr: Array<[number, number, number]> = s.samples.map((p) => [p.t, p.x, p.y]);
    const v = releaseVelocity(samplesArr, ev.timeStamp);
    [s.vx, s.vy] = capThrow(v[0], v[1]);
    s.samples = [];
    invalidate();
  }
  hit.addEventListener('pointerdown', onPointerDown);
  hit.addEventListener('pointermove', onPointerMove);
  hit.addEventListener('pointerup', release);
  hit.addEventListener('pointercancel', release);
  // Belt and braces against the WebKit finding (a mouse drag on the lens
  // selected the header, heading and body text): no selection may start
  // anywhere on the page while the pointer is down on the hit area, even if
  // some path reaches a text node before the class/attribute above lands.
  hit.addEventListener('dragstart', (ev) => ev.preventDefault());

  function onKeyDown(ev: KeyboardEvent) {
    const step = ev.shiftKey ? KEY_STEP_FAST : KEY_STEP;
    let dx = 0;
    let dy = 0;
    if (ev.key === 'ArrowLeft') dx = -step;
    else if (ev.key === 'ArrowRight') dx = step;
    else if (ev.key === 'ArrowUp') dy = -step;
    else if (ev.key === 'ArrowDown') dy = step;
    else return;
    ev.preventDefault();
    s.vx = 0;
    s.vy = 0;
    const bounds = computeBounds();
    [s.x, s.y] = clampToBounds(s.x + dx, s.y + dy, bounds);
    invalidate();
  }
  hit.addEventListener('keydown', onKeyDown);

  /* ---------- context loss ---------- */
  function onContextLost(ev: Event) {
    ev.preventDefault();
    lost = true;
    textureReady = false;
    showPosterUntilReady();
  }
  function onContextRestored() {
    lost = false;
    setup();
    // loadTexture() itself calls showPosterUntilReady(), so the canvas stays
    // hidden (the poster still covers it) until the rebuilt context has
    // actually decoded and bound a fresh texture and a real frame draws.
    void loadTexture();
    invalidate();
  }
  canvas.addEventListener('webglcontextlost', onContextLost, false);
  canvas.addEventListener('webglcontextrestored', onContextRestored, false);

  /* ---------- visibility / on-screen ---------- */
  const io = new IntersectionObserver((entries) => {
    onScreen = entries[0]?.isIntersecting ?? true;
    if (onScreen) invalidate();
  });
  io.observe(hit);
  function onVisibilityChange() {
    visible = !document.hidden;
    if (visible) invalidate();
  }
  document.addEventListener('visibilitychange', onVisibilityChange);

  /* ---------- resize / scroll / scheme ---------- */
  function onResize() { invalidate(); }
  window.addEventListener('resize', onResize);
  // Natural document scroll moves every `.orb` in the viewport with no JS
  // involved (they are absolutely positioned, not fixed); the browser has
  // already applied it by the time this fires, so a redraw is all that is
  // needed (README, item 2: the critic measured 0 draws across a 200 px
  // scroll). `orbs-clock.ts`'s own `onMove` hook (wired in home-boot.ts)
  // covers the JS-driven parallax on top of that.
  function onScroll() { invalidate(); }
  window.addEventListener('scroll', onScroll, { passive: true });
  const schemeObserver = new MutationObserver(() => {
    const next = opts.scheme();
    if (next !== scheme) {
      scheme = next;
      void loadTexture();
    }
  });
  schemeObserver.observe(document.documentElement, { attributeFilter: ['data-scheme'] });

  /* ---------- per frame ---------- */
  let lastT: number | null = null;
  let raf = 0;
  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    if (lost) return;
    // Pause: while the tab is hidden or the lens has scrolled off-screen,
    // touch nothing but the clock, so a resume does not see one huge dt (the
    // house WebGL rule; draw-counter probes rely on zero work happening
    // here, not only zero draw calls).
    if (!onScreen || !visible) { lastT = now; return; }
    const dt = lastT == null ? 1 / 60 : Math.min(0.05, (now - lastT) / 1000);
    lastT = now;

    const gliding = !s.held && (s.vx !== 0 || s.vy !== 0);
    if (gliding) {
      const bounds = computeBounds();
      const next = stepGlide(s.x, s.y, s.vx, s.vy, dt, bounds);
      s.x = next.x; s.y = next.y; s.vx = next.vx; s.vy = next.vy;
      invalidate();
    } else if (!s.held && dirty) {
      // Only re-clamp when something already invalidated this frame (a
      // resize, a scroll, an orb move, …): at rest this is dead weight, two
      // getBoundingClientRect calls a frame for a clamp that never changes
      // anything (the critic's nit on the loop's own idle cost). A resize
      // still reaches here because `onResize` calls `invalidate()`.
      const bounds = computeBounds();
      [s.x, s.y] = clampToBounds(s.x, s.y, bounds);
    }

    const motionV: [number, number] = s.held
      ? releaseVelocity(s.samples.map((p) => [p.t, p.x, p.y]), now)
      : [s.vx, s.vy];
    const [tx, ty] = stretchTarget(motionV[0], motionV[1]);
    const ex = s.ex.step(tx, dt);
    const ey = s.ey.step(ty, dt);
    s.e = Math.hypot(ex, ey);
    s.liftV = s.lift.step(s.held ? 1 : 0, dt);
    s.tintV = s.tint.step(s.tintTarget, dt);
    const { m00, m01, m11, det } = stretchMatrix(ex, ey, s.liftV);

    if (!dirty && !s.held && s.vx === 0 && s.vy === 0 && Math.abs(s.tintV - s.tintTarget) < 0.0005 && s.liftV < 0.0005) return;

    const ox = Math.round((s.x - s.box / 2) * dpr) / dpr;
    const oy = Math.round((s.y - s.box / 2) * dpr) / dpr;
    canvas.style.transform = `translate3d(${ox}px, ${oy}px, 0)`;
    hit.style.transform = `translate3d(${s.x - radius}px, ${s.y - radius}px, 0)`;
    const shape = `translate3d(${s.x}px, ${s.y}px, 0) matrix(${m00}, ${m01}, ${m01}, ${m11}, 0, 0) translate(${-radius}px, ${-radius}px)`;
    shadowRest.style.transform = shadowHeld.style.transform = shape;
    shadowHeld.style.opacity = String(s.liftV);
    shadowRest.style.opacity = String(1 - s.liftV);

    if (!textureReady) { dirty = false; return; } // poster still covers the gap

    // Reveal every frame we actually draw, not once ever: a scheme/tod
    // change hides the canvas again first (loadTexture -> showPosterUntil-
    // Ready), so this has to run again on the next ready frame too, or the
    // canvas would stay hidden behind its own poster forever after the
    // first flip. Setting the same value twice is a no-op cost, and this
    // whole function already returned above on every idle frame, so it
    // never runs while nothing is happening.
    poster.style.display = 'none';
    // An explicit 'visible', not '': clearing the inline value would fall
    // back to the stylesheet's own default of `visibility: hidden` (theme.css
    // declares it hidden until JS says otherwise), which is not the same as
    // "no inline style at all". The probes hide the shadow only (?lensProbe):
    // the model itself must stay visible to be measured, but its shadow
    // would just add noise to a pixel diff against the true page.
    canvas.style.visibility = 'visible';
    const probeActive = opts.probe === 'identity' || opts.probe === 'seam';
    shadowRest.style.visibility = shadowHeld.style.visibility = probeActive ? 'hidden' : 'visible';
    canvas.style.clipPath = opts.probe === 'seam' ? `inset(0 ${(s.box - (s.x - ox)).toFixed(2)}px 0 0)` : '';

    const lvhPx = lvh.read();
    const wall = coverRect(window.innerWidth, lvhPx, WALL_W, WALL_H);
    const wallRect: [number, number, number, number] = [wall.x, wall.y, wall.w, wall.h];
    const orbs = resolveOrbs(s.x, s.y);

    // Veil: the backdrop's own mean colour under the lens, lifted toward
    // white (the same 9-tap ring the proof samples).
    let vr = 0, vg = 0, vb = 0;
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2;
      const rr = k === 0 ? 0 : radius * 0.6;
      const px = s.x + Math.cos(a) * rr;
      const py = s.y + Math.sin(a) * rr;
      const [r, g, b] = sampleModel(wallRect, orbs, px, py);
      vr += r; vg += g; vb += b;
    }
    const veil: [number, number, number] = [vr / 9, vg / 9, vb / 9].map((v) => (255 + (v - 255) * 0.35) / 255) as [number, number, number];

    const Minv = [m11 / det, -m01 / det, -m01 / det, m00 / det];
    gl!.viewport(0, 0, canvas.width, canvas.height);
    gl!.useProgram(prog);
    gl!.bindBuffer(gl!.ARRAY_BUFFER, buf);
    gl!.bindTexture(gl!.TEXTURE_2D, tex);
    gl!.uniform2f(U.uBoxOrigin, ox, oy);
    gl!.uniform2f(U.uBoxSize, s.box, s.box);
    gl!.uniform1f(U.uDpr, dpr);
    gl!.uniform2f(U.uCenter, s.x, s.y);
    gl!.uniform1f(U.uR, radius);
    gl!.uniformMatrix2fv(U.uM, false, [m00, m01, m01, m11]);
    gl!.uniformMatrix2fv(U.uMinv, false, Minv);
    gl!.uniform4fv(U.uWallRect, wallRect);
    const orbBuf = new Float32Array(32);
    const colBuf = new Float32Array(24);
    const hiColBuf = new Float32Array(24);
    orbs.forEach((o, i) => {
      orbBuf.set([o.cx, o.cy, o.r, 0], i * 4);
      colBuf.set([o.rgb[0] / 255, o.rgb[1] / 255, o.rgb[2] / 255], i * 3);
      hiColBuf.set([o.hiRgb[0] / 255, o.hiRgb[1] / 255, o.hiRgb[2] / 255], i * 3);
    });
    gl!.uniform4fv(U.uOrb, orbBuf);
    gl!.uniform3fv(U.uOrbCol, colBuf);
    gl!.uniform3fv(U.uOrbHiCol, hiColBuf);
    gl!.uniform1i(U.uOrbN, orbs.length);
    const glow = orbGlow();
    gl!.uniform4f(U.uGlow, glow.rgb[0], glow.rgb[1], glow.rgb[2], glow.alpha);
    gl!.uniform2f(U.uGlowShape, glow.sigma, glow.spread);
    gl!.uniform1f(U.uTint, probeActive ? 0 : s.tintV);
    gl!.uniform3f(U.uVeil, veil[0], veil[1], veil[2]);
    gl!.uniform1f(U.uIdentity, probeActive ? 1 : 0);
    gl!.clearColor(0, 0, 0, 0);
    gl!.clear(gl!.COLOR_BUFFER_BIT);
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
    dirty = false;
  }
  raf = requestAnimationFrame(frame);

  function sampleModel(wallRect: [number, number, number, number], orbs: ModelOrb[], x: number, y: number): [number, number, number] {
    for (let i = orbs.length - 1; i >= 0; i--) {
      const o = orbs[i];
      if ((x - o.cx) ** 2 + (y - o.cy) ** 2 < o.r * o.r) return o.rgb;
    }
    if (!wallSample) return [214, 150, 150]; // no sample yet: a warm mid-tone stand-in
    const [wx, wy, ww, wh] = wallRect;
    const u = Math.min(159, Math.max(0, Math.floor(((x - wx) / ww) * 160)));
    const v = Math.min(99, Math.max(0, Math.floor(((y - wy) / wh) * 100)));
    const k = (v * 160 + u) * 4;
    const d = wallSample.data;
    return [d[k], d[k + 1], d[k + 2]];
  }

  return {
    setTint(t: Tint) { s.tintTarget = t === 'tinted' ? 1 : 0; invalidate(); },
    setTod(next: TimeOfDay) {
      if (next === tod) return;
      tod = next;
      void loadTexture();
    },
    invalidate,
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      hit.removeEventListener('pointerdown', onPointerDown);
      hit.removeEventListener('pointermove', onPointerMove);
      hit.removeEventListener('pointerup', release);
      hit.removeEventListener('pointercancel', release);
      hit.removeEventListener('keydown', onKeyDown);
      canvas.removeEventListener('webglcontextlost', onContextLost, false);
      canvas.removeEventListener('webglcontextrestored', onContextRestored, false);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll);
      io.disconnect();
      schemeObserver.disconnect();
      endSelectionGuard();
      lvh.remove();
      if (!lost) {
        const lose = gl!.getExtension('WEBGL_lose_context');
        lose?.loseContext();
      }
      canvas.remove();
      hit.remove();
      shadowRest.remove();
      shadowHeld.remove();
      poster.style.removeProperty('display');
    },
  };
}
