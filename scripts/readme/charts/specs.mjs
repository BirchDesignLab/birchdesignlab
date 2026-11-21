// Per-chart specs for the README charts: hand layouts where dagre's ranking
// would draw the wrong picture, plus each chart's decoration and motion.
//
//   layout(graph, chart)  -> model   (hand layout from the parsed Mermaid graph)
//   compose(ctx)          -> { css, under, over, nodeUnder, nodeOver, duration }
//
// Charts 1 and 3 use Mermaid's own dagre layout and only compose.
import { anchor, cluster, finish, makeEdge, makeNodes, rounded, smooth } from './manual.mjs';
import { f1, parsePath, rng, sample } from './geometry.mjs';
import { eye, growClip, lenticels, scar, trunkOutline } from './birch.mjs';
import { KEYFRAMES, RING_CSS, anim, chain, depths, drawCss, edgeIn, nodeIn, pulse, ringEl, traveler } from './motion.mjs';
import { mix, readable } from './theme.mjs';
import { buildPhone, harnessPhone, labPhone } from './phone.mjs';
import { servedCompose, servedLayout } from './served.mjs';
import { width as textWidth, wrap as wrapText } from './textmetrics.mjs';

/** Cluster title wrapped to `maxW` in the tracked caps the renderer draws it in. */
const wrapTitle = (title, maxW, size) => wrapText('display', size, title, maxW, 0.2);

const cfgOf = (chart) => {
  const r = chart.render;
  return { head: r.headSize, body: r.fontSize, edge: r.edgeSize, wrap: r.wrap, padX: r.padding + 6, padY: r.padding - 1, edgeWrap: r.edgeWrap ?? 150 };
};

// ---------------------------------------------------------------- repo map
// A birch trunk with the first-level folders branching off both sides and
// their subfolders hanging off those. A pure tree, so it is laid out as a tidy
// tree rather than ranked by dagre.
function repoLayout(graph, chart, variant = 'desktop') {
  const phone = variant === 'phone';
  const cfg = cfgOf(chart);
  const nodes = makeNodes(graph, { ...cfg, wrapFor: (id) => (id === 'ROOT' ? 400 : cfg.wrap) });
  const kids = (id) => graph.edges.filter((e) => e.from === id).map((e) => e.to);
  const root = nodes.get('ROOT');
  root.shape = 'trunk';
  root.w = phone ? 34 : 54;
  const children = kids('ROOT');
  const slots = (id) => Math.max(1, kids(id).length);
  const total = children.reduce((s, c) => s + slots(c), 0);
  let acc = 0;
  let split = 1;
  let bestDiff = Infinity;
  children.forEach((c, i) => {
    acc += slots(c);
    const diff = Math.abs(total - 2 * acc);
    if (i < children.length - 1 && diff < bestDiff) {
      bestDiff = diff;
      split = i + 1;
    }
  });
  const sides = phone
    ? [{ dir: 1, ids: children }]
    : [
        { dir: -1, ids: children.slice(0, split) },
        { dir: 1, ids: children.slice(split) },
      ];
  const gapLeaf = 10;
  const gapGroup = 22;
  const gap1 = phone ? 30 : 52;
  const gap2 = phone ? 16 : 30;
  const half = root.w / 2;
  let sideMax = 0;
  for (const side of sides) {
    const groups = side.ids.map((id) => {
      const c = nodes.get(id);
      const leaves = kids(id).map((l) => nodes.get(l));
      const leavesH = leaves.reduce((s, l) => s + l.h, 0) + gapLeaf * Math.max(0, leaves.length - 1);
      return { c, leaves, leavesH, h: Math.max(leavesH, c.h) };
    });
    const colW = Math.max(...groups.map((g) => g.c.w));
    const totalH = groups.reduce((s, g) => s + g.h, 0) + gapGroup * (groups.length - 1);
    sideMax = Math.max(sideMax, totalH);
    let y = -totalH / 2;
    for (const g of groups) {
      g.c.cy = y + g.h / 2;
      g.c.cx = side.dir * (half + gap1 + g.c.w / 2);
      let ly = y + (g.h - g.leavesH) / 2;
      for (const l of g.leaves) {
        l.cy = ly + l.h / 2;
        l.cx = side.dir * (half + gap1 + colW + gap2 + l.w / 2);
        ly += l.h + gapLeaf;
      }
      y += g.h + gapGroup;
    }
  }
  root.h = sideMax + 46;
  root.cx = 0;
  root.cy = 0;
  const edges = graph.edges.map((ge, i) => {
    const a = nodes.get(ge.from);
    const b = nodes.get(ge.to);
    const dir = b.cx < 0 ? -1 : 1;
    const out = dir > 0 ? 'R' : 'L';
    const into = dir > 0 ? 'L' : 'R';
    const segs =
      ge.from === 'ROOT'
        ? smooth([dir * half, b.cy * 0.82], out, anchor(b, into), into, gap1 * 0.55)
        : smooth(anchor(a, out), out, anchor(b, into), into, gap2 * 0.55);
    return makeEdge(ge, i, { segs, arrow: false }, cfg);
  });
  return finish({ nodes: [...nodes.values()], edges }, 6);
}

