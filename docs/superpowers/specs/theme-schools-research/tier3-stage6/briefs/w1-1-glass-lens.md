# W1 task 1: glass, the lens bugs and the transparency policy

Shared rules: `w1-common.md`. Sources: `../a1-glass-drag-diagnosis.md`
(sections C, B, A and "For the glass critic"), `../a1-critic-glassmorphism.md`
(G1, G5), stop 1 call 1 answer (a).

1. **One lens per Home visit** (diagnosis C). In
   `src/themes/glassmorphism/lens/idle-after-arrival.ts` add a `fired` guard
   to `runIdle` and `clearTimeout(safety)` on the MutationObserver path;
   `home-boot.ts`'s idle callback returns early if a lens exists. A unit test
   in `tests/` for the guard. Check with
   `scripts/themes/stage6/glass-diag-swap.mjs`: exactly one `+lens-hit` per
   Home visit, after arriving through the switcher and after returning to
   Home in-school.
2. **The lens never rests under a pane** (diagnosis B, the recommended
   behaviour). `nearestOpenSpot(bounds, radius, from, obstructions,
   maxCover)` in `physics.ts` on the start-position grid; in `lens.ts` a
   `checkRest()` after a zero-velocity release, on the tick a glide stops,
   and on the hit button's blur: when more than 50% of the disc is covered,
   ease (no spring, `k = 1 - exp(-dt / 0.12)`) to the nearest spot with at
   most 20% cover; pointerdown cancels. Unit tests for `nearestOpenSpot`.
   Check with `glass-diag-drag.mjs`: every landed disc at least 50% grabbable,
   later drags (after idle, after resize) move it.
3. **The Portal ignores `prefers-reduced-transparency` for glass** (call 1
   answer (a)). Remove the reduce half of the media queries at
   `theme.css` about :216, :669 and :1432 and the reduced-transparency checks
   in `fx.ts` (about :65 and :386); keep every `prefers-contrast: more`
   branch working as today. Record the decision in a comment where E10's
   rules were. Check with `glass-diag-os-media.mjs` and a probe forcing
   `reduce`: the page renders exactly as `no-preference` (pixel diff), and
   `prefers-contrast: more` still gets its fallback.
4. **Diagnosis "for the glass critic" items:** no lens mounted when the lens
   is hidden (`home-boot.ts` about :129-142); the travel box's bottom inset
   measured against the fixed switcher, not `[data-portal-tail]`
   (`home-boot.ts` about :20-26); at 1024 the lens starts at least 50%
   grabbable.

**Owns:** `src/themes/glassmorphism/lens/**`, `src/themes/glassmorphism/fx.ts`,
`src/themes/glassmorphism/theme.css`, `src/themes/glassmorphism/pages/Home.astro`,
`tests/glass-*.test.ts`, `scripts/themes/stage6/w1-t1-*.mjs`.

**Films:** Home at 1440, 1280, 1024: drag and throw the lens into a pane
(it settles into open wallpaper); arrive via the switcher then go About and
back to Home (one lens, no ghost); both schemes; the reduce-forced page
equals the default.
