# Theme schools: Tier 3 Stage 3 handoff, wave B2 after round 5 (09-27-26)

Start here. It supersedes `HANDOFF-09-25-26-stage3-tierB2.md` for wave B2.
(The file name is from round 4; rewritten at the round-5 stop.)

## Where things stand

- Branch `feat/theme-schools-tier3-stage3-b2`, **draft PR #93**, round 5
  pushed (`78e5394` code, then the docs commit). **Both schools pass** their
  Opus critics and Sonnet verifiers; **all seven Stage 3 gates pass** on the
  round-5 tree (`.out/stage3-gates-r5/gates.md`); `npm run verify` clean.
- **Waiting on the founder's go to mark #93 ready and merge it.** Merging
  deploys (Cloudflare Workers Builds). Four small round-5 taste calls are in
  `tier3-stage3/tier-b2-report.md` ("Calls from round 5"); none blocks.
- After the merge: pull `main`, delete the branch locally and on the remote,
  then the founder's iPhone look (the bust's seat and its supersampling,
  Safari's frosted panes, the lens's iOS scroll).
- Record: `tier3-stage3/tier-b2-status.md` ("Round 5"); answers
  `tier3-stage3/stage3-decisions.md` (the last section wins); reports
  `.out/stage3-b2/w5-reports.json` (round 4), `w6-reports.json` (round 5).

## Glass arrival timing (settled for now)

The gates' `firstVisible` fires when the old page starts to change, which
in B1 was its early fade. Now the old page holds until glass's first GPU
raster and then cuts, so `firstVisible` reads +65 to +292 ms against Stage
2 while `land90` (the glass page 90% on screen) reads +12 to +88, inside
the drift of untouched schools. The founder chose to leave it for the
transitions phase. Read `land90` beside `firstVisible`:
`node scripts/themes/harness/b2r4-timing-compare.mjs --after <label>-timing
--metric land90`. The investigation (`.out/stage3-b2/glass-timing/`,
`harness/b2r5-glass-timing-*.mjs`) names the real levers: drawing glass
ahead on cold clicks (portal-wide; the known glass text-thinning risk) or
fewer paint kinds in its first view.

## If another round is ever needed

- Seats that worked: Opus 5.5 `medium` for lens and WebGL runtime fixes;
  Sonnet 5 `xhigh` for the interactables; Opus 5.5 `high` critics;
  verifiers at Sonnet 5 `high` (at `medium` they filmed nothing).
- Prompts: name the done steps; an ownership list per seat (one working
  tree); snap builds on their own ports; GPU Chromium; force
  `prefers-reduced-transparency: no-preference`; suppress the portal
  prompt; films are timestamped strips; arrivals through the real switcher
  at every review size (1440, 1280, 1024, 820, 390); whole-page before and
  after sheets against B1 (`snap-b1-final`) at every size for any layout or
  stacking change.
- Gates: `npm run verify`, the `worker` launch config on :8787, then
  `BDL_GPU=1 node scripts/themes/harness/stage-gates.mjs --base
  http://127.0.0.1:8787 --label <label> --before-dir stage3-before
  --after-label <after-label>` (about 75 minutes, machine alone). A single
  capture miss can be re-filmed alone with `motion.mjs` and rejudged with
  `--reuse --steps <step>`. S3 sheet: `harness/b2r4-s3-sheet.mjs` (capture
  command in its header).

## Lessons from this wave

- Look at the sheets yourself before every stop; verifiers pass what they
  were not asked to film (round 4 missed the 820 jump).
- Check the BUILT CSS for any new animation rule: lightningcss folds
  `animation-timeline` into the shorthand when it can, and Chromium rejects
  the result (round 5's pre-clock orb rule was dead until split into its own
  `@supports` block).
- A timing number needs its definition checked before it becomes a finding:
  `firstVisible` measured the old page, not the new one.
- Compare timing against schools the stage never touched to separate
  machine drift from a real change.
- `trace-arrival.mjs` exits 2 on any console error (the sandboxed draw-ahead
  iframes log many); read `gates.md` for verdicts, not exit codes.
- Check `netstat` for ports 4460 to 4480 and 8787 after every workflow and
  gate run.
- Write docs with the Write and Edit tools, not shell heredocs.
