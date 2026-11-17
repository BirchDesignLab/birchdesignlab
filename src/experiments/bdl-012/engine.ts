/**
 * BDL-012 node-map engine. HTML boxes laid out on a fixed-width canvas
 * (1104px unless the spec says otherwise), SVG edges drawn after the boxes are
 * measured, and light travelling the lines.
 *
 * Boxes are measured, not assumed: a box that would overlap the one above it
 * in its column is pushed down, and edges are routed from the measured sizes.
 * That is what lets the Under the hood switch swap every box's text (and so
 * its height) and simply rebuild.
 *
 * Every coordinate in data.ts is in canvas pixels. The canvas reaches the
 * screen one of two ways:
 *   - Plain maps are scaled to fit their container with a CSS transform.
 *   - A camera map (opts.cam) sits in a viewport and carries a view
 *     { s, x, y }: pinch, drag, ctrl+wheel and double-tap move it, and
 *     frame() flies it to a set of boxes. On a wide screen the fitted view IS
 *     the whole map and the camera has nothing to do; on a phone it is how
 *     the map becomes readable at all.
 */
import { LANES, type Journey, type MapEdge, type MapNode, type MapSpec, type Side } from './data';

const svgNS = 'http://www.w3.org/2000/svg';
export const CANVAS_W = 1104;

export interface Env {
  /** The .dm root: the lane colours are custom properties on it. */
  root: HTMLElement;
  /** False for reduced motion and for ?still captures. */
  move: boolean;
  /** False only for ?still. Reduced motion drops the animation but keeps each step on screen long enough to read. */
  dwell: boolean;
  thumbs: Record<'wall' | 'strip', string[]>;
}

export interface View { s: number; x: number; y: number }
interface LiveNode extends MapNode { el: HTMLElement; h: number; last?: number }
interface Packet { c: SVGCircleElement; t: number; speed: number }
export interface LiveEdge {
  e: MapEdge;
  g: SVGGElement;
  base: SVGPathElement;
  /** A fat invisible stroke over the line, so a thin line can be hovered or tapped. Only on edges that say what they carry. */
  hit?: SVGPathElement;
  len: number;
  packets: Packet[];
  color: string;
  /** Midpoint of the curve, in canvas pixels. */
  mid: { x: number; y: number };
}
export interface LiveMap {
  el: HTMLElement;
  spec: MapSpec;
  W: number;
  H: number;
  nodes: Record<string, LiveNode>;
  edges: LiveEdge[];
  groups: HTMLElement[];
  glow: string;
  story: boolean;
  /** Drawn small on screen, so lines and lights are drawn heavy. */
  tiny: boolean;
  cam: boolean;
  view: View;
  /** True while the zoom is the visitor's own (pinch, drag, double-tap, the zoom button), false while a journey is steering. Only an owned zoom takes the finger away from the page. */
  owned: boolean;
  /** The scale at which the whole map fits its viewport, and the closest it zooms. */
  fitS: number;
  maxS: number;
  vw: number;
  vh: number;
  /** Fixed scale for a map that is placed rather than fitted (the hero). */
  scaleFn?: () => number;
  /** Off-screen maps are not ticked. */
  visible: boolean;
  io?: IntersectionObserver;
  onView?: (map: LiveMap) => void;
}

export interface BuildOpts {
  tech?: boolean;
  /** Title and chip only: no line of text, list, number or thumbnails. */
  compact?: boolean;
  /** Give the map a camera (see the header). */
  cam?: boolean;
  /** False drops the glow filter from the travelling lights; it is the costly part. */
  glow?: boolean;
  /** False draws the lines with nothing moving on them until something is sent. */
  ambient?: boolean;
  scaleFn?: () => number;
  onView?: (map: LiveMap) => void;
}

let env: Env;
export const maps: LiveMap[] = [];
export function setEnv(e: Env) { env = e; }
export const cssv = (v: string) => getComputedStyle(env.root).getPropertyValue(v).trim();

const svgEl = <K extends keyof SVGElementTagNameMap>(tag: K) => document.createElementNS(svgNS, tag) as SVGElementTagNameMap[K];

