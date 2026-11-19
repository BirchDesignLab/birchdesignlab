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
     type. In dark the lab band is a white field (--white-field) with black
     type, --grey-on-white for secondary type and a black button with white
     type. The last rows are the focus rings (3px, 3:1) on paper, on the
     black sheet, on red and on the white field. */
  contrast: [
    { fg: '--on-red', bg: ['--red-field'], min: 4.5, note: 'white type on the red field' },
    { fg: '--on-red', bg: ['--black'], min: 4.5, note: 'a button inside the red field' },
    { fg: '--black', bg: ['--on-red'], min: 4.5, note: 'a button inside the red field, inverted' },
    { fg: '--field', bg: ['--mark'], min: 4.5, note: 'type on the ink block' },
    { fg: '--paper-fixed', bg: ['--black'], min: 4.5, note: 'type on the black sheet that stays black in dark (Contact hero)' },
    { fg: '--grey-on-black', bg: ['--black'], min: 4.5, note: 'secondary type on that black sheet' },
    { fg: '--mark-muted', bg: ['--field-raised'], min: 4.5, note: 'secondary text on a form field' },
    { fg: '--ink-muted', bg: ['--mark'], min: 4.5, note: 'secondary type on the ink block' },
    { fg: '--black', bg: ['--white-field'], min: 4.5, note: 'type on the white field (the dark lab band)' },
    { fg: '--grey-on-white', bg: ['--white-field'], min: 4.5, note: 'secondary type on the white field' },
    { fg: '--white-field', bg: ['--black'], min: 4.5, note: 'the black button on the white field, its label' },
    { fg: '--red-field', bg: ['--black'], min: 3, note: 'the Sent full stop (large type) on the black page' },
    { fg: '--mark', bg: ['--field'], min: 3, note: 'focus ring on paper' },
    { fg: '--on-red', bg: ['--black'], min: 3, note: 'focus ring on the black sheet' },
    { fg: '--on-red', bg: ['--red-field'], min: 3, note: 'focus ring on the red field' },
    { fg: '--black', bg: ['--white-field'], min: 3, note: 'focus ring on the white field' },
  ],
  order: 2,
};
