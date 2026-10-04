/**
 * Draws the grandmillennial toile (Stage 5, proof a1) as SVG strokes.
 *
 * Written 10-03-26. Usage: node scripts/themes/proofs/stage5-gm-toile/build-toile.mjs
 * Output (beside this file):
 *   toile-defs.svg.html   the markup for parts/Defs.astro: vignette <g> ids
 *                         plus <pattern id="gm-toile">. Drops in unchanged.
 *   toile-preview.html    the pattern tiled on a plain page, for a quick look.
 *   toile-stats.json      byte size (raw and gzip) of the markup.
 *
 * Everything is a stroke: no fills except the one ground rect. Tone comes from
 * hatching density (engraver's hatching, leaf ticks that thicken toward the
 * shaded side). Seeded, so a run is repeatable.
 *
 * Layout: a TW x TH tile, two columns that sit half a row apart (a half
 * drop), three islands to a column, bare ground and small fillers between.
 * Anything that crosses a tile edge is drawn again one tile over, so the
 * pattern has no seam. Vignettes are drawn once and reused with a scale and a
 * mirror, so the markup stays small.
 */
import { writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Path, hatch, canopy, island, spray, birch, bigTree, flyer, rr, f } from './draw-lib.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

/** A figure in a bonnet and a long gown, holding a letter or a parasol. */
function figure(fine, bold, x, prop) {
  const g = 0;
  // gown: a bell with long folds, shaded on the right
  bold.M(x - 4, -28).Q(x - 12, -14, x - 17, g).L(x + 15, g).Q(x + 11, -14, x + 5, -28);
  bold.M(x - 4, -28).Q(x, -31, x + 5, -28);
  hatch(fine, [[x + 1, -26], [x + 6, -26], [x + 14, g - 1], [x - 2, g - 1]], 78, (u) => 1.8 + u * 0.3);
  fine.M(x - 7, -22).Q(x - 11, -11, x - 13, -2);
  fine.M(x - 2, -24).Q(x - 3, -12, x - 4, -2);
  fine.M(x - 14, -3).Q(x - 8, -5, x - 2, -3).Q(x + 4, -1, x + 10, -3);
  // torso, neck, head with a bonnet and a curl
  bold.M(x - 4, -28).Q(x - 5, -38, x - 2, -42);
  bold.M(x + 5, -28).Q(x + 6, -37, x + 3, -42);
  bold.M(x - 2, -42).Q(x + 0.5, -44, x + 3, -42);
  bold.M(x + 0.5, -44).l(0, -2);
  bold.M(x - 5, -49).Q(x - 6, -56, x + 0.5, -58).Q(x + 7, -58, x + 7, -51);
  bold.M(x - 5, -49).Q(x - 2, -46, x + 3, -47);
  fine.M(x - 4, -52).Q(x - 2, -55, x + 3, -55);
  fine.M(x - 3, -50).l(1, 3); fine.M(x - 1, -49).l(0.5, 2);
  bold.M(x + 7, -51).Q(x + 12, -52, x + 11, -47).Q(x + 9, -45, x + 6, -47);
  fine.M(x + 5, -57).Q(x + 8, -60, x + 10, -58);
  if (prop === 'letter') {
    bold.M(x + 3, -36).Q(x + 12, -34, x + 15, -42);
    bold.M(x - 3, -35).Q(x + 4, -29, x + 15, -34);
    bold.poly([[x + 11, -49], [x + 22, -47], [x + 21, -35], [x + 10, -37]], true);
    fine.seg(x + 12, -45, x + 20, -43.5); fine.seg(x + 12, -42, x + 20, -40.5);
    fine.seg(x + 11.8, -39.5, x + 17, -38.5);
    fine.M(x + 21, -47).l(2, 1);
  } else {
    // a parasol held up and a little behind: handle, dome, scalloped edge, ribs
    bold.M(x + 3, -36).Q(x + 10, -38, x + 14, -44);
    bold.M(x + 14, -44).L(x + 14, -64);
    const rimY = -64, apex = [x + 14, -82];
    const pts = [-26, -13, 0, 13, 26].map((d) => [x + 14 + d, rimY + (Math.abs(d) > 20 ? 3 : 0)]);
    bold.M(...pts[0]).Q(x - 4, -80, ...apex).Q(x + 32, -80, ...pts[4]);
    for (let i = 0; i < 4; i++) {
      const a = pts[i], b = pts[i + 1];
      bold.M(...a).Q((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 5, ...b);
    }
    for (const p of pts.slice(1, 4)) fine.M(...apex).Q((apex[0] + p[0]) / 2, (apex[1] + p[1]) / 2 - 1, ...p);
    fine.M(x + 14, -82).l(0, -4);
    hatch(fine, [[x + 14, -80], [x + 38, -66], [x + 40, -64], [x + 24, -64]], -30, 1.7, { trim: 0.2 });
  }
}

/** A garden bench, front on: slatted back, seat seen a little from above, double legs. */
function bench(fine, bold, bx, w, arms = false) {
  const a = bx - w / 2, z = bx + w / 2;
  bold.poly([[a, -17], [z, -17], [z + 5, -13], [a + 5, -13]], true);
  for (const lx of [a + 5, z - 3]) { bold.seg(lx, -13, lx, 0); bold.seg(lx + 3, -13, lx + 3, 0); }
  bold.seg(a + 1, -17, a + 1, -38); bold.seg(z, -17, z, -38);
  bold.seg(a - 1, -38, z + 2, -38); bold.seg(a - 1, -34, z + 2, -34);
  const n = Math.round(w / 8);
  for (let i = 0; i <= n; i++) fine.seg(a + 1 + (i * (w - 1)) / n, -34, a + 1 + (i * (w - 1)) / n, -17);
  fine.seg(a + 6, -15.5, z - 2, -15.5);
  if (arms) { bold.M(a + 1, -26).l(-3, 0).l(0, 9); bold.M(z, -26).l(3, 0).l(0, 9); }
  for (let k = 0; k < 4; k++) fine.seg(a + 8 + k * 2, 2 + k * 1.6, z + 10 - k * 3, 2 + k * 1.6);
}

/** A: birch grove with a bench. */
function grove() {
  const fine = new Path(), bold = new Path();
  island(fine, bold, 100, 14);
  const trees = [[-74, 114, 9, -3, 3], [-54, 88, 7, 4, 2], [70, 120, 9, 3, 4], [88, 82, 6.5, -2, 2]];
  for (const [x, h, w, lean, br] of trees) birch(fine, bold, x, x < 0 ? 0 : 1, h, w, lean, { branches: br, crown: false });
  canopy(fine, bold, -70, -116, 40, 20, { airy: 0.6 });
  canopy(fine, bold, 74, -122, 42, 22, { airy: 0.6 });
  canopy(fine, bold, -52, -88, 18, 10, { airy: 0.7, scallop: 6, tick: 3.8 });
  canopy(fine, bold, 90, -86, 17, 10, { airy: 0.7, scallop: 6, tick: 3.8 });
  // tree shadows falling right
  for (const tx of [-74, 70]) for (let k = 0; k < 3; k++) fine.seg(tx + 4, 2 + k * 1.8, tx + 22 - k * 4, 2 + k * 1.8);
  bench(fine, bold, -2, 56);
  // a watering can beside the bench, wild flowers
  bold.M(34, 0).l(0, -10).l(10, 0).l(0, 10);
  bold.M(44, -8).l(9, -7);
  fine.seg(35, -6, 43, -6); fine.seg(35, -3, 43, -3);
  spray(fine, -28, 0, 15, -1.6, { leaves: 4, side: 2.4 });
  spray(fine, 14, 1, 12, -1.45, { leaves: 3, side: 2.2 });
  flyer(fine, -6, -92, 1.1); flyer(fine, 14, -104, 0.8);
  return { fine, bold, w: 210, h: 150 };
}

/** E: a birch cluster, a bench set aside and a sundial. */
function grove2() {
  const fine = new Path(), bold = new Path();
  island(fine, bold, 100, 13);
  const trees = [[-80, 124, 10, -4, 3], [-62, 98, 7.5, 3, 2], [-46, 112, 8.5, 5, 3]];
  for (const [x, h, w, lean, br] of trees) birch(fine, bold, x, 0, h, w, lean, { branches: br, crown: false });
  canopy(fine, bold, -62, -118, 50, 24, { airy: 0.6 });
  for (const tx of [-80, -46]) for (let k = 0; k < 3; k++) fine.seg(tx + 4, 2 + k * 1.8, tx + 24 - k * 4, 2 + k * 1.8);
  bench(fine, bold, -8, 40, true);
  bold.poly([[2, -17], [10, -17], [11, -20], [3, -20]], true);
  fine.seg(3.5, -18.5, 9, -18.5);
  // a sundial on a baluster
  const sx = 64;
  bold.poly([[sx - 12, 0], [sx - 12, -6], [sx + 12, -6], [sx + 12, 0]]);
  bold.M(sx - 7, -6).C(sx - 4, -12, sx - 4, -22, sx - 7, -30);
  bold.M(sx + 7, -6).C(sx + 4, -12, sx + 4, -22, sx + 7, -30);
  bold.M(sx - 14, -34).Q(sx, -40, sx + 14, -34).Q(sx, -28, sx - 14, -34);
  bold.M(sx - 9, -30).L(sx + 9, -30);
  fine.M(sx - 9, -34).Q(sx, -37, sx + 9, -34);
  bold.M(sx, -34).L(sx + 4, -44).L(sx + 6, -35);
  hatch(fine, [[sx + 2, -6], [sx + 12, -6], [sx + 12, 0], [sx + 2, 0]], 90, 1.6);
  spray(fine, 30, 0, 14, -1.5, { leaves: 3, side: 2.2 });
  spray(fine, 90, 1, 13, -1.7, { leaves: 3, side: 2.2 });
  flyer(fine, 20, -96, 1); flyer(fine, 36, -88, 0.75);
  return { fine, bold, w: 210, h: 138 };
}

/** B: a writing desk set out under a big tree. */
function desk() {
  const fine = new Path(), bold = new Path();
  island(fine, bold, 104, 15);
  bigTree(fine, bold, -52, 0, 96, 22);
  canopy(fine, bold, -36, -104, 56, 34, { airy: 0.95, scallop: 10 });
  const X = 18;
  bold.poly([[X - 6, -40], [X + 50, -40], [X + 60, -46], [X + 4, -46]], true);
  bold.seg(X - 6, -40, X - 6, -36); bold.seg(X + 50, -40, X + 50, -36);
  bold.seg(X - 6, -36, X + 50, -36);
  bold.poly([[X - 2, -36], [X + 46, -36], [X + 46, -27], [X - 2, -27]], true);
  fine.M(X + 20, -31.5).l(6, 0);
  for (const [a, b] of [[X - 4, X - 6], [X + 48, X + 50], [X + 7, X + 6], [X + 56, X + 57]]) {
    bold.seg(a, -27, b, 0); fine.seg(a + 2.2, -27, b + 2.2, 0);
  }
  bold.poly([[X + 8, -46.5], [X + 30, -46.5], [X + 34, -52], [X + 12, -52]], true);
  for (let k = 0; k < 3; k++) fine.seg(X + 12 + k * 1.2, -48.2 - k * 1.5, X + 29 + k * 1.2, -48.2 - k * 1.5);
  bold.M(X + 42, -46.5).l(0, -4).l(4, 0).l(0, 4);
  fine.seg(X + 43, -48, X + 45, -48);
  bold.M(X + 45, -51).Q(X + 49, -60, X + 47, -66);
  fine.M(X + 45, -52).Q(X + 49, -58, X + 44, -64);
  fine.M(X + 46, -52).Q(X + 50, -58, X + 47, -65);
  // a ladder-back chair drawn up to the desk
  const cx = -20;
  bold.poly([[cx - 8, -20], [cx + 10, -20], [cx + 13, -17], [cx - 5, -17]], true);
  bold.seg(cx - 5, -17, cx - 7, 0); bold.seg(cx + 13, -17, cx + 14, 0); bold.seg(cx + 10, -20, cx + 10, 0);
  bold.seg(cx - 8, -20, cx - 8, -46); bold.seg(cx + 10, -20, cx + 10, -46);
  for (const yy of [-42, -36, -30, -24]) bold.seg(cx - 8, yy, cx + 10, yy);
  fine.M(cx - 1, -42).l(0, 18);
  for (let k = 0; k < 4; k++) fine.seg(X - 4 + k * 3, 2 + k * 1.7, X + 62 - k * 4, 2 + k * 1.7);
  // shadow of the trunk and its hatching
  for (let k = 0; k < 3; k++) fine.seg(-40, 2 + k * 1.8, -18 - k * 4, 2 + k * 1.8);
  spray(fine, 82, 0, 16, -1.65, { leaves: 5, side: 2.6 });
  spray(fine, -90, 1, 12, -1.5, { leaves: 3, side: 2.2 });
  flyer(fine, 66, -80, 1); flyer(fine, 84, -90, 0.75);
  return { fine, bold, w: 210, h: 150 };
}

/** C: a small figure reading a letter, a ruined arch behind. */
function reader() {
  const fine = new Path(), bold = new Path();
  island(fine, bold, 92, 13);
  const px = 48;
  bold.poly([[px - 10, 0], [px - 10, -66], [px + 8, -66], [px + 8, 0]]);
  bold.M(px - 13, -66).l(0, -4).l(24, 0).l(0, 4);
  bold.seg(px - 13, -66, px + 11, -66);
  hatch(fine, [[px - 10, 0], [px - 10, -64], [px - 3, -64], [px - 3, 0]], 90, (u) => 1.6 + u * 0.4);
  for (let k = 1; k < 6; k++) fine.seg(px - 10, -k * 11, px + 8, -k * 11);
  bold.M(px - 10, -66).Q(px - 30, -92, px - 62, -80);
  bold.M(px - 13, -70).Q(px - 32, -98, px - 64, -87);
  bold.M(px - 24, -92).l(-3, 6); bold.M(px - 42, -90).l(-3, 7);
  bold.M(px - 62, -80).l(2, 8);
  fine.M(px - 18, -76).l(-2, 5); fine.M(px - 30, -85).l(-2, 5); fine.M(px - 50, -85).l(-2, 5);
  fine.M(px + 8, -2).Q(px + 14, -20, px + 6, -38);
  for (let k = 0; k < 7; k++) {
    const yy = -4 - k * 5.2, xx = px + 10 + Math.sin(k) * 3;
    fine.M(xx, yy).Q(xx + 3, yy - 2, xx + 5, yy + 1).Q(xx + 2, yy + 3, xx, yy);
  }
  figure(fine, bold, -14, 'letter');
  canopy(fine, bold, -62, -14, 18, 12, { airy: 0.9, scallop: 7, tick: 3.8 });
  bold.seg(18, 0, 18, -16); bold.seg(28, 0, 28, -16);
  bold.seg(14, -13, 32, -13); bold.seg(14, -8, 32, -8);
  spray(fine, -88, 0, 10, -1.55, { leaves: 3, side: 2 });
  flyer(fine, 8, -78, 0.9);
  return { fine, bold, w: 190, h: 105 };
}

/** F: a lady with a parasol walking by a birch and a clipped hedge. */
function parasol() {
  const fine = new Path(), bold = new Path();
  island(fine, bold, 92, 13);
  birch(fine, bold, -66, 0, 104, 8, -3, { branches: 3, crown: false });
  canopy(fine, bold, -64, -102, 36, 18, { airy: 0.6 });
  for (let k = 0; k < 3; k++) fine.seg(-62, 2 + k * 1.8, -44 - k * 4, 2 + k * 1.8);
  figure(fine, bold, 8, 'parasol');
  canopy(fine, bold, 62, -16, 22, 15, { airy: 0.95, scallop: 7, tick: 3.8 });
  for (let k = 0; k < 3; k++) fine.seg(54 + k * 3, 2 + k * 1.8, 82 - k * 5, 2 + k * 1.8);
  spray(fine, -26, 0, 12, -1.6, { leaves: 3, side: 2.2 });
  flyer(fine, 20, -92, 0.9);
  return { fine, bold, w: 180, h: 112 };
}

/** D: a garden urn on a plinth, overflowing. */
function urn() {
  const fine = new Path(), bold = new Path();
  island(fine, bold, 76, 12);
  bold.poly([[-24, 0], [-24, -7], [24, -7], [24, 0]]);
  bold.poly([[-19, -7], [-19, -14], [19, -14], [19, -7]]);
  hatch(fine, [[10, -7], [24, -7], [24, 0], [10, 0]], 90, 1.7);
  hatch(fine, [[8, -14], [19, -14], [19, -7], [8, -7]], 90, 1.7);
  // pedestal: a baluster, both sides drawn from one curve
  for (const sg of [-1, 1]) {
    bold.M(sg * 11, -14).C(sg * 9, -17, sg * 5.5, -20, sg * 5.5, -28)
      .C(sg * 5.5, -33, sg * 9.5, -34, sg * 8.5, -38)
      .C(sg * 8, -41, sg * 5, -41, sg * 9, -45);
  }
  bold.M(-9, -45).Q(0, -42, 9, -45);
  bold.M(-9, -45).Q(-24, -48, -21, -62).Q(-18, -74, -13, -76);
  bold.M(9, -45).Q(24, -48, 21, -62).Q(18, -74, 13, -76);
  bold.M(-16, -78).Q(0, -84, 16, -78); bold.M(-16, -78).Q(0, -72, 16, -78);
  for (let k = -3; k <= 3; k++) {
    const x0 = k * 5.2;
    fine.M(x0 * 0.55, -46).Q(x0 * 1.1, -58, x0 * 0.92, -72);
  }
  hatch(fine, [[8, -47], [20, -60], [17, -72], [8, -72]], 12, (u) => 1.6 + u * 0.5, { minLen: 1 });
  bold.M(-21, -62).C(-34, -62, -34, -72, -20, -73);
  bold.M(21, -62).C(34, -62, 34, -72, 20, -73);
  const base = [[-6, -80, -2.1], [0, -82, -1.57], [6, -80, -1.0], [-10, -78, -2.7], [10, -78, -0.45]];
  for (const [x, y, a] of base) spray(fine, x, y, rr(26, 38), a, { leaves: 6, side: 3.6 });
  spray(fine, -14, -76, 28, 2.5, { leaves: 5, side: 3 });
  spray(fine, 14, -76, 28, 0.65, { leaves: 5, side: 3 });
  for (const [bx, by] of [[-4, -118], [10, -106], [-20, -102], [20, -92]]) {
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * 6.2832, lx = bx + Math.cos(a) * 3.2, ly = by + Math.sin(a) * 3.2;
      fine.M(bx, by).Q(bx + Math.cos(a) * 2.5 - Math.sin(a) * 2, by + Math.sin(a) * 2.5 + Math.cos(a) * 2, lx, ly);
      fine.M(bx, by).Q(bx + Math.cos(a) * 2.5 + Math.sin(a) * 2, by + Math.sin(a) * 2.5 - Math.cos(a) * 2, lx, ly);
    }
  }
  for (const sx of [-1, 1]) {
    const cx = sx * 54;
    bold.M(cx - 8, 0).Q(cx - 10, -22, cx, -38).Q(cx + 10, -22, cx + 8, 0);
    for (let k = 0; k < 14; k++) {
      const yy = -4 - k * 2.6, hw = 8 * (1 - Math.abs(yy + 18) / 24);
      if (hw > 1) fine.seg(cx - hw + (sx > 0 ? 1 : 0), yy, cx + hw * (sx > 0 ? 0.9 : 0.4), yy);
    }
  }
  flyer(fine, 34, -104, 0.9);
  return { fine, bold, w: 150, h: 135 };
}