export function buildMap(el: HTMLElement, spec: MapSpec, opts: BuildOpts = {}): LiveMap {
  // Rebuilding into the same element replaces the old map, and keeps its view.
  const was = maps.findIndex((m) => m.el === el);
  const old = was >= 0 ? maps.splice(was, 1)[0] : undefined;
  old?.io?.disconnect();

  const W = spec.w ?? CANVAS_W;
  el.innerHTML = '';
  el.classList.remove('tiny', 'fly'); // the element outlives the map that set these
  el.style.width = W + 'px';
  const nodes: Record<string, LiveNode> = {};
  for (const h of spec.heads ?? []) {
    const d = document.createElement('div');
    d.className = 'colhead';
    Object.assign(d.style, { left: h.x + 'px', top: h.y + 'px', width: h.w + 'px' });
    d.textContent = h.text;
    el.appendChild(d);
  }
  for (const n of spec.nodes) {
    const d = document.createElement('div');
    d.className = 'node ' + (n.cls ?? '') + (opts.compact ? ' compact' : '');
    d.dataset.id = n.id;
    Object.assign(d.style, { left: n.x + 'px', top: n.y + 'px', width: n.w + 'px' });
    const lanes = [...new Set(spec.edges.filter((e) => e.from === n.id || e.to === n.id).map((e) => e.lane))];
    let html = lanes.length ? '<div class="lanes">' + lanes.map((l) => `<i style="background:var(${LANES[l].v})"></i>`).join('') + '</div>' : '';
    if (n.kick) html += `<div class="n-kick">${n.kick}</div>`;
    html += `<div class="n-title">${n.title}</div>`;
    if (!opts.compact) {
      if (n.big) html += `<div class="n-big">${n.big}</div>`;
      const sub = opts.tech ? n.tech : n.sub;
      if (sub) html += `<div class="n-sub${opts.tech ? ' is-tech' : ''}">${sub}</div>`;
      if (n.list) html += '<div class="n-list">' + n.list.map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('') + '</div>';
      const thumbs = n.thumbs ? env.thumbs[n.thumbs].slice(0, 7) : [];
      if (thumbs.length) html += '<div class="n-thumbs">' + thumbs.map((s) => `<img alt="" draggable="false" src="${s}">`).join('') + '</div>';
    }
    if (n.chip !== undefined) html += `<div class="n-chip">${n.chip}</div>`;
    d.innerHTML = html;
    if (spec.interactive && n.cls !== 'quiet') { d.tabIndex = 0; d.setAttribute('role', 'button'); }
    el.appendChild(d);
    nodes[n.id] = { ...n, el: d, h: 0 };
  }

  // Measure, then push down anything that would overlap the box above it in
  // its column. Thumbnails have fixed CSS sizes, so heights are right before
  // the images decode.
  for (const n of Object.values(nodes)) n.h = n.el.offsetHeight;
  const cols: Record<number, LiveNode[]> = {};
  for (const n of Object.values(nodes)) (cols[n.x] ??= []).push(n);
  for (const col of Object.values(cols)) {
    col.sort((p, q) => p.y - q.y);
    for (let k = 1; k < col.length; k++) {
      const above = col[k - 1];
      if (col[k].y < above.y + above.h + 18) {
        col[k].y = above.y + above.h + 18;
        col[k].el.style.top = col[k].y + 'px';
      }
    }
  }
  let maxY = Math.max(...Object.values(nodes).map((n) => n.y + n.h));
  const groups: HTMLElement[] = [];
  for (const g of spec.groups ?? []) {
    const ms = g.members.map((id) => nodes[id]);
    const x0 = Math.min(...ms.map((m) => m.x)) - g.pad, x1 = Math.max(...ms.map((m) => m.x + m.w)) + g.pad;
    const y0 = Math.min(...ms.map((m) => m.y)) - g.top, y1 = Math.max(...ms.map((m) => m.y + m.h)) + g.pad;
    const d = document.createElement('div');
    d.className = 'group';
    Object.assign(d.style, { left: x0 + 'px', top: y0 + 'px', width: x1 - x0 + 'px', height: y1 - y0 + 'px' });
    d.innerHTML = `<span class="g-label">${g.label}</span>`;
    el.appendChild(d);
    groups.push(d);
    maxY = Math.max(maxY, y1);
  }
  const H = maxY + 10;
  el.style.height = H + 'px';

  // Ports: spread every edge end along its side, ordered by where the other
  // end sits, so lines leaving one box never cross on the way out.
  type End = { i: number; end: 'a' | 'b'; other: LiveNode };
  const ends: Record<string, End[]> = {};
  const center = (n: LiveNode) => ({ x: n.x + n.w / 2, y: n.y + n.h / 2 });
  const sides = spec.edges.map((e) => ({ fs: e.fs ?? 'r', ts: e.ts ?? 'l' }) as { fs: Side; ts: Side });
  spec.edges.forEach((e, i) => {
    (ends[e.from + ':' + sides[i].fs] ??= []).push({ i, end: 'a', other: nodes[e.to] });
    (ends[e.to + ':' + sides[i].ts] ??= []).push({ i, end: 'b', other: nodes[e.from] });
  });
  const pts: Record<string, { x: number; y: number; side: Side }> = {};
  for (const [key, list] of Object.entries(ends)) {
    const [id, side] = key.split(':') as [string, Side];
    const n = nodes[id];
    const vertical = side === 'l' || side === 'r';
    list.sort((p, q) => (vertical ? center(p.other).y - center(q.other).y : center(p.other).x - center(q.other).x));
    list.forEach((p, k) => {
      const f = (k + 1) / (list.length + 1);
      let x: number, y: number;
      if (vertical) {
        const span = Math.min(n.h - 28, Math.max(26, list.length * 22));
        y = n.y + n.h / 2 - span / 2 + span * f;
        x = side === 'r' ? n.x + n.w : n.x;
      } else {
        const span = Math.min(n.w - 40, Math.max(40, list.length * 34));
        x = n.x + n.w / 2 - span / 2 + span * f;
        y = side === 'b' ? n.y + n.h : n.y;
      }
      pts[p.i + p.end] = { x, y, side };
    });
  }
  const dir: Record<Side, [number, number]> = { r: [1, 0], l: [-1, 0], t: [0, -1], b: [0, 1] };

  const useGlow = opts.glow !== false;
  const glow = `${el.id}-glow`;
  const svg = svgEl('svg');
  svg.setAttribute('class', 'edges' + (env.move && opts.ambient !== false ? ' live' : '') + (opts.ambient === false ? ' still' : ''));
  const defs = svgEl('defs');
  defs.innerHTML = `<filter id="${glow}" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  for (const [k, l] of Object.entries(LANES)) {
    for (const kind of ['end', 'start'] as const) {
      const m = svgEl('marker');
      m.setAttribute('id', `${el.id}-${k}-${kind}`);
      m.setAttribute('viewBox', '0 0 10 10');
      m.setAttribute('refX', kind === 'end' ? '8.5' : '1.5');
      m.setAttribute('refY', '5');
      m.setAttribute('markerWidth', '7');
      m.setAttribute('markerHeight', '7');
      m.setAttribute('orient', 'auto');
      const p = svgEl('path');
      p.setAttribute('d', kind === 'end' ? 'M0,0 L10,5 L0,10 z' : 'M10,0 L0,5 L10,10 z');
      p.setAttribute('style', `fill:var(${l.v})`);
      m.appendChild(p);
      defs.appendChild(m);
    }
  }
  svg.appendChild(defs);
  const edges: LiveEdge[] = [];
  spec.edges.forEach((e, i) => {
    const a = pts[i + 'a'], b = pts[i + 'b'];
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const reach = Math.max(28, Math.min(150, dist * 0.42));
    const [ax, ay] = dir[a.side], [bx, by] = dir[b.side];
    const c1 = { x: a.x + ax * reach, y: a.y + ay * reach };
    const c2 = { x: b.x + bx * reach, y: b.y + by * reach };
    const d = `M${a.x},${a.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${b.x},${b.y}`;
    const color = `var(${LANES[e.lane].v})`;
    const g = svgEl('g');
    g.setAttribute('class', 'edge');
    const base = svgEl('path');
    base.setAttribute('d', d);
    base.setAttribute('class', 'base');
    base.setAttribute('style', `stroke:${color}`);
    base.setAttribute('marker-end', `url(#${el.id}-${e.lane}-end)`);
    if (e.both) base.setAttribute('marker-start', `url(#${el.id}-${e.lane}-start)`);
    const flow = svgEl('path');
    flow.setAttribute('d', d);
    flow.setAttribute('class', 'flow');
    flow.setAttribute('style', `stroke:${color}`);
    g.appendChild(base);
    g.appendChild(flow);
    let hit: SVGPathElement | undefined;
    if (spec.interactive && e.carries) {
      hit = svgEl('path');
      hit.setAttribute('d', d);
      hit.setAttribute('class', 'hit');
      g.appendChild(hit);
    }
    svg.appendChild(g);
    const t = 0.5, u = 1 - t;
    const mid = {
      x: u ** 3 * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t ** 3 * b.x,
      y: u ** 3 * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t ** 3 * b.y,
    };
    edges.push({ e, g, base, hit, len: 0, packets: [], color: cssv(LANES[e.lane].v), mid });
    if (e.label) {
      const s = document.createElement('div');
      s.className = 'edge-label';
      Object.assign(s.style, { left: mid.x + (e.dx ?? 0) + 'px', top: mid.y + (e.dy ?? 0) + 'px', color });
      s.textContent = e.label;
      el.appendChild(s);
    }
  });
  el.appendChild(svg);

  // Light travelling the lines.
  for (const r of edges) {
    r.len = r.base.getTotalLength();
    if (opts.ambient === false) continue;
    const count = r.len > 260 ? 2 : 1;
    for (let k = 0; k < count; k++) {
      const c = svgEl('circle');
      c.setAttribute('r', '3.2');
      c.setAttribute('class', 'packet');
      if (useGlow) c.setAttribute('filter', `url(#${glow})`);
      c.setAttribute('style', `fill:${r.color}`);
      r.g.appendChild(c);
      const p: Packet = { c, t: k / count + Math.random() * 0.35, speed: 70 + Math.random() * 45 };
      r.packets.push(p);
      place(r, p);
    }
  }
  const map: LiveMap = {
    el, spec, W, H, nodes, edges, groups, glow, story: false, tiny: false,
    cam: !!opts.cam, view: old?.cam && opts.cam ? old.view : { s: 0, x: 0, y: 0 }, owned: !!(old?.cam && opts.cam && old.owned),
    fitS: old?.fitS ?? 0, maxS: 1.15, vw: old?.vw ?? 0, vh: old?.vh ?? 0,
    scaleFn: opts.scaleFn, visible: true, onView: opts.onView,
  };
  el.parentElement!.classList.toggle('cam', map.cam);
  maps.push(map);
  if ('IntersectionObserver' in window) {
    map.io = new IntersectionObserver(([en]) => { map.visible = en.isIntersecting; }, { rootMargin: '120px' });
    map.io.observe(el.parentElement!);
  }
  fit(map);
  return map;
}

