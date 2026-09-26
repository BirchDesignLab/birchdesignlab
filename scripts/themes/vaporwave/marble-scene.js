/**
 * The scene behind vaporwave's marble stills: procedural polished marble in
 * pastel tints, iridescent chrome accents, a tinted studio environment, pink
 * and cyan rim light and a soft contact shadow, rendered to a transparent
 * PNG. Loaded by marble-scene.html; driven by render-marble.mjs.
 *
 * Written 09-25-26 for Tier 3 stage 3 (Tier A proofs). The founder approved
 * rendered marble, pristine, tinted and glossy, after supyrb's Vapordays and
 * Marbloid (stage3-decisions.md, Answers item 6). With no bust mesh yet the
 * props are stand-ins that prove the material and the light: a marble
 * sphere on a chrome ring, a fluted column with a capital on a stepped
 * plinth, and a faceted holographic form on a marble drum. When the CC0 mesh
 * is approved it goes in as another prop ('bust') and reuses marbleMaterial.
 *
 * The marble is MeshPhysicalMaterial (clearcoat, low roughness) with the
 * veining written into its shader through onBeforeCompile: world-space fbm
 * warps a banded sine into thin primary veins, a second finer set breaks in
 * and out, and a cloudy two-tone base sits under both. Veins are a touch
 * rougher than the stone, as in polished marble. No textures, so any prop
 * or mesh gets continuous veining with no UVs.
 *
 * Usage (in the page, after the module loads):
 *   await window.marble.render({ prop, tint, size, yaw })  // PNG data URL
 *   window.marble.info()                                    // GPU and props
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/* ---------------------------------------------------------------- tints */

// Base, a second base for the cloudy mottle, the vein colour, vein strength.
export const MARBLE_TINTS = {
  white:    { base: '#f6f2f8', base2: '#e6def0', vein: '#8e7fb0', strength: 0.85 },
  pink:     { base: '#ffcfe6', base2: '#f7b4d6', vein: '#c2477f', strength: 0.75 },
  lavender: { base: '#ddd0ff', base2: '#c8b6f7', vein: '#6d4fc4', strength: 0.75 },
  black:    { base: '#17121f', base2: '#0c0912', vein: '#f4f0fa', strength: 0.95 },
};

// Iridescent chrome and holographic finishes (thin-film over metal).
export const CHROME_TINTS = {
  chrome:   { color: '#f2f0ff', metalness: 1.0, roughness: 0.05, film: [260, 820] },
  pearl:    { color: '#fbf6ff', metalness: 0.95, roughness: 0.1, film: [320, 1150] },
  pink:     { color: '#ffc2e4', metalness: 0.95, roughness: 0.1, film: [360, 1100] },
  lavender: { color: '#d4c2ff', metalness: 0.95, roughness: 0.1, film: [300, 1050] },
};

/* ------------------------------------------------------------- materials */

const MARBLE_NOISE = /* glsl */ `
varying vec3 vMarblePos;
uniform vec3 uBase;
uniform vec3 uBase2;
uniform vec3 uVein;
uniform float uStrength;
uniform float uSeed;
float mHash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float mNoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(mix(mix(mHash(i), mHash(i + vec3(1, 0, 0)), f.x),
                 mix(mHash(i + vec3(0, 1, 0)), mHash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(mHash(i + vec3(0, 0, 1)), mHash(i + vec3(1, 0, 1)), f.x),
                 mix(mHash(i + vec3(0, 1, 1)), mHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float mFbm(vec3 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 6; i++) {
    s += a * mNoise(p);
    p = p * 2.02 + vec3(1.7, 9.2, 3.1);
    a *= 0.5;
  }
  return s;
}
`;

