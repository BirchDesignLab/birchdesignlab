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
import { PHONE_BELOW } from './layout';
import type { Rect } from './layout';

/** localStorage key for the lamp choice. */
export const LAMP_KEY = 'lab-lamp';
/** The attribute on <html> that carries the choice. */
export const LAMP_ATTR = 'data-lab-lamp';

/** A fine pointer that hovers: a mouse or a trackpad. The CSS that shows the bulb in light asks the same. */
export const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)';
/** The wall's desktop layout (the phone map is below PHONE_BELOW). The CSS that shows the bulb in light asks the same. */
export const DESKTOP_QUERY = `(min-width: ${PHONE_BELOW}px)`;

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
  light: boolean;
  finePointer: boolean;
  /** The wall is in its desktop layout, not the phone map. */
  desktop: boolean;
}

/** Whether the lamp runs: dark everywhere; light only with a fine pointer at desktop layout. */
export function lampRuns(w: LampWhere): boolean {
  return w.on && (!w.light || (w.finePointer && w.desktop));
}

/** Whether the bulb shows: in the wall view only, and only where the lamp could run. */
export function bulbShows(w: Omit<LampWhere, 'on'> & { view: 'wall' | 'list' }): boolean {
  return w.view === 'wall' && lampRuns({ ...w, on: true });
}

/** How much of the rim glow a tile gets: 1 with the lamp on it, falling off smoothly with the distance from its edge. */
export function rimLit(rect: Rect, lx: number, ly: number): number {
  const dx = Math.max(rect.x - lx, 0, lx - (rect.x + rect.w));
  const dy = Math.max(rect.y - ly, 0, ly - (rect.y + rect.h));
  return Math.exp(-((Math.hypot(dx, dy) / 230) ** 2));
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
  return { x: box.cw * (0.5 + 0.34 * Math.sin(t * 0.13 + 0.7)), y: box.ch * (0.46 + 0.3 * Math.sin(t * 0.097 + 0.4)) };
}

/** Where the lamp first hangs. */
export function lampStart(box: LampBox, phone: boolean): { x: number; y: number } {
  return { x: box.cw * 0.64, y: phone ? box.vh * 0.45 - box.top : box.ch * 0.36 };
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
