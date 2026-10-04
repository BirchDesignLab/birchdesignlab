# Proof a2: swiss, one family (Archivo against Inter) and the phone poster (items 7 and 9)

Shared rules: `a-common.md`. Task name for paths: `swiss-type`.

**Questions.**
1. Body in Archivo (standard axes, weight 400, width 100) at swiss's body
   size against Inter at the same size: which reads as Swiss body text on
   Services and About, and does Archivo read "too characterful" at 17px
   (brief item 7)? Decide it yourself and say why; the founder sees it only
   if the critic cannot choose.
2. Can the phone billboard fill the measure at 390 so "Design" spans it
   (~30vw, Archivo width 85 to 90 if needed), with no horizontal overflow, and
   the first 844px read as one poster (brief item 9)? Same for the About,
   Services and Contact titles as phone giants.

**Make.**
- Proof CSS: Archivo-only swiss (import
  `@fontsource-variable/archivo/standard.css` through the injected style, or
  serve the woff2 from the snap), with an Inter body variant behind one class
  or variable. Section indices dropped; metadata lines in Archivo. Body size
  and line on brief item 8's 24px line (1.0625rem / 24px).
- Phone giants per item 9, using the width axis; measure every giant's box
  against the viewport at 390 and 360 (no overflow, report the numbers).

**Capture.** Services and About at 1440, 1024 and 390 with each body face
side by side; Home, About, Services and Contact first screens at 390 and 360,
light and dark. Report `scrollWidth` against `clientWidth` per page.

**Answer to give.** The body face and why; the width-axis values per giant at
390; the CSS Tier B lifts; the font files and preload (one Archivo woff2).

**Owns.** `scripts/themes/proofs/stage4-swiss-type/**`,
`scripts/themes/harness/stage4-swiss-type-proof.mjs`,
`docs/superpowers/specs/theme-schools-research/tier3-stage4/proofs/swiss-type.md`.
