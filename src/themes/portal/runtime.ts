/**
 * The /t/ portal runtime: everything that keeps the site whole while the
 * router swaps one school's page for another's (spec §4). Imported once by
 * PortalLayout; module scripts run once per hard load, so every listener here
 * is registered exactly once and does per-navigation work in the events.
 *
 * - before-preparation: remember the scroll position when the visitor changes
 *   school on the same page, and warm the destination school's fonts before
 *   the new page is swapped in (F022), capped so a slow font never stalls a
 *   navigation.
 * - before-swap: carry the scheme, the .js marker and .reveal-on onto the
 *   incoming document. The router replaces every <html> attribute with the
 *   new document's, and the inline bootstrap never runs again (F001).
 * - page-load: restore the proportional scroll position (school switches),
 *   move focus into the page (link navigations), and count a pageview for
 *   Zaraz on client-side navigations only (the edge already counted the
 *   first load).
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

export function initPortal(): void {
  if (window.__bdlPortal) return;
  window.__bdlPortal = true;

  let pendingScrollRatio: number | null = null;
  let fromSwitcher = false;
  let firstLoad = true;

  document.addEventListener('astro:before-preparation', (event) => {
    const e = event as TransitionBeforePreparationEvent;
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
    if (to && to.theme !== from?.theme) {
      const school = readSchools().find((s) => s.id === to.theme);
      if (school && school.preload.length) {
        const original = e.loader;
        const fonts = preloadFonts(school.preload);
        e.loader = async () => {
          await Promise.all([original(), fonts]);
        };
      }
    }
  });

  document.addEventListener('astro:before-swap', (event) => {
    const e = event as TransitionBeforeSwapEvent;
    const next = e.newDocument.documentElement;
    next.setAttribute(SCHEME_ATTR, currentScheme());
    next.classList.add('js');
    if (document.documentElement.classList.contains('reveal-on')) next.classList.add('reveal-on');
    const fromTheme = document.documentElement.dataset.theme;
    if (fromTheme) next.dataset.fromTheme = fromTheme;
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
