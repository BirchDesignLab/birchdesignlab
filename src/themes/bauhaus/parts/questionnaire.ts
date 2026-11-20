/**
 * Bauhaus questionnaire card (Stage 6 w1 task 5). Give a triangle, a square
 * and a circle one colour each; the printed key (Kandinsky's answer, c. 1923)
 * then shows how close the visitor came. Memory only: nothing is stored.
 *
 * Operating it:
 *   pointer / touch  tap a shape then a colour (or a colour then a shape), or
 *                    drag a colour bar onto a shape; a miss snaps back
 *   keyboard         Tab: shapes, colours, show, again; arrows move inside a
 *                    row (roving tabindex); Enter or Space picks; Escape
 *                    clears the pick
 *
 * A colour fits one shape: giving a colour that is already used swaps the two.
 * The reveal comes 400 ms after the third fill, or at once on "show the
 * answer". The rules (applyFill, agreeCount) are pure so tests can read them
 * without a DOM. Touch: touch-action is none on the colour bars only (theme
 * CSS in Questionnaire.astro), so a vertical swipe anywhere else scrolls.
 */

export type Shape = 'triangle' | 'square' | 'circle';
export type Colour = 'yellow' | 'red' | 'blue';
export type Fills = Record<Shape, Colour | null>;

export const SHAPES: readonly Shape[] = ['triangle', 'square', 'circle'];
export const COLOURS: readonly Colour[] = ['yellow', 'red', 'blue'];
/** The 1923 result: triangle yellow, square red, circle blue. */
export const ANSWER: Readonly<Record<Shape, Colour>> = { triangle: 'yellow', square: 'red', circle: 'blue' };

export const REVEAL_DELAY_MS = 400;
const WIPE_MS = 240;
const FALL_MS = 360;
const DRAG_PX = 6;
const SNAP = 'cubic-bezier(0.7, 0, 0.2, 1)';

export const emptyFills = (): Fills => ({ triangle: null, square: null, circle: null });

/** Give `shape` the colour. A colour already on another shape swaps: that shape takes this one's old colour (or none). */
export function applyFill(fills: Fills, shape: Shape, colour: Colour): { fills: Fills; swapped: Shape | null } {
  const next: Fills = { ...fills };
  const other = SHAPES.find((s) => s !== shape && next[s] === colour) ?? null;
  const prev = next[shape];
  next[shape] = colour;
  if (other) next[other] = prev;
  return { fills: next, swapped: other };
}

export const filledCount = (fills: Fills): number => SHAPES.filter((s) => fills[s]).length;
export const agreeCount = (fills: Fills): number => SHAPES.filter((s) => fills[s] === ANSWER[s]).length;

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const stateLabel = (shape: Shape, fill: Colour | null): string => `${cap(shape)}, ${fill ?? 'no colour yet'}`;
const tallyWords = (n: number): string => (n === 0 ? 'none' : `${n} of 3`);

/** The status line once the answer shows. An empty form has nothing to tally, so it carries no tally and no "none"; a filled form that matches nothing still says so. */
export function revealStatus(fills: Fills): string {
  const key = "Kandinsky's answer: yellow triangle, red square, blue circle.";
  return filledCount(fills) === 0 ? key : `${key} You agree on ${tallyWords(agreeCount(fills))}.`;
}

