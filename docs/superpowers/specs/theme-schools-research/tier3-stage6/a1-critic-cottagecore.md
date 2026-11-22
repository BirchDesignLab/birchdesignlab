# Stage 6 A1: cottagecore critic

Opus `high`, 11-19-26. Probes `scripts/themes/stage6/critic-cottagecore-{crop,phone-fx,phone-fx2}.mjs`
(v2 used; v1 dropped because hiding the canvas shifted text antialiasing) on
port 4468 (GPU); output and `phone-fx/results2.json` in
`scripts/themes/.out/stage6-critic-cottagecore/`.

**No regressions** against the Stage 5 fixes (three hands, about letter on
its lines, running-stitch maker's line and sprig, cupped magnolia, warm dark
clipping, Sent ring clear of the knot, one-column cards at 820, header on
in-school swaps). Boundary with grandmillennial holds.

## Findings

- **CC1 important, phone dark, every page.** Fireflies still rare: founder
  call 13 not met below the first screen. Share of frames with a lit mote
  showing (12 s per view, 390 2x): Home top 0.28, cards 0.03, Lab band 0.16,
  bottom 0.23, About 0.10, Services 0.27, Contact 0.13. On Home cards 0.17
  are drawn but 0.03 show: most flash under the cards. Cause (fx.ts): 7
  motes, 4-8 s rests, the text pad, no sheet awareness (`coverBoxes` serves
  only the seeds). Fix: the seeds' keep loop for fireflies (re-seat motes
  under a sheet or fading on text onto clear cloth in view), at least one
  burst showing every ~2 s on phones; optionally ~10 motes and 2.5-5 s rests
  on phones.
- **CC2 important, phone dark.** A tap on the cloth never visibly answers (0
  of 16): a mote reacts only within 44px (fx.ts:105, :731) and dark motes
  cannot be aimed at. Fix: a tap on clear cloth calls the nearest mote
  within ~160px to drift there and burst twice; if none, light a new mote at
  the tap that joins the swarm.
- **CC3 minor, light, any page change.** The keep loop wedges seeds into
  slivers (About 1440: 3 seeds at `sizeMin` in the ~30px strip under the
  header; Home 390: 3 stacked at the right edge, partly off screen). Fix:
  count a seat only when fan and stalk clear with margin, prefer side
  gutters, let `minShown` fall to what fits.
- **CC4 minor, touch.** Ungated hover rules stick after a tap: theme.css:313,
  Footer.astro:68, Contact.astro:231, Home.astro:270 (`.des:hover` shares
  with `:focus-visible`). Gate each; split `.des`.
- **CC5 taste, About dark.** The hoop linen is table brown, so the hoop reads
  as a dark plate and the stitching loses contrast. Lift it to the D4(c)
  lighter board, as the herbarium sheets.
- **CC6 taste, Home tablet 820.** The hero stacks, leaving a ~260x400px empty
  right half above a centred sheet. Keep two columns to ~760px, or offset the
  sheet right into the gap.
- **For transitions.** In-school swaps pass through a near-blank paper frame
  at about +240-320 ms; seeds then re-seat.

## Phone fx check (390, 2x, touch, motion on)

Light seeds pass: visible in 97-100% of frames (mean 3.6 at Home top, 1.8-2.9
elsewhere); a tap moves a seed 50px away 46-85px in 400 ms against 8-20
untapped; a finger drag gives `pointercancel`, never a tap (the Stage 5 fix
holds). Dark fireflies visible but rare (CC1), taps do nothing visible (CC2);
scrolling flashes nothing, as intended.

## Interactables

1. **Blow the dandelion clock (light), call a firefly (dark).** A dried
   dandelion clock lies on the cloth (Home CTA band beside the lavender, and
   Sent). A tap or long press releases 6-10 seeds into the existing canvas;
   the clock shows a bald patch that refills over ~20 s. In dark, the same
   spot is where a tapped firefly rises (pairs with CC2). Reuses fx.ts.
2. **Needle and thread on the hoop (About).** Drag the parked needle, or
   tap points, and a freehand running stitch in rose or sage follows; release
   ties a knot; stitches unpick after ~15 s. Freehand only (S5), aria-hidden
   SVG.
3. **The rubber stamp (Contact and Sent).** A wooden-handled date stamp
   beside the postcard thunks down: a fresh cancel at a random angle and ink
   density, same 09-23-26 date and ring; up to ~5 overlap, oldest fading. On
   Sent, one press cancels the stamp afresh. No new words.

## First three

1. CC1. 2. CC2 with proposal 1. 3. CC3, then CC4.
