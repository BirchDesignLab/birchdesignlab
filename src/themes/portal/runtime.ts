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
 *   At the same moment, take the departing wordmark out of the morph when
 *   less than half of it is on screen (the header scrolls away with the
 *   page, so on a swap clicked from low down a page its box is above the
 *   viewport and the new wordmark would morph down from off screen): its
 *   name is set to none inline, so it is drawn as part of whatever holds it
 *   in the old capture (the root, or the school's named header on an
 *   in-school swap). Every navigation gives the name back first and decides
 *   again, so an aborted one never carries it into the next swap.
 * - before-swap: carry the scheme, the .js marker and .reveal-on onto the
 *   incoming document. The router replaces every <html> attribute with the
 *   new document's, and the inline bootstrap never runs again (F001). Mark
 *   it data-from-theme=<departing school> for the arrival choreography, and
 *   clear that once the transition has finished, so a page at rest names no
 *   chrome whichever way the visitor arrived (a view-transition-name makes
 *   an element a stacking context and a backdrop root even at rest).
 *   When the departing wordmark was taken out of the morph, take the
 *   incoming one out too, so it has no pseudo-element of its own to wait
 *   on and appears exactly when its page (or held header) does. Its name
 *   comes back when that transition finishes, is skipped or fails, or when
 *   the next navigation starts, whichever is first, so no page keeps an
 *   unnamed wordmark into its own next swap.
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
 *
 * Drawing ahead (tier3-stage2/freeze-investigation.md): on a first arrival
 * the swap holds still while the GPU compiles a program for every new kind
 * of paint the page draws, up to about 450 ms. So when the visitor reaches
 * for a page (a mouse or a keyboard focus resting on its row in the
 * switcher's dialog or on Shuffle; never a press), a script-less copy
 * of it is drawn over the current page at opacity 0.001 (a quarter of an
 * 8-bit level: no pixel moves) until its first frame is on screen, then
 * removed. The programs stay compiled for the browser session, and the real
 * page's first draw reuses them. One copy at a time, only the page reached
 * for, never during an arrival, and taken down the moment a navigation
 * begins (a rest still being timed then is dropped). Drawing a copy holds
 * the page underneath for up to about 250 ms (the freeze, moved earlier),
 * so it is only done on the switcher's own controls, where the visitor is
 * already changing school; a link in the page is not drawn ahead.
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
  /** The HTML, once its files are in the HTTP cache too, so a copy drawn
      ahead loads nothing from the network. */
  ready: string | null;
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
  const entry: Warmed = {
    html: Promise.resolve(null),
    at: performance.now(),
    htmlIn: false,
    ready: null,
    abort: new AbortController(),
  };
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
    entry.ready = html;
    if (drawWanted?.key === key) void drawWanted.go(html);
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
 * Drawing ahead (header comment), on intent only. A copy of the page the
 * visitor then opens is the swap's own work done earlier; a copy of any
 * other page is work in the way of the swap (measured: a pick made while
 * another school's copy is drawn answers up to about 250 ms later). So only
 * the one page the visitor is reaching for is drawn, never a list. A page is
 * drawn at most once per hard load: the GPU keeps what it compiled.
 */
const drawnAhead = new Set<string>();
/** The page reached for last, drawn once its HTML is in hand. */
let drawWanted: { key: string; html: string | null; go: (html: string) => Promise<void> } | null = null;
/** The copy on screen, removed the moment a navigation begins. */
let copy: HTMLIFrameElement | null = null;
/** A navigation has begun and its page has not landed yet (stopDrawingAhead
    to resumeDrawingAhead). Nothing is drawn meanwhile: a link named then was
    named against the page being left, and a copy drawn into the load is
    swapped out with the old body (review code-1, 09-24-26: the mouse
    reaching Shuffle during a slow load drew a copy there, and the lost copy
    blocked drawing ahead for 3 s). */
let navigating = false;
/** Changes whenever a navigation begins or lands, so a rest timed in one
    stretch knows it is stale in the next. */
let epoch = 0;
/** How long a mouse pointer rests on a link before its page is drawn, so
    browsing the list draws nothing (the founder's call, 09-24-26). Measured
    with the pointer moved down the switcher's rows (draw-ahead-rest.mjs):
    a rest draws every row the pointer stays on at least as long, so 300 ms
    draws all six at 300 ms a row, and 400 ms is the shortest tried that
    draws none at 150 to 350 ms a row, a reading pace (about 250 ms) with a
    margin. Each copy drawn holds the dialog for about 170 to 250 ms. The
    price: a copy needs about 500 ms before the click to pay in full
    (grandmillennial's hold 374 to about 45 ms), so a visitor who rests less
    than about 900 ms before clicking gains less, nothing below about
    500 ms, and a click 100 to 200 ms into a copy waits for it (up to about
    100 ms). */
const DRAW_DWELL_MS = 400;
/** The same for keyboard focus, longer: tabbing down the list at a reading
    pace stops on every row, and each copy drawn holds the dialog (about 170
    to 250 ms, as above), so only a focus the visitor stays on draws. */
const FOCUS_DWELL_MS = 500;
/** How long a copy stays up once its first frame is on screen, so tiles just
    past the viewport are drawn too. */
const COPY_HOLD_MS = 100;
/** Never wait on a copy longer than this (a frame that never comes: a hidden
    tab, a stalled GPU). */
const COPY_MAX_MS = 3000;
/** What the copy must not do: a backdrop filter drawn over the page makes
    Chrome draw the page's own text without subpixel antialiasing while it is
    up (glassmorphism's panels, measured). The blur is cheap to compile at the
    swap; the rest of the page is not. */
const COPY_STYLE = '*,::before,::after{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}';

const nextFrames = (n: number): Promise<void> =>
  new Promise((resolve) => {
    const step = () => (--n > 0 ? requestAnimationFrame(step) : resolve());
    requestAnimationFrame(step);
  });

/** The page as it will arrive, with nothing that runs or loads on its own:
    no scripts, no preloads, the scheme and the .js marker the swap carries
    over (not .reveal-on, which would hide every block a script reveals). */
function copyOf(key: string, html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, noscript, link:not([rel~="stylesheet"])').forEach((el) => el.remove());
  const base = doc.createElement('base');
  base.href = key;
  doc.head.insertBefore(base, doc.head.firstChild); // not prepend(): the Workers types shadow it
  const style = doc.createElement('style');
  style.textContent = COPY_STYLE;
  doc.head.appendChild(style);
  doc.documentElement.setAttribute(SCHEME_ATTR, currentScheme());
  doc.documentElement.classList.add('js');
  return `<!DOCTYPE html>${doc.documentElement.outerHTML}`;
}

function removeCopy(): void {
  copy?.remove();
  copy = null;
}

/** Draw one copy until its first frame is on screen; false if it was
    stopped (a navigation began, the tab was hidden). */
async function drawCopy(key: string, html: string): Promise<boolean> {
  const f = document.createElement('iframe');
  // Same origin, so its stylesheets and fonts come from the HTTP cache; no
  // allow-scripts, so nothing in it runs.
  f.setAttribute('sandbox', 'allow-same-origin');
  f.setAttribute('aria-hidden', 'true');
  f.setAttribute('tabindex', '-1');
  f.inert = true;
  f.style.cssText =
    'position:fixed;left:0;top:0;width:100%;height:100%;border:0;margin:0;padding:0;' +
    'opacity:0.001;pointer-events:none;z-index:2147483647';
  const loaded = new Promise<void>((resolve) => f.addEventListener('load', () => resolve(), { once: true }));
  f.srcdoc = copyOf(key, html);
  copy = f;
  document.body.appendChild(f);
  const up = () => copy === f && document.visibilityState === 'visible';
  const done = (async () => {
    await loaded;
    const win = f.contentWindow;
    const root = f.contentDocument?.documentElement;
    if (!up() || !win || !root) return;
    // Where the swap will put the visitor (a school change keeps the same
    // spot on the page, any other link opens at the top), so the copy draws
    // the same part of it.
    const same = pageFromPath(location.pathname)?.page === pageFromPath(new URL(key).pathname)?.page;
    const room = document.documentElement.scrollHeight - innerHeight;
    const ratio = same && room > 0 ? scrollY / room : 0;
    win.scrollTo(0, Math.round(ratio * Math.max(root.scrollHeight - win.innerHeight, 0)));
    await f.contentDocument?.fonts.ready;
    // A frame is presented only once the copy's tiles are drawn, which is
    // when the GPU has compiled what they need.
    if (up()) await nextFrames(3);
    if (up()) await new Promise((resolve) => setTimeout(resolve, COPY_HOLD_MS));
  })();
  await Promise.race([done, new Promise((resolve) => setTimeout(resolve, COPY_MAX_MS))]);
  const whole = up();
  if (copy === f) removeCopy();
  else f.remove();
  return whole;
}

/**
 * Draw `path` ahead of time: the visitor is reaching for it. Warms it first
 * when it is not warm (warmPages()'s rules: never in dev, never for
 * Save-Data or 2G). Replaces an earlier wish that has not started drawing;
 * never draws the page the visitor is on, over another copy, while a
 * navigation loads, during an arrival or in a hidden tab.
 */
export function drawAheadOf(path: string): void {
  if (import.meta.env.DEV || frugal() || navigating) return;
  const key = keyOf(path);
  if (key === keyOf(location.href) || drawnAhead.has(key) || drawWanted?.key === key) return;
  const wish: NonNullable<typeof drawWanted> = {
    key,
    html: null,
    go: async (html: string) => {
      wish.html = html;
      // One copy at a time: the one up now hands over when it is done.
      if (drawWanted !== wish || copy) return;
      // An arrival holds data-from-theme until its transition has finished.
      while (document.documentElement.dataset.fromTheme && drawWanted === wish) await nextFrames(6);
      if (drawWanted !== wish || copy || document.visibilityState !== 'visible') return;
      if (await drawCopy(key, html)) drawnAhead.add(key);
      if (drawWanted === wish) drawWanted = null;
      const next = drawWanted && (drawWanted.html ?? warmed.get(drawWanted.key)?.ready);
      if (drawWanted && next) void drawWanted.go(next);
    },
  };
  drawWanted = wish;
  const ready = warmed.get(key)?.ready;
  if (ready) void wish.go(ready);
  else warmPages([path]);
}

/**
 * Draw ahead the page a link opens when the visitor reaches for it: a mouse
 * pointer once it has rested on the link DRAW_DWELL_MS (so sweeping across a
 * list draws nothing), keyboard focus once it has stayed FOCUS_DWELL_MS (so
 * tabbing through one draws nothing).
 * `pathOf` names the page the event's link opens, or null for one that is
 * not drawn ahead. `draw` is drawAheadOf, taken as an argument so the
 * founder's rules below can be tested without a browser
 * (tests/draw-on-intent.test.ts).
 *
 * A press draws nothing (the founder's call, 09-24-26). It comes only about
 * 0.1 s before the click, and a copy parses and lays out its page in one
 * block, so the click waits behind it: measured from the release on the live
 * build (harness/draw-ahead-press.mjs), a press 60 or 100 ms ahead was worse
 * or even almost everywhere, glassmorphism 193 to 361 ms on a dark desktop
 * and cottagecore 336 to 445 on a phone. Touch therefore never draws ahead.
 */
export function drawOnIntent(
  target: EventTarget,
  pathOf: (e: Event) => string | null,
  draw: (path: string) => void = drawAheadOf,
): void {
  let rest: ReturnType<typeof setTimeout> | undefined;
  let at: string | null = null;
  let seen = epoch;
  const settle = (path: string | null, dwell = DRAW_DWELL_MS) => {
    // The link remembered belongs to before a navigation began or landed:
    // forget it, so the same link on the new page is timed afresh.
    if (seen !== epoch) {
      clearTimeout(rest);
      at = null;
      seen = epoch;
    }
    if (path === at) return;
    clearTimeout(rest);
    at = path;
    // No rest is timed while a navigation loads (see `navigating`). One still
    // being timed when a navigation begins (a click before it was reached)
    // must not draw into it either: measured, a copy started just after the
    // click held glassmorphism's arrival about 460 ms. A pointer left still
    // on Shuffle through a swap draws nothing until it moves: a visitor
    // shuffling again and again must not meet a copy mid-draw at the click
    // (the press trigger's lesson).
    if (!path || navigating) return;
    const leg = epoch;
    rest = setTimeout(() => leg === epoch && draw(path), dwell);
  };
  const leave = (e: Event) => {
    // Crossing from one part of a link to another (a row's name to its era)
    // is not leaving it, and must not start the rest again.
    const from = (e.target as Element | null)?.closest?.('a, button');
    const to = (e as PointerEvent | FocusEvent).relatedTarget;
    if (from && to instanceof Node && from.contains(to)) return;
    if (pathOf(e) === at) settle(null);
  };
  target.addEventListener('pointerover', (e) => {
    if ((e as PointerEvent).pointerType === 'mouse') settle(pathOf(e));
  });
  target.addEventListener('pointerout', leave);
  target.addEventListener('focusin', (e) => settle(pathOf(e), FOCUS_DWELL_MS));
  target.addEventListener('focusout', leave);
}

/** A navigation has begun: take the copy down before the old page is
    captured, and draw nothing more until the next page lands. */
function stopDrawingAhead(): void {
  navigating = true;
  epoch++;
  drawWanted = null;
  removeCopy();
}

/** Drawing ahead may start again, from fresh rests. A no-op unless a
    navigation was under way. */
function resumeDrawingAhead(): void {
  if (!navigating) return;
  navigating = false;
  epoch++;
  removeCopy();
}

/*
 * When a navigation is over, told by the router's events (initPortal wires
 * them; tests/draw-on-intent.test.ts drives them with plain AbortSignals).
 * Only the latest navigation's landing resumes drawing ahead. Astro's
 * router (router.js) can end a navigation four ways, and the review of the
 * first fix (09-24-26, harness/draw-ahead-nav-code-probe.mjs) found the
 * first two missed:
 * - aborted with nothing after it: a same-page hash link (every header's
 *   skip link) or a Back to the same page's entry aborts a loading
 *   navigation and starts none, so no page lands. The abort resumes, unless
 *   a navigation that replaced it has begun: transition() aborts the old one
 *   and dispatches the new one's astro:before-preparation in one synchronous
 *   stretch, before the queued microtask runs;
 * - landed, but not the latest: a Back or a click during the old page's
 *   capture lets the first navigation swap while the second still loads.
 *   Its after-swap and page-load must not resume (a copy would be drawn
 *   into the second's load); the second's landing does;
 * - refused (the preparation prevented, not aborted): the router falls back
 *   to a full load, which unloads the page; if it does not (the visitor
 *   stops it), drawing ahead resumes rather than stay off;
 * - restored from the back/forward cache mid-navigation: resumes.
 */
/** The latest navigation begun, and whether the swap under way is its own. */
let latestNavigation: AbortSignal | null = null;
let swapIsLatest = false;

/** astro:before-preparation. */
export function navigationBegan(signal: AbortSignal): void {
  latestNavigation = signal;
  swapIsLatest = false;
  stopDrawingAhead();
  signal.addEventListener(
    'abort',
    () =>
      queueMicrotask(() => {
        if (latestNavigation === signal) resumeDrawingAhead();
      }),
    { once: true },
  );
}

/** astro:before-swap: the swap about to happen, and whether it is the latest navigation's. */
export function swapBegan(signal: AbortSignal): void {
  swapIsLatest = signal === latestNavigation && !signal.aborted;
}

/** astro:after-swap, and astro:page-load as a safety net. */
export function navigationLanded(): void {
  if (swapIsLatest) resumeDrawingAhead();
}

/** A refused preparation (its loader prevented it, not an abort). */
export function navigationRefused(signal: AbortSignal): void {
  if (signal === latestNavigation && !signal.aborted) resumeDrawingAhead();
}

/** pageshow from the back/forward cache: whatever was under way is gone. */
export function pageRestored(): void {
  latestNavigation = null;
  swapIsLatest = false;
  resumeDrawingAhead();
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

/**
 * The departing wordmark and the view-transition names a swap captures
 * (header comment, before-preparation). Half on screen is the line: above
 * it, the old image is mostly in view and the morph starts from where the
 * visitor saw the mark; below it, most of the old image is off screen and
 * the morph reads as a drop from above. A wordmark at the top of an
 * unscrolled page is wholly in view, so arrivals and in-school swaps from
 * the top keep their morph and crossfade exactly.
 */
let unnamedMark: HTMLElement | null = null;
/** The arriving wordmark, unnamed for its swap when the departing one was
    (header comment, before-swap). Kept apart from unnamedMark so the end of
    one transition never renames a mark the next navigation has unnamed. */
let unnamedArrival: HTMLElement | null = null;

function renameWordmark(): void {
  unnamedMark?.style.removeProperty('view-transition-name');
  unnamedMark = null;
  renameArrival();
}

function renameArrival(): void {
  unnamedArrival?.style.removeProperty('view-transition-name');
  unnamedArrival = null;
}

/**
 * The rule Astro writes into an inline style for `transition:name="wordmark"`,
 * whose scope names the wordmark element. It is Astro's internal output, so
 * an Astro upgrade can change it; the built tests check every portal page
 * against this same pattern, because a miss here silently turns off the
 * scrolled-swap fix (the arriving wordmark keeps its name with no partner).
 */
export const WORDMARK_SCOPE = /\[data-astro-transition-scope="([^"]+)"\]\s*\{\s*view-transition-name:\s*wordmark\s*;/;

/**
 * The incoming page's wordmark, read from the scope Astro's inline style
 * names `wordmark` (the new document has no computed style yet). Every
 * portal page has exactly one transition:name element, but the style is
 * what makes it the wordmark.
 */
function arrivingWordmark(doc: Document): HTMLElement | null {
  for (const style of doc.querySelectorAll('style')) {
    const scope = WORDMARK_SCOPE.exec(style.textContent ?? '')?.[1];
    if (scope) return doc.querySelector<HTMLElement>(`[data-astro-transition-scope="${CSS.escape(scope)}"]`);
  }
  return null;
}

function unnameWordmarkOffScreen(): void {
  renameWordmark();
  // Astro marks every transition:name element with its scope (README, "Links").
  const mark = [...document.querySelectorAll<HTMLElement>('[data-astro-transition-scope]')].find(
    (el) => getComputedStyle(el).viewTransitionName === 'wordmark',
  );
  if (!mark) return;
  const r = mark.getBoundingClientRect();
  const area = r.width * r.height;
  if (area === 0) return; // not rendered, so not captured either
  const seenW = Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0));
  const seenH = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
  if (seenW * seenH * 2 >= area) return;
  mark.style.setProperty('view-transition-name', 'none');
  unnamedMark = mark;
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
    renameWordmark();
    navigationBegan(e.signal);
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
      if (e.defaultPrevented && !e.signal.aborted) navigationRefused(e.signal);
      // Set after the load, not before it: the old page stays unnamed while
      // the next one is fetched, and `e.to` is final after any redirect.
      // The router starts the view transition once this resolves (router.js,
      // transition()), so the wordmark is measured where the capture will
      // find it.
      const dest = pageFromPath(e.to.pathname);
      if (e.defaultPrevented || e.signal.aborted) return;
      if (dest) html.dataset.toTheme = dest.theme;
      unnameWordmarkOffScreen();
    };
  });

  document.addEventListener('astro:before-swap', (event) => {
    const e = event as TransitionBeforeSwapEvent;
    swapBegan(e.signal);
    // The old wordmark leaves with the old page. When it was taken out of
    // the morph, take the new one out too, before the router swaps it in
    // and the new state is captured (swap-functions.js keeps its inline
    // style), so it is drawn with its own page or held header.
    const leftMorph = unnamedMark !== null;
    unnamedMark = null;
    renameArrival();
    const mark = leftMorph ? arrivingWordmark(e.newDocument) : null;
    if (mark) {
      mark.style.setProperty('view-transition-name', 'none');
      unnamedArrival = mark;
    }
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
      // Unless a later navigation has given it back already (and perhaps
      // unnamed the page after this one).
      if (mark && unnamedArrival === mark) renameArrival();
    };
    vt?.finished.then(settle, settle);
  });

  document.addEventListener('astro:after-swap', navigationLanded);
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) pageRestored();
  });

  document.addEventListener('astro:page-load', () => {
    navigationLanded();
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
