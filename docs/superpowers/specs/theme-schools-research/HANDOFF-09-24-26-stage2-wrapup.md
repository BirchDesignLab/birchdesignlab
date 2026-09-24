# Theme schools: Tier 3 Stage 2 wrap-up handoff (09-24-26)

Start here. It supersedes `HANDOFF-09-23-26-stage2.md` for what is left of
Stage 2.

## Where things stand

Branch `feat/theme-schools-tier3-stage2` (from `main` at `f797bc9`), pushed
to origin 09-24-26 at the founder's request, and open as PR #89 (https://github.com/BirchDesignLab/birchdesignlab/pull/89); the wrap-up commits land on it. All six schools'
Stage 2 repairs are done and committed, and so are the portal fixes, the
freeze investigation and the 400 ms draw-ahead rest. `npm run verify` was clean at
the last commit: 331 unit tests, astro check 0 errors and 0 warnings, 440
built-site tests.

## Read first, in this order

All under `docs/superpowers/specs/theme-schools-research/`.

1. `tier3-briefs/stage0-decisions.md`: binding. Read every section from
   "Stage 2 start" to the end, especially "At the freeze stop".
2. `tier3-stage2/stage2-plan.md`: the plan and the shared swap acceptance.
3. `tier3-stage2/p5-proof.md`, `wave-a.md`, `assessment-before-wave-b.md`,
   `wave-b.md`, `freeze-investigation.md`: what happened, with evidence.
4. `src/themes/README.md`: the contract. It covers the view-transition
   names, the three named-chrome traps, and the wordmark section (Astro's
   layered fade, the inherits, blank <= 80 ms, and the scrolled-swap
   behaviour).

## What Stage 2 shipped (commits after f797bc9)

- **P5:** the wordmark recipe is proved and corrected. Astro's own
  `@layer astro` 180 ms fade beat the recipe; the fix is `inherit` on
  duration, curve and delay.
- **Every school's wordmark:** it never overlaps and never blinks, and the
  blank (neither wordmark shown) is at most 80 ms.
- **vaporwave:**
  - E1: the in-school swap (no white hero, no green sun);
  - E2: Contact no longer scrolls sideways;
  - the floor runs to the page bottom;
  - Exo 2 and VT323 are preloaded (the cap is now four);
  - a gentler light-scheme CRT power-on;
  - the tear band shows the pastel field in light;
  - `preserveDrawingBuffer` is dropped;
  - the sunset's program links behind the beam on arrival.
- **glassmorphism:**
  - E15: no blur or smear;
  - the header bar is held still in-school, with the frost on an underlay.
- **swiss:**
  - item 10: the column-panel wipe;
  - the wordmark swaps in one step;
  - `swiss-header` is held still, with the field behind its new picture.
- **cottagecore:**
  - item 2: the fresh-sheet swap;
  - `cottagecore-header` is held still;
  - the page is 34 to 37% lighter and pixel-identical.
- **grandmillennial:**
  - item 3: the swatch is a cut of the chintz;
  - item 4: the drapes open from frame one, with a staggered in-school
    swap;
  - `grandmillennial-header` is held still;
  - the `--lamp` token.
- **bauhaus:**
  - E5: `text-wrap` balance and pretty;
  - the circle wipe is visible at once;
  - the old wordmark fades without the delay.
- **quiet in the portal:** the wordmark default comes from
  `src/themes/quiet/portal.css`, and the root pages are untouched.
- **The portal runtime:**
  - a wordmark off screen on a scrolled swap (under half visible) is taken
    out of the morph on both sides;
  - drawing ahead: a script-less copy of the destination at opacity 0.001
    compiles its GPU programs before the swap.
- **Tooling:**
  - `motion.mjs`: `--from`, `--crop wordmark|header`, dense frames, the
    wordmark judge, `--draw-ahead`;
  - `snap.mjs`: per-builder frozen builds on their own ports;
  - `rejudge-wordmark.mjs`, `probe-scrolled-swap.mjs`;
  - `trace-arrival.mjs`: `--fresh-browser`, and the pf-raster, hover and
    tap conditions;
  - a hardened render lock;
  - `harness/` probes.

## The wrap-up, in order

