# Stage 6, stop 4: wave 3 (the interactables, your stop 3 answers)

Built 11-21-26 on `feat/theme-schools-tier3-stage6`, 6812b53 to eb81233.
Runs: `s6-w3r` (tasks 18 and 19, wf_33630195-be1), a review-only re-run of
task 19 (wf_36215d5d-656), `s6-w3b` (tasks 20 to 25, wf_26e335a9-7e5) and
`s6-w3c` (tasks 26 and 27, wf_f70775de-3a0). 98 agents, about 12.3M tokens.
Every task complete: review clean, gate green, films pass. Two controller
rulings, both below. Ledger: gitignored `docs/private/stage6-ledger.md`.
Sheets: gitignored `scripts/themes/.out/stage6/w3/<run label>/sheets/`;
the controller's whole-set capture at eb81233 beside the stop 1 captures:
`scripts/themes/.out/stage6-w3-captures/` (`compare/`, `boundary/`).

## What shipped

- **Task 18, fixes A:** the business site's hovers gated at the source
  (`base.css`, the theme toggle, the bark credit) and the Portal's touch
  undo deleted; the hover guard now covers that shared CSS; glass's throw
  and jittery tap, swiss's grid key on touch and phone chip, bauhaus's
  pick-me dead zone (a grab during the beat now lands), the R2 record's
  frame-cost table corrected.
- **Task 19, fixes B (your stop 3 taste answers):** vaporwave's Services
  drum is the pink-marble Venus on a white drum, turned the other way; the
  phone kiosk props sized by their visible figure on the stand's foot line;
  grandmillennial Home's frame at 384px from about 873 up, plate clearance
  checked at 1101 and 1180; the ribbon's lone "A" fixed; cottagecore's
  phone seeds may seat small in the header cloth; tablet Home's subline
  starts beside the sheet.
- **Task 20, bauhaus:** four toys below the fold. A see-saw (a button: tap
  an end, it tips, the shape slides, the beam levels), the letter B that
  comes apart and rebuilds in steps (a button), a corner square that turns
  on tap, and numerals that re-assemble on tap (both inert).
- **Task 21, swiss:** About's rotated "Birch" widens as you scroll; the
  Services numeral changes weight while you hold it; Sent's red full stop
  drags and springs back; the coloured fields invert while pressed (links
  inside still work).
- **Task 22, grandmillennial:** About's sampler re-stitches a letter in a
  palette thread when tapped (26 buttons, one tab stop, arrow keys);
  Contact's envelope opens on its wax seal to a card with the B monogram,
  the form usable throughout.
- **Task 23, cottagecore:** a dandelion clock on Home and Sent (light: a tap
  blows its seeds into the drift and the head refills; dark: a tap calls a
  firefly) and a date stamp on Contact and Sent that cancels the postage.
- **Task 24, vaporwave:** the VCR remote drives the sunset grid (PAUSE,
  hold FF, hold REW, arrows, a swipe on touch, the release hiccup), and
  windows come to the front on press.
