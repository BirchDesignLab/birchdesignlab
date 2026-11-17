# Stage 5 wave B2 (cottagecore): the stop

Built 10-05-26 on `feat/theme-schools-tier3-stage5`, 276e9c3 to ed3e9a3
(plus fa1dbd8, the r2 verifier's probe scripts). Run `s5-b2`, tasks 1 to 5,
all complete, 7 fix rounds, about 60 agents. Every task's review is clean,
its gate green and its films pass. Written 11-17-26 from the ledger
(`scripts/themes/.out/stage5/ledger.md`, copied to the gitignored
`docs/private/stage5-ledger.md`) after the wave sat idle six weeks; the B1
fix task's (task 6) two open calls are carried here too.

Sheets: `scripts/themes/.out/stage5/b2/s5-b2-t5/sheets/r2/whole-*` (every
page, every size, both schemes, before and after) and the object crops in
`s5-b2-t4/sheets/r1/crops/`. The controller looked at Home and About at 1440
and Home at 820, both schemes, and the 1440 crops.

## What shipped

- **Task 1, hands and header:** the larger wordmark with the daisy, the
  three type voices (billboard, cards, pull quote), Sharp pulls.
- **Task 2, paper and cloth:** torn edges, the gingham bands, the paper
  sheets in both schemes.
- **Task 3, layout and states:** the washi tape lift, two-column cards held
  down to 700px, the Contact postcard and postmark placement.
- **Task 4, objects and flora:** the specimen label, the postcard stamp and
  postmark, the Sent envelope, the embroidery hoop with the maker's line,
  the magnolia.
- **Task 5, fx:** the firefly pulse and halo, text avoidance under scroll,
  the dandelion seeds.

## Calls for you

Carried from the B1 fix task (grandmillennial):

1. **The phone alphabet** (critic). Laid out 7/7/7/5, the last row hangs
   left under three full rows. **Recommend:** centre the short row, as
   counted samplers do.
2. **The rosette** (critic). Softer now, but eighteen two-tone pleats round a
   small button read as a dahlia, with no tails. **Recommend:** fewer, wider
   pleats and two short ribbon tails.

Cottagecore:

3. **Three wetnesses** (critic). Pull quote and card title share one SOFT
   value, so only italic separates them: two voices, not three.
   **Recommend:** give the pull quote its own middle SOFT.
4. **The daisy** (critic). 2.5rem wide but mostly stem; the head is about
   16px at 1440. **Recommend:** a bigger head on a shorter stem.
5. **The tape lift** (critic). Reads as a dog-ear highlight painted on the
   tape, not a corner peeling off the paper; in dark the fold is a bright,
   near-opaque wedge. **Recommend:** the shadow falls on the paper under
   the lifted corner, and the dark fold goes translucent.
6. **Two columns at tablet** (critic, controller agrees from the 820 sheet).
   Holding two columns to 700px sets the cards at 25 to 30 characters a line
   from 701 to 820. **Recommend:** one column below about 860px.
7. **The magnolia** (critic). Twelve flat petals round a yellow disc read as
   a dog-rose or anemone. **Recommend:** a cupped bloom with a tall central
   cone, as a southern magnolia shows.
8. **The maker's line** (critic). "B.D.L. 9.23.26" on the hoop is skewed
   dashed block capitals, more dashed type than stitched script.
   **Recommend:** a freehand running-stitch script.
9. **The dark clipping** (critic, controller agrees: it is the first thing
   the eye lands on in dark Home). By lamplight the Lab clipping is a pale
   grey slab, the brightest surface after the board. **Recommend:** a
   warmer, darker newsprint in dark.
10. **The Sent envelope in dark** (critic). Stamp and postmark sit on the
    flap side; the cream cancel crosses the twine knot and reads busy.
    **Recommend:** keep them on the flap side, mute the dark cancel ink, and
    keep the ring off the knot.
11. **The postmark lettering** (critic). "GULF COAST MS" is about 4.6px cap
    height at 1x: texture, readable at 2x. **Recommend:** leave it as
    texture; real postmarks are small.
12. **The Sent postmark no longer cancels the stamp** (fix round). Moving it
    clear of the twine took it clear of the stamp too, so Sent and Contact
    no longer show the same stamp and cancel. **Recommend:** bring the ring
    back to overlap the stamp's corner, still clear of the knot.
13. **Phone fireflies are rare** (critic). In the dark Home 390 film, 100 of
    114 frames show no lit firefly: the wider text pad and the 4 to 8s
    rests. You like the fireflies. **Recommend:** restore phone density
    (smaller pad on phones, shorter rests).
14. **Touch scroll kicks the seeds** (critic). pointerdown fires at the
    start of every touch scroll, so each phone scroll scatters seeds and
    flashes fireflies near the finger. **Recommend:** react to a tap only
    (a pointerup with no movement).
15. **The footer at 820** (controller, not in the ledger). After B2 the
    footer nav drops to its own row under the wordmark at 820 in both
    schemes, where before it sat inline. **Recommend:** check it is meant;
    if not, inline again.

## Deferred minors (the controller's to fix, no founder call)

From the ledger: the header wraps between 641 and about 655px; dead
duplicate type rules; committed edit scripts that do not reproduce what
shipped (tasks 2 and 3); the Contact postmark's ring touching the heading in
the 861 to 890 and 1000 to 1100 bands; the textarea's doubled last rule;
the hero label crossed by the indigo tape at 390; the dark clipping's focus
ring at about 1:1 contrast; stale comments in Contact, Sent and fx.ts; a
full text sweep on every resize, including a phone toolbar mid-scroll;
seeds lingering on text for 150 to 200ms after a wheel step and on the first
frame after load; an uncancelled fonts-ready sweep; evidence gaps (no before
sheets or 1280/820 eyeballing in several tasks). From the B1 fix task: two
painted birds colliding at 820, the oval birch's flat-cut trunk top, a new
67% bird peek at 390.

## Next

After your answers: one fix task on this branch for the answered calls and
the deferred minors (`bdl-task`, about 10 to 15 agents: implementer Sonnet
`medium`, critic Opus `high`, verifier Sonnet `high`, gate Sonnet `low`,
verifyHead Haiku). Then merge main into the branch (three files changed on
both sides: both schools' `Footer.astro` and `docs/lab-backlog.md`), run the
end-of-pair gates, and open the PR.
