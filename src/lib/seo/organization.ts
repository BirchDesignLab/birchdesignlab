/**
 * Organization structured data.
 *
 * Per Google's documentation this markup disambiguates the organization in
 * search results and feeds the knowledge-panel logo. It is not a ranking
 * factor and no rich result is guaranteed.
 *
 * The home-page node is a `ProfessionalService`, a subtype of both
 * `LocalBusiness` and `Organization`. It was a plain `Organization` until
 * 08-28-26. The old reasoning was that there was no local-search intent, so a
 * LocalBusiness subtype would only invite address warnings. That premise
 * reversed when the positioning committed to the Mississippi Gulf Coast:
 * there is local intent now, and the subtype plus `areaServed` is the signal
 * that says so. One node, not two, so there is a single entity on the page.
 *
 * Known and accepted: Search Console's LocalBusiness report will flag a
 * missing `address`. `address` is not a required property in schema.org terms
 * and the node stays valid without it; what it costs is eligibility for the
 * local rich result, which a business with no public street address was never
 * going to earn anyway. The warning is cosmetic. Revisit if an address ever
 * becomes publishable.
 *
 * Deliberately absent: `founder`, `address`, `telephone`. The founder stays
 * abstracted from the brand.
 *
 * `sameAs` is omitted rather than emitted empty. When the Birch Design Lab
 * accounts exist, add them as a string array here and the markup follows.
 *
 * Name, description, and service area come from site.ts, the single source of
 * truth shared with the home-page meta.
 */

import { SITE_NAME, SITE_DESCRIPTION, SERVICE_AREA } from './site';

export interface AreaServedJsonLd {
  '@type': 'AdministrativeArea';
  name: string;
}

export interface OrganizationJsonLd {
  '@context': 'https://schema.org';
  '@type': 'ProfessionalService';
  name: string;
  url: string;
  logo: string;
  description: string;
  areaServed: AreaServedJsonLd;
}

function areaServed(): AreaServedJsonLd {
  return { '@type': 'AdministrativeArea', name: SERVICE_AREA };
}

export function buildOrganization(site: URL | string): OrganizationJsonLd {
  const base = typeof site === 'string' ? new URL(site) : site;
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: SITE_NAME,
    url: new URL('/', base).href,
    logo: new URL('/icon-512.png', base).href,
    description: SITE_DESCRIPTION,
    areaServed: areaServed(),
  };
}

export interface ServiceJsonLd {
  '@context': 'https://schema.org';
  '@type': 'Service';
  name: string;
  serviceType: string[];
  url: string;
  description: string;
  areaServed: AreaServedJsonLd;
  provider: { '@type': 'ProfessionalService'; name: string; url: string };
}

/**
 * Service node for the /services page. Plain `Service` rather than a second
 * LocalBusiness subtype: the business entity is declared once, on the home
 * page, and this node points at it through `provider`. Its value is an
 * entity / answer-engine signal naming the two offerings, attributing them to
 * the business, and scoping them to the same service area.
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
    areaServed: areaServed(),
    provider: {
      '@type': 'ProfessionalService',
      name: SITE_NAME,
      url: new URL('/', base).href,
    },
  };
}
