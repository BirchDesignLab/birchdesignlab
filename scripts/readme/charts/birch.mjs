// One birch language for the README: the repository map's trunk and the timeline's
// trunk are drawn from the same parts. A pale, slightly tapering trunk with a gently
// irregular edge, dark lenticels in paired dashes with a rhythm (denser where a
// branch left), and the brand's chevron as the "eye" of each junction (the mark is
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
  const wob = () => (r() - 0.5) * 1.8;
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
 * Lenticels: pairs of horizontal dashes, a long one and a short one a few px
 * below it, in light and heavy weights. They come in bands and bunch up near each
 * junction y, with clear gaps (`skip`: [y0, y1] ranges to leave empty).
 */
export function lenticels({ cx, top, bottom, w, junctions = [], seed, skip = [] }) {
  const r = rng(seed);
  let thin = '';
  let heavy = '';
  let y = top + 16;
  while (y < bottom - 14) {
    const near = junctions.some((j) => Math.abs(j - y) < 34);
    if (!skip.some(([a, b]) => y > a && y < b)) {
      const room = w - 12;
      const a = Math.min(room, w * (0.34 + r() * 0.4));
      const b = Math.max(5, a * (0.35 + r() * 0.3));
      const x1 = cx - w / 2 + 6 + r() * (room - a);
      const x2 = cx - w / 2 + 6 + r() * (room - b);
      const d = `M${f1(x1)} ${f1(y)}h${f1(a)}M${f1(x2)} ${f1(y + 6.5)}h${f1(b)}`;
      if (r() < (near ? 0.4 : 0.14)) heavy += d;
      else thin += d;
    }
    y += near ? 12 + r() * 7 : 23 + r() * 19;
  }
  return { thin, heavy };
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
