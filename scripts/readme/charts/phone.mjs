// Phone-tall layouts (single column) for the README charts, used for the
// `(max-width: 600px)` <source>. Same graph, same styles and motion as the desktop
// charts; only the arrangement changes so the text stays legible at 360 px wide.
import { anchor, cluster, finish, makeEdge, makeNodes, rounded, smooth } from './manual.mjs';
import { wrap } from './textmetrics.mjs';

const cfgOf = (chart) => {
  const r = chart.render;
  return { head: r.headSize, body: r.fontSize, edge: r.edgeSize, wrap: r.wrap, padX: r.padding + 5, padY: r.padding - 1, edgeWrap: r.edgeWrap ?? 120 };
};
/** Height of an edge label wrapped to `w`, as makeEdge will draw it. */
const labelH = (text, cfg, w) =>
  text ? text.split(/<br\s*\/?>/i).flatMap((l) => wrap('italic', cfg.edge, l.trim(), w)).length * cfg.edge * 1.22 : 0;
const mk = (graph, idx, push) => (from, to, segs, o = {}) => {
  const i = graph.edges.findIndex((e) => e.from === from && e.to === to);
  push(makeEdge(graph.edges[i], i, { segs, ...o }, idx));
};

/** Left-to-right edge from a rail: down the rail at x=railX, then across into the node's left side. */
const railTo = (start, railX, node) => rounded([start, [railX, node.cy], anchor(node, 'L')], 14);

// ---------------------------------------------------------------- lab
// One column, with the two long edges (schema to detail page, registries to
// detail page) running down rails either side of it.
export function labPhone(graph, chart) {
  const cfg = cfgOf(chart);
  const nodes = makeNodes(graph, cfg);
  const N = (id) => nodes.get(id);
  const order = ['MD', 'SCHEMA', 'IDX', 'REG', 'SREG', 'DET', 'OG'];
  const w = Math.max(...order.map((id) => N(id).w));
  let y = 0;
  for (const id of order) {
    const n = N(id);
    n.w = w;
    n.cx = 0;
    n.cy = y + n.h / 2;
    y += n.h + 46;
  }
  const edges = [];
  const add = mk(graph, cfg, (e) => edges.push(e));
  const L = -(w / 2 + 28);
  const R = w / 2 + 28;
  add('MD', 'SCHEMA', smooth(anchor(N('MD'), 'B'), 'B', anchor(N('SCHEMA'), 'T'), 'T'));
  add('SCHEMA', 'IDX', smooth(anchor(N('SCHEMA'), 'B'), 'B', anchor(N('IDX'), 'T'), 'T'));
  add('SCHEMA', 'DET', rounded([anchor(N('SCHEMA'), 'L'), [L, N('SCHEMA').cy], [L, N('DET').cy], anchor(N('DET'), 'L')], 18));
  add('REG', 'DET', rounded([anchor(N('REG'), 'R'), [R, N('REG').cy], [R, N('DET').cy], anchor(N('DET'), 'R')], 18));
  add('SREG', 'DET', smooth(anchor(N('SREG'), 'B'), 'B', anchor(N('DET'), 'T'), 'T'));
  add('DET', 'OG', smooth(anchor(N('DET'), 'B'), 'B', anchor(N('OG'), 'T'), 'T'), { dx: 0, labelWrap: 200 });
  return finish({ nodes: order.map(N), edges }, 6);
}

