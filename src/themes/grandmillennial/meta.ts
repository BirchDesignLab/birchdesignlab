import type { ThemeMeta } from '../types';
import playfair from '@fontsource-variable/playfair-display/files/playfair-display-latin-wght-italic.woff2?url';
import cormorant from '@fontsource-variable/cormorant-garamond/files/cormorant-garamond-latin-wght-normal.woff2?url';

/** Grandmillennial: the parlour revival. Light-native; dark is a lacquered room. */
export const meta: ThemeMeta = {
  id: 'grandmillennial',
  name: 'Grandmillennial',
  era: 'Parlour revival, 2019, after 1900s to 1960s interiors',
  lesson: 'More is more when it is edited: pattern on pattern, held together by one disciplined palette.',
  signature: "Chintz, scalloped edges and gilt frames: your grandmother's parlour, made fresh.",
  forbids: ['neon', 'frosted glass', 'the primary triad', 'visible grids', 'sans-serif display type'],
  nativeScheme: 'light',
  /* The italic Playfair sets the billboard and the wordmark's "Birch", the
     largest type above the fold; Cormorant carries every paragraph. */
  fonts: [
    { family: 'Playfair Display Variable', role: 'heading', preload: [playfair] },
    { family: 'Cormorant Garamond Variable', role: 'body', preload: [cormorant] },
    { family: 'Pinyon Script', role: 'accent' },
  ],
  /* Surfaces beyond the field that carry text: the porcelain (light) or
     oxblood lacquer (dark) Lab band, the hunter-green footer, and the stationery
     card the contact form sits on. */
  contrast: [
    { fg: '--band-mark', bg: ['--band'], min: 4.5, note: 'Lab band text' },
    { fg: '--band-accent', bg: ['--band'], min: 4.5, note: 'Lab band kicker and designations' },
    { fg: '--band-link', bg: ['--band'], min: 4.5, note: 'Lab band link' },
    { fg: '--foot-mark', bg: ['--foot'], min: 4.5, note: 'footer text' },
    { fg: '--foot-muted', bg: ['--foot'], min: 4.5, note: 'footer secondary text' },
    { fg: '--foot-link', bg: ['--foot'], min: 4.5, note: 'footer links' },
    { fg: '--mark-muted', bg: ['--field-raised'], min: 4.5, note: 'secondary text on cards' },
    { fg: '--accent', bg: ['--field-raised'], min: 4.5, note: 'kickers and labels on cards' },
    { fg: '--link', bg: ['--field-raised'], min: 4.5, note: 'links on cards' },
    { fg: '--mark', bg: ['--paper'], min: 4.5, note: 'text on the ticking-stripe paper' },
    { fg: '--accent', bg: ['--paper'], min: 4.5, note: 'kickers on the ticking-stripe paper' },
    { fg: '--mark', bg: ['--oval'], min: 4.5, note: 'billboard inside the portrait oval' },
    { fg: '--accent', bg: ['--oval'], min: 4.5, note: 'billboard second line inside the oval' },
  ],
  assets: {
    provenance: 'original-vector',
    note: 'All drawn for this school in SVG and CSS: a chintz repeat (cabbage roses, buds, forget-me-not sprigs), a trellis lattice, a birch-branch botanical, blue-and-white plates, a ribbon bow, gilt corner scrolls, a wax seal and a scalloped striped awning.',
  },
  order: 2,
};
