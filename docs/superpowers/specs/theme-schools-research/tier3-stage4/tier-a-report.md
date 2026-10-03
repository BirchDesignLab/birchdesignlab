# Stage 4 Tier A (proofs): report for the founder

Written 10-02-26 at the first hard stop. Branch
`feat/theme-schools-tier3-stage4`, head 452e6e5 (not pushed). Every proof is
committed with its write-up in `proofs/`; images under
`scripts/themes/.out/stage4-proofs/<name>/`. Nothing under `src/` changed.

## Where it stands

All five proofs are complete. Every one went through a fix round, because the
Opus critic found a real error each time (a misplaced index over the
manifesto, a stretched button, a phone claim the shots did not support, seams
inside the numerals, a lift instruction that would have spun every bauhaus
shape about the wrong origin). All fixed and re-checked.

Cost: about 60 agents and about 5.6M subagent tokens over about 3.5 hours,
above the 25 to 50 estimated. Causes: a fix round on every proof, the first
real run's gate waiting on a background check (fixed in `bdl-task`, d578486),
and one agent-cap stop that resumed cleanly from cache. For the build waves,
plan on about 10 agents per task (a fix round each), so about 40 per school.

## The proofs and the calls in them

1. **Swiss, the red Shining Tree (D1).** `swiss-duotone.md`; sheets
   `field-paper.jpg`, `mapping-compare.jpg`, `about-full-paper.jpg`.
   Red-and-paper wins: the bark goes near-white on the red sheet, the
   Wachsmann poster look; the manifesto is white on red at 5.26:1. Calls:
   - the type sits beside the tree, never on it (on it would need a scrim);
   - the source still is only 592px wide, so the tree is soft on phones.
     Recommendation: Tier B re-renders a large still from the live BDL-007
     scene on the GPU;
   - with the Home red rectangle gone, its line "A design lab, not an
     agency." stays as ink on paper and floats top right until item 6 hangs it
     from "Lab" in Tier B.
2. **Swiss type (items 7, 9).** `swiss-type.md`; sheets `body-crops.jpg`,
   `phone-first-390-light.jpg`. Body face: **Archivo** (the critic agreed;
   Inter looks more like an app and adds a file). Phone giants now fill the
   width with no overflow. Not yet met: Home's body text still starts inside
   the first phone screen; Tier B's phone item fixes the layout.
3. **Swiss rotated "Birch" (D2).** `swiss-rotated.md`; sheets
   `sec02-light.jpg`, `sec02-dark.jpg`. It runs up the left frame edge for the
   full height of the founder section. Calls: it is truly condensed only at
   1440 and up; below that it has to open to normal or wide width or it
   crowds the text; below 640 it is dropped (on a phone it shrank to a stub).
4. **Bauhaus numerals (E3).** `bauhaus-numerals.md`; sheets
   `specimen-light.jpg`, `page-services-light.jpg`, `zoom-light.jpg`. Built
   from bars and circles, legible at every size, digits stay in the page for
   screen readers, and Unbounded can go. Call: they are lighter and narrower
   than Unbounded, so they read as a quieter note, and the 7 is the weakest
   digit. Heavier forms need either a taller numeral (0.9em instead of 0.78em)
   or a new module.
5. **Bauhaus assembly (F1).** `bauhaus-assembly.md`; sheets
   `sheet__home__1440__light.jpg`, `sheet__about__1440__light.jpg`. One switch
   picks the feel. What the strips show: today's spring only overshoots about
   3% in practice (the "12%" was the curve's control point), so the real
   difference you will see is (a)'s fade-in (the pink square and see-through
   shapes) and its length (about 1.6 s against 1.16 s). (b) and (c) look
   almost the same. (b) ships by default; the pick is a one-line change.

## Questions at this stop

1. Tree: red-and-paper, type beside the tree, and a re-rendered larger still
   in Tier B?
2. "Birch": opening wider below 1440 and dropped on phones, fine?
3. Numerals: accept as proved, go taller (0.9em) for more weight, or keep
   Unbounded?
4. Assembly: pick now from the strips, or at the end-of-pair stop as planned?
5. Push this branch now (insurance; nothing deploys until a merge)?

Then your go starts wave B1 (swiss, four tasks, about 40 agents).
