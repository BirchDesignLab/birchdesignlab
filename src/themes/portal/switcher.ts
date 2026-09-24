/**
 * <bdl-switcher>: the portal's one persistent control (spec §4, call C4).
 *
 * A vanilla custom element with its own shadow root and stylesheet, carried
 * across every swap with transition:persist. Shadow DOM is the point: no
 * school's CSS can reach it, and no head swap can orphan its styles (F040).
 * It is the Lab's instrument, not part of any school, so it keeps one look
 * (the house charcoal and moss, square corners) over every school.
 *
 * Controls: which school (a modal list of every school), Shuffle (a random
 * other school, replacing the history entry so Back does not walk through
 * shuffles), light/dark, and Leave (the same page on the root site, full
 * load). Links inside a shadow root are invisible to the router, so every
 * plain link here is a real navigation; school changes go through navigate().
 *
 * The dialog lists every school in the order of its era, the visitor's own
 * highlighted (the lessons wait for the BDL-011 case study). Until the
 * visitor first taps it in a browser session, a short prompt sits above the
 * bar: it survives navigations and reloads, and goes only when the visitor
 * answers it, dismisses it or uses the switcher. It never opens the dialog by
 * itself.
 *
 * Speed (P4): opening the dialog warms every other school's same page, and
 * pointing at or focusing Shuffle picks its school and warms that page, so
 * the click finds the page in memory. A school's row, or Shuffle, that the
 * visitor rests on or presses also has its page drawn ahead (runtime.ts,
 * drawOnIntent), so its first draw is cheap. The control that started a
 * school change shows a busy state until the new page has loaded (or the
 * navigation is abandoned), inside its own box, and its labels keep the
 * width of the longest word they can show, so the bar never changes size
 * while it holds still through the swap.
 */
import { navigate, type TransitionBeforePreparationEvent } from 'astro:transitions/client';
import { currentScheme, setScheme } from '../../lib/scheme';
import { pagePath, pageFromPath, rootPathFor, type PageId } from '../paths';
import { readPortalData, type SchoolSummary } from './schools';
import { drawOnIntent, SWITCHER_INFO, warmPages } from './runtime';

/**
 * The first-load prompt's words, chosen by the founder 09-23-26. It names no
 * school count, so it survives tranche 2. Visitor-facing, so no em dashes.
 */
const FIRST_LOAD_PROMPT =
  "Welcome to the Portal. Choose a design school and watch the page transform. Shuffle for a random one, and swap between light and dark while you're there.";

/** sessionStorage key, set to 'dismissed' once the visitor has tapped the prompt or the switcher. */
const PROMPT_KEY = 'bdl-portal-prompt';

function promptDismissed(): boolean {
  try {
    return window.sessionStorage.getItem(PROMPT_KEY) === 'dismissed';
  } catch {
    return false; // no storage: a dismissal lasts until the next full load instead
  }
}

function rememberPromptDismissed(): void {
  try {
    window.sessionStorage.setItem(PROMPT_KEY, 'dismissed');
  } catch {
    /* storage can throw (private windows, blocked site data); the prompt is still gone until a full load */
  }
}

