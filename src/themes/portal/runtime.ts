/**
 * The /t/ portal runtime: everything that keeps the site whole while the
 * router swaps one school's page for another's (spec §4). Imported once by
 * PortalLayout; module scripts run once per hard load, so every listener here
 * is registered exactly once and does per-navigation work in the events.
 *
 * - before-preparation: remember the scroll position when the visitor changes
 *   school on the same page, and warm the destination school's fonts before
 *   the new page is swapped in (F022), capped so a slow font never stalls a
 *   navigation. Once the new page has loaded, mark the departing <html> with
 *   data-to-theme=<destination school>, just before the view transition
 *   captures it (the naming contract, README: a school names its chrome only
 *   when both sides of the swap are that school). Every navigation clears it
 *   first, so a failed or non-school one leaves none, and the swap drops it
 *   with the rest of the old page's <html> attributes. When the switcher
 *   warmed the destination (below), load it from memory instead of the
 *   network, and stop only the warming the navigation made useless.
 * - before-swap: carry the scheme, the .js marker and .reveal-on onto the
 *   incoming document. The router replaces every <html> attribute with the
 *   new document's, and the inline bootstrap never runs again (F001). Mark
 *   it data-from-theme=<departing school> for the arrival choreography, and
 *   clear that once the transition has finished, so a page at rest names no
 *   chrome whichever way the visitor arrived (a view-transition-name makes
 *   an element a stacking context and a backdrop root even at rest).
 * - page-load: restore the proportional scroll position (school switches),
 *   move focus into the page (link navigations), and count a pageview for
 *   Zaraz on client-side navigations only (the edge already counted the
 *   first load).
 *
 * Warming (P4, tier3-stage1/p4-trace.md): the switcher calls warmPages() for
 * the pages a visitor is about to choose from (every other school's same page
 * when the dialog opens, the Shuffle pick on hover or focus). Each page's HTML
 * is kept in memory and its stylesheets (with the Latin fonts they load),
 * font preloads and module scripts are fetched into the HTTP cache, so the
 * switch pays no round trip. A plain
 * prefetch cannot do this: the site's HTML is max-age=0, must-revalidate, so
 * the router's own fetch would still go to the network.
 */
import { onMount } from '../../lib/lifecycle';
import { mountReveals } from '../../lib/reveal';
import { currentScheme, SCHEME_ATTR } from '../../lib/scheme';
import { pageFromPath } from '../paths';
import type { TransitionBeforePreparationEvent, TransitionBeforeSwapEvent } from 'astro:transitions/client';
import { readSchools } from './schools';

/** Navigations the switcher starts carry this in `info`, so focus stays on the switcher. */
export const SWITCHER_INFO = 'bdl-switcher';
const FONT_WAIT_MS = 600;

declare global {
  interface Window {
    __bdlPortal?: boolean;
    zaraz?: { spaPageview?: () => void };
  }
}

function preloadFonts(hrefs: string[]): Promise<void> {
  if (hrefs.length === 0) return Promise.resolve();
  const loads = hrefs.map(
    (href) =>
      new Promise<void>((resolve) => {
        const existing = document.head.querySelector(`link[rel="preload"][href="${CSS.escape(href)}"]`);
        if (existing) return resolve();
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'font';
        link.type = 'font/woff2';
        link.crossOrigin = 'anonymous';
        link.href = href;
        link.onload = () => resolve();
        link.onerror = () => resolve();
        document.head.appendChild(link); // not append(): the Workers types in tsconfig shadow it
      }),
  );
  const cap = new Promise<void>((resolve) => setTimeout(resolve, FONT_WAIT_MS));
  return Promise.race([Promise.all(loads).then(() => undefined), cap]);
}

/**
 * How long warmed HTML may stand in for a fetch: long enough to read the
 * school list, short enough that a deploy never serves an old page for long.
 * (An old page stays whole: its own stylesheets and scripts were warmed
 * with it, and /_astro/ files are immutable in the HTTP cache.)
 */
const WARM_MAX_AGE_MS = 120_000;
/** Astro's persist attribute (router.js), for the stylesheet check it makes. */
const PERSIST_ATTR = 'data-astro-transition-persist';

interface Warmed {
  /** The page's HTML, or null when it cannot be used (an error, a redirect, not HTML). */
  html: Promise<string | null>;
  /** When the HTML arrived (when it was asked for, until then). */
  at: number;
  /** Set once the HTML has arrived. From then on the entry is never dropped
      by a navigation: its bytes are paid for, and its files finish loading. */
  htmlIn: boolean;
  abort: AbortController;
}

const warmed = new Map<string, Warmed>();
const warmedFiles = new Set<string>();
let warmQueue: string[] = [];
let warming = false;

