# Stage 6 wave 2: rules shared by every task

Read with your own task brief (`w2-9` to `w2-17` in this folder). Task
numbers continue from wave 1 so ledger lines stay unique.

**Binding, in order:** `../stop2-report.md` ("Answers", 11-20-26),
`../stop1-report.md` ("Answers", 11-19-26: every recommendation taken),
`../stage6-decisions.md` ("Answers"), the school report your brief names
(`../a1-critic-<school>.md`, `../a1-ledger-triage.md`), then
`../../tier3-briefs/stage0-decisions.md` and the school's dossier and Tier 3
brief. Earlier stages' decisions still hold unless the stop answers changed
them. `src/themes/README.md` holds the school contract.

Every rule in `w1-common.md` holds for this wave unchanged: fixed copy and
links (word parity), transitions not redesigned but filmed and compared with
`stage6-base` whenever layout, the header or a `view-transition-name` moves,
no reduced-motion work, interactables as real controls or `aria-hidden`
inert, hover rules gated to `(hover: hover) and (pointer: fine)` with focus
never gated, contrast pairs in `meta.ts` for every new ink or surface, every
review size (1440, 1280, 1024, 820, 390) in light and dark with 820 looked at
on purpose, glass judged from viewport frames, reduced transparency forced to
`no-preference` in every probe, no polishing of copy-dependent line breaks,
no em dashes a visitor reads, no names of people.

Wave 2 additions:

- **Deferred minors from wave 1** are named by ledger id in your brief
  (`docs/private/stage6-ledger.md`, gitignored: the brief quotes what you
  need). Fix each, or decline it with a reason in your report. Do not
  re-raise wave 1 taste calls that the stop 2 answers settled.
- **New visible words** (labels, file names) are a founder call: none in
  this wave unless your brief quotes them.
- **The bauhaus `?bh-assembly=a|b|c` switch** stays as it is.
- **Copy-pass items** (bauhaus About's "one man" and "taught him", About's
  "one person's work", cottagecore's two-column cards at 860 to 1000px) are
  for the copy pass: leave them.
- Probe and edit scripts go in `scripts/themes/stage6/` (named
  `w2-t<n>-*.mjs`) and are committed with the task.
