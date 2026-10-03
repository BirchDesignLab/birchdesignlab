export const meta = {
  name: 'bdl-task',
  description: 'Implement one task, verify the head from git, review it (Opus critic, film verifier, gate) in parallel and fix up to maxRounds before parking',
  whenToUse: 'One brief-sized task on a feature branch whose work is visual or touches sensitive code; the controller reads the sheets and rules on what parks',
  phases: [
    { title: 'Implement', detail: 'implementer builds the task from its brief and commits' },
    { title: 'Verify', detail: 'verifyHead (Haiku) reads the head from git after every stage that commits' },
    { title: 'Review', detail: 'critic, film verifier and gate-0 in parallel on the verified head' },
    { title: 'Fix', detail: 'fixer, then re-critic, re-filming verifier and gate per round, up to maxRounds' },
  ],
}

/*
 * bdl-task: one task through implement, review and fix. Reference: .claude/workflows/README.md.
 * After any edit run: node scripts/workflows/harness.mjs
 *
 * Required args: task, title, repoDir, branch, base (full sha), briefPath, reportPath, workDir,
 * scratchRoot, runLabel (lowercase, digits, dashes), owns (files and globs this task may change),
 * ports (three or more ports from 4460 to 4480), trailer.
 * Optional: school or schools, sizes, schemes, films [{ id, what, sizes?, schemes? }], baseline
 * (required with layout), layout, runtime, foreignPaths, carries, roles, maxRounds (default 2, 1..4),
 * maxAgents (default 14), answers [{ at, text }], implemented { head } (review stages only).
 * Never pushes or merges; every shell-running prompt carries the rules below.
 */

// ---------- arguments ----------
const A = args || {}
const NL = String.fromCharCode(10)
const blank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '')
const fail = (m) => { throw new Error(`bdl-task: ${m}`) }
for (const k of ['task', 'title', 'repoDir', 'branch', 'base', 'briefPath', 'reportPath', 'workDir', 'scratchRoot', 'runLabel', 'trailer']) {
  if (blank(A[k])) fail(`required arg "${k}" is missing or empty (see .claude/workflows/README.md)`)
}
const SHA40 = /^[0-9a-f]{40}$/
if (!SHA40.test(String(A.base))) fail('base must be a full 40-hex sha (git rev-parse HEAD)')
if (!/^[a-z0-9][a-z0-9-]{0,28}$/.test(String(A.runLabel))) fail('runLabel must be lowercase letters, digits and dashes, at most 29 characters (it names the snap builds)')
const OWNS = [].concat(A.owns === undefined || A.owns === null ? [] : A.owns)
if (!OWNS.length || OWNS.some(blank)) fail('owns must name the files and globs this task may change')
const PORTS = Array.isArray(A.ports) ? A.ports : []
if (PORTS.length < 3 || PORTS.some((p) => !Number.isInteger(p) || p < 4460 || p > 4480) || new Set(PORTS).size !== PORTS.length) {
  fail('ports must be three or more distinct integers from 4460 to 4480 (dev, critic, verifier)')
}
const PORT = { dev: PORTS[0], critic: PORTS[1], verifier: PORTS[2] }
const SCHOOLS = [].concat(A.schools || A.school || [])
const SIZES = Array.isArray(A.sizes) && A.sizes.length ? A.sizes : [1440, 1280, 1024, 820, 390]
const SCHEMES = Array.isArray(A.schemes) && A.schemes.length ? A.schemes : ['dark', 'light']
const FILMS = Array.isArray(A.films) ? A.films : []
for (const f of FILMS) if (!f || blank(f.id) || blank(f.what)) fail('every film needs an id and a what')
if (new Set(FILMS.map((f) => f.id)).size !== FILMS.length) fail('film ids must be unique')
if (A.layout && blank(A.baseline)) fail('layout: true needs baseline (the snap label of the before build)')
const FOREIGN = [].concat(A.foreignPaths || [])
const N = A.task
const REPO = String(A.repoDir).replace(/\\/g, '/')

function intArg(name, def, lo, hi) {
  if (A[name] === undefined || A[name] === null) return def
  const n = Number(A[name])
  if (!Number.isFinite(n)) { log(`cap: ${name} ${JSON.stringify(A[name])} is not a number; using ${def}`); return def }
  const c = Math.min(hi, Math.max(lo, Math.trunc(n)))
  if (c !== A[name]) log(`cap: ${name} ${JSON.stringify(A[name])} became ${c}`)
  return c
}
const MAX_ROUNDS = intArg('maxRounds', 2, 1, 4)
const DEFAULT_MAX_AGENTS = 14
let MAX_AGENTS = intArg('maxAgents', DEFAULT_MAX_AGENTS, 1, 1000)

