import type { ThemeMeta } from '../types';
import archivo from '@fontsource-variable/archivo/files/archivo-latin-wght-normal.woff2?url';
import publicSans from '@fontsource-variable/public-sans/files/public-sans-latin-wght-normal.woff2?url';

/** Swiss: the International Typographic Style, set as a Zurich poster. */
export const meta: ThemeMeta = {
  id: 'swiss',
  name: 'Swiss',
  era: 'Zurich and Basel, 1950s to 1960s',
  lesson: 'Objectivity: a grid, one type family and asymmetry organise information so clearly that it becomes beautiful.',
  signature: 'Huge flush-left sans-serif type on a strict grid with one red: a 1960s Zurich poster.',
  forbids: ['ornament', 'gradients', 'rounded corners', 'more than one accent colour', 'serif type', 'shadows', 'icons'],
  nativeScheme: 'light',
  fonts: [
    { family: 'Archivo Variable', role: 'heading', preload: [archivo] },
    { family: 'Public Sans Variable', role: 'body', preload: [publicSans] },
    { family: 'IBM Plex Mono', role: 'mono' },
  ],
  /* Beyond the required pairs, text sits on two fills: the red poster block
     (--on-accent, required) and the ink block, which is the page printed in
     negative (paper-coloured type on an ink field) for the lab band and for
     buttons inside a red block. */
  contrast: [
    { fg: '--field', bg: ['--mark'], min: 4.5, note: 'type on the ink block' },
    { fg: '--mark-muted', bg: ['--field-raised'], min: 4.5, note: 'secondary text on a form field' },
    { fg: '--ink-muted', bg: ['--mark'], min: 4.5, note: 'secondary type on the ink block' },
    { fg: '--red-on-ink', bg: ['--mark'], min: 4.5, note: 'the kicker, kept red on the ink block' },
  ],
  order: 6,
};
