# Saved workflows: `bdl-task` and `bdl-wave`

Saved, parameterized, harness-tested Workflow scripts for this repo's visual and sensitive work. Ported from Query Module 2 (`sdd-task`, `sdd-wave`) and cut down: no TDD or coverage gates, no requirement ids, no checker or ruler (the controller rules on what parks). Design and reasoning: `docs/superpowers/specs/2026-10-02-bdl-workflows-design.md`.

| File | Purpose |
|---|---|
| `bdl-task.js` | One task: implement, verify the head from git, review (critic, film verifier, gate) in parallel, fix up to `maxRounds`, return |
| `bdl-wave.js` | A wave: each task as a nested `bdl-task` in order, carries forward, stops at the first task that does not complete |
| `smoke/bdl-task-stub.js` | Stand-in for `bdl-task` that runs no agents (`bdlTaskPath`) to smoke `bdl-wave` in the real runtime; the wave's own Haiku `verifyHead` reads still run |
| `../agents/<model>-<effort>.md` | Agent-tool definitions (`haiku`, `sonnet-low/medium/high`, `opus-low/medium/high`); the Agent tool has no effort setting |
| `../../scripts/workflows/harness.mjs` | Mock harness: stubs `agent()` and `parallel()`, runs every scenario, exits 1 on a failure |
| `../../scripts/workflows/mutants.mjs` | Breaks the scripts one rule at a time and proves the harness fails each time |
| `../../scripts/workflows/verify-locked.mjs` | Runs `npm run verify` while holding the render lock; what the gate runs |
| `../../scripts/workflows/append-ledger.mjs` | Appends a result's `ledgerLines` to a ledger file, skipping lines already there |

## Script facts

- Plain JavaScript. Each file starts with `export const meta = {...}` as a pure literal and ends the literal with a closing brace on its own line. The body uses top-level `await` and a top-level `return`, so a raw `node --check` fails; the harness wraps each body in an async function to import it.
- `.gitattributes` pins `.claude/workflows/**` to LF (`core.autocrlf=true` here): `Workflow({ scriptPath })` rejects CRLF as control characters.
- `Date.now()`, `Math.random()` and an argless `new Date()` throw. No filesystem or Node API: agents do all IO.
- Every `agent()` call goes through `role(name)`: it merges `args.roles[name]` over the defaults, returns `{ model, effort }`, drops effort for Haiku, and throws on a missing model, a model outside `haiku|sonnet|opus` (Fable is rejected) or a missing or invalid effort. A default is never `xhigh` or `max`; an override to either logs a warning line.
- Every agent is fresh. A resume replays completed calls from cache and re-runs from the first changed prompt.
- Every shell-running prompt carries the no-remote rule, and the full rules list (owns, ports, wait once, GPU film, reduced transparency, strips and sheets, built CSS, Write and Edit) except `verifyHead`, which carries the git rules. Read-only roles carry the read-only rule.

## `bdl-task`

```
Workflow({ scriptPath: ".claude/workflows/bdl-task.js", args: {
  task: 12, title: "Glass arrival polish", repoDir: "C:\\git\\birchdesignlab",
  branch: "feat/glass-polish", base: "<full sha: git rev-parse HEAD>",
  briefPath, reportPath, workDir,        // workDir: review files and sheets
  scratchRoot, runLabel: "b3-t12",       // scratch: <scratchRoot>/<runLabel>/<agent>/
  owns: ["src/pages/t/glass/**"],        // the only files this task may change
  ports: [4470, 4471, 4472],             // dev, critic, verifier; 4460 to 4480
  trailer: "Co-Authored-By: ...",        // fallback commit trailer
  // optional
  school: "glass", schools: [...],
  sizes: [1440, 1280, 1024, 820, 390], schemes: ["dark", "light"],
  films: [{ id, what, sizes?, schemes? }], baseline: "<snap label>", layout: false,
  runtime: false, foreignPaths: ["docs/briefs/"], carries: "...",
  roles: { critic: { model: "opus", effort: "high" } },
  maxRounds: 2, maxAgents: 14, answers: [{ at, text }], implemented: { head }
} })
```

