/**
 * Single source of truth for the site's brand name and external description.
 *
 * These were previously inlined in organization.ts, site.webmanifest, and the
 * home page meta, and had already drifted. Code paths now import from here;
 * public/site.webmanifest is static JSON and cannot import, so it carries a
 * comment pointing back at this constant.
 *
 * External-facing copy: no emdashes (house rule).
 */

export const SITE_NAME = 'Birch Design Lab';

/**
 * The lead sentence. Names the offering and the region, and stays inside the
 * ~155 characters a search result will actually render.
 */
export const SITE_TAGLINE =
  'Custom software and web design for businesses across the Mississippi Gulf Coast that want to grow and thrive.';

/**
 * Tagline plus the hook. 187 characters, so a search result clips the second
 * sentence; that is deliberate. The region keyword lives in the part that
 * survives, and the hook still counts as entity text for answer engines.
 */
export const SITE_DESCRIPTION =
  `${SITE_TAGLINE} Concocted in a lab where the same hands that build your site answer your email.`;

/**
 * The region this business serves. Feeds `areaServed` in the structured data
 * and is the reason the home-page node is a ProfessionalService rather than a
 * bare Organization. See organization.ts.
 */
export const SERVICE_AREA = 'Mississippi Gulf Coast';
