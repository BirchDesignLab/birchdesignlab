# Proof a4: bauhaus, constructed numerals (E3)

Shared rules: `a-common.md`. Task name for paths: `bauhaus-numerals`.

**Question.** Can numerals built from bars and circles, after Albers's
standard elements (dossier [16], brief E3), replace Unbounded everywhere
bauhaus shows a numeral, read clearly at every size they appear, and become
the school's signature detail?

**Make.**
- Read brief E3 and find every place bauhaus sets a numeral in Unbounded
  (`--font-num` in `src/themes/bauhaus/theme.css`, and its uses in the pages).
- The digits 0 to 9 as constructed forms: a small set of elements (bar,
  quarter and half circle, full circle) on one module, drawn as inline SVG
  symbols in a committed file
  (`scripts/themes/proofs/stage4-bauhaus-numerals/numerals.svg` plus a
  sample page or injection script). Each digit has an accessible text
  equivalent where it replaces real text: the visible digit stays in the DOM
  for parity and screen readers (for example the SVG is `aria-hidden` and the
  text is visually replaced), so no copy changes. Say how.
- Pairing: if a numeral uses colour, it obeys the house pairing (yellow
  triangle, red square, blue circle; a circle element in a numeral is not a
  free-standing shape, so ink is fine).

**Capture.** A specimen sheet of 0 to 9 at three sizes; every page where
bauhaus shows a numeral, at every size, light and dark, before (Unbounded)
and after.

**Answer to give.** The element set and module, each digit, the replacement
technique with its accessibility and parity check, and what Tier B lifts
(the SVG file, CSS, the markup pattern). Unbounded's import can then go.

**Owns.** `scripts/themes/proofs/stage4-bauhaus-numerals/**`,
`scripts/themes/harness/stage4-bauhaus-numerals-proof.mjs`,
`docs/superpowers/specs/theme-schools-research/tier3-stage4/proofs/bauhaus-numerals.md`.
