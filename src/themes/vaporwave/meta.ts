import type { ThemeMeta } from '../types';
import caslon from '@fontsource/libre-caslon-display/files/libre-caslon-display-latin-400-normal.woff2?url';
import dela from '@fontsource/dela-gothic-one/files/dela-gothic-one-latin-400-normal.woff2?url';
import exo from '@fontsource-variable/exo-2/files/exo-2-latin-wght-normal.woff2?url';
import vt323 from '@fontsource/vt323/files/vt323-latin-400-normal.woff2?url';

/** Vaporwave: the studio as a 1995 screensaver dreaming about the 1980s. */
export const meta: ThemeMeta = {
  id: 'vaporwave',
  name: 'Vaporwave',
  /* Tier 3 stage 3, "Final answers at the Tier A stop" item 6 (founder's
     own words, exact): era, signature and lesson rewritten for the F1(b)
     plaza and marble build, off the old synthwave-picture wording. */
  era: 'The internet in the 2010s, dreaming of mid-90s software and shopping malls.',
  lesson: 'We borrow the mall, the operating system and the museum gift shop, because the ethos behind vaporwave is that comfort was always for sale.',
  signature: 'Windows 95 chrome, file names for titles, Japanese for headlines, a mall lobby and glossy marble statuary, with one sunset screensaver on the front page.',
  forbids: ['gold', 'script faces', 'frosted glass', 'the primary triad', 'wood grain'],
  nativeScheme: 'dark',
  /* All four faces paint above the fold on every page: the display faces
     carry the billboard and the wordmark, Exo 2 the task buttons and VT323
     the tray clock and the kickers. So all four are preloaded (the founder's
     cap of four, Tier 3 Stage 2 decision 4), and on a switch from another
     school the portal waits for them, within its cap, before the swap. */
  fonts: [
    { family: 'Libre Caslon Display', role: 'heading', preload: [caslon] },
    { family: 'Exo 2 Variable', role: 'body', preload: [exo] },
    { family: 'Dela Gothic One', role: 'accent', preload: [dela] },
    { family: 'VT323', role: 'mono', preload: [vt323] },
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
    { fg: '--bar-ink-dim', bg: ['--bar-inactive-a'], min: 4.5, note: 'inactive window title, near end of the bar (F5)' },
    { fg: '--bar-ink-dim', bg: ['--bar-inactive-b'], min: 4.5, note: 'inactive window title, far end of the bar (F5)' },
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
  /* Tier 3 stage 3, wave B2 (seat vw-4a): the head is now a CC0 3D scan, not
     drawn, so provenance moves from 'original-vector'. */
  assets: {
    provenance: 'public-domain',
    note: 'The head is a CC0 3D scan of a Roman marble head of Aphrodite (Knidian type, 1st century, from the Chiragan villa, Musée Saint-Raymond, Toulouse, Ra 52). Palms, columns, the beorc rune and the meander are drawn here; the marble is rendered.',
  },
  order: 3,
};
