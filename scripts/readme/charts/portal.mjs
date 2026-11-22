// Chart 4, the Portal showpiece: seven design schools, each panel a crop of that
// school's real home hero, set in the school's own faces (per span: wordmark
// lines, kicker, copy, each with its own pinned axes, case, tracking and
// colour), with the school's own alignment, corners (from `forbids` in its
// meta.ts) and one true motif. Every colour is read from the school's own
// theme.css; every era line from its meta.ts. Each panel hangs with a wall
// label outside it, in the house style. Beside and below the panels, one compact
// list of the files that make a school. Content is
// scripts/readme/charts/data/portal.json, which must agree with the README's
// Mermaid block and school table (tests/readme-charts.test.ts).
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import opentype from 'opentype.js';
import { REPO } from './source.mjs';
import { fontCss, fontFace, subsetPinned } from './fonts.mjs';
import { esc, f1, rng } from './geometry.mjs';
import { KEYFRAMES } from './motion.mjs';
import { captionGlyphs, shell } from './shell.mjs';
import { MARGIN_BOTTOM, MARGIN_TOP, MARGIN_X } from './render.mjs';
import { contrast, ensure, mix, paletteHash, palette } from './theme.mjs';
import { width as baseWidth, wrap as baseWrap } from './textmetrics.mjs';

// ---- reading a school's real tokens and meta ------------------------------
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

/**
 * Resolve tokens from a school's theme.css for one scheme. `names` maps a key to a
 * custom property, or to {light, dark} when the school uses different ones per
 * scheme. `raw` keys return the declared value unresolved (a gradient string).
 */
export function schoolTokens(school, scheme, names, raw = {}) {
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
  for (const [k, spec] of Object.entries(names)) {
    const name = typeof spec === 'string' ? spec : spec[scheme];
    const v = get(name).toLowerCase();
    if (!/^#[0-9a-f]{6}$/.test(v)) throw new Error(`${school.id} ${name} is not a hex colour: ${v}`);
    out[k] = v;
  }
  for (const [k, name] of Object.entries(raw)) out[k] = get(name);
  return out;
}

/** era and forbids, straight from the school's meta.ts */
export function schoolMeta(school) {
  const src = readFileSync(resolve(REPO, school.meta), 'utf8');
  const era = /era:\s*(?:'([^']*)'|"([^"]*)")/.exec(src);
  const forbids = /forbids:\s*\[([^\]]*)\]/.exec(src);
  if (!era || !forbids) throw new Error(`${school.id}: no era or forbids in ${school.meta}`);
  return { era: era[1] ?? era[2], forbids: [...forbids[1].matchAll(/'([^']*)'/g)].map((m) => m[1]) };
}

/** Hash of every school token and meta line the panels draw with, plus the shared palette: recomputed by the drift test. */
export function portalPaletteHash(data) {
  const all = data.schools.map((s) => [schoolMeta(s), ['light', 'dark'].map((sc) => schoolTokens(s, sc, s.tokens, s.rawTokens ?? {}))]);
  return createHash('sha256').update(paletteHash() + JSON.stringify(all)).digest('hex');
}

// ---- type -----------------------------------------------------------------
const meter = new Map();
function measurer(ttf) {
  if (!meter.has(ttf)) meter.set(ttf, opentype.parse(ttf.buffer.slice(ttf.byteOffset, ttf.byteOffset + ttf.byteLength)));
  const f = meter.get(ttf);
  return (size, text, ls = 0) => f.getAdvanceWidth(text, size, { kerning: true }) + text.length * ls * size;
}
const cased = (c, text) => (c === 'upper' ? text.toUpperCase() : c === 'lower' ? text.toLowerCase() : text);

/** Resolve a school's spans for one build: sizes scaled by `u`, one pinned subset per distinct face. */
function resolveSpans(s, data, u) {
  const texts = { wm1: data.wordmark[0], wm2: data.wordmark[1], copy: data.copy, kicker: s.kickerText ?? '' };
  const faces = new Map();
  const spans = {};
  for (const [key, def] of Object.entries(s.spans)) {
    const size = u !== 1 && def.phoneSize ? def.phoneSize : def.size * u; // phoneSize: a phone's own size where scaling by u would crowd the panel
    const pins = Object.fromEntries(Object.entries(def.pins).map(([a, v]) => [a, v === 'size' ? Math.round(size) : v]));
    const fk = `${def.src}|${JSON.stringify(pins)}`;
    if (!faces.has(fk)) faces.set(fk, { def, pins, chars: new Set(), fam: `BDL ${s.id} ${faces.size + 1}` });
    const text = cased(def.case, texts[key]);
    for (const ch of text) faces.get(fk).chars.add(ch);
    spans[key] = { key, def, size, ls: def.ls, fk, text, color: def.color };
  }
  for (const f of faces.values()) {
    const sub = subsetPinned(f.def.src, [...f.chars].join(''), f.pins);
    f.woff2 = sub.woff2;
    f.w = measurer(sub.ttf);
  }
  for (const sp of Object.values(spans)) {
    const f = faces.get(sp.fk);
    sp.fam = f.fam;
    // width without the trailing tracking
    sp.w = (text, size = sp.size) => f.w(size, cased(sp.def.case, text), sp.ls) - sp.ls * size;
  }
  return { spans, faces: [...faces.values()] };
}

/** Greedy wrap of a sentence to `maxW`, measured in a span's own face. */
function wrapSpan(span, text, maxW) {
  const lines = [];
  let cur = '';
  for (const wd of text.split(' ')) {
    const j = cur ? `${cur} ${wd}` : wd;
    if (cur && span.w(j) > maxW) {
      lines.push(cur);
      cur = wd;
    } else cur = j;
  }
  if (cur) lines.push(cur);
  return lines;
}

const GRAD = (id, x1, y1, x2, y2, stops) =>
  `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}">${stops
    .map(([o, c]) => `<stop offset="${f1(o)}" stop-color="${c}"/>`)
    .join('')}</linearGradient>`;
