/**
 * The first script on /lab: small, and nothing here waits on the engine.
 * It wires the Wall/List switch, and loads the engine (wall.ts and the
 * miniatures behind it) with a dynamic import only when the wall is the view.
 *
 * The view itself is decided before first paint by the inline line in
 * src/pages/lab/index.astro (data-lab-view on <html>); this file keeps that
 * attribute, the buttons and the remembered choice in step afterwards.
 * Without script none of it exists and the page is the catalog list.
 */
import { readView, writeView } from './model';
import type { View } from './model';
import type { WallHandle } from './wall';

const FADE_MS = 450;

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

  function load(): Promise<WallHandle | null> {
    loading ??= import('./wall')
      .then((m) => (engine = m.mountWall()))
      .catch((err: unknown) => {
        console.error('Lab wall failed to load', err);
        return null;
      });
    return loading;
  }

  async function show(view: View, opts: { fade: boolean; remember: boolean }): Promise<void> {
    paint(view, opts.fade);
    if (opts.remember) writeView(storage(), view);
    if (view === 'wall') {
      const e = engine ?? (await load());
      if (!e) {
        // The engine would not load: the page is its list, and the choice is not remembered against it.
        paint('list', false);
        return;
      }
      // A toggle may have run again while the engine loaded.
      e.setView(viewNow());
    } else {
      engine?.setView('list');
    }
  }

  for (const b of buttons) {
    b.addEventListener('click', () => {
      const view: View = b.dataset.lwView === 'list' ? 'list' : 'wall';
      if (view === viewNow()) return;
      void show(view, { fade: true, remember: true });
    });
  }

  // The inline line has already set the attribute from the remembered choice; keep to it.
  const first: View = root.dataset.labView ? viewNow() : readView(storage());
  void show(first, { fade: false, remember: false });
}
