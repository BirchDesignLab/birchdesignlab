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
  weight 900 is 195px thick and runs from the section's top edge to its bottom
  edge (ink 1 to 446.4 of 446.5px). It sits in columns 1 and 2, the kicker and
  lead start at column 3 with a 34px gap. It reads as the canon's spine
  giant and is the page's heaviest black, and the text beside it is calm.
- Right edge, column 12 (`edges-*.jpg`): fails. Column 12 is one column wide
  and the word is 195px thick, so it runs about 80px into the second body
  column at 1440 and across it at 1280. Rejected.
- Narrower laptops: at width 62 the word is still about 197px thick at 1280 and
  206px at 1024, but the text starts at column 3 (250px at 1280, 200px at
  1024 from the page edge), leaving a 9px gap at 1280 and an overlap at 1024.
  The axis therefore opens as the columns narrow: 75 from 1280, 105 from 1024.
  Thickness drops to 168 and 129px, gaps 36 and 34px. Still heavy and tall;
  no longer very condensed (see the answer).
- 820 (`sec02-*.jpg` row 4): at full height the word is 134px thick even at
  width 105, while column 1 is 58px wide. It lands on the text. No width on
  the axis helps (it would need about 7 ems of length per em of height).
- Phones (`phone-*.jpg`): "run" is a stub, 58px thick and 134px long at 390 in
  section 02 that is 815px tall, and it pushes the text in by 94px, making the
  founder text 18 percent longer. It no longer reads as a word that runs the
  height of anything. "Dropped" reads clean and matches the Home and Services
  phone logic (the poster is the first-screen title).
- Kickers: `.sw-vert` computed `writing-mode: horizontal-tb`, no transform, at
  every size (`checks.json`). At 1024 and up the kicker sits level above the
  lead on the lead's column line (grid row 1; the lead moves to rows 2 to 3
  and the body to row 4).

## Checks (checks.json, light and dark)

- No horizontal scroll: `scrollWidth` equals `clientWidth` for every variant,
  size and scheme (1440, 1280, 1024, 820, 390, 360).
- The word is absent from the accessibility tree: the body `ariaSnapshot` is
  identical with and without the span, every variant, size and scheme.
- Fit: ink runs 0 to 100 percent of section height at 1440 (1 to 446.4 of
  446.5), 0 to 456 of 459 at 1280 (99 percent), 8 to 484 of 490 at 1024 (97
  percent).

## The answer

- **Edge: left frame edge** (columns 1 and 2), from 1024 up. Column 12 is too
  narrow.
- **Width axis:** 62 (the axis's low end) only at 1440 and up. Below that it
  has to open or the word crowds: 75 from 1280 to 1439, 105 from 1024 to 1279.
  Say plainly that 105 is a normal-width heavy grotesque, not condensed;
  "condensed" is true at 1440+ and half true at 1280. Weight 900 throughout.
- **Size rule:** font size = H / (r x 0.9775), where H is section 02's height,
  r is the advance of "Birch" in ems at that width (1.725 at 62, 2.064 at 75,
  2.816 at 105), and 0.9775 is ink over advance. Then shift down 0.039em so
  the B's bearing sits off the bottom edge. H is set by the text, so the proof
  fits it as `clamp(430px, 575px - 9vw, 500px)` (real H: 490, 459, 446 at 1024,
  1280, 1440; 429.6 at 1920 and 2560; error under 7px). This is a fit to the
  current copy, not a law: change the founder copy and H moves. The sturdier
  Tier B alternative is a six-line ResizeObserver that writes `--sw-sec-h`;
  CSS alone cannot read the section's height.
- **Phone call: dropped** at 390 and 360, and at 820 and everything under
  1024. There is no honest version of "runs the height" below 1024: the word's
  thickness is about 0.74 of its font size, so a section height of 480 to 815
  needs 190 to 300px of thickness at width 62.
- **Tier B lifts:**
  1. Markup in `About.astro`, last child of the founder section:
     `<span class="sw-birch" aria-hidden="true">Birch</span>`.
  2. From `proof.css`: the `.sw-vert` level rule (drop the old
     `@media (min-width: 1024px)` vertical rule from `theme.css:224`), the
     `.founder > .kicker` row 1 and lead/body row changes at 1024+, and the
     `.sw-birch` rule with its three width bands, the H clamp, `font-size`
     and `translate`. Show the word only at `min-width: 1024px`
     (`display: none` below), not by edge tag; the `data-proof-edge='left'` and
     phone `run` rules are proof scaffolding, do not lift them.
  3. `@fontsource-variable/archivo/wdth.css` in place of the wght import (the
     same face change item 7 needs).
  4. Hide `.sw-idx` (a1 and a2 already do).

## Open for the founder

- Colour: the word is ink black (`--mark`); dark makes it paper white. Red
  was not tried. Taste call.
- Below 1024 the page loses its rotated moment; Tier B may prefer a smaller
  stub on tablets, which this proof argues against.
- The bands step, so the word's thickness jumps at 1280 and 1440 (129, 168,
  195px). The gap to the text is smallest at each band's floor (34 to 36px)
  and widens up the band. A smooth axis would need typed calc division; not
  tried.
