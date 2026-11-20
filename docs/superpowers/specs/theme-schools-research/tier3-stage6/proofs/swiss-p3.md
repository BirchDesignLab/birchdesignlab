# Swiss P3: re-division (Gerstner's mobile grid), a proof

Stage 6 wave 1, task 8, 11-19-26. A proof: nothing under `src/themes/swiss/`
changed. Source: `../a1-critic-swiss.md` (P3), stop 1 call 3.

**Stop 2 answer (11-20-26).** P3 is parked and the proof is kept; nothing is
built from it now. The reasons given: the first screen is identical across
the programmes (the giant spans the frame in all four divisions, so only
the small type walks), and the two-column programme stalls. A later look
reads this doc as the record; the corrections made after the proof's review
are in "Corrections, 11-20-26" at the end.

**What it is.** A division key sits beside the grid key in swiss Home's
header. Each press moves the page's programme to the next of 2, 3, 4, 6
columns (the page as built is where it starts and is not in the cycle).
Same words, same type sizes, same three fields (white, the black sheet, the
red close). Only the column line each block hangs from, and the row it
sits in, changes.

**How it is built.** `scripts/themes/proofs/stage6-swiss-p3/`: `serve.mjs`
serves a frozen build and injects `proof.css` and `proof.js` into
`/t/swiss/` only, as the R2 proof does for glass. So the markup, the
styles, the width dial and the grid key are all the real ones, after task
4's changes. The proof sets `data-p3` and `--cols` / `--div` on `<html>`
and re-places Home's bands by column line (`proof.css`, about 170 lines,
one block per band per division, wide and phone). Header and footer keep
their native count (they are the portal's chrome, not the programme); the
grid key's layer draws the division. `?div=2|3|4|6` starts on a division.

Run: `node scripts/themes/snap.mjs --name s6-w1-t8`, then
`node scripts/themes/proofs/stage6-swiss-p3/serve.mjs --snap s6-w1-t8 --port 4470`.
Films and sheets: `BDL_GPU=1 node scripts/themes/stage6/w1-t8-proof.mjs`.

## The four layouts

Page heights are of the whole page (as built, 2, 3, 4, 6). 1440: 2476,
2716, 2464, 2680, 2464. 390: 3386, 3709, 3722, 3386, 3506. At 390 four
columns is the page as built (the phone is a four-column sheet already).

**Which lines belong to whom.** Each division's lines, as fractions of the
sheet: 2 has 0, 1/2; 3 has 0, 1/3, 2/3; 4 has 0, 1/4, 1/2, 3/4; 6 has 0,
1/6, 1/3, 1/2, 2/3, 5/6. Adjacent divisions share lines (3 and 6 share 1/3
and 2/3; 2, 4 and 6 share 1/2), so a layout only reads as its own when
blocks hang from the lines that are its own: 4 from 1/4 and 3/4, 6 from 1/6
and 5/6, 3 from 1/3 and 2/3, 2 from 1/2. The placements are chosen that way,
and the left edge of every block is measured per division
(`w1-t8-edges.mjs`, `edges.json`): at 1440 the lede is at 730, 506, 394, 282
(2, 3, 4, 6), the second door at 730, 954, 1066, 954, the link under the lab
at 730, 954, 1066, 1178. No two divisions share a lede line, and no two
share the closing button's line. The one repeat is the second door at 3 and
at 6 (2/3), which is a line both have; the first door (506 against 282) and
the button tell them apart.

**1440 (the giant spans the frame in all four).**

| | Lede | Doors | Lab sheet | Close |
|---|---|---|---|---|
| 2 | row 2, col 2 (1/2) | kicker over, one door per column | kicker, pull full width; designation col 1, summary col 2, link col 2 | lead full, button col 2 below |
| 3 | row 2, col 2 on (1/3) | kicker col 1, doors cols 2 and 3 (one row) | kicker col 1 beside pull cols 2-3; summary cols 2-3 | lead cols 1-2, button col 3 |
| 4 | row 2, col 2 on (1/4) | kicker over, door cols 2-3, door col 4 (1/4 and 3/4) | kicker over, pull cols 2-4; summary cols 2-3, link col 4 | lead cols 1-3, button col 4 |
| 6 | row 2, col 2 on (1/6) | kicker col 1, doors cols 2-3 and 5-6, link col 6 (5/6) | kicker col 1 beside pull cols 2-6; summary cols 2-5, link col 6 | lead cols 1-5, button col 6 (5/6) |

In every division the lede drops to its own row under the name and hangs
from column 2 ("Design" at 125 is more than half the sheet at 2, 3 and 4,
and at 6 and 1024 its widest cut meets a lede set beside it: round 1 moved
the lede below at 6, so the dial keeps its 125 rest at 1024 and 1440 in all
four divisions, measured). On twelve the page sets the lede beside the name;
that is the one thing the cycle does not show.

**390.** Doors side by side at 2; stacked and hung from column 2 at 3 (1/3,
at 139px) and at 6 (1/6, at 78px); as built at 4. Lede and subline from
column 2 of the division. Lab: designation beside its summary at 2; summary
indented to column 2 at 3 and at 6 (pull too at 6). Close: button from
column 2 in 2, 3 and 6. At 6 a column is about 50px wide, so the indent is
a narrow hang (78px against 139px at 3): the phone is the weakest width for
telling 4 and 6 apart, 4 being as built with everything at the margin and
6 hung in from it.

Word parity holds: the visible text of `main` is identical in all four
divisions at 1440, 1024, 820 and 390, both schemes (`results.json`,
`parity`). No sideways overflow at any of them. No page errors.

## How the re-lay moves

The school's own paste-up (`--div` / `--pitch`, the four beats and the 640ms
clock of the arrival), as one Web Animation on `main`: hard steps, no ease.
The old layout is cleared panel by panel from the left on the old
division's column lines (steps after each of the first three beats: 1/2/3
panels of four, 1/3/4 of six, 3/6/9 of twelve, 1/2/2 of three, 1/1/1 of
two); the sheet holds bare from 300 to 333ms (rAF timing, below); at 320ms the
division changes (under the bare sheet); the new layout is laid panel by panel on the new
division's lines, the last beat landing at 640ms. The header does not
move. Strips: `strips/press-<n>__<scheme>__<size>.png` (timestamped from the
press; 1440 and 390, light and dark). The strip at 1440 to 3 shows the
old sheet cleared to "gn|", bare at +389, then laid. A rapid second press
finishes the first re-lay and steps on from the division it was heading to
(three presses 80ms apart from as built end on 4; found and fixed in this
proof: the first version stepped from the old value and ended on 3. The
round 1 films of the rapid press ended on 3 and predate the fix; they are
stale. Re-run 11-20-26 on GPU Chromium by `w1-t8-rapid.mjs` at 1440 and
390, light: presses dispatched in-page, the page ends on 4 columns at both
(status line "The page is laid on 4 columns", no clip left on `main`, no
page errors); strip `rapid__light__<size>.png` in the run's scratch).

**Timing, and what the strips' timestamps mean.** The strips'
`+<ms>` labels are measured from the moment the script called Playwright's
click, so they include its click latency (tens of ms) and read late: the
"bare at +389" above is that. The real clock is the page's own rAF timing:
the sheet is bare from 300 to 333ms after the press and the division swaps
at 317ms (the 320ms timer, landing on a frame), against the 640ms the
animation takes in all.

Scroll position is kept; a shorter new layout clamps it. A real build would
choose (keep, or anchor on the block at the top of the viewport).

## Keyboard and accessibility

A real `<button>`, 24px square with a 44px touch pad (the grid key's own
size and pad), 48px between the two keys' centres so the pads do not
overlap (measured: 24px between faces; the strip between the two keys
lands on the header bar at 1440 only, at 390 it hits the wordmark link).
Its face is N ink bars (the current division), inverted while
pressed. Tab reaches it straight after the grid key; Enter and Space
cycle; focus stays on the key through the re-lay (measured). The ring is
the school's global one. No hover rule. Touch works as a tap; the key sets
`touch-action: manipulation`.

The label has no visible word to start with, so it is free text and
changes with the state ("Change the page division: 2 columns now, 3
next"). A visually hidden `role="status"` line says "The page is laid on 3
columns" (a visitor using a screen reader hears the change; the page's
visible words are unchanged). The grid key follows: at each division and
size its guides, column numbers and block tags are the division's
(measured: 2, 3, 4, 6 guides, tags like "2-3", "5-6").

Not covered: reduced motion (Stage 0 S1). In-page state only: it is not
remembered, and an arrival or a swap resets to the page as built.

## What building it for real would take

- **Layouts.** Five pages (Home, Services, About, Contact, Sent) times
  four divisions times three widths (phone, tablet, desktop) is 60 layouts
  to design, not 4 (Home) times 2 here. Home alone took two sizes of one
  block per band per division, about 130 lines. Services (the four numerals
  cut to their columns, the offering fields), About (the stacked giant, the
  tree) and Contact (the form's own column) each carry placement the proof
  never touched, and the form's field order and the Sent full stop are
  fixed by contract. Honest estimate: three to four times this task per
  page.
- **Where the rules live.** Not in `[...page].astro` and the page
  components' scoped CSS as now (a division is a third axis beside width and
  scheme). The workable shape is each band's placement as custom properties
  per division (`--c-lede`, `--r-lede`) set from one table in theme.css, and
  the components read them. That is a rewrite of every page's `<style>`,
  not an addition.
- **State.** The division belongs to the portal's session (like the
  scheme): a swap, an arrival, a same-school navigation and a reload should
  keep it, so it needs a store, a `data-` attribute written before first
  paint (no flash of the wrong grid), and a decision about what an arrival
  from another school does (carry it, or reset).
