# W1 task 4: swiss, the poster scale, the width dial, the programme revealed

Shared rules: `w1-common.md`. Sources: `../a1-critic-swiss.md` (S1, S2,
S3, S6, P1, P5, the width dial spec), stop 1 calls 3, 6 and 9.

1. **P5 first, the desktop poster scale** (S2): billboard at rest width 125
   and about 1.2x on desktop (1024 and up), so "Design" fills the frame
   (about 1050px at 1440); the lede stays at column 8; margin-top 2u; the
   first screen fits 900px at 1440 and 800 at 1280. Render before deciding
   exact numbers.
2. **Optical flush-left** (S3): `.sw-display { margin-inline-start: -0.072em }`
   (re-measure at width 85 for phones) and measured negative indents on the
   Services numerals so ink sits on the column line; record the measured
   ink offsets before and after.
3. **The width dial** exactly as specced in `../a1-critic-swiss.md` ("Width
   dial spec"), re-measuring the rest table and the live lede collision cap
   after P5. Founder picks: **bleed** past the frame on tablet and phone
   (cropped by the sheet edge, with the `.hero-sheet` `overflow-x: clip`
   wrapper so the page never scrolls sideways), and **the once-per-session
   hint** (600 ms after arrival). The built test and the drag probe the spec
   lists are required.
4. **P1, the programme revealed, and S1:** the grid key latches on a tap
   under 250 ms (second tap, Esc or blur clears; holding or G stays
   momentary) and shows the full mark-up layer: red column numbers 1-12,
   a span tag on each block ("8-12"), a line count every 4 lines, the giant's
   spec (size, leading, tracking, width). All meta type, `aria-hidden`.
5. **The tablet grid key** (S6) moves off the nav: the wordmark row with a
   column clear, or column 6.
6. **Call 9:** swiss's dark Home lab band turns to a white field; the red
   close stays (swiss's one red mark there). Update contrast pairs.

**Owns:** `src/themes/swiss/**`, `tests/swiss-*.test.ts`,
`tests/built/swiss*.test.ts`, `scripts/themes/stage6/w1-t4-*.mjs`.

**Films:** the dial dragged at 1440, 1024, 820, 390 (mouse and touch;
vertical swipe scrolls; snap-back), keyboard steps, the first-visit hint;
the grid key tapped and held at 1440 and 390; dark Home whole page; arrival
and in-school swap (the dial resets before the snapshot).
