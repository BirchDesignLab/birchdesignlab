/**
 * B1 task 6: where the wall file's painted birds fall against About's cards, per size.
 *
 *   node scripts/themes/grandmillennial/b1-t6-birds.mjs --base http://127.0.0.1:4460 [--sizes 1440,1024,820,390]
 *
 * The wall is one 1600 x 1300 drawing laid as a `cover` background in each of the two
 * rooms (scene-part a anchored 50% 0, or 0 0 at 820px and below; scene-part b anchored
 * 50% 100%). For every painted bird (a <use> of #sc-pb / #sc-fb in scene.json) this maps
 * its bounding box into each room and compares it with the cards (the story, the oval's
 * gilt, the second frame, the letter): a bird PEEKS when part of its box is covered and
 * part is in the open (a bird half under a card reads as a mistake); a bird wholly under a
 * card is hidden, which is fine. Also prints the live bird's two perches against the
 * nearest painted bird. Light scheme only (the layout does not change with the scheme).
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { open } from './t2-common.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i < 0 ? d : process.argv[i + 1]; };
const base = arg('base', 'http://127.0.0.1:4460').replace(/\/$/, '');
const ALL = [
  { id: '1440', w: 1440, h: 900, dpr: 1 }, { id: '1280', w: 1280, h: 800, dpr: 1 }, { id: '1024', w: 1024, h: 768, dpr: 1 },
  { id: '820', w: 820, h: 1180, dpr: 1, mobile: true }, { id: '390', w: 390, h: 844, dpr: 2, mobile: true },
];
const want = arg('sizes', '').split(',').filter(Boolean);
const SIZES = ALL.filter((s) => !want.length || want.includes(s.id));
const scene = JSON.parse(readFileSync(join(REPO, 'scripts/themes/proofs/stage5-gm-chinoiserie/scene.json'), 'utf8'));
const birds = [...scene.sceneG.matchAll(/<use href="#sc-(pb|fb)" transform="translate\(([-\d.]+) ([-\d.]+)\)(?: rotate\(([-\d.]+)\))? scale\(([-\d.]+) ([-\d.]+)\)" class="([\w-]+)"/g)]
  .map((m) => ({ kind: m[1], x: +m[2], y: +m[3], sx: +m[5], sy: +m[6], cls: m[7] }));
/* local extents of each symbol (the outline, with the tail) */
const EXT = { pb: [-108, -57, 42, 40], fb: [-70, -40, 45, 44] };
const box = (b) => {
  const [x0, y0, x1, y1] = EXT[b.kind];
  const xs = [b.x + b.sx * x0, b.x + b.sx * x1], ys = [b.y + b.sy * y0, b.y + b.sy * y1];
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
};

