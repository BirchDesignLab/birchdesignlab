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

export const SITE_DESCRIPTION =
  'A design lab building custom software and custom websites for businesses that want to grow.';
