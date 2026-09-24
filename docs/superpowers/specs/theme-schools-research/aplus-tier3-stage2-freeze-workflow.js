export const meta = {
  name: 'tier3-stage2-freeze-investigation',
  description: 'Tier 3 Stage 2 held item 2: measure the first-draw freeze, try drawing ahead (portal) and cheaper first draws (schools), ship only clean invisible wins; critic + re-measure, one conditional fix round. Timing agents run one at a time.',
  phases: [
    { title: 'Measure', detail: 'M: baseline and attribution, alone on the machine (Opus/high)' },
    { title: 'Draw ahead', detail: 'D: portal-side pre-draw experiment, alone (Opus/high)' },
    { title: 'Lighter draw', detail: 'L: per-school cheaper first draw experiment, alone (Opus/high)' },
    { title: 'Check', detail: 'critic (Opus/medium, read-only) and re-measure (Sonnet/medium)' },
    { title: 'Fix', detail: 'fixer (Opus/high) + re-check (Sonnet/medium), only on a confirmed blocker/major' },
  ],
}

const R = 'docs/superpowers/specs/theme-schools-research'

const COMMON = `You are one agent in a workflow for Tier 3, Stage 2 of the theme-schools work ("the Portal", BDL-010) in the repo at C:/git/birchdesignlab, branch feat/theme-schools-tier3-stage2. Never call it "Period Rooms".

Already done before you started (do not redo, do not re-ask): all six schools' Stage 2 repairs (waves A and B and both follow-ups, committed), including the portal-level fix for the wordmark after a scrolled swap. The founder chose, for the held items, a freeze investigation (${R}/tier3-briefs/stage0-decisions.md, "At the wave B stop"; binding): measure the first-draw freeze and try both reductions, drawing the next page ahead of time and making heavy schools cheaper to draw the first time, and report what each saves with numbers and strips. A change ships only if it is clean and invisible. The founder's own framing (same file, "What the transitions phase means"): stalls are reduced where possible, never promised away. Glassmorphism's plain fade and Safari are NOT part of this. The Stage 2 wrap-up comes after, separately.

Read first:
- ${R}/tier3-stage2/wave-b.md, "The held review", item 2 (the evidence so far): longest presented-frame gap on a desktop arrival in a fresh browser: grandmillennial 424 to 435 ms (main 423), cottagecore 327 to 380, vaporwave 234 to 307, glassmorphism about 220, bauhaus 86 to 88, swiss under 100. Once about 414 ms in light, so dark is not required. Cottagecore's 37% HTML cut did not move its first render, so the cost is drawing, not downloading.
- ${R}/tier3-stage1/p4-trace.md (method; the off-screen draw measured at 75 to 107 ms to first frame; the pf-render condition).
- src/themes/portal/runtime.ts (the warm-up: warmPages, the font wait) and src/themes/README.md ("Motion and backgrounds").
- The header comments of scripts/themes/trace-arrival.mjs (conditions cold, pf-render, switcher-warm, warm; --trace), scripts/themes/motion.mjs (--dense, dense.maxGapMs) and scripts/themes/snap.mjs.

The measurement rule: timing is only meaningful when nothing else runs. This workflow runs its timing agents one at a time. While you measure, do not build; build first (snap.mjs), then measure against the frozen snapshot. BDL_GPU=1 always (the RTX 3070; headless otherwise silently uses SwiftShader). At least 5 runs per condition; report medians and spread. A screencast gap can overstate a stall when the capture itself lags, so cross-check the worst cases with a Chrome trace (presented or dropped compositor frames, raster, GPU and paint time) before calling a gap a freeze.

Environment and rules:
- A Worker on :8787 belongs to the orchestrator: never film it, start it, stop it or rely on it. Build and serve only through snap.mjs on your named port; never run npm run build, astro build, npm run verify, npm run dev:worker or wrangler yourself. You may run npx vitest run tests/<file>.test.ts.
- No git commands that change state. The orchestrator commits.
- Scripts go in scripts/themes/ (tools) or scripts/themes/harness/ (probes), with a header comment (what, why, written 09-23-26, usage). Never in a scratchpad.
- Prototype first, ship second: try an idea through an init script or a probe before touching src/. A change to src/ ships only if it (a) measurably reduces the freeze, (b) changes no pixel of any school at rest (render.mjs stills plus scripts/themes/diff-captures.mjs at its default tolerance, both schemes, desktop and mobile, for every school it touches), and (c) keeps every Stage 2 gate: the wordmark judge (overlap, blank <= 80 ms, blink, drawn), switcher hold-still, no superimposed type, no white frame. If an idea fails the bar, leave src/ as you found it (undo your own edits by hand) and report the measurement anyway: a measured "no" is a result.
- Copy is the founder's; add no visible words. No em dashes a visitor can read. Reduced motion is out of scope (S1). The README's view-transition contract binds.
- Edit with the Edit/Write tools, never PowerShell Get-Content/Set-Content.
- Match the surrounding code's comment density and idiom. Refer to the founder as "the founder" or "they".
- Evidence over assertion; open every image you cite with the Read tool.
- Your final answer is data for the orchestrator, not a message to the founder.`

