// harness.mjs: mock harness for the saved Workflow scripts in .claude/workflows
// (bdl-task.js, bdl-wave.js). It runs no agents and touches no repo files.
//
// Usage (repo root, PowerShell or Git Bash): node scripts/workflows/harness.mjs
//
// Each script body is wrapped in an async function, imported from a data: URL (which also proves
// it parses), and run against stubbed agent(), parallel(), phase(), log() and workflow(). The
// agent stub checks every call: model set, effort set unless Haiku, no Haiku effort, no xhigh or
// max, no "undefined" in a prompt, the no-remote rule in every prompt, the full rules list in
// every prompt but the git read, the read-only rule in every read-only role, and every mock return
// valid against the call's schema. A fixture plays git (a head that moves when an implementer or
// fixer "commits") and answers every verify-head agent from it. A Map plays the runtime's cache
// so a resumed run can be shown to replay.
//
// Options:
//   --workflows-dir <dir>  load the workflow files from <dir> instead of .claude/workflows (the
//                          mutation check, scripts/workflows/mutants.mjs, uses this).
//   --only <text>          run only the scenarios whose name contains <text>.
// Exit code 0 when every scenario passes, 1 otherwise.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { appendText, decodeText, findLedgerLines, freshLines } from './append-ledger.mjs'

const NL = String.fromCharCode(10)
const CR = String.fromCharCode(13)
const NUL = String.fromCharCode(0)
const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(HERE, '..', '..')
function optArg(name) {
  const i = process.argv.indexOf(name)
  if (i === -1) return undefined
  const v = process.argv[i + 1]
  if (!v || v.startsWith('--')) {
    console.error(`harness: ${name} needs a value`)
    process.exit(2)
  }
  return v
}
const WF_DIR = optArg('--workflows-dir') ? path.resolve(optArg('--workflows-dir')) : path.join(REPO_ROOT, '.claude', 'workflows')
const ONLY = optArg('--only')

// ---------- loading ----------
function readWf(file) {
  return fs.readFileSync(path.join(WF_DIR, file), 'utf8').split(CR).join('')
}
function metaEnd(src) {
  const at = src.indexOf('export const meta')
  const close = src.indexOf(NL + '}' + NL, at)
  assert.ok(at >= 0 && close > at, 'no export const meta literal that ends with a closing brace on its own line')
  return { at, end: close + 3 }
}
async function load(file) {
  const src = readWf(file)
  const { end } = metaEnd(src)
  const wrapped = `${src.slice(0, end)}export default async function __wf__(agent, parallel, phase, log, args, workflow) {${NL}${src.slice(end)}${NL}}${NL}`
  return import(`data:text/javascript;base64,${Buffer.from(wrapped).toString('base64')}`)
}

// ---------- schema checks ----------
function checkSchema(schema, p = '$') {
  if (schema.type === 'object') {
    for (const r of schema.required || []) assert.ok(r in (schema.properties || {}), `schema ${p}: required "${r}" not in properties`)
    for (const [k, s] of Object.entries(schema.properties || {})) checkSchema(s, `${p}.${k}`)
  } else if (schema.type === 'array') checkSchema(schema.items, `${p}[]`)
}
function validate(schema, v, p = '$') {
  if (schema.type === 'object') {
    assert.ok(v && typeof v === 'object' && !Array.isArray(v), `${p} not an object`)
    for (const r of schema.required || []) assert.ok(r in v, `${p}.${r} missing`)
    for (const [k, s] of Object.entries(schema.properties || {})) if (k in v) validate(s, v[k], `${p}.${k}`)
  } else if (schema.type === 'array') {
    assert.ok(Array.isArray(v), `${p} not an array`)
    for (const [i, x] of v.entries()) validate(schema.items, x, `${p}[${i}]`)
  } else if (schema.type === 'string') {
    assert.equal(typeof v, 'string', `${p} not a string`)
    if (schema.enum) assert.ok(schema.enum.includes(v), `${p} "${v}" not in enum`)
  } else if (schema.type === 'boolean') assert.equal(typeof v, 'boolean', `${p} not a boolean`)
}

// ---------- the agent stub ----------
const NO_REMOTE = 'Never run git push, gh pr (any subcommand), gh api writes'
const READONLY = 'read-only on this checkout'
const READ_ONLY_LABEL = /^(verify-head|critic|re-critic|verifier|gate)/
// sub: the module a nested workflow({ scriptPath }) runs. cache: a Map playing the runtime cache.
async function run(mod, args, responder, o = {}) {
  const calls = []
  const logs = []
  const childArgs = []
  const violations = []
  let hits = 0
  const agent = async (prompt, opts) => {
    try {
      assert.ok(opts.model, `agent ${opts.label} has no model`)
      assert.ok(['haiku', 'sonnet', 'opus'].includes(opts.model), `agent ${opts.label} model ${opts.model}`)
      if (opts.model === 'haiku') assert.equal(opts.effort, undefined, `Haiku with effort on ${opts.label}`)
      else assert.ok(['low', 'medium', 'high'].includes(opts.effort) || o.allowHot, `bad effort ${opts.effort} on ${opts.label}`)
      assert.ok(!/undefined|\[object Object\]/.test(prompt), `prompt of ${opts.label} has undefined or [object Object]`)
      assert.ok(prompt.includes(NO_REMOTE), `prompt of ${opts.label} lacks the no-remote rule`)
      if (!opts.label.startsWith('verify-head')) {
        assert.ok(prompt.includes('BDL_GPU=1') && prompt.includes('Your assigned port:'), `prompt of ${opts.label} lacks the full rules list`)
      }
      if (READ_ONLY_LABEL.test(opts.label)) assert.ok(prompt.includes(READONLY), `prompt of ${opts.label} lacks the read-only rule`)
      if (opts.schema) checkSchema(opts.schema)
      assert.ok(calls.length < 100, 'runaway loop: more than 100 agent calls')
    } catch (e) {
      violations.push(e.message)
      throw e
    }
    const call = { label: opts.label, model: opts.model, effort: opts.effort, prompt, opts, cached: false }
    calls.push(call)
    const key = opts.label + NUL + prompt
    if (o.cache && o.cache.has(key)) {
      hits++
      call.cached = true
      return structuredClone(o.cache.get(key))
    }
    const r = responder(opts.label, prompt, calls)
    if (r && opts.schema) validate(opts.schema, r, opts.label)
    if (o.cache) o.cache.set(key, r ?? null)
    return r ?? null
  }
  const parallel = async (thunks) => Promise.all(thunks.map((t) => t().catch(() => null)))
  const nested = async () => {
    throw new Error('workflow(): nesting is one level only')
  }
  const workflow = async (ref, a) => {
    assert.ok(o.sub, 'workflow() called with no sub-workflow module')
    assert.ok(ref && typeof ref.scriptPath === 'string', 'workflow() needs { scriptPath }')
    childArgs.push({ scriptPath: ref.scriptPath, args: a })
    return o.sub.default(agent, parallel, () => {}, (m) => logs.push(m), a, nested)
  }
  const res = await mod.default(agent, parallel, () => {}, (m) => logs.push(m), args, workflow)
  assert.deepEqual(violations, [], 'agent stub violations')
  const labels = calls.map((c) => c.label).filter((l) => !l.startsWith('verify-head'))
  const find = (l) => calls.find((c) => c.label === l)
  const text = (l) => (find(l) || { prompt: '' }).prompt
  return { res, calls, logs, labels, find, text, hits, childArgs }
}

