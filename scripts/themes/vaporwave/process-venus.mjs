#!/usr/bin/env node
/**
 * Processes the Venus scan (scripts/themes/.out/meshes/venus/, gitignored,
 * CC0 per its license.txt) into the web mesh vaporwave's marble module ships:
 * src/themes/vaporwave/marble/venus.glb.
 *
 * Written 09-25-26 for Tier 3 stage 3, wave B2, seat vw-4a. Reads the raw
 * glTF (two primitives split at the 65,532-vertex limit, with normals,
 * tangents and UVs the marble material does not use), bakes the root node's
 * transform into the vertices (Sketchfab's own upright/facing pose for its
 * viewer), merges the two primitives into one indexed mesh, drops UVs and
 * tangents, welds the seam the vertex-count split left, centres and orients
 * it, cuts the base below the old bust-cut break line at the neck (the plan
 * in proofs/marble.md: "place the base so the old break line round the neck
 * sits below the plinth cut"), simplifies to about 30,000 triangles with
 * meshoptimizer's simplifier, recomputes normals, reorders for locality,
 * quantizes (16-bit positions, 8-bit octahedral normals), meshopt-encodes,
 * and writes a GLB with EXT_meshopt_compression and KHR_mesh_quantization.
 *
 * Usage:
 *   node scripts/themes/vaporwave/process-venus.mjs
 *   node scripts/themes/vaporwave/process-venus.mjs --debug   # also writes
 *     .out/stage3-b2/vw-4a/debug/venus-raw.glb (merged, welded, oriented,
 *     NOT simplified/quantized) for a visual orientation check by rendering
 *     it through render-marble.mjs's 'venus' prop before committing to the
 *     final simplified mesh.
 *   node scripts/themes/vaporwave/process-venus.mjs --triangles 30000
 */
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BufferGeometry, Float32BufferAttribute, Uint32BufferAttribute,
  Matrix4, Matrix3, Vector3, Box3,
} from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MeshoptSimplifier } from 'meshoptimizer/simplifier';
import { MeshoptEncoder } from 'meshoptimizer/encoder';
import { MeshoptDecoder } from 'meshoptimizer/decoder';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const SRC_DIR = join(REPO, 'scripts', 'themes', '.out', 'meshes', 'venus');
const OUT_GLB = join(REPO, 'src', 'themes', 'vaporwave', 'marble', 'venus.glb');
const DEBUG_DIR = join(REPO, 'scripts', 'themes', '.out', 'stage3-b2', 'vw-4a', 'debug');

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i === -1 ? d : argv[i + 1]; };
const TARGET_TRIANGLES = Number(arg('triangles', '30000'));
const DEBUG = argv.includes('--debug');

await MeshoptSimplifier.ready;
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;

/* --------------------------------------------------------- glTF reading */

const gltf = JSON.parse(readFileSync(join(SRC_DIR, 'scene.gltf'), 'utf8'));
const bin = readFileSync(join(SRC_DIR, gltf.buffers[0].uri));

function accessorArray(accessor) {
  const view = gltf.bufferViews[accessor.bufferView];
  const compSizes = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
  const typeCounts = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
  const n = typeCounts[accessor.type];
  const byteOffset = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const count = accessor.count * n;
  if (accessor.componentType === 5126) return new Float32Array(bin.buffer, bin.byteOffset + byteOffset, count).slice();
  if (accessor.componentType === 5125) return new Uint32Array(bin.buffer, bin.byteOffset + byteOffset, count).slice();
  throw new Error(`unhandled componentType ${accessor.componentType}`);
}

// Root node ("Sketchfab_model") carries the bake that gives Sketchfab's own
// viewer its upright, camera-facing default pose; the mesh nodes underneath
// it are identity. Column-major, as glTF and three.js Matrix4 both use.
const rootMatrix = new Matrix4().fromArray(gltf.nodes[0].matrix);
const normalMatrix = new Matrix3().getNormalMatrix(rootMatrix);

