// Motion helpers for the README charts. Every chart plays once on load, for
// about 2 to 4 seconds, and then stays still. The base styles in render.mjs are
// the FINAL frame: keyframes only describe where an element comes from, and
// animation-fill-mode both holds the first frame through the delay. So the still
// image alone (or prefers-reduced-motion, which turns animations off) is always a
// complete chart.
//
// CSS keyframes drive reveals, draws and rings. The travelling dots use SMIL
// animateMotion, which GitHub's <img> rendering plays in every browser and which
// does not depend on offset-path support inside SVG.
import { EASE } from './theme.mjs';
import { endOf, f1, parsePath, polyLength, rhombusD, sample, startOf } from './geometry.mjs';

export const KEYFRAMES = [
  '@keyframes bdl-fade{from{opacity:0}to{opacity:1}}',
  '@keyframes bdl-rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}',
  '@keyframes bdl-ring{0%{opacity:0;transform:scale(.98)}22%{opacity:.85}100%{opacity:0;transform:scale(1.13)}}',
].join('');

const r = (n) => Math.round(n * 100) / 100;

/** CSS for one animation on `sel`. */
export const anim = (sel, name, dur, delay, ease = EASE) =>
  `${sel}{animation:bdl-${name} ${r(dur)}s ${ease} ${r(delay)}s both}`;

/**
 * Stroke a path on, in pixels (never pathLength: an engine that ignores it would draw a stub).
 * `len` is the path's length in user units; the keyframes are named per `key`.
 */
export function drawCss(sel, key, len, dur, delay, ease = EASE) {
  const L = Math.ceil(len) + 2;
  return `${sel}{stroke-dasharray:${L};animation:bdl-d${key} ${r(dur)}s ${ease} ${r(delay)}s both}@keyframes bdl-d${key}{from{stroke-dashoffset:${L}}to{stroke-dashoffset:0}}`;
}

/** Draw an edge in: the path strokes on, then its arrowhead(s) and label fade in. */
export function edgeIn(e, delay, dur = 0.55) {
  const sel = `#${e.dom}`;
  let css = '';
  if (e.dotted) css += anim(`${sel} .el`, 'fade', dur, delay);
  else css += drawCss(`${sel} .el`, e.dom, e.len, dur, delay);
  css += anim(`${sel} .eh`, 'fade', 0.25, delay + dur * 0.8);
  if (e.label) css += anim(`${sel}l`, 'fade', 0.35, delay + dur * 0.5);
  return css;
}

export const nodeIn = (n, delay, dur = 0.55) => anim(`#n-${n.id}`, 'rise', dur, delay);

/**
 * Depth of each node along the flow: longest path from a source, ignoring back
 * edges (an edge into a node that is already on the current path).
 */
export function depths(nodes, edges) {
  const out = new Map([...nodes.keys()].map((k) => [k, []]));
  for (const e of edges) if (out.has(e.from)) out.get(e.from).push(e.to);
  const hasIn = new Set(edges.map((e) => e.to));
  const depth = new Map();
  const back = new Set();
  const walk = (id, d, stack) => {
    if ((depth.get(id) ?? -1) >= d) return;
    depth.set(id, d);
    stack.add(id);
    for (const to of out.get(id) ?? []) {
      if (stack.has(to)) {
        back.add(`${id}>${to}`);
        continue;
      }
      walk(to, d + 1, stack);
    }
    stack.delete(id);
  };
  for (const id of nodes.keys()) if (!hasIn.has(id)) walk(id, 0, new Set());
  for (const id of nodes.keys()) if (!depth.has(id)) walk(id, 0, new Set());
  return { depth, back };
}

/** Outline of a node's shape for a pulse ring. */
export function ringEl(n, id) {
  const pad = 3;
  const shape =
    n.shape === 'rhombus'
      ? `<path class="ring" id="r-${id}" d="${rhombusD(n.cx, n.cy, n.w + pad * 2, n.h + pad * 2)}"/>`
      : `<rect class="ring" id="r-${id}" x="${f1(n.cx - n.w / 2 - pad)}" y="${f1(n.cy - n.h / 2 - pad)}" width="${f1(n.w + pad * 2)}" height="${f1(n.h + pad * 2)}" rx="${n.shape === 'trunk' ? 26 : 14}"/>`;
  return shape;
}

export const RING_CSS = (glow) =>
  `.ring{fill:none;stroke:${glow};stroke-width:2.6;opacity:0;transform-box:fill-box;transform-origin:center}`;

/** A pulse on node `id` at `delay` seconds. */
export const pulse = (id, delay, dur = 0.95) => anim(`#r-${id}`, 'ring', dur, delay, 'ease-out');

/**
 * Chain edges into one continuous path (each next edge is joined with a line from
 * where the last one ended), and report when the dot reaches each node.
 */
export function chain(edgeList, speed) {
  let d = '';
  let dist = 0;
  const arrivals = [];
  let prevEnd = null;
  edgeList.forEach((e, i) => {
    const segs = parsePath(e.d);
    const start = startOf(segs);
    if (i === 0) d += `M${f1(start[0])} ${f1(start[1])}`;
    else {
      d += `L${f1(start[0])} ${f1(start[1])}`;
      dist += Math.hypot(start[0] - prevEnd[0], start[1] - prevEnd[1]);
    }
    for (const s of segs.slice(1)) d += s.t + s.pts.map(([x, y]) => `${f1(x)} ${f1(y)}`).join(' ');
    dist += polyLength(sample(segs));
    prevEnd = endOf(segs);
    arrivals.push({ node: e.to, at: dist / speed });
  });
  return { d, total: dist / speed, arrivals };
}

/**
 * A comet of three dots on a chained path: SMIL animateMotion, one run, then
 * gone (opacity returns to its base of 0).
 */
export function traveler(path, begin, dur, color) {
  const dots = [
    { r: 7.5, o: 1, lag: 0 },
    { r: 5.2, o: 0.55, lag: 0.06 },
    { r: 3.4, o: 0.3, lag: 0.12 },
  ];
  const fadeEnd = Math.min(0.12, 0.3 / dur);
  const out = dots
    .map(
      (k) =>
        `<circle class="tv" r="${k.r}" fill="${color}" opacity="0">` +
        `<animateMotion path="${path}" begin="${r(begin + k.lag)}s" dur="${r(dur)}s" calcMode="linear" rotate="0"/>` +
        `<animate attributeName="opacity" values="0;${k.o};${k.o};0" keyTimes="0;${r(fadeEnd)};${r(1 - fadeEnd)};1" begin="${r(begin + k.lag)}s" dur="${r(dur)}s"/>` +
        '</circle>',
    )
    .reverse()
    .join('');
  return `<g class="tvg">${out}</g>`;
}
