# B1 task 3: swiss page compositions, the tree field and "Birch" (item 6, D1, D2, item 13 orphans)

Shared rules: `b-common.md`. Swiss brief item 6, decisions D1 and D2, and the
orphan half of item 13.

1. **Each page its own composition under one programme** (item 6): Home 2
   fields (billboard as Home's image, the lead and subline hung from one
   column line on the baseline of "Lab"; doors as two equal fields with
   "How we build" hung under the right body; lab band; closer), About 3
   fields, Services 4 (Custom software and Web design side by side, the
   numerals row as the second giant), Contact one sheet (full-bleed black
   hero in light too), Sent untouched. The title-left/body-right table goes
   on at least two of the three content pages.
2. **The tree field (D1)**, lifted from `../proofs/swiss-duotone.md`
   (mapping B, red-and-paper; manifesto white beside the tree, never on it):
   - Re-render a large still of the Shining Tree from the live BDL-007 scene
     (`src/experiments/bdl-007/`, served at its Lab page) on the GPU at least
     2400px on its long side, in a committed script under
     `scripts/themes/swiss/`, then make the duotone with the proof's
     `make-duotone.mjs` method. The source must be sharp on 2x phones.
   - The field's image is **one swappable asset** (a single import or
     constant): the founder may swap in a different logo or image later.
   - Loaded through `astro:assets`, lazy below the fold where the browser
     allows (the proof's minor C3: a CSS background is not lazy; use an
     `<img>` or `<picture>`).
   - The Home red rectangle goes; its line stays as ink on paper, hung per
     item 6.
3. **The rotated "Birch" (D2)**, lifted from `../proofs/swiss-rotated.md`:
   left frame edge from 640 up, width axis 62 at 1440 and up and opening
   below (the proof's values), dropped below 640, `aria-hidden`, the copy's
   capital, its ink on the frame line (proof minor C3). The `.sw-vert`
   kickers set level on every page.
4. **Orphans** (item 13, first half): "How we build" hangs directly under the
   last door body.
