// Chart 1, "How the site is served", laid out as a gauntlet. Desktop: a short GET
// lane on the left (Visitor, Static Assets, the 404), the POST lane as one straight
// spine that crosses four thin checkpoint bars (honeypot, rate limit, validate,
// daily cap), Email then the inbox at the foot, the KV and cron retry as a side
// loop, the beacon and Analytics Engine off the spine. Phone: the same graph as two
// columns. The checkpoint bars are the Mermaid's own rate limiter and daily cap
// nodes plus its two edge labels ("honeypot then", "validate with ...") drawn as
// bars; nothing is added to the graph.
import { anchor, cluster, finish, makeEdge, makeNodes, rounded, smooth } from './manual.mjs';
import { f1 } from './geometry.mjs';
import { KEYFRAMES, RING_CSS, anim, chain, drawCss, pulse, ringEl, traveler } from './motion.mjs';
import { width, wrapBalanced as wrap } from './textmetrics.mjs';

const cfgOf = (chart) => {
  const r = chart.render;
  return { head: r.headSize, body: r.fontSize, edge: r.edgeSize, wrap: r.wrap, padX: r.padding + 6, padY: r.padding - 1, edgeWrap: r.edgeWrap ?? 150 };
};

/** A synthetic checkpoint bar carrying an edge label in small caps. */
function labelBar(id, text, w, cfg, size) {
  const lines = wrap('display', size, text.toUpperCase(), w - 36, 0.14);
  return { id, classes: ['cloud'], shape: 'bar', barLabel: true, cx: 0, cy: 0, w, h: lines.length * 17 + 14, lines, headN: lines.length, scale: 1 };
}

const edgeText = (graph, from, to) => graph.edges.find((e) => e.from === from && e.to === to).text;