- **Task 25, vaporwave:** Sent is a working desktop. My Computer, Recycle
  Bin ("0 object(s)"), readme.txt (the site's own file names) and birch.exe
  (hourglass, then the screensaver). Icons select, drag on a grid and open
  on a double-click, a double tap or Enter; windows drag and close by × or
  Escape. On Home the kiosk plaque is now an elevator: B1, 1F, 2F light, an
  LED readout steps floor by floor, and the matching window comes forward
  (2F flips the CRT). No sound.
- **Task 26, grandmillennial:** Home's plates swing when brushed or tapped,
  one damped swing from the top rim, the neighbours tilting in sympathy,
  amplitude limited by the room each plate has.
- **Task 27, cottagecore:** About's hoop takes needle and thread. Drag the
  needle to stitch freehand, or tap the linen to sew to that point; a
  release ties a French knot; threads unpick themselves after about 15 s.
  Stitches stop at the linen's edge and knock out under the words.

## Calls for you

1. **Touch signifiers, across every school.** Your rule from 11-20 is that
   every interactive piece needs an obvious "try it" signal. Most toys meet
   it only for a mouse (a cursor, a hover lift), and some not even there:
   bauhaus's corner square and numerals, the grandmillennial plates. On
   touch only two toys say anything: bauhaus's existing pick-me lift and the
   needle's one-time nudge when it first scrolls into view. The swiss
   fields, the sampler letters, the clock, the stamp, the remote, the Sent
   icons and the elevator are silent until tapped. **Recommend one shared
   rule, built per school in the closing wave:** every toy gets a cursor
   and a small hover response on a mouse, inert ones included, and a single
   one-time beat in the school's own manner when it first scrolls into view
   on touch (the needle's nudge and bauhaus's lift are the model). Nothing
   loops, nothing new to read. Alternative: leave them as discoveries.
2. **Taste calls from the wave**, my recommendation in brackets:
   - **Swiss pressed fields lose their edge (task 21).** Pressed in light,
     the red field and Contact's black hero go white on the off-white page,
     so the field seems to vanish and the type floats; dark's lab band goes
     black on the black page. It is the inverse the brief asked for.
     [keep the inverse, add a 1px rule at the field's edge while pressed so
     it reads as inverted, not gone]
   - **Swiss numeral press (task 21).** A press drops the weight from 700
     to 100 in one step, then climbs to 900, so the first frame reads as a
     jolt. [travel from the current weight: up to 900, back down to 100,
     no jump]
   - **Swiss About sweep range (task 21).** "Birch" narrows the full 62 to
     125 only from 1440; at 1280 to 1439 it is 75 to 125 and at 1024 to
     1279 105 to 125 (any narrower and the cut hits the text). From 640 to
     1023 the spine has no room, so the sweep moves to the title stack.
     [accept: the geometry decides it]
   - **Grandmillennial envelope at one column (task 22).** At 860 and below
     the opened flap tucks behind the stationery (the form must stay on
     top), so phones see a wedge of the flap in the 40px gap; in dark the
     flap's inside is nearly the wall colour and vanishes. [lighten the dark
     flap lining and shorten the flap at one column so the hinge reads]
   - **Grandmillennial monogram twice (task 22).** Open, the envelope shows
     the seal's B and the card's B. [keep: the seal is the closure, the
     card the letterhead]
   - **Cottagecore dandelion seeds (task 23).** Released seeds are full
     drift size, each bigger than the clock's whole head, and six to ten
     pile on the head in the first second. [start them small at the head
     and grow them to drift size as they leave]
   - **Cottagecore clock placement (task 23).** At 1000 and below the clock
     stands under the button, not beside the lavender (the sprigs and the
     headline own the gutters), so Home's closer grows about 186px on
     tablet and phone, and Sent grows about 51px at one column. [accept on
     Home; see 4 for Sent]
   - **Cottagecore needle, light (task 27).** The rose thread is the pale
     sprig petal over a thin edge, and a stitch along the lower linen reads
     as part of the hoop's own dashed rose ring. [in light, sew with the
     deeper edge rose as the top thread so a new stitch reads apart from
     the ring]
   - **Vaporwave Sent at tablet (task 25).** At 820 to 1279 the icons are a
     single column at the top left; the big desktop below the message
     window stays empty until a window opens. [keep: a Windows 95 desktop
     lines its icons down the left]
   - **Vaporwave elevator 2F (task 25).** The Lab list is always on the CRT,
     so 2F plays a flip of the screen rather than changing it. B1 and 1F
     bring their door windows forward, which on a phone are off screen.
     [accept]
3. **The business Lab page's hovers (task 18's critic).** Answer 1 fixed
   `base.css`, the theme toggle and the bark credit. The live `/lab/` page
   has its own components (the catalog filters and the specimen cards)
   whose hover colours still stick after a tap on a phone: ten rules in
   four files, outside the Portal. **Recommend gating them in the closing
   wave**, so the stage PR carries the whole business-site hover fix.
   Alternative: its own small PR from main.
