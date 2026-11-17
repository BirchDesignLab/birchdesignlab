// Mermaid layout extraction for the README chart builder.
//
// Mermaid (pinned, see MERMAID_VERSION) is used for what it is good at: laying
// a flowchart out. We render each README block in headless Chromium with
// htmlLabels off, with Marcellus and Spectral loaded so the text is measured in
// the faces we will draw it in, and then read the geometry back out of the DOM:
// node boxes, cluster boxes, edge paths, label lines. render.mjs redraws all of
// it from scratch in the brand style, so none of Mermaid's own styling (or its
// default arrowheads and grey boxes) survives.
//
// The Mermaid UMD bundle is fetched once from jsDelivr into scripts/readme/.out
// (gitignored) and verified against a pinned sha256. The same version is what
// scripts/readme/mermaid-check.mjs validates the README against.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

export const MERMAID_VERSION = '11.4.1';
const MERMAID_SHA256 = 'a43bc1afd446f9c4cc66ac5dd45d02e8d65e26fc5344ec0ef787f88d6ddb6f9e';
const here = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(here, '../../..');
const CACHE = resolve(ROOT, 'scripts/readme/.out');

export async function ensureMermaid() {
  const file = resolve(CACHE, `mermaid-${MERMAID_VERSION}.min.js`);
  const ok = () => createHash('sha256').update(readFileSync(file)).digest('hex') === MERMAID_SHA256;
  if (!existsSync(file) || !ok()) {
    mkdirSync(CACHE, { recursive: true });
    const url = `https://cdn.jsdelivr.net/npm/mermaid@${MERMAID_VERSION}/dist/mermaid.min.js`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`could not fetch ${url}: ${res.status}`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    if (!ok()) throw new Error(`mermaid bundle sha256 mismatch for ${url}`);
  }
  return file;
}

function fontDataUri(pkg, file) {
  const buf = readFileSync(resolve(ROOT, 'node_modules/@fontsource', pkg, 'files', file));
  return `data:font/woff2;base64,${buf.toString('base64')}`;
}

const MEASURE_FONTS = [
  ['Marcellus', 'normal', 'marcellus', 'marcellus-latin-400-normal.woff2'],
  ['Spectral', 'normal', 'spectral', 'spectral-latin-400-normal.woff2'],
  ['Spectral', 'italic', 'spectral', 'spectral-latin-400-italic.woff2'],
];

/**
 * Lay out every request in one browser. A request is
 * { src, direction?, fontSize, headSize, edgeSize, nodeSpacing, rankSpacing,
 *   padding, wrap }. Returns one geometry model per request.
 */
export async function layoutAll(requests) {
  const mermaidFile = await ensureMermaid();
  const require = createRequire(resolve(ROOT, 'package.json'));
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
    await page.setContent('<!doctype html><meta charset="utf-8"><body></body>');
    await page.addScriptTag({ path: mermaidFile });
    await page.evaluate(async (fonts) => {
      for (const [family, style, uri] of fonts) {
        const f = new FontFace(family, `url(${uri})`, { style, weight: '400' });
        document.fonts.add(await f.load());
      }
    }, MEASURE_FONTS.map(([family, style, pkg, file]) => [family, style, fontDataUri(pkg, file)]));
    const out = [];
    for (let i = 0; i < requests.length; i++) {
      const graph = await page.evaluate(parseInPage, requests[i].src);
      const model = requests[i].dagre === false ? null : await page.evaluate(extractInPage, { req: requests[i], idx: i });
      if (model) reconcile(graph, model);
      out.push({ graph, model });
    }
    return out;
  } finally {
    await browser.close();
  }
}

/**
 * Pair every dagre edge with the parsed graph's edge by its index (Mermaid numbers
 * edge ids L_<from>_<to>_<index> in source order) instead of splitting the id on
 * underscores, and check what was drawn against what was parsed. Throws on any
 * disagreement: unknown endpoints, a different edge count, or a label that is not
 * the parsed edge's text.
 */
