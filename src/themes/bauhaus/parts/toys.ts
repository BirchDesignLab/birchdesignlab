/**
 * The four toys below the fold (Stage 6 w3 task 20, B3 a to d). Every one is
 * the school's own motion: straight lines, hard stops on --ease-snap, no
 * overshoot, no wobble. Memory only; each init returns a cleanup that removes
 * its listeners and timers and puts the shapes back, so an in-school swap
 * leaves nothing behind and the page that comes back mounts one instance.
 *
 *   initSeesaw      Home closer. A real button. Tipping toward an end turns the
 *                   beam 8 degrees about the fulcrum, the shape on the high end
 *                   slides down the beam to the low end, and the beam levels.
 *                   A click (mouse, finger) tips toward the end it landed on; a
 *                   key press (Enter, Space) tips toward the end it did not
 *                   tip to last, so the keys alternate.
 *   initLetterB     About. A real button. The B's pieces fly apart along
 *                   straight lines, hold, then re-assemble in the stepped
 *                   order. A second tap while it is apart rebuilds at once.
 *   initCornerSpin  Footer. Inert (the svg is aria-hidden and no control sits
 *                   on it): a tap on the red square turns it 90 degrees. The
 *                   square lies under the footer's own grid, so the hit is
 *                   tested against its geometry, never against the element.
 *   initNumerals    Home doors and Services (constructed numerals). Inert. A
 *                   tap knocks the numeral's parts out and builds it again
 *                   with the assembly animation it first came in with.
 *
 * Touch: nothing here sets touch-action or calls preventDefault, so a vertical
 * swipe that starts on a toy scrolls the page. A tap is a press and release
 * within 8px (a swipe ends in pointercancel, a button's click never fires).
 */

const SNAP = 'cubic-bezier(0.7, 0, 0.2, 1)';
const SLOP_PX = 8;

/* ---------- shared ---------- */

/**
 * True while a CSS animation under `el` (the assembly) is still to finish,
 * or parked below the fold. A toy's own script animations and transitions are
 * not the build, so a tap during a toy's own motion is still a tap.
 */
function building(el: Element): boolean {
  try {
    return el
      .getAnimations({ subtree: true })
      .some((a) => typeof CSSAnimation !== 'undefined' && a instanceof CSSAnimation && a.playState !== 'finished' && a.playState !== 'idle');
  } catch {
    return false;
  }
}

/**
 * A tap (press and release within SLOP_PX, same pointer, mouse left button
 * only), reported at the release. `hit` says whether a point is on the toy.
 * A finger that starts to scroll gets pointercancel, which drops the tap.
 */
function onTap(
  root: Document | Element,
  hit: (e: PointerEvent) => unknown,
  fire: (e: PointerEvent, token: unknown) => void,
  signal: AbortSignal,
): void {
  let down: { id: number; x: number; y: number; token: unknown } | null = null;
  const opts = { signal };
  root.addEventListener(
    'pointerdown',
    (e) => {
      const p = e as PointerEvent;
      if (p.pointerType === 'mouse' && p.button !== 0) return;
      const token = hit(p);
      down = token ? { id: p.pointerId, x: p.clientX, y: p.clientY, token } : null;
    },
    opts,
  );
  root.addEventListener(
    'pointermove',
    (e) => {
      const p = e as PointerEvent;
      if (down && p.pointerId === down.id && Math.hypot(p.clientX - down.x, p.clientY - down.y) > SLOP_PX) down = null;
    },
    opts,
  );
  root.addEventListener(
    'pointerup',
    (e) => {
      const p = e as PointerEvent;
      const d = down;
      down = null;
      if (!d || p.pointerId !== d.id) return;
      if (Math.hypot(p.clientX - d.x, p.clientY - d.y) > SLOP_PX) return;
      const token = hit(p);
      if (token && token === d.token) fire(p, token);
    },
    opts,
  );
  root.addEventListener('pointercancel', () => { down = null; }, opts);
}

/** The current value of a CSS rotate / translate property, as a string a keyframe accepts. */
function current(el: Element, prop: 'rotate' | 'translate'): string {
  const v = getComputedStyle(el)[prop];
  return !v || v === 'none' ? (prop === 'rotate' ? '0deg' : '0px 0px') : v;
}

/* ---------- the see-saw (B3 a) ---------- */

