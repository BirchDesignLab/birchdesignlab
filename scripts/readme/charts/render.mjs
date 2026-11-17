// Redraws an extracted Mermaid layout (layout.mjs) as a brand SVG. Nothing of
// Mermaid's own markup survives: boxes, labels, edges and arrowheads are drawn
// here, in the site's palette, with Marcellus and Spectral embedded.
//
// The renderer is scheme-agnostic geometry plus a stylesheet. Per-chart extras
// (the trunk, tier stripes, tick marks, motion) come from specs.mjs through
// compose(ctx), which returns CSS plus SVG fragments to splice in.
import {
  arrowD, endOf, endTangent, esc, f1, parsePath, pathToD, polyLength, rhombusD, rng, sample, startOf, startTangent,
  trimEnd, trimStart,
} from './geometry.mjs';
import { BUILDER_VERSION, FONT_STACK, contrast, mix, palette, role } from './theme.mjs';
import { fontCss } from './fonts.mjs';
import { width as textWidth } from './textmetrics.mjs';

export const CANVAS_W = 830; // the README column: the SVG's intrinsic width
export const MARGIN_X = 36;
export const MARGIN_TOP = 64;
export const MARGIN_BOTTOM = 40;
export const CAP_SIZE = 15;

/** Does this chart use its own layout (rather than dagre's) in this variant? */
export const handLaid = (spec, variant) => !!spec?.layout && (spec.layoutVariants ?? ['desktop', 'phone']).includes(variant);

/** Geometry shared by both schemes. `spec.adjust` may rewrite the model first. */
export function prepare(chart, { graph, model }, spec, variant = 'desktop') {
  const m = handLaid(spec, variant) ? spec.layout(graph, chart, variant) : structuredClone(model);
  if (spec?.adjust) spec.adjust(m, chart);
  const nodes = new Map();
  for (const n of m.nodes) {
    n.focus = (chart.focus ?? []).includes(n.id);
    n.cls = n.classes[0] ?? 'you';
    nodes.set(n.id, n);
  }
  const edges = m.edges.map((e, i) => {
    const segs = parsePath(e.d);
    const hasEnd = e.markerEnd;
    const hasStart = e.markerStart;
    let body = segs;
    if (hasEnd) body = trimEnd(body, 3);
    if (hasStart) body = trimStart(body, 3);
    const tipEnd = endOf(segs);
    const tipStart = startOf(segs);
    return {
      ...e,
      i,
      key: `${e.from}>${e.to}`,
      dom: `e${i}`,
      segs,
      d: pathToD(body),
      headD: hasEnd ? arrowD(tipEnd, endTangent(segs)) : '',
      tailD: hasStart ? arrowD(tipStart, startTangent(segs).map((v) => -v)) : '',
      len: polyLength(sample(segs)),
    };
  });
  const mx = variant === 'phone' ? 24 : MARGIN_X;
  const W = Math.ceil(m.width) + mx * 2;
  const H = Math.ceil(m.height) + MARGIN_TOP + MARGIN_BOTTOM;
  return { chart, spec, variant, model: m, nodes, edges, W, H, scale: (variant === 'phone' ? 360 : CANVAS_W) / W, off: { x: mx, y: MARGIN_TOP }, mx };
}

function nodeBlock(n, sizes, glyphs) {
  const hn = n.headN ?? 1;
  const heads = n.lines.slice(0, hn);
  const rest = n.lines.slice(hn);
  const hLH = sizes.head * 1.22;
  const dLH = sizes.body * 1.3;
  const total = hLH * heads.length + rest.length * dLH;
  let y = n.cy - total / 2;
  let out = '';
  heads.forEach((head, i) => {
    glyphs.display += head;
    out += `<text class="h" x="${f1(n.cx)}" y="${f1(y + i * hLH + hLH / 2 + sizes.head * 0.32)}">${esc(head)}</text>`;
  });
  y += hLH * heads.length;
  if (rest.length) {
    out += '<text class="d">';
    rest.forEach((l, i) => {
      glyphs.body += l;
      out += `<tspan x="${f1(n.cx)}" y="${f1(y + i * dLH + dLH / 2 + sizes.body * 0.3)}">${esc(l)}</tspan>`;
    });
    out += '</text>';
  }
  return { svg: out, needed: total + 8 };
}

