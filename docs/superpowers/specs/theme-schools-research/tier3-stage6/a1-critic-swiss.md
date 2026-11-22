# Stage 6 A1: swiss critic

Opus `high`, 11-19-26. Probes `scripts/themes/stage6/critic-swiss-{crop,dial}.mjs`
on port 4464 (stage6-base); output in `scripts/themes/.out/stage6-critic-swiss/`
(`dial-geometry.json`, dial renders at widths 62, 100, 125, crops).

**Read on the cause:** swiss is the default of today's web, so a
non-technical visitor reads "a normal, tidy website". Vaporwave and bauhaus
win as worlds with toys. Swiss's world is the system (grid, programme,
variable type): make the visitor operate it.

## Findings

- **S1 important, all pages.** The only interactable can't be found: the grid
  key is an unlabelled 24px box that shows guides only while held, so a tap
  flashes them for about 100 ms (GridKey.astro). Fix: a tap under 250 ms
  latches until a second tap, Esc or blur; holding (or G) stays momentary.
- **S2 important, Home desktop 1024-1920.** Weakest first screen: the
  billboard fills the left half, top-right empty ("Design" 58-744 in a 58-1382
  frame at 1440); tablet's scale contrast is stronger. Fix P5.
- **S3 minor, all giants.** Flush-left broken optically: Archivo 700's left
  bearing (0.072em) starts the billboard's ink 16px right of the column at
  1440; Services numerals start right of their titles (24, 12, 10, 7px). Fix:
  `.sw-display { margin-inline-start: -0.072em }` (re-measure at width 85),
  per-numeral measured indents.
- **S4 important, About.** The red field's duotone Shining Tree reads soft and
  organic, near cottagecore; on desktop about 620px of red with type only in
  the top 160px. Founder call (they already said they'd rather a different
  image): a hard-threshold photograph or constructed mark (P4); meanwhile
  hang the manifesto and button at the field's foot.
- **S5 minor, Services phones.** Numerals clamped to 96px read as a ruled
  list; the brief protects "numerals as a huge figure". Fix: condensed
  (width 62) at 50-60cqw, or numeral on columns 1-2 beside the text.
- **S6 minor, tablet header.** The grid key one gutter left of "Services"
  reads as a nav icon. Move it to the wordmark row or column 6.
- **S7 taste, desktop nav.** Links on column lines give uneven gaps; Swiss-
  correct, keep unless the founder reads it as a bug.
- **S8 for transitions.** Billboard laid at +480-560 ms but the nav arrives at
  +640; the dial must reset before any swap snapshot.

## Rework proposals

- **P1 the programme revealed (S, low risk).** The grid key becomes a full
  mark-up layer: red column numbers 1-12, a span tag on each block ("8-12"),
  line counts every 4 lines, the giant's spec (size, leading, tracking,
  width). Meta type, aria-hidden. Plus tap-to-latch.
- **P2 variable giants (M).** One axis per page: Home the width dial; About
  the rotated "Birch" spine sweeps width 62-125 with scroll through the
  founder section; Services hold a numeral to travel weight 100-900, snap
  back; Sent drag the red full stop along the baseline.
- **P3 re-division, Gerstner's mobile grid (L, highest identity).** A
  division key cycles the page's programme 2, 3, 4, 6 columns; bands re-lay
  with the stepped paste-up. The Portal's thesis inside one room. Heavy QA;
  start with Home only.
- **P4 typophoto (M, needs an asset).** A hard-threshold black-and-white or
  red duotone photograph band under the billboard, cropped by the sheet edge,
  lab kicker and pull over it in white; replace About's tree the same way.
  No people; mind weight and soft sources.
- **P5 desktop poster scale (S).** Rest width 125, billboard about 1.2x (about
  270px at 1440, unrendered), "Design" about 1050px; lede stays at column 8;
  margin-top 2u. The dial then only condenses on desktop.
- **P6 fields invert while pressed (S, inert).** Pressing a red or black field
  flips it while held.
- **P7 station clock (M), recommended against:** ambient motion breaks
  "posters static" and the circle drifts toward bauhaus.

## Width dial spec (Home billboard, "Design")

