export const meta = {
  name: 'bdl-wave',
  description: 'Run the tasks of one wave through bdl-task in order, carrying taste calls and deferred minors forward',
  whenToUse: 'Several brief-sized tasks on one feature branch, back to back; stops at the first task that does not complete',
  phases: [{ title: 'Wave', detail: 'one nested bdl-task run per task, in order, with a verifyHead read between tasks' }],
}

/*
 * bdl-wave: the tasks of one wave in order, each a nested bdl-task run (one level of nesting).
 * Reference: .claude/workflows/README.md. After any edit run: node scripts/workflows/harness.mjs
 *
 * Required args: wave (lowercase, digits, dashes), repoDir, branch, base (full sha), workDir,
 * scratchRoot, trailer, ports, tasks [{ task, title, briefPath, owns, ...per-task bdl-task options }].
 * Wave-level defaults (a task's own value wins; roles merge per role; carries merge): school, schools,
 * sizes, schemes, baseline, layout, runtime, foreignPaths, carries, roles, maxRounds, maxAgents.
 * Optional: answers { "<task>": [...] },
 * carried [lines of an earlier run], bdlTaskPath (default .claude/workflows/bdl-task.js).
 * The wave's only agent is verifyHead (Haiku) between two tasks; it writes nothing to git or GitHub.
 */

