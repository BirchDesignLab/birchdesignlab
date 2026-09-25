/**
 * The draggable glass lens for the stage 3 lens proof: WebGL drawing, rigid
 * glass handling, and the Chromium-only SVG alternative it is weighed
 * against.
 *
 * Written 09-25-26 for Tier 3 stage 3 (Tier A proofs). A proof, not
 * production code.
 *
 * Drawing (lens=webgl, the default). A small canvas the size of the lens
 * follows it. The fragment shader draws the backdrop itself from the model
 * room.js reads out of the DOM and CSS every frame (the wallpaper texture at
 * its cover rect, then every orb as a crisp disc), and bends it: the middle
 * magnified about 1.25x, an edge band that pulls in what lies just outside
 * the rim, a faint colour fringe in that band (red, green and blue sampled at
 * slightly different depths), a bright top-left rim with a fainter
 * bottom-right kick, and in Tinted a frosted, warm veil (17 texture taps a
 * pixel instead of 3). DOM text is not in
 * the model, so text behind the lens is not drawn by it: under layer=over the
 * lens covers text, under layer=under text passes over the lens unbent.
 *
 * Handling (the founder's "glass, not rubber", decisions item 1):
 *   - the lens follows the finger 1:1 while held (rigid, no lag);
 *   - on release it glides with the release velocity, which decays
 *     exponentially to a stop (tau 0.20 s): no spring, so no overshoot;
 *   - it stops against the window edge: the velocity component into the
 *     wall is zeroed, never reflected;
 *   - it stretches along its motion by at most 4% (and narrows across by at
 *     most 2%), the stretch following speed through two cascaded first-order
 *     lags, whose impulse response is never negative, so the stretch eases in
 *     and out and can never overshoot or oscillate;
 *   - while held it lifts: 1.2% larger and a deeper shadow, eased the same
 *     way.
 *
 * Probes for the harness (probe=...): `identity` draws the model backdrop
 * with no bending, rim, tint or shadow, so the disc should vanish into the
 * page if the model matches; `seam` does the same on the left half only, so
 * the seam down the middle can be measured for a vertical offset while
 * scrolling.
 *
 * Usage: imported by main.js.
 */

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
uniform int uOrbN;
uniform float uTint;
uniform vec3 uVeil;
uniform float uIdentity;

