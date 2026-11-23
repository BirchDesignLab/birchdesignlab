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
  'Custom software and web design for businesses across the Mississippi Gulf Coast.';

/**
 * Tagline plus the hook. 160 characters, so a search result may clip the end
 * of the second sentence; that is fine. The region keyword lives in the part
 * that survives, and the hook still counts as entity text for answer engines.
 */
export const SITE_DESCRIPTION =
  `${SITE_TAGLINE} Concocted in a lab where the same hands that build your site answer your email.`;

/**
 * The region this business serves. Feeds `areaServed` in the structured data
 * and is the reason the home-page node is a ProfessionalService rather than a
 * bare Organization. See organization.ts.
 */
export const SERVICE_AREA = 'Mississippi Gulf Coast';

/**
 * The business's social profiles, in footer order. One list feeds the footer
 * links (src/themes/quiet/Footer.astro) and `sameAs` in the structured data
 * (organization.ts), so the two cannot drift. Brand names, not copy: they are
 * the accounts' own names, so they live here with the URLs rather than in the
 * copy collection.
 */
export const SOCIAL_PROFILES = [
  { id: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/birchdesignlab/' },
  { id: 'facebook', label: 'Facebook', url: 'https://www.facebook.com/p/Birch-Design-Lab-61593412854284/' },
] as const;

/**
 * The Google Business Profile, linked from structured data only (`sameAs`).
 * The footer stays the social accounts unless the founder asks for this one
 * there too (open as of 11-22-26). The URL is
 * the profile's knowledge-graph id, which is stable, rather than a share link
 * or a search URL with session parameters.
 */
export const GOOGLE_BUSINESS_PROFILE_URL = 'https://www.google.com/search?kgmid=/g/11nvjpz5dy';