function place(r: LiveEdge, p: Packet) {
  const pt = r.base.getPointAtLength((p.t % 1) * r.len);
  p.c.setAttribute('cx', String(pt.x));
  p.c.setAttribute('cy', String(pt.y));
}

/** Heavy lines and lights for a map that is small on screen. */
function setTiny(map: LiveMap, tiny: boolean) {
  if (map.tiny === tiny) return;
  map.tiny = tiny;
  map.el.classList.toggle('tiny', tiny);
  for (const r of map.edges) for (const p of r.packets) p.c.setAttribute('r', tiny ? '8' : '3.2');
}

/** How tall a phone-sized camera viewport is. Read once per width: a phone's
    innerHeight changes as its address bar slides away, and a viewport that
    resized with it would shove the page around mid-scroll. */
const vhFor = new WeakMap<HTMLElement, { w: number; vh: number }>();

export function fit(map: LiveMap) {
  const size = map.el.parentElement!, wrap = size.parentElement!;
  const w = wrap.clientWidth;
  if (map.scaleFn) {
    const s = map.scaleFn();
    map.view = { s, x: 0, y: 0 };
    map.el.style.transform = `scale(${s})`;
    size.style.width = map.W * s + 'px';
    size.style.height = map.H * s + 'px';
    return;
  }
  if (!w) return; // hidden (the other width's layout): nothing to fit to
  if (map.cam) {
    const wasFit = !map.view.s || map.view.s <= map.fitS * 1.02;
    map.fitS = Math.min(1, w / map.W);
    map.vw = w;
    const natural = Math.round(map.H * map.fitS);
    let vh = natural;
    if (map.fitS < 0.75) {
      const kept = vhFor.get(size);
      if (kept && kept.w === w) vh = Math.max(natural, kept.vh);
      else { vh = Math.max(natural, Math.round(Math.min(innerHeight * 0.58, 540))); vhFor.set(size, { w, vh }); }
    }
    map.vh = vh;
    size.style.width = w + 'px';
    size.style.height = vh + 'px';
    setView(map, wasFit ? { s: map.fitS, x: 0, y: 0 } : map.view, false, wasFit ? false : undefined);
    return;
  }
  const s = Math.max(0.5, Math.min(1, w / map.W));
  map.view = { s, x: 0, y: 0 };
  map.el.style.transform = s !== 1 ? `scale(${s})` : '';
  size.style.width = map.W * s + 'px';
  size.style.height = map.H * s + 'px';
}

