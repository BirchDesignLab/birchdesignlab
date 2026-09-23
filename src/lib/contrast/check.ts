/**
 * The token contrast checker (spec §6.3). Resolves each school's semantic
 * tokens to painted colors and holds the text pairs every school must pass.
 *
 * Luminance and the WCAG ratio come from src/lib/color.ts and OKLCH from
 * src/lib/oklch.ts, so the checker and the Regulator can never disagree about
 * what a color is. Both speak '#rrggbb', so painted colors are rounded to
 * 8-bit channels before measuring. That is not a loss: the browser rounds the
 * same way when it composites, and the painted pixel is what a reader sees.
 */
import type { ContrastPair } from '../../themes/types';
import { contrast } from '../color';
import { oklchToHex, rgbToOklch, type Oklch } from '../oklch';
import { parseTokenBlocks, splitTopLevel, tokensFor } from './css-tokens';

/** 0-255 channels, alpha 0-1. */
export type RGBA = [number, number, number, number];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/* ---------- var() substitution ---------- */

/** Index of the `)` matching the `(` at `open`. */
function closeParen(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '(') depth++;
    else if (text[i] === ')' && --depth === 0) return i;
  }
  throw new Error(`unbalanced parentheses in "${text}"`);
}

/**
 * Replace every var() in `value`, recursively. `chain` is the custom
 * properties being expanded right now; meeting one again is a cycle, which a
 * browser treats as invalid at computed-value time, so it is an error here.
 */
function substitute(value: string, tokens: Record<string, string>, chain: string[]): string {
  let out = '';
  let i = 0;
  for (;;) {
    const at = value.indexOf('var(', i);
    if (at === -1) return out + value.slice(i);
    const close = closeParen(value, at + 3);
    const [rawName, ...rest] = splitTopLevel(value.slice(at + 4, close), ',');
    const name = rawName.trim();
    const fallback = rest.length ? rest.join(',').trim() : undefined;
    let replacement: string;
    if (chain.includes(name)) {
      throw new Error(`var() cycle: ${[...chain, name].join(' -> ')}`);
    } else if (name in tokens) {
      replacement = substitute(tokens[name], tokens, [...chain, name]);
    } else if (fallback !== undefined) {
      replacement = substitute(fallback, tokens, chain);
    } else {
      const via = chain.length ? ` (via ${chain.join(' -> ')})` : '';
      throw new Error(`missing token ${name}${via}`);
    }
    out += value.slice(i, at) + replacement;
    i = close + 1;
  }
}

/* ---------- color parsing ---------- */

/** A plain CSS number; anything else (calc(), units) is out of scope. */
function num(text: string, whole: string): number {
  const n = Number(text);
  if (text.trim() === '' || !Number.isFinite(n)) throw new Error(`cannot read "${text}" in color "${whole}"`);
  return n;
}

/** Alpha as a number or percentage, clamped to 0-1. */
function alphaOf(text: string | undefined, whole: string): number {
  if (text === undefined) return 1;
  if (text === 'none') return 0;
  return clamp(text.endsWith('%') ? num(text.slice(0, -1), whole) / 100 : num(text, whole), 0, 1);
}

/** Hue in degrees from a bare number or deg/turn/rad/grad. */
function hueOf(text: string, whole: string): number {
  if (text === 'none') return 0;
  const units: Record<string, number> = { deg: 1, turn: 360, rad: 180 / Math.PI, grad: 0.9 };
  for (const [unit, scale] of Object.entries(units)) {
    if (text.endsWith(unit)) return num(text.slice(0, -unit.length), whole) * scale;
  }
  return num(text, whole);
}

/**
 * Channels and optional alpha of a color function's argument list, in either
 * the legacy comma form (rgb(1, 2, 3, 0.5)) or the modern one (rgb(1 2 3 / 50%)).
 */