// Answers: appended across re-runs, never edited. Each entry's text reaches exactly one agent, so
// earlier calls replay from cache. budget: no agent, the cap rises by the default once per entry.
// A precondition entry (plain, or typed for the implementer or verifyHead) buys one retry for the
// next failing call, in call order; implementer entries all go to the one implementer-continue.
const AT = ['implementer', 'precondition', 'precondition:implementer', 'precondition:verifyHead', 'budget']
const ANSWERS = []
if (A.answers !== undefined && A.answers !== null) {
  const list = Array.isArray(A.answers) ? A.answers : [A.answers]
  list.forEach((e, i) => {
    const at = String((e && e.at) || '')
    if (!AT.includes(at)) fail(`answers[${i}].at "${at}" is not a stop point; use one of ${AT.join(', ')}`)
    if (blank(e.text)) fail(`answers[${i}] needs text`)
    if (at === 'budget') { MAX_AGENTS += DEFAULT_MAX_AGENTS; log(`budget: answers[${i}]: ${e.text}; maxAgents now ${MAX_AGENTS}`) }
    ANSWERS.push({ at, text: String(e.text).trim(), used: at === 'budget' })
  })
}
// takeAll: every unused match (the implementer-continue takes all of its answers). takeOne: the next
// unused match in list order, so each failing precondition consumer gets one entry and a later entry
// is never swallowed by an earlier consumer (which would change its cached prompt on a resume).
function takeAll(match) {
  const es = ANSWERS.filter((e) => !e.used && match(e.at))
  es.forEach((e) => { e.used = true })
  return es
}
function takeOne(match) {
  const e = ANSWERS.find((x) => !x.used && match(x.at))
  if (e) e.used = true
  return e || null
}
const answerText = (es) => (es.length ? ['Controller answers (binding):', ...es.map((e) => `* (${e.at}) ${e.text}`)].join(NL) : '')
let IMPLEMENTED = null
if (A.implemented !== undefined && A.implemented !== null) {
  const h = A.implemented && typeof A.implemented.head === 'string' ? A.implemented.head.trim() : ''
  if (!SHA40.test(h)) fail('implemented.head must be a full 40-hex sha')
  if (ANSWERS.some((e) => e.at === 'implementer' || e.at === 'precondition:implementer')) fail('implemented skips the implementer, so answers for it cannot apply')
  IMPLEMENTED = h
}

// ---------- roles ----------
const MODELS = ['haiku', 'sonnet', 'opus']
const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max']
const RUNTIME = !!A.runtime
const DEFAULTS = {
  implementer: RUNTIME ? { model: 'opus', effort: 'medium' } : { model: 'sonnet', effort: 'medium' },
  verifyHead: { model: 'haiku' },
  critic: { model: 'opus', effort: 'high' },
  verifier: { model: 'sonnet', effort: 'high' },
  gate: { model: 'sonnet', effort: 'low' },
  reCritic: { model: 'opus', effort: 'medium' },
}
const OVR = A.roles || {}
for (const k of Object.keys(OVR)) if (!(k in DEFAULTS) && k !== 'fixer' && k !== 'escalatedFixer') fail(`roles.${k} is not a role`)
const LADDER = {
  'haiku/': ['sonnet', 'medium'], 'sonnet/low': ['sonnet', 'medium'], 'sonnet/medium': ['sonnet', 'high'],
  'sonnet/high': ['opus', 'medium'], 'sonnet/xhigh': ['opus', 'medium'],
  'opus/low': ['opus', 'medium'], 'opus/medium': ['opus', 'high'], 'opus/high': ['opus', 'high'],
}
function stepUp(r) {
  const s = LADDER[`${r.model}/${r.effort || ''}`]
  return s ? { model: s[0], effort: s[1] } : { model: r.model, effort: r.effort }
}
function resolve(name) {
  if (name === 'fixer') return Object.assign({}, resolve('implementer'), OVR.fixer || {})
  if (name === 'escalatedFixer') return Object.assign({}, RUNTIME ? { model: 'opus', effort: 'high' } : stepUp(resolve('fixer')), OVR.escalatedFixer || {})
  if (!DEFAULTS[name]) fail(`unknown role "${name}"`)
  return Object.assign({}, DEFAULTS[name], OVR[name] || {})
}
const warned = new Set()
// The only place model and effort are chosen. Haiku gets no effort (the API rejects it); Fable is not a model here.
function role(name) {
  const r = resolve(name)
  if (!MODELS.includes(r.model)) fail(`role "${name}" model "${r.model}" is not one of ${MODELS.join(', ')}`)
  if (r.model === 'haiku') {
    if (r.effort) fail(`role "${name}" is haiku, which takes no effort`)
    return { model: 'haiku' }
  }
  if (!EFFORTS.includes(r.effort)) fail(`role "${name}" (${r.model}) needs an effort of ${EFFORTS.join(', ')}`)
  if ((r.effort === 'xhigh' || r.effort === 'max') && !warned.has(name)) { warned.add(name); log(`roles: "${name}" is ${r.effort}; no default role uses it`) }
  return { model: r.model, effort: r.effort }
}
const tierOf = (name) => { const r = role(name); return r.effort ? `${r.model}/${r.effort}` : r.model }

// ---------- agent budget ----------
// Every agent() call in the run goes through ask() or block(). Cached replays count. A parallel
// block reserves all its calls first, so a budget stop never splits it.
let used = 0
const halt = (stopped, stopPoint, problem) => { throw Object.assign(new Error(problem), { stop: { stopped, stopPoint, problem } }) }
function reserve(n, label) {
  if (used + n > MAX_AGENTS) halt('budget', 'budget', `agent ${used + n} would exceed maxAgents ${MAX_AGENTS} at ${label}; ${used} agent(s) ran. Answer { at: "budget", text } to raise the cap by ${DEFAULT_MAX_AGENTS} and resume from cache`)
}
const optsFor = (r, label, phaseName, schema) => Object.assign({ label, phase: phaseName, schema }, role(r))
async function ask(r, label, phaseName, schema, prompt) {
  const o = optsFor(r, label, phaseName, schema)
  reserve(1, label)
  used++
  return agent(prompt, o)
}
// items: [{ role, label, phase, schema, prompt }]. Returns results in order (null for a failed agent).
async function block(items) {
  const os = items.map((it) => optsFor(it.role, it.label, it.phase, it.schema))
  reserve(items.length, items.map((it) => it.label).join(', '))
  used += items.length
  return parallel(items.map((it, i) => () => agent(it.prompt, os[i])))
}

