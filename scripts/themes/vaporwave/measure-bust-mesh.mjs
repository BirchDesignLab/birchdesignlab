/**
 * Estimate what the live marble bust's mesh would weigh and cost to decode,
 * before any real scan is downloaded: build a scan-like stand-in (a rough,
 * fbm-displaced icosphere) at several triangle counts, quantize it the way
 * a web glTF would (16-bit positions, 8-bit octahedral normals, no UVs,
 * since the marble is procedural), compress it with meshoptimizer's glTF
 * encoder (EXT_meshopt_compression), and time the decode.
 *
 * Written 09-25-26 for Tier 3 stage 3 (Tier A proofs), for the live-bust
 * plan in docs/superpowers/specs/theme-schools-research/tier3-stage3/proofs/
 * marble.md. Uses three and meshoptimizer 1.1.1 from node_modules (the
 * latter arrives with @types/three); downloads nothing. A real scan is
 * noisier than the stand-in, so treat sizes as a floor within about 30%.
 * Decode times are this desktop's CPU in Node; a mid-range phone is
 * roughly 4 to 6 times slower.
 *
 * Usage:
 *   node scripts/themes/vaporwave/measure-bust-mesh.mjs
 */
import { IcosahedronGeometry } from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { MeshoptEncoder } from 'meshoptimizer/encoder';
import { MeshoptDecoder } from 'meshoptimizer/decoder';
import { gzipSync, brotliCompressSync } from 'node:zlib';

await MeshoptEncoder.ready;
await MeshoptDecoder.ready;

function hash(x, y, z) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const f = (t) => t * t * (3 - 2 * t);
  const u = f(x - xi), v = f(y - yi), w = f(z - zi);
  const l = (a, b, t) => a + (b - a) * t;
  const h = (i, j, k) => hash(xi + i, yi + j, zi + k);
  return l(l(l(h(0, 0, 0), h(1, 0, 0), u), l(h(0, 1, 0), h(1, 1, 0), u), v),
           l(l(h(0, 0, 1), h(1, 0, 1), u), l(h(0, 1, 1), h(1, 1, 1), u), v), w);
}
const fbm = (x, y, z) => { let s = 0, a = 0.5; for (let i = 0; i < 6; i++) { s += a * noise(x, y, z); x *= 2.1; y *= 2.1; z *= 2.1; a *= 0.5; } return s; };

function standIn(detail) {
  let g = new IcosahedronGeometry(1, detail);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const d = 1 + 0.18 * (fbm(x * 2, y * 2, z * 2) - 0.5) + 0.01 * (fbm(x * 40, y * 40, z * 40) - 0.5);
    p.setXYZ(i, x * d, y * d * 1.25, z * d);
  }
  g.computeVertexNormals();
  return g;
}

const kb = (n) => `${(n / 1024).toFixed(0)} KB`.padStart(8);
console.log('triangles  verts   quantized   meshopt  +gzip  +brotli   decode ms (Node, desktop)');
for (const detail of [31, 44, 62, 68]) {
  const g = standIn(detail);
  const count = g.attributes.position.count;
  const [remap, unique] = MeshoptEncoder.reorderMesh(new Uint32Array(g.index.array), true, true);
  // Apply the remap to vertices and indices.
  const pos = new Int16Array(unique * 4);
  const nrmF = new Float32Array(unique * 4);
  const src = g.attributes.position.array, nrm = g.attributes.normal.array;
  for (let i = 0; i < count; i++) {
    const j = remap[i];
    if (j === 0xffffffff) continue;
    for (let c = 0; c < 3; c++) pos[j * 4 + c] = Math.round((src[i * 3 + c] / 1.5) * 32767);
    for (let c = 0; c < 3; c++) nrmF[j * 4 + c] = nrm[i * 3 + c];
  }
  const idx = new Uint32Array(g.index.count);
  for (let i = 0; i < idx.length; i++) idx[i] = remap[g.index.array[i]];
  const tris = idx.length / 3;

  const posEnc = MeshoptEncoder.encodeGltfBuffer(new Uint8Array(pos.buffer), unique, 8, 'ATTRIBUTES');
  const octBytes = MeshoptEncoder.encodeFilterOct(nrmF, unique, 4, 8);
  const nrmEnc = MeshoptEncoder.encodeGltfBuffer(octBytes, unique, 4, 'ATTRIBUTES');
  const idxEnc = MeshoptEncoder.encodeGltfBuffer(new Uint8Array(idx.buffer), idx.length, 4, 'TRIANGLES');
  const quantized = pos.byteLength + octBytes.byteLength + idx.byteLength;
  const all = Buffer.concat([posEnc, nrmEnc, idxEnc]);

  const t0 = performance.now();
  const runs = 10;
  for (let r = 0; r < runs; r++) {
    MeshoptDecoder.decodeGltfBuffer(new Uint8Array(unique * 8), unique, 8, posEnc, 'ATTRIBUTES', 'NONE');
    MeshoptDecoder.decodeGltfBuffer(new Uint8Array(unique * 4), unique, 4, nrmEnc, 'ATTRIBUTES', 'OCTAHEDRAL');
    MeshoptDecoder.decodeGltfBuffer(new Uint8Array(idx.length * 4), idx.length, 4, idxEnc, 'TRIANGLES', 'NONE');
  }
  const ms = (performance.now() - t0) / runs;
  console.log(`${String(tris).padStart(9)} ${String(unique).padStart(6)} ${kb(quantized)}   ${kb(all.length)} ${kb(gzipSync(all).length)} ${kb(brotliCompressSync(all).length)}   ${ms.toFixed(2)}`);
}