const keyOf = (url: URL | string): string => new URL(url, location.href).href.replace(/#.*/, '');

/** Save-Data and 2G visitors are not charged for pages they may never open (Astro's own rule). */
function frugal(): boolean {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return !!c && (c.saveData === true || /2g/.test(c.effectiveType ?? ''));
}

async function fetchPage(href: string, signal: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch(href, { signal });
    const type = (res.headers.get('content-type') ?? '').split(';', 1)[0].trim();
    if (!res.ok || res.redirected || type !== 'text/html') return null;
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * The Latin faces a stylesheet's @font-face rules load (Fontsource names its
 * files <family>-latin-<axis>-<style>.<hash>.woff2; latin-ext, cyrillic and
 * the rest stay for a page that needs them). A school preloads only its
 * display faces, rightly for a first load, so without this the body and mono
 * faces arrive a round trip after the page does.
 */
function latinFaces(css: string, cssUrl: string): string[] {
  const faces = css.match(/@font-face\s*\{[^}]*\}/g) ?? [];
  return faces
    .flatMap((face) => [...face.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)].map((m) => m[1]))
    .filter((src) => /-latin-(?!ext)[^/]*\.woff2$/.test(src))
    .map((src) => keyOf(new URL(src, cssUrl)));
}

/** Fetch the files a page will ask for into the HTTP cache: stylesheets and
    the Latin fonts they load, font preloads, module scripts. */
async function warmFiles(html: string, signal: AbortSignal): Promise<void> {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const have = new Set(
    [...document.querySelectorAll('link[href], script[src]')].map((el) =>
      keyOf(el.getAttribute('href') ?? el.getAttribute('src') ?? ''),
    ),
  );
  const fresh = (url: string) => !have.has(url) && !warmedFiles.has(url);
  const warm = async (url: string, isCss: boolean): Promise<void> => {
    warmedFiles.add(url);
    try {
      const res = await fetch(url, { signal });
      // Read to the end, so the cache entry is whole.
      if (!isCss || !res.ok) return void (await res.arrayBuffer());
      const fonts = latinFaces(await res.text(), url).filter(fresh);
      await Promise.all(fonts.map((font) => warm(font, false)));
    } catch {
      warmedFiles.delete(url);
    }
  };
  const pick = (selector: string) =>
    [...doc.querySelectorAll(selector)].map((el) => keyOf(el.getAttribute('href') ?? el.getAttribute('src') ?? '')).filter(fresh);
  const sheets = pick('head link[rel="stylesheet"][href]');
  const files = pick('head link[rel="preload"][as="font"][href], script[type="module"][src]');
  await Promise.all([...sheets.map((url) => warm(url, true)), ...files.map((url) => warm(url, false))]);
}

function warmOne(key: string): Promise<void> {
  const entry: Warmed = { html: Promise.resolve(null), at: performance.now(), htmlIn: false, abort: new AbortController() };
  entry.html = fetchPage(key, entry.abort.signal);
  warmed.set(key, entry);
  return entry.html.then(async (html) => {
    if (html === null) {
      if (warmed.get(key) === entry) warmed.delete(key);
      return;
    }
    entry.at = performance.now();
    entry.htmlIn = true;
    await warmFiles(html, entry.abort.signal);
  });
}

async function drainWarmQueue(): Promise<void> {
  if (warming) return;
  warming = true;
  try {
    // One page at a time, so a click mid-queue shares the line with one
    // download at most.
    for (let key = warmQueue.shift(); key !== undefined; key = warmQueue.shift()) {
      if (!warmed.has(key)) await warmOne(key);
    }
  } finally {
    warming = false;
  }
}

/**
 * Warm pages the visitor is about to choose from, most likely first. Already
 * warm pages are skipped; stale ones are fetched again.
 */
export function warmPages(paths: string[]): void {
  if (import.meta.env.DEV || frugal()) return;
  const now = performance.now();
  for (const [key, entry] of warmed) if (entry.htmlIn && now - entry.at > WARM_MAX_AGE_MS) warmed.delete(key);
  const fresh = paths.map(keyOf).filter((key) => !warmed.has(key));
  warmQueue = [...fresh, ...warmQueue.filter((key) => !fresh.includes(key))];
  void drainWarmQueue();
}

/**
 * The destination's warmed HTML, if it is fresh. The founder's call is to
 * pay for warming up front, so a navigation stops only warming that has
 * become useless:
 * - a school change keeps the visitor on the same page, and the next dialog
 *   asks for that same page in every other school, so warming for it carries
 *   on (queued and in flight alike);
 * - any other navigation drops the queue, and stops the one page whose HTML
 *   is still downloading, which frees the line for the new page;
 * - a page whose HTML has arrived is always kept, and its files finish.
 * The destination itself leaves the queue: the navigation fetches it.
 */
function takeWarmed(to: URL): Promise<string | null> | null {
  const dest = keyOf(to);
  const destPage = pageFromPath(to.pathname)?.page;
  const useful = (key: string) => !!destPage && pageFromPath(new URL(key).pathname)?.page === destPage;
  warmQueue = warmQueue.filter((key) => key !== dest && useful(key));
  for (const [key, entry] of warmed) {
    if (key === dest || entry.htmlIn || useful(key)) continue;
    entry.abort.abort();
    warmed.delete(key);
  }
  const entry = warmed.get(dest);
  if (!entry) return null;
  if (performance.now() - entry.at > WARM_MAX_AGE_MS) {
    if (!entry.htmlIn) entry.abort.abort(); // HTML still downloading after two minutes
    warmed.delete(dest);
    return null;
  }
  return entry.html;
}

