/**
 * Loose shapes (Stage 4 B2 task 4, the interactable answer): the Home hero's
 * circle, square and triangle and Sent's trio can be picked up and dragged,
 * and on release fall back to their marks. The landing is the school's own
 * snap curve, so it is mechanical: no spring, no overshoot.
 *
 * Each shape is a real control (role="button", tabindex="0", aria-label in
 * the markup). Pointer: press to pick up, move, release. Keyboard: an arrow
 * key picks it up and nudges it, Enter or Space or Escape (or leaving it)
 * lets it fall back. The shape moves with the CSS `translate` property in
 * SVG user units, which never fights the assembly animation's `transform`.
 *
 * A shape cannot be picked up while the poster is still being built: the
 * build order on load stays protected.
 *
 * Findable (Stage 6 w2 task 12, B2 and B5):
 *   - Once, about half a second after the last shape has landed, the shape
 *     marked data-pick-me lifts 12px and drops on the snap curve, no
 *     overshoot. The svg's data-beat names the page; each page gets it once
 *     per visit, held in memory only, so an in-school return does not repeat
 *     it. Touch gets this beat and nothing else.
 *   - A real hover pointer lifts the shape 4px (up and left) over a hard 4px
 *     block of ink (the shape's own silhouette left where it was), on hover
 *     and on press. A finger gets neither.
 *   - A finger on a shape still scrolls the page: touch-action is pan-y, a
 *     shape picks up after a 200 ms press or a mostly horizontal move over
 *     8px, and a vertical swipe that starts on a shape scrolls.
 */

import { scheduleBeat, spendBeat } from './beat';

const FALL_MS = 360;
const KEY_STEP = 24;
const SNAP = 'cubic-bezier(0.7, 0, 0.2, 1)';
const BEAT_PX = 12;
const BEAT_MS = 440;
const LIFT_PX = 4;
const HOLD_MS = 200;
const SLOP_PX = 8;

function pixelsToUnits(svg: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } | null {
  const m = svg.getScreenCTM();
  if (!m) return null;
  const p = new DOMPoint(clientX, clientY).matrixTransform(m.inverse());
  return { x: p.x, y: p.y };
}

/** SVG user units in one screen pixel. */
function unitsPerPixel(svg: SVGSVGElement): number {
  const m = svg.getScreenCTM();
  return m && m.a > 0 ? 1 / m.a : 1;
}

/**
 * True while any build animation under the shape is still to finish (or
 * parked below the fold). The pick-me beat (`skip`) is not building: a
 * press, touch, hover or arrow key during it cancels it and takes the shape.
 * Nor is a CSS transition (the 120 ms hover lift, the settle): a press just
 * after the pointer arrives must still pick the shape up.
 */
function stillBuilding(el: Element, skip: Animation | null = null): boolean {
  try {
    return el
      .getAnimations({ subtree: true })
      .some(
        (a) =>
          a !== skip &&
          !(typeof CSSTransition !== 'undefined' && a instanceof CSSTransition) &&
          a.playState !== 'finished' &&
          a.playState !== 'idle',
      );
  } catch {
    return false;
  }
}

/** A flat ink copy of the shape, drawn just under it: the block a lifted shape floats over. */
function makeShadow(el: SVGElement): SVGElement | null {
  const parent = el.parentNode;
  if (!parent) return null;
  const s = el.cloneNode(true) as SVGElement;
  for (const n of [s, ...s.querySelectorAll<SVGElement>('*')]) {
    for (const a of ['class', 'role', 'tabindex', 'aria-label', 'data-loose', 'data-pick-me', 'style']) n.removeAttribute(a);
    if (n.hasAttribute('fill')) n.setAttribute('fill', 'var(--mark)');
  }
  s.setAttribute('aria-hidden', 'true');
  s.setAttribute('class', 'lshadow');
  parent.insertBefore(s, el);
  return s;
}

