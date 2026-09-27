/**
 * @module vaporwave/marble/scene
 *
 * The scene behind vaporwave's rendered marble: procedural polished marble in
 * pastel tints, iridescent chrome accents, a tinted studio environment, pink
 * and cyan rim light and a soft contact shadow. ONE module, loaded two ways,
 * so the offline stills and the live About bust can never drift apart
 * (proofs/marble.md, "the live-bust plan"):
 *
 *   - Native ESM in scripts/themes/vaporwave/marble-scene.html, driven by
 *     render-marble.mjs (GPU Playwright), through the page's import map
 *     ("three" -> node_modules/three, "three/addons/" -> its examples/jsm/).
 *   - Bundled through Vite for the live bust (bare 'three' and
 *     'three/addons/...' imports, which resolve both ways).
 *
 * Moved here from scripts/themes/vaporwave/marble-scene.js in Tier 3 stage 3,
 * wave B2 (seat vw-4a); that file is now a thin bootstrap that imports this
 * module and exposes window.marble for the offline harness. Nothing about
 * the material, geometry or light changed in the move (render-marble.mjs
 * re-renders a stand-in and diffs it against the committed still to prove
 * it).
 *
 * Quality: every material and the stage itself take a `quality` of 'still'
 * (the offline look: 6 fbm octaves, a VSM shadow map, PMREM at 1024px) or
 * 'live' (the live-bust plan: 4 octaves, no shadow map -- the baked occlusion
 * blob carries contact shadow instead, PMREM built once at 256px). The fbm
 * octave count is a shader uniform, not a recompiled program, so one
 * material program serves both qualities.
 *
 * Usage:
 *   import { createStage, PROPS, MARBLE_TINTS, CHROME_TINTS, loadVenus,
 *            DEFAULT_VENUS_VIEW } from './scene.js';
 *   const stage = createStage({ quality: 'still' });          // or 'live'
 *   document.body.appendChild(stage.renderer.domElement);      // offline
 *   // or: container.appendChild(stage.renderer.domElement);   // live bust
 *   const venus = await loadVenus('./venus.glb');
 *   stage.setVenusMesh(venus);
 *   const url = stage.render({ prop: 'venus', tint: 'white', size: 1024 });
 *   stage.dispose();
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

/* ---------------------------------------------------------------- tints */

// Base, a second base for the cloudy mottle, the vein colour, vein strength.
// 'white' is the Venus's default (stage3-decisions.md, "Answers at the start
// of B2" item 1: white marble with pastel rims -- the pink/cyan rim lights
// below carry the pastel read, not the stone tint itself).
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

/** Fixed camera framing for the venus prop: the exact yaw, elevation and pad
    the live bust's first frame must reproduce (both call the same auto-fit
    framing below with these same numbers, so the pose is byte-for-byte
    reproducible from the same GLB, not eyeballed twice). */
export const DEFAULT_VENUS_VIEW = { yaw: 0.28, elevation: 0.16, pad: 1.08 };

const QUALITY = {
  still: { octaves: 6, shadow: true, pmrem: 1024 },
  live:  { octaves: 4, shadow: false, pmrem: 256 },
};

/* ------------------------------------------------------------- materials */

const MARBLE_NOISE = /* glsl */ `
varying vec3 vMarblePos;
varying vec3 vObjectPos;
uniform vec3 uBase;
uniform vec3 uBase2;
uniform vec3 uVein;
uniform float uStrength;
uniform float uSeed;
uniform int uOctaves;
uniform float uFaceMaskOn;
uniform vec3 uFaceCenter;
uniform vec3 uFaceRadius;
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
  // Octave count is a uniform (the live stage runs fewer for the phone's
  // fragment-shader budget), not a compile-time constant, so one program
  // serves both qualities.
  for (int i = 0; i < 8; i++) {
    if (i >= uOctaves) break;
    s += a * mNoise(p);
    p = p * 2.02 + vec3(1.7, 9.2, 3.1);
    a *= 0.5;
  }
  return s;
}
`;

/** @param {keyof MARBLE_TINTS} tintName
    @param {{scale?: number, seed?: number, octaves?: number, faceMask?: {center: [number, number, number], radius: [number, number, number]} | null}} [opts]
    `faceMask`: an object-space (mesh-local, pre-modelMatrix -- see `vObjectPos`
    below) ellipsoid that attenuates vein strength toward zero at its centre,
    fading back to full strength beyond its radius. Venus-only (B2 fix round,
    "veins off the face": the founder rejected a primary vein crossing the
    cheek like a crack). Object space, not `vMarblePos`'s world space: world
    space is the mesh's position after modelMatrix, which bakes in the live
    bust's yaw, so a world-space mask would drift across the surface (and in
    and out of the face) as the bust turns, while `transformed` (the raw
    per-vertex attribute, unrotated) stays glued to the geometry at every yaw,
    in both the offline stills and the live bust. */
