export const meta = {
  name: 'bdl-task-stub',
  description: 'Zero-agent stand-in for bdl-task: returns a canned result so bdl-wave nesting can be smoke-tested in the real runtime',
  phases: [],
}

/*
 * Smoke test for bdl-wave in the real Workflow runtime, with no bdl-task agents and no repo changes
 * (the wave's own Haiku verifyHead read between tasks still runs, N-1 reads for N tasks):
 *   Workflow({ scriptPath: ".claude/workflows/bdl-wave.js", args: { ...any valid wave args,
 *     bdlTaskPath: ".claude/workflows/smoke/bdl-task-stub.js" } })
 * Expect status "complete" if no title has "park" in it; the wave stops at the first one that does.
 * The stub commits nothing, so its head ("<base>-t<task>", not a real sha) differs from git: the
 * wave logs "agent-reported head ... differs from git; using git" and every later task's base is
 * the repo's real HEAD (proof that the wave never trusts a child's head). Each task's echoCarries
 * shows the "Earlier in this wave" block built from the stub's taste call and deferred minor.
 */
const A = args || {}
const park = String(A.title || '').includes('park')
log(`bdl-task-stub: task ${A.task} from ${A.base}${park ? ' (parks)' : ''}`)
return {
  task: A.task,
  status: park ? 'parked' : 'complete',
  base: A.base,
  head: `${A.base}-t${A.task}`,
  commits: [],
  rounds: 0,
  findings: [],
  parked: park ? [{ id: 'critic:C3', summary: 'stub parked finding', reason: 'still open after round 2' }] : [],
  tasteCalls: [{ id: 'critic:C1', severity: 'taste', file: 'a.css', line: '1', summary: `stub taste call from ${A.task}` }],
  deferredMinors: [{ id: 'critic:C2', severity: 'minor', file: 'a.css', line: '2', summary: `stub minor from ${A.task}` }],
  sheets: [],
  agents: 0,
  questions: [],
  concerns: [],
  echoCarries: A.carries || '',
  ledgerLines: [`- Task ${A.task}: ${park ? 'parked' : 'complete'} (bdl-task-stub)`],
}