vec3 backdrop(vec2 s) {
  vec2 uv = (s - uWallRect.xy) / uWallRect.zw;
  vec3 c = texture2D(uWall, clamp(uv, 0.0, 1.0)).rgb;
  for (int i = 0; i < 8; i++) {
    if (i >= uOrbN) break;
    float d = length(s - uOrb[i].xy) - uOrb[i].z;
    c = mix(c, uOrbCol[i], clamp(0.5 - d * uDpr, 0.0, 1.0));
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
    gl_FragColor = vec4(backdrop(p) * alpha, alpha);
    return;
  }
  // Refraction profile: m < 1 magnifies (centre 1/0.8 = 1.25x), m > 1 at the
  // rim reaches 30% of a radius past it.
  float e = smoothstep(0.5, 1.0, r);
  float m = 0.8 + 0.5 * e * e;
  float disp = 0.03 * e;
  vec2 sG = uCenter + uM * (q * m) * uR;
  vec2 sR = uCenter + uM * (q * m * (1.0 + disp)) * uR;
  vec2 sB = uCenter + uM * (q * m * (1.0 - disp)) * uR;
  vec3 col = vec3(backdrop(sR).r, backdrop(sG).g, backdrop(sB).b);
  if (uTint > 0.001) {
    // Tinted: frost (17 taps on two rings around the green sample) under a
    // warm veil.
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
  // Specular rim, lit from the top left.
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

/** Two cascaded first-order lags: an S-shaped, never-overshooting ease. */
class Lag2 {
  constructor(tau, v = 0) {
    this.tau = tau;
    this.a = v;
    this.b = v;
  }
  step(target, dt) {
    const k = 1 - Math.exp(-dt / this.tau);
    this.a += (target - this.a) * k;
    this.b += (this.a - this.b) * k;
    return this.b;
  }
}

export const FEEL = {
  maxStretch: 0.04, // along the motion; across narrows by half this
  stretchSpeed: 1400, // px/s at which the stretch reaches 63% of its max
  stretchTau: 0.045, // s, each of the two lags
  glideTau: 0.2, // s, velocity e-folding time after release
  stopSpeed: 6, // px/s, below this the glide ends
  maxThrow: 3600, // px/s cap on release speed
  liftScale: 0.012,
  liftTau: 0.06,
  tintTau: 0.09,
  wallInset: 8, // px between the lens rim and the window edge
};

export function createLens({ wallCanvas, mode, dpr, radius, start }) {
  const canvas = document.getElementById('lens-canvas');
  const hit = document.getElementById('lens-hit');
  const svgLens = document.getElementById('svg-lens');
  const shRest = document.getElementById('shadow-rest');
  const shHeld = document.getElementById('shadow-held');
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
  let renderer = null;
  if (gl) {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  }
  const prog = link(gl, VERT, FRAG);
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  for (const n of ['uBoxOrigin', 'uBoxSize', 'uDpr', 'uCenter', 'uR', 'uM', 'uMinv', 'uWall', 'uWallRect', 'uOrb', 'uOrbCol', 'uOrbN', 'uTint', 'uVeil', 'uIdentity']) {
    U[n] = gl.getUniformLocation(prog, n);
  }
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, wallCanvas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform1i(U.uWall, 0);

  const s = {
    x: start[0], y: start[1], vx: 0, vy: 0, held: false,
    grab: [0, 0], samples: [],
    ex: new Lag2(FEEL.stretchTau), ey: new Lag2(FEEL.stretchTau),
    lift: new Lag2(FEEL.liftTau), tint: new Lag2(FEEL.tintTau),
    liftV: 0, tintV: 0, tintTarget: 0, e: 0, ang: 0,
    probe: null, hidden: false, R: radius, box: 0,
    trace: null,
  };

  function sizeCanvas() {
    s.box = Math.ceil(2 * s.R * (1 + FEEL.maxStretch) * (1 + FEEL.liftScale) + 6);
    canvas.style.width = hit.style.width = `${s.box}px`;
    canvas.style.height = `${s.box}px`;
    canvas.width = canvas.height = Math.round(s.box * dpr);
    for (const el of [hit, svgLens, shRest, shHeld]) {
      el.style.width = el.style.height = `${2 * s.R}px`;
    }
  }
  sizeCanvas();

  const svg = mode === 'svg' ? buildSvgLens(s.R) : null;

  /* ---------- input ---------- */
  hit.addEventListener('pointerdown', (ev) => {
    hit.setPointerCapture(ev.pointerId);
    s.held = true;
    s.vx = s.vy = 0;
    s.grab = [ev.clientX - s.x, ev.clientY - s.y];
    s.samples = [[ev.timeStamp, s.x, s.y]];
    document.documentElement.classList.add('lens-held');
  });
  hit.addEventListener('pointermove', (ev) => {
    if (!s.held) return;
    const events = ev.getCoalescedEvents ? ev.getCoalescedEvents() : [ev];
    for (const e of events.length ? events : [ev]) {
      const [x, y] = clamp(e.clientX - s.grab[0], e.clientY - s.grab[1]);
      s.x = x;
      s.y = y;
      s.samples.push([e.timeStamp, x, y]);
    }
    const now = ev.timeStamp;
    while (s.samples.length > 2 && now - s.samples[0][0] > 100) s.samples.shift();
  });
  const release = (ev) => {
    if (!s.held) return;
    s.held = false;
    document.documentElement.classList.remove('lens-held');
    const v = releaseVelocity(s.samples, ev.timeStamp);
    const sp = Math.hypot(v[0], v[1]);
    const k = sp > FEEL.maxThrow ? FEEL.maxThrow / sp : 1;
    s.vx = v[0] * k;
    s.vy = v[1] * k;
    s.samples = [];
  };
  hit.addEventListener('pointerup', release);
  hit.addEventListener('pointercancel', release);

  function bounds() {
    const m = s.R * (1 + FEEL.maxStretch) * (1 + FEEL.liftScale) + FEEL.wallInset;
    return [m, m, innerWidth - m, innerHeight - m];
  }
  function clamp(x, y) {
    const [x0, y0, x1, y1] = bounds();
    return [Math.min(x1, Math.max(x0, x)), Math.min(y1, Math.max(y0, y))];
  }

  /** Velocity at release: a least-squares slope over the last 80 ms of
      pointer samples; zero if the pointer had stopped for 50 ms. */
  function releaseVelocity(samples, now) {
    const recent = samples.filter((p) => now - p[0] <= 80);
    if (recent.length < 2 || now - recent[recent.length - 1][0] > 50) return [0, 0];
    const t0 = recent[0][0];
    let st = 0, sx = 0, sy = 0, stt = 0, stx = 0, sty = 0;
    for (const [t, x, y] of recent) {
      const u = (t - t0) / 1000;
      st += u; sx += x; sy += y; stt += u * u; stx += u * x; sty += u * y;
    }
    const n = recent.length;
    const den = n * stt - st * st;
    if (den <= 1e-9) return [0, 0];
    return [(n * stx - st * sx) / den, (n * sty - st * sy) / den];
  }

  /** The speed that drives the stretch: while held, the pointer's recent
      velocity; after release, the glide's. */
  function motionVelocity(now) {
    if (s.held) {
      const v = releaseVelocity(s.samples, now);
      return v;
    }
    return [s.vx, s.vy];
  }

  /* ---------- per frame ---------- */
  let lastT = null;
  function step(now, model) {
    const dt = lastT == null ? 1 / 60 : Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    if (!s.held && (s.vx || s.vy)) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      const [x0, y0, x1, y1] = bounds();
      // Stop against the edge: the component into the wall is dropped.
      if (s.x <= x0) { s.x = x0; s.vx = Math.max(0, s.vx); }
      if (s.x >= x1) { s.x = x1; s.vx = Math.min(0, s.vx); }
      if (s.y <= y0) { s.y = y0; s.vy = Math.max(0, s.vy); }
      if (s.y >= y1) { s.y = y1; s.vy = Math.min(0, s.vy); }
      const decay = Math.exp(-dt / FEEL.glideTau);
      s.vx *= decay;
      s.vy *= decay;
      if (Math.hypot(s.vx, s.vy) < FEEL.stopSpeed) s.vx = s.vy = 0;
    } else if (!s.held) {
      [s.x, s.y] = clamp(s.x, s.y);
    }
    const [mvx, mvy] = motionVelocity(now);
    const sp = Math.hypot(mvx, mvy);
    const mag = FEEL.maxStretch * (1 - Math.exp(-sp / FEEL.stretchSpeed));
    // The stretch lives in doubled-angle form so its direction eases too.
    const a2 = 2 * Math.atan2(mvy, mvx);
    const tx = sp > 1 ? mag * Math.cos(a2) : 0;
    const ty = sp > 1 ? mag * Math.sin(a2) : 0;
    const ex = s.ex.step(tx, dt);
    const ey = s.ey.step(ty, dt);
    s.e = Math.hypot(ex, ey);
    s.ang = Math.atan2(ey, ex) / 2;
    s.liftV = s.lift.step(s.held ? 1 : 0, dt);
    s.tintV = s.tint.step(s.tintTarget, dt);
    // M = I + e (0.25 I + 0.75 [[c, s], [s, -c]]): 1 + e along, 1 - e/2 across.
    const c2 = Math.cos(2 * s.ang);
    const s2 = Math.sin(2 * s.ang);
    const L = 1 + FEEL.liftScale * s.liftV;
    const m00 = (1 + s.e * (0.25 + 0.75 * c2)) * L;
    const m11 = (1 + s.e * (0.25 - 0.75 * c2)) * L;
    const m01 = s.e * 0.75 * s2 * L;
    const det = m00 * m11 - m01 * m01;
    const M = [m00, m01, m01, m11];
    const Minv = [m11 / det, -m01 / det, -m01 / det, m00 / det];

    // Place the parts. The canvas snaps to device pixels.
    const ox = Math.round((s.x - s.box / 2) * dpr) / dpr;
    const oy = Math.round((s.y - s.box / 2) * dpr) / dpr;
    canvas.style.transform = `translate3d(${ox}px, ${oy}px, 0)`;
    hit.style.transform = `translate3d(${s.x - s.R}px, ${s.y - s.R}px, 0)`;
    const shape = `translate3d(${s.x}px, ${s.y}px, 0) matrix(${m00}, ${m01}, ${m01}, ${m11}, 0, 0) translate(${-s.R}px, ${-s.R}px)`;
    shRest.style.transform = shHeld.style.transform = shape;
    shHeld.style.opacity = String(s.liftV);
    shRest.style.opacity = String(1 - s.liftV);
    if (svg) {
      svgLens.style.transform = shape;
      const bg = `rgb(255 246 238 / ${(0.3 * s.tintV).toFixed(2)})`;
      const bf = `url(#lens-map)${s.tintV > 0.02 ? ` blur(${(2.5 * s.tintV).toFixed(1)}px)` : ''} brightness(1.04)`;
      if (bg !== s.lastBg) svgLens.style.background = s.lastBg = bg;
      if (bf !== s.lastBf) svgLens.style.backdropFilter = s.lastBf = bf;
    }
    if (s.probe === 'seam') {
      canvas.style.clipPath = `inset(0 ${(s.box - (s.x - ox)).toFixed(2)}px 0 0)`;
    } else {
      canvas.style.clipPath = '';
    }
    const hideShadow = !!s.probe || s.hidden;
    shRest.style.visibility = shHeld.style.visibility = hideShadow ? 'hidden' : '';
    canvas.style.visibility = s.hidden ? 'hidden' : '';

    if (!svg && !s.hidden) {
      // Veil: the backdrop's own mean colour under the lens, lifted toward white.
      let vr = 0, vg = 0, vb = 0;
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2;
        const rr = k === 0 ? 0 : s.R * 0.6;
        const col = model.sample(s.x + Math.cos(a) * rr, s.y + Math.sin(a) * rr);
        vr += col[0]; vg += col[1]; vb += col[2];
      }
      const veil = [vr / 9, vg / 9, vb / 9].map((v) => (255 + (v - 255) * 0.35) / 255);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(U.uBoxOrigin, ox, oy);
      gl.uniform2f(U.uBoxSize, s.box, s.box);
      gl.uniform1f(U.uDpr, dpr);
      gl.uniform2f(U.uCenter, s.x, s.y);
      gl.uniform1f(U.uR, s.R);
      gl.uniformMatrix2fv(U.uM, false, M);
      gl.uniformMatrix2fv(U.uMinv, false, Minv);
      gl.uniform4fv(U.uWallRect, model.wall);
      const orbs = new Float32Array(32);
      const cols = new Float32Array(24);
      model.orbs.slice(0, 8).forEach((o, i) => {
        orbs.set([o.cx, o.cy, o.r, 0], i * 4);
        cols.set([o.rgb[0] / 255, o.rgb[1] / 255, o.rgb[2] / 255], i * 3);
      });
      gl.uniform4fv(U.uOrb, orbs);
      gl.uniform3fv(U.uOrbCol, cols);
      gl.uniform1i(U.uOrbN, Math.min(8, model.orbs.length));
      gl.uniform1f(U.uTint, s.probe ? 0 : s.tintV);
      gl.uniform3f(U.uVeil, veil[0], veil[1], veil[2]);
      gl.uniform1f(U.uIdentity, s.probe ? 1 : 0);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    if (s.trace) {
      s.trace.push({ t: now, x: s.x, y: s.y, vx: s.vx, vy: s.vy, held: s.held, e: s.e, ang: s.ang, lift: s.liftV, sx: m00, sy: m11 });
    }
  }

  return {
    step,
    state: s,
    renderer,
    setTint(t) { s.tintTarget = t === 'tinted' ? 1 : 0; },
    snapTint(t) { const v = t === 'tinted' ? 1 : 0; s.tintTarget = v; s.tint = new Lag2(FEEL.tintTau, v); },
    moveTo(x, y) { [s.x, s.y] = clamp(x, y); s.vx = s.vy = 0; },
    setProbe(p) { s.probe = p; },
    setHidden(h) { s.hidden = h; if (svg) svgLens.style.visibility = h ? 'hidden' : ''; },
    startTrace() { s.trace = []; },
    stopTrace() { const t = s.trace; s.trace = null; return t; },
    bounds,
  };
}

/**
 * The SVG route for the lens (Chromium only): a displacement map with the
 * same profile as the shader, three displacement passes at slightly
 * different depths for the fringe, recombined channel by channel. It bends
 * whatever is behind, DOM text included, but only within the lens's own box:
 * backdrop-filter has no pixels from outside the element.
 */
function buildSvgLens(R) {
  const D = Math.round(2 * R);
  const c = document.createElement('canvas');
  c.width = c.height = D;
  const g = c.getContext('2d');
  const img = g.createImageData(D, D);
  // Largest shift of the profile, in px, to scale the map.
  let max = 1;
  for (let i = 0; i <= 100; i++) {
    const r = i / 100;
    const e = smooth(0.5, 1, r);
    max = Math.max(max, Math.abs((0.8 + 0.5 * e * e - 1) * r * R * 1.03));
  }
  for (let j = 0; j < D; j++) {
    for (let i = 0; i < D; i++) {
      const qx = (i + 0.5 - R) / R;
      const qy = (j + 0.5 - R) / R;
      const r = Math.hypot(qx, qy);
      let dx = 0, dy = 0;
      if (r <= 1) {
        const e = smooth(0.5, 1, r);
        const m = 0.8 + 0.5 * e * e;
        dx = (m - 1) * qx * R;
        dy = (m - 1) * qy * R;
      }
      const k = (j * D + i) * 4;
      img.data[k] = Math.round(128 + (dx / max) * 127);
      img.data[k + 1] = Math.round(128 + (dy / max) * 127);
      img.data[k + 2] = 128;
      img.data[k + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const url = c.toDataURL('image/png');
  const S = 2 * max;
  const svg = document.getElementById('filters');
  const f = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
  f.id = 'lens-map';
  for (const [k, v] of Object.entries({ x: 0, y: 0, width: D, height: D, filterUnits: 'userSpaceOnUse', primitiveUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB' })) f.setAttribute(k, String(v));
  const dm = (sc, res) => `<feDisplacementMap in="SourceGraphic" in2="map" scale="${sc}" xChannelSelector="R" yChannelSelector="G" result="${res}"/>`;
  const row = (ch) => [0, 1, 2, 3, 4].map((k) => (k === ch ? 1 : 0)).join(' ');
  const only = (i, res, out) => `<feColorMatrix in="${res}" type="matrix" values="${[0, 1, 2].map((ch) => (ch === i ? row(ch) : '0 0 0 0 0')).join('  ')}  0 0 0 1 0" result="${out}"/>`;
  f.innerHTML = `<feImage href="${url}" x="0" y="0" width="${D}" height="${D}" preserveAspectRatio="none" result="map"/>` +
    dm(S * 1.03, 'dr') + dm(S, 'dg') + dm(S * 0.97, 'db') +
    only(0, 'dr', 'r') + only(1, 'dg', 'g') + only(2, 'db', 'b') +
    `<feComposite in="r" in2="g" operator="arithmetic" k2="1" k3="1" result="rg"/>` +
    `<feComposite in="rg" in2="b" operator="arithmetic" k2="1" k3="1"/>`;
  svg.appendChild(f);
  return { url, S };
}

function smooth(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function link(gl, vs, fs) {
  const sh = (type, src) => {
    const o = gl.createShader(type);
    gl.shaderSource(o, src);
    gl.compileShader(o);
    if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o));
    return o;
  };
  const p = gl.createProgram();
  gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  return p;
}
