# W2 task 15: grandmillennial, the Stage 5 ledger leftovers

Shared rules: `w2-common.md`. Source: `../a1-ledger-triage.md` ("Live, for
the wave"), checked against the tree at a21248e: line numbers may have moved
since task 14 ran; find each item by what it is. The two frame items (half
roses, the lone specimen card) were task 14's: skip them.

1. **Hover rules** outside `(hover: hover) and (pointer: fine)`:
   `Header.astro`, `Footer.astro`, `Home.astro` (the rule shared with
   `:focus-visible`: split it so focus stays ungated), `theme.css`. Gate each.
   Task 17 adds a set-wide guard test, so leave none behind in this school.
2. **The tassel tug** gets a press phase: a small fixed pull on
   pointerdown, tracking on move, springing from there (`Header.astro`).
3. **The tug target** at 761 to 1100 is about 20px wide: make the hit area
   at least 24px.
4. **Phone nav tracking** 0.1em to 0.14em; check it fits at 390 and 360.
5. **Home frame** shrinks between 1101 and about 1257px: make the frame
   width monotonic across 1100 and match the plate aspect.
6. **Home's plates**: all eight inlined, half always hidden (Home 154 KB).
   A shared symbol via `<use>`, or one set per width; record the bytes
   before and after.
7. **Contact envelope** column centred with 143px wall bands:
   `align-items: start`.
8. **Chintz border** costs about 50px at 390 and the column steps: equal
   outer widths on phones (measure first; skip with a reason if the
   magnitude is negligible).
9. **Services lede gap** is 12% tighter where the brief asked 30%: trim the
   room's top padding.
10. **Home canopy height** is hand-fitted and untested: add a test or probe
    asserting the heights match.
11. **The canopy swap image** sized `100vw` including the scrollbar: size it
    to match `body::before` (low priority; do it if contained).
12. **The chintz tile** inline at about 13 KB a page: trim if a measurement
    shows a clean saving; otherwise record the number and leave it.

**Owns:** `src/themes/grandmillennial/**`, `tests/gm-*.test.ts`,
`scripts/themes/grandmillennial/**`, `scripts/themes/stage6/w2-t15-*.mjs`.

**Films:** the tassel tug press at 1440 and 820 (mouse) and 390 (touch);
hover on mouse and a tap on touch that leaves nothing stuck; Home at 1100,
1101, 1180 and 1257 (the frame never shrinks as width grows); Contact and
Services at every review size, both schemes; arrival and in-school swap at
1440 and 390 against `stage6-base` (the header changes).