export function marbleMaterial(tintName, { scale = 1, seed = 0, octaves = 6, faceMask = null } = {}) {
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
    uOctaves: { value: octaves },
    uFaceMaskOn: { value: faceMask ? 1 : 0 },
    uFaceCenter: { value: new THREE.Vector3(...(faceMask?.center ?? [0, 0, 0])) },
    uFaceRadius: { value: new THREE.Vector3(...(faceMask?.radius ?? [1, 1, 1])) },
  };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMarblePos;\nvarying vec3 vObjectPos;\nuniform float uScale;\nuniform float uSeed;')
      .replace('#include <begin_vertex>',
        '#include <begin_vertex>\nvObjectPos = transformed;\nvMarblePos = (modelMatrix * vec4(transformed, 1.0)).xyz * uScale + vec3(uSeed * 3.1, uSeed * 1.7, uSeed * 5.3);');
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
        // Face mask (Venus only, uFaceMaskOn=1): fades veins to zero inside
        // the ellipsoid (nose/cheek/forehead/chin), full strength beyond it
        // (hair, ears, neck, back), in mesh-local object space so the clean
        // region stays glued to the face at every yaw.
        if (uFaceMaskOn > 0.5) {
          vec3 fd = (vObjectPos - uFaceCenter) / uFaceRadius;
          float faceDist = length(fd);
          marbleVein *= smoothstep(0.78, 1.0, faceDist);
        }
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
  // One cache key for every marbleMaterial call: onBeforeCompile emits the
  // identical shader source every time (the face mask is a runtime branch on
  // uFaceMaskOn, not a different program), so every tint and prop -- venus's
  // face-masked material included -- shares one compiled program and differs
  // only by its own uniform values, the normal three.js pattern.
  mat.customProgramCacheKey = () => 'bdl-marble-v1';
  return mat;
}

/** @param {keyof CHROME_TINTS} tintName
    @param {{flat?: boolean, holo?: number}} [opts] */