// ---------- paths and shared prompt text ----------
const fwd = (p) => String(p).replace(/\\/g, '/')
const join = (...p) => p.map((s, i) => (i === 0 ? fwd(s).replace(/\/+$/, '') : fwd(s).replace(/^\/+|\/+$/g, ''))).join('/')
const scratch = (label) => join(A.scratchRoot, A.runLabel, label)
const out = (f) => join(A.workDir, A.runLabel, f)
const h7 = (s) => String(s).slice(0, 7)
const oneLine = (s) => String(s).replace(/\s+/g, ' ').trim()

const NO_REMOTE = 'Never run git push, gh pr (any subcommand), gh api writes, git merge, git checkout of another branch, git branch, git switch, git stash or git reset; the controller and the founder own branches and the remote.'
const RULES_GIT = ['Rules:', '- Never dispatch subagents. Do all of this work yourself.', '- Finish every command before you reply; leave nothing running in the background.', `- ${NO_REMOTE}`].join(NL)
const RULES = [
  RULES_GIT,
  `- Change only the files in owns: ${OWNS.join(', ')}. Read-only roles change nothing but their own review file and scratch path.`,
  '- Serve only on your assigned port. Before you return, stop every server you started and check netstat for 4460 to 4480 and 8787.',
  '- Wait once: one Monitor or foreground chunks under 10 minutes; never re-issue a timed-out waiter.',
  '- Film with GPU Chromium (BDL_GPU=1; --use-angle=d3d11 --enable-gpu) and confirm the renderer through WEBGL_debug_renderer_info. Never mix software and GPU frames in one delivery.',
  '- Force prefers-reduced-transparency: no-preference; suppress the portal prompt; arrivals go through the real switcher.',
  '- Films are timestamped strips; sheets are whole-page at every size named.',
  '- After any new animation rule, check the BUILT CSS: lightningcss can fold animation-timeline into a shorthand Chromium rejects.',
  '- Write docs with the Write and Edit tools, never shell heredocs or Get-Content -Raw round trips. No em dashes in anything a visitor reads.',
].join(NL)
const rules = (port) => `${RULES}${NL}Your assigned port: ${port}.`
const READONLY = 'Your role is read-only on this checkout: do not change tracked files, the index, HEAD or any branch. Write only your own review or sheet files and your scratch directory.'
const SHELL = `Shell: Git Bash. Run every git and shell command in ${REPO}. Branch: ${A.branch}.`
const TRAILER = `End every commit message with the attribution trailer your session's system reminder gives; if it gives none, use: ${A.trailer}`
const CONTEXT = [
  `Task ${N}: ${A.title}. Brief: ${A.briefPath}. Report: ${A.reportPath}.`,
  SCHOOLS.length ? `Schools: ${SCHOOLS.join(', ')}. Read each school's dossier and the brief sections the brief names.` : '',
  A.carries ? `Carried from earlier work (binding):${NL}${A.carries}` : '',
  RUNTIME ? 'This task touches the WebGL, lens, portal runtime or view transitions: judge it on film, not on the code alone.' : '',
].filter(Boolean).join(NL)
const SEVERITY = 'Severity: blocker = broken behaviour or a brief item plainly unmet; important = the task cannot be trusted until fixed; minor = polish that can wait; taste = a call for the founder, never fixed here. Every finding cites file:line.'
const where = (f) => `${f.file || ''}${f.line ? ':' + f.line : ''}`
const listText = (fs) => fs.map((f) => `- [${f.id}] ${f.severity.toUpperCase()} ${where(f)} ${f.summary}${f.fix ? ' Fix: ' + f.fix : ''}${f.last ? ` (${f.last})` : ''}`).join(NL)

// ---------- schemas ----------
const WORK = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['DONE', 'DONE_WITH_CONCERNS', 'BLOCKED', 'NEEDS_CONTEXT'] },
    concerns: { type: 'array', items: { type: 'string' } },
    questions: { type: 'array', items: { type: 'string' } },
    preconditionFailed: { type: 'string', description: 'set (naming each file) only when the stated precondition does not hold; then change nothing' },
    declined: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, reason: { type: 'string' } }, required: ['id', 'reason'] }, description: 'fixer only: findings left unchanged on purpose, with the reason' },
    report: { type: 'string', description: 'your report as plain text: what you did, files changed (file:line where useful), the npm run verify result' },
  },
  required: ['status', 'concerns', 'questions', 'report'],
}
const VERIFY_HEAD = {
  type: 'object',
  properties: {
    revParse: { type: 'string', description: 'raw stdout of git rev-parse HEAD' },
    catFile: { type: 'string', description: 'raw stdout of the cat-file check: EXISTS <sha> or MISSING' },
    log: { type: 'string', description: 'raw stdout of git log --oneline since..HEAD; empty when none' },
  },
  required: ['revParse', 'catFile', 'log'],
}
const FINDING = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    severity: { type: 'string', enum: ['blocker', 'important', 'minor', 'taste'] },
    file: { type: 'string' },
    line: { type: 'string' },
    summary: { type: 'string' },
    fix: { type: 'string' },
  },
  required: ['id', 'severity', 'file', 'line', 'summary', 'fix'],
}
const CRITIC = { type: 'object', properties: { verdict: { type: 'string', enum: ['pass', 'fail'] }, findings: { type: 'array', items: FINDING } }, required: ['verdict', 'findings'] }
const RECRITIC = {
  type: 'object',
  properties: {
    verdicts: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, verdict: { type: 'string', enum: ['ADDRESSED', 'NOT ADDRESSED'] }, evidence: { type: 'string' } }, required: ['id', 'verdict', 'evidence'] } },
    newFindings: { type: 'array', items: FINDING },
  },
  required: ['verdicts', 'newFindings'],
}
const FILM = {
  type: 'object',
  properties: {
    cases: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, result: { type: 'string', enum: ['pass', 'fail'] }, evidence: { type: 'string' }, sheet: { type: 'string' } }, required: ['id', 'result', 'evidence', 'sheet'] } },
    renderer: { type: 'string', description: 'the WEBGL_debug_renderer_info string the films ran on' },
    index: { type: 'string', description: 'path of the sheets index.md' },
  },
  required: ['cases', 'renderer', 'index'],
}
const GATE = { type: 'object', properties: { ok: { type: 'boolean' }, problems: { type: 'array', items: { type: 'string' } } }, required: ['ok', 'problems'] }