**Font.** @fontsource-variable/archivo 5.3.0 standard faces: weight 100-900,
`font-stretch: 62% 125%`, default 100; meta.ts preloads latin-standard. At
1440 (700, 222.6px) "Design" measures 442 / 525 / 590 / 687 / 774 / 863px at
widths 62 / 75 / 85 / 100 / 112.5 / 125: not linear, so invert through a
sampled table.

**At rest** (font size, rest width, x-range, frame right, right edge at 62
and 125): 1920 280px, 100, 80-944, 1840, 636, 1166 · 1440 222.6, 100, 58-744,
1382, 500, 920 · 1024 158.3, 100, 41-529, 983, 355, 655 · 820 244.4, 100,
33-787, 787, 518, 980 (193 past the frame) · 640 190.8, 100, 26-614, 614,
404, 765 · 390 134.3, 85, 16-372, 374, 283, 537 · 360 123, 85, 16-342, 344,
260, 493. The h1 height is identical across 62-125 (each word a block
`.ln`): no reflow.

**Range.** 62-125, except: on tablets and phones the word bleeds past the
frame and is cropped by the sheet edge (poster idiom; if the founder
declines, cap at the frame, condense-only); on desktop a required live
collision cap: width 125 overprints the lede at 1024; if the lede's top is
above the "Design" line's ink bottom, `max = Winv(ledeLeft - gutter -
wordLeft)`, else 125; recompute on resize.

**DOM.** The h1 untouched. A sibling in `.hero`:
`<div class="dial" role="slider" tabindex="0" hidden aria-label="Design width" aria-orientation="horizontal" aria-valuemin="62" aria-valuemax="125" aria-valuenow="100" aria-valuetext="100 percent" data-sw-dial><span class="dial-mark" aria-hidden="true"></span><span class="dial-read" aria-hidden="true"></span></div>`;
JS removes `hidden`. Positioned over the "Design" line box (measured on
mount, `document.fonts.ready`, ResizeObserver), width at the allowed max;
fixed hit area while dragging; `cursor: ew-resize`, no selection or callout.

**Pointer and touch.** `touch-action: pan-y pinch-zoom`; engage after 6px of
horizontal travel; pointer capture; the right edge follows the pointer 1:1,
`s = Winv(W(s0) + dx)` from a table measured on mount at 62, 75, 87.5, 100,
112.5, 125; hard clamp, no rubber band; apply in rAF (`fontStretch`, aria
values, the mark); release on pointerup, cancel, lost capture, blur or
visibilitychange, then snap back.

**Keyboard.** Arrows ±1, Shift or PageUp/Down ±10, Home 62, End max; instant
steps; the value holds while focused; Esc or blur snaps back. No conflict
with G.

**Snap-back (station clock).** Hold 100 ms, then travel to rest at a constant
0.2 width-units per ms, linear, stop dead; rAF-driven so a grab mid-return
picks up. No reduced-motion variant.

**Affordance.** At rest a red bar (`--red-field`, 6px desktop, 4px phones)
from baseline to cap height, one gutter right of the word's ink edge,
following it (Home's one red mark, echoing Sent's stop). Hover or focus: a
1px ink rule along the baseline from the frame's left edge to the bar, plus
the 3px `--ring` on focus-visible. While active: a tabular meta-size readout
("87") right-aligned above the billboard (aria-hidden). First visit
(recommend yes, founder pick): once per session, 600 ms after arrival, the
word travels to 62, holds two beats, returns.

**Layout risk (must fix).** Widening past the frame grows `scrollWidth`
(820 to 980, 390 to 537) and a phone would pan; body `overflow-x: clip`
does not contain it. Wrap the hero row in a full-width `.hero-sheet` with
`overflow-x: clip` (vertical visible); not `overflow-clip-margin` (Safari).

**Lifecycle.** `onMount` with full cleanup, guarded on swiss; on
`astro:before-preparation` cancel and rest instantly.

**Tests.** Built test: role, min/max, label starts with "Design", parity
unchanged. Probe drags at 360, 390, 640, 820, 1024, 1280, 1440: `scrollWidth
=== innerWidth`, h1 height constant, no ink on the lede at 1024 and 1280,
back to rest within 350 ms.

## First three

1. The width dial as specced. 2. P1 with S1. 3. The big pick to the founder
(P3 or P4, which also settles S4); meanwhile P5 and S3.
