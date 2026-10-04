# Theme schools: handoff to Stage 5, pair C (10-03-26)

Start here. Stage 4 (pair A, swiss and bauhaus) is merged and deploying
(PR #95, merge 5316e1c). This branch, `feat/theme-schools-tier3-stage5`, was
cut from that merge and holds only this file so far.

## The plan (founder, 10-02-26)

Pair A (done) → **pair C: grandmillennial and cottagecore (Stage 5, next)** →
Stage 6 set re-review (`tier3-briefs/portal.md` section 6) → the transitions
phase LAST → tranche 2 (TempleOS is in the pile). The nitpicks, the founder's
iPhone pass and "glass on desktop doesn't look right" (specifics not given)
come at the end; see `docs/lab-backlog.md`, "Order after B2" and "Stage 4".

## Owed before or alongside Stage 5

1. **The bauhaus assembly pick.** Once the deploy is live the founder compares
   `/t/bauhaus/?bh-assembly=b` (mechanical) and `=c` (middle) against `=a`
   (today's, the default). Then remove the URL switch in one small change (it
   lives in one place in `src/themes/bauhaus/`; grep `bh-assembly`) and set
   the picked feel as the default block (`tier3-stage4/proofs/bauhaus-assembly.md`,
   "Tier B should lift", item 3). Inline: under 150 lines, fully specified.
2. Confirm the Stage 4 deploy is live (`curl -s https://birchdesignlab.com/t/swiss/ | grep -c data-sw-grid-key`).

## How a pair runs now (Stage 4's shape, founder-approved)

- **Three hard stops, each needing the founder's go:** after the Tier A
  proofs, after the first school's wave, after the second school's wave plus
  the stage gates. Plus a start-of-pair stop: list the per-school decisions
  being applied (Stage 0's defaults) and the open calls, with
  recommendations. The founder answers informally; record every answer in the
  stage's decisions file.
- **Model plan and agent count before every launch.** Stage 4 actuals: about
  10 agents per task (every task needed one fix round), about 40 per school
  wave, about 60 for five proofs; about 15M subagent tokens for the pair.
- **Taste calls park for the stop; blockers stop the run.** Look at the
  sheets yourself before every stop (critics and verifiers miss things).

## Running the saved workflows

Reference: `.claude/workflows/README.md`. Stage 4's calls are the template:
`Workflow({ scriptPath: "C:\\git\\birchdesignlab\\.claude\\workflows\\bdl-wave.js", args })`
with `wave`, `repoDir`, `branch`, `base` (full sha, HEAD before the first
task), `workDir` and `scratchRoot` under `scripts/themes/.out/stage5/`,
`trailer`, `ports: [4460, 4461, 4462]`, `foreignPaths: ["docs/briefs/"]`
(another session's untracked folder; leave it alone), `school`, `layout:
true`, `baseline: "stage4-base"` or a fresh snap of main, `maxAgents: 16`,
`carries` (name the done steps), and `tasks: [{ task, title, briefPath, owns,
films: [{ id, what, sizes? }] }]`.

- **owns:** `src/themes/<school>/**`, `src/pages/t/<school>/**`,
  `scripts/themes/<school>/**` (probes get committed there; leaving them out
  parked a swiss task), `tests/**`.
- **Briefs:** a common rules file plus one brief per task, written to
  `tier3-stage5/briefs/` and committed before launch (Stage 4's
  `tier3-stage4/briefs/` are the model: binding order, protect list, contract,
  Stage 2 swap not regressed, proofs to lift).
- **After each run:** read the result (the task output file), append
  `ledgerLines` with `node scripts/workflows/append-ledger.mjs <output> scripts/themes/.out/stage5/ledger.md`,
  check `git status`, `git log`, `git reflog` and `netstat` (4460 to 4480,
  8787), then look at the sheets yourself.
- **Parked tasks so far were housekeeping, not design:** a gate cut off
  waiting on a background check (fixed), a committed report file (fixed), two
  uncommitted probe scripts (fixed by owning `scripts/themes/<school>/**`).
  Rule on them inline; the next wave starts with `base` at HEAD and `carried`
  lines naming earlier taste calls and minors so critics do not re-raise them.
- **Budget stop:** answer `{ at: "budget", text }` in `answers["<task>"]`
  and resume with `resumeFromRunId` and the full args; it replays from cache.
- **Workflow subagents may be refused when they write report files**; the
  scripts carry reports in structured output (memory note).
- **Gates at the end of a pair:** `npm run verify`, `preview_start` the
  `worker` config (:8787, rebuilds first; wait for 200), then
  `BDL_GPU=1 node scripts/themes/harness/stage-gates.mjs --base http://127.0.0.1:8787 --label stage5-gates --before-dir stage4-after --after-label stage5-after`
  in the background (about 75 minutes, machine alone), then
  `node scripts/themes/harness/b2r4-timing-compare.mjs --before stage4-gates-timing --after stage5-gates-timing --metric land90`.
  Stop the worker afterwards.
- **Cloudflare Workers Builds** sometimes fails to initialise (a timeout with
  no build output): a rerun from the dashboard fixes it; it is not our code.

## Pair C: where to start

- Briefs: `tier3-briefs/grandmillennial.md`, `tier3-briefs/cottagecore.md`;
  dossiers in `dossiers/`; the plan's Stage 5 note in `tier3-briefs/portal.md`
  (S5 is their only boundary: grandmillennial owns counted cross-stitch
  lettering, cottagecore's hoop goes freehand, cottagecore gets twine).
- Stage 0 answers that apply (`tier3-briefs/stage0-decisions.md`):
  grandmillennial D = a decorative cross-stitch alphabet band on the sampler
  (`aria-hidden` SVG); cottagecore D1 = objects dated 09-23-26 (the words are
  copy: draft them for the founder's approval), D3 = garden twine replaces the
  satin bow; the founder's Stage 1 note: protect cottagecore's dark-mode
  fireflies, and design dandelion floaters for light mode (independent clocks,
  never over body text). S3 applies: more interactable details, even inert
  ones. Stage 2 already shipped cottagecore item 2 and grandmillennial items
  3 and 4; the founder accepted their scrolled header bands.
- Founder read 09-23-26: grandmillennial and cottagecore are "absolutely
  selling what we can do", so the job is to raise them without changing their
  character, as with bauhaus.
- First step: the start-of-pair stop (`tier3-stage5/stage5-decisions.md`),
  modelled on `tier3-stage4/stage4-decisions.md`.
