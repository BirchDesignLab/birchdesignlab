import type { ThemeMeta } from '../types';
import fraunces from '@fontsource-variable/fraunces/files/fraunces-latin-full-normal.woff2?url';
import lora from '@fontsource-variable/lora/files/lora-latin-wght-normal.woff2?url';

/** Cottagecore: the kitchen table in June, and the same room by lamplight. */
export const meta: ThemeMeta = {
  id: 'cottagecore',
  name: 'Cottagecore',
  era: 'Cottagecore, 2018 to 2020, after rural crafts and old recipe books',
  lesson: 'Warmth is texture and imperfection: hand-drawn marks and soft naturals make a page feel made, not manufactured.',
  signature: 'Pressed flowers, gingham and handwriting: a cottage kitchen table in June.',
  forbids: ['neon', 'chrome', 'the primary triad', 'frosted glass', 'geometric sans display type'],
  nativeScheme: 'light',
  fonts: [
    /* The full file carries the SOFT and WONK axes the display type leans on;
       the billboard is the LCP text, so it is the one worth preloading. */
    { family: 'Fraunces Variable', role: 'heading', preload: [fraunces] },
    { family: 'Lora Variable', role: 'body', preload: [lora] },
    { family: 'Caveat Variable', role: 'accent' },
  ],
  /* Every surface text sits on beyond the field: recipe cards (--paper),
     butter notes (--note), the cloth inside the embroidery hoop, and, in the
     dark scheme, the lamp glow laid over the field at its brightest point. */
  contrast: [
    { fg: '--mark-muted', bg: ['--paper'], min: 4.5, note: 'card body text' },
    { fg: '--accent', bg: ['--paper'], min: 4.5, note: 'handwritten kickers on a card' },
    { fg: '--link', bg: ['--paper'], min: 4.5, note: 'links on a card' },
    { fg: '--mark', bg: ['--note'], min: 4.5, note: 'butter note text' },
    { fg: '--mark-muted', bg: ['--note'], min: 4.5, note: 'butter note secondary text' },
    { fg: '--accent', bg: ['--note'], min: 4.5, note: 'handwriting on a butter note' },
    { fg: '--link', bg: ['--note'], min: 4.5, note: 'links on a butter note' },
    { fg: '--mark', bg: ['--glow', '--field'], min: 4.5, note: 'text under the lamp' },
    { fg: '--mark-muted', bg: ['--glow', '--field'], min: 4.5, note: 'secondary text under the lamp' },
    { fg: '--accent', bg: ['--glow', '--field'], min: 4.5, note: 'kickers under the lamp' },
    { fg: '--link', bg: ['--glow', '--field'], min: 4.5, note: 'links under the lamp' },
    { fg: '--mark', bg: ['--hoop-cloth'], min: 4.5, note: 'the stitched manifesto in the hoop' },
    { fg: '--field-line', bg: ['--paper'], min: 3, note: 'the write-on line under a form field' },
    { fg: '--hand-kicker-ink', bg: ['--paper'], min: 4.5, note: 'kickers on a card' },
    { fg: '--hand-kicker-ink', bg: ['--note'], min: 4.5, note: 'kickers on a butter note' },
    { fg: '--hand-kicker-ink', bg: ['--glow', '--field'], min: 4.5, note: 'kickers on the table' },
    { fg: '--hand-note-ink', bg: ['--paper'], min: 4.5, note: 'margin notes and the phone nav on a card' },
    { fg: '--hand-note-ink', bg: ['--note'], min: 4.5, note: 'margin notes on a butter note' },
    { fg: '--hand-note-ink', bg: ['--glow', '--field'], min: 4.5, note: 'margin notes, footer place and phone nav on the table' },
    { fg: '--hand-label-ink', bg: ['--paper'], min: 4.5, note: 'form labels and numerals on a card' },
    { fg: '--hand-label-ink', bg: ['--note'], min: 4.5, note: 'numerals and labels on a butter note' },
    { fg: '--hand-label-ink', bg: ['--glow', '--field'], min: 4.5, note: 'labels and numerals on the table' },
    /* The mounted herbarium sheets (Home hero, About): in the dark scheme a
       dimmed-cream board with its own inks (D4 c); in light the board is the
       paper, so the same pairs hold there. */
    { fg: '--board-ink', bg: ['--board'], min: 4.5, note: 'About sheet h1, label and etymology on the mounted board' },
    { fg: '--board-ink-muted', bg: ['--board'], min: 4.5, note: 'secondary text and the hero herb-label scribble on the board' },
    { fg: '--board-accent', bg: ['--board'], min: 4.5, note: 'emphasis in the specimen label on the board' },
    { fg: '--board-link', bg: ['--board'], min: 4.5, note: 'links on the board' },
  ],
  assets: {
    provenance: 'original-vector',
    note: 'Drawn for this school: pressed daisy, lavender, fern, wild rose, a birch twig with catkins and a leaf, generated at build time from hand-tuned petal and leaf curves with seeded jitter; a cross-stitch motif charted stitch by stitch; a ribbon bow, an envelope with twine, a perforated stamp and postmark, a hand-drawn underline and arrows. Gingham, washi tape, torn and scalloped edges and the embroidery hoop are CSS gradients and masks.',
  },
  order: 4,
};