/** Hex stops with percentages from a CSS linear-gradient string. */
const gradientStops = (g) => [...g.matchAll(/(#[0-9a-fA-F]{6})\s+(\d+)%/g)].map((m) => [Number(m[2]) / 100, m[1].toLowerCase()]);

// ---- panel drawing --------------------------------------------------------
// Each panel returns { defs, bg, fg, css, pairs, sizes }. `t0` is when the school
// arrives; every delay in its css is added to it.
function makePanel(c) {
  const { s, id, x, y, w, h, k, sp, phone, data, t0 } = c;
  const fit = (span, text, maxW, what) => {
    const wd = span.w(text);
    if (wd > maxW + 0.5) throw new Error(`portal ${id} ${phone ? 'phone' : 'desktop'}: ${what} "${text}" is ${f1(wd)} wide in a ${f1(maxW)} box`);
  };
  const col = (span) => k[span.color] ?? k.mark;
  /** a <text> in a span's face; centred text is nudged back by half its tracking */
  const T = (span, text, tx, ty, o = {}) => {
    const str = cased(span.def.case, text);
    const a = o.anchor ?? 'start';
    const dx = a === 'middle' ? (span.ls * span.size) / 2 : 0;
    return `<text x="${f1(tx + dx)}" y="${f1(ty)}" text-anchor="${a}"${o.id ? ` id="${o.id}"` : ''} style="font-family:'${span.fam}';font-size:${f1(span.size)}px;letter-spacing:${span.ls}em" fill="${o.fill ?? col(span)}">${esc(str)}</text>`;
  };
  const out = { defs: '', bg: '', fg: '', css: '', pairs: [], sizes: [] };
  const edge = mix(k.mark, k.field, 0.78);
  const clip = (rx = 0) => {
    out.defs += `<clipPath id="pc-${id}"><rect x="${f1(x)}" y="${f1(y)}" width="${w}" height="${h}" rx="${rx}"/></clipPath>`;
    return `clip-path="url(#pc-${id})"`;
  };
  const pad = phone ? 22 : 16;
  const g = Math.min(w / 243, h / 196); // motif scale
  const A = (sel, name, dur, delay, ease = 'cubic-bezier(.22,1,.36,1)') => `${sel}{animation:${name} ${dur}s ${ease} ${f1(t0 + delay)}s both}`;
  const words = [data.wordmark[0], ...data.wordmark[1].split(' ')];
  const pair = (where, fg, bg, nonText) => out.pairs.push({ where: `${s.id} ${where}${nonText ? ' (non-text, 3:1)' : ''}`, fg, bg });
  const field = (extra = '') => `<rect x="${f1(x)}" y="${f1(y)}" width="${w}" height="${h}" fill="${k.field}" stroke="${edge}" stroke-width="1.2"${extra}/>`;
  const KF = {
    left: '@keyframes pf-left{from{opacity:0;transform:translateX(-30px)}to{opacity:1;transform:none}}',
    step: '@keyframes pf-step{from{opacity:0;transform:translateY(-26px)}to{opacity:1;transform:none}}',
    wipe: '@keyframes pf-wipe{from{transform:scaleX(0)}to{transform:none}}',
    orb: '@keyframes pf-orb{from{opacity:0;transform:scale(.7)}to{opacity:1;transform:none}}',
    scan: '@keyframes pf-scan{from{opacity:0;clip-path:inset(0 0 100% 0)}to{opacity:1;clip-path:inset(0 0 0 0)}}',
    hang: '@keyframes pf-hang{from{opacity:0;transform:translateY(-18px)}to{opacity:1;transform:none}}',
    ring: '@keyframes pf-ring{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:none}}',
    sheet: '@keyframes pf-sheet{from{opacity:0;transform:translateY(-16px) rotate(-5deg)}to{opacity:1;transform:none}}',
    draw: '@keyframes pf-draw{from{stroke-dashoffset:var(--dl)}to{stroke-dashoffset:0}}',
  };

  if (id === 'quiet') {
    // bark everywhere, the wordmark in capitals, centred, in the one green
    const r = rng(1103);
    const buckets = [
      { d: '', op: 0.09, sw: 1.4 },
      { d: '', op: 0.15, sw: 2 },
      { d: '', op: 0.27, sw: 2.6 },
    ];
    const n = Math.round((w * h) / 760);
    for (let i = 0; i < n; i++) {
      const px = x + 4 + r() * (w - 8);
      const py = y + 6 + r() * (h - 12);
      const len = Math.min((7 + r() * 36) * (phone ? 1.4 : 1), x + w - 4 - px);
      const b = buckets[r() < 0.55 ? 0 : r() < 0.78 ? 1 : 2];
      b.d += `M${f1(px)} ${f1(py)}h${f1(len)}`;
      if (r() < 0.45) b.d += `M${f1(px + r() * 10)} ${f1(py + 6.5)}h${f1(len * 0.45)}`;
    }
    out.bg = field() + `<g id="qb" ${clip()}>${buckets.map((b) => `<path d="${b.d}" fill="none" stroke="${k.mark}" stroke-opacity="${b.op}" stroke-width="${b.sw}" stroke-linecap="round"/>`).join('')}</g>`;
    const S = sp.wm1.size;
    const lh = S * 1.1;
    for (const l of words) fit(sp.wm1, l, w - 2 * pad, 'wordmark line');
    fit(sp.copy, data.copy, w - 2 * pad, 'copy');
    const top0 = y + (h - 30 - words.length * lh) / 2 + 6;
    out.fg =
      `<g id="qw">${words.map((l, i) => T(sp.wm1, l, x + w / 2, top0 + 0.74 * S + i * lh, { anchor: 'middle' })).join('')}</g>` +
      `<g id="qc">${T(sp.copy, data.copy, x + w / 2, y + h - pad - 2, { anchor: 'middle' })}</g>`;
    out.css = A('#qb', 'bdl-fade', 1.0, 0) + A('#qw', 'bdl-fade', 0.8, 0.2) + A('#qc', 'bdl-fade', 0.6, 0.6);
    pair('wordmark on its field', k.billboard, k.field);
    pair('copy on its field', k.mark, k.field);
  } else if (id === 'swiss') {
    // flush-left, huge, tight; one red block, no drawn grid
    const S = sp.wm1.size;
    const lh = S * 0.9;
    const x0 = x + pad;
    const b0 = y + pad - 2 + 0.74 * S;
    const band = phone ? 24 : 18;
    for (const wd of words) fit(sp.wm1, wd, w - 2 * pad, 'wordmark line');
    out.bg = field();
    out.fg =
      words.map((t, i) => `<g id="sw${i}">${T(sp.wm1, t, x0, b0 + i * lh)}</g>`).join('') +
      `<rect id="sred" x="${f1(x)}" y="${f1(y + h - band)}" width="${w}" height="${band}" fill="${k.red}"/>`;
    const lastB = b0 + 2 * lh;
    const cs = sp.copy.size;
    if (phone) {
      const lines = wrapSpan(sp.copy, data.copy, w * 0.36);
      out.fg += `<g id="sw3">${lines.map((l, i) => T(sp.copy, l, x + w * 0.58, lastB - (lines.length - 1 - i) * cs * 1.25)).join('')}</g>`;
    } else {
      fit(sp.copy, data.copy, w - 2 * pad, 'copy');
      out.fg += `<g id="sw3">${T(sp.copy, data.copy, x0, y + h - band - 12)}</g>`;
    }
    out.css =
      KF.left + KF.wipe + '#sred{transform-box:fill-box;transform-origin:left}' +
      [0, 1, 2, 3].map((i) => A(`#sw${i}`, 'pf-left', 0.5, 0.05 + i * 0.08, 'cubic-bezier(.16,1,.3,1)')).join('') +
      A('#sred', 'pf-wipe', 0.55, 0.35, 'cubic-bezier(.65,0,.35,1)');
    pair('wordmark on its field', k.mark, k.field);
    pair('copy on its field', k.mark, k.field);
  } else if (id === 'bauhaus') {
    // lowercase, stepped; primary shapes on a black shelf
    const S = sp.wm1.size;
    const lh = S * 0.82;
    const x0 = x + pad;
    const b0 = y + pad + 0.76 * S;
    const lines = words.map((t) => cased('lower', t));
    fit(sp.wm1, lines[1], w * 0.56, 'wordmark line');
    const labX = x0 + sp.wm1.w(lines[1]) * 0.5;
    const shelfY = y + h * 0.36;
    const sx0 = x + w * 0.585;
    const sx1 = x + w - pad;
    const th = 5 * g;
    const sq = 30 * g;
    const r0 = 22 * g;
    const stemX = x + w * 0.735;
    const triL = x + w * 0.775;
    const triR = x + w - pad;
    const triB = y + h - pad;
    out.bg = field();
    const shapes =
      `<g id="bhs"><rect x="${f1(sx0)}" y="${f1(shelfY)}" width="${f1(sx1 - sx0)}" height="${f1(th)}" fill="${k.mark}"/>` +
      `<rect x="${f1(stemX)}" y="${f1(shelfY + th)}" width="${f1(3 * g)}" height="${f1(y + h - shelfY - th)}" fill="${k.mark}"/></g>` +
      `<rect id="bhr" x="${f1(sx0 + 5 * g)}" y="${f1(shelfY - sq)}" width="${f1(sq)}" height="${f1(sq)}" fill="${k.red}"/>` +
      `<circle id="bhc" cx="${f1(sx1 - r0 - 2 * g)}" cy="${f1(shelfY - r0)}" r="${f1(r0)}" fill="${k.blue}"/>` +
      `<circle id="bhk" cx="${f1(sx0 + 5 * g + sq / 2)}" cy="${f1(shelfY - sq - 13 * g)}" r="${f1(11 * g)}" fill="none" stroke="${k.mark}" stroke-width="${f1(7 * g)}"/>` +
      `<path id="bht" d="M${f1(triL)} ${f1(triB)}L${f1((triL + triR) / 2)} ${f1(shelfY + th + 14 * g)}L${f1(triR)} ${f1(triB)}Z" fill="${k.yellow}"/>`;
    const cs = sp.copy.size;
    const cl = wrapSpan(sp.copy, data.copy, Math.max(100, stemX - x0 - 8));
    out.fg =
      lines.map((l, i) => `<g id="bw${i}">${T(sp.wm1, l, i === 2 ? labX : x0, b0 + i * lh)}</g>`).join('') +
      shapes +
      `<g id="bw3">${cl.map((l, i) => T(sp.copy, l, x0, y + h - pad - (cl.length - 1 - i) * cs * 1.3)).join('')}</g>`;
    const E = 'cubic-bezier(.7,0,.2,1)';
    out.css =
      KF.step + KF.wipe + '#bhs{transform-box:fill-box;transform-origin:left}' +
      A('#bhs', 'pf-wipe', 0.4, 0.05, E) + A('#bhr', 'pf-step', 0.4, 0.3, E) + A('#bhc', 'pf-step', 0.4, 0.4, E) + A('#bhk', 'pf-step', 0.4, 0.5, E) + A('#bht', 'bdl-fade', 0.4, 0.6) +
      [0, 1, 2, 3].map((i) => A(`#bw${i}`, 'pf-step', 0.4, 0.15 + i * 0.1, E)).join('');
    pair('wordmark on its field', k.mark, k.field);
    pair('copy on its field', k.mark, k.field);
  } else if (id === 'glassmorphism') {
    // crisp shaded orbs behind a window with traffic-light dots; the gradient on "Design Lab"
    const rx = 20;
    const orb = (oid, cx, cy, r, hi, lo) => {
      out.defs += `<linearGradient id="${oid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${hi}"/><stop offset="1" stop-color="${lo}"/></linearGradient>`;
      return `<circle id="${oid}c" cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}" fill="url(#${oid})"/>`;
    };
    const orbs =
      orb('go1', x + w * 0.16, y + h * 0.2, h * 0.44, k.violetHi, k.violet) +
      orb('go2', x + w * 0.9, y + h * 0.04, h * 0.3, k.orangeHi, k.orange) +
      orb('go3', x + w * 0.88, y + h * 0.98, h * 0.36, k.coralHi, k.coral) +
      `<circle id="go4c" cx="${f1(x + w * 0.04)}" cy="${f1(y + h * 0.68)}" r="${f1(h * 0.2)}" fill="${k.raised}" fill-opacity=".9"/>`;
    out.bg = field(` rx="${rx}"`) + `<g id="gorbs" ${clip(rx)}>${orbs}</g>`;
    const wx = x + (phone ? 30 : 16);
    const wy = y + h * 0.12;
    const ww = w - (phone ? 60 : 32);
    const wh = h * 0.78;
    const S = sp.wm1.size;
    const inX = wx + 18;
    out.defs += GRAD('gvib', inX, 0, inX + sp.wm2.w(data.wordmark[1]), 0, [[0, k.vibA], [1, k.vibB]]);
    fit(sp.wm2, data.wordmark[1], ww - 28, 'wordmark line');
    const b1 = wy + 38 + 0.72 * S;
    const b2 = b1 + S * 0.97;
    const cl = wrapSpan(sp.copy, data.copy, ww - 36);
    out.fg =
      `<g id="gw"><rect x="${f1(wx)}" y="${f1(wy)}" width="${f1(ww)}" height="${f1(wh)}" rx="14" fill="${k.raised}" fill-opacity=".9" stroke="#ffffff" stroke-opacity=".7" stroke-width="1.2"/>` +
      ['#ff5f57', '#febc2e', '#28c840'].map((cc, i) => `<circle cx="${f1(wx + 18 + i * 12)}" cy="${f1(wy + 17)}" r="3.6" fill="${cc}"/>`).join('') +
      T(sp.wm1, data.wordmark[0], inX, b1) +
      T(sp.wm2, data.wordmark[1], inX, b2, { fill: 'url(#gvib)' }) +
      cl.map((l, i) => T(sp.copy, l, inX, b2 + 28 + i * sp.copy.size * 1.35)).join('') +
      '</g>';
    out.css =
      KF.orb + '#go1c,#go2c,#go3c,#go4c{transform-box:fill-box;transform-origin:center}' +
      ['go1c', 'go2c', 'go3c', 'go4c'].map((o, i) => A(`#${o}`, 'pf-orb', 0.7, i * 0.08)).join('') +
      A('#gw', 'bdl-rise', 0.6, 0.3);
    // the window is drawn at .9 over the strongest orb behind it
    for (const [nm, cc] of [['violet', k.violet], ['orange', k.orange], ['coral', k.coral]]) {
      const behind = mix(cc, k.raised, 0.9);
      pair(`wordmark over the ${nm} orb`, k.mark, behind);
      pair(`gradient wordmark start over the ${nm} orb (large type)`, k.vibA, behind, true);
      pair(`gradient wordmark end over the ${nm} orb (large type)`, k.vibB, behind, true);
    }
    pair('copy over the violet orb', k.mark, mix(k.violet, k.raised, 0.9));
  } else if (id === 'vaporwave') {
    // a kicker in katakana above a chrome name, split by cyan and pink; no sun, no grid
    out.defs += GRAD('vsky', 0, y, 0, y + h, [[0, k.skyTop], [0.52, k.skyMid], [1, k.horizon]]);
    out.bg = `<rect x="${f1(x)}" y="${f1(y)}" width="${w}" height="${h}" fill="url(#vsky)" stroke="${edge}" stroke-width="1.2"/>`;
    const S = sp.wm1.size;
    const cx = x + w / 2;
    const blockH = 14 + 20 + 0.72 * S + 26 + 30;
    const kb = y + Math.max(24, (h - blockH) / 2 + 12);
    const b1 = kb + 20 + 0.72 * S;
    const b2 = b1 + 26;
    fit(sp.wm1, words[0], w - 14, 'wordmark line');
    fit(sp.wm2, data.wordmark[1], w - 14, 'wordmark line');
    fit(sp.copy, data.copy, w - 2 * pad, 'copy');
    out.defs += GRAD('vchrome', 0, b1 - 0.8 * S, 0, b1 + 0.15 * S, gradientStops(k.chrome));
    const dxo = 0.035 * S;
    const layer = (fill, dx, dy) => T(sp.wm1, words[0], cx + dx, b1 + dy, { anchor: 'middle', fill });
    // the live kicker is --accent; nudge it toward the ink only as far as 4.5:1 on the sky behind it needs
    const kbg = mix(k.skyTop, k.skyMid, Math.min(1, Math.max(0, (kb - y) / (0.52 * h))));
    k.kana = ensure(k.kana, kbg, k.mark, 4.5);
    out.fg =
      `<g id="vk">${T(sp.kicker, sp.kicker.text, cx, kb, { anchor: 'middle' })}</g>` +
      `<g id="vb">${layer(k.depth, 0, 0.06 * S)}${layer(k.cyan, -dxo, 0)}${layer(k.pink, dxo, 0)}${layer('url(#vchrome)', 0, 0)}</g>` +
      `<g id="vr">${T(sp.wm2, data.wordmark[1], cx, b2, { anchor: 'middle' })}${T(sp.copy, data.copy, cx, b2 + 30, { anchor: 'middle', fill: k.plain })}</g>`;
    out.css = KF.scan + A('#vk', 'bdl-fade', 0.5, 0) + A('#vb', 'pf-scan', 0.8, 0.15, 'steps(9,end)') + A('#vr', 'bdl-fade', 0.6, 0.7);
    pair('kicker on the sky behind it', k.kana, kbg);
    pair('wordmark second line on the sky middle', k.plain, k.skyMid);
    pair('copy on the sky middle', k.plain, k.skyMid);
  } else if (id === 'grandmillennial') {
    // a striped scalloped awning, an oval cartouche in a chintz mat, a gilt double rule
    out.bg = field();
    const aw = 16 * g;
    const stripeW = 11 * g;
    let stripes = '';
    let scallops = '';
    for (let i = 0, sx = x; sx < x + w; i++, sx += stripeW) {
      const cc = i % 2 === 0 ? k.stripeA : k.stripeB;
      const ww = Math.min(stripeW, x + w - sx);
      stripes += `<rect x="${f1(sx)}" y="${f1(y)}" width="${f1(ww + 0.4)}" height="${f1(aw)}" fill="${cc}"/>`;
      scallops += `<path d="M${f1(sx)} ${f1(y + aw)}a${f1(stripeW / 2)} ${f1(stripeW / 2)} 0 0 0 ${f1(stripeW)} 0Z" fill="${cc}"/>`;
    }
    const cx = x + w / 2;
    const cy = y + h * 0.47 + 2 * g;
    const rx = Math.min(w * 0.31, 86 * g);
    const ry = Math.min(h * 0.3, 56 * g);
    const matL = x + (phone ? 70 : 34 * g);
    const matT = y + aw + 14 * g;
    const matW = w - 2 * (matL - x);
    const plW = Math.min(w - 2 * pad - 6, sp.copy.w(data.copy) + 34);
    const plH = sp.copy.size + 14;
    const plY = y + h - 15 - plH;
    const matH = plY - 5 - matT;
    // chintz: a rose and two leaves in each corner of the mat
    let sprigs = '';
    for (const [sx, sy, dx, dy] of [[matL, matT, 1, 1], [matL + matW, matT, -1, 1], [matL, matT + matH, 1, -1], [matL + matW, matT + matH, -1, -1]]) {
      const px = sx + dx * 13 * g;
      const py = sy + dy * 13 * g;
      sprigs +=
        `<ellipse cx="${f1(px + dx * 8 * g)}" cy="${f1(py - dy * 3 * g)}" rx="${f1(6 * g)}" ry="${f1(2.6 * g)}" transform="rotate(${dx * dy * -25} ${f1(px + dx * 8 * g)} ${f1(py - dy * 3 * g)})" fill="${k.leaf}" fill-opacity=".8"/>` +
        `<ellipse cx="${f1(px - dx * 3 * g)}" cy="${f1(py + dy * 8 * g)}" rx="${f1(2.6 * g)}" ry="${f1(6 * g)}" transform="rotate(${dx * dy * 25} ${f1(px - dx * 3 * g)} ${f1(py + dy * 8 * g)})" fill="${k.leaf}" fill-opacity=".8"/>` +
        `<circle cx="${f1(px)}" cy="${f1(py)}" r="${f1(6.5 * g)}" fill="${k.rose}"/><circle cx="${f1(px)}" cy="${f1(py)}" r="${f1(2.6 * g)}" fill="${k.field}" fill-opacity=".55"/>`;
    }
    const S = sp.wm1.size;
    const bw = cy + 0.12 * S;
    const b2 = bw + 22 * g;
    fit(sp.wm1, data.wordmark[0], rx * 1.5, 'wordmark line');
    fit(sp.wm2, data.wordmark[1], rx * 1.72, 'wordmark line');
    const flourish = (fy, half) =>
      `<path d="M${f1(cx - half)} ${f1(fy)}C${f1(cx - half * 0.45)} ${f1(fy)} ${f1(cx - half * 0.25)} ${f1(fy - 5 * g)} ${f1(cx)} ${f1(fy)}C${f1(cx + half * 0.25)} ${f1(fy - 5 * g)} ${f1(cx + half * 0.45)} ${f1(fy)} ${f1(cx + half)} ${f1(fy)}" fill="none" stroke="${k.gilt}" stroke-width="1.2" stroke-linecap="round"/>`;
    out.fg =
      `<g id="gmo"><rect x="${f1(matL)}" y="${f1(matT)}" width="${f1(matW)}" height="${f1(matH)}" fill="${k.ground}" stroke="${k.gilt}" stroke-width="1.2"/>${sprigs}` +
      `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="${k.oval}" stroke="${k.gilt}" stroke-width="2.2"/>` +
      `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(rx - 5)}" ry="${f1(ry - 5)}" fill="none" stroke="${k.gilt}" stroke-width=".9"/>` +
      flourish(cy - ry + 18 * g, 15 * g) +
      T(sp.wm1, data.wordmark[0], cx, bw, { anchor: 'middle' }) +
      T(sp.wm2, data.wordmark[1], cx, b2, { anchor: 'middle' }) +
      flourish(b2 + 12 * g, 22 * g) +
      '</g>' +
      `<g id="gmp"><rect x="${f1(cx - plW / 2)}" y="${f1(plY)}" width="${f1(plW)}" height="${f1(plH)}" fill="${k.raised}" stroke="${k.giltDeep}" stroke-width="1"/>${T(sp.copy, data.copy, cx, plY + plH / 2 + sp.copy.size * 0.32, { anchor: 'middle' })}</g>` +
      `<g id="gma"><g ${clip()}>${stripes}${scallops}</g></g>` +
      `<g id="gmf"><rect x="${f1(x + 4)}" y="${f1(y + 4)}" width="${w - 8}" height="${h - 8}" fill="none" stroke="${k.gilt}" stroke-width="2.2"/><rect x="${f1(x + 9)}" y="${f1(y + 9)}" width="${w - 18}" height="${h - 18}" fill="none" stroke="${k.gilt}" stroke-width=".9"/></g>`;
    out.css =
      KF.hang + KF.ring + '#gmo{transform-box:fill-box;transform-origin:center}' +
      A('#gma', 'pf-hang', 0.55, 0, 'cubic-bezier(.3,.7,.2,1)') + A('#gmf', 'bdl-fade', 0.6, 0.1) + A('#gmo', 'pf-ring', 0.7, 0.3) + A('#gmp', 'bdl-rise', 0.5, 0.55);
    pair('wordmark on the oval', k.mark, k.oval);
    pair('second line on the oval', k.accent, k.oval);
    pair('copy on the plaque', k.mark, k.raised);
  } else if (id === 'cottagecore') {
    // a slightly rotated paper sheet with washi tape; a gingham scallop along its head, a pressed daisy
    const rot = -1;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const gs = 22 * g;
    out.defs += `<pattern id="cgh" width="${f1(gs)}" height="${f1(gs)}" patternUnits="userSpaceOnUse" x="${f1(x)}" y="${f1(y)}"><rect width="${f1(gs)}" height="${f1(gs)}" fill="${k.ground}"/><rect width="${f1(gs / 2)}" height="${f1(gs)}" fill="${k.sage}" fill-opacity=".4"/><rect width="${f1(gs)}" height="${f1(gs / 2)}" fill="${k.sage}" fill-opacity=".4"/></pattern>`;
    const gh = 16 * g;
    const sr = 6.5 * g;
    let scal = '';
    for (let sx = x + sr; sx < x + w + sr; sx += sr * 2) scal += `<circle cx="${f1(sx)}" cy="${f1(y + gh)}" r="${f1(sr)}" fill="url(#cgh)" stroke="${k.sage}" stroke-opacity=".55" stroke-width="1"/>`;
    const S = sp.wm1.size;
    const x0 = x + pad + 2;
    const b1 = y + gh + 14 * g + 0.72 * S;
    const bw = b1 + 8;
    fit(sp.wm1, data.wordmark[0], w * 0.62, 'wordmark line');
    const b2 = b1 + 0.46 * S + 0.8 * sp.wm2.size;
    fit(sp.wm2, data.wordmark[1], w - 2 * pad - 6, 'wordmark line');
    const b3 = b2 + sp.copy.size * 1.15 + 6;
    fit(sp.copy, data.copy, w - 2 * pad, 'copy');
    const sw = sp.wm1.w(data.wordmark[0]);
    const scr = `M${f1(x0)} ${f1(bw)}C${f1(x0 + sw * 0.25)} ${f1(bw - 3)} ${f1(x0 + sw * 0.5)} ${f1(bw + 2)} ${f1(x0 + sw * 0.75)} ${f1(bw - 1)}S${f1(x0 + sw * 0.95)} ${f1(bw)} ${f1(x0 + sw + 4)} ${f1(bw - 2)}M${f1(x0 + sw * 0.1)} ${f1(bw + 5)}C${f1(x0 + sw * 0.4)} ${f1(bw + 3)} ${f1(x0 + sw * 0.7)} ${f1(bw + 6)} ${f1(x0 + sw * 0.9)} ${f1(bw + 4)}`;
    const dx = x + w * (phone ? 0.82 : 0.83);
    const dy = y + h * 0.36;
    const pr = 13 * g;
    let petals = '';
    for (let i = 0; i < 12; i++) petals += `<ellipse cx="${f1(dx)}" cy="${f1(dy - pr * 0.72)}" rx="${f1(pr * 0.27)}" ry="${f1(pr * 0.62)}" transform="rotate(${i * 30} ${f1(dx)} ${f1(dy)})" fill="${k.petal}" stroke="${mix(k.mark, k.petal, 0.55)}" stroke-width=".8"/>`;
    const stem = `<path d="M${f1(dx)} ${f1(dy + pr * 0.5)}C${f1(dx - 6 * g)} ${f1(dy + 30 * g)} ${f1(dx + 4 * g)} ${f1(dy + 40 * g)} ${f1(dx - 3 * g)} ${f1(dy + 56 * g)}" fill="none" stroke="${k.stem}" stroke-width="${f1(2.4 * g)}" stroke-linecap="round"/><ellipse cx="${f1(dx + 9 * g)}" cy="${f1(dy + 32 * g)}" rx="${f1(10 * g)}" ry="${f1(4 * g)}" transform="rotate(-35 ${f1(dx + 9 * g)} ${f1(dy + 32 * g)})" fill="${k.leaf}" stroke="${k.stem}" stroke-width=".8"/>`;
    const tx = x + w * 0.72;
    const tape = `<g transform="rotate(7 ${f1(tx)} ${f1(y + 8)})"><rect x="${f1(tx - 23 * g)}" y="${f1(y - 1)}" width="${f1(46 * g)}" height="${f1(13 * g)}" fill="${k.tape}" fill-opacity=".55"/><path d="M${f1(tx - 23 * g)} ${f1(y + 3.5 * g)}h${f1(46 * g)}M${f1(tx - 23 * g)} ${f1(y + 9 * g)}h${f1(46 * g)}" stroke="${k.sage}" stroke-opacity=".5" stroke-width=".9"/></g>`;
    out.defs += `<clipPath id="pc-${id}"><rect x="${f1(x)}" y="${f1(y)}" width="${w}" height="${h}" rx="2"/></clipPath>`;
    out.bg =
      `<g id="cgs"><g transform="rotate(${rot} ${f1(cx)} ${f1(cy)})">` +
      `<rect x="${f1(x + 2)}" y="${f1(y + 3)}" width="${w}" height="${h}" fill="${k.mark}" fill-opacity=".1"/>` +
      `<rect x="${f1(x)}" y="${f1(y)}" width="${w}" height="${h}" rx="2" fill="${k.paper}" stroke="${edge}" stroke-width="1.2"/>` +
      `<g clip-path="url(#pc-${id})"><rect x="${f1(x)}" y="${f1(y)}" width="${w}" height="${f1(gh)}" fill="url(#cgh)"/>${scal}</g>`;
    out.fg =
      `<g id="cgw">${T(sp.wm1, data.wordmark[0], x0, b1)}<path id="cgu" d="${scr}" fill="none" stroke="${k.scribble}" stroke-width="${f1(3 * g)}" stroke-linecap="round"/>${T(sp.wm2, data.wordmark[1], x0 + 2, b2)}${T(sp.copy, data.copy, x0, b3)}</g>` +
      `<g id="cgd">${stem}${petals}<circle cx="${f1(dx)}" cy="${f1(dy)}" r="${f1(pr * 0.28)}" fill="${k.heart}"/></g>` +
      tape +
      '</g></g>';
    const dl = Math.ceil(sw * 1.7);
    out.css =
      KF.sheet + KF.draw + '#cgs{transform-box:fill-box;transform-origin:center}' +
      A('#cgs', 'pf-sheet', 0.7, 0, 'cubic-bezier(.3,.9,.3,1)') + A('#cgd', 'bdl-fade', 0.6, 0.45) +
      `#cgu{stroke-dasharray:${dl};--dl:${dl}}` + A('#cgu', 'pf-draw', 0.5, 0.35, 'ease-out');
    pair('wordmark on the paper', k.mark, k.paper);
    pair('second line on the paper', k.link, k.paper);
    pair('copy on the paper', k.hand, k.paper);
  } else throw new Error(`no panel for school ${id}`);
  for (const span of Object.values(sp)) if (span.size < 24) out.sizes.push(span.size);
  return out;
}

// ---- the chart --------------------------------------------------------------
export function buildPortal(chart, data, scheme, variant, { sourceHash }) {
  const phone = variant === 'phone';
  const t = palette(scheme);
  const u = phone ? 1.2 : 1;
  const glyphs = { display: captionGlyphs(chart), body: '', italic: '' };
  const pairs = [];
  const N = (id) => data.nodes.find((n) => n.id === id);

  // ---- geometry ----
  const M = phone ? 20 : MARGIN_X;
  const W = phone ? 430 : 830;
  const GAP = 14;
  const pw = phone ? W - 2 * M : Math.floor((W - 2 * M - 2 * GAP) / 3);
  const ph = phone ? 192 : 196;
  const NAME = 13 * u;
  const ERA = 13 * u;
  const eraLH = ERA * 1.32;

  // ---- the one line of shared copy ----
  const cn = N(data.copyNode);
  const lineA = `One sentence, seven schools: “${data.copy}”`;
  const sizeA = phone ? 15.5 : 15;
  const sizeB = phone ? 15 : 14;
  const sizeC = phone ? 15 : 13;
  glyphs.italic += lineA;
  glyphs.display += cn.lines[0];
  glyphs.body += cn.lines.slice(1).join(' ');
  const wA = baseWidth('italic', sizeA, lineA);
  const wB = baseWidth('display', sizeB, cn.lines[0]);
  const wC = baseWidth('body', sizeC, cn.lines[1]);
  const oneLine = wA + 22 + wB + 8 + wC <= W - 2 * M;
  let cy0 = MARGIN_TOP + 14;
  const sA = `font:italic ${sizeA}px 'BDL Spectral',Georgia,serif`;
  const sB = `font:${sizeB}px 'BDL Marcellus',Georgia,serif`;
  const sC = `font:${sizeC}px 'BDL Spectral',Georgia,serif`;
  let topSvg;
  if (oneLine) {
    topSvg = `<text id="topl" x="${M}" y="${f1(cy0)}"><tspan style="${sA}" fill="${t.ink}">${esc(lineA)}</tspan><tspan dx="22" style="${sB}" fill="${t.accentStrong}">${esc(cn.lines[0])}</tspan><tspan dx="8" style="${sC}" fill="${t.muted}">${esc(cn.lines[1])}</tspan></text>`;
  } else {
    topSvg = `<text id="topl"><tspan x="${M}" y="${f1(cy0)}" style="${sA}" fill="${t.ink}">${esc(lineA)}</tspan><tspan x="${M}" y="${f1(cy0 + sizeA * 1.5)}" style="${sB}" fill="${t.accentStrong}">${esc(cn.lines[0])}</tspan><tspan dx="8" style="${sC}" fill="${t.muted}">${esc(cn.lines[1])}</tspan></text>`;
    cy0 += sizeA * 1.5;
  }
  pairs.push({ where: 'shared copy line on field', fg: t.ink, bg: t.field });
  pairs.push({ where: 'copy path on field', fg: t.accentStrong, bg: t.field });
  pairs.push({ where: 'copy detail on field', fg: t.muted, bg: t.field });

  // ---- layout: three columns of panels (a single column on a phone); the list beside the last panel ----
  const schools = data.schools;
  const slotOf = (i) => (phone ? { col: 0, row: i } : { col: i % 3, row: Math.floor(i / 3) });
  const rowsTop = cy0 + 24;
  const labelLines = schools.map((s) => baseWrap('italic', ERA, schoolMeta(s).era, pw));
  const nRows = phone ? schools.length : 3;
  const rowH = [];
  for (let r = 0; r < nRows; r++) {
    const lines = Math.max(...schools.map((_, i) => (slotOf(i).row === r ? labelLines[i].length : 0)));
    rowH.push(ph + 12 + NAME + 8 + lines * eraLH + (phone ? 20 : 22));
  }
  const rowY = [];
  rowH.reduce((acc, hh, i) => {
    rowY[i] = acc;
    return acc + hh;
  }, rowsTop);

  let css = KEYFRAMES;
  let body = '';
  const fontFaces = [];
  const sizes = [sizeA, sizeB, sizeC, NAME, ERA];
  let end = 0.5;
  schools.forEach((s, i) => {
    const { col, row } = slotOf(i);
    const x = M + col * (pw + GAP);
    const y = rowY[row];
    const tokens = schoolTokens(s, scheme, s.tokens, s.rawTokens ?? {});
    const meta = schoolMeta(s);
    if (meta.forbids.includes('rounded corners') && s.corners !== 'square') throw new Error(`${s.id} forbids rounded corners but its panel is ${s.corners}`);
    const { spans, faces } = resolveSpans(s, data, u);
    for (const f of faces) fontFaces.push(fontFace(f.fam, 'normal', f.woff2));
    const start = 0.12 + i * (phone ? 0.2 : 0.24);
    const panel = makePanel({ s, id: s.id, x, y, w: pw, h: ph, k: tokens, sp: spans, phone, data, t0: start });
    for (const p2 of panel.pairs) pairs.push(p2);
    sizes.push(...panel.sizes);
    css += panel.css + `#p-${s.id}{animation:bdl-fade .3s ease ${f1(start)}s both}`;
    body += `<g class="pn" id="p-${s.id}">${panel.defs}${panel.bg}${panel.fg}</g>`;
    // the wall label, outside the panel
    const nm = s.name.toUpperCase();
    glyphs.display += nm;
    const ly = y + ph + 12 + NAME;
    body +=
      `<g class="wl" id="l-${s.id}"><text class="wn" x="${f1(x)}" y="${f1(ly)}">${esc(nm)}</text>` +
      labelLines[i].map((l, j) => `<text class="we" x="${f1(x)}" y="${f1(ly + 4 + eraLH * (j + 1))}">${esc(l)}</text>`).join('') +
      '</g>';
    for (const l of labelLines[i]) glyphs.italic += l;
    css += `#l-${s.id}{animation:bdl-fade .5s ease ${f1(start + 0.35)}s both}`;
    end = Math.max(end, start + 0.9);
  });
  css += `.wn{font:${NAME}px 'BDL Marcellus',Georgia,serif;letter-spacing:.16em;fill:${t.accentStrong}}.we{font:italic ${ERA}px 'BDL Spectral',Georgia,serif;fill:${t.muted}}`;
  pairs.push({ where: 'wall label name on field', fg: t.accentStrong, bg: t.field });
  pairs.push({ where: 'wall label era on field', fg: t.muted, bg: t.field });

  // ---- the compact list of files ----
  const HEAD = 13.5 * u;
  const DET = 12.5 * u;
  const LH = DET * 1.3;
  const HLH = HEAD * 1.25;
  const lastRowTop = rowY[nRows - 1];
  const listX = phone ? M : M + (pw + GAP);
  const listY = phone ? lastRowTop + rowH[nRows - 1] : lastRowTop + 6;
  const listW = phone ? W - 2 * M : 2 * pw + GAP;
  const nCols = phone ? 1 : 2;
  const colGap = 28;
  const colW = (listW - colGap * (nCols - 1)) / nCols;
  const groups = data.groups.map((g) => {
    const items = g.nodes.map((nid) => {
      const n = N(nid);
      return { head: baseWrap('display', HEAD, n.lines[0], colW), det: n.lines.slice(1).flatMap((d) => baseWrap('body', DET, d, colW)) };
    });
    const tl = baseWrap('display', HEAD, g.title, colW);
    const hh = tl.length * HLH + 13 + items.reduce((a, it) => a + it.head.length * HLH + it.det.length * LH + 9, 0) + 12;
    return { g, items, tl, h: hh };
  });
  let split = groups.length;
  if (nCols === 2) {
    let best = Infinity;
    for (let cut = 1; cut < groups.length; cut++) {
      const a = groups.slice(0, cut).reduce((s2, x2) => s2 + x2.h, 0);
      const b = groups.slice(cut).reduce((s2, x2) => s2 + x2.h, 0);
      if (Math.max(a, b) < best) {
        best = Math.max(a, b);
        split = cut;
      }
    }
  }
  let lst = '';
  let listEnd = listY;
  [groups.slice(0, split), groups.slice(split)].forEach((colGroups, ci) => {
    if (!colGroups.length) return;
    const lx = listX + ci * (colW + colGap);
    let ly = listY;
    for (const gr of colGroups) {
      glyphs.display += gr.g.title;
      gr.tl.forEach((l, j) => (lst += `<text class="gt" x="${f1(lx)}" y="${f1(ly + HEAD + j * HLH)}">${esc(l)}</text>`));
      ly += gr.tl.length * HLH + 4;
      lst += `<path d="M${f1(lx)} ${f1(ly)}h${f1(colW)}" stroke="${t.clusterStroke}" stroke-width="1"/>`;
      ly += 9;
      for (const it of gr.items) {
        it.head.forEach((l, j) => {
          glyphs.display += l;
          lst += `<text class="gh" x="${f1(lx)}" y="${f1(ly + HEAD * 0.9 + j * HLH)}">${esc(l)}</text>`;
        });
        ly += it.head.length * HLH;
        for (const l of it.det) {
          glyphs.body += l;
          lst += `<text class="gd" x="${f1(lx)}" y="${f1(ly + DET * 0.85)}">${esc(l)}</text>`;
          ly += LH;
        }
        ly += 9;
      }
      ly += 12;
    }
    listEnd = Math.max(listEnd, ly);
  });
  pairs.push({ where: 'list heading on field', fg: t.ink, bg: t.field });
  pairs.push({ where: 'list detail on field', fg: t.muted, bg: t.field });
  pairs.push({ where: 'list group title on field', fg: t.accentStrong, bg: t.field });
  const listAt = phone ? 1.4 : 1.7;
  css += `.gt{font:${HEAD}px 'BDL Marcellus',Georgia,serif;fill:${t.accentStrong}}.gh{font:${HEAD}px 'BDL Marcellus',Georgia,serif;fill:${t.ink}}.gd{font:${DET}px 'BDL Spectral',Georgia,serif;fill:${t.muted}}`;
  css += `#topl{animation:bdl-fade .5s ease 0s both}#plist{animation:bdl-fade .6s ease ${listAt}s both}`;
  body += `<g id="plist">${lst}</g>`;
  end = Math.max(end, listAt + 0.6);
  sizes.push(HEAD, DET);

  const lastPanelBottom = lastRowTop + rowH[nRows - 1];
  const H = Math.ceil(Math.max(listEnd, lastPanelBottom) + MARGIN_BOTTOM - 14);
  css = `${fontCss(glyphs)}\n${fontFaces.join('\n')}\n${css}`;
  const out = shell({ chart, scheme, t, W, H, css, body: topSvg + body, sourceHash, duration: end, variant, palette: portalPaletteHash(data) });
  const scale = (phone ? 360 : 830) / W;
  return {
    svg: out.svg,
    W,
    H,
    pairs: pairs.map((p2) => ({ ...p2, ratio: contrast(p2.fg, p2.bg) })),
    minRendered: Math.min(...sizes) * scale,
    fit: [],
    scheme,
  };
}
