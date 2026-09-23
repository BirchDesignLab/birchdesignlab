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
  /* The loud band (.loud in src/styles/base.css) paints --green-field and
     remaps --mark, --link, --accent and --on-accent onto the --gf-* tokens,
     so its text is measured against that field directly. */
  contrast: [
    { fg: '--gf-mark', bg: ['--green-field'], min: 4.5, note: 'loud band text' },
    { fg: '--gf-link', bg: ['--green-field'], min: 4.5, note: 'loud band links' },
    { fg: '--gf-accent', bg: ['--green-field'], min: 4.5, note: 'loud band kickers' },
    { fg: '--gf-on-accent', bg: ['--gf-accent'], min: 4.5, note: 'text on an accent fill inside the loud band' },
  ],
  order: 0,
};