function channels(args: string, whole: string): { parts: string[]; alpha?: string } {
  if (splitTopLevel(args, ',').length > 1) {
    const parts = splitTopLevel(args, ',').map((p) => p.trim());
    if (parts.length !== 3 && parts.length !== 4) throw new Error(`expected 3 or 4 channels in "${whole}"`);
    return { parts: parts.slice(0, 3), alpha: parts[3] };
  }
  const [main, alpha, extra] = splitTopLevel(args, '/');
  if (extra !== undefined) throw new Error(`more than one "/" in "${whole}"`);
  const parts = main.trim().split(/\s+/);
  if (parts.length !== 3) throw new Error(`expected 3 channels in "${whole}"`);
  return { parts, alpha: alpha?.trim() };
}

function parseHex(hex: string, whole: string): RGBA {
  const body = hex.slice(1);
  if (!/^[0-9a-f]+$/.test(body) || ![3, 4, 6, 8].includes(body.length)) {
    throw new Error(`not a hex color: "${whole}"`);
  }
  const full = body.length <= 4 ? body.split('').map((c) => c + c).join('') : body;
  const byte = (k: number) => parseInt(full.slice(k * 2, k * 2 + 2), 16);
  return [byte(0), byte(1), byte(2), full.length === 8 ? byte(3) / 255 : 1];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hh = (((h % 360) + 360) % 360) / 360;
  const f = (n: number) => {
    const k = (n + hh * 12) % 12;
    return l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

/**
 * OKLCH to sRGB through oklch.ts, whose chroma-reduction gamut mapping is what
 * CSS Color 4 asks for when a color falls outside sRGB.
 */
function oklchToRgba(c: Oklch, alpha: number): RGBA {
  const [r, g, b] = parseHex(oklchToHex(c), '');
  return [r, g, b, alpha];
}

function rgbaToOklch([r, g, b]: RGBA): Oklch {
  return rgbToOklch([r / 255, g / 255, b / 255]);
}

/** One `color [p%]` argument of color-mix(). The percentage may lead or trail. */
function mixArg(text: string, whole: string, tokens: Record<string, string>): { color: RGBA; pct?: number } {
  const words = splitTopLevel(text.trim().replace(/\s+/g, ' '), ' ').filter(Boolean);
  let pct: number | undefined;
  const rest: string[] = [];
  for (const w of words) {
    if (/^-?[\d.]+%$/.test(w) && pct === undefined) pct = num(w.slice(0, -1), whole);
    else rest.push(w);
  }
  if (pct !== undefined && (pct < 0 || pct > 100)) throw new Error(`color-mix percentage out of range in "${whole}"`);
  return { color: parseColor(rest.join(' '), tokens), pct };
}

/**
 * color-mix() per CSS Color 5: missing percentages default so the pair sums to
 * 100, a sum under 100 scales the result's alpha, and channels mix
 * premultiplied by alpha, which is why mixing with transparent only fades.
 */
function colorMix(args: string, whole: string, tokens: Record<string, string>): RGBA {
  const parts = splitTopLevel(args, ',');
  if (parts.length !== 3) throw new Error(`color-mix needs a space and two colors: "${whole}"`);
  const space = parts[0].trim().replace(/\s+/g, ' ');
  if (space !== 'in srgb' && space !== 'in oklch') {
    throw new Error(`color-mix space "${space}" not supported (in srgb, in oklch): "${whole}"`);
  }
  const a = mixArg(parts[1], whole, tokens);
  const b = mixArg(parts[2], whole, tokens);
  let p1 = a.pct ?? (b.pct === undefined ? 50 : 100 - b.pct);
  let p2 = b.pct ?? 100 - p1;
  const sum = p1 + p2;
  if (sum <= 0) throw new Error(`color-mix percentages sum to zero: "${whole}"`);
  const scale = Math.min(sum, 100) / 100;
  p1 /= sum;
  p2 /= sum;
  const alpha = a.color[3] * p1 + b.color[3] * p2;
  if (alpha === 0) return [0, 0, 0, 0];
  const w1 = (a.color[3] * p1) / alpha;
  const w2 = (b.color[3] * p2) / alpha;
  if (space === 'in srgb') {
    const ch = (k: number) => a.color[k] * w1 + b.color[k] * w2;
    return [ch(0), ch(1), ch(2), alpha * scale];
  }
  // OKLCH: hue interpolates the shorter way round; an achromatic side has no
  // hue of its own (CSS calls it powerless) and takes the other side's.
  const A = rgbaToOklch(a.color);
  const B = rgbaToOklch(b.color);
  const achroma = 1e-4;
  const h1 = A.c < achroma || a.color[3] === 0 ? B.h : A.h;
  const h2 = B.c < achroma || b.color[3] === 0 ? h1 : B.h;
  let dh = h2 - h1;
  if (dh > 180) dh -= 360;
  else if (dh < -180) dh += 360;
  const mixed: Oklch = {
    l: A.l * w1 + B.l * w2,
    c: A.c * w1 + B.c * w2,
    h: (((h1 + dh * p2) % 360) + 360) % 360,
  };
  return oklchToRgba(mixed, alpha * scale);
}

const KEYWORDS: Record<string, RGBA> = {
  transparent: [0, 0, 0, 0],
  white: [255, 255, 255, 1],
  black: [0, 0, 0, 1],
};

/** A color with every var() already substituted. */
function parseColor(text: string, tokens: Record<string, string>): RGBA {
  const whole = text.trim().toLowerCase();
  if (whole in KEYWORDS) return [...KEYWORDS[whole]] as RGBA;
  if (whole.startsWith('#')) return parseHex(whole, whole);
  const open = whole.indexOf('(');
  if (open > 0 && closeParen(whole, open) === whole.length - 1) {
    const fn = whole.slice(0, open).trim();
    const args = whole.slice(open + 1, -1);
    if (fn === 'rgb' || fn === 'rgba') {
      const { parts, alpha } = channels(args, whole);
      const ch = (p: string) =>
        p === 'none' ? 0 : clamp(p.endsWith('%') ? (num(p.slice(0, -1), whole) / 100) * 255 : num(p, whole), 0, 255);
      return [ch(parts[0]), ch(parts[1]), ch(parts[2]), alphaOf(alpha, whole)];
    }
    if (fn === 'hsl' || fn === 'hsla') {
      const { parts, alpha } = channels(args, whole);
      const pct = (p: string) => (p === 'none' ? 0 : clamp(num(p.replace(/%$/, ''), whole) / 100, 0, 1));
      const [r, g, b] = hslToRgb(hueOf(parts[0], whole), pct(parts[1]), pct(parts[2]));
      return [r, g, b, alphaOf(alpha, whole)];
    }
    if (fn === 'oklch') {
      const { parts, alpha } = channels(args, whole);
      if (splitTopLevel(args, ',').length > 1) throw new Error(`oklch() takes spaces, not commas: "${whole}"`);
      const l = parts[0] === 'none' ? 0 : parts[0].endsWith('%') ? num(parts[0].slice(0, -1), whole) / 100 : num(parts[0], whole);
      // CSS maps 100% chroma to 0.4.
      const c = parts[1] === 'none' ? 0 : parts[1].endsWith('%') ? (num(parts[1].slice(0, -1), whole) / 100) * 0.4 : num(parts[1], whole);
      return oklchToRgba({ l: clamp(l, 0, 1), c: Math.max(0, c), h: hueOf(parts[2], whole) }, alphaOf(alpha, whole));
    }
    if (fn === 'color-mix') return colorMix(args, whole, tokens);
  }
  throw new Error(`unsupported color value "${text.trim()}"`);
}

/** Resolve a token value (var() chains included) to a painted RGBA. */
export function resolveColor(value: string, tokens: Record<string, string>): RGBA {
  return parseColor(substitute(value, tokens, []), tokens);
}

/* ---------- measuring ---------- */

/** Alpha-composite a stack listed top to bottom; the bottom layer must be opaque. */
export function composite(stack: RGBA[]): [number, number, number] {
  if (stack.length === 0) throw new Error('composite: empty background stack');
  const base = stack[stack.length - 1];
  if (Math.abs(base[3] - 1) > 1e-6) {
    throw new Error(`composite: the bottom layer must be opaque (alpha ${base[3]})`);
  }
  let rgb: [number, number, number] = [base[0], base[1], base[2]];
  for (let i = stack.length - 2; i >= 0; i--) {
    const [r, g, b, a] = stack[i];
    rgb = [r * a + rgb[0] * (1 - a), g * a + rgb[1] * (1 - a), b * a + rgb[2] * (1 - a)];
  }
  return rgb;
}

const toHex = (rgb: [number, number, number]) =>
  '#' + rgb.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');

/** WCAG 2.x ratio of `fg` painted over the composited background stack. */
export function contrastRatio(fg: RGBA, bgStack: RGBA[]): number {
  const bg = composite(bgStack);
  const text = composite([fg, [...bg, 1]]);
  return contrast(toHex(text), toHex(bg));
}

/* ---------- the pairs ---------- */

/** Every school, both schemes. Token names as custom properties. */
export const REQUIRED_PAIRS: ContrastPair[] = [
  { fg: '--mark', bg: ['--field'], min: 4.5, note: 'body text' },
  { fg: '--mark-muted', bg: ['--field'], min: 4.5, note: 'secondary text' },
  { fg: '--mark', bg: ['--field-raised'], min: 4.5, note: 'text on a raised surface' },
  { fg: '--link', bg: ['--field'], min: 4.5, note: 'links' },
  { fg: '--on-accent', bg: ['--accent'], min: 4.5, note: 'text on an accent fill' },
  { fg: '--accent', bg: ['--field'], min: 4.5, note: 'kickers' },
];

export interface ContrastRow {
  theme: string;
  scheme: 'light' | 'dark';
  pair: ContrastPair;
  ratio: number;
  ok: boolean;
  error?: string;
}

/** A pair entry names a custom property; anything else is read as a literal color. */
const ref = (name: string) => (name.startsWith('--') ? `var(${name})` : name);

/**
 * Both schemes of one school against the required pairs plus its own extras.
 * Never throws: a missing token or unreadable value is a failing row carrying
 * the reason, so one broken school cannot hide the rest of the report.
 */
export function checkTheme(css: string, meta: { id: string; contrast?: ContrastPair[] }): ContrastRow[] {
  const pairs = [...REQUIRED_PAIRS, ...(meta.contrast ?? [])];
  const schemes = ['dark', 'light'] as const;
  let blocks: ReturnType<typeof parseTokenBlocks>;
  try {
    blocks = parseTokenBlocks(css);
  } catch (e) {
    const error = `cannot parse CSS: ${(e as Error).message}`;
    return schemes.flatMap((scheme) => pairs.map((pair) => ({ theme: meta.id, scheme, pair, ratio: 0, ok: false, error })));
  }
  const rows: ContrastRow[] = [];
  for (const scheme of schemes) {
    const tokens = tokensFor(blocks, { theme: meta.id, scheme });
    for (const pair of pairs) {
      try {
        const fg = resolveColor(ref(pair.fg), tokens);
        const bg = pair.bg.map((b) => resolveColor(ref(b), tokens));
        const ratio = contrastRatio(fg, bg);
        rows.push({ theme: meta.id, scheme, pair, ratio, ok: ratio >= pair.min });
      } catch (e) {
        rows.push({ theme: meta.id, scheme, pair, ratio: 0, ok: false, error: (e as Error).message });
      }
    }
  }
  return rows;
}
