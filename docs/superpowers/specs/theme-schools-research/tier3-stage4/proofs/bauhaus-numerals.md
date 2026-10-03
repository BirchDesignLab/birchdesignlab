# Proof a4: bauhaus, constructed numerals (E3)

Made 10-02-26 for Stage 4 Tier A. Brief: `briefs/a4-bauhaus-numerals.md`.
Nothing under `src/` changed; the proof CSS and the built numerals are
injected into the frozen build `scripts/themes/.out/snap-stage4-base/`.

## The question

Can numerals built from bars and circles, after Albers's standard elements,
replace Unbounded everywhere bauhaus shows a numeral, read clearly at every
size they appear, and become the school's signature detail?

## Where bauhaus shows a numeral in Unbounded

- Home doors 01, 02 (`Home.astro:41`, size at `:166`).
- Services offerings 01, 02 (`Services.astro:31`, `:106`) and process steps
  01 to 04 (`:49`, `:153`).
- `.num` at `theme.css:260-266` and `--font-num` at `theme.css:39`.
- Home lab band designations BDL-010, 009, 008 (`Home.astro:215`): real text
  and a real link, so they are NOT constructed. They move to League Spartan
  700 with tabular figures, as the brief says.
- Unbounded's other hooks: `src/pages/t/bauhaus/[...page].astro:9` (the
  fontsource import) and `meta.ts:17` (the accent entry).

Measured on the frozen build: the old pages have 5 elements in Unbounded on
Home (2 numerals and 3 designations) and 6 on Services; after the proof, 0 on
every page, size and scheme (`checks.json`).

## What was made

- `scripts/themes/proofs/stage4-bauhaus-numerals/build-numerals.mjs`
  generates `numerals.svg` (committed), so the construction is data, not
  hand-drawn paths.
- `proof.css`: every rule under `html[data-theme='bauhaus']`, ready to lift.
- `inject.js`: the markup pattern as a function (what `Numeral.astro` will
  render).
- `scripts/themes/harness/stage4-bauhaus-numerals-proof.mjs`: captures and
  sheets. Images: `scripts/themes/.out/stage4-proofs/bauhaus-numerals/`
  (`index.md` lists each).

## The element set and module

One stroke S = 20 units. A digit cell is 3S by 5S (viewBox `0 0 60 100`).
Four elements:

- bar: a rectangle, always one stroke thick.
- ring: full circle ring, outer radius 1.5S, inner 0.5S.
- half ring and quarter ring: the same radii.

Rings sit on only two centres, (30,30) and (30,70). Two rings on those centres
share one band (y 40 to 60), which is why 3, 5 and 8 close without a join to
draw. No diagonals, no tapering.

Digits (centres in units; element lists are in `build-numerals.mjs`):

| Digit | Built from |
|---|---|
| 0 | upper half ring, lower half ring, two side bars |
| 1 | stem bar, quarter ring as the flag |
| 2 | upper half ring and lower-right quarter, bar, bar, base bar |
| 3 | two stacked half rings with a lower-right and an upper-right quarter meeting in the middle |
| 4 | arm bar, crossbar, stem bar |
| 5 | top bar, left bar, bar, upper-right quarter and lower half ring |
| 6 | upper-left quarter as the hook, left bar, full ring |
| 7 | top bar, upper-right quarter as the shoulder, stem bar |
| 8 | two full rings |
| 9 | full ring, right bar, lower-right quarter as the tail |

34 elements in all. Colour is `currentColor`, so ink on the plain doors, ink
on yellow (pairing: a ring inside a numeral is not a free-standing shape, so
ink is fine; no red or blue is used), and light in dark.

## The replacement technique, with accessibility and parity

`.num` stays the one element, and its page's `aria-hidden="true"` stays
(today's pages already hide every numeral: the doors and steps sit in an
`aria-hidden` top row, offering numerals carry it themselves). Inside it:

    <span class="num" aria-hidden="true">
      <span class="num-t">01</span>              real digits, clipped out of sight
      <svg class="nm" viewBox="0 0 60 100" aria-hidden="true">  one per digit
        <path class="el el-ring" d="..."/> ...