/** Fillers for the bare ground between islands. */
const fillers = {
  flock() {
    const fine = new Path(), bold = new Path();
    flyer(fine, 0, 0, 1.15); flyer(fine, 15, -9, 0.85); flyer(fine, -12, -12, 0.7);
    return { fine, bold, w: 40, h: 20 };
  },
  sprig() {
    const fine = new Path(), bold = new Path();
    spray(fine, 0, 0, 30, -1.1, { leaves: 6, side: 3.4 });
    spray(fine, 10, -12, 18, -0.2, { leaves: 4, side: 2.8 });
    spray(fine, 6, -8, 14, -2.1, { leaves: 3, side: 2.6 });
    return { fine, bold, w: 40, h: 40 };
  },
  butterfly() {
    const fine = new Path(), bold = new Path();
    bold.M(-5, -4).Q(-9, -8, -4, -9).Q(-2, -6, 0, 0).Q(-2, 3, -6, 3).Q(-9, 1, -5, -4);
    bold.M(5, -4).Q(9, -8, 4, -9).Q(2, -6, 0, 0).Q(2, 3, 6, 3).Q(9, 1, 5, -4);
    fine.M(0, -3).l(0, 7); fine.M(0, -3).l(-2, -4); fine.M(0, -3).l(2, -4);
    return { fine, bold, w: 20, h: 14 };
  },
  hedge() {
    const fine = new Path(), bold = new Path();
    island(fine, bold, 34, 7);
    canopy(fine, bold, 0, -10, 24, 10, { airy: 1, scallop: 6, tick: 3.8 });
    return { fine, bold, w: 70, h: 30 };
  },
  tuft() {
    const fine = new Path(), bold = new Path();
    island(fine, bold, 24, 6);
    spray(fine, -6, 0, 14, -1.7, { leaves: 3, side: 2.2 });
    spray(fine, 6, 0, 11, -1.35, { leaves: 3, side: 2 });
    return { fine, bold, w: 50, h: 20 };
  },
};

