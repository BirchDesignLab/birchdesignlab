# BDL-007 The Shining Tree Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An interactive three.js stage for the bdlOrganic 3D wordmark at `/lab/bdl-007`: drag/flick/zoom, breathing moss, fireflies that gather when you leave it alone.

**Architecture:** An Astro experiment shell renders a committed still immediately, then an IntersectionObserver dynamically imports `stage.ts` (three.js scene, its own chunk). Firefly steering lives in `fireflies.ts` as pure seeded functions so vitest can exercise it without WebGL. Spec: `docs/superpowers/specs/2026-08-18-bdl-007-shining-tree-design.md`.

**Tech Stack:** Astro 5, three ^0.185.1 (`three/addons` import paths), vitest, TypeScript.

## Global Constraints

- One new runtime dependency only: `three` (plus dev-only `@types/three`). No GSAP, no Threlte, no model-viewer.
- The glb's material names (verified from the file): `canopy`, `stone`, `peel-outside`, `peel-underside`, `moss-star`, `lichen-crust`. Green/living materials are selected by `/moss|canopy|lichen/i`.
- Draco decoder is served from `/draco/` (copied from the three package) — never a CDN.
- Idle yaw: one rotation per 30 seconds, stops forever on first grab.
- Reduced motion honored narrowly: visitor-caused motion stays; autonomous motion (idle yaw, fly drift, moss pulse) stops.
- No em dashes in any visitor-facing copy.
- Before the PR: `npx vitest run` (only the pre-existing brand-cream failure allowed), `npx astro check`, `npm run build` all clean.
- All commits on branch `feat/bdl-007-shining-tree`; commit messages follow the repo's `feat(lab):`/`chore(lab):` style.

---

### Task 1: Dependencies and assets

**Files:**
- Modify: `package.json` (via npm install)
- Create: `public/models/bdlOrganic.draco.glb` (copied)
- Create: `public/draco/` (decoder files, copied)
- Create: `src/experiments/bdl-007/still.png` (copied)

**Interfaces:**
- Produces: the draco glb at URL `/models/bdlOrganic.draco.glb`, decoder at URL path `/draco/`, and `still.png` importable by the shell in Task 4.

- [ ] **Step 1: Install three**

```bash
npm i three@^0.185.1
npm i -D @types/three
```

- [ ] **Step 2: Copy the model, decoder, and still**

```bash
mkdir -p public/models public/draco
cp C:/git/websites/cheerAndChatter/files/public/models/bdlOrganic.draco.glb public/models/bdlOrganic.draco.glb
cp node_modules/three/examples/jsm/libs/draco/gltf/draco_decoder.wasm public/draco/
cp node_modules/three/examples/jsm/libs/draco/gltf/draco_wasm_wrapper.js public/draco/
cp C:/git/websites/cheerAndChatter/files/public/icons/bdl-model-still.png src/experiments/bdl-007/still.png
```

(If `node_modules/three/examples/jsm/libs/draco/gltf/` does not exist at that exact path, run `ls node_modules/three/examples/jsm/libs/draco/` and copy the `gltf/` variants of the decoder — the DRACOLoader default expects `draco_wasm_wrapper.js` + `draco_decoder.wasm`.)

- [ ] **Step 3: Verify the build still passes**

Run: `npm run build`
Expected: `Complete!` with no errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json public/models public/draco src/experiments/bdl-007/still.png
git commit -m "chore(lab): three.js dependency and BDL-007 stage assets"
```

---

### Task 2: Firefly steering as pure functions

**Files:**
- Create: `src/experiments/bdl-007/fireflies.ts`
- Test: `tests/fireflies.test.ts`

**Interfaces:**
- Produces (consumed by `stage.ts` in Task 3):
  - `type Vec3 = [number, number, number]`
  - `interface Fly { pos: Vec3; vel: Vec3; phase: number; target: number }`
  - `createFlies(count: number, bounds: number, seed: number): Fly[]`
  - `stepFlies(flies: Fly[], opts: { mode: 'wander' | 'gather'; dt: number; time: number; targets: readonly Vec3[]; bounds: number }): void` (mutates in place)
  - `scatter(flies: Fly[], strength: number, seed: number): void`

- [ ] **Step 1: Write the failing tests**

Create `tests/fireflies.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createFlies, stepFlies, scatter, type Vec3 } from '../src/experiments/bdl-007/fireflies';