Required: `task`, `title`, `repoDir`, `branch`, `base` (full 40-hex sha), `briefPath`, `reportPath`, `workDir`, `scratchRoot`, `runLabel` (lowercase letters, digits, dashes, at most 29: it names the snap builds), `owns`, `ports` (three or more distinct, 4460 to 4480), `trailer`. A missing one throws before any agent runs.

Keep `reportPath`, `workDir` and `scratchRoot` out of the clean-tree checks: put them outside the repo, under a gitignored path (`scripts/themes/.out/` is gitignored), or list them in `foreignPaths`. A report or review file that shows up as untracked and sits outside `owns` makes gate-0 report a dirty tree that no fixer may clear, and the task parks.

Optional:

- `school` or `schools`: named in the critic's prompt; each school's dossier and the brief sections the brief names are read.
- `sizes` (default 1440, 1280, 1024, 820, 390) and `schemes` (default dark, light): what the verifier films.
- `films`: cases the verifier must film, each `{ id, what, sizes?, schemes? }`. The brief's own film list is merged in by the verifier. A case that is not filmed is a fail, never a skip.
- `layout`: the task changes layout or stacking; the verifier writes whole-page before and after sheets at every size. Needs `baseline`, the snap label of the before build (throws without it).
- `runtime`: the task touches WebGL, the lens, the portal runtime or view transitions; the implementer and fixer run at Opus `medium`.
- `foreignPaths`: untracked paths another session owns; the preconditions and the gate ignore them.
- `carries`: text binding on the implementer, fixer, critic and verifier (rulings, interfaces, what earlier tasks called for the founder).
- `roles`: overrides per role (below). An unknown role name throws.
- `maxRounds` (default 2, clamped to 1..4, strings and floats coerced and logged), `maxAgents` (default 14).
- `answers`, `implemented`: see Stops and answers.

### Roles and defaults

| Role | Default | With `runtime: true` |
|---|---|---|
| implementer (also `implementer-continue`, `implementer-retry`) | sonnet / medium | opus / medium |
| verifyHead | haiku (model only) | haiku |
| critic | opus / high | opus / high |
| verifier | sonnet / high | sonnet / high |
| gate | sonnet / low | sonnet / low |
| fixer (round 1) | same as implementer | same as implementer |
| escalatedFixer (a finding survived a round) | one step up: sonnet / high, opus / medium, then opus / high | opus / high |
| reCritic (fix diff only) | opus / medium | opus / medium |

### Flow

