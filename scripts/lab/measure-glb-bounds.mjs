/**
 * Measure a glTF/glb's world-space bounding box three ways, to diagnose
 * framing/centering bugs that depend on EXT_mesh_gpu_instancing.
 *
 * Written for BDL-007: the stage recenters the model on
 * `new THREE.Box3().setFromObject(model)`'s centre and points the camera at
 * x=0. If that box ignores the per-instance translations of the GPU-instanced
 * moss/lichen, the box centre is the centre of the node PIVOTS, not the visual
 * silhouette, and the mark renders off-centre — invisible on a wide viewport
 * with lots of horizontal air, a hard left/right clip on a tall phone.
 *
 * This reads POSITION accessor min/max (glTF requires them) and the
 * EXT_mesh_gpu_instancing TRANSLATION/ROTATION/SCALE accessors straight from
 * the binary, so it needs no Draco decoder, no GPU, and no three.js-in-Node.
 * Point it at the UNCOMPRESSED source glb (Draco strips vertex data but keeps
 * the same node/instancing structure and POSITION min/max on the source).
 *
 * Usage: node scripts/lab/measure-glb-bounds.mjs assets/brand/logos/3d/bdlOrganic.glb
 *
 * Boxes reported:
 *   instance-aware : every instance placed at its real matrix (the true mark)
 *   base-pivots    : instanced nodes collapsed to their node origin (what a
 *                    non-instance-aware Box3.setFromObject would measure)
 *   non-instanced  : only the plain meshes (e.g. the bark letterform)
 */
import { readFileSync } from 'node:fs';

const path = process.argv[2];
if (!path) {
  console.error('usage: node scripts/lab/measure-glb-bounds.mjs <file.glb>');
  process.exit(1);
}

// ---- glb container ----
const buf = readFileSync(path);
if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('not a glb');
const jsonLength = buf.readUInt32LE(12);
const gltf = JSON.parse(buf.subarray(20, 20 + jsonLength).toString('utf8'));
// BIN chunk follows the JSON chunk (header: length u32, type u32, then data).
const binHeader = 20 + jsonLength;
const binLength = buf.readUInt32LE(binHeader);
const BIN = buf.subarray(binHeader + 8, binHeader + 8 + binLength);

// ---- column-major mat4 helpers (three.js layout) ----
const identity = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function compose(t, q, s) {
  const [x, y, z, w] = q;
  const [sx, sy, sz] = s;
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  return [
    (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
    (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
    (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
    t[0], t[1], t[2], 1,
  ];
}
function multiply(a, b) {
  const out = new Array(16).fill(0);
  for (let col = 0; col < 4; col++)
    for (let row = 0; row < 4; row++)
      for (let k = 0; k < 4; k++)
        out[col * 4 + row] += a[k * 4 + row] * b[col * 4 + k];
  return out;
}
function transformPoint(m, p) {
  const [x, y, z] = p;
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ];
}
function nodeMatrix(node) {
  if (node.matrix) return node.matrix.slice();
  return compose(
    node.translation ?? [0, 0, 0],
    node.rotation ?? [0, 0, 0, 1],
    node.scale ?? [1, 1, 1],
  );
}

// ---- accessor reader (FLOAT vec2/3/4 only, which covers what we need) ----
const COMP = { 5126: { bytes: 4, read: (b, o) => b.readFloatLE(o) } };
const NUM = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
function readAccessor(index) {
  const acc = gltf.accessors[index];
  const view = gltf.bufferViews[acc.bufferView];
  const comp = COMP[acc.componentType];
  const n = NUM[acc.type];
  const base = (view.byteOffset ?? 0) + (acc.byteOffset ?? 0);
  const stride = view.byteStride ?? comp.bytes * n;
  const out = [];
  for (let i = 0; i < acc.count; i++) {
    const el = [];
    for (let c = 0; c < n; c++) el.push(comp.read(BIN, base + i * stride + c * comp.bytes));
    out.push(el);
  }
  return out;
}

// ---- box accumulators ----
const mkBox = () => ({ min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] });
function expand(box, p) {
  for (let i = 0; i < 3; i++) {
    if (p[i] < box.min[i]) box.min[i] = p[i];
    if (p[i] > box.max[i]) box.max[i] = p[i];
  }
}
const boxInstanceAware = mkBox();
const boxBasePivots = mkBox();
const boxNonInstanced = mkBox();

function meshLocalCorners(meshIndex) {
  // Union of every primitive's POSITION min/max, as 8 corners.
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const prim of gltf.meshes[meshIndex].primitives) {
    const acc = gltf.accessors[prim.attributes.POSITION];
    for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], acc.min[i]); hi[i] = Math.max(hi[i], acc.max[i]); }
  }
  const corners = [];
  for (let xi = 0; xi < 2; xi++)
    for (let yi = 0; yi < 2; yi++)
      for (let zi = 0; zi < 2; zi++)
        corners.push([xi ? hi[0] : lo[0], yi ? hi[1] : lo[1], zi ? hi[2] : lo[2]]);
  return corners;
}