1. **First, ask the founder the one open question: the press trigger.**
   Call 1, as revised ("Call 1 revised" in stage0-decisions), is done in
   `cfe6df8`: drawing ahead waits for a 400 ms mouse rest on a switcher
   row or Shuffle.
   - What it does now:
     - browsing the rows at up to 350 ms a row draws nothing;
     - a rest of about 0.9 s before the click saves nearly the whole freeze
       (grandmillennial 374 to about 45 ms);
     - a quicker click behaves as today, apart from a narrow window at 0.5
       to 0.6 s where glass dark holds 225 against 184 today.
   - The open question: a press on a row still starts a copy too, a holdover
     from the first version of call 1. A real mouse press comes about 0.1 s
     before the click. At that lead the measured gain-by-lead table
     (`freeze-investigation.md`, "Wrap-up: a longer mouse rest") shows
     drawing ahead makes a quick click worse: glass dark 349 against 184,
     bauhaus 103 against 66, the others about even. It was not measured
     with a real press.
   - Recommendation given: drop the press trigger and keep only the 400 ms
     rest, so quick clicks match today exactly.
   - Whatever they pick, apply it in `src/themes/portal/runtime.ts`
     (`drawOnIntent`: its pointerdown and keydown paths) and `switcher.ts`.
     Re-run `harness/draw-ahead-check.mjs --serve <snap>`; it needs the
     production cache headers, and without them the network checks fail
     falsely. Re-measure one quick-click cell per heavy school with
     `trace-arrival.mjs --rest-before-click 150` (5 runs, fresh browser,
     alone on the machine). Then update `freeze-investigation.md`.
   - Two measuring traps, both hit before:
     - "still" in the draw-ahead tables is max(first frame, screencast gap),
       not the screencast gap alone;
     - the bauhaus holds of about 100 to 116 ms at a 500 ms lead are
       unexplained. Log them; don't chase them.
2. **Final gates, on a fresh Worker build** (`preview_start worker`, :8787):
   - `npm run verify`;
   - `smoke.mjs --contact`;
   - `motion.mjs --crop switcher`, arrive and page, all six schools,
     desktop, mobile and phone;
   - the `--unname-switcher` negative control, which must still fail;
   - `motion.mjs --crop wordmark` for all six schools and quiet;
   - 48 full-frame after strips (`stage2-after`), with `compare-strips.mjs`
     sheets (.jpg) against `.out/stage2-before/`;
   - `trace-arrival.mjs --fresh-browser` for the timing table.
3. **The review panel:** `aplus-tier3-stage2-review-workflow.js` (drafted,
   not yet run).
   - Pass the gate results in `args.gates`.
   - Three reviewers, Opus/medium: motion; code, contract and guards;
     visuals and phones.
   - Up to 6 refute seats, Sonnet/medium, then a conditional fix round.
   - State the model plan and the agent count to the founder before
     launching.
4. **Write `tier3-stage2/stage2-report.md`** for the founder: what shipped,
   before/after sheets, the decisions taken, and what is open (below).
   Update `docs/lab-backlog.md` and write the Stage 3 handoff (pair B:
   glassmorphism and vaporwave).
5. **Stop for the founder.** PR #89 is open; ask whether to merge so they can test
   on the phone, as after Stage 1. Merging to main deploys to production.

## Open or held (goes in the report, not fixed in Stage 2)

- **For the transitions phase** (founder: the post-A+ push turns
  transitions into transformations; stalls are reduced where possible,
  never promised away):
  - glassmorphism's plain fade, and the convergence of four schools'
    in-school swaps on one fade shape (`wave-b.md`, held item 4);
  - drawing ahead on a school's own links (the in-school freeze:
    grandmillennial About about 260 ms);
  - Safari/WebKit;
  - phones get little lead from a tap.
- **Back to a scrolled page** still morphs the wordmark toward an off-screen
  box: the mirror of held item 3, and older than Stage 2
  (`harness/wm-close-back.mjs`).
- **Quiet with its wordmark about 30% on screen** shows its old header line
  crossfading about 32 px from the new one. This is quiet's own page
  crossfade and predates Stage 2.
- **The arriving wordmark is found by matching Astro's inline style text**
  (runtime.ts). Put it on the Astro-upgrade checklist, next to
  `loadWarmed`.

## How to work (lessons from this stage)

- **Show first:** the plan, the model per stage and the agent count before
  any workflow. Stop after each stage, and show strips and sheets
  (`compare-strips.mjs --out x.jpg` for the phone; very tall sheets fail to
  upload).
- **Verify every workflow result against its `journal.jsonl` and the disk.**
  Re-film anything a verifier did not film itself: one wave B verifier
  filmed nothing.
- **Sonnet verifiers rarely found new faults; the Opus critic found every
  real one.** Keep an Opus critic per workflow. Give verifiers a required
  list of adversarial cases, and a `films_made` field with a minimum.
- **Scripts go in `scripts/themes/` or `scripts/themes/harness/`,** never
  a scratchpad. Say so in every prompt.
- **Long batches:** tell agents to wait once (one Monitor, or foreground
  chunks under 10 minutes). Re-issued sleep waiters pile up in the
  founder's task list.
- **Timing needs the machine alone:** never build or film while an agent
  measures.
- **`snap.mjs` builds rewrite `dist/`,** which the :8787 Worker serves.
  Rebuild the Worker before the gates.
