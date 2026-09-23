import type { ThemeMeta } from '../types';
import jakarta from '@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2?url';
import inter from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url';

/* Every panel is translucent and the orbs drift, so a panel's text can land
   over any of them. Each pair is measured against the panel composited over
   the worst orb for that scheme (--blob-worst: the deepest body in light, the
   brightest highlight in dark), sheen included, which is harsher than the
   blurred average a reader actually sees. */
const overOrb = (layer: string) => ['--sheen', layer, '--blob-worst'];

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
    { family: 'Plus Jakarta Sans Variable', role: 'heading', preload: [jakarta] },
    { family: 'Inter Variable', role: 'body', preload: [inter] },
    { family: 'Space Grotesk Variable', role: 'accent' },
  ],
  contrast: [
    { fg: '--mark', bg: overOrb('--glass'), min: 4.5, note: 'panel text over the worst orb' },
    { fg: '--mark-muted', bg: overOrb('--glass'), min: 4.5, note: 'panel secondary text over the worst orb' },
    { fg: '--accent', bg: overOrb('--glass'), min: 4.5, note: 'panel kickers and numerals over the worst orb' },
    { fg: '--accent-2', bg: overOrb('--glass'), min: 4.5, note: 'gradient headline end over the worst orb' },
    { fg: '--link', bg: overOrb('--glass'), min: 4.5, note: 'panel links over the worst orb' },
    { fg: '--mark', bg: overOrb('--glass-strong'), min: 4.5, note: 'nav bar and glass pills over the worst orb' },
    { fg: '--mark-muted', bg: overOrb('--glass-strong'), min: 4.5, note: 'nav items over the worst orb' },
    { fg: '--mark', bg: ['--thumb', '--glass-strong', '--blob-worst'], min: 4.5, note: 'current nav segment' },
    { fg: '--accent', bg: ['--well', '--glass', '--blob-worst'], min: 4.5, note: 'kicker chip over the worst orb' },
    { fg: '--mark-muted', bg: ['--well', '--glass', '--blob-worst'], min: 4.5, note: 'trust chip over the worst orb' },
    { fg: '--mark', bg: ['--well', '--glass', '--blob-worst'], min: 4.5, note: 'form field text over the worst orb' },
    { fg: '--btn-ink', bg: ['--btn-b'], min: 4.5, note: 'pill button, gradient end' },
    { fg: '--mark', bg: ['--glass-fallback', '--blob-worst'], min: 4.5, note: 'panel text without backdrop-filter' },
    { fg: '--mark-muted', bg: ['--field-top'], min: 4.5, note: 'field gradient, top' },
    { fg: '--mark-muted', bg: ['--field-bottom'], min: 4.5, note: 'field gradient, bottom' },
    /* App-icon numerals: white on a gradient whose lightest stop sits mostly
       off the box (-30%), so the 50/50 mix stands in for what the visible
       area actually averages, per hue used. */
    { fg: '#ffffff', bg: ['--blob-violet'], min: 4.5, note: 'app icon numeral, violet (default, no icon override)' },
    { fg: '#ffffff', bg: ['--icon-cyan'], min: 4.5, note: 'app icon numeral, cyan' },
    { fg: '#ffffff', bg: ['--icon-peach'], min: 4.5, note: 'app icon numeral, peach' },
    { fg: '#ffffff', bg: ['--icon-pink'], min: 4.5, note: 'app icon numeral, pink' },
  ],
  order: 3,
};
