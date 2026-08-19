/**
 * JSON-LD helpers shared by the structured-data blocks.
 *
 * `serializeJsonLd` is what every inline `<script type="application/ld+json">`
 * should use instead of a bare `JSON.stringify`. JSON.stringify escapes quotes
 * but not `<`, so a value containing `</script>` (or any `<`) could break out of
 * the inline script or be parsed as markup. Escaping `<` to its unicode form
 * keeps the JSON valid and inert. Harmless for today's static fields; correct
 * before any user/content-derived value (breadcrumb titles, future sameAs) lands
 * inside a block.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export interface BreadcrumbItem {
  name: string;
  /** Path or absolute URL; resolved against `site`. */
  url: string;
}

/**
 * BreadcrumbList for a detail page. Positions are 1-indexed in array order.
 * URLs are resolved against the site origin so `item` is always absolute, and
 * paths should carry the same trailing slash as the page canonical.
 */
export function buildBreadcrumb(site: URL | string, items: BreadcrumbItem[]) {
  const base = typeof site === 'string' ? new URL(site) : site;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: new URL(it.url, base).href,
    })),
  };
}