/* ---------- camera ---------- */
export const isZoomed = (map: LiveMap) => map.view.s > map.fitS * 1.02;

/** Move the camera. The view is clamped so the map always covers its
    viewport, or sits centred in it when it is the smaller of the two. */
export function setView(map: LiveMap, v: View, fly = false, owned?: boolean) {
  if (owned !== undefined) map.owned = owned;
  const s = Math.min(Math.max(map.maxS, map.fitS), Math.max(map.fitS, v.s));
  const cw = map.W * s, ch = map.H * s;
  const x = cw <= map.vw ? (map.vw - cw) / 2 : Math.min(0, Math.max(map.vw - cw, v.x));
  const y = ch <= map.vh ? (map.vh - ch) / 2 : Math.min(0, Math.max(map.vh - ch, v.y));
  map.view = { s, x, y };
  map.el.classList.toggle('fly', fly && env.move);
  map.el.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
  map.el.style.setProperty('--hit', Math.min(80, 22 / s) + 'px');
  const size = map.el.parentElement!;
  if (!isZoomed(map)) map.owned = false;
  size.classList.toggle('zoomed', map.owned);
  // Focus can scroll even a clipped box to reveal a child. The transform is the only thing that moves this one.
  if (size.scrollLeft || size.scrollTop) { size.scrollLeft = 0; size.scrollTop = 0; }
  setTiny(map, s < 0.5);
  map.onView?.(map);
}