const TIP_DEG = 8;
/** The gap between the two shapes at rest: circle's right edge 128, square's left edge 286 (viewBox units). */
const SLIDE = 158;
/** The tip: the beam is over in TIP_MS, the shape slides for SLIDE_MS, the whole thing holds, then levels. */
const TIP_MS = 140;
const SLIDE_MS = 300;
const HOLD_MS = 200;
const LEVEL_MS = 240;
/** The slide starts this long after the tap; after a re-aim it waits for the other shape to come home first. */
const SLIDE_AT_MS = 100;
const SLIDE_AT_REAIM_MS = 320;

export function initSeesaw(btn: HTMLElement | null): (() => void) | void {
  if (!btn) return;
  const svg = btn.querySelector('svg');
  const beam = svg?.querySelector<SVGElement>('.beam');
  const seats = {
    left: svg?.querySelector<SVGElement>('[data-seat="left"]'),
    right: svg?.querySelector<SVGElement>('[data-seat="right"]'),
  };
  if (!svg || !beam || !seats.left || !seats.right) return;
  const abort = new AbortController();
  let anims: Animation[] = [];
  /** The end the last tip went to; the first key press tips left, toward the circle. */
  let last: 'left' | 'right' = 'right';

  /** Keyframes from (time, value) stops; every segment eases on the snap curve, so a stop is a hard stop. */
  function frames(prop: 'rotate' | 'translate', stops: Array<[number, string]>, total: number): Keyframe[] {
    return stops.map(([ms, value], i) => ({ [prop]: value, offset: ms / total, easing: i < stops.length - 1 ? SNAP : 'linear' }));
  }

  function tip(side: 'left' | 'right'): void {
    const from = { beam: current(beam!, 'rotate'), left: current(seats.left!, 'translate'), right: current(seats.right!, 'translate') };
    for (const a of anims) a.cancel();
    // Left tips the beam counterclockwise (negative), right clockwise. The shape on the high end
    // slides down the beam to the low end, in the beam's own frame, so it is a plain translate.
    const deg = side === 'left' ? -TIP_DEG : TIP_DEG;
    const slider = side === 'left' ? 'right' : 'left';
    const other = slider === 'right' ? 'left' : 'right';
    const target = slider === 'right' ? -SLIDE : SLIDE;
    // Re-aimed mid-motion: the shape that was sliding the other way goes home first, so two never pass through each other.
    const displaced = Math.abs(parseFloat(from[other])) > 1;
    const at = displaced ? SLIDE_AT_REAIM_MS : SLIDE_AT_MS;
    const holdAt = at + SLIDE_MS + HOLD_MS;
    const total = holdAt + LEVEL_MS + 40;
    const opts = { duration: total };
    anims = [
      beam!.animate(
        frames('rotate', [[0, from.beam], [TIP_MS, `${deg}deg`], [holdAt - 40, `${deg}deg`], [holdAt - 40 + LEVEL_MS, '0deg'], [total, '0deg']], total),
        opts,
      ),
      seats[slider]!.animate(
        frames('translate', [[0, from[slider]], [at, from[slider]], [at + SLIDE_MS, `${target}px 0px`], [holdAt - 40, `${target}px 0px`], [holdAt - 40 + LEVEL_MS, '0px 0px'], [total, '0px 0px']], total),
        opts,
      ),
      // The other shape stays on its end of the beam; if a re-aim found it away from home it returns.
      seats[other]!.animate(frames('translate', [[0, from[other]], [SLIDE_MS, '0px 0px'], [total, '0px 0px']], total), opts),
    ];
    last = side;
  }

  btn.addEventListener(
    'click',
    (e) => {
      if (building(svg)) return;
      let side: 'left' | 'right';
      if (e.detail === 0) {
        // A key (or assistive technology): there is no point, so the ends alternate.
        side = last === 'left' ? 'right' : 'left';
      } else {
        const r = svg.getBoundingClientRect();
        side = e.clientX < r.left + r.width / 2 ? 'left' : 'right';
      }
      tip(side);
    },
    { signal: abort.signal },
  );

  return () => {
    abort.abort();
    for (const a of anims) a.cancel();
    anims = [];
  };
}

/* ---------- the letter B (B3 b) ---------- */

/** Where each piece goes when the B comes apart (viewBox units): stem, red bowl, blue bowl, yellow triangle. */
const B_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [-56, 36],
  [0, -48],
  [24, 50],
  [26, -52],
];
const B_OUT_MS = 340;
const B_HOLD_MS = 1000;
const B_IN_MS = 340;
/** The stepped order of the build: one piece after another, as the poster first assembled. */
const B_STEP_MS = 140;

