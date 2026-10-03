# Saved workflows for this repo: `bdl-task` and `bdl-wave` (design, 10-02-26)

Founder go 10-02-26 ("that bdl port sounds good"). Ported from Query Module 2
(`C:\git\queryModule`, `.claude/workflows/sdd-task.js`, `sdd-wave.js`, their
README, ADR-0006 and ADR-0007, the P0 review-roles retro), cut down to what
this repo needs and adapted to visual work. Runs before Stage 4 (pair A,
swiss and bauhaus) and carries pair A, pair C, the Stage 6 re-review and the
transitions phase.

## Why

- Stage 3 wrote a fresh workflow script for every round (about 20 so far, the
  B2 ones only inline, never committed). Each re-stated the same lessons, and
  a lesson left out of one prompt was a regression (verifiers at `medium`
  filmed nothing; a verifier not told to film 820 missed the lens jump).
- B2 ran five rounds with no cap.
- Agents have reported heads they did not make (a fabricated "completed"
  notification 09-23-26) and branched and committed against a read-only brief
  (09-22-26).
- queryModule solved these with saved, parameterized, harness-tested
  workflows. Its retro: the Opus critic is the highest-yield role; a separate
  spec reviewer rarely adds anything; whole-branch review catches a different
  class of problem.

## What ports, what does not

Ports: saved scripts with args; a `role()` function that sets model and effort
on every call and rejects Fable; heads read from git by a Haiku agent; the
no-remote rule in every shell prompt; a fix-round cap (2) that parks for a
ruling; an agent budget per run with a budget stop; stop points whose answers
reach exactly one agent so a resume replays from cache; ledger lines returned
for the controller to append; `bdl-wave` running tasks in order with carries
forward; a mock harness; a zero-agent stub for a real-runtime smoke; the
`.claude/agents/<model>-<effort>.md` definitions (the Agent tool has no effort
setting).

Does not port: TDD and coverage gates, requirement IDs and the spec reviewer,
the checker and ruler roles (the controller rules on parked items), the
sensitive-path CI tiers and review artifacts (`wave-review`), separate
manager and checker sessions.

## Files

| Path | Purpose |
|---|---|
| `.claude/workflows/bdl-task.js` | One task: implement, verify head, review (critic, verifier, gate) in parallel, fix up to 2 rounds, return |
| `.claude/workflows/bdl-wave.js` | A wave: each task as a nested `bdl-task` in order, carries forward, stops at the first task that does not complete |
| `.claude/workflows/smoke/bdl-task-stub.js` | Zero-agent stand-in for `bdl-task` to smoke `bdl-wave` in the real runtime |
| `.claude/workflows/README.md` | Reference: args, roles, flow, stop points and answers, return shape, controller procedure |
| `.claude/agents/<model>-<effort>.md` | Agent-tool definitions per model and effort (haiku, sonnet-low/medium/high, opus-low/medium/high) |
| `scripts/workflows/harness.mjs` | Mock harness: stubs `agent()` and `parallel()`, runs the scenarios below, exits 1 on a failure |
| `scripts/workflows/append-ledger.mjs` | Appends a result's `ledgerLines` to a ledger file, skipping lines already there |
| `.gitattributes` | `.claude/workflows/** text eol=lf`: `Workflow({ scriptPath })` rejects CRLF as control characters |

CLAUDE.md gains a short "Execution: saved workflows" section pointing at the
README, and the seat table's rows stay as they are.

## `bdl-task`

### Args

