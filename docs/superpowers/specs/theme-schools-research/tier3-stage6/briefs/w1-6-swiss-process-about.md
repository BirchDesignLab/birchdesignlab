# W1 task 6: swiss, the timetable, phone numerals, About's field

Shared rules: `w1-common.md`. Builds on task 4. Sources:
`../a1-critic-swiss.md` (S4, S5, P4), `../stop1-report.md` call 4 (the
timetable) and call 3 (P4 typophoto).

1. **S8, the timetable** (call 4): Services' "how a project runs" becomes a
   timetable: each step a full-width row on the 12-column grid, the numeral
   left as a giant, title and text right, hairline rules between rows, the
   whole set reading as a departures board, not four equal columns. Phones:
   the same rows, numeral on columns 1-2 about five lines tall (S5), or a
   condensed (width 62) numeral at 50-60cqw. Copy unchanged.
2. **P4, typophoto** (founder approved two photographs, 11-19-26). Both are
   CC0 (public domain dedication) by W.carter on Wikimedia Commons; the
   untouched originals are staged in the gitignored
   `scripts/themes/.out/stage6/photos/`:
   - `Part_of_birch_trunk_in_Norrkila.jpg` (4774x2686,
     https://commons.wikimedia.org/wiki/File:Part_of_birch_trunk_in_Norrkila.jpg):
     **the Home band**, a hard-threshold black-and-white band under the
     billboard, cropped by the sheet edge, the lab kicker and pull over it in
     white (the black bark marks on white echo the site's bark dashes).
   - `Birch_trunk_in_Norrkila_1.jpg` (4824x3216,
     https://commons.wikimedia.org/wiki/File:Birch_trunk_in_Norrkila_1.jpg):
     **About's red field**, a red duotone of the upward trunk on its
     diagonal, replacing today's Shining Tree image (`src/assets/swiss-field.webp`).
   Process them with a committed script (`scripts/themes/stage6/w1-t6-photos.mjs`,
   reading the originals, writing the threshold and duotone derivatives at
   web sizes, AVIF and WebP, to `src/assets/swiss-*`); never commit the
   originals. Commit `src/assets/swiss-photos-SOURCE.md` with each file's
   Commons URL, author, CC0 and the processing applied. Image weight before
   and after recorded in the report. Dark scheme: decide how each image sits
   on black and say why. No people appear in either image.
3. **About's field** (S4): the manifesto and button hang at the foot of the
   red field so type and image share its height, at every size.

**Owns:** `src/themes/swiss/**`, `src/assets/swiss-*`,
`tests/swiss-*.test.ts`, `scripts/themes/stage6/w1-t6-*.mjs`.

**Films:** Services and About whole page at every size, both schemes;
Home if P4 lands; an in-school swap to Services.
