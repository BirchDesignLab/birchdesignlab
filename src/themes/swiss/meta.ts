import type { ThemeMeta } from '../types';
import archivo from '@fontsource-variable/archivo/files/archivo-latin-standard-normal.woff2?url';

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
  ],
  /* Beyond the required pairs, type sits on three fields: the red field
     (white --on-red on --red-field, never remapped in dark), the black sheet
     (paper type on --black, the lab band in light) and the ink block
     (--field on --mark). Buttons inside red are black fields with white
     type. The last rows are the focus rings (3px, 3:1) on paper, on the
     black sheet and on red. */
  contrast: [
    { fg: '--on-red', bg: ['--red-field'], min: 4.5, note: 'white type on the red field' },
    { fg: '--on-red', bg: ['--black'], min: 4.5, note: 'a button inside the red field' },
    { fg: '--black', bg: ['--on-red'], min: 4.5, note: 'a button inside the red field, inverted' },
    { fg: '--field', bg: ['--mark'], min: 4.5, note: 'type on the ink block' },
    { fg: '--mark-muted', bg: ['--field-raised'], min: 4.5, note: 'secondary text on a form field' },
    { fg: '--ink-muted', bg: ['--mark'], min: 4.5, note: 'secondary type on the ink block' },
    { fg: '--red-field', bg: ['--black'], min: 3, note: 'the Sent full stop (large type) on the black page' },
    { fg: '--mark', bg: ['--field'], min: 3, note: 'focus ring on paper' },
    { fg: '--on-red', bg: ['--black'], min: 3, note: 'focus ring on the black sheet' },
    { fg: '--on-red', bg: ['--red-field'], min: 3, note: 'focus ring on the red field' },
  ],
  order: 2,
};
