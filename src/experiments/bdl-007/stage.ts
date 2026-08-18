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
