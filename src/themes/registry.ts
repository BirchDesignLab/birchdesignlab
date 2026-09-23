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

export const THEMES: readonly ThemeMeta[] = Object.entries(modules)
  .map(([path, mod]) => {
    const dir = path.split('/')[1];
    if (mod.meta.id !== dir) throw new Error(`src/themes/${dir}/meta.ts declares id "${mod.meta.id}"`);
    return mod.meta;
  })
  .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

export function getTheme(id: string): ThemeMeta | undefined {
  return THEMES.find((t) => t.id === id);
}

export function requireTheme(id: string): ThemeMeta {
  const theme = getTheme(id);
  if (!theme) throw new Error(`no school "${id}" in src/themes/`);
  return theme;
}
