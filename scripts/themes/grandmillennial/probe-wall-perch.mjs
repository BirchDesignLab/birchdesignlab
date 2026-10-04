/**
 * B1 task 2: finds perches for the live bird. Reads the card rects that
 * b1-t2-shots.mjs --measure wrote (scripts/themes/.out/stage5/b1/t2/measure__<size>.json)
 * and the limb centrelines build-scene.mjs wrote (scene.json), maps the limbs into
 * screen space the way the wall's CSS background does (cover, anchored), and lists
 * points on a limb that stay clear of every card by a margin, per size.
 *
 *   node scripts/themes/grandmillennial/probe-wall-perch.mjs [pad=30] [part=a] [anchor=0.5]
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = join(REPO, 'scripts', 'themes', '.out', 'stage5', 'b1', 't2');
const scene = JSON.parse(readFileSync(join(REPO, 'scripts/themes/proofs/stage5-gm-chinoiserie/scene.json'), 'utf8'));
const pad = Number(process.argv[2] ?? 30), part = process.argv[3] ?? 'a', ax = Number(process.argv[4] ?? 0.5);
const sizes = ['1440', '1280', '1024', '820', '390'];
const rectsOf = (id) => {
  const f = join(OUT, `measure__${id}.json`);
  if (!existsSync(f)) return null;
  const m = JSON.parse(readFileSync(f, 'utf8'));
  const parts = m.filter((r) => r.s === '.scene-part');
  const P = parts[part === 'a' ? 0 : 1];
  const cards = m.filter((r) => ['.story', '.letter', '.sitter', '.gm-frame2'].includes(r.s) && r.vis && r.y >= P.y - 5 && r.y < P.y + P.h);
  return { P, cards };
};
const out = {};
for (const id of sizes) {
  const R = rectsOf(id); if (!R) continue;
  const { P, cards } = R;
  const s = Math.max(P.w / 1600, P.h / 1300);
  const ox = (P.w - 1600 * s) * ax, oy = part === 'a' ? 0 : P.h - 1300 * s;
  out[id] = { s, ox, oy, P, cards };
}
const clear = (id, x, y) => {
  const { s, ox, oy, P, cards } = out[id];
  const sx = x * s + ox, sy = y * s + oy + P.y;
  if (sx < pad || sx > P.w - pad || sy < P.y + pad / 2 || sy > P.y + P.h - pad / 2) return false;
  return cards.every((c) => sx < c.x - pad || sx > c.x + c.w + pad || sy < c.y - pad * 1.6 || sy > c.y + c.h + pad);
};
const ids = Object.keys(out);
console.log('sizes with measures:', ids.join(' '));
scene.limbs.forEach((pts, li) => {
  const good = pts.filter(([x, y]) => ids.filter((id) => ['1440', '1280'].includes(id)).every((id) => clear(id, x, y)));
  const phone = ids.includes('390') ? pts.filter(([x, y]) => clear('390', x, y)) : [];
  if (good.length || phone.length) console.log(`limb ${li}: wide-clear ${JSON.stringify(good)}  phone-clear ${JSON.stringify(phone)}`);
});