- **Same-document view transition.** The re-lay would be a `startViewTransition`
  with the arrival's own pseudo-element animations instead of the clip on
  `main`. That would also give the header a stable name, and make the
  swap interruptible by the browser. The cost: one more transition path
  to keep beside the arrival and the in-school swap, which are the next
  phase's.
- **Width dial and grid key.** The dial's cap is measured against the lede
  per layout and needs a `remeasure()` call (the proof nudges the hero's
  box to make its observer fire); the grid key's `collect()` and `span()`
  read `--cols` and grid placement, so for Home's bands they follow the
  division with no change, but not for the footer: it keeps its native
  count in the proof, so its guides and tags stay on the native grid and a
  build has to give `collect()` and `span()` the footer's division too.
  The header's key and the footer would be real parts.
- **Tests.** Contrast pairs do not change (no new ink). New: word parity
  per page per division (snapshot of `innerText`); no overflow and no
  overlap at the five review sizes times four divisions times two schemes
  (200 frames per page set, 40 per page); the key's cycle and aria; a
  state-persistence test; the Playwright arrival with a non-default
  division.
- **Risks.** (1) Tablet is the weak width: 6 columns on 820 is the native
  grid, so 2, 3 and 4 are the interesting ones and the giant is sized to the
  frame, so its relation to the lede is rewritten. (2) Line breaks and rag
  change with every column width and copy is still in flux (a copy pass is
  later): the layouts would have to be re-checked after it. (3) The giant
  is the only thing sized from the frame, so every division reads as the
  same poster with different small type; if the founder wants the giant
  itself to re-divide (a half-width stacked name at 2) that is a further
  design, not a restyle. (4) Phone at 6 columns is about 50px a column:
  everything hangs on a column line but only the indent shows it. (5) The
  re-lay clip is on `main`, so a bleed block's 100vw fill is clipped to
  the panel edges (right: it reads as the same sheet clearing), but any
  fixed child of `main` would not be clipped.