export function servedLayout(graph, chart, variant = 'desktop') {
  const phone = variant === 'phone';
  const cfg = cfgOf(chart);
  const nodes = makeNodes(graph, cfg);
  const N = (id) => nodes.get(id);
  const spineW = phone ? 178 : 270;
  const barW = phone ? 178 : 372;
  const colX = phone ? 104 : 0; // the spine
  const sideX = phone ? -104 : 340;
  const bars = {
    HP: labelBar('HP', edgeText(graph, 'W', 'RL'), phone ? 170 : 330, cfg, chart.render.clusterSize),
    VAL: labelBar('VAL', edgeText(graph, 'RL', 'CAP'), phone ? 170 : 330, cfg, chart.render.clusterSize),
  };
  nodes.set('HP', bars.HP);
  nodes.set('VAL', bars.VAL);
  for (const id of ['RL', 'CAP']) {
    const n = N(id);
    if (!phone) {
      n.shape = 'bar';
      n.w = barW;
      n.h = 48;
      n.lines = [n.lines[0], n.lines.slice(1).join(' ')];
      n.headN = 1;
    } else n.w = barW;
  }
  const V = N('V');
  V.w = phone ? 200 : 250;
  const g = phone ? 30 : 34;
  // ---- the spine, top to bottom ----
  V.cx = phone ? 0 : colX;
  V.cy = V.h / 2;
  let y = V.h + (phone ? 150 : 96);
  const put = (n, cx, w) => {
    n.cx = cx;
    if (w) n.w = w;
    n.cy = y + n.h / 2;
    y += n.h;
  };
  const W = N('W');
  put(W, colX, spineW);
  y += g;
  put(bars.HP, colX);
  y += g;
  put(N('RL'), colX, barW);
  y += g;
  put(bars.VAL, colX);
  y += g;
  put(N('CAP'), colX, barW);
  y += phone ? 44 : 54;
  const EM = N('EM');
  put(EM, colX, spineW);
  const cfBottom = y + (phone ? 66 : 54);
  const INBOX = N('INBOX');
  INBOX.cx = colX;
  INBOX.w = spineW;
  INBOX.cy = cfBottom + 70 + INBOX.h / 2;
  // ---- the side lanes ----
  const SA = N('SA');
  const AE = N('AE');
  const KV = N('KV');
  const CRON = N('CRON');
  const side = phone ? 166 : 200;
  for (const n of [SA, AE, KV, CRON]) n.w = side;
  SA.cx = sideX * (phone ? 1 : -1);
  SA.cy = W.cy;
  if (phone) {
    // left column: static assets, analytics, kv, cron
    AE.cx = sideX;
    AE.cy = W.cy + W.h / 2 + 60 + AE.h / 2;
    KV.cx = sideX;
    KV.cy = (N('CAP').cy + EM.cy) / 2 + 6;
    CRON.cx = sideX;
    CRON.cy = EM.cy + 66;
    SA.cx = sideX;
    SA.cy = W.cy - 6;
  } else {
    AE.cx = sideX + 40;
    AE.cy = W.cy;
    KV.cx = SA.cx;
    KV.cy = (N('CAP').cy + EM.cy) / 2 + 6;
    CRON.cx = SA.cx;
    CRON.cy = EM.cy + 62;
  }
  const members = ['W', 'SA', 'AE', 'HP', 'RL', 'VAL', 'CAP', 'EM', 'KV', 'CRON'];
  const box = cluster('CF', graph.subs[0].title.toUpperCase(), members, nodes, { x: phone ? 14 : 26, top: 24, bottom: 38 });
  box.titlePos = { x: box.x + 20, y: box.y + box.h - 14, anchor: 'start', lines: [box.lines[0]] };

  // ---- edges ----
  const edges = [];
  let idx = 0;
  const pick = (from, to, nth = 0) => graph.edges.filter((e) => e.from === from && e.to === to)[nth];
  const push = (ge, segs, o = {}) => {
    const e = makeEdge(ge, graph.edges.indexOf(ge), { segs, labelWrap: phone ? 100 : 150, ...o }, cfg);
    if (o.noLabel) e.label = null;
    edges.push(e);
    idx++;
    return e;
  };
  const dxs = phone ? 0 : 0;
  void dxs;
  if (!phone) {
    // GET lane (left): out and back
    push(pick('V', 'SA'), smooth(anchor(V, 'L', -6), 'L', anchor(SA, 'T', -40), 'T', 60), { at: 0.55, dx: -62, dy: -16, labelWrap: 120 });
    push(pick('SA', 'V'), smooth(anchor(SA, 'T', 44), 'T', anchor(V, 'B', -70), 'B', 46), { at: 0.4, dx: -4, dy: 8, labelWrap: 130 });
    // POST lane: the spine
    push(pick('V', 'W', 0), smooth(anchor(V, 'B', -4), 'B', anchor(W, 'T', -4), 'T'), { at: 0.3, dx: -72, dy: 0, labelWrap: 120 });
    push(pick('V', 'W', 1), smooth(anchor(V, 'B', 70), 'B', anchor(W, 'T', 70), 'T', 30), { at: 0.5, dx: 62, dy: 0, labelWrap: 150 });
    push(pick('W', 'V'), rounded([anchor(W, 'R', -22), [W.cx + W.w / 2 + 58, W.cy - 22], [W.cx + W.w / 2 + 58, V.cy], anchor(V, 'R')], 18), { at: 0.5, dx: 70, dy: 0, labelWrap: 120 });
    push(pick('W', 'AE'), smooth(anchor(W, 'R', 20), 'R', anchor(AE, 'L', 20), 'L', 40), { at: 0.5, dx: 0, dy: -26, labelWrap: 130 });
    push(pick('W', 'RL'), smooth(anchor(W, 'B'), 'B', anchor(N('RL'), 'T'), 'T'), { noLabel: true });
    push(pick('RL', 'CAP'), smooth(anchor(N('RL'), 'B'), 'B', anchor(N('CAP'), 'T'), 'T'), { noLabel: true });
    push(pick('CAP', 'EM'), smooth(anchor(N('CAP'), 'B'), 'B', anchor(EM, 'T'), 'T'), { at: 0.5, dx: 72, labelWrap: 120 });
    push(pick('EM', 'INBOX'), smooth(anchor(EM, 'B'), 'B', anchor(INBOX, 'T'), 'T'));
    // the retry loop (left of the spine, lower)
    push(pick('CAP', 'KV'), smooth(anchor(N('CAP'), 'L'), 'L', anchor(KV, 'T', 20), 'T', 40), { at: 0.5, dx: -40, dy: -16, labelWrap: 90 });
    push(pick('EM', 'KV'), smooth(anchor(EM, 'L', -10), 'L', anchor(KV, 'R', -4), 'R'), { at: 0.5, dx: 0, dy: -22, labelWrap: 130 });
    push(pick('CRON', 'KV'), smooth(anchor(CRON, 'T'), 'T', anchor(KV, 'B'), 'B'), { at: 0.5, dx: -60, labelWrap: 120 });
    push(pick('CRON', 'EM'), smooth(anchor(CRON, 'R'), 'R', anchor(EM, 'B', -50), 'B', 40), { at: 0.5, dx: 0, dy: 24, labelWrap: 120 });
  } else {
    const railL = SA.cx - SA.w / 2 - 22;
    push(pick('V', 'SA'), smooth(anchor(V, 'B', -62), 'B', anchor(SA, 'T', 8), 'T', 34), { at: 0.5, dx: 22, dy: -4, labelWrap: 72 });
    push(pick('SA', 'V'), rounded([anchor(SA, 'L'), [railL, SA.cy], [railL, V.cy], anchor(V, 'L')], 16), { at: 0.42, dx: 54, dy: 0, labelWrap: 84 });
    push(pick('V', 'W', 0), smooth(anchor(V, 'B', 30), 'B', anchor(W, 'T', -50), 'T', 40), { at: 0.3, dx: 14, dy: 0, labelWrap: 80 });
    push(pick('V', 'W', 1), smooth(anchor(V, 'B', 72), 'B', anchor(W, 'T', -2), 'T', 40), { at: 0.72, dx: 18, dy: 0, labelWrap: 100 });
    push(pick('W', 'V'), rounded([anchor(W, 'R'), [W.cx + W.w / 2 + 20, W.cy], [W.cx + W.w / 2 + 20, V.cy], anchor(V, 'R')], 16), { at: 0.86, dx: 0, dy: 0, labelWrap: 92 });
    push(pick('W', 'AE'), smooth(anchor(W, 'L', 18), 'L', anchor(AE, 'T'), 'T', 40), { at: 0.55, dx: 46, dy: 6, labelWrap: 100 });
    push(pick('W', 'RL'), smooth(anchor(W, 'B'), 'B', anchor(N('RL'), 'T'), 'T'), { noLabel: true });
    push(pick('RL', 'CAP'), smooth(anchor(N('RL'), 'B'), 'B', anchor(N('CAP'), 'T'), 'T'), { noLabel: true });
    push(pick('CAP', 'EM'), smooth(anchor(N('CAP'), 'B'), 'B', anchor(EM, 'T'), 'T'), { at: 0.5, dx: -62, labelWrap: 90 });
    push(pick('EM', 'INBOX'), smooth(anchor(EM, 'B'), 'B', anchor(INBOX, 'T'), 'T'));
    push(pick('CAP', 'KV'), smooth(anchor(N('CAP'), 'L'), 'L', anchor(KV, 'T', 20), 'T', 40), { at: 0.5, dx: -30, dy: -16, labelWrap: 80 });
    push(pick('EM', 'KV'), smooth(anchor(EM, 'L', -12), 'L', anchor(KV, 'R', -4), 'R'), { at: 0.5, dx: 0, dy: -24, labelWrap: 90 });
    push(pick('CRON', 'KV'), smooth(anchor(CRON, 'T'), 'T', anchor(KV, 'B'), 'B'), { at: 0.5, dx: -44, labelWrap: 80 });
    push(pick('CRON', 'EM'), smooth(anchor(CRON, 'R'), 'R', anchor(EM, 'B', -50), 'B', 30), { at: 0.5, dx: 0, dy: 22, labelWrap: 90 });
  }
  return finish({ nodes: [...nodes.values()], clusters: [box], edges }, 6);
}