// ---------- state ----------
const S = { head: A.base, commits: [], rounds: 0, findings: new Map(), parked: [], taste: [], minors: [], questions: [], concerns: [], roundLog: [], sheets: [], gateOk: false, report: [] }
// Workflow subagents may be refused when they write report files, so reports travel in the
// structured output: the script carries them into later prompts and returns them; the file copy is best effort.
const addReport = (who, w) => { if (w && !blank(w.report)) S.report.push(`[${who}] ${String(w.report).trim()}`) }
const reportText = () => (S.report.length ? S.report.join(NL + NL) : '(no report text returned)')
const SAVE = `Also save the report to ${A.reportPath} if your tools allow it; if a tool refuses, skip the file: the returned report is what counts.`
let open = []
const cases = new Map() // film case id -> latest { id, result, evidence, sheet }
const na = {} // finding id -> rounds it survived
const cleanId = (id) => String(id).replace(/^\[|\]$/g, '').trim()
const mk = (id, summary, src) => ({ id, severity: 'important', file: '', line: '', summary, fix: 'fix the cause so this check passes', src })
function track(f, state) {
  S.findings.set(f.id, { id: f.id, severity: f.severity, file: f.file, line: f.line, summary: f.summary, state })
}
function setState(id, state) { const t = S.findings.get(id); if (t) t.state = state }
// Sorts critic findings: taste to the founder, minor deferred, blocker and important open.
function sortCritic(list, prefix, into) {
  for (const f of list) {
    const g = Object.assign({}, f, { id: `${prefix}${cleanId(f.id)}`, src: 'critic' })
    if (g.severity === 'taste') { S.taste.push(g); track(g, 'taste') }
    else if (g.severity === 'minor') { S.minors.push(g); track(g, 'deferred') }
    else { into.push(g); track(g, 'open') }
  }
}
// Gate ids carry no round tag (gate:1, gate:2), so a gate still red after a fix matches its earlier id and counts as surviving.
const gateFindings = (g) => (g.ok ? [] : (g.problems.length ? g.problems : ['gate not ok but no problem listed']).map((p, k) => mk(`gate:${k + 1}`, `gate: ${p}`, 'gate')))
const expectedCases = () => FILMS.map((f) => f.id)

// ---------- verifyHead ----------
// The only source of a head sha. A Haiku agent reads git; only a 40-hex sha the second command
// confirmed (EXISTS <sha>) is accepted. An agent-reported head is never used.
function verifyHeadPrompt(since) {
  return [
    `Read-only git check in ${REPO}. Run these three commands in Git Bash and return the raw stdout of each, copied exactly, with no interpretation. Change nothing.`,
    `1. git -C "${REPO}" rev-parse HEAD`,
    `2. sha=$(git -C "${REPO}" rev-parse HEAD) && git -C "${REPO}" cat-file -e "$sha^{commit}" && echo "EXISTS $sha" || echo MISSING`,
    `3. git -C "${REPO}" log --oneline ${since}..HEAD`,
    'Return revParse (command 1), catFile (command 2) and log (command 3; an empty string when it prints nothing).',
    READONLY,
    RULES_GIT,
  ].join(NL)
}
function parseHead(v) {
  const head = String((v && v.revParse) || '').trim()
  if (!SHA40.test(head) || String((v && v.catFile) || '').trim() !== `EXISTS ${head}`) return null
  const commits = String(v.log || '').split(NL).map((l) => l.trim()).filter(Boolean).map((l) => ({ sha: l.split(' ')[0], subject: l.slice(l.indexOf(' ') + 1) }))
  return { head, commits }
}
async function verifyHead(label, since, exact) {
  const prompt = verifyHeadPrompt(since)
  const run = (p, l) => ask('verifyHead', l, 'Verify', VERIFY_HEAD, p)
  let v = await run(prompt, label)
  let r = parseHead(v)
  // Each answer buys one more attempt (label-retry, label-retry2, ...) and carries the earlier ones, so a resume replays them.
  const given = []
  for (let k = 1; !r; k++) {
    const e = takeOne((at) => at === 'precondition:verifyHead' || at === 'precondition')
    if (!e) break
    given.push(e)
    v = await run(`${prompt}${NL}${NL}${answerText(given)}`, k === 1 ? `${label}-retry` : `${label}-retry${k}`)
    r = parseHead(v)
  }
  if (!r) halt('precondition', 'precondition:verifyHead', `verifyHead ${label} did not return a 40-hex sha that git confirmed (${v ? JSON.stringify({ revParse: String(v.revParse).slice(0, 60), catFile: String(v.catFile).slice(0, 60) }) : 'no result'}); check the repository in ${REPO}, then answer at precondition:verifyHead to run it once more`)
  if (exact && r.head !== exact) halt('precondition', 'precondition:verifyHead', `implemented.head ${h7(exact)} is not git HEAD ${r.head} in ${REPO}; check out the named head or pass git's, then re-run`)
  return r
}