function repoCompose(ctx) {
  const { t, scheme, nodes } = ctx;
  const trunk = nodes.get('ROOT');
  const light = scheme === 'light';
  const fill = light ? t.paper : t.ink;
  const mark = light ? t.ink : t.field;
  const top = trunk.cy - trunk.h / 2;
  const bottom = trunk.cy + trunk.h / 2;
  const rootEdges = ctx.edges.filter((e) => e.from === 'ROOT');
  const junctions = rootEdges.map((e) => parsePath(e.d)[0].pts[0][1]);
  const band = 76;
  const len = lenticels({ cx: trunk.cx, top, bottom, w: trunk.w, junctions, seed: 4242, skip: [[trunk.cy - band, trunk.cy + band]] });
  const label = trunk.lines.join(' ');
  ctx.glyphs.display += label;
  ctx.pairs.push({ where: 'trunk label on trunk', fg: mark, bg: fill });
  const growDur = 1.3;
  const eyes = rootEdges
    .map((e) => {
      const [ex, ey] = parsePath(e.d)[0].pts[0];
      const dir = nodes.get(e.to).cx > trunk.cx ? 1 : -1;
      // a branch scar under the two biggest junctions (src/ and docs/)
      const big = e.to === 'SRC' || e.to === 'DOCS' ? scar(ex - dir * 13, ey + 15, mark, ctx.variant === 'phone' ? 0.9 : 1) : '';
      return eye(ex, ey, dir, mark, fill, ctx.variant === 'phone' ? 0.9 : 1) + big;
    })
    .join('');
  const svg =
    growClip('grow', { x: trunk.cx - trunk.w / 2 - 26, y: top - 14, w: trunk.w + 52, h: trunk.h + 28, dur: growDur, begin: 0 }) +
    `<g clip-path="url(#grow)">` +
    `<path d="${trunkOutline({ cx: trunk.cx, top, bottom, w: trunk.w, seed: 911 })}" fill="${fill}" stroke="${mark}" stroke-opacity=".25" stroke-width="1" stroke-linejoin="round"/>` +
    `<path class="lt" d="${len.thin}" style="stroke:${mark}"/><path class="lh" d="${len.heavy}" style="stroke:${mark}"/>` +
    eyes +
    `<text class="trl" transform="rotate(-90 ${f1(trunk.cx)} ${f1(trunk.cy)})" x="${f1(trunk.cx)}" y="${f1(trunk.cy + 6)}" style="fill:${mark}">${label}</text>` +
    '</g>';
  // the trunk grows up from its base, then each branch draws as the growth passes its junction
  const light2 = light ? mix(t.ink, t.field, 0.14) : t.edge;
  let css = KEYFRAMES;
  const nodeAt = new Map();
  let end = growDur;
  rootEdges
    .map((e, i) => ({ e, y: junctions[i] }))
    .forEach(({ e, y }) => {
      const arrive = growDur * ((bottom - y) / (bottom - top)) * 0.9;
      const d = 0.1 + arrive + 0.12;
      css += edgeIn(e, d, 0.5);
      nodeAt.set(e.to, d + 0.4);
      css += nodeIn(nodes.get(e.to), d + 0.4, 0.5);
      end = Math.max(end, d + 0.9);
    });
  const perParent = new Map();
  for (const e of ctx.edges.filter((x) => x.from !== 'ROOT')) {
    const j = perParent.get(e.from) ?? 0;
    perParent.set(e.from, j + 1);
    const d = (nodeAt.get(e.from) ?? 1) + 0.3 + j * 0.07;
    css += edgeIn(e, d, 0.45);
    css += nodeIn(nodes.get(e.to), d + 0.35, 0.45);
    end = Math.max(end, d + 0.8);
  }
  return {
    css: css + `.lt,.lh{fill:none;stroke-linecap:round}.lt{stroke-width:1.4;stroke-opacity:.28}.lh{stroke-width:2.6;stroke-opacity:.55}.trl{font:19px 'BDL Marcellus',Georgia,serif;text-anchor:middle}.el{stroke:${light2};stroke-width:2}`,
    nodeOver: { ROOT: svg },
    duration: end,
    textSizes: [19],
  };
}