function readPrimitive(meshIndex) {
  const prim = gltf.meshes[meshIndex].primitives[0];
  const pos = accessorArray(gltf.accessors[prim.attributes.POSITION]);
  const nrm = accessorArray(gltf.accessors[prim.attributes.NORMAL]);
  const idx = accessorArray(gltf.accessors[prim.indices]);
  const v = new Vector3();
  for (let i = 0; i < pos.length; i += 3) {
    v.set(pos[i], pos[i + 1], pos[i + 2]).applyMatrix4(rootMatrix);
    pos[i] = v.x; pos[i + 1] = v.y; pos[i + 2] = v.z;
    v.set(nrm[i], nrm[i + 1], nrm[i + 2]).applyMatrix3(normalMatrix).normalize();
    nrm[i] = v.x; nrm[i + 1] = v.y; nrm[i + 2] = v.z;
  }
  return { pos, nrm, idx, vertCount: pos.length / 3 };
}

const a = readPrimitive(0);
const b = readPrimitive(1);
console.log(`process-venus: mesh 0: ${a.vertCount} verts, ${a.idx.length / 3} tris`);
console.log(`process-venus: mesh 1: ${b.vertCount} verts, ${b.idx.length / 3} tris`);

// Merge: concatenate vertices, offset the second primitive's indices.
const mergedPos = new Float32Array(a.pos.length + b.pos.length);
mergedPos.set(a.pos, 0);
mergedPos.set(b.pos, a.pos.length);
const mergedNrm = new Float32Array(a.nrm.length + b.nrm.length);
mergedNrm.set(a.nrm, 0);
mergedNrm.set(b.nrm, a.nrm.length);
const mergedIdx = new Uint32Array(a.idx.length + b.idx.length);
mergedIdx.set(a.idx, 0);
for (let i = 0; i < b.idx.length; i++) mergedIdx[a.idx.length + i] = b.idx[i] + a.vertCount;

console.log(`process-venus: merged (unwelded): ${mergedPos.length / 3} verts, ${mergedIdx.length / 3} tris`);

/* --------------------------------------------------------------- weld */

let geo = new BufferGeometry();
geo.setAttribute('position', new Float32BufferAttribute(mergedPos, 3));
geo.setAttribute('normal', new Float32BufferAttribute(mergedNrm, 3));
geo.setIndex(new Uint32BufferAttribute(mergedIdx, 1));
// Tolerance widened from 1e-5 (found by rendering: a visible crack/seam ran
// down the exact vertical centreline of the face, where the export's
// two-primitive split -- not a natural feature -- put a border whose
// vertices did not coincide closely enough at 1e-5 in this baked (~0.001
// scale) space to weld).
geo = mergeVertices(geo, 3e-4);
console.log(`process-venus: welded: ${geo.attributes.position.count} verts, ${geo.index.count / 3} tris`);

/* -------------------------------------------- centre, orient, base cut */

// Bounding box in the baked (Sketchfab-viewer) pose.
geo.computeBoundingBox();
const box0 = geo.boundingBox.clone();
console.log(`process-venus: baked bbox min ${box0.min.toArray().map((n) => n.toFixed(2))} max ${box0.max.toArray().map((n) => n.toFixed(2))}`);

/* Sketchfab's default embed camera looks toward -Z from +Z at the object's
   own baked pose, Y up: the root matrix that centres and scales a model for
   that viewer leaves it already upright and facing the viewer along +Z. That
   pose is confirmed by proofs/marble.md's own look at 1920px in the
   Sketchfab viewer ("nose, lips and chin intact... an old break line runs
   round the neck"), i.e. the default embed view IS the face-on view this
   pipeline targets. No extra yaw/pitch beyond the baked root transform, so
   the offline stills and the live bust (which loads this same GLB) both get
   a face-on Venus with zero extra rotation applied by the scene module. */
const EXTRA_ROTATION = { x: 0, y: 0, z: 0 };

const pos = geo.attributes.position;
const center = new Vector3();
box0.getCenter(center);
// Centre X/Z on the bust's own axis; keep Y so the neck break sits at a
// known height we can then cut a flat base beneath.
for (let i = 0; i < pos.count; i++) {
  pos.setX(i, pos.getX(i) - center.x);
  pos.setZ(i, pos.getZ(i) - center.z);
}
pos.needsUpdate = true;
geo.computeBoundingBox();
const box1 = geo.boundingBox;
const height = box1.max.y - box1.min.y;

/* The old bust-cut break line at the neck sits low on the scan (per
   proofs/marble.md, "an old break line runs round the neck above the bust
   cut, which the plinth cut hides"): cut flat at 12% of the model's own
   height above its lowest point, comfortably below the chin/jaw and inside
   the neck/shoulder stub, then drop everything below that plane so the cut
   itself becomes the flat base that sits on the plinth (no floating stub, no
   visible break line above the cut). */