/* ---------- assembly ---------- */

const TW = 704, TH = 800;
const defs = [];
const size = {};
const emit = (id, v) => {
  size[id] = v;
  defs.push(`<g id="gm-toile-${id}"><path d="${v.bold.d()}"/><path stroke-width=".55" d="${v.fine.d()}"/></g>`);
};
const vignettes = { grove, desk, reader, urn, grove2, parasol };
for (const [k, fn] of Object.entries(vignettes)) emit(k, fn());
for (const [k, fn] of Object.entries(fillers)) emit(k, fn());

// [id, centre x, ground y, scale, mirror]; ground y may run past the tile and
// wraps. Column A sits on the left edge, column B half a row lower.
const items = JSON.parse(process.env.TOILE_ITEMS || 'null') || [
  ['grove', 14, 186, 1.12, 1],
  ['reader', 70, 466, 1.15, -1],
  ['desk', -6, 716, 1.05, 1],
  ['urn', 428, 312, 1.2, 1],
  ['grove2', 366, 592, 1.1, 1],
  ['parasol', 404, 866, 1.15, -1],
  // fillers in the bare ground
  ['flock', 188, 112, 1.0, 1],
  ['sprig', 246, 338, 1.2, -1],
  ['butterfly', 204, 262, 1.1, 1],
  ['hedge', 252, 396, 1.2, 1],
  ['flock', 212, 522, 1.1, -1],
  ['tuft', 244, 690, 1.1, 1],
  ['sprig', 590, 142, 1.1, 1],
  ['flock', 556, 384, 1.0, -1],
  ['butterfly', 604, 520, 1.2, -1],
  ['tuft', 566, 650, 1.1, -1],
  ['hedge', 630, 226, 1.2, -1],
  ['flock', 176, 760, 1.0, 1],
];