- **Verdict for the founder.** It reads as "the page is laid on a grid and
  you can change the grid": the lede and doors visibly walk. It is the
  portal's thesis (same words, re-laid) inside one room, and the stepped
  paste-up is the school's own clock, so it fits. The price is the 60
  layouts and a session-level state; the proof alone suggests Home first,
  as the critic said.

## Evidence

`scripts/themes/.out/stage6/w1/t8/` (scratch, not committed): `sheets/`
(`sheet-1440-<scheme>.png`, `sheet-390-<scheme>.png`, with-built, 1024, 820),
`strips/`, `frames/` (whole page per size, scheme and division), `results.json`.
GPU: ANGLE, NVIDIA GeForce RTX 3070 Laptop GPU, Direct3D11, for every
frame. The rapid-press re-run is in `scripts/themes/.out/stage6/w2/t11/rapid/`
(same GPU).

## Known issue for any future build

**The division key crowds the "Services" link from 1024 to 1279.** In that
band the key's face sits about 8px from the link's text at 1024 and its
44px touch pad overlaps the link's box; at rest the key reads as a checkbox
beside the link. The proof does not fix it (a header layout change, not a
proof tweak). A build must give the key its own room in the header at those
widths (or move it), and check its pad against the nav links at every width
from 1024 up.

## Corrections, 11-20-26

Made after the proof's review (wave 1 task 8 deferred minors, applied in
wave 2 task 11). The body above already carries them.

- **Stop 2 answer** added to the head: parked, proof kept, with the reasons.
- **Key spacing.** The doc said the strip between the two keys lands on the
  header bar. That is true at 1440 only; at 390 it hits the wordmark link.
- **Rapid-press evidence.** The old films ended on 3 and predated the fixed
  handler, which ends on 4. Re-run on GPU Chromium at 1440 and 390 (light):
  both end on 4. `scripts/themes/stage6/w1-t8-rapid.mjs` now takes the port
  as a required `--port` argument and launches with the GPU flags (it exits
  on a software renderer).
- **Strip timestamps** include Playwright's click latency; the rAF timing
  (sheet bare 300 to 333ms, swap at 317ms) is the real clock.
- **Grid key.** `collect()` and `span()` follow the division for Home's
  bands, not for the footer (it keeps its native count).
- **Services crowding** from 1024 to 1279 recorded above as a known issue.