// ---------------------------------------------------------------- build, verify, deploy
// A pipeline down one column. verify's four stages hang off a rail, each with
// the command that runs it as a caption above it.
export function buildPhone(graph, chart) {
  const cfg = cfgOf(chart);
  for (const v of graph.vertices) if (v.id === 'V') v.shape = 'rect'; // a command that runs, not a decision
  const nodes = makeNodes(graph, { ...cfg, wrapFor: (id) => (['T1', 'T2', 'T3', 'T4', 'PR', 'WB', 'LIVE'].includes(id) ? 200 : cfg.wrap) });
  const N = (id) => nodes.get(id);
  const stages = ['T1', 'T2', 'T3', 'T4'].map(N);
  const chain = ['PR', 'CI', 'WB', 'LIVE'].map(N);
  N('LIVE').w += 30; // room for the live dot
  const colW = Math.max(...stages.map((n) => n.w), ...chain.map((n) => n.w));
  const B = N('B');
  const V = N('V');
  B.cx = 0;
  B.cy = B.h / 2;
  V.cx = 0;
  V.cy = B.cy + B.h / 2 + 50 + V.h / 2;
  const railX = 0;
  const colLeft = railX + 40;
  const colCx = colLeft + colW / 2;
  let y = V.cy + V.h / 2 + 34;
  const labelFor = (id) => graph.edges.find((e) => e.to === id && e.from === 'V')?.text ?? '';
  const capH = (id) => (labelFor(id) ? labelH(labelFor(id), cfg, colW) + 12 : 0);
  for (const n of stages) {
    y += capH(n.id);
    n.w = colW;
    n.cx = colCx;
    n.cy = y + n.h / 2;
    y += n.h + 16;
  }
  y += 30;
  for (const n of chain) {
    n.cx = colCx;
    if (n.shape !== 'rhombus') n.w = colW;
    n.cy = y + n.h / 2;
    y += n.h + 44;
  }
  const edges = [];
  const add = mk(graph, cfg, (e) => edges.push(e));
  add('B', 'V', smooth(anchor(B, 'B'), 'B', anchor(V, 'T'), 'T'));
  for (const n of stages) {
    // the caption (the edge label) sits above its node, left-aligned with it
    const lines = labelFor(n.id);
    add('V', n.id, railTo(anchor(V, 'B'), railX, n), { at: 0.5, dx: 0, dy: 0, labelWrap: colW });
    const e = edges[edges.length - 1];
    if (e.label) {
      e.label.cx = colLeft + e.label.w / 2;
      e.label.cy = n.cy - n.h / 2 - 8 - e.label.h / 2;
      e.label.left = true;
    }
    void lines;
  }
  add('T4', 'PR', smooth(anchor(N('T4'), 'B'), 'B', anchor(N('PR'), 'T'), 'T'));
  add('PR', 'CI', smooth(anchor(N('PR'), 'B'), 'B', anchor(N('CI'), 'T'), 'T'), { dx: 0, labelWrap: 150 });
  add('CI', 'WB', smooth(anchor(N('CI'), 'B'), 'B', anchor(N('WB'), 'T'), 'T'));
  add('WB', 'LIVE', smooth(anchor(N('WB'), 'B'), 'B', anchor(N('LIVE'), 'T'), 'T'));
  // the long PR -> CI label sits to the right of the arrow
  for (const [a, b] of [['PR', 'CI'], ['CI', 'WB']]) {
    const e = edges.find((x) => x.from === a && x.to === b);
    if (e.label) e.label.cx = colCx - 14 - e.label.w / 2;
  }
  return finish({ nodes: [...nodes.values()], edges }, 6);
}

