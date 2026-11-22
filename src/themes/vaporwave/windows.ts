/**
 * Vaporwave window chrome, Tier 3 Stage 3 wave B2 (vw-3, item 1 and item 4's
 * cascade behaviour, F5's "stop at static back windows" plus this seat's own
 * runtime state).
 *
 * Desktop only ((hover: hover) and (pointer: fine)): a window drags by its
 * title bar (pointer capture, clamped inside the viewport, no text selection
 * during the drag, a grab cursor on the bar). Coming to the front and the
 * active caption are mountWindowActivation's (below, task 24): page-wide,
 * on a press anywhere on a window or focus inside it. Positions are never persisted: this
 * only ever sets an inline `transform`/`z-index`, so a fresh page (a new
 * `.vw-win` set from the router or a hard load) starts untouched.
 *
 * Touch and coarse pointers: a finger brings a window to the front on
 * release, and only when the touch did not turn into a scroll
 * (mountWindowActivation, task 24); it never starts a drag, except on a
 * window marked data-touch-drag (task 25, below), and the page scrolls
 * normally (`touch-action: none` only applies under the desktop media query
 * in theme.css, so a touch drag on the bar is never captured here either).
 *
 * Task 29 (the signifier rule): each bar this mounts drag on is marked
 * `data-drag`, and the grab cursor and the hover (an ink rule along the
 * bar's foot, gated to a fine hover pointer) belong to those bars only, so a
 * window that does not drag (About's) does not promise it.
 *
 * No view-transition name lives on `.vw-win` or `.vw-win-bar` anywhere in
 * this school (only `.taskbar` carries one, `vaporwave-taskbar`), so a
 * dragged window's inline transform never fights a captured swap image.
 */
const THEME = 'vaporwave';
const DESKTOP = '(hover: hover) and (pointer: fine)';

/** Dispatched on a `.vw-win` to bring it to the front with the one active
    caption (mountWindowActivation listens). Task 25. */
export const ACTIVATE_EVENT = 'vw-activate';
/** Task 25: a window marked data-touch-drag also drags by its title bar under
    a finger, after a 200 ms press or a mostly horizontal move over 8px (the
    bauhaus `.loose` rule); a vertical swipe on the bar scrolls. Off at phone
    width, where windows open full width and have nowhere to go. */
const TOUCH_HOLD_MS = 200;
const TOUCH_SLOP_PX = 8;
const PHONE = '(max-width: 700px)';

/**
 * Pressing any window activates it (Stage 6 wave 3, task 24; a1-critic V9).
 * The overlap group is the whole page: a press anywhere on a window (not only
 * its title bar) brings it to the front and gives it the one active caption;
 * the window that had it takes the inactive grey caption (theme.css
 * `.vw-win-bar.inactive`, wave 2's set). Keyboard focus moving inside a
 * window does the same, so tabbing through the page walks the caption along.
 * Inert as a toy: no new control, no tab stop; the markup already ships
 * exactly one active caption per page, and every activation keeps it at one.
 *
 * A mouse or pen activates on press. A finger activates on release, and only
 * when the touch did not turn into a scroll (the browser cancels the pointer
 * then), so scrolling past a window leaves the captions alone.
 *
 * Mounted on every vaporwave page with windows (Home, Services, Contact,
 * About, Sent), beside mountWindowDrag where that runs. It only ever sets an
 * inline z-index and the caption class, so a fresh page starts as built.
 */
export function mountWindowActivation(): (() => void) | void {
  if (document.documentElement.dataset.theme !== THEME) return;
  const wins = Array.from(document.querySelectorAll<HTMLElement>('.vw-win'));
  if (!wins.length) return;

  let zTop = 10;
  let front: HTMLElement | null = null;
  const activate = (win: HTMLElement) => {
    if (front === win) return;
    front = win;
    zTop += 1;
    win.style.zIndex = String(zTop);
    for (const other of wins) {
      other.querySelector<HTMLElement>(':scope > .vw-win-bar')?.classList.toggle('inactive', other !== win);
    }
  };

  const cleanups: Array<() => void> = [];
  for (const win of wins) {
    let touchId = -1;
    const onDown = (event: PointerEvent) => {
      if (event.pointerType === 'touch') touchId = event.pointerId;
      else if (event.button === 0) activate(win);
    };
    const onUp = (event: PointerEvent) => {
      if (event.pointerId !== touchId) return;
      touchId = -1;
      activate(win);
    };
    const onCancel = (event: PointerEvent) => {
      if (event.pointerId === touchId) touchId = -1;
    };
    const onFocus = () => activate(win);
    // Task 25: a script brings a window forward by dispatching ACTIVATE_EVENT
    // on it (the elevator, a desktop icon opening a window, a closed window
    // handing the front to the next one), so the caption and z-order stay
    // this function's alone.
    const onRequest = () => activate(win);
    // Capture, so the window activates before the title bar's own drag
    // handler (mountWindowDrag) sees the same press.
    win.addEventListener('pointerdown', onDown, true);
    win.addEventListener('pointerup', onUp, true);
    win.addEventListener('pointercancel', onCancel, true);
    win.addEventListener('focusin', onFocus);
    win.addEventListener(ACTIVATE_EVENT, onRequest);
    cleanups.push(() => {
      win.removeEventListener('pointerdown', onDown, true);
      win.removeEventListener('pointerup', onUp, true);
      win.removeEventListener('pointercancel', onCancel, true);
      win.removeEventListener('focusin', onFocus);
      win.removeEventListener(ACTIVATE_EVENT, onRequest);
    });
  }

  return () => {
    for (const fn of cleanups) fn();
  };
}

