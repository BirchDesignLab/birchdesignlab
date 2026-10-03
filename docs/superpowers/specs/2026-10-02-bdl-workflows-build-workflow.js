export const meta = {
  name: 'bdl-workflows-port',
  description: 'Build the bdl-task and bdl-wave saved workflows from the 10-02-26 design, review them, fix once if needed',
  phases: [
    { title: 'Implement', detail: 'Sonnet 5 high builds the port' },
    { title: 'Review', detail: 'Opus 5.5 high whole-branch review' },
    { title: 'Fix', detail: 'Sonnet 5 high, one round, only on blockers or important findings' },
  ],
}

const REPO = 'C:/git/birchdesignlab'
const QM = 'C:/git/queryModule'
const DESIGN = 'docs/superpowers/specs/2026-10-02-bdl-workflows-design.md'
const BASE = '6ae504d'
const SCRATCH = 'C:/git/birchdesignlab/scripts/themes/.out/bdl-workflows-port'

const RULES = `Repository rules for this job:
- Work in ${REPO} on the branch chore/bdl-workflows, which is already checked out (the controller created it and committed the design at ${BASE}). Done already: the scout of queryModule, the design document, the branch, the design commit. Do not redo them.
- Never run git push, gh pr (any subcommand), gh api writes, git merge, git checkout, git switch, git branch, git stash or git reset. The controller and the founder own branches and the remote. Do not open a PR.
- The untracked folder docs/briefs/ belongs to another session: never touch, add or commit it.
- ${QM} is reference only: read it, never write to it or run git commands that change it.
- Write files with the Write and Edit tools, never shell heredocs or PowerShell Get-Content -Raw round trips. Never put backslash-u, backslash-n, backslash-r or backslash-t escape sequences inside Edit/Write strings expecting them to stay literal: they can decode to real control bytes. Use plain characters, or String.fromCharCode in code.
- Wait for long commands once (foreground, under 10 minutes per call); never re-issue a timed-out waiter.
- Scratch files go only in ${SCRATCH}/<your label>/.`

const OWNS = `Files you may create or change (nothing else):
- .claude/workflows/bdl-task.js, .claude/workflows/bdl-wave.js, .claude/workflows/smoke/bdl-task-stub.js, .claude/workflows/README.md
- .claude/agents/haiku.md, sonnet-low.md, sonnet-medium.md, sonnet-high.md, opus-low.md, opus-medium.md, opus-high.md
- scripts/workflows/harness.mjs, scripts/workflows/append-ledger.mjs (and small helper modules under scripts/workflows/ if needed)
- .gitattributes (create it with the eol=lf rule for .claude/workflows/**; the repo has core.autocrlf=true)
- CLAUDE.md: add one short section "Execution: saved workflows" pointing at .claude/workflows/README.md; change nothing else in it.`

phase('Implement')
const impl = await agent(`You are the implementer for a tooling port in the Birch Design Lab repo.

${RULES}

Read the design first and treat it as the spec: ${REPO}/${DESIGN}. It ports Query Module 2's saved workflows, cut down and adapted to this repo's visual work. Reference implementation (read, adapt, cut; do not copy wholesale): ${QM}/.claude/workflows/sdd-task.js, sdd-wave.js, smoke/sdd-task-stub.js, README.md; ${QM}/scripts/sdd/workflow-harness.mjs (4,000 lines: take its approach of importing each workflow body wrapped in an async function from a data URL with stubbed agent() and parallel(), not its size), ${QM}/scripts/sdd/append-ledger.mjs; ${QM}/.claude/agents/*.md (rewrite the repo-specific text for Birch Design Lab, C:\\git\\birchdesignlab; no opus-xhigh file).

Script facts that bind (from the Workflow runtime): plain JavaScript, no TypeScript; each file starts with export const meta = {...} as a pure literal; the body may use top-level await and a top-level return; Date.now(), Math.random() and an argless new Date() throw; there is no filesystem or Node API inside a workflow (agents do all IO); agent(prompt, { label, phase, schema, model, effort }) returns the schema object or null; parallel(thunks) never rejects (a throw becomes null); workflow({ scriptPath }, args) nests one level only. Model values are 'haiku', 'sonnet', 'opus'. Effort is never passed for haiku.

${OWNS}

Requirements beyond the design:
- Every agent() call in both scripts goes through role(name) and sets model and effort (model only for haiku). Fable is rejected.
- The rules list in the design's "Rules carried in every prompt" section becomes constants included in every prompt that runs a shell; the read-only rule in every read-only role's prompt.
- Keep bdl-task.js readable and as small as the design allows (the reference is 1,600 lines; this one should be well under half).
- The harness covers every scenario in the design's "Harness scenarios" list and exits 1 on any failure. Write the scenarios before or alongside the scripts and make sure each one can fail (break the script briefly or reason it through, and say how you checked).
- After adding .gitattributes, make sure the committed and working-tree copies of .claude/workflows/*.js contain no carriage returns (git ls-files --eol .claude/workflows, and grep for a CR byte).
- Run node scripts/workflows/harness.mjs and npm run verify (vitest, astro check, build in one command). Both must be clean before you commit. If verify trips on the new files (for example astro check or vitest picking up .claude or scripts/workflows), fix it in the files you own or report it; do not change tsconfig, vitest or astro config.
- Commit in a few logical commits on chore/bdl-workflows, plain English subjects, each message ending with the trailer your session's system reminder gives (if none: Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>).

Write a short report to ${SCRATCH}/implement/report.md: files, line counts, harness scenario list with results, verify result, anything in the design you changed or could not do and why.`, {
  label: 'implement', phase: 'Implement', model: 'sonnet', effort: 'high',
  schema: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['DONE', 'DONE_WITH_CONCERNS', 'BLOCKED'] },
      commits: { type: 'array', items: { type: 'string' } },
      harness: { type: 'string', description: 'harness summary line: scenarios passed/total' },
      verify: { type: 'string', description: 'npm run verify result: tests, astro check, build' },
      deviations: { type: 'array', items: { type: 'string' } },
      concerns: { type: 'array', items: { type: 'string' } },
    },
    required: ['status', 'commits', 'harness', 'verify', 'deviations', 'concerns'],
  },
})
if (!impl || impl.status === 'BLOCKED') return { stage: 'implement', impl }

