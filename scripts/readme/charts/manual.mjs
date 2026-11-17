// Building blocks for the charts that are laid out by hand (specs.mjs). Mermaid
// still supplies the logical graph (every node, label, edge, class and subgraph
// comes from the README block); these helpers size the nodes with real font
// metrics, route the edges as smooth curves and measure the result.
import { f1, parsePath, pathToD, polyLength, sample } from './geometry.mjs';
import { width, wrapBalanced as wrap } from './textmetrics.mjs';

export const NORMAL = { T: [0, -1], B: [0, 1], L: [-1, 0], R: [1, 0] };

/** Sized nodes from the parsed graph. cfg: {head, body, edge, wrap, padX, padY, wrapFor?(id)} */
export function makeNodes(graph, cfg) {
  const nodes = new Map();
  for (const v of graph.vertices) {
    const sc = cfg.scaleFor?.(v.id) ?? 1;
    const base = cfg;
    cfg = sc === 1 ? base : { ...base, head: base.head * sc, body: base.body * sc };
    const logical = v.text.split(/<br\s*\/?>/i).map((s) => s.trim()).filter(Boolean);
    const maxW = cfg.wrapFor?.(v.id) ?? cfg.wrap;
    const heads = wrap('display', cfg.head, logical[0], maxW);
    const details = logical.slice(1).flatMap((l) => wrap('body', cfg.body, l, maxW));
    const lines = [...heads, ...details];
    const hLH = cfg.head * 1.22;
    const dLH = cfg.body * 1.3;
    const tw = Math.max(...heads.map((l) => width('display', cfg.head, l)), ...details.map((l) => width('body', cfg.body, l)));
    const th = heads.length * hLH + details.length * dLH;
    let w;
    let h;
    if (v.shape === 'rhombus') {
      const a = (tw / 2) * 1.5 + 14;
      const b = Math.max(th / 2 / (1 - tw / 2 / a) + 4, a * 0.5);
      w = a * 2;
      h = b * 2;
    } else {
      w = tw + cfg.padX * 2;
      h = th + cfg.padY * 2;
    }
    w = Math.max(w, cfg.minW ?? 0);
    nodes.set(v.id, { id: v.id, classes: v.classes, shape: v.shape, cx: 0, cy: 0, w, h, lines, headN: heads.length, scale: sc });
    cfg = base;
  }
  return nodes;
}

export const anchor = (n, side, off = 0) =>
  ({
    T: [n.cx + off, n.cy - n.h / 2],
    B: [n.cx + off, n.cy + n.h / 2],
    L: [n.cx - n.w / 2, n.cy + off],
    R: [n.cx + n.w / 2, n.cy + off],
  })[side];

/** Smooth cubic from a (leaving side sa) to b (arriving on side sb). */
export function smooth(a, sa, b, sb, k) {
  const dist = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const kk = k ?? Math.max(18, Math.min(130, dist * 0.45));
  const na = NORMAL[sa];
  const nb = NORMAL[sb];
  return [
    { t: 'M', pts: [a] },
    { t: 'C', pts: [[a[0] + na[0] * kk, a[1] + na[1] * kk], [b[0] + nb[0] * kk, b[1] + nb[1] * kk], b] },
  ];
}

/** Polyline through `pts` with rounded corners of radius r, as M / L / C. */
export function rounded(pts, r = 14) {
  const segs = [{ t: 'M', pts: [pts[0]] }];
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i];
    const a = pts[i - 1];
    const b = pts[i + 1];
    const la = Math.hypot(p[0] - a[0], p[1] - a[1]);
    const lb = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const rr = Math.min(r, la / 2, lb / 2);
    const p1 = [p[0] + ((a[0] - p[0]) / la) * rr, p[1] + ((a[1] - p[1]) / la) * rr];
    const p2 = [p[0] + ((b[0] - p[0]) / lb) * rr, p[1] + ((b[1] - p[1]) / lb) * rr];
    const m = 0.5523;
    segs.push({ t: 'L', pts: [p1] });
    segs.push({ t: 'C', pts: [[p1[0] + (p[0] - p1[0]) * m, p1[1] + (p[1] - p1[1]) * m], [p2[0] + (p[0] - p2[0]) * m, p2[1] + (p[1] - p2[1]) * m], p2] });
  }
  segs.push({ t: 'L', pts: [pts[pts.length - 1]] });
  return segs;
}