function marbleMaterial(tintName, { scale = 1, seed = 0 } = {}) {
  const t = MARBLE_TINTS[tintName];
  const dark = tintName === 'black';
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: dark ? 0.18 : 0.3,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    ior: 1.55,
    specularIntensity: 1,
  });
  const uniforms = {
    uBase: { value: new THREE.Color(t.base) },
    uBase2: { value: new THREE.Color(t.base2) },
    uVein: { value: new THREE.Color(t.vein) },
    uStrength: { value: t.strength },
    uSeed: { value: seed },
    uScale: { value: scale },
  };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMarblePos;\nuniform float uScale;\nuniform float uSeed;')
      .replace('#include <begin_vertex>',
        '#include <begin_vertex>\nvMarblePos = (modelMatrix * vec4(transformed, 1.0)).xyz * uScale + vec3(uSeed * 3.1, uSeed * 1.7, uSeed * 5.3);');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + MARBLE_NOISE)
      .replace('#include <color_fragment>', /* glsl */ `
        #include <color_fragment>
        vec3 mp = vMarblePos * 0.9;
        // Primary veins: a banded sine along a slanted axis, warped hard by fbm.
        float mWarp = mFbm(mp * 1.1);
        float mT = dot(mp, normalize(vec3(0.62, 0.78, 0.35))) * 3.4 + mWarp * 5.6;
        float mS = abs(sin(mT));
        float mVein = 1.0 - smoothstep(0.0, 0.085, mS);
        mVein += 0.28 * (1.0 - smoothstep(0.0, 0.13, mS));          // soft halo
        mVein *= smoothstep(0.22, 0.58, mFbm(mp * 0.8 + 5.0)) * 0.75 + 0.25; // breaks in and out
        // Fine secondary veins.
        float mT2 = dot(mp, normalize(vec3(-0.4, 0.55, 0.73))) * 6.5 + mFbm(mp * 2.7 + 7.0) * 6.0;
        float mFine = 1.0 - smoothstep(0.0, 0.07, abs(sin(mT2)));
        mFine *= smoothstep(0.38, 0.7, mFbm(mp * 1.6 + 11.0));
        float marbleVein = clamp(mVein + mFine * 0.8, 0.0, 1.0);
        // Cloudy base.
        float mCloud = mFbm(mp * 2.1 + 3.0);
        vec3 mBase = mix(uBase, uBase2, smoothstep(0.18, 0.92, mCloud));
        diffuseColor.rgb = mix(mBase, uVein, marbleVein * uStrength);
      `)
      .replace('#include <roughnessmap_fragment>', /* glsl */ `
        #include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, min(1.0, roughnessFactor * 1.7 + 0.04), marbleVein);
      `);
  };
  mat.customProgramCacheKey = () => 'bdl-marble-v1';
  return mat;
}

function chromeMaterial(tintName, { flat = false, holo = 0 } = {}) {
  const t = CHROME_TINTS[tintName];
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(t.color),
    metalness: t.metalness,
    roughness: t.roughness,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    iridescence: 1,
    iridescenceIOR: 1.8,
    iridescenceThicknessRange: t.film,
    flatShading: flat,
  });
  if (holo > 0) {
    // Holographic foil, over-stylised on purpose: a pastel rainbow keyed to
    // the facet's angle to the eye and its height, added as emission, so
    // each flat facet catches a different hue as the form turns.
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uHolo = { value: holo };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>
varying vec3 vHoloPos;`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
vHoloPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
varying vec3 vHoloPos;
uniform float uHolo;`)
        .replace('#include <emissivemap_fragment>', `
          #include <emissivemap_fragment>
          float hF = 1.0 - abs(dot(normal, normalize(vViewPosition)));
          vec3 hRain = 0.5 + 0.5 * cos(6.28318 * (vec3(0.0, 0.33, 0.67) + hF * 1.4 + vHoloPos.y * 0.9 + dot(normal, vec3(0.3, 0.5, 0.2))));
          hRain = mix(hRain, vec3(1.0), 0.35);                 // pastel
          totalEmissiveRadiance += hRain * uHolo * (0.35 + 0.65 * hF);
        `);
    };
    mat.customProgramCacheKey = () => 'bdl-holo-v1';
  }
  return mat;
}

/* ------------------------------------------------------------ geometry */

const lathe = (pts, segs = 160) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), segs);

