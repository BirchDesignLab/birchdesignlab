# Proof a5: bauhaus, the assembly feel behind one variable (F1)

Shared rules: `a-common.md`. Task name for paths: `bauhaus-assembly`.

**Question.** With the assembly behind one variable, what do the three feels
look like side by side, so the founder can pick at the end-of-pair stop
(brief F1; `stage4-decisions.md` answer 1)?
- (a) today: 820 ms, `--ease-land` `cubic-bezier(0.2, 0.9, 0.25, 1.12)`
  (12% overshoot), opacity fade-in, the hero ending about 1.58 s.
- (b) mechanical: shapes solid from their first visible frame (keyframes
  `0% { opacity: 0; transform: var(--from) } 1% { opacity: 1 }`), a
  no-overshoot stop such as `cubic-bezier(0.3, 0, 0.15, 1)`, the hero in
  three beats (bar and stem; square and circle; triangle, ring and eye),
  about 1.1 s total.
- (c) middle: (b)'s solid shapes and beats with a 3% overshoot.

**Make.**
- Proof CSS that drives `.asm` (`src/themes/bauhaus/theme.css` around the
  `.asm` rule and `--ease-land`) from custom properties, with one switch
  (`html[data-bh-assembly='a'|'b'|'c']` or a variable) selecting the feel.
  Tier B lifts it so the founder's pick is a one-line change.
- Note the evidence the brief cites (the pink square at +480 ms on arrival,
  the translucent B bowls on About) and show it gone in (b) and (c).

**Capture.** Timestamped strips (`motion.mjs` or a harness of your own built
the same way: real composited frames, time under each frame) of the Home
hero assembling on load and on arrival from quiet, and About's constructed B,
for (a), (b) and (c), desktop 1440 and phone 390, light and dark. One founder
sheet per page with the three feels stacked.

**Answer to give.** The three settings exactly as Tier B ships them, the
strips, and any shape whose timing needed more than the three variables.

**Owns.** `scripts/themes/proofs/stage4-bauhaus-assembly/**`,
`scripts/themes/harness/stage4-bauhaus-assembly-proof.mjs`,
`docs/superpowers/specs/theme-schools-research/tier3-stage4/proofs/bauhaus-assembly.md`.
