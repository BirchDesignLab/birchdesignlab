# Stage 6, stop 3: wave 2 (your stop 2 answers, the strong schools, S8)

Built 11-20-26 on `feat/theme-schools-tier3-stage6`, c100eca to 4e25dde.
Runs: `s6-w2` (task 9, wf_d29fe0e3-c50), `s6-w2b` (task 10,
wf_d7979a82-cd9) and `s6-w2c` (tasks 11 to 17, wf_8a6bce73-6fe): one wave in
three runs, because it stopped twice on controller-side causes (a review
script left in the tree; a relative path), never on a task. 89 agents, about
10.6M tokens. Every task complete: review clean, gate green, films pass; 7
fix rounds in all. Ledger: gitignored `docs/private/stage6-ledger.md`.
Sheets: gitignored `scripts/themes/.out/stage6/w2/s6-w2-t<n>/sheets/`; the
controller's whole-set capture at the wave's head (every school, five
pages, both schemes, desktop, tablet and phone, beside the stop 1 captures):
`scripts/themes/.out/stage6-w2-captures/` (`compare/`, `boundary/`).

## What shipped

- **Task 9, glass, your stop 2 answers:** the lens takes the nearest open
  corner and never glides under the window; one soft plate per text block,
  wider feather, a thinner pane on phones instead of a lighter plate;
  Services "04" teal and one orb pale sky blue; light Tinted a neutral white
  frost; the header bar bends text instead of smearing it; the Frost 0
  smudge gone; eleven wave 1 minors (lens margin and resize, contrast
  switch mid-visit, orb loops that never settled, plum in the dark settings
  pane, dead selectors).
- **Task 10, swiss:** on phones the bark band is taller with the pull set
  under the photo; the photo ends on a hairline rule instead of cutting the
  black mass flat; snap-back about 352 ms; "Design" rests at 95 from 1024 to
  1152 in CSS too, so nothing jumps after load; the dial bar and drag
  corrected, the grid key clear of the column tags, About's giant flush line
  by line, Services' numerals on the cap line and its phone rows on whole
  lines, the photo weights and `sizes` put right.
- **Task 11, the proofs:** R2's and P3's records corrected (R2's doc is now
  the R2 stage's starting brief, including the high-contrast off state);
  P3's rapid-press evidence re-shot.
- **Task 12, bauhaus:** "how a project runs" is one constructed diagram (an
  ink beam with the four shapes as stations, a spine on phones); Home's two
  doors at 7 and 5 columns (down to 761px); a one-time "pick me" lift of the
  red square on Home and Sent and a hover lift for mouse users; the light
  footer gap closed; a vertical swipe that starts on a shape now scrolls;
  the card's stamp touches each shape from outside, no "used" marker, no
  tally on an empty form.
- **Task 13, vaporwave V1 to V14:** the Services kana stays one column; the
  tablet palms clear the sun; Venus and the sphere back on the phone plaza;
  the light skylight smudge gone; About's bust bigger and present through
  the swap; footer in two rows; header labels breathe; one active caption
  per page; Contact's screensaver sky fixed; the phone sun's stripes back;
  Services' lobby has its own props (an escalator rail, a fountain, a
  statue on a drum); the About plaque one sentence per block; light
  Services and Contact on a pixel cloud wallpaper.
- **Task 14, grandmillennial:** proper rosette tails; Contact's trust line is
  a cream grosgrain ribbon with oxblood picot and brass nails; the four
  cameos hang from one ribbon swag (S8); chintz runs end in whole roses;
  the lone specimen card centres; the toile wall meets the yellow band; the
  trellis behind the Services and Contact intros; the live bird clear of
  the oval at tablet; saffron lacquer and a moonlit sage wall in dark.
- **Task 15, grandmillennial leftovers:** hover rules limited to mouse; the
  tassel has a press and a wider target; phone nav tracking; Home's frame
  never shrinks as the window grows; Home's plates drawn once (Home HTML
  about 99 KB, was about 154); Contact's envelope at the top; Services'
  lede gap.
- **Task 16, cottagecore:** dark fireflies re-seat onto open cloth so one
  shows about every 2 s on phones, and a tap on clear cloth calls one (13 of
  14 taps); seeds only seat where they fit; hover rules limited to mouse;
  About's dark hoop on the lighter board with deepened threads; tablet Home
  slides the sheet right into the gap.
