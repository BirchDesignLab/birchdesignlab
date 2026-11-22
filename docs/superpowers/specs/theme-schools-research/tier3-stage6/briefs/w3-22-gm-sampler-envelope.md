# W3 task 22: grandmillennial, re-stitch the sampler, open the envelope

Shared rules: `w3-common.md`. Source: `../a1-critic-grandmillennial.md`
("Interactables" 1 and 3), stop 1 call 7.

1. **Re-stitch the sampler (About).** Tap a letter on the alphabet band: it
   re-stitches in the next thread of the set (oxblood, hunter, gold, then
   round again), its stitches drawing in along the letter's path over about
   500 ms. Visitors can spell their initials. Each letter is a real button
   (`aria-label` "Letter A, re-stitch" and so on, the letter being visible),
   `aria-pressed` not needed; Enter and Space re-stitch; arrows move along
   the band. Threads come from the school's palette; every thread on the
   linen passes contrast as a graphic (3:1), recorded in `meta.ts`.
2. **The envelope opens (Contact).** Tap the wax seal: the flap hinges up
   about 160 degrees over 300 ms, and a notecard with the B monogram slides
   24px out (no words). Tap again (seal or card) to close. A real button,
   `aria-label` "Envelope, open" toggling to "Envelope, close",
   `aria-expanded`. It must never cover the Contact form or its labels at
   any size; check 820 and 390 on purpose.

Motion in the school's manner: damped, no snap; paper and silk, not
springs.

**Owns:** `src/themes/grandmillennial/**`, `tests/gm-*.test.ts`,
`scripts/themes/grandmillennial/**`, `scripts/themes/stage6/w3-t22-*.mjs`.

**Films:** spelling three letters by tap and by keyboard at 1440, 820 and
390, both schemes; the envelope open and close at 1440, 1024, 820 and 390,
both schemes, with the form fully usable while open; a vertical swipe on
the alphabet band scrolls on touch; an in-school swap with the envelope
open (torn down, closed on return).
