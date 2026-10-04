# Proof a1: grandmillennial, a real toile de Jouy (item 1)

Shared rules: `a-common.md`. Task name for paths: `gm-toile`.

**Question.** Can we draw a single-ink, figurative toile, in engraved line
and hatching after Huet's "The Activities of the Farm" (brief item 1, dossier
G1, T4, C5), that reads as little scenes and not as a leaf scatter, at swatch
scale and at wall scale, in both schemes?

**Make.**
- An SVG `<pattern>` (id `gm-toile`, meant to replace `#gm-porcelaine` in
  `src/themes/grandmillennial/parts/Defs.astro`) drawn in strokes only:
  scattered pastoral islands with bare ground between them. Studio-native
  vignettes: a birch grove with a bench, a writing desk under a tree, a small
  figure reading a letter, a garden urn. At least four vignettes; tone from
  hatching density, no fills beyond the ink.
- Repeat at least 400px, half-drop, motifs crossing tile edges so no seam or
  row reads at 1440.
- One ink per scheme through a custom property: `--porcelain-ink` (or
  `--oxblood`) on `--field` in light, gold line on hunter in dark. Show both
  light inks and say which reads better.
- Keep the SVG lean: record the pattern's byte size and the paint cost
  (Chromium paint time of a full-viewport wall, a rough number is fine).

**Capture.** The Services No. 2 swatch with the toile injected (every size,
both schemes); a full-bleed 1440 and 390 wall of it (for item 2 and a2);
100% zoom crops showing line, not blobs.

**Answer to give.** The pattern markup ready to drop into `Defs.astro`, the
ink tokens, the repeat size, the byte size, and the founder sheet.

**Owns.** `scripts/themes/proofs/stage5-gm-toile/**`,
`scripts/themes/harness/stage5-gm-toile-proof.mjs`,
`docs/superpowers/specs/theme-schools-research/tier3-stage5/proofs/gm-toile.md`.
