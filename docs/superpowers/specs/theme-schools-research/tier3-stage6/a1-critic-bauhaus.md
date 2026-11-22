# Stage 6 A1: bauhaus critic

Opus `high`, 11-19-26. Evidence: stage6-a0 sheets, strips, swiss-vs-bauhaus
boundary sheets; crops in `scripts/themes/.out/stage6-critic-bauhaus/` (helper
`scripts/themes/stage6/critic-bauhaus-crop.mjs`). No server, no git writes.

**Verdict:** bauhaus still sets the bar; first screens distinct from swiss in
both schemes and sizes. Short of it: S8 never applied, too few
interactables, the existing ones hard to find.

## Findings

- **B1 important, Services, all sizes.** Stage 0 S8 (each school
  re-expresses the process row plus one other shared skeleton,
  `stage0-decisions.md:75`) was never applied: "how a project runs" is still
  four equal columns with coloured top bars. Fix: one constructed diagram.
  Desktop: a 6px ink beam across 12 columns, the four minis as stations
  stepping down in size 01 to 04, each step's text hung from a 6px left rule.
  Phones: one heavy left spine with the shapes as stations. Second skeleton
  is a founder call (cheapest: Home doors at 7 and 5 columns); it conflicts
  with the brief's protect list, so the founder may decline.
- **B2 important, Home hero and Sent.** The draggable shapes are invisible
  as toys: only `cursor: grab` (theme.css:446); touch gets no hint. Fix: a
  one-time "pick me" beat about 500 ms after the last shape lands (red square
  lifts 12px, drops on --ease-snap, no overshoot); fine-pointer hover and
  hold lift 4px over a hard 4px ink offset block.
- **B3 important, About, Services, Contact, Home below the fold.** All six
  interactables sit at the top of Home and on Sent. Cheap adds, in order:
  (a) the Home see-saw tips 8 degrees toward the tapped end, shape slides,
  beam levels (button, "See-saw, tip it"); (b) About's B comes apart and
  rebuilds on tap (button, "Letter B, take apart"); (c) the footer's red
  corner square spins 90 degrees on tap (inert); (d) constructed numerals
  re-assemble on tap (inert).
- **B4 minor, About, Services, Contact, light.** A 6px paper stripe between
  the closing colour band and the ink footer reads as a gap
  (`Footer.astro .site-footer border-top: var(--on-poster)`). Fix: in light
  use `--poster` or drop it; keep the paper rule in dark.
- **B5 minor, Home hero and Sent, phones.** `.loose { touch-action: none }`
  plus preventDefault: a vertical swipe starting on a shape grabs it instead
  of scrolling (the hero circle is about 150px at 390). Fix: coarse pointers
  `touch-action: pan-y`, pick up after a 200 ms press or a mostly horizontal
  move over 8px. Add to the iPhone pass.
- **B6 taste, Home dark below the fold (set critic).** Bauhaus's dark lab
  band is red and swiss dark Home has two red bands, so both dark Homes share
  a big red field after the first screen. If one changes, swiss.
- **B7 for transitions.** Home to About: old hero shapes and the "birch"
  letters overlap the new heading at +240 to +320 ms. Banked as brief T5.

## The questionnaire card

**Sourcing.** Dossier credits Kandinsky [7][23], not "the Bauhaus". Source
[23] (Centre Pompidou, Google Arts & Culture): questionnaires for Weimar
Bauhaus students, c. 1923, adapted from INKhUK; result triangle yellow,
square red, circle blue. So "Weimar, around 1923", and "after" the form, not
a facsimile.

**Files.** `src/themes/bauhaus/parts/Questionnaire.astro` and
`parts/questionnaire.ts`; `initQuestionnaire(root)` returns cleanup, wired in
About.astro with `onMount` like Home's initLoose. Memory only.

**Placement.** New `.quiz` section between `.founder` and `.manifesto`, top
border `var(--rule) solid var(--mark)`, padding-block clamp(4rem, 8vw,
7rem). Desktop (1101+): columns 1 to 4 a large constructed question mark
from numeral parts (ink, aria-hidden, assembles); card columns 6 to 12
(about 716px at 1440), about 7:5. Tablet (641 to 1100): card columns 1 to 10,
max 680px, left; question mark in 11 to 12, about 96px. Phones: card gutter
to gutter, portrait, no question mark.

**Look.** A printed form: --paper sheet in both schemes, 2px ink border, a
hard 6px ink offset block bottom-right, no blur or radius, 6px red rule
across the top. Printing in ink and red only; primaries appear only where
the visitor puts them and in the key. Header: title (League Spartan 700,
1.25rem), "no. 1" right in tabular figures, 2px rule. Shapes row: three
outline shapes, 3px ink stroke, boxes 112 / 96 / 88px, gaps 48px (24 on
phones), lowercase names under (Jost 500, 0.95rem). Colour row: three
printer's colour-control bars, 100x32 (96x44 on phones), names under; bars,
never squares or circles. Two inert ruled "reason" lines (aria-hidden).
Footer: "show the answer" (`.more`-style button), "again" (`.btn`) once
filled. Selected shape: four red 6px crop-mark corners. Filled shape: solid
colour, stroke kept, name visible. Contrast pair `--ink` on `--paper`.

**Interaction.** Tap shape then colour (or colour then shape); fill is an
ink-roller wipe from the bottom (clip-path, 240 ms, --ease-snap). Each
colour fits one shape; reusing a colour swaps the two. Re-inking wipes out
then in. Drag a colour bar onto a shape (pointer events, elementFromPoint,
loose.ts snap on miss, `touch-action: none` on bars only). Keyboard: Tab
shapes, colours, show, again; arrows within a row (roving tabindex);
Enter/Space; Escape clears. Targets at least 44px. Reveal 400 ms after the
third fill or at once on "show the answer": a 6px rule draws (scaleX, 200
ms), the printed key lands (house --from values, 120 ms stagger), a small
red stamp beside each match, nothing marks a miss, then tally and house
line. "Again" resets. No JS: the key is in the markup, hidden on init.

**Accessibility and parity.** Visible strings in `aria-hidden` spans;
real buttons whose aria-label starts with the visible word; aria-pressed on
the selected shape; state labels ("Triangle, no colour yet" / "Triangle,
red"); section `aria-label="Questionnaire"`; an empty visually hidden
`role="status"` filled at runtime. Check with the built parity test.

**Draft words** (founder approves; lowercase on screen by text-transform):
Questionnaire / no. 1 / After Kandinsky, Weimar, around 1923 / Give each
shape one colour. / Pick a shape, then a colour. / triangle, square, circle /
yellow, red, blue / Reason, if you have one / Show the answer / Kandinsky's
answer / You and Kandinsky agree on 3 of 3. (2 of 3, 1 of 3, none) / Every
shape on this site keeps his answer. / Again. Status: "Triangle selected.
Now pick a colour." / "Triangle is red." / "Kandinsky's answer: yellow
triangle, red square, blue circle. You agree on 2 of 3." Optional title
wink (Services says "No questionnaire, no intake form"): "The one
questionnaire we hand out."

## First three

1. The questionnaire card on About.
2. Findable toys and the cheap adds: B2, B3 (a) and (b), B5.
3. S8 to the founder with the one-beam process diagram (B1); B4 in the same
   wave.
