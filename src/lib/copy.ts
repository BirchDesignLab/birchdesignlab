import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { SITE_DESCRIPTION } from './seo/site';
import type { CopyEntry, CopyPage } from './copy-schema';
export { rich } from './rich';

/**
 * Page copy for the business pages, shared by the root site and every school
 * on /t/. Components never hardcode page text; they read it from here.
 */
export type CopyData<P extends CopyPage> = P extends 'home'
  ? Extract<CopyEntry, { page: 'home' }> & { description: string; opener: { lead: string; subline: string } }
  : Extract<CopyEntry, { page: P }>;

export async function getCopy<P extends CopyPage>(page: P): Promise<CopyData<P>> {
  const entry = await getEntry('copy', page);
  if (!entry) throw new Error(`copy collection has no entry "${page}" (src/content/copy/${page}.yaml)`);
  const data = entry.data as CopyEntry;
  if (data.page !== page) throw new Error(`src/content/copy/${page}.yaml declares page: ${data.page}`);
  if (data.page === 'home') {
    // The meta description and the opener subline are the site description,
    // single-sourced (F049).
    return {
      ...data,
      description: SITE_DESCRIPTION,
      opener: { ...data.opener, subline: SITE_DESCRIPTION },
    } as CopyData<P>;
  }
  return data as CopyData<P>;
}

/**
 * The three newest live, listed specimens: the home page's "From the lab"
 * lines. One query for every school, so they all show the same three.
 */
export async function featuredSpecimens(): Promise<CollectionEntry<'lab'>[]> {
  return (await getCollection('lab', ({ data }) => data.status === 'live' && !data.noindex))
    .sort((a, b) => b.data.designation.localeCompare(a.data.designation))
    .slice(0, 3);
}

/**
 * Where a Lab entry links: an experiment's own href when it has one (BDL-010
 * opens the portal at /t/quiet/), otherwise the entry's /lab/ page. The one
 * rule for the catalog cards and the home page's "From the lab" lines.
 *
 * Pass `theme` inside a school. The root site keeps its slashless convention
 * (like hrefFor('lab')); inside a school a /lab/ link carries the trailing
 * slash and `leaves` is true, so the caller adds data-astro-reload. An href
 * into the portal (/t/...) stays a router navigation, so it never leaves.
 */
export function specimenLink(entry: CollectionEntry<'lab'>, theme?: string): { href: string; leaves: boolean } {
  const own = entry.data.type === 'experiment' ? entry.data.href : undefined;
  const href = own ?? (theme ? `/lab/${entry.id}/` : `/lab/${entry.id}`);
  return { href, leaves: !!theme && !href.startsWith('/t/') };
}
