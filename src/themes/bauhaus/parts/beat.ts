/**
 * The touch beat's common conditions (Stage 6 w4 task 28, critique A1): one
 * small response a toy gives, once per page visit, to say "touch me". It
 * fires only when the toy is at least 60% on screen, the page has been still
 * (no scroll) for 400 ms, no form field has focus and the tab is showing.
 * Held in module memory, so a full reload is a new visit and an in-school
 * return does not repeat it. Nothing loops: a beat that has played, or that
 * the visitor pre-empted by pressing the toy, is spent.
 *
 * The toy decides what its beat is (each plays in the school's stepped
 * manner, on the snap curve); this file decides only when.
 */

export const BEAT_VISIBLE = 0.6;
export const BEAT_STILL_MS = 400;
/** How soon to look again when the toy is in view and still but not yet ready (focus, or the build). */
const RETRY_MS = 300;

/** Beats that have played this visit, by `page:toy`. Module memory only. */
const played = new Set<string>();

export const beatSpent = (key: string): boolean => played.has(key);

/** True while a form control or an editable region has focus. */
export function formFocused(): boolean {
  const a = document.activeElement;
  if (!(a instanceof HTMLElement)) return false;
  return a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName);
}

/**
 * Plays `play(target)` once, for the first of `targets` (document order) that
 * meets the conditions. `ready` is the toy's own gate (its build has landed,
 * it is not mid-motion). A press on any target spends the beat. Returns the
 * cleanup, which also runs on `signal`.
 */
export function scheduleBeat(
  key: string,
  targets: Element[],
  play: (target: Element) => void,
  signal: AbortSignal,
  ready: (target: Element) => boolean = () => true,
): () => void {
  if (played.has(key) || targets.length === 0 || signal.aborted) return () => {};
  const visible = new Set<Element>();
  let timer = 0;
  let lastScroll = performance.now();

  const stop = (): void => {
    window.clearTimeout(timer);
    timer = 0;
    io.disconnect();
    window.removeEventListener('scroll', onScroll);
    for (const t of targets) t.removeEventListener('pointerdown', spend, true);
    document.removeEventListener('keydown', onKey, true);
  };
  const spend = (): void => {
    played.add(key);
    stop();
  };
  const onKey = (e: KeyboardEvent): void => {
    if (targets.some((t) => t.contains(e.target as Node))) spend();
  };
  const arm = (ms: number): void => {
    window.clearTimeout(timer);
    timer = window.setTimeout(check, ms);
  };
  function check(): void {
    timer = 0;
    if (signal.aborted || played.has(key)) return stop();
    const first = targets.find((t) => visible.has(t));
    if (!first) return;
    const wait = BEAT_STILL_MS - (performance.now() - lastScroll);
    if (wait > 0) return arm(wait);
    if (document.hidden || formFocused() || !ready(first)) return arm(RETRY_MS);
    played.add(key);
    stop();
    play(first);
  }
  function onScroll(): void {
    lastScroll = performance.now();
    if (timer) arm(BEAT_STILL_MS);
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.intersectionRatio >= BEAT_VISIBLE - 0.001) visible.add(e.target);
        else visible.delete(e.target);
      }
      if (visible.size === 0) {
        window.clearTimeout(timer);
        timer = 0;
      } else if (!timer) arm(0);
    },
    { threshold: [0, BEAT_VISIBLE] },
  );
  for (const t of targets) {
    io.observe(t);
    t.addEventListener('pointerdown', spend, true);
  }
  document.addEventListener('keydown', onKey, true);
  window.addEventListener('scroll', onScroll, { passive: true });
  signal.addEventListener('abort', stop, { once: true });
  return stop;
}

/** The visitor has taken the toy themselves: its beat is spent. */
export function spendBeat(key: string): void {
  played.add(key);
}
