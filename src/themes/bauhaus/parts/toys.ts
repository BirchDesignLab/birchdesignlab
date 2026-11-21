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

import { scheduleBeat, spendBeat } from './beat';

const SNAP = 'cubic-bezier(0.7, 0, 0.2, 1)';
const SLOP_PX = 8;

/**
 * The touch beats are for a finger: a mouse has the cursor and the hover, and
 * says "touch me" in its own way. (The hero's pick-me, in loose.ts, predates
 * this and stays for every pointer.)
 */
const mouseHere = (): boolean => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

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
  /** True when that last tip came from a pointer: the next key press tips the same end, then the keys alternate (20/C2). */
  let lastFromPointer = false;

  /** Keyframes from (time, value) stops; every segment eases on the snap curve, so a stop is a hard stop. */
  function frames(prop: 'rotate' | 'translate', stops: Array<[number, string]>, total: number): Keyframe[] {
    return stops.map(([ms, value], i) => ({ [prop]: value, offset: ms / total, easing: i < stops.length - 1 ? SNAP : 'linear' }));
  }

  /** `k` scales the tip (the touch beat is a half-size tip that does not count as the last one). */
  function tip(side: 'left' | 'right', k = 1): void {
    const from ={ beam: current(beam!, 'rotate'), left: current(seats.left!, 'translate'), right: current(seats.right!, 'translate') };
    for (const a of anims) a.cancel();
    // Left tips the beam counterclockwise (negative), right clockwise. The shape on the high end
    // slides down the beam to the low end, in the beam's own frame, so it is a plain translate.
    const deg = (side === 'left' ? -TIP_DEG : TIP_DEG) * k;
    const slider = side === 'left' ? 'right' : 'left';
    const other = slider === 'right' ? 'left' : 'right';
    const target = (slider === 'right' ? -SLIDE : SLIDE) * k;
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
  }

  btn.addEventListener(
    'click',
    (e) => {
      if (building(svg)) return;
      let side: 'left' | 'right';
      if (e.detail === 0) {
        // A key (or assistive technology): there is no point. Right after a pointer tip it tips that
        // same end (the pointer chose it); from then on the ends alternate.
        side = lastFromPointer ? last : last === 'left' ? 'right' : 'left';
        lastFromPointer = false;
      } else {
        const r = svg.getBoundingClientRect();
        side = e.clientX < r.left + r.width / 2 ? 'left' : 'right';
        lastFromPointer = true;
      }
      last = side;
      tip(side);
    },
    { signal: abort.signal },
  );

  // The touch beat: a half-size tip toward the right end (the square slides to the circle), then level.
  // It leaves `last` alone, so the first key press still tips left.
  const stopBeat = mouseHere()
    ? () => {}
    : scheduleBeat('see-saw', [btn], () => tip('right', 0.5), abort.signal, () => !building(svg) && anims.every((a) => a.playState !== 'running'));

  return () => {
    stopBeat();
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

  function rebuild(inMs = B_IN_MS, step = B_STEP_MS): void {
    window.clearTimeout(timer);
    state = 'in';
    pieces.forEach((el, i) => {
      el.style.transition = `translate ${inMs}ms ${SNAP} ${i * step}ms`;
      el.style.translate = '0px 0px';
    });
    timer = window.setTimeout(reset, inMs + (pieces.length - 1) * step + 60);
  }

  /** `k` scales how far the pieces go and every duration with it: the touch beat is a quarter-size breath. */
  function breakApart(k = 1): void {
    window.clearTimeout(timer);
    state = 'apart';
    svg!.classList.add('is-apart');
    const outMs = B_OUT_MS * Math.max(k, 0.6);
    pieces.forEach((el, i) => {
      el.style.transition = `translate ${outMs}ms ${SNAP}`;
      el.style.translate = `${B_OFFSETS[i][0] * k}px ${B_OFFSETS[i][1] * k}px`;
    });
    // A tap during the beat (state 'apart') rebuilds at full pace, like any other tap.
    timer = window.setTimeout(
      k === 1 ? () => rebuild() : () => rebuild(B_IN_MS * 0.6, B_STEP_MS * 0.6),
      outMs + (k === 1 ? B_HOLD_MS : 160),
    );
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

  // The touch beat: the pieces step out a quarter of the way, hold, and come home in the stepped order.
  const stopBeat = mouseHere()
    ? () => {}
    : scheduleBeat('letter-b', [btn], () => breakApart(0.25), abort.signal, () => !building(svg) && state === 'rest');

  return () => {
    stopBeat();
    abort.abort();
    reset();
  };
}

/* ---------- the footer's red corner square (B3 c) ---------- */

const CORNER_MS = 320;
/** The red square inside the corner's 240 x 150 viewBox. */
const SQUARE = { x0: 30, x1: 140, y0: 0, y1: 110, w: 240 };
/** The touch beat: the square steps this far round and straight back. */
const CORNER_BEAT_DEG = 18;
const CORNER_BEAT_MS = 180;

export function initCornerSpin(footer: HTMLElement | null): (() => void) | void {
  const corner = footer?.querySelector<SVGSVGElement>('svg.corner');
  const square = corner?.querySelector<SVGElement>('[data-spin]');
  if (!footer || !corner || !square) return;
  const abort = new AbortController();
  let turns = 0;
  let beatTimer = 0;

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

  // The mouse's half of the signifier: the pointer cursor over the square only (the footer carries
  // the attribute because the grid lies over the svg), and the lift in the theme's gated rule.
  const setHot = (on: boolean): void => {
    footer.toggleAttribute('data-corner-hot', on);
    corner.toggleAttribute('data-hot', on);
  };
  const opts = { signal: abort.signal };
  footer.addEventListener('pointermove', (e) => setHot(e.pointerType === 'mouse' && mouseHere() && hit(e)), opts);
  footer.addEventListener('pointerleave', () => setHot(false), opts);

  onTap(
    footer,
    hit,
    () => {
      if (building(corner)) return;
      window.clearTimeout(beatTimer);
      turns += 1;
      square.style.transition = `rotate ${CORNER_MS}ms ${SNAP}`;
      square.style.rotate = `${turns * 90}deg`;
    },
    abort.signal,
  );

  // The touch beat: a short step round, a hard stop, and back.
  const stopBeat = mouseHere()
    ? () => {}
    : scheduleBeat(
        'footer-corner',
        [corner],
        () => {
          const home = `${turns * 90}deg`;
          square.style.transition = `rotate ${CORNER_BEAT_MS}ms ${SNAP}`;
          square.style.rotate = `${turns * 90 + CORNER_BEAT_DEG}deg`;
          beatTimer = window.setTimeout(() => {
            square.style.rotate = home;
            beatTimer = window.setTimeout(() => {
              if (turns === 0) { square.style.transition = ''; square.style.rotate = ''; }
            }, CORNER_BEAT_MS + 60);
          }, CORNER_BEAT_MS + 140);
        },
        abort.signal,
        () => !building(corner),
      );
  // A press on the square spends the beat (the svg is under the grid, so it never hears the press itself).
  footer.addEventListener('pointerdown', (e) => { if (hit(e)) { spendBeat('footer-corner'); stopBeat(); } }, { ...opts, capture: true });

  return () => {
    stopBeat();
    window.clearTimeout(beatTimer);
    abort.abort();
    setHot(false);
    square.style.transition = '';
    square.style.rotate = '';
  };
}

/* ---------- the constructed numerals (B3 d) ---------- */

/** Knocks a numeral's parts out and builds it again, in the stepped order it first came in with. False when there is nothing to knock (parked below the fold, or not built). */
function knock(num: Element): boolean {
  let parts: Animation[] = [];
  try {
    parts = num.getAnimations({ subtree: true }).filter((a) => typeof CSSAnimation !== 'undefined' && a instanceof CSSAnimation);
  } catch { /* none */ }
  // Parked below the fold (not yet revealed): it has not been built, so there is nothing to knock out.
  if (parts.length === 0 || parts.some((a) => a.playState === 'paused')) return false;
  // Back to the first frame, delays and all: every part is out at once, then they build in the stepped order.
  for (const a of parts) {
    a.currentTime = 0;
    a.play();
  }
  return true;
}

/** True once a numeral's own build has finished (the beat waits for it). */
function built(num: Element): boolean {
  try {
    const parts = num.getAnimations({ subtree: true }).filter((a) => typeof CSSAnimation !== 'undefined' && a instanceof CSSAnimation);
    return parts.length > 0 && parts.every((a) => a.playState === 'finished');
  } catch {
    return false;
  }
}

/**
 * `page` is a landmark only this page has (Home's doors, Services' process).
 * Both pages mount this, and the router runs each page's astro:page-load
 * handler on the other page's body too, so without the guards a swap mounts a
 * second instance: this one acts only while the theme is bauhaus (20/C1), and
 * hears taps on its own page's `main`, not on the whole document.
 */
export function initNumerals(page: Element | null, root: Element | null = document.querySelector('main')): (() => void) | void {
  if (document.documentElement.getAttribute('data-theme') !== 'bauhaus') return;
  if (!page || !root || !root.querySelector('.num')) return;
  const abort = new AbortController();
  onTap(
    root,
    (e) => (e.target instanceof Element ? e.target.closest('.num') : null),
    (_e, num) => { knock(num as Element); },
    abort.signal,
  );
  // The touch beat: the first numeral in view builds itself again, once.
  const stopBeat = mouseHere()
    ? () => {}
    : scheduleBeat(
        `numerals:${page.className || 'page'}`,
        [...root.querySelectorAll('.num')],
        (num) => { knock(num); },
        abort.signal,
        built,
      );
  return () => {
    stopBeat();
    abort.abort();
  };
}