// ---------- fixtures ----------
const hex40 = (s) => (/^[0-9a-f]{40}$/.test(s) ? s : crypto.createHash('sha1').update(String(s)).digest('hex'))
const BASE_SHA = hex40('base')
const newGit = () => ({ head: BASE_SHA, n: 0 })
const commit = (g, name) => {
  g.head = hex40(`${name}-${++g.n}`)
}
const work = (extra = {}) => ({ status: 'DONE', concerns: [], questions: [], report: 'did the task; npm run verify green', ...extra })
const F = (id, severity, extra = {}) => ({ id, severity, file: 'src/a.css', line: '12', summary: `bad ${id}`, fix: 'do x', ...extra })
const PASS = { verdict: 'pass', findings: [] }
const failWith = (...fs) => ({ verdict: 'fail', findings: fs })
const GPU = 'ANGLE (NVIDIA GeForce RTX 3070 Direct3D11)'
const idsOf = (p) => [...p.matchAll(/^- \[([^\]]+)\]/gm)].map((m) => m[1])
const caseIds = (p) => [...p.matchAll(/^- ([\w.-]+): /gm)].map((m) => m[1])
const filmOf = (ids, over = {}) => ({
  cases: ids.map((id) => ({ id, result: over[id] || 'pass', evidence: over[id] ? `frame 3 at 820 shows ${id} broken` : 'ok', sheet: `C:/w/sheets/${id}.jpg` })),
  renderer: GPU,
  index: 'C:/w/sheets/index.md',
})
const BASE = {
  task: 7,
  title: 'Glass arrival polish',
  repoDir: 'C:\\git\\birchdesignlab',
  branch: 'feat/glass-polish',
  base: BASE_SHA,
  briefPath: 'C:/w/brief.md',
  reportPath: 'C:/w/report.md',
  workDir: 'C:\\w',
  scratchRoot: 'C:\\s',
  runLabel: 'b3-t7',
  owns: ['src/pages/t/glass/**', 'src/styles/glass.css'],
  ports: [4460, 4461, 4462],
  trailer: 'Co-Authored-By: X <x@example.com>',
  school: 'glass',
  films: [{ id: 'arrive-820', what: 'arrival at 820', sizes: [820] }, { id: 'lens-390', what: 'lens on a phone' }],
}
function dflt(label, prompt, g, films) {
  if (label.startsWith('verify-head')) {
    const since = (/--oneline (\S+?)\.\.HEAD/.exec(prompt) || [])[1]
    return { revParse: `${g.head}${NL}`, catFile: `EXISTS ${g.head}${NL}`, log: since === g.head ? '' : `${g.head.slice(0, 7)} a commit${NL}` }
  }
  if (label.startsWith('implementer')) { commit(g, 'impl'); return work() }
  if (label.startsWith('fixer')) { commit(g, label); return work({ declined: [] }) }
  if (label === 'critic') return PASS
  if (label.startsWith('re-critic')) return { verdicts: idsOf(prompt).map((id) => ({ id, verdict: 'ADDRESSED', evidence: 'a.css:2' })), newFindings: [] }
  if (label.startsWith('verifier')) return filmOf(prompt.includes('Re-film only') ? caseIds(prompt) : films.map((f) => f.id))
  if (label.startsWith('gate')) return { ok: true, problems: [] }
  return null
}
// over: label (or prefix*) -> value, or (prompt, calls, label, g, dflt) => value
function rsp(over = {}, g = newGit(), films = BASE.films) {
  return (label, prompt, calls) => {
    for (const [k, v] of Object.entries(over)) {
      if (label === k || (k.endsWith('*') && label.startsWith(k.slice(0, -1)))) {
        return typeof v === 'function' ? v(prompt, calls, label, g, () => dflt(label, prompt, g, films)) : v
      }
    }
    return dflt(label, prompt, g, films)
  }
}
const COMPLETE_LABELS = ['implementer', 'verify-head-impl', 'critic', 'verifier', 'gate-0']
const stuck = (prompt) => ({ verdicts: idsOf(prompt).map((id) => ({ id, verdict: 'NOT ADDRESSED', evidence: 'still there' })), newFindings: [] })

// ---------- runner ----------
const results = []
async function test(name, fn) {
  if (ONLY && !name.includes(ONLY)) return
  try {
    await fn()
    results.push([true, name])
  } catch (e) {
    results.push([false, name, e.message])
  }
}
const throwsAsync = async (fn, re) => {
  try {
    await fn()
  } catch (e) {
    assert.match(e.message, re)
    return
  }
  assert.fail(`expected a throw matching ${re}`)
}

const task = await load('bdl-task.js')
const wave = await load('bdl-wave.js')
const stub = await load('smoke/bdl-task-stub.js')

