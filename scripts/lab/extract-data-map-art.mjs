// Extracts the deck art BDL-012 (the data map) shows from the client project's
// generated assets file, and writes it as plain .webp files under
// src/experiments/bdl-012/art/.
//
// Why a script and not a copy of the source file: the source is a 1.4 MB blob
// of base64 that mixes every deck together, and only some decks are ours to
// show on a public page. KEEP names the decks whose art goes out. The decks
// built on somebody else's characters (film, game and music properties) are
// named on the map as text rows and never as pictures, so their art is not
// extracted at all.
//
// The source keeps no theme tag on its photo wall. It was built round-robin
// across the themes in sorted order (see the client repo's
// scripts/docs/data-map-assets.mjs), so tile i belongs to theme i % themes.
// That is recovered here from the strips object, which has the same keys.
//
// Read-only on the source. No network.
//   node scripts/lab/extract-data-map-art.mjs [path/to/data-map-assets.js]
//   node scripts/lab/extract-data-map-art.mjs --sheet out-dir   (review only)
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const KEEP = ['Plant'];

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '..', '..', 'src', 'experiments', 'bdl-012', 'art');
const DEFAULT_SRC = 'C:/git/websites/cheerAndChatter/files/docs/data-map/data-map-assets.js';

const args = process.argv.slice(2);
const sheetAt = args.indexOf('--sheet');
const sheetDir = sheetAt >= 0 ? args[sheetAt + 1] : null;
const src = args.find((a, i) => !a.startsWith('--') && i !== sheetAt + 1) || DEFAULT_SRC;

const raw = readFileSync(src, 'utf8');
const json = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
const A = JSON.parse(json);

const buf = (uri) => Buffer.from(uri.slice(uri.indexOf(',') + 1), 'base64');
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const themes = Object.keys(A.strips).sort();
const wallByTheme = Object.fromEntries(themes.map((t) => [t, []]));
A.mosaic.forEach((uri, i) => wallByTheme[themes[i % themes.length]].push(uri));

// Review mode: one labelled contact sheet per theme, plus the TV cards and the
// share photo, so a person can look before anything is published.
if (sheetDir) {
  mkdirSync(sheetDir, { recursive: true });
  for (const t of themes) {
    const tiles = [...wallByTheme[t], ...A.strips[t]];
    const cols = 10, size = 120, rows = Math.ceil(tiles.length / cols);
    const composite = await Promise.all(tiles.map(async (uri, i) => ({
      input: await sharp(buf(uri)).resize(size, size).png().toBuffer(),
      left: (i % cols) * size, top: Math.floor(i / cols) * size,
    })));
    await sharp({ create: { width: cols * size, height: rows * size, channels: 3, background: '#1c1a17' } })
      .composite(composite).png().toFile(join(sheetDir, `sheet-${slug(t)}.png`));
    console.log(`[sheet] ${t}: ${tiles.length} tiles`);
  }
  const tv = await Promise.all(A.tv.map(async (c, i) => ({
    input: await sharp(buf(c.img)).resize(260, 260).png().toBuffer(), left: i * 260, top: 0,
  })));
  await sharp({ create: { width: 260 * A.tv.length, height: 260, channels: 3, background: '#1c1a17' } })
    .composite(tv).png().toFile(join(sheetDir, 'sheet-tv.png'));
  await sharp(buf(A.share.img)).png().toFile(join(sheetDir, 'sheet-share.png'));
  console.log('[sheet] tv, share');
  process.exit(0);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const manifest = { wall: [], strip: [], tv: [] };
for (const t of KEEP) {
  if (!wallByTheme[t]) throw new Error(`no such theme in the source: ${t}`);
  wallByTheme[t].forEach((uri, i) => {
    const name = `wall-${slug(t)}-${String(i + 1).padStart(2, '0')}.webp`;
    writeFileSync(join(OUT, name), buf(uri));
    manifest.wall.push(name);
  });
  A.strips[t].forEach((uri, i) => {
    const name = `strip-${slug(t)}-${i + 1}.webp`;
    writeFileSync(join(OUT, name), buf(uri));
    manifest.strip.push(name);
  });
}
// The TV demo cards are all from the Plant deck. Labels only: the fun facts
// shown on the map are written in the experiment's own data file.
for (const c of A.tv) {
  const name = `tv-${slug(c.label)}.webp`;
  writeFileSync(join(OUT, name), buf(c.img));
  manifest.tv.push({ label: c.label, file: name });
}
console.log(`[art] wrote ${manifest.wall.length} wall, ${manifest.strip.length} strip, ${manifest.tv.length} tv to ${OUT}`);
