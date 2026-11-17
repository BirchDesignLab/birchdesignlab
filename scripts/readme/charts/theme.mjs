// Shared theme for the README charts: the site's tokens, per scheme, plus the
// colour maths the contrast report uses. Primitives are read from
// src/styles/tokens.css at build time so the charts follow the site's palette
// instead of copying it. The semantic mapping below mirrors the :root dark
// block and :root[data-scheme='light'] block in that file.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from './layout.mjs';

export const BUILDER_VERSION = '1.0.0';

function readPrimitives() {
  const css = readFileSync(resolve(ROOT, 'src/styles/tokens.css'), 'utf8');
  const block = css.match(/:root\s*\{([\s\S]*?)\n\}/)[1];
  const out = {};
  for (const m of block.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) out[m[1]] = m[2].toLowerCase();
  return out;
}

const hex = (n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
export const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const toHex = ([r, g, b]) => `#${hex(r)}${hex(g)}${hex(b)}`;
/** Mix colour a toward b by t (0 = a, 1 = b), in sRGB, to a solid hex. */
export function mix(a, b, t) {
  const A = rgb(a);
  const B = rgb(b);
  return toHex(A.map((v, i) => v + (B[i] - v) * t));
}
function lum(h) {
  const [r, g, b] = rgb(h).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a, b) {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
/** The first candidate that reaches `min` against `bg`, else the best one. */
export function readable(bg, candidates, min = 4.5) {
  let best = candidates[0];
  for (const c of candidates) {
    if (contrast(c, bg) >= min) return c;
    if (contrast(c, bg) > contrast(best, bg)) best = c;
  }
  return best;
}

/** Nudge `c` toward `toward` until it reaches `min` contrast on `bg`. */
export function ensure(c, bg, toward, min = 3.1) {
  let out = c;
  for (let i = 1; i <= 20 && contrast(out, bg) < min; i++) out = mix(c, toward, i * 0.05);
  return out;
}

export function palette(scheme) {
  const p = readPrimitives();
  if (scheme === 'light') {
    const field = p['bark-white'];
    const ink = p.ink;
    const t = {
      scheme,
      field,
      fieldRaised: p['bark-white-dim'],
      paper: mix(field, '#ffffff', 0.62),
      ink,
      muted: p['stone-dark'],
      accent: p['green-forest'],
      onAccent: field,
      accentStrong: p['leather-brown'],
      link: p['green-canopy'],
      // role fills
      cloudFill: p['green-sage-tint'],
      cloudStroke: p['green-forest'],
      storeFill: mix(p['leather-caramel'], field, 0.74),
      storeStroke: p['leather-brown'],
      youFill: mix(field, '#ffffff', 0.62),
      youStroke: ink,
      edge: mix(ink, field, 0.38),
      line: mix(ink, field, 0.8),
      dash: ink,
      dashOpacity: 0.075,
      clusterFill: mix(field, ink, 0.035),
      clusterStroke: mix(ink, field, 0.74),
      glow: p['green-canopy'],
      tier: { haiku: ensure(p['green-moss'], field, ink), sonnet: p['green-canopy'], opus: p['leather-brown'] },
    };
    return t;
  }
  const field = p.charcoal;
  const mark = p['bark-warm'];
  return {
    scheme,
    field,
    fieldRaised: p['charcoal-raised'],
    paper: mix(p['charcoal-raised'], mark, 0.035),
    ink: mark,
    muted: p['stone-warm'],
    accent: p['green-moss'],
    onAccent: field,
    accentStrong: p['leather-caramel'],
    link: p['green-moss'],
    cloudFill: p['green-pine-deep'],
    cloudStroke: p['green-moss'],
    storeFill: mix(p['leather-caramel'], field, 0.84),
    storeStroke: p['leather-caramel'],
    youFill: mix(p['charcoal-raised'], mark, 0.035),
    youStroke: mix(mark, field, 0.22),
    edge: mix(mark, field, 0.4),
    line: mix(mark, field, 0.84),
    dash: mark,
    dashOpacity: 0.07,
    clusterFill: mix(field, mark, 0.03),
    clusterStroke: mix(mark, field, 0.8),
    glow: p['green-moss'],
    tier: { haiku: p['green-moss'], sonnet: p['green-fern'], opus: p['leather-caramel'] },
  };
}

/** Role of a Mermaid classDef -> fill, stroke, heading and detail text colours. */
export function role(t, cls, focus) {
  if (focus) {
    return { fill: t.accent, stroke: t.accent, head: t.onAccent, detail: t.onAccent, kind: 'focus' };
  }
  const base = {
    cloud: { fill: t.cloudFill, stroke: t.cloudStroke },
    store: { fill: t.storeFill, stroke: t.storeStroke },
    you: { fill: t.youFill, stroke: t.youStroke },
  }[cls] ?? { fill: t.youFill, stroke: t.youStroke };
  return {
    ...base,
    head: t.ink,
    detail: readable(base.fill, [t.muted, mix(t.muted, t.ink, 0.5), t.ink]),
    kind: cls,
  };
}

export const FONT_STACK = {
  display: "'BDL Marcellus', Marcellus, 'Iowan Old Style', Georgia, serif",
  body: "'BDL Spectral', Spectral, Georgia, 'Times New Roman', serif",
};

/** Motion constants shared by every chart. Calm: easing only, nothing bounces. */
export const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
