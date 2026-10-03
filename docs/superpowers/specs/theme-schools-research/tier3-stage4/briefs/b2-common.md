# Stage 4 Tier B, wave B2 (bauhaus): rules shared by every task

Read with your own task brief (`b2-1` to `b2-4` in this folder).

**Binding, in order:** `../stage4-decisions.md` (every "Answers" section),
`../../tier3-briefs/stage0-decisions.md`, then `../../tier3-briefs/bauhaus.md`
(the items your task names; its "Protect" list is binding too). The proofs
in `../proofs/` (`bauhaus-numerals.md`, `bauhaus-assembly.md`) say exactly
what to lift and what they got wrong. `src/themes/README.md` holds the school
contract.

- **Fixed by contract:** copy (word parity: no visible word added, removed or
  changed), link targets, page set, Contact form fields and behaviour, the
  portal head and switcher. Everything visual is open.
- **Founder calls already made:** no red type anywhere in bauhaus (S4, F2
  declined). E4 (the lesson line) waits for the copy pass: do not touch
  `meta.ts` `lesson`. E5 shipped in Stage 2. F3: keep the About B's red bowl,
  make the hero eye's stroke neutral. F4: keep the yellow slab on "to shine".
  F6: keep the black wall in dark. F7: no ambient motion.
- **Protect:** the Home hero (stacked lowercase name, balance-beam poster,
  heavy base rule, build order), the header (trio mark, lowercase wordmark,
  current page as a solid red block), the 6px rule system and twelve-column
  grid, the full-bleed colour bands, the Home doors, the Services process
  module, About's assembling B, Sent's composition, the `.btn` slab whose
  square turns into a circle on hover.
- **Do not regress Stage 2:** the circle-wipe arrival, the in-school swap,
  the wordmark ghost fix. Film an in-school swap and an arrival through the
  real switcher at 1440 and 390 whenever your task touches layout, against
  the baseline snap (`stage4-base`).
- **No reduced-motion work** (S1). Existing reduced-motion rules may stay.
- **Interactables** (S3): a control that does something is a real control
  with an `aria-label`; one that does nothing is `aria-hidden` and not
  focusable. No visible label text that breaks word parity.
- **Contrast:** every token or layering change updates `meta.ts` contrast
  pairs; `npm run verify` checks both schemes.
- **Every review size** (1440, 1280, 1024, 820, 390), light and dark;
  whole-page before and after sheets against `snap-stage4-base`.
- **Scripts you write** (probes, sheet makers) go under
  `scripts/themes/bauhaus/` and are committed with your work.
- Do not polish copy-dependent line breaks. No em dashes in anything a
  visitor reads.