Required: `task`, `title`, `repoDir`, `branch`, `base` (full sha), `briefPath`,
`reportPath`, `workDir` (review files, sheets index), `scratchRoot`,
`runLabel`, `owns` (the files and globs this task may change), `ports` (the
ports this run's agents may serve on, from 4460 to 4480), `trailer`.

Optional: `school` (or `schools`), `sizes` (default `[1440, 1280, 1024, 820,
390]`), `schemes` (default `["dark", "light"]`), `films` (cases the verifier
must film, each `{ id, what, sizes?, schemes? }`; the brief's own list is
merged in), `baseline` (a snap label for before and after sheets, required
when `layout: true`), `layout` (the task changes layout or stacking: whole-page
before and after sheets at every size), `runtime` (the task touches WebGL, the
lens, the portal runtime or view transitions: the implementer and fixer run
at Opus `medium`), `foreignPaths` (untracked paths another session owns,
ignored by the clean-tree checks), `carries`, `roles`, `maxRounds` (default
2, clamped 1 to 4), `maxAgents` (default 14), `answers`, `implemented: { head }`
(review stages only).

### Roles and defaults

| Role | Default | With `runtime: true` |
|---|---|---|
| implementer (and `-continue`, `-retry`) | sonnet / medium | opus / medium |
| verifyHead | haiku (model only) | haiku |
| critic | opus / high | opus / high |
| verifier | sonnet / high | sonnet / high |
| gate | sonnet / low | sonnet / low |
| fixer (round 1) | same as implementer | same as implementer |
| escalatedFixer (round 2 on a finding NOT ADDRESSED in round 1) | one step up: sonnet / high, opus / medium, then opus / high | opus / high |
| reCritic (fix diff only) | opus / medium | opus / medium |

No default is `xhigh` or `max`; an override to either logs a warning line.
`role()` throws on a missing model or effort, a model outside haiku, sonnet,
opus (Fable rejected), or an effort on Haiku.

### Flow

1. **Implement.** Precondition: branch is `branch`, HEAD is `base`, no
   tracked changes and no untracked files outside `foreignPaths`. A failed
   precondition stops the run. The implementer reads the brief, changes only
   `owns`, runs `npm run verify` before each commit and never commits on red,
   writes `reportPath`, and returns `{ status, concerns, questions }`.
   BLOCKED or NEEDS_CONTEXT stops the run.
2. **verifyHead** (Haiku): `git rev-parse HEAD` and `git cat-file -e
   <sha>^{commit}` (printing `EXISTS <sha>`); the script accepts only 40 hex
   confirmed by the second command. Every head the script uses comes from
   here, never from an agent's report. HEAD still at `base` stops the run.
3. **Review**, in parallel on the verified head:
   - **critic** (read-only): the diff `base..head`, the brief, the school's
     dossier and brief sections the args name. It runs beside the verifier,
     so it does not wait for its sheets; it reads code and renders its own
     stills (on its assigned port) when it needs them. Returns findings `{ id,
     severity: blocker | important | minor | taste, file, line, summary, fix
     }`.
   - **verifier**: builds a snap (`scripts/themes/snap.mjs`, its own label
     and an assigned port), films every case in `films` at the named sizes
     and schemes with GPU Chromium, writes founder sheets and an `index.md`
     to `<workDir>/<runLabel>/sheets/`, and returns per case `{ id, result:
     pass | fail, evidence, sheet }`. A fail is an important finding. A case
     it could not film is a fail, never a skip.
   - **gate-0**: `npm run verify` once, then checks branch, HEAD equals the
     verified head, clean tree. Problems become important findings.
4. **Sort.** `taste` findings never enter the fix loop: they go to
   `tasteCalls` for the founder. `minor` findings go to `deferredMinors`.
   Blockers and important findings are open.
5. **Fix loop**, round r = 1..maxRounds while anything is open: fixer (commits
   only `owns`, `npm run verify` before each commit, may decline a finding
   with a reason), verifyHead, then in parallel the reCritic over the fix
   diff (ADDRESSED or NOT ADDRESSED per finding, plus new breakage), the
   verifier re-filming only the failed cases and any case the fix diff could
   move, and `gate-r<r>`. A round whose open findings all came from a gate
   skips the reCritic. A round with no new commits is a problem unless every
   finding was declined with a reason.
6. **Park** when findings are still open after round `maxRounds`, or a
   finding was declined: status `parked`, the controller rules.
7. **Return** `{ task, status: complete | parked | stopped, base, head,
   commits, rounds, findings, parked, tasteCalls, deferredMinors, sheets,
   agents, questions, stopped?, stopPoint?, problem?, ledgerLines }`.
   `complete` needs a clean review, a green gate and every film case passed.

### Rules carried in every prompt (constants, never re-typed per run)

- Never run `git push`, `gh pr` (any subcommand), `gh api` writes, `git
  merge`, `git checkout` of another branch, `git branch`, `git switch`, `git
  stash` or `git reset`; the controller and the founder own branches and the
  remote.
- Change only the files in `owns`. Read-only roles change nothing but their
  own review file and scratch path.
- Serve only on your assigned port. Before you return, stop every server you
  started and check `netstat` for 4460 to 4480 and 8787.
- Wait once: one Monitor or foreground chunks under 10 minutes; never
  re-issue a timed-out waiter.
- Film with GPU Chromium (`BDL_GPU=1`; `--use-angle=d3d11 --enable-gpu`) and
  confirm the renderer through `WEBGL_debug_renderer_info`. Never mix software
  and GPU frames in one delivery.
- Force `prefers-reduced-transparency: no-preference`; suppress the portal
  prompt; arrivals go through the real switcher.
- Films are timestamped strips; sheets are whole-page at every size named.
- After any new animation rule, check the BUILT CSS: lightningcss can fold
  `animation-timeline` into a shorthand Chromium rejects.
- Write docs with the Write and Edit tools, never shell heredocs or
  `Get-Content -Raw` round trips. No em dashes in anything a visitor reads.

### Stops and answers

Stop points: `precondition` (`stopPoint` names the agent), `implementer`,
`verifyHead`, `budget`. `answers: [{ at, text }]`, appended across re-runs,
never edited. Each entry's text reaches exactly one agent: `implementer` to
`implementer-continue` (finishes on top of existing commits), a precondition
to that agent's `-retry`, `budget` to no agent (the cap rises by the default
once per entry). Re-run with `resumeFromRunId` and the full args; earlier
calls replay from cache. A parked task has no stop point: the controller
rules, then a fresh run with `implemented: { head }` reviews the fixes.