function nodeShape(n, style) {
  const x = n.cx - n.w / 2;
  const y = n.cy - n.h / 2;
  if (n.shape === 'rhombus') return `<path class="s" d="${rhombusD(n.cx, n.cy, n.w, n.h)}"/>`;
  if (n.shape === 'trunk') return '';
  if (style === 'specimen') {
    return (
      `<rect class="s" x="${f1(x)}" y="${f1(y)}" width="${f1(n.w)}" height="${f1(n.h)}" rx="3"/>` +
      `<rect class="rule" x="${f1(x + 5)}" y="${f1(y + 5)}" width="${f1(n.w - 10)}" height="${f1(n.h - 10)}" rx="1.5"/>`
    );
  }
  return `<rect class="s" x="${f1(x)}" y="${f1(y)}" width="${f1(n.w)}" height="${f1(n.h)}" rx="11"/>`;
}

export function barkDashes(seed, W, H, t, mx = MARGIN_X) {
  const r = rng(seed);
  let d = '';
  const strip = (x0, x1, y0, y1, count) => {
    for (let k = 0; k < count; k++) {
      const len = 9 + r() * 20;
      const x = x0 + r() * Math.max(1, x1 - x0 - len);
      const y = y0 + r() * (y1 - y0);
      d += `M${f1(x)} ${f1(y)}h${f1(len)}`;
    }
  };
  const edgeW = mx - 14;
  strip(10, 10 + edgeW, 16, H - 16, Math.round(H / 26));
  strip(W - 10 - edgeW, W - 10, 16, H - 16, Math.round(H / 26));
  strip(mx + 20, W - mx - 20, H - MARGIN_BOTTOM + 14, H - 14, Math.round(W / 70));
  return `<path class="bark" d="${d}"/>`;
}