// ---------- arguments ----------
const A = args || {}
const NL = String.fromCharCode(10)
const blank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '')
const fail = (m) => { throw new Error(`bdl-wave: ${m}`) }
for (const k of ['wave', 'repoDir', 'branch', 'base', 'workDir', 'scratchRoot', 'trailer']) {
  if (blank(A[k])) fail(`required arg "${k}" is missing or empty (see .claude/workflows/README.md)`)
}
const SHA40 = /^[0-9a-f]{40}$/
if (!SHA40.test(String(A.base))) fail('base must be a full 40-hex sha')
if (!/^[a-z0-9][a-z0-9-]{0,20}$/.test(String(A.wave))) fail('wave must be lowercase letters, digits and dashes, at most 21 characters')
if (!Array.isArray(A.ports) || !A.ports.length) fail('ports is required (the ports the nested runs may serve on)')
if (!Array.isArray(A.tasks) || !A.tasks.length) fail('tasks must be a non-empty list of task entries')
const seen = new Set()
const labels = new Set()
const RUN_LABEL = /^[a-z0-9][a-z0-9-]{0,28}$/ // the same rule bdl-task applies to runLabel
A.tasks.forEach((t, i) => {
  if (!t || typeof t !== 'object') fail(`tasks[${i}] is not an object`)
  for (const k of ['task', 'title', 'briefPath', 'owns']) if (blank(t[k])) fail(`tasks[${i}].${k} is missing or empty`)
  for (const k of ['base', 'answers']) if (k in t) fail(`tasks[${i}].${k} is set by the wave; remove it`)
  const key = String(t.task)
  if (seen.has(key)) fail(`duplicate task ${key}`)
  seen.add(key)
  // bdl-task names its snap builds from runLabel, so a task id that cannot make a valid label would
  // throw inside the nested run and stop the wave; refuse it here, before any task runs.
  const label = t.runLabel || `${A.wave}-t${t.task}`
  if (!RUN_LABEL.test(String(label))) fail(`tasks[${i}] gives run label "${label}", which is not lowercase letters, digits and dashes (at most 29 characters); use a simple task id like 4 or a1, or set tasks[${i}].runLabel`)
  if (labels.has(label)) fail(`tasks[${i}] repeats run label "${label}"`)
  labels.add(label)
})
const ANSWERS = A.answers === undefined || A.answers === null ? {} : A.answers
if (typeof ANSWERS !== 'object' || Array.isArray(ANSWERS)) fail('answers must be an object keyed by task')
for (const k of Object.keys(ANSWERS)) if (!seen.has(k)) fail(`answers for task ${k}, which is not in tasks`)
if (A.carried !== undefined && A.carried !== null && (!Array.isArray(A.carried) || A.carried.some((l) => typeof l !== 'string'))) fail('carried must be a list of strings')
const BDL_TASK = A.bdlTaskPath || '.claude/workflows/bdl-task.js'
const REPO = String(A.repoDir).replace(/\\/g, '/')
const W = String(A.wave)
const h7 = (s) => String(s || '').slice(0, 7)
const short = (s, n) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 3)}...` : t }

// ---------- roles ----------
// The wave's only agent is verifyHead; the same role() rules as bdl-task (Fable rejected, no effort on Haiku).
const MODELS = ['haiku', 'sonnet', 'opus']
const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max']
function role(name) {
  if (name !== 'verifyHead') fail(`unknown role "${name}"`)
  const r = Object.assign({ model: 'haiku' }, (A.roles && A.roles.verifyHead) || {})
  if (!MODELS.includes(r.model)) fail(`role "${name}" model "${r.model}" is not one of ${MODELS.join(', ')}`)
  if (r.model === 'haiku') {
    if (r.effort) fail(`role "${name}" is haiku, which takes no effort`)
    return { model: 'haiku' }
  }
  if (!EFFORTS.includes(r.effort)) fail(`role "${name}" (${r.model}) needs an effort of ${EFFORTS.join(', ')}`)
  return { model: r.model, effort: r.effort }
}

role('verifyHead') // validate the override now, before any task runs

// ---------- verifyHead ----------
// One Haiku agent reads git; only a 40-hex sha that cat-file confirmed (EXISTS <sha>) is accepted.
// The child's head is compared and logged on a difference, never used.
const NO_REMOTE = 'Never run git push, gh pr (any subcommand), gh api writes, git merge, git checkout of another branch, git branch, git switch, git stash or git reset; the controller and the founder own branches and the remote.'
const VERIFY_HEAD = {
  type: 'object',
  properties: { revParse: { type: 'string', description: 'raw stdout of git rev-parse HEAD' }, catFile: { type: 'string', description: 'raw stdout of the cat-file check: EXISTS <sha> or MISSING' } },
  required: ['revParse', 'catFile'],
}
let verifyCalls = 0
async function verifyHead(childHead, label) {
  const prompt = [
    `Read-only git check in ${REPO}. Run these two commands in Git Bash and return the raw stdout of each, copied exactly, with no interpretation. Change nothing.`,
    `1. git -C "${REPO}" rev-parse HEAD`,
    `2. sha=$(git -C "${REPO}" rev-parse HEAD) && git -C "${REPO}" cat-file -e "$sha^{commit}" && echo "EXISTS $sha" || echo MISSING`,
    'Return revParse (the stdout of command 1) and catFile (the stdout of command 2).',
    'Your role is read-only on this checkout: do not change tracked files, the index, HEAD or any branch.',
    'Rules:',
    '- Never dispatch subagents. Do all of this work yourself.',
    '- Finish every command before you reply; leave nothing running in the background.',
    `- ${NO_REMOTE}`,
  ].join(NL)
  verifyCalls++
  const v = await agent(prompt, Object.assign({ label, phase: 'Wave', schema: VERIFY_HEAD }, role('verifyHead')))
  const head = String((v && v.revParse) || '').trim()
  if (!SHA40.test(head) || String((v && v.catFile) || '').trim() !== `EXISTS ${head}`) {
    return { problem: `verifyHead ${label} did not return a 40-hex sha that git confirmed (${v ? JSON.stringify({ revParse: String(v.revParse).slice(0, 60), catFile: String(v.catFile).slice(0, 30) }) : 'no result'}); fix the repository in ${REPO}, then start a fresh bdl-wave with base set to git rev-parse HEAD and carried set to the returned carried` }
  }
  const c = String(childHead || '').trim().toLowerCase()
  if (c && !(c.length >= 7 && head.startsWith(c))) log(`agent-reported head ${c.slice(0, 16)}... differs from git; using git`)
  return { head }
}

// ---------- child args ----------
// Only defined values reach bdl-task, so an unset option stays unset there.
const WAVE_KEYS = ['repoDir', 'branch', 'workDir', 'scratchRoot', 'trailer', 'ports']
const TASK_KEYS = ['task', 'title', 'briefPath', 'owns', 'school', 'schools', 'sizes', 'schemes', 'films', 'baseline', 'layout', 'runtime', 'foreignPaths', 'maxRounds', 'maxAgents', 'implemented']
const DEFAULT_KEYS = ['school', 'schools', 'sizes', 'schemes', 'baseline', 'layout', 'runtime', 'foreignPaths', 'maxRounds', 'maxAgents']
function flowText(lines) {
  return `Earlier in this wave (bdl-wave). Each line was already raised, ruled or called for the founder; a later critic does not re-raise it. Carry-forward lines are obligations on this task:${NL}${lines.join(NL)}`
}
function childArgs(t, base, flow) {
  const o = {}
  const put = (k, v) => { if (v !== undefined && v !== null) o[k] = v }
  for (const k of WAVE_KEYS) put(k, A[k])
  for (const k of DEFAULT_KEYS) put(k, A[k])
  for (const k of TASK_KEYS) put(k, t[k])
  put('reportPath', t.reportPath || `${A.workDir}/task-${t.task}-report.md`)
  put('runLabel', t.runLabel || `${W}-t${t.task}`)
  put('base', base)
  // carries merge (wave, then task, then what earlier tasks left); every other option: the task wins.
  const carries = [A.carries, t.carries, flow.length ? flowText(flow) : ''].filter((x) => !blank(x)).join(NL + NL)
  if (carries) o.carries = carries
  if (A.roles || t.roles) o.roles = Object.assign({}, A.roles || {}, t.roles || {})
  if (ANSWERS[String(t.task)] !== undefined) o.answers = ANSWERS[String(t.task)]
  return o
}

// ---------- run ----------
phase('Wave')
log(`wave ${W}: ${A.tasks.length} task(s) (${A.tasks.map((t) => t.task).join(', ')}) on ${A.branch} from ${h7(A.base)}; each runs as a nested ${BDL_TASK}`)
const results = []
const flow = (A.carried || []).slice()
const ledger = []
const taste = []
let base = A.base
let stop = null
for (const t of A.tasks) {
  const ca = childArgs(t, base, flow)
  log(`wave ${W}: Task ${t.task} starts from ${h7(base)}${flow.length ? `, with ${flow.length} line(s) carried` : ''}${ca.answers ? ', with controller answers' : ''}`)
  let res = null
  let problem = ''
  try {
    res = await workflow({ scriptPath: BDL_TASK }, ca)
  } catch (e) {
    const msg = e && e.message ? e.message : String(e)
    if (/abort|cancel/i.test(msg)) throw e // a run the user stopped is not a task result
    problem = `bdl-task threw: ${msg}`
  }
  if (!res || typeof res !== 'object') {
    problem = problem || 'bdl-task returned no result'
    results.push({ task: t.task, status: 'stopped', base, head: base, problem })
    stop = { task: t.task, status: 'stopped', problem }
    ledger.push(`- Task ${t.task}: stopped at bdl-task (${short(problem, 300)}); controller action needed`)
    break
  }
  const { ledgerLines, ...summary } = res
  results.push(summary)
  ledger.push(...(Array.isArray(ledgerLines) ? ledgerLines : []))
  log(`wave ${W}: Task ${t.task} ${res.status} at ${h7(res.head)}, ${res.rounds || 0} fix round(s)`)
  if (res.status !== 'complete') {
    stop = { task: t.task, status: res.status, stopped: res.stopped, stopPoint: res.stopPoint, problem: res.problem, questions: res.questions || [], parked: res.parked || [] }
    break
  }
  // The completed task's calls enter the flow before the verify read, so a verify stop still returns them in carried.
  for (const c of res.tasteCalls || []) { taste.push(Object.assign({ task: t.task }, c)); flow.push(`- Task ${t.task} taste call ${t.task}/${c.id} (for the founder, do not re-raise): ${short(c.summary, 240)}`) }
  for (const m of res.deferredMinors || []) flow.push(`- Task ${t.task} deferred minor ${t.task}/${m.id} (do not re-raise): ${short(m.summary, 240)}`)
  if (t === A.tasks[A.tasks.length - 1]) {
    base = res.head // no later task: nothing to carry the head into
  } else {
    const v = await verifyHead(res.head, `verify-head-t${t.task}`)
    if (v.problem) {
      log(`wave ${W}: ${v.problem}`)
      stop = { task: t.task, status: 'stopped', stopped: 'precondition', stopPoint: 'precondition:verifyHead', problem: v.problem, questions: [], parked: [] }
      ledger.push(`- Task ${t.task}: complete, but the wave stopped: ${short(v.problem, 300)}; controller action needed`)
      break
    }
    base = v.head
  }
}

// ---------- return ----------
const done = results.filter((r) => r.status === 'complete')
const sum = (f) => results.reduce((s, r) => s + f(r), 0)
const totals = {
  tasks: A.tasks.length,
  run: results.length,
  completed: done.length,
  rounds: sum((r) => r.rounds || 0),
  parked: sum((r) => (r.parked || []).length),
  tasteCalls: sum((r) => (r.tasteCalls || []).length),
  deferredMinors: sum((r) => (r.deferredMinors || []).length),
  agents: sum((r) => r.agents || 0) + verifyCalls,
}
const head = results.length ? results[results.length - 1].head || base : base
if (stop) {
  log(`wave ${W}: stopped at Task ${stop.task} (${stop.status}${stop.stopped ? `: ${stop.stopped}` : ''}); answer with answers["${stop.task}"] and re-run with the full args`)
  ledger.push(`- Wave ${W}: stopped at Task ${stop.task} (${stop.status}${stop.stopped ? `: ${stop.stopped}` : ''}; ${done.length} of ${A.tasks.length} task(s) complete, head ${h7(head)}); controller action needed`)
  return { wave: W, status: stop.status === 'parked' ? 'parked' : 'stopped', stoppedTask: stop.task, stop, base: A.base, head, tasks: results, totals, carried: flow, tasteCalls: taste, ledgerLines: ledger }
}
log(`wave ${W}: complete, ${done.length} task(s), ${totals.rounds} fix round(s), ${totals.tasteCalls} taste call(s), ${totals.agents} agent(s)`)
ledger.push(`- Wave ${W}: complete (Tasks ${A.tasks.map((t) => t.task).join(', ')}; commits ${h7(A.base)}..${h7(head)}; ${totals.rounds} fix round(s))`)
return { wave: W, status: 'complete', base: A.base, head, tasks: results, totals, carried: flow, tasteCalls: taste, ledgerLines: ledger }
