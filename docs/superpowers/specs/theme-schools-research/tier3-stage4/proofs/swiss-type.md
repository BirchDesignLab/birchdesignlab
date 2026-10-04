# Proof a2: swiss, one family (Archivo against Inter) and the phone poster

Made 10-02-26 for Stage 4 Tier A. Brief: `briefs/a2-swiss-type.md` (swiss
brief items 7 and 9). Nothing under `src/` changed; the proof CSS is injected
into the frozen build `scripts/themes/.out/snap-stage4-base/`.

## The questions

1. Archivo body (standard axes, 400, width 100) against Inter at 17px on a 24px
   line: which reads as Swiss body text, and is Archivo too characterful?
2. Can the phone titles fill the measure at 390 (and 360) with no overflow, so
   the first screen reads as a poster?

## What was made

- `scripts/themes/proofs/stage4-swiss-type/proof.css`: Archivo-only swiss. The
  body face is one variable, `--font-body`; the class `sw-body-inter` on
  `<html>` flips it to Inter for the comparison. `--font-mono` is pointed at
  Archivo (designations, footer legal line, Contact trust line, tabular
  figures). Section indices are `display: none`. Body is 1.0625rem on a 24px
  line, paragraph gap one line. Phone giants under 640px.
- `scripts/themes/harness/stage4-swiss-type-proof.mjs`: serves
  `archivo-latin-standard-normal.woff2` and Inter from node_modules into the
  frozen build, injects the sheet, captures. `--probe` prints each giant's
  widest line against the measure over a grid of sizes and widths.
- Images: `scripts/themes/.out/stage4-proofs/swiss-type/` (`index.md` lists all).

## What the images show

- `body-crops.jpg`, `body-services-*.jpg`, `body-about-*.jpg`: Archivo at 17px
  is a plain neo-grotesque, close to Helvetica in colour. It sets a little
  narrower than Inter (more words per line: the Services paragraph is 5 lines
  in Archivo and 6 in Inter at 390), and its word spaces are tight, but it does
  not read characterful. Inter looks like a UI face beside it: wider, with a
  tall x-height, more software than poster.
- `phone-first-390-*.jpg`, `phone-first-360-*.jpg`: before is the frozen build
  (giants at 60 to 105px, a ragged right edge, 12 to 33px of unused measure).
  After, every title runs to the right margin. The first screen is not yet
  a clean poster: on Home the subline (body type) starts at y=768 at 390x844
  and y=739 at 360x800, inside the first screen. Services becomes four lines
  ("Two / things, / done / properly."), the tallest poster.
- `phone-full-390.jpg`: the pages whole.

## Numbers (light and dark identical)

Measure is 358px at 390 and 328px at 360 (margins 16px). Every giant box spans
16 to 374 (390) and 16 to 344 (360); the widest line stays inside it.
`scrollWidth` equals `clientWidth` on every page, both sizes, both schemes
(390/390, 360/360); the body pages at 1440, 1024 and 390 also have no overflow.

| Giant | Font size, % of measure | px at 390 / 360 | Widest line at 390 / 360 | Width axis |
|---|---|---|---|---|
| Home "Design" | 37.5 | 134.3 / 123.0 | 356.0 / 326.2 | 85 |
| About | 36.3 | 130.0 / 119.1 | 356.1 / 326.2 | 85 |
| Services "properly." | 30.6 | 109.5 / 100.4 | 355.7 / 325.9 | 85 |
| Contact "conversation" | 20.15 | 72.1 / 66.1 | 355.5 / 325.7 | 85 |

Before (frozen, width 100), widest line at 390: Home 324.9, About 323.3,
Services 332.0, Contact 345.7.

## The answer

1. **Body face: Archivo.** It sets Swiss body text without drawing attention,
   keeps swiss to one family with the display, and the 17px size is not too
   characterful. Inter is the wider, more UI-looking face and adds a second
   font file. One small cost: Archivo's word spacing is tight at 17px.
   If the founder finds it cramped, `word-spacing: 0.04em` on body fixes it
   without leaving the family (not proved).
2. **The fill works; the poster does not yet.** The width axis at 85 fills
   the measure for all four giants. Brief item 9 also wants body type at or
   below the fold, and on Home the subline starts at y=768 (390x844) and
   y=739 (360x800), so that half is not met. Open Tier B item: a Home phone
   rule holding the subline at or below the fold (for example a hero
   min-height to the fold); not proved here. At ~30vw "Design" is about 98% of the measure at width 100 (it
   only just overflows at 1.018), so the brief's 30vw needs almost no
   condensing. Taking the width to 85 lets the type go to 37.5% of the
   measure (34.5vw), a taller poster for the same fill. Contact cannot go
   bigger than about 18.6vw because "conversation" is twelve letters; that is
   the limit of the page, not of the axis.
   The unit is a fraction of the measure (`100vw - 2 * var(--margin)`) so the
   fill holds at 390 and 360 alike.

## What Tier B lifts

- `src/pages/t/swiss/[...page].astro`: replace the Archivo
  `wght` import with `@fontsource-variable/archivo/standard.css`; drop the
  Public Sans and IBM Plex Mono imports. `meta.ts`: fonts list and preload are
  the single `archivo-latin-standard-normal.woff2` (90,104 bytes, one file; the
  proof's `unicode-range` is the Latin block).
- `theme.css`: `--font-body` and `--font-mono` become the Archivo stack; body
  `font-size: 1.0625rem; line-height: 1.5rem; font-weight: 400; font-stretch: 100%`;
  `.sw-body > p + p { margin-top: 1.5rem }`; metadata rule (Archivo 500,
  tabular figures, 0.01em); `.sw-idx` removed from the markup, not hidden, in
  the build (the proof hides it only to avoid touching `src/`). Retire `.sw-vert`
  and the mono role as item 7 says.
- Phone giants: the `@media (max-width: 639.98px)` block, with `--sw-measure`
  and `--sw-wdth: 85` in `theme.css` and each page's own phone rule setting
  `--sw-k` (Home .375 on `.billboard`, About .363, Services .306, Contact
  .2015 on `.title`) plus `font-size: calc(var(--sw-measure) * var(--sw-k))`,
  `font-stretch: calc(var(--sw-wdth) * 1%)`, `max-width: none`. The proof's
  `data-proof-page` attribute is only a stand-in for per-page files.
- The `Archivo Variable fallback` metric-override face needs its
  `size-adjust` and `ascent-override` recomputed for the standard file.

## Not covered

- Poster half of item 9: body type below the fold on Home (see answer 2).
  Other pages' first screens were not measured for this.
- The header (still the 2x2 cluster in these images) belongs to the header
  and phone-structure work in brief item 9; this proof is the giants only.
- Item 8's full 24px grid beyond body and `.sw-body` gaps is not proved here.
- The Public Sans file is still requested by the frozen build (the proof
  replaces the family in use, not the page's font links); the one-file network
  result is a Tier B check.