// ---------------------------------------------------------------- build, verify, deploy
// A snake: branch and verify across the top with the four stages fanned out
// beneath, then the pipeline returns right to left along the bottom.
function buildLayout(graph, chart) {
  const cfg = cfgOf(chart);
  // `npm run verify` is a command that runs, not a yes/no question: draw it as a step (only "green?" is a decision)
  for (const v of graph.vertices) if (v.id === 'V') v.shape = 'rect';
  const nodes = makeNodes(graph, cfg);
  const N = (id) => nodes.get(id);
  const top = ['T1', 'T2', 'T3', 'T4'].map(N);
  const bottom = ['PR', 'CI', 'WB', 'LIVE'].map(N);
  N('LIVE').w += 30; // room for the live dot
  const colW = Math.max(...top.map((n) => n.w), ...bottom.map((n) => n.w)) + 38;
  const X = (i) => i * colW;
  const V = N('V');
  const B = N('B');
  V.cx = (X(1) + X(2)) / 2;
  V.cy = 0;
  B.cx = X(0);
  B.cy = 0;
  const rowH = Math.max(...top.map((n) => n.h));
  const y1 = V.h / 2 + 86 + rowH / 2;
  top.forEach((n, i) => {
    n.cx = X(i);
    n.cy = y1;
  });
  const rowH2 = Math.max(...bottom.map((n) => n.h));
  const y2 = y1 + rowH / 2 + 58 + rowH2 / 2;
  // right to left: PR under T4 ... LIVE under T1
  bottom.forEach((n, i) => {
    n.cx = X(3 - i);
    n.cy = y2;
  });
  const E = (from, to) => graph.edges.findIndex((e) => e.from === from && e.to === to);
  const edges = [];
  const add = (from, to, segs, o = {}) => {
    const i = E(from, to);
    edges.push(makeEdge(graph.edges[i], i, { segs, ...o }, cfg));
  };
  add('B', 'V', smooth(anchor(B, 'R'), 'R', anchor(V, 'L'), 'L'));
  add('V', 'T1', smooth(anchor(V, 'L'), 'L', anchor(top[0], 'T'), 'T', 70), { at: 0.66, dx: -4, dy: 6 });
  add('V', 'T2', smooth(anchor(V, 'B'), 'B', anchor(top[1], 'T'), 'T', 54), { at: 0.62, dx: -6, dy: 4 });
  add('V', 'T3', smooth(anchor(V, 'B'), 'B', anchor(top[2], 'T'), 'T', 54), { at: 0.6, dx: 66, dy: -10 });
  add('V', 'T4', smooth(anchor(V, 'R'), 'R', anchor(top[3], 'T'), 'T', 70), { at: 0.66, dx: 4, dy: 6 });
  add('T4', 'PR', smooth(anchor(top[3], 'B'), 'B', anchor(N('PR'), 'T'), 'T'));
  add('PR', 'CI', smooth(anchor(N('PR'), 'L'), 'L', anchor(N('CI'), 'R'), 'R'), { dy: -52, labelWrap: colW - 70 });
  add('CI', 'WB', smooth(anchor(N('CI'), 'L'), 'L', anchor(N('WB'), 'R'), 'R'), { dy: -18 });
  add('WB', 'LIVE', smooth(anchor(N('WB'), 'L'), 'L', anchor(N('LIVE'), 'R'), 'R'));
  return finish({ nodes: [...nodes.values()], edges }, 6);
}

// ---------------------------------------------------------------- harness
export const TIERS = {
  IMPL: ['sonnet', 'opus'],
  VH: ['haiku'],
  CRIT: ['opus'],
  VER: ['sonnet'],
  GATE: ['sonnet'],
  FIX: ['sonnet', 'opus'],
};

