# Stage 5 Tier B, wave B2 (cottagecore): rules shared by every task

Read with your own task brief (`b2-1` to `b2-5` in this folder).

**Binding, in order:** `../stage5-decisions.md` (all its "Answers"
sections, including the approved D1 wording), `../tier-a-report.md`
("Answers": the founder took every call, and calls 6 to 8 are cottagecore's),
`../../tier3-briefs/stage0-decisions.md` (including the Stage 1 note on the
fireflies and the dandelions), then `../../tier3-briefs/cottagecore.md` (the
items your task names). The proofs in `../proofs/` (`cc-hands.md`,
`cc-dark-paper.md`, `cc-floaters.md`) say exactly what to lift; their
critics' deferred minors are in `scripts/themes/.out/stage5/ledger.md`
(Tier A, Tasks 4 to 6) and are yours to fix when you lift that code.
`src/themes/README.md` holds the school contract.

- **Character is protected.** The founder: this school is "absolutely selling
  what we can do". The brief's section 2 ("Protect") is binding: the
  gingham weave, the washi tapes, the Pressed.astro drawings, the About
  herbarium sheet, the recipe cards, the two-part jar-label wordmark and its
  morph, Fraunces as the display voice, the postcard and the Sent envelope,
  the lamplight dark concept, the fireflies and their lifecycle (the founder
  likes them), specimens that never move, the phone nav's stitched seam, the
  sewn-label button and link states, the Contact field focus, the torn
  butter notes, the hero billboard's scale, restraint. Raise, never repaint.
- **Fixed by contract:** copy (word parity: no visible word added, removed
  or changed, apart from the approved D1 words, which are decorative and
  `aria-hidden`), link targets, page set, Contact form fields, labels, order
  and behaviour, the portal head and switcher, exactly one cross-school
  `transition:name` (the header wordmark).
- **Do not regress Stage 2:** the "laid on the table" arrival
  (`cc-sheet-away`, `cc-sheet-in`, `cc-sheet-settle`), the wordmark's fade
  pair, `cottagecore-header` held still in-school. Whenever your task
  touches layout or the header, film an arrival through the real switcher
  and an in-school swap at 1440 and 390 and compare with the baseline snap
  (`stage5-base`).
- **No reduced-motion work** (S1); critics do not flag it.
- **Interactables** (S3 and the founder's 10-03-26 answer: every one is in
  scope). One that does something is a real control with an `aria-label`;
  one that does nothing is `aria-hidden` and not focusable. Hover rules
  inside `@media (hover: hover)`; touch works too. No visible label text.
- **S5:** cottagecore's hoop is freehand embroidery, never counted
  cross-stitch lettering and never an alphabet row (grandmillennial owns
  those). Cottagecore gets twine, not bows.
- **Contrast:** every new ink or surface updates `meta.ts` contrast pairs in
  both schemes, and `npm run verify` checks them.
- **Every review size** (1440, 1280, 1024, 820, 390), light and dark.
  Whole-page before and after sheets against `snap-stage5-base`.
- **Do not polish copy-dependent line breaks** (the copy pass comes later),
  except where the brief names one (item 7's trust line).
- No em dashes in anything a visitor reads.