The text stays in the DOM so copy, word parity, find-in-page and any text
test see the same words; the SVGs are decorative. Size is em-based
(`--nm-h: 0.78em` of the `.num` font size), so the existing per-page
`font-size` rules keep steering it.

Checks, all 20 page/scheme/size combinations (`checks.json`): visible text
identical before and after; accessibility tree identical before and after
(`ariaSnapshot`); no horizontal overflow; every numeral built and inside an
`aria-hidden` ancestor.

## What the images show

- Specimen (`specimen-light.jpg`, `-dark`): all ten digits are distinct and
  read at 24 px and up. 1 (flag, stem on the right) and 7 (bar, shoulder,
  stem) are the closest pair and stay apart. 3, 5, 8 get their shapes from the
  shared ring band.
- Doors, offering, steps (`doors-*`, `offering-*`, `steps-*`): 01, 02, 03,
  04 read at every size. Smallest: the steps at 34 px tall, stroke 6.9 px (the
  closed 0 counter is about 7 px wide there; 6, 8 and 9 never appear on the
  site today). Doors 1440: 79 px tall,
  stroke 15.7; 390: 50 px, stroke 10.
- Lab band (`lab-*`): BDL designations in one face, no mid-word switch.
- Weight: the built forms are lighter than Unbounded 800 (stroke is 20% of
  height; Unbounded's stems are thicker and its digits wider). They sit
  well beside the 6px rules and the bars, but they are a lighter note on the
  page. See the taste calls.
- Assembly (`asm-*.jpg`): elements fly in with the existing `.asm` machinery
  (bars grow on their axis, rings, halves and quarters turn in from
  `rotate(-90deg) scale(0)`), 55 ms apart, 820 ms each. 36 animations run for
  a ten-digit specimen. A two-digit numeral has about 8 elements and settles
  in about 1.3 s; for the four-step list use a smaller step (about 35 ms).
  The `<use>` sprite cannot be animated per element (a use shadow tree takes no
  outside selectors), so the component inlines the paths.

## The answer

Yes. The set works, reads at every size they appear, passes parity and
accessibility, and removes Unbounded from every numeral. The signature
quality depends on weight (taste call below), not on legibility.

## What Tier B lifts

- `numerals.svg` and `build-numerals.mjs` into `src/themes/bauhaus/parts/`
  (the generator's element list becomes a typed map in `Numeral.astro`).
- `Numeral.astro`: renders the pattern above for a string of digits, inlining
  the paths with `asm` classes, `--from` and `--d` per element, inside the
  `data-reveal` the page already has. Parent keeps `aria-hidden`.
- CSS: the `.num` and `.nm` block in `proof.css` replaces `theme.css:260-266`
  (`font-family`, `font-weight`, `letter-spacing`, `tabular-nums` go).
- `.designation`: League Spartan 700 with `tabular-nums` (`Home.astro:215`).
- Delete: `--font-num` (`theme.css:39`), the Unbounded import
  (`[...page].astro:9`), the `meta.ts:17` accent entry, the
  `@fontsource-variable/unbounded` dependency if nothing else uses it.
- Page sizes: Home `.door .num`, Services `.offering-head .num` and
  `.step .num` keep their `font-size`; the numerals scale with them.

## Taste calls and notes for the founder

1. Weight. Heavier forms need a module change (S = 24 closes the counters of
   6, 8 and 9 to 12 units, too small at step size). The alternative is a
   larger `--nm-h` (0.9em) at the cost of a taller numeral than today. The
   proof keeps the honest 0.78em.
2. Gap between digits is 0.07em; the 1 carries open space on its left.
3. Reduced motion: the existing `.asm` rule already shows finished numerals.
4. Not seen in the proof: the real arrival through the switcher and the
   reveal gate; only the elements' animation was stepped.
