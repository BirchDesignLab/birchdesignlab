/**
 * Helpers for tests that read the built site in dist/.
 *
 * These run after `npm run build` (`npm run test:dist`, the last step of
 * `npm run verify`), never in the pre-build unit run. They exist because the
 * theme-schools work makes promises only the built output can prove: root
 * pages unchanged, each school shipping only its own CSS, theme routes kept
 * out of search.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseHtml } from '../../scripts/themes/lib/visible-text.mjs';

export { visibleText, wordCounts, diffWords } from '../../scripts/themes/lib/visible-text.mjs';

export const REPO = fileURLToPath(new URL('../../', import.meta.url));
export const DIST = join(REPO, 'dist');

/** '/about/' -> dist/about/index.html; '/404.html' -> dist/404.html. Throws if missing. */
export function pageFile(route: string): string {
  const rel = route.endsWith('.html') ? route.slice(1) : join(route.slice(1), 'index.html');
  return join(DIST, rel);
}

export function readPage(route: string): string {
  const file = pageFile(route);
  if (!existsSync(file)) throw new Error(`no built page for ${route} (${file}); run npm run build first`);
  return readFileSync(file, 'utf8');
}

/** Every route with an index.html under dist/, optionally under a prefix like '/t/'. */
export function listRoutes(prefix = '/'): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name === 'index.html') {
        const rel = relative(DIST, dir).split(sep).join('/');
        out.push(rel ? `/${rel}/` : '/');
      }
    }
  };
  walk(DIST);
  return out.filter((r) => r.startsWith(prefix)).sort();
}

export function doc(html: string) {
  return parseHtml(html);
}

export function stylesheetHrefs(html: string): string[] {
  return doc(html)
    .querySelectorAll('link[rel="stylesheet"]')
    .map((l) => l.getAttribute('href') ?? '')
    .filter(Boolean);
}

export function anchorHrefs(html: string): string[] {
  return doc(html)
    .querySelectorAll('a[href]')
    .map((a) => a.getAttribute('href') ?? '');
}

export function meta(html: string, name: string): string | undefined {
  return doc(html).querySelector(`meta[name="${name}"]`)?.getAttribute('content') ?? undefined;
}
