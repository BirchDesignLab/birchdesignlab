# Proof a3: swiss, the rotated condensed "Birch" on About (D2)

Made 10-02-26 for Stage 4 Tier A. Brief: `briefs/a3-swiss-rotated.md`. Nothing
under `src/` changed; the proof CSS and one `aria-hidden` span are injected
into the frozen build `scripts/themes/.out/snap-stage4-base/`.

## The question

Does one full-height condensed "Birch" (capital B), rotated 90 degrees and
running the height of About's section 02 up the frame edge, read as the
canon's rotated giant without crowding the text, at every size?

## What was made

- `scripts/themes/proofs/stage4-swiss-rotated/proof.css`: the word, its fit
  rule, the edge choice (`data-proof-edge` left, right or off), the phone
  variants, and the `.sw-vert` kickers set level (D2 retires them). The
  section index `.sw-idx` is hidden, as in proofs a1 and a2.
- `scripts/themes/harness/stage4-swiss-rotated-proof.mjs`: serves the Archivo
  width-axis face (`archivo-latin-wdth-normal.woff2`, wdth 62 to 125),
  injects the sheet and the span, captures, and builds the sheets. `--probe`
  prints section height and the word's advance by width axis. `--sizes=` runs
  a subset.
- `scripts/themes/proofs/stage4-swiss-rotated/ink.mjs`: measures the word's
  real ink box against the section from ink-only shots.
- Images: `scripts/themes/.out/stage4-proofs/swiss-rotated/` (`index.md`
  lists all). GPU Chromium, RTX 3070 d3d11 (`renderer.txt`).

## What the images show

- Left edge, 1440 and up (`sec02-*.jpg`, `edges-*.jpg`): the word at width 62,
  weight 900 is 196px thick and runs from the section's top edge to its bottom
  edge (ink 0 to 446.4 of 446.5px). It sits in columns 1 and 2, the kicker and
  lead start at column 3 with a 34px gap. It reads as the canon's spine
  giant and is the page's heaviest black, and the text beside it is calm.
- Right edge, column 12 (`edges-*.jpg`): fails. Column 12 is one column wide
  and the word is 196px thick, so it runs about 80px into the second body
  column at 1440 and across it at 1280. Rejected.
- Narrower laptops: at width 62 the word is still about 197px thick at 1280 and
  206px at 1024, but the text starts at column 3 (250px at 1280, 200px at
  1024 from the page edge), leaving a 9px gap at 1280 and an overlap at 1024.
  The axis therefore opens as the columns narrow: 75 from 1280, 105 from 1024.
  Thickness drops to about 169 and 134px, gaps 34 and 29px. Still heavy and
  tall; no longer very condensed (see the answer).
- 640 to 1023 (`sec02-*.jpg` rows 820 and 768): column 1 is 58px at 820, so
  the word cannot sit in it. It now gets a gutter of its own: the widest cut
  of the axis (125, the thinnest the face can be at a given height, 128px
  thick at 544px tall) and the lead, body and kicker step right by
  `--sw-tab-shift` (162px - 15.43vw, never below 0; 39px at 820). Ink runs
  0 to 544.4 of 544.5 at 820 and 768, with 39px to the text. This replaces the
  first round's drop at 820, which crowded at 2px and then gave up.
- Phones (`phone-*.jpg`): "run" is a stub, 58px thick and 134px long at 390 in
  a section 840px tall, and it pushes the text in by 94px, making the founder
  text 18 percent longer. It no longer reads as a word that runs the height of
  anything. "Dropped" reads clean and matches the Home and Services phone
  logic (the poster is the first-screen title). The brief licenses the drop on
  phones; below 640 the word is dropped.
- Kickers (`kickers-*.jpg`, `kickers.json`, `checks.json`): `.sw-vert`
  computes `writing-mode: horizontal-tb`, no transform, on About, Home and
  Services at every size. D2 retires the vertical kicker on all three pages,
  so each gets a level place at 1024 and up (grid row 1, the row the hidden
  index leaves empty): About on the lead's line (column 3), Home's "What we
  build" and Services' "How a project runs" on column 2, with the door list
  and the steps one row down. Each kicker is one line at 1440, 1280 and 1024,
  light and dark (the vertical ones were 5 and 7 lines tall). 640 to 1023 keeps
  the kicker above the text, level, in the same shifted column on About.

## Checks (checks.json, sweep-*.json)

- No horizontal scroll: `scrollWidth` equals `clientWidth` for every variant,
  size and scheme (1440, 1280, 1024, 820, 768, 390, 360) and at every swept
  width.
- The word is absent from the accessibility tree: the body `ariaSnapshot` is
  identical with and without the span, every variant, size and scheme.
