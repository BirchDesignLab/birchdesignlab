# W2 task 12: bauhaus, the process diagram, unequal doors, findable toys, the card's fixes

Shared rules: `w2-common.md`. Sources: `../a1-critic-bauhaus.md` (B1, B2,
B4, B5), stop 1 call 4 (the diagram and the unequal boxes taken), stop 2
answers (the card). The new interactables (B3: see-saw, About's B, footer
square, numerals) are wave 3: do not build them here.

1. **The process diagram (B1, Stage 0 S8).** Services' "how a project
   runs" becomes one constructed diagram. Desktop: a 6px ink beam across 12
   columns, the four mini shapes as stations stepping down in size 01 to 04,
   each step's text hung from a 6px left rule. Tablet: the same beam, wrapped
   only if the stations cannot hold their text at 820 (look at 820 on
   purpose). Phones: one heavy left spine with the shapes as stations. Copy
   unchanged; the 12ch process heading is not widened (Stage 0 decision 9).
2. **Unequal doors (B1 second skeleton).** Home's two offering boxes at
   unequal widths, 7 and 5 columns, on desktop; tablet and phone as the
   school stacks them today unless 820 has room for the split.
3. **Findable toys (B2).** A one-time "pick me" beat about 500 ms after the
   last hero shape lands, on Home and Sent: the red square lifts 12px and
   drops on `--ease-snap`, no overshoot, once per visit (memory only).
   Fine-pointer hover and press lift 4px over a hard 4px ink offset block.
   Touch gets the beat and nothing else.
4. **Footer stripe (B4).** In light, the 6px paper stripe between the
   closing colour band and the ink footer goes (`Footer.astro`
   `.site-footer` border-top): use `--poster` or drop it in light; keep the
   paper rule in dark. About, Services, Contact.
5. **Phone swipe (B5).** On coarse pointers `.loose` gets `touch-action:
   pan-y`; a shape picks up after a 200 ms press or a mostly horizontal move
   over 8px; a vertical swipe that starts on a shape scrolls. Home hero and
   Sent.
6. **The questionnaire card (stop 2 answer 4, B1 and B2):**
   - The match stamp moves outside the key shape so it just touches the
     shape's corner diagonally (an offset change on `.qstamp`, about -14px
     to -26px; nothing reflows). The square keeps all four corners.
   - No "used" marker on the colour bars: delete the `.is-used` square.
   - On an empty form, "show the answer" shows the key with no tally line,
     and the `role="status"` message drops "none" too. A filled form with no
     matches still gets the approved "You and Kandinsky agree on none."
7. **Wave 1 task 5 deferred minors:**
   - C2: the auto reveal calls `againBtn.focus()`, which scrolls (390 dark:
     scrollY 1666 to 2646 within 400 ms). Focus with `preventScroll: true`.
   - C3: phone colour bars (fixed 96px plus 8px gaps, 304px) overflow the
     padded card below 390 (5px into the padding at 375, touching the
     border at 360). Make the bars fluid; check 360 and 375.
   - C4: the card-local `--mark-muted: #474541` is a hard-coded light token
     used on `--paper` in both schemes; add the dark pairing to `meta.ts`
     (or use the token) so it is checked.

**Owns:** `src/themes/bauhaus/**` (leave `AssemblySwitch.astro` and the
`?bh-assembly` switch alone), `tests/bauhaus-*.test.ts`,
`scripts/themes/bauhaus/**`, `scripts/themes/stage6/w2-t12-*.mjs`.

**Films:** Services diagram at every size, both schemes; Home doors at 1440,
1280, 1024, 820; the pick-me beat on Home and Sent at 1440 and 390 (once,
and not again on an in-school return); hover lift at 1440; a vertical swipe
starting on the hero circle at 390 scrolls, a horizontal drag picks it up;
the footer join on About, Services and Contact in light and dark; the card
items above at 1440 and 390, plus 360 and 375 for the bars. Layout changes
on Home and Services: arrival and in-school swap at 1440 and 390 against
`stage6-base`.