export function initQuestionnaire(root: HTMLElement | null): (() => void) | void {
  if (!root) return;
  const card = root;
  const abort = new AbortController();
  const opts = { signal: abort.signal };
  const timers = new Set<number>();

  const shapeRow0 = card.querySelector<HTMLElement>('[data-qshapes]');
  const colourRow0 = card.querySelector<HTMLElement>('[data-qcolours]');
  const rows0 = card.querySelector<HTMLElement>('[data-qrows]');
  const showBtn0 = card.querySelector<HTMLButtonElement>('[data-qshow]');
  const againBtn0 = card.querySelector<HTMLButtonElement>('[data-qagain]');
  const key0 = card.querySelector<HTMLElement>('[data-qkey]');
  const status0 = card.querySelector<HTMLElement>('[data-qstatus]');
  if (!shapeRow0 || !colourRow0 || !rows0 || !showBtn0 || !againBtn0 || !key0 || !status0) return;
  const shapeRow: HTMLElement = shapeRow0;
  const colourRow: HTMLElement = colourRow0;
  const rows: HTMLElement = rows0;
  const showBtn: HTMLButtonElement = showBtn0;
  const againBtn: HTMLButtonElement = againBtn0;
  const key: HTMLElement = key0;
  const status: HTMLElement = status0;

  const shapeBtns = Object.fromEntries(
    SHAPES.map((s) => [s, shapeRow.querySelector<HTMLButtonElement>(`[data-shape="${s}"]`)]),
  ) as Record<Shape, HTMLButtonElement | null>;
  const colourBtns = Object.fromEntries(
    COLOURS.map((c) => [c, colourRow.querySelector<HTMLButtonElement>(`[data-pick="${c}"]`)]),
  ) as Record<Colour, HTMLButtonElement | null>;
  if (SHAPES.some((s) => !shapeBtns[s]) || COLOURS.some((c) => !colourBtns[c])) return;
  const sb = (s: Shape): HTMLButtonElement => shapeBtns[s] as HTMLButtonElement;
  const cb = (c: Colour): HTMLButtonElement => colourBtns[c] as HTMLButtonElement;

  let fills = emptyFills();
  let selShape: Shape | null = null;
  let selColour: Colour | null = null;
  let revealed = false;
  let revealTimer = 0;
  const painted: Record<Shape, Colour | null> = emptyFills();
  const token: Record<Shape, number> = { triangle: 0, square: 0, circle: 0 };
  const rove = { shapes: 0, colours: 0 };

  card.classList.add('is-live');
  key.hidden = true;

  const say = (msg: string): void => { status.textContent = msg; };
  const later = (fn: () => void, ms: number): number => {
    const id = window.setTimeout(() => { timers.delete(id); fn(); }, ms);
    timers.add(id);
    return id;
  };

  /* ---------- paint: the ink-roller wipe ---------- */

  function wipe(el: Element, from: string, to: string): Animation | null {
    if (typeof el.animate !== 'function') return null;
    return el.animate([{ clipPath: from }, { clipPath: to }], { duration: WIPE_MS, easing: SNAP, fill: 'forwards' });
  }

  /** Bring one shape's fill to fills[shape]: in from the bottom, out toward the top, or out then in again. */
  function paint(shape: Shape, animate: boolean): void {
    const btn = sb(shape);
    const f = btn.querySelector<SVGElement>('.qf');
    const prev = painted[shape];
    const next = fills[shape];
    painted[shape] = next;
    const mine = ++token[shape];
    const settle = (): void => {
      if (next) btn.setAttribute('data-fill', next);
      else btn.removeAttribute('data-fill');
      f?.getAnimations().forEach((a) => a.cancel());
    };
    if (!f || !animate || prev === next) { settle(); return; }
    f.getAnimations().forEach((a) => a.cancel());
    const wipeIn = (): void => {
      if (mine !== token[shape]) return;
      settle();
      const a = wipe(f, 'inset(100% 0 0 0)', 'inset(0 0 0 0)');
      if (a) a.finished.then(() => { if (mine === token[shape]) a.cancel(); }, () => undefined);
    };
    if (prev) {
      const out = wipe(f, 'inset(0 0 0 0)', 'inset(0 0 100% 0)');
      if (!out) { next ? wipeIn() : settle(); return; }
      out.finished.then(() => { if (next) wipeIn(); else if (mine === token[shape]) settle(); }, () => undefined);
    } else {
      wipeIn();
    }
  }

  /* ---------- state to the DOM ---------- */

  function render(): void {
    for (const s of SHAPES) {
      const b = sb(s);
      b.setAttribute('aria-label', stateLabel(s, fills[s]));
      b.setAttribute('aria-pressed', String(selShape === s));
    }
    for (const c of COLOURS) {
      const b = cb(c);
      const on = SHAPES.find((s) => fills[s] === c);
      b.setAttribute('aria-label', on ? `${cap(c)}, on the ${on}` : cap(c));
      b.setAttribute('aria-pressed', String(selColour === c));
    }
    shapeRow?.querySelectorAll<HTMLElement>('[data-shape]').forEach((b, i) => {
      b.tabIndex = i === rove.shapes ? 0 : -1;
    });
    colourRow?.querySelectorAll<HTMLElement>('[data-pick]').forEach((b, i) => {
      b.tabIndex = i === rove.colours ? 0 : -1;
    });
    againBtn.hidden = !(revealed || filledCount(fills) > 0);
    showBtn.hidden = revealed;
    rows.inert = revealed;
  }

  /* ---------- the rules, wired ---------- */

  function clearPick(): boolean {
    const had = selShape !== null || selColour !== null;
    selShape = null;
    selColour = null;
    return had;
  }

  function place(shape: Shape, colour: Colour): void {
    const { fills: next, swapped } = applyFill(fills, shape, colour);
    const before = fills;
    fills = next;
    clearPick();
    paint(shape, true);
    if (swapped) paint(swapped, true);
    let msg = `${cap(shape)} is ${colour}.`;
    if (swapped) msg += ` ${cap(swapped)} is ${before[shape] ? before[shape] : 'empty'}.`;
    say(msg);
    render();
    window.clearTimeout(revealTimer);
    if (filledCount(fills) === 3) revealTimer = later(reveal, REVEAL_DELAY_MS);
  }

  function pickShape(shape: Shape): void {
    if (revealed) return;
    if (selColour) { place(shape, selColour); return; }
    if (selShape === shape) { clearPick(); say('Selection cleared.'); } else { selShape = shape; say(`${cap(shape)} selected. Now pick a colour.`); }
    rove.shapes = SHAPES.indexOf(shape);
    render();
  }

  function pickColour(colour: Colour): void {
    if (revealed) return;
    if (selShape) { place(selShape, colour); return; }
    if (selColour === colour) { clearPick(); say('Selection cleared.'); } else { selColour = colour; say(`${cap(colour)} selected. Now pick a shape.`); }
    rove.colours = COLOURS.indexOf(colour);
    render();
  }

  function reveal(): void {
    if (revealed) return;
    window.clearTimeout(revealTimer);
    clearPick();
    revealed = true;
    const n = agreeCount(fills);
    key.querySelectorAll<HTMLElement>('[data-key]').forEach((li) => {
      const s = li.getAttribute('data-key') as Shape;
      if (fills[s] === ANSWER[s]) li.setAttribute('data-match', '');
      else li.removeAttribute('data-match');
    });
    // An empty form has nothing to tally: the key shows alone, and the status leaves "none" out too.
    const empty = filledCount(fills) === 0;
    key.querySelectorAll<HTMLElement>('[data-tally]').forEach((el) => { el.hidden = empty || Number(el.getAttribute('data-tally')) !== n; });
    const tally = key.querySelector<HTMLElement>('.qtally');
    if (tally) tally.hidden = empty;
    key.hidden = false;
    say(revealStatus(fills));
    render();
    // preventScroll: focusing the button must not drag the page to it (the key is taller than the card was).
    againBtn.focus({ preventScroll: true });
  }

  // One per colour bar: drops any grab and puts the bar back home at once.
  const dragResets: Array<() => void> = [];

  function again(): void {
    window.clearTimeout(revealTimer);
    const wasRevealed = revealed;
    revealed = false;
    dragResets.forEach((r) => r());
    clearPick();
    fills = emptyFills();
    key.hidden = true;
    key.querySelectorAll('[data-match]').forEach((el) => el.removeAttribute('data-match'));
    for (const s of SHAPES) paint(s, true);
    rove.shapes = 0;
    rove.colours = 0;
    say('Cleared. Give each shape one colour.');
    render();
    if (wasRevealed || card.contains(document.activeElement)) sb('triangle').focus();
  }

  /* ---------- events: taps and keys ---------- */

  let swallowClick = false;
  for (const s of SHAPES) sb(s).addEventListener('click', () => pickShape(s), opts);
  for (const c of COLOURS) {
    cb(c).addEventListener(
      'click',
      (e) => {
        if (swallowClick) { swallowClick = false; e.preventDefault(); return; }
        pickColour(c);
      },
      opts,
    );
  }
  showBtn.addEventListener('click', reveal, opts);
  againBtn.addEventListener('click', again, opts);

  const roving = (row: HTMLElement, attr: string, which: 'shapes' | 'colours') => (e: KeyboardEvent): void => {
    const items = [...row.querySelectorAll<HTMLElement>(`[${attr}]`)];
    const at = items.indexOf(document.activeElement as HTMLElement);
    if (at < 0) return;
    let to = at;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') to = (at + 1) % items.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') to = (at - 1 + items.length) % items.length;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = items.length - 1;
    else return;
    e.preventDefault();
    rove[which] = to;
    items.forEach((b, i) => { b.tabIndex = i === to ? 0 : -1; });
    items[to].focus();
  };
  shapeRow.addEventListener('keydown', roving(shapeRow, 'data-shape', 'shapes'), opts);
  colourRow.addEventListener('keydown', roving(colourRow, 'data-pick', 'colours'), opts);
  card.addEventListener(
    'keydown',
    (e) => {
      if (e.key !== 'Escape' || revealed) return;
      if (clearPick()) { say('Selection cleared.'); render(); }
    },
    opts,
  );

  /* ---------- events: dragging a colour bar onto a shape ---------- */

  for (const c of COLOURS) {
    const bar = cb(c);
    let grab: { id: number; x: number; y: number; moved: boolean } | null = null;
    let over: HTMLElement | null = null;
    let fall = 0;

    const shapeAt = (x: number, y: number): HTMLButtonElement | null => {
      const hit = document.elementFromPoint(x, y);
      return hit instanceof Element ? hit.closest<HTMLButtonElement>('[data-shape]') : null;
    };
    const setOver = (el: HTMLElement | null): void => {
      if (over === el) return;
      over?.classList.remove('is-over');
      over = el;
      over?.classList.add('is-over');
    };
    const drop = (): void => {
      setOver(null);
      bar.removeAttribute('data-held');
      bar.style.transition = `translate ${FALL_MS}ms ${SNAP}`;
      bar.style.translate = '0px 0px';
      window.clearTimeout(fall);
      fall = later(() => { bar.style.transition = ''; bar.style.translate = ''; }, FALL_MS + 60);
    };

    dragResets.push(() => {
      grab = null;
      setOver(null);
      window.clearTimeout(fall);
      bar.removeAttribute('data-held');
      bar.style.transition = '';
      bar.style.translate = '';
    });

    bar.addEventListener(
      'pointerdown',
      (e) => {
        if (revealed || grab || (e.pointerType === 'mouse' && e.button !== 0)) return;
        grab = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
        // Captured at the press, so a fast flick off the bar still reaches
        // this bar's move and up events (a mouse has no implicit capture).
        try { bar.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
      },
      opts,
    );
    bar.addEventListener(
      'pointermove',
      (e) => {
        if (!grab || e.pointerId !== grab.id) return;
        // No button down means the release was missed: end the grab here.
        if (e.buttons === 0) { release(e); return; }
        const dx = e.clientX - grab.x;
        const dy = e.clientY - grab.y;
        if (!grab.moved) {
          if (Math.hypot(dx, dy) < DRAG_PX) return;
          grab.moved = true;
          window.clearTimeout(fall);
          bar.style.transition = 'none';
          bar.setAttribute('data-held', '');
        }
        bar.style.translate = `${dx}px ${dy}px`;
        setOver(shapeAt(e.clientX, e.clientY));
      },
      opts,
    );
    const release = (e: PointerEvent): void => {
      if (!grab || e.pointerId !== grab.id) return;
      const was = grab;
      grab = null;
      if (!was.moved) return;
      const target = e.type === 'pointerup' ? shapeAt(e.clientX, e.clientY) : null;
      swallowClick = true;
      later(() => { swallowClick = false; }, 0);
      drop();
      const shape = target?.getAttribute('data-shape') as Shape | null | undefined;
      if (shape && !revealed) place(shape, c);
    };
    bar.addEventListener('pointerup', release, opts);
    bar.addEventListener('pointercancel', release, opts);
    bar.addEventListener('lostpointercapture', (e) => { if (e.target === bar && grab && e.pointerId === grab.id) release(e); }, opts);
    // A drag is not a click: dragstart and selection never start on a bar.
    bar.addEventListener('dragstart', (e) => e.preventDefault(), opts);
  }

  render();

  return () => {
    abort.abort();
    dragResets.forEach((r) => r());
    timers.forEach((t) => window.clearTimeout(t));
    timers.clear();
    window.clearTimeout(revealTimer);
  };
}
