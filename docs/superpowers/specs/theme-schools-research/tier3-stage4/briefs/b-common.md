# Stage 4 Tier B, wave B1 (swiss): rules shared by every task

Read with your own task brief (`b1-1` to `b1-4` in this folder).

**Binding, in order:** `../stage4-decisions.md` (all its "Answers" sections),
`../../tier3-briefs/stage0-decisions.md`, then `../../tier3-briefs/swiss.md`
(the items your task names). The proofs in `../proofs/` say exactly what to
lift and what they got wrong; their critics' deferred minors are in the
proof write-ups. `src/themes/README.md` holds the school contract.

- **Fixed by contract:** copy (word parity: no visible word added, removed or
  changed), link targets, page set, Contact form fields and behaviour, the
  portal head and switcher. Everything visual is open.
- **Do not regress Stage 2:** swiss's column-panel page swap (four uneven
  desktop beats, phones one panel per beat), the one-step wordmark,
  `swiss-header` held still in-school. Film an in-school swap and an arrival
  through the real switcher at 1440 and 390 whenever your task touches
  layout, and compare with the baseline snap (`stage4-base`).
- **No reduced-motion work** (S1). No ambient motion (swiss has no fx).
- **Interactables** (S3): a control that does something is a real control
  with an `aria-label`; one that does nothing is `aria-hidden` and not
  focusable. No visible label text that breaks word parity.
- **Contrast:** every token or layering change updates `meta.ts` contrast
  pairs, and `npm run verify` checks them in both schemes.
- **Assets** go through `astro:assets`; decorative images get `alt=""`.
- **Every review size** (1440, 1280, 1024, 820, 390), light and dark.
  Whole-page before and after sheets against `snap-stage4-base`.
- **Do not polish copy-dependent line breaks** (the copy pass comes later).
  Fix structure, not line breaks.
- No em dashes in anything a visitor reads.
