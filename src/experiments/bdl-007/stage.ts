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
import canopyBump from './canopy-bump.webp';
import stoneBump from './stone-bump.webp';

const MODEL_URL = '/models/bdlOrganic.draco.glb';
const DRACO_PATH = '/draco/';
const LIVING = /moss|canopy|lichen/i;   // verified material names in the glb
const IDLE_YAW = (Math.PI * 2) / 60;    // one rotation per 60s
const GATHER_AFTER_MS = 20000;
const FLY_COUNT = 40;
const FLY_BOUNDS = 1.9;
const PULSE_MID = 0.07;
const PULSE_AMP = 0.05;
/**
 * Scale companion to the brightness pulse, applied only to the instanced
 * moss/lichen (see PULSE_SCALE_UNIFORM below) so the breath reads as size
 * as well as light. 0.25 (25%) is the shipped value, tuned by eye on the
 * real page: the lower range that would read as "breathing" on paper (a
 * few percent) was not visible at this model's scale and viewing distance
 * on the actual stage, so the owner dialed it up until the pulse read
 * clearly. Do not "correct" this back down without re-tuning live against
 * the real page — a small value here reads as no motion at all.
 */
const PULSE_SCALE_AMP = 0.25;
/**
 * Bump strength. The Draco pass drops the two bump images along with the
 * vendor extension (EXT_materials_bump) that pointed at them — three's
 * GLTFLoader ignores that extension entirely, so the images are shipped as
 * plain textures and wired to bumpMap by hand in the traverse below.
 *
 * The per-material factors (0.02 canopy, 0.005 stone) are the values
 * authored in EXT_materials_bump, extracted from the uncompressed export.
 * three's bumpScale is not the same unit as that vendor factor, so these
 * are carried through as a shared multiplier rather than assumed correct:
 * if the relief reads as flat, raise BUMP_SCALE_MULTIPLIER first (try
 * 10-40) before touching the per-material ratio between canopy and stone.
 */
const BUMP_SCALE_MULTIPLIER = 1;
const CANOPY_BUMP_FACTOR = 0.02 * BUMP_SCALE_MULTIPLIER;
const STONE_BUMP_FACTOR = 0.005 * BUMP_SCALE_MULTIPLIER;
/**
 * moss-star and lichen-crust ship with no baseColorTexture and no
 * baseColorFactor, so they load pure white and every bit of their colour
 * has to come from somewhere. Giving them a real albedo lets the emissive
 * go back to being a breath rather than the entire surface.
 *
 * These are brand tokens, and that is not a guess. The smaller exports from
 * the same design tool (assets/brand/logos/3d/dark-bdl-cascade.glb) DO carry
 * baseColorFactor, and converting those from glTF's linear space to sRGB
 * returns tokens.css values exactly: stone #a89f8f, leather #4a3a2c. The
 * tool authors materials from the palette. The big model's moss reads white
 * only because its colour lived in the staging code rather than the mesh.
 */
const MOSS_ALBEDO = '#a3bd8f';    /* --green-moss */
const LICHEN_ALBEDO = '#a89f8f';  /* --stone-warm */
const PULSE_PERIOD = 20;                // seconds
const TILT_LIMIT = (35 * Math.PI) / 180;
const ZOOM_MIN = 0.8;
const ZOOM_MAX = 1.8;

/**
 * Signed offset from `angle` to the nearest multiple of a full turn,
 * in (-PI, PI]. Used for shortest-arc easing back to yaw 0 so a
 * double-click reset never reverses through the long way round.
 */
function shortestTurnOffset(angle: number): number {
  const twoPi = Math.PI * 2;
  return angle - twoPi * Math.round(angle / twoPi);
}

