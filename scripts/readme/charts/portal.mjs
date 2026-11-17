// Chart 4, the Portal showpiece: the seven design schools as paint chips, each in
// its own real palette and display face, read from the school's own theme files
// (src/themes/<id>/theme.css, src/styles/tokens.css) and font packages. The
// shared copy flows into each; the wordmark is the one element that pairs across
// all seven, and a viewfinder slides across it once. Content comes from
// scripts/readme/charts/data/portal.json, which must agree with the README's
// Mermaid block and school table (tests/readme-charts.test.ts).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { REPO } from './source.mjs';
import { fontCss, fontFace, subsetPinned } from './fonts.mjs';
import { esc, f1 } from './geometry.mjs';
import { KEYFRAMES, anim, traveler } from './motion.mjs';
import { shell } from './shell.mjs';
import { CAP_SIZE, MARGIN_BOTTOM, MARGIN_TOP, MARGIN_X } from './render.mjs';
import { contrast, mix, palette, role } from './theme.mjs';
import { measureTtf, wrap } from './textmetrics.mjs';

// ---- reading a school's real tokens -------------------------------------
function blockBody(css, selector) {
  const esc2 = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp(`^${esc2}\\s*\\{`, 'm').exec(css);
  if (!m) throw new Error(`selector not found: ${selector}`);
  let depth = 1;
  let i = m.index + m[0].length;
  const start = i;
  for (; i < css.length && depth > 0; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') depth--;
  }
  return css.slice(start, i - 1);
}

