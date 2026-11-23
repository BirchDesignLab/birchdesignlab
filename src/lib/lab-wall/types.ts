/** Shared shapes for the Lab wall: the miniature contract and what the engine gets per piece. */

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

/**
 * A running miniature. `c` in draw() is a 2D context already scaled so that
 * one unit is one CSS pixel; t is seconds, dt the frame step in seconds.
 */
export interface Mini {
  t0?: number;
  resize(w: number, h: number, dpr: number): void;
  draw(c: CanvasRenderingContext2D, t: number, dt: number, p: Pointer): void;
  enter?(p: Pointer, t: number): void;
}

export type MiniFactory = (env: MiniEnv) => Mini;

/** One piece as the wall engine receives it. */
export interface WallEntry {
  id: string;
  designation: string;
  title: string;
  kind: 'experiment' | 'study';
  kindLabel: string;
  month: string;
  summary: string;
  href: string | null;
  live: boolean;
  thumb: string | null;
}
