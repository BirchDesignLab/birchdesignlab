/**
 * Which catalog set an entry belongs to, and the one word that names it.
 *
 * Studies are client work (or the studio's own study of itself). Genre
 * studies are fictional businesses built to argue a point, so they keep the
 * study page layout but are catalogued, filtered and named with the
 * experiments: listing them as studies read as client work (founder call
 * 11-17-26).
 *
 * catalogSet decides the set, and kindLabel is the only place that turns a
 * set into a word. The List's badge, the case page and the Plate all call
 * it; the wall's tile builds its label from catalogSet with the same two
 * words (src/components/LabWall.astro), and tests/lab-schema.test.ts pins
 * them together.
 */
export type CatalogSet = 'experiment' | 'study';

/** Just the fields these read, so both the real collection entry (with
    Astro image metadata) and the test schema's string-image entry fit. */
type Classified = { type: 'experiment' | 'study'; genreStudy?: true };

export function catalogSet(data: Classified): CatalogSet {
  if (data.type === 'experiment') return 'experiment';
  return data.genreStudy ? 'experiment' : 'study';
}

/** The word a visitor sees for a set. */
export const KIND_WORDS: Record<CatalogSet, string> = { experiment: 'Experiment', study: 'Study' };

/** The kind of a piece, in the one word every place that shows a kind uses. */
export function kindLabel(data: Classified): string {
  return KIND_WORDS[catalogSet(data)];
}
