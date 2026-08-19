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
 *
 * Name and description come from site.ts, the single source of truth shared
 * with the home-page meta.
 */

import { SITE_NAME, SITE_DESCRIPTION } from './site';

export interface OrganizationJsonLd {
  '@context': 'https://schema.org';
  '@type': 'Organization';
  name: string;
  url: string;
  logo: string;
  description: string;
}

export function buildOrganization(site: URL | string): OrganizationJsonLd {
  const base = typeof site === 'string' ? new URL(site) : site;
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: new URL('/', base).href,
    logo: new URL('/og/logo.png', base).href,
    description: SITE_DESCRIPTION,
  };
}

export interface ServiceJsonLd {
  '@context': 'https://schema.org';
  '@type': 'Service';
  name: string;
  serviceType: string[];
  url: string;
  description: string;
  provider: { '@type': 'Organization'; name: string; url: string };
}

/**
 * Service node for the /services page. Plain `Service` (not the LocalBusiness
 * subtype ProfessionalService) deliberately: it has no required properties,
 * expects no address, and produces no rich result to warn about. Its value is
 * an entity/answer-engine signal naming the two offerings and attributing them
 * to the Organization, consistent with the founder-abstracted, no-local-intent
 * posture above.
 */
export function buildService(site: URL | string): ServiceJsonLd {
  const base = typeof site === 'string' ? new URL(site) : site;
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Custom software and websites',
    serviceType: ['Custom software', 'Custom websites'],
    url: new URL('/services', base).href,
    description: SITE_DESCRIPTION,
    provider: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: new URL('/', base).href,
    },
  };
}