/** Point a fraction t (0..1) of the way along a path, by arc length. */
export function pointAt(segs, t) {
  const pts = sample(segs, 40);
  const total = polyLength(pts);
  let want = total * t;
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (want <= l || i === pts.length - 1) {
      const u = l ? Math.min(1, want / l) : 0;
      return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * u, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * u];
    }
    want -= l;
  }
  return pts[pts.length - 1];
}

/**
 * One model edge. o: {segs, at?: t of the label along the path, dx?, dy?}.
 * The label is wrapped to cfg.edgeWrap.
 */
export function makeEdge(ge, idx, o, cfg) {
  let label = null;
  if (ge.text) {
    const lines = ge.text
      .split(/<br\s*\/?>/i)
      .flatMap((l) => wrap('italic', cfg.edge, l.trim(), o.labelWrap ?? cfg.edgeWrap ?? 150));
    const w = Math.max(...lines.map((l) => width('italic', cfg.edge, l)));
    const h = lines.length * cfg.edge * 1.22;
    const [x, y] = pointAt(o.segs, o.at ?? 0.5);
    label = { lines, cx: x + (o.dx ?? 0), cy: y + (o.dy ?? 0), w, h };
  }
  return {
    id: `L_${ge.from}_${ge.to}_${idx}`,
    from: ge.from,
    to: ge.to,
    segs: o.segs,
    dotted: ge.dotted,
    markerEnd: o.arrow !== false,
    markerStart: ge.both,
    label,
  };
}

export function cluster(id, title, members, nodes, pad = { x: 22, top: 46, bottom: 22 }) {
  const ms = members.map((m) => nodes.get(m));
  const x0 = Math.min(...ms.map((n) => n.cx - n.w / 2)) - pad.x;
  const x1 = Math.max(...ms.map((n) => n.cx + n.w / 2)) + pad.x;
  const y0 = Math.min(...ms.map((n) => n.cy - n.h / 2)) - pad.top;
  const y1 = Math.max(...ms.map((n) => n.cy + n.h / 2)) + pad.bottom;
  return { id, x: x0, y: y0, w: x1 - x0, h: y1 - y0, lines: [title], classes: ['cluster'] };
}

/**
 * Translate everything so the content starts at (pad, pad), serialise the edge
 * paths and report the model in the same shape layout.mjs returns.
 */
export function finish({ nodes, clusters = [], edges }, pad = 10) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  const grow = (x, y) => {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  };
  for (const n of nodes) {
    grow(n.cx - n.w / 2, n.cy - n.h / 2);
    grow(n.cx + n.w / 2, n.cy + n.h / 2);
  }
  for (const c of clusters) {
    grow(c.x, c.y);
    grow(c.x + c.w, c.y + c.h);
    if (c.titlePos) {
      const tw = Math.max(...c.titlePos.lines.map((l) => width('display', 13, l, 0.2)));
      grow(c.titlePos.anchor === 'start' ? c.titlePos.x + tw : c.titlePos.x - tw, c.titlePos.y - 20);
    }
  }
  for (const e of edges) {
    for (const [x, y] of sample(e.segs, 8)) grow(x, y);
    if (e.label) {
      grow(e.label.cx - e.label.w / 2, e.label.cy - e.label.h / 2);
      grow(e.label.cx + e.label.w / 2, e.label.cy + e.label.h / 2);
    }
  }
  const dx = pad - x0;
  const dy = pad - y0;
  for (const n of nodes) {
    n.cx += dx;
    n.cy += dy;
  }
  for (const c of clusters) {
    c.x += dx;
    c.y += dy;
    if (c.titlePos) {
      c.titlePos.x += dx;
      c.titlePos.y += dy;
    }
  }
  for (const e of edges) {
    for (const s of e.segs) s.pts = s.pts.map(([x, y]) => [x + dx, y + dy]);
    e.d = pathToD(e.segs);
    delete e.segs;
    if (e.label) {
      e.label.cx += dx;
      e.label.cy += dy;
    }
  }
  return { width: x1 - x0 + pad * 2, height: y1 - y0 + pad * 2, nodes, clusters, edges };
}

export { f1, parsePath };