4. **Controller's look: cottagecore Sent at tablet.** The clock and stamp
   sit as two small islands in a band of empty cloth between the envelope
   and "Sent." (about 300px at 820). [tuck them beside the envelope, under
   its corners, so the band closes]
5. **Controller's look: the plates swing small.** The swing is real but a
   few pixels at the plate's edge (the tightest plate has 30px of room at
   820), so at tablet it is barely visible in the strips. [keep the room
   rule; a founder look in a browser decides it]
6. **The closing wave.** One wave, two fix tasks split by school as in
   wave 3: your answers here plus wave 3's 34 deferred minors (glass's tap
   test, bauhaus's numerals running outside the school, swiss's resize
   flash, the sampler's unnamed group and gold thread, the deck's
   modifier keys and vertical drag, the plates' right-click and pivot on
   turned plates, the needle's colour flip on a dropped thread, and
   evidence gaps). About 20 to 30 agents. Then the close: merge main, the
   stage gates (about 75 minutes, machine alone), the stage report and the
   PR for you to merge. **Recommend as planned.** Alternative: close now and
   send the minors to the backlog.

Critique done (founder asked, 11-21-26): `stop4-critique.md`. It corrects
two facts above: the cottagecore clock and stamp already nudge once on
touch (call 1), and the four Lab components hold 5 ungated hover rules, not
ten, with more in two layouts and five experiments (call 3). Its verdicts
change or reject 10 of the 14 recommendations.

## Going in without a call

34 deferred minors (ledger, wave 3), listed in call 6. Plus the
implementers' own readings of open brief points, recorded: bauhaus's
see-saw shape returns to its mark when the beam levels, and Enter or Space
alternate ends; vaporwave's REW runs at -4x, a touch tap anywhere on the
hero pauses, a long press on the remote is FF; finger drag of the Sent
windows is off at 700px and below, where they open full width; the needle
treats a pen like a mouse.

## Controller rulings (11-21-26)

- **Task 19 parked** after two fix rounds: the clip that stopped the phone
  page growing 16px past the screen was put on the kiosk, so it also cut
  off the right side of the CRT's and the stand's drop shadows and the
  foot's end. Fixed inline in 7e8d88c (the clip moved to the full-width
  section around it), then re-reviewed clean; the edge sheet at 390 shows
  the shadows back and the page 390 wide.
- **Task 25 parked** on one film, "the elevator on Services". The kiosk is
  on Home only (the brief's own text and its source say so); that line in
  the brief's film list was my error. Accepted with no code change. The
  Home elevator passes by press and keyboard at 1440, 820 and 390, and it
  settled the stop 3 prop question: the props now clear the plaque and
  every key at every width from 360 to 1440.

## Controller's look (11-21-26)

I looked at the task sheets against each brief and at the whole-set capture
at eb81233 (90 full-page captures on the RTX 3070, 18 per-school sheets
beside stop 1, the arrival and page strips, the boundary sheets):

- **Bauhaus:** the B comes apart and rebuilds in hard steps, true to the
  school; the see-saw and numerals read as constructions.
- **Swiss:** the inversion is clean and the type stays sharp; the edge loss
  in light (call 2) is real on the paper ground.
- **Grandmillennial:** the envelope opens well at two columns; the plates
  swing as asked but small (call 5).
- **Cottagecore:** the needle's freehand stitch and knot read as embroidery
  in dark; in light the rose thread does blend with the dashed ring (call
  2). The seed pile-up at the clock is visible at +900 ms (call 2).
- **Vaporwave:** Sent reads as a working desktop at every size; the
  elevator keys and LED readout sit cleanly on the stand, props on the foot
  line, nothing overlapping.
- **Boundaries:** the toys change no palettes or grounds; the close pairs
  stay apart as at stop 3.

## Answers (founder)

