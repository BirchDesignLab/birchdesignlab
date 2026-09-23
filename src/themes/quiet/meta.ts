import type { ThemeMeta } from '../types';
import marcellus from '@fontsource/marcellus/files/marcellus-latin-400-normal.woff2?url';
import spectral from '@fontsource/spectral/files/spectral-latin-400-normal.woff2?url';

/** The house style: the root site itself, entered as a school. */
export const meta: ThemeMeta = {
  id: 'quiet',
  name: 'Quiet',
  era: 'Birch Design Lab, 2026',
  lesson: 'Restraint reads as confidence: one typeface for voice, one for reading, one green.',
  signature: 'Engraved serif capitals over living birch bark, dark and warm, with one green.',
  forbids: ['neon', 'gradients', 'rounded corners', 'frosted glass', 'primary colours'],
  nativeScheme: 'dark',
  fonts: [
    { family: 'Marcellus', role: 'heading', preload: [marcellus] },
    { family: 'Spectral', role: 'body', preload: [spectral] },
  ],
  order: 0,
};
