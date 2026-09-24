export const meta = {
  name: 'tier3-stage2-draw-ahead-rest',
  description: 'Tier 3 Stage 2 wrap-up step 1: tune the switcher draw-ahead mouse rest so reading-pace browsing draws nothing, measure the gain before a click; verify (must measure), critic, one conditional fix round. Timing agents run one at a time.',
  phases: [
    { title: 'Build', detail: 'builder (Opus/high), alone on the machine' },
    { title: 'Check', detail: 'verifier (Sonnet/medium, re-measures alone) then critic (Opus/medium, read-only)' },
    { title: 'Fix', detail: 'fixer (Opus/high) + re-check (Sonnet/medium), only on a confirmed blocker/major' },
  ],
}

const R = 'docs/superpowers/specs/theme-schools-research'

const COMMON = `You are one agent in a workflow for Tier 3, Stage 2's wrap-up of the theme-schools work ("the Portal", BDL-010) in the repo at C:/git/birchdesignlab, branch feat/theme-schools-tier3-stage2. Never call it "Period Rooms".

Already done before you started (do not redo, do not re-ask): all of Stage 2's repairs and the freeze investigation (${R}/tier3-stage2/freeze-investigation.md). Its shipped fix, commit 7731a55, draws a script-less copy of the destination at opacity 0.001 when a mouse rests DRAW_DWELL_MS = 100 ms on a switcher row or on Shuffle, when focus stays FOCUS_DWELL_MS = 500 ms, or on a press (src/themes/portal/runtime.ts drawOnIntent / drawAheadOf; src/themes/portal/switcher.ts). Its measured cost: moving the mouse down the dialog at a reading pace (about 250 ms a row) draws every school, holding the dialog up to about 180 ms at a time. The founder's decision (${R}/tier3-briefs/stage0-decisions.md, "Call 1 revised"; binding): keep drawing ahead on a resting mouse, with a LONGER rest, so browsing the rows at a reading pace draws nothing; a press still starts it. This workflow does only that. The rest of the wrap-up (final gates, a review panel, the report) comes after, separately.

Environment and rules:
- Timing is only meaningful with the machine to itself: timing agents in this workflow run one at a time; build first (snap.mjs), then measure against the frozen snapshot. BDL_GPU=1 always. Fresh browser per cold or hover run (trace-arrival.mjs --fresh-browser), at least 5 runs per cell, medians and spread.
- Waiting on a long batch: wait ONCE (one Monitor on the log with an until-condition, or run the batch in the foreground in chunks under 10 minutes). Never re-issue a sleep-loop waiter after a timeout.
- A Worker on :8787 belongs to the orchestrator: never film it or rely on it. Build and serve only through snap.mjs on your named port; never run npm run build, astro build, npm run verify, npm run dev:worker or wrangler yourself.
- scripts/themes/harness/draw-ahead-check.mjs must run with --serve <snapshot name> (it serves production cache headers); without it the network checks fail falsely.
- No git commands that change state. Scripts go in scripts/themes/ or scripts/themes/harness/, never a scratchpad.
- Edit with the Edit/Write tools, never PowerShell Get-Content/Set-Content. Match the surrounding code's comment density and idiom. Refer to the founder as "the founder" or "they".
- Evidence over assertion. Your final answer is data for the orchestrator.`

const REPORT = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    dwell_ms: { type: 'number', description: 'The mouse rest shipped' },
    measurements: { type: 'string', description: 'Tables: copies drawn per browsing pace, and the freeze per school for each rest-before-click, with runs and spread' },
    files_changed: { type: 'array', items: { type: 'string' } },
    checks: { type: 'string', description: 'draw-ahead-check results (with --serve), wordmark judge and hold-still spot checks' },
    films: { type: 'array', items: { type: 'string' }, minItems: 1 },
    founder_questions: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'dwell_ms', 'measurements', 'files_changed', 'checks', 'films', 'founder_questions', 'risks'],
}

const FINDINGS = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['pass', 'fail'] },
    films_made: { type: 'array', items: { type: 'string' } },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
          problem: { type: 'string' },
          evidence: { type: 'string' },
          fix: { type: 'string' },
        },
        required: ['severity', 'problem', 'evidence', 'fix'],
      },
    },
    notes: { type: 'string' },
  },
  required: ['verdict', 'films_made', 'findings', 'notes'],
}

