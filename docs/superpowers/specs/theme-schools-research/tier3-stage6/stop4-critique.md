# Stage 6, stop 4: adversarial critique of the calls

Asked for by the founder at stop 4 (11-21-26) before deciding. Three
read-only critics, each told to attack the stop 4 recommendation as hard as
the evidence allows: A, touch signifiers and the business /lab/ hovers
(Opus `high`); B, cottagecore and grandmillennial (Opus `high`); C, swiss
and vaporwave (Opus `medium`). No new renders; one downscaled crop.
Evidence is the wave 3 sheets, the controller's whole-set capture at
eb81233, the ledger and the source. The controller spot-checked the key
claims against the code (cottagecore `toys.ts:88-100`, the hover rules,
`plates.ts:25`, grandmillennial `theme.css:240`, cottagecore
`theme.css:58-63`).

| # | Call | Stop 4 rec | Critic's verdict |
|---|---|---|---|
| A1 | Touch signifiers | cursor + hover on mouse; one-time beat on touch per school | **change**: mouse half as proposed; the touch beat re-specified (below); plus one founder-worded sentence in the first-load prompt |
| A3 | Business /lab/ hovers | gate the four components' rules in the closing wave | **change**: also the two layouts, the five experiments and the styleguide, and widen the hover guard to all of them |
| B1 | Cottagecore released seeds too big | start small, grow to drift size | **change**: grow at draw time only, plus a staggered release |
| B2 | Cottagecore clock under the button, Home | accept | **keep** |
| B3 | Cottagecore needle, light rose thread | deeper edge rose as top thread | **reject**: that is the ring's own colour (1.04:1); sew with the deep rose pair instead |
| B4 | Cottagecore Sent, tablet band | tuck toys under the envelope's corners | **change**: beside the envelope's sides, 600 to 820 only |
| B5 | Grandmillennial envelope, one column | lighten dark lining, shorten flap | **change**: lighten yes; open the flap less instead of shortening it |
| B6 | Grandmillennial monogram twice | keep | **keep** |
| B7 | Grandmillennial plates swing small | keep the room rule, founder looks | **change**: the 9 degree peak limits it, not the room; double it, protect neighbours |
| C1 | Swiss pressed-field edge | keep inverse + 1px rule | **keep**, built to the spec below |
| C2 | Swiss numeral press jolt | from current weight up to 900, down to 100 | **change**: from current weight dip to 100, then rise to 900 |
| C3 | Swiss About sweep range | accept | **change**: 1024 to 1279 takes the title-stack sweep |
| C4 | Vaporwave Sent icons at tablet | keep | **keep** |
| C5 | Vaporwave elevator 2F | accept | **change**: B1 and 1F scroll their window into view when it is off screen |

## A: touch signifiers and the business hovers

**A1, touch signifiers.** Two facts in the stop 4 report were wrong: the
cottagecore clock and stamp already nudge once on scroll-in
(`src/themes/cottagecore/toys.ts:88-100`), and no beat in the Portal has
ever been filmed. The two "models" fire differently: bauhaus's pick-me is
timed about 500 ms after the build whether or not the shape is in view
(`bauhaus/parts/loose.ts:281-303`); the needle fires at a 0.6 crossing with
no dwell (`cottagecore/needle.ts:564-571`), usually mid-scroll while the eye
is on the text, the easiest signal to miss. Six one-shot beats in six
manners are not the "one consistent try-it pattern" the 11-20 rule asks for.
**Verdict:**
1. Mouse: every toy gets the right cursor (pointer for a tap toy,
   grab/grabbing for a drag toy) and one gated hover response, inert toys
   included (here "inert" means aria-hidden but still responsive, so a press
   cursor promises nothing false). Fill bauhaus's corner and numerals and
   the plates.
2. Touch beat, only when the toy is at least 60% visible, the page has been
   still 400 ms and no form field has focus; once per page visit, held in
   module memory; the toy's own response at small scale, not a wiggle. No
   beat on the swiss fields (an unprompted inversion of copy reads as a
   glitch) or the swiss "Birch" (scroll drives it). The grandmillennial
   envelope's beat touches the seal only. The plates get a beat only if B7
   makes the swing visible.
3. One founder-approved sentence added to the Portal's first-load prompt
   (`src/themes/portal/switcher.ts:43-44`) saying the pages answer a touch:
   one cue across all six schools, until dismissed. The controller brings
   two drafts; nothing goes in without the founder's pick.
4. Film every beat at 390 on touch, then a first-time-viewer critic at 390.

**A3, business /lab/ hovers.** The four named components hold 5 ungated
rules (6 selectors), not ten; gating them is safe (none shares a list with
focus). But the `/lab/<slug>/` pages also mount `ExperimentLayout`'s
ungated `.hatch`, and the experiments carry the same stuck hover.
**Verdict:** in the closing wave, gate
`SpecimenCatalog.astro:85`, `SpecimenCard.astro:52,84`,
`SpecimenPlate.astro:46`, `WallLabel.astro:52`,
`ExperimentLayout.astro:55`, `StudyLayout.astro:38`,
`pages/lab/experiments.astro:30`, `pages/lab/studies.astro:30`; add
`:active` twins where hover was the only feedback; gate the experiments'
13 rules (`bdl-001/BarkEngine.svelte:175`, `bdl-002/Experiment.astro:68,79`,
`bdl-003/NovgorodLetters.svelte:58,72`, `bdl-006/Regulator.svelte:360`,
`bdl-012/Experiment.astro:450,467,557,571,601,744,746`) and
`pages/styleguide.astro:171,180`. Two traps: `bdl-012:450` shares a list
with `.tour button[aria-pressed="true"]` (split it so the pressed state
stays ungated), and `bdl-003:60` lists `.fragment:hover` in a reset. Widen
`tests/hover-guard.test.ts` to walk `src/components`, `src/layouts`,
`src/pages` and `src/experiments` including `.svelte` styles; update
`hover-guard.md`. The stage branch, not main, because the guard exists only
here.