export function chromeMaterial(tintName, { flat = false, holo = 0 } = {}) {
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

/* -------------------------------------------------------------- venus */

/** Load the processed Venus mesh (EXT_meshopt_compression, KHR_mesh_quantization
    GLB, no material). Returns the loaded THREE.Mesh (geometry only; callers
    assign a marbleMaterial). Safe to call once and reuse the mesh's geometry
    across props/tints via .clone(). */
export async function loadVenus(url) {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(url);
  let mesh = null;
  gltf.scene.traverse((o) => { if (o.isMesh && !mesh) mesh = o; });
  if (!mesh) throw new Error('loadVenus: no mesh found in ' + url);
  return mesh;
}

/* ---------------------------------------------------------------- props */

/** The Venus's own face-mask ellipsoid, passed as marbleMaterial's
    `faceMask` option (mesh-local/object space -- see that option's doc
    comment). Measured against the loaded GLB with
    scripts/themes/vaporwave/b2fix-vw-marble-measure.mjs (a per-height-band
    profile of the mesh's own x half-width and z front extent): the nose
    sits at object-space y about 0.0-0.1 where z peaks at 1.0 (the mesh's
    frontmost point); the chin/jaw falls off below y about -0.4 (z drops from
    about 0.83 to 0.45, the neck stub's own shallower front-to-back depth);
    the brow/hairline sits above y about 0.7 (z falls from about 0.86 toward
    0.63 at the crown); the ears sit near the widest point, x half-width 1.0
    at y 0.2-0.4. The radii below sit inside the ears' x extent and cover
    nose-to-forehead-to-chin in y, so the fix round's founder complaint (a
    vein crossing the cheek like a crack) clears at every yaw the live
    bust's drag and idle turn reach, while veins stay on the hair, neck and
    back. B2 fix round 09-26-26, seat vw-fix-marble. */
const VENUS_FACE_MASK = { center: [0, 0.15, 0.55], radius: [0.85, 0.85, 0.62] };

/** A small marble drum (contrasting stone) for staging the bust off the
    live-bust canvas, e.g. the Home kiosk still. `radius` sizes it relative
    to whatever sits on top (the venus-kiosk prop passes the bust's own
    half-width, so the drum reads as "small" next to it instead of at its
    own fixed, bust-agnostic scale). */
function marbleDrum(tint, { octaves = 6, radius = 0.44 } = {}) {
  const k = radius / 0.44;
  return new THREE.Mesh(lathe([
    [0, 0], [0.42, 0], [0.44, 0.03], [0.44, 0.06], [0.38, 0.09], [0.35, 0.12],
    [0.35, 0.38], [0.38, 0.41], [0.4, 0.44], [0.4, 0.47], [0, 0.47],
  ].map(([r, y]) => [r * k, y * k])), marbleMaterial(tint, { scale: 1.6 / k, seed: 51, octaves }));
}

/** Each prop builder returns a Group standing on y = 0. `ctx.octaves` and
    `ctx.venusMesh` (set via stage.setVenusMesh) are threaded in by render(). */
const PROPS = {
  sphere(tint, ctx) {
    const g = new THREE.Group();
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 160, 120), marbleMaterial(tint, { scale: 1.3, seed: 2, octaves: ctx.octaves }));
    ball.position.y = 1.07;
    ball.rotation.set(0.4, 0.8, 0.2);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.075, 48, 160), chromeMaterial('chrome'));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.075;
    g.add(ball, ring);
    return g;
  },

  column(tint, ctx) {
    // Stone pairings: the plinth is always a contrasting marble.
    const plinthTint = { white: 'black', pink: 'white', lavender: 'pink', black: 'white' }[tint];
    const stone = marbleMaterial(tint, { scale: 1.1, seed: 4, octaves: ctx.octaves });
    const plinthStone = marbleMaterial(plinthTint, { scale: 1.4, seed: 9, octaves: ctx.octaves });
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

  holo(tint, ctx) {
    const g = new THREE.Group();
    const drum = new THREE.Mesh(lathe([
      [0, 0], [0.62, 0], [0.64, 0.03], [0.64, 0.07], [0.56, 0.1], [0.52, 0.14],
      [0.52, 0.5], [0.56, 0.53], [0.6, 0.56], [0.6, 0.6], [0, 0.6],
    ]), marbleMaterial('black', { scale: 1.6, seed: 6, octaves: ctx.octaves }));
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

  /** The Venus bust alone, no base: what the live canvas shows (About). */
  venus(tint, ctx) {
    if (!ctx.venusMesh) throw new Error('PROPS.venus: call stage.setVenusMesh(mesh) first');
    const g = new THREE.Group();
    const mesh = ctx.venusMesh.clone();
    mesh.geometry = ctx.venusMesh.geometry; // share geometry, not the material
    mesh.material = marbleMaterial(tint, { scale: 2.4, seed: 61, octaves: ctx.octaves, faceMask: VENUS_FACE_MASK });
    g.add(mesh);
    return g;
  },

  /** The Venus on a small marble drum, for the lobby/kiosk staging. */
  'venus-kiosk'(tint, ctx) {
    const g = PROPS.venus(tint, ctx);
    const bustMesh = g.children[0];
    const bustPlinth = { white: 'black', pink: 'white', lavender: 'pink', black: 'white' }[tint] ?? 'black';
    // Size the drum off the bust's own NECK footprint, not its whole
    // bounding box (fix round: "a head in a collar" -- the drum used to be
    // 0.6x the head's own half-width, so it was narrower than the neck the
    // bust actually stands on, and the wider head/shoulders above it
    // overhung the drum's rim like a collar). Sample the mesh's own vertices
    // within a thin band just above its base cut (object-space y in
    // [0, 8% of height]) for their radial extent: that is the true neck
    // footprint the drum's top face must clear, and it is reliably narrower
    // than the head's own widest point (the ears, at mid-height) that the
    // old measurement used instead.
    // bustMesh.geometry's own attribute values are the mesh's RAW, still
    //-quantized local coordinates (KHR_mesh_quantization's own [-1, 1]-ish
    // normalized range) -- venus.glb's dequantization is a node transform
    // (translation + non-uniform per-axis scale, process-venus.mjs's
    // nodeExtra), applied by matrixWorld, not baked into the vertex buffer.
    // Sampling the raw buffer directly (an earlier version of this fix did)
    // measures in the wrong units entirely against `bustBox` below (which
    // Box3.setFromObject computes correctly, through matrixWorld) -- a real
    // mesh half-width around 0.12-0.17 real units read back as "0.8" of raw
    // quantized range, ballooning the drum to several times the bust's own
    // size. bustMesh.matrixWorld is just that dequant transform here (g has
    // not been rotated or added to a scene yet), so applying it per sample
    // brings the measurement into the same real units bustBox already uses.
    const geoPos = bustMesh.geometry.attributes.position;
    const bustBox = new THREE.Box3().setFromObject(bustMesh);
    const height = bustBox.max.y - bustBox.min.y;
    const band = bustBox.min.y + height * 0.08;
    const v = new THREE.Vector3();
    let neckRadius = 0;
    for (let i = 0; i < geoPos.count; i++) {
      v.fromBufferAttribute(geoPos, i).applyMatrix4(bustMesh.matrixWorld);
      if (v.y < bustBox.min.y || v.y > band) continue;
      const r = Math.hypot(v.x, v.z);
      if (r > neckRadius) neckRadius = r;
    }
    if (neckRadius <= 0) neckRadius = Math.max(bustBox.max.x - bustBox.min.x, bustBox.max.z - bustBox.min.z) / 2;
    // Clearly wider than the neck (fix round's own words), not a fixed
    // fraction of the head: about 45% wider than the measured neck radius,
    // so the neck's own ragged base-cut ring sits inside the drum's rim with
    // margin at every tint (the tints share one mesh, so one measurement).
    const drum = marbleDrum(bustPlinth, { ...ctx, radius: neckRadius * 1.45 });
    g.add(drum);
    // The bust's own base (the flat cut, at bustBox.min.y in its CURRENT
    // position -- see the dequantization note above) sits on the drum's flat
    // top. This must be an ADD to the mesh's existing position.y, not an
    // overwrite: bustMesh.position.y already carries venus.glb's own
    // dequantization translation (KHR_mesh_quantization's node transform,
    // set by GLTFLoader), and overwriting it (an earlier version of this fix
    // did) discards that translation's own contribution to where the base
    // cut actually lands, sinking the bust into the drum by the very offset
    // this line is trying to close (the fix round's "a head in a collar",
    // still present after the radius fix alone).
    const box = new THREE.Box3().setFromObject(drum);
    bustMesh.position.y += box.max.y - bustBox.min.y;
    return g;
  },
};

/* ------------------------------------------------------- stage and light */

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
  // Sharper emitters for the chrome: a small, hot point source reads as a
  // crisp mirror hit instead of the room's own soft blobs.
  panel('#ffffff', 55, [3.5, 11, 9], [1.4, 1.0, 0.1]); // chrome hot kicker, front right
  return room;
}

