/**
 * The Plant deck art, as URLs. Written by
 * scripts/lab/extract-data-map-art.mjs; see that file for why only this deck.
 * Kept apart from data.ts so the data stays importable without Vite's glob.
 */
const files = import.meta.glob<string>('./art/*.webp', { eager: true, query: '?url', import: 'default' });
const byName: Record<string, string> = {};
for (const [path, url] of Object.entries(files)) byName[path.split('/').pop()!] = url;

const named = (prefix: string) =>
  Object.keys(byName).filter((n) => n.startsWith(prefix)).sort().map((n) => byName[n]);

/** 28 tiles for the hero wall. */
export const WALL = named('wall-');
/** 7 thumbnails for the Plant rows. */
export const STRIP = named('strip-');
/** The larger TV demo cards, by file name. */
export const tvUrl = (file: string): string => byName[file] ?? '';
