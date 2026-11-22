# Stage 6, stop 5: adversarial critique of the calls

Asked for by the founder at stop 5 (11-21-26) before deciding. Two
read-only critics, both Opus `medium`: D, calls 1 to 3 (swiss full stop,
"Birch" cursor, the elevator on a desktop); E, calls 4 to 6 (experiment
press flashes, the recorded readings, the close and the minors' triage).
Nothing rendered; evidence is the wave 4 sheets, the whole-set capture at
c6a58bb, the ledger and the source.

| # | Call / item | Stop 5 rec | Critic's verdict |
|---|---|---|---|
| 1 | Swiss full stop hover outline | hug the red square, ~8px out | **keep**, built as below |
| 2 | Swiss "Birch" cursor | no cursor, keep the hover | **keep** (`cursor: default`) |
| 3 | Vaporwave elevator on a desktop | scroll at every width when off screen | **keep**, no scroll back; reverses stop 4's "1440 unchanged", so it needs the founder's explicit OK |
| 4 | Experiment press flashes | remove all listed | **change**: remove six, keep the two links in bdl-012 |
| 5 | Six recorded readings | accept all | **keep** all |
| 6 | The close | calls 1 to 4 and two defects inline, 8 minors to backlog | **keep**, plus three minors fixed now (m2, m5, m6) |

## D: calls 1 to 3

**1, full stop.** Take the outline off the hit square's `::after`
(`src/themes/swiss/pages/Sent.astro` around 59 to 72; the square stays as
the hit area, unpainted) and draw it on a new `.stop[data-live]::before`
that boxes the dot's measured ink plus 8px each side, `outline: 1px solid
var(--mark)`, inside the same hover and fine-pointer query. Measure the
ink at 390 and 1440, not the advance box; at 1440 the outline's left edge
(about x 1145) clears the t's foot (x 1127) by about 18px. The grab cursor
already signals the drag.

**2, "Birch".** `About.astro` around 225: `cursor: ns-resize` becomes
`cursor: default`; `pointer-events` and the hover ink block stay; update
the comment around 212. No cursor honestly says "scroll moves this"
(`all-scroll` and `grab` also promise a drag), and the ink-block inversion
is a strong hover cue on its own.

**3, elevator.** `elevator.ts` around 91: drop the `BRING_QUERY` condition,
delete the constant and its rationale (around 53 to 63), and fix the
header (around 12 to 16) to "at every width". No scroll back to the kiosk:
a second jump nobody asked for, and the phone has none. The yank worry does
not hold: round r0 already filmed the desktop scroll, 1367px at 1440 landing
by about 1200 ms with the door active, and 1641px at 390. Without it a
desktop press activates a window about 1000px out of view, a false promise
of its own. The in-view case is filmed as no movement. Re-film 1440 with
390 and 820.

## E: calls 4 to 6

**4, press flashes.** Remove the new `:active` rules at
`bdl-012/Experiment.astro` around 452 and 560, `bdl-001/BarkEngine.svelte`
around 178, `bdl-002/Experiment.astro` around 71,
`bdl-003/NovgorodLetters.svelte` around 80, and also
`src/pages/styleguide.astro` around 185 (`#copy-tokens`, whose label already
changes to "Copied"). **Keep** `bdl-012` around 748 and 751: they are links,
like the Lab cards and hatches, and navigation can lag on a phone. Every
control that loses its press colour still answers (aria-pressed and the
caption, a drawer closing, a tree regrowing, the theme flipping, a letter
closing). The guard counts only `:hover`; no test asserts `:active`.
Framing correction: before task 28 these controls kept a sticky hover fill
after a tap, so "flash where they did not before" overstated it.

**5, readings.** Accept all: the kiosk props' ramp is continuous at 820
and 900; the swiss `::after` edge is contained by `main { overflow-x: clip }`
(swiss `theme.css` around 524) and cuts nothing visible; the flap's 26px is
the foreshortening of exactly the critique's `rotateX(-105deg)` (fix the
code comment that says 36px).

**6, the close and the minors.**
- **m2, fix now:** a touch during the swiss numeral's return snaps 900 to
  700 in one frame, and the touch beat invites exactly that tap. In swiss
  `toys.ts`, where `!r.started` leads to `rest(n)` (around 313) and the
  swipe branch (around 358 to 360): if `r.weight !== W_REST`, run the
  constant-speed return from `r.weight` instead. Re-film a 100 ms tap
  during the beat at 390.
- **m6, fix now:** add `&& warmed` to the plates' `ready` predicate
  (grandmillennial `parts/plates.ts` around 331), so the first-impression
  beat never carries the filter hitch.
- **m5, fix now:** the stale dark-thread comment (cottagecore `theme.css`
  around 191), cheaper than a backlog line.
- **Bauhaus timer defect:** `built()` returns true when no CSS animation
  exists (`toys.ts` around 398 to 405), so the beat spends once and
  `beat.ts` stops re-arming.
- **m1:** the "snaps after the first tap" half is stale (f2f1c9e moved the
  lift onto its own group with its own transition); backlog only the
  scaling with the corner's width.
- **m3, m4, m7:** backlog (a transient 1.03:1 margin edge, a weak probe
  check, an uneven seed stagger).
