/**
 * Sent's desktop that works (Stage 6 wave 3, task 25, a1-critic-vaporwave
 * "Interactables" 2). The four icons (Sent.astro, real buttons) select on a
 * click, a tap or focus, drag on a snap grid, and open on a double-click, a
 * double tap or Enter:
 *
 *   My Computer   a small window of drives (drawn glyphs, no words)
 *   Recycle Bin   an empty window, "0 object(s)"
 *   readme.txt    a Notepad window listing the site's own file names
 *   birch.exe     an hourglass for a beat, then the screensaver full-window
 *                 (the pipes loop screensaver.ts already draws); any key, a
 *                 click or a tap ends it
 *
 * The windows are in the markup, hidden; opening shows one and hands it to
 * mountWindowActivation (ACTIVATE_EVENT) so the caption and the front are that
 * function's. A window closes with its X (a real button) and Escape, and the
 * front passes to the next window up, the "Sent." message included. Nothing
 * is stored: positions and windows reset each visit.
 *
 * Icons drag in the same way bauhaus's loose shapes do: a mouse picks up on
 * press; a finger on a short press (200 ms) or a mostly horizontal move over
 * 8px, so a vertical swipe still scrolls (touch-action: pan-y on the icon).
 * An icon sits on a grid of whole cells the size of one icon: on release it
 * takes the cell nearest where it was dropped, or the nearest free one.
 * Icons live under the message window (z-index), so a drag never covers it.
 *
 * Touch (task 29, the signifier rule): a finger that has not touched the
 * desktop gets one small beat, once a visit, on the common conditions
 * (bauhaus's beat.ts): the first icon in view takes the Win95 selection (the
 * inverse label) for a moment and lets it go, unless the visitor has picked
 * something by then. A mouse has the pointer and the label's hover instead.
 *
 * Lifecycle: mounted through onMount, returns a cleanup that removes every
 * listener, timer, observer and loop, closes every window and ends the
 * screensaver, so a swap away leaves nothing behind and the page remounts
 * closed.
 */
import { ACTIVATE_EVENT } from './windows';
import { createLoop } from './screensaver';
import { scheduleBeat } from '../bauhaus/parts/beat';

const THEME = 'vaporwave';
const HOLD_MS = 200;
const SLOP_PX = 8;
const TAP_MS = 450;
const TAP_PX = 28;
const WAIT_MS = 1100;
/** How long the beat's selection shows. */
const BEAT_SELECT_MS = 1300;

type Key = 'computer' | 'bin' | 'readme' | 'exe';

/** The cell a point lands in, clamped to the grid. */
export function cellOf(offset: number, size: number, count: number): number {
  return Math.min(Math.max(Math.round(offset / size), 0), Math.max(count - 1, 0));
}

/** The nearest free cell to (cx, cy) on a cols x rows grid, searching outward
    ring by ring (nearer by straight distance first); null when none is free. */
export function nearestFree(cx: number, cy: number, cols: number, rows: number, taken: Set<string>): [number, number] | null {
  let best: [number, number] | null = null;
  let bestD = Infinity;
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      if (taken.has(`${x},${y}`)) continue;
      const d = (x - cx) ** 2 + (y - cy) ** 2;
      if (d < bestD) {
        bestD = d;
        best = [x, y];
      }
    }
  }
  return best;
}

