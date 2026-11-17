# B2 task 6: pair C fixes (cottagecore calls, grandmillennial carry-overs, deferred minors)

Shared rules: `b2-common.md` (cottagecore) and `b1-common.md`
(grandmillennial). The calls, the Opus critic pass and the founder's two
answers are in `../tier-b2-report.md` ("Calls for you", "Critic pass",
"Answers"). Every minor below is quoted in full, with file and line, in
`scripts/themes/.out/stage5/ledger.md` (B2 Tasks 3 to 5 and B1 Task 6).
Calls 3, 11 and 15 were dropped: do not act on them (the 820 footer row is
meant; the three type voices stay; the postmark lettering stays texture).

Done before this task, do not redo: B2 Tasks 1 to 5 and B1 Task 6 are
merged into this branch; the stop report and critic pass are written.

## The founder's answers (binding)

A1. **Tablet cards (cottagecore Home and Services):** one column below about
    860px, cards about 32rem wide, dealt left and right alternately (the
    recipe-card scatter keeps its tilt and tape). From 860 up, today's
    columns. Target 60 to 70 characters a line at tablet.
A2. **Hoop sprig (cottagecore):** redraw the hoop's cross-stitch sprig as
    freehand embroidery (satin and stem stitch, French knots, lazy daisies),
    no counted grid (S5), with the maker's line as a freehand running-stitch
    script (call 8).

## Calls applied (critic pass)

Grandmillennial:
1. **Phone alphabet:** keep 7/7/7/5; centre the short last row, as counted
   samplers do.
2. **Rosette (Services):** 8 to 10 broad pleats, a larger covered button,
   two short ribbon tails, the bow's oxblood. Reads as a ribbon rosette, not
   a dahlia.

Cottagecore:
4. **Daisy (header wordmark):** head about 30% bigger, stem shorter, ending
   at the wordmark's baseline.
5. **Tape lift, dark only:** the fold goes translucent (washi, not a cream
   wedge) and the lift's shadow falls on the paper under the lifted corner.
   Light stays as is.
7. **Magnolia (Services, `Pressed.astro` kind magnolia):** a southern
   magnolia: a cupped bloom of a few broad, thick, creamy petals seen at
   three-quarter view, a tall central cone (the gynoecium), and one or two
   leathery dark leaves with a rust underside. Not a flat radial flower, no
   daisy disc. Still a pressed specimen in the school's drawing hand, both
   schemes.
8. **Maker's line:** see A2.
9. **Dark clipping (Home "From the lab"):** warm, darker newsprint in dark,
   one step darker than the board, so it is no longer the brightest surface
   after the board; text and link pairs contrast-checked in `meta.ts`. Fix
   the clipping's focus ring (now about 1:1, `critic:C1` Task 4) in the same
   pass, so a Tab focus is plainly visible in both schemes.
10 and 12. **Postmark and stamp, Sent and Contact both:** the ring sits beside
   the stamp with the wavy cancel crossing the stamp's lower-left corner,
   clear of the twine knot; in dark the cancel ink is muted (not cream).
   Sent's stamp and postmark stay on the flap side. Sent and Contact read as
   the same stamp and cancel.
13. **Phone fireflies:** restore phone density to at least the proof's 0.3
   lit mean at 390 dark Home, via a smaller halo and smaller text pad on
   phones. Do not lengthen or shorten the rests to get there; lifecycle,
   colour and count stay.
14. **Touch scroll:** seeds and fireflies react to a tap only: a pointerup
   with no meaningful movement since its pointerdown (and not a scroll).
   Mouse clicks behave as now.

Missed problems:
- **About, dark (cottagecore):** the white lenticel dashes float about 10px
  off the birch twig at 1440 and 390. Put them on the bark.
- **Contact below 1024 (cottagecore):** no Gulf Coast specimen shows. Tuck
  the wax myrtle under the postcard's edge at tablet and phone (D2: one hero
  species per page).
- **Contact textarea:** hide the resize grip on the ruled sheet (keep the
  field resizable only if it can be done without a visible grip; otherwise
  `resize: none` is acceptable).

## Deferred minors (fix them all)

Cottagecore (ledger B2 Tasks 1 to 5):
- The header wraps between 641 and about 655px: hold it on one line.
- Dead duplicate type rules in `theme.css`: remove.
- Committed edit scripts that do not reproduce what shipped (Tasks 2 and 3,
  e.g. `b2-t3-edit-css.cjs` tape alpha): fix them to match, or delete them
  and say so in the report.
- Contact postmark ring touching the invite heading in the 861 to 890 and
  1000 to 1100 bands (`critic:C3` T3, `critic:C2` T4, `r2:N1` and `r2:N3`
  T3): clear of the heading at every width, with no jump between bands, and
  the comment matching the real line count.
- The textarea's doubled last rule (`r1:rc1-N1` T3): one rule at the edge.
- The hero label crossed by the indigo tape at 390 (`critic:C3` T4).
- Stale comments: Contact (`room below ... Task 4 adds`), Sent (`across the
  twine`), fx.ts header (`as they were; only the pulse changed`, `MIN_SHOWN`).
- fx.ts: no full text sweep on a height-only resize (phone toolbar
  mid-scroll); recompute on width change or settle (`critic:C3` T5).
- fx.ts: seeds lingering on text 150 to 200ms after a wheel step
  (`critic:C4` T5): fade out faster or predict with the scroll delta.
- fx.ts: seeds on text on the first frame after load (`critic:C5`,
  `r2:r2c:N1` T5): every seed starts unseen and seats against post-font rects.
- fx.ts: cancel the fonts-ready sweep on teardown (`critic:C7` T5).
- fx.ts: `seedPointsShown` tests the drawn (rotated, squeezed) fan, not an
  upright one (`r1:r1:N3` T5).
- `b2-t3-postmark-sweep.mjs` reads `SNAP_BASE` (`r2:N2` T3);
  `b2-t5-probe.mjs` dark overlap counts the halo (alpha >= 8, `critic:C6`).
- Evidence gaps: this task's before sheets and 1280/820 eyeballing are part
  of the report (see Evidence).

Grandmillennial (B1 Task 6 carry-overs):
- Two painted birds collide at 820: separate them.
- The oval birch's trunk top is flat-cut: finish it (taper into the crown or
  a branch), regenerate from `scripts/themes/proofs/stage5-gm-chinoiserie/`
  build script if the oval comes from there.
- A new 67% bird peek at 390: show the bird whole or hide it fully.

## Evidence

- Whole-page before (against `snap-stage5-base` and this branch's head before
  the task) and after sheets at every size, both schemes.
- Crops at 1440 and 390, both schemes: the dark clipping (with a Tab focus),
  the magnolia, the hoop and maker's line, the header daisy, a dark tape
  lift, the Sent envelope, the Contact postcard (plus 870, 1024, 1060 widths),
  the Contact wax myrtle at 820 and 390, the textarea, the About twig in dark,
  the Home hero label at 390, the GM rosette, the GM phone alphabet at 390.
- Cards at 820, 859, 861 and 1024 (character count per line in the report).
- Header at 641, 650, 656.
- Films: dark Home 390 fireflies (lit mean over at least 100 frames); a
  touch-scroll vs tap probe at 390 (scroll moves no seed, tap does); seeds
  on text under wheel steps at 1440 light; first frame after load; an
  arrival through the real switcher and an in-school swap at 1440 and 390
  (Stage 2 not regressed); GM birds at 820 and 390.
- `meta.ts` contrast pairs updated in both schools for every new ink.
- No visible word added, removed or changed. No em dashes visitors read.
