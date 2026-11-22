// Small path and geometry helpers shared by render.mjs and the per-chart specs.
// Mermaid's dagre edges are M / L / C absolute paths (d3 curveBasis output), so
// that is all this parses.

export const f1 = (n) => {
  const s = (Math.round(n * 10) / 10).toFixed(1);
  return s.endsWith('.0') ? s.slice(0, -2) : s;
};

export function parsePath(d) {
  const segs = [];
  for (const m of d.matchAll(/([MLC])([^MLC]*)/g)) {
    const nums = m[2].split(/[\s,]+/).filter(Boolean).map(Number);
    const pts = [];
    for (let i = 0; i < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
    segs.push({ t: m[1], pts });
  }
  return segs;
}

export function pathToD(segs) {
  return segs.map((s) => s.t + s.pts.map(([x, y]) => `${f1(x)} ${f1(y)}`).join(' ')).join('');
}

export function startOf(segs) {
  return segs[0].pts[0];
}
export function endOf(segs) {
  const last = segs[segs.length - 1];
  return last.pts[last.pts.length - 1];
}

const unit = (dx, dy) => {
  const l = Math.hypot(dx, dy) || 1;
  return [dx / l, dy / l];
};

/** Direction the path is travelling when it arrives at its end. */
export function endTangent(segs) {
  const last = segs[segs.length - 1];
  const end = last.pts[last.pts.length - 1];
  let prev;
  if (last.t === 'C') {
    prev = last.pts[1];
    if (Math.hypot(end[0] - prev[0], end[1] - prev[1]) < 0.5) prev = last.pts[0];
  } else prev = segs.length > 1 ? endOf(segs.slice(0, -1)) : last.pts[0];
  return unit(end[0] - prev[0], end[1] - prev[1]);
}

/** Direction the path is travelling as it leaves its start. */
export function startTangent(segs) {
  const a = segs[0].pts[0];
  const s = segs[1];
  let next;
  if (s.t === 'C') {
    next = s.pts[0];
    if (Math.hypot(next[0] - a[0], next[1] - a[1]) < 0.5) next = s.pts[1];
  } else next = s.pts[0];
  return unit(next[0] - a[0], next[1] - a[1]);
}

/** Move the end point back along the tangent by `by` px (to tuck under an arrowhead). */
export function trimEnd(segs, by) {
  const out = segs.map((s) => ({ t: s.t, pts: s.pts.map((p) => [...p]) }));
  const last = out[out.length - 1];
  const [ux, uy] = endTangent(segs);
  const e = last.pts[last.pts.length - 1];
  e[0] -= ux * by;
  e[1] -= uy * by;
  return out;
}

export function trimStart(segs, by) {
  const out = segs.map((s) => ({ t: s.t, pts: s.pts.map((p) => [...p]) }));
  const [ux, uy] = startTangent(segs);
  out[0].pts[0][0] += ux * by;
  out[0].pts[0][1] += uy * by;
  return out;
}

function cubic(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return [0, 1].map((i) => u * u * u * p0[i] + 3 * u * u * t * p1[i] + 3 * u * t * t * p2[i] + t * t * t * p3[i]);
}

/** Polyline sample of a parsed path. */
export function sample(segs, perCurve = 24) {
  const pts = [segs[0].pts[0]];
  let cur = segs[0].pts[0];
  for (const s of segs.slice(1)) {
    if (s.t === 'L') {
      for (const p of s.pts) {
        pts.push(p);
        cur = p;
      }
    } else if (s.t === 'C') {
      for (let i = 0; i < s.pts.length; i += 3) {
        const [c1, c2, e] = [s.pts[i], s.pts[i + 1], s.pts[i + 2]];
        for (let k = 1; k <= perCurve; k++) pts.push(cubic(cur, c1, c2, e, k / perCurve));
        cur = e;
      }
    }
  }
  return pts;
}

export function polyLength(pts) {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return l;
}

/** Arrowhead triangle with its tip at `tip`, pointing along unit vector u. */
export function arrowD(tip, u, len = 10, half = 5.2) {
  const [ux, uy] = u;
  const bx = tip[0] - ux * len;
  const by = tip[1] - uy * len;
  const nx = -uy;
  const ny = ux;
  return `M${f1(tip[0])} ${f1(tip[1])}L${f1(bx + nx * half)} ${f1(by + ny * half)}L${f1(bx - nx * half)} ${f1(by - ny * half)}Z`;
}

/** Rounded rhombus path inscribed in the box (cx,cy,w,h). */
export function rhombusD(cx, cy, w, h, r = 9) {
  const pts = [
    [cx, cy - h / 2],
    [cx + w / 2, cy],
    [cx, cy + h / 2],
    [cx - w / 2, cy],
  ];
  let d = '';
  for (let i = 0; i < 4; i++) {
    const p = pts[i];
    const a = pts[(i + 3) % 4];
    const b = pts[(i + 1) % 4];
    const ua = unit(a[0] - p[0], a[1] - p[1]);
    const ub = unit(b[0] - p[0], b[1] - p[1]);
    const p1 = [p[0] + ua[0] * r, p[1] + ua[1] * r];
    const p2 = [p[0] + ub[0] * r, p[1] + ub[1] * r];
    d += `${i === 0 ? 'M' : 'L'}${f1(p1[0])} ${f1(p1[1])}Q${f1(p[0])} ${f1(p[1])} ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return d + 'Z';
}

/** Mulberry32, for the deterministic bark dashes. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