function harnessLayout(graph, chart) {
  const cfg = cfgOf(chart);
  const nodes = makeNodes(graph, cfg);
  const N = (id) => nodes.get(id);
  for (const n of nodes.values()) n.classes = ['you'];  // colour means tier only: every node is neutral
  for (const id of Object.keys(TIERS)) N(id).h += 8; // room under the tier chip
  const gap = 18;
  const SORT = N('SORT');
  SORT.cx = 0;
  const rev = ['CRIT', 'VER', 'GATE'].map(N);
  const revW = rev.reduce((s, n) => s + n.w, 0) + gap * 2;
  let x = -revW / 2;
  const revH = Math.max(...rev.map((n) => n.h));
  const VH = N('VH');
  VH.cx = 0;
  VH.cy = 0;
  const yRev = VH.h / 2 + 100 + revH / 2;
  for (const n of rev) {
    n.cx = x + n.w / 2;
    n.cy = yRev;
    x += n.w + gap;
  }
  const yDia = yRev + revH / 2 + 86 + SORT.h / 2;
  SORT.cy = yDia;
  const outcomes = ['STOP', 'DEF', 'DONE', 'PARK', 'FIX'].map(N);
  const outGap = 18;
  const outW = outcomes.reduce((s, n) => s + n.w, 0) + outGap * (outcomes.length - 1);
  const outH = Math.max(...outcomes.map((n) => n.h));
  const yOut = yDia + SORT.h / 2 + 96 + outH / 2;
  x = -outW / 2;
  for (const n of outcomes) {
    n.cx = x + n.w / 2;
    n.cy = yOut;
    x += n.w + outGap;
  }
  const IMPL = N('IMPL');
  const BRIEF = N('BRIEF');
  IMPL.cx = VH.cx - VH.w / 2 - 44 - IMPL.w / 2;
  IMPL.cy = 0;
  BRIEF.cx = IMPL.cx - IMPL.w / 2 - 44 - BRIEF.w / 2;
  BRIEF.cy = 0;
  const box = cluster('REVIEW', graph.subs[0].title.toUpperCase(), ['CRIT', 'VER', 'GATE'], nodes, { x: 24, top: 30, bottom: 24 });
  // Edges fan in across the top of the box and fold out of the bottom, so the box
  // gets a quiet column on its left and the title sits in it, inside the box.
  const titleCol = 150;
  box.x -= titleCol;
  box.w += titleCol;
  box.titlePos = { x: box.x + 20, y: box.y + box.h / 2 - 20, anchor: 'start', lines: wrapTitle(box.lines[0], titleCol - 24, cfg.head ? chart.render.clusterSize : 14) };

  const edges = [];
  let idx = 0;
  const ge = (from, to) => graph.edges.find((e) => e.from === from && e.to === to);
  const push = (g, segs, o = {}) => edges.push(makeEdge(g, idx++, { segs, ...o }, cfg));
  push(ge('BRIEF', 'IMPL'), smooth(anchor(BRIEF, 'R'), 'R', anchor(IMPL, 'L'), 'L'));
  push(ge('IMPL', 'VH'), smooth(anchor(IMPL, 'R'), 'R', anchor(VH, 'L'), 'L'));
  // Mermaid draws VH -> REVIEW -> SORT as two edges on the subgraph; here the
  // subgraph is drawn as its three seats, so the edge fans out and folds back.
  const fanIn = ge('VH', 'REVIEW');
  const foldOut = ge('REVIEW', 'SORT');
  for (const n of rev) push({ ...fanIn, to: n.id }, smooth(anchor(VH, 'B'), 'B', anchor(n, 'T'), 'T', 40));
  for (const n of rev) push({ ...foldOut, from: n.id }, smooth(anchor(n, 'B'), 'B', anchor(SORT, 'T'), 'T', 36));
  for (const o of outcomes) {
    const left = o.cx < SORT.cx - 4;
    const right = o.cx > SORT.cx + 4;
    const segs = left
      ? smooth(anchor(SORT, 'L'), 'L', anchor(o, 'T'), 'T', 60)
      : right
        ? smooth(anchor(SORT, 'R'), 'R', anchor(o, 'T'), 'T', 60)
        : smooth(anchor(SORT, 'B'), 'B', anchor(o, 'T'), 'T', 40);
    push(ge('SORT', o.id), segs, { at: 0.6, labelWrap: 120 });
  }
  const FIX = N('FIX');
  const rightX = Math.max(...outcomes.map((n) => n.cx + n.w / 2)) + 34;
  push(ge('FIX', 'VH'), rounded([anchor(FIX, 'R'), [rightX, FIX.cy], [rightX, VH.cy], anchor(VH, 'R')], 18));
  const model = finish({ nodes: [...nodes.values()], clusters: [box], edges }, 6);
  const out0 = Math.min(...outcomes.map((n) => n.cx - n.w / 2));
  model.legend = { x: out0, y: model.height + 22 };
  model.height += 80;
  return model;
}


// ---------------------------------------------------------------- lab
// Museum specimen labels: a double rule (drawn by render.mjs), an accession tab
// on the top rule, and a slow settle in, source files first.
const LAB_TAGS = { MD: 'SOURCE', SCHEMA: 'SCHEMA', REG: 'EXPERIMENTS', SREG: 'STUDIES', IDX: 'INDEX', DET: 'PLATE', OG: 'CARD' };

