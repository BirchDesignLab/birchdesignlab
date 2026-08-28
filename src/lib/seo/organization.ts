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

export interface CreativeWorkJsonLd {
  '@context': 'https://schema.org';
  '@type': 'CreativeWork';
  name: string;
  alternateName: string;
  description: string;
  url: string;
  datePublished: string;
  keywords: string[];
  creator: { '@type': 'ProfessionalService'; name: string; url: string };
  /** Studies only: the client the work was made for. */
  sourceOrganization?: { '@type': 'Organization'; name: string };
}

export interface CreativeWorkInput {
  /** BDL-001, BDL-005, and so on. */
  designation: string;
  title: string;
  summary: string;
  /** Collection id, which is also the /lab/<slug>/ path segment. */
  slug: string;
  date: Date;
  tech: string[];
  /** Present on studies, absent on experiments. */
  client?: string;
}

/**
 * CreativeWork for a Lab entry, experiments and studies alike.
 *
 * The Lab is the portfolio, and every entry in it is a made thing with an
 * author, a date, and a subject. `CreativeWork` is the honest type for that and
 * it is the one schema.org offers: there is no CaseStudy type, and Article
 * would misdescribe an interactive instrument. Uniform across both entry kinds
 * per the 08-28-26 call, with `sourceOrganization` naming the client on the
 * studies and simply absent on the experiments, which have none.
 *
 * `creator` points at the same ProfessionalService the home page declares, so
 * the portfolio attributes back to one business entity rather than floating
 * free. No `image`: the OG cards are per-type, not per-entry, and claiming a
 * generic card as this work's image would be a small lie. Revisit when the
 * per-experiment OG art lands.
 *
 * Callers must skip this for noindexed entries, the same as the breadcrumb.
 */
export function buildCreativeWork(
  site: URL | string,
  entry: CreativeWorkInput,
): CreativeWorkJsonLd {
  const base = typeof site === 'string' ? new URL(site) : site;
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: entry.title,
    alternateName: entry.designation,
    description: entry.summary,
    url: new URL(`/lab/${entry.slug}/`, base).href,
    datePublished: entry.date.toISOString().slice(0, 10),
    keywords: entry.tech,
    creator: {
      '@type': 'ProfessionalService',
      name: SITE_NAME,
      url: new URL('/', base).href,
    },
    ...(entry.client
      ? { sourceOrganization: { '@type': 'Organization' as const, name: entry.client } }
      : {}),
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
