# Stage 6 wave 3: rules shared by every task

Read with your own task brief (`w3-18` to `w3-27` in this folder). Task
numbers continue from wave 2.

**Binding, in order:** `../stop3-report.md` ("Answers", 11-21-26),
`../stop2-report.md` ("Answers"), `../stop1-report.md` ("Answers": every
recommendation taken, including call 7: build every interactable, cheap ones
first, no elevator sound), the school report your brief names
(`../a1-critic-<school>.md`, its "Interactables" section), then
`../../tier3-briefs/stage0-decisions.md` and the school's dossier and Tier 3
brief. `src/themes/README.md` holds the school contract.

Every rule in `w1-common.md` and `w2-common.md` holds unchanged (word parity,
links fixed, transitions not redesigned but filmed against `stage6-base`
when layout, the header or a `view-transition-name` moves, no reduced-motion
work, hover gated to `(hover: hover) and (pointer: fine)` with focus never
gated, contrast pairs for every new ink or surface, every review size in
both schemes with 820 on purpose, reduced transparency forced to
`no-preference` in every probe, no em dashes a visitor reads, no names of
people). The hover guard (`tests/hover-guard.test.ts`) now enforces the
hover rule: a new ungated `:hover` fails the gate.

Wave 3 is the interactables. For every toy:

- **Real control or inert.** A toy that does something a visitor can
  operate is a `<button>` (or a proper slider or toggle) with an
  `aria-label` that starts with a visible word if there is one, keyboard
  operable (Enter or Space; arrows where it travels), `aria-pressed` where
  it toggles. A purely decorative response is `aria-hidden` and not
  focusable. Your brief says which.
- **Touch and mouse both work; a vertical swipe always scrolls.** A drag
  that starts on a toy on a coarse pointer picks up only after a short
  press (about 200 ms) or a mostly horizontal move over about 8px, as
  bauhaus's `.loose` shapes do since wave 2.
- **Memory only.** Nothing stored, nothing sent; state resets each visit.
- **Lifecycle.** Init through the school's existing `onMount` pattern,
  returning a cleanup that removes every listener, timer, animation frame
  and observer. The toy is torn down before every view-transition snapshot
  and remounts once on return (the glass double-lens bug was a lifecycle
  bug: one instance per visit). No loop runs while the page is hidden or
  the toy is off screen.
- **No sound.** No audio of any kind.
- **New visible words:** only those the founder approved (stop 3 answer 3,
  quoted in the vaporwave briefs). Everything else is wordless.
- **Findable but quiet:** the business pages' calm is not this room's
  problem, but a toy must not cover copy, links or the Contact form, and
  must not shift layout when it moves (transforms only).
- Probe and edit scripts go in `scripts/themes/stage6/` (named
  `w3-t<n>-*.mjs`) and are committed with the task. Review agents write
  theirs under scratch, never in the tracked tree.