function labCompose(ctx) {
  const { t, nodes, edges, model, glyphs } = ctx;
  const size = ctx.sizes.cluster;
  let css = KEYFRAMES;
  const over = {};
  const pts = edges.flatMap((e) => sample(parsePath(e.d), 14));
  model.nodes.forEach((n) => {
    const text = LAB_TAGS[n.id] ?? n.id;
    glyphs.display += text;
    const tw = textWidth('display', size, text, 0.16) + 18;
    // the tab rides a corner of the top or bottom rule, on whichever has no edge arriving
    const cands = [
      { x: n.cx - n.w / 2 + 18, y: n.cy - n.h / 2, pen: 0 },
      { x: n.cx + n.w / 2 - 18 - tw, y: n.cy - n.h / 2, pen: 0.2 },
      { x: n.cx - n.w / 2 + 18, y: n.cy + n.h / 2, pen: 1 },
      { x: n.cx + n.w / 2 - 18 - tw, y: n.cy + n.h / 2, pen: 1.2 },
    ].map((c) => ({ ...c, score: pts.filter(([px, py]) => px > c.x - 14 && px < c.x + tw + 14 && py > c.y - 22 && py < c.y + 22).length * 10 + c.pen }));
    const { x, y } = cands.sort((a, b) => a.score - b.score)[0];
    over[n.id] =
      `<g class="tab"><rect x="${f1(x)}" y="${f1(y - 9)}" width="${f1(tw)}" height="18" rx="9" fill="${t.field}" stroke="${n.focus ? t.accent : ctx.roleOf(n).stroke}" stroke-width="1"/>` +
      `<text x="${f1(x + tw / 2)}" y="${f1(y + size * 0.36)}">${text}</text></g>`;
  });
  ctx.pairs.push({ where: 'role tag on field', fg: t.muted, bg: t.field });
  // the plate is screwed to the wall at its four corners; the card hangs from it by a string
  const det = nodes.get('DET');
  if (det && !det.noScrews) {
    const dx = det.w / 2 - 13;
    const dy = det.h / 2 - 13;
    const screws = [[-dx, -dy], [dx, -dy], [-dx, dy], [dx, dy]]
      .map(([sx, sy]) => `<circle cx="${f1(det.cx + sx)}" cy="${f1(det.cy + sy)}" r="3.4" fill="none" stroke="${ctx.roleOf(det).head}" stroke-opacity=".7" stroke-width="1.2"/><path d="M${f1(det.cx + sx - 2)} ${f1(det.cy + sy)}h4" stroke="${ctx.roleOf(det).head}" stroke-opacity=".7" stroke-width="1.1"/>`)
      .join('');
    over.DET = (over.DET ?? '') + screws + `<circle cx="${f1(det.cx)}" cy="${f1(det.cy + det.h / 2)}" r="4.2" fill="${t.field}" stroke="${ctx.roleOf(det).stroke}" stroke-width="1.4"/>`;
  }
  const { depth } = depths(nodes, edges);
  const seen = new Map();
  let end = 0;
  const at = new Map();
  for (const n of model.nodes) {
    const d = depth.get(n.id) ?? 0;
    const j = seen.get(d) ?? 0;
    seen.set(d, j + 1);
    const delay = 0.15 + d * 0.38 + j * 0.1;
    at.set(n.id, delay);
    css += nodeIn(n, delay, 0.6);
    end = Math.max(end, delay + 0.6);
  }
  for (const e of edges) {
    const d = (at.get(e.from) ?? 0) + 0.35;
    css += edgeIn(e, d, 0.5);
    end = Math.max(end, d + 0.55);
  }
  css += `.tab text{font:${size}px 'BDL Marcellus',Georgia,serif;letter-spacing:.16em;fill:${t.muted};text-anchor:middle}`;
  return { css, nodeOver: over, duration: end, textSizes: [size] };
}