const dist = (a: Vec3, b: Vec3) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const speed = (v: Vec3) => Math.hypot(v[0], v[1], v[2]);

describe('createFlies', () => {
  it('is deterministic for the same seed', () => {
    const a = createFlies(10, 2, 7);
    const b = createFlies(10, 2, 7);
    expect(a).toEqual(b);
  });

  it('differs across seeds and spawns inside bounds', () => {
    const a = createFlies(10, 2, 7);
    const c = createFlies(10, 2, 8);
    expect(a).not.toEqual(c);
    for (const f of a) expect(speed(f.pos)).toBeLessThanOrEqual(2);
  });
});

describe('stepFlies', () => {
  const targets: Vec3[] = [[0.5, 1, 0], [-0.5, 0.8, 0.2]];

  it('gather mode pulls flies toward their targets', () => {
    const flies = createFlies(20, 2, 1);
    const before =
      flies.reduce((s, f) => s + dist(f.pos, targets[f.target % targets.length]), 0) / flies.length;
    for (let i = 0; i < 600; i++) {
      stepFlies(flies, { mode: 'gather', dt: 1 / 60, time: i / 60, targets, bounds: 2 });
    }
    const after =
      flies.reduce((s, f) => s + dist(f.pos, targets[f.target % targets.length]), 0) / flies.length;
    expect(after).toBeLessThan(before * 0.5);
  });

  it('never exceeds the speed clamp', () => {
    const flies = createFlies(20, 2, 2);
    scatter(flies, 10, 3); // absurd burst on purpose
    for (let i = 0; i < 120; i++) {
      stepFlies(flies, { mode: 'wander', dt: 1 / 60, time: i / 60, targets, bounds: 2 });
      for (const f of flies) expect(speed(f.vel)).toBeLessThanOrEqual(0.9 + 1e-9);
    }
  });

  it('wander keeps flies near the volume', () => {
    const flies = createFlies(20, 2, 4);
    for (let i = 0; i < 1200; i++) {
      stepFlies(flies, { mode: 'wander', dt: 1 / 60, time: i / 60, targets, bounds: 2 });
    }
    for (const f of flies) expect(speed(f.pos)).toBeLessThan(2 * 1.6);
  });
});

