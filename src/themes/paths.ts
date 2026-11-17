/**
 * URLs for the five business pages, on the root site and inside a school.
 *
 * Every link carries the trailing slash. Astro builds directory-format pages,
 * so a slashless href costs a 307 hop on every click (root links were
 * slashless until 11-17-26 to keep root pages byte-stable during the
 * theme-schools work; that promise is retired). Portal links need it doubly:
 * ClientRouter fetches the href as written.
 */
export type PageId = 'home' | 'about' | 'services' | 'contact' | 'sent';
export const PAGE_IDS: readonly PageId[] = ['home', 'about', 'services', 'contact', 'sent'];

/** Path segment under a school, and under the root. */
const SEGMENT: Record<PageId, string> = {
  home: '',
  about: 'about',
  services: 'services',
  contact: 'contact',
  sent: 'contact/sent',
};

const ROOT_HREF: Record<PageId, string> = {
  home: '/',
  about: '/about/',
  services: '/services/',
  contact: '/contact/',
  sent: '/contact/sent/',
};

/** The shape of a school id: its directory name and its /t/<id>/ segment.
    The contact Worker validates the form's `return` field against it too. */
export const SCHOOL_ID = /^[a-z][a-z0-9-]{0,31}$/;

/** '/t/<theme>/' prefix, or '' on the root site. */
export function themePrefix(theme?: string): string {
  return theme ? `/t/${theme}` : '';
}

export function pagePath(page: PageId, theme?: string): string {
  if (!theme) return ROOT_HREF[page];
  const seg = SEGMENT[page];
  return `${themePrefix(theme)}/${seg ? `${seg}/` : ''}`;
}

/** The root page a school page mirrors, in canonical (trailing-slash) form. */
export function rootPathFor(page: PageId): string {
  const seg = SEGMENT[page];
  return seg ? `/${seg}/` : '/';
}

/** Inverse of pagePath for school routes. Null for anything that is not one. */
export function pageFromPath(pathname: string): { theme: string; page: PageId } | null {
  const m = /^\/t\/([^/]+)\/(.*)$/.exec(pathname);
  if (!m || !SCHOOL_ID.test(m[1])) return null;
  const rest = m[2].replace(/\/+$/, '');
  const page = (Object.keys(SEGMENT) as PageId[]).find((p) => SEGMENT[p] === rest);
  return page ? { theme: m[1], page } : null;
}

/** Whether a school nav link names the page being shown (for aria-current).
    An exact page match, not a path prefix: /t/<id>/contact/sent/ is its own
    page, and Contact is not current there. */
export function isCurrent(target: PageId | 'lab' | 'privacy', pathname: string): boolean {
  return pageFromPath(pathname)?.page === target;
}

/** getStaticPaths entries for one school's `[...page].astro` route. */
export function schoolStaticPaths(): { params: { page: string | undefined }; props: { page: PageId } }[] {
  return PAGE_IDS.map((page) => ({ params: { page: SEGMENT[page] || undefined }, props: { page } }));
}

/** Link targets copy can name: the pages, plus two that leave the school. */
export function hrefFor(target: PageId | 'lab' | 'privacy', theme?: string): string {
  if (target === 'lab') return '/lab/';
  if (target === 'privacy') return '/privacy/';
  return pagePath(target, theme);
}