// ---------------------------------------------------------------- build, verify, deploy
// verify ticks off its four stages one by one, then a dot runs the deploy chain
// and LIVE lands with a double pulse.
function buildCompose(ctx) {
  const { t, nodes, edges } = ctx;
  const E = (a, b) => edges.find((x) => x.from === a && x.to === b);
  let css = KEYFRAMES + RING_CSS(t.glow);
  const under = {};
  const over = {};
  let k = 0;
  let end = 0;
  const ring = (id, at, dur) => {
    const key = `${id}-${k++}`;
    under[id] = (under[id] ?? '') + ringEl(nodes.get(id), key);
    css += pulse(key, at, dur);
    end = Math.max(end, at + (dur ?? 0.95));
  };
  ring('V', 0.15);
  ['T1', 'T2', 'T3', 'T4'].forEach((id, i) => {
    const n = nodes.get(id);
    const at = 0.4 + i * 0.28;
    const cx = n.cx + n.w / 2 - 6;
    const cy = n.cy - n.h / 2 + 2;
    over[id] =
      `<g class="tk" id="tk-${id}"><circle cx="${f1(cx)}" cy="${f1(cy)}" r="11.5"/>` +
      `<path d="M${f1(cx - 5.2)} ${f1(cy + 0.4)}l3.6 3.9l6.6-8"/></g>`;
    css += `#tk-${id} circle{animation:bdl-fade .22s ease ${at}s both}` + drawCss(`#tk-${id} path`, `tk${id}`, 16, 0.3, at + 0.1, 'ease');
    end = Math.max(end, at + 0.45);
  });
  css += `.tk circle{fill:${t.accent};stroke:${t.field};stroke-width:2.6}.tk path{fill:none;stroke:${t.onAccent};stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}`;
  ctx.pairs.push({ where: 'tick on its badge', fg: t.onAccent, bg: t.accent });
  const start = 0.4 + 3 * 0.28 + 0.45;
  const c = chain([E('T4', 'PR'), E('PR', 'CI'), E('CI', 'WB'), E('WB', 'LIVE')], 520);
  const dot = traveler(c.d, start, c.total, t.glow);
  for (const a of c.arrivals) {
    ring(a.node, start + a.at - 0.05);
    if (a.node === 'LIVE') {
      ring('LIVE', start + a.at + 0.18, 1.0);
      // the signature: a live status dot lands on the site and stays
      const live = nodes.get('LIVE');
      over.LIVE = (over.LIVE ?? '') + `<g id="live"><circle cx="${f1(live.cx - live.w / 2 + 17)}" cy="${f1(live.cy)}" r="8" fill="none" stroke="${t.onAccent}" stroke-opacity=".5" stroke-width="1.4"/><circle cx="${f1(live.cx - live.w / 2 + 17)}" cy="${f1(live.cy)}" r="4.2" fill="${t.onAccent}"/></g>`;
      css += anim('#live', 'fade', 0.3, start + a.at - 0.02);
    }
  }
  end = Math.max(end, start + c.total);
  return { css, nodeUnder: under, nodeOver: over, over: dot, duration: end };
}