- **Task 17, the hover guard:** a test fails any school hover rule not
  limited to mouse and trackpad (or that shares a selector with focus);
  every straggler in quiet, glass, vaporwave and the switcher gated.

## Calls for you

1. **Business site hovers stick on phones.** The guard found ungated hover
   rules in the shared site CSS the live business pages use
   (`src/styles/base.css`, the theme toggle, the bark credit), outside this
   stage's files. The Portal now undoes them on touch only; the business
   pages still keep a hover colour after a tap on a phone. **Recommend
   fixing it at the source in wave 3's fix task** (gate the rules, delete
   the Portal's undo), so the stage PR carries one small change to the
   business site's CSS. Alternative: its own small PR from main now.
2. **Taste calls from the wave**, my recommendation in brackets:
   - Cottagecore, light, phones: seeds now seat only where a whole fan
     fits, so phone About has none at all and Contact none on its first two
     screens (the stationery fills the view) (task 16). [let one or two
     seeds sit in the gutters and over the sheet's margin on phones: the
     seeds are the school's signature]
   - Cottagecore tablet Home (641 to 820): with the sheet slid right, an
     empty band sits under the lead before the subline (task 16). [start
     the subline beside the sheet, under the lead]
   - Grandmillennial Home: the frame stops shrinking by capping it at 352px
     from about 800 up, so tablet frames are 32px smaller than before
     (task 15). [the other reading: keep 384 at tablet and let it grow
     above 1101]
   - Grandmillennial ribbon: the picot loops sit inside the oxblood edge, so
     at 1x the edge reads as scalloped trim, not loops standing proud (task
     14). [keep: it reads as ribbon at every size I looked at]
   - Vaporwave: Services' "Venus on a drum" reuses Home's kiosk Venus, and
     Home now shows that Venus at every width, so the rooms share a prop
     again (task 13). [give the drum a different classical still]
   - Vaporwave phone plaza: Venus and the sphere are built to spec, but the
     stills carry wide transparent margins, so at 390 they show about 25px
     each, specks at the stand's corners (task 13). [size them by their
     visible figure, about 64px tall at 390, standing on the floor in front
     of the stand]
   - Bauhaus Home hover: the red square rests on the beam, so its 4px ink
     block merges into the beam and the beam looks thicker rather than the
     square lifted (task 12). [offset the ink block down and right so it
     clears the beam]
   - Swiss About, 640 to 1023: the new foot rule runs the whole red field,
     across a strip of plain red beside the trunk (task 10). [keep: it reads
     as a field rule]. The implementer kept both new rules (Home's photo
     foot, About's) as 1px hairlines and flagged they may want to be bolder.
     [keep hairlines: swiss rules are thin]
3. **Wave 3's new visible words** (the interactables, as agreed at stop 1:
   file-name style, `aria-hidden`, for you to approve as copy):
   - Vaporwave Sent desktop: "My Computer", "Recycle Bin", "readme.txt",
     "birch.exe", and "0 object(s)" inside the Recycle Bin; readme.txt shows
     the site's own file names.
   - Vaporwave VCR remote: "PAUSE", "FF", "REW" beside today's "PLAY".
   **Recommend approving all.**
4. **Wave 3's shape.** Every interactable from stop 1 call 7, cheap ones
   first, no elevator sound, plus one fix task for your answers here and the
   wave's 34 deferred minors, split in two by school. About 10 tasks and
   100 to 120 agents (wave 1 ran 86 with task 6, wave 2 89). **Recommend as planned.**
   Order: the two fix tasks; bauhaus's four toys; swiss P2 (About's rotated
   "Birch" widening on scroll, the Services numeral you hold to change
   weight, Sent's red full stop you drag) and fields that invert while
   pressed; grandmillennial's sampler and envelope; cottagecore's
   dandelion clock and date stamp; vaporwave's VCR remote and window
   activation; then the big three: vaporwave's working Sent desktop and the
   elevator directory, grandmillennial's swinging plates, cottagecore's
   needle and thread.

## Going in without a call