const REPORT = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    measurements: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          school: { type: 'string' },
          viewport: { type: 'string' },
          scheme: { type: 'string' },
          condition: { type: 'string' },
          runs: { type: 'number' },
          max_gap_ms_median: { type: 'number' },
          max_gap_ms_range: { type: 'string' },
          first_visible_ms_median: { type: 'number' },
          note: { type: 'string' },
        },
        required: ['school', 'viewport', 'scheme', 'condition', 'runs', 'max_gap_ms_median', 'max_gap_ms_range', 'first_visible_ms_median', 'note'],
      },
    },
    attribution: { type: 'string', description: 'Where the freeze time goes (trace categories), per heavy school' },
    shipped: { type: 'array', items: { type: 'string' }, description: 'src/ changes kept, each with its measured gain and its invisibility evidence' },
    not_shipped: { type: 'array', items: { type: 'string' }, description: 'Ideas tried and dropped, each with its measurement and why' },
    files_changed: { type: 'array', items: { type: 'string' } },
    films: { type: 'array', items: { type: 'string' }, minItems: 1 },
    scripts_added: { type: 'array', items: { type: 'string' } },
    founder_questions: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'measurements', 'attribution', 'shipped', 'not_shipped', 'files_changed', 'films', 'scripts_added', 'founder_questions', 'risks'],
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
          claim_checked: { type: 'string' },
          problem: { type: 'string' },
          evidence: { type: 'string' },
          fix: { type: 'string' },
        },
        required: ['severity', 'claim_checked', 'problem', 'evidence', 'fix'],
      },
    },
    confirmed: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
  required: ['verdict', 'films_made', 'findings', 'confirmed', 'notes'],
}

const M = `${COMMON}

YOUR SLICE (agent M, measure and attribute; you change nothing under src/). Port 4491; snapshot name freeze-base.
1. Build the current tree once: node scripts/themes/snap.mjs --name freeze-base --port 4491 --hold is not needed; use -- <command> runs, or --reuse after the first build.
2. Baseline, every school including quiet as a destination, arriving from quiet (quiet from vaporwave): desktop and mobile, dark and light, fresh browser per run, at least 5 runs: the longest presented-frame gap during the transition (motion.mjs --dense's dense.maxGapMs, or a better frame-timing measure you add to trace-arrival.mjs), first visible change, ready and finished. Also the in-school page swap for the heavy schools, and the conditions warm (second arrival), switcher-warm (the portal's shipped warm-up) and pf-render (the destination drawn once in an invisible iframe beforehand).
3. Attribute the freeze for the stalling schools with Chrome traces (trace-arrival.mjs --trace): between the swap and the first presented frame, how much is style, layout, paint, raster, GPU, image or SVG decode, pattern tiling, WebGL, script. Name the heaviest single contributors per school (for example grandmillennial's pattern fills, cottagecore's 787 specimen paths or its fireflies canvas, vaporwave's WebGL and CRT filters, glass's blur and glow), with a stub test where it proves the point (an init script that hides one layer and re-measures).
4. Say whether the screencast gaps are real stalls (the trace agrees) or capture lag.
5. Write ${R}/tier3-stage2/freeze-investigation.md: method, the baseline table, the attribution, and which reductions look promising for D (draw ahead) and L (cheaper first draw), plainly written, dated 09-23-26.`

