# Stage 6, stop 2: wave 1 (the laggards, the parked toys, two proofs)

Built 11-19-26 on `feat/theme-schools-tier3-stage6`, 9612dee to acee289.
Runs: `s6-w1` (tasks 1 to 5, 7, 8; wf_a4ea4aa5-f78, 71 agents, 8.3M
tokens) and the follow-on task 6 (wf_57d9fe1c-a2e, 15 agents, 1.6M). Every
task complete: review clean, gate green, films pass; 8 fix rounds in all.
Ledger: gitignored `docs/private/stage6-ledger.md`. Sheets under the
gitignored `scripts/themes/.out/stage6/w1/s6-w1-t<n>/sheets/`. The
controller looked at the glass compares, swiss Home, About and Services,
bauhaus About, and both proofs (notes at the end).

## What shipped

- **Task 1, glass lens:** one lens per visit (the double mount and its
  leaks are gone); after a drag or throw the lens eases back into open
  wallpaper instead of hiding under a pane; the Portal ignores the
  "less transparency" setting for glass (your call 1), keeping the
  high-contrast fallback.
- **Task 2, glass backdrop and material:** six repainted wallpapers, crisp
  layered waves in amber, coral, cream and deep blue, no mauve; crisp orbs
  (the rose orb now amber); clear glass (blur down, saturation down, a soft
  plate behind body text only); the Frost control now visibly does
  something; the palette pulled away from vaporwave.
- **Task 3, glass rim, light, header:** a visible bent rim on every pane
  (Chrome and Edge), a highlight that follows the pointer (a brief one where
  you tap on phones), a slow orb drift, a clearer header that content
  visibly passes under, one Clear/Tinted switch, the tablet Control Centre
  spanning the width, About and Contact fixes.
- **Task 4, swiss Home:** the billboard at poster scale ("Design" fills the
  frame), type set optically flush to the column, the width dial (drag
  "Design" to change its width, it snaps back; bleeds past the page edge on
  tablet and phone; a once-per-visit hint), the grid key that latches on a
  tap and shows the whole programme (column numbers, span tags, line counts,
  the type spec), the tablet key off the nav, the white dark lab band.
- **Task 5, bauhaus:** the questionnaire card on About, with your approved
  words, under a constructed question mark.
- **Task 6, swiss:** the two Wikimedia photographs: the bark as a stark
  black-on-white band carrying the lab section on Home, the upward trunk as
  a red duotone in About's red field (replacing the Shining Tree), the
  "how a project runs" row as a timetable, and About's words at the foot of
  the field. Source note in `src/assets/swiss-photos-SOURCE.md`.
- **Task 7, proof: glass R2,** the lens on top of the page bending the real
  headline, a lensing header bar, a sketched extra toy (`proofs/glass-r2.md`).
- **Task 8, proof: swiss P3,** the grid switcher cycling Home through 2, 3,
  4 and 6 columns with a stepped re-lay (`proofs/swiss-p3.md`).

## Calls for you

1. **Build R2 as its own stage?** The proof shows the lens bending
   "Birch Design Lab" as you drag it, the moment a non-technical visitor
   gets "glass". Chrome and Edge get the full effect; Safari (iPhone
   included) and Firefox keep today's lens. **Recommend yes, as its own
   stage after this one.** Sub-call (proof critic): where the lens rests on
   arrival. Parked on the headline it garbles the first frame ("Sirh /
   Dsign Lab"). **Recommend off the text, as today's lens rests.**
2. **Build P3 as its own stage?** My look: the four programmes change only
   below the billboard (the cards, the lab band and the close re-lay; the
   first screen is identical), so at page scale the change is modest, and
   two columns collapse the school's four-beat re-lay into a stall (proof
   critic). **Recommend not now:** park it with the proof kept, and revisit
   after transitions if swiss still needs a bigger move. The width dial,
   the programme layer and the photographs already carry swiss.
3. **Swiss Home's photograph sits in the lab section,** two sections below
   the billboard, not directly under it as P4 was written. It gives the lab
   section a picture and leaves the first screen to the name. **Recommend
   keep it there.**
4. **Taste calls from the wave**, my recommendation in brackets:
   - Glass at 1024: the lens has only two open corners to rest in, so every
     throw eases back to a corner (task 1). [accept; R2 removes the
     problem]
   - Glass text plates read as soft cards, milky at 390, with seams between
     paragraph plates on Services (task 2). [lighter, wider-feathered
     plates, one plate per text block, lighter still at 390]
   - Glass light: one raspberry icon left (Services "04"), and two orbs now
     near-identical amber side by side (task 2). [icon to the coral, one
     orb to cream]
   - Glass Tinted reads grey-lilac over the blue bands, warm only over the
     warm ones (task 3). [a warmer, slightly thicker tint]
   - Glass header: the bent rim along its bottom edge stretches text
     scrolling under it into barcode-like streaks (task 3; I saw odd bulges
     at its left end in the R2 proof too). [soften the header rim's
     vertical bend so text bends rather than smears]
   - Swiss dial: at a constant snap-back speed a full return takes 435 ms,
     not the spec's 350 (task 4). [keep the constant speed, accept 435]
   - Swiss dial at 1024 to 1152: the lede collision check holds "Design"
     near width 95, narrower than rest (task 4). [test only the letters that
     can reach the lede, so it rests at full width]
   - Bauhaus card: the match stamp overlaps each key shape's corner instead
     of sitting beside it (task 5). [move it beside]
   - Bauhaus card: a small square marks a used colour bar (a square on
     controls meant to read as bars), and "show the answer" on an empty form
     says "agree on none" (task 5). [a notch on the bar instead of a square;
     on an empty form show the key with no tally]
   - Swiss P3 two-column stall (task 8). [moot if call 2 parks P3]

