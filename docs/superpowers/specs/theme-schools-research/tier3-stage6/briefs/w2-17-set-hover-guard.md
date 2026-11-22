# W2 task 17: set-wide, the hover guard and stragglers

Shared rules: `w2-common.md`. Source: `../stop1-report.md` ("Going in
without a call", Set-wide). Tasks 15 and 16 gated grandmillennial's and
cottagecore's hover rules; this task makes the rule permanent.

1. **The guard.** A test in `tests/hover-guard.test.ts` that reads every
   school's CSS, built and in-component (`src/themes/**` `.css` and
   `<style>` blocks in `.astro`, quiet included), and fails on any `:hover`
   selector not inside `@media (hover: hover) and (pointer: fine)` (or a
   query that implies it). A rule that shares a selector list with
   `:focus-visible` or `:focus` fails too: they must be split so focus stays
   ungated. Prefer checking the built CSS in `dist/` if the test can depend
   on a build; otherwise parse the sources and say which in the report.
   Allow-list nothing silently: any exception is a named entry with a reason
   in the test.
2. **Stragglers.** Gate every rule the guard finds in the other schools
   (glass, swiss, bauhaus, vaporwave, quiet, the portal head and switcher),
   splitting focus selectors. No visual change on a fine pointer.
3. **Mutation check.** Show in the report that the guard fails when one
   ungated `:hover` rule is put back (then remove it).

**Owns:** `tests/hover-guard.test.ts`, `src/themes/**/*.css`, the `<style>`
blocks of `src/themes/**/*.astro` (selectors and media wrappers only, no
other change), `src/themes/portal/**`, `scripts/themes/stage6/w2-t17-*.mjs`.

**Films:** each school's Home at 1440 with a mouse hover over a link and a
control (unchanged from `stage6-base` apart from earlier tasks), and at 390
a tap on the same element leaves no hover state; keyboard focus rings
visible at 1440 in every school.
