# Stage 6 wave 4 (the closing wave): rules shared by every task

Read with your own task brief (`w4-28` to `w4-30` in this folder). Task
numbers continue from wave 3.

**Binding, in order:** `../stop4-report.md` ("Answers", 11-21-26: the
founder took **every critic verdict** in `../stop4-critique.md`), then
`../stop4-critique.md` itself (each verdict's build instruction is the
spec; where your brief quotes it, the critique's full text wins), then the
stop 3, 2 and 1 Answers, `../../tier3-briefs/stage0-decisions.md`, the
school's dossier and Tier 3 brief. `src/themes/README.md` holds the school
contract.

Every rule in `w1-common.md`, `w2-common.md` and `w3-common.md` holds
unchanged (word parity, links fixed, transitions not redesigned but filmed
against `stage6-base` when layout, the header or a `view-transition-name`
moves, no reduced-motion work, hover gated to `(hover: hover) and
(pointer: fine)` with focus never gated, contrast pairs for every new ink or
surface, every review size in both schemes with 820 on purpose, reduced
transparency forced to `no-preference` in every probe, no em dashes a
visitor reads, no names of people, no sound, memory only, the toy
lifecycle).

**The signifier rule (critique A1), for every task that owns toys:**

1. **Mouse.** Every toy, inert ones included, gets the right cursor
   (`pointer` for a tap toy, `grab` / `grabbing` for a drag toy) and one
   hover response in the school's manner, gated to `(hover: hover) and
   (pointer: fine)`. A cursor covers only the part that answers (no pointer
   over empty grid columns).
2. **Touch beat.** At most one per toy per page visit, held in module
   memory (bauhaus's `beatPlayed` pattern). It fires only when the toy is at
   least 60% visible, the page has been still (no scroll) for at least
   400 ms, and no form field has focus. The beat is the toy's own response
   at small scale, never a generic wiggle. Nothing loops. Where a toy
   already has a nudge or pick-me (cottagecore clock, stamp, needle; bauhaus
   pick-me), move it onto these conditions rather than adding a second.
   **No beat** on the swiss pressed fields or the swiss About "Birch". The
   grandmillennial envelope's beat touches the wax seal only. The plates
   get a beat only once their swing is visible (task 30 makes it so).
3. **Film every beat at 390 on touch emulation** (a strip from the stillness
   timer to the end of the beat), and report each toy's mouse cursor and
   hover in a table.

**No new visible words** except the one sentence task 28 adds to the
Portal's welcome prompt, in the founder's words, exactly.

Probe and edit scripts go in `scripts/themes/stage6/` (named
`w4-t<n>-*.mjs`) and are committed with the task. Review agents write
theirs under scratch, never in the tracked tree.

**Copy is not yours:** the About copy (`src/content/copy/about.yaml`) is
for the founder's copy pass. Do not edit any copy file.