/** A fluted, slightly tapered shaft with entasis. Seam sits on a fillet. */
function flutedShaft({ height = 3.2, rBottom = 0.5, rTop = 0.43, flutes = 20, fillet = 0.16, depth = 0.055 }) {
  const g = new THREE.CylinderGeometry(1, 1, height, flutes * 14, 48, true);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const v = y / height + 0.5;                                   // 0 bottom, 1 top
    const R = THREE.MathUtils.lerp(rBottom, rTop, v) + 0.018 * Math.sin(Math.PI * Math.min(1, v * 1.4));
    const theta = Math.atan2(z, x);
    let local = ((theta * flutes) / (2 * Math.PI)) % 1;
    if (local < 0) local += 1;
    let r = R;
    const half = fillet / 2;
    if (local > half && local < 1 - half) {
      const u = (local - half) / (1 - fillet) * 2 - 1;            // -1..1 across the flute
      r = R - R * depth * Math.sqrt(Math.max(0, 1 - u * u)) * 2;
    }
    p.setXYZ(i, Math.cos(theta) * r, y, Math.sin(theta) * r);
  }
  g.computeVertexNormals();
  return g;
}

/* ---------------------------------------------------------------- props */

// Each prop builder returns a Group standing on y = 0.
const PROPS = {
  sphere(tint) {
    const g = new THREE.Group();
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 160, 120), marbleMaterial(tint, { scale: 1.3, seed: 2 }));
    ball.position.y = 1.07;
    ball.rotation.set(0.4, 0.8, 0.2);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.075, 48, 160), chromeMaterial('chrome'));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.075;
    g.add(ball, ring);
    return g;
  },

  column(tint) {
    // Stone pairings: the plinth is always a contrasting marble.
    const plinthTint = { white: 'black', pink: 'white', lavender: 'pink', black: 'white' }[tint];
    const stone = marbleMaterial(tint, { scale: 1.1, seed: 4 });
    const plinthStone = marbleMaterial(plinthTint, { scale: 1.4, seed: 9 });
    const g = new THREE.Group();
    let y = 0;
    for (const [w, h] of [[2.3, 0.24], [1.95, 0.22], [1.62, 0.2]]) {
      const step = new THREE.Mesh(new RoundedBoxGeometry(w, h, w, 4, 0.025), plinthStone);
      step.position.y = y + h / 2;
      g.add(step);
      y += h;
    }
    // Attic base: square block, torus, scotia, torus.
    const block = new THREE.Mesh(new RoundedBoxGeometry(1.3, 0.12, 1.3, 3, 0.015), stone);
    block.position.y = y + 0.06; y += 0.12;
    g.add(block);
    const base = new THREE.Mesh(lathe([
      [0, 0], [0.6, 0], [0.64, 0.04], [0.65, 0.08], [0.63, 0.12], [0.58, 0.14],
      [0.54, 0.16], [0.53, 0.2], [0.55, 0.23], [0.56, 0.26], [0.53, 0.29], [0.5, 0.3], [0, 0.3],
    ]), stone);
    base.position.y = y; y += 0.3;
    g.add(base);
    const H = 3.2;
    const shaft = new THREE.Mesh(flutedShaft({ height: H }), stone);
    shaft.position.y = y + H / 2; y += H;
    g.add(shaft);
    // Iridescent chrome necking ring: the accent.
    const neck = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.04, 32, 160), chromeMaterial('chrome'));
    neck.rotation.x = Math.PI / 2;
    neck.position.y = y - 0.06;
    g.add(neck);
    // Doric echinus and abacus.
    const echinus = new THREE.Mesh(lathe([
      [0, 0], [0.44, 0], [0.47, 0.04], [0.53, 0.1], [0.6, 0.16], [0.66, 0.2], [0.68, 0.22], [0, 0.22],
    ]), stone);
    echinus.position.y = y; y += 0.22;
    g.add(echinus);
    const abacus = new THREE.Mesh(new RoundedBoxGeometry(1.46, 0.2, 1.46, 4, 0.02), stone);
    abacus.position.y = y + 0.1;
    g.add(abacus);
    g.rotation.y = 0.35;
    return g;
  },

  holo(tint) {
    const g = new THREE.Group();
    const drum = new THREE.Mesh(lathe([
      [0, 0], [0.62, 0], [0.64, 0.03], [0.64, 0.07], [0.56, 0.1], [0.52, 0.14],
      [0.52, 0.5], [0.56, 0.53], [0.6, 0.56], [0.6, 0.6], [0, 0.6],
    ]), marbleMaterial('black', { scale: 1.6, seed: 6 }));
    g.add(drum);
    // A faceted low-poly form: an icosphere, jittered and stretched.
    const geo = new THREE.IcosahedronGeometry(0.72, 1);
    const p = geo.attributes.position;
    const key = (x, y, z) => `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`;
    const jitter = new Map();
    let s = 17;
    const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < p.count; i++) {
      const k = key(p.getX(i), p.getY(i), p.getZ(i));
      if (!jitter.has(k)) jitter.set(k, 0.9 + rand() * 0.2);
      const j = jitter.get(k);
      p.setXYZ(i, p.getX(i) * j, p.getY(i) * j * 1.3, p.getZ(i) * j);
    }
    geo.computeVertexNormals();
    const form = new THREE.Mesh(geo, chromeMaterial(tint, { flat: true, holo: 0.55 }));
    form.position.y = 0.6 + 0.72 * 1.3 * 0.98;
    // Rotated off the seed's natural facet grid so no single facet sits
    // dead centre and catches the key as a flat, centred triangle (read as
    // a video play-button icon; Tier A fix round finding 1).
    form.rotation.set(0.52, 1.94, 0.37);
    g.add(form);
    return g;
  },

  orb(tint) {
    const g = new THREE.Group();
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.8, 160, 120), chromeMaterial(tint));
    ball.position.y = 0.8;
    g.add(ball);
    return g;
  },
};

