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
 * The two newest live, listed specimens: the home page's "From the lab"
 * lines. One query for every school, so they all show the same two.
 */
export async function featuredSpecimens(): Promise<CollectionEntry<'lab'>[]> {
  return (await getCollection('lab', ({ data }) => data.status === 'live' && !data.noindex))
    .sort((a, b) => b.data.designation.localeCompare(a.data.designation))
    .slice(0, 2);
}