const perNode = [];
function walk(nodeIndex, parent) {
  const node = gltf.nodes[nodeIndex];
  const world = multiply(parent, nodeMatrix(node));
  if (node.mesh !== undefined) {
    const corners = meshLocalCorners(node.mesh);
    const inst = node.extensions?.EXT_mesh_gpu_instancing;
    const nodeBox = mkBox();
    if (inst) {
      const T = inst.attributes.TRANSLATION ? readAccessor(inst.attributes.TRANSLATION) : null;
      const R = inst.attributes.ROTATION ? readAccessor(inst.attributes.ROTATION) : null;
      const S = inst.attributes.SCALE ? readAccessor(inst.attributes.SCALE) : null;
      const count = (T ?? R ?? S).length;
      for (let i = 0; i < count; i++) {
        const im = compose(T ? T[i] : [0, 0, 0], R ? R[i] : [0, 0, 0, 1], S ? S[i] : [1, 1, 1]);
        const placed = multiply(world, im);
        for (const c of corners) { const p = transformPoint(placed, c); expand(boxInstanceAware, p); expand(nodeBox, p); }
      }
      // base-pivots: instances collapsed to the node origin
      for (const c of corners) { const p = transformPoint(world, c); expand(boxBasePivots, p); }
      perNode.push({ name: node.name ?? `#${nodeIndex}`, instanced: count, box: nodeBox });
    } else {
      for (const c of corners) {
        const p = transformPoint(world, c);
        expand(boxInstanceAware, p); expand(boxBasePivots, p); expand(boxNonInstanced, p); expand(nodeBox, p);
      }
      perNode.push({ name: node.name ?? `#${nodeIndex}`, instanced: 0, box: nodeBox });
    }
  }
  for (const child of node.children ?? []) walk(child, world);
}

const scene = gltf.scenes[gltf.scene ?? 0];
for (const n of scene.nodes) walk(n, identity());

// ---- report ----
const f = (n) => n.toFixed(4).padStart(9);
function describe(label, box) {
  const c = [0, 1, 2].map((i) => (box.min[i] + box.max[i]) / 2);
  const s = [0, 1, 2].map((i) => box.max[i] - box.min[i]);
  console.log(`${label.padEnd(15)} center [${c.map(f).join(', ')}]  size [${s.map(f).join(', ')}]`);
  return { c, s };
}
console.log(`\n${path}\n`);
const ia = describe('instance-aware', boxInstanceAware);
const bp = describe('base-pivots', boxBasePivots);
describe('non-instanced', boxNonInstanced);

const dx = bp.c[0] - ia.c[0], dy = bp.c[1] - ia.c[1];
const halfW = (boxInstanceAware.max[0] - boxInstanceAware.min[0]) / 2;
const halfH = (boxInstanceAware.max[1] - boxInstanceAware.min[1]) / 2;
console.log('\ncenter drift, base-pivots vs true silhouette:');
console.log(`  dx = ${dx.toFixed(4)}  (${((dx / halfW) * 100).toFixed(1)}% of true half-width)`);
console.log(`  dy = ${dy.toFixed(4)}  (${((dy / halfH) * 100).toFixed(1)}% of true half-height)`);

console.log('\nper mesh node (name, instances, local center x/y):');
for (const nd of perNode) {
  const cx = (nd.box.min[0] + nd.box.max[0]) / 2;
  const cy = (nd.box.min[1] + nd.box.max[1]) / 2;
  console.log(`  ${nd.name.padEnd(18)} inst=${String(nd.instanced).padStart(4)}  cx=${cx.toFixed(3)} cy=${cy.toFixed(3)}`);
}
