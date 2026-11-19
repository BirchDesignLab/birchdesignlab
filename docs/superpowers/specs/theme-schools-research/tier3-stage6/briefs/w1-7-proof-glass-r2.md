# W1 task 7: proof, glass R2 (a lens that bends the real page)

Shared rules: `w1-common.md`. A proof: **no school code changes.** Source:
`../a1-critic-glassmorphism.md` (G5, R2), stop 1 call 2 (an R2 Home-only
proof shown at stop 2; if taken, R2 becomes its own stage).

Build a proof page under `scripts/themes/proofs/stage6-glass-r2/` that loads
glass Home's markup and styles (copy what you need; do not edit
`src/themes/glassmorphism/`) and adds:

1. A top-layer magnifier lens over the page in Chromium: a fixed element
   with `backdrop-filter: url(#lens-displace)` (displacement, no blur) that
   visibly bends the headline, body text and the Control Centre as it is
   dragged; pointer pass-through at the centre with a rim handle to grab;
   keyboard (arrow keys) kept; Safari and Firefox noted as falling back to
   today's WebGL lens (no need to wire it in the proof).
2. A clear lensing header bar that content visibly warps under as it
   scrolls.
3. One extra glass toy sketched (a pill lens or a glass ruler over the
   Services steps), enough to judge.

Write `../proofs/glass-r2.md`: what it shows, frame cost (trace at 1440 and
390), hit-testing over links, Chromium-only limits, and what building it for
real would take (tasks, risks).

**Owns:** `scripts/themes/proofs/stage6-glass-r2/**`,
`docs/superpowers/specs/theme-schools-research/tier3-stage6/proofs/glass-r2.md`,
`scripts/themes/stage6/w1-t7-*.mjs`.

**Films and sheet for the founder:** dragging the lens across "Birch Design
Lab" and a paragraph at 1440, both schemes; the header with content
scrolling under it; one 390 frame.