// ---------------------------------------------------------------- harness
// Seats are coloured by model tier; the flow reveals rank by rank, so the
// review block fans out in parallel and folds back into the findings gate.
const TIER_NAME = { haiku: 'Haiku', sonnet: 'Sonnet', opus: 'Opus' };
function harnessCompose(ctx) {
  const { t, nodes, edges, model } = ctx;
  const tiers = t.tier;
  let css = KEYFRAMES;
  const over = {};
  for (const [id, list] of Object.entries(TIERS)) {
    const n = nodes.get(id);
    const primary = tiers[list[0]];
    const fill = mix(t.paper, primary, t.scheme === 'light' ? 0.16 : 0.2);
    const detail = readable(fill, [t.muted, mix(t.muted, t.ink, 0.45), t.ink]);
    css += `#n-${id} .s{fill:${fill};stroke:${primary};stroke-width:1.8}#n-${id} .d{fill:${detail}}`;
    ctx.pairs.push({ where: `${id} detail on tier tint`, fg: detail, bg: fill });
    ctx.pairs.push({ where: `${id} heading on tier tint`, fg: t.ink, bg: fill });
    const x = n.cx - n.w / 2 + 7;
    const y = n.cy - n.h / 2 + 9;
    const h = n.h - 18;
    const each = (h - (list.length - 1) * 3) / list.length;
    over[id] = list
      .map((tier, i) => `<rect x="${f1(x)}" y="${f1(y + i * (each + 3))}" width="5" height="${f1(each)}" rx="2.5" fill="${tiers[tier]}"/>`)
      .join('');
    // a text chip per tier on the top rule, so the tier reads without colour or the legend
    let cx = n.cx + n.w / 2 - 12;
    const chipSize = ctx.sizes.cluster;
    for (const tier of [...list].reverse()) {
      const label = TIER_NAME[tier];
      ctx.glyphs.display += label;
      const cw = textWidth('display', chipSize, label) + 18;
      const fg = readable(tiers[tier], [t.ink, t.field, '#ffffff']);
      over[id] +=
        `<rect x="${f1(cx - cw)}" y="${f1(n.cy - n.h / 2 - 10)}" width="${f1(cw)}" height="20" rx="10" fill="${tiers[tier]}" stroke="${t.field}" stroke-width="1.6"/>` +
        `<text class="lgc" x="${f1(cx - cw / 2)}" y="${f1(n.cy - n.h / 2 + 4.2)}" fill="${fg}" style="font-size:${chipSize}px">${label}</text>`;
      ctx.pairs.push({ where: `${id} ${label} chip text`, fg, bg: tiers[tier] });
      cx -= cw + 5;
    }
  }
  for (const k of ['haiku', 'sonnet', 'opus']) {
    ctx.pairs.push({ where: `${TIER_NAME[k]} tier colour on field (non-text, 3:1)`, fg: tiers[k], bg: t.field });
  }
  // legend, under the outcome row
  const lg = model.legend;
  const size = ctx.sizes.cluster;
  let lx = lg.x;
  ctx.glyphs.display += 'MODEL TIER';
  let legend = `<text class="lgt" x="${f1(lx)}" y="${f1(lg.y + 5)}">MODEL TIER</text>`;
  lx += textWidth('display', size, 'MODEL TIER', 0.2) + 22;
  for (const key of ['haiku', 'sonnet', 'opus']) {
    const label = TIER_NAME[key];
    ctx.glyphs.display += label;
    const w = textWidth('display', size + 1, label) + 30;
    const fg = readable(tiers[key], [t.ink, t.field, '#ffffff']);
    legend +=
      `<rect x="${f1(lx)}" y="${f1(lg.y - 13)}" width="${f1(w)}" height="26" rx="13" fill="${tiers[key]}"/>` +
      `<text class="lgc" x="${f1(lx + w / 2)}" y="${f1(lg.y + 5)}" fill="${fg}">${label}</text>`;
    ctx.pairs.push({ where: `legend ${label} on its chip`, fg, bg: tiers[key] });
    lx += w + 10;
  }
  // the fixer follows the implementer's seat; the escalated fixer steps one up (.claude/workflows/README.md)
  const note = ctx.variant === 'phone' ? ['The fixer is the implementer’s seat;', 'the escalated fixer steps one tier up.'] : ['The fixer is the implementer’s seat; the escalated fixer steps one tier up.'];
  const noteSize = Math.max(ctx.variant === 'phone' ? 15 : 14, Math.ceil((12.6 / ctx.P.scale) * 10) / 10);
  note.forEach((l, i) => {
    ctx.glyphs.italic += l;
    legend += `<text class="lgn" x="${f1(lg.x)}" y="${f1(lg.y + 30 + i * noteSize * 1.25)}">${l}</text>`;
  });
  css += `.lgn{font:italic ${noteSize}px 'BDL Spectral',Georgia,serif;fill:${t.muted}}`;
  ctx.pairs.push({ where: 'legend note on field', fg: t.muted, bg: t.field });
  css += `.lgt{font:${size}px 'BDL Marcellus',Georgia,serif;letter-spacing:.2em;fill:${t.muted}}.lgc{font:${size + 1}px 'BDL Marcellus',Georgia,serif;text-anchor:middle}`;
  ctx.pairs.push({ where: 'legend title on field', fg: t.muted, bg: t.field });

  // reveal rank by rank
  const { depth, back } = depths(nodes, edges);
  const STEP = 0.2;
  const tN = (id) => 0.15 + (depth.get(id) ?? 0) * STEP;
  let end = 0;
  for (const n of model.nodes) {
    css += nodeIn(n, tN(n.id), 0.45);
    end = Math.max(end, tN(n.id) + 0.5);
  }
  css += anim('#c-REVIEW', 'fade', 0.6, tN('CRIT') - 0.1) + anim('#ct-REVIEW', 'fade', 0.6, tN('CRIT') - 0.1);
  for (const e of edges) {
    const isBack = back.has(`${e.from}>${e.to}`);
    const d = isBack ? tN(e.from) + 0.55 : tN(e.from) + 0.3;
    css += edgeIn(e, d, isBack ? 0.6 : 0.4);
    end = Math.max(end, d + (isBack ? 0.7 : 0.5));
  }
  // then the work flows: three dots leave verifyHead together, land in parallel and fold into
  // Findings; one dot then runs the blocker loop, Fixer back to verifyHead, once
  const E = (a, b) => edges.find((x) => x.from === a && x.to === b);
  const speed = ctx.variant === 'phone' ? 560 : 800;
  let tv = '';
  let k = 0;
  const under = {};
  css += RING_CSS(t.glow);
  const ring = (id, at) => {
    const key = `${id}-${k++}`;
    under[id] = (under[id] ?? '') + ringEl(nodes.get(id), key);
    css += pulse(key, at);
    end = Math.max(end, at + 0.95);
  };
  const go = (list, begin, color) => {
    const c = chain(list.map(([a, b]) => E(a, b)), speed);
    tv += traveler(c.d, begin, c.total, color);
    end = Math.max(end, begin + c.total);
    return c;
  };
  let t0 = end - 0.3;
  const seats = ['CRIT', 'VER', 'GATE'];
  const outs = seats.map((id) => go([['VH', id]], t0, tiers[TIERS[id][0]]));
  seats.forEach((id, i) => ring(id, t0 + outs[i].total - 0.05));
  t0 += Math.max(...outs.map((c) => c.total)) + 0.15;
  const folds = seats.map((id) => go([[id, 'SORT']], t0, tiers[TIERS[id][0]]));
  ring('SORT', t0 + Math.max(...folds.map((c) => c.total)) - 0.05);
  t0 += Math.max(...folds.map((c) => c.total)) + 0.25;
  go([['SORT', 'FIX'], ['FIX', 'VH']], t0, t.glow);
  const fixLen = chain([E('SORT', 'FIX'), E('FIX', 'VH')], speed);
  ring('FIX', t0 + fixLen.arrivals[0].at - 0.05);
  ring('VH', t0 + fixLen.total - 0.05);
  return { css, nodeUnder: under, nodeOver: over, over: `<g class="lg">${legend}</g>${tv}`, duration: end, textSizes: [size, size + 1, noteSize] };
}