export function schoolTokens(school, scheme, names) {
  const css = readFileSync(resolve(REPO, school.css), 'utf8');
  const bodyOf = (sels) => sels.map((s) => blockBody(css, s)).join('\n');
  const bodies = scheme === school.baseScheme ? [bodyOf(school.base)] : [bodyOf(school.alt), bodyOf(school.base)];
  const get = (name, depth = 0) => {
    if (depth > 8) throw new Error(`token loop at ${name}`);
    for (const b of bodies) {
      const m = new RegExp(`(?<![\\w-])${name}\\s*:\\s*([^;]+);`).exec(b);
      if (!m) continue;
      const v = m[1].trim();
      const ref = /^var\((--[\w-]+)\)$/.exec(v);
      return ref ? get(ref[1], depth + 1) : v;
    }
    throw new Error(`${school.id}: ${name} not found for ${scheme}`);
  };
  const out = {};
  for (const [k, name] of Object.entries(names)) {
    const v = get(name).toLowerCase();
    if (!/^#[0-9a-f]{6}$/.test(v)) throw new Error(`${school.id} ${name} is not a hex colour: ${v}`);
    out[k] = v;
  }
  return out;
}

// ---- drawing -----------------------------------------------------------
const bracket = (x, y, w, h, l = 11) =>
  `M${f1(x)} ${f1(y + l)}V${f1(y)}H${f1(x + l)}M${f1(x + w - l)} ${f1(y)}H${f1(x + w)}V${f1(y + l)}M${f1(x + w)} ${f1(y + h - l)}V${f1(y + h)}H${f1(x + w - l)}M${f1(x + l)} ${f1(y + h)}H${f1(x)}V${f1(y + h - l)}`;

export function buildPortal(chart, data, scheme, variant, { sourceHash }) {
  const phone = variant === 'phone';
  const t = palette(scheme);
  const copyRole = role(t, 'store', false);
  const N = (id) => data.nodes.find((n) => n.id === id);
  const glyphs = { display: '', body: '', italic: '' };
  const pairs = [];

  // fonts: one pinned subset per school, measured from the subset itself
  const wmParts = data.wordmark;
  const schools = data.schools.map((s) => {
    const tokens = schoolTokens(s, scheme, data.tokens);
    const nameCaps = s.name.toUpperCase();
    const text = nameCaps + wmParts.join('') + wmParts.join(' ') + data.copy;
    const face = subsetPinned(s.face.src, text, s.face.pin ?? {});
    return { ...s, tokens, nameCaps, face, family: `BDL School ${s.id}`, style: s.face.italic ? 'italic' : 'normal' };
  });
  const wid = (s, size, text, ls = 0) => measureTtf(s.face.ttf, size, text, ls);

  // ---- geometry ----
  const M = phone ? 20 : MARGIN_X;
  const cell = phone ? { w: 390, h: 124 } : { w: 196, h: 236 };
  const GAP = phone ? 10 : 14;
  const W = phone ? 430 : 4 * 196 + 3 * GAP + 2 * M;
  const gridTop = MARGIN_TOP;
  const slots = [];
  if (phone) {
    // copy cell first, then the schools in a single column
    slots.push({ x: M, y: gridTop, w: cell.w, h: 92, copy: true });
    for (let i = 0; i < schools.length; i++) slots.push({ x: M, y: gridTop + 92 + GAP + i * (cell.h + GAP), w: cell.w, h: cell.h });
  } else {
    for (let i = 0; i < 8; i++) {
      const c = i % 4;
      const r = Math.floor(i / 4);
      slots.push({ x: M + c * (cell.w + GAP), y: gridTop + r * (cell.h + GAP), w: cell.w, h: cell.h, copy: i === 7 });
    }
    // the copy cell is the eighth; keep it last in the deal
  }
  const copySlot = slots.find((s) => s.copy);
  const panelSlots = slots.filter((s) => !s.copy);
  const gridBottom = Math.max(...slots.map((s) => s.y + s.h));

  let css = KEYFRAMES;
  let body = '';
  let end = 0;
  const fontFaces = [];

  // ---- school panels ----
  const wmSize = (s, maxW) => {
    const longest = wmParts.reduce((a, b) => (wid(s, 100, a) > wid(s, 100, b) ? a : b));
    return Math.min(phone ? 38 : 34, Math.floor((maxW / wid(s, 100, longest)) * 100));
  };
  const frames = [];
  schools.forEach((s, i) => {
    const sl = panelSlots[i];
    const k = s.tokens;
    const border = mix(k.mark, k.field, 0.8);
    const wmMax = phone ? 200 : sl.w - 40;
    const size = wmSize(s, wmMax);
    const lh = size * 1.06;
    const wx = sl.x + (phone ? 20 : 20);
    const wy0 = sl.y + (phone ? 50 : 92);
    const nameX = phone ? sl.x + sl.w - 20 : sl.x + 20;
    const nameY = phone ? sl.y + 30 : sl.y + 34;
    const nameAnchor = phone ? 'end' : 'start';
    const copyX = phone ? sl.x + 236 : sl.x + 20;
    const copyW = phone ? 134 : sl.w - 40;
    const copySize = 14.5;
    const copyLines = wrapWith(s, copySize, data.copy, copyW);
    const copyY = phone ? sl.y + 64 : sl.y + 184;
    const barY = wy0 + (wmParts.length - 1) * lh + 14;
    const id = `p-${s.id}`;
    const wmBox = { x: wx - 10, y: wy0 - size * 0.82 - 6, w: Math.max(...wmParts.map((p2) => wid(s, size, p2))) + 20, h: lh * wmParts.length + 14 + 14 };
    frames.push({ s, wmBox });
    pairs.push({ where: `${s.id} wordmark on its field`, fg: k.mark, bg: k.field });
    pairs.push({ where: `${s.id} name and copy on its field`, fg: k.muted, bg: k.field });
    pairs.push({ where: `${s.id} accent bar on its field (non-text, 3:1)`, fg: k.accent, bg: k.field });
    const dots = [k.accent, k.raised, k.mark, k.muted]
      .map((c, j) => `<circle cx="${f1((phone ? sl.x + sl.w - 20 - 3 * 18 : sl.x + sl.w - 20 - 3 * 18) + j * 18)}" cy="${f1(sl.y + sl.h - 22)}" r="6.5" fill="${c}" stroke="${border}" stroke-width="1"/>`)
      .join('');
    const fam = `font-family:'${s.family}',Georgia,serif;font-style:${s.style}`;
    body +=
      `<g class="pn" id="${id}">` +
      `<rect x="${f1(sl.x)}" y="${f1(sl.y)}" width="${sl.w}" height="${sl.h}" rx="12" fill="${k.field}" stroke="${border}" stroke-width="1.3"/>` +
      `<text x="${f1(nameX)}" y="${f1(nameY)}" text-anchor="${nameAnchor}" style="${fam};font-size:13.5px;letter-spacing:.16em;font-style:normal" fill="${k.muted}">${esc(s.nameCaps)}</text>` +
      `<g class="wm" id="wm-${s.id}">` +
      wmParts.map((p2, j) => `<text x="${f1(wx)}" y="${f1(wy0 + j * lh)}" style="${fam};font-size:${size}px" fill="${k.mark}">${esc(p2)}</text>`).join('') +
      `<rect x="${f1(wx)}" y="${f1(barY)}" width="40" height="4" rx="2" fill="${k.accent}"/></g>` +
      `<text class="cp" id="cp-${s.id}" style="${fam};font-size:${copySize}px" fill="${k.muted}">` +
      copyLines.map((l, j) => `<tspan x="${f1(copyX)}" y="${f1(copyY + j * copySize * 1.3)}">${esc(l)}</tspan>`).join('') +
      '</text>' +
      dots +
      '</g>';
    s.slot = sl;
    s.copyAt = [copyX, copyY - 6];
    s.k = k;
  });

  function wrapWith(s, size, text, maxW) {
    const words = text.split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      const j = cur ? `${cur} ${w}` : w;
      if (cur && wid(s, size, j) > maxW) {
        lines.push(cur);
        cur = w;
      } else cur = j;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  // ---- the copy cell ----
  const cn = N(data.copyNode);
  glyphs.display += cn.lines[0];
  glyphs.body += cn.lines.slice(1).join(' ');
  glyphs.italic += data.copy;
  const cs = copySlot;
  const ccx = cs.x + cs.w / 2;
  const ccy = cs.y + cs.h / 2;
  const q = `“${data.copy}”`;
  glyphs.italic += q;
  body +=
    `<g class="pn" id="p-copy"><rect x="${f1(cs.x)}" y="${f1(cs.y)}" width="${cs.w}" height="${cs.h}" rx="12" fill="${copyRole.fill}" stroke="${copyRole.stroke}" stroke-width="1.5"/>` +
    `<text class="h2" x="${f1(ccx)}" y="${f1(cs.y + (phone ? 34 : 70))}" text-anchor="middle" style="font:${phone ? 18 : 19}px 'BDL Marcellus',Georgia,serif" fill="${copyRole.head}">${esc(cn.lines[0])}</text>` +
    `<text x="${f1(ccx)}" y="${f1(cs.y + (phone ? 56 : 96))}" text-anchor="middle" style="font:${phone ? 15 : 15}px 'BDL Spectral',Georgia,serif" fill="${copyRole.detail}">${esc(cn.lines[1])}</text>` +
    `<text x="${f1(ccx)}" y="${f1(cs.y + (phone ? 77 : 150))}" text-anchor="middle" style="font:italic ${phone ? 15 : 15}px 'BDL Spectral',Georgia,serif" fill="${copyRole.detail}">${esc(q)}</text></g>`;
  pairs.push({ where: 'copy cell heading on store fill', fg: copyRole.head, bg: copyRole.fill });
  pairs.push({ where: 'copy cell detail on store fill', fg: copyRole.detail, bg: copyRole.fill });

  // ---- caption columns: the Mermaid nodes, in four groups ----
  const colW = phone ? (cell.w - 20) / 2 : cell.w;
  const colX = (i) => (phone ? M + i * (colW + 20) : M + i * (cell.w + GAP));
  const colBottom = phone ? [gridBottom + 40, gridBottom + 40] : [0, 1, 2, 3].map(() => gridBottom + 40);
  const HEAD = 14;
  const DET = 13.5;
  let capBottom = gridBottom;
  let cap = '';
  data.groups.forEach((g, gi) => {
    const ci = phone ? (colBottom[0] <= colBottom[1] ? 0 : 1) : gi;
    const x = colX(ci);
    let y = colBottom[ci];
    const title = g.title.toUpperCase();
    glyphs.display += title;
    const tl = wrap('display', 13.5, title, colW, 0.16);
    tl.forEach((l, j) => {
      cap += `<text class="gt" x="${f1(x)}" y="${f1(y + j * 16)}">${esc(l)}</text>`;
    });
    y += tl.length * 16 + 8;
    cap += `<path d="M${f1(x)} ${f1(y - 6)}h${f1(colW)}" stroke="${t.clusterStroke}" stroke-width="1"/>`;
    y += 10;
    for (const nid of g.nodes) {
      const n = N(nid);
      const hl = wrap('display', HEAD, n.lines[0], colW);
      hl.forEach((l, j) => {
        glyphs.display += l;
        cap += `<text class="gh" x="${f1(x)}" y="${f1(y + 12 + j * 17)}">${esc(l)}</text>`;
      });
      y += hl.length * 17 + 1;
      for (const d of n.lines.slice(1)) {
        for (const l of wrap('body', DET, d, colW)) {
          glyphs.body += l;
          cap += `<text class="gd" x="${f1(x)}" y="${f1(y + 12)}">${esc(l)}</text>`;
          y += 16;
        }
      }
      y += 12;
    }
    colBottom[ci] = y + 8;
    capBottom = Math.max(capBottom, y);
  });
  pairs.push({ where: 'caption heading on field', fg: t.ink, bg: t.field });
  pairs.push({ where: 'caption detail on field', fg: t.muted, bg: t.field });
  pairs.push({ where: 'caption group title on field', fg: t.accentStrong, bg: t.field });
  body += `<g class="cc" id="captions">${cap}</g>`;

  const H = Math.ceil(capBottom + MARGIN_BOTTOM - 8);

  // ---- motion: deal in, copy flows, the viewfinder slides across the wordmark ----
  const order = phone ? [copySlot, ...panelSlots] : [...panelSlots, copySlot];
  const panelId = (sl) => (sl.copy ? 'p-copy' : `p-${schools[panelSlots.indexOf(sl)].id}`);
  order.forEach((sl, i) => {
    const d = 0.08 + i * 0.09;
    css += anim(`#${panelId(sl)}`, 'rise', 0.55, d);
    end = Math.max(end, d + 0.55);
  });
  css += anim('#captions', 'fade', 0.7, 0.5);
  let tv = '';
  const dealEnd = 0.08 + 7 * 0.09 + 0.55;
  schools.forEach((s, i) => {
    const begin = 0.55 + i * 0.07;
    const dur = 0.7;
    const [x1, y1] = s.copyAt;
    const dy = (y1 - ccy) * 0.5;
    const path = `M${f1(ccx)} ${f1(ccy)}C${f1(ccx)} ${f1(ccy + dy)} ${f1(x1)} ${f1(y1 - dy * 0.6)} ${f1(x1)} ${f1(y1)}`;
    tv += traveler(path, begin, dur, t.glow);
    css += anim(`#cp-${s.id}`, 'fade', 0.35, begin + dur * 0.7);
    end = Math.max(end, begin + dur + 0.3);
  });
  const S = Math.max(dealEnd, 1.25);
  const step = 0.27;
  let fr = '';
  schools.forEach((s, i) => {
    const t0 = S + i * step;
    css += anim(`#wm-${s.id}`, 'fade', 0.3, t0 + 0.12);
    const prev = i === 0 ? null : frames[i - 1].wmBox;
    const box = frames[i].wmBox;
    const dx = prev ? prev.x - box.x : -12;
    const dy2 = prev ? prev.y - box.y : 0;
    const name = `bdl-vf${i}`;
    css += `@keyframes ${name}{0%{opacity:0;transform:translate(${f1(dx)}px,${f1(dy2)}px)}22%{opacity:1}55%{opacity:1;transform:none}100%{opacity:0;transform:none}}`;
    css += `#vf-${s.id}{opacity:0;animation:${name} ${r2(step * 1.9)}s cubic-bezier(.65,0,.35,1) ${r2(t0)}s both}`;
    fr += `<path id="vf-${s.id}" d="${bracket(box.x, box.y, box.w, box.h)}" fill="none" stroke="${s.k.mark}" stroke-width="2.2" stroke-linecap="round"/>`;
    end = Math.max(end, t0 + step * 1.9);
  });
  css += `.cp{opacity:1}`;
  css += `.gt{font:13.5px 'BDL Marcellus',Georgia,serif;letter-spacing:.16em;fill:${t.accentStrong}}.gh{font:${HEAD}px 'BDL Marcellus',Georgia,serif;fill:${t.ink}}.gd{font:${DET}px 'BDL Spectral',Georgia,serif;fill:${t.muted}}`;

  // fonts
  const baseFonts = fontCss(glyphs);
  for (const s of schools) fontFaces.push(fontFace(s.family, s.style, s.face.woff2));
  css = `${baseFonts}\n${fontFaces.join('\n')}\n${css}`;

  const out = shell({
    chart,
    scheme,
    t,
    W,
    H,
    css,
    body: body + fr + `<g class="tvg-wrap">${tv}</g>`,
    sourceHash,
    duration: end,
    variant,
  });
  const minText = Math.min(13.5, DET, CAP_SIZE, 14.5, 15);
  const scale = (phone ? 360 : 830) / W;
  return {
    svg: out.svg,
    W,
    H,
    pairs: pairs.map((p2) => ({ ...p2, ratio: contrast(p2.fg, p2.bg) })),
    minRendered: minText * scale,
    fit: [],
    scheme,
  };
}

const r2 = (n) => Math.round(n * 100) / 100;