export function renderScheme(P, scheme, { sourceHash }) {
  const { chart, model, nodes, edges, W, H, off } = P;
  const t = palette(scheme);
  const sizes = {
    head: chart.render.headSize,
    body: chart.render.fontSize,
    edge: chart.render.edgeSize,
    cluster: chart.render.clusterSize,
  };
  const glyphs = { display: '', body: '', italic: '' };
  const pairs = [];
  const styleKind = chart.nodeStyle ?? 'plain';
  const roles = {};
  const roleOf = (n) => {
    const key = n.focus ? 'focus' : n.cls;
    if (!roles[key]) roles[key] = role(t, n.cls, n.focus);
    return roles[key];
  };

  // ---- compose hook (spec-specific decoration and motion) ----
  const ctx = { chart, scheme, t, P, variant: P.variant, nodes, edges, model, sizes, glyphs, off, roleOf, styleKind, pairs };
  const extra = P.spec?.compose?.(ctx) ?? {};
  const nodeUnder = extra.nodeUnder ?? {};
  const nodeOver = extra.nodeOver ?? {};

  // ---- clusters ----
  // The box goes under the edges; its title goes over them with a halo, in the
  // corner (top first) that the fewest edge points pass through.
  const edgePts = edges.flatMap((e) => sample(parsePath(e.d), 12));
  let clusters = '';
  let clusterTitles = '';
  for (const c of model.clusters) {
    const title = c.lines.join(' ').toUpperCase();
    glyphs.display += title;
    const tw = textWidth('display', sizes.cluster, title, 0.2) + 8;
    const th = sizes.cluster + 6;
    const cand = [
      { x: c.x + 20, y: c.y + 26, a: 'start', pen: 0 },
      { x: c.x + c.w - 20, y: c.y + 26, a: 'end', pen: 0.5 },
      { x: c.x + 20, y: c.y + c.h - 14, a: 'start', pen: 1 },
      { x: c.x + c.w - 20, y: c.y + c.h - 14, a: 'end', pen: 1.5 },
    ].map((k) => {
      const x0 = k.a === 'start' ? k.x - 4 : k.x - tw;
      const hits = edgePts.filter(([px, py]) => px > x0 && px < x0 + tw + 8 && py > k.y - th && py < k.y + 6).length;
      const onNode = model.nodes.filter((n) => x0 < n.cx + n.w / 2 && x0 + tw > n.cx - n.w / 2 && k.y - th < n.cy + n.h / 2 && k.y + 6 > n.cy - n.h / 2).length;
      return { ...k, score: hits * 10 + onNode * 1000 + k.pen };
    });
    const best = cand.sort((a, b) => a.score - b.score)[0];
    if (c.titlePos) {
      const tp = c.titlePos;
      clusterTitles += `<text class="ct" id="ct-${esc(c.id)}" text-anchor="${tp.anchor}">${tp.lines
        .map((l, i) => `<tspan x="${f1(tp.x)}" y="${f1(tp.y + i * (sizes.cluster + 7))}">${esc(l)}</tspan>`)
        .join('')}</text>`;
      clusters += `<g class="cl" id="c-${esc(c.id)}"><rect class="cb" x="${f1(c.x)}" y="${f1(c.y)}" width="${f1(c.w)}" height="${f1(c.h)}" rx="20"/></g>`;
      continue;
    }
    clusters += `<g class="cl" id="c-${esc(c.id)}"><rect class="cb" x="${f1(c.x)}" y="${f1(c.y)}" width="${f1(c.w)}" height="${f1(c.h)}" rx="20"/></g>`;
    clusterTitles += `<text class="ct" id="ct-${esc(c.id)}" x="${f1(best.x)}" y="${f1(best.y)}" text-anchor="${best.a}">${esc(title)}</text>`;
  }
  pairs.push({ where: 'cluster title on cluster fill', fg: t.muted, bg: t.clusterFill });

  // ---- edges ----
  let edgeSvg = '';
  let labelSvg = '';
  for (const e of edges) {
    const dotted = e.dotted ? ' dot' : '';
    edgeSvg +=
      `<g class="ed" id="${e.dom}"><path class="el${dotted}" pathLength="1" d="${e.d}"/>` +
      (e.headD ? `<path class="eh" d="${e.headD}"/>` : '') +
      (e.tailD ? `<path class="eh" d="${e.tailD}"/>` : '') +
      '</g>';
    if (e.label) {
      const ls = e.label.lines;
      const lh = sizes.edge * 1.22;
      const top = e.label.cy - (ls.length * lh) / 2;
      let tx = `<text class="lb" id="${e.dom}l" text-anchor="middle">`;
      ls.forEach((l, i) => {
        glyphs.italic += l;
        tx += `<tspan x="${f1(e.label.cx)}" y="${f1(top + i * lh + lh / 2 + sizes.edge * 0.3)}">${esc(l)}</tspan>`;
      });
      labelSvg += tx + '</text>';
    }
  }
  pairs.push({ where: 'edge label on field', fg: t.muted, bg: t.field });
  pairs.push({ where: 'edge line on field (non-text, 3:1)', fg: t.edge, bg: t.field });

  // ---- nodes ----
  let nodeSvg = '';
  const fit = [];
  for (const n of model.nodes) {
    const r = roleOf(n);
    const cls = n.focus ? 'focus' : n.cls;
    const tb = nodeBlock(n, sizes, glyphs);
    if (n.shape !== 'trunk' && tb.needed > n.h + 2) fit.push(`${n.id} needs ${f1(tb.needed)} has ${f1(n.h)}`);
    const body = n.shape === 'trunk' ? '' : tb.svg;
    nodeSvg +=
      `<g class="nd ${cls}${n.shape === 'rhombus' ? ' dia' : ''}" id="n-${esc(n.id)}">` +
      (nodeUnder[n.id] ?? '') +
      nodeShape(n, styleKind) +
      (nodeOver[n.id] ?? '') +
      body +
      '</g>';
  }
  for (const [k, r] of Object.entries(roles)) {
    pairs.push({ where: `${k} heading on fill`, fg: r.head, bg: r.fill });
    pairs.push({ where: `${k} detail on fill`, fg: r.detail, bg: r.fill });
  }

  // ---- caption, bark dashes, background ----
  const capTitle = chart.caption.toUpperCase();
  glyphs.display += `FIG. ${chart.n} ${capTitle}`;
  pairs.push({ where: 'caption on field', fg: t.muted, bg: t.field });
  pairs.push({ where: 'caption number on field', fg: t.accentStrong, bg: t.field });
  const cap =
    `<text class="cap" x="${P.mx}" y="38"><tspan class="capn">FIG. ${chart.n}</tspan>` +
    `<tspan dx="16">${esc(capTitle)}</tspan></text>`;

  const capSize = P.variant === 'phone' ? Math.min(17, Math.max(CAP_SIZE, Math.ceil(11.4 / P.scale))) : CAP_SIZE;
  const css = [
    fontCss(glyphs),
    `.card{fill:${t.field};stroke:${t.line};stroke-width:1}`,
    `.bark{fill:none;stroke:${t.dash};stroke-opacity:${t.dashOpacity};stroke-width:2.6;stroke-linecap:round}`,
    `.cap{font:${capSize}px ${FONT_STACK.display};letter-spacing:.2em;fill:${t.muted}}.capn{fill:${t.accentStrong}}`,
    `.cb{fill:${t.clusterFill};stroke:${t.clusterStroke};stroke-width:1.2}`,
    `.ct{font:${sizes.cluster}px ${FONT_STACK.display};letter-spacing:.2em;fill:${t.muted};paint-order:stroke;stroke:${t.clusterFill};stroke-width:6px;stroke-linejoin:round}`,
    `.el{fill:none;stroke:${t.edge};stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}`,
    `.el.dot{stroke-dasharray:.1 7;stroke-width:2.8}`,
    `.eh{fill:${t.edge};stroke:${t.edge};stroke-width:1.2;stroke-linejoin:round}`,
    `.lb{font:italic ${sizes.edge}px ${FONT_STACK.body};fill:${t.muted};paint-order:stroke;stroke:${t.field};stroke-width:6px;stroke-linejoin:round;text-anchor:middle}`,
    `.s{stroke-width:1.5}`,
    `.rule{fill:none;stroke-width:.8}`,
    `.h{font:${sizes.head}px ${FONT_STACK.display};text-anchor:middle}`,
    `.d{font:${sizes.body}px ${FONT_STACK.body};text-anchor:middle}`,
    ...Object.entries(roles).map(
      ([k, r]) =>
        `.${k} .s{fill:${r.fill};stroke:${r.stroke}}.${k} .rule{stroke:${r.stroke};stroke-opacity:.6}.${k} .h{fill:${r.head}}.${k} .d{fill:${r.detail}}`,
    ),
    extra.css ?? '',
    '@media (prefers-reduced-motion:reduce){*{animation:none!important}.tv{display:none}}',
  ]
    .filter(Boolean)
    .join('\n');

  const dashes = barkDashes(chart.n * 7919 + (scheme === 'light' ? 1 : 2) + (P.variant === 'phone' ? 31 : 0), W, H, t, P.mx);
  const svgW = P.variant === 'phone' ? W : CANVAS_W;
  const svgH = Math.round((H * svgW) / W);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${svgW}" height="${svgH}" role="img" aria-labelledby="t d">` +
    `<title id="t">${esc(chart.title)}</title><desc id="d">${esc(chart.alt)}</desc>` +
    `<metadata data-chart="${chart.n}" data-scheme="${scheme}" data-variant="${P.variant}" data-source-hash="${sourceHash}" data-builder-version="${BUILDER_VERSION}" data-motion-s="${f1(extra.duration ?? 0)}"></metadata>` +
    `<style>${css}</style>` +
    `<rect class="card" x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="22"/>` +
    dashes +
    cap +
    `<g transform="translate(${off.x} ${off.y})">` +
    (extra.under ?? '') +
    `<g class="cls">${clusters}</g><g class="eds">${edgeSvg}</g><g class="clts">${clusterTitles}</g><g class="nds">${nodeSvg}</g><g class="lbs">${labelSvg}</g>` +
    (extra.over ?? '') +
    '</g></svg>\n';

  const used = [sizes.head, capSize];
  if (model.clusters.length) used.push(sizes.cluster);
  if (model.nodes.some((n) => n.lines.length > (n.headN ?? 1))) used.push(sizes.body);
  if (edges.some((e) => e.label)) used.push(sizes.edge);
  const minText = Math.min(...used);
  return { svg, W, H, pairs: pairs.map((p) => ({ ...p, ratio: contrast(p.fg, p.bg) })), minRendered: minText * P.scale, fit, scheme };
}
