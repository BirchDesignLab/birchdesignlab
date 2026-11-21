/**
 * The Home hero's VCR remote (Stage 6 wave 3, task 24; a1-critic-vaporwave
 * "Interactables" 1, stop 1 call 7, stop 3 answer 3 for the words).
 *
 * The on-screen display's "PLAY" is one real button (Home.astro, `[data-deck]`):
 * - a tap, a click, Enter or Space pauses: the grid freezes, the OSD reads
 *   PAUSE and a jittering tracking band rolls up the frame (CSS, keyed on
 *   the hero's `data-deck-mode`, Home.astro's `.deck-band`); the same again resumes;
 * - a hold on the button (HOLD_MS), or a held right arrow, fast-forwards: the
 *   grid runs TAPE_RATE.ff times, a noise pass lays tape snow over the frame,
 *   the counter spins, the OSD reads FF; a held left arrow rewinds (REW), and
 *   a mouse held on the button and dragged left or right does REW or FF;
 * - on touch, a tap anywhere on the hero pauses and a mostly horizontal swipe
 *   on the hero fast-forwards (right) or rewinds (left) until the finger
 *   lifts; a vertical swipe scrolls (the hero is `touch-action: pan-y`);
 * - release snaps back to PLAY with the seam's tracking hiccup.
 * `aria-label` is "Play" or "Pause", matching the OSD, and `aria-pressed` is
 * true while paused. No new words beyond the approved PAUSE, FF and REW.
 *
 * The picture itself lives in fx.ts: this module only announces the mode as a
 * DECK_EVENT on the hero canvas, so the remote still answers on the CSS sky
 * when WebGL never starts. Memory only: a fresh page (every arrival, every
 * swap, a page restored from the back-forward cache) is at PLAY. The deck's
 * own counter loop runs only while a scan lasts, and a scan ends when the
 * page is hidden or the hero leaves the screen; the pause band's CSS loop is
 * paused off screen (`data-deck-off`).
 */
const THEME = 'vaporwave';

export const DECK_EVENT = 'vw-deck';
export type DeckMode = 'play' | 'pause' | 'ff' | 'rew';
export interface DeckDetail { mode: DeckMode; hiccup: boolean }
/** Tape speed per mode: the grid runs about 4x forward or 4x backward. */
export const TAPE_RATE: Record<DeckMode, number> = { play: 1, pause: 0, ff: 4, rew: -4 };
/** The approved OSD words (stop 3 answer 3), beside today's PLAY. */
export const DECK_WORDS: Record<DeckMode, string> = { play: 'PLAY', pause: 'PAUSE', ff: 'FF', rew: 'REW' };
/** A press on the button held this long becomes fast-forward. */
export const HOLD_MS = 350;
/** A move this far, mostly along one axis, decides a swipe (w3-common). */
export const SWIPE_PX = 8;
/** A scan shows for at least this long, so a quick flick still reads. */
export const MIN_SCAN_MS = 600;
/** Today's counter, "SP 0:19:85", read as minutes, seconds, hundredths. */
export const COUNTER_START = 19.85;

/** The counter's face: m:ss:cc, never below zero. */
export function formatCounter(seconds: number): string {
  const cs = Math.max(0, Math.floor(seconds * 100 + 1e-6));
  const m = Math.floor(cs / 6000);
  const s = Math.floor(cs / 100) % 60;
  const c = cs % 100;
  return `${m}:${String(s).padStart(2, '0')}:${String(c).padStart(2, '0')}`;
}

/**
 * Which way a move from the press point goes, once it is decided: 'x' for a
 * mostly horizontal move past SWIPE_PX (half again as wide as it is tall),
 * 'y' for any other move past it (vertical or diagonal, left to the
 * browser's scroll), null while it is still too small to say.
 */
export function swipeAxis(dx: number, dy: number, threshold = SWIPE_PX): 'x' | 'y' | null {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax >= threshold && ax > ay * 1.5) return 'x';
  // Past the threshold and not mostly horizontal: the page's scroll.
  if (Math.max(ax, ay) >= threshold) return 'y';
  return null;
}

