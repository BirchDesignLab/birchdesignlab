# Stage 6, stop 2: adversarial critique of call 3 and the taste calls

Asked for by the founder at stop 2 (11-20-26): call 3 ("not positive") and
the ten taste calls ("didn't even look at these"). Three read-only critics,
each told to attack the stop 2 recommendation as hard as the evidence
allows: swiss (Opus `high`: call 3 and the two dial calls), glass (Opus
`high`: five calls), bauhaus (Opus `medium`: the card's calls). No new
captures; all evidence is the wave 1 sheets and measures under the
gitignored `scripts/themes/.out/stage6/`, the ledger and the source. The P3
two-column stall is moot (P3 parked).

The count: wave 1 raised 11 taste calls; the report listed 10 because task
7's (where the R2 lens rests on arrival) is call 1's sub-call.

| # | Call | Stop 2 rec | Critic's verdict |
|---|---|---|---|
| 3 | Swiss photo band placement | keep in lab section | **keep**, for better reasons; fix the 390 band and the flat crop |
| G1 | Glass lens at 1024, two corners | accept, R2 removes it | **accept**, but R2 does not fix Safari/Firefox; nearest-corner fallback, never glide under the window |
| G2 | Glass text plates | lighter, wider feather, one per block, lighter at 390 | **change**: one per block, wider feather; not lighter at 390 (contrast); thin the pane fill instead |
| G3 | Raspberry icon, twin amber orbs | icon coral, orb cream | **change**: icon teal/sky, one orb pale sky blue |
| G4 | Tinted grey-lilac over blue | warmer, thicker tint | **change**: light Tinted becomes neutral white frost; dark keeps umber |
| G5 | Header rim smears text | soften the vertical bend | **keep**, scoped to one number, bar only |
| S1 | Dial snap-back 435 ms vs 350 | accept 435 | **change**: speed 0.2 to 0.25 (about 352 ms, still constant) |
| S2 | Dial at 1024 to 1152 rests near 95 | test only letters reaching the lede | **reject**: full width would put the "n" on the lede; hold 95, match the CSS rest |
| B1 | Card stamp overlaps key corner | move beside | **change**: touch the corner from outside (offset only) |
| B2a | Paper square marks a used bar | notch | **change**: no marker at all |
| B2b | Empty form tallies "agree on none" | key, no tally | **keep**, and drop "none" from the screen-reader message too |

## Call 3: swiss photo band (swiss critic)

**Case against keeping it:** P4 meant image and name locked together (brief
w1-6 says "under the billboard"); under "Birch" the bark is a pun that says
something. In the lab section it has nothing to do with "From the lab" and
is marked decorative. At 390 it shrinks to a busy strip about 230px tall and
reads as texture; the pull's chip runs past "the open." At 1440 and 1024 the
big black mass is cut flat partway down (ledger T6 C3).

**The stated reason is weak:** "the first screen stays the name" holds for
both placements; the hero already runs past the fold at 1440x900, 1024x768
and 390.

**Better reasons to keep it:** the business order stays (name, what we
sell, the proof); in light, the billboard's black type would sit straight on
the bark's black mass with no rule between, two heavy masses fighting, while
"What we build" gives rhythm (poster, text, image, black list, red close);
birch copy is confined to About, and a birch pun on Home's first scroll
pushes against that.

**Strongest alternative:** move the whole lab section above "What we build"
(a section reorder and re-film; billboard and dial untouched), which puts
the lab ahead of the sales pitch. A photo-only band with no type is worse.

**Verdict:** keep. Fold in a phone fix (a taller band at 390, or the pull
under the photo there) and fix the flat crop.

## Glass (glass critic)

**G1, lens at 1024.** R2 does not remove it everywhere: Safari (every iPhone
and iPad browser) and Firefox keep today's lens, and 1024 landscape is
mostly iPad Safari. The 1.8 s hidden glide is a flaw, not geometry: the
fallback picks the least-covered spot and ignores distance. **Verdict:**
accept through Stage 6; fix the fallback to pick the nearest open corner and
never glide under the window.

**G2, text plates.** The plate is needed: unplated, the hero headline falls
to 2.28:1 at its worst points on light dusk 390. Lightening at 390 cuts it
where legibility is weakest; the milkiness there is the pane plus a plate
covering the whole card. **Verdict:** one plate per text block and a wider
feather (fixes the seams); do not lighten at 390 unless a contrast
re-measure passes; thin the pane fill at 390 instead.

**G3, raspberry icon and twin orbs.** The step icons are already blue,
brown-amber and red; coral makes three warm neighbours. A cream orb vanishes
over the new cream bands. **Verdict:** 04 to teal or sky blue (blue, warm,
warm, blue); one orb to pale sky blue. No pink.

**G4, Tinted.** Colour physics: amber cream at 0.62 over a blue band mixes
to lilac grey; warmer mixes greyer or drifts mauve (vaporwave's colour);
warm over blue needs about 0.85, which is no longer glass. **Verdict:** in
light, Tinted becomes a neutral white frost (more white, more blur, close to
Apple's own Tinted); dark keeps its warm umber.

**G5, header rim.** The smear is Chrome and Edge only, and R2 replaces this
header later; the R2 sheets show no left-end bulge (their problems are
R2's). But Chrome visitors see streaks until R2 ships and the fix is tiny.
**Verdict:** keep, as a one-number change for the bar only (vertical shift
cut to about a third, or a sideways-only bend). R2's header artefacts go to
the R2 stage.

## Swiss dial (swiss critic)

**S1, 435 ms.** "Snap" means quick; the 350 ms target was a feel target and
the fix is one number. At 0.25 units/ms a full return is about 352 ms
(constant speed kept). Phones already meet it. **Verdict:** change to 0.25.

**S2, rest near 95 at 1024 to 1152.** At 1024 the lede's top sits about
16px below the word's baseline, inside the "g" descender band. A test on
the right-hand letters alone passes, so the word goes to 125 and the "n"
hangs over the lede column about 16px above "A design lab, not an agency.",
the red bar standing on the lede heading (estimated from geometry, not
captured). The dial's own rule is that the word stops short of the lede.
**Verdict:** reject; hold 95 at 1024 to 1152 (it still fills the frame) and
set the CSS rest to about 95 there so nothing jumps after load (closes T4
C2). Full width only by moving the lede below the descender, which breaks
the "Lab" and lede baseline alignment: a bigger call.

## Bauhaus card (bauhaus critic)

**B1, stamp.** Overlapping is how a stamp works, and "beside" at 390 means
widening the row (24px gaps, 26px stamp) or muddling which shape it marks.
But on the square, the one shape defined by its corners, the bite hurts.
**Verdict:** move it outside so it just touches the corner diagonally (an
offset change, about 14px to 26px; nothing reflows).

**B2a, used marker.** A notch cuts the bar's outline, worse for "bars read
as bars". The marker is not needed: each filled shape already shows its
colour and screen readers already hear "Red, on the triangle". **Verdict:**
no marker (delete `.is-used`); the notch only if a swap hint is wanted.

**B2b, empty form.** "Agree on none" is approved and literally true, but
"show the answer" is a skip: on an empty form the visitor asked for the
key, not a grade. The approved line still shows for a filled form with no
matches. **Verdict:** keep the recommendation, and drop "none" from the
screen-reader status when nothing was filled.
