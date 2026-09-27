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
      // B2 fix round: a caption button (min/max/close) still brings its
      // window forward on press (bringToFront above already ran), but never
      // starts a drag. No pointer capture and no preventDefault, so :active
      // still inverts the bevel (theme.css) and the press behaves like any
      // other button press instead of moving the window underneath it.
      if ((event.target as Element | null)?.closest('.vw-win-btns')) return;
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

    // B2 fix round 3: a caption's "pressed" look lived in CSS `:active`
    // alone, on the (wrong) assumption that the browser clears `:active`
    // itself once the pointer leaves the element while still held. The B2
    // verifier found a real gap: dragging the pointer 200px off a held
    // caption button never restored the bevel, only releasing over the
    // button did. JS now drives a `.pressed` class directly, one pointer
    // per button: pressed on down, unpressed the moment that pointer
    // leaves, pressed again on re-entry while the same pointer is still
    // down, released on up anywhere (no capture is ever set for a caption
    // press, so "anywhere" needs a document-level listener) or on cancel.
    // This never starts a drag -- onPointerDown above already returns
    // early for any press inside `.vw-win-btns` -- and never touches
    // focusability (the spans stay aria-hidden, unchanged).
    //
    // Fix round 4: that early return also meant a caption's own pointerdown
    // never reached the window bar's `event.preventDefault()` (the one that
    // stops a drag's own text selection, above) -- so dragging off a held
    // caption button, over nearby text, still ran the browser's normal
    // drag-to-select. `onCapDown` now calls `preventDefault()` itself for
    // mouse and pen (the pointer types that can drag-select text this way;
    // the round-3 critic's own repro used a mouse), the same suppression
    // and the same safety as the bar's own: these spans are decorative
    // (aria-hidden, unfocusable, no click handler of their own), so it costs
    // nothing real. Excluded for touch: `preventDefault` on a touch
    // pointerdown also cancels that touch's default scroll, and these are
    // small (22x20px) targets inside an otherwise normal scrolling page --
    // a visitor whose thumb happens to land on one while meaning to scroll
    // should still be able to.
    for (const cap of bar.querySelectorAll<HTMLElement>('.vw-win-btns span')) {
      let heldId = -1;
      const onCapDown = (event: PointerEvent) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        heldId = event.pointerId;
        cap.classList.add('pressed');
        if (event.pointerType !== 'touch') event.preventDefault();
      };
      const onCapLeave = (event: PointerEvent) => {
        if (event.pointerId !== heldId) return;
        cap.classList.remove('pressed');
      };
      const onCapEnter = (event: PointerEvent) => {
        if (event.pointerId !== heldId || (event.buttons & 1) === 0) return;
        cap.classList.add('pressed');
      };
      const onCapUp = (event: PointerEvent) => {
        if (event.pointerId !== heldId) return;
        heldId = -1;
        cap.classList.remove('pressed');
      };
      cap.addEventListener('pointerdown', onCapDown);
      cap.addEventListener('pointerleave', onCapLeave);
      cap.addEventListener('pointerenter', onCapEnter);
      document.addEventListener('pointerup', onCapUp);
      document.addEventListener('pointercancel', onCapUp);
      cleanups.push(() => {
        cap.removeEventListener('pointerdown', onCapDown);
        cap.removeEventListener('pointerleave', onCapLeave);
        cap.removeEventListener('pointerenter', onCapEnter);
        document.removeEventListener('pointerup', onCapUp);
        document.removeEventListener('pointercancel', onCapUp);
      });
    }
  }

  return () => {
    root.classList.remove('vw-drag-lock');
    for (const fn of cleanups) fn();
  };
}