// ---------------------------------------------------------------- harness
// The chain down the middle, the three review seats side by side in their box,
// the five outcomes hanging off a rail beneath the findings gate, and the fixer's
// return edge up the right side.
export function harnessPhone(graph, chart) {
  const cfg = cfgOf(chart);
  const nodes = makeNodes(graph, { ...cfg, wrapFor: (id) => (['CRIT', 'VER', 'GATE'].includes(id) ? 84 : 270) });
  const N = (id) => nodes.get(id);
  const TIERS = ['IMPL', 'VH', 'CRIT', 'VER', 'GATE', 'FIX'];
  for (const n of nodes.values()) n.classes = ['you'];
  for (const id of TIERS) N(id).h += 8;
  const chainW = 300;
  let y = 0;
  for (const id of ['BRIEF', 'IMPL', 'VH']) {
    const n = N(id);
    n.w = chainW;
    n.cx = 0;
    n.cy = y + n.h / 2;
    y += n.h + 36;
  }
  const rev = ['CRIT', 'VER', 'GATE'].map(N);
  const seatW = Math.max(...rev.map((n) => n.w));
  const seatH = Math.max(...rev.map((n) => n.h));
  const gap = 10;
  const rowW = seatW * 3 + gap * 2;
  y += 46;
  rev.forEach((n, i) => {
    n.w = seatW;
    n.h = seatH;
    n.cx = -rowW / 2 + seatW / 2 + i * (seatW + gap);
    n.cy = y + seatH / 2;
  });
  y += seatH + 24 + 46;
  const SORT = N('SORT');
  const railX = -rowW / 2 + 60;
  SORT.cx = railX;
  SORT.cy = y + SORT.h / 2;
  y += SORT.h + 40;
  const outs = ['FIX', 'STOP', 'DEF', 'DONE', 'PARK'].map(N);
  const outW = 250;
  const left = railX + 40;
  for (const n of outs) {
    n.w = Math.max(n.w, 150);
    n.w = Math.min(n.w, outW);
    const lab = graph.edges.find((e) => e.from === 'SORT' && e.to === n.id)?.text ?? '';
    y += lab ? labelH(lab, cfg, outW - 10) + 12 : 8;
    n.cx = left + n.w / 2;
    n.cy = y + n.h / 2;
    y += n.h + 14;
  }
  const box = cluster('REVIEW', graph.subs[0].title.toUpperCase(), ['CRIT', 'VER', 'GATE'], nodes, { x: 10, top: 58, bottom: 12 });
  const words = box.lines[0].split(' ');
  const cut = Math.ceil(words.length / 2) - 1;
  box.titlePos = { x: box.x + 16, y: box.y + 24, anchor: 'start', lines: [words.slice(0, cut).join(' '), words.slice(cut).join(' ')] };
  const edges = [];
  let idx = 0;
  const ge = (from, to) => graph.edges.find((e) => e.from === from && e.to === to);
  const push = (g, segs, o = {}) => edges.push(makeEdge(g, idx++, { segs, ...o }, cfg));
  const BRIEF = N('BRIEF');
  const IMPL = N('IMPL');
  const VH = N('VH');
  push(ge('BRIEF', 'IMPL'), smooth(anchor(BRIEF, 'B'), 'B', anchor(IMPL, 'T'), 'T'));
  push(ge('IMPL', 'VH'), smooth(anchor(IMPL, 'B'), 'B', anchor(VH, 'T'), 'T'));
  const fanIn = ge('VH', 'REVIEW');
  const foldOut = ge('REVIEW', 'SORT');
  for (const n of rev) push({ ...fanIn, to: n.id }, smooth(anchor(VH, 'B'), 'B', anchor(n, 'T'), 'T', 30));
  for (const n of rev) push({ ...foldOut, from: n.id }, smooth(anchor(n, 'B'), 'B', anchor(SORT, 'T'), 'T', 30));
  for (const n of outs) {
    const g = ge('SORT', n.id);
    push(g, railTo(anchor(SORT, 'B'), railX, n), { at: 0.5, labelWrap: outW - 10 });
    const e = edges[edges.length - 1];
    if (e.label) {
      e.label.cx = n.cx - n.w / 2 + e.label.w / 2;
      e.label.cy = n.cy - n.h / 2 - 7 - e.label.h / 2;
    }
  }
  const FIX = N('FIX');
  const rightX = box.x + box.w + 20;
  push(ge('FIX', 'VH'), rounded([anchor(FIX, 'R'), [rightX, FIX.cy], [rightX, VH.cy], anchor(VH, 'R')], 18));
  const model = finish({ nodes: [...nodes.values()], clusters: [box], edges }, 6);
  model.legend = { x: Math.min(box.x, ...model.nodes.map((n) => n.cx - n.w / 2)), y: model.height + 22 };
  model.height += 100;
  return model;
}

