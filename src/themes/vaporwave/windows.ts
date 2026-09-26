/**
 * Vaporwave window chrome, Tier 3 Stage 3 wave B2 (vw-3, item 1 and item 4's
 * cascade behaviour, F5's "stop at static back windows" plus this seat's own
 * runtime state).
 *
 * Desktop only ((hover: hover) and (pointer: fine)): a window drags by its
 * title bar (pointer capture, clamped inside the viewport, no text selection
 * during the drag, a grab cursor on the bar). A window comes to the front
 * when pressed; pressing an inactive window (the two-stop back-window
 * caption, theme.css `.vw-win-bar.inactive`) makes it the active one and its
 * former sibling in the same overlap group goes inactive, so a cascade
 * always shows exactly one neon bar. Positions are never persisted: this
 * only ever sets an inline `transform`/`z-index`, so a fresh page (a new
 * `.vw-win` set from the router or a hard load) starts untouched.
 *
 * Touch and coarse pointers: pointerdown still brings the window to the
 * front (list order sits below it) but never starts a drag, and the page
 * scrolls normally (`touch-action: none` only applies under the desktop
 * media query in theme.css, so a touch drag on the bar is never captured
 * here either).
 *
 * No view-transition name lives on `.vw-win` or `.vw-win-bar` anywhere in
 * this school (only `.taskbar` carries one, `vaporwave-taskbar`), so a
 * dragged window's inline transform never fights a captured swap image.
 */
const THEME = 'vaporwave';
const DESKTOP = '(hover: hover) and (pointer: fine)';

export function mountWindowDrag(): (() => void) | void {
  if (document.documentElement.dataset.theme !== THEME) return;
  const wins = Array.from(document.querySelectorAll<HTMLElement>('.vw-win'));
  if (!wins.length) return;

  let zTop = 10;
  const bringToFront = (win: HTMLElement, bar: HTMLElement) => {
    zTop += 1;
    win.style.zIndex = String(zTop);
    if (!bar.classList.contains('inactive')) return;
    bar.classList.remove('inactive');
    // The overlap group is the nearest ancestor known to hold a cascade
    // (Home's door grid, Services' app pair); anything else falls back to
    // the window's own parent, which still deactivates a sibling window
    // sharing that parent if one happens to.
    const group = win.closest('.door-grid, .apps') ?? win.parentElement;
    if (!group) return;
    for (const sibling of group.querySelectorAll<HTMLElement>('.vw-win')) {
      if (sibling === win) continue;
      sibling.querySelector<HTMLElement>('.vw-win-bar')?.classList.add('inactive');
    }
  };

  const cleanups: Array<() => void> = [];
  const root = document.documentElement;

  for (const win of wins) {
    const bar = win.querySelector<HTMLElement>('.vw-win-bar');
    if (!bar) continue;

    let dragging = false;
    let pointerId = -1;
    let startX = 0;
    let startY = 0;
    // The translate this window is sitting at when a drag begins, and the
    // one it is sitting at right now (updated every move so the next move's
    // "where is my static box" math stays correct without re-reading the
    // computed transform, which would otherwise drift under fast pointer
    // moves that outrun a style recalc).
    let curX = 0;
    let curY = 0;

    const onPointerDown = (event: PointerEvent) => {
      bringToFront(win, bar);
      if (event.button !== 0 || !matchMedia(DESKTOP).matches) return;
      dragging = true;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      bar.setPointerCapture(pointerId);
      win.classList.add('dragging');
      root.classList.add('vw-drag-lock');
      // Stops the pointerdown from also starting a text selection as the
      // drag begins (the WebKit lens run's finding on glass's own drag).
      event.preventDefault();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging || event.pointerId !== pointerId) return;
      const rect = win.getBoundingClientRect();
      // rect already carries curX/curY; subtracting them back out gives the
      // window's untransformed box, so the clamp compares like for like
      // regardless of how far it has already been dragged.
      const originLeft = rect.left - curX;
      const originTop = rect.top - curY;
      const minX = -originLeft;
      const maxX = Math.max(minX, innerWidth - rect.width - originLeft);
      const minY = -originTop;
      const maxY = Math.max(minY, innerHeight - rect.height - originTop);
      const rawX = curX + (event.clientX - startX);
      const rawY = curY + (event.clientY - startY);
      curX = Math.min(Math.max(rawX, minX), maxX);
      curY = Math.min(Math.max(rawY, minY), maxY);
      startX = event.clientX;
      startY = event.clientY;
      win.style.transform = `translate(${curX}px, ${curY}px)`;
    };

    const endDrag = (event: PointerEvent) => {
      if (!dragging || event.pointerId !== pointerId) return;
      dragging = false;
      win.classList.remove('dragging');
      root.classList.remove('vw-drag-lock');
      if (bar.hasPointerCapture(pointerId)) bar.releasePointerCapture(pointerId);
    };

    bar.addEventListener('pointerdown', onPointerDown);
    bar.addEventListener('pointermove', onPointerMove);
    bar.addEventListener('pointerup', endDrag);
    bar.addEventListener('pointercancel', endDrag);

    cleanups.push(() => {
      bar.removeEventListener('pointerdown', onPointerDown);
      bar.removeEventListener('pointermove', onPointerMove);
      bar.removeEventListener('pointerup', endDrag);
      bar.removeEventListener('pointercancel', endDrag);
    });
  }

  return () => {
    root.classList.remove('vw-drag-lock');
    for (const fn of cleanups) fn();
  };
}