const useEls = [];
for (const [id, x, y, s, m] of items) {
  const v = size[id];
  const hw = (v.w / 2) * s, up = v.h * s;
  const yn = ((y % TH) + TH) % TH;
  for (const kx of [-1, 0, 1]) {
    const px = x + kx * TW;
    if (px + hw < 0 || px - hw > TW) continue;
    for (const ky of [-1, 0, 1]) {
      const py = yn + ky * TH;
      if (py + 16 * s < 0 || py - up > TH) continue;
      const t = `translate(${f(px)} ${f(py)})${s === 1 && m === 1 ? '' : ` scale(${f(s * m)} ${f(s)})`}`;
      useEls.push(`<use href="#gm-toile-${id}" transform="${t}"/>`);
    }
  }
}

const pattern =
  `<pattern id="gm-toile" width="${TW}" height="${TH}" patternUnits="userSpaceOnUse">` +
  `<rect class="k-toile-ground" width="${TW}" height="${TH}"/>` +
  `<g class="k-toile">${useEls.join('')}</g></pattern>`;

const markup = `<g class="k-toile" aria-hidden="true">${defs.join('')}</g>\n${pattern}\n`;
writeFileSync(join(HERE, 'toile-defs.svg.html'), markup);

const stats = {
  tile: `${TW} x ${TH}`,
  rawBytes: Buffer.byteLength(markup),
  gzipBytes: gzipSync(markup).length,
  uses: useEls.length,
};
writeFileSync(join(HERE, 'toile-layout.json'), JSON.stringify({ tile: [TW, TH], items: items.map(([id, x, y, s, m]) => ({ id, x, y, s, m, w: size[id].w, h: size[id].h })) }, null, 1) + '\n');
writeFileSync(join(HERE, 'toile-stats.json'), JSON.stringify(stats, null, 2) + '\n');

const preview = `<!doctype html><meta charset="utf-8"><style>
:root{--toile-ink:#7d1f2b;--toile-ground:#f7f0e1}
body{margin:0;background:var(--toile-ground)}
.k-toile{fill:none;stroke:var(--toile-ink);stroke-width:.9;stroke-linecap:round;stroke-linejoin:round}
.k-toile-ground{fill:var(--toile-ground);stroke:none}
</style>
<svg width="1440" height="900" xmlns="http://www.w3.org/2000/svg"><defs>${markup}</defs><rect width="100%" height="100%" fill="url(#gm-toile)"/></svg>`;
writeFileSync(join(HERE, 'toile-preview.html'), preview);
console.log(JSON.stringify(stats));