function reconcile(graph, model) {
  const known = new Set([...graph.vertices.map((v) => v.id), ...graph.subs.map((s) => s.id)]);
  for (const e of graph.edges) {
    for (const end of [e.from, e.to]) if (!known.has(end)) throw new Error(`edge ${e.from} to ${e.to}: ${end} is not a node or subgraph`);
  }
  if (model.edges.length !== graph.edges.length) throw new Error(`dagre drew ${model.edges.length} edges, the graph has ${graph.edges.length}`);
  const norm = (t) => t.replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ').trim();
  for (const e of model.edges) {
    const idx = Number(/_(\d+)$/.exec(e.id)?.[1]);
    const g = graph.edges[idx];
    if (!g) throw new Error(`edge id ${e.id} has no parsed edge`);
    e.from = g.from;
    e.to = g.to;
    const drawn = e.label ? norm(e.label.lines.join(' ')) : '';
    if (drawn !== norm(g.text)) throw new Error(`edge ${g.from} to ${g.to}: drew label ${JSON.stringify(drawn)}, parsed ${JSON.stringify(norm(g.text))}`);
  }
}

// Runs inside the page. The logical graph, straight from Mermaid's parser: the
// vertices with their raw labels, the edges, the subgraphs. Charts that are laid
// out by hand (specs.mjs) start from this and never use dagre's positions.
async function parseInPage(src) {
  const m = window.mermaid;
  m.initialize({ startOnLoad: false });
  const d = await m.mermaidAPI.getDiagramFromText(src);
  const subs = d.db.getSubGraphs().map((s) => ({ id: s.id, nodes: [...s.nodes], title: s.title }));
  const subIds = new Set(subs.map((s) => s.id));
  const v = d.db.getVertices();
  const vertices = [...(v instanceof Map ? v.entries() : Object.entries(v))]
    .filter(([k]) => !subIds.has(k))
    .map(([k, x]) => ({
      id: k,
      text: String(x.text ?? k),
      shape: x.type === 'diamond' ? 'rhombus' : 'rect',
      classes: [...(x.classes ?? [])],
    }));
  const edges = d.db.getEdges().map((e) => ({
    from: e.start,
    to: e.end,
    text: String(e.text ?? ''),
    dotted: e.stroke === 'dotted',
    both: /^double_/.test(e.type),
  }));
  return { dir: d.db.getDirection?.() ?? 'TB', vertices, edges, subs };
}