export function initLetterB(btn: HTMLElement | null): (() => void) | void {
  if (!btn) return;
  const svg = btn.querySelector('svg');
  const pieces = [...(svg?.querySelectorAll<SVGElement>('.asm') ?? [])];
  if (!svg || pieces.length !== B_OFFSETS.length) return;
  const abort = new AbortController();
  /** apart: flying out or held. in: flying back. rest: whole. */
  let state: 'rest' | 'apart' | 'in' = 'rest';
  let timer = 0;

  function reset(): void {
    window.clearTimeout(timer);
    state = 'rest';
    svg!.classList.remove('is-apart');
    for (const el of pieces) { el.style.transition = ''; el.style.translate = ''; }
  }

  function rebuild(): void {
    window.clearTimeout(timer);
    state = 'in';
    pieces.forEach((el, i) => {
      el.style.transition = `translate ${B_IN_MS}ms ${SNAP} ${i * B_STEP_MS}ms`;
      el.style.translate = '0px 0px';
    });
    timer = window.setTimeout(reset, B_IN_MS + (pieces.length - 1) * B_STEP_MS + 60);
  }

  function breakApart(): void {
    window.clearTimeout(timer);
    state = 'apart';
    svg!.classList.add('is-apart');
    pieces.forEach((el, i) => {
      el.style.transition = `translate ${B_OUT_MS}ms ${SNAP}`;
      el.style.translate = `${B_OFFSETS[i][0]}px ${B_OFFSETS[i][1]}px`;
    });
    timer = window.setTimeout(rebuild, B_OUT_MS + B_HOLD_MS);
  }

  btn.addEventListener(
    'click',
    () => {
      if (building(svg)) return;
      // Apart (flying out or held): rebuild at once. Whole, or already coming back: come apart.
      if (state === 'apart') rebuild();
      else breakApart();
    },
    { signal: abort.signal },
  );

  return () => {
    abort.abort();
    reset();
  };
}

/* ---------- the footer's red corner square (B3 c) ---------- */

const CORNER_MS = 320;
/** The red square inside the corner's 240 x 150 viewBox. */
const SQUARE = { x0: 30, x1: 140, y0: 0, y1: 110, w: 240 };

export function initCornerSpin(footer: HTMLElement | null): (() => void) | void {
  const corner = footer?.querySelector<SVGSVGElement>('svg.corner');
  const square = corner?.querySelector<SVGElement>('[data-spin]');
  if (!footer || !corner || !square) return;
  const abort = new AbortController();
  let turns = 0;

  // On the square's geometry, not the element: the footer's grid lies over the corner.
  // A link or button on top of it keeps its own tap.
  const hit = (e: PointerEvent): boolean => {
    if (e.target instanceof Element && e.target.closest('a, button')) return false;
    const r = corner.getBoundingClientRect();
    if (r.width === 0) return false;
    const k = r.width / SQUARE.w;
    const x = (e.clientX - r.left) / k;
    const y = (e.clientY - r.top) / k;
    return x >= SQUARE.x0 && x <= SQUARE.x1 && y >= SQUARE.y0 && y <= SQUARE.y1;
  };
  onTap(
    footer,
    hit,
    () => {
      if (building(corner)) return;
      turns += 1;
      square.style.transition = `rotate ${CORNER_MS}ms ${SNAP}`;
      square.style.rotate = `${turns * 90}deg`;
    },
    abort.signal,
  );

  return () => {
    abort.abort();
    square.style.transition = '';
    square.style.rotate = '';
  };
}

/* ---------- the constructed numerals (B3 d) ---------- */

/**
 * `page` is a landmark only this page has (Home's doors, Services' process).
 * Both pages mount this on the whole document, and the router runs each page's
 * astro:page-load handler on the other page's body too, so without the guard a
 * swap mounts a second instance. The taps are heard on the document; the guard
 * only decides whether this page's mount belongs to the body that is showing.
 */
export function initNumerals(page: Element | null, root: Document | Element = document): (() => void) | void {
  if (!page || !root.querySelector('.num')) return;
  const abort = new AbortController();
  onTap(
    root,
    (e) => (e.target instanceof Element ? e.target.closest('.num') : null),
    (_e, num) => {
      let parts: Animation[] = [];
      try {
        parts = (num as Element).getAnimations({ subtree: true }).filter((a) => typeof CSSAnimation !== 'undefined' && a instanceof CSSAnimation);
      } catch { /* none */ }
      // Parked below the fold (not yet revealed): it has not been built, so there is nothing to knock out.
      if (parts.length === 0 || parts.some((a) => a.playState === 'paused')) return;
      // Back to the first frame, delays and all: every part is out at once, then they build in the stepped order.
      for (const a of parts) {
        a.currentTime = 0;
        a.play();
      }
    },
    abort.signal,
  );
  return () => abort.abort();
}