export function mountStage(
  canvas: HTMLCanvasElement,
  opts: { onReady?: () => void; onError?: (err: unknown) => void } = {},
): () => void {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  // Without this the key and rim sum well past 1.0 on lit faces and clip to
  // flat white. ACES rolls the highlights off instead, so the lights below
  // are tuned lower than they would be for a linear response.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  const BASE_DIST = 5;
  camera.position.set(0, 0.4, BASE_DIST);

  // Aspect-aware framing. The mark is scaled to a fixed size, but how much of
  // the frame it fills depends on the viewport: a tall phone has a narrow
  // horizontal field of view, so a distance tuned for a wide desktop leaves
  // the mark small and adrift near the bottom. Fit the front silhouette to
  // whichever axis is tighter, recomputed on resize, and look at the centre
  // so the mark stays put instead of drifting low the taller the screen gets.
  const FIT_FILL = 0.74;   // fraction of the tighter axis the mark fills; the
                           // rest is air so nothing clips the top on a short
                           // landscape window or hides behind the plate bar
  const FRAME_LIFT = 0.12; // gentle downward tilt, proportional to mark height
  const FRAME_RISE = 0.05; // aim just below centre so the mark clears the
                           // fixed plate bar without riding the top edge
  let fitDist = BASE_DIST;
  const markHalf = { w: 1.1, h: 1.1 };
  const frameCamera = () => {
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    const distV = markHalf.h / FIT_FILL / Math.tan(vFov / 2);
    const distH = markHalf.w / FIT_FILL / Math.tan(hFov / 2);
    // max() so both axes fit: the tighter one fills FIT_FILL, the looser one
    // keeps extra air. A little depth pokes out of the silhouette as it turns,
    // and the 18% margin absorbs it.
    fitDist = Math.max(distV, distH);
  };

  // Lighting: warm raking key, cool rim, ambient floor. The tints are held
  // close to neutral on purpose. These surfaces are rough (0.94 on canopy,
  // 0.96 on moss), so the diffuse lobe is broad and a strongly warm key
  // meeting a strongly cool rim fringes across the whole form rather than
  // reading as two lights. Most of the shaping is intensity, not hue.
  const key = new THREE.DirectionalLight(0xfff0dd, 1.9);
  key.position.set(2, 1.1, 2);
  const rim = new THREE.DirectionalLight(0xdde6f5, 0.75);
  rim.position.set(-1.6, 2.4, -2.4);
  const floor = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(key, rim, floor);

  // No ground shadow. The scene is a night field of stars and fireflies, so
  // the mark reads as floating; a fixed pedestal plane both implied a floor
  // that isn't there and, once the camera distance became aspect-aware, drew
  // at wildly different sizes across viewports (a hard blob on desktop, a
  // smear when framed close). Removed rather than patched.

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
  // The position buffer is rewritten every frame but three only computes
  // the Points bounding sphere once, lazily, from the buffer at creation
  // time (all zeros) and never recomputes it — leave frustum culling off
  // so the flock can't be clipped against a stale sphere.
  flyPoints.frustumCulled = false;
  // Parented to rig (not scene) so the constellation rotates with the tree;
  // gather targets below are sampled in this same rig-local frame.
  rig.add(flyPoints);
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
  // Uniform objects injected into moss/lichen shaders (see onBeforeCompile
  // below), kept here so the render loop can write to them every frame.
  // onBeforeCompile only runs once at shader compile time, so the uniform
  // itself must be created and stored up front, not re-created per frame.
  const breathUniforms: { value: number }[] = [];
  // A GLTF material can be shared across several mesh nodes (moss-star and
  // lichen-crust are each split across 10 nodes); guard against wiring
  // onBeforeCompile onto the same material object more than once.
  const breathWired = new Set<THREE.Material>();
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

  // Bump maps for canopy and stone, shipped as standalone textures because
  // the Draco pass drops the images that carried them (see BUMP_SCALE
  // comment above). Configured to match how GLTFLoader sets up the model's
  // own baseColorTextures: flipY off (glTF images are not flipped; three's
  // TextureLoader defaults to flipY = true, which would mirror the relief
  // vertically), REPEAT wrap on both axes (every sampler in the source glb
  // uses REPEAT), and no colorSpace conversion — bump data is not color, so
  // it must stay linear/raw rather than being treated as sRGB.
  const textureLoader = new THREE.TextureLoader();
  const configureBumpTexture = (texture: THREE.Texture) => {
    texture.flipY = false;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;
    return texture;
  };
  const canopyBumpTexture = configureBumpTexture(textureLoader.load(canopyBump.src));
  const stoneBumpTexture = configureBumpTexture(textureLoader.load(stoneBump.src));

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

    // Real silhouette half-extents now that the scale is known, so the camera
    // frames the actual mark rather than the 1.1 placeholder.
    markHalf.w = (size.x * scale) / 2;
    markHalf.h = (size.y * scale) / 2;
    frameCamera();

    // Living materials breathe; their vertices seed the gather points.
    // Sampled in rig-local space (rig's own transform backed out), not
    // world space: the render loop has been writing rig.rotation since
    // mount, so world-space matrices would bake in whatever yaw the rig
    // held at this exact moment. flyPoints is parented to rig, so its
    // gather targets must live in that same rig-local frame to stay put
    // as the rig keeps turning.
    const verts: Vec3[] = [];
    rig.updateMatrixWorld(true);
    const rigWorldInverse = new THREE.Matrix4().copy(rig.matrixWorld).invert();
    const localMatrix = new THREE.Matrix4();
    const instMat = new THREE.Matrix4();
    model.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) {
        // Matched by material name first, narrowed by class second: the
        // glb's current export happens to put KHR_materials_clearcoat on
        // stone (MeshPhysicalMaterial), but bumpMap/bumpScale live on the
        // shared MeshStandardMaterial base. Matching on
        // MeshPhysicalMaterial specifically would silently drop stone's
        // bump the moment a re-export loses clearcoat and it comes back
        // as a plain MeshStandardMaterial.
        if (m.name === 'canopy' && m instanceof THREE.MeshStandardMaterial) {
          m.bumpMap = canopyBumpTexture;
          m.bumpScale = CANOPY_BUMP_FACTOR;
          m.needsUpdate = true;
        } else if (m.name === 'stone' && m instanceof THREE.MeshStandardMaterial) {
          m.bumpMap = stoneBumpTexture;
          m.bumpScale = STONE_BUMP_FACTOR;
          m.needsUpdate = true;
        }
      }
      const living = mats.some((m) => LIVING.test(m.name ?? ''));
      if (!living) return;
      for (const m of mats) {
        if (m instanceof THREE.MeshStandardMaterial && LIVING.test(m.name ?? '')) {
          // canopy carries its own baseColorTexture; tinting it would stain
          // the bark. Only the untextured moss and lichen need an albedo.
          if (!m.map) {
            m.color = new THREE.Color(
              /lichen/i.test(m.name) ? LICHEN_ALBEDO : MOSS_ALBEDO,
            );
          }
          m.emissive = new THREE.Color('#a3bd8f');
          m.emissiveIntensity = PULSE_MID;
          livingMats.push(m);

          // Scale pulse, moss/lichen only (not canopy — see module doc).
          // Both are GPU-instanced, so scaling per-vertex in the shader
          // BEFORE instanceMatrix is applied (three inserts that multiply
          // right after <begin_vertex>) grows/shrinks each star about its
          // own local origin. Scaling the InstancedMesh object itself, or
          // its node, would instead scale the whole cluster away from the
          // node pivot — every star drifting off the bark surface.
          if (/moss|lichen/i.test(m.name) && !breathWired.has(m)) {
            breathWired.add(m);
            const breath = { value: 1 };
            m.onBeforeCompile = (shader: THREE.WebGLProgramParametersWithUniforms) => {
              shader.uniforms.uBreath = breath;
              // three auto-declares its own built-in uniforms and nothing
              // else, so a uniform added from here has to be declared in
              // the GLSL by hand. Binding the value without the declaration
              // fails to compile, and nothing on the JS side says so.
              shader.vertexShader = `uniform float uBreath;
${shader.vertexShader}`;
              shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                '#include <begin_vertex>\n\ttransformed *= uBreath;',
              );
            };
            // Without this, three's shader cache can hand this material's
            // program to (or take a program from) an otherwise-identical
            // moss/lichen material that never got onBeforeCompile wired up,
            // silently dropping or duplicating the uBreath injection.
            // Per material, not a shared constant. three caches compiled
            // programs by this key, so moss and lichen returning the same
            // string lets it compile once and hand that one program to
            // both. Only the first material's onBeforeCompile runs, so the
            // other draws with a program whose uBreath was never bound to
            // its uniform object, and it sits still while its twin breathes.
            const cacheKey = `bdl007-breath-scale:${m.name}`;
            m.customProgramCacheKey = () => cacheKey;
            breathUniforms.push(breath);
          }
        }
      }
      localMatrix.multiplyMatrices(rigWorldInverse, obj.matrixWorld);
      const v = new THREE.Vector3();
      // GLTF's EXT_mesh_gpu_instancing nodes load as InstancedMesh: moss
      // and lichen are placed per-instance via instanceMatrix, not by the
      // node transform, so the base geometry (read below for non-instanced
      // meshes like canopy) sits at the node pivot — the geometric centre
      // of the letterform, not a real surface point. Sample real instance
      // origins instead, thinned to ~12 per node so 40 flies spread across
      // the roughly 100-150 resulting targets instead of stacking on a
      // handful of node pivots.
      if ((obj as THREE.InstancedMesh).isInstancedMesh) {
        const im = obj as THREE.InstancedMesh;
        const step = Math.max(1, Math.floor(im.count / 12));
        for (let i = 0; i < im.count; i += step) {
          im.getMatrixAt(i, instMat);
          v.setFromMatrixPosition(instMat).applyMatrix4(localMatrix);
          verts.push([v.x, v.y, v.z]);
        }
        return;
      }
      const pos = obj.geometry.getAttribute('position');
      const stride = Math.max(1, Math.floor(pos.count / 8));
      for (let i = 0; i < pos.count; i += stride) {
        v.fromBufferAttribute(pos, i).applyMatrix4(localMatrix);
        verts.push([v.x, v.y, v.z]);
      }
    });
    gatherTargets = verts;
    opts.onReady?.();
  }, undefined, (err) => {
    if (disposed) return;
    console.error('[bdl-007] failed to load stage model', err);
    opts.onError?.(err);
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
    const dYaw = dx * 0.005;
    const dPitch = dy * 0.004;
    yaw += dYaw;
    pitch = THREE.MathUtils.clamp(pitch + dPitch, -TILT_LIMIT, TILT_LIMIT);
    // Store as a per-second velocity (reference cadence: 60Hz pointermove)
    // so the momentum coast below can scale it by dt and stay frame-rate
    // independent while feeling identical to the original 60Hz behavior.
    yawVel = dYaw * 60;
    pitchVel = dPitch * 60;
    lastInteraction = performance.now();
  };
  const releasePointer = (pointerId: number) => {
    pointers.delete(pointerId);
    if (pointers.size < 2) pinchDist = 0;
    if (pointers.size === 1) {
      // Lifting one finger out of a pinch: re-arm dragging from the
      // surviving pointer instead of waiting for a fresh pointerdown.
      const [remaining] = pointers.values();
      dragging = true;
      lastX = remaining.x;
      lastY = remaining.y;
    } else if (pointers.size === 0) {
      dragging = false;
    }
  };
  const onPointerUp = (e: PointerEvent) => releasePointer(e.pointerId);
  const onLostPointerCapture = (e: PointerEvent) => releasePointer(e.pointerId);
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
  el.addEventListener('lostpointercapture', onLostPointerCapture);
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
    frameCamera();
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
      yaw += yawVel * dt;
      pitch = THREE.MathUtils.clamp(pitch + pitchVel * dt, -TILT_LIMIT, TILT_LIMIT);
      const damp = Math.exp(-2.2 * dt);
      yawVel *= damp;
      pitchVel *= damp;
    }

    // double-tap reset: ease home, then hand control back
    if (resetting) {
      const k = 1 - Math.exp(-4 * dt);
      const yawOffset = shortestTurnOffset(yaw);
      yaw += (0 - yawOffset) * k;
      pitch += (0 - pitch) * k;
      zoom += (1 - zoom) * k;
      yawVel = 0; pitchVel = 0;
      if (Math.abs(shortestTurnOffset(yaw)) < 0.01 && Math.abs(pitch) < 0.01 && Math.abs(zoom - 1) < 0.01) {
        resetting = false;
      }
    }

    rig.rotation.set(pitch, yaw, 0);
    // Aspect-aware distance, a small proportional lift, and a look at the
    // centre so the mark stays framed and centred on any viewport instead of
    // sitting low on tall phones. zoom rides on top as a multiplier.
    camera.position.set(0, markHalf.h * FRAME_LIFT, fitDist / zoom);
    // Aim a little below the mark's centre so it rides slightly high in the
    // frame rather than reading as low, which it did on tall phones.
    camera.lookAt(0, -markHalf.h * FRAME_RISE, 0);

    // moss breath (held at mid under reduced motion)
    const phase = (t * Math.PI * 2) / PULSE_PERIOD;
    const pulse = reduceMotion ? PULSE_MID : PULSE_MID + PULSE_AMP * Math.sin(phase);
    for (const m of livingMats) m.emissiveIntensity = pulse;
    // Same phase as the brightness pulse so size and light breathe together.
    // Reduced motion holds this at exactly 1.0 (no scale) — autonomous
    // motion must fully stop, matching the emissive branch above.
    const scale = reduceMotion ? 1 : 1 + PULSE_SCALE_AMP * Math.sin(phase);
    for (const u of breathUniforms) u.value = scale;

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

  // ---- WebGL context loss ----
  // A GPU reset or a laptop waking from sleep can invalidate the context.
  // Without this, the rAF loop keeps calling renderer.render() against a
  // dead context and floods the console. preventDefault() on the loss
  // event tells the browser we intend to handle it (and may restore it)
  // rather than leaving the canvas permanently blank.
  const onContextLost = (e: Event) => {
    e.preventDefault();
    running = false;
    cancelAnimationFrame(raf);
  };
  const onContextRestored = () => {
    if (disposed) return;
    // three.js re-creates GPU resources for objects still referenced by
    // the scene graph on the next render call, so simply resuming the
    // loop is sufficient here. If that ever proves unreliable, fall back
    // to leaving the stage stopped (the static fallback) instead of
    // resuming a half-restored renderer.
    running = !document.hidden && inView;
    prev = performance.now();
    raf = requestAnimationFrame(tick);
  };
  canvas.addEventListener('webglcontextlost', onContextLost, false);
  canvas.addEventListener('webglcontextrestored', onContextRestored, false);

  // ---- dispose ----
  const disposeMaterial = (m: THREE.Material) => {
    // material.dispose() drops GPU program state but not texture-valued
    // properties (map, emissiveMap, normalMap, etc.) — those are separate
    // GPU resources that leak on unmount unless disposed explicitly.
    const props = m as unknown as Record<string, unknown>;
    for (const key of Object.keys(props)) {
      const value = props[key];
      if (value instanceof THREE.Texture) value.dispose();
    }
    m.dispose();
  };
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
    el.removeEventListener('lostpointercapture', onLostPointerCapture);
    el.removeEventListener('wheel', onWheel);
    el.removeEventListener('dblclick', onDblClick);
    canvas.removeEventListener('webglcontextlost', onContextLost, false);
    canvas.removeEventListener('webglcontextrestored', onContextRestored, false);
    draco.dispose();
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
        obj.geometry.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) disposeMaterial(m);
        // InstancedMesh (moss/lichen, 20 nodes total) holds its
        // instanceMatrix as a separate GPU buffer that geometry.dispose()
        // does not touch; without this the buffer leaks on every unmount.
        if (obj instanceof THREE.InstancedMesh) obj.dispose();
      }
    });
    // Attached to a material inside the load success callback (see
    // loader.load above). If the load errored, or `disposed` was already
    // true when it resolved, neither texture was ever assigned to a
    // material, so the traverse above never reaches them — dispose both
    // explicitly here. Texture.dispose() is safe to call more than once
    // (it just re-dispatches its 'dispose' event), so no guard is needed
    // against the case where they *were* attached and already disposed
    // above.
    canopyBumpTexture.dispose();
    stoneBumpTexture.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  };
}
