/**
 * Estimate what About's live marble bust would cost in script: bundle the
 * three.js surface it needs (tree-shaken, minified) and print raw, gzip and
 * brotli sizes for a meshopt build, a Draco build and a stills-only baseline.
 *
 * Written 09-25-26 for Tier 3 stage 3 (Tier A proofs), for the live-bust
 * plan in docs/superpowers/specs/theme-schools-research/tier3-stage3/proofs/
 * marble.md. Uses the esbuild that Vite already installs (Astro's production
 * build is Rollup, so treat these as estimates within a few per cent), and
 * three from node_modules. Writes nothing but a stdout table.
 *
 * Usage:
 *   node scripts/themes/vaporwave/measure-bust-bundle.mjs
 */
import { build } from 'esbuild';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';
import { readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

// What a bust stage imports: renderer, scene, camera, lights, physical
// material with clearcoat and iridescence, PMREM room environment, glTF.
const CORE = `
import { WebGLRenderer, Scene, PerspectiveCamera, DirectionalLight, HemisphereLight,
  MeshPhysicalMaterial, PMREMGenerator, Color, Box3, Vector3, Group, Mesh,
  PlaneGeometry, ShadowMaterial, SRGBColorSpace, NeutralToneMapping, VSMShadowMap } from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
`;
const VARIANTS = {
  'bust, glTF + meshopt': CORE + `
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
export { WebGLRenderer, Scene, PerspectiveCamera, DirectionalLight, HemisphereLight, MeshPhysicalMaterial,
  PMREMGenerator, Color, Box3, Vector3, Group, Mesh, PlaneGeometry, ShadowMaterial, SRGBColorSpace,
  NeutralToneMapping, VSMShadowMap, RoomEnvironment, GLTFLoader, MeshoptDecoder };`,
  'bust, glTF + Draco (JS side only)': CORE + `
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
export { WebGLRenderer, Scene, PerspectiveCamera, DirectionalLight, HemisphereLight, MeshPhysicalMaterial,
  PMREMGenerator, Color, Box3, Vector3, Group, Mesh, PlaneGeometry, ShadowMaterial, SRGBColorSpace,
  NeutralToneMapping, VSMShadowMap, RoomEnvironment, GLTFLoader, DRACOLoader };`,
  'three core only (renderer + material)': `
import { WebGLRenderer, Scene, PerspectiveCamera, MeshPhysicalMaterial, Mesh, SphereGeometry } from 'three';
export { WebGLRenderer, Scene, PerspectiveCamera, MeshPhysicalMaterial, Mesh, SphereGeometry };`,
};

const kb = (n) => `${(n / 1024).toFixed(1)} KB`.padStart(10);
console.log('variant'.padEnd(40) + '       raw      gzip    brotli');
for (const [name, contents] of Object.entries(VARIANTS)) {
  const out = await build({
    stdin: { contents, resolveDir: REPO, loader: 'js' },
    bundle: true, minify: true, treeShaking: true, format: 'esm', write: false, platform: 'browser',
    target: 'es2022', logLevel: 'silent',
  });
  const code = Buffer.from(out.outputFiles[0].contents);
  const br = brotliCompressSync(code, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } });
  console.log(name.padEnd(40) + kb(code.length) + kb(gzipSync(code, { level: 9 }).length) + kb(br.length));
}

// The Draco decoder the site already serves (public/draco/, for BDL-007).
for (const f of ['draco_decoder.wasm', 'draco_wasm_wrapper.js']) {
  const p = join(REPO, 'public', 'draco', f);
  try {
    const b = readFileSync(p);
    console.log(`public/draco/${f}`.padEnd(40) + kb(statSync(p).size) + kb(gzipSync(b, { level: 9 }).length) +
      kb(brotliCompressSync(b).length));
  } catch { console.log(`public/draco/${f}: not found`); }
}
