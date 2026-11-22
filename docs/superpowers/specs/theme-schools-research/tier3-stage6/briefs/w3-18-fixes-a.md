# W3 task 18: fixes A, the business site's hovers, glass, swiss, bauhaus, the proofs, the guard

Shared rules: `w3-common.md` (no new toys in this task). Sources: stop 3
answers 1 and 2 (`../stop3-report.md`, "Answers"; `../stop3-critique.md`),
wave 2 deferred minors for tasks 9 to 12 and 17 (quoted below).

**1. The business site's hovers (stop 3 answer 1).** The live business
pages share `src/styles/base.css`, `src/components/ThemeToggle.astro` and
`src/components/BarkCredit.astro`, whose `:hover` rules are not limited to
mouse, so a phone tap leaves a hover colour stuck. Gate them at the source:
wrap `a:hover` (base.css around 27) and `.loud a:hover` / `.loud
.more-link:hover` (around 103) in `@media (hover: hover) and (pointer:
fine)`, add `(pointer: fine)` to the `(hover: hover)` blocks (around 77 and
94), gate ThemeToggle's `button:hover`, and split BarkCredit's
`:focus-visible` out of its hover list so focus stays ungated. Then delete
the Portal's touch-only undo block in `src/themes/quiet/portal.css` (about
lines 40 to 47) and empty the guard's allow-list entries for these files.
**No visual change on a mouse or trackpad**: this is the live business site
(quiet luxury, Lighthouse 100s). Whole-page before and after sheets of the
business Home, Services, About, Contact and Lab at 1440 and 390, both
schemes, with a forced hover on a link and the theme toggle at 1440 (same
as before) and a tap at 390 (no stuck colour).

**2. The hover guard (task 17 minors), now that the sources are gated:**
- C2: `gated()` must split the media prelude on top-level commas, require
  every branch to carry both `(hover: hover)` and `(pointer: fine)`, and
  reject a leading `not`.
- C3: canaries: the switcher scan yields at least 3 hover rules, and the
  total of gated hover rules across the scan stays above a floor.
- C4: write `docs/superpowers/specs/theme-schools-research/tier3-stage6/hover-guard.md`
  recording the mutation check (the failing message, then the revert) and
  the sources-not-dist choice.
- rc1-N1: a stale allow-list entry (its rule now gated) fails the test.
- r2-N1, r2-N2, r2-N3: moot once item 1 deletes the undo block; if any
  touch-only allowance remains in the guard, reject `not` and ` or `
  branches and self-test both.

**3. Bauhaus (stop 3 answer 2 and task 12 minors):**
- The Home hero square's hover stays as built (the founder took the
  critic's verdict: the block cannot clear a beam the square stands on).
- C1: leave the pick-me beat out of `stillBuilding` so a press, touch,
  hover or arrow key during the 440 ms beat cancels it and picks the square
  up (`parts/loose.ts` around 152 to 172, 241).
- C2: a mouse press always shows the ink block (`setLift(el, true)` whenever
  `fine.matches`), not only when a shadow already exists.
- C3: on release with the mouse still over the shape, drop straight to the
  lift offset, not to 0 and back up.
- C4: Services' doc comment describes the beam diagram, not coloured bars.

**4. Swiss (stop 3 answer 2 and task 10 minors):** the About foot rule and
both hairlines stay as built (founder, stop 3). Minors:
- C1: a dropped column tag snaps to the next baseline-grid line
  (`Math.ceil(kr.bottom / u) * u`), not `ceil(key bottom)`.
- C2: About's per-line flush comment says the values depend on today's copy
  and a heading change must re-run `w2-t10-flush.mjs`.
- C3: re-film the "mid-return" swap clicking about 150 to 200 ms after
  release so a real mid-travel swap is shown (or relabel it "mid-hold").
- The "From the lab" chip on phones runs wider than its words: fit it.

**5. Glass (task 9 minors):**
- C2: the phone `--mat-regular` override must not beat the no-backdrop-filter
  fallback: nest it in `@supports (backdrop-filter: ...)` (nested queries,
  not `or`), and fix Tinted's same class of bug.
- C3: a release slower than a small tap threshold counts as zero velocity
  (or a glide that stops within 2px of the corner spot runs `checkRest` with
  the corner margin), so a jittery tap on the approved phone and tablet
  corner start leaves the lens in place.
- C4: film a throw from an open corner toward and along the window edge at
  1024; park the pointer on a pushed orb before the scroll probe and on
  every page in the still probe.

**6. The proofs (task 11 minors):** `proofs/glass-r2.md` drops or corrects
the "within about 10%" sentence (name the columns over 10%) and cites
`proof.js:316` for the phone ring; `scripts/themes/stage6/w1-t8-rapid.mjs`
exits non-zero when the end is not 4, the clip is not none, or errors occur.

**Owns:** `src/styles/base.css`, `src/components/ThemeToggle.astro`,
`src/components/BarkCredit.astro`, `src/themes/quiet/**`,
`src/themes/glassmorphism/**`, `src/themes/swiss/**`,
`src/themes/bauhaus/**` (not the `?bh-assembly` switch),
`tests/hover-guard.test.ts`, `tests/glass-*.test.ts`,
`tests/swiss-*.test.ts`, `tests/built/swiss*.test.ts`,
`tests/bauhaus-*.test.ts`,
`docs/superpowers/specs/theme-schools-research/tier3-stage6/proofs/**`,
`docs/superpowers/specs/theme-schools-research/tier3-stage6/hover-guard.md`,
`scripts/themes/stage6/w1-t8-*.mjs`, `scripts/themes/stage6/w3-t18-*.mjs`.

**Films:** the business pages above; the glass throw at 1024 and the
jittery tap at 390 and 820; bauhaus Home hover and a grab during the beat
at 1440; swiss grid key latched at 820 and 1024 touch, the phone chip, the
re-filmed swap; arrival and in-school swap at 1440 and 390 for quiet,
glass, swiss and bauhaus against `stage6-base`.