const B = `${COMMON}

YOUR SLICE (builder). Files you own: src/themes/portal/runtime.ts (the dwell constants and their comments), src/themes/portal/switcher.ts (only if the trigger wiring needs it), scripts/themes/harness/draw-ahead-check.mjs and draw-ahead-browse.mjs (to add browsing paces), scripts/themes/trace-arrival.mjs (only if a rest-then-click condition needs a flag), and the draw-ahead sections of ${R}/tier3-stage2/freeze-investigation.md. Port 4640; snapshot names rest-*.
1. Browsing: measure how many copies are drawn when a mouse moves down the dialog's rows at 150, 250, 350 and 500 ms a row, for candidate rests (for example 200, 300, 400 and 500 ms). The shipped rest must draw 0 copies at 250 ms a row, with margin (say also at 300 ms a row), and must never hold the dialog while the visitor browses.
2. Before a click: for the candidate rests, measure the freeze on arrival (trace-arrival.mjs hover condition, --hover-lead set to the time the mouse rests on the row before clicking) with rests-before-click of 400, 600 and 1000 ms, for grandmillennial, glassmorphism, cottagecore and vaporwave, desktop dark and desktop light, and bauhaus as a light school. The copy needs time to draw before the click to pay off; report the gain curve, and where the rest stops paying.
3. Keep the press trigger and the focus rule (500 ms) as they are; confirm a press still draws when the rest was not reached. Keep every other guard (at most one copy, Save-Data, 2G, hidden tab, arrival in progress, taken down at before-preparation).
4. Pick the rest from the data (the shortest that draws 0 copies at a reading pace with margin), explain the pick in the runtime comment, and ship it. Then run draw-ahead-check.mjs --serve with the shipped rest (rows, sweep at the new reading pace, shuffle, keyboard, navigate; from quiet, swiss and glassmorphism; desktop and mobile; dark and light): every copy judged moves 0 px, nothing twice, console clean. Spot-check the wordmark judge (motion.mjs --crop wordmark, arrive, desktop and mobile dark) and switcher hold-still for two schools with --draw-ahead.
5. Update freeze-investigation.md's shipped section and costs with the new rest and its measured gains.`

const V = (b) => `${COMMON}

YOUR SLICE (verifier; the only agent timing the machine now). You MUST measure and film from your own fresh snapshot (snap.mjs --name rest-verify --port 4641) and list everything in films_made. Read-only on src/. Re-measure independently: copies drawn at 250 and 300 ms a row (0 expected); the freeze for grandmillennial and cottagecore, desktop dark, with the builder's rest-before-click of 600 ms (at least 5 runs, fresh browser); a press with no rest (one school); and draw-ahead-check.mjs --serve rest-verify for rows and sweep from glassmorphism, desktop dark and light. Default to a finding when a number does not reproduce within its spread.

The builder's report:
${JSON.stringify(b, null, 2)}`

const C = (b, v) => `${COMMON}

YOUR SLICE (critic, read-only: no builds, films or timing runs). Is the rest chosen from the data and explained; does browsing at a reading pace truly draw nothing; is the gain before a click honestly reported (including where it no longer pays); are all the guards intact and the invisibility re-proved with --serve; is freeze-investigation.md accurate? Severity: blocker = a visible cost while browsing or a copy that moves a pixel; major = a claim the numbers do not support; minor = polish.

Builder:
${JSON.stringify(b, null, 2)}

Verifier:
${JSON.stringify(v, null, 2)}`

const F = (b, findings) => `${COMMON}

YOUR SLICE (fixer): resolve the blocker and major findings below and nothing else, in the builder's files. Port 4642 (snap.mjs --name rest-fix). Re-measure what you change (5 runs, fresh browser). Report in the builder's shape.

Builder:
${JSON.stringify(b, null, 2)}

Findings:
${JSON.stringify(findings, null, 2)}`

const RC = (fx, findings) => `${COMMON}

YOUR SLICE (re-check): confirm or refute that each finding is resolved. Fresh snapshot rest-recheck on port 4643; re-measure where a finding is about a number; list films_made. Read-only on src/. Default to "not resolved" when unsure.

Fixer:
${JSON.stringify(fx, null, 2)}

Findings:
${JSON.stringify(findings, null, 2)}`

phase('Build')
const b = await agent(B, { label: 'builder', phase: 'Build', schema: REPORT, model: 'opus', effort: 'high' })
if (!b) return { error: 'builder returned nothing' }

phase('Check')
const v = await agent(V(b), { label: 'verifier', phase: 'Check', schema: FINDINGS, model: 'sonnet', effort: 'medium' })
const c = await agent(C(b, v), { label: 'critic', phase: 'Check', schema: FINDINGS, model: 'opus', effort: 'medium' })

const serious = [v, c].filter(Boolean).flatMap((r) => r.findings).filter((f) => f.severity !== 'minor')
let fx = null
let rc = null
if (serious.length) {
  phase('Fix')
  log(`${serious.length} blocker/major finding(s): one fix round`)
  fx = await agent(F(b, serious), { label: 'fixer', phase: 'Fix', schema: REPORT, model: 'opus', effort: 'high' })
  if (fx) rc = await agent(RC(fx, serious), { label: 're-check', phase: 'Fix', schema: FINDINGS, model: 'sonnet', effort: 'medium' })
} else {
  log('no blocker or major findings: fix round skipped')
}

return { b, v, c, fx, rc }