const D = (m) => `${COMMON}

YOUR SLICE (agent D, draw ahead: the portal side). Port 4492; snapshot names freeze-d*. Files you may change: src/themes/portal/runtime.ts (and src/themes/portal/switcher.ts only if the warm-up trigger must move), their unit tests, scripts/themes/ probes. Agent M measured first; its report is at the end, and ${R}/tier3-stage2/freeze-investigation.md holds its tables. Append your section to that file.
The question: can the portal draw the destination page ahead of time, invisibly, so its first real draw during the swap is cheap? The warm-up already fetches the destination's HTML, CSS, fonts and scripts when the switcher dialog opens or Shuffle is pointed at. Candidates: an off-screen, script-less same-origin render of the destination (pf-render showed the idea), warming raster caches for its heaviest layers, decoding its images and fonts, or anything the traces point at. Mind memory and main-thread cost on a phone (Save-Data and 2G are already skipped), that it must never be visible, never steal focus, never run the destination's scripts, and never double any request. Also consider in-school swaps (a page's own links) and the Shuffle pick.
Prototype through an init script first, measure against M's baseline in the same conditions (at least 5 runs), and ship into runtime.ts only if it passes the ship bar in the shared rules. Report both outcomes with numbers.

Agent M's report:
${JSON.stringify(m, null, 2)}`

const L = (m, d) => `${COMMON}

YOUR SLICE (agent L, cheaper first draw: the school side). Port 4493; snapshot names freeze-l*. Files you may change: only the heavy schools M attributes the freeze to (src/themes/<school>/**, from grandmillennial, cottagecore, vaporwave, glassmorphism), each change invisible at rest. Agents M and D ran first; their reports are at the end. Append your section to ${R}/tier3-stage2/freeze-investigation.md.
The question: can each heavy school make its first draw cheaper with no visible change? Candidates, only where M's attribution points: content-visibility: auto with a sensible contain-intrinsic-size on below-the-fold sections (check it never shifts layout, scroll length or a visible pixel, and that a swap's snapshot is unchanged); pattern fills pre-rendered or simplified where the pixels do not change; a canvas or WebGL layer started after the swap's first frame rather than before it (never breaking fx.ts's lifecycle guarantees or the protected fireflies and sunset); cheaper blur or glow drawn the same. Protect every school's brief section 2.
Prototype first, measure against M's baseline (at least 5 runs per condition), and ship only what passes the ship bar, school by school, with diff-captures evidence for every page, both schemes, desktop and mobile.

Agent M's report:
${JSON.stringify(m, null, 2)}

Agent D's report:
${JSON.stringify(d, null, 2)}`

const C = (m, d, l) => `${COMMON}

YOUR SLICE (critic, read-only: no builds, no filming, no timing runs; others are measuring). Review M, D and L: is the method sound (fresh browsers, run counts, capture lag ruled out), are the conclusions supported by the numbers, is every shipped change truly invisible (diff-captures evidence covers every page, scheme and viewport it touches) and safe (memory, main thread, phones, focus, scripts, requests), does it respect the README contract and every school's protect list, and is the write-up in freeze-investigation.md plain and accurate? Read the diffs (git diff) and the evidence files. Severity: blocker = a shipped change is visible, unsafe or unproven; major = a conclusion the numbers do not support, or a gate not re-checked; minor = polish.

M:
${JSON.stringify(m, null, 2)}

D:
${JSON.stringify(d, null, 2)}

L:
${JSON.stringify(l, null, 2)}`

