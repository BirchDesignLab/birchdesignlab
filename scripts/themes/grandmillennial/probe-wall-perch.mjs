/**
 * B1 task 2 (fix round 1): perches for the live wall bird, measured against the real page.
 *
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name x --reuse --port 4460 -- node scripts/themes/grandmillennial/probe-wall-perch.mjs [--check] [--pad=14]
 *
 * For each size the About page is loaded and the bird layer that is showing (wide above
 * 820px, phone at or below) is mapped from the wall's 1600 x 1300 drawing to the page the
 * way the CSS background maps it (cover, anchored). The bird's whole bounding box (the
 * conservative rectangle round tail, wings and beak) is tested against the sitter and its
 * picture wire, the second frame and the story, in the perched pose at both perches, in the
 * flying pose at both ends and along the arc the script flies.
 *
 *   --check   test the perches About.astro ships (read from data-home / data-away) at
 *             every size and both schemes; exit 1 with the offending size if any box
 *             comes within the pad of a card. This is the regression check.
 *   (default) search the limb centrelines for new perches that are clear at every size of
 *             a variant, and print the best pairs for each variant.
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { open } from './t2-common.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const base = (process.env.SNAP_BASE || '').replace(/\/$/, '');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.split('=')[1] : d; };
const CHECK = process.argv.includes('--check');
const PAD = Number(arg('pad', 14));
const SIZES = [
  { id: '1440', w: 1440, h: 900, dpr: 1, variant: 'wide' },
  { id: '1280', w: 1280, h: 800, dpr: 1, variant: 'wide' },
  { id: '1024', w: 1024, h: 768, dpr: 1, variant: 'wide' },
  { id: '820', w: 820, h: 1180, dpr: 1, variant: 'phone', mobile: true },
  { id: '390', w: 390, h: 844, dpr: 2, variant: 'phone', mobile: true },
];
const scene = JSON.parse(readFileSync(join(REPO, 'scripts/themes/proofs/stage5-gm-chinoiserie/scene.json'), 'utf8'));
if (!base) { console.error('SNAP_BASE not set'); process.exit(1); }

/** The arc the bird flies (same maths as WallBird.astro's fly()). */
function arc(from, to, n = 14) {
  const lift = Math.min(48, 16 + Math.hypot(to[0] - from[0], to[1] - from[1]) * 0.1);
  const cx = (from[0] + to[0]) / 2, cy = Math.min(from[1], to[1]) - lift;
  const dir = Math.sign(to[0] - from[0]) || 1;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = 0.5 - 0.5 * Math.cos(Math.PI * i / n), u = 1 - t;
    pts.push({ x: u * u * from[0] + 2 * u * t * cx + t * t * to[0], y: u * u * from[1] + 2 * u * t * cy + t * t * to[1], s: from[2] + (to[2] - from[2]) * t, f: dir });
  }
  return pts;
}

