/**
 * The wall's small pure rules: which view a visitor gets, the words of the
 * open piece's bar, who the arrows step to, what the filter lets through.
 * No DOM, so the tests can reach every one of them.
 */
import type { CatalogSet } from '../lab-sets';

export type View = 'wall' | 'list';
export type Filter = 'all' | CatalogSet;

/** localStorage key for the Wall/List choice. */
export const VIEW_KEY = 'lab-view';

/** The remembered view; anything else (nothing stored, junk, storage blocked) is the wall. */
export function readView(storage: Pick<Storage, 'getItem'> | null): View {
  try {
    return storage?.getItem(VIEW_KEY) === 'list' ? 'list' : 'wall';
  } catch {
    return 'wall';
  }
}

/** Remember a view. Storage failures are fine: the view still switches. */
export function writeView(storage: Pick<Storage, 'setItem'> | null, view: View): void {
  try {
    storage?.setItem(VIEW_KEY, view);
  } catch {
    /* storage blocked: nothing to remember it in */
  }
}

/** The catalog filter as the list's script writes it on .catalog[data-filter]; anything unknown shows all. */
export function readFilter(value: string | null | undefined): Filter {
  return value === 'experiment' || value === 'study' ? value : 'all';
}

/** True when a piece of this kind shows under the filter. */
export function inFilter(kind: CatalogSet, filter: Filter): boolean {
  return filter === 'all' || kind === filter;
}

/**
 * The "Try it" line for a miniature's hint ("Move to turn it"). A touch
 * screen drags where a mouse moves, and clicks where a finger touches.
 * An entry with no miniature has no hint and no line.
 */
export function tryLine(hint: string | null | undefined, touch: boolean): string | null {
  if (!hint) return null;
  const said = hint.replace(/^Move\b/, touch ? 'Drag' : 'Move').replace(/^Touch\b/, touch ? 'Touch' : 'Click');
  return 'Try it: ' + said.charAt(0).toLowerCase() + said.slice(1);
}

/** "3 of 7": the piece's place among the pieces the filter lets through. */
export function counterLabel(position: number, total: number): string {
  return `${position} of ${total}`;
}

/** The piece `dir` steps from `current` within `pool`, wrapping at the ends; null when there is nowhere to go. */
export function stepTarget<T>(pool: readonly T[], current: T, dir: 1 | -1): T | null {
  const i = pool.indexOf(current);
  if (i < 0 || pool.length < 2) return null;
  return pool[(i + dir + pool.length) % pool.length] ?? null;
}

/** The hash an open piece shows in the address bar. */
export function hashFor(id: string): string {
  return '#' + id;
}

/**
 * The piece a link names: the hash of /lab/#bdl-007, if it is one of `ids` (the listed pieces). Anything else
 * (no hash, a hash for nothing here, an id that is not listed, a broken escape) is null. Case does not matter.
 */
export function idFromHash(hash: string, ids: readonly string[]): string | null {
  if (!hash.startsWith('#')) return null;
  let raw = hash.slice(1);
  try {
    raw = decodeURIComponent(raw);
  } catch {
    return null;
  }
  const want = raw.toLowerCase();
  return ids.find((id) => id.toLowerCase() === want) ?? null;
}