const cutY = box1.min.y + height * 0.12;
const keepIdx = [];
const idxArr = geo.index.array;
for (let t = 0; t < idxArr.length; t += 3) {
  const i0 = idxArr[t], i1 = idxArr[t + 1], i2 = idxArr[t + 2];
  const y0 = pos.getY(i0), y1 = pos.getY(i1), y2 = pos.getY(i2);
  // Keep a triangle if any vertex is above the cut (a straddling triangle
  // still reads as "above": meshoptimizer's simplifier will clean the ragged
  // edge up during decimation, and the cut sits inside the neck/shoulder
  // stub where the surface is close to vertical, so the ragged ring is thin).
  if (y0 >= cutY || y1 >= cutY || y2 >= cutY) keepIdx.push(i0, i1, i2);
}
console.log(`process-venus: base cut at y=${cutY.toFixed(2)} (12% of height ${height.toFixed(2)} above min): kept ${keepIdx.length / 3} of ${idxArr.length / 3} tris`);
geo.setIndex(keepIdx);
geo = mergeVertices(geo, 1e-6); // drop the now-unused vertices below the cut
// Re-centre Y so the cut plane sits at y = 0 (the plinth surface).
for (let i = 0; i < geo.attributes.position.count; i++) {
  geo.attributes.position.setY(i, geo.attributes.position.getY(i) - cutY);
}
geo.attributes.position.needsUpdate = true;
geo.computeBoundingBox();
console.log(`process-venus: after base cut, bbox min ${geo.boundingBox.min.toArray().map((n) => n.toFixed(3))} max ${geo.boundingBox.max.toArray().map((n) => n.toFixed(3))}`);

if (DEBUG) {
  mkdirSync(DEBUG_DIR, { recursive: true });
  writeGlb(geo, join(DEBUG_DIR, 'venus-raw.glb'), { quantize: false });
  console.log(`process-venus: --debug wrote ${join(DEBUG_DIR, 'venus-raw.glb')} (unsimplified, unquantized)`);
}

/* ---------------------------------------------------------- simplify */

const srcIndices = new Uint32Array(geo.index.array);
const srcPositions = new Float32Array(geo.attributes.position.array);
const t0 = performance.now();
const [simplified, error] = MeshoptSimplifier.simplify(
  srcIndices, srcPositions, 3,
  TARGET_TRIANGLES * 3, 0.02,
  ['LockBorder'],
);
console.log(`process-venus: simplify ${srcIndices.length / 3} -> ${simplified.length / 3} tris, error ${error.toFixed(4)}, ${(performance.now() - t0).toFixed(0)} ms`);

let simple = new BufferGeometry();
simple.setAttribute('position', new Float32BufferAttribute(srcPositions, 3));
simple.setIndex(new Uint32BufferAttribute(simplified, 1));
simple = mergeVertices(simple, 1e-7); // drop now-orphaned vertices, compact the buffer
simple.computeVertexNormals(); // clean normals off the decimated surface, not the noisy scan
console.log(`process-venus: compacted: ${simple.attributes.position.count} verts, ${simple.index.count / 3} tris`);

/* ------------------------------------------------------------ encode */

await writeGlb(simple, OUT_GLB, { quantize: true });