/** Fly to the whole map. */
export function frameAll(map: LiveMap, fly = true) { setView(map, { s: map.fitS, x: 0, y: 0 }, fly, false); }

/** Fly so the named boxes fill the viewport, as large as they will go. */
export function frame(map: LiveMap, ids: string[], fly = true) {
  const ns = ids.map((id) => map.nodes[id]).filter(Boolean);
  if (!ns.length) return;
  const pad = 22;
  const x0 = Math.min(...ns.map((n) => n.x)) - pad, x1 = Math.max(...ns.map((n) => n.x + n.w)) + pad;
  const y0 = Math.min(...ns.map((n) => n.y)) - pad, y1 = Math.max(...ns.map((n) => n.y + n.h)) + pad;
  const s = Math.min(0.92, map.vw / (x1 - x0), map.vh / (y1 - y0));
  setView(map, { s, x: map.vw / 2 - ((x0 + x1) / 2) * s, y: map.vh / 2 - ((y0 + y1) / 2) * s }, fly, false);
}

/** Zoom by a factor, keeping the canvas point under (cx, cy) where it is. cx and cy are in viewport pixels. Always the visitor's doing. */
export function zoomAt(map: LiveMap, factor: number, cx: number, cy: number, fly = false) {
  const { s, x, y } = map.view;
  const next = Math.min(map.maxS, Math.max(map.fitS, s * factor));
  const px = (cx - x) / s, py = (cy - y) / s;
  setView(map, { s: next, x: cx - px * next, y: cy - py * next }, fly, true);
}

