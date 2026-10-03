# Proof a1: swiss, the red duotone Shining Tree on About (D1)

Shared rules: `a-common.md`. Task name for paths: `swiss-duotone`.

**Question.** Does a red duotone of the Shining Tree still, as a full-bleed
field on swiss About carrying the manifesto in white, read as a Swiss poster
photograph (Wachsmann model, `tier3-briefs/swiss.md` D1 and item 3), with the
manifesto legible, in light and dark, at every size?

**Make.**
- A duotone of `src/experiments/bdl-007/still.png`: ink mapped to swiss red
  `#da0016` (check against the dark tokens of brief item 4, which keep
  `#da0016` with white type on red), highlights to paper or white. Try two
  mappings at most (red-and-black, red-and-paper) and say which reads better.
  Make it with `sharp` in a committed script
  (`scripts/themes/proofs/stage4-swiss-duotone/make-duotone.mjs`), output a
  WebP sized for a full-bleed field; record its byte size.
- Proof CSS that turns About's manifesto section into a full-bleed image
  field (true viewport bleed, `margin-inline: calc(50% - 50vw)` or
  equivalent; never a gutter card), with the manifesto pull in white on it.
  Measure the text contrast on the darkest and lightest areas under the text
  block (sample the pixels); it must reach 4.5 for body size and 3 for large
  display, or the proof says what scrim or crop fixes it.
- The Home red rectangle removed (D1 = drop it), Home captured to show the
  billboard alone.

**Capture.** About (full page and the field crop) and Home hero, every size,
light and dark.

**Answer to give.** Which mapping; the crop and focal point per size (the
tree must stay readable at 390 portrait); measured contrast; file weight; the
exact CSS and asset path Tier B lifts.

**Owns.** `scripts/themes/proofs/stage4-swiss-duotone/**`,
`scripts/themes/harness/stage4-swiss-duotone-proof.mjs`,
`docs/superpowers/specs/theme-schools-research/tier3-stage4/proofs/swiss-duotone.md`.