describe('scatter', () => {
  it('kicks velocity and is deterministic per seed', () => {
    const a = createFlies(5, 2, 9);
    const b = createFlies(5, 2, 9);
    scatter(a, 1.5, 42);
    scatter(b, 1.5, 42);
    expect(a).toEqual(b);
    expect(a.some((f, i) => speed(f.vel) > speed(createFlies(5, 2, 9)[i].vel))).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/fireflies.test.ts`
Expected: FAIL — cannot resolve `../src/experiments/bdl-007/fireflies`.

- [ ] **Step 3: Implement fireflies.ts**

Create `src/experiments/bdl-007/fireflies.ts`:

```ts
/**
 * Firefly steering for the Shining Tree stage, as pure seeded functions:
 * no three.js, no Math.random, so vitest can hold it to account without
 * WebGL. stage.ts owns rendering; this owns motion.
 */
export type Vec3 = [number, number, number];

export interface Fly {
  pos: Vec3;
  vel: Vec3;
  /** per-fly noise phase: the organic look comes from this, not boid math */
  phase: number;
  /** index into the gather-target list (mod length) */
  target: number;
}

const MAX_SPEED = 0.9;      // units/s, hard clamp
const WANDER_SPEED = 0.22;  // cruising pace
const GATHER_SPEED = 0.45;  // approach pace
const STEER = 2.0;          // how fast velocity chases its desire (1/s)

/** mulberry32: tiny deterministic PRNG, plenty for ambience */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createFlies(count: number, bounds: number, seed: number): Fly[] {
  const rand = rng(seed);
  const flies: Fly[] = [];
  for (let i = 0; i < count; i++) {
    flies.push({
      pos: [
        (rand() * 2 - 1) * bounds,
        (rand() * 2 - 1) * bounds,
        (rand() * 2 - 1) * bounds,
      ],
      vel: [0, 0, 0],
      phase: rand() * Math.PI * 2,
      target: Math.floor(rand() * 1024),
    });
  }
  return flies;
}

export function stepFlies(
  flies: Fly[],
  opts: {
    mode: 'wander' | 'gather';
    dt: number;
    time: number;
    targets: readonly Vec3[];
    bounds: number;
  },
): void {
  const { mode, dt, time, targets, bounds } = opts;
  const blend = 1 - Math.exp(-STEER * dt);

  for (const f of flies) {
    let desire: Vec3;

    if (mode === 'gather' && targets.length > 0) {
      const t = targets[f.target % targets.length];
      const dx = t[0] - f.pos[0];
      const dy = t[1] - f.pos[1];
      const dz = t[2] - f.pos[2];
      const d = Math.hypot(dx, dy, dz) || 1e-6;
      // ease off close to the target so they hover instead of orbiting
      const pace = Math.min(GATHER_SPEED, d * 1.2);
      desire = [
        (dx / d) * pace + Math.sin(time * 3.1 + f.phase) * 0.04,
        (dy / d) * pace + Math.sin(time * 2.3 + f.phase * 1.7) * 0.04,
        (dz / d) * pace + Math.cos(time * 2.7 + f.phase) * 0.04,
      ];
    } else {
      // wander: layered sines per axis, phase-shifted per fly
      desire = [
        Math.sin(time * 0.7 + f.phase) * WANDER_SPEED,
        Math.sin(time * 0.5 + f.phase * 2.1) * WANDER_SPEED * 0.6,
        Math.cos(time * 0.6 + f.phase * 1.3) * WANDER_SPEED,
      ];
      // soft containment: past the bounds, desire points home
      const r = Math.hypot(f.pos[0], f.pos[1], f.pos[2]);
      if (r > bounds) {
        const pull = (r - bounds) * 0.8;
        desire[0] -= (f.pos[0] / r) * pull;
        desire[1] -= (f.pos[1] / r) * pull;
        desire[2] -= (f.pos[2] / r) * pull;
      }
    }

    f.vel[0] += (desire[0] - f.vel[0]) * blend;
    f.vel[1] += (desire[1] - f.vel[1]) * blend;
    f.vel[2] += (desire[2] - f.vel[2]) * blend;

    const s = Math.hypot(f.vel[0], f.vel[1], f.vel[2]);
    if (s > MAX_SPEED) {
      const k = MAX_SPEED / s;
      f.vel[0] *= k; f.vel[1] *= k; f.vel[2] *= k;
    }

    f.pos[0] += f.vel[0] * dt;
    f.pos[1] += f.vel[1] * dt;
    f.pos[2] += f.vel[2] * dt;
  }
}

export function scatter(flies: Fly[], strength: number, seed: number): void {
  const rand = rng(seed);
  for (const f of flies) {
    const theta = rand() * Math.PI * 2;
    const z = rand() * 2 - 1;
    const r = Math.sqrt(1 - z * z);
    f.vel[0] += Math.cos(theta) * r * strength;
    f.vel[1] += z * strength;
    f.vel[2] += Math.sin(theta) * r * strength;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/fireflies.test.ts`
Expected: PASS (all 6).

- [ ] **Step 5: Commit**

```bash
git add src/experiments/bdl-007/fireflies.ts tests/fireflies.test.ts
git commit -m "feat(lab): BDL-007 firefly steering as pure tested functions"
```

---

### Task 3: The stage

**Files:**
- Create: `src/experiments/bdl-007/stage.ts`

**Interfaces:**
- Consumes: `createFlies`, `stepFlies`, `scatter`, `Vec3` from `./fireflies` (Task 2 signatures).
- Produces (consumed by the shell in Task 4): `mountStage(canvas: HTMLCanvasElement, opts?: { onReady?: () => void }): () => void` — returns dispose.

- [ ] **Step 1: Write stage.ts**

Create `src/experiments/bdl-007/stage.ts`:

```ts
/**
 * The Shining Tree stage: scene, loop, interaction, dispose.
 * Loaded dynamically by Experiment.astro so three.js stays a
 * page-specific chunk. Spec: docs/superpowers/specs/
 * 2026-08-18-bdl-007-shining-tree-design.md
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { createFlies, stepFlies, scatter, type Vec3 } from './fireflies';

const MODEL_URL = '/models/bdlOrganic.draco.glb';
const DRACO_PATH = '/draco/';
const LIVING = /moss|canopy|lichen/i;   // verified material names in the glb
const IDLE_YAW = (Math.PI * 2) / 30;    // one rotation per 30s
const GATHER_AFTER_MS = 8000;
const FLY_COUNT = 40;
const FLY_BOUNDS = 1.9;
const PULSE_MID = 0.18;
const PULSE_AMP = 0.15;
const PULSE_PERIOD = 9;                 // seconds
const TILT_LIMIT = (35 * Math.PI) / 180;
const ZOOM_MIN = 0.8;
const ZOOM_MAX = 1.8;

export function mountStage(
  canvas: HTMLCanvasElement,
  opts: { onReady?: () => void } = {},
): () => void {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  const BASE_DIST = 5;
  camera.position.set(0, 0.4, BASE_DIST);

  // Lighting: warm raking key, cool rim, ambient floor.
  const key = new THREE.DirectionalLight(0xffe2bb, 2.6);
  key.position.set(2, 1.1, 2);
  const rim = new THREE.DirectionalLight(0xa9c8ff, 1.5);
  rim.position.set(-1.6, 2.4, -2.4);
  const floor = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(key, rim, floor);

  // Pedestal without geometry: a radial-gradient blob under the model.
  const blobCanvas = document.createElement('canvas');
  blobCanvas.width = blobCanvas.height = 256;
  const bctx = blobCanvas.getContext('2d')!;
  const grad = bctx.createRadialGradient(128, 128, 8, 128, 128, 126);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  bctx.fillStyle = grad;
  bctx.fillRect(0, 0, 256, 256);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 3.4),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(blobCanvas),
      transparent: true,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.25;
  scene.add(shadow);

  // The model turns inside this group; drag and idle yaw drive the group.
  const rig = new THREE.Group();
  scene.add(rig);

  // Fireflies: one Points buffer, soft additive dot sprite.
  const dotCanvas = document.createElement('canvas');
  dotCanvas.width = dotCanvas.height = 64;
  const dctx = dotCanvas.getContext('2d')!;
  const dot = dctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  dot.addColorStop(0, 'rgba(232,244,180,1)');
  dot.addColorStop(0.4, 'rgba(216,232,160,0.55)');
  dot.addColorStop(1, 'rgba(216,232,160,0)');
  dctx.fillStyle = dot;
  dctx.fillRect(0, 0, 64, 64);
  const flies = createFlies(FLY_COUNT, FLY_BOUNDS, 20260818);
  const flyGeo = new THREE.BufferGeometry();
  const flyPositions = new Float32Array(FLY_COUNT * 3);
  flyGeo.setAttribute('position', new THREE.BufferAttribute(flyPositions, 3));
  const flyMat = new THREE.PointsMaterial({
    size: 0.055,
    map: new THREE.CanvasTexture(dotCanvas),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const flyPoints = new THREE.Points(flyGeo, flyMat);
  scene.add(flyPoints);
  const syncFlies = () => {
    for (let i = 0; i < FLY_COUNT; i++) {
      flyPositions[i * 3] = flies[i].pos[0];
      flyPositions[i * 3 + 1] = flies[i].pos[1];
      flyPositions[i * 3 + 2] = flies[i].pos[2];
    }
    flyGeo.attributes.position.needsUpdate = true;
  };
  syncFlies();

  // ---- state ----
  const livingMats: THREE.MeshStandardMaterial[] = [];
  let gatherTargets: Vec3[] = [];
  let yaw = 0, pitch = 0, zoom = 1;
  let yawVel = 0, pitchVel = 0;
  let dragging = false, everGrabbed = false;
  let lastX = 0, lastY = 0;
  let lastInteraction = performance.now();
  let pinchDist = 0;
  const pointers = new Map<number, { x: number; y: number }>();
  let resetting = false;
  let running = true, inView = true, disposed = false;
  let raf = 0;

  // ---- model ----
  const draco = new DRACOLoader();
  draco.setDecoderPath(DRACO_PATH);
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);
  loader.load(MODEL_URL, (gltf) => {
    if (disposed) return;
    const model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = 2.2 / Math.max(size.x, size.y, size.z);
    model.position.sub(center).multiplyScalar(scale);
    model.scale.setScalar(scale);
    rig.add(model);

    // Living materials breathe; their vertices seed the gather points.
    const verts: Vec3[] = [];
    model.updateMatrixWorld(true);
    model.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      const living = mats.some((m) => LIVING.test(m.name ?? ''));
      if (!living) return;
      for (const m of mats) {
        if (m instanceof THREE.MeshStandardMaterial && LIVING.test(m.name ?? '')) {
          m.emissive = new THREE.Color('#a3bd8f');
          m.emissiveIntensity = PULSE_MID;
          livingMats.push(m);
        }
      }
      const pos = obj.geometry.getAttribute('position');
      const stride = Math.max(1, Math.floor(pos.count / 8));
      const v = new THREE.Vector3();
      for (let i = 0; i < pos.count; i += stride) {
        v.fromBufferAttribute(pos, i).applyMatrix4(obj.matrixWorld);
        verts.push([v.x, v.y, v.z]);
      }
    });
    gatherTargets = verts;
    opts.onReady?.();
  });

  // ---- interaction ----
  const el = canvas;
  const markInteraction = () => {
    lastInteraction = performance.now();
    if (!reduceMotion) scatter(flies, 0.8, (performance.now() | 0) % 100000);
  };
  const onPointerDown = (e: PointerEvent) => {
    el.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      dragging = true;
      everGrabbed = true;
      resetting = false;
      lastX = e.clientX;
      lastY = e.clientY;
      markInteraction();
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      dragging = false;
    }
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDist > 0) {
        zoom = THREE.MathUtils.clamp(zoom * (d / pinchDist), ZOOM_MIN, ZOOM_MAX);
      }
      pinchDist = d;
      lastInteraction = performance.now();
      return;
    }
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    yawVel = dx * 0.005;
    pitchVel = dy * 0.004;
    yaw += yawVel;
    pitch = THREE.MathUtils.clamp(pitch + pitchVel, -TILT_LIMIT, TILT_LIMIT);
    lastInteraction = performance.now();
  };
  const onPointerUp = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchDist = 0;
    if (pointers.size === 0) dragging = false;
  };
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    zoom = THREE.MathUtils.clamp(zoom * (e.deltaY < 0 ? 1.07 : 0.93), ZOOM_MIN, ZOOM_MAX);
    lastInteraction = performance.now();
  };
  const onDblClick = () => {
    resetting = true;
    markInteraction();
  };
  el.addEventListener('pointerdown', onPointerDown);
  el.addEventListener('pointermove', onPointerMove);
  el.addEventListener('pointerup', onPointerUp);
  el.addEventListener('pointercancel', onPointerUp);
  el.addEventListener('wheel', onWheel, { passive: false });
  el.addEventListener('dblclick', onDblClick);

  // ---- pause when unseen ----
  const onVisibility = () => { running = !document.hidden && inView; };
  document.addEventListener('visibilitychange', onVisibility);
  const io = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    running = !document.hidden && inView;
  });
  io.observe(canvas);

  // ---- resize ----
  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  // ---- loop ----
  let prev = performance.now();
  const tick = () => {
    if (disposed) return;
    raf = requestAnimationFrame(tick);
    if (!running) { prev = performance.now(); return; }
    const now = performance.now();
    const dt = Math.min((now - prev) / 1000, 1 / 20);
    prev = now;
    const t = now / 1000;

    // idle yaw until first grab (autonomous: off under reduced motion)
    if (!everGrabbed && !reduceMotion) yaw += IDLE_YAW * dt;

    // momentum after release, exponentially damped
    if (!dragging && (Math.abs(yawVel) > 1e-4 || Math.abs(pitchVel) > 1e-4)) {
      yaw += yawVel;
      pitch = THREE.MathUtils.clamp(pitch + pitchVel, -TILT_LIMIT, TILT_LIMIT);
      const damp = Math.exp(-2.2 * dt);
      yawVel *= damp;
      pitchVel *= damp;
    }

    // double-tap reset: ease home, then hand control back
    if (resetting) {
      const k = 1 - Math.exp(-4 * dt);
      yaw += (0 - (yaw % (Math.PI * 2))) * k;
      pitch += (0 - pitch) * k;
      zoom += (1 - zoom) * k;
      yawVel = 0; pitchVel = 0;
      if (Math.abs(yaw % (Math.PI * 2)) < 0.01 && Math.abs(pitch) < 0.01 && Math.abs(zoom - 1) < 0.01) {
        resetting = false;
      }
    }

    rig.rotation.set(pitch, yaw, 0);
    camera.position.z = BASE_DIST / zoom;

    // moss breath (held at mid under reduced motion)
    const pulse = reduceMotion
      ? PULSE_MID
      : PULSE_MID + PULSE_AMP * Math.sin((t * Math.PI * 2) / PULSE_PERIOD);
    for (const m of livingMats) m.emissiveIntensity = pulse;

    // fireflies (static constellation under reduced motion)
    if (!reduceMotion) {
      const idle = now - lastInteraction > GATHER_AFTER_MS;
      stepFlies(flies, {
        mode: idle && gatherTargets.length > 0 ? 'gather' : 'wander',
        dt,
        time: t,
        targets: gatherTargets,
        bounds: FLY_BOUNDS,
      });
      syncFlies();
    }

    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(tick);

  // ---- dispose ----
  return () => {
    disposed = true;
    cancelAnimationFrame(raf);
    io.disconnect();
    ro.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    el.removeEventListener('pointerdown', onPointerDown);
    el.removeEventListener('pointermove', onPointerMove);
    el.removeEventListener('pointerup', onPointerUp);
    el.removeEventListener('pointercancel', onPointerUp);
    el.removeEventListener('wheel', onWheel);
    el.removeEventListener('dblclick', onDblClick);
    draco.dispose();
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
        obj.geometry.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) m.dispose();
      }
    });
    renderer.dispose();
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx astro check`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/experiments/bdl-007/stage.ts
git commit -m "feat(lab): BDL-007 stage — scene, weighted drag, moss breath, fireflies"
```

---

### Task 4: Shell, registry, specimen entry

**Files:**
- Create: `src/experiments/bdl-007/Experiment.astro`
- Modify: `src/experiments/registry.ts` (add one import + one map entry)
- Create: `src/content/lab/bdl-007.md`

**Interfaces:**
- Consumes: `mountStage(canvas, { onReady })` from `./stage` (Task 3); `still.png` (Task 1).
- Produces: the `/lab/bdl-007` page via the existing `[slug].astro` machinery (no changes there).

- [ ] **Step 1: Write the shell**

Create `src/experiments/bdl-007/Experiment.astro`:

```astro
---
/**
 * The Shining Tree shell. Renders the committed still from first paint;
 * three.js and the model arrive only when the stage scrolls into view.
 * The C&C break-screen rule, reused: nothing the visitor sees may depend
 * on code that might not arrive.
 */
import still from './still.png';
import { Image } from 'astro:assets';
---
<div class="stage" data-stage>
  <Image src={still} alt="" class="still" widths={[768, 1200]} sizes="100vw" loading="eager" />
  <canvas class="scene" aria-label="The organic Birch Design Lab wordmark in three dimensions. Drag to turn it."></canvas>
  <p class="veil smallcaps" data-veil>Waking the grove</p>
  <p class="no-webgl" data-no-webgl hidden>This specimen needs WebGL; here it is at rest.</p>
</div>

<script>
  const stage = document.querySelector<HTMLElement>('[data-stage]')!;
  const canvas = stage.querySelector<HTMLCanvasElement>('canvas.scene')!;
  const veil = stage.querySelector<HTMLElement>('[data-veil]')!;
  let dispose: (() => void) | undefined;

  const probe = document.createElement('canvas');
  const hasWebGL = !!(probe.getContext('webgl2') ?? probe.getContext('webgl'));

  if (!hasWebGL) {
    veil.hidden = true;
    stage.querySelector<HTMLElement>('[data-no-webgl]')!.hidden = false;
  } else {
    const io = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      const { mountStage } = await import('./stage');
      dispose = mountStage(canvas, {
        onReady: () => stage.classList.add('is-live'),
      });
    });
    io.observe(stage);
  }

  document.addEventListener('astro:before-swap', () => dispose?.(), { once: true });
</script>

<style>
  .stage {
    position: relative;
    height: min(88vh, 900px);
    background: var(--field);
    overflow: hidden;
  }
  .still, .scene {
    position: absolute; inset: 0;
    width: 100%; height: 100%;
  }
  .still { object-fit: contain; padding: 8%; opacity: 0.45; transition: opacity var(--dur-2) var(--ease-weighted); }
  .scene { opacity: 0; transition: opacity var(--dur-2) var(--ease-weighted); touch-action: none; }
  .stage.is-live .still { opacity: 0; }
  .stage.is-live .scene { opacity: 1; }
  .veil {
    position: absolute; left: 50%; bottom: var(--space-4);
    transform: translateX(-50%);
    color: var(--mark-muted); letter-spacing: var(--tracking-wide);
    transition: opacity var(--dur-2) var(--ease-weighted);
  }
  .stage.is-live .veil { opacity: 0; }
  .no-webgl {
    position: absolute; left: 50%; bottom: var(--space-4);
    transform: translateX(-50%);
    color: var(--mark-muted);
  }
</style>
```

- [ ] **Step 2: Register it**

In `src/experiments/registry.ts`, add below the BDL-006 import:

```ts
import BDL007 from './bdl-007/Experiment.astro';
```

and in the map, below the `'BDL-006': BDL006,` line:

```ts
  'BDL-007': BDL007,
```

- [ ] **Step 3: Write the specimen entry**

Create `src/content/lab/bdl-007.md`:

```markdown
---
designation: BDL-007
type: experiment
title: The Shining Tree
summary: 'The organic wordmark, alive on its pedestal: birch and moss in three dimensions, breathing, with company.'
date: 2026-08-18
tech: [three, webgl]
status: live
device: universal
howto:
  - Drag to turn. Flick to spin.
  - Pinch or scroll to lean in.
  - Be still a moment; watch the moss.
  - Double-tap to reset.
---

The organic 3D wordmark began as the centerpiece of a client break screen,
compressed from a 12MB export to 3MB and judged by eye against the
original. This is its stage at home. The moss breathes on a nine second
cycle. Leave it alone for eight and the fireflies stop wandering and
gather to it; grab it and they scatter. The idle turn stops the first
time you take hold, because after that the object is yours.

The steering behind the flies is forty independent particles, each with
its own noise phase, seeking sampled points on the moss itself. No
flocking, no physics engine, no animation library: a render loop, some
sines, and a data model that made anything heavier unnecessary.
```

- [ ] **Step 4: Verify everything**

Run: `npx vitest run && npx astro check && npm run build`
Expected: tests pass (pre-existing brand-cream failure only), 0 type errors, build `Complete!`.

- [ ] **Step 5: Commit**

```bash
git add src/experiments/bdl-007 src/experiments/registry.ts src/content/lab/bdl-007.md
git commit -m "feat(lab): BDL-007 The Shining Tree — shell, registry, specimen entry"
```

---

### Task 5: Browser verification and PR

**Files:** none (verification only)

- [ ] **Step 1: Run the dev server and open the page**

Start the `dev-alt` preview (port 4399) and open `/lab/bdl-007`.

- [ ] **Step 2: Verify against this checklist**

- Still visible immediately, crossfades to the live canvas after load
- Idle yaw ~30s/rotation; first drag stops it permanently
- Flick coasts and damps; vertical tilt clamps; wheel and pinch zoom clamp
- Double-click eases back to front pose
- Moss visibly breathes on a ~9s cycle
- After 8s untouched, fireflies drift to the moss; a grab scatters them
- DevTools > Rendering > emulate `prefers-reduced-motion`: reload; no idle yaw, static flies, drag still works
- Mobile viewport (390px): touch drag and pinch work, layout holds
- Console: no errors; network: three chunk + glb load only after scrolling the stage into view

- [ ] **Step 3: Open the PR**

```bash
git push -u origin feat/bdl-007-shining-tree
gh pr create --title "feat(lab): BDL-007 The Shining Tree" --body "Interactive three.js stage for the organic 3D wordmark, per the approved spec (docs/superpowers/specs/2026-08-18-bdl-007-shining-tree-design.md). Breathing moss, gathering fireflies, weighted drag, still-first loading, narrow reduced-motion honor."
```

---

## Self-Review Notes

- Spec coverage: files/wiring (T1, T4), scene incl. 30s yaw (T3), interaction incl. reset and clamps (T3), moss + fireflies (T2, T3), reduced motion narrow (T3 `reduceMotion` branches), loading/fallback/perf (T4 shell + T3 pause/dispose), testing (T2 vitest, T5 browser), wall label 4 lines (T4).
- Material names in the plan match the glb inspection: `canopy`, `moss-star`, `lichen-crust` all match `/moss|canopy|lichen/i`; `stone`, `peel-outside`, `peel-underside` do not.
- Signatures consistent: `mountStage(canvas, { onReady })` produced in T3, consumed in T4; fireflies API produced in T2, consumed in T3.
