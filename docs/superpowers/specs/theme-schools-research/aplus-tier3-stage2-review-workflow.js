export const meta = {
  name: 'tier3-stage2-review',
  description: 'Tier 3 Stage 2 wrap-up review panel: three lens reviewers over the whole branch, refute seats per serious finding, one conditional fix round',
  phases: [
    { title: 'Review', detail: 'motion and acceptance; code, contract and guards; visual idiom and phones (Opus/medium each)' },
    { title: 'Refute', detail: 'one refute seat per blocker/major finding, up to 6 (Sonnet/medium)' },
    { title: 'Fix', detail: 'fixer (Opus/high) + re-check (Sonnet/medium), only on a surviving blocker/major' },
  ],
}

const R = 'docs/superpowers/specs/theme-schools-research'
const GATES = args?.gates ?? '(the orchestrator passes the gate results in args.gates)'

const COMMON = `You are one agent in the review panel that closes Tier 3, Stage 2 (the defect sweep) of the theme-schools work ("the Portal", BDL-010) in the repo at C:/git/birchdesignlab, branch feat/theme-schools-tier3-stage2 (from main at f797bc9). Never call it "Period Rooms".

Already done before you started (do not redo, do not re-ask): the whole of Stage 2. The P5 wordmark proof; waves A and B and their follow-ups for all six schools; the portal-level scrolled-swap wordmark fix; the freeze investigation; and the orchestrator's final gates on a fresh build (results below). The records, in order: ${R}/tier3-stage2/stage2-plan.md, p5-proof.md, wave-a.md, assessment-before-wave-b.md, wave-b.md, freeze-investigation.md. Every founder decision is in ${R}/tier3-briefs/stage0-decisions.md and binds over every brief. The founder's latest message asked for the Stage 2 wrap-up; it does not widen anyone's slice. After this panel the orchestrator writes stage2-report.md and stops for the founder.

Ground rules the founder set that reviewers must NOT flag as defects: reduced motion is out of scope (S1); copy is the founder's (flag copy only if a visitor-visible word changed); glassmorphism's plain fade, Safari, and any remaining first-draw stall are held for the transitions phase (the post-A+ push that turns transitions into transformations); cottagecore's beat of bare table and swiss's header band on a scrolled swap are accepted; swiss's four desktop beats are accepted; the bauhaus 12ch heading stays; pair-stage items (ornament, new layouts, kiosks, controls) are not Stage 2's job.

Final gate results from the orchestrator:
${GATES}

Environment and rules:
- The Worker on :8787 serves the final build for the orchestrator's gates; you may film it read-only only if your slice says so. Otherwise build and film only through snap.mjs on your named port. Never run npm run build, astro build, npm run verify, npm run dev:worker or wrangler yourself.
- Read-only on src/ and tests/ unless you are the fixer. No git commands that change state.
- Scripts go in scripts/themes/ or scripts/themes/harness/ with a header comment; never in a scratchpad.
- BDL_GPU=1 for every Playwright run. Evidence over assertion: every finding names the file and line, or the strip and frame time, or the number. Open every image you cite with the Read tool.
- Refer to the founder as "the founder" or "they". Your final answer is data for the orchestrator.`

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
          id: { type: 'string', description: 'short unique id, e.g. motion-1' },
          school: { type: 'string', description: 'school id, portal, tooling or docs' },
          severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
          problem: { type: 'string' },
          evidence: { type: 'string' },
          fix: { type: 'string' },
        },
        required: ['id', 'school', 'severity', 'problem', 'evidence', 'fix'],
      },
    },
    strengths: { type: 'array', items: { type: 'string' }, description: 'What Stage 2 got right, for the report' },
    notes: { type: 'string' },
  },
  required: ['verdict', 'films_made', 'findings', 'strengths', 'notes'],
}

const VERDICT = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    refuted: { type: 'boolean', description: 'true if the finding is wrong, already accepted by the founder, or not reproducible' },
    reason: { type: 'string' },
    evidence: { type: 'string' },
  },
  required: ['id', 'refuted', 'reason', 'evidence'],
}

