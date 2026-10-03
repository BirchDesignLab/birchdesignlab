// mutants.mjs: proves the harness can fail. Copies .claude/workflows, breaks one rule at a time
// and runs the harness against the copy, limited (--only) to the scenario that guards that rule.
// Every mutant must make that scenario FAIL; a mutant the harness lets through is a hole in the
// harness (or a rule nothing guards).
//
// Usage (repo root): node scripts/workflows/mutants.mjs [--list] [name-fragment]
// Scratch copies go to scripts/themes/.out/bdl-workflows-port/mutants/ (gitignored) and are
// removed afterwards. Exit code 0 when every mutant is caught, 1 otherwise.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const NL = String.fromCharCode(10)
const CR = String.fromCharCode(13)
const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(HERE, '..', '..')
const SRC = path.join(REPO_ROOT, '.claude', 'workflows')
const OUT = path.join(REPO_ROOT, 'scripts', 'themes', '.out', 'bdl-workflows-port', 'mutants')
const TASK = 'bdl-task.js'
const WAVE = 'bdl-wave.js'
const lines = (...l) => l.join(NL)

// [name, file, find, replace, scenario fragment that must fail]
const MUTANTS = [
  ['no-remote rule dropped from the git rules', TASK, '`- ${NO_REMOTE}`].join(NL)', "'- omitted'].join(NL)", 'happy path'],
  ['wait-once rule dropped from the full rules', TASK, "'- Wait once: one Monitor or foreground chunks under 10 minutes; never re-issue a timed-out waiter.',", "'- omitted',", 'ports are assigned per role'],
  ['read-only rule dropped from the critic', TASK, lines('    READONLY, SHELL, rules(PORT.critic),', "    'verdict: pass only with no blocker or important finding.',"), lines('    SHELL, rules(PORT.critic),', "    'verdict: pass only with no blocker or important finding.',"), 'happy path'],
  ['an undefined slips into the context', TASK, '`Task ${N}: ${A.title}. Brief:', '`Task ${N}: ${A.nope}. Brief:', 'happy path'],
  ['effort dropped from non-Haiku roles', TASK, "return { model: r.model, effort: r.effort }", 'return { model: r.model }', 'happy path'],
  ['effort given to Haiku', TASK, "return { model: 'haiku' }", "return { model: 'haiku', effort: 'low' }", 'happy path'],
  ['Fable accepted as a model', TASK, 'if (!MODELS.includes(r.model))', 'if (false)', 'role() rejects Fable'],
  ['runtime ignored for the implementer', TASK, "RUNTIME ? { model: 'opus', effort: 'medium' } :", "false ? { model: 'opus', effort: 'medium' } :", 'runtime true'],
  ['verifyHead accepts a sha cat-file did not confirm', TASK, "String((v && v.catFile) || '').trim() !== `EXISTS ${head}`", 'false', 'verifyHead rejects'],
  ['verifyHead accepts a 39-hex sha', TASK, 'const SHA40 = /^[0-9a-f]{40}$/', 'const SHA40 = /^[0-9a-f]{39,40}$/', 'verifyHead rejects'],
  ['implemented.head not compared with git', TASK, 'if (exact && r.head !== exact)', 'if (false)', 'implemented.head skips'],
  ['implemented does not skip the implementer', TASK, 'if (IMPLEMENTED) log(`implement: skipped', 'if (false) log(`implement: skipped', 'implemented.head skips'],
  ['HEAD still at base is not noticed', TASK, "if (S.head === A.base) halt('verifyHead'", "if (false) halt('verifyHead'", 'still at base'],
  ['the gate stops checking HEAD', TASK, 'git rev-parse HEAD equals ${head}; ', '', 'head is the one git reports'],
  ['default maxRounds is 3', TASK, "intArg('maxRounds', 2, 1, 4)", "intArg('maxRounds', 3, 1, 4)", 'findings still open after round 2'],
  ['maxRounds is not clamped', TASK, "intArg('maxRounds', 2, 1, 4)", "intArg('maxRounds', 2, 1, 99)", 'maxRounds is clamped'],
  ['default maxAgents is 20', TASK, 'const DEFAULT_MAX_AGENTS = 14', 'const DEFAULT_MAX_AGENTS = 20', 'default cap of 14'],
  ['single calls skip the budget', TASK, lines('  reserve(1, label)', '  used++'), '  used++', 'single call that would pass the cap'],
  ['a parallel block is not reserved whole', TASK, "reserve(items.length, items.map((it) => it.label).join(', '))", "reserve(1, 'block')", 'budget stop at the cap'],
  ['an answer is never marked used', TASK, 'if (e) e.used = true', 'if (e) void 0', 'plain precondition answer'],
  ['implementer answers are never marked used', TASK, 'es.forEach((e) => { e.used = true })', 'es.forEach(() => {})', 'implementer stop, and its answer'],
  ['one precondition answer swallows every later one', TASK, lines('  const e = ANSWERS.find((x) => !x.used && match(x.at))', '  if (e) e.used = true', '  return e || null'), lines('  const e = takeAll(match)[0]', '  return e || null'), 'three runs'],
  ['a still-red gate gets a new finding id each round', TASK, "mk(`gate:${k + 1}`, `gate: ${p}`, 'gate')", "mk(`gate-r${S.rounds}:${k + 1}`, `gate: ${p}`, 'gate')", 'gate that stays red'],
  ['the gate runs npm run verify without the render lock', TASK, 'node scripts/workflows/verify-locked.mjs --log', 'npm run verify --log', 'under the render lock'],
  ['the wave lets an invalid task id through', WAVE, 'if (!RUN_LABEL.test(String(label))) fail(', 'if (false) fail(', 'arguments are validated before any agent runs'],
  ['taste findings enter the fix loop', TASK, "if (g.severity === 'taste') {", 'if (false) {', 'taste and minor findings never reach'],
  ['minor findings enter the fix loop', TASK, "else if (g.severity === 'minor') {", 'else if (false) {', 'taste and minor findings never reach'],
  ['a declined finding is not parked', TASK, 'S.parked.push(Object.assign({}, f, { reason: `declined by the fixer: ${d.reason}` }))', 'void 0', 'fixer declines'],
  ['a repeat finding does not escalate the fixer', TASK, 'const escalate = open.some((f) => (na[f.id] || 0) >= 1)', 'const escalate = false', 'findings still open after round 2'],
  ['a gate-only round still runs the re-critic', TASK, "const skipCritic = active.every((f) => f.src === 'gate')", 'const skipCritic = false', 'red gate-0 skips the re-critic'],
  ['a round with no commit is reviewed anyway', TASK, 'if (S.head === roundBase) {', 'if (false) {', 'no new commit'],
  ['an unfilmed case is ignored', TASK, "if (!c) found.push(mk(`film:${id}`, `case ${id} was not filmed; a case that cannot be filmed is a fail`, 'film'))", 'if (!c) void 0', 'unfilmed case'],
  ['a software renderer is accepted', TASK, '/swiftshader|llvmpipe|software|basic render/i', '/never-matches-anything/', 'software renderer'],
  ['a null critic does not stop the run', TASK, "if (missing.length) halt('review'", 'if (false) halt(\'review\'', 'null critic'],
  ['ports collapse to one', TASK, 'critic: PORTS[1]', 'critic: PORTS[0]', 'ports are assigned per role'],
  ['carries are not given to the critic', TASK, "A.carries ? `Carried from earlier work (binding):${NL}${A.carries}` : '',", "'',", 'carries, trailer and the brief'],
  ['a CR byte in a workflow script', TASK, 'const NL = String.fromCharCode(10)', `const NL = String.fromCharCode(10)${CR}`, 'LF only'],
  ['the wave trusts the child head', WAVE, 'base = v.head', 'base = res.head', 'child head that differs from git'],
  ['the wave accepts an unconfirmed verify read', WAVE, "String((v && v.catFile) || '').trim() !== `EXISTS ${head}`", 'false', 'bad verifyHead read between tasks'],
  ['the wave goes on past a parked task', WAVE, "if (res.status !== 'complete') {", 'if (false) {', 'parked task parks the wave'],
  ['taste calls are not carried forward', WAVE, "taste.push(Object.assign({ task: t.task }, c)); flow.push(", 'taste.push(Object.assign({ task: t.task }, c)); [].push(', 'taste calls and deferred minors carry forward'],
  ['the wave git read drops the no-remote rule', WAVE, lines('    `- ${NO_REMOTE}`,', '  ].join(NL)', '  verifyCalls++'), lines("    '- omitted',", '  ].join(NL)', '  verifyCalls++'), 'tasks run in order'],
  ['the wave override check is skipped', WAVE, "role('verifyHead') // validate the override now, before any task runs", '', 'arguments are validated before any agent runs'],
]