// ---------- implement ----------
const foreignText = FOREIGN.length ? ` (paths another session owns, ignore these: ${FOREIGN.join(', ')})` : ''
const commitRule = `Run npm run verify (vitest, astro check, build) before each commit and never commit on red. Commit only files in owns (git add <paths>, never git add -A, never git add -f). Never commit the report (${A.reportPath}) or anything under ${fwd(A.workDir)} or ${fwd(A.scratchRoot)}: they are scratch, not deliverables. ${TRAILER}`
function implementerPrompt() {
  return [
    `You are implementing ${CONTEXT}`,
    `Read your brief first: ${A.briefPath}. Follow its steps, file list and commit message.`,
    `Precondition: git branch --show-current is ${A.branch}, git rev-parse HEAD is ${A.base}, and git status --porcelain shows no tracked change and no untracked file${foreignText}. If any is not so, change nothing, set preconditionFailed to what you found (name each file) and report BLOCKED.`,
    'Implement exactly what the brief specifies, nothing more. If it needs a decision the brief does not make, or you keep reading files without progress, stop with BLOCKED or NEEDS_CONTEXT and specific questions.',
    commitRule,
    `Return your report in report: what you did, files changed, the npm run verify result. ${SAVE}`,
    SHELL, rules(PORT.dev),
    'Return: status, concerns, questions, report.',
  ].join(NL)
}
function continuePrompt(impl, ans) {
  return [
    `You are continuing ${CONTEXT}`,
    `An earlier implementer stopped with ${impl.status}; the controller has answered. Read the brief ${A.briefPath}. Check what is committed (git log --oneline ${A.base}..HEAD), build on it, and never reset or rewrite history.`,
    `Its report:${NL}${blank(impl.report) ? '(none returned)' : String(impl.report).trim()}`,
    impl.questions.length ? `Its questions:${NL}${impl.questions.map((q) => `- ${q}`).join(NL)}` : '',
    ans,
    commitRule,
    `Return your continuation report in report. ${SAVE}`,
    SHELL, rules(PORT.dev),
    'Return: status, concerns, questions, report.',
  ].filter(Boolean).join(NL)
}
async function implement() {
  const prompt = implementerPrompt()
  let impl = await ask('implementer', 'implementer', 'Implement', WORK, prompt)
  if (!impl) { S.questions.push('implementer returned no result'); halt('implementer', 'implementer', 'implementer returned no result') }
  // Each answer buys one more attempt (implementer-retry, implementer-retry2, ...) and carries the earlier ones.
  const given = []
  while (impl.preconditionFailed) {
    const e = takeOne((at) => at === 'precondition:implementer' || at === 'precondition')
    if (!e) halt('precondition', 'precondition:implementer', `implementer: ${impl.preconditionFailed}`)
    given.push(e)
    const lbl = given.length === 1 ? 'implementer-retry' : `implementer-retry${given.length}`
    log(`implement: precondition failure (${impl.preconditionFailed}); running ${lbl} with the controller answer`)
    impl = await ask('implementer', lbl, 'Implement', WORK, `${prompt}${NL}${NL}${answerText(given)}`)
    if (!impl) halt('implementer', 'implementer', `${lbl} returned no result`)
  }
  addReport(given.length ? `implementer-retry${given.length > 1 ? given.length : ''}` : 'implementer', impl)
  if (impl.status === 'BLOCKED' || impl.status === 'NEEDS_CONTEXT') {
    S.questions.push(...impl.questions); S.concerns.push(...impl.concerns)
    const ans = answerText(takeAll((at) => at === 'implementer'))
    if (!ans) halt('implementer', 'implementer', `implementer ${impl.status}: ${impl.questions.join('; ') || 'see the report'}`)
    log(`implement: implementer ${impl.status}; running implementer-continue with the controller answers`)
    const cont = await ask('implementer', 'implementer-continue', 'Implement', WORK, continuePrompt(impl, ans))
    if (!cont) halt('implementer', 'implementer', 'implementer-continue returned no result')
    addReport('implementer-continue', cont)
    if (cont.status === 'BLOCKED' || cont.status === 'NEEDS_CONTEXT') {
      S.questions.push(...cont.questions)
      halt('implementer', 'implementer', `implementer-continue ${cont.status}: ${cont.questions.join('; ') || 'see the report'}`)
    }
    impl = cont
  }
  S.concerns.push(...impl.concerns)
  return impl
}

