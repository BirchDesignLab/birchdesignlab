# W3 task 21: swiss, one variable giant per page, and fields that invert

Shared rules: `w3-common.md`. Source: `../a1-critic-swiss.md` (P2, P6), stop
1 call 3 ("P1, P2, P5", all taken) and call 7 ("all swiss"). Home's width
dial shipped in wave 1; this task builds the other pages' axes on the same
variable face and the same rules (constant-speed snap-back about 352 ms
after a 100 ms hold, as wave 2 set the dial).

1. **About: the rotated "Birch" spine (P2).** If About still carries the
   rotated "Birch" (check after wave 1 task 6 replaced the tree with the
   red trunk photo), its width sweeps 62 to 125 with scroll through the
   founder section: narrow as the section enters, widest at its centre,
   back as it leaves. Scroll-linked, no loop while off screen, `aria-hidden`.
   If the spine no longer exists, apply the same sweep to About's giant
   heading stack instead and say so in the report.
2. **Services: hold a numeral (P2).** Pressing and holding a step numeral
   (01 to 04) travels its weight from 100 to 900 over about a second while
   held; release snaps back at constant speed. Inert (`aria-hidden`);
   pointer and touch; a vertical swipe that starts on a numeral still
   scrolls (the press only starts after about 200 ms still).
3. **Sent: drag the red full stop (P2).** The red full stop after "Sent"
   drags along the baseline (horizontal only, clamped to the measure),
   snapping back on release at constant speed. Inert; touch picks up after
   a short press or a horizontal move.
4. **Fields invert while pressed (P6).** Pressing a red or black field (the
   lab band's ground, the red close, About's red field, Contact's black
   fields where present) flips it to its inverse (red to white with red
   type, black to white with black type) while held, back on release.
   Inert. Never on links or controls inside the field: a press that starts
   on a link or button is the link's.

All type changes are variable-axis changes on the existing face, no swaps.
Layout must not move: the axes change width inside reserved space or
overflow into clear space (the dial's guard rules apply).

**Owns:** `src/themes/swiss/**`, `tests/swiss-*.test.ts`,
`tests/built/swiss*.test.ts`, `scripts/themes/swiss/**`,
`scripts/themes/stage6/w3-t21-*.mjs`.

**Films:** About scroll sweep at 1440, 820 and 390 (strips at five scroll
offsets); Services hold and release at 1440 and 390 (timed); Sent drag at
1440 and 390; each inverting field pressed at 1440 and 390 in both schemes,
and a press on a link inside a field navigates; no sideways scroll at any
size; arrival and in-school swap at 1440 and 390 against `stage6-base`.
