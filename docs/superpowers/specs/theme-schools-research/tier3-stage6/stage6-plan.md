# Stage 6, the set re-review: plan

Drafted 11-19-26 from the answers in `stage6-decisions.md`. Branch
`feat/theme-schools-tier3-stage6` from main at bc9bf82. Three stops, each
needing the founder's go to start the next segment. Nothing runs until the
founder says go on Tier A.

## Tier A: fresh evidence and the panel

**A0, the evidence (controller, scripts only, no agents).** One snap build
of the branch head (`scripts/themes/snap.mjs`, label `stage6-base`), then on
the GPU (`BDL_GPU=1`, renderer checked via `WEBGL_debug_renderer_info`):

- Captures of all six schools, five pages, both schemes, at desktop, tablet
  and phone (`capture.mjs`), composed into one sheet per school per viewport
  (`contact-sheet.mjs`): the twelve desktop and phone sheets plus tablet.
- Arrival strips: `motion.mjs` scenarios `arrive`, `page` and `fx`, both
  schemes, desktop and phone, every school.
- Boundary sheets: the three confusable pairs (swiss and bauhaus, glass and
  vaporwave, grandmillennial and cottagecore) side by side at thumbnail
  scale, dark, desktop and phone.
- Bauhaus assemblies (a), (b) and (c) side by side, for the founder's
  reference only; no pick asked for.

Output under the gitignored `scripts/themes/.out/stage6/a0/`; any new script
goes in `scripts/themes/stage6/` and is committed.

**A1, the panel (Agent tool, in parallel, no workflow).** 10 agents.

| Seat | Model / effort | Brief |
|---|---|---|
| Five school critics (vaporwave, grandmillennial, cottagecore, bauhaus, swiss) | Opus / `high` | The school's sheets and strips, dossier, Tier 3 brief and stage reports, and the current code. Findings with severity and a fix; swiss may propose bigger rework (answer 2); swiss also designs the width dial's detail against the spec in decisions 4; bauhaus the questionnaire card's (decisions 5), with draft words for the founder. |
| Glass critic | Opus / `high` | The same, starting from the founder's two failures: the transparency does not read as glass, and the draggable does not work on desktop. Drives the page itself on GPU Chromium. Bigger rework proposals welcome. |
| Glass lens diagnosis | Opus / `high` | Why the drag fails on desktop, from `src/themes/glassmorphism/lens/` and a live GPU probe: root cause and the smallest fix, separate from taste. Steps up to `xhigh` only if `high` falls short. |
| Ledger triage | Sonnet / `medium` | Each Stage 5 ledger item that neither fix task covered (`docs/private/stage5-ledger.md`, mostly B1 tasks 3 to 5) against the current code: still there, fixed, or moot. No calls; feeds the wave. |
| Set critic | Opus / `high` | Runs after the six school critics. All sheets, strips and the six reports: distinctness, even quality, the boundaries at thumbnail scale in dark and on phones, what is shared. Merges, ranks and drafts the stop 1 report. |
| Claim check | Sonnet / `low` | After the set critic: verify or refute each file:line claim in the stop 1 draft against the tree (critics' references drift). |

The controller then looks at every sheet against the reports before the
stop (critics have passed unmet brief items before).

**Stop 1.** The founder rules on the findings, the glass and swiss rework
proposals, the two interactables' detail and the card's draft words. If a
big glass rework is taken, the controller may propose a glass proof before
the wave; that would add a stop and is the founder's call then.

## Tier B: the wave

One `bdl-wave` (`s6-b`) on this branch; its task list comes from the stop 1
answers. Provisional:

1. Glass: the transparency, the drag fix and any rework taken (`runtime:
   true`, so the implementer and fixer run at Opus `medium`).
2. Swiss: any rework taken, the width dial.
3. Bauhaus: the questionnaire card, any fixes taken.
4. Grandmillennial: the rosette's short tails, its ledger leftovers, any
   fixes taken.
5. Cottagecore and vaporwave: fixes taken, ledger leftovers.
6. Set-wide and boundary fixes, if the panel finds any.

Seats per task, the `bdl-task` defaults: implementer Sonnet `medium` (Opus
`medium` with `runtime`), verifyHead Haiku, critic Opus `high`, verifier
Sonnet `high`, gate Sonnet `low`, fixer as implementer, escalated fixer one
step up, re-critic Opus `medium`. About 10 to 15 agents a task, so about 60
to 90 for the wave. Every task keeps its Opus critic. Exact args, owns,
ports and the per-task plan are stated before launch.

**Stop 2.** Whole-page before and after sheets (the controller eyeballs
them first), the wave's taste calls, the card's words in place.

## Close

The answered stop 2 calls go in a fix task if needed. Then merge main in,
run the end-of-stage gates (`scripts/themes/harness/stage-gates.mjs`, about
75 minutes), write the stage report, and open the PR to main (founder
approves and merges by hand). **Stop 3.** After the merge, the transitions
phase opens.

## Budget

Tier A about 10 agents; Tier B about 60 to 90; the close about 10 to 15 if a
fix task runs. For scale, Stage 4 was about 150 agents and 15M tokens.