// ---------- review prompts ----------
function diffStep(from, to, file) {
  return [
    `Build your diff file (Git Bash), then read it once:`,
    `mkdir -p "${file.replace(/\/[^/]+$/, '')}" && cd "${REPO}" && { git log --oneline ${from}..${to}; git diff --stat ${from}..${to}; git diff -U10 ${from}..${to}; } > "${file}"`,
    'After the diff, read outside it only code that calls or is called by the changed code, for a concrete risk you can name.',
  ].join(NL)
}
function criticPrompt(head) {
  return [
    `You are the critic for ${CONTEXT}`,
    `Read the whole change adversarially against the brief: assume something is wrong and find it. Base ${A.base}, head ${head}. The implementer's report below is unverified claims:${NL}${reportText()}`,
    diffStep(A.base, head, join(scratch('critic'), 'review.diff')),
    `You run beside the verifier, so you do not wait for its sheets: read code, and when it cannot answer a question render your own stills (node scripts/themes/snap.mjs --name ${A.runLabel}-critic --port ${PORT.critic} -- ...).`,
    SEVERITY,
    `Ids short and unique (C1, C2). Your returned findings are the review; also save the full review to ${out('review-critic.md')} if your tools allow it (skip it if a tool refuses).`,
    READONLY, SHELL, rules(PORT.critic),
    'verdict: pass only with no blocker or important finding.',
  ].join(NL)
}
function reCriticPrompt(findings, gateFindingsOpen, r, from, head) {
  return [
    `You are re-critiquing fix round ${r} of ${CONTEXT}`,
    `Verdict each finding below against the fix diff ${from}..${head}. ADDRESSED only when the specific defect no longer exists; "attempted" is NOT ADDRESSED. List anything the fix itself broke as newFindings.`,
    findings.length ? `Findings under verification:${NL}${listText(findings)}` : 'No critic finding is under verification this round; look only for new breakage in the fix diff.',
    gateFindingsOpen.length ? `Gate and film findings are verified by the gate and the verifier; leave them out of verdicts:${NL}${listText(gateFindingsOpen)}` : '',
    diffStep(from, head, join(scratch(`re-critic-r${r}`), 'fix.diff')),
    SEVERITY,
    `Your returned verdicts are the review; also save it to ${out(`re-critic-r${r}.md`)} if your tools allow it (skip it if a tool refuses).`,
    READONLY, SHELL, rules(PORT.critic),
    'Return one verdict per finding id exactly as given.',
  ].filter(Boolean).join(NL)
}
const caseLine = (f) => `- ${f.id}: ${f.what}${f.sizes ? ` [sizes ${f.sizes.join(', ')}]` : ''}${f.schemes ? ` [schemes ${f.schemes.join(', ')}]` : ''}`
function verifierPrompt(tag, head, refilm, from) {
  const sheets = out(`sheets/${tag}`)
  return [
    `You are the verifier for ${CONTEXT}`,
    refilm
      ? `Re-film only these cases, and any other case the fix diff ${from}..${head} could move. Report every case you re-filmed.${NL}${refilm.map((id) => { const f = FILMS.find((x) => x.id === id); return f ? caseLine(f) : `- ${id}: a case the brief names` }).join(NL)}`
      : `Film every case below, and every case the brief's own film list names (report those by id too). A case you could not film is a fail, never a skip.${NL}${FILMS.length ? FILMS.map(caseLine).join(NL) : '(no cases from the args; film what the brief lists)'}`,
    `Head under test: ${head} (base ${A.base}). Sizes: ${SIZES.join(', ')}. Schemes: ${SCHEMES.join(', ')} (a case may narrow them).`,
    `Build and serve a frozen snap, then film inside it: node scripts/themes/snap.mjs --name ${A.runLabel}-${tag} --port ${PORT.verifier} -- <film command>. Read the headers of scripts/themes/snap.mjs, motion.mjs, render.mjs and contact-sheet.mjs for flags. Report the GPU renderer string in renderer.`,
    A.layout ? `This task changes layout or stacking: also write whole-page before and after sheets at every size, the before from the baseline snap (scripts/themes/.out/snap-${A.baseline}, serve it with snap.mjs --reuse on your port).` : '',
    `Write the founder sheets (the film and sheet scripts write the images) to ${sheets}/, and an index.md there (one line per case: id, result, sheet path, evidence) if your tools allow it. Return cases [{ id, result, evidence, sheet }], renderer and index (the index.md path, or an empty string when you could not write it).`,
    `Brief: ${A.briefPath}. A fail needs evidence a reader can check on the sheet (frame, size, scheme).`,
    READONLY, SHELL, rules(PORT.verifier),
  ].filter(Boolean).join(NL)
}
function gatePrompt(label, head) {
  return [
    `You are the independent gate for ${CONTEXT}`,
    'Trust no earlier report. You run beside the critic and the verifier, whose snap builds hold the render lock, so never run npm run verify bare: it rewrites dist/ and .astro/ without the lock.',
    `Run exactly once in ${REPO}, in the FOREGROUND with the Bash tool's timeout at its maximum (600000 ms): node scripts/workflows/verify-locked.mjs --log ${join(scratch(label), 'verify.log')}. It queues on the render lock, then runs npm run verify (vitest, astro check, build, test:dist); a wait for the lock is normal. Never run it in the background, under a Monitor, or with a sleep loop, and do not reply until it has exited: its exit code is the verify result, and a reply without that exit code is worthless. If the call itself times out, run the same command once more in the foreground and use that exit code.`,
    `Then check: git branch --show-current is ${A.branch}; git rev-parse HEAD equals ${head}; git status --porcelain shows nothing${foreignText}.`,
    'problems lists FAILURES ONLY, one line each (command and first error lines, file paths and messages only); never list a check that passed. ok is true only with no problems; when everything passed, problems is an empty list.',
    READONLY, SHELL, rules(PORT.dev),
  ].join(NL)
}
function fixerPrompt(findings, r) {
  return [
    `You are fixing review findings, round ${r}, on ${CONTEXT}`,
    `You are a fresh agent: read the brief, and any saved reviews in ${join(A.workDir, A.runLabel)}/, as you need them. The findings below are complete without them.`,
    `Report so far:${NL}${reportText()}`,
    `Findings to fix:${NL}${listText(findings)}`,
    'Fix each at its cause. A finding that needs no change (say what you checked) goes in declined with its id and reason; never make an empty or cosmetic commit to satisfy a finding. Never weaken a test or a check to turn a gate green.',
    commitRule,
    `Return a "Fix round ${r}" report in report: per finding id, what changed (file:line) and the verify result. ${SAVE.replace('Also save the report to', 'Also append it to')}`,
    SHELL, rules(PORT.dev),
    'Use BLOCKED or NEEDS_CONTEXT with questions only when you cannot proceed at all. Return: status, concerns, questions, declined, report.',
  ].join(NL)
}

