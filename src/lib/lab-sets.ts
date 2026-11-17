/**
 * Which catalog set an entry belongs to, and what its badge says.
 *
 * Studies are client work (or the studio's own study of itself). Genre
 * studies are fictional businesses built to argue a point, so they keep the
 * study page layout but are catalogued, filtered and badged with the
 * experiments: listing them as studies read as client work (founder call
 * 11-17-26).
 */
export type CatalogSet = 'experiment' | 'study';

/** Just the fields these read, so both the real collection entry (with
    Astro image metadata) and the test schema's string-image entry fit. */
type Classified = { type: 'experiment' | 'study'; genreStudy?: true };

export function catalogSet(data: Classified): CatalogSet {
  if (data.type === 'experiment') return 'experiment';
  return data.genreStudy ? 'experiment' : 'study';
}

export function typeLabel(data: Classified): string {
  if (data.type === 'study' && data.genreStudy) return 'genre study';
  return data.type;
}