### Budget

`maxAgents` counts every `agent()` call, cached replays included. The
parallel review block reserves its calls first. Clean task: 5 (implementer,
verifyHead, critic, verifier, gate-0). One fix round: 10. Worst case at
maxRounds 2: 15, so the default 14 stops the worst case at `budget` for a
look.

## `bdl-wave`

Args: `wave`, `repoDir`, `branch`, `base`, `workDir`, `scratchRoot`, `trailer`,
`ports`, `tasks: [{ task, title, briefPath, owns, ...per-task options }]`,
optional wave defaults for the per-task options, `answers` keyed by task,
`carried`. Runs each task as a nested `bdl-task`; on `complete` the next
task's base is the verified head (one Haiku verifyHead between tasks) and its
carries gain "Earlier in this wave": each earlier task's taste calls and
deferred minors by id (so a later critic does not re-raise them) and any
carry-forward line. Any other status stops the wave. Returns `{ wave, status,
stoppedTask?, stop?, base, head, tasks, totals, carried, tasteCalls,
ledgerLines }`.

## Harness scenarios

Happy path (5 agents); one fix round; park at the round cap; taste and minor
findings never reach a fixer; a fixer decline parks; budget stop and a
cache-stable budget answer; implementer stop, answer delivered once to
`implementer-continue`; a precondition stop and its retry; `verifyHead`
rejecting a non-hex or unconfirmed sha and an agent-reported head that
differs from git; `implemented: { head }` skips the implementer; `runtime:
true` roles; every call sets model and effort (none on Haiku); no prompt
contains `undefined`; every prompt that runs a shell carries the no-remote
rule; `bdl-wave` order, base flow, carries, a stop and resume, a parked task.

## Controller procedure (README)

- Before: branch checked out, clean tree, `base = git rev-parse HEAD`, brief
  written, role plan and agent count stated to the founder.
- Freeze a PR's scope before its review starts. Never write to the tree while
  a run is active.
- Inline, not a workflow, when the brief states the exact change, it is about
  150 lines or fewer, and no design question is open.
- After: append `ledgerLines`, look at the sheets yourself against the brief
  before any founder stop, relay `tasteCalls` at the next founder stop, check
  `git reflog` and `netstat`.
- The stage gates (`stage-gates.mjs`, about 75 minutes, machine alone) run
  once per pair at its end, not per task.
