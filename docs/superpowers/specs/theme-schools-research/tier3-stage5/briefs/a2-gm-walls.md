# Proof a2: grandmillennial, how loud the papered walls go (item 2, F)

Shared rules: `a-common.md`. Task name for paths: `gm-walls`.

**Question.** On Contact, with the desk card and envelope laid on a
full-bleed chintz wallpaper edged by a ticking or stripe band, which wall
loudness keeps the room composed (brief item 2, decision F; founder answer:
chintz walls at about 60%, toile walls at full ink, swatches full)?

**Make.**
- A wall repeat of the chintz of its own (at least 400px, half-drop; the
  200px `#gm-chintz` tile shows its grid across 1440, so do not just tile
  it), as an SVG pattern ready for `parts/Defs.astro`.
- Proof CSS for Contact: the wall full-bleed behind the desk card and the
  envelope, a ticking or stripe border top and bottom, so two or three
  patterns meet in one viewport. All text stays on `--field-raised` cards.
- Three loudnesses side by side: 100%, about 60% and about 40% ink (by
  opacity of the ink layer or by ink tokens; say which method and why). The
  recommended one is 60%.
- Contrast: measure every text-on-surface pair the wall touches; no text on
  pattern.

**Capture.** Contact at every size, light and dark, for each loudness;
a 1440 crop proving no tile row or seam reads.

**Answer to give.** The wall pattern, the loudness method and value, the
border band, the contrast numbers, and the CSS Tier B lifts for every page's
wall (Services toile, Contact chintz, About chinoiserie from a3).

**Owns.** `scripts/themes/proofs/stage5-gm-walls/**`,
`scripts/themes/harness/stage5-gm-walls-proof.mjs`,
`docs/superpowers/specs/theme-schools-research/tier3-stage5/proofs/gm-walls.md`.