export function initLoose(svg: SVGSVGElement | null): (() => void) | void {
  if (!svg) return;
  const root = svg;
  const shapes = [...root.querySelectorAll<SVGElement>('[data-loose]')];
  if (shapes.length === 0) return;
  const abort = new AbortController();
  const opts = { signal: abort.signal };
  const timers = new Map<SVGElement, number>();
  const shadows = new Map<SVGElement, SVGElement>();
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  let beat: Animation | null = null;
  /** Stops the pick-me beat's wait; a no-op until it is scheduled below. */
  let stopBeat: () => void = () => {};
  const page = root.getAttribute('data-beat');

  function carry(el: SVGElement, x: number, y: number): void {
    window.clearTimeout(timers.get(el));
    el.style.transition = 'none';
    el.style.translate = `${x}px ${y}px`;
    el.setAttribute('data-held', '');
    root.classList.add('is-carrying');
  }

  /** Falls back to the mark, or (lift > 0, the mouse still over it) straight to the hover lift. */
  function drop(el: SVGElement, lift = 0): void {
    if (!el.hasAttribute('data-held')) return;
    el.removeAttribute('data-held');
    el.style.transition = `translate ${FALL_MS}ms var(--ease-snap, ${SNAP})`;
    el.style.translate = `${-lift}px ${-lift}px`;
    timers.set(
      el,
      window.setTimeout(() => {
        el.style.transition = '';
        el.style.translate = '';
        if (!root.querySelector('[data-held]')) root.classList.remove('is-carrying');
      }, FALL_MS + 60),
    );
  }

  /* ---------- the hover lift (real hover pointer only) ---------- */

  function setLift(el: SVGElement, on: boolean): void {
    if (on) {
      root.style.setProperty('--lift', `${LIFT_PX * unitsPerPixel(root)}px`);
      let s = shadows.get(el);
      if (!s) {
        const made = makeShadow(el);
        if (made) { shadows.set(el, made); s = made; }
      }
      s?.setAttribute('data-on', '');
      el.setAttribute('data-lift', '');
      root.classList.add('is-lifting');
    } else {
      shadows.get(el)?.removeAttribute('data-on');
      el.removeAttribute('data-lift');
      if (!root.querySelector('[data-lift]')) root.classList.remove('is-lifting');
    }
  }

  function cancelBeat(): void {
    beat?.cancel();
    beat = null;
  }

  /** The visitor has taken a shape (pointer, hover or key): the pick-me is spent for this visit. */
  function engage(): void {
    if (page) spendBeat(`loose:${page}`);
    stopBeat();
    cancelBeat();
  }

  /** Building, not counting the pick-me beat. */
  const building = (el: SVGElement): boolean => stillBuilding(el, beat);

  for (const el of shapes) {
    type Grab = { id: number; sx: number; sy: number; touch: boolean; held: boolean; px: number; py: number; hold: number };
    let grab: Grab | null = null;
    let kx = 0;
    let ky = 0;

    /** The shape is the visitor's from here: it follows the pointer. */
    const pickUp = (g: Grab): void => {
      window.clearTimeout(g.hold);
      g.held = true;
      engage();
      try { el.setPointerCapture(g.id); } catch { /* not capturable */ }
      // A mouse press lifts the shape 4px; a finger does not.
      const u = g.touch ? 0 : LIFT_PX * unitsPerPixel(root);
      carry(el, -u, -u);
    };

    el.addEventListener(
      'pointerenter',
      (e) => {
        if (e.pointerType !== 'mouse' || !fine.matches || el.hasAttribute('data-held') || building(el)) return;
        engage();
        setLift(el, true);
      },
      opts,
    );
    el.addEventListener('pointerleave', () => { if (!el.hasAttribute('data-held')) setLift(el, false); }, opts);

    el.addEventListener(
      'pointerdown',
      (e) => {
        if (grab || (e.pointerType === 'mouse' && e.button !== 0) || building(el)) return;
        const at = pixelsToUnits(root, e.clientX, e.clientY);
        if (!at) return;
        engage();
        const touch = e.pointerType === 'touch';
        const g: Grab = { id: e.pointerId, sx: at.x, sy: at.y, touch, held: false, px: e.clientX, py: e.clientY, hold: 0 };
        grab = g;
        if (touch) {
          // A finger: pick up after a 200 ms press, or on a mostly horizontal
          // move (below). A vertical swipe is the page's and scrolls it.
          g.hold = window.setTimeout(() => { if (grab === g && !g.held) pickUp(g); }, HOLD_MS);
        } else {
          e.preventDefault();
          if (fine.matches) setLift(el, true);
          pickUp(g);
        }
      },
      opts,
    );
    el.addEventListener(
      'pointermove',
      (e) => {
        if (!grab || e.pointerId !== grab.id) return;
        if (!grab.held) {
          const dx = e.clientX - grab.px;
          const dy = e.clientY - grab.py;
          if (Math.hypot(dx, dy) < SLOP_PX) return;
          if (Math.abs(dx) > Math.abs(dy)) pickUp(grab);
          else { window.clearTimeout(grab.hold); grab = null; return; }
        }
        const at = pixelsToUnits(root, e.clientX, e.clientY);
        if (!at) return;
        const u = grab.touch ? 0 : LIFT_PX * unitsPerPixel(root);
        const x = at.x - grab.sx - u;
        const y = at.y - grab.sy - u;
        carry(el, x, y);
        // The ink block belongs to the shape at rest: once it is carried off, it goes.
        if (Math.hypot(at.x - grab.sx, at.y - grab.sy) > 3 * u) shadows.get(el)?.removeAttribute('data-on');
      },
      opts,
    );
    const release = (e: PointerEvent) => {
      if (!grab || e.pointerId !== grab.id) return;
      window.clearTimeout(grab.hold);
      const was = grab;
      grab = null;
      if (!was.held) return;
      // Let go with the mouse still over it: it settles straight into the
      // hover lift, one motion, not down to the mark and back up.
      const over = !was.touch && fine.matches && el.matches(':hover');
      drop(el, over ? LIFT_PX * unitsPerPixel(root) : 0);
      setLift(el, over);
    };
    el.addEventListener('pointerup', release, opts);
    el.addEventListener('pointercancel', release, opts);
    // A shape that is a group takes its children's events: the implicit capture a finger has on the
    // child ends when the group captures it, and that must not read as a release.
    el.addEventListener('lostpointercapture', (e) => { if (e.target === el) release(e); }, opts);
    // Once a finger has the shape, the page must not scroll under it.
    el.addEventListener('touchmove', (e) => { if (grab?.held && grab.touch && e.cancelable) e.preventDefault(); }, { ...opts, passive: false });

    el.addEventListener(
      'keydown',
      (e) => {
        const step: Record<string, [number, number]> = {
          ArrowLeft: [-KEY_STEP, 0],
          ArrowRight: [KEY_STEP, 0],
          ArrowUp: [0, -KEY_STEP],
          ArrowDown: [0, KEY_STEP],
        };
        const move = step[e.key];
        if (move) {
          if (building(el)) return;
          e.preventDefault();
          engage();
          setLift(el, false);
          if (!el.hasAttribute('data-held')) { kx = 0; ky = 0; }
          kx += move[0];
          ky += move[1];
          carry(el, kx, ky);
        } else if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
          e.preventDefault();
          drop(el);
        }
      },
      opts,
    );
    el.addEventListener('blur', () => { if (!grab) drop(el); }, opts);
  }

  /* ---------- the one-time "pick me" beat ---------- */

  // On the touch beat's common conditions (beat.ts): the shape is at least 60% on screen, the page has
  // been still 400 ms, no form field has focus, and the build has landed. Once per page visit.
  const star = root.querySelector<SVGElement>('[data-pick-me]');
  if (page && star) {
    stopBeat = scheduleBeat(
      `loose:${page}`,
      [star],
      () => {
        const lift = BEAT_PX * unitsPerPixel(root);
        beat = star.animate(
          [
            { translate: '0px 0px', easing: SNAP },
            { translate: `0px ${-lift}px`, offset: 0.45, easing: SNAP },
            { translate: '0px 0px' },
          ],
          { duration: BEAT_MS },
        );
      },
      abort.signal,
      () => !stillBuilding(root) && !root.querySelector('[data-held], [data-lift]'),
    );
  }

  return () => {
    stopBeat();
    abort.abort();
    cancelBeat();
    for (const t of timers.values()) window.clearTimeout(t);
    for (const s of shadows.values()) s.remove();
    root.classList.remove('is-lifting');
  };
}