/* ------------------------------------------------------- stage and light */

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, premultipliedAlpha: false });
renderer.setPixelRatio(1);
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;   // keeps pastel hues honest
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;
document.body.appendChild(renderer.domElement);

// A studio room, tinted: RoomEnvironment plus pink and cyan softboxes on the
// back wall and a lavender one overhead, so every gloss carries the palette.
function tintedRoom() {
  const room = new RoomEnvironment();
  const box = new THREE.BoxGeometry();
  const panel = (hex, k, pos, scl) => {
    const m = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k) }));
    m.position.set(...pos);
    m.scale.set(...scl);
    room.add(m);
  };
  panel('#ff71ce', 9, [-11, 9, -13.5], [7, 9, 0.1]);   // pink, back left
  panel('#01cdfe', 9, [11, 9, -13.5], [7, 9, 0.1]);    // cyan, back right
  panel('#b967ff', 5, [0, 22, -4], [10, 0.1, 6]);      // lavender, overhead
  panel('#ffd9c2', 4, [-15.5, 6, 4], [0.1, 6, 8]);     // peach, left side
  panel('#ffffff', 14, [-7, 15, 12], [6, 4, 0.1]);     // white key softbox, front left
  // Sharper emitters for the chrome (finding 2): a small, hot point source
  // reads as a crisp mirror hit instead of the room's own soft blobs.
  panel('#ffffff', 55, [3.5, 11, 9], [1.4, 1.0, 0.1]); // chrome hot kicker, front right
  // Tried: a narrow vertical strip near the camera axis meant to give fluted
  // columns a glossy softbox streak down the shaft. Two positions (left of
  // centre, then dead centre) both washed into the shaft's existing spread
  // highlight with no visible streak; the shaft's own curvature already
  // spreads the reflection too wide for one more panel to carve a band out
  // of it. Reverted rather than keep a light that does nothing (finding 2).
  return room;
}
const pmrem = new THREE.PMREMGenerator(renderer);
const envMap = pmrem.fromScene(tintedRoom(), 0.02, 0.1, 100, { size: 1024 }).texture;

const scene = new THREE.Scene();
scene.environment = envMap;
scene.environmentIntensity = 1.1;