// ---------- results ----------
// Latest film results: failing and unfilmed cases become findings. Software rendering is a finding.
function takeFilm(film, tag) {
  S.sheets.push({ at: tag, index: film.index, cases: film.cases.map((c) => ({ id: c.id, result: c.result, sheet: c.sheet })) })
  for (const c of film.cases) cases.set(c.id, c)
  const found = []
  if (blank(film.renderer) || /swiftshader|llvmpipe|software|basic render/i.test(film.renderer)) found.push(mk('film:renderer', `the films did not run on the GPU (renderer: ${film.renderer || 'not reported'})`, 'film'))
  for (const id of new Set([...expectedCases(), ...cases.keys()])) {
    const c = cases.get(id)
    if (!c) found.push(mk(`film:${id}`, `case ${id} was not filmed; a case that cannot be filmed is a fail`, 'film'))
    else if (c.result !== 'pass') found.push(mk(`film:${id}`, `case ${id} failed: ${c.evidence}`, 'film'))
  }
  return found
}
const filmsPass = () => expectedCases().every((id) => cases.has(id) && cases.get(id).result === 'pass') && [...cases.values()].every((c) => c.result === 'pass')

function ledgerLines(res) {
  const L = []
  for (const l of S.roundLog) L.push(`- Task ${N}: ${l}`)
  for (const t of S.taste) L.push(`- Task ${N}: taste call: ${t.id} ${where(t)} ${t.summary}`)
  for (const m of S.minors) L.push(`- Task ${N}: minor (deferred): ${m.id} ${where(m)} ${m.summary}`)
  for (const p of S.parked) L.push(`- Task ${N}: parked: ${p.id} ${p.summary} (${p.reason})`)
  const ag = `${used} agent${used === 1 ? '' : 's'}`
  if (res.status === 'complete') L.push(`- Task ${N}: complete (commits ${h7(A.base)}..${h7(res.head)}, review clean, gate green, films pass; ${ag})`)
  else if (res.status === 'parked') L.push(`- Task ${N}: parked (commits ${h7(A.base)}..${h7(res.head)}, ${S.parked.length} parked; ${ag}); controller rules`)
  else L.push(`- Task ${N}: stopped at ${res.stopped} (head ${h7(res.head)}); controller action needed`)
  return L.map(oneLine)
}
function finish(status, extra) {
  const res = Object.assign({
    task: N, status, base: A.base, head: S.head, commits: S.commits, rounds: S.rounds,
    findings: [...S.findings.values()], parked: S.parked, tasteCalls: S.taste, deferredMinors: S.minors,
    sheets: S.sheets, agents: used, questions: S.questions, concerns: S.concerns, report: reportText(),
  }, extra || {})
  const unused = ANSWERS.filter((e) => !e.used)
  if (unused.length) { res.answersUnconsumed = true; log(`answers not consumed: ${unused.map((e) => e.at).join(', ')}`) }
  res.ledgerLines = ledgerLines(res)
  return res
}

