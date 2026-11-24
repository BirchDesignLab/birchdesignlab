/**
 * The first script on /lab: small, and nothing here waits on the engine.
 * It wires the Wall/List switch and the lamp's bulb in the site header, and loads the engine (wall.ts and the
 * miniatures behind it) with a dynamic import only when the wall is the view.
 *
 * The view itself is decided before first paint by the inline line in
 * src/pages/lab/index.astro (data-lab-view on <html>); this file keeps that
 * attribute, the buttons and the remembered choice in step afterwards. The
 * lamp's own choice (data-lab-lamp on <html>) is set the same way, by the
 * inline line first and by wireBulb after; the engine only reads it.
 * Without script none of it exists and the page is the catalog list.
 *
 * Before the engine has arrived this file also holds the wall's place: it sets
 * the box to the size and position the engine will give it (reserve.ts), so
 * nothing below it moves when the engine mounts. And it reads a link to a
 * piece (/lab/#bdl-007): the entry is replaced with plain /lab/ and the piece
 * is handed to the engine to open once the wall is up. A reload (or Back) onto an entry this page pushed for a piece is
 * the one exception: that entry keeps its hash and the piece rides it, so closing the piece goes Back to the wall's own
 * entry and no second /lab/ entry is left behind. A click on a framed tile before the engine arrives (the inline script
 * remembers it on the wall) is handed to the engine the same way, to open as a click after mount would.
 */
import { wireBulb } from './lamp';
import { idFromHash, readView, writeView } from './model';
import type { View } from './model';
import { EARLY_ATTR, clearFramedTiles, holdBox, measureWall, placeFramedTiles } from './reserve';
import type { WallHandle, mountWall } from './wall';

const FADE_MS = 450;

/**
 * The engine's entry, if the page's second script has already brought it (LabWall.astro). That script
 * imports the engine up front, so the browser fetches it beside this file instead of after it; this file
 * then mounts it the moment it is wanted. When it has not run yet, load() imports the engine itself,
 * and the browser hands back the same module (one fetch, one copy).
 */
let offered: typeof mountWall | null = null;
export function offerEngine(mount: typeof mountWall): void {
  offered = mount;
}

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function bootLabWall(): void {
  const root = document.documentElement;
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-lw-view]'));
  if (!document.querySelector('[data-lw="wall"]') || buttons.length === 0) return;

  const bulb = document.querySelector<HTMLElement>('[data-lw="bulb"]');
  if (bulb) wireBulb(bulb, root, storage());

  const wallEl = document.querySelector<HTMLElement>('[data-lw="wall"]')!;
  const ids = listedIds();
  // A link to a listed piece opens it; a hash that names nothing here is dropped. Either way the entry
  // becomes plain /lab/, so the address bar and Back never carry a hash this page did not push itself.
  const linked = idFromHash(location.hash, ids);
  // The entry this page pushed itself for that piece (a reload, or Back, onto it) is left as it is: the piece rides it.
  const rode = linked !== null && (history.state as { lwOpen?: unknown } | null)?.lwOpen === linked;
  if (location.hash && !rode) {
    try {
      // The state goes too: whatever it held belonged to an entry this page no longer has a piece for.
      history.replaceState(null, '', location.pathname + location.search);
    } catch {
      /* history blocked: the hash stays, harmlessly */
    }
  }

  let engine: WallHandle | null = null;
  let loading: Promise<WallHandle | null> | null = null;
  let fadeTimer = 0;

  const viewNow = (): View => (root.dataset.labView === 'list' ? 'list' : 'wall');

  function paint(view: View, fade: boolean): void {
    if (fade) {
      // A short crossfade between the two views; set before the switch, cleared after.
      root.classList.add('lw-fading');
      clearTimeout(fadeTimer);
      fadeTimer = window.setTimeout(() => root.classList.remove('lw-fading'), FADE_MS);
    }
    root.dataset.labView = view;
    for (const b of buttons) b.setAttribute('aria-pressed', String(b.dataset.lwView === view));
  }

  /** Until the engine is here, hold the wall's box, and the framed tiles the page hung in it, at the size and place the engine will give them. */
  function reserve(): void {
    if (engine || viewNow() !== 'wall') return;
    try {
      placeFramedTiles(wallEl, measureWall(wallEl, ids));
    } catch {
      /* the engine measures it when it arrives */
    }
  }

  /** What keeps the held box in step (resize, a font landing, anything above it changing height): on while the wall shows and the engine is not here. */
  let release: (() => void) | null = null;
  function hold(): void {
    if (engine || release) return;
    release = holdBox(wallEl, reserve);
  }
  function unhold(): void {
    release?.();
    release = null;
  }

  /** The piece a framed tile was clicked for before the engine arrived (the last click), if the wall is still what shows; either way the memory is cleared. */
  function takeEarly(): string | null {
    const id = wallEl.getAttribute(EARLY_ATTR);
    wallEl.removeAttribute(EARLY_ATTR);
    return id !== null && ids.includes(id) && viewNow() === 'wall' ? id : null;
  }

  function load(open: string | null): Promise<WallHandle | null> {
    loading ??= (offered ? Promise.resolve({ mountWall: offered }) : import('./wall'))
      .then((m) => {
        unhold();
        // A click made while the engine was on its way wins over a link, and opens as a click would (an entry pushed);
        // except on an entry this page already pushed for a piece, which it rides.
        const early = takeEarly();
        return (engine = m.mountWall(early ? { open: early, entry: rode ? 'existing' : 'push' } : { open, entry: rode ? 'existing' : 'none' }));
      })
      .catch((err: unknown) => {
        console.error('Lab wall failed to load', err);
        return null;
      });
    return loading;
  }

  async function show(view: View, opts: { fade: boolean; remember: boolean; open?: string | null }): Promise<void> {
    paint(view, opts.fade);
    if (opts.remember) writeView(storage(), view);
    if (view === 'wall') {
      if (!engine) {
        reserve();
        hold();
      }
      const e = engine ?? (await load(opts.open ?? null));
      if (!e) {
        // The engine would not load: the page is its list, and the choice is not remembered against it, nor a click made meanwhile.
        unhold();
        clearFramedTiles(wallEl);
        paint('list', false);
        return;
      }
      // A toggle may have run again while the engine loaded.
      e.setView(viewNow());
    } else if (engine) {
      engine.setView('list');
    } else {
      // The List before the engine: nothing is held for a wall nobody sees, and a click made on it is let go.
      unhold();
      wallEl.removeAttribute(EARLY_ATTR);
    }
  }

  for (const b of buttons) {
    b.addEventListener('click', () => {
      const view: View = b.dataset.lwView === 'list' ? 'list' : 'wall';
      if (view === viewNow()) return;
      void show(view, { fade: true, remember: true });
    });
  }

  // The remembered choice, which the inline line has already painted; except that a link to a piece shows the wall
  // for this visit (the choice itself is left as it was).
  const first: View = linked ? 'wall' : readView(storage());
  void show(first, { fade: false, remember: false, open: linked });
}

/** The ids of the listed pieces, from the wall's own data block, in catalog order. */
function listedIds(): string[] {
  try {
    const rows = JSON.parse(document.querySelector('[data-lw="data"]')?.textContent || '[]') as Array<{ id?: unknown }>;
    return rows.map((r) => r.id).filter((id): id is string => typeof id === 'string');
  } catch {
    return [];
  }
}
