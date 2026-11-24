/** Shared shapes for the Lab wall: the miniature contract and what the engine gets per piece. */
import type { CatalogSet } from '../lab-sets';

/** The pointer as a miniature sees it: x,y smoothed (0..1), tx,ty raw target, a = activity (0..1). */
export interface Pointer {
  x: number;
  y: number;
  tx: number;
  ty: number;
  a: number;
}

/** What a miniature may ask of the page. Images are the entry's own picture, if it has loaded. */
export interface MiniEnv {
  img(id: string): HTMLImageElement | null;
}

/** The box a miniature rests in: a tile on the desktop, tablet or phone wall, or the open piece. */
export type RestSize = 'desktop' | 'tablet' | 'phone' | 'open';

/**
 * A running miniature. `c` in draw() is a 2D context already scaled so that
 * one unit is one CSS pixel; t is seconds, dt the frame step in seconds.
 *
 * A tile rests on a poster frame and draws nothing until it wakes: the engine
 * calls rest() on a fresh instance (after resize), draws one frame at the time
 * it returns, and when the tile wakes the miniature plays on from there.
 */
export interface Mini {
  t0?: number;
  resize(w: number, h: number, dpr: number): void;
  draw(c: CanvasRenderingContext2D, t: number, dt: number, p: Pointer): void;
  enter?(p: Pointer, t: number): void;
  /** Set up the rest frame for a box of this size and return the time it is drawn at (default t0). Called again after a resize at rest. */
  rest?(size: RestSize): number;
}

export type MiniFactory = (env: MiniEnv) => Mini;

/** One piece as the wall engine receives it. */
export interface WallEntry {
  id: string;
  designation: string;
  title: string;
  kind: CatalogSet;
  kindLabel: string;
  month: string;
  summary: string;
  href: string | null;
  live: boolean;
  thumb: string | null;
}
