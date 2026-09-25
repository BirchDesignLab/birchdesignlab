# Subagents and workflows: set model and effort on every dispatch

Every subagent dispatch (the Agent tool, Workflow `agent()` calls, the
implementer and reviewer seats in subagent-driven development) sets `model`
**and** `effort` on purpose. Never leave either unset: an unset agent inherits
the session's model at the session's effort, and an untiered fleet of those
has burned a month of usage in about ten minutes.

## The models

| Model | Relative cost | Effort levels | Capable of |
|---|---|---|---|
| Haiku 4.5 | 1x | None. The API rejects `effort` on Haiku; set `model` only and write `effort: n/a` in the plan so the choice reads as deliberate. | Fast, literal work: listing files, grep sweeps, pulling fields out of JSON or docs, summarizing one file, reformatting. **Not** for judging correctness, multi-file reasoning, or anything touching auth or secrets. 200K context. |
| Sonnet 5 | 2x | `low` `medium` `high` `xhigh` `max` | Strong coder. Implements from a precise spec, writes tests, runs routine finders, verifies or refutes a claim against the code. |
| Opus 5.5 | 4x | `low` `medium` `high` `xhigh` `max`. Always thinks; effort is its only cost control. | Hardest reasoning: auth, money-path and CI-gate code, design, synthesis across many reports, whole-branch review. |

Relative cost is per token (API list prices: Haiku $1/$5, Sonnet 5 $2/$10,
Opus 5.5 $4/$20 per million in/out). Effort multiplies on top of it: higher
effort means more thinking and more tool calls per task.

**Fable is never a subagent model.** It costs more than twice Opus.

## The effort levels (Sonnet 5 and Opus 5.5)

- `low`: little thinking, fewest and most consolidated tool calls, terse
  output. For work fully specified in the prompt that has one right answer.
- `medium`: normal thoroughness. For a routine task with a clear plan.
- `high`: thorough; weighs alternatives and edge cases. For work that needs
  judgment or unfamiliar code.
- `xhigh`: deep and long-running; Anthropic's recommended setting for long
  agentic coding, and Claude Code's own default. That is what an unset agent
  usually inherits, which is why "unset" is expensive.
- `max`: no ceiling on thinking. Only when correctness matters more than cost
  **and** `xhigh` measurably fell short. Never in a fleet.

## Every seat, from Opus down

| Model | Effort | Use it for |
|---|---|---|
| Opus 5.5 | `max` | Only when the developer asks, or `xhigh` fell short on a correctness-critical question. One agent, never a fleet. |
| Opus 5.5 | `xhigh` | Whole-branch review of an auth, money-path or CI-gate PR (Ticket Tailor, webhooks, secrets, forms). Deep debugging across the Worker, Sanity and Ticket Tailor. |
| Opus 5.5 | `high` | Hard finders, design and judge panels, whole-branch review of an ordinary PR. |
| Opus 5.5 | `medium` | Implementing an auth, money-path or CI-gate task from a plan. Synthesizing several agents' reports into one answer. |
| Opus 5.5 | `low` | A narrow judgment call that needs Opus-grade reasoning but no exploration ("is this CSP change safe, given these three lines"). |
| Sonnet 5 | `max` | Not used. Work that hard goes to Opus. |
| Sonnet 5 | `xhigh` | Rarely. A long unsupervised implementation that is not auth-adjacent. If it is hard, use Opus instead. |
| Sonnet 5 | `high` | Implementation that needs judgment across several files; finders in unfamiliar code; code-quality review of one task. |
| Sonnet 5 | `medium` | Implementing one plan task with its tests (TDD) in one to three files; routine finders over a bounded area; spec-compliance review of one task. |
| Sonnet 5 | `low` | Verify or refute one claim against named files; a fully specified mechanical edit (a rename, one function to a given spec); run the suite and report. |
| Haiku 4.5 | n/a | Enumeration and extraction: list, grep, pull fields, summarize one file. |

## Rules

- Start at the cheapest seat that can do the job. On a failure, step up one
  notch at a time (the next row up the table), never straight to `max`.
- Volume is fine; tiering is the mandate. Do not shrink a fleet to save cost,
  tier it.
- Before launching a workflow, state the per-stage model and effort plan and
  the agent count.



## Scripts stay in the repo, not in temp

Founder direction 2026-08-13, carried over from the Cheer & Chatter repo.

**No scratchpad, no temp directories.** Anything worth running is worth keeping:
one-off scripts, migrations, backfills, rasterisers, ops probes. They go in
`scripts/`, in a subfolder when there is a natural grouping
(`scripts/brand/`, `scripts/og/`, `scripts/migrations/`), and they get
committed.

The reason is insurance. If a run goes wrong, or the same job comes back in six
months, the script and the reasoning behind it still exist. A script that lived
in `%TEMP%` is gone the moment it would have been useful.

**Scope: scripts.** Genuinely disposable working files are fine in a scratch
directory. Commit-message drafts, diff dumps, notes to self. The rule is about
executable work that could ever be run twice, not about every byte written.

## Git workflow

Branch and open a PR for review. Do not commit directly to `main`. Merging to
`main` triggers a production deploy through Cloudflare Workers Builds.


Keep `main` in sync under normal circumstances: after a PR merges, pull `main`
and delete the merged branch locally and on the remote. Work genuinely in
flight is exempt.

Before opening a PR, run the gate:

```bash
npm run verify
```

That is `vitest run`, `astro check` and `npm run build` in one command, and it
must be clean. Run it as one command rather than three by hand — the three-part
version was easy to skip, and `astro check` in particular was silently
unrunnable for a while (it OOMed on a vendored three.js build that tsconfig now
excludes) without anyone noticing the gate had stopped existing.

## Dependencies: newest stable and secure

Founder direction 2026-08-04. The standing pattern is **newest stable, and no
sitting on known advisories**. Not bleeding edge, not frozen.

- **Stable, not latest.** Release candidates, betas, and `next` tags stay out.
  A major that shipped last week is fine; a major that shipped last week and
  broke three integrations is not. Check that the integrations this repo uses
  (`@astrojs/svelte`, `@astrojs/sitemap`) have compatible releases first.
- **Upgrade deliberately, never reflexively.** Never run `npm audit fix --force`
  casually; it happily jumps majors. Each major upgrade is its own PR with its
  own verification.
- **`npm audit` findings get triaged, not obeyed.** Check whether the advisory
  is actually reachable in this codebase before treating it as urgent. This is a
  static site that renders no untrusted data, so most advisories about XSS in
  templating are unreachable here. Record the reasoning; a red number that has
  been reasoned about is not the same as one that has been ignored.
- **Non-major fixes are free.** Plain `npm audit fix` can run any time.
- **Verification for a major:** `npx vitest run`, `npx astro check`, and
  `npm run build` all clean, plus a real browser pass. Tests catch structural
  breakage; they do not catch rendering and CSS drift.
- **Do not upgrade majors during a launch run-up** unless the advisory is
  genuinely reachable. Reversibility is the point: revert the commit, redeploy.

Current queue and the reasoning behind it live in `docs/lab-backlog.md`.

## AR card

WebAR business card system: read `docs/ar-card/HANDOFF.md` first; work items live in `docs/lab-backlog.md` under "AR card".
