/**
 * Stage 6 wave 2, task 9, verifier round 1 (head d8169e6): compose the founder
 * sheets from the films w2-t9-evidence.mjs wrote under
 * scripts/themes/.out/stage6/w2/t9/{r1,base-r1,r0}/.
 *
 *   node scripts/themes/stage6/w2-t9-r1-sheets.mjs
 *
 * Writes scripts/themes/.out/stage6/w2/s6-w2-t9/sheets/r1/:
 *   base-vs-after-whole-page/  stage6-base (left) beside r1 (right), every page,
 *                              both schemes, 1440 1280 1024 820 390 (full page)
 *   viewport-frames/           every page at every screen offset, 1440 1024 390
 *   smudge/                    r0 (top) over r1 (bottom), hero corner, Frost 0/100
 *   crops/, header/, boundary/ copies of the r1 films
 */
import sharp from 'sharp';
import { readdirSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const T9 = join(HERE, '..', '.out', 'stage6', 'w2', 't9');
const OUT = join(HERE, '..', '.out', 'stage6', 'w2', 's6-w2-t9', 'sheets', 'r1');
for (const d of ['base-vs-after-whole-page', 'viewport-frames', 'smudge', 'crops', 'header', 'boundary']) mkdirSync(join(OUT, d), { recursive: true });

// whole page, base left and r1 right
for (const f of readdirSync(join(T9, 'r1', 'sheets')).filter((n) => n.endsWith('__full.png'))) {
  const a = join(T9, 'base-r1', 'sheets', f), b = join(T9, 'r1', 'sheets', f);
  const cw = 560;
  const [ma, mb] = await Promise.all([sharp(a).metadata(), sharp(b).metadata()]);
  const ha = Math.round((ma.height / ma.width) * cw), hb = Math.round((mb.height / mb.width) * cw);
  const [ta, tb] = await Promise.all([sharp(a).resize(cw, ha).toBuffer(), sharp(b).resize(cw, hb).toBuffer()]);
  await sharp({ create: { width: cw * 2 + 36, height: Math.max(ha, hb) + 24, channels: 3, background: '#1b1b1d' } })
    .composite([{ input: ta, left: 12, top: 12 }, { input: tb, left: cw + 24, top: 12 }])
    .png().toFile(join(OUT, 'base-vs-after-whole-page', f));
}

// viewport frames, r1 only (the base has no wave 2 work to compare against)
const cell = { 1440: [330, 206], 1024: [330, 248], 390: [190, 411] };
for (const w of [1440, 1024, 390]) for (const scheme of ['light', 'dark']) {
  const SRC = join(T9, 'r1', 'sheets');
  const rows = ['home', 'about', 'services', 'contact'].map((page) => readdirSync(SRC).filter((f) => f.startsWith(`${page}__${scheme}__${w}__vp`)).sort());
  const [cw, ch] = cell[w];
  const cols = Math.max(...rows.map((r) => r.length));
  const comps = [];
  for (let r = 0; r < rows.length; r++) for (let c = 0; c < rows[r].length; c++) comps.push({ input: await sharp(join(SRC, rows[r][c])).resize(cw, ch).toBuffer(), left: 8 + c * (cw + 8), top: 8 + r * (ch + 8) });
  await sharp({ create: { width: 8 + cols * (cw + 8), height: 8 + 4 * (ch + 8), channels: 3, background: '#1b1b1d' } }).composite(comps).png().toFile(join(OUT, 'viewport-frames', `vp__${scheme}__${w}__home-about-services-contact.png`));
}

// the smudge: r0 (66ff855, still smudged) over r1 (d8169e6)
for (const scheme of ['light', 'dark']) for (const v of [0, 100]) {
  const a = await sharp(join(T9, 'r0', 'crops', `frost__corner__${scheme}__frost${v}.png`)).toBuffer();
  const b = await sharp(join(T9, 'r1', 'crops', `frost__corner__${scheme}__frost${v}.png`)).toBuffer();
  const m = await sharp(a).metadata();
  await sharp({ create: { width: m.width, height: m.height * 2 + 12, channels: 3, background: '#1b1b1d' } })
    .composite([{ input: a, top: 0, left: 0 }, { input: b, top: m.height + 12, left: 0 }]).png()
    .toFile(join(OUT, 'smudge', `r0-over-r1__corner__${scheme}__frost${v}.png`));
}

for (const sub of ['crops', 'header', 'boundary']) for (const f of readdirSync(join(T9, 'r1', sub))) copyFileSync(join(T9, 'r1', sub, f), join(OUT, sub, f));
console.log('done', OUT);