async function measure(page, sz) {
  await page.goto(`${base}/t/grandmillennial/about/`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(400);
  const m = await page.evaluate(() => {
    const g = [...document.querySelectorAll('.wb')].find((e) => getComputedStyle(e.closest('svg')).display !== 'none');
    const svg = g.closest('svg');
    const m = svg.getScreenCTM();
    const pb = g.querySelector('.wb-perch').getBBox();
    g.classList.add('flying');
    const fb = g.querySelector('.wb-fly').getBBox();
    g.classList.remove('flying');
    const box = (b, dx = 0, dy = 0) => [b.x + dx, b.y + dy, b.x + b.width + dx, b.y + b.height + dy];
    /* the drawn outline of a bird symbol, as points every ~3 units along every path */
    const cloud = (id, dx = 0, dy = 0) => {
      const pts = [];
      for (const p of document.querySelectorAll(`#${id} path`)) {
        if (p.classList.contains('sc-ln')) continue;
        const L = p.getTotalLength();
        for (let l = 0; l <= L; l += 3) { const q = p.getPointAtLength(l); pts.push([q.x + dx, q.y + dy]); }
      }
      return pts;
    };
    /* union of the drawn leaves under sel (an svg's own box is mostly empty, so its children stand
       in for it) and of the named containers' own boxes (a card is a painted box) */
    const union = (sel, own = []) => {
      const u = [];
      const add = (r) => {
        if (!r.width && !r.height) return;
        u.push([r.left, r.top + scrollY, r.right, r.top + scrollY + r.height]);
      };
      for (const e of document.querySelectorAll(sel)) {
        for (const el of [e, ...e.querySelectorAll('*')]) {
          if (getComputedStyle(el).visibility === 'hidden' || el.matches('.birch')) continue; // the birch span is laid wider than the oval, which clips it
          if (own.some((o) => el.matches(o)) || (!el.children.length && el.tagName !== 'defs')) add(el.getBoundingClientRect());
        }
      }
      return u;
    };
    const part = svg.closest('.scene-part').getBoundingClientRect();
    const z = (e) => Number(getComputedStyle(e).zIndex) || 0;
    const layerUnder = z(svg) < z(document.querySelector('.intro')) && getComputedStyle(document.querySelector('.intro')).position !== 'static';
    return {
      ctm: { a: m.a, d: m.d, e: m.e, f: m.f + scrollY },
      perch: box(pb), fly: box(fb, 8, -30), perchPts: cloud('sc-pb'), flyPts: cloud('sc-fb', 8, -30),
      home: g.dataset.home.split(' ').map(Number), away: g.dataset.away.split(' ').map(Number),
      cards: { sitter: union('.sitter', ['.gilt-oval']), frame2: union('.gm-frame2', ['.gm-frame2']), story: union('.story', ['.story']) },
      layerUnder,
      hit: (() => { const h = g.querySelector('.wb-hit'); return ['x', 'y', 'width', 'height'].map((n) => Number(h.getAttribute(n))); })(),
      /* the real thing: hit-test a 3px grid over the tap target (scrolled into view) with the bird moved to each perch,
         and count the points where the element on top IS the tap target (not the sitter, the frame or the story) */
      taps: (() => {
        const h = g.querySelector('.wb-hit'), saved = g.style.transform, out = {};
        const home = g.dataset.home.split(' ').map(Number), away = g.dataset.away.split(' ').map(Number);
        for (const [k, sp] of [['home', home], ['away', away]]) {
          g.style.transform = `translate(${sp[0]}px, ${sp[1]}px)`;
          const r = h.getBoundingClientRect();
          window.scrollTo(0, Math.max(0, r.top + scrollY - innerHeight / 2));
          const r2 = h.getBoundingClientRect();
          let total = 0, hit = 0, run = 0, runMax = 0;
          for (let y = r2.top + 1; y < r2.bottom; y += 3) {
            run = 0;
            for (let x = r2.left + 1; x < r2.right; x += 3) {
              total++;
              if (document.elementFromPoint(x, y) === h) { hit++; run += 3; runMax = Math.max(runMax, run); } else run = 0;
            }
          }
          out[k] = { share: hit / total, run: runMax, w: r2.width, h: r2.height };
        }
        g.style.transform = saved;
        window.scrollTo(0, 0);
        return out;
      })(),
      part: [part.left, part.top + scrollY, part.right, part.bottom + scrollY],
    };
  });
  // drop every rect that lies inside another (the oval's painted leaves inside its own box)
  for (const k of Object.keys(m.cards)) {
    const rs = m.cards[k];
    m.cards[k] = rs.filter((r, i) => !rs.some((o, j) => j !== i && o[0] <= r[0] && o[1] <= r[1] && o[2] >= r[2] && o[3] >= r[3] && (o[0] < r[0] || o[1] < r[1] || o[2] > r[2] || o[3] > r[3] || j < i)));
  }
  return m;
}

/** Page-space points of the bird's outline at drawing point p (pose: perched or flying), facing f, scale s. */
function birdBox(M, which, p) {
  const { a, d, e, f } = M.ctm;
  return (which === 'perch' ? M.perchPts : M.flyPts).map(([lx, ly]) => [(p.x + p.f * p.s * lx) * a + e, (p.y + p.s * ly) * d + f]);
}
/** Smallest gap (px) between the bird's outline and any card (negative = overlap) and the part's edges. */
function clearance(M, pts) {
  let gap = Infinity, who = '';
  for (const [k, cs] of Object.entries(M.cards)) for (const c of cs) {
    for (const [x, y] of pts) {
      const g = Math.max(c[0] - x, x - c[2], c[1] - y, y - c[3]);
      if (g < gap) { gap = g; who = k; }
    }
  }
  const P = M.part;
  for (const [x, y] of pts) {
    const inside = Math.min(x - P[0], P[2] - x, y - P[1], P[3] - y);
    if (inside < gap) { gap = inside; who = 'part edge'; }
  }
  return { gap, who };
}
const pose = (M, spot, flying) => ({ x: spot[0], y: spot[1], s: spot[2], f: spot[3], flying });
function worst(M, home, away) {
  let w = { gap: Infinity, who: '', at: '' };
  const consider = (label, c) => { if (c.gap < w.gap) w = { ...c, at: label }; };
  consider('home perched', clearance(M, birdBox(M, 'perch', pose(M, home))));
  consider('away perched', clearance(M, birdBox(M, 'perch', pose(M, away))));
  for (const [lab, from, to] of [['out', home, away], ['back', away, home]]) {
    arc(from, to).forEach((p, i) => consider(`flying ${lab} #${i}`, clearance(M, birdBox(M, 'fly', p))));
  }
  return w;
}

const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const M = {};
let bad = 0;
for (const scheme of CHECK ? ['light', 'dark'] : ['light']) for (const sz of SIZES) {
  const { context, page } = await open(browser, scheme, sz);
  const m = await measure(page, sz);
  await context.close();
  if (!CHECK) { M[sz.id] = m; continue; }
  const perchGap = Math.min(clearance(m, birdBox(m, 'perch', pose(m, m.home))).gap, clearance(m, birdBox(m, 'perch', pose(m, m.away))).gap);
  const w = worst(m, m.home, m.away);
  const vis = Math.min(visible(m, birdBox(m, 'perch', pose(m, m.home))), visible(m, birdBox(m, 'perch', pose(m, m.away))));
  let ok, line;
  if (sz.variant === 'wide') {
    // the wide wall has open wall: both perches clear by the pad, the whole flight clear of every card
    const tapH = m.taps.home;
    ok = perchGap >= PAD && w.gap >= 0 && m.layerUnder && tapH.share >= 0.6;
    line = `perched ${Math.round(perchGap)}px clear (pad ${PAD}), flight tightest ${Math.round(w.gap)}px to ${w.who} at ${w.at}; tap target open ${Math.round(tapH.share * 100)}%`;
  } else {
    // a phone's cards cover the wall edge to edge, so no perch is wholly clear: the layer lies under
    // the cards (nothing is painted over one) and the perched bird stays mostly in the open
    const tapH = m.taps.home, tapA = m.taps.away;
    const tapOk = [tapH, tapA].every((t) => t.share >= 0.6 && t.run >= 24);
    ok = vis >= 0.75 && m.layerUnder && tapOk;
    line = `perched outline ${Math.round(vis * 100)}% in the open (needs 75%), nearest card ${Math.round(perchGap)}px; tap target ${Math.round(tapH.w)}x${Math.round(tapH.h)}px, open ${Math.round(tapH.share * 100)}% (run ${Math.round(tapH.run)}px) at home, ${Math.round(tapA.share * 100)}% (run ${Math.round(tapA.run)}px) away (needs 60% and a 24px run)`;
  }
  if (!m.layerUnder) line += ' [bird layer is NOT under the intro]';
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${scheme} ${sz.id} ${sz.variant}: ${line}`);
}
await browser.close();
if (CHECK) process.exit(bad ? 1 : 0);

/* ---- search ---- */
const spots = [];
scene.limbs.forEach((pts, li) => {
  // dense along the centreline, off the collar (the trunk), off the thin tip
  const n = pts.length;
  for (let k = Math.floor(n * Number(arg('from', 0.3))); k < Math.floor(n * 0.9); k++) {
    const [x0, y0] = pts[k], [x1, y1] = pts[k + 1] ?? pts[k];
    for (let q = 0; q < 4; q++) spots.push({ li, x: x0 + (x1 - x0) * q / 4, y: y0 + (y1 - y0) * q / 4 });
  }
});
if (process.argv.includes('--debug')) for (const id of Object.keys(M)) {
  const m = M[id];
  const n = (sc) => spots.filter((sp) => [1, -1].some((f) => clearance(m, birdBox(m, 'perch', pose(m, [sp.x, sp.y, sc, f]))).gap >= PAD)).length;
  console.log(id, JSON.stringify({ ctm: m.ctm, cards: Object.fromEntries(Object.entries(m.cards).map(([k, v]) => [k, v.map((r) => r.map(Math.round))])), part: m.part, clear05: n(0.5), clear1: n(1) }));
}
if (process.argv.includes('--debug')) process.exit(0);
const SAME = process.argv.includes('--samelimb');
const LIMBS = arg('limbs', '').split(',').filter(Boolean).map(Number);
/** Fraction of the bird's outline points that lie in the open (not within a card rect, not off the part). */
function visible(M, pts) {
  const P = M.part;
  const hid = pts.filter(([x, y]) => x < P[0] || x > P[2] || y < P[1] || y > P[3] || Object.values(M.cards).some((cs) => cs.some((c) => x >= c[0] && x <= c[2] && y >= c[1] && y <= c[3]))).length;
  return 1 - hid / pts.length;
}
if (process.argv.includes('--vis')) {
  const sc = Number(arg('scale', 0.5));
  for (const sp of spots.filter((q) => !LIMBS.length || LIMBS.includes(q.li))) for (const f of [1, -1]) {
    const v = ['390', '820'].map((id) => visible(M[id], birdBox(M[id], 'perch', pose(M[id], [sp.x, sp.y, sc, f]))));
    if (Math.min(...v) > Number(arg('minvis', 0.6))) console.log(sp.li, Math.round(sp.x), Math.round(sp.y), f, v.map((x) => x.toFixed(2)).join(' '));
  }
  process.exit(0);
}
const SCALES = { wide: [[1.1, 1.0]], phone: [[0.5, 0.5], [0.6, 0.55], [0.7, 0.65], [0.8, 0.75]] };
const ARC_PAD = Number(arg('arcpad', 0));
for (const variant of ['wide', 'phone']) {
  const only = arg('ids', '').split(',').filter(Boolean);
  const ids = SIZES.filter((s) => s.variant === variant && (!only.length || only.includes(s.id))).map((s) => s.id);
  for (const sc of SCALES[variant]) {
    const cand = [];
    for (const sp of spots.filter((q) => !LIMBS.length || LIMBS.includes(q.li))) for (const f of [1, -1]) cand.push({ ...sp, f });
    const cl = (spot, k) => Math.min(...ids.map((id) => clearance(M[id], birdBox(M[id], 'perch', pose(M[id], [spot.x, spot.y, sc[k], spot.f]))).gap));
    const homes = cand.map((c) => ({ ...c, g: cl(c, 0) })).filter((c) => c.g >= PAD);
    const aways = cand.map((c) => ({ ...c, g: cl(c, 1) })).filter((c) => c.g >= PAD);
    const lst = (a) => JSON.stringify([...new Set(a.map((h) => `${h.li}:${Math.round(h.x)},${Math.round(h.y)}/${h.f}`))]);
    if (process.argv.includes('--list')) console.log('homes', lst(homes), 'aways', lst(aways));
    const out = [];
    const MIND = Number(arg("mind", 100));
    for (const h of homes) for (const a of aways) {
      if (h.li === a.li && !SAME) continue;
      const dist = Math.hypot(h.x - a.x, h.y - a.y);
      if (dist < MIND || dist > 460) continue;
      let w = Infinity;
      for (const id of ids) w = Math.min(w, worst(M[id], [h.x, h.y, sc[0], h.f], [a.x, a.y, sc[1], a.f]).gap);
      if (w >= ARC_PAD) out.push({ home: [Math.round(h.x), Math.round(h.y), sc[0], h.f], away: [Math.round(a.x), Math.round(a.y), sc[1], a.f], limbs: [h.li, a.li], dist: Math.round(dist), clear: Math.round(w), pc: Math.round(Math.min(h.g, a.g)) });
    }
    out.sort((p, q) => q.pc + q.clear - (p.pc + p.clear));
    console.log(`
${variant} scale ${sc} (${ids.join(', ')}): ${homes.length} homes, ${aways.length} aways, ${out.length} pairs (perch>=${PAD}, arc>=${ARC_PAD})`);
    for (const o of out.slice(0, Number(arg("top", 6)))) console.log(JSON.stringify(o));
  }
}