const LENSES = [
  {
    key: 'motion',
    port: 4601,
    prompt: `YOUR LENS: motion and acceptance, every school and quiet. Build a fresh snapshot (snap.mjs --name review-motion --port 4601) and film it: arrive from quiet and from one contrasting school, the in-school page swap, and a scrolled swap (probe-scrolled-swap.mjs), dark desktop and light mobile, full frame dense; open every strip frame by frame where it matters. Hold every school to the shared swap acceptance (no superimposed type; no white or unpainted frame; the switcher holds still; in-school swaps under about 700 ms; the wordmark never overlaps, blank <= 80 ms, no blink) and to its brief's Verify lines for the Stage 2 items. Compare with the before strips (scripts/themes/.out/stage2-before/) and say, school by school, whether the repair reads as deliberate and in the school's idiom.`,
  },
  {
    key: 'code',
    port: 4602,
    prompt: `YOUR LENS: code, contract and guards, over the whole branch diff (git diff f797bc9..HEAD). The README contract (view-transition names and their three traps, the wordmark section, type, motion): is every school within it, and does the README describe what the code really does? The portal runtime (runtime.ts): state safety on aborted, rapid, back and forward navigations and skipped transitions; nothing left named or unnamed at rest. The built guards (tests/built/portal.test.ts) and unit tests: do they still guard what matters, and should any new invariant from Stage 2 be pinned by a test? The tooling (motion.mjs, snap.mjs, the render lock, the judge, rejudge, probes): correctness and header comments. Scripts hygiene: nothing outside scripts/themes/, nothing left in a scratchpad. Comments that went stale. No em dashes in visitor-visible text; no visible copy changed (word parity). You may build a snapshot (snap.mjs --name review-code --port 4602) to run targeted checks.`,
  },
  {
    key: 'visual',
    port: 4603,
    prompt: `YOUR LENS: visual idiom and phones. Build a fresh snapshot (snap.mjs --name review-visual --port 4603); run node scripts/themes/render.mjs for any school whose stills you need (it builds under the lock), and look at every page of every school, both schemes, desktop and mobile. For each school, read its brief's section 2 "Protect" and its meta.ts signature: is anything protected broken or diluted by Stage 2 (vaporwave's hero and CRT, glass's traffic lights and toggle, swiss's red, cottagecore's fireflies and specimens, grandmillennial's drapes and chintz, bauhaus's circle)? On phones: overflow at 390 px, touch targets, the switcher and prompt, the header on scroll. Across schools: do the six still read as six distinct schools at thumbnail scale, including the boundaries S3, S4 and S5 set; is the convergence of in-school swaps (wave-b.md, held item 4) a defect for Stage 2 or correctly a transitions-phase note?`,
  },
]

const reviews = await parallel(LENSES.map((l) => () =>
  agent(`${COMMON}\n\n${l.prompt}\nLabel your films stage2-review-${l.key}. Severity: blocker = acceptance fails or a protected element is broken; major = a real defect the founder would see or a guard that no longer guards; minor = polish. Findings need unique ids starting "${l.key}-".`,
    { label: `review ${l.key}`, phase: 'Review', schema: FINDINGS, model: 'opus', effort: 'medium' })))

const all = reviews.filter(Boolean).flatMap((r) => r.findings)
const serious = all.filter((f) => f.severity !== 'minor')
const capped = serious.slice(0, 6)
if (serious.length > capped.length) log(`${serious.length - capped.length} serious finding(s) beyond the 6 refute seats go to the orchestrator unrefuted`)

const verdicts = await parallel(capped.map((f, i) => () =>
  agent(`${COMMON}\n\nYOUR SLICE (refute seat ${i + 1}): try to REFUTE this finding. It is refuted if it is wrong, not reproducible on a fresh build, or something the founder already accepted or held (see the ground rules). Reproduce it yourself from a fresh snapshot (snap.mjs --name review-refute-${i} --port ${4610 + i}) when it is about pixels or motion. Default to refuted=false (the finding stands) only when you reproduced it.\n\nFinding:\n${JSON.stringify(f, null, 2)}`,
    { label: `refute ${f.id}`, phase: 'Refute', schema: VERDICT, model: 'sonnet', effort: 'medium' })))

const standing = capped.filter((f, i) => verdicts[i] && !verdicts[i].refuted)
const unrefuted = serious.slice(6)
let fix = null
let recheck = null
if (standing.length) {
  phase('Fix')
  fix = await agent(`${COMMON}\n\nYOUR SLICE (fixer): fix these confirmed findings and nothing else. You may edit the files they name. Build and film with snap.mjs --name review-fix --port 4620; hold every change to the Stage 2 gates (wordmark judge, switcher hold-still, no superimposed type, no white frame, render.mjs stills and built tests for the schools you touch). For a finding you judge wrong on closer look, say why with evidence instead of changing code.\n\nFindings:\n${JSON.stringify(standing, null, 2)}`,
    { label: 'fixer', phase: 'Fix', schema: FINDINGS, model: 'opus', effort: 'high' })
  if (fix) recheck = await agent(`${COMMON}\n\nYOUR SLICE (re-check): confirm or refute that each finding below is resolved and nothing it touched broke. Fresh snapshot snap.mjs --name review-recheck --port 4621; list films_made; open the strips. Default to "not resolved" when unsure.\n\nFindings:\n${JSON.stringify(standing, null, 2)}\n\nFixer:\n${JSON.stringify(fix, null, 2)}`,
    { label: 're-check', phase: 'Fix', schema: FINDINGS, model: 'sonnet', effort: 'medium' })
}

return { reviews, verdicts, standing, unrefuted, minor: all.filter((f) => f.severity === 'minor'), fix, recheck }