function blobTexture() {
  const c = (typeof OffscreenCanvas !== 'undefined') ? new OffscreenCanvas(256, 256) : document.createElement('canvas');
  if (!(c instanceof OffscreenCanvas)) { c.width = c.height = 256; }
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

/** Build a renderer, scene, lights and environment for one quality level.
    Returns { renderer, scene, camera, render(opts), setVenusMesh(mesh),
    info(), dispose(), getCurrentProp() }. Each stage owns its own renderer
    (offline and live each make exactly one; the offline harness makes at
    most two, one per quality, since it renders both the 'still' kiosk shot
    and the 'live' About poster).
    @param {{quality?: 'still'|'live', canvas?: HTMLCanvasElement, readback?: boolean, supersample?: boolean}} [opts]
    `canvas`: the live bust's own already-mounted <canvas> (B2, seat vw-4b);
    omitted, three.js creates one internally, as every offline caller does.
    `readback`: whether `render()` may read the drawing buffer back with
    `toDataURL` (the offline harness's whole point -- it wants a PNG). Default
    is `!canvas`: the live bust always passes its own canvas and never wants
    the readback (B2 fix round: it was calling render() once, for the first
    frame, and throwing the PNG away -- a synchronous GPU stall for nothing),
    while every offline caller omits `canvas` and keeps the readback it needs.
    Callers may still pass `readback` explicitly to override the default.
    `supersample` (B2 fix round 3, the live bust only): draw every frame at
    twice the drawing buffer's size into a multisampled half-float target,
    then tone-map, encode and box-filter it down into the canvas (see
    `draw()`). The README caps the canvas's devicePixelRatio at 1.5, so on a
    DPR-2 phone the live canvas is upscaled by the compositor while the
    poster (a 2048 px render averaged down) is not; the single-sample live
    frame then aliased in the hair and along the eye creases and the handoff
    jumped (3.64% of pixels at 390 px). Supersampling inside the capped
    buffer brings the live frame's detail to the poster's averaged look.
    Falls back to a plain render when the GPU cannot render to half float. */
export function createStage({ quality = 'still', canvas, readback = !canvas, supersample = false } = {}) {
  const q = QUALITY[quality] ?? QUALITY.still;

  // premultipliedAlpha: true (three.js's own default -- B2 fix round found it
  // overridden to false here, which is the classic WebGL antialias+alpha
  // pitfall: with alpha:true and antialias:true, MSAA's edge-pixel resolve
  // produces colour values consistent with premultiplied semantics, so a
  // context that is told those values are already "straight" (false) shows
  // a dark, jagged rim wherever coverage is partial -- exactly the live
  // bust's dark handoff rim the poster (rendered by this same module) never
  // showed once compressed and shadowed. True fixes both the on-screen live
  // canvas and any residual fringe in the offline PNG export (toDataURL
  // correctly unpremultiplies for the exported PNG's straight alpha either
  // way). preserveDrawingBuffer only matters for that same PNG export, so it
  // tracks `readback` instead of always being on.
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: readback, premultipliedAlpha: true });
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;   // keeps pastel hues honest
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = q.shadow;
  if (q.shadow) renderer.shadowMap.type = THREE.VSMShadowMap;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromScene(tintedRoom(), 0.02, 0.1, 100, { size: q.pmrem }).texture;
  pmrem.dispose();

  const scene = new THREE.Scene();
  scene.environment = envMap;
  scene.environmentIntensity = 1.1;

  const key = new THREE.DirectionalLight(0xffffff, 1.7);
  key.position.set(-3.5, 7, 4.5);
  key.castShadow = q.shadow;
  if (q.shadow) {
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.radius = 14;
    key.shadow.blurSamples = 24;
    key.shadow.bias = -0.0004;
    const cam = key.shadow.camera;
    cam.left = -4; cam.right = 4; cam.top = 4; cam.bottom = -4; cam.near = 0.5; cam.far = 30;
  }
  scene.add(key, key.target);

  const rimPink = new THREE.DirectionalLight(0xff71ce, 3.2);
  rimPink.position.set(-6, 3, -5);
  const rimCyan = new THREE.DirectionalLight(0x01cdfe, 3.2);
  rimCyan.position.set(6, 3, -5);
  const fill = new THREE.HemisphereLight(0xe6d8ff, 0xffd0e8, 0.35);
  scene.add(rimPink, rimCyan, fill);

  // Contact shadow: the key's soft VSM shadow (still quality) on an invisible
  // catcher, plus a radial ambient-occlusion blob right under the prop (both
  // qualities -- the live stage's only contact shadow, per the plan).
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.2 }));
  catcher.rotation.x = -Math.PI / 2;
  catcher.receiveShadow = q.shadow;
  catcher.visible = q.shadow;
  scene.add(catcher);

  const blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, toneMapped: false }));
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.002;
  scene.add(blob);

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);

  let current = null;
  let venusMesh = null;
  function disposeGroup(g) {
    g.traverse((o) => {
      if (o.isMesh) { o.geometry.dispose(); if (o.material !== venusMesh?.material) o.material.dispose(); }
    });
  }

  /** Build a prop, frame it, render one frame, return a PNG data URL
      (in a browser; on an OffscreenCanvas-only context, `toBlob`/transfer is
      the caller's job -- the offline harness runs in a real <canvas>). */
  function render({ prop = 'sphere', tint = 'white', size = 2048, yaw = 0, elevation = 0.2, pad = 1.0 } = {}) {
    if (!PROPS[prop]) throw new Error(`unknown prop ${prop}`);
    if (current) { scene.remove(current); disposeGroup(current); }
    current = PROPS[prop](tint, { octaves: q.octaves, venusMesh });
    current.rotation.y += yaw;
    current.traverse((o) => { if (o.isMesh) { o.castShadow = q.shadow; o.receiveShadow = false; } });
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

    draw();
    if (q.shadow) draw(); // VSM settles on the second pass
    // The live bust calls render() once, for its first frame, and never
    // wants the PNG (it draws straight to its on-screen canvas); readback
    // false skips the synchronous GPU readback entirely for that caller.
    return readback ? renderer.domElement.toDataURL('image/png') : undefined;
  }

  // ---- the supersampled draw path (see the `supersample` option) ----
  const SS = 2; // exactly 2: one output pixel = one 2x2 block of the target
  const SS_MAX_SIDE = 1024; // cost ceiling for the target's longest side
  const canSupersample = supersample
    && renderer.capabilities.isWebGL2
    && (renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float'));
  let ssTarget = null;
  let ssQuad = null;
  const ssCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const bufSize = new THREE.Vector2();
  function ensureSupersample(w, h) {
    if (!ssTarget) {
      ssTarget = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4, depthBuffer: true });
      // The resolve pass: for each output pixel, the 2x2 block of linear,
      // premultiplied (MSAA-resolved over a transparent clear) HDR texels is
      // un-premultiplied, tone-mapped (three's Neutral, as the screen path
      // uses), sRGB-encoded and re-premultiplied per texel, THEN averaged:
      // the same order as the poster's path (tone-mapped and encoded at 2048,
      // averaged down afterwards), so the two agree at edges too.
      ssQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
        glslVersion: THREE.GLSL3,
        uniforms: { tSrc: { value: ssTarget.texture }, uExposure: { value: renderer.toneMappingExposure } },
        vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: /* glsl */ `
          precision highp float;
          uniform sampler2D tSrc;
          uniform float uExposure;
          out vec4 outColor;
          vec3 neutral(vec3 color) {
            const float StartCompression = 0.8 - 0.04;
            const float Desaturation = 0.15;
            color *= uExposure;
            float x = min(color.r, min(color.g, color.b));
            float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
            color -= offset;
            float peak = max(color.r, max(color.g, color.b));
            if (peak < StartCompression) return color;
            float d = 1. - StartCompression;
            float newPeak = 1. - d * d / (peak + d - StartCompression);
            color *= newPeak / peak;
            float g = 1. - 1. / (Desaturation * (peak - newPeak) + 1.);
            return mix(color, vec3(newPeak), g);
          }
          vec3 srgb(vec3 v) {
            return mix(pow(v, vec3(0.41666)) * 1.055 - vec3(0.055), v * 12.92, vec3(lessThanEqual(v, vec3(0.0031308))));
          }
          vec4 texel(ivec2 p) {
            vec4 t = texelFetch(tSrc, p, 0);
            if (t.a <= 0.0) return vec4(0.0);
            vec3 c = srgb(clamp(neutral(max(t.rgb / t.a, 0.0)), 0.0, 1.0));
            return vec4(c * t.a, t.a);
          }
          void main() {
            ivec2 p = ivec2(gl_FragCoord.xy) * 2;
            outColor = 0.25 * (texel(p) + texel(p + ivec2(1, 0)) + texel(p + ivec2(0, 1)) + texel(p + ivec2(1, 1)));
          }`,
        depthTest: false, depthWrite: false, blending: THREE.NoBlending, toneMapped: false,
      }));
      ssQuad.frustumCulled = false;
    }
    if (ssTarget.width !== w || ssTarget.height !== h) ssTarget.setSize(w, h);
  }
  /** Draws the current scene into the canvas: a plain render, or (with
      `supersample`) the 2x path above. The live bust calls this per frame. */
  function draw() {
    renderer.getDrawingBufferSize(bufSize);
    if (!canSupersample || Math.max(bufSize.x, bufSize.y) * SS > SS_MAX_SIDE) {
      renderer.render(scene, camera);
      return;
    }
    ensureSupersample(bufSize.x * SS, bufSize.y * SS);
    renderer.setRenderTarget(ssTarget);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(ssQuad, ssCamera);
  }

  function info() {
    const gl = renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
      three: THREE.REVISION,
      quality,
      props: Object.keys(PROPS),
      marbleTints: Object.keys(MARBLE_TINTS),
      chromeTints: Object.keys(CHROME_TINTS),
    };
  }

  function dispose() {
    if (current) disposeGroup(current);
    envMap.dispose();
    ssTarget?.dispose();
    if (ssQuad) { ssQuad.geometry.dispose(); ssQuad.material.dispose(); }
    renderer.dispose();
  }

  return {
    renderer, scene, camera, render, draw, info, dispose,
    /** Whether draw() is taking the supersampled path on this GPU. */
    supersampling: () => canSupersample,
    setVenusMesh(mesh) { venusMesh = mesh; },
    // The live bust (B2, seat vw-4b) turns the standing prop by hand every
    // frame (group.rotation.y) instead of calling render() again, which
    // would tear down and rebuild the whole group (and recompile the
    // marble material) every frame. Exposes the group render() last built,
    // or null before the first render() call.
    getCurrentProp() { return current; },
  };
}
