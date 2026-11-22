/**
 * Grandmillennial's two interactables (Stage 6 w3 task 22): the sampler's letters
 * re-stitch (About) and the envelope opens (Contact). Both are real buttons driven by
 * `click` (a tap, Enter and Space all arrive as one), so a vertical swipe that starts on
 * one scrolls the page and fires nothing. Nothing is stored; the state is the DOM's, and a
 * fresh body (each visit, each in-school swap) starts fresh.
 *
 * Each init takes a landmark only its own page has and returns a cleanup that removes every
 * listener it added, the way parts/WallBird.astro does under lib/lifecycle's onMount.
 */
import { scheduleBeat } from '../../bauhaus/parts/beat';
import { nextThread } from './sampler';

/** A finger (no hover, no fine pointer) gets each toy's one small beat; a mouse has the cursor and the hover. */
const mouseHere = (): boolean => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ---------- the sampler: a tap re-stitches the letter in the next thread ---------- */

/** The thread of a letter is a data attribute (data-t, with data-p the one it replaces), so CSS reads the colour. */
export function initSampler(set: HTMLElement | null): (() => void) | void {
  if (!set) return;
  const letters = [...set.querySelectorAll<HTMLButtonElement>('button.ltr')];
  if (!letters.length) return;
  let current = letters.find((b) => b.tabIndex === 0) ?? letters[0];

  const rove = (to: HTMLButtonElement) => {
    for (const b of letters) b.tabIndex = b === to ? 0 : -1;
    current = to;
  };

  const restitch = (b: HTMLButtonElement) => {
    const was = Number(b.dataset.t || 0);
    b.dataset.p = String(was);
    b.dataset.t = String(nextThread(was));
    // restart the draw-in: drop the class, force a style flush, set it again
    b.classList.remove('go');
    void b.offsetWidth;
    b.classList.add('go');
  };

  const onClick = (e: Event) => {
    const b = (e.target as Element | null)?.closest<HTMLButtonElement>('button.ltr');
    if (!b || !set.contains(b)) return;
    rove(b);
    restitch(b);
  };

  /** The letter above or below: the nearest row that way, then the closest centre. */
  const vertical = (from: HTMLButtonElement, dir: 1 | -1) => {
    const r0 = from.getBoundingClientRect();
    const cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
    const rows = letters.map((b) => {
      const r = b.getBoundingClientRect();
      return { b, dy: (r.top + r.height / 2 - cy) * dir, dx: Math.abs(r.left + r.width / 2 - cx) };
    }).filter((c) => c.dy > r0.height / 2);
    if (!rows.length) return null;
    const near = Math.min(...rows.map((c) => c.dy));
    const row = rows.filter((c) => c.dy < near + r0.height / 2);
    return row.reduce((best, c) => (c.dx < best.dx ? c : best)).b;
  };

  const onKey = (e: KeyboardEvent) => {
    const from = (e.target as Element | null)?.closest<HTMLButtonElement>('button.ltr');
    if (!from || e.altKey || e.ctrlKey || e.metaKey) return;
    const i = letters.indexOf(from);
    let to: HTMLButtonElement | null | undefined;
    if (e.key === 'ArrowRight') to = letters[Math.min(letters.length - 1, i + 1)];
    else if (e.key === 'ArrowLeft') to = letters[Math.max(0, i - 1)];
    else if (e.key === 'ArrowDown') to = vertical(from, 1);
    else if (e.key === 'ArrowUp') to = vertical(from, -1);
    else if (e.key === 'Home') to = letters[0];
    else if (e.key === 'End') to = letters[letters.length - 1];
    else return;
    e.preventDefault();
    if (to) { rove(to); to.focus(); }
  };

  /** One focus stop for the whole band: whichever letter holds focus is the one Tab returns to. */
  const onFocus = (e: Event) => {
    const b = (e.target as Element | null)?.closest<HTMLButtonElement>('button.ltr');
    if (b) rove(b);
  };

  /** The last stitch of a letter has landed: the old thread underneath can go. */
  const onEnd = (e: AnimationEvent) => {
    const x = e.target as Element | null;
    if (!x || !(x as HTMLElement).dataset || (x as HTMLElement).dataset.last !== '1') return;
    x.closest('button.ltr')?.classList.remove('go');
  };

  /* The touch beat (Stage 6 w4 task 30, critique A1): once a visit, when the band is at least 60% on screen, the page has
     been still 400 ms and no form field has focus (bauhaus/parts/beat.ts), ONE letter, the middle of the top row, is
     re-stitched in the next thread, its crosses drawing in along the letter's path as a tap would. It leaves the roving
     tab stop alone. A press on the band spends it. */
  const beatAbort = new AbortController();
  const stopBeat = mouseHere()
    ? () => {}
    : scheduleBeat(
      'grandmillennial:sampler',
      [set],
      () => {
        const top = letters[0].offsetTop;
        const row = letters.filter((b) => Math.abs(b.offsetTop - top) < 2);
        restitch(row[Math.floor(row.length / 2)]);
      },
      beatAbort.signal,
      () => letters.every((b) => !b.classList.contains('go')),
    );

  rove(current);
  set.addEventListener('click', onClick);
  set.addEventListener('keydown', onKey);
  set.addEventListener('focusin', onFocus);
  set.addEventListener('animationend', onEnd as EventListener);
  return () => {
    stopBeat();
    beatAbort.abort();
    set.removeEventListener('click', onClick);
    set.removeEventListener('keydown', onKey);
    set.removeEventListener('focusin', onFocus);
    set.removeEventListener('animationend', onEnd as EventListener);
    for (const b of letters) b.classList.remove('go');
  };
}

