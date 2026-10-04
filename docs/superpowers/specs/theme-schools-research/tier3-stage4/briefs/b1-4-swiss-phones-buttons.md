# B1 task 4: swiss phones, tablet, buttons, footer and the grid key (items 9, 11, 12, 13, S3)

Shared rules: `b-common.md`. Swiss brief items 9, 11, 12 and the footer half
of item 13, plus the founder's interactables answer (`stage4-decisions.md`,
"Answers", 3).

1. **Phones: the first screen is a poster** (item 9), lifted from
   `../proofs/swiss-type.md`: one flush-left header band (wordmark on one
   line, four links in one row on the 4-column grid, 44px targets), phone
   giants filling the measure, one label layer. The proof did not meet the
   poster half on Home: body type must start at or below the fold at 390x844
   and 360x800. No horizontal scroll at 390 or 360 (hard requirement).
2. **One rule for buttons** (item 11): two text lines tall (48px), label
   bottom-left on the baseline, one width rule per viewport (cols 10 to 12
   desktop, the form column for "Send it", full width on phones), red field
   with white type on paper or black, black inside red, never a paper box on
   red (the dark About "Let's get started" box goes).
3. **Tablet as its own sheet** (item 12): 820 compositions checked on
   purpose; Home billboard about 24vw; Contact's email as a full-width red
   field above or below the form.
4. **The footer** (item 13, second half): one small-type colophon on the
   page's hanging lines, legal on the baseline of the last nav link, bottom
   padding in whole lines; `[data-portal-tail]` in the field colour if the
   footer runs to the bottom.
5. **The grid key** (interactable): a small square key, set in the swiss
   idiom, that shows the 12-column (desktop), 6-column (tablet) or 4-column
   (phone) guides over the page while pressed or held, and hides them on
   release; Space or Enter on focus does the same; a real `<button>` with an
   `aria-label`, no visible text. The resting page stays undrawn (item 2).
   Place it where it does not crowd the header or the portal switcher at any
   size.
6. **Stretch, only if everything above passes:** the width dial: drag along
   the Home billboard's "Design" to change Archivo's width axis, snapping back
   on release; `aria-hidden` and not focusable if it is decorative.
