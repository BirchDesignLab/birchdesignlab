/**
 * OKLCH ramp math for BDL-006 (the Regulator).
 *
 * Local and dependency-free on purpose: this is three matrix multiplies and a
 * gamut search, which is not worth a dependency in a repo that ships none for
 * color. Conversions follow Ottosson's OKLab.
 *
 * Everything crossing the boundary is '#rrggbb'. draw2d.ts's parseColor falls
 * back to white on anything it cannot read, so hex is the only currency the
 * house accepts.
 */
import { contrast, luminance } from './color';

export interface Oklch {
  /** perceptual lightness, 0..1 */
  l: number;
  /** chroma, 0..~0.37 in sRGB */
  c: number;
  /** hue in degrees, 0..360 */
  h: number;
}

type Rgb = [number, number, number];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
const toGamma = (v: number) => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);

function hexToRgb(hex: string): Rgb {
  const s = hex.trim().slice(1);
  const full = s.length === 3 ? s.split('').map((c) => c + c).join('') : s;
  const n = parseInt(full, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Always six digits: the three-digit shorthand is not universally parsed. */
function rgbToHex([r, g, b]: Rgb): string {
  return (
    '#' +
    [r, g, b]
      .map((v) => Math.round(clamp01(v) * 255).toString(16).padStart(2, '0'))
      .join('')
  );
}

export function rgbToOklch([r, g, b]: Rgb): Oklch {
  const lr = toLinear(r), lg = toLinear(g), lb = toLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const h = (Math.atan2(B, A) * 180) / Math.PI;
  return { l: L, c: Math.hypot(A, B), h: h < 0 ? h + 360 : h };
}

export function oklchToRgb({ l, c, h }: Oklch): Rgb {
  const rad = (h * Math.PI) / 180;
  const A = c * Math.cos(rad);
  const B = c * Math.sin(rad);
  const l_ = (l + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m_ = (l - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s_ = (l - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    toGamma(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_),
    toGamma(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_),
    toGamma(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_),
  ];
}

export function hexToOklch(hex: string): Oklch {
  return rgbToOklch(hexToRgb(hex));
}

const EPS = 1e-4;
const inGamut = ([r, g, b]: Rgb) =>
  r >= -EPS && r <= 1 + EPS && g >= -EPS && g <= 1 + EPS && b >= -EPS && b <= 1 + EPS;

/**
 * Gamut-map by pulling chroma in while holding lightness and hue, which is what
 * keeps a ramp's steps perceptually even. Clipping RGB instead would shift hue
 * exactly where the ramp is most saturated.
 */
export function oklchToHex(color: Oklch): string {
  const direct = oklchToRgb(color);
  if (inGamut(direct)) return rgbToHex(direct);
  let lo = 0;
  let hi = color.c;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(oklchToRgb({ ...color, c: mid }))) lo = mid;
    else hi = mid;
  }
  return rgbToHex(oklchToRgb({ ...color, c: lo }));
}

/** Hue anchors the ramp drifts toward at its ends. */
const BLUE_BLACK = 264;
const WARM_PAPER = 84;

/** Signed shortest way round the hue circle, -180..180. */
export function hueDelta(from: number, to: number): number {
  return ((((to - from) % 360) + 540) % 360) - 180;
}

export interface RampShape {
  /** scales the cosine chroma taper; 1 keeps the seed's chroma at mid-lightness */
  chroma: number;
  /** 0..1 fraction of the way the ends drift toward their hue anchors */
  drift: number;
  /** degrees added to the seed hue (the color crown's free spin) */
  spin: number;
}

export const DEFAULT_SHAPE: RampShape = { chroma: 1, drift: 0.35, spin: 0 };

/**
 * One rung of the ramp at lightness `l`.
 *
 * Chroma rides a raised cosine, so both ends run to neutral instead of staying
 * saturated into the shadows and highlights. Hue drifts off the seed only at
 * the ends: darks toward blue-black, lights toward warm paper, which is how ink
 * on paper actually behaves.
 */
export function rampStop(base: Oklch, l: number, shape: RampShape = DEFAULT_SHAPE): Oklch {
  const taper = (1 - Math.cos(2 * Math.PI * l)) / 2;
  const seedHue = (((base.h + shape.spin) % 360) + 360) % 360;
  const dark = Math.max(0, 1 - 2 * l);
  const light = Math.max(0, 2 * l - 1);
  const pull =
    dark * hueDelta(seedHue, BLUE_BLACK) + light * hueDelta(seedHue, WARM_PAPER);
  return {
    l: clamp01(l),
    c: Math.max(0, base.c * taper * shape.chroma),
    h: (((seedHue + shape.drift * pull) % 360) + 360) % 360,
  };
}

export interface RampStop {
  /** the WCAG ratio this rung was solved for */
  target: number;
  /** what it actually achieves against the field */
  ratio: number;
  l: number;
  hex: string;
}

/** The house targets: hairline, large text/borders, body text, and headroom. */
export const CONTRAST_TARGETS = [1.5, 3, 4.5, 7];

/**
 * Solve the ramp against a field color so every rung lands on a WCAG number
 * rather than on a lightness someone liked. Stops are searched on the far side
 * of the field's own lightness, so a dark face ramps up and a light face ramps
 * down; contrast is monotone there, so nearest-ratio is the exact answer.
 */
export function anchoredRamp(
  accentHex: string,
  fieldHex: string,
  targets: number[] = CONTRAST_TARGETS,
  shape: RampShape = DEFAULT_SHAPE,
): RampStop[] {
  const base = hexToOklch(accentHex);
  const fieldL = hexToOklch(fieldHex).l;
  const climbing = luminance(fieldHex) < 0.5;
  const candidates: RampStop[] = [];
  for (let i = 0; i <= 500; i++) {
    const l = i / 500;
    if (climbing ? l <= fieldL : l >= fieldL) continue;
    const hex = oklchToHex(rampStop(base, l, shape));
    candidates.push({ target: 0, ratio: contrast(hex, fieldHex), l, hex });
  }
  if (candidates.length === 0) {
    const hex = oklchToHex(rampStop(base, climbing ? 1 : 0, shape));
    return targets.map((target) => ({ target, ratio: contrast(hex, fieldHex), l: climbing ? 1 : 0, hex }));
  }
  return targets.map((target) => {
    let best = candidates[0];
    for (const stop of candidates) {
      if (Math.abs(stop.ratio - target) < Math.abs(best.ratio - target)) best = stop;
    }
    return { ...best, target };
  });
}
