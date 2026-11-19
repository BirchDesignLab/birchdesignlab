# Swiss P3: re-division (Gerstner's mobile grid), a proof

Stage 6 wave 1, task 8, 11-19-26. A proof: nothing under `src/themes/swiss/`
changed. Source: `../a1-critic-swiss.md` (P3), stop 1 call 3.

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
and re-places Home's bands by column line (`proof.css`, about 130 lines,
one block per band per division, wide and phone). Header and footer keep
their native count (they are the portal's chrome, not the programme); the
grid key's layer draws the division. `?div=2|3|4|6` starts on a division.

Run: `node scripts/themes/snap.mjs --name s6-w1-t8`, then
`node scripts/themes/proofs/stage6-swiss-p3/serve.mjs --snap s6-w1-t8 --port 4470`.
Films and sheets: `BDL_GPU=1 node scripts/themes/stage6/w1-t8-proof.mjs`.

## The four layouts

Page heights are of the whole page (as built, 2, 3, 4, 6). 1440: 2476,
2716, 2464, 2632, 2356. 390: 3386, 3709, 3722, 3386, 3722. At 390 four
columns is the page as built (the phone is a four-column sheet already).

**1440 (the giant spans the frame in all four).**

| | Lede | Doors | Lab sheet | Close |
|---|---|---|---|---|
| 2 | row 2, col 2 | kicker over, one door per column | kicker, pull full width; designation col 1, summary col 2, link col 2 | lead full, button col 2 below |
| 3 | row 2, cols 2-3 | kicker col 1, doors cols 2 and 3 (one row) | kicker col 1 beside pull cols 2-3; summary cols 2-3 | lead cols 1-2, button col 3 |
| 4 | row 2, cols 3-4 | kicker over, doors two columns each | kicker over, pull cols 1-3; summary cols 3-4 | lead cols 1-3, button col 4 |
| 6 | beside the name on its last baseline, cols 5-6 | kicker cols 1-2, doors cols 3-4 and 5-6 | kicker cols 1-2 beside pull cols 3-6; summary cols 3-5; link cols 5-6 | lead cols 1-4, button cols 5-6 |

At 2, 3 and 4 the lede cannot sit beside the name ("Design" at 125 is more
than half the sheet), so it drops to its own row and hangs from a column
line. At 6 it sits beside the name as the page does on twelve; the dial
keeps its 125 rest because the lede's top clears the word's descender.

**390.** Doors side by side at 2; stacked and hung from column 2 at 3;
as built at 4; stacked and hung from column 3 at 6. The lede and subline
hang from column 2 (2, 3, 4) or 3 (6). Lab: designation beside its summary
at 2; summary indented one column at 3; designation over the summary
indented two columns at 6. Close: button from column 2, 2, or 3.
At 6 a column is about 50px wide: the hanging indents are what show it.

Word parity holds: the visible text of `main` is identical in all four
divisions at 1440, 1024, 820 and 390, both schemes (`results.json`,
`parity`). No sideways overflow at any of them. No page errors.

## How the re-lay moves

The school's own paste-up (`--div` / `--pitch`, the four beats and the 640ms
clock of the arrival), as one Web Animation on `main`: hard steps, no ease.
The old layout is cleared panel by panel from the left on the old
division's column lines (steps after each of the first three beats: 1/2/3
panels of four, 1/3/4 of six, 3/6/9 of twelve, 1/2/2 of three, 1/1/1 of
two); the sheet holds bare 285 to 345ms; at 320ms the division changes
(under the bare sheet); the new layout is laid panel by panel on the new
division's lines, the last beat landing at 640ms. The header does not
move. Strips: `strips/press-<n>__<scheme>__<size>.png` (timestamped from the
press; 1440 and 390, light and dark). The strip at 1440 to 3 shows the
old sheet cleared to "gn|", bare at +389, then laid. A rapid second press
finishes the first re-lay and steps on from the division it was heading to
(three presses in 80ms from as built end on 4; found and fixed in this
proof: the first version stepped from the old value and ended on 3).

Scroll position is kept; a shorter new layout clamps it. A real build would
choose (keep, or anchor on the block at the top of the viewport).

## Keyboard and accessibility

A real `<button>`, 24px square with a 44px touch pad (the grid key's own
size and pad), 48px between the two keys' centres so the pads do not
overlap (measured: 24px between faces, the edge between them lands on the
header bar). Its face is N ink bars (the current division), inverted while
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
  already read `--cols` and grid placement, so they follow with no change.
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
  everything hangs on a column line but only the indents show it. (5) The
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
frame.
