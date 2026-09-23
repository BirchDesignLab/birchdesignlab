/**
 * Every design school, read from src/themes/<id>/meta.ts.
 *
 * Only meta files are globbed. Components and stylesheets are imported by
 * each school's own route file (src/pages/t/<id>/[...page].astro), so a page
 * ships its own school's CSS and nothing else (F016). Adding a school touches
 * no shared file: new directory, new route, done.
 */
import type { ThemeMeta } from './types';

const modules = import.meta.glob<{ meta: ThemeMeta }>('./*/meta.ts', { eager: true });

/**
 * Route files, for their names only. `?raw` loads a file's source text instead
 * of compiling it, and the loaders are never called, so no route (and none of
 * the CSS a route imports) enters this module's graph. Importing the routes
 * themselves would put every school's stylesheet on every portal page.
 */
const routes = import.meta.glob('../pages/t/*/*.astro', { query: '?raw' });
const enabled = new Set(
  Object.keys(routes)
    .filter((path) => path.endsWith('/[...page].astro'))
    .map((path) => path.split('/')[3]),
);

/**
 * Every school with a meta.ts, finished or not. For tools that check a school
 * while it is still being built (the contrast checker, meta validation).
 */
export const ALL_THEMES: readonly ThemeMeta[] = Object.entries(modules)
  .map(([path, mod]) => {
    const dir = path.split('/')[1];
    if (mod.meta.id !== dir) throw new Error(`src/themes/${dir}/meta.ts declares id "${mod.meta.id}"`);
    return mod.meta;
  })
  .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

/**
 * The schools the portal serves. A school joins when its route is enabled; one
 * under construction keeps its route as `_[...page].astro` and stays out of the
 * switcher, which would otherwise link to pages that were never built. Several
 * schools can then be drafted in one tree, each built alone (render.mjs).
 */
export const THEMES: readonly ThemeMeta[] = ALL_THEMES.filter((t) => enabled.has(t.id));

export function getTheme(id: string): ThemeMeta | undefined {
  return THEMES.find((t) => t.id === id);
}

export function requireTheme(id: string): ThemeMeta {
  const theme = getTheme(id);
  if (!theme) throw new Error(`no school "${id}" in src/themes/`);
  return theme;
}