// ---------------------------------------------------------------- motion
// One dot clears each bar and the bar ticks as it passes; a second, brown dot is
// the failure: it drops from Email into KV, and the cron loops it back.
export function servedCompose(ctx) {
  const { t, nodes, edges } = ctx;
  const E = (a, b, nth = 0) => {
    const e = edges.filter((x) => x.from === a && x.to === b)[nth];
    if (!e) throw new Error(`served: no edge ${a} > ${b}`);
    return e;
  };
  const speed = ctx.variant === 'phone' ? 430 : 560;
  let css = KEYFRAMES + RING_CSS(t.glow);
  const under = {};
  const over = {};
  let tv = '';
  let k = 0;
  let end = 0;
  const ring = (id, at) => {
    const key = `${id}-${k++}`;
    under[id] = (under[id] ?? '') + ringEl(nodes.get(id), key);
    css += pulse(key, at);
    end = Math.max(end, at + 0.95);
  };
  const run = (route, start, color) => {
    const c = chain(route.map(([a, b, n]) => E(a, b, n ?? 0)), speed);
    tv += traveler(c.d, start, c.total, color);
    for (const a of c.arrivals) ring(a.node, start + a.at - 0.05);
    end = Math.max(end, start + c.total);
    return c;
  };
  ring('V', 0.1);
  // the GET lane: out to Static Assets and back with the 404
  run([['V', 'SA'], ['SA', 'V']], 0.25, t.glow);
  // the POST lane: down the spine
  const start = 0.8;
  const post = run([['V', 'W', 0], ['W', 'RL'], ['RL', 'CAP'], ['CAP', 'EM'], ['EM', 'INBOX']], start, t.glow);
  const V = nodes.get('V');
  const top = V.cy + V.h / 2;
  const total = post.total;
  // checkpoint ticks: each bar ticks as the dot's height reaches it
  const barIds = ['HP', 'RL', 'VAL', 'CAP'];
  const bottomY = nodes.get('INBOX').cy;
  barIds.forEach((id, i) => {
    const n = nodes.get(id);
    const frac = Math.max(0, Math.min(1, (n.cy - top) / (bottomY - top)));
    const at = start + total * frac * 0.97 + 0.05;
    const cx = n.cx + n.w / 2 - 6;
    const cy = n.cy - n.h / 2 + 2;
    over[id] =
      `<g class="tk" id="tk-${id}"><circle cx="${f1(cx)}" cy="${f1(cy)}" r="11.5"/>` +
      `<path d="M${f1(cx - 5.2)} ${f1(cy + 0.4)}l3.6 3.9l6.6-8"/></g>`;
    css += `#tk-${id} circle{animation:bdl-fade .2s ease ${r2(at)}s both}` + drawCss(`#tk-${id} path`, `tk${id}`, 16, 0.25, at + 0.08, 'ease');
    end = Math.max(end, at + 0.4);
    void i;
  });
  css += `.tk circle{fill:${t.accent};stroke:${t.field};stroke-width:2.6}.tk path{fill:none;stroke:${t.onAccent};stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}`;
  ctx.pairs.push({ where: 'tick on its badge', fg: t.onAccent, bg: t.accent });
  // the failure: a second dot drops Email into KV, then the cron loops it back
  const emAt = start + post.arrivals.find((a) => a.node === 'EM').at;
  const held = run([['EM', 'KV']], emAt + 0.05, t.accentStrong);
  run([['CRON', 'EM']], emAt + 0.05 + held.total + 0.35, t.accentStrong);
  return { css, nodeUnder: under, nodeOver: over, over: tv, duration: end, textSizes: [ctx.sizes.cluster] };
}

const r2 = (n) => Math.round(n * 100) / 100;
void width;
