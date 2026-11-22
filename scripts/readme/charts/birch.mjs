// One birch language for the README: the repository map's trunk and the timeline's
// trunk are drawn from the same parts. A pale, slightly tapering trunk with a gently
// irregular edge, sparse dark lenticels in paired dashes, a scar under the biggest
// branches, and the brand's chevron as the "eye" of each junction (the mark is
// a stem with chevron branches, see assets/brand and public/favicon.svg).
import { f1, rng } from './geometry.mjs';

/** Smooth closed path through points (Catmull-Rom to cubic Bezier). */
function smoothClosed(pts) {
  const n = pts.length;
  let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f1(c1[0])} ${f1(c1[1])} ${f1(c2[0])} ${f1(c2[1])} ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return d + 'Z';
}

/**
 * Outline of a vertical trunk centred on cx, from top to bottom, width w: narrower
 * at the top by `taper`, edges wobbling a little, rounded ends.
 */
export function trunkOutline({ cx, top, bottom, w, seed, taper = 0.1 }) {
  const r = rng(seed);
  const n = Math.max(6, Math.round((bottom - top) / 38));
  const wAt = (t) => w * (1 - taper * (1 - t));
  const wob = () => (r() - 0.5) * 1.2;
  const left = [];
  const right = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const y = top + (bottom - top) * t;
    left.push([cx - wAt(t) / 2 + wob(), y]);
    right.push([cx + wAt(t) / 2 + wob(), y]);
  }
  const wt = wAt(0);
  const wb = wAt(1);
  const pts = [
    ...left,
    [cx - wb * 0.3, bottom + 7],
    [cx + wb * 0.3, bottom + 7],
    ...right.reverse(),
    [cx + wt * 0.3, top - 8],
    [cx - wt * 0.3, top - 8],
  ];
  return smoothClosed(pts);
}

/**
 * Lenticels, kept quiet: one pair of horizontal dashes (a long one, a shorter
 * partner a few px below and offset) about every 70 to 90 units of trunk, thin and
 * pale, so the chevron at each junction reads alone. No extra density near a
 * junction; `clear` units either side of every `junctions` y (and every `skip`
 * range) stay empty. A few heavier pairs gather in tight "scar" bands (three
 * pairs 10 to 14 units apart), at most 15% of all pairs; pass `scars: 0` to leave
 * the trunk with no heavy pairs at all.
 */
export function lenticels({ cx, top, bottom, w, junctions = [], seed, skip = [], clear = 14, scars = 2 }) {
  const r = rng(seed);
  const free = (y) => !junctions.some((j) => Math.abs(j - y - 3) < clear + 3) && !skip.some(([a, b]) => y + 6 > a && y < b);
  const pair = (y) => {
    const long = w * (0.45 + r() * 0.4);
    const short = w * (0.2 + r() * 0.2);
    const x1 = cx - w / 2 + 5 + r() * (w - 10 - long);
    const x2 = cx - w / 2 + 5 + r() * (w - 10 - short);
    return `M${f1(x1)} ${f1(y)}h${f1(long)}M${f1(x2)} ${f1(y + 5.5)}h${f1(short)}`;
  };
  let thin = '';
  let n = 0;
  const ys = [];
  for (let y = top + 22 + r() * 30; y < bottom - 24; y += 70 + r() * 20) {
    if (!free(y)) continue;
    thin += pair(y);
    ys.push(y);
    n++;
  }
  let heavy = '';
  let left = Math.min(scars * 3, Math.floor(n * 0.1765));
  const span = bottom - top;
  for (let b = 0; b < scars && left > 0; b++) {
    let y0 = top + span * (0.27 + 0.4 * b) + r() * 30;
    const count = Math.min(3, left);
    const gaps = [12, 11, 13];
    // slide the band until all its pairs are clear of junctions and of the thin pairs
    for (let tries = 0; tries < 60; tries++) {
      const yy = [0, 1, 2].slice(0, count).map((i) => y0 + gaps.slice(0, i).reduce((a, g2) => a + g2, 0));
      if (yy.every((y) => free(y) && ys.every((t) => Math.abs(t - y) > 12))) break;
      y0 += 8;
    }
    for (let i = 0; i < count; i++) heavy += pair(y0 + gaps.slice(0, i).reduce((a, g2) => a + g2, 0));
    left -= count;
  }
  return { thin, heavy };
}

/** A branch scar: the chevron the branch left behind, a little below the junction. */
export function scar(x, y, mark, s = 1) {
  return `<path d="M${f1(x - 7 * s)} ${f1(y)}L${f1(x)} ${f1(y + 6 * s)}L${f1(x + 7 * s)} ${f1(y)}" fill="none" stroke="${mark}" stroke-opacity=".62" stroke-width="${f1(2.4 * s)}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

/** The junction eye: a dark knot with the brand chevron cut into it, pointing out of the trunk. */
export function eye(x, y, dir, mark, field, s = 1) {
  const kx = 8.5 * s;
  const ky = 5.8 * s;
  return (
    `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(kx)}" ry="${f1(ky)}" fill="${mark}"/>` +
    `<path d="M${f1(x - dir * 3.4 * s)} ${f1(y - 3.6 * s)}L${f1(x + dir * 3.8 * s)} ${f1(y)}L${f1(x - dir * 3.4 * s)} ${f1(y + 3.6 * s)}" fill="none" stroke="${field}" stroke-width="${f1(1.8 * s)}" stroke-linecap="round" stroke-linejoin="round"/>`
  );
}

/** SMIL clip that grows a region from its base upward (or from its top downward) once, then holds. */
export function growClip(id, { x, y, w, h, up = true, dur = 1.4, begin = 0.05 }) {
  const from = up ? y + h : y;
  return (
    `<clipPath id="${id}"><rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}">` +
    (up
      ? `<animate attributeName="y" from="${f1(from)}" to="${f1(y)}" dur="${dur}s" begin="${begin}s" calcMode="spline" keySplines=".45 .05 .3 1" keyTimes="0;1" fill="freeze"/>`
      : '') +
    `<animate attributeName="height" from="0" to="${f1(h)}" dur="${dur}s" begin="${begin}s" calcMode="spline" keySplines=".45 .05 .3 1" keyTimes="0;1" fill="freeze"/>` +
    '</rect></clipPath>'
  );
}
