/**
 * Pull embedded images out of a binary glTF and write them to disk.
 *
 * Written for BDL-007: the Draco pass on bdlOrganic.glb strips the vendor
 * extension EXT_materials_bump along with the two bump images it points at
 * (three's GLTFLoader ignores that extension anyway, so nothing downstream
 * ever asked Draco to keep them). The uncompressed export at
 * assets/brand/logos/3d/bdlOrganic.glb still has every image, so this reads
 * the JSON chunk, walks bufferViews the same way inspect-glb.mjs does, and
 * dumps the requested image indices as standalone files. Kept as a script
 * rather than a one-time repl session because "which bump image goes with
 * which material" is exactly the kind of fact that needs re-deriving if the
 * source model is ever re-exported.
 *
 * Usage: node scripts/lab/extract-glb-textures.mjs <file.glb> <outDir> [imageIndex...]
 *   With no indices given, extracts every embedded image.
 * Example: node scripts/lab/extract-glb-textures.mjs assets/brand/logos/3d/bdlOrganic.glb .out 1 3
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const [glbPath, outDir, ...indexArgs] = process.argv.slice(2);
if (!glbPath || !outDir) {
  console.error('usage: node scripts/lab/extract-glb-textures.mjs <file.glb> <outDir> [imageIndex...]');
  process.exit(1);
}

const buf = readFileSync(glbPath);
if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('not a glb');

// glb layout: 12-byte header, then chunks of [uint32 length][uint32 type][data].
// Chunk 0 is always JSON. Chunk 1 (type 0x004e4942, "BIN") holds every buffer
// referenced by bufferViews — glb only ever has one binary buffer.
const jsonLength = buf.readUInt32LE(12);
const gltf = JSON.parse(buf.subarray(20, 20 + jsonLength).toString('utf8'));
const binChunkStart = 20 + jsonLength;
const binChunkLength = buf.readUInt32LE(binChunkStart);
const binStart = binChunkStart + 8;
const bin = buf.subarray(binStart, binStart + binChunkLength);

const images = gltf.images ?? [];
const wanted = indexArgs.length > 0 ? indexArgs.map(Number) : images.map((_, i) => i);

mkdirSync(outDir, { recursive: true });

for (const i of wanted) {
  const image = images[i];
  if (!image) {
    console.error(`no image at index ${i} (glb has ${images.length})`);
    continue;
  }
  if (image.bufferView === undefined) {
    console.error(`image ${i} has no bufferView (external uri?) — skipped`);
    continue;
  }
  const view = gltf.bufferViews[image.bufferView];
  const start = view.byteOffset ?? 0;
  const bytes = bin.subarray(start, start + view.byteLength);
  const ext = image.mimeType === 'image/jpeg' ? 'jpg' : 'png';
  const outPath = `${outDir}/image-${i}.${ext}`;
  writeFileSync(outPath, bytes);
  console.log(`wrote ${outPath} (${bytes.length} bytes)`);
}