async function writeGlb(g, outPath, { quantize }) {
  const count = g.attributes.position.count;
  const idx = new Uint32Array(g.index.array);

  // Reorder for GPU/decode locality (meshopt's own vertex-cache order).
  // reorderMesh MUTATES `idx` in place to the already-remapped, cache-optimised
  // index buffer and returns the vertex remap (old index -> new index)
  // separately, so `idx` itself -- not a second remap pass over it -- is the
  // final index buffer; only the vertex attribute arrays still need reindexing.
  const [remap, uniqueCount] = MeshoptEncoder.reorderMesh(idx, true, true);
  const dstIdx = idx;
  const srcPos = g.attributes.position.array;
  const srcNrm = g.attributes.normal.array;
  const dstPos = new Float32Array(uniqueCount * 3);
  const dstNrm = new Float32Array(uniqueCount * 3);
  for (let i = 0; i < count; i++) {
    const j = remap[i];
    if (j === 0xffffffff) continue;
    dstPos[j * 3] = srcPos[i * 3]; dstPos[j * 3 + 1] = srcPos[i * 3 + 1]; dstPos[j * 3 + 2] = srcPos[i * 3 + 2];
    dstNrm[j * 3] = srcNrm[i * 3]; dstNrm[j * 3 + 1] = srcNrm[i * 3 + 1]; dstNrm[j * 3 + 2] = srcNrm[i * 3 + 2];
  }

  const bb = new Box3().setFromBufferAttribute(new Float32BufferAttribute(dstPos, 3));
  let posBytes, nrmBytes, posComponentType, posMin, posMax, nodeExtra = {};

  if (quantize) {
    // KHR_mesh_quantization stores the raw quantized integers (normalized:
    // false); it defines no decode transform of its own, so the exporter
    // bakes one into the node (as gltfpack does): SHORT positions in
    // [-32767, 32767] map back to real units through this node's own
    // translation (the box centre) and non-uniform scale (each axis's own
    // half-extent / 32767). three.js applies that node transform (and its
    // normal matrix, which handles non-uniform scale correctly) like any
    // other glTF node, so no special-casing is needed on the load side.
    const size = new Vector3().subVectors(bb.max, bb.min);
    const half = size.clone().multiplyScalar(0.5);
    const center = bb.min.clone().add(half);
    const axisScale = [half.x || 1e-6, half.y || 1e-6, half.z || 1e-6];
    // Padded to VEC4 (8 bytes/vertex, w unused): meshopt's vertex-buffer
    // encoder requires a stride that is a multiple of 4 bytes, so a tight
    // VEC3 SHORT (6 bytes) is not encodable directly (measure-bust-mesh.mjs
    // hit the same constraint and pads the same way).
    const posI16 = new Int16Array(uniqueCount * 4);
    for (let i = 0; i < uniqueCount; i++) {
      for (let c = 0; c < 3; c++) {
        const v = dstPos[i * 3 + c] - center.getComponent(c);
        const n = v / axisScale[c];
        posI16[i * 4 + c] = Math.round(Math.max(-1, Math.min(1, n)) * 32767);
      }
    }
    posBytes = MeshoptEncoder.encodeGltfBuffer(new Uint8Array(posI16.buffer), uniqueCount, 8, 'ATTRIBUTES');
    posComponentType = 5122; // SHORT
    let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let i = 0; i < uniqueCount; i++) {
      minX = Math.min(minX, posI16[i * 4]); maxX = Math.max(maxX, posI16[i * 4]);
      minY = Math.min(minY, posI16[i * 4 + 1]); maxY = Math.max(maxY, posI16[i * 4 + 1]);
      minZ = Math.min(minZ, posI16[i * 4 + 2]); maxZ = Math.max(maxZ, posI16[i * 4 + 2]);
    }
    posMin = [minX, minY, minZ]; posMax = [maxX, maxY, maxZ];
    nodeExtra = { translation: center.toArray(), scale: axisScale };

    // Octahedral-encoded normals: 4 signed bytes per vertex (x, y, sign, pad),
    // decoded by the meshopt OCTAHEDRAL filter back into a unit-length VEC3
    // stored as normalized signed bytes (KHR_mesh_quantization NORMAL type).
    const octSrc = padVec4(dstNrm);
    const octBytes = MeshoptEncoder.encodeFilterOct(octSrc, uniqueCount, 4, 8);
    nrmBytes = MeshoptEncoder.encodeGltfBuffer(octBytes, uniqueCount, 4, 'ATTRIBUTES');
  } else {
    posBytes = MeshoptEncoder.encodeGltfBuffer(new Uint8Array(dstPos.buffer), uniqueCount, 12, 'ATTRIBUTES');
    posComponentType = 5126; // FLOAT
    posMin = bb.min.toArray(); posMax = bb.max.toArray();
    nrmBytes = MeshoptEncoder.encodeGltfBuffer(new Uint8Array(dstNrm.buffer), uniqueCount, 12, 'ATTRIBUTES');
  }
  const idxBytes = MeshoptEncoder.encodeGltfBuffer(new Uint8Array(dstIdx.buffer), dstIdx.length, 4, 'TRIANGLES');

  // One meshopt-compressed buffer view per attribute/index stream. This
  // pipeline ships only the compressed streams (three.js's GLTFLoader
  // decodes EXT_meshopt_compression directly); there is no fallback
  // uncompressed copy, so EXT_meshopt_compression is required, not optional.
  const chunks = [];
  const align = (buf) => { const pad = (4 - (buf.length % 4)) % 4; return pad ? Buffer.concat([buf, Buffer.alloc(pad)]) : buf; };
  // byteLength here is the COMPRESSED stream's true length (what the decoder
  // must consume exactly); the physical chunk is padded to a 4-byte boundary
  // for GLB alignment, but that padding sits after the meshopt data and must
  // never be reported as part of it, or the decoder's exact-consumption
  // check rejects it ("Malformed buffer data: -3", found by round-tripping
  // this file's own output through MeshoptDecoder before wiring it into the
  // scene module).
  const pushChunk = (buf) => {
    const raw = Buffer.from(buf);
    const offset = chunks.reduce((s, c) => s + c.length, 0);
    chunks.push(align(raw));
    return { byteOffset: offset, byteLength: raw.length };
  };

  const posChunk = pushChunk(posBytes);
  const nrmChunk = pushChunk(nrmBytes);
  const idxChunk = pushChunk(idxBytes);
  const binBuffer = Buffer.concat(chunks);

  const posStride = quantize ? 8 : 12; // quantized: VEC4 SHORT padded (see above); accessor below reads only VEC3 of it via byteStride
  const nrmStride = quantize ? 4 : 12;
  const gltfJson = {
    asset: { version: '2.0', generator: 'process-venus.mjs (birchdesignlab)' },
    extensionsUsed: quantize ? ['EXT_meshopt_compression', 'KHR_mesh_quantization'] : ['EXT_meshopt_compression'],
    // B2 fix round (spec nit, W1 critic): KHR_mesh_quantization belongs in
    // extensionsRequired too when it's used. A loader that ignores it would
    // read the quantized SHORT positions and BYTE normals as if they were
    // plain (unscaled) integers, with no idea it must also apply this node's
    // translation/scale to get real units back -- garbage geometry, not a
    // graceful fallback, so the spec's own requirement is "required" here.
    extensionsRequired: quantize ? ['EXT_meshopt_compression', 'KHR_mesh_quantization'] : ['EXT_meshopt_compression'],
    buffers: [{ byteLength: binBuffer.length }],
    bufferViews: [
      { buffer: 0, byteOffset: posChunk.byteOffset, byteLength: uniqueCount * posStride, byteStride: posStride, target: 34962, extensions: { EXT_meshopt_compression: { buffer: 0, byteOffset: posChunk.byteOffset, byteLength: posChunk.byteLength, byteStride: posStride, count: uniqueCount, mode: 'ATTRIBUTES' } } },
      // byteStride here matters now that NORMAL's accessor type is VEC3 (see
      // the accessors array below): a VEC3 BYTE accessor's own implied tight
      // stride is 3 bytes, but the physically decoded buffer is 4 bytes/vertex
      // (meshopt's octahedral filter always pads to a 4-byte-aligned stride).
      // Without an explicit byteStride here, a loader reads every vertex's
      // normal one byte short of where it actually lives -- a bug this fix
      // round's re-render caught immediately (a shattered, faceted-glass look
      // under specular light, from every vertex after the first reading a
      // one-byte-shifted, garbled normal). The old code avoided this by
      // declaring the accessor VEC4 instead (4 bytes tight = the real
      // stride), which happened to read correctly but was not KHR_mesh_quantization-valid
      // for NORMAL; VEC3 + this explicit byteStride is both valid and correct,
      // exactly how POSITION already reads VEC3 out of its own padded stride.
      { buffer: 0, byteOffset: nrmChunk.byteOffset, byteLength: uniqueCount * nrmStride, byteStride: nrmStride, target: 34962, extensions: { EXT_meshopt_compression: { buffer: 0, byteOffset: nrmChunk.byteOffset, byteLength: nrmChunk.byteLength, byteStride: nrmStride, count: uniqueCount, mode: 'ATTRIBUTES', filter: quantize ? 'OCTAHEDRAL' : 'NONE' } } },
      { buffer: 0, byteOffset: idxChunk.byteOffset, byteLength: dstIdx.length * 4, target: 34963, extensions: { EXT_meshopt_compression: { buffer: 0, byteOffset: idxChunk.byteOffset, byteLength: idxChunk.byteLength, byteStride: 4, count: dstIdx.length, mode: 'TRIANGLES' } } },
    ],
    // NORMAL's accessor type is VEC3 whether quantized or not (B2 fix round,
    // spec nit: this used to declare VEC4 when quantized). KHR_mesh_quantization
    // restricts NORMAL to VEC3; the physical storage is still a 4-byte stride
    // per vertex either way (meshopt's octahedral filter writes x, y, sign
    // and a pad byte -- see encodeFilterOct above), but that stride lives on
    // the bufferView, not the accessor. Declaring VEC3 here just means the
    // accessor reads 3 of those 4 stored bytes per vertex and ignores the
    // pad, exactly how POSITION already reads VEC3 out of its own padded
    // VEC4 SHORT stride two lines up.
    accessors: [
      { bufferView: 0, componentType: posComponentType, normalized: quantize, count: uniqueCount, type: 'VEC3', min: posMin, max: posMax },
      { bufferView: 1, componentType: quantize ? 5120 : 5126, normalized: quantize, count: uniqueCount, type: 'VEC3' },
      { bufferView: 2, componentType: 5125, count: dstIdx.length, type: 'SCALAR' },
    ],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, mode: 4 }] }],
    nodes: [{ mesh: 0, name: 'venus', ...nodeExtra }],
    scenes: [{ nodes: [0] }],
    scene: 0,
  };
  writeGlbFile(outPath, gltfJson, binBuffer);
  const stat = statSync(outPath);
  console.log(`process-venus: wrote ${outPath} (${(stat.size / 1024).toFixed(1)} KB, ${quantize ? 'quantized+meshopt' : 'meshopt only (debug)'})`);

  // Self-check: round-trip every meshopt stream just written back through
  // MeshoptDecoder (desktop Node CPU; a phone is roughly 4-6x slower per the
  // Tier A estimate in proofs/marble.md) and time it, so a future encoder
  // regression fails loudly here instead of silently at the loader.
  const decodeOne = (chunk, count, stride) => {
    const t0 = performance.now();
    const out = new Uint8Array(count * stride);
    MeshoptDecoder.decodeGltfBuffer(out, count, stride, chunk.bytes, chunk.mode, chunk.filter ?? 'NONE');
    return performance.now() - t0;
  };
  const posMs = decodeOne({ bytes: posBytes, mode: 'ATTRIBUTES' }, uniqueCount, posStride);
  const nrmMs = decodeOne({ bytes: nrmBytes, mode: 'ATTRIBUTES', filter: quantize ? 'OCTAHEDRAL' : 'NONE' }, uniqueCount, nrmStride);
  const idxMs = decodeOne({ bytes: idxBytes, mode: 'TRIANGLES' }, dstIdx.length, 4);
  console.log(`process-venus: decode check OK: position ${posMs.toFixed(2)} ms, normal ${nrmMs.toFixed(2)} ms, index ${idxMs.toFixed(2)} ms (desktop Node)`);
}