// Runs inside the page. Must be self-contained.
async function extractInPage({ req, idx }) {
  let src = req.src;
  if (req.direction) src = src.replace(/^(\s*flowchart\s+)(LR|RL|TB|TD|BT)/m, `$1${req.direction}`);

  const old = document.getElementById('bdl-measure-css');
  if (old) old.remove();
  const css = document.createElement('style');
  css.id = 'bdl-measure-css';
  css.textContent = `
    svg .node text, svg .node text * { font-family: Spectral, serif !important; font-size: ${req.fontSize}px !important; font-weight: 400 !important; font-style: normal !important; }
    svg .node text > tspan.text-outer-tspan:first-of-type, svg .node text > tspan.text-outer-tspan:first-of-type * { font-family: Marcellus, serif !important; font-size: ${req.headSize}px !important; }
    svg .edgeLabel text, svg .edgeLabel text * { font-family: Spectral, serif !important; font-style: italic !important; font-size: ${req.edgeSize}px !important; font-weight: 400 !important; }
    svg .cluster-label text, svg .cluster-label text * { font-family: Marcellus, serif !important; font-size: ${req.clusterSize}px !important; letter-spacing: 0.14em !important; font-weight: 400 !important; }
  `;
  document.head.appendChild(css);

  const m = window.mermaid;
  m.initialize({
    startOnLoad: false,
    theme: 'base',
    securityLevel: 'strict',
    htmlLabels: false,
    themeVariables: { fontFamily: 'Spectral, serif', fontSize: `${req.fontSize}px` },
    flowchart: {
      htmlLabels: false,
      curve: 'basis',
      useMaxWidth: false,
      nodeSpacing: req.nodeSpacing,
      rankSpacing: req.rankSpacing,
      padding: req.padding,
      wrappingWidth: req.wrap,
      diagramPadding: 0,
    },
  });
  const id = `bdlchart${idx}`;
  const { svg } = await m.render(id, src);
  const holder = document.createElement('div');
  holder.style.cssText = 'position:absolute;left:0;top:0;';
  holder.innerHTML = svg;
  document.body.appendChild(holder);
  const root = holder.querySelector('svg');
  const vb = root.viewBox.baseVal;
  const rr = root.getBoundingClientRect();
  const sx = vb.width / rr.width;
  const rect = (el) => {
    const r = el.getBoundingClientRect();
    return { x: (r.left - rr.left) * sx + vb.x, y: (r.top - rr.top) * sx + vb.y, w: r.width * sx, h: r.height * sx };
  };
  const lines = (g) =>
    [...g.querySelectorAll('text > tspan.text-outer-tspan')].map((t) => t.textContent.replace(/\s+/g, ' ').trim()).filter((s) => s.length > 0);

  const nodes = [];
  for (const g of root.querySelectorAll('g.node')) {
    const shapeEl = g.querySelector('rect, polygon, path.label-container, circle, ellipse') || g;
    const b = rect(shapeEl);
    const nid = g.id.replace(/^flowchart-/, '').replace(/-\d+$/, '');
    nodes.push({
      id: nid,
      classes: [...g.classList].filter((c) => !['node', 'default', 'flowchart-label', 'clickable'].includes(c)),
      shape: shapeEl.tagName === 'polygon' ? 'rhombus' : 'rect',
      cx: b.x + b.w / 2,
      cy: b.y + b.h / 2,
      w: b.w,
      h: b.h,
      lines: lines(g),
    });
  }
  const clusters = [];
  for (const g of root.querySelectorAll('g.cluster')) {
    const r = g.querySelector('rect');
    const b = rect(r);
    clusters.push({ id: g.id, x: b.x, y: b.y, w: b.w, h: b.h, lines: lines(g), classes: [...g.classList] });
  }
  const edgeEls = [...root.querySelectorAll('g.edgePaths > path')];
  const labelEls = [...root.querySelectorAll('g.edgeLabels > g')];
  // Mermaid's edgeLabels are not in edgePaths order, so pair each label with
  // the edge whose path passes nearest its centre (labels sit mid-path).
  const labelled = labelEls
    .map((g) => {
      const ls = lines(g);
      if (!ls.length) return null;
      const b = rect(g.querySelector('text'));
      return { lines: ls, cx: b.x + b.w / 2, cy: b.y + b.h / 2, w: b.w, h: b.h };
    })
    .filter(Boolean);
  const samples = edgeEls.map((p) => {
    const len = p.getTotalLength();
    const m = p.getScreenCTM();
    const pts = [];
    for (let k = 0; k <= 40; k++) {
      const q = p.getPointAtLength((len * k) / 40);
      const r = new DOMPoint(q.x, q.y).matrixTransform(m);
      pts.push([(r.x - rr.left) * sx + vb.x, (r.y - rr.top) * sx + vb.y]);
    }
    return pts;
  });
  const pairs = [];
  labelled.forEach((l, li) =>
    samples.forEach((pts, ei) => {
      const d = Math.min(...pts.map(([x, y]) => Math.hypot(x - l.cx, y - l.cy)));
      pairs.push({ li, ei, d });
    }),
  );
  pairs.sort((a, b) => a.d - b.d || a.ei - b.ei || a.li - b.li);
  const labelOf = new Map();
  const usedL = new Set();
  for (const { li, ei } of pairs) {
    if (labelOf.has(ei) || usedL.has(li)) continue;
    labelOf.set(ei, labelled[li]);
    usedL.add(li);
  }
  const edges = edgeEls.map((p, i) => {
    const parts = p.id.replace(/^L_/, '').replace(/_\d+$/, '').split('_');
    const label = labelOf.get(i) ?? null;
    return {
      id: p.id,
      from: parts[0],
      to: parts[1],
      d: p.getAttribute('d'),
      dotted: /edge-pattern-dotted/.test(p.getAttribute('class')),
      markerEnd: !!p.getAttribute('marker-end'),
      markerStart: !!p.getAttribute('marker-start'),
      label,
    };
  });
  holder.remove();
  return { width: vb.width, height: vb.height, nodes, clusters, edges };
}
