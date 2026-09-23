import type { ThemeMeta } from '../types';
import caslon from '@fontsource/libre-caslon-display/files/libre-caslon-display-latin-400-normal.woff2?url';
import dela from '@fontsource/dela-gothic-one/files/dela-gothic-one-latin-400-normal.woff2?url';

/** Vaporwave: the studio as a 1995 screensaver dreaming about the 1980s. */
export const meta: ThemeMeta = {
  id: 'vaporwave',
  name: 'Vaporwave',
  era: 'The internet, 2010 to 2013, dreaming of 1985',
  lesson: 'Nostalgia is a palette: pink-to-cyan gradients and cheap chrome read as a memory of a future that never came.',
  signature: 'Sunset gradients, a neon grid running to the horizon and marble statuary, like a 1995 screensaver dreaming about the 1980s.',
  forbids: ['gold', 'script faces', 'frosted glass', 'the primary triad', 'wood grain'],
  nativeScheme: 'dark',
  /* The two display faces carry the billboard and the wordmark, so they are
     the ones preloaded; Exo 2 swaps in over a metric-matched fallback. */
  fonts: [
    { family: 'Libre Caslon Display', role: 'heading', preload: [caslon] },
    { family: 'Exo 2 Variable', role: 'body' },
    { family: 'Dela Gothic One', role: 'accent', preload: [dela] },
    { family: 'VT323', role: 'mono' },
  ],
  /* Every surface beyond --field that carries text. The CRT screen and the
     window title bars keep their colours in both schemes (a screen is dark,
     a title bar is a neon fill), so their ink is measured against them
     directly. */
  contrast: [
    { fg: '--mark-muted', bg: ['--field-top'], min: 4.5, note: 'secondary text at the top of the page field' },
    { fg: '--mark-muted', bg: ['--field-foot'], min: 4.5, note: 'secondary text at the foot of the page field' },
    { fg: '--accent', bg: ['--field-top'], min: 4.5, note: 'kickers at the top of the page field' },
    { fg: '--link', bg: ['--field-foot'], min: 4.5, note: 'links at the foot of the page field' },
    { fg: '--mark-muted', bg: ['--field-raised'], min: 4.5, note: 'secondary text inside a window' },
    { fg: '--link', bg: ['--field-raised'], min: 4.5, note: 'links inside a window' },
    { fg: '--accent', bg: ['--field-raised'], min: 4.5, note: 'kickers inside a window' },
    { fg: '--mark', bg: ['--field-sunk'], min: 4.5, note: 'typed text in a sunken form field' },
    { fg: '--bar-ink', bg: ['--bar-a'], min: 4.5, note: 'window title, pink end of the bar' },
    { fg: '--bar-ink', bg: ['--bar-b'], min: 4.5, note: 'window title, lavender middle of the bar' },
    { fg: '--bar-ink', bg: ['--bar-c'], min: 4.5, note: 'window title, cyan end of the bar' },
    { fg: '--task-ink', bg: ['--task'], min: 4.5, note: 'taskbar buttons' },
    { fg: '--task-current', bg: ['--task-pressed'], min: 4.5, note: 'the pressed taskbar button' },
    { fg: '--bb-plain', bg: ['--hz-sky-top'], min: 4.5, note: 'billboard second line over the top of the sky' },
    { fg: '--bb-plain', bg: ['--hz-sky-mid'], min: 4.5, note: 'billboard second line lower in the sky' },
    { fg: '--crt-ink', bg: ['--crt-bg'], min: 4.5, note: 'CRT screen text' },
    { fg: '--crt-phos', bg: ['--crt-bg'], min: 4.5, note: 'CRT phosphor designations' },
    { fg: '--crt-kick', bg: ['--crt-bg'], min: 4.5, note: 'CRT kicker' },
    { fg: '--crt-link', bg: ['--crt-bg'], min: 4.5, note: 'CRT link' },
    { fg: '--inscription', bg: ['--marble'], min: 4.5, note: 'inscription cut into the marble plinth' },
    { fg: '--inscription', bg: ['--marble-vein'], min: 4.5, note: 'inscription where it crosses a vein' },
    { fg: '--inscription', bg: ['--marble-tint-pink', '--marble'], min: 4.5, note: 'inscription over the plinth pink-lit corner' },
    { fg: '--inscription', bg: ['--marble-tint-cyan', '--marble'], min: 4.5, note: 'inscription over the plinth cyan-lit corner' },
  ],
  assets: { provenance: 'original-vector', note: 'Palms, columns, the beorc rune and the meander are drawn here; the marble is SVG turbulence.' },
  order: 1,
};
