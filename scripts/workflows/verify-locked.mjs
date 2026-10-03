// verify-locked.mjs: runs `npm run verify` while holding the render lock.
//
// Why: `npm run verify` cleans and rebuilds dist/ and .astro/, and snap.mjs, render.mjs and
// the critic's stills all build and copy dist/ under scripts/themes/lib/render-lock.mjs. The
// bdl-task gate runs beside the verifier and the critic, so its build must queue on the same
// lock or it can delete or rewrite dist/ in the middle of their copy (a corrupt frozen snap, or
// a gate that is red for no real cause).
//
// Usage (repo root):
//   node scripts/workflows/verify-locked.mjs [--log <file>] [-- <command> [args...]]
// The command defaults to `npm run verify`. Output goes to stdout and, with --log, to the file
// as well. Exit code: the command's own, 1 when it was killed by a signal, 2 on a usage error.
// The lock is released on every exit path, and the event loop stays free while the command runs
// so the lock's heartbeat keeps beating.
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { acquireLock, releaseLock } from '../themes/lib/render-lock.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const argv = process.argv.slice(2)
const dash = argv.indexOf('--')
const own = dash === -1 ? argv : argv.slice(0, dash)
const cmd = dash === -1 ? [] : argv.slice(dash + 1)
let logFile = null
for (let i = 0; i < own.length; i++) {
  if (own[i] === '--log' && own[i + 1]) logFile = path.resolve(own[++i])
  else {
    console.error('usage: node scripts/workflows/verify-locked.mjs [--log <file>] [-- <command> [args...]]')
    process.exit(2)
  }
}
const command = cmd.length ? cmd : ['npm', 'run', 'verify']

let log = null
if (logFile) {
  fs.mkdirSync(path.dirname(logFile), { recursive: true })
  log = fs.createWriteStream(logFile)
}
process.on('exit', () => releaseLock())
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => process.exit(1))

console.log('verify-locked: taking the render lock')
await acquireLock('verify-locked', 'verify-locked')
console.log(`verify-locked: lock held; running ${command.join(' ')}`)
const code = await new Promise((resolve) => {
  const child = spawn(command.join(' '), { cwd: REPO_ROOT, shell: true, stdio: ['ignore', 'pipe', 'pipe'] })
  const tee = (stream, sink) => stream.on('data', (d) => { sink.write(d); if (log) log.write(d) })
  tee(child.stdout, process.stdout)
  tee(child.stderr, process.stderr)
  child.on('error', (e) => { console.error(`verify-locked: ${e.message}`); resolve(1) })
  child.on('close', (c) => resolve(c === null ? 1 : c))
})
releaseLock()
if (log) await new Promise((r) => log.end(r))
console.log(`verify-locked: lock released; exit ${code}`)
process.exit(code)
