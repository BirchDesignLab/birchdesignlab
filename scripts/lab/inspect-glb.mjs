/**
 * Print the JSON chunk of a binary glTF: materials, extensions, and the
 * per-material PBR factors. Written while tuning BDL-007's lighting, when
 * the question "what is this surface actually made of" needed an answer
 * that did not come from reading three.js's output back through a screen.
 *
 * Usage: node scripts/lab/inspect-glb.mjs public/models/bdlOrganic.draco.glb
 */
import { readFileSync } from 'node:fs';

const path = process.argv[2];
if (!path) {
  console.error('usage: node scripts/lab/inspect-glb.mjs <file.glb>');
  process.exit(1);
}

/**
 * Convert a glTF linear-space baseColorFactor ([r, g, b, a], 0-1) to an
 * sRGB hex string, per the glTF/OpenGL EOTF:
 *   l <= 0.0031308 ? l * 12.92 : 1.055 * l**(1/2.4) - 0.055
 * applied per channel, then scaled to 0-255.
 */
function linearToSrgbHex([r, g, b]) {
  const toSrgb = (l) => (l <= 0.0031308 ? l * 12.92 : 1.055 * l ** (1 / 2.4) - 0.055);
  const toByte = (l) => Math.round(Math.min(Math.max(toSrgb(l), 0), 1) * 255);
  return '#' + [r, g, b].map((c) => toByte(c).toString(16).padStart(2, '0')).join('');
}

const buf = readFileSync(path);
if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('not a glb');
const jsonLength = buf.readUInt32LE(12);
const gltf = JSON.parse(buf.subarray(20, 20 + jsonLength).toString('utf8'));

console.log('extensionsUsed    ', gltf.extensionsUsed ?? []);
console.log('extensionsRequired', gltf.extensionsRequired ?? []);
console.log('images            ', (gltf.images ?? []).length);
console.log('');

for (const m of gltf.materials ?? []) {
  const pbr = m.pbrMetallicRoughness ?? {};
  console.log(`--- ${m.name}`);
  console.log('  baseColorFactor   ', pbr.baseColorFactor ? linearToSrgbHex(pbr.baseColorFactor) : '(none, defaults white)');
  console.log('  baseColorTexture  ', pbr.baseColorTexture ? 'yes' : 'no');
  console.log('  metallic/roughness', pbr.metallicFactor ?? '(1)', '/', pbr.roughnessFactor ?? '(1)');
  console.log('  mrTexture         ', pbr.metallicRoughnessTexture ? 'yes' : 'no');
  console.log('  normalTexture     ', m.normalTexture ? 'yes' : 'no');
  console.log('  emissiveFactor    ', m.emissiveFactor ?? '(none)');
  for (const [k, v] of Object.entries(m.extensions ?? {})) {
    console.log(`  ext ${k}`, JSON.stringify(v));
  }
}
