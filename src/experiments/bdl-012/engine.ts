/**
 * BDL-012 node-map engine. HTML boxes laid out on a fixed 1104px canvas, SVG
 * edges drawn after the boxes are measured, and light travelling the lines.
 *
 * Boxes are measured, not assumed: a box that would overlap the one above it
 * in its column is pushed down, and edges are routed from the measured sizes.
 * That is what lets the Under the hood switch swap every box's text (and so
 * its height) and simply rebuild.
 *
 * The canvas is scaled to fit its container with a CSS transform, so every
 * coordinate in data.ts is in canvas pixels at any viewport width.
 */
import { LANES, type Journey, type MapEdge, type MapNode, type MapSpec, type Side } from './data';

const svgNS = 'http://www.w3.org/2000/svg';
export const CANVAS_W = 1104;

export interface Env {
  /** The .dm root: the lane colours are custom properties on it. */
  root: HTMLElement;
  /** False for reduced motion and for ?still captures. */
  move: boolean;
  thumbs: Record<'wall' | 'strip', string[]>;
}

interface LiveNode extends MapNode { el: HTMLElement; h: number; last?: number }
interface Packet { c: SVGCircleElement; t: number; speed: number }
interface LiveEdge { e: MapEdge; g: SVGGElement; base: SVGPathElement; len: number; packets: Packet[]; color: string }
export interface LiveMap {
  el: HTMLElement;
  spec: MapSpec;
  tiny: boolean;
  nodes: Record<string, LiveNode>;
  edges: LiveEdge[];
  groups: HTMLElement[];
  H: number;
  glow: string;
  story: boolean;
  zoom: boolean;
}

let env: Env;
export const maps: LiveMap[] = [];
export function setEnv(e: Env) { env = e; }
export const cssv = (v: string) => getComputedStyle(env.root).getPropertyValue(v).trim();

const svgEl = <K extends keyof SVGElementTagNameMap>(tag: K) => document.createElementNS(svgNS, tag) as SVGElementTagNameMap[K];

export function buildMap(el: HTMLElement, spec: MapSpec, opts: { tiny?: boolean; tech?: boolean } = {}): LiveMap {
  el.innerHTML = '';
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
    d.className = 'node ' + (n.cls ?? '');
    Object.assign(d.style, { left: n.x + 'px', top: n.y + 'px', width: n.w + 'px' });
    const lanes = [...new Set(spec.edges.filter((e) => e.from === n.id || e.to === n.id).map((e) => e.lane))];
    let html = lanes.length ? '<div class="lanes">' + lanes.map((l) => `<i style="background:var(${LANES[l].v})"></i>`).join('') + '</div>' : '';
    if (n.kick) html += `<div class="n-kick">${n.kick}</div>`;
    html += `<div class="n-title">${n.title}</div>`;
    if (n.big) html += `<div class="n-big">${n.big}</div>`;
    const sub = opts.tech ? n.tech : n.sub;
    if (sub) html += `<div class="n-sub${opts.tech ? ' is-tech' : ''}">${sub}</div>`;
    if (n.list) html += '<div class="n-list">' + n.list.map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('') + '</div>';
    const thumbs = n.thumbs ? env.thumbs[n.thumbs].slice(0, 7) : [];
    if (thumbs.length) html += '<div class="n-thumbs">' + thumbs.map((s) => `<img alt="" src="${s}">`).join('') + '</div>';
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

  const glow = `${el.id}-glow`;
  const svg = svgEl('svg');
  svg.setAttribute('class', 'edges' + (env.move ? ' live' : ''));
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
    svg.appendChild(g);
    edges.push({ e, g, base, len: 0, packets: [], color: cssv(LANES[e.lane].v) });
    if (e.label) {
      const t = 0.5, u = 1 - t;
      const mx = u ** 3 * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t ** 3 * b.x;
      const my = u ** 3 * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t ** 3 * b.y;
      const s = document.createElement('div');
      s.className = 'edge-label';
      Object.assign(s.style, { left: mx + (e.dx ?? 0) + 'px', top: my + (e.dy ?? 0) + 'px', color });
      s.textContent = e.label;
      el.appendChild(s);
    }
  });
  el.appendChild(svg);

  // Light travelling the lines.
  for (const r of edges) {
    r.len = r.base.getTotalLength();
    const count = r.len > 260 ? 2 : 1;
    for (let k = 0; k < count; k++) {
      const c = svgEl('circle');
      c.setAttribute('r', opts.tiny ? '8' : '3.2');
      c.setAttribute('class', 'packet');
      c.setAttribute('filter', `url(#${glow})`);
      c.setAttribute('style', `fill:${r.color}`);
      r.g.appendChild(c);
      const p: Packet = { c, t: k / count + Math.random() * 0.35, speed: 70 + Math.random() * 45 };
      r.packets.push(p);
      place(r, p);
    }
  }
  el.classList.toggle('tiny', !!opts.tiny);
  const map: LiveMap = { el, spec, tiny: !!opts.tiny, nodes, edges, groups, H, glow, story: false, zoom: false };
  maps.push(map);
  fit(map);
  return map;
}