34 deferred minors (ledger, waves 2's nine tasks): glass's phone pane
without blur support and the lens on a jittery tap; swiss's dropped column
tag off the baseline grid; bauhaus's beat blocking a press and a stale
comment; vaporwave's inactive captions on Contact and Services, the 360
header, the fountain drawing and the pre-WebGL horizon; grandmillennial's
lone "A" in the ribbon at 390 (copy pass), and unfilmed swap strips;
cottagecore's desktop firefly re-seat pacing; the hover guard's media-query
parsing edge cases. Plus evidence gaps the critics named.

Deviations the implementers chose, recorded, no call needed:
grandmillennial's saffron lacquer needed a new pale gold for the band's
kicker (contrast); bauhaus's pick-me beat runs once per page per visit
(Home and Sent each), not once for the whole visit; vaporwave's one active
caption per page also changed About and Services.

## Noticed, for the copy pass

Grandmillennial's ribbon at 390 breaks "Mississippi Gulf Coast ❦ A / reply
within one business day." (a lone "A"). Copy pass, with the earlier items.

## Controller's look (11-20-26)

Several tasks skipped films their briefs asked for (task 15's swap strips,
task 17's hover and focus films, task 16's whole-page sheets, part of task
14's before sheets), so the controller shot the whole set at the wave's head
on the GPU (`scripts/themes/stage6/stop-evidence.mjs`, label `stage6-w2`):
90 full-page captures, 18 per-school sheets beside the stop 1 ones, 48
arrival and page strips, 18 boundary sheets. One capture glitch: the swiss
dark phone arrival strip has no frame from before the trigger (a timing
miss in the film, the other 47 strips are whole).

- **Boundaries:** the three close pairs read apart at thumbnail size. Glass
  (crisp blue, orange and cream bands) and vaporwave (lilac, pixel clouds)
  are now far apart in light; grandmillennial's trellis puts a pattern
  behind its Services and Contact intros, away from cottagecore's cream;
  swiss and bauhaus share no red field in dark.
- **Glass:** "04" teal and the sky orb read as intended; Tinted reads as a
  white frost with no lilac; each text block has one plate, no seams.
- **Bauhaus Services:** the diagram reads as one construction, shapes as
  stations on the beam, the text hung from rules.
- **Grandmillennial:** the swag is the strongest new frame in the stage, the
  cameos hung at staggered heights from one stitched ribbon; the ribbon
  strip and the rosette tails read as ribbon.
- **Swiss phone Home:** the photo now reads as a picture, the pull under it;
  the "From the lab" chip still runs wider than its words (minor).
- **Vaporwave:** the Services kana is one column; the new lobby props make
  Services its own room; the phone sun's stripes are back and the palms
  are present (they read faint only at sheet scale).
- **Cottagecore:** the dark hoop on the lighter board with deeper threads is
  a clear improvement.

## Answers (founder, 11-21-26)

1. **Business site hovers: fixed at the source in wave 3's fix task** (gate
   the rules in `base.css`, the theme toggle and the bark credit; delete the
   Portal's touch-only undo).
2. **Taste calls:** the founder asked for an adversarial critique first
   (`stop3-critique.md`, three read-only critics, Opus) and took **every
   critic verdict**:
   - Cottagecore phone seeds: on phones only, a smaller seed may seat in
     the header cloth beside the wordmark and under the nav, 1 or 2 seeds,
     still under the paper; nothing over the sheet.
   - Cottagecore tablet Home (641 to 820): the subline starts beside the
     sheet under the lead as a float wrap and runs full width below; check
     641 for single-word lines.
   - Grandmillennial Home frame: 384px from about 873 up at every width,
     desktop included; check plate clearance at 1101 and 1180.
   - Grandmillennial ribbon picots: keep; fix the lone "A" at 390.
   - Vaporwave Services drum: re-render the same Venus in pink marble on a
     white drum, turned the other way, through the existing pipeline.
   - Vaporwave phone kiosk props: Venus about 60px tall, sphere about 44px
     across, bases on the stand's foot line, clearance on the plaque and
     button re-checked.
   - Bauhaus hover: keep as built; fix the pick-me beat's dead zone.
   - Swiss About foot rule and both hairlines: keep.
3. **New visible words approved:** "My Computer", "Recycle Bin",
   "readme.txt", "birch.exe", "0 object(s)"; "PAUSE", "FF", "REW".
4. **Wave 3 as planned:** two fix tasks, then every interactable, cheap
   ones first, the big three last, stop 4 at the end.