const STYLE = `
:host {
  --bg: #1c1a17; --raised: #272319; --ink: #f4f0e6; --muted: #b3ab9b; --accent: #a3bd8f;
  --line: rgba(244, 240, 230, 0.2);
  /* The busy state's lifted ground and bright moss. */
  --busy: #3b3527; --accent-hi: #cde4b6;
  /* Centred by layout (auto margins), not a transform: a view transition
     draws a transformed element's snapshot a subpixel off the live one, so
     the bar would seem to jolt on every swap (K1). The placement is
     !important because the host sits in the page, where a school's reset
     reaches it (quiet's base.css sets margin: 0 on every element), and a
     :host rule loses to any page rule unless both are important. */
  position: fixed !important; left: 0 !important; right: 0 !important;
  bottom: max(12px, env(safe-area-inset-bottom)) !important;
  width: max-content !important; margin: 0 auto !important; z-index: 2147483000;
  font: 500 13px/1.2 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  letter-spacing: 0.02em; color: var(--ink);
}
* { box-sizing: border-box; }
.bar {
  display: flex; align-items: stretch; gap: 1px;
  background: var(--line); border: 1px solid var(--line);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35), 0 2px 6px rgba(0, 0, 0, 0.25);
}
button, a.btn {
  all: unset; box-sizing: border-box; cursor: pointer;
  display: inline-flex; align-items: center; gap: 8px;
  min-height: 44px; padding: 0 14px; background: var(--bg); color: var(--ink);
  white-space: nowrap; text-decoration: none;
  transition: background-color 160ms ease, color 160ms ease;
}
button:hover, a.btn:hover { background: var(--raised); }
button:focus-visible, a:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
.label { color: var(--muted); text-transform: uppercase; letter-spacing: 0.12em; font-size: 11px; }
.current, .open .stack { color: var(--ink); font-weight: 600; }
/* A label that changes (the school's name, Light or Dark) sits in one grid
   cell with every word it can show, the others hidden, so the widest sets
   the width and the bar is one size in every school and either scheme. */
.stack { display: inline-grid; }
.stack > * { grid-area: 1 / 1; }
.stack > .sizer { visibility: hidden; }
.icon { width: 16px; height: 16px; flex: none; }
.caret { width: 10px; height: 10px; flex: none; opacity: 0.7; }
/* Busy: the control that started a school change, until the new page has
   loaded. It lifts to a brighter ground with a moss rim, and a thick bright
   moss bar runs along its foot, all inside its own box (an inset shadow and
   an absolutely placed bar), so the bar never changes size (it holds still
   through every swap). Bold on purpose: it should read at a glance. */
button[aria-busy='true'] {
  position: relative; background: var(--busy); color: var(--ink); cursor: progress;
  box-shadow: inset 0 0 0 1px rgba(163, 189, 143, 0.45);
}
button[aria-busy='true']::after {
  content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 4px;
  background:
    linear-gradient(90deg, transparent, var(--accent-hi) 25%, var(--accent-hi) 75%, transparent) no-repeat,
    rgba(163, 189, 143, 0.28);
  background-size: 50% 100%, 100% 100%;
  animation: bdl-busy 900ms cubic-bezier(0.4, 0, 0.2, 1) infinite;
}
/* The run is 50% wide, so -100% and 200% put it just off either end; the
   faint moss track under it stays put. */
@keyframes bdl-busy {
  from { background-position: -100% 0, 0 0; }
  to { background-position: 200% 0, 0 0; }
}
/* Desktop: out of the way in the corner, clear of centred hero content (the
   quiet home pins its bark credit bottom-centre). Phones: centred, thumb reach. */
@media (min-width: 700px) {
  :host { left: auto !important; right: 16px !important; margin: 0 !important; }
}
/* The first-load prompt: a short paragraph above the bar, never over its
   buttons, capped at a readable measure (440px) so it wraps rather than
   running across a wide screen. Absolutely placed, so showing or dropping it never resizes the bar (which
   holds still through every swap). Centred on phones, flush right with the
   bar from 700px, where the bar moves to the corner. On phones its insets
   make a viewport-wide box around the bar's centre (the bar is centred), and
   auto margins centre it in that box: layout, not a translate, as for the
   bar. */
.prompt {
  position: absolute; bottom: calc(100% + 10px);
  left: calc(50% - 50vw); right: calc(50% - 50vw); margin-inline: auto;
  display: flex; align-items: stretch; gap: 1px;
  width: max-content; max-width: min(440px, calc(100vw - 24px));
  background: var(--line); border: 1px solid var(--line);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35), 0 2px 6px rgba(0, 0, 0, 0.25);
  /* It rises out of the bar a second after the page lands. backwards, not
     both: once it has arrived, the clip is gone and the shadow shows. */
  animation: bdl-prompt-in 560ms cubic-bezier(0.2, 0.8, 0.2, 1) 1000ms backwards;
}
.prompt[hidden] { display: none; }
/* It rides every swap until it is tapped. Where the router has no
   moveBefore it reinserts the switcher, which would restart the arrival and
   the pulse on every page; once each has run, it is switched off. */
.prompt.arrived, .prompt .beacon.pulsed { animation: none; }
.prompt .go { gap: 12px; padding: 10px 16px 10px 14px; white-space: normal; line-height: 1.35; }
.prompt .go .text { text-wrap: balance; }
.prompt .dismiss { justify-content: center; width: 44px; padding: 0; color: var(--muted); }
.prompt .dismiss:hover { color: var(--ink); }
/* Three slow pulses, starting once the prompt has arrived. */
.beacon { width: 8px; height: 8px; flex: none; background: var(--accent); animation: bdl-beacon 3.6s ease-out 1.7s 3; }
@keyframes bdl-prompt-in {
  from { opacity: 0; transform: translateY(12px); clip-path: inset(100% -40px -40px -40px); }
  to { opacity: 1; transform: none; clip-path: inset(-40px); }
}
@keyframes bdl-beacon {
  from { box-shadow: 0 0 0 0 rgba(163, 189, 143, 0.55); }
  to { box-shadow: 0 0 0 9px rgba(163, 189, 143, 0); }
}
@media (min-width: 700px) {
  .prompt { left: auto; right: 0; margin-inline: 0; max-width: min(440px, calc(100vw - 32px)); }
}
@media (max-width: 560px) {
  .wide { display: none; }
  button, a.btn { padding: 0 12px; }
}
/* A column: the head and the foot keep their height and the list scrolls
   between them, on a landscape phone as on a tall one. */
dialog {
  width: min(560px, calc(100vw - 24px)); max-height: min(78vh, 720px);
  margin: auto auto max(72px, calc(env(safe-area-inset-bottom) + 72px));
  padding: 0; border: 1px solid var(--line); background: var(--bg); color: var(--ink);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
}
dialog[open] { display: flex; flex-direction: column; overflow: hidden; }
dialog::backdrop { background: rgba(10, 9, 8, 0.55); }
.head { flex: none; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 18px; border-bottom: 1px solid var(--line); }
.head h2 { margin: 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.14em; color: var(--muted); }
.head button { min-height: 36px; padding: 0 10px; }
ul { flex: 0 1 auto; min-height: 0; list-style: none; margin: 0; padding: 6px 0; overflow: auto; overscroll-behavior: contain; }
li a {
  display: grid; grid-template-columns: 1fr auto; gap: 2px 12px; padding: 12px 18px;
  color: var(--ink); text-decoration: none; border-left: 2px solid transparent;
}
li a:hover { background: var(--raised); }
li a[aria-current='page'] { border-left-color: var(--accent); background: var(--raised); }
li .name { font-size: 15px; font-weight: 600; }
li .era { color: var(--muted); font-size: 12px; text-align: right; align-self: center; }
li .sig { grid-column: 1 / -1; color: var(--muted); font-size: 13px; line-height: 1.4; font-weight: 400; letter-spacing: 0; }
/* A phone has no room for the era beside the name: it takes its own line under it. */
@media (max-width: 560px) {
  li a { grid-template-columns: 1fr; }
  li .era { text-align: left; }
}
.foot { flex: none; display: flex; flex-wrap: wrap; gap: 8px 18px; padding: 14px 18px; border-top: 1px solid var(--line); }
.foot a { color: var(--accent); text-decoration: underline; text-underline-offset: 3px; font-size: 13px; }
@media (prefers-reduced-motion: reduce) { button, a.btn { transition: none; } }
`;