interface CamState { get: () => LiveMap; onGesture?: () => void }
const cams = new WeakMap<HTMLElement, CamState>();

/**
 * Wire pinch, drag, ctrl+wheel and double-tap to a camera map's viewport.
 * Called once per viewport element; `get` returns whichever map is in it now,
 * since the label switch rebuilds the map inside the same element.
 *
 * One finger pans only while the map is zoomed in. At the fitted view a
 * finger scrolls the page, so the map never traps a thumb on its way past
 * (touch-action in the stylesheet says the same thing to the browser, and
 * only for a zoom the visitor made: a journey's own zoom leaves the page
 * scrollable).
 *
 * onGesture fires when the visitor actually moves the view, not on every
 * touch: a tap, or a swipe that scrolls the page, is not taking the camera.
 */
export function enableCamera(viewport: HTMLElement, get: () => LiveMap, onGesture?: () => void) {
  const had = cams.get(viewport);
  if (had) { had.get = get; had.onGesture = onGesture; return; }
  const st: CamState = { get, onGesture };
  cams.set(viewport, st);

  const pts = new Map<number, { x: number; y: number }>();
  let from: { view: View; x: number; y: number; dist: number } | null = null;
  let moved = false;
  let lastTap = { t: 0, x: 0, y: 0 };
  const local = (x: number, y: number) => { const r = viewport.getBoundingClientRect(); return { x: x - r.left, y: y - r.top }; };
  const anchor = () => {
    const map = st.get();
    const list = [...pts.values()];
    if (list.length >= 2) {
      const m = local((list[0].x + list[1].x) / 2, (list[0].y + list[1].y) / 2);
      from = { view: { ...map.view }, x: m.x, y: m.y, dist: Math.hypot(list[0].x - list[1].x, list[0].y - list[1].y) || 1 };
    } else if (list.length === 1) {
      const m = local(list[0].x, list[0].y);
      from = { view: { ...map.view }, x: m.x, y: m.y, dist: 0 };
    } else from = null;
  };

  viewport.addEventListener('pointerdown', (ev) => {
    if (ev.pointerType === 'mouse' && ev.button !== 0) return;
    if (!pts.size) moved = false;
    pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    anchor();
  });
  addEventListener('pointermove', (ev) => {
    if (!pts.has(ev.pointerId) || !from) return;
    // A mouse that is no longer held (its release was swallowed, by a native drag for one) is up.
    if (ev.pointerType === 'mouse' && !(ev.buttons & 1)) { pts.delete(ev.pointerId); anchor(); viewport.classList.remove('dragging'); return; }
    pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    const map = st.get();
    const list = [...pts.values()];
    if (list.length >= 2) {
      const m = local((list[0].x + list[1].x) / 2, (list[0].y + list[1].y) / 2);
      const dist = Math.hypot(list[0].x - list[1].x, list[0].y - list[1].y) || 1;
      const s = Math.min(map.maxS, Math.max(map.fitS, from.view.s * (dist / from.dist)));
      const px = (from.x - from.view.x) / from.view.s, py = (from.y - from.view.y) / from.view.s;
      if (!moved) st.onGesture?.();
      setView(map, { s, x: m.x - px * s, y: m.y - py * s }, false, true);
      moved = true;
    } else if (isZoomed(map)) {
      const m = local(list[0].x, list[0].y);
      const dx = m.x - from.x, dy = m.y - from.y;
      if (!moved && Math.hypot(dx, dy) < 6) return;
      if (!moved) st.onGesture?.();
      moved = true;
      viewport.classList.add('dragging');
      setView(map, { s: from.view.s, x: from.view.x + dx, y: from.view.y + dy }, false, true);
    }
  });
  const up = (ev: PointerEvent) => {
    if (!pts.has(ev.pointerId)) return;
    pts.delete(ev.pointerId);
    anchor();
    if (pts.size) return;
    viewport.classList.remove('dragging');
    if (moved || ev.type === 'pointercancel') return;
    // A double tap (or double click) on open map zooms in on that spot, and
    // back out from a zoomed view. Boxes and lines keep their own taps.
    const target = ev.target as Element | null;
    if (target?.closest?.('.node, path.hit')) return;
    const now = performance.now(), m = local(ev.clientX, ev.clientY);
    if (now - lastTap.t < 320 && Math.hypot(m.x - lastTap.x, m.y - lastTap.y) < 30) {
      const map = st.get();
      st.onGesture?.();
      if (isZoomed(map)) frameAll(map); else zoomAt(map, 0.82 / map.view.s, m.x, m.y, true);
      lastTap.t = 0;
    } else lastTap = { t: now, x: m.x, y: m.y };
  };
  addEventListener('pointerup', up);
  addEventListener('pointercancel', up);
  // A drag that ends over a box must not also count as a tap on it.
  viewport.addEventListener('click', (ev) => { if (moved) { ev.stopPropagation(); ev.preventDefault(); moved = false; } }, true);
  viewport.addEventListener('wheel', (ev) => {
    if (!ev.ctrlKey) return; // plain wheel scrolls the page; ctrl+wheel is also a trackpad pinch
    ev.preventDefault();
    const m = local(ev.clientX, ev.clientY);
    st.onGesture?.();
    zoomAt(st.get(), Math.exp(-ev.deltaY * 0.012), m.x, m.y);
  }, { passive: false });
}

