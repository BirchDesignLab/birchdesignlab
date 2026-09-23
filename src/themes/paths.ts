/**
 * URLs for the five business pages, on the root site and inside a school.
 *
 * Root links keep the exact hrefs the root pages have always used (no
 * trailing slash), because the theme-schools work promises those pages are
 * untouched. Portal links always carry the trailing slash: ClientRouter
 * fetches the href as written, and a slashless one would cost a redirect
 * hop on every navigation.
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
  about: '/about',
  services: '/services',
  contact: '/contact',
  sent: '/contact/sent/',
};

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
  const m = /^\/t\/([a-z][a-z0-9-]{0,31})\/(.*)$/.exec(pathname);
  if (!m) return null;
  const rest = m[2].replace(/\/+$/, '');
  const page = (Object.keys(SEGMENT) as PageId[]).find((p) => SEGMENT[p] === rest);
  return page ? { theme: m[1], page } : null;
}

/** getStaticPaths entries for one school's `[...page].astro` route. */
export function schoolStaticPaths(): { params: { page: string | undefined }; props: { page: PageId } }[] {
  return PAGE_IDS.map((page) => ({ params: { page: SEGMENT[page] || undefined }, props: { page } }));
}

/** Link targets copy can name: the pages, plus two that leave the school. */
export function hrefFor(target: PageId | 'lab' | 'privacy', theme?: string): string {
  if (target === 'lab') return theme ? '/lab/' : '/lab';
  if (target === 'privacy') return theme ? '/privacy/' : '/privacy';
  return pagePath(target, theme);
}