- Fit, swept: every 16px from 640 to 2560 (121 widths, GPU, light, one page
  resized with the observer running; `sweep-640-1008.json`,
  `sweep-1024-2560.json`). The ink top is at the section's top edge (0px) at
  every width and the ink bottom is within -0.8 to +1.2px of the section's
  bottom. Ink gap to the nearest text is 26.8px at its smallest (640) and 29.3px
  from 1024; thickness runs 124 to 199px. The sampled sizes: ink 0 to 446.4 of
  446.5 at 1440, 0 to 460.2 of 459.3 at 1280, 0 to 490.6 of 489.7 at 1024.

## The answer

- **Edge: left frame edge**, from 640 up (columns 1 and 2 from 1024; a gutter
  of its own from 640 to 1023). Column 12 is too narrow.
- **Width axis:** 62 (the axis's low end) only at 1440 and up. Below that it
  has to open or the word crowds: 75 from 1280 to 1439, 105 from 1024 to 1279,
  125 from 640 to 1023. Say plainly that 105 and 125 are normal-width and wide
  heavy grotesques, not condensed; "condensed" is true at 1440+ and half true at
  1280. Weight 900 throughout.
- **Size rule:** font size = H / (r x k), where H is section 02's height, r is
  the advance of "Birch" in ems at that width (1.725 at 62, 2.064 at 75, 2.816
  at 105, 3.2211 at 125) and k is ink over advance, which is not one number:
  0.9775 at 62, 0.9683 at 75, 0.9622 at 105, 0.9677 at 125 (the bearings change
  with the axis). Then shift down by `--sw-ty` so the bearing sits off the
  bottom edge: 0.039em, 0.0564em, 0.0777em, 0.073em for the same four cuts.
  All of these were solved from ink-only shots on the GPU.
- **H is measured, not fitted.** The section's height is set by the text and
  jumps by 20 to 25px whenever the founder text reflows (493.2 at 1072, 469.7
  at 1088; 481.5 at 1248, 458.1 at 1264; 467.6 at 1392, 444 at 1408; 454 at
  1600, 430 at 1680). The first round's `clamp(430px, 575px - 9vw, 500px)`
  matched only its three anchor sizes and put the ink up to 6px above the top
  rule or 23px short of the bottom between them, so it is gone as the rule.
  The Tier B rule is a ResizeObserver on the section that writes its height to
  `--sw-sec-h` (the proof's harness injects exactly that, four lines). The
  word is absolutely positioned, so it never feeds back into the height. The
  clamp stays in the CSS only as the no-script fallback, and its error is the
  swept band, not a bound: roughly +6px above the rule to 23px short at the
  jumps. If the founder would rather not ship script for a decoration, that
  band is the price of the CSS-only version, and the plain answer is to accept
  it or drop the word.
- **Phone call: dropped** at 390 and 360 (everything under 640). A spine
  there is a stub, not a word that runs the height.
- **Tier B lifts:**
  1. Markup in `About.astro`, last child of the founder section:
     `<span class="sw-birch" aria-hidden="true">Birch</span>`, and the
     ResizeObserver that writes `--sw-sec-h`.
  2. From `proof.css`: the `.sw-vert` level rule (drop the old
     `@media (min-width: 1024px)` vertical rule from `theme.css:224`) and the
     placements it needs on all three pages:
     - About: `.founder > .kicker` row 1 column 3 / 12, the lead to rows 2 to
       3, the body to row 4.
     - Home (`Home.astro:149`): `.doors > .kicker` row 1, column 2 / 7, and
       `.door-list` to row 2.
     - Services (`Services.astro:110`): `.process > .kicker` row 1, column
       2 / 7, and `.steps` to row 2.
     Then the `.sw-birch` rule with its four bands (62, 75, 105, 125) and their
     `--sw-k` and `--sw-ty`, `font-size` and `translate`. From 640 to 1023 also
     the `--sw-tab-shift` margin on `.founder > .kicker`, `.founder-lead` and
     `.founder-p`. Show the word from `min-width: 640px` (`display: none`
     below), not by edge tag; the `data-proof-edge='left'` and phone `run`
     rules are proof scaffolding, do not lift them.
  3. `@fontsource-variable/archivo/wdth.css` in place of the wght import (the
     same face change item 7 needs).
  4. Hide `.sw-idx` (a1 and a2 already do).

## Open for the founder

- Colour: the word is ink black (`--mark`); dark makes it paper white. Red
  was not tried. Taste call.
- Tablets now carry the word with a text shift of up to 63px (at 640). If the
  founder prefers the text columns untouched there, the alternative is to drop
  the word under 1024.
- Home's lead block after the rectangle and the other a1 calls are not touched
  here.
- The bands step, so the word's thickness jumps at 1280 and 1440 (134, 169,
  196px). The gap to the text is smallest at each band's floor (34 to 36px)
  and widens up the band. A smooth axis would need typed calc division; not
  tried.