// ---------- flow ----------
async function flow() {
  phase('Implement')
  log(`task ${N} "${A.title}" on ${A.branch} from ${h7(A.base)}; maxRounds ${MAX_ROUNDS}; maxAgents ${MAX_AGENTS}${RUNTIME ? '; runtime' : ''}`)
  log(`roles: implementer ${tierOf('implementer')}, verifyHead ${tierOf('verifyHead')}, critic ${tierOf('critic')}, verifier ${tierOf('verifier')}, gate ${tierOf('gate')}, fixer ${tierOf('fixer')}, escalated fixer ${tierOf('escalatedFixer')}, re-critic ${tierOf('reCritic')}`)
  if (IMPLEMENTED) log(`implement: skipped (implemented.head ${h7(IMPLEMENTED)}); reviewing ${h7(A.base)}..${h7(IMPLEMENTED)}`)
  else await implement()
  const hv = await verifyHead('verify-head-impl', A.base, IMPLEMENTED)
  S.head = hv.head
  S.commits.push(...hv.commits)
  if (S.head === A.base) halt('verifyHead', 'verifyHead', `git HEAD is still the base ${h7(A.base)}: the implementer made no commit`)
  log(`implement: head ${h7(S.head)}, ${hv.commits.length} commit(s)`)

  // Review: critic, verifier and gate-0 in parallel on the verified head.
  phase('Review')
  const reviewHead = S.head
  const rv = await block([
    { role: 'critic', label: 'critic', phase: 'Review', schema: CRITIC, prompt: criticPrompt(reviewHead) },
    { role: 'verifier', label: 'verifier', phase: 'Review', schema: FILM, prompt: verifierPrompt('r0', reviewHead, null, A.base) },
    { role: 'gate', label: 'gate-0', phase: 'Review', schema: GATE, prompt: gatePrompt('gate-0', reviewHead) },
  ])
  const missing = ['critic', 'verifier', 'gate-0'].filter((_, i) => !rv[i])
  if (missing.length) halt('review', 'review', `no result from ${missing.join(', ')}; there is no clean verdict without all three, so re-run the review stages with implemented: { head }`)
  S.gateOk = rv[2].ok
  sortCritic(rv[0].findings, 'critic:', open)
  for (const f of takeFilm(rv[1], 'r0').concat(gateFindings(rv[2]))) { open.push(f); track(f, 'open') }
  log(`review: critic ${rv[0].verdict}, ${open.length} open, ${S.taste.length} taste, ${S.minors.length} minor`)

  // Fix loop.
  let roundBase = S.head
  while (open.length && S.rounds < MAX_ROUNDS) {
    phase('Fix')
    const r = ++S.rounds
    const escalate = open.some((f) => (na[f.id] || 0) >= 1)
    const fixerRole = escalate ? 'escalatedFixer' : 'fixer'
    log(`fix: round ${r}/${MAX_ROUNDS}, ${open.length} open (${open.map((f) => f.id).join(', ')}); ${fixerRole} ${tierOf(fixerRole)}`)
    const fx = await ask(fixerRole, `fixer-r${r}`, 'Fix', WORK, fixerPrompt(open, r))
    if (!fx || fx.status === 'BLOCKED' || fx.status === 'NEEDS_CONTEXT') {
      if (fx) { S.questions.push(...fx.questions); S.concerns.push(...fx.concerns) }
      for (const f of open) { S.parked.push(Object.assign({}, f, { reason: `fixer-r${r} ${fx ? fx.status : 'returned no result'}` })) }
      S.roundLog.push(`fix round ${r}/${MAX_ROUNDS} (fixer ${fx ? fx.status : 'returned no result'})`)
      open = []
      break
    }
    S.concerns.push(...fx.concerns)
    addReport(`fixer-r${r}`, fx)
    const declinedIds = new Set()
    for (const d of fx.declined || []) {
      const f = open.find((o) => o.id === cleanId(d.id))
      if (!f || declinedIds.has(f.id)) continue
      declinedIds.add(f.id)
      S.parked.push(Object.assign({}, f, { reason: `declined by the fixer: ${d.reason}` }))
      setState(f.id, 'declined')
    }
    const active = open.filter((f) => !declinedIds.has(f.id))
    const vh = await verifyHead(`verify-head-r${r}`, roundBase)
    S.head = vh.head
    S.commits.push(...vh.commits)
    if (!active.length) { S.roundLog.push(`fix round ${r}/${MAX_ROUNDS} (every finding declined; head ${h7(S.head)})`); open = []; break }
    if (S.head === roundBase) {
      log(`fix: round ${r} made no commit; the findings stay open`)
      active.forEach((f) => { na[f.id] = (na[f.id] || 0) + 1 })
      S.roundLog.push(`fix round ${r}/${MAX_ROUNDS} (no new commit; ${active.length} open)`)
      open = active.filter((f) => f.src !== 'progress').concat(mk(`progress-r${r}`, 'the fixer made no commit for the open findings', 'progress'))
      for (const f of open) if (!S.findings.has(f.id)) track(f, 'open')
      continue
    }

    // Re-review the fix: re-critic (skipped when every open finding came from a gate), the verifier
    // re-filming the failed cases and whatever the diff could move, and the round's gate.
    phase('Review')
    const criticOpen = active.filter((f) => f.src === 'critic')
    const sideOpen = active.filter((f) => f.src !== 'critic' && f.src !== 'progress')
    const skipCritic = active.every((f) => f.src === 'gate')
    const refilm = [...new Set([...expectedCases(), ...cases.keys()])].filter((id) => !cases.has(id) || cases.get(id).result !== 'pass')
    const items = []
    if (!skipCritic) items.push({ role: 'reCritic', label: `re-critic-r${r}`, phase: 'Review', schema: RECRITIC, prompt: reCriticPrompt(criticOpen, sideOpen, r, roundBase, S.head) })
    items.push({ role: 'verifier', label: `verifier-r${r}`, phase: 'Review', schema: FILM, prompt: verifierPrompt(`r${r}`, S.head, refilm, roundBase) })
    items.push({ role: 'gate', label: `gate-r${r}`, phase: 'Review', schema: GATE, prompt: gatePrompt(`gate-r${r}`, S.head) })
    const res = await block(items)
    const [rc, film, gate] = skipCritic ? [null, res[0], res[1]] : res

    const next = []
    if (gate) { S.gateOk = gate.ok; next.push(...gateFindings(gate)) }
    else { S.gateOk = false; next.push(mk('gate:0', `gate-r${r} returned no result`, 'gate')) }
    if (film) next.push(...takeFilm(film, `r${r}`))
    else next.push(...active.filter((f) => f.src === 'film'), mk(`film:r${r}`, `verifier-r${r} returned no result; nothing was re-filmed`, 'film'))
    const verdicts = new Map(((rc && rc.verdicts) || []).map((x) => [cleanId(x.id), x]))
    for (const f of criticOpen) {
      const x = verdicts.get(f.id)
      if (!x || x.verdict !== 'ADDRESSED') next.push(Object.assign({}, f, { last: x ? `r${r} NOT ADDRESSED: ${x.evidence}` : `r${r}: no verdict` }))
    }
    if (rc) {
      const fresh = []
      sortCritic(rc.newFindings, `r${r}:`, fresh)
      next.push(...fresh)
    }
    for (const f of next) if (active.some((a) => a.id === f.id)) na[f.id] = (na[f.id] || 0) + 1
    for (const f of next) if (!S.findings.has(f.id) || f.src === 'gate') track(f, 'open') // a gate finding that survives shows the latest problem text
    for (const f of active) if (!next.some((n) => n.id === f.id)) setState(f.id, 'fixed')
    const closed = active.filter((f) => !next.some((n) => n.id === f.id)).length
    S.roundLog.push(`fix round ${r}/${MAX_ROUNDS} (${closed} addressed, ${next.length} open; head ${h7(S.head)})`)
    log(`fix: round ${r} done: ${closed} addressed, ${next.length} open`)
    open = next
    roundBase = S.head
  }

  for (const f of open) S.parked.push(Object.assign({}, f, { reason: `still open after round ${S.rounds}` }))
  if (open.length) log(`cap: ${open.length} finding(s) open after ${S.rounds} round(s); parked for the controller: ${open.map((f) => f.id).join(', ')}`)
  open = []
  return finish(S.parked.length || !S.gateOk || !filmsPass() ? 'parked' : 'complete')
}

try {
  return await flow()
} catch (e) {
  if (!e || !e.stop) throw e
  for (const f of open) S.parked.push(Object.assign({}, f, { reason: `run stopped at ${e.stop.stopped}` }))
  log(`${e.message}; stopping`)
  return finish('stopped', e.stop)
}
