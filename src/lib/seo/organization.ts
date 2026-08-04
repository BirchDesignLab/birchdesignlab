/**
 * Organization structured data.
 *
 * Per Google's documentation this markup disambiguates the organization in
 * search results and feeds the knowledge-panel logo. It is not a ranking
 * factor and no rich result is guaranteed. Organization has no required
 * properties, so a small honest block carries no penalty.
 *
 * Deliberately absent: `founder`, `address`, `telephone`. The founder stays
 * abstracted from the brand, and there is no local-search intent yet.
 *
 * `sameAs` is omitted rather than emitted empty. When the Birch Design Lab
 * accounts exist, add them as a string array here and the markup follows.
 */

export interface OrganizationJsonLd {
  '@context': 'https://schema.org';
  '@type': 'Organization';
  name: string;
  url: string;
  logo: string;
  description: string;
}

const NAME = 'Birch Design Lab';

/** External-facing copy: no emdashes. */
const DESCRIPTION =
  'A design lab building custom software and custom websites for businesses that want to grow.';

export function buildOrganization(site: URL | string): OrganizationJsonLd {
  const base = typeof site === 'string' ? new URL(site) : site;
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: NAME,
    url: new URL('/', base).href,
    logo: new URL('/og/logo.png', base).href,
    description: DESCRIPTION,
  };
}