// ---------------------------------------------------------------- served
// Two columns inside the Cloudflare box: static assets and the retry side on the
// left, the contact route down the right, the visitor across the top.
export function servedPhone(graph, chart) {
  const cfg = cfgOf(chart);
  const nodes = makeNodes(graph, cfg);
  const N = (id) => nodes.get(id);
  const colW = 164;
  const dx = 92;
  const A = -dx;
  const B = dx;
  const place = (id, cx, y, w = colW) => {
    const n = N(id);
    n.w = n.shape === 'rhombus' ? n.w : w;
    n.cx = cx;
    n.cy = y + n.h / 2;
    return y + n.h;
  };
  const V = N('V');
  V.w = 200;
  V.cx = 0;
  V.cy = V.h / 2;
  const top = V.h + 150;
  const rowGap = 44;
  const rows = [
    ['SA', 'W'],
    ['AE', 'RL'],
    ['KV', 'CAP'],
    ['CRON', 'EM'],
  ];
  let y = top;
  for (const [a, b] of rows) {
    const h = Math.max(N(a).h, N(b).h);
    N(a).cx = A;
    N(b).cx = B;
    for (const id of [a, b]) {
      N(id).w = colW;
      N(id).cy = y + N(id).h / 2;
    }
    y += h + rowGap;
  }
  const INBOX = N('INBOX');
  INBOX.w = colW;
  INBOX.cx = B;
  INBOX.cy = y + 20 + INBOX.h / 2;
  const box = cluster('CF', graph.subs[0].title.toUpperCase(), ['SA', 'W', 'AE', 'RL', 'KV', 'CAP', 'CRON', 'EM'], nodes, { x: 14, top: 24, bottom: 36 });
  box.titlePos = { x: box.x + 18, y: box.y + box.h - 12, anchor: 'start', lines: [box.lines[0]] };
  const edges = [];
  let idx = 0;
  const pick = (from, to, nth = 0) => graph.edges.filter((e) => e.from === from && e.to === to)[nth];
  const push = (g, segs, o = {}) => edges.push(makeEdge(g, idx++, { segs, labelWrap: 110, ...o }, cfg));
  const W = N('W');
  const SA = N('SA');
  const railL = SA.cx - SA.w / 2 - 22;
  push(pick('V', 'SA'), smooth(anchor(V, 'B', -62), 'B', anchor(SA, 'T', 8), 'T', 34), { at: 0.5, dx: 22, dy: -4, labelWrap: 72 });
  push(pick('SA', 'V'), rounded([anchor(SA, 'L'), [railL, SA.cy], [railL, V.cy], anchor(V, 'L')], 16), { at: 0.42, dx: 54, dy: 0, labelWrap: 84 });
  push(pick('V', 'W', 0), smooth(anchor(V, 'B', 30), 'B', anchor(W, 'T', -50), 'T', 40), { at: 0.3, dx: 14, dy: 0, labelWrap: 80 });
  push(pick('V', 'W', 1), smooth(anchor(V, 'B', 72), 'B', anchor(W, 'T', -2), 'T', 40), { at: 0.72, dx: 18, dy: 0, labelWrap: 100 });
  push(pick('W', 'V'), rounded([anchor(W, 'R'), [W.cx + W.w / 2 + 20, W.cy], [W.cx + W.w / 2 + 20, V.cy], anchor(V, 'R')], 16), { at: 0.86, dx: 0, dy: 0, labelWrap: 92 });
  push(pick('W', 'RL'), smooth(anchor(W, 'B'), 'B', anchor(N('RL'), 'T'), 'T'));
  push(pick('W', 'AE'), smooth(anchor(W, 'L', 18), 'L', anchor(N('AE'), 'T'), 'T', 40), { at: 0.55, dx: 46, dy: 6, labelWrap: 100 });
  push(pick('RL', 'CAP'), smooth(anchor(N('RL'), 'B'), 'B', anchor(N('CAP'), 'T'), 'T'), { at: 0.5, dx: 70, labelWrap: 120 });
  push(pick('CAP', 'KV'), smooth(anchor(N('CAP'), 'L'), 'L', anchor(N('KV'), 'R'), 'R'), { at: 0.5, dy: -22, labelWrap: 80 });
  push(pick('CAP', 'EM'), smooth(anchor(N('CAP'), 'B'), 'B', anchor(N('EM'), 'T'), 'T'), { at: 0.5, dx: 62, labelWrap: 90 });
  push(pick('EM', 'KV'), smooth(anchor(N('EM'), 'T', -40), 'T', anchor(N('KV'), 'B', 40), 'B', 30), { at: 0.5, dx: -24, dy: -2, labelWrap: 90 });
  push(pick('CRON', 'EM'), smooth(anchor(N('CRON'), 'R'), 'R', anchor(N('EM'), 'L'), 'L'), { at: 0.5, dy: -20, labelWrap: 80 });
  push(pick('CRON', 'KV'), smooth(anchor(N('CRON'), 'T'), 'T', anchor(N('KV'), 'B', -34), 'B', 22), { at: 0.5, dx: -36, labelWrap: 90 });
  push(pick('EM', 'INBOX'), smooth(anchor(N('EM'), 'B'), 'B', anchor(INBOX, 'T'), 'T'));
  return finish({ nodes: [...nodes.values()], clusters: [box], edges }, 6);
}