if (process.argv.includes('--list')) {
  for (const m of MUTANTS) console.log(`${m[0]}  [${m[1]}]  -> ${m[4]}`)
  process.exit(0)
}
const filter = process.argv.slice(2).find((a) => !a.startsWith('--'))
const count = (s, sub) => s.split(sub).length - 1

fs.rmSync(OUT, { recursive: true, force: true })
let bad = 0
let ran = 0
function harness(dir, only) {
  const args = [path.join(HERE, 'harness.mjs'), '--workflows-dir', dir]
  if (only) args.push('--only', only)
  return spawnSync(process.execPath, args, { encoding: 'utf8' })
}
const clean = harness(SRC, '')
if (clean.status !== 0) {
  console.log(`the unmodified scripts do not pass the harness:${NL}${clean.stdout}`)
  process.exit(1)
}
MUTANTS.forEach(([name, file, find, replace, scenario], i) => {
  if (filter && !name.includes(filter)) return
  const dir = path.join(OUT, String(i))
  fs.cpSync(SRC, dir, { recursive: true })
  const target = path.join(dir, file)
  const text = fs.readFileSync(target, 'utf8').split(CR).join('')
  const n = count(text, find)
  if (n !== 1) {
    bad++
    console.log(`BAD MUTANT ${name}: the text to break occurs ${n} times in ${file}, not once`)
    return
  }
  fs.writeFileSync(target, text.replace(find, () => replace))
  ran++
  const r = harness(dir, scenario)
  const failed = String(r.stdout).split(NL).filter((l) => l.startsWith('FAIL '))
  if (r.status === 1 && failed.length) console.log(`caught   ${name}  (${failed[0].slice(5, 70)})`)
  else {
    bad++
    console.log(`SURVIVED ${name}  (--only "${scenario}" exit ${r.status}; ${String(r.stdout).split(NL).filter((l) => l.startsWith('PASS')).length} scenario(s) passed)`)
  }
})
fs.rmSync(OUT, { recursive: true, force: true })
console.log(`${NL}mutants: ${ran - bad}/${ran} caught${bad ? `, ${bad} not` : ''}`)
process.exit(bad ? 1 : 0)
