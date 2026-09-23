# Theme schools: Tier 3 Stage 2 handoff (end of the Stage 1 session, 09-23-26)

Start here. For tooling details and older gotchas, `HANDOFF-09-23-26-tier3.md`
still applies; this file supersedes it as the starting point.

## Where things stand

- **Tier 3 Stage 1 (the portal) is done.** It was built, reviewed by a
  six-reviewer panel, fixed, and put through the founder's decisions. It went
  to `main` in one PR from `feat/theme-schools-tranche-1`, so the founder
  could test on mobile live (find it with `gh pr list --state all --head feat/theme-schools-tranche-1`).
  BDL-010 stays `forthcoming` in the Lab until the schools reach A+, so the
  `/t/` rooms are live but not linked.
- **First steps in the new session:**
  1. `git status` and `git log`.
  2. Ask the founder whether the PR merged. If it did: check out `main`,
     pull, delete the merged branch locally and on the remote (CLAUDE.md),
     and branch `feat/theme-schools-tier3-stage2` from `main`.
  3. Ask what the founder saw on mobile live. That feedback comes before
     Stage 2's plan.
- **The exhibit is "the Portal"**, never "Period Rooms" in new writing.
- **Order after the schools (founder, 09-23-26):** first themes and
  transitions, then the big site copy pass (planned and audited twice, not
  yet executed), then one pass to sew the Portal and the site together.
  Word parity means the copy pass reflows all seven schools at once, so fix
  structure, not copy-dependent line breaks (`docs/lab-backlog.md`, BDL-010).

## Read first, in this order

All under `docs/superpowers/specs/theme-schools-research/` unless noted.

1. `tier3-briefs/stage0-decisions.md`: binding. The Stage 0 answers, the
   Stage 1 decisions, the loading and transitions-phase direction, and the
   answers given at the Stage 1 stop.
2. `tier3-stage1/stage1-report.md`: what Stage 1 shipped, its evidence, and
   what carries into Stage 2.
3. `tier3-briefs/portal.md` section 6 (Stage 2 list) and section 4's shared
   swap acceptance.
4. `tier3-stage1/p4-trace.md`: the "Stage 2 items, per school" section.
5. The school briefs `tier3-briefs/<school>.md`, and `src/themes/README.md`
   (the authors' contract: the naming contract, the wordmark default, S1, S3).

## Stage 2: the defect sweep, all six schools in parallel

1. **The P5 proof comes first.** Film the README's default wordmark
   crossfade on one school with a crop that holds both wordmarks: add
   `--crop wordmark` to `motion.mjs`, measuring the union of the old and new
   wordmark boxes, or film full frame. No frame may show both wordmarks
   legible. Stage 1's attempt was inconclusive: the header crop was sized to
   quiet's thin header. Every school adopts the default only after this
   passes.
2. **Then each school.**
   - Its `portal.md` Stage 2 items, minus reduced motion (S1):
     - vaporwave: E1 swap, E2 Contact overflow, the E3 tail;
     - glass: E15;
     - swiss: the transition repair (D4 scope);
     - cottagecore: item 2, using `cottagecore-header` per the README, not
       `cc-header`;
     - grandmillennial: items 3 and 4;
     - bauhaus: E5.
   - The wordmark default.
   - Its first-frame items from `p4-trace.md`:
     - bauhaus: the circle wipe that starts invisibly;
     - grandmillennial: the drapes' slow start;
     - vaporwave: the Exo 2 and VT323 preloads;
     - cottagecore: 337 KB of HTML.
3. **Every school is held to the shared swap acceptance, plus Stage 1's
   gates:**
   - `npm run verify` clean;
   - `smoke.mjs --contact` clean;
   - `motion.mjs --crop switcher` held still for arrive and page;
   - the `--unname-switcher` control still failing.
4. **Then stop for the founder.** At each later pair stage, list the
   per-school decisions being applied.

## How to work (founder rules this session reinforced)

- **Show first.** Give the plan, the model for each stage and the agent
  count before any workflow, and stop after each stage. Show visual work as
  motion strips and screenshots, not descriptions: use
  `scripts/themes/compare-strips.mjs` for before-and-after sheets.
- **Models:** builders and fixers Opus/high, critics Opus/medium, verify and
  refute seats Sonnet/medium. Volume is fine; tier it. Aim to keep a
  workflow under about 10 agents unless the founder asks for more.
- **Verify every workflow result against its `journal.jsonl` and the disk
  before reporting it.** This session a fabricated "completed" notice with
  invented numbers reached the founder and was relayed before it was caught.
- **Workflow agents see the founder's latest message.** Name the steps
  already done and each agent's slice. Forbid git state changes and builds
  where another agent is timing the Worker.
- **Scripts live in the repo** (`scripts/themes/`, `scripts/themes/harness/`).
  Save each workflow script beside the briefs as `aplus-tier3-*.js`.
- **Copy is the founder's.** Draft options; never ship reworded visitor
  copy without their yes.

## Tooling added in Stage 1

- `motion.mjs`:
  - `--crop switcher|header`;
  - a hold-still verdict on switcher crops;
  - `--unname-switcher` (the negative control);
  - `--show-prompt`;
  - manifest merging across runs.
- `trace-arrival.mjs`: click-to-first-frame timing under cold, prefetched,
  prerendered, `switcher-warm`, warm and added-latency conditions, with
  Chrome traces.
- `smoke.mjs`: end-to-end runtime checks for every swap.
- `compare-strips.mjs`: before-and-after sheets.
- `harness/`: live probes and the founder screenshots.
- `lib/hold-still.mjs`: the pixel judge.
- `lib/portal-prompt.mjs`: the prompt key the capture tools use to hide it.

## Gotchas this session learned

- **A rebuild changes what the Worker serves.** Never build while another
  agent is filming or timing it.
- **The capture tools hide the first-load prompt** unless `--show-prompt` is
  passed.
- **Python edits on Windows turn LF files into CRLF.** Git warns; it is
  harmless.
- **Hold-still judges the inside of the bar's buttons.** A fractional
  snapshot offset fails on purpose; never widen `shift`.