## Going in without a call

37 deferred minors across the seven tasks (ledger): glass lens edge cases
(a resize can leave the lens under a pane until the next touch; the
phone corner start sits exactly on the half-covered threshold; the lens
does not remount when high contrast is switched off mid-visit), the glass
orb push loop that never settles while the pointer rests, swiss photo
crops ending mid-sheet, swiss numeral cap-line and phone row rhythm, image
`sizes` hints, page-weight records, evidence gaps. They fold into the next
fix task with your answers above.

## Noticed, for the copy pass

Bauhaus About shows quiet's founder copy verbatim (word parity), including
"one man" and "taught him", which reveals a gender against the identity
rule. Every school carries the same words. For the copy pass.

## Next

A fix task for your answers and the deferred minors (about 12 to 15
agents), then wave 2 as planned at stop 1: bauhaus process diagram,
unequal boxes and findable toys; vaporwave V1 to V14; grandmillennial
(rosette tails, ribbon strip, frames, swag, trellis, ledger leftovers);
cottagecore (fireflies and the tap, seeds, hovers); the set-wide hover
guard. About 75 to 90 agents, ending at stop 3.

## Controller's look (11-19-26)

- **Glass (task 2 compare, Home light 1440):** reads as glass now. The crisp
  waves visibly soften and shift through every pane; the pink and lavender
  cast is gone, clearly apart from vaporwave.
- **Swiss Home (task 4 and 6):** the first screen belongs to the name; the
  photograph band below is stark and strong, the kicker and pull printed on
  black chips over the white bark.
- **Swiss About (task 6):** the red duotone trunk on its diagonal fills the
  field's right half, the words hang at its foot: the strongest frame in the
  school.
- **Swiss Services (task 6):** the timetable reads as a departures board:
  giant numerals left, title and text on the grid, hairlines between.
- **Bauhaus About (task 5):** the card reads as a printed form beside the
  constructed question mark; modest in size against the page.
- **R2 proof:** the lens visibly bends the real headline. **P3 proof:** the
  first screen is the same in all four programmes.

## Answers (founder, 11-20-26)

The taste call count: wave 1 raised 11; the list above has 10 because task
7's (where the R2 lens rests on arrival) is call 1's sub-call. The founder
asked for an adversarial critique of call 3 and of the taste calls before
deciding: `stop2-critique.md` (three read-only critics, Opus). Answers:

1. **R2: yes, its own stage after Stage 6**, the lens resting off the text
   on arrival.
2. **P3: parked**, proof kept. The founder wanted to see the swiss Home that
   ships without it: sent (the task 6 round 2 sheets, 1440 light and dark,
   390 light).
3. **Swiss photo: keep it in the lab section**, for the critic's reasons
   (business order; the billboard's black type would fight the bark's black
   mass; birch copy stays on About), and fix the 390 band (taller, or the
   pull under the photo there) and the flat crop of the black mass (ledger
   T6 C3).
4. **Taste calls: every critic verdict**, which changes several of the
   bracketed recommendations:
   - Glass G1: accept the two corners at 1024 through Stage 6 (R2 does not
     fix Safari or Firefox); the fallback picks the nearest open corner and
     never glides under the window.
   - Glass G2: one plate per text block with a wider feather; not lighter
     at 390 unless a contrast re-measure passes; thin the pane fill at 390
     instead.
   - Glass G3: Services "04" icon to teal or sky blue; one of the twin
     amber orbs to pale sky blue. No coral, no cream, no pink.
   - Glass G4: in light, Tinted becomes a neutral white frost; dark keeps
     its warm umber.
   - Glass G5: soften the header bar's vertical bend, one number, the bar
     only; the R2 header's artefacts go to the R2 stage.
   - Swiss S1: snap-back speed 0.2 to 0.25 units/ms (about 352 ms, constant
     speed kept).
   - Swiss S2: no letters-only test; hold about 95 at 1024 to 1152 and set
     the CSS rest to match so nothing jumps after load (closes T4 C2).
   - Bauhaus B1: the match stamp touches the key shape's corner from
     outside (offset only).
   - Bauhaus B2a: no "used" marker on the colour bars.
   - Bauhaus B2b: on an empty form, "show the answer" shows the key with no
     tally, and the screen-reader status drops "none" too.
   - P3 stall: moot.