function place(r: LiveEdge, p: Packet) {
  const pt = r.base.getPointAtLength((p.t % 1) * r.len);
  p.c.setAttribute('cx', String(pt.x));
  p.c.setAttribute('cy', String(pt.y));
}

export function fit(map: LiveMap) {
  const size = map.el.parentElement!, wrap = size.parentElement!;
  const w = wrap.clientWidth;
  const s = map.tiny ? (map.zoom ? 0.7 : Math.min(1, w / CANVAS_W)) : Math.max(0.5, Math.min(1, w / CANVAS_W));
  map.el.style.transform = s < 1 ? `scale(${s})` : '';
  size.style.width = CANVAS_W * s + 'px';
  size.style.height = map.H * s + 'px';
}

function pingNode(node: { el: HTMLElement; last?: number }, color: string) {
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

/* ---------- journeys ---------- */
export interface StoryHooks {
  /** Step number (or a mark), the sentence, the small line under it, the lane colour. */
  caption: (n: string, text: string, sub: string, color: string) => void;
  /** Called before each step so the page can scroll both boxes into view. Omitted in attract mode. */
  follow?: (a: HTMLElement, b: HTMLElement) => void;
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
    const r = map.edges.find((x) => x.e.from === from && x.e.to === to);
    if (!r) continue; // guarded by tests/bdl-012-data.test.ts; never skip silently in practice
    hooks.caption(String(k + 1), text, `${j.name} · step ${k + 1} of ${j.steps.length}`, color);
    const a = map.nodes[from].el, b = map.nodes[to].el;
    [a, b].forEach((el) => { el.classList.remove('dim'); el.style.setProperty('--lc', color); });
    a.classList.add('lit');
    r.g.classList.remove('dim');
    r.g.classList.add('hot');
    hooks.follow?.(a, b);
    const comet = svgEl('circle');
    comet.setAttribute('r', map.tiny ? '13' : '6.5');
    comet.setAttribute('class', 'packet comet');
    comet.setAttribute('filter', `url(#${map.glow})`);
    comet.setAttribute('style', `fill:${color}`);
    r.g.appendChild(comet);
    const t0 = performance.now(), dur = env.move ? 1300 : 1;
    await new Promise<void>((res) => {
      const step = (now: number) => {
        if (run !== storyRun) return res();
        const t = Math.min(1, (now - t0) / dur), e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        const pt = r.base.getPointAtLength(e * r.len);
        comet.setAttribute('cx', String(pt.x));
        comet.setAttribute('cy', String(pt.y));
        if (t < 1) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    });
    comet.remove();
    if (run !== storyRun) return false;
    b.classList.add('lit');
    pingNode({ el: b }, color);
    await wait(env.move ? 1700 : 0);
  }
  if (run !== storyRun) return false;
  hooks.caption('✓', `That’s the whole trip for “${j.name}”.`, 'Pick another moment, or choose Show everything.', color);
  return true;
}
