import type { ThemeMeta } from '../types';
import interOpsz from '@fontsource-variable/inter/files/inter-latin-opsz-normal.woff2?url';

/* Every panel is translucent and the orbs drift, so a panel's text can land
   over any of them. Each pair is measured against the worst orb for that
   scheme (--blob-worst: the deepest body in light, the brightest highlight
   in dark), which is harsher than the blurred average a reader actually
   sees.
   Stage 6 R1 (G3), the method: the glass is clear now (thin about 0.15
   light, 0.35 dark), so the pane alone no longer carries body text. Body
   text sits on its inner plate (theme.css, "The inner plate"), and every
   body-text pair is measured as text over --plate over the pane's material
   over the worst orb (onPlate). Display type (headings, the lead, pull
   quotes, the vibrant headline) has no plate and is measured over the
   material over the worst orb at the D2 = C 3:1 floor. Thick chrome keeps
   its fill and its 4.5 pairs.
   What the bound covers (Stage 6 wave 2, T2 C2): --blob-worst bounds the
   ORBS, the colour a pane is placed to frost. Since Stage 6 R1 the painted
   wallpaper bands go past it: in light the deep blue bands (#142c74 at the
   dusk corner, #1d3a9c at day) are darker than the deepest orb (#2f55c8),
   and in dark the amber bands and crest (to #f4a24e, --band-worst) are
   brighter than the brightest orb highlight (#f08a3c). So these token pairs
   are a bound over orbs only, not over every pixel behind a pane. Over the
   bands the stack is measured on the page instead, from GPU screenshots
   with the text made transparent (scripts/themes/stage6/
   w2-t9-evidence.mjs, section contrast: the 5th percentile of each text
   box's background against its ink): plated body text holds 4.5 there at
   1440 and 390 in both schemes; the vibrant headline, display type with no
   plate, does not hold 3:1 at its worst points over the deep bands (light
   390). The Control Centre labels, which have no plate, are bounded over
   --band-worst as well (below). */
const overOrb = (layer: string) => [layer, '--blob-worst'];
const onPlate = (layer: string) => ['--plate', layer, '--blob-worst'];