/** onMount body for the Home hero. */
export function mountDeck(): (() => void) | void {
  if (document.documentElement.dataset.theme !== THEME) return;
  const hero = document.querySelector<HTMLElement>('.hero');
  const button = hero?.querySelector<HTMLButtonElement>('[data-deck]');
  const word = button?.querySelector<HTMLElement>('[data-deck-word]');
  if (!hero || !button || !word) return;
  const canvas = hero.querySelector<HTMLCanvasElement>('canvas[data-vw-horizon]');
  const counter = hero.querySelector<HTMLElement>('[data-deck-counter]');

  let mode: DeckMode = 'play';
  let count = COUNTER_START;
  let scanStarted = 0;
  let scanFrame = 0;
  let scanLast = 0;
  let endTimer = 0;
  let holdTimer = 0;
  let keyScan = '';
  let suppressClick = false;
  let gesture: { id: number; x: number; y: number; touch: boolean; onButton: boolean; axis: 'x' | 'y' | null; held: boolean } | null = null;

  const scanning = () => mode === 'ff' || mode === 'rew';

  const render = () => {
    hero.dataset.deckMode = mode;
    word.textContent = DECK_WORDS[mode];
    button.setAttribute('aria-label', mode === 'pause' ? 'Pause' : 'Play');
    button.setAttribute('aria-pressed', String(mode === 'pause'));
  };

  const setMode = (next: DeckMode, hiccup = false) => {
    if (next === mode) return;
    mode = next;
    render();
    canvas?.dispatchEvent(new CustomEvent<DeckDetail>(DECK_EVENT, { detail: { mode, hiccup } }));
  };

  const spin = (t: number) => {
    scanFrame = 0;
    if (!scanning()) return;
    count = Math.max(0, count + ((t - scanLast) / 1000) * TAPE_RATE[mode]);
    scanLast = t;
    if (counter) counter.textContent = formatCounter(count);
    scanFrame = requestAnimationFrame(spin);
  };

  const startScan = (dir: 'ff' | 'rew') => {
    if (endTimer) { clearTimeout(endTimer); endTimer = 0; }
    if (mode === dir) return;
    if (!scanning()) scanStarted = performance.now();
    setMode(dir);
    if (!scanFrame) {
      scanLast = performance.now();
      scanFrame = requestAnimationFrame(spin);
    }
  };

  /** Back to PLAY with the hiccup; `now` skips the minimum showing time. */
  const endScan = (now = false) => {
    if (!scanning()) return;
    const left = MIN_SCAN_MS - (performance.now() - scanStarted);
    if (!now && left > 0) {
      if (!endTimer) endTimer = window.setTimeout(() => { endTimer = 0; endScan(true); }, left);
      return;
    }
    if (endTimer) { clearTimeout(endTimer); endTimer = 0; }
    if (scanFrame) { cancelAnimationFrame(scanFrame); scanFrame = 0; }
    setMode('play', true);
  };

  const togglePause = () => {
    if (scanning()) return;
    setMode(mode === 'pause' ? 'play' : 'pause', mode === 'pause');
  };

  const clearHold = () => {
    if (holdTimer) { clearTimeout(holdTimer); holdTimer = 0; }
  };

  const onPointerDown = (event: PointerEvent) => {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const onButton = button.contains(event.target as Node);
    const touch = event.pointerType === 'touch';
    // A mouse or pen works the button; a finger works the whole hero.
    if (!touch && !onButton) return;
    suppressClick = false;
    clearHold();
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, touch, onButton, axis: null, held: false };
    if (onButton) {
      // A mouse held on the button and let go off the hero still ends the
      // scan: the release comes back here. (A finger is captured already.)
      if (!touch) {
        try { button.setPointerCapture(event.pointerId); } catch { /* already gone */ }
      }
      holdTimer = window.setTimeout(() => {
        holdTimer = 0;
        if (!gesture || gesture.axis) return;
        gesture.held = true;
        suppressClick = true;
        startScan('ff');
      }, HOLD_MS);
    }
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!gesture || event.pointerId !== gesture.id || gesture.axis === 'y') return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!gesture.axis) {
      const axis = swipeAxis(dx, dy);
      if (!axis) return;
      gesture.axis = axis;
      clearHold();
      if (axis === 'y') {
        // The browser scrolls; a hold that already began still ends on release.
        return;
      }
      suppressClick = true;
      try { hero.setPointerCapture(event.pointerId); } catch { /* already gone */ }
    }
    if (Math.abs(dx) >= SWIPE_PX) startScan(dx > 0 ? 'ff' : 'rew');
  };

  const onPointerUp = (event: PointerEvent) => {
    if (!gesture || event.pointerId !== gesture.id) return;
    clearHold();
    const g = gesture;
    gesture = null;
    if (scanning() && (g.axis === 'x' || g.held)) endScan();
    // A finger's tap off the button pauses too; on the button, the click does.
    else if (!g.axis && g.touch && !g.onButton) togglePause();
  };

  const onPointerCancel = (event: PointerEvent) => {
    if (!gesture || event.pointerId !== gesture.id) return;
    clearHold();
    gesture = null;
    endScan();
  };

  const onClick = (event: MouseEvent) => {
    // detail 0 is the keyboard's click (Enter or Space): always a toggle.
    if (suppressClick && event.detail !== 0) {
      suppressClick = false;
      return;
    }
    suppressClick = false;
    togglePause();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    if (event.repeat) return;
    keyScan = event.key;
    startScan(event.key === 'ArrowRight' ? 'ff' : 'rew');
  };

  const onKeyUp = (event: KeyboardEvent) => {
    if (event.key !== keyScan) return;
    keyScan = '';
    endScan();
  };

  const onBlur = () => {
    keyScan = '';
    endScan();
  };

  // A long press on a phone would otherwise open the callout menu.
  const onContextMenu = (event: Event) => event.preventDefault();

  const onVisibility = () => {
    if (document.hidden) endScan(true);
    hero.toggleAttribute('data-deck-off', document.hidden || !inView);
  };

  let inView = true;
  const intersection = new IntersectionObserver((entries) => {
    inView = entries[0].isIntersecting;
    if (!inView) endScan(true);
    hero.toggleAttribute('data-deck-off', document.hidden || !inView);
  });
  intersection.observe(hero);

  // Leaving the page resets the deck, so a page brought back from the
  // back-forward cache opens at PLAY like any other visit.
  const onPageHide = () => {
    clearHold();
    gesture = null;
    keyScan = '';
    if (endTimer) { clearTimeout(endTimer); endTimer = 0; }
    if (scanFrame) { cancelAnimationFrame(scanFrame); scanFrame = 0; }
    setMode('play');
  };

  hero.addEventListener('pointerdown', onPointerDown);
  hero.addEventListener('pointermove', onPointerMove);
  hero.addEventListener('pointerup', onPointerUp);
  hero.addEventListener('pointercancel', onPointerCancel);
  button.addEventListener('click', onClick);
  button.addEventListener('keydown', onKeyDown);
  button.addEventListener('keyup', onKeyUp);
  button.addEventListener('blur', onBlur);
  button.addEventListener('contextmenu', onContextMenu);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', onPageHide);
  render();

  return () => {
    clearHold();
    if (endTimer) clearTimeout(endTimer);
    if (scanFrame) cancelAnimationFrame(scanFrame);
    endTimer = 0;
    scanFrame = 0;
    gesture = null;
    intersection.disconnect();
    hero.removeEventListener('pointerdown', onPointerDown);
    hero.removeEventListener('pointermove', onPointerMove);
    hero.removeEventListener('pointerup', onPointerUp);
    hero.removeEventListener('pointercancel', onPointerCancel);
    button.removeEventListener('click', onClick);
    button.removeEventListener('keydown', onKeyDown);
    button.removeEventListener('keyup', onKeyUp);
    button.removeEventListener('blur', onBlur);
    button.removeEventListener('contextmenu', onContextMenu);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', onPageHide);
  };
}
