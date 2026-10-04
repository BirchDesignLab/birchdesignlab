# Stage 4 (pair A: swiss and bauhaus): end-of-pair report for the founder

Written 10-03-26 at the third hard stop. Branch
`feat/theme-schools-tier3-stage4`, draft PR #95, head 5b9dda0. Earlier stops:
`tier-a-report.md` (proofs), `tier-b1-report.md` (swiss).

## Where it stands

- **Swiss** is built and approved at the B1 stop, with your four calls in.
- **Bauhaus** is built: all four tasks complete, every Opus critic finding of
  blocker or important weight fixed (labels that kept their capitals, a
  sticky tree that never moved, a textarea that would not resize, band shapes
  parked over the button, a third of the hero square that would not respond
  to a press). Two small controller fixes after the wave: the footer
  triangle now sits on the band's right edge so its hypotenuse is the closing
  diagonal, and the unused Unbounded font package is gone.
- **All seven stage gates pass** on 5b9dda0 (`scripts/themes/.out/stage4-gates/gates.md`):
  smoke with the contact form, timing, the switcher holding still (72 of 72),
  the unname negative control, the wordmark (blank at most 68 ms), the after
  strips and the sheets. `npm run verify` clean.
- **Timing** (time until the new page is 90% on screen, against Stage 3's
  final gates): swiss arrives about 220 ms sooner on desktop and 120 ms on
  phones (a lighter first screen: one font, no red block); bauhaus 16 to 56
  ms sooner; untouched schools moved 18 to 110 ms sooner, which is machine
  drift. The swiss arrival film shows the column-panel wipe intact.
- **Cost of the whole stage:** about 150 agents and about 15M subagent
  tokens over two days (proofs about 60, swiss 47, bauhaus 43), plus the
  controller's inline fixes. Every task needed one fix round; the critics
  earned it each time.

## What bauhaus changed

- Yellow triangle, red square, blue circle wherever a shape stands alone
  (footer corner, lab band, Contact, About); paper ring and stem in dark; the
  hero eye's stroke neutral; the About B keeps its red bowl.
- One lowercase voice down to the form labels and buttons.
- Constructed numerals from bars and circles, taller (0.9em), assembling as
  they scroll in.
- One diagonal: an ink bar across the Services hero's circle and square.
- The printshop register on Contact and Services: a red rule on the form
  panel, a red square on field focus, a red lead square on the offering text.
- Balance fixes: Contact's composition on the form's bottom edge, Sent's one
  ground line, the opener's long rule, About's tree travelling with the text,
  a lowercase copyright line.
- Phones keep the heavy left rule, band shapes no longer make a tall slab of
  dead colour, dark has a visible raised panel and heavier body text.
- Motion: today's assembly stays the default; press states that do not stick
  on touch; the see-saw tips when the circle lands and levels when the square
  does; Sent's circle rolls down the triangle into the square; the hero
  shapes and Sent's trio can be picked up and dropped (keyboard too).

## Calls for you

1. **The assembly feel, live.** Today's feel is the default. Once this
   merges, add `?bh-assembly=b` (mechanical) or `?bh-assembly=c` (middle) to
   any bauhaus page on your phone to compare; `?bh-assembly=a` goes back. Tell
   me the pick and the switch comes out in a small follow-up.
2. **Typophoto in the lab band** (desktop and tablet only). BDL-007 has no
   hero image and is not in the band, so it uses BDL-009 and BDL-008, and
   both are light UI screenshots. Through the grayscale treatment they read as
   small pale thumbnails, not photography. Recommendation: drop it until a
   case study has a real photograph.
3. **The Services diagonal** reads more as a slash between the circle and
   square than a cross through them. Recommendation: keep it for now, onto the
   end-of-run nitpick list.
4. **Sent's circle** now carries a small paper dot (it shows the roll) that
   stays visible at rest. Keep?
5. **Dark Home on swiss** has two red bands close together (the lab section
   and the new closer). Accept, or onto the nitpick list?
6. **Not built (stretch):** the swiss width dial and the bauhaus
   questionnaire card. Parked in the backlog.

## Owed on your iPhone after the merge

Added to the end-of-run iPhone pass (with Stage 3's owed checks): dragging
the bauhaus shapes by touch, bauhaus press states on iOS Safari (iOS can skip
`:active` without a touch listener), the swiss grid key held by touch.

## Next

Your go to mark #95 ready and merge it (merging deploys). Then the assembly
pick, then Stage 5: pair C (grandmillennial and cottagecore), starting with
its first stop.
