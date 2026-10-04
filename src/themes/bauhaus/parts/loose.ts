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
 * build order on load stays protected. Vertical swipes on a phone still
 * scroll the page unless the touch starts on a shape (theme.css sets
 * touch-action: none on .loose only).
 */

const FALL_MS = 360;
const KEY_STEP = 24;

function pixelsToUnits(svg: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } | null {
  const m = svg.getScreenCTM();
  if (!m) return null;
  const p = new DOMPoint(clientX, clientY).matrixTransform(m.inverse());
  return { x: p.x, y: p.y };
}

/** True while any build animation under the shape is still to finish (or parked below the fold). */
function stillBuilding(el: Element): boolean {
  try {
    return el.getAnimations({ subtree: true }).some((a) => a.playState !== 'finished' && a.playState !== 'idle');
  } catch {
    return false;
  }
}

export function initLoose(svg: SVGSVGElement | null): (() => void) | void {
  if (!svg) return;
  const root = svg;
  const shapes = [...root.querySelectorAll<SVGElement>('[data-loose]')];
  if (shapes.length === 0) return;
  const abort = new AbortController();
  const opts = { signal: abort.signal };
  const timers = new Map<SVGElement, number>();

  function carry(el: SVGElement, x: number, y: number): void {
    window.clearTimeout(timers.get(el));
    el.style.transition = 'none';
    el.style.translate = `${x}px ${y}px`;
    el.setAttribute('data-held', '');
    root.classList.add('is-carrying');
  }

  function drop(el: SVGElement): void {
    if (!el.hasAttribute('data-held')) return;
    el.removeAttribute('data-held');
    el.style.transition = `translate ${FALL_MS}ms var(--ease-snap, cubic-bezier(0.7, 0, 0.2, 1))`;
    el.style.translate = '0px 0px';
    timers.set(
      el,
      window.setTimeout(() => {
        el.style.transition = '';
        el.style.translate = '';
        if (!root.querySelector('[data-held]')) root.classList.remove('is-carrying');
      }, FALL_MS + 60),
    );
  }

  for (const el of shapes) {
    let grab: { id: number; sx: number; sy: number } | null = null;
    let kx = 0;
    let ky = 0;

    el.addEventListener(
      'pointerdown',
      (e) => {
        if (grab || (e.pointerType === 'mouse' && e.button !== 0) || stillBuilding(el)) return;
        const at = pixelsToUnits(root, e.clientX, e.clientY);
        if (!at) return;
        grab = { id: e.pointerId, sx: at.x, sy: at.y };
        try { el.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
        e.preventDefault();
        carry(el, 0, 0);
      },
      opts,
    );
    el.addEventListener(
      'pointermove',
      (e) => {
        if (!grab || e.pointerId !== grab.id) return;
        const at = pixelsToUnits(root, e.clientX, e.clientY);
        if (at) carry(el, at.x - grab.sx, at.y - grab.sy);
      },
      opts,
    );
    const release = (e: PointerEvent) => {
      if (!grab || e.pointerId !== grab.id) return;
      grab = null;
      drop(el);
    };
    el.addEventListener('pointerup', release, opts);
    el.addEventListener('pointercancel', release, opts);
    el.addEventListener('lostpointercapture', release, opts);
    // A finger that lands on a shape is the shape's, not the page's.
    el.addEventListener('touchstart', (e) => { if (e.cancelable) e.preventDefault(); }, { ...opts, passive: false });

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
          if (stillBuilding(el)) return;
          e.preventDefault();
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

  return () => {
    abort.abort();
    for (const t of timers.values()) window.clearTimeout(t);
  };
}