/** Glassmorphism: frosted panels over drifting colour. */
export const meta: ThemeMeta = {
  id: 'glassmorphism',
  name: 'Glassmorphism',
  era: 'Big Sur and Windows 11, 2020 to 2021',
  lesson: 'Depth without shadows: translucency and blur make the layers, and legibility becomes the whole design problem.',
  signature: 'Frosted glass panels floating over soft, blurred blobs of colour: a 2021 app store screenshot.',
  forbids: ['serif type', 'ornament', 'hard black rules', 'paper grain', 'pattern fills'],
  nativeScheme: 'light',
  fonts: [
    /* D8 = B, Inter Display: one opsz-axis file serves both heading and
       body (type.md's byte-cost finding: this file's fvar table carries
       the full 100-900 weight range, the same as the dedicated wght file
       it replaces, so it is a swap, not additive, once the Jakarta and
       Inter wght files are both dropped). */
    { family: 'Inter Variable', role: 'heading', preload: [interOpsz] },
    { family: 'Inter Variable', role: 'body' },
    { family: 'Space Grotesk Variable', role: 'accent' },
  ],
  contrast: [
    { fg: '--mark', bg: onPlate('--mat-regular'), min: 4.5, note: 'panel body text on its plate over the worst orb' },
    { fg: '--mark', bg: onPlate('--mat-thin'), min: 4.5, note: 'body copy inside a thin showpiece (Home .sub, Services sublines, the Contact intro subline) on its plate over the worst orb' },
    { fg: '--mark-muted', bg: onPlate('--mat-regular'), min: 4.5, note: 'panel secondary text on its plate over the worst orb' },
    { fg: '--mark-muted', bg: onPlate('--mat-thin'), min: 4.5, note: 'secondary text in a thin showpiece on its plate over the worst orb' },
    /* Stage 6 wave 2 (G2): phones thin the regular pane (light) rather than
       lightening the plate; body text on its plate over the thinner pane. */
    { fg: '--mark', bg: onPlate('--mat-regular-phone'), min: 4.5, note: 'panel body text on its plate over the phone regular pane over the worst orb' },
    { fg: '--mark-muted', bg: onPlate('--mat-regular-phone'), min: 4.5, note: 'panel secondary text on its plate over the phone regular pane over the worst orb' },
    { fg: '--accent', bg: onPlate('--mat-regular-phone'), min: 4.5, note: 'panel kickers and numerals on a plate over the phone regular pane' },
    { fg: '--link', bg: onPlate('--mat-regular-phone'), min: 4.5, note: 'panel links on a plate over the phone regular pane' },
    { fg: '--mark', bg: overOrb('--mat-regular-phone'), min: 3, note: 'display type in a phone regular pane, no plate (D2 = C)' },
    { fg: '--accent', bg: onPlate('--mat-regular'), min: 4.5, note: 'panel kickers and numerals on a plate over the worst orb' },
    { fg: '--link', bg: onPlate('--mat-regular'), min: 4.5, note: 'panel links (in body text, the mail link) on a plate over the worst orb' },
    { fg: '--mark', bg: overOrb('--mat-regular'), min: 3, note: 'display type in a regular pane, no plate (D2 = C)' },
    { fg: '--mark', bg: overOrb('--mat-thin'), min: 3, note: 'display type in the thin showpiece, no plate (D2 = C)' },
    { fg: '--mark', bg: ['--surface-mica', '--blob-worst'], min: 4.5, note: 'Services settings pane text, Mica surface over the worst orb (G15)' },
    { fg: '--mark-muted', bg: ['--surface-mica', '--blob-worst'], min: 4.5, note: 'Services settings pane stepper text over the worst orb (G15)' },
    /* Critic C1 (fix round 1): the Control Centre's small labels and
       segments (.cc-tile-label, .cc-seg, .cc-locale-value, 11-12px) have no
       plate; they sit on --cc-well in the regular pane, measured over the
       worst orb and over the worst painted band (--band-worst). */
    { fg: '--mark-muted', bg: ['--cc-well', '--mat-regular', '--blob-worst'], min: 4.5, note: 'Control Centre labels and segments over the worst orb' },
    { fg: '--mark-muted', bg: ['--cc-well', '--mat-regular', '--band-worst'], min: 4.5, note: 'Control Centre labels and segments over the worst painted band' },
    { fg: '--mark', bg: ['--thumb', '--cc-well', '--mat-regular', '--blob-worst'], min: 4.5, note: 'Control Centre checked segment over the worst orb' },
    { fg: '--mark', bg: ['--thumb', '--cc-well', '--mat-regular', '--band-worst'], min: 4.5, note: 'Control Centre checked segment over the worst painted band' },
    { fg: '--mark', bg: overOrb('--mat-thick'), min: 4.5, note: 'nav bar and glass pills over the worst orb' },
    { fg: '--mark-muted', bg: overOrb('--mat-thick'), min: 4.5, note: 'nav items over the worst orb' },
    { fg: '--mark', bg: ['--thumb', '--mat-thick', '--blob-worst'], min: 4.5, note: 'current nav segment' },
    /* Stage 6 R1 (G6): the header bar is clear now (--mat-bar, about 0.35).
       The wordmark is --mark straight on it; the nav track carries --plate. */
    { fg: '--mark', bg: overOrb('--mat-bar'), min: 4.5, note: 'header wordmark on the clear bar over the worst orb' },
    { fg: '--mark-muted', bg: onPlate('--mat-bar'), min: 4.5, note: 'header nav labels on the track plate over the worst orb' },
    { fg: '--mark', bg: ['--thumb', '--plate', '--mat-bar', '--blob-worst'], min: 4.5, note: 'current nav segment on the clear bar' },
    /* E7 (no glass on glass): the kicker chip, trust chip, form fields,
       footer pills and .btn-glass are opaque solid surfaces now (not a
       second translucent well nested inside a pane's own blur), so each is
       checked flat against --surface-solid rather than composited over the
       worst orb. --mark and --mark-muted over --surface-solid (= --field-
       raised) are also covered by REQUIRED_PAIRS; these stay explicit for
       the same documentation reason the rest of this list is explicit. */
    { fg: '--mark-muted', bg: ['--surface-solid'], min: 4.5, note: 'kicker chip and trust chip, opaque solid pill (E7)' },
    { fg: '--mark', bg: ['--surface-solid'], min: 4.5, note: 'form field text and footer pills, opaque solid surface (E7)' },
    { fg: '--btn-ink', bg: ['--btn-b'], min: 4.5, note: 'pill button, gradient end' },
    { fg: '--mark', bg: ['--glass-fallback', '--blob-worst'], min: 4.5, note: 'panel text without backdrop-filter' },
    { fg: '--mark-muted', bg: ['--field-top'], min: 4.5, note: 'field gradient, top' },
    { fg: '--mark-muted', bg: ['--field-bottom'], min: 4.5, note: 'field gradient, bottom' },
    /* D4 = C, vibrancy: the "Design Lab" headline, the one coloured text in
       the room. Display-only (D2 = C, the WCAG 3:1 large-text floor), over
       the thin showpiece material it sits in (Home's .window). */
    { fg: '--vibrant-a', bg: overOrb('--mat-thin'), min: 3, note: 'vibrant headline, gradient start (D4 = C, display-only, D2 = C)' },
    { fg: '--vibrant-b', bg: overOrb('--mat-thin'), min: 3, note: 'vibrant headline, gradient end (D4 = C, display-only, D2 = C)' },
    /* App-icon numerals: white on a gradient whose lightest stop sits mostly
       off the box (-30%), so the 50/50 mix stands in for what the visible
       area actually averages, per hue used. */
    { fg: '#ffffff', bg: ['--blob-violet'], min: 4.5, note: 'app icon numeral, violet (default, no icon override)' },
    { fg: '#ffffff', bg: ['--icon-cyan'], min: 4.5, note: 'app icon numeral, cyan' },
    { fg: '#ffffff', bg: ['--icon-peach'], min: 4.5, note: 'app icon numeral, peach' },
    { fg: '#ffffff', bg: ['--icon-pink'], min: 4.5, note: 'app icon numeral, pink class (deep teal in light since Stage 6 wave 2, G3)' },
  ],
  order: 6,
};