/* ---------- the envelope: the seal (or the card) opens and closes it ---------- */

const LABEL_OPEN = 'Envelope, open';
const LABEL_CLOSE = 'Envelope, close';

export function initEnvelope(env: HTMLElement | null): (() => void) | void {
  if (!env) return;
  const seal = env.querySelector<HTMLButtonElement>('button.seal-btn');
  if (!seal) return;

  const set = (open: boolean) => {
    env.dataset.open = open ? 'true' : 'false';
    seal.setAttribute('aria-expanded', String(open));
    seal.setAttribute('aria-label', open ? LABEL_CLOSE : LABEL_OPEN);
  };
  const toggle = () => set(env.dataset.open !== 'true');

  const onClick = (e: Event) => {
    const t = e.target as Element | null;
    if (!t) return;
    if (t.closest('button.seal-btn')) toggle();
    // the card is a second place to tap once the envelope is open (the seal stays the keyboard's way)
    else if (env.dataset.open === 'true' && t.closest('.card')) set(false);
  };

  /* The touch beat (Stage 6 w4 task 30, critique A1): the wax seal alone, once a visit, on the common conditions
     (bauhaus/parts/beat.ts): it presses in a hair and comes back past rest, as a thumb would test it. It never opens the
     envelope. A press on the seal spends it. */
  const beatAbort = new AbortController();
  const art = seal.querySelector<SVGElement>('.seal');
  let beatAnim: Animation | null = null;
  const stopBeat = mouseHere() || !art
    ? () => {}
    : scheduleBeat(
      'grandmillennial:seal',
      [seal],
      () => {
        beatAnim = art.animate(
          [{ scale: '1' }, { scale: '0.9', offset: 0.3 }, { scale: '1.08', offset: 0.66 }, { scale: '1' }],
          { duration: 520, easing: 'ease-in-out' },
        );
      },
      beatAbort.signal,
      () => env.dataset.open !== 'true',
    );

  set(false);
  env.addEventListener('click', onClick);
  return () => {
    stopBeat();
    beatAbort.abort();
    beatAnim?.cancel();
    env.removeEventListener('click', onClick);
    set(false);
  };
}
