/**
 * The Lab's presentation: its texture and its motion, the two design passes
 * that were never drawn (docs/lab-backlog.md, "The Lab's four design passes").
 *
 * This file is the model and the shipped setting. It is pure (no DOM), so the
 * bench (BDL-006, The Regulator), the catalog and the tests all read the same
 * numbers. The DOM half is lab-presentation-client.ts.
 *
 * LAB_PRESENTATION is what every visitor gets. It ships at "nothing": no
 * texture, no motion, the Lab exactly as it was. The founder tunes on the
 * bench, pushes the crown in, and pastes the line the bench prints over the
 * one below.
 */
import { generateBark } from './bark/pattern';

/** Surface treatments, each drawn in the page's own ink (--mark) so one
    definition serves light and dark. */
export const TEXTURES = ['none', 'paper', 'laid', 'hatch', 'bark'] as const;
export type Texture = (typeof TEXTURES)[number];

/** How a catalog row arrives. */
export const ENTRANCES = ['rise', 'draw', 'develop'] as const;
export type Entrance = (typeof ENTRANCES)[number];

export interface LabPresentation {
  texture: Texture;
  /** How much of the texture shows, 0 to 100. */
  amount: number;
  /** The motion budget, 0 to 100. 0 is still: no entrance runs and the motion
      library is never fetched. */
  motion: number;
  entrance: Entrance;
}

/** The shipped setting. Paste the bench's lock-in over this line. */
export const LAB_PRESENTATION: LabPresentation = { texture: 'none', amount: 0, motion: 0, entrance: 'rise' };

/** Where the bench keeps a setting being tried on in this browser only. */
export const STORAGE_KEY = 'lab-presentation';

export const TEXTURE_LABEL: Record<Texture, string> = {
  none: 'None',
  paper: 'Paper',
  laid: 'Laid',
  hatch: 'Hatch',
  bark: 'Bark',
};
export const TEXTURE_NOTE: Record<Texture, string> = {
  none: 'The bare field, as the Lab is today.',
  paper: 'Fine fibre, the tooth of an uncoated sheet.',
  laid: 'Laid lines and chain lines, the mark of a paper mould.',
  hatch: 'Engraver’s hatching, heavier toward the edges of the plate.',
  bark: 'The house lenticels, still, as a ground under the catalog.',
};
export const ENTRANCE_LABEL: Record<Entrance, string> = { rise: 'Rise', draw: 'Draw', develop: 'Develop' };
export const ENTRANCE_NOTE: Record<Entrance, string> = {
  rise: 'Each line lifts into place, one after another.',
  draw: 'The row is ruled in from the left, then its words follow.',
  develop: 'The picture comes up out of a blur, like a print in the tray.',
};

/** Opacity of each texture at amount 100. Tuned so 100 is too much and the
    middle of the crown is where the answer lives. */
const CEILING: Record<Texture, number> = { none: 0, paper: 0.6, laid: 0.3, hatch: 0.42, bark: 0.5 };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const whole = (v: unknown, fallback: number) => {
  const n = typeof v === 'number' ? v : Number.NaN;
  return Number.isFinite(n) ? Math.round(clamp(n, 0, 100)) : fallback;
};

/** Anything (a parsed localStorage value, a partial) to a valid setting.
    Unknown names and out-of-range numbers fall back to `base`. */
export function normalise(input: unknown, base: LabPresentation = LAB_PRESENTATION): LabPresentation {
  const o = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  return {
    texture: TEXTURES.includes(o.texture as Texture) ? (o.texture as Texture) : base.texture,
    amount: whole(o.amount, base.amount),
    motion: whole(o.motion, base.motion),
    entrance: ENTRANCES.includes(o.entrance as Entrance) ? (o.entrance as Entrance) : base.entrance,
  };
}

export function sameSetting(a: LabPresentation, b: LabPresentation): boolean {
  return a.texture === b.texture && a.amount === b.amount && a.motion === b.motion && a.entrance === b.entrance;
}

/** 0 when there is nothing to draw. */
export function textureOpacity(p: LabPresentation): number {
  return Math.round(CEILING[p.texture] * (p.amount / 100) * 1000) / 1000;
}

export interface MotionTiming {
  /** Seconds for one part to arrive. */
  duration: number;
  /** Pixels a part travels. */
  distance: number;
  /** Seconds between one part and the next. */
  stagger: number;
}

/** The budget as numbers. One dial moves all three, so a slower Lab is also a
    longer-travelled and more spaced-out one. Null at 0: nothing runs. */
export function motionTiming(motion: number): MotionTiming | null {
  const t = clamp(motion, 0, 100) / 100;
  if (t === 0) return null;
  const r = (v: number) => Math.round(v * 1000) / 1000;
  return { duration: r(0.3 + 0.9 * t), distance: Math.round(6 + 42 * t), stagger: r(0.03 + 0.09 * t) };
}

/** The bark texture: one square tile of house lenticels as an SVG, for use as
    a CSS mask. Seeded, so the ground is the same on every visit. */
export function barkTile(seed = 6, density = 70, size = 520): string {
  const rects = generateBark(seed, { density })
    .map((d) => {
      const w = d.w * size;
      const h = Math.max(1, d.h * size);
      const x = d.x * size - w / 2;
      const y = d.y * size - h / 2;
      const deg = (d.rot * 180) / Math.PI;
      const f = (v: number) => v.toFixed(1);
      return `<rect x='${f(x)}' y='${f(y)}' width='${f(w)}' height='${f(h)}' fill-opacity='${(0.35 + d.shade * 0.65).toFixed(2)}' transform='rotate(${f(deg)} ${f(d.x * size)} ${f(d.y * size)})'/>`;
    })
    .join('');
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'>${rects}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** What the bench prints when the crown is pushed in. */
export function lockIn(p: LabPresentation): string {
  return [
    `# BDL-006 lock-in: Lab texture and motion. Paste by hand; the Regulator writes nothing.`,
    `src/lib/lab-presentation.ts`,
    `  export const LAB_PRESENTATION: LabPresentation = { texture: '${p.texture}', amount: ${p.amount}, motion: ${p.motion}, entrance: '${p.entrance}' };`,
    `# Every visitor then gets this on /lab. Run \`npm run verify\` after pasting.`,
  ].join('\n');
}
