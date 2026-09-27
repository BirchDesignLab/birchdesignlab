#!/usr/bin/env node
/**
 * B2 fix round (seat vw-fix-marble), item 6: checks venus.glb's own
 * structure against the glTF/KHR_mesh_quantization spec without installing
 * anything (a hand-rolled GLB/JSON-chunk parse, not a validator package),
 * then loads it through three's GLTFLoader + MeshoptDecoder in a real
 * browser (the same path render-venus.mjs and the live bust use) to prove
 * the spec fixes did not break loading.
 *
 * Checks:
 *   - extensionsUsed and extensionsRequired both list KHR_mesh_quantization
 *     (when the file is quantized) -- process-venus.mjs used to list it in
 *     extensionsUsed only.
 *   - the NORMAL accessor's type is VEC3 -- KHR_mesh_quantization restricts
 *     NORMAL to VEC3; process-venus.mjs used to declare VEC4 for it.
 *   - the POSITION accessor's type is VEC3 (already correct; checked for
 *     symmetry) and both accessors' componentType is one of the extension's
 *     allowed types.
 *
 * Usage: node scripts/themes/vaporwave/b2fix-vw-marble-glb-check.mjs [--load]
 *   --load: also load the GLB in GPU Chromium (BDL_GPU=1 required) through
 *     the shared scene module, the same round-trip render-venus.mjs does.
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const GLB_PATH = join(REPO, 'src', 'themes', 'vaporwave', 'marble', 'venus.glb');

function parseGlb(path) {
  const buf = readFileSync(path);
  const magic = buf.readUInt32LE(0);
  if (magic !== 0x46546c67) throw new Error('not a GLB (bad magic)');
  const version = buf.readUInt32LE(4);
  const totalLength = buf.readUInt32LE(8);
  if (totalLength !== buf.length) throw new Error(`GLB length mismatch: header says ${totalLength}, file is ${buf.length}`);
  let offset = 12;
  let json = null;
  let bin = null;
  while (offset < buf.length) {
    const chunkLength = buf.readUInt32LE(offset);
    const chunkType = buf.readUInt32LE(offset + 4);
    const chunkData = buf.subarray(offset + 8, offset + 8 + chunkLength);
    if (chunkType === 0x4e4f534a) json = JSON.parse(chunkData.toString('utf8'));
    else if (chunkType === 0x004e4942) bin = chunkData;
    offset += 8 + chunkLength;
  }
  return { version, json, binLength: bin?.length ?? 0 };
}

const ALLOWED_NORMAL_TYPES = new Set([5120 /* BYTE */, 5122 /* SHORT */]); // normalized only, per spec
const ALLOWED_POSITION_TYPES = new Set([5120, 5121, 5122, 5123, 5126]);

function check(json) {
  const problems = [];
  const ok = [];
  const used = json.extensionsUsed ?? [];
  const required = json.extensionsRequired ?? [];
  const usesQuant = used.includes('KHR_mesh_quantization');
  if (usesQuant) {
    if (required.includes('KHR_mesh_quantization')) ok.push('KHR_mesh_quantization is in extensionsRequired');
    else problems.push('KHR_mesh_quantization is in extensionsUsed but NOT extensionsRequired');
  } else {
    ok.push('KHR_mesh_quantization not used (nothing to require)');
  }
  const mesh = json.meshes?.[0]?.primitives?.[0];
  if (!mesh) { problems.push('no mesh primitive found'); return { problems, ok }; }
  const posAcc = json.accessors[mesh.attributes.POSITION];
  const nrmAcc = json.accessors[mesh.attributes.NORMAL];
  if (posAcc.type !== 'VEC3') problems.push(`POSITION accessor type is ${posAcc.type}, spec requires VEC3`);
  else ok.push('POSITION accessor type is VEC3');
  if (usesQuant && !ALLOWED_POSITION_TYPES.has(posAcc.componentType)) problems.push(`POSITION componentType ${posAcc.componentType} not in KHR_mesh_quantization's allowed set`);
  if (nrmAcc.type !== 'VEC3') problems.push(`NORMAL accessor type is ${nrmAcc.type}, spec requires VEC3 (KHR_mesh_quantization: byte/short normalized, half float or float)`);
  else ok.push('NORMAL accessor type is VEC3');
  if (usesQuant) {
    if (!ALLOWED_NORMAL_TYPES.has(nrmAcc.componentType) || !nrmAcc.normalized) problems.push(`NORMAL componentType ${nrmAcc.componentType} normalized=${nrmAcc.normalized} not in KHR_mesh_quantization's allowed set (byte/short, normalized)`);
    else ok.push(`NORMAL componentType ${nrmAcc.componentType} normalized=${nrmAcc.normalized} is allowed`);
  }
  return { problems, ok, posAcc, nrmAcc, triCount: json.accessors[mesh.indices].count / 3, vertCount: posAcc.count };
}

const { version, json, binLength } = parseGlb(GLB_PATH);
console.log(`GLB version ${version}, JSON+BIN parsed OK, bin ${binLength} bytes`);
console.log('extensionsUsed:', json.extensionsUsed, ' extensionsRequired:', json.extensionsRequired);
const { problems, ok, posAcc, nrmAcc, triCount, vertCount } = check(json);
console.log(`mesh: ${vertCount} verts, ${triCount} tris`);
console.log('POSITION accessor:', posAcc);
console.log('NORMAL accessor:', nrmAcc);
for (const line of ok) console.log('  OK  ', line);
for (const line of problems) console.log('  FAIL', line);
if (problems.length) { console.error(`\n${problems.length} spec problem(s) found.`); process.exit(1); }
console.log('\nAll structural checks passed.');

if (process.argv.includes('--load')) {
  if (process.env.BDL_GPU !== '1') { console.error('\n--load needs BDL_GPU=1'); process.exit(1); }
  const { chromium } = await import('playwright');
  const THREE_DIR = join(REPO, 'node_modules', 'three');
  const MARBLE_MODULE_DIR = join(REPO, 'src', 'themes', 'vaporwave', 'marble');
  const RENDER_SCRIPTS_DIR = join(REPO, 'scripts', 'themes', 'vaporwave');
  const PORT = 4478;
  const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.glb': 'model/gltf-binary' };
  const server = createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const [root, rel] = p.startsWith('/three/') ? [THREE_DIR, p.slice(7)]
      : p.startsWith('/marble/') ? [MARBLE_MODULE_DIR, p.slice(8)]
      : [RENDER_SCRIPTS_DIR, p.slice(1)];
    const file = normalize(join(root, rel));
    if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(readFileSync(file));
  });
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
  try {
    const page = await browser.newPage();
    page.on('pageerror', (e) => console.log('[page error]', e.message));
    page.on('console', (m) => { if (m.type() === 'error') console.log('[page console error]', m.text()); });
    await page.goto(`http://127.0.0.1:${PORT}/marble-scene.html`);
    await page.waitForFunction(() => window.marble?.ready);
    const loaded = await page.evaluate(async () => {
      const { loadVenus } = await import('/marble/scene.js');
      const mesh = await loadVenus('/marble/venus.glb');
      return { isMesh: !!mesh?.isMesh, vertCount: mesh.geometry.attributes.position.count, hasNormal: !!mesh.geometry.attributes.normal };
    });
    console.log('\nGLTFLoader + MeshoptDecoder load result:', loaded);
    if (!loaded.isMesh || !loaded.hasNormal) { console.error('load check FAILED'); process.exitCode = 1; }
    else console.log('Load check passed (three.js GLTFLoader + MeshoptDecoder).');
  } finally {
    await browser.close();
    server.close();
  }
}