function padVec4(vec3arr) {
  // encodeFilterOct expects a stride-matching source; pack xyz + pad w=1.
  const n = vec3arr.length / 3;
  const out = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { out[i * 4] = vec3arr[i * 3]; out[i * 4 + 1] = vec3arr[i * 3 + 1]; out[i * 4 + 2] = vec3arr[i * 3 + 2]; out[i * 4 + 3] = 1; }
  return out;
}

function writeGlbFile(outPath, json, binBuffer) {
  mkdirSync(dirname(outPath), { recursive: true });
  const jsonStr = JSON.stringify(json);
  const jsonBuf = align4(Buffer.from(jsonStr), 0x20);
  const binBuf = align4(binBuffer, 0x00);
  const totalLength = 12 + 8 + jsonBuf.length + 8 + binBuf.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0); // 'glTF'
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(totalLength, 8);
  const jsonChunkHeader = Buffer.alloc(8);
  jsonChunkHeader.writeUInt32LE(jsonBuf.length, 0);
  jsonChunkHeader.writeUInt32LE(0x4e4f534a, 4); // 'JSON'
  const binChunkHeader = Buffer.alloc(8);
  binChunkHeader.writeUInt32LE(binBuf.length, 0);
  binChunkHeader.writeUInt32LE(0x004e4942, 4); // 'BIN\0'
  writeFileSync(outPath, Buffer.concat([header, jsonChunkHeader, jsonBuf, binChunkHeader, binBuf]));
}

function align4(buf, padByte) {
  const pad = (4 - (buf.length % 4)) % 4;
  return pad ? Buffer.concat([buf, Buffer.alloc(pad, padByte)]) : buf;
}