const V = (m, d, l) => `${COMMON}

YOUR SLICE (re-measure, the only agent timing the machine now). Port 4494; snapshot name freeze-verify. Build a fresh snapshot of the current tree and re-measure independently, at least 5 runs each: the two schools with the largest shipped gains, and one school nothing shipped for, desktop dark and light, from quiet; compare with the numbers D and L claim. Re-run diff-captures for one school L changed (before = scripts/themes/.out/snap-head or M's freeze-base snapshot, after = yours). Re-check the gates on one changed school: wordmark crops (arrive from quiet, page; mobile), switcher crop (arrive; mobile). Open the strips. List everything you filmed in films_made. Default to a finding when a number does not reproduce within its spread.

D:
${JSON.stringify(d, null, 2)}

L:
${JSON.stringify(l, null, 2)}`

const FIX = (m, d, l, c, v, findings) => `${COMMON}

YOUR SLICE (fixer): resolve the blocker and major findings below, and nothing else: fix the change, or remove it from src/ if it cannot pass the ship bar, and correct freeze-investigation.md. Port 4495; snapshot name freeze-fix. Report in the same shape as M, D and L.

D:
${JSON.stringify(d, null, 2)}

L:
${JSON.stringify(l, null, 2)}

Critic:
${JSON.stringify(c, null, 2)}

Re-measure:
${JSON.stringify(v, null, 2)}

Findings:
${JSON.stringify(findings, null, 2)}`

const RC = (fx, findings) => `${COMMON}

YOUR SLICE (re-check): confirm or refute that each finding is resolved. Port 4496; snapshot name freeze-recheck (fresh build). Re-measure where the finding is about a number (at least 5 runs) and re-run diff-captures where it is about visibility. List films_made. Default to "not resolved" when unsure.

Fixer:
${JSON.stringify(fx, null, 2)}

Findings:
${JSON.stringify(findings, null, 2)}`

phase('Measure')
const m = await agent(M, { label: 'M measure', phase: 'Measure', schema: REPORT, model: 'opus', effort: 'high' })
if (!m) return { error: 'M returned nothing' }

phase('Draw ahead')
const d = await agent(D(m), { label: 'D draw ahead', phase: 'Draw ahead', schema: REPORT, model: 'opus', effort: 'high' })

phase('Lighter draw')
const l = await agent(L(m, d), { label: 'L lighter draw', phase: 'Lighter draw', schema: REPORT, model: 'opus', effort: 'high' })

phase('Check')
const [c, v] = await parallel([
  () => agent(C(m, d, l), { label: 'critic', phase: 'Check', schema: FINDINGS, model: 'opus', effort: 'medium' }),
  () => agent(V(m, d, l), { label: 're-measure', phase: 'Check', schema: FINDINGS, model: 'sonnet', effort: 'medium' }),
])

const serious = [c, v].filter(Boolean).flatMap((r) => r.findings).filter((f) => f.severity !== 'minor')
let fx = null
let rc = null
if (serious.length) {
  phase('Fix')
  log(`${serious.length} blocker/major finding(s): one fix round`)
  fx = await agent(FIX(m, d, l, c, v, serious), { label: 'fixer', phase: 'Fix', schema: REPORT, model: 'opus', effort: 'high' })
  if (fx) rc = await agent(RC(fx, serious), { label: 're-check', phase: 'Fix', schema: FINDINGS, model: 'sonnet', effort: 'medium' })
} else {
  log('no blocker or major findings: fix round skipped')
}

return { m, d, l, c, v, fx, rc }