export function pingNode(node: { el: HTMLElement; last?: number }, color: string) {
  const now = performance.now();
  if (node.last && now - node.last < 650) return;
  node.last = now;
  node.el.animate(
    [{ boxShadow: `0 0 0 0 ${color}66` }, { boxShadow: `0 0 0 12px ${color}00` }],
    { duration: 900, easing: 'ease-out' },
  );
}

let lastT = 0;
let ticking = false;
function tick(now: number) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  for (const m of maps) {
    if (!m.visible) continue;
    for (const r of m.edges) {
      if (m.story && !r.g.classList.contains('hot')) continue;
      for (const p of r.packets) {
        p.t += (p.speed * dt) / r.len;
        if (p.t >= 1) {
          p.t -= 1;
          if (!m.story) pingNode(m.nodes[r.e.to], r.color);
        }
        place(r, p);
      }
    }
  }
  requestAnimationFrame(tick);
}
export function startTick() {
  if (ticking || !env.move) return;
  ticking = true;
  lastT = performance.now();
  requestAnimationFrame(tick);
}

/* ---------- highlight ---------- */
export function clearHighlight(map: LiveMap) {
  map.edges.forEach((r) => r.g.classList.remove('dim', 'hot'));
  Object.values(map.nodes).forEach((n) => { n.el.classList.remove('dim', 'lit'); n.el.style.removeProperty('--lc'); });
  map.groups.forEach((g) => (g.style.opacity = ''));
}
export function focusNode(map: LiveMap, id: string) {
  clearHighlight(map);
  const keep = new Set([id]);
  map.edges.forEach((r) => {
    const on = r.e.from === id || r.e.to === id;
    r.g.classList.add(on ? 'hot' : 'dim');
    if (on) { keep.add(r.e.from); keep.add(r.e.to); }
  });
  Object.values(map.nodes).forEach((n) => { if (!keep.has(n.id)) n.el.classList.add('dim'); });
  map.nodes[id].el.classList.add('lit');
}
/** One line, and the two boxes it joins. */
export function focusEdge(map: LiveMap, i: number) {
  clearHighlight(map);
  const hot = map.edges[i];
  map.edges.forEach((r) => r.g.classList.add(r === hot ? 'hot' : 'dim'));
  Object.values(map.nodes).forEach((n) => {
    if (n.id === hot.e.from || n.id === hot.e.to) { n.el.classList.add('lit'); n.el.style.setProperty('--lc', hot.color); }
    else n.el.classList.add('dim');
  });
}

