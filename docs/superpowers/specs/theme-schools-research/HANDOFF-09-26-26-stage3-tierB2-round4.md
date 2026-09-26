# Theme schools: Tier 3 Stage 3 handoff, wave B2 round 4 (09-26-26)

Start here. It supersedes `HANDOFF-09-25-26-stage3-tierB2.md` for wave B2.

## Where things stand

- Branch `feat/theme-schools-tier3-stage3-b2`, **draft PR #93**. Do not mark
  it ready or merge it until the gates pass: merging deploys.
- B2 has run four workflows: the build (both critics blocked), fix rounds 1
  and 2, and round 3. The full record, round by round, with every blocker,
  measurement and the next round's list, is `tier3-stage3/tier-b2-status.md`
  ("Round 3" is the latest; its "Next round" list is the work). Every
  founder answer is in `tier3-stage3/stage3-decisions.md` (the last section,
  "Answers after B2 round 3", wins).
- Open blockers: glass 1 (Home's orbs 17 to 65 px high, an `orbs-clock.ts`
  measure bug) plus the founder's phone-hero and switcher calls; vaporwave 1
  (the pipes' halo band) plus the no-scroll phone attract and a caption nit.
- Held for the founder's iPhone look after deploy: the bust's seat and its
  supersampling, Safari's frosted panes, the lens's iOS scroll.

## How to run the next round

- Plan it from the status doc's "Next round" list; show the model plan and
  the agent count; launch. The founder may ask to pause before the review
  stages: a Monitor on the workflow's `journal.jsonl` that exits when a
  review agent's "started" line appears, then TaskStop, did it last time.
- Seats that worked: Opus 5.5 `medium` for lens and WebGL runtime fixes
  (Sonnet fixers regressed them twice); Sonnet 5 `xhigh` for the
  interactables; Opus 5.5 `high` critics (they found every real defect);
  **verifiers at Sonnet 5 `high`** (at `medium` they made 0 films three
  times).
- Prompts: name the done steps; give each seat an ownership list (one
  working tree); snap builds on their own ports; GPU Chromium; force
  `prefers-reduced-transparency: no-preference`; suppress the portal prompt;
  films are timestamped strips; arrivals through the real switcher.
- Earlier reports for fixers: `scripts/themes/.out/stage3-b2/w1-reports.json`,
  `w2-vw-fixers.json`, `w3-reports.json`, `w4-reports.json`.

## Lessons from this wave

- Look at the sheets yourself before every stop: round 3's first "fixed"
  lens had hidden every orb on Home, which only a critic's own whole-page
  sheet showed.
- A fix that changes z-order or stacking needs a before and after sheet of
  the whole page, not only the element it touched.
- A workflow agent killed before its structured report leaves its work on
  disk and its transcript in the workflow folder; a rerun seat can finish
  from there instead of starting over.
- Check `netstat` for ports 4460 to 4480 after every workflow and stop stale
  `snap.mjs --hold` servers.
- Long shell heredocs with apostrophes can fail to parse as a whole; write
  docs with the Write and Edit tools.
