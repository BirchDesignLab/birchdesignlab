# W5 task 31: final fixes (your stop 5 verdicts)

Shared rules: `w4-common.md` (and through it w1 to w3 common). Source:
`../stop5-critique.md` (the founder took every verdict, 11-21-26; its build
instructions are the spec and its full text wins over this summary), the
two defects named in `../stop5-report.md` call 6. Small, exact changes: no
new toys, no new words, no layout moves beyond what is named.

1. **Swiss Sent full stop (D1).** Take the hover outline off the hit
   square's `::after` (`src/themes/swiss/pages/Sent.astro` around 59 to 72;
   the 44px-plus square stays as the hit area, unpainted). Draw it on a new
   `.stop[data-live]::before` boxing the dot's measured ink plus 8px each
   side, `outline: 1px solid var(--mark)`, in the same hover and fine-pointer
   query. Measure the ink at 390 and 1440 (not the advance box); at 1440 the
   outline must clear the foot of the "t".
2. **Swiss "Birch" (D2).** `About.astro` around 225: `cursor: default`;
   pointer-events and the hover ink block stay; update the comment around
   212.
3. **Vaporwave elevator (D3).** `elevator.ts` around 91: drop the
   `BRING_QUERY` condition, delete the constant and its rationale (around 53
   to 63), header (around 12 to 16) says "at every width". An off-screen
   target window scrolls into view (smooth, centred) at every width; in
   view, nothing; no scroll back.
4. **Experiment press colours (E4).** Remove the `:active` rules task 28
   added at `src/experiments/bdl-012/Experiment.astro` around 452 and 560,
   `bdl-001/BarkEngine.svelte` around 178, `bdl-002/Experiment.astro` around
   71, `bdl-003/NovgorodLetters.svelte` around 80, and
   `src/pages/styleguide.astro` around 185 (`#copy-tokens`). **Keep**
   `bdl-012` around 748 and 751 (links). Remove only those `:active`
   selectors; hover rules stay gated.
5. **Swiss numeral (E m2).** In `src/themes/swiss/toys.ts`, where
   `!r.started` leads to `rest(n)` (around 313) and in the swipe branch
   (around 358 to 360): if `r.weight !== W_REST`, run the constant-speed
   return from `r.weight` instead of `rest()`, so a touch during the return
   or the touch beat never snaps the weight.
6. **Plates (E m6).** Add `&& warmed` to the plates' `ready` predicate
   (`src/themes/grandmillennial/parts/plates.ts` around 331); the comment
   about 36px around `pages/Contact.astro` 322 says 26px (the foreshortened
   rise of the same `rotateX(-105deg)`).
7. **Cottagecore comment (E m5).** `src/themes/cottagecore/theme.css`
   around 191: the dark needle thread comment matches the code (#a24a58,
   deepened for contrast, no longer the sprig's rose).
8. **Bauhaus timer (defect).** `built()` returns true when the element has
   no CSS animation (`src/themes/bauhaus/parts/toys.ts` around 398 to 405),
   so the numeral beat spends once and `parts/beat.ts` (around 79) stops
   re-arming its retry timer. Not reduced-motion work: a timer that never
   stops is the defect.
9. **Vaporwave My Computer floppy (defect).** The floppy body
   (`src/themes/vaporwave/pages/Sent.astro` around 120, `--bar-ink` on
   `--field-raised`) is 1.06:1 in dark. Fill it with a palette ink that
   reads in both schemes and add the contrast pair (min 3) in the school's
   `meta.ts`; its label rect and shutter keep reading.

**Owns:** `src/themes/swiss/**`, `src/themes/vaporwave/**`,
`src/themes/grandmillennial/**`, `src/themes/cottagecore/theme.css`,
`src/themes/bauhaus/**` (not the `?bh-assembly` switch),
`src/experiments/**` (the named `:active` rules only),
`src/pages/styleguide.astro`, `tests/swiss-*.test.ts`,
`tests/built/swiss*.test.ts`, `tests/vaporwave-*.test.ts`,
`tests/gm-*.test.ts`, `tests/cottagecore-*.test.ts`,
`tests/bauhaus-*.test.ts`, `tests/hover-guard.test.ts`,
`scripts/themes/stage6/w5-t31-*.mjs`.

**Films:** the swiss full stop's hover at 1440 and 390-fine (outline clear
of the "t"); "Birch" hover with its cursor at 1440; the elevator B1 and 1F
at 1440, 820 and 390 (scrolled into view when off screen; in view, no
movement); a 100 ms tap on the swiss numeral during its return and during
its touch beat at 390 (timed strip, no snap); the plates' beat on a tall
phone (after the warm-up); the dark My Computer window at 1440 and 390; the
bauhaus numerals with `animation: none` forced (the retry stops: timer
count measured); a tap on each changed experiment control at 390 (no press
colour) and on the two kept links (press colour kept); arrival and
in-school swap at 1440 and 390 for swiss and vaporwave against
`stage6-base`.
