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
 */
import { navigate } from 'astro:transitions/client';
import { currentScheme, setScheme } from '../../lib/scheme';
import { pagePath, pageFromPath, rootPathFor, type PageId } from '../paths';
import { readPortalData, type SchoolSummary } from './schools';
import { SWITCHER_INFO } from './runtime';

const STYLE = `
:host {
  --bg: #1c1a17; --raised: #272319; --ink: #f4f0e6; --muted: #b3ab9b; --accent: #a3bd8f;
  --line: rgba(244, 240, 230, 0.2);
  position: fixed; left: 50%; bottom: max(12px, env(safe-area-inset-bottom));
  transform: translateX(-50%); z-index: 2147483000;
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
.current { color: var(--ink); font-weight: 600; }
.icon { width: 16px; height: 16px; flex: none; }
.caret { width: 10px; height: 10px; flex: none; opacity: 0.7; }
/* Desktop: out of the way in the corner, clear of centred hero content (the
   quiet home pins its bark credit bottom-centre). Phones: centred, thumb reach. */
@media (min-width: 700px) {
  :host { left: auto; right: 16px; transform: none; }
}
@media (max-width: 560px) {
  .wide { display: none; }
  button, a.btn { padding: 0 12px; }
}
dialog {
  width: min(560px, calc(100vw - 24px)); max-height: min(78vh, 720px);
  margin: auto auto max(72px, calc(env(safe-area-inset-bottom) + 72px));
  padding: 0; border: 1px solid var(--line); background: var(--bg); color: var(--ink);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
}
dialog::backdrop { background: rgba(10, 9, 8, 0.55); }
.head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 18px; border-bottom: 1px solid var(--line); }
.head h2 { margin: 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.14em; color: var(--muted); }
.head button { min-height: 36px; padding: 0 10px; }
ul { list-style: none; margin: 0; padding: 6px 0; overflow: auto; max-height: calc(min(78vh, 720px) - 120px); }
li a {
  display: grid; grid-template-columns: 1fr auto; gap: 2px 12px; padding: 12px 18px;
  color: var(--ink); text-decoration: none; border-left: 2px solid transparent;
}
li a:hover { background: var(--raised); }
li a[aria-current='page'] { border-left-color: var(--accent); background: var(--raised); }
li .name { font-size: 15px; font-weight: 600; }
li .era { color: var(--muted); font-size: 12px; text-align: right; align-self: center; }
li .sig { grid-column: 1 / -1; color: var(--muted); font-size: 13px; line-height: 1.4; font-weight: 400; letter-spacing: 0; }
.foot { display: flex; flex-wrap: wrap; gap: 8px 18px; padding: 14px 18px; border-top: 1px solid var(--line); }
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
  caret:
    '<svg class="caret" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true"><path d="M1 3h8L5 8z"/></svg>',
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

class BdlSwitcher extends HTMLElement {
  private built = false;
  private root!: ShadowRoot;

  connectedCallback() {
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
      <div class="bar">
        <button type="button" class="open" aria-haspopup="dialog">
          <span class="label wide">School</span><span class="current"></span>${ICON.caret}
        </button>
        <button type="button" class="shuffle" aria-label="Shuffle to a random school">${ICON.shuffle}<span class="wide">Shuffle</span></button>
        <button type="button" class="scheme" aria-pressed="false">${ICON.scheme}<span class="wide scheme-text"></span></button>
        <a class="btn leave" href="/">${ICON.leave}<span class="wide">Leave</span></a>
      </div>
      <dialog aria-labelledby="bdl-schools-title">
        <div class="head">
          <h2 id="bdl-schools-title">Design schools</h2>
          <button type="button" class="close" aria-label="Close">Close</button>
        </div>
        <ul>
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
    this.root.querySelector('.open')!.addEventListener('click', () => {
      this.update();
      dialog.showModal();
      (dialog.querySelector('a[aria-current="page"]') as HTMLElement | null)?.focus();
    });
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
        navigate(a.href, { info: SWITCHER_INFO });
      });
    }

    this.root.querySelector('.shuffle')!.addEventListener('click', () => {
      const here = this.here();
      const others = schools.filter((s) => s.id !== here?.theme);
      if (!here || others.length === 0) return;
      const pick = others[Math.floor(Math.random() * others.length)];
      navigate(pagePath(here.page, pick.id), { history: 'replace', info: SWITCHER_INFO });
    });

    this.root.querySelector('.scheme')!.addEventListener('click', () => {
      setScheme(currentScheme() === 'light' ? 'dark' : 'light');
      this.update();
    });

    document.addEventListener('astro:page-load', () => this.update());
    // The quiet school has its own header toggle; stay in step with it.
    new MutationObserver(() => this.update()).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-scheme'],
    });
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