// ================= bdl-task: flow =================
await test('task: happy path is 5 agents with the default roles and a head from git', async () => {
  const r = await run(task, BASE, rsp())
  assert.deepEqual(r.labels, ['implementer', 'critic', 'verifier', 'gate-0'])
  assert.deepEqual(r.calls.map((c) => c.label), COMPLETE_LABELS)
  assert.equal(r.res.status, 'complete')
  assert.equal(r.res.agents, 5)
  assert.equal(r.res.head, hex40('impl-1'))
  assert.equal(r.res.commits.length, 1)
  const role = (l) => `${r.find(l).model}/${r.find(l).effort}`
  assert.equal(role('implementer'), 'sonnet/medium')
  assert.equal(role('critic'), 'opus/high')
  assert.equal(role('verifier'), 'sonnet/high')
  assert.equal(role('gate-0'), 'sonnet/low')
  assert.equal(r.find('verify-head-impl').model, 'haiku')
  assert.equal(r.find('verify-head-impl').effort, undefined)
  assert.match(r.text('verifier'), /arrive-820/)
  assert.match(r.text('verifier'), /1440, 1280, 1024, 820, 390/)
  assert.match(r.text('critic'), /Schools: glass/)
  assert.match(r.text('implementer'), /C:\/git\/birchdesignlab/, 'backslashes became forward slashes')
  assert.match(r.res.ledgerLines.at(-1), /^- Task 7: complete \(commits aaaaaaa|^- Task 7: complete \(commits [0-9a-f]{7}\.\.[0-9a-f]{7}, review clean, gate green, films pass; 5 agents\)/)
})

await test('task: one fix round is 10 agents and the re-critic, verifier and gate run beside each other', async () => {
  const r = await run(task, BASE, rsp({ critic: () => failWith(F('C1', 'blocker')) }))
  assert.deepEqual(r.calls.map((c) => c.label), [...COMPLETE_LABELS, 'fixer-r1', 'verify-head-r1', 're-critic-r1', 'verifier-r1', 'gate-r1'])
  assert.equal(r.res.status, 'complete')
  assert.equal(r.res.rounds, 1)
  assert.equal(r.res.agents, 10)
  assert.equal(r.find('fixer-r1').effort, 'medium')
  assert.equal(r.find('re-critic-r1').model + '/' + r.find('re-critic-r1').effort, 'opus/medium')
  assert.match(r.text('fixer-r1'), /\[critic:C1\] BLOCKER/)
  assert.match(r.text('re-critic-r1'), /\[critic:C1\]/)
  assert.match(r.text('verifier-r1'), /Re-film only/)
  assert.equal(r.res.findings.find((f) => f.id === 'critic:C1').state, 'fixed')
  assert.equal(r.res.head, hex40('fixer-r1-2'))
  assert.equal(r.res.commits.length, 2)
})

await test('task: reports travel in the structured output, never only in a file', async () => {
  const r = await run(task, BASE, rsp({
    implementer: (p, c, l, g, next) => ({ ...next(), report: 'IMPL-REPORT-TEXT' }),
    critic: () => failWith(F('C1', 'blocker')),
    'fixer-r1': (p, c, l, g, next) => ({ ...next(), report: 'FIX-REPORT-TEXT' }),
  }))
  assert.match(r.text('critic'), /IMPL-REPORT-TEXT/, 'the critic sees the implementer report inline')
  assert.match(r.text('fixer-r1'), /IMPL-REPORT-TEXT/, 'the fixer sees the report so far inline')
  assert.match(r.res.report, /\[implementer\] IMPL-REPORT-TEXT/)
  assert.match(r.res.report, /\[fixer-r1\] FIX-REPORT-TEXT/)
  assert.match(r.text('implementer'), /if a tool refuses, skip the file/)
})

await test('task: findings still open after round 2 park, with the escalated fixer on round 2 (15 agents)', async () => {
  const r = await run(task, { ...BASE, maxAgents: 15 }, rsp({ critic: () => failWith(F('C1', 'important')), 're-critic*': (p) => stuck(p) }))
  assert.equal(r.res.status, 'parked')
  assert.equal(r.res.rounds, 2)
  assert.equal(r.res.agents, 15)
  assert.equal(r.res.parked.length, 1)
  assert.equal(r.res.parked[0].id, 'critic:C1')
  assert.match(r.res.parked[0].reason, /still open after round 2/)
  assert.equal(`${r.find('fixer-r1').model}/${r.find('fixer-r1').effort}`, 'sonnet/medium')
  assert.equal(`${r.find('fixer-r2').model}/${r.find('fixer-r2').effort}`, 'sonnet/high')
  assert.match(r.text('fixer-r2'), /r1 NOT ADDRESSED/)
  assert.ok(!r.labels.includes('fixer-r3'))
  assert.match(r.res.ledgerLines.at(-1), /^- Task 7: parked/)
})

await test('task: maxRounds is clamped to 1..4 and coerced', async () => {
  const hi = await run(task, { ...BASE, maxRounds: 9, maxAgents: 60 }, rsp({ critic: () => failWith(F('C1', 'important')), 're-critic*': (p) => stuck(p) }))
  assert.equal(hi.res.rounds, 4)
  const str = await run(task, { ...BASE, maxRounds: '1' }, rsp({ critic: () => failWith(F('C1', 'important')), 're-critic*': (p) => stuck(p) }))
  assert.equal(str.res.rounds, 1)
  assert.equal(str.res.status, 'parked')
  const lo = await run(task, { ...BASE, maxRounds: 0 }, rsp({ critic: () => failWith(F('C1', 'important')), 're-critic*': (p) => stuck(p) }))
  assert.equal(lo.res.rounds, 1)
})

await test('task: taste and minor findings never reach a fixer', async () => {
  const only = await run(task, BASE, rsp({ critic: () => failWith(F('T1', 'taste'), F('M1', 'minor')) }))
  assert.equal(only.res.status, 'complete')
  assert.equal(only.res.agents, 5)
  assert.equal(only.res.tasteCalls[0].id, 'critic:T1')
  assert.equal(only.res.deferredMinors[0].id, 'critic:M1')
  assert.ok(only.res.ledgerLines.some((l) => /taste call: critic:T1/.test(l)))
  assert.ok(only.res.ledgerLines.some((l) => /minor \(deferred\): critic:M1/.test(l)))
  const mixed = await run(task, BASE, rsp({ critic: () => failWith(F('T1', 'taste'), F('M1', 'minor'), F('I1', 'important')) }))
  assert.match(mixed.text('fixer-r1'), /critic:I1/)
  assert.ok(!/critic:T1|critic:M1/.test(mixed.text('fixer-r1')))
  assert.ok(!/critic:T1|critic:M1/.test(mixed.text('re-critic-r1')))
  assert.equal(mixed.res.tasteCalls.length, 1)
  assert.equal(mixed.res.findings.find((f) => f.id === 'critic:T1').state, 'taste')
})

await test('task: a finding the fixer declines parks and gets no re-review', async () => {
  const r = await run(task, BASE, rsp({ critic: () => failWith(F('C1', 'important')), 'fixer-r1': () => work({ declined: [{ id: 'critic:C1', reason: 'it is a false alarm: the rule is in the built CSS' }] }) }))
  assert.equal(r.res.status, 'parked')
  assert.match(r.res.parked[0].reason, /declined by the fixer: it is a false alarm/)
  assert.deepEqual(r.labels, ['implementer', 'critic', 'verifier', 'gate-0', 'fixer-r1'])
  assert.equal(r.res.findings.find((f) => f.id === 'critic:C1').state, 'declined')
  const mixed = await run(task, BASE, rsp({ critic: () => failWith(F('C1', 'important'), F('C2', 'important')), 'fixer-r1': (p, c, l, g) => { commit(g, 'fx'); return work({ declined: [{ id: '[critic:C1]', reason: 'not a defect' }] }) } }))
  assert.equal(mixed.res.status, 'parked')
  assert.deepEqual(mixed.res.parked.map((p) => p.id), ['critic:C1'])
  assert.match(mixed.text('re-critic-r1'), /critic:C2/)
  assert.ok(!/critic:C1/.test(mixed.text('re-critic-r1')))
})

await test('task: a round with no new commit stays open without a review block', async () => {
  const r = await run(task, BASE, rsp({ critic: () => failWith(F('C1', 'important')), 'fixer-r*': () => work() }))
  assert.equal(r.res.status, 'parked')
  assert.deepEqual(r.labels, ['implementer', 'critic', 'verifier', 'gate-0', 'fixer-r1', 'fixer-r2'])
  assert.match(r.text('fixer-r2'), /progress-r1/)
  assert.equal(`${r.find('fixer-r2').model}/${r.find('fixer-r2').effort}`, 'sonnet/high')
})

await test('task: a failed or unfilmed case is an important finding, re-filmed after the fix', async () => {
  const r = await run(task, BASE, rsp({ verifier: () => filmOf(['arrive-820', 'lens-390'], { 'arrive-820': 'fail' }) }))
  assert.match(r.text('fixer-r1'), /\[film:arrive-820\] IMPORTANT/)
  assert.match(r.text('verifier-r1'), /Re-film only[^]*- arrive-820: arrival at 820/)
  assert.equal(r.res.status, 'complete')
  assert.ok(r.labels.includes('re-critic-r1'), 'film-only findings still get the re-critic')
  const missing = await run(task, BASE, rsp({ verifier: () => filmOf(['arrive-820']) }))
  assert.match(missing.text('fixer-r1'), /\[film:lens-390\][^]*was not filmed/)
  assert.deepEqual(missing.res.findings.map((f) => f.id), ['film:lens-390'])
})

await test('task: films that ran on a software renderer are a finding', async () => {
  const r = await run(task, BASE, rsp({ verifier: () => ({ ...filmOf(['arrive-820', 'lens-390']), renderer: 'Google SwiftShader' }) }))
  assert.match(r.text('fixer-r1'), /\[film:renderer\][^]*GPU/)
})

await test('task: a red gate-0 skips the re-critic when every open finding came from a gate', async () => {
  const r = await run(task, BASE, rsp({ 'gate-0': { ok: false, problems: ['npm run verify: astro check failed in a.astro'] } }))
  assert.match(r.text('fixer-r1'), /\[gate:1\][^]*astro check failed/)
  assert.deepEqual(r.calls.map((c) => c.label), [...COMPLETE_LABELS, 'fixer-r1', 'verify-head-r1', 'verifier-r1', 'gate-r1'])
  assert.equal(r.res.agents, 9)
  assert.equal(r.res.status, 'complete')
  const still = await run(task, BASE, rsp({ 'gate-*': { ok: false, problems: ['still red'] } }))
  assert.equal(still.res.status, 'parked')
})

await test('task: a gate that stays red matches its earlier finding, escalates the fixer and is not counted as addressed', async () => {
  const r = await run(task, BASE, rsp({ 'gate-*': { ok: false, problems: ['npm run verify: astro check failed in a.astro'] } }))
  assert.equal(r.res.status, 'parked')
  assert.equal(r.res.rounds, 2)
  assert.deepEqual(r.calls.map((c) => c.label), [...COMPLETE_LABELS, 'fixer-r1', 'verify-head-r1', 'verifier-r1', 'gate-r1', 'fixer-r2', 'verify-head-r2', 'verifier-r2', 'gate-r2'])
  assert.equal(`${r.find('fixer-r1').model}/${r.find('fixer-r1').effort}`, 'sonnet/medium')
  assert.equal(`${r.find('fixer-r2').model}/${r.find('fixer-r2').effort}`, 'sonnet/high', 'a gate that is still red brings in the escalated fixer')
  assert.match(r.text('fixer-r2'), /\[gate:1\]/)
  assert.deepEqual(r.res.parked.map((p) => p.id), ['gate:1'])
  assert.equal(r.res.findings.filter((f) => f.id.startsWith('gate')).length, 1, 'one stable id, not gate-0:1 then gate-r1:1')
  assert.equal(r.res.findings.find((f) => f.id === 'gate:1').state, 'open')
  assert.ok(r.res.ledgerLines.some((l) => /fix round 1\/2 \(0 addressed, 1 open/.test(l)), 'a red gate is not counted as addressed')
  // A gate that goes green after the fix closes the finding.
  let n = 0
  const green = await run(task, BASE, rsp({ 'gate-0': { ok: false, problems: ['red'] }, 'gate-r1': () => { n++; return { ok: true, problems: [] } } }))
  assert.equal(green.res.status, 'complete')
  assert.equal(green.res.findings.find((f) => f.id === 'gate:1').state, 'fixed')
  assert.equal(n, 1)
})

await test('task: the gate runs npm run verify under the render lock, never bare', async () => {
  const r = await run(task, BASE, rsp())
  const p = r.text('gate-0')
  assert.match(p, /node scripts\/workflows\/verify-locked\.mjs --log C:\/s\/b3-t7\/gate-0\/verify\.log/)
  assert.match(p, /never run npm run verify bare/)
  assert.ok(!/Run npm run verify \(vitest/.test(p), 'the old bare instruction is gone')
  const wrapper = fs.readFileSync(path.join(HERE, 'verify-locked.mjs'), 'utf8')
  assert.match(wrapper, /import \{ acquireLock, releaseLock \} from '\.\.\/themes\/lib\/render-lock\.mjs'/)
  assert.ok(wrapper.indexOf('await acquireLock(') < wrapper.indexOf('spawn(command.join'), 'the lock is taken before the build starts')
  assert.match(wrapper, /process\.on\('exit', \(\) => releaseLock\(\)\)/)
})

await test('task: verify-locked.mjs holds the lock while the command runs, releases it after and passes the exit code on', async () => {
  const lockDir = path.join(REPO_ROOT, 'scripts', 'themes', '.out', '.render-lock')
  if (fs.existsSync(lockDir)) return // another build holds the real lock; the wrapper test would queue behind it
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bdl-wf-'))
  try {
    const log = path.join(dir, 'sub', 'verify.log')
    const probe = `node -e "const fs=require('fs');console.log('HELD='+fs.existsSync(process.argv[1]));process.exit(Number(process.argv[2]))" "${lockDir}" `
    const go = (code, ...extra) => spawnSync(process.execPath, [path.join(HERE, 'verify-locked.mjs'), ...extra, '--', `${probe}${code}`], { encoding: 'utf8', cwd: REPO_ROOT })
    const ok = go(0, '--log', log)
    assert.equal(ok.status, 0, ok.stdout + ok.stderr)
    assert.match(ok.stdout, /HELD=true/)
    assert.match(fs.readFileSync(log, 'utf8'), /HELD=true/)
    assert.ok(!fs.existsSync(lockDir), 'the lock is released after the command')
    const red = go(3)
    assert.equal(red.status, 3, 'the command exit code is the wrapper exit code')
    assert.ok(!fs.existsSync(lockDir), 'the lock is released after a red command')
    assert.equal(spawnSync(process.execPath, [path.join(HERE, 'verify-locked.mjs'), '--bogus'], { encoding: 'utf8' }).status, 2)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

await test('task: complete needs a green last gate and every film case passed', async () => {
  const r = await run(task, { ...BASE, maxRounds: 1 }, rsp({ critic: () => failWith(F('C1', 'blocker')), 'gate-r1': { ok: false, problems: ['red'] } }))
  assert.equal(r.res.status, 'parked')
  assert.deepEqual(r.res.parked.map((p) => p.id), ['gate:1'])
  const ok = await run(task, { ...BASE, films: [] }, rsp({}, newGit(), []))
  assert.equal(ok.res.status, 'complete')
})

await test('task: a null critic, verifier or gate stops the run at review', async () => {
  for (const [l, label] of [['critic', 'critic'], ['verifier', 'verifier'], ['gate-0', 'gate-0']]) {
    const r = await run(task, BASE, rsp({ [l]: null }))
    assert.equal(r.res.status, 'stopped')
    assert.equal(r.res.stopped, 'review')
    assert.match(r.res.problem, new RegExp(label))
  }
})

await test('task: a fixer that is blocked parks the open findings', async () => {
  const r = await run(task, BASE, rsp({ critic: () => failWith(F('C1', 'important')), 'fixer-r1': () => work({ status: 'BLOCKED', questions: ['which easing?'] }) }))
  assert.equal(r.res.status, 'parked')
  assert.deepEqual(r.res.questions, ['which easing?'])
  assert.equal(r.res.parked[0].id, 'critic:C1')
})

// ================= bdl-task: stops, answers, budget =================
await test('task: budget stop at the cap, and a cache-stable budget answer resumes where it stopped', async () => {
  const cache = new Map()
  const g = newGit()
  const over = { critic: () => failWith(F('C1', 'important')) }
  const a = { ...BASE, maxAgents: 8 }
  const r1 = await run(task, a, rsp(over, g), { cache })
  assert.equal(r1.res.status, 'stopped')
  assert.equal(r1.res.stopped, 'budget')
  assert.equal(r1.res.stopPoint, 'budget')
  assert.match(r1.res.problem, /maxAgents 8/)
  assert.equal(r1.res.agents, 7)
  assert.ok(!r1.labels.includes('re-critic-r1'), 'the parallel block was not split')
  assert.equal(r1.res.parked[0].id, 'critic:C1')
  const r2 = await run(task, { ...a, answers: [{ at: 'budget', text: 'founder says go on' }] }, rsp(over, g), { cache })
  assert.equal(r2.res.status, 'complete')
  assert.equal(r2.hits, 7, 'every call of the first run replays from cache')
  assert.ok(r2.calls.slice(0, 7).every((c) => c.cached))
  assert.ok(r2.calls.every((c) => !c.prompt.includes('founder says go on')), 'a budget answer reaches no agent')
  assert.ok(r2.logs.some((l) => /maxAgents now 22/.test(l)))
  assert.equal(r2.res.agents, 10)
})

await test('task: a single call that would pass the cap stops the run too', async () => {
  const r = await run(task, { ...BASE, maxAgents: 6 }, rsp({ critic: () => failWith(F('C1', 'important')) }))
  assert.equal(r.res.stopped, 'budget')
  assert.match(r.res.problem, /agent 7 would exceed maxAgents 6 at verify-head-r1/)
  assert.equal(r.res.agents, 6)
  assert.deepEqual(r.labels.slice(-1), ['fixer-r1'])
})

await test('task: the default cap of 14 stops the worst case at budget', async () => {
  const r = await run(task, BASE, rsp({ critic: () => failWith(F('C1', 'important')), 're-critic*': (p) => stuck(p) }))
  assert.equal(r.res.stopped, 'budget')
  assert.match(r.res.problem, /agent 15 would exceed maxAgents 14 at re-critic-r2, verifier-r2, gate-r2/)
  assert.equal(r.res.agents, 12)
})

await test('task: implementer stop, and its answer reaches only implementer-continue', async () => {
  const cache = new Map()
  const g = newGit()
  const over = { implementer: () => work({ status: 'NEEDS_CONTEXT', questions: ['which clip?'] }) }
  const r1 = await run(task, BASE, rsp(over, g), { cache })
  assert.equal(r1.res.status, 'stopped')
  assert.equal(r1.res.stopped, 'implementer')
  assert.deepEqual(r1.res.questions, ['which clip?'])
  assert.deepEqual(r1.labels, ['implementer'])
  const ans = [{ at: 'implementer', text: 'use clip A' }]
  const r2 = await run(task, { ...BASE, answers: ans }, rsp(over, g), { cache })
  assert.equal(r2.res.status, 'complete')
  assert.equal(r2.labels[0], 'implementer')
  assert.equal(r2.calls[0].cached, true)
  assert.equal(r2.labels[1], 'implementer-continue')
  assert.equal(r2.calls.filter((c) => c.prompt.includes('use clip A')).length, 1)
  assert.equal(r2.res.answersUnconsumed, undefined, 'a consumed answer is marked used')
  assert.match(r2.text('implementer-continue'), /which clip\?/)
  assert.equal(`${r2.find('implementer-continue').model}/${r2.find('implementer-continue').effort}`, 'sonnet/medium')
  const unused = await run(task, { ...BASE, answers: ans }, rsp({}, newGit()))
  assert.equal(unused.res.answersUnconsumed, true)
})

await test('task: precondition stop at the implementer and its retry', async () => {
  const cache = new Map()
  const g = newGit()
  const over = { implementer: () => work({ status: 'BLOCKED', preconditionFailed: 'untracked: scratch.txt' }) }
  const r1 = await run(task, BASE, rsp(over, g), { cache })
  assert.equal(r1.res.stopped, 'precondition')
  assert.equal(r1.res.stopPoint, 'precondition:implementer')
  assert.match(r1.res.problem, /scratch\.txt/)
  assert.deepEqual(r1.labels, ['implementer'])
  for (const at of ['precondition:implementer', 'precondition']) {
    const over2 = { implementer: (p, c, l, gg, d) => (l === 'implementer-retry' ? d() : over.implementer()) }
    const r2 = await run(task, { ...BASE, answers: [{ at, text: 'removed scratch.txt' }] }, rsp(over2, newGit()))
    assert.equal(r2.res.status, 'complete')
    assert.equal(r2.labels[1], 'implementer-retry')
    assert.match(r2.text('implementer-retry'), /removed scratch\.txt/)
    assert.ok(!r2.text('implementer').includes('removed scratch.txt'))
  }
})

await test('task: a plain precondition answer reaches only the first failure, never a second agent', async () => {
  const g = newGit()
  let impl = 0
  let vh = 0
  const over = {
    implementer: (p, c, l, gg, d) => (++impl === 1 ? work({ status: 'BLOCKED', preconditionFailed: 'dirty' }) : d()),
    'verify-head-impl': (p, c, l, gg, d) => (++vh === 1 ? { revParse: 'junk', catFile: 'MISSING', log: '' } : d()),
  }
  const r = await run(task, { ...BASE, answers: [{ at: 'precondition', text: 'looked at it' }] }, rsp(over, g))
  assert.equal(r.res.status, 'stopped')
  assert.equal(r.res.stopPoint, 'precondition:verifyHead')
  assert.equal(r.calls.filter((c) => c.prompt.includes('looked at it')).length, 1)
  assert.deepEqual(r.calls.map((c) => c.label), ['implementer', 'implementer-retry', 'verify-head-impl'])
})

const trace = (r) => r.calls.map((c) => c.label + (c.cached ? '(c)' : '')).join(' ')

await test('task: plain precondition answers resume across three runs, one per failing consumer in call order (implementer, then verifyHead)', async () => {
  const cache = new Map()
  const g = newGit()
  // The implementer always reports a failed precondition; its retry commits, but fails the precondition again once HEAD has moved
  // (a fresh re-run on a moved HEAD), so a retry whose cached prompt changed shows up as a stop. verify-head-impl fails until answered.
  const over = {
    implementer: () => work({ status: 'BLOCKED', preconditionFailed: 'dirty' }),
    'implementer-retry': (p, c, l, gg, d) => (gg.head !== BASE_SHA ? work({ status: 'BLOCKED', preconditionFailed: 'HEAD is not base' }) : d()),
    'verify-head-impl': { revParse: 'junk', catFile: 'MISSING', log: '' },
  }
  const P1 = { at: 'precondition', text: 'cleaned the tree' }
  const P2 = { at: 'precondition', text: 'git is readable now' }
  const r1 = await run(task, BASE, rsp(over, g), { cache })
  assert.equal(r1.res.stopPoint, 'precondition:implementer')
  const r2 = await run(task, { ...BASE, answers: [P1] }, rsp(over, g), { cache })
  assert.equal(r2.res.stopPoint, 'precondition:verifyHead', trace(r2))
  assert.equal(trace(r2), 'implementer(c) implementer-retry verify-head-impl')
  const r3 = await run(task, { ...BASE, answers: [P1, P2] }, rsp(over, g), { cache })
  assert.equal(r3.res.status, 'complete', `${r3.res.stopPoint} ${r3.res.problem} ${trace(r3)}`)
  assert.ok(r3.calls.find((c) => c.label === 'implementer-retry').cached, 'the answer for the verifyHead stop was swallowed by the implementer retry')
  assert.equal(r3.calls.filter((c) => c.prompt.includes('cleaned the tree')).length, 1)
  assert.equal(r3.calls.filter((c) => c.prompt.includes('git is readable now')).length, 1)
  assert.ok(r3.text('verify-head-impl-retry').includes('git is readable now'))
  assert.ok(!r3.text('verify-head-impl-retry').includes('cleaned the tree'))
  assert.equal(r3.res.answersUnconsumed, undefined)
})

await test('task: two verifyHead stops are answered in order across three runs, and the first retry replays from cache', async () => {
  const cache = new Map()
  const g = newGit()
  const bad = { revParse: 'junk', catFile: 'MISSING', log: '' }
  const over = { critic: () => failWith(F('C1', 'important')), 'verify-head-impl': bad, 'verify-head-r1': bad }
  const V1 = { at: 'precondition:verifyHead', text: 'first answer' }
  const V2 = { at: 'precondition:verifyHead', text: 'second answer' }
  const r1 = await run(task, BASE, rsp(over, g), { cache })
  assert.equal(r1.res.stopPoint, 'precondition:verifyHead')
  const r2 = await run(task, { ...BASE, answers: [V1] }, rsp(over, g), { cache })
  assert.equal(r2.res.stopPoint, 'precondition:verifyHead')
  assert.equal(trace(r2), 'implementer(c) verify-head-impl(c) verify-head-impl-retry critic verifier gate-0 fixer-r1 verify-head-r1')
  const r3 = await run(task, { ...BASE, answers: [V1, V2] }, rsp(over, g), { cache })
  assert.equal(r3.res.status, 'complete', `${r3.res.stopPoint} ${trace(r3)}`)
  assert.ok(r3.calls.find((c) => c.label === 'verify-head-impl-retry').cached, 'verify-head-impl-retry replays; it did not receive the second answer')
  assert.ok(r3.text('verify-head-impl-retry').includes('first answer') && !r3.text('verify-head-impl-retry').includes('second answer'))
  assert.ok(r3.text('verify-head-r1-retry').includes('second answer') && !r3.text('verify-head-r1-retry').includes('first answer'))
  assert.equal(r3.calls.filter((c) => c.prompt.includes('first answer')).length, 1)
  assert.equal(r3.calls.filter((c) => c.prompt.includes('second answer')).length, 1)
  assert.equal(r3.res.rounds, 1)
})

await test('task: a retry that fails again takes the next answer as another attempt, with the earlier answers carried', async () => {
  const cache = new Map()
  const g = newGit()
  const over = { 'verify-head-impl*': (p, c, l, gg, d) => (l === 'verify-head-impl-retry2' ? d() : { revParse: 'junk', catFile: 'MISSING', log: '' }) }
  const A1 = { at: 'precondition:verifyHead', text: 'try one' }
  const A2 = { at: 'precondition', text: 'try two' }
  const r1 = await run(task, { ...BASE, answers: [A1] }, rsp(over, g), { cache })
  assert.equal(r1.res.stopPoint, 'precondition:verifyHead')
  assert.deepEqual(r1.labels, ['implementer'])
  const r2 = await run(task, { ...BASE, answers: [A1, A2] }, rsp(over, g), { cache })
  assert.equal(r2.res.status, 'complete')
  assert.ok(r2.calls.find((c) => c.label === 'verify-head-impl-retry').cached)
  assert.ok(r2.text('verify-head-impl-retry2').includes('try one') && r2.text('verify-head-impl-retry2').includes('try two'))
  // The implementer does the same: a precondition that survives its retry is retried again with the next answer.
  const dirty = () => work({ status: 'BLOCKED', preconditionFailed: 'still dirty' })
  const over2 = { implementer: dirty, 'implementer-retry': dirty }
  const s1 = await run(task, { ...BASE, answers: [{ at: 'precondition:implementer', text: 'a' }] }, rsp(over2, newGit()))
  assert.equal(s1.res.stopPoint, 'precondition:implementer')
  assert.deepEqual(s1.labels, ['implementer', 'implementer-retry'])
  const s2 = await run(task, { ...BASE, answers: [{ at: 'precondition:implementer', text: 'a' }, { at: 'precondition', text: 'b' }] }, rsp(over2, newGit()))
  assert.equal(s2.res.status, 'complete')
  assert.deepEqual(s2.labels.slice(0, 3), ['implementer', 'implementer-retry', 'implementer-retry2'])
  assert.ok(s2.text('implementer-retry2').includes('* (precondition:implementer) a') && s2.text('implementer-retry2').includes('* (precondition) b'))
})

await test('task: foreignPaths are named in the preconditions, and the Precondition line names owns', async () => {
  const r = await run(task, { ...BASE, foreignPaths: ['docs/briefs/'] }, rsp())
  assert.match(r.text('implementer'), /ignore these: docs\/briefs\//)
  assert.match(r.text('gate-0'), /ignore these: docs\/briefs\//)
  assert.match(r.text('implementer'), /Change only the files in owns: src\/pages\/t\/glass\/\*\*, src\/styles\/glass\.css/)
})

// ================= bdl-task: heads come from git =================
await test('task: verifyHead rejects a non-hex sha, an unconfirmed sha and a mismatched cat-file', async () => {
  const bad = [
    { revParse: 'not-a-sha' + NL, catFile: 'EXISTS' + NL, log: '' },
    { revParse: 'a'.repeat(40) + NL, catFile: 'MISSING' + NL, log: '' },
    { revParse: 'a'.repeat(40) + NL, catFile: `EXISTS ${'b'.repeat(40)}` + NL, log: '' },
    { revParse: 'a'.repeat(39) + NL, catFile: `EXISTS ${'a'.repeat(39)}` + NL, log: '' },
  ]
  for (const v of bad) {
    const r = await run(task, BASE, rsp({ 'verify-head*': v }))
    assert.equal(r.res.status, 'stopped')
    assert.equal(r.res.stopped, 'precondition')
    assert.equal(r.res.stopPoint, 'precondition:verifyHead')
    assert.match(r.res.problem, /verifyHead/)
    assert.deepEqual(r.labels, ['implementer'])
  }
  const nothing = await run(task, BASE, rsp({ 'verify-head*': null }))
  assert.equal(nothing.res.stopPoint, 'precondition:verifyHead')
})

await test('task: a verifyHead answer retries it once, with the answer only in the retry', async () => {
  let n = 0
  const over = { 'verify-head-impl': (p, c, l, g, d) => (++n === 1 ? { revParse: 'junk', catFile: 'MISSING', log: '' } : d()) }
  const r = await run(task, { ...BASE, answers: [{ at: 'precondition:verifyHead', text: 'git is fine now' }] }, rsp(over))
  assert.equal(r.res.status, 'complete')
  assert.ok(r.calls.some((c) => c.label === 'verify-head-impl-retry' && c.prompt.includes('git is fine now')))
  assert.ok(!r.text('verify-head-impl').includes('git is fine now'))
})

await test('task: git HEAD still at base after the implementer stops the run', async () => {
  const r = await run(task, BASE, rsp({ implementer: () => work() }))
  assert.equal(r.res.status, 'stopped')
  assert.equal(r.res.stopped, 'verifyHead')
  assert.match(r.res.problem, /no commit/)
  assert.deepEqual(r.labels, ['implementer'])
})

await test('task: the head is the one git reports, never one an agent names', async () => {
  const LIE = 'e'.repeat(40)
  const g = newGit()
  const fixer = (p, c, l, gg) => { commit(gg, 'fx'); return { ...work(), head: LIE, commits: [{ sha: LIE, subject: 'x' }] } }
  const r = await run(task, BASE, rsp({ critic: () => failWith(F('C1', 'blocker')), 'fixer-r1': fixer }, g))
  assert.equal(r.res.head, g.head)
  assert.ok(!JSON.stringify(r.calls.map((c) => c.prompt)).includes(LIE))
  assert.ok(r.text('gate-r1').includes(`equals ${g.head}`))
})

await test('task: implemented.head skips the implementer and must equal git HEAD', async () => {
  const g = newGit()
  g.head = hex40('done')
  const r = await run(task, { ...BASE, implemented: { head: g.head } }, rsp({}, g))
  assert.deepEqual(r.calls.map((c) => c.label), ['verify-head-impl', 'critic', 'verifier', 'gate-0'])
  assert.equal(r.res.status, 'complete')
  assert.equal(r.res.agents, 4)
  assert.equal(r.res.head, hex40('done'))
  const off = await run(task, { ...BASE, implemented: { head: hex40('other') } }, rsp({}, g))
  assert.equal(off.res.stopPoint, 'precondition:verifyHead')
  assert.deepEqual(off.labels, [])
  await throwsAsync(() => run(task, { ...BASE, implemented: { head: g.head }, answers: [{ at: 'implementer', text: 'x' }] }, rsp({}, g)), /skips the implementer/)
  await throwsAsync(() => run(task, { ...BASE, implemented: { head: 'abc' } }, rsp({}, g)), /40-hex/)
})

// ================= bdl-task: roles, prompts, args =================
await test('task: runtime true puts the implementer and fixers at opus', async () => {
  const r = await run(task, { ...BASE, runtime: true, maxAgents: 15 }, rsp({ critic: () => failWith(F('C1', 'important')), 're-critic*': (p) => stuck(p) }))
  const role = (l) => `${r.find(l).model}/${r.find(l).effort}`
  assert.equal(role('implementer'), 'opus/medium')
  assert.equal(role('fixer-r1'), 'opus/medium')
  assert.equal(role('fixer-r2'), 'opus/high')
  assert.equal(role('critic'), 'opus/high')
  assert.equal(role('verifier'), 'sonnet/high')
  assert.match(r.text('implementer'), /judge it on film/)
})

await test('task: role() rejects Fable, an effort on Haiku and a bad effort, warns on xhigh, and rejects unknown roles', async () => {
  await throwsAsync(() => run(task, { ...BASE, roles: { critic: { model: 'fable', effort: 'high' } } }, rsp()), /not one of haiku, sonnet, opus/)
  await throwsAsync(() => run(task, { ...BASE, roles: { verifyHead: { model: 'haiku', effort: 'low' } } }, rsp()), /takes no effort/)
  await throwsAsync(() => run(task, { ...BASE, roles: { gate: { effort: 'turbo' } } }, rsp()), /needs an effort/)
  await throwsAsync(() => run(task, { ...BASE, roles: { critc: { model: 'opus', effort: 'low' } } }, rsp()), /not a role/)
  const hot = await run(task, { ...BASE, roles: { critic: { effort: 'xhigh' } } }, rsp(), { allowHot: true })
  assert.ok(hot.logs.some((l) => /"critic" is xhigh/.test(l)))
  assert.equal(hot.find('critic').effort, 'xhigh')
  const down = await run(task, { ...BASE, roles: { verifier: { model: 'opus', effort: 'low' } } }, rsp())
  assert.equal(`${down.find('verifier').model}/${down.find('verifier').effort}`, 'opus/low')
})

await test('task: ports are assigned per role and the rules list is in every shell prompt', async () => {
  const r = await run(task, { ...BASE, ports: [4470, 4471, 4472] }, rsp({ critic: () => failWith(F('C1', 'blocker')) }))
  const port = (l) => (/Your assigned port: (\d+)/.exec(r.text(l)) || [])[1]
  assert.equal(port('implementer'), '4470')
  assert.equal(port('fixer-r1'), '4470')
  assert.equal(port('gate-0'), '4470')
  assert.equal(port('critic'), '4471')
  assert.equal(port('re-critic-r1'), '4471')
  assert.equal(port('verifier'), '4472')
  for (const c of r.calls.filter((c) => !c.label.startsWith('verify-head'))) {
    for (const rule of ['NETSTAT', 'Wait once', 'WEBGL_debug_renderer_info', 'prefers-reduced-transparency', 'timestamped strips', 'animation-timeline', 'never shell heredocs', 'No em dashes']) {
      assert.ok(c.prompt.toLowerCase().includes(rule.toLowerCase()), `${c.label} lacks "${rule}"`)
    }
  }
  assert.ok(r.text('verify-head-impl').includes('Never dispatch subagents'))
})

await test('task: layout and baseline, sizes, schemes and per-case narrowing reach the verifier', async () => {
  await throwsAsync(() => run(task, { ...BASE, layout: true }, rsp()), /baseline/)
  const r = await run(task, { ...BASE, layout: true, baseline: 'b2-head', sizes: [820, 390], schemes: ['dark'] }, rsp())
  assert.match(r.text('verifier'), /snap-b2-head/)
  assert.match(r.text('verifier'), /whole-page before and after sheets at every size/)
  assert.match(r.text('verifier'), /Sizes: 820, 390\. Schemes: dark/)
  assert.match(r.text('verifier'), /arrive-820: arrival at 820 \[sizes 820\]/)
  assert.match(r.text('verifier'), /--name b3-t7-r0 --port 4462/)
})

await test('task: a bare run has no undefined anywhere, and arguments are validated before any agent runs', async () => {
  const bare = { ...BASE }
  delete bare.school
  delete bare.films
  const r = await run(task, bare, rsp({}, newGit(), []))
  assert.equal(r.res.status, 'complete')
  for (const k of ['task', 'title', 'repoDir', 'branch', 'base', 'briefPath', 'reportPath', 'workDir', 'scratchRoot', 'runLabel', 'trailer', 'owns', 'ports']) {
    const a = { ...BASE }
    delete a[k]
    await throwsAsync(() => run(task, a, rsp()), k === 'owns' || k === 'ports' ? new RegExp(k) : new RegExp(`"${k}"`))
  }
  await throwsAsync(() => run(task, { ...BASE, base: 'abc1234' }, rsp()), /40-hex/)
  await throwsAsync(() => run(task, { ...BASE, ports: [4460, 4461] }, rsp()), /ports/)
  await throwsAsync(() => run(task, { ...BASE, ports: [4460, 4461, 5000] }, rsp()), /4460 to 4480/)
  await throwsAsync(() => run(task, { ...BASE, ports: [4460, 4461, 4461] }, rsp()), /distinct/)
  await throwsAsync(() => run(task, { ...BASE, owns: [] }, rsp()), /owns/)
  await throwsAsync(() => run(task, { ...BASE, runLabel: 'Has Spaces' }, rsp()), /runLabel/)
  await throwsAsync(() => run(task, { ...BASE, films: [{ id: 'a', what: 'x' }, { id: 'a', what: 'y' }] }, rsp()), /unique/)
  await throwsAsync(() => run(task, { ...BASE, answers: [{ at: 'gate-0', text: 'x' }] }, rsp()), /not a stop point/)
  await throwsAsync(() => run(task, { ...BASE, answers: [{ at: 'budget' }] }, rsp()), /needs text/)
})

await test('task: carries, trailer and the brief reach the agents that commit', async () => {
  const r = await run(task, { ...BASE, carries: 'Earlier call: keep the lens at 56px.', school: undefined, schools: ['glass', 'swiss'], critic: undefined }, rsp({ critic: () => failWith(F('C1', 'blocker')) }))
  for (const l of ['implementer', 'critic', 'fixer-r1', 'verifier']) assert.match(r.text(l), /keep the lens at 56px/, l)
  for (const l of ['implementer', 'fixer-r1']) assert.match(r.text(l), /Co-Authored-By: X <x@example\.com>/, l)
  assert.match(r.text('critic'), /Schools: glass, swiss/)
  assert.match(r.text('implementer'), /npm run verify/)
  assert.match(r.text('gate-0'), /npm run verify/)
  assert.match(r.text('implementer'), /git rev-parse HEAD is [0-9a-f]{40}/)
})

// ================= bdl-wave =================
const WAVE = {
  wave: 'b3',
  repoDir: 'C:\\git\\birchdesignlab',
  branch: 'feat/glass-polish',
  base: BASE_SHA,
  workDir: 'C:\\w',
  scratchRoot: 'C:\\s',
  trailer: 'Co-Authored-By: X <x@example.com>',
  ports: [4460, 4461, 4462],
  tasks: [
    { task: 1, title: 'First task', briefPath: 'C:/w/b1.md', owns: ['a/**'] },
    { task: 2, title: 'Second task', briefPath: 'C:/w/b2.md', owns: ['b/**'] },
    { task: 3, title: 'Third task', briefPath: 'C:/w/b3.md', owns: ['c/**'] },
  ],
}
const taskOf = (p) => (/Task (\d+):/.exec(p) || [])[1]
const whenTask = (n, v) => (p, c, l, g, d) => (taskOf(p) === String(n) ? (typeof v === 'function' ? v(p, c, l, g, d) : v) : d())

await test('wave: tasks run in order, each base is the verified head, and the last task has no verify read after it', async () => {
  const g = newGit()
  const r = await run(wave, WAVE, rsp({}, g), { sub: task })
  assert.equal(r.res.status, 'complete')
  assert.deepEqual(r.childArgs.map((c) => c.args.task), [1, 2, 3])
  assert.deepEqual(r.childArgs.map((c) => c.args.base), [BASE_SHA, hex40('impl-1'), hex40('impl-2')])
  assert.equal(r.res.head, hex40('impl-3'))
  assert.deepEqual(r.calls.map((c) => c.label).filter((l) => l.startsWith('verify-head-t')), ['verify-head-t1', 'verify-head-t2'])
  assert.equal(r.find('verify-head-t1').model, 'haiku')
  assert.equal(r.find('verify-head-t1').effort, undefined)
  assert.equal(r.res.totals.agents, 3 * 5 + 2)
  assert.equal(r.res.totals.completed, 3)
  assert.equal(r.childArgs[0].args.reportPath, 'C:\\w/task-1-report.md')
  assert.equal(r.childArgs[1].args.runLabel, 'b3-t2')
  assert.ok(r.res.tasks.every((t) => !('ledgerLines' in t)))
  assert.equal(r.res.ledgerLines.filter((l) => /: complete \(commits/.test(l)).length, 3)
  assert.match(r.res.ledgerLines.at(-1), /^- Wave b3: complete \(Tasks 1, 2, 3/)
})

await test('wave: taste calls and deferred minors carry forward by id, and a wave-level carries merges', async () => {
  const over = { critic: whenTask(1, () => failWith(F('T1', 'taste'), F('M1', 'minor'))) }
  const r = await run(wave, { ...WAVE, carries: 'Wave rule: films at 820 only.', tasks: WAVE.tasks.map((t, i) => (i === 1 ? { ...t, carries: 'Task 2 note.' } : t)) }, rsp(over), { sub: task })
  assert.equal(r.res.status, 'complete')
  const c2 = r.childArgs[1].args.carries
  assert.match(c2, /Wave rule: films at 820 only\./)
  assert.match(c2, /Task 2 note\./)
  assert.match(c2, /Earlier in this wave/)
  assert.match(c2, /1\/critic:T1/)
  assert.match(c2, /1\/critic:M1/)
  assert.ok(!r.childArgs[0].args.carries.includes('Earlier in this wave'))
  const critic2 = r.calls.find((c) => c.label === 'critic' && taskOf(c.prompt) === '2')
  assert.match(critic2.prompt, /do not re-raise/)
  assert.deepEqual(r.res.tasteCalls.map((t) => `${t.task}:${t.id}`), ['1:critic:T1'])
  assert.equal(r.res.carried.length, 2)
  const follow = await run(wave, { ...WAVE, carried: ['- Earlier run line.'], tasks: [WAVE.tasks[1]] }, rsp(), { sub: task })
  assert.match(follow.childArgs[0].args.carries, /Earlier run line\./)
})

await test('wave: wave-level options pass down, a task wins, and unset options stay unset', async () => {
  const w = { ...WAVE, runtime: true, sizes: [820], school: 'swiss', maxRounds: 1, roles: { critic: { model: 'opus', effort: 'medium' } }, tasks: [{ ...WAVE.tasks[0], runtime: false, roles: { gate: { model: 'sonnet', effort: 'medium' } } }, WAVE.tasks[1]] }
  const r = await run(wave, w, rsp(), { sub: task })
  const [a, b] = r.childArgs.map((c) => c.args)
  assert.equal(a.runtime, false)
  assert.equal(b.runtime, true)
  assert.deepEqual(a.sizes, [820])
  assert.equal(b.school, 'swiss')
  assert.equal(a.maxRounds, 1)
  assert.deepEqual(a.roles, { critic: { model: 'opus', effort: 'medium' }, gate: { model: 'sonnet', effort: 'medium' } })
  assert.deepEqual(b.roles, { critic: { model: 'opus', effort: 'medium' } })
  assert.ok(!('baseline' in a) && !('films' in a) && !('layout' in a) && !('answers' in a) && !('implemented' in a))
  assert.deepEqual(a.ports, [4460, 4461, 4462])
  assert.equal(r.calls.find((c) => c.label === 'critic').effort, 'medium')
})

await test('wave: a stopped task stops the wave, and a resume replays the finished tasks from cache', async () => {
  const cache = new Map()
  const g = newGit()
  const over = { implementer: whenTask(2, () => work({ status: 'NEEDS_CONTEXT', questions: ['which lens?'] })) }
  const r1 = await run(wave, WAVE, rsp(over, g), { sub: task, cache })
  assert.equal(r1.res.status, 'stopped')
  assert.equal(r1.res.stoppedTask, 2)
  assert.equal(r1.res.stop.stopped, 'implementer')
  assert.deepEqual(r1.res.stop.questions, ['which lens?'])
  assert.equal(r1.res.tasks.length, 2)
  assert.ok(!r1.childArgs.some((c) => c.args.task === 3))
  assert.match(r1.res.ledgerLines.at(-1), /^- Wave b3: stopped at Task 2/)
  const answers = { 2: [{ at: 'implementer', text: 'use the 56px lens' }] }
  const r2 = await run(wave, { ...WAVE, answers }, rsp(over, g), { sub: task, cache })
  assert.equal(r2.res.status, 'complete')
  assert.equal(r2.childArgs[1].args.answers[0].text, 'use the 56px lens')
  assert.ok(!('answers' in r2.childArgs[0].args))
  assert.ok(r2.calls.slice(0, 6).every((c) => c.cached), 'task 1 and the verify read replay from cache')
  assert.equal(r2.calls.filter((c) => c.prompt.includes('use the 56px lens')).length, 1)
  await throwsAsync(() => run(wave, { ...WAVE, answers: { 9: [{ at: 'budget', text: 'x' }] } }, rsp(), { sub: task }), /not in tasks/)
})

await test('wave: a parked task parks the wave and later tasks never start', async () => {
  const over = { critic: whenTask(2, () => failWith(F('C1', 'important'))), 're-critic*': (p) => stuck(p) }
  const r = await run(wave, { ...WAVE, maxAgents: 15 }, rsp(over), { sub: task })
  assert.equal(r.res.status, 'parked')
  assert.equal(r.res.stoppedTask, 2)
  assert.equal(r.res.stop.parked[0].id, 'critic:C1')
  assert.ok(!r.childArgs.some((c) => c.args.task === 3))
  assert.equal(r.res.totals.parked, 1)
  assert.match(r.res.ledgerLines.at(-1), /^- Wave b3: stopped at Task 2 \(parked/)
})

await test('wave: a bad verifyHead read between tasks stops the wave and keeps the carried lines', async () => {
  for (const bad of [{ revParse: 'junk', catFile: 'MISSING' }, { revParse: 'a'.repeat(40), catFile: 'MISSING' }, { revParse: 'a'.repeat(40), catFile: `EXISTS ${'b'.repeat(40)}` }]) {
    const over = { critic: whenTask(1, () => failWith(F('T1', 'taste'))), 'verify-head-t1': bad }
    const r = await run(wave, WAVE, rsp(over), { sub: task })
    assert.equal(r.res.status, 'stopped')
    assert.equal(r.res.stop.stopPoint, 'precondition:verifyHead')
    assert.match(r.res.stop.problem, /fresh bdl-wave/)
    assert.equal(r.res.carried.length, 1)
    assert.deepEqual(r.childArgs.map((c) => c.args.task), [1])
  }
})

await test('wave: a child head that differs from git is logged and git wins', async () => {
  const r = await run(wave, { ...WAVE, tasks: WAVE.tasks.slice(0, 2), bdlTaskPath: '.claude/workflows/smoke/bdl-task-stub.js' }, rsp(), { sub: stub })
  assert.equal(r.res.status, 'complete')
  assert.ok(r.logs.some((l) => /agent-reported head [0-9a-f]{16}\.\.\. differs from git; using git/.test(l)))
  assert.equal(r.childArgs[1].args.base, BASE_SHA, 'the base is the real head, not the stub head')
  assert.equal(r.childArgs[0].scriptPath, '.claude/workflows/smoke/bdl-task-stub.js')
})

await test('wave: the zero-agent stub echoes carries and parks on a title with park in it', async () => {
  const w = { ...WAVE, tasks: [WAVE.tasks[0], { ...WAVE.tasks[1], title: 'Second park task' }, WAVE.tasks[2]], bdlTaskPath: 'smoke/stub.js' }
  const r = await run(wave, w, rsp(), { sub: stub })
  assert.equal(r.res.status, 'parked')
  assert.equal(r.res.tasks.length, 2)
  assert.equal(r.calls.length, 1, 'only the verify read ran')
  assert.match(r.res.tasks[1].echoCarries, /Earlier in this wave/)
  assert.match(r.res.tasks[1].echoCarries, /1\/critic:C1/)
  assert.equal(r.res.totals.agents, 1)
})

await test('wave: a child that throws is a stop, not a crash, and a cancel is rethrown', async () => {
  const bad = { ...WAVE, tasks: [{ ...WAVE.tasks[0], owns: ['a'] }], ports: [4460] }
  const r = await run(wave, bad, rsp(), { sub: task })
  assert.equal(r.res.status, 'stopped')
  assert.match(r.res.stop.problem, /bdl-task threw: bdl-task: ports/)
  assert.match(r.res.ledgerLines[0], /stopped at bdl-task/)
})

await test('wave: arguments are validated before any agent runs', async () => {
  for (const k of ['wave', 'repoDir', 'branch', 'base', 'workDir', 'scratchRoot', 'trailer']) {
    const a = { ...WAVE }
    delete a[k]
    await throwsAsync(() => run(wave, a, rsp(), { sub: task }), new RegExp(`"${k}"`))
  }
  await throwsAsync(() => run(wave, { ...WAVE, tasks: [] }, rsp()), /non-empty/)
  await throwsAsync(() => run(wave, { ...WAVE, tasks: [WAVE.tasks[0], WAVE.tasks[0]] }, rsp()), /duplicate task 1/)
  await throwsAsync(() => run(wave, { ...WAVE, tasks: [{ ...WAVE.tasks[0], base: BASE_SHA }] }, rsp()), /set by the wave/)
  await throwsAsync(() => run(wave, { ...WAVE, tasks: [{ ...WAVE.tasks[0], owns: undefined }] }, rsp()), /owns/)
  await throwsAsync(() => run(wave, { ...WAVE, tasks: [{ ...WAVE.tasks[0], task: 'A1' }] }, rsp(), { sub: task }), /run label "b3-tA1"/)
  await throwsAsync(() => run(wave, { ...WAVE, tasks: [{ ...WAVE.tasks[0], task: '4.1' }] }, rsp(), { sub: task }), /run label "b3-t4\.1"/)
  await throwsAsync(() => run(wave, { ...WAVE, wave: 'a'.repeat(21), tasks: [{ ...WAVE.tasks[0], task: 1234567 }] }, rsp(), { sub: task }), /at most 29/)
  await throwsAsync(() => run(wave, { ...WAVE, tasks: [WAVE.tasks[0], { ...WAVE.tasks[1], runLabel: 'b3-t1' }] }, rsp(), { sub: task }), /repeats run label "b3-t1"/)
  const odd = await run(wave, { ...WAVE, tasks: [{ ...WAVE.tasks[0], task: '4.1', runLabel: 'b3-t4-1' }] }, rsp(), { sub: task })
  assert.equal(odd.res.status, 'complete', 'an explicit runLabel makes an odd task id usable')
  assert.equal(odd.childArgs[0].args.runLabel, 'b3-t4-1')
  await throwsAsync(() => run(wave, { ...WAVE, base: 'abc' }, rsp()), /40-hex/)
  await throwsAsync(() => run(wave, { ...WAVE, ports: [] }, rsp()), /ports/)
  await throwsAsync(() => run(wave, { ...WAVE, carried: [1] }, rsp()), /list of strings/)
  await throwsAsync(() => run(wave, { ...WAVE, roles: { verifyHead: { model: 'fable' } } }, rsp(), { sub: task }), /not one of haiku, sonnet, opus/)
})

// ================= ledger, files, docs =================
await test('ledger: append-ledger finds lines in a bare result, escaped JSON and prose, and skips lines already there', async () => {
  const lines = ['- Task 7: taste call: critic:T1 a.css:1 x', '- Task 7: complete (commits abc1234..def5678, review clean, gate green, films pass; 5 agents)']
  assert.deepEqual(findLedgerLines(JSON.stringify({ task: 7, ledgerLines: lines })), lines)
  assert.deepEqual(findLedgerLines(`output: ${JSON.stringify({ result: { ledgerLines: lines } })} done`), lines)
  assert.deepEqual(findLedgerLines(JSON.stringify(JSON.stringify({ ledgerLines: lines }))), lines)
  assert.equal(findLedgerLines('nothing here'), null)
  assert.deepEqual(freshLines(`${lines[0]}${NL}`, lines), [lines[1]])
  assert.equal(appendText(`${lines.join(NL)}${NL}`, lines), null)
  assert.equal(appendText('# ledger', lines), `${NL}${lines.join(NL)}${NL}`)
  assert.equal(appendText(`# l${CR}${NL}`, ['- a']), `- a${CR}${NL}`)
  const stop = '- Task 7: stopped at implementer (head abc1234); controller action needed'
  assert.deepEqual(freshLines(`${stop}${NL}`, [stop]), [stop], 'stop lines are events, never deduped against the ledger')
  const utf16 = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('{"ledgerLines":["- a"]}', 'utf16le')])
  assert.equal(decodeText(utf16), '{"ledgerLines":["- a"]}')
})

await test('ledger: the command line appends, is idempotent and uses the documented exit codes', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bdl-wf-'))
  try {
    const input = path.join(dir, 'out.json')
    const ledger = path.join(dir, 'ledger.md')
    fs.writeFileSync(input, JSON.stringify({ ledgerLines: ['- Task 1: a', '- Task 1: b'] }))
    fs.writeFileSync(ledger, '# ledger' + NL)
    const cli = (...a) => spawnSync(process.execPath, [path.join(HERE, 'append-ledger.mjs'), ...a], { encoding: 'utf8' })
    assert.equal(cli(input, ledger).status, 0)
    assert.equal(fs.readFileSync(ledger, 'utf8'), `# ledger${NL}- Task 1: a${NL}- Task 1: b${NL}`)
    const again = cli(input, ledger)
    assert.equal(again.status, 0)
    assert.match(again.stdout, /already appended/)
    assert.equal(fs.readFileSync(ledger, 'utf8'), `# ledger${NL}- Task 1: a${NL}- Task 1: b${NL}`)
    assert.equal(cli(input).status, 2)
    assert.equal(cli(path.join(dir, 'missing.json'), ledger).status, 2)
    fs.writeFileSync(input, '{"other":1}')
    assert.equal(cli(input, ledger).status, 3)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

const wfFiles = ['bdl-task.js', 'bdl-wave.js', 'smoke/bdl-task-stub.js']
await test('files: workflow scripts are LF only, start with a pure-literal meta, and use no forbidden runtime API', async () => {
  for (const f of wfFiles) {
    const raw = fs.readFileSync(path.join(WF_DIR, f), 'utf8')
    assert.ok(!raw.includes(CR), `${f} has a carriage return`)
    assert.ok(!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(raw), `${f} has a control byte`)
    const src = raw
    assert.ok(src.startsWith('export const meta = {'), `${f} does not start with the meta literal`)
    const { at, end } = metaEnd(src)
    const meta = Function(`"use strict"; return (${src.slice(at + 'export const meta = '.length, end)})`)()
    assert.ok(meta.name && meta.description && Array.isArray(meta.phases), `${f} meta`)
    for (const bad of ['Date.now', 'Math.random', 'new Date()', 'require(', 'process.', 'import(', 'fetch(']) assert.ok(!src.includes(bad), `${f} uses ${bad}`)
    assert.ok(!/\bfable\b/i.test(src.replace(/Fable rejected|Fable is not a model here/g, '')), `${f} names Fable outside a rejection note`)
  }
  const sites = (f) => (readWf(f).match(/\bagent\((?![s)])/g) || []).length
  assert.equal(sites('bdl-task.js'), 2, 'bdl-task calls agent() only in ask() and block()')
  assert.equal(sites('bdl-wave.js'), 1, 'bdl-wave calls agent() only in verifyHead')
  assert.match(readWf('bdl-task.js'), /Object\.assign\(\{ label, phase: phaseName, schema \}, role\(r\)\)/, 'ask() and block() take model and effort from role()')
  assert.match(readWf('bdl-wave.js'), /schema: VERIFY_HEAD \}, role\('verifyHead'\)\)/, 'the wave verify read takes its model from role()')
  const lines = readWf('bdl-task.js').split(NL).length
  assert.ok(lines < 800, `bdl-task.js is ${lines} lines; the port should stay well under half of the reference 1,600`)
})

await test('files: the repo pins workflow scripts to LF and the agent definitions match their names', async () => {
  const attrs = fs.readFileSync(path.join(REPO_ROOT, '.gitattributes'), 'utf8')
  assert.match(attrs, /^\.claude\/workflows\/\*\* text eol=lf$/m)
  const dir = path.join(REPO_ROOT, '.claude', 'agents')
  const want = { haiku: ['haiku', null], 'sonnet-low': ['sonnet', 'low'], 'sonnet-medium': ['sonnet', 'medium'], 'sonnet-high': ['sonnet', 'high'], 'opus-low': ['opus', 'low'], 'opus-medium': ['opus', 'medium'], 'opus-high': ['opus', 'high'] }
  for (const [name, [model, effort]] of Object.entries(want)) {
    const src = fs.readFileSync(path.join(dir, `${name}.md`), 'utf8').split(CR).join('')
    const parts = src.split('---' + NL)
    assert.ok(parts.length >= 3 && parts[0] === '', `${name}.md has front matter`)
    const fm = parts[1]
    assert.match(fm, new RegExp(`^name: ${name}$`, 'm'))
    assert.match(fm, new RegExp(`^model: ${model}$`, 'm'))
    if (effort) assert.match(fm, new RegExp(`^effort: ${effort}$`, 'm'))
    else assert.ok(!/^effort:/m.test(fm), 'haiku takes no effort')
    assert.match(src, /birchdesignlab/i)
    assert.ok(!/queryModule|Query Module|pnpm|CJIS/.test(src), `${name}.md still names the reference repo`)
    assert.ok(src.includes('git push'), `${name}.md carries the no-remote rule`)
  }
  assert.ok(!fs.existsSync(path.join(dir, 'opus-xhigh.md')))
  assert.ok(!fs.existsSync(path.join(dir, 'fable.md')))
})

await test('docs: the README names every required arg, stop point, role and the harness', async () => {
  const readme = fs.readFileSync(path.join(WF_DIR, 'README.md'), 'utf8')
  for (const w of ['task', 'title', 'repoDir', 'branch', 'base', 'briefPath', 'reportPath', 'workDir', 'scratchRoot', 'runLabel', 'owns', 'ports', 'trailer', 'maxRounds', 'maxAgents', 'answers', 'implemented', 'runtime', 'layout', 'baseline', 'foreignPaths', 'films', 'carried', 'bdlTaskPath']) {
    assert.ok(readme.includes(`\`${w}\``), `README lacks \`${w}\``)
  }
  for (const w of ['precondition:implementer', 'precondition:verifyHead', 'implementer-continue', 'implementer-retry', 'budget', 'review', 'verifyHead', 'tasteCalls', 'deferredMinors', 'ledgerLines', 'append-ledger.mjs', 'harness.mjs', 'resumeFromRunId', 'bdl-task-stub', 'reCritic', 'escalatedFixer', 'verify-locked.mjs', 'gate:<k>', 'implementer-retry2', 'foreignPaths']) {
    assert.ok(readme.includes(w), `README lacks ${w}`)
  }
  assert.ok(!readme.includes(String.fromCharCode(0x2014)), 'README has an em dash')
})

// ---------- report ----------
let failed = 0
for (const [ok, name, msg] of results) {
  if (ok) console.log(`PASS ${name}`)
  else {
    failed++
    console.log(`FAIL ${name}${NL}     ${String(msg).split(NL).join(NL + '     ')}`)
  }
}
console.log(`${NL}harness: ${results.length - failed}/${results.length} scenarios passed`)
process.exit(failed ? 1 : 0)