const CUTBAD = !process.argv.includes('--allowcut');
const SEARCH = process.argv.includes('--search');
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const M = [];
for (const sz of SIZES) {
  const { context, page } = await open(browser, 'light', sz);
  await page.goto(`${base}/t/grandmillennial/about/`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
  await page.waitForTimeout(400);
  const m = await page.evaluate(() => {
    const r = (e) => { const b = e.getBoundingClientRect(); return [b.left, b.top + scrollY, b.right, b.top + scrollY + b.height]; };
    const vis = (s) => [...document.querySelectorAll(s)].filter((e) => getComputedStyle(e).display !== 'none').map(r);
    const wb = [...document.querySelectorAll('.wb')].find((e) => getComputedStyle(e.closest('svg')).display !== 'none');
    return {
      parts: [...document.querySelectorAll('.scene-part')].map(r),
      cards: [...vis('.story'), ...vis('.gilt-oval'), ...vis('.gm-frame2'), ...vis('.letter')],
      home: wb.dataset.home.split(' ').map(Number), away: wb.dataset.away.split(' ').map(Number),
    };
  });
  m.sz = sz;
  const phone = sz.w <= 820;
  m.rooms = m.parts.map((p, i) => {
    const W = p[2] - p[0], H = p[3] - p[1];
    const s = Math.max(W / 1600, H / 1300);
    return { p, s, ox: p[0] + (i === 0 && phone ? 0 : (W - 1600 * s) / 2), oy: i === 0 ? p[1] : p[3] - 1300 * s };
  });
  M.push(m);
  await context.close();
}
await browser.close();

/** One bird against one size: a verdict per room it shows in. */
function verdicts(m, b) {
  const [x0, y0, x1, y1] = box(b);
  const res = [];
  m.rooms.forEach((R, ri) => {
    const bb = [R.ox + x0 * R.s, R.oy + y0 * R.s, R.ox + x1 * R.s, R.oy + y1 * R.s];
    const P = R.p, area = (bb[2] - bb[0]) * (bb[3] - bb[1]);
    const ix = Math.max(0, Math.min(bb[2], P[2]) - Math.max(bb[0], P[0])), iy = Math.max(0, Math.min(bb[3], P[3]) - Math.max(bb[1], P[1]));
    if ((ix * iy) / area < 0.3) return; // mostly off the room: not drawn
    let cov = 0;
    for (const c of m.cards) {
      const cx = Math.max(0, Math.min(bb[2], c[2]) - Math.max(bb[0], c[0])), cy = Math.max(0, Math.min(bb[3], c[3]) - Math.max(bb[1], c[1]));
      cov = Math.max(cov, (cx * cy) / area);
    }
    const cut = (ix * iy) / area < 0.98;
    res.push({ room: 'ab'[ri], cov, verdict: cov > 0.04 && cov < 0.9 ? 'PEEK' : cov >= 0.9 ? 'hidden' : cut ? 'CUT' : 'open' });
  });
  return res;
}

if (process.argv.includes('--limbs')) {
  /* perched birds belong on a limb: test points along every limb centreline */
  const sc = +arg('scale', 1.2), out = [];
  scene.limbs.forEach((pts, li) => pts.forEach(([x, y], k) => {
    for (const flip of [1, -1]) {
      const b = { kind: 'pb', x, y, sx: sc * flip, sy: sc };
      let bad = 0, open = 0;
      for (const m of M) for (const v of verdicts(m, b)) { if (v.verdict === 'PEEK') bad++; else if (v.verdict === 'open') open++; }
      if (!bad && open >= +arg('minopen', 2)) out.push([li, k, Math.round(x), Math.round(y), flip, open]);
    }
  }));
  console.log(JSON.stringify(out));
  process.exit(0);
}
if (SEARCH) {
  const kind = arg('kind', 'fb'), sc = +arg('scale', 1);
  const good = [];
  for (let x = 120; x <= 1520; x += 20) for (let y = 100; y <= 1150; y += 20) {
    const b = { kind, x, y, sx: sc, sy: sc };
    let open = 0, bad = 0;
    for (const m of M) for (const v of verdicts(m, b)) { if (v.verdict === 'PEEK' || (v.verdict === 'CUT' && CUTBAD)) bad++; else if (v.verdict === 'open') open++; }
    if (!bad && open >= +arg("minopen", M.length)) good.push([x, y, open]);
  }
  console.log(JSON.stringify(good));
  process.exit(0);
}

let bad = 0;
for (const m of M) {
  const lines = [];
  birds.forEach((b, bi) => {
    for (const v of verdicts(m, b)) {
      if (v.verdict === 'PEEK') bad++;
      if (v.verdict === 'PEEK' || v.verdict === 'CUT') lines.push(`  room ${v.room} bird#${bi} ${b.kind} ${b.cls} at ${Math.round(b.x)},${Math.round(b.y)}: covered ${Math.round(v.cov * 100)}% ${v.verdict}`);
    }
  });
  const dists = [m.home, m.away].map((h) => Math.min(...birds.filter((b) => b.kind === 'pb').map((b) => Math.hypot(h[0] - b.x, h[1] - b.y))).toFixed(0));
  console.log(`${m.sz.id}: live perches ${JSON.stringify(m.home)} / ${JSON.stringify(m.away)}, nearest painted perched bird ${dists.join(' / ')} units`);
  console.log(lines.join('\n') || '  no peeking or cut birds');
}
process.exit(bad ? 1 : 0);