phase('Review')
const FINDINGS = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['pass', 'fixes'] },
    harnessRun: { type: 'string', description: 'the harness summary line you saw when you ran it' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          severity: { type: 'string', enum: ['blocker', 'important', 'minor'] },
          file: { type: 'string' },
          line: { type: 'number' },
          summary: { type: 'string' },
          fix: { type: 'string' },
        },
        required: ['id', 'severity', 'file', 'summary', 'fix'],
      },
    },
  },
  required: ['verdict', 'harnessRun', 'findings'],
}
const review = await agent(`You are the reviewer of a whole branch in the Birch Design Lab repo: a port of Query Module 2's saved workflows (sdd-task, sdd-wave) into bdl-task and bdl-wave, adapted to visual work.

${RULES}
Your review is read-only: do not change the working tree, the index, HEAD or any branch. You may run node scripts/workflows/harness.mjs (it changes nothing). Write only your review file ${SCRATCH}/review/review.md and scratch in that folder.

Review git diff ${BASE}..HEAD in ${REPO} against the spec ${REPO}/${DESIGN}. The implementer's report is ${SCRATCH}/implement/report.md; its listed deviations: ${JSON.stringify(impl.deviations)}; concerns: ${JSON.stringify(impl.concerns)}. The reference implementation is ${QM}/.claude/workflows/ (sdd-task.js, sdd-wave.js, README.md); compare where the port's control flow departs from it and judge whether the departure is a bug.

Focus, in order:
1. Control flow that would misbehave in a real run: stop points and answers (each answer reaches exactly one consumer; a resume with appended answers replays earlier calls from cache, so no earlier prompt may change), the budget (counts every call, the parallel block reserves first, the stop is clean), verifyHead (accepts only 40 hex confirmed by cat-file for the same sha; heads never taken from agent reports), the fix loop (terminates; parks at the cap; taste and minor never reach a fixer; a no-commit round is caught), bdl-wave (order, base from git, carries, stop on non-complete, nested workflow call shape).
2. Model and effort: every agent() call sets both (model only for haiku); role() rejects Fable and bad values; runtime: true roles.
3. Prompts: every shell-running prompt carries the no-remote and ownership rules and the design's filming rules where they apply; nothing prompts an agent toward undefined text.
4. Runtime constraints: no Date.now, Math.random, argless new Date, Node or fs APIs in the workflow scripts; meta is a pure literal; no carriage returns in .claude/workflows/*.js.
5. The harness: does each scenario assert something that could fail, or are some tests that cannot fail? Run it and report the summary line.
6. README accuracy against the scripts.

Severity: blocker = a real run would do the wrong thing or crash; important = a likely misbehaviour or a missing design requirement; minor = everything else. Do not report style preferences.`, {
  label: 'review', phase: 'Review', model: 'opus', effort: 'high', schema: FINDINGS,
})
if (!review) return { stage: 'review', impl, review: null }

const open = review.findings.filter((f) => f.severity !== 'minor')
if (!open.length) {
  log('Review clean of blockers and important findings; no fix round.')
  return { stage: 'done', impl, review, fix: null }
}

phase('Fix')
const fix = await agent(`You are the fixer for the bdl-task / bdl-wave port in the Birch Design Lab repo. The implementation and a review are done; fix the review's blocker and important findings.

${RULES}

${OWNS}

Spec: ${REPO}/${DESIGN}. Full review: ${SCRATCH}/review/review.md. Findings to fix:
${open.map((f) => `- [${f.id}] ${f.severity.toUpperCase()} ${f.file}${f.line ? ':' + f.line : ''}: ${f.summary} Fix: ${f.fix}`).join('\n')}

Minors (fix only when small and safe):
${review.findings.filter((f) => f.severity === 'minor').map((f) => `- [${f.id}] ${f.file}: ${f.summary}`).join('\n') || '- none'}

You may decline a finding only with a concrete reason (what you checked). Add or adjust a harness scenario for each fixed blocker or important finding so it would fail without the fix. Run node scripts/workflows/harness.mjs and npm run verify; both clean before you commit. Commit with plain English subjects and the trailer your session's system reminder gives (if none: Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>). Write ${SCRATCH}/fix/report.md.`, {
  label: 'fix', phase: 'Fix', model: 'sonnet', effort: 'high',
  schema: {
    type: 'object',
    properties: {
      fixed: { type: 'array', items: { type: 'string' } },
      declined: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, reason: { type: 'string' } }, required: ['id', 'reason'] } },
      commits: { type: 'array', items: { type: 'string' } },
      harness: { type: 'string' },
      verify: { type: 'string' },
    },
    required: ['fixed', 'declined', 'commits', 'harness', 'verify'],
  },
})
return { stage: 'done', impl, review, fix }
