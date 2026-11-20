# W2 task 16: cottagecore, fireflies and the tap, seeds, hovers, CC5, CC6

Shared rules: `w2-common.md`. Source: `../a1-critic-cottagecore.md` (CC1 to
CC6, the phone fx check), stop 1 call 10 (CC5 taken; CC6: slide the sheet
right). The interactables (dandelion clock, needle, stamp) are wave 3. The
in-school swap's blank paper frame is for transitions.

1. **Fireflies on phones (CC1, founder's Stage 5 call 13).** In dark, below
   the first screen, at least one firefly burst is visible about every 2 s
   on phones, on every page. Give the fireflies the seeds' keep loop
   (`coverBoxes`): a mote under a sheet or fading on text re-seats onto open
   cloth in view; optionally about 10 motes and 2.5 to 5 s rests on phones.
   Measure the share of frames with a lit mote showing at the report's
   seven views (12 s each, 390 at 2x), before and after.
2. **The tap (CC2).** In dark, a tap on clear cloth calls the nearest mote
   within about 160px to drift there and burst twice; if none, a new mote
   lights at the tap and joins the swarm. A finger drag still gives
   `pointercancel`, never a tap (Stage 5 fix holds).
3. **Seeds (CC3).** The keep loop counts a seat only when fan and stalk
   clear with margin, prefers the side gutters, and lets `minShown` fall to
   what fits: no seeds wedged in the strip under the header or stacked off
   the right edge after a page change.
4. **Hovers (CC4).** Gate the ungated hover rules (`theme.css`,
   `Footer.astro`, `Contact.astro`, `Home.astro`; split `.des` so
   `:focus-visible` stays ungated). Task 17 adds a set-wide guard test.
5. **CC5** dark About: the hoop linen lifted from table brown to the D4(c)
   lighter board the herbarium sheets use; stitching contrast checked.
6. **CC6** Home at 820: the sheet slides right into the empty right half
   above it, keeping the off-centre collage.

**Owns:** `src/themes/cottagecore/**`, `tests/cottagecore-*.test.ts`,
`tests/fireflies.test.ts`, `scripts/themes/cottagecore/**`,
`scripts/themes/stage6/w2-t16-*.mjs`.

**Films:** dark fireflies at 390 2x on every page, the seven views, frame
share recorded; the tap with and without a mote nearby (390 touch); light
seeds after a page change at 1440 and 390; hover then tap on touch, nothing
stuck; About dark hoop; Home at 820 both schemes; arrival and in-school swap
at 1440 and 390 against `stage6-base` (Home layout changes).