export function mountDesktop(): (() => void) | void {
  if (document.documentElement.dataset.theme !== THEME) return;
  const stage = document.querySelector<HTMLElement>('[data-desk]');
  const layer = stage?.querySelector<HTMLElement>('[data-desk-icons]');
  if (!stage || !layer) return;
  const icons = Array.from(layer.querySelectorAll<HTMLButtonElement>('[data-desk-icon]'));
  if (!icons.length) return;

  const root = document.documentElement;
  const cleanups: Array<() => void> = [];
  const on = (target: EventTarget, type: string, fn: (event: any) => void, options?: AddEventListenerOptions | boolean) => {
    target.addEventListener(type, fn, options);
    cleanups.push(() => target.removeEventListener(type, fn, options));
  };

  // ---- selection ----------------------------------------------------------
  let selected: HTMLElement | null = null;
  const select = (el: HTMLElement | null) => {
    if (selected === el) return;
    selected?.removeAttribute('data-selected');
    selected = el;
    el?.setAttribute('data-selected', '');
  };
  // A press on bare desktop drops the selection, as on Windows.
  on(stage, 'pointerdown', (event: PointerEvent) => {
    const target = event.target as Element | null;
    if (target?.closest('[data-desk-icon], .vw-win, [data-desk-scr], a, button')) return;
    select(null);
  });

  // ---- windows --------------------------------------------------------------
  const wins = new Map<Key, HTMLElement>();
  for (const el of Array.from(stage.querySelectorAll<HTMLElement>('[data-desk-win]'))) {
    wins.set(el.dataset.deskWin as Key, el);
  }
  const openedBy = new Map<HTMLElement, HTMLElement>();
  const zOf = (el: HTMLElement) => Number.parseInt(getComputedStyle(el).zIndex, 10) || 0;
  const visibleWins = () => Array.from(stage.querySelectorAll<HTMLElement>('.vw-win')).filter((w) => !w.hidden);
  const top = (list: HTMLElement[]) => list.sort((a, b) => zOf(b) - zOf(a))[0] ?? null;

  const openWindow = (key: Key, icon: HTMLElement) => {
    const win = wins.get(key);
    if (!win) return;
    win.hidden = false;
    win.removeAttribute('aria-hidden');
    openedBy.set(win, icon);
    win.dispatchEvent(new CustomEvent(ACTIVATE_EVENT));
    win.querySelector<HTMLElement>('[data-win-close]')?.focus({ preventScroll: true });
  };
  const closeWindow = (win: HTMLElement, returnFocus = true) => {
    if (win.hidden) return;
    const hadFocus = win.contains(document.activeElement) || document.activeElement === document.body;
    win.hidden = true;
    win.setAttribute('aria-hidden', 'true');
    win.classList.remove('dragging');
    root.classList.remove('vw-drag-lock');
    const next = top(visibleWins());
    next?.dispatchEvent(new CustomEvent(ACTIVATE_EVENT));
    const icon = openedBy.get(win);
    if (returnFocus && hadFocus) icon?.focus({ preventScroll: true });
  };
  on(stage, 'click', (event: MouseEvent) => {
    const x = (event.target as Element | null)?.closest('[data-win-close]');
    const win = x?.closest<HTMLElement>('[data-desk-win]');
    if (win) closeWindow(win);
  });

  // ---- birch.exe: an hourglass, then the screensaver ------------------------
  // The overlay and the hourglass sit outside the stage (a fixed layer above the header).
  const saver = document.querySelector<HTMLElement>('[data-desk-scr]');
  const saverCanvas = saver?.querySelector<HTMLCanvasElement>('[data-desk-scr-canvas]') ?? null;
  const hourglass = document.querySelector<HTMLElement>('[data-desk-wait]');
  let waitTimer = 0;
  let waiting: HTMLElement | null = null;
  let loop: ReturnType<typeof createLoop> | null = null;
  let saverOpen = false;
  let exeIcon: HTMLElement | null = null;

  const stopWait = () => {
    window.clearTimeout(waitTimer);
    waitTimer = 0;
    waiting?.removeAttribute('data-busy');
    waiting = null;
    root.classList.remove('vw-wait');
    if (hourglass) hourglass.hidden = true;
  };
  const endSaver = (returnFocus: boolean) => {
    if (!saverOpen || !saver) return;
    saverOpen = false;
    loop?.destroy();
    loop = null;
    saver.hidden = true;
    document.removeEventListener('keydown', onSaverKey, true);
    saver.removeEventListener('click', onSaverClick);
    if (returnFocus) exeIcon?.focus({ preventScroll: true });
  };
  const onSaverKey = (event: KeyboardEvent) => {
    // Any key ends it, and only that: it must not also close a window (Escape).
    event.preventDefault();
    event.stopImmediatePropagation();
    endSaver(true);
  };
  const onSaverClick = () => endSaver(true);
  const startSaver = () => {
    if (!saver || !saverCanvas) return;
    stopWait();
    saver.hidden = false;
    saverOpen = true;
    loop = createLoop(saverCanvas, new Image());
    loop.setMode('pipes');
    loop.start();
    document.addEventListener('keydown', onSaverKey, true);
    saver.addEventListener('click', onSaverClick);
  };
  const runExe = (icon: HTMLElement) => {
    if (waitTimer || saverOpen || !saver) return;
    exeIcon = icon;
    waiting = icon;
    icon.setAttribute('data-busy', '');
    root.classList.add('vw-wait');
    if (hourglass) hourglass.hidden = false;
    waitTimer = window.setTimeout(startSaver, WAIT_MS);
  };

  const open = (icon: HTMLElement) => {
    const key = icon.dataset.deskIcon as Key;
    if (key === 'exe') runExe(icon);
    else openWindow(key, icon);
  };

  on(document, 'keydown', (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || event.defaultPrevented || saverOpen) return;
    if (waitTimer) {
      stopWait();
      return;
    }
    const win = top(Array.from(stage.querySelectorAll<HTMLElement>('[data-desk-win]')).filter((w) => !w.hidden));
    if (win) closeWindow(win);
  });

  // ---- the icon grid --------------------------------------------------------
  /** Where an icon sits now, in whole cells from the grid's top-left, and the
      translate (px) that puts it there from its natural spot. */
  type Spot = { cx: number; cy: number };
  const spots = new Map<HTMLElement, Spot>();
  const geometry = () => {
    // The real cell pitch, fractional: on a narrow phone the four tracks share
    // the layer (84.5px each at 360), so a rounded offsetWidth would put the
    // fourth icon's cell off the grid. The tolerance absorbs layout rounding.
    const first = icons[0].getBoundingClientRect();
    const box = layer.getBoundingClientRect();
    const w = first.width || 1;
    const h = first.height || 1;
    return { w, h, cols: Math.max(1, Math.floor(box.width / w + 0.02)), rows: Math.max(1, Math.floor(box.height / h + 0.02)) };
  };
  const natural = (el: HTMLElement) => {
    const { w, h } = geometry();
    return { x: el.offsetLeft, y: el.offsetTop, cx: Math.round(el.offsetLeft / w), cy: Math.round(el.offsetTop / h) };
  };
  const place = (el: HTMLElement, cx: number, cy: number, animate: boolean) => {
    const { w, h } = geometry();
    const n = natural(el);
    spots.set(el, { cx, cy });
    if (animate) el.setAttribute('data-settle', '');
    el.style.transform = cx === n.cx && cy === n.cy ? '' : `translate(${cx * w - n.x}px, ${cy * h - n.y}px)`;
    if (animate) {
      window.setTimeout(() => el.removeAttribute('data-settle'), 180);
    }
  };
  const spotOf = (el: HTMLElement): Spot => spots.get(el) ?? { cx: natural(el).cx, cy: natural(el).cy };
  // Cells another icon holds, and cells the message window covers: an icon dropped
  // under it would be lost, so those are not free.
  const dialog = stage.querySelector<HTMLElement>('.dialog');
  const takenBy = (except: HTMLElement) => {
    const taken = new Set(icons.filter((i) => i !== except).map((i) => `${spotOf(i).cx},${spotOf(i).cy}`));
    if (dialog) {
      const { w, h, cols, rows } = geometry();
      const box = layer.getBoundingClientRect();
      const d = dialog.getBoundingClientRect();
      for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
          const l = box.left + x * w;
          const t = box.top + y * h;
          if (l < d.right && l + w > d.left && t < d.bottom && t + h > d.top) taken.add(`${x},${y}`);
        }
      }
    }
    return taken;
  };

  // A new layout (a resize, the phone row against the column) puts every icon
  // home: its spot is whatever the grid gives it.
  let lastSize = '';
  const resizer = new ResizeObserver(() => {
    const size = `${layer.clientWidth}x${layer.clientHeight}`;
    if (size === lastSize) return;
    lastSize = size;
    spots.clear();
    for (const el of icons) el.style.transform = '';
  });
  resizer.observe(layer);
  cleanups.push(() => resizer.disconnect());

  for (const el of icons) {
    type Grab = { id: number; sx: number; sy: number; tx: number; ty: number; touch: boolean; held: boolean; hold: number; moved: boolean };
    let grab: Grab | null = null;
    let lastTap = { t: 0, x: 0, y: 0 };
    let dragged = false;

    const currentShift = () => {
      const n = natural(el);
      const s = spotOf(el);
      const { w, h } = geometry();
      return { x: s.cx * w - n.x, y: s.cy * h - n.y };
    };
    const pickUp = (g: Grab) => {
      window.clearTimeout(g.hold);
      g.held = true;
      const shift = currentShift();
      g.tx = shift.x;
      g.ty = shift.y;
      try {
        el.setPointerCapture(g.id);
      } catch {
        /* the pointer is gone */
      }
      select(el);
    };

    on(el, 'pointerdown', (event: PointerEvent) => {
      if (grab || (event.pointerType === 'mouse' && event.button !== 0)) return;
      const touch = event.pointerType === 'touch';
      const g: Grab = { id: event.pointerId, sx: event.clientX, sy: event.clientY, tx: 0, ty: 0, touch, held: false, hold: 0, moved: false };
      grab = g;
      dragged = false;
      if (touch) {
        g.hold = window.setTimeout(() => {
          if (grab === g && !g.held) pickUp(g);
        }, HOLD_MS);
      } else {
        select(el);
        pickUp(g);
      }
    });
    on(el, 'pointermove', (event: PointerEvent) => {
      if (!grab || event.pointerId !== grab.id) return;
      const dx = event.clientX - grab.sx;
      const dy = event.clientY - grab.sy;
      if (!grab.held) {
        if (Math.hypot(dx, dy) < SLOP_PX) return;
        if (Math.abs(dx) > Math.abs(dy)) pickUp(grab);
        else {
          window.clearTimeout(grab.hold);
          grab = null;
          return;
        }
      }
      if (!grab.moved && Math.hypot(dx, dy) >= SLOP_PX) {
        grab.moved = true;
        el.setAttribute('data-held', '');
      }
      // Live: the icon follows the pointer, kept inside the grid's box.
      const { w, h, cols, rows } = geometry();
      const n = natural(el);
      const x = Math.min(Math.max(grab.tx + dx, -n.x), cols * w - w - n.x);
      const y = Math.min(Math.max(grab.ty + dy, -n.y), rows * h - h - n.y);
      el.style.transform = `translate(${x}px, ${y}px)`;
    });
    const release = (event: PointerEvent) => {
      if (!grab || event.pointerId !== grab.id) return;
      window.clearTimeout(grab.hold);
      const was = grab;
      grab = null;
      el.removeAttribute('data-held');
      if (!was.held) {
        // A finger that lifted before the press timer or a drag: a tap.
        if (event.type === 'pointerup' && was.touch) {
          select(el);
          const now = performance.now();
          if (now - lastTap.t < TAP_MS && Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < TAP_PX) {
            lastTap = { t: 0, x: 0, y: 0 };
            open(el);
          } else {
            lastTap = { t: now, x: event.clientX, y: event.clientY };
          }
        }
        return;
      }
      if (was.moved) {
        dragged = true;
        const { w, h, cols, rows } = geometry();
        const n = natural(el);
        const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
        const cx = cellOf(n.x + m.e, w, cols);
        const cy = cellOf(n.y + m.f, h, rows);
        const taken = takenBy(el);
        const mine = spotOf(el);
        const occupant = icons.find((i) => i !== el && spotOf(i).cx === cx && spotOf(i).cy === cy);
        const cell = taken.has(`${cx},${cy}`) ? nearestFree(cx, cy, cols, rows, taken) : [cx, cy];
        if (occupant && (!cell || (cell[0] === mine.cx && cell[1] === mine.cy))) {
          // Dropped on an icon with nowhere else to go (the phone's full row): they trade places.
          place(occupant, mine.cx, mine.cy, true);
          place(el, cx, cy, true);
        } else if (cell) place(el, cell[0], cell[1], true);
        else place(el, mine.cx, mine.cy, true);
      } else if (was.touch && event.type === 'pointerup') {
        // A press-and-release on touch past the hold timer without moving.
        lastTap = { t: performance.now(), x: event.clientX, y: event.clientY };
      }
    };
    on(el, 'pointerup', release);
    on(el, 'pointercancel', release);
    on(el, 'lostpointercapture', (event: PointerEvent) => release(event));
    // Once a finger has the icon, the page must not scroll under it.
    on(el, 'touchmove', (event: TouchEvent) => {
      if (grab?.held && grab.touch && event.cancelable) event.preventDefault();
    }, { passive: false });

    on(el, 'focus', () => select(el));
    on(el, 'click', (event: MouseEvent) => {
      // The click that ends a drag is not a selection of anything new.
      if (dragged) {
        dragged = false;
        event.preventDefault();
        return;
      }
      select(el);
    });
    on(el, 'dblclick', () => open(el));
    on(el, 'keydown', (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || event.repeat) return;
      event.preventDefault();
      open(el);
    });
  }

  // ---- the touch beat -------------------------------------------------------
  const abort = new AbortController();
  let beatTimer = 0;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    scheduleBeat(
      'vaporwave:icons',
      icons,
      (target) => {
        const icon = target as HTMLElement;
        select(icon);
        beatTimer = window.setTimeout(() => {
          beatTimer = 0;
          if (selected === icon) select(null);
        }, BEAT_SELECT_MS);
      },
      abort.signal,
      () => !selected && !saverOpen && !waitTimer && !layer.querySelector('[data-held]') && Array.from(wins.values()).every((w) => w.hidden),
    );
  }

  return () => {
    abort.abort();
    window.clearTimeout(beatTimer);
    stopWait();
    endSaver(false);
    for (const win of Array.from(wins.values())) closeWindow(win, false);
    for (const fn of cleanups) fn();
    root.classList.remove('vw-wait');
    for (const el of icons) {
      el.style.transform = '';
      el.removeAttribute('data-held');
      el.removeAttribute('data-selected');
    }
  };
}