## B: cottagecore and grandmillennial

**B1, seeds.** Right direction, needs limits. Grow at draw time only: give
each puff a `bornAt` in `releasePuff` and scale only the `drawImage` size
(`fx.ts:1169`) from about 0.3 (the head's own seed scale) to 1 over about
1.4 s; never shrink `s.size` (`fx.ts:693` treats any seed under `sizeMin` as
a phone header seed, and the seat tests read it). Stagger the release:
seed i waits i x 70 ms. The films show a tight bundle travelling together
from +900 to +4000 ms, not only a pile on the head. Seeds asked must still
equal seeds placed (`w3-t23-r1-puff.mjs`).

**B2, clock on Home.** Keep: the sprigs and headline own the gutters at
1000 and below (`Home.astro:371-381`). After B1, optionally try about 9.6rem
of closer padding if the puff probe still places every seed at 1000, 820
and 390.

**B3, needle in light.** The ring is `--stitch-rose` at 0.75 on the linen,
about #b3727a; the proposed top thread #b8747a is 1.04:1 against it, the
ring's own colour, and both are dashed. **Verdict:** in light set
`--thread-rose: var(--cc-rose-deep)` (#9b4652; 1.65:1 against the ring,
5.74:1 on the linen) and `--thread-rose-edge: #7a3440` (dark's edge), with a
`meta.ts` contrast row on `--hoop-cloth`, min 3.

**B4, Sent at tablet.** Under the corners puts the clock's seeds into the
envelope and the postmark, the strict-seat failure round 1 fixed. At 600 to
820: `.env-col` relative, `.toys` out of flow; the clock in the left gutter
beside the envelope, head at about 45% of its height, so seeds rise over the
flap and lavender; the stamp tool in the right gutter, base at about 80%,
beside the postage it cancels (its target `#cc-pad-sent` is unchanged).
Below 600 the gutters are under 110px: keep the row. Puff probe at 820, 700
and 640.

**B5, envelope.** Dark `--flap-in` #0b1c14 is 1.02:1 on the wall. Set
#2a4a39 (1.76:1) and carry the flap's gold diagonals onto `.lid::after` so
the edges read. Do not shorten the flap: `--flap-h` also sets the seal's top
and the card's height (`Contact.astro:290`). Instead, at 860 and below open
to `rotateX(-105deg)`, so it stands ajar about 36px inside the 40px gap and
the whole hinge shows; keep z-index 0.

**B6, monogram twice.** Keep: a matching seal and letterhead is a period
stationery set, and the card's B is what the brief asked for.

**B7, plates.** The peak is 8.9 degrees at every size with 30px of room
left over on the tightest plate: `PEAK_DEG = 9` (`plates.ts:25`) binds, not
the room. A disc swinging about its rim shifts only r x angle, about 4px at
820. **Verdict:** `PEAK_DEG` 18, `OMEGA` 12 (a pendulum, not a buzz), `DAMP`
6.5, `SWING_MS` 560 (the brief's limit); add the sibling plates' resting
discs to `arcLimit`'s obstacles, so the room rule really binds.

## C: swiss and vaporwave

**C1, pressed-field edge.** Keep the rule, built so the bleed survives:
bleed fields already paint `box-shadow: 0 0 0 100vw` with
`clip-path: inset(0 -100vw)` (`theme.css:376-378`), so a naive inset shadow
breaks them. In the `[data-sw-flip]` rules (`theme.css:442, 454, 474, 492`)
add a second spread one pixel wider in `--flip-edge` and clip
`inset(-1px -100vw)`; non-bleed fields use `outline: 1px solid` with
`outline-offset: -1px`. `--flip-edge` is the field's rest colour. Paint
only; skip an edge already on a rule; never touch `.sw-btn`.

**C2, numeral press.** The controller's order ends a hold on the hairline,
inverting the brief's thin-to-heavy rise. In `begin()` start from the
current weight, ease down to 100 over about 200 ms, then rise 100 to 900
over the hold (`toys.ts:247`). This also fixes the jump on a re-press
during snap-back.

**C3, About sweep.** 1440 up and 1280 to 1439 are fine; 105 to 125 at 1024
to 1279 is 20 units on a rotated word, unfilmed, and fails "rolls heavy".
Change the desktop query (`toys.ts:95`) to `(min-width: 1280px)` so 1024 to
1279 takes the title-stack sweep (it only narrows, so it is safe); add a
1024 strip.

**C4, Sent at tablet.** Keep: the empty desktop predates the task and
windows open into it (`open-pointer-820-dark.png`).

**C5, elevator.** 2F is fine. On a phone B1 and 1F change only the LED; the
brief bars navigation, not scrolling. On arrival, if the target window is
off screen, `scrollIntoView({ behavior: 'smooth', block: 'center' })`; in
view, nothing (1440 unchanged). Re-film 390 and 820.

## Noticed by the critics, for the copy pass

Critics B and C both flagged the About copy (`src/content/copy/about.yaml`
lines 21 and 32: "one man", "taught him"), shared by the business About
page and every school. It names no one, but it is gendered and first-person
singular against the unnamed-studio voice. Copy is founder territory.
