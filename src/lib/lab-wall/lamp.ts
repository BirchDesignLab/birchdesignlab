/**
 * The wall's lamp: the choice behind the bulb button in the site header, where
 * the lamp runs, and the small arithmetic of where it hangs and which tiles it
 * lights. The pure rules sit up top so the tests can reach them; wireBulb at
 * the bottom is the one piece that touches the page.
 *
 * The choice lives on <html data-lab-lamp="on|off">. The inline line in
 * src/pages/lab/index.astro sets it before first paint (it repeats readLamp,
 * since an inline script cannot import); wireBulb keeps it, the button and
 * localStorage in step; the engine (wall.ts) watches it.
 */
import type { Rect } from './layout';

/** localStorage key for the lamp choice. */
export const LAMP_KEY = 'lab-lamp';
/** The attribute on <html> that carries the choice. */
export const LAMP_ATTR = 'data-lab-lamp';

/** The lamp is on unless the visitor turned it off. Nothing stored, junk, or storage blocked: on. */
export function readLamp(storage: Pick<Storage, 'getItem'> | null): boolean {
  try {
    return storage?.getItem(LAMP_KEY) !== 'off';
  } catch {
    return true;
  }
}

/** Remember the choice. Storage failures are fine: the lamp still switches. */
export function writeLamp(storage: Pick<Storage, 'setItem'> | null, on: boolean): void {
  try {
    storage?.setItem(LAMP_KEY, on ? 'on' : 'off');
  } catch {
    /* storage blocked: nothing to remember it in */
  }
}

export interface LampWhere {
  /** The visitor's choice (the bulb). */
  on: boolean;
}

/**
 * Whether the lamp runs: whenever the visitor has it on. It lights and darkens nothing (no dusk veil, nothing on
 * a tile's artwork), so it runs in both schemes and on every screen; the phone's lamp sits on the middle tile.
 */
export function lampRuns(w: LampWhere): boolean {
  return w.on;
}

/** Whether the bulb shows: in the wall view only. */
export function bulbShows(w: { view: 'wall' | 'list' }): boolean {
  return w.view === 'wall';
}

/** How long the pool and the shadows take to warm up or fade out when the bulb is pressed, ms. */
export const LAMP_FADE_MS = 400;

/** How far the lamp is from a tile's nearest edge, px: 0 with the lamp over the tile. */
export function lampDistance(rect: Rect, lx: number, ly: number): number {
  const dx = Math.max(rect.x - lx, 0, lx - (rect.x + rect.w));
  const dy = Math.max(rect.y - ly, 0, ly - (rect.y + rect.h));
  return Math.hypot(dx, dy);
}

/** How much of the lamp's lift a tile's frame and caption get: 1 with the lamp over it, falling off smoothly with the distance from its edge. */
export function lampLift(rect: Rect, lx: number, ly: number): number {
  return Math.exp(-((lampDistance(rect, lx, ly) / 230) ** 2));
}

/** The shortest shadow, a tile with the lamp on it, and the longest, a tile far from it, px. */
export const CAST_MIN = 5;
export const CAST_MAX = 34;
/** How fast a shadow lengthens with the distance from the lamp, px. */
export const CAST_REACH = 520;

/**
 * The shadow a tile casts on the wall, as the lamp rakes across it: an offset that points away from the lamp and
 * lengthens with the tile's distance from it (a tile with the lamp on it casts a short one, straight down), and a
 * strength that fades with the distance (the far shadows are the longer and the fainter).
 */
export function castAt(rect: Rect, lx: number, ly: number): { dx: number; dy: number; strength: number } {
  const dist = lampDistance(rect, lx, ly);
  const vx = rect.x + rect.w / 2 - lx, vy = rect.y + rect.h / 2 - ly;
  const d = Math.hypot(vx, vy);
  const ux = d < 1 ? 0 : vx / d, uy = d < 1 ? 1 : vy / d;
  const len = CAST_MIN + (CAST_MAX - CAST_MIN) * (1 - Math.exp(-dist / CAST_REACH));
  return { dx: ux * len, dy: uy * len, strength: 0.4 + 0.6 * Math.exp(-((dist / 760) ** 2)) };
}

/**
 * The pool's inner radius, CSS px: inside it the wall is lit (the pool is at half its strength here, lab-wall.css, and
 * its glow reaches about 700px). What lies under it is what the lamp wakes.
 */
export const LAMP_INNER = 200;
/** A tile wakes when this much of it lies under the pool's inner radius (or, for a tile bigger than the pool, this much of the pool lies on it)... */
export const LIT_WAKE = 0.5;
/** ...and goes back to rest when that falls under this, so a lamp at the edge does not flicker it awake and asleep. */
export const LIT_SLEEP = 0.35;

/**
 * How much the lamp's inner pool covers a tile, 0..1: the area of the tile under the disc, over the smaller of the two
 * areas. A small tile counts as lit when about half of it is under the pool; a tile bigger than the pool when about half
 * the pool is on it. Sampled on a 16 x 16 grid over the part of the tile the disc's square overlaps, ample for a threshold.
 */