// ---------------------------------------------------------------- lab layout
// A gallery wall: the detail page is the large central plate, and the source, schema,
// registries, index and card are mounted around it.
function labLayout(graph, chart) {
  const cfg = cfgOf(chart);
  const nodes = makeNodes(graph, { ...cfg, scaleFor: (id) => (id === 'DET' ? 1.22 : 1), wrapFor: (id) => (id === 'DET' ? 300 : id === 'MD' ? 280 : cfg.wrap) });
  const N = (id) => nodes.get(id);
  const colW = Math.max(...['REG', 'SREG'].map((id) => N(id).w));
  const X = 170 + colW / 2 + 46;
  const rowH = Math.max(N('MD').h, N('SCHEMA').h, N('IDX').h);
  const DET = N('DET');
  DET.w = Math.max(DET.w, 340);
  DET.h = Math.max(DET.h + 26, 130);
  for (const id of ['MD', 'SCHEMA', 'IDX']) N(id).cy = rowH / 2;
  DET.cy = rowH + 88 + DET.h / 2;
  for (const id of ['REG', 'SREG']) N(id).cy = DET.cy;
  N('OG').cy = DET.cy + DET.h / 2 + 130 + N('OG').h / 2;
  N('MD').cx = -X;
  N('SCHEMA').cx = 0;
  N('IDX').cx = X;
  N('REG').cx = -X;
  N('SREG').cx = X;
  DET.cx = 0;
  N('OG').cx = 0;
  for (const id of ['REG', 'SREG']) N(id).w = colW;
  DET.w = Math.max(DET.w, 340);
  const edges = [];
  const add = (from, to, segs, o = {}) => {
    const i = graph.edges.findIndex((e) => e.from === from && e.to === to);
    edges.push(makeEdge(graph.edges[i], i, { segs, ...o }, cfg));
  };
  add('MD', 'SCHEMA', smooth(anchor(N('MD'), 'R'), 'R', anchor(N('SCHEMA'), 'L'), 'L'));
  add('SCHEMA', 'IDX', smooth(anchor(N('SCHEMA'), 'R'), 'R', anchor(N('IDX'), 'L'), 'L'));
  add('SCHEMA', 'DET', smooth(anchor(N('SCHEMA'), 'B'), 'B', anchor(DET, 'T'), 'T'));
  add('REG', 'DET', smooth(anchor(N('REG'), 'R'), 'R', anchor(DET, 'L'), 'L'));
  add('SREG', 'DET', smooth(anchor(N('SREG'), 'L'), 'L', anchor(DET, 'R'), 'R'));
  add('DET', 'OG', smooth(anchor(DET, 'B'), 'B', anchor(N('OG'), 'T'), 'T'), { at: 0.5, dx: 118, dy: 0, labelWrap: 170 });
  return finish({ nodes: [...nodes.values()], edges }, 6);
}

const pick = (desktop, phone) => (graph, chart, variant) => (variant === 'phone' ? phone(graph, chart) : desktop(graph, chart));

export const specs = {
  served: { layout: servedLayout, compose: servedCompose },
  'repo-map': { layout: repoLayout, compose: repoCompose },
  'lab-specimens': { layout: pick(labLayout, labPhone), compose: labCompose },
  'build-deploy': { layout: pick(buildLayout, buildPhone), compose: buildCompose },
  harness: { layout: pick(harnessLayout, harnessPhone), compose: harnessCompose },
};
