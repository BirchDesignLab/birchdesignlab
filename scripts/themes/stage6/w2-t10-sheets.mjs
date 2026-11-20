/**
 * Stage 6 wave 2, task 10: founder sheets from the shots w2-t10-shoot.mjs wrote
 * under scripts/themes/.out/stage6/w2/t10/{stage6-base,s6-w2-t10-before,s6-w2-t10-after}/.
 *   node scripts/themes/stage6/w2-t10-sheets.mjs
 * Writes scripts/themes/.out/stage6/w2/s6-w2-t10/sheets/:
 *   base-vs-after-whole-page/  stage6-base (left) beside after (right), every shot both have
 *   lab-band-before-vs-after/  the lab band, the wave 1 head (top) over this task (bottom)
 */
import sharp from 'sharp';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const T = join(HERE, '..', '.out', 'stage6', 'w2', 't10');
const OUT = join(HERE, '..', '.out', 'stage6', 'w2', 's6-w2-t10', 'sheets');
for (const d of ['base-vs-after-whole-page', 'lab-band-before-vs-after']) mkdirSync(join(OUT, d), { recursive: true });
const BG = '#1b1b1d';
const scale = async (file, w) => { const m = await sharp(file).metadata(); const h = Math.round((m.height / m.width) * w); return { buf: await sharp(file).resize(w, h).toBuffer(), h }; };

for (const f of readdirSync(join(T, 's6-w2-t10-after')).filter((n) => n.endsWith('__full.png'))) {
  const a = join(T, 'stage6-base', f), b = join(T, 's6-w2-t10-after', f);
  if (!existsSync(a)) continue;
  const cw = 560;
  const [ta, tb] = await Promise.all([scale(a, cw), scale(b, cw)]);
  await sharp({ create: { width: cw * 2 + 36, height: Math.max(ta.h, tb.h) + 24, channels: 3, background: BG } })
    .composite([{ input: ta.buf, left: 12, top: 12 }, { input: tb.buf, left: cw + 24, top: 12 }]).png().toFile(join(OUT, 'base-vs-after-whole-page', f));
}
for (const f of readdirSync(join(T, 's6-w2-t10-after')).filter((n) => n.endsWith('__band.png'))) {
  const a = join(T, 's6-w2-t10-before', f), b = join(T, 's6-w2-t10-after', f);
  if (!existsSync(a)) continue;
  const ma = await sharp(a).metadata(), mb = await sharp(b).metadata();
  await sharp({ create: { width: Math.max(ma.width, mb.width) + 24, height: ma.height + mb.height + 36, channels: 3, background: BG } })
    .composite([{ input: a, left: 12, top: 12 }, { input: b, left: 12, top: ma.height + 24 }]).png().toFile(join(OUT, 'lab-band-before-vs-after', f));
}
console.log('done', OUT);
