# Stage 6 wave 1: rules shared by every task

Read with your own task brief (`w1-1` to `w1-8` in this folder).

**Binding, in order:** `../stop1-report.md` ("Answers": the founder took
every recommendation, 11-19-26), `../stage6-decisions.md` ("Answers"), the
school report your brief names (`../a1-critic-<school>.md`,
`../a1-glass-drag-diagnosis.md`), then `../../tier3-briefs/stage0-decisions.md`
and the school's dossier and Tier 3 brief. Earlier stages' decisions still
hold unless the stop 1 answers changed them. `src/themes/README.md` holds the
school contract.

- **Fixed by contract:** copy (word parity: no visible word added, removed
  or changed, except words the founder approved in the stop 1 answers, set
  `aria-hidden` where the brief says), link targets, the page set, Contact
  form fields, labels, order and behaviour, the portal head and switcher,
  exactly one cross-school `transition:name` (the header wordmark).
- **Transitions are the next phase.** Do not redesign arrivals or in-school
  swaps; do not regress them either. Whenever your task touches layout, the
  header or anything with a `view-transition-name`, film an arrival through
  the real switcher and an in-school swap at 1440 and 390 and compare with
  the baseline snap `stage6-base`.
- **No reduced-motion work** (Stage 0 S1); critics do not flag it.
- **Interactables:** one that does something is a real control with an
  `aria-label` that starts with any visible word; one that does nothing is
  `aria-hidden` and not focusable. Hover rules inside
  `@media (hover: hover) and (pointer: fine)`; focus styles never gated;
  touch works too, and a vertical swipe always scrolls.
- **Contrast:** every new ink or surface updates `meta.ts` contrast pairs in
  both schemes; `npm run verify` checks them.
- **Every review size** (1440, 1280, 1024, 820, 390), light and dark.
  Whole-page before and after sheets against `snap-stage6-base`. Tablet
  (820) was the weakest width in most reports: look at it on purpose.
- **Glass captures:** the fixed wallpaper paints only in the top viewport of
  a full-page shot; judge glass from viewport frames at scroll offsets.
- **Reduced transparency:** this machine's Windows reports
  `prefers-reduced-transparency: reduce`. Every probe forces
  `no-preference` (CDP `Emulation.setEmulatedMedia`, as
  `scripts/themes/capture.mjs` does) unless the brief says to test reduce.
- **Do not polish copy-dependent line breaks** (a copy pass comes later).
- No em dashes in anything a visitor reads. No names of people anywhere.
- Probe and edit scripts go in `scripts/themes/stage6/` (named
  `w1-t<n>-*.mjs`) and are committed with the task.