const key = new THREE.DirectionalLight(0xffffff, 1.7);
key.position.set(-3.5, 7, 4.5);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.radius = 14;
key.shadow.blurSamples = 24;
key.shadow.bias = -0.0004;
const cam = key.shadow.camera;
cam.left = -4; cam.right = 4; cam.top = 4; cam.bottom = -4; cam.near = 0.5; cam.far = 30;
scene.add(key, key.target);

const rimPink = new THREE.DirectionalLight(0xff71ce, 3.2);
rimPink.position.set(-6, 3, -5);
const rimCyan = new THREE.DirectionalLight(0x01cdfe, 3.2);
rimCyan.position.set(6, 3, -5);
const fill = new THREE.HemisphereLight(0xe6d8ff, 0xffd0e8, 0.35);
scene.add(rimPink, rimCyan, fill);

// Contact shadow: the key's soft VSM shadow on an invisible catcher, plus a
// radial ambient-occlusion blob right under the prop.
const catcher = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.2 }));
catcher.rotation.x = -Math.PI / 2;
catcher.receiveShadow = true;
scene.add(catcher);

function blobTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  const gr = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(0,0,0,0.55)');
  gr.addColorStop(0.45, 'rgba(0,0,0,0.25)');
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = gr;
  x.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
  new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, toneMapped: false }));
blob.rotation.x = -Math.PI / 2;
blob.position.y = 0.002;
scene.add(blob);

const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);

let current = null;
function disposeGroup(g) {
  g.traverse((o) => {
    if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); }
  });
}

/** Build a prop, frame it, render one frame, return a PNG data URL. */
async function render({ prop = 'sphere', tint = 'white', size = 2048, yaw = 0, elevation = 0.2, pad = 1.0 } = {}) {
  if (!PROPS[prop]) throw new Error(`unknown prop ${prop}`);
  if (current) { scene.remove(current); disposeGroup(current); }
  current = PROPS[prop](tint);
  current.rotation.y += yaw;
  current.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  scene.add(current);

  renderer.setSize(size, size, false);
  const box = new THREE.Box3().setFromObject(current);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const footprint = Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
  blob.scale.set(footprint * 1.15, footprint * 1.15, 1);
  blob.position.x = (box.min.x + box.max.x) / 2;
  blob.position.z = (box.min.z + box.max.z) / 2;

  // Frame by projection: aim at the box centre from the chosen elevation,
  // then walk the camera in or out until the box's corners (and the shadow
  // footprint on the floor) fill the frame to within the padding.
  const ext = box.getSize(new THREE.Vector3());
  const target = box.getCenter(new THREE.Vector3());
  const corners = [];
  for (const cx of [box.min.x, box.max.x]) for (const cy of [box.min.y, box.max.y]) for (const cz of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(cx, cy, cz));
  const reach = Math.max(ext.x, ext.z) * 0.5;
  for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) corners.push(new THREE.Vector3(target.x + dx * reach, 0, target.z + dz * reach));
  const dir = new THREE.Vector3(0, Math.sin(elevation), Math.cos(elevation));
  let dist = ext.length() * 2;
  for (let i = 0; i < 12; i++) {
    camera.position.copy(target).addScaledVector(dir, dist);
    camera.lookAt(target);
    camera.updateMatrixWorld();
    let m = 0;
    for (const c of corners) { const p = c.clone().project(camera); m = Math.max(m, Math.abs(p.x), Math.abs(p.y)); }
    dist *= (m * pad) / 0.9;
  }
  camera.position.copy(target).addScaledVector(dir, dist);
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  key.target.position.copy(sphere.center);
  key.position.copy(sphere.center).add(new THREE.Vector3(-3.5, 7, 4.5));

  renderer.render(scene, camera);
  renderer.render(scene, camera);       // VSM settles on the second pass
  return renderer.domElement.toDataURL('image/png');
}

function info() {
  const gl = renderer.getContext();
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  return {
    renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
    three: THREE.REVISION,
    props: Object.keys(PROPS),
    marbleTints: Object.keys(MARBLE_TINTS),
    chromeTints: Object.keys(CHROME_TINTS),
  };
}

window.marble = { render, info, ready: true };