const ICON = {
  shuffle:
    '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" aria-hidden="true"><path d="M3 6h4l10 12h4M17 6h4v0M3 18h4l3-3.6M14 9.6 17 6M18 3l3 3-3 3M18 15l3 3-3 3"/></svg>',
  scheme:
    '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg>',
  leave:
    '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/></svg>',
  dismiss:
    '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  caret:
    '<svg class="caret" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true"><path d="M1 3h8L5 8z"/></svg>',
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Hidden copies of every word a .stack label can show, so it keeps the widest one's width. */
function sizers(words: string[]): string {
  return words.map((w) => `<span class="sizer" aria-hidden="true">${escapeHtml(w)}</span>`).join('');
}

/** The switcher the visitor sees: the first one connected, carried across every swap. */
let live: BdlSwitcher | null = null;

class BdlSwitcher extends HTMLElement {
  private built = false;
  private root!: ShadowRoot;
  /** Drops the prompt's listeners once it has been answered or dismissed. */
  private promptOff: AbortController | null = null;
  /** The control showing the busy state, while a school change it started is under way. */
  private busy: { control: HTMLElement } | null = null;
  /** Shuffle's next school, picked when the visitor points at it, so the page it warms is the one they get. */
  private shufflePick: string | null = null;

  connectedCallback() {
    // Each swap briefly connects the incoming page's own <bdl-switcher>
    // before the router puts the persisted one in its place. Leave that copy
    // inert: building it would add listeners and an observer that outlive it.
    if (live && live !== this && live.isConnected) return;
    live = this;
    if (!this.built) this.build();
    this.update();
  }

  private here(): { theme: string; page: PageId } | null {
    return pageFromPath(location.pathname);
  }

  private build() {
    this.built = true;
    this.root = this.attachShadow({ mode: 'open' });
    const { schools, aboutHref } = readPortalData();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Design school switcher');

    this.root.innerHTML = `
      <style>${STYLE}</style>
      <div class="prompt" hidden>
        <button type="button" class="go" aria-haspopup="dialog"><span class="beacon" aria-hidden="true"></span><span class="text">${escapeHtml(FIRST_LOAD_PROMPT)}</span></button>
        <button type="button" class="dismiss" aria-label="Dismiss the Portal prompt">${ICON.dismiss}</button>
      </div>
      <div class="bar">
        <button type="button" class="open" aria-haspopup="dialog">
          <span class="label wide">School</span><span class="stack"><span class="current"></span>${sizers(schools.map((s) => s.name))}</span>${ICON.caret}
        </button>
        <button type="button" class="shuffle" aria-label="Shuffle to a random school">${ICON.shuffle}<span class="wide">Shuffle</span></button>
        <button type="button" class="scheme" aria-pressed="false">${ICON.scheme}<span class="wide stack"><span class="scheme-text"></span>${sizers(['Light', 'Dark'])}</span></button>
        <a class="btn leave" href="/">${ICON.leave}<span class="wide">Leave</span></a>
      </div>
      <dialog aria-labelledby="bdl-schools-title">
        <div class="head">
          <h2 id="bdl-schools-title">The Portal</h2>
          <button type="button" class="close" aria-label="Close">Close</button>
        </div>
        <ul aria-label="All design schools">
          ${schools
            .map(
              (s: SchoolSummary) => `
            <li><a data-school="${escapeHtml(s.id)}" href="/t/${escapeHtml(s.id)}/">
              <span class="name">${escapeHtml(s.name)}</span>
              <span class="era">${escapeHtml(s.era)}</span>
              <span class="sig">${escapeHtml(s.signature)}</span>
            </a></li>`,
            )
            .join('')}
        </ul>
        <div class="foot">
          ${aboutHref ? `<a href="${escapeHtml(aboutHref)}">How these schools were built</a>` : ''}
          <a class="leave-foot" href="/">Leave for the regular site</a>
        </div>
      </dialog>
    `;

    const dialog = this.root.querySelector('dialog')!;
    const open = this.root.querySelector<HTMLButtonElement>('.open')!;
    open.addEventListener('click', () => this.openDialog());
    this.root.querySelector('.close')!.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close(); // backdrop click
    });

    for (const a of this.root.querySelectorAll<HTMLAnchorElement>('a[data-school]')) {
      a.addEventListener('click', (e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        dialog.close();
        if (a.getAttribute('aria-current') === 'page') return;
        this.markBusy(open); // the dialog is gone; the bar's school button stands for it
        navigate(a.href, { info: SWITCHER_INFO });
      });
    }

    // The row the visitor is reaching for is drawn ahead (not the one they
    // are on, which aria-current marks).
    drawOnIntent(dialog, (e) => {
      const a = (e.target as Element | null)?.closest?.('a[data-school]');
      return a instanceof HTMLAnchorElement && a.getAttribute('aria-current') !== 'page' ? new URL(a.href).pathname : null;
    });

    const shuffle = this.root.querySelector<HTMLButtonElement>('.shuffle')!;
    const primeShuffle = () => {
      const here = this.here();
      const pick = this.pickShuffle();
      if (here && pick) warmPages([pagePath(here.page, pick)]);
    };
    shuffle.addEventListener('pointerenter', primeShuffle);
    shuffle.addEventListener('focus', primeShuffle);
    drawOnIntent(shuffle, () => {
      const here = this.here();
      const pick = this.pickShuffle();
      return here && pick ? pagePath(here.page, pick) : null;
    });
    shuffle.addEventListener('click', () => {
      const here = this.here();
      const pick = this.pickShuffle();
      if (!here || !pick) return;
      this.shufflePick = null;
      this.markBusy(shuffle);
      navigate(pagePath(here.page, pick), { history: 'replace', info: SWITCHER_INFO });
    });

    this.root.querySelector('.scheme')!.addEventListener('click', () => {
      setScheme(currentScheme() === 'light' ? 'dark' : 'light');
      this.update();
    });

    document.addEventListener('astro:page-load', () => {
      this.clearBusy();
      this.shufflePick = null; // picked against the page just left
      this.update();
      // A visitor shuffling again and again stays on the button: pick and warm the next one now.
      if (shuffle.matches(':hover') || this.root.activeElement === shuffle) primeShuffle();
    });
    // A school change can be abandoned: another navigation takes over (its
    // signal aborts), or the page is left by a full load and later restored
    // from the back/forward cache.
    document.addEventListener('astro:before-preparation', (event) => {
      const e = event as TransitionBeforePreparationEvent;
      const mark = this.busy;
      if (mark && e.info === SWITCHER_INFO) e.signal.addEventListener('abort', () => this.clearBusy(mark), { once: true });
      // A navigation the dialog did not start (Back, Forward, any other
      // link) closes it before the old page is captured: the visitor did not
      // choose the next page from it, and a modal left open would ride the
      // swap in the old page's snapshot.
      if (dialog.open) dialog.close();
    });
    // Where Element.moveBefore is missing (Safari, older Firefox), the router
    // moves this element with appendChild, which drops focus from the control
    // inside it, and Astro's focus restore then calls focus() on the host,
    // which cannot take it. Put focus back on the control that had it.
    let refocus: HTMLElement | null = null;
    document.addEventListener('astro:before-swap', () => {
      refocus = this.root.activeElement as HTMLElement | null;
    });
    document.addEventListener('astro:after-swap', () => {
      const control = refocus;
      refocus = null;
      const lost = document.activeElement === null || document.activeElement === document.body;
      if (control && lost && this.root.contains(control)) control.focus({ preventScroll: true });
    });
    window.addEventListener('pageshow', (e) => {
      if (e.persisted) this.clearBusy();
    });
    // The quiet school has its own header toggle; stay in step with it.
    new MutationObserver(() => this.update()).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-scheme'],
    });

    this.root.querySelector('.prompt .go')!.addEventListener('click', () => {
      this.dismissPrompt();
      // Open from the bar's own button, so closing the dialog hands focus back
      // to it rather than to a prompt that is gone (Safari never focuses a
      // clicked button, so this cannot rely on the prompt having had focus).
      open.focus({ preventScroll: true });
      this.openDialog();
    });
    this.root.querySelector('.prompt .dismiss')!.addEventListener('click', () => this.dismissPrompt());
    // Escape dismisses the prompt, as it closes the dialog.
    this.root.querySelector('.prompt')!.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Escape') this.dismissPrompt();
    });
    if (!promptDismissed()) this.showPrompt();
  }

  private openDialog() {
    const dialog = this.root.querySelector('dialog')!;
    this.update();
    if (!dialog.open) dialog.showModal();
    const here = dialog.querySelector<HTMLElement>('a[aria-current="page"]');
    here?.focus({ preventScroll: true });
    // Only the list scrolls, and only as far as the visitor's row needs
    // (focus() alone may centre it).
    here?.scrollIntoView({ block: 'nearest' });
    this.warmOthers();
  }

  /** Every other school's same page, the next rooms along the walk first. */
  private warmOthers() {
    const here = this.here();
    if (!here) return;
    const { schools } = readPortalData();
    const at = schools.findIndex((s) => s.id === here.theme);
    const next = [...schools.slice(at + 1), ...schools.slice(0, Math.max(at, 0))].filter((s) => s.id !== here.theme);
    warmPages(next.map((s) => pagePath(here.page, s.id)));
  }

  /** Shuffle's school: the one already picked for this page, or a new random other school. */
  private pickShuffle(): string | null {
    const here = this.here();
    if (!here) return null;
    if (this.shufflePick && this.shufflePick !== here.theme) return this.shufflePick;
    const others = readPortalData().schools.filter((s) => s.id !== here.theme);
    if (others.length === 0) return null;
    this.shufflePick = others[Math.floor(Math.random() * others.length)].id;
    return this.shufflePick;
  }

  /** Painted at the click, so the visitor has an answer before the page starts to change. */
  private markBusy(control: HTMLElement) {
    this.clearBusy();
    this.busy = { control };
    control.setAttribute('aria-busy', 'true');
  }

  /** Clears the busy state; given a mark, only if that mark is still the current one. */
  private clearBusy(mark: { control: HTMLElement } | null = this.busy) {
    if (!mark || this.busy !== mark) return;
    mark.control.removeAttribute('aria-busy');
    this.busy = null;
  }

  /**
   * Until the visitor's first tap: on the prompt, its dismiss control or any
   * switcher control (or Escape on the prompt). Navigating and reloading do
   * not count; the prompt rides every swap inside the persisted switcher,
   * which holds still, and comes back on a reload until it has been tapped.
   */
  private showPrompt() {
    this.promptOff = new AbortController();
    const { signal } = this.promptOff;
    // Any switcher control counts as the first move. Capture, so the prompt
    // is gone before the control's own handler runs.
    this.root.querySelector('.bar')!.addEventListener('click', () => this.dismissPrompt(), { capture: true, signal });
    const prompt = this.root.querySelector<HTMLElement>('.prompt')!;
    // Once the arrival and the pulses have run, switch them off, so a
    // reinsertion (see the .arrived rule) cannot replay them.
    prompt.addEventListener(
      'animationend',
      (e) => {
        if (e.target === prompt) prompt.classList.add('arrived');
        else (e.target as HTMLElement).classList.add('pulsed');
      },
      { signal },
    );
    prompt.hidden = false;
  }

  private dismissPrompt() {
    if (!this.promptOff) return;
    this.promptOff.abort();
    this.promptOff = null;
    rememberPromptDismissed();
    const prompt = this.root.querySelector<HTMLElement>('.prompt')!;
    const hadFocus = prompt.contains(this.root.activeElement);
    prompt.hidden = true;
    if (hadFocus) this.root.querySelector<HTMLElement>('.open')!.focus({ preventScroll: true });
  }

  /** Sync every label and href to the page the visitor is on now. */
  update() {
    if (!this.built) return;
    const here = this.here();
    const { schools } = readPortalData();
    const current = schools.find((s) => s.id === here?.theme);
    this.root.querySelector('.current')!.textContent = current?.name ?? '';
    this.root.querySelector('.open')!.setAttribute('aria-label', `School: ${current?.name ?? 'unknown'}. Choose another design school`);

    const light = currentScheme() === 'light';
    const scheme = this.root.querySelector('.scheme')!;
    scheme.setAttribute('aria-pressed', String(light));
    scheme.setAttribute('aria-label', light ? 'Switch to dark' : 'Switch to light');
    this.root.querySelector('.scheme-text')!.textContent = light ? 'Light' : 'Dark';

    const rootHref = here ? rootPathFor(here.page) : '/';
    for (const a of this.root.querySelectorAll<HTMLAnchorElement>('.leave, .leave-foot')) a.href = rootHref;
    this.root.querySelector('.leave')!.setAttribute('aria-label', 'Leave the portal for this page on the regular site');

    for (const a of this.root.querySelectorAll<HTMLAnchorElement>('a[data-school]')) {
      const id = a.dataset.school!;
      a.href = here ? pagePath(here.page, id) : `/t/${id}/`;
      if (id === here?.theme) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }
  }
}

if (!customElements.get('bdl-switcher')) customElements.define('bdl-switcher', BdlSwitcher);
