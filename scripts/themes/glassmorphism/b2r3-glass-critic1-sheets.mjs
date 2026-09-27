/**
 * B2 glass re-critic round 1 (09-26-26): lay the rerun W1 critic probe's
 * stills (glass-recritic-r1/w1-probe/) out as labelled sheets (labels 22 px,
 * JPEG q92): the orb-edge sheet (fresh / idle 4 s / scrolled 120 px; clear
 * and tinted; light and dark), the fling strip, the lens stills, and the
 * arrival+hold strip.
 * Usage: node scripts/themes/glassmorphism/b2r3-glass-critic1-sheets.mjs
 */
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const IN = join(HERE, '..', '.out', 'stage3-b2', 'glass-recritic-r1', 'w1-probe');
const OUT = join(HERE, '..', '.out', 'stage3-b2', 'glass-recritic-r1');

async function sheet(file, rows, scale, title) {
  const imgs = await Promise.all(rows.map((r) => Promise.all(r.filter(([, f]) => existsSync(join(IN, f))).map(async ([l, f]) => [l, await loadImage(join(IN, f))]))));
  const cw = Math.max(...imgs.flat().map(([, i]) => i.width)) * scale;
  const ch = Math.max(...imgs.flat().map(([, i]) => i.height)) * scale;
  const cols = Math.max(...imgs.map((r) => r.length));
  const pad = 10, lh = 32, th = 40;
  const c = createCanvas(Math.round(pad + cols * (cw + pad)), Math.round(th + pad + imgs.length * (ch + lh + pad)));
  const g = c.getContext('2d');
  g.fillStyle = '#1c1c1c'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#fff'; g.font = 'bold 24px sans-serif'; g.fillText(title, pad, 30);
  g.font = '22px sans-serif';
  imgs.forEach((r, ri) => r.forEach(([l, im], ci) => {
    const x = pad + ci * (cw + pad), y = th + pad + ri * (ch + lh + pad);
    g.fillText(l, x, y + 24);
    g.drawImage(im, x, y + lh, im.width * scale, im.height * scale);
  }));
  await writeFile(join(OUT, file), c.toBuffer('image/jpeg', 92));
  console.log(join(OUT, file));
}

for (const scheme of ['light', 'dark']) {
  const rows = ['clear', 'tinted'].map((t) => ['0-fresh', '1-idle4s', '2-scrolled120'].map((s) => [`${scheme} ${t} ${s}`, `orbedge__${scheme}__${t}__${s}.png`]));
  await sheet(`sheet__orbedge-${scheme}.jpg`, rows, 1, `Lens over the pink orb edge (${scheme}): fresh, idle 4 s, scrolled 120 px`);
}
await sheet('sheet__fling-strip.jpg', [[['held', 'fling-01-held.png'], ['+40ms', 'fling-02.png'], ['+80ms', 'fling-03.png']], [['+160ms', 'fling-04.png'], ['+320ms', 'fling-05.png'], ['+1500ms', 'fling-06.png']]], 0.4, 'W1 fling probe rerun (1440x900)');
await sheet('sheet__lens-stills.jpg', ['desktop', 'phone'].flatMap((d) => ['light', 'dark'].map((s) => [['start clear', `lens-start__${d}__${s}__clear.png`], ['start tinted', `lens-start__${d}__${s}__tinted.png`], ['moved tinted', `lens-moved__${d}__${s}__tinted.png`], ['moved clear', `lens-moved__${d}__${s}__clear.png`]].map(([l, f]) => [`${d} ${s} ${l}`, f]))), 0.3, 'W1 lens stills rerun');
await sheet('sheet__arrival-hold-w1.jpg', [[['set tinted+dusk', 'hold-00-set-tinted-dusk.png'], ['on vaporwave', 'hold-01-on-vaporwave.png'], ['+60ms', 'arrive-0060ms.png'], ['+150ms', 'arrive-0150ms.png']], [['+300ms', 'arrive-0300ms.png'], ['+500ms', 'arrive-0500ms.png'], ['+800ms', 'arrive-0800ms.png'], ['+2000ms', 'arrive-2000ms.png']]], 0.3, 'W1 arrival + hold rerun');