export function litCover(rect: Rect, lx: number, ly: number, r = LAMP_INNER): number {
  if (rect.w <= 0 || rect.h <= 0 || r <= 0) return 0;
  const x0 = Math.max(rect.x, lx - r), x1 = Math.min(rect.x + rect.w, lx + r);
  const y0 = Math.max(rect.y, ly - r), y1 = Math.min(rect.y + rect.h, ly + r);
  if (x1 <= x0 || y1 <= y0) return 0;
  const N = 16, r2 = r * r, bw = x1 - x0, bh = y1 - y0;
  let inside = 0;
  for (let i = 0; i < N; i++) {
    const x = x0 + ((i + 0.5) / N) * bw - lx;
    for (let j = 0; j < N; j++) {
      const y = y0 + ((j + 0.5) / N) * bh - ly;
      if (x * x + y * y <= r2) inside++;
    }
  }
  const under = (inside / (N * N)) * bw * bh;
  return Math.min(1, under / Math.min(rect.w * rect.h, Math.PI * r2));
}

/** How long the lamp lingers on one tile when no pointer leads it, travel included, ms. */
export const LINGER_MS = 5000;
/** How long after the mouse leaves the window the lamp starts lingering by itself, ms (until then it holds still). */
export const AWAY_MS = 2500;

/**
 * The order the lamp visits tiles in when no pointer leads it: the biggest four (the lead and the three secondary pieces)
 * twice as often as the rest, one of the others after every two of them, so the wall shows one piece waking at a time and
 * mostly the pieces it leads with. `areas` is each tile's id and area; the result is one full round of ids.
 */
export function lingerRound(areas: Array<{ id: string; area: number }>): string[] {
  const by = [...areas].sort((a, b) => b.area - a.area || (a.id < b.id ? -1 : 1)).map((a) => a.id);
  const big = by.slice(0, 4), rest = by.slice(4);
  if (!rest.length) return big;
  const out: string[] = [];
  let b = 0;
  for (const id of rest) {
    out.push(big[b % big.length]!, big[(b + 1) % big.length]!, id);
    b += 2;
  }
  // every big tile at least twice a round
  while (b < big.length * 2) { out.push(big[b % big.length]!); b++; }
  return out;
}

/** The order tiles fade in on load: by distance of their centres from the lamp's starting point, nearest first. Returns each id's step. */
export function revealSteps(rects: Record<string, Rect>, at: { x: number; y: number }): Record<string, number> {
  const ids = Object.keys(rects);
  const d = (id: string) => { const r = rects[id]!; return Math.hypot(r.x + r.w / 2 - at.x, r.y + r.h / 2 - at.y); };
  const order = [...ids].sort((a, b) => d(a) - d(b) || (a < b ? -1 : 1));
  return Object.fromEntries(order.map((id, i) => [id, i]));
}

/** The wall's size and place in the window, as the lamp needs them. */
export interface LampBox {
  /** Wall width and height, CSS px. */
  cw: number;
  ch: number;
  /** The wall's top edge relative to the window's. */
  top: number;
  /** Window height. */
  vh: number;
}

/**
 * Where the lamp drifts to when no pointer is on the wall. Slow on purpose:
 * a long wander across the wall on a screen with a pointer, a slow sweep
 * across the middle of the window on a phone. `t` is seconds.
 */
export function driftTarget(t: number, box: LampBox, phone: boolean): { x: number; y: number } {
  if (phone) {
    return { x: box.cw * (0.5 + 0.32 * Math.sin(t * 0.17)), y: box.vh * 0.5 - box.top + 70 * Math.sin(t * 0.23) };
  }
  return { x: box.cw * (0.5 + 0.34 * Math.sin(t * 0.13 + 0.7)), y: inView(box.ch * (0.46 + 0.3 * Math.sin(t * 0.097 + 0.4)), box) };
}

/**
 * The part of the wall a lamp hangs in, y in wall px: from a fifth to seven tenths of the way down the window. A wall
 * taller than the window (the tablet map) puts the same fractions of the wall far below the fold; this keeps the lamp where
 * the visitor can see it. A wall that fits the window (the desktop map) is not moved.
 */
export function inView(y: number, box: LampBox): number {
  return Math.min(Math.max(y, -box.top + box.vh * 0.2), -box.top + box.vh * 0.7);
}

/** Where the lamp first hangs. */
export function lampStart(box: LampBox, phone: boolean): { x: number; y: number } {
  return { x: box.cw * 0.64, y: phone ? box.vh * 0.45 - box.top : inView(box.ch * 0.36, box) };
}

/**
 * Wire the header's bulb button: set the choice from storage, and let a press
 * flip it. Returns a function that takes the wiring down again.
 */
export function wireBulb(button: HTMLElement, root: HTMLElement, storage: Storage | null): () => void {
  const set = (on: boolean): void => {
    root.setAttribute(LAMP_ATTR, on ? 'on' : 'off');
    button.setAttribute('aria-pressed', String(on));
  };
  set(readLamp(storage));
  const onClick = (): void => {
    const on = root.getAttribute(LAMP_ATTR) === 'off';
    writeLamp(storage, on);
    set(on);
  };
  button.addEventListener('click', onClick);
  return () => button.removeEventListener('click', onClick);
}
