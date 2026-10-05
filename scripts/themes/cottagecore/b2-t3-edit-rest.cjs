/* B2 task 3: fx tape tap, Header mount, Footer tablet rows, Contact, card breakpoints. Run once. */
const edit = require('./edit-helper.cjs');
const T = 'src/themes/cottagecore/';

edit(T + 'fx.ts', [[`export function mountFireflies(): void {`, `/** Touch: a tap on a washi tape lifts its free corner and lays it back down
    (fine pointers do the same on hover, in CSS). The tapes are inert and
    aria-hidden; this only sets and clears a data flag. */
export function mountTapes(): void {
  onMount(() => {
    if (document.documentElement.dataset.theme !== SCHOOL) return;
    const timers = new Map<Element, number>();
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      const tape = (e.target as Element | null)?.closest?.('.cc-tape');
      if (!tape) return;
      tape.setAttribute('data-lift', '');
      clearTimeout(timers.get(tape));
      timers.set(tape, window.setTimeout(() => {
        tape.removeAttribute('data-lift');
        timers.delete(tape);
      }, 1100));
    };
    document.addEventListener('pointerdown', onDown, { passive: true });
    return () => {
      document.removeEventListener('pointerdown', onDown);
      timers.forEach((id, tape) => { clearTimeout(id); tape.removeAttribute('data-lift'); });
      timers.clear();
    };
  });
}

export function mountFireflies(): void {`]]);

edit(T + 'Header.astro', [[`  import { mountFireflies } from './fx';

  mountFireflies();`, `  import { mountFireflies, mountTapes } from './fx';

  mountFireflies();
  mountTapes();`]]);

edit(T + 'Footer.astro', [
[`  nav a { color: var(--mark); text-decoration: none; }`, `  nav a { color: var(--mark); text-decoration: none; white-space: nowrap; }`],
[`  @media (max-width: 760px) {
    .grid { grid-template-columns: 1fr; align-items: start; gap: 1.3rem; }
    nav { justify-content: flex-start; }
    .fine { text-align: left; }
  }`, `  /* Tablet: the wordmark and fine print share the first row, the nav takes
     its own row below (nowrap keeps every nav item on one line). */
  @media (max-width: 1000px) {
    .grid { grid-template-columns: 1fr auto; row-gap: 1.4rem; }
    .ident { grid-column: 1; grid-row: 1; }
    .fine { grid-column: 2; grid-row: 1; }
    nav { grid-column: 1 / -1; grid-row: 2; justify-content: flex-start; gap: 0.3rem 1.8rem; }
  }
  @media (max-width: 760px) {
    .grid { grid-template-columns: 1fr; align-items: start; gap: 1.3rem; }
    .ident, .fine, nav { grid-column: auto; grid-row: auto; }
    nav { gap: 0 1.3rem; }
    .fine { text-align: left; }
    /* Touch targets: nav items and the Privacy link are at least 44px tall. */
    nav a, .fine a { display: inline-flex; align-items: center; min-height: 44px; }
  }`],
]);

edit(T + 'pages/Home.astro', [
[`  @media (max-width: 820px) {
    .hero { grid-template-columns: 1fr; }
    .specimen { justify-self: center; width: min(82%, 22rem); margin-top: 1.5rem; }
    .cards { grid-template-columns: 1fr; gap: 3.2rem; }
    .card:nth-child(2) { margin-top: 0; }
  }`, `  @media (max-width: 820px) {
    .hero { grid-template-columns: 1fr; }
    .specimen { justify-self: center; width: min(82%, 22rem); margin-top: 1.5rem; }
  }
  /* Tablet: two columns hold down to about 700px; the corner sprig gets room
     below the last line so it never crosses text. */
  @media (max-width: 1000px) {
    .card p.cc-ruled { padding-bottom: 2.4rem; }
  }
  /* Stacked: capped at 32rem and dealt left then right, keeping their tilts. */
  @media (max-width: 700px) {
    .cards { grid-template-columns: 1fr; gap: 3.2rem; }
    .card { width: min(100%, 32rem); }
    .card:nth-child(1) { justify-self: start; }
    .card:nth-child(2) { justify-self: end; margin-top: 0; }
  }`]]);

edit(T + 'pages/Services.astro', [
[`    .offerings { grid-template-columns: 1fr; }
    .recipe:nth-child(2) { margin-top: 0; }
    .steps { grid-template-columns: 1fr; }
    .ask :global(.a-left) { display: none; }
  }`, `    .steps { grid-template-columns: 1fr; }
    .ask :global(.a-left) { display: none; }
  }
  @media (max-width: 1000px) {
    .recipe .body { padding-bottom: 2rem; }
  }
  @media (max-width: 700px) {
    .offerings { grid-template-columns: 1fr; }
    .recipe { width: min(100%, 32rem); }
    .recipe:nth-child(1) { justify-self: start; }
    .recipe:nth-child(2) { justify-self: end; margin-top: 0; }
  }`]]);