export function mountWindowDrag(): (() => void) | void {
  if (document.documentElement.dataset.theme !== THEME) return;
  const wins = Array.from(document.querySelectorAll<HTMLElement>('.vw-win'));
  if (!wins.length) return;

  const cleanups: Array<() => void> = [];
  const root = document.documentElement;

  for (const win of wins) {
    const bar = win.querySelector<HTMLElement>('.vw-win-bar');
    if (!bar) continue;
    // The bar is a drag handle from here: the grab cursor and the hover are keyed on this (theme.css).
    bar.setAttribute('data-drag', '');

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
    type Armed = { id: number; x: number; y: number; hold: number };
    let armed: Armed | null = null;

    const onPointerDown = (event: PointerEvent) => {
      // B2 fix round: a caption button (min/max/close) still brings its
      // window forward on press (mountWindowActivation, task 24), but never
      // starts a drag. No pointer capture and no preventDefault, so :active
      // still inverts the bevel (theme.css) and the press behaves like any
      // other button press instead of moving the window underneath it.
      if ((event.target as Element | null)?.closest('.vw-win-btns')) return;
      if (event.pointerType === 'touch') {
        // Task 25: a finger drags only a window that opted in (data-touch-drag),
        // not at phone width, and only after a short press or a mostly
        // horizontal move (onPointerMove); a vertical swipe on the bar scrolls.
        if (!win.hasAttribute('data-touch-drag') || matchMedia(PHONE).matches || armed) return;
        const a: Armed = { id: event.pointerId, x: event.clientX, y: event.clientY, hold: 0 };
        a.hold = window.setTimeout(() => {
          if (armed === a) {
            armed = null;
            beginDrag(a.id, a.x, a.y);
          }
        }, TOUCH_HOLD_MS);
        armed = a;
        return;
      }
      if (event.button !== 0 || !matchMedia(DESKTOP).matches) return;
      beginDrag(event.pointerId, event.clientX, event.clientY);
      // Stops the pointerdown from also starting a text selection as the
      // drag begins (the WebKit lens run's finding on glass's own drag).
      event.preventDefault();
    };

    const beginDrag = (id: number, x: number, y: number) => {
      dragging = true;
      pointerId = id;
      startX = x;
      startY = y;
      try {
        bar.setPointerCapture(id);
      } catch {
        /* the pointer is gone */
      }
      win.classList.add('dragging');
      root.classList.add('vw-drag-lock');
    };
    const disarm = () => {
      if (armed) window.clearTimeout(armed.hold);
      armed = null;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (armed && event.pointerId === armed.id && !dragging) {
        const dx = event.clientX - armed.x;
        const dy = event.clientY - armed.y;
        if (Math.hypot(dx, dy) < TOUCH_SLOP_PX) return;
        const a = armed;
        disarm();
        if (Math.abs(dx) <= Math.abs(dy)) return;
        beginDrag(a.id, a.x, a.y);
      }
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
      if (armed && event.pointerId === armed.id) disarm();
      if (!dragging || event.pointerId !== pointerId) return;
      dragging = false;
      win.classList.remove('dragging');
      root.classList.remove('vw-drag-lock');
      if (bar.hasPointerCapture(pointerId)) bar.releasePointerCapture(pointerId);
    };

    // Once a finger has the window, the page must not scroll under it.
    const onTouchMove = (event: TouchEvent) => {
      if (dragging && event.cancelable) event.preventDefault();
    };

    bar.addEventListener('pointerdown', onPointerDown);
    bar.addEventListener('pointermove', onPointerMove);
    bar.addEventListener('pointerup', endDrag);
    bar.addEventListener('pointercancel', endDrag);
    bar.addEventListener('touchmove', onTouchMove, { passive: false });

    cleanups.push(() => {
      disarm();
      bar.removeAttribute('data-drag');
      bar.removeEventListener('touchmove', onTouchMove);
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