export const edgeOf = (map: LiveMap, from: string, to: string) => map.edges.find((x) => x.e.from === from && x.e.to === to);

/**
 * Send one bright light along a line. Resolves when it lands, or as soon as
 * `alive` says the run it belonged to has been replaced.
 */
export function travel(map: LiveMap, r: LiveEdge, color: string, ms: number, alive: () => boolean, reverse = false): Promise<void> {
  const comet = svgEl('circle');
  comet.setAttribute('r', map.tiny ? '13' : '6.5');
  comet.setAttribute('class', 'packet comet');
  comet.setAttribute('filter', `url(#${map.glow})`);
  comet.setAttribute('style', `fill:${color}`);
  r.g.appendChild(comet);
  const t0 = performance.now(), dur = env.move ? ms : 1;
  return new Promise<void>((res) => {
    const step = (now: number) => {
      if (!alive()) { comet.remove(); return res(); }
      const t = Math.min(1, (now - t0) / dur), e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      const pt = r.base.getPointAtLength((reverse ? 1 - e : e) * r.len);
      comet.setAttribute('cx', String(pt.x));
      comet.setAttribute('cy', String(pt.y));
      if (t < 1) requestAnimationFrame(step); else { comet.remove(); res(); }
    };
    requestAnimationFrame(step);
  });
}

/* ---------- journeys ---------- */
export interface StoryHooks {
  /** Step number (or a mark), the sentence, the small line under it, the lane colour. */
  caption: (n: string, text: string, sub: string, color: string) => void;
  /** Called before each step so the page (or the camera) can bring both boxes into view. */
  follow?: (a: HTMLElement, b: HTMLElement, from: string, to: string) => void;
}

/** Bumped by every stop, so a story in flight can tell it has been replaced. */
let storyRun = 0;
export function stopStory(map: LiveMap) {
  storyRun++;
  map.story = false;
  map.el.querySelectorAll('circle.comet').forEach((c) => c.remove());
  clearHighlight(map);
}

/** Plays one journey across the map. Resolves true if it ran to the end. */
export async function playStory(map: LiveMap, j: Journey, hooks: StoryHooks): Promise<boolean> {
  stopStory(map);
  const run = storyRun;
  map.story = true;
  map.edges.forEach((r) => r.g.classList.add('dim'));
  Object.values(map.nodes).forEach((n) => n.el.classList.add('dim'));
  map.groups.forEach((g) => (g.style.opacity = '.35'));
  const color = cssv(LANES[j.lane].v);
  const wait = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));
  for (const [k, [from, to, text]] of j.steps.entries()) {
    if (run !== storyRun) return false;
    const r = edgeOf(map, from, to);
    if (!r) continue; // guarded by tests/bdl-012-data.test.ts; never skip silently in practice
    hooks.caption(String(k + 1), text, `${j.name} · step ${k + 1} of ${j.steps.length}`, color);
    const a = map.nodes[from].el, b = map.nodes[to].el;
    [a, b].forEach((el) => { el.classList.remove('dim'); el.style.setProperty('--lc', color); });
    a.classList.add('lit');
    r.g.classList.remove('dim');
    r.g.classList.add('hot');
    hooks.follow?.(a, b, from, to);
    await travel(map, r, color, 1300, () => run === storyRun);
    if (run !== storyRun) return false;
    b.classList.add('lit');
    pingNode({ el: b }, color);
    await wait(env.dwell ? 1700 : 0);
  }
  if (run !== storyRun) return false;
  hooks.caption('✓', `That’s the whole trip for “${j.name}”.`, 'Pick another moment, or choose Show everything.', color);
  return true;
}
