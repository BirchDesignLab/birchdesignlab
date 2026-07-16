/** Pure pattern core: seeded math only. Renderer-agnostic by spec. */

export interface Dash {
  x: number; y: number;   // center, normalized [0,1]
  w: number; h: number;   // size, normalized
  rot: number;            // radians
  shade: number;          // 0..1 tonal variation
}

export interface BarkOptions {
  density: number; // dash count
  bands: number;   // horizontal banding rows (lenticels cluster in bands)
}

const DEFAULTS: BarkOptions = { density: 140, bands: 12 };

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261; // FNV-1a
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function generateBark(seed: number, opts?: Partial<BarkOptions>): Dash[] {
  const { density, bands } = { ...DEFAULTS, ...opts };
  const rnd = mulberry32(seed);
  const dashes: Dash[] = [];
  for (let i = 0; i < density; i++) {
    const band = Math.floor(rnd() * bands);
    const y = clamp01((band + 0.5) / bands + (rnd() - 0.5) * (1.2 / bands));
    dashes.push({
      x: rnd(),
      y,
      w: lerp(0.02, 0.14, rnd() * rnd()), // bias toward short dashes
      h: lerp(0.002, 0.01, rnd()),
      rot: (rnd() - 0.5) * 0.12,
      shade: rnd(),
    });
  }
  return dashes;
}