1. **Implement.** Precondition: branch is `branch`, HEAD is `base`, no tracked changes, no untracked files outside `foreignPaths`. The implementer reads the brief, changes only `owns`, runs `npm run verify` before each commit and never commits on red, and returns `{ status, concerns, questions, report }`. Reports travel in the structured output: workflow subagents can be refused when they write report files (seen on the port's own build, 10-02-26), so the script carries the implementer's and fixers' `report` text into the critic and fixer prompts and returns it as `report`; saving to `reportPath`, and the critics' review files and the verifier's `index.md`, are best effort. A failed precondition, BLOCKED or NEEDS_CONTEXT stops the run.
2. **verifyHead** (Haiku): `git rev-parse HEAD`, `git cat-file -e <sha>^{commit}` (printing `EXISTS <sha>`) and `git log --oneline <since>..HEAD`. The script accepts only 40 hex that the second command confirmed. Every head the script uses (the review head, the gate head, the returned `head`, the commits list) comes from here, never from an agent's report. HEAD still at `base` stops the run.
3. **Review**, in parallel on the verified head:
   - **critic** (read-only): the diff `base..head` against the brief and the school's dossier. It does not wait for the verifier's sheets; it reads code and renders its own stills on its port. Findings `{ id, severity: blocker | important | minor | taste, file, line, summary, fix }`, ids prefixed `critic:`.
   - **verifier**: builds a snap (`scripts/themes/snap.mjs`, its own label and port), films every case at the sizes and schemes with GPU Chromium, writes founder sheets and an `index.md` to `<workDir>/<runLabel>/sheets/<r0, r1, ...>/`, and returns per case `{ id, result: pass | fail, evidence, sheet }` plus the WebGL `renderer` string. A fail is an important finding (`film:<id>`); so is a case it did not report, and so are films on a software renderer (`film:renderer`).
   - **gate-0**: `node scripts/workflows/verify-locked.mjs` once (it takes the render lock from `scripts/themes/lib/render-lock.mjs`, then runs `npm run verify`; a bare `npm run verify` would clean and rebuild `dist/` beside the verifier's and critic's snap builds, which hold that lock), then branch, HEAD equals the verified head, clean tree. Problems become important findings with stable ids `gate:<k>` (no round tag), so a gate that is still red after a fix is the same finding: it counts as surviving and brings in the `escalatedFixer`.
4. **Sort.** `taste` findings never enter the fix loop: they go to `tasteCalls` for the founder. `minor` findings go to `deferredMinors`. Blockers and important findings are open.
5. **Fix loop**, round r = 1..`maxRounds` while anything is open: the fixer (commits only `owns`, `npm run verify` before each commit, may decline a finding with a reason), verifyHead, then in parallel the `reCritic` over the fix diff (ADDRESSED or NOT ADDRESSED per finding, plus new breakage), the verifier re-filming the failed cases and any case the fix diff could move, and `gate-r<r>`. A round whose open findings all came from a gate skips the `reCritic`. A finding that survives a round brings in the `escalatedFixer`. A round with no new commit is not reviewed: the findings stay open with a `progress-r<r>` finding (unless every finding was declined, which parks).
6. **Park** when findings are still open after round `maxRounds`, a finding was declined, or a fixer was blocked: status `parked`, the controller rules.
7. **Return.** `complete` needs a clean review, a green last gate and every film case passed.

### Return

```
{ task, status: "complete" | "parked" | "stopped", base, head, commits, rounds,
  findings: [{ id, severity, file, line, summary, state: open | fixed | declined | deferred | taste }],
  parked: [{ ...finding, reason }], tasteCalls, deferredMinors,
  sheets: [{ at, index, cases }], agents, questions, concerns, report, answersUnconsumed?,
  stopped?, stopPoint?, problem?, ledgerLines }
```

- `complete`: read `tasteCalls` at the next founder stop; carry them forward.
- `parked`: the controller rules on each `parked` entry (fix inline, accept, or a founder call), then a fresh run with `implemented: { head }` reviews the fixes.
- `stopped`: a controller decision is needed (below).

### Stops and answers

| `stopped` | `stopPoint` | Meaning | Consumer of `answers` |
|---|---|---|---|
| `implementer` | `implementer` | the implementer was BLOCKED or NEEDS_CONTEXT | every unused `implementer` entry, all in one `implementer-continue`, which finishes on top of the existing commits |
| `implementer` | `implementer` | the implementer or a retry returned nothing (`problem` says so) | none: no answer applies; re-run the task (a resume replays what finished) |
| `precondition` | `precondition:implementer` | branch, HEAD or tree was not as stated; `problem` names the files | the next `precondition:implementer` or plain `precondition` entry: the implementer re-run as `implementer-retry` |
| `precondition` | `precondition:verifyHead` | git did not confirm a 40-hex sha | the next `precondition:verifyHead` or plain `precondition` entry: verifyHead re-run as `verify-head-<x>-retry` |
| `precondition` | `precondition:verifyHead` | `implemented.head` is not git HEAD (`problem` names both) | none: no answer applies; check out the named head or pass git's, then re-run |
| `verifyHead` | `verifyHead` | git HEAD is still the base: the implementer made no commit | none: start a fresh run |
| `review` | `review` | the critic, verifier or gate-0 returned nothing, so there is no clean verdict | none: re-run the review stages with `implemented: { head }` |
| `budget` | `budget` | the next call would pass `maxAgents` | none: each entry raises the cap by 14, once |

`answers: [{ at, text }]` is appended across re-runs and never edited. `at` is one of `implementer`, `precondition:implementer`, `precondition:verifyHead`, `precondition` (any precondition failure) or `budget`; an unknown value throws. Each entry's text reaches exactly one agent (a budget entry reaches none; the `implementer` entries all reach the one `implementer-continue`), so earlier calls replay from cache.

A precondition entry buys one more attempt for the next failing call, in the order the calls run, never more: with two stops answered by two plain `precondition` entries, the first goes to the first failing call and the second to the next, and the first call's retry replays unchanged. A retry that fails again takes the next entry as another attempt (`implementer-retry2`, `verify-head-<x>-retry2`, ...), carrying the earlier answers; with no entry left, it stops. Prefer the typed `at` when you know which stop you are answering. Re-run with `resumeFromRunId` and the full args:

```
Workflow({ scriptPath: ".claude/workflows/bdl-task.js", resumeFromRunId: "<runId>", args: <same args + answers> })
```

A resume without `args` throws at the first required-arg check. Never answer by editing `carries`: that re-runs the implementation. Answers no agent consumed are logged and returned as `answersUnconsumed: true`. With `implemented`, answers for the implementer throw.

`implemented: { head: "<full sha>" }` skips the implementer and reviews `base..head` (review stages only): use it after a parked task, after a `review` stop, or when the implementer's commits already exist. The head must equal git HEAD.

### Budget and agent counts

`maxAgents` counts every `agent()` call, cached replays included. The parallel review block reserves its calls first, so a budget stop never splits it. At the default maxRounds 2:

| | Agents |
|---|---|
| Clean task (implementer, verifyHead, critic, verifier, gate-0) | 5 |
| One fix round (fixer, verifyHead, reCritic, verifier, gate-r1) | 10 |
| Worst case (two full rounds) | 15 |

The default 14 stops the worst case at `budget` for a look. A round that skips the `reCritic` costs 4, a round with no commit costs 2. Pass `maxAgents: 15` to let a task run to the park.

### Ledger lines

```
- Task <N>: fix round <r>/<max> (<k> addressed, <m> open; head <h7>)
- Task <N>: taste call: <id> <file:line> <summary>
- Task <N>: minor (deferred): <id> <file:line> <summary>
- Task <N>: parked: <id> <summary> (<reason>)
- Task <N>: complete (commits <base7>..<head7>, review clean, gate green, films pass; <n> agents)
- Task <N>: parked (commits ..., <k> parked; <n> agents); controller rules
- Task <N>: stopped at <stage> (head <h7>); controller action needed
```

## `bdl-wave`

Runs each task as a nested `bdl-task` (`workflow({ scriptPath })`, one level of nesting). Its only agent is the between-task `verifyHead` (`verify-head-t<n>`, Haiku). It writes nothing to git or GitHub.

```
{ wave: "b3", repoDir, branch, base: "<full sha>", workDir, scratchRoot, trailer, ports: [4470, 4471, 4472],
  tasks: [{ task, title, briefPath, owns, ...per-task options }, ...],
  school?, schools?, sizes?, schemes?, baseline?, layout?, runtime?, foreignPaths?, carries?, roles?,
  maxRounds?, maxAgents?,              // wave defaults; a task's own value wins; roles merge per role, carries merge
  answers?: { "2": [{ at, text }] },   // keyed by task
  carried?: ["- Task 1 ..."],          // a follow-on run: the carried of the run before
  bdlTaskPath?: ".claude/workflows/bdl-task.js" }
```

Required: `wave` (lowercase, digits, dashes), `repoDir`, `branch`, `base`, `workDir`, `scratchRoot`, `trailer`, `ports`, and a non-empty `tasks` list whose entries each have `task`, `title`, `briefPath` and `owns`. Task numbers are unique. A task entry never carries `base` or `answers`. Defaults per task: `reportPath` is `<workDir>/task-<n>-report.md`, `runLabel` is `<wave>-t<n>`. Options a task does not set are not passed. Every task's run label (default or its own `runLabel`) is checked before any task runs: lowercase letters, digits and dashes, at most 29 characters, unique. A task id like `A1` or `4.1` fails with a message; use `a1`, `4`, or set that task's `runLabel`. The same `reportPath` / `workDir` placement rule as `bdl-task` applies.

On `complete`, the next task's `base` is the verified head (one Haiku `verifyHead` read between tasks, never a head the child reported) and its `carries` gain an "Earlier in this wave" block: each earlier task's taste calls and deferred minors by id (`<task>/<id>`, so a later critic does not re-raise them) and any `carried` line. Any other status stops the wave; later tasks never start.

Returns `{ wave, status: "complete" | "stopped" | "parked", stoppedTask?, stop?, base, head, tasks, totals, carried, tasteCalls, ledgerLines }`. `totals.agents` sums the tasks' agents plus the verify reads. To answer a stop, keep every arg and add `answers["<task>"]`; earlier tasks replay from cache. A `parked` task, or a child that threw, has no stop point: rule on it, then run the remaining tasks as a new `bdl-wave` with `base` at the current HEAD and `carried` set to the returned `carried`.

Smoke the nesting in the real runtime with no `bdl-task` agents (the N-1 between-task Haiku `verifyHead` reads still run): add `bdlTaskPath: ".claude/workflows/smoke/bdl-task-stub.js"`. A title containing "park" parks. The `bdl-task-stub` commits nothing, so the wave logs that its head differs from git and uses git's.

## Controller procedure

Before:

1. Branch checked out, clean tree (apart from `foreignPaths`), `base = git rev-parse HEAD` (full sha), brief written, `owns` and `ports` chosen.
2. State the per-stage model and effort plan and the agent count to the founder before launching.
3. Freeze a PR's scope before its review starts. Never write to the working tree while a run is active.
4. Inline, not a workflow, when the brief states the exact change, it is about 150 lines or fewer, and no design question is open.

After:

1. Append the ledger lines: `node scripts/workflows/append-ledger.mjs <workflow-output-file> <ledgerPath>`. It accepts a bare result or any text that contains the result JSON, appends `ledgerLines`, and skips lines already there (exit 2 usage or unreadable file, exit 3 no `ledgerLines`).
2. Look at the sheets yourself against the brief before any founder stop. Do not trust a verifier's pass for a visual brief item.
3. Relay `tasteCalls` at the next founder stop.
4. Check `git reflog` and `netstat` (4460 to 4480 and 8787) for anything an agent left behind.
5. The stage gates (`stage-gates.mjs`, about 75 minutes, machine alone) run once per pair at its end, not per task.

## Harness

`node scripts/workflows/harness.mjs` (repo root). It imports each script from a data URL with the body wrapped in an async function, stubs `agent()`, `parallel()`, `phase()`, `log()` and `workflow()`, plays git with a fixture and plays the runtime cache with a Map. The stub checks every call: model set, effort set unless Haiku, none on Haiku, no `xhigh` or `max`, no `undefined` in a prompt, the no-remote rule everywhere, the full rules list in every prompt but the git read, the read-only rule in every read-only role, every mock return valid against its schema. Scenarios cover the happy path, a fix round, the round cap, taste and minor routing, declines, budget stops and cache-stable answers, the implementer and precondition stops and their retries (including three-run resumes with several answers), a gate that stays red, the render-lock wrapper, `verifyHead` rejections, `implemented`, `runtime` roles, role validation, argument validation, every wave behaviour, `append-ledger.mjs`, LF-only files, the agent definitions and this README's coverage of the args and stop points.

`node scripts/workflows/mutants.mjs` copies the scripts, breaks one rule at a time (drops the no-remote rule, trusts an agent head, stops clamping, and so on) and checks that the harness fails the scenario that guards it. Run both after any change to a workflow.

`npm run verify` does not touch these files: vitest only includes `tests/**`, `astro check` only `src`, `tests` and `worker`.
