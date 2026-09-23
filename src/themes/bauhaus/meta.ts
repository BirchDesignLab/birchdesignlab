import type { ThemeMeta } from '../types';
import spartan from '@fontsource-variable/league-spartan/files/league-spartan-latin-wght-normal.woff2?url';
import jost from '@fontsource-variable/jost/files/jost-latin-wght-normal.woff2?url';

/** Bauhaus: a Dessau poster you can walk through. */
export const meta: ThemeMeta = {
  id: 'bauhaus',
  name: 'Bauhaus',
  era: 'Weimar and Dessau, 1919 to 1933',
  lesson: 'Form follows function, and function can still be joyful: primary shapes and primary colours on a strict grid.',
  signature: 'Circles, squares and triangles in red, yellow and blue on off-white: a Dessau poster you can walk through.',
  forbids: ['pastels', 'pattern fills', 'squiggles', 'brown', 'texture', 'serif type', 'gradients'],
  nativeScheme: 'light',
  fonts: [
    { family: 'League Spartan Variable', role: 'heading', preload: [spartan] },
    { family: 'Jost Variable', role: 'body', preload: [jost] },
    { family: 'Unbounded Variable', role: 'accent' },
  ],
  /* The primaries are poster blocks, never text on the paper (blue on black
     is 2.44:1, yellow on white 1.07:1). Text only ever sits on a block whose
     pair is listed here. --poster/--on-poster is the inverse band (black in
     light, paper in dark) used by the footer and the lab band. */
  contrast: [
    { fg: '--on-red', bg: ['--red'], min: 4.5, note: 'text on a red block' },
    { fg: '--on-yellow', bg: ['--yellow'], min: 4.5, note: 'text on a yellow block' },
    { fg: '--on-blue', bg: ['--blue'], min: 4.5, note: 'text on a blue block' },
    { fg: '--on-poster', bg: ['--poster'], min: 4.5, note: 'text on the inverse band' },
    { fg: '--mark-muted', bg: ['--field-raised'], min: 4.5, note: 'secondary text on a raised panel' },
  ],
  order: 1,
};
