# Theme schools: Tier 3 Stage 3 handoff, wave B2 after round 4 (09-26-26)

Start here. It supersedes `HANDOFF-09-25-26-stage3-tierB2.md` for wave B2.
(Rewritten at the round-4 stop; the round-4 plan it held is done.)

## Where things stand

- Branch `feat/theme-schools-tier3-stage3-b2`, **draft PR #93**. Do not mark
  it ready or merge it until the founder says so: merging deploys.
- B2 has run five workflows. Round 4 (`wf_80f40fcf-631`, 6 agents) is
  committed and pushed (`c24c067`). The founder's report is
  `tier3-stage3/tier-b2-report.md`; the round-by-round record
  `tier3-stage3/tier-b2-status.md` ("Round 4"); every answer
  `tier3-stage3/stage3-decisions.md` (the last section wins).
- **Vaporwave passes.** **Glass blocks 2:** the 820 x 1180 lens jumps across
  the window on arrival (the corner start planned before and after the orb
  clock moves the orbs); desktop hero orbs off B1's positions (the Control
  Centre inside the hero grew its box). The report recommends a glass-only
  round 5 (Opus `medium` fixer, Opus `high` critic, Sonnet `high` verifier
  that films 820 arrivals). **Stopped for the founder's calls** (8 in the
  report, the first being glass's later arrival: about 150 to 200 ms beyond
  machine drift on cold and switcher-warm arrivals).
- The Stage 3 gates ran once on round 4's tree (`.out/stage3-gates/gates.md`):
  all pass but timing (one transient socket error). Rerun them after any
  glass fix.
- Held for the founder's iPhone look after deploy: the bust's seat and its
  supersampling, Safari's frosted panes, the lens's iOS scroll.

## How to run the next round

- Plan it from the report's blockers plus the founder's answers; show the
  model plan and the agent count; launch. Round 4's script is the template
  (session workflow folder; its prompts are summarised in the status doc).
- Seats that worked: Opus 5.5 `medium` for lens and WebGL runtime fixes;
  Sonnet 5 `xhigh` for the interactables; Opus 5.5 `high` critics; verifiers
  at Sonnet 5 `high`.
- Prompts: name the done steps; give each seat an ownership list (one
  working tree); snap builds on their own ports; GPU Chromium; force
  `prefers-reduced-transparency: no-preference`; suppress the portal prompt;
  films are timestamped strips; arrivals through the real switcher; whole-
  page before and after sheets for any layout or stacking change.
- Gates: `npm run verify`, then the `worker` launch config on :8787, then
  `BDL_GPU=1 node scripts/themes/harness/stage-gates.mjs --base
  http://127.0.0.1:8787 --label stage3-gates --before-dir stage3-before
  --after-label stage3-after` (about 75 minutes, machine alone), then
  `harness/b2r4-timing-compare.mjs` and the S3 sheet
  (`harness/b2r4-s3-sheet.mjs`, capture command in its header).

## Lessons from this wave

- Look at the sheets yourself before every stop. Round 4's verifier passed
  every case and still missed the 820 jump, because nobody asked it to film
  820 arrivals; the critic did.
- A fix that changes z-order, stacking or layout needs a before and after
  sheet of the whole page at every size, not only the sizes the fix targets
  (round 4 restored B1's orb box on phones; the desktop box drift was older
  and only a B1-vs-now sheet showed it).
- `trace-arrival.mjs` exits 2 on any console error (the sandboxed draw-ahead
  iframes log many); read `gates.md` for verdicts, not exit codes.
- Compare timing against schools the stage never touched to separate
  machine drift from a real change.
- Check `netstat` for ports 4460 to 4480 and 8787 after every workflow and
  gate run.
- Write docs with the Write and Edit tools, not shell heredocs.