/**
 * Astro 7.3.4's defaultLoader (router.js), with the HTML from memory: parse,
 * drop <noscript>, check the page takes client-side navigation, then preload
 * and await the stylesheets the current page lacks. Astro does not export
 * it, so an Astro upgrade must be checked against it. Anything unexpected
 * falls back to Astro's own loader, which fetches.
 */
async function loadWarmed(
  e: TransitionBeforePreparationEvent,
  html: Promise<string | null>,
  fallback: () => Promise<void>,
): Promise<void> {
  const text = await html;
  if (e.signal.aborted) return;
  if (text === null) return fallback();
  const doc = new DOMParser().parseFromString(text, 'text/html');
  doc.querySelectorAll('noscript').forEach((el) => el.remove());
  if (!doc.querySelector('[name="astro-view-transitions-enabled"]')) return fallback();
  e.newDocument = doc;
  const styles: Promise<void>[] = [];
  for (const el of doc.querySelectorAll('head link[rel=stylesheet]')) {
    const persist = el.getAttribute(PERSIST_ATTR);
    const href = el.getAttribute('href') ?? '';
    const present =
      (persist !== null && document.querySelector(`[${PERSIST_ATTR}="${CSS.escape(persist)}"]`)) ||
      document.querySelector(`link[rel=stylesheet][href="${CSS.escape(href)}"]`);
    if (present) continue;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.setAttribute('as', 'style');
    link.href = href;
    styles.push(
      new Promise<void>((resolve) => {
        link.onload = () => resolve();
        link.onerror = () => resolve();
        document.head.appendChild(link);
      }),
    );
  }
  if (styles.length && !e.signal.aborted) await Promise.all(styles);
}

export function initPortal(): void {
  if (window.__bdlPortal) return;
  window.__bdlPortal = true;

  let pendingScrollRatio: number | null = null;
  let fromSwitcher = false;
  let firstLoad = true;
  let arrival: ViewTransition | null = null;
  const html = document.documentElement; // the router keeps this element and swaps its attributes

  document.addEventListener('astro:before-preparation', (event) => {
    const e = event as TransitionBeforePreparationEvent;
    delete html.dataset.toTheme;
    fromSwitcher = e.info === SWITCHER_INFO;
    const from = pageFromPath(location.pathname);
    const to = pageFromPath(e.to.pathname);
    const sameSpotNewSchool = !!from && !!to && from.page === to.page && from.theme !== to.theme;
    if (sameSpotNewSchool && e.navigationType !== 'traverse') {
      const room = document.documentElement.scrollHeight - innerHeight;
      pendingScrollRatio = room > 0 ? scrollY / room : 0;
    } else {
      pendingScrollRatio = null;
    }
    const school = to && to.theme !== from?.theme ? readSchools().find((s) => s.id === to.theme) : undefined;
    const fonts = school?.preload.length ? preloadFonts(school.preload) : null;
    const hit = e.formData ? null : takeWarmed(e.to);
    const original = e.loader;
    const load = hit ? () => loadWarmed(e, hit, original) : original;
    e.loader = async () => {
      await Promise.all([load(), fonts]);
      // Set after the load, not before it: the old page stays unnamed while
      // the next one is fetched, and `e.to` is final after any redirect.
      const dest = pageFromPath(e.to.pathname);
      if (dest && !e.defaultPrevented && !e.signal.aborted) html.dataset.toTheme = dest.theme;
    };
  });

  document.addEventListener('astro:before-swap', (event) => {
    const e = event as TransitionBeforeSwapEvent;
    const next = e.newDocument.documentElement;
    next.setAttribute(SCHEME_ATTR, currentScheme());
    next.classList.add('js');
    if (html.classList.contains('reveal-on')) next.classList.add('reveal-on');
    const fromTheme = html.dataset.theme;
    if (fromTheme) next.dataset.fromTheme = fromTheme;
    // Only the transition that set it may clear it: a later navigation that
    // interrupts this one has its own arrival. (then, not finally: `finished`
    // rejects when the swap throws, and the router already reports that.)
    const vt = e.viewTransition;
    arrival = vt;
    const settle = () => {
      if (arrival === vt) delete html.dataset.fromTheme;
    };
    vt?.finished.then(settle, settle);
  });

  document.addEventListener('astro:page-load', () => {
    if (firstLoad) {
      firstLoad = false;
      return;
    }
    if (pendingScrollRatio !== null) {
      const room = document.documentElement.scrollHeight - innerHeight;
      scrollTo({ top: Math.round(pendingScrollRatio * Math.max(room, 0)), left: 0, behavior: 'instant' });
      pendingScrollRatio = null;
    }
    if (!fromSwitcher) {
      document.getElementById('main')?.focus({ preventScroll: true });
    }
    fromSwitcher = false;
    try {
      window.zaraz?.spaPageview?.();
    } catch {
      /* analytics must never break navigation */
    }
  });

  onMount(mountReveals);
}
