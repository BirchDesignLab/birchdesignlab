export const meta = {
  name: 'tier3-stage2-scrolled-wordmark-close',
  description: 'Tier 3 Stage 2 held item 3, closing step: on a scrolled swap the new wordmark also rides its own page (portal runtime), filmed in all seven schools plus the half-visible case; verify (filming required), critic, one conditional fix round',
  phases: [
    { title: 'Build', detail: 'portal builder (Opus/high)' },
    { title: 'Check', detail: 'verifier (Sonnet/medium, must film) then critic (Opus/medium)' },
    { title: 'Fix', detail: 'fixer (Opus/high) + re-check (Sonnet/medium), only on a confirmed blocker/major' },
  ],
}

const R = 'docs/superpowers/specs/theme-schools-research'

const COMMON = `You are one agent in a workflow for Tier 3, Stage 2 of the theme-schools work ("the Portal", BDL-010) in the repo at C:/git/birchdesignlab, branch feat/theme-schools-tier3-stage2. Never call it "Period Rooms".

Already done before you started (do not redo, do not re-ask): all six schools' Stage 2 repairs, and commit cea8db5, which fixes held item 3 (the wordmark dropping in after a swap clicked from low down a page) in src/themes/portal/runtime.ts: just before the capture, when less than half of the departing wordmark is on screen, its view-transition name is set to none inline, so the new wordmark has no partner and enters where it sits on its school's ::view-transition-new(wordmark) animation. The founder approved fixing held item 3 at the wave B stop (${R}/tier3-briefs/stage0-decisions.md, "At the wave B stop"). This workflow closes the two soft spots that fix left; it is not the freeze investigation or the Stage 2 wrap-up, which come later.

The soft spots, from the follow-up's builder and critic:
1. Swiss, in-school from a scrolled page: its held swiss-header shows an empty wordmark slot for about 320 to 345 ms, because the new wordmark, with no partner, still waits for sw-wordmark-in's step at 61.6% of the group's clock.
2. Bauhaus, in-school from a scrolled page: Astro's fade on the 420 ms group clock draws the new wordmark at about 20 to 40% over the old page for 3 to 8 frames on a phone, before the square wipe reaches it.
The builder's proposed portal-level cure, which the orchestrator chose: on a swap where the departing wordmark was taken out of the morph, also take the ARRIVING page's wordmark out of it (name none) until that transition finishes, so it is drawn as part of its own page (the root, or the school's held header) and appears exactly when its page or header does. One place, every school.

Also, from the critic:
3. The README bullet added in cea8db5 says the unnamed old wordmark "rides the old page's root snapshot"; in swiss, cottagecore and grandmillennial an in-school swap names the header, so it rides that named header's old image instead. Correct the wording.
4. The half-visible case was never filmed: a page scrolled only a little, with the wordmark between about 1% and 99% on screen (for example 30% and 70%). Film it: on either side of the half line nothing must look broken (no two offset wordmarks, no drop from off screen, no empty slot).

Read: src/themes/portal/runtime.ts (all of it, especially the before-preparation, before-swap and arrival-finished handling of data-from-theme), src/themes/README.md ("The wordmark"), node_modules/astro/dist/transitions/router.js and swap-functions.js (when the new document's elements get their names and when the new state is captured), and the header comments of scripts/themes/probe-scrolled-swap.mjs (--to-school, --to, --top), scripts/themes/motion.mjs and scripts/themes/snap.mjs.

Environment and rules:
- A Worker on :8787 belongs to the orchestrator: never film it or rely on it. Build and serve only through snap.mjs on your named port; never run npm run build, astro build, npm run verify, npm run dev:worker or wrangler yourself. npx vitest run tests/<file>.test.ts is fine.
- No git commands that change state. The orchestrator commits.
- Scripts go in scripts/themes/ or scripts/themes/harness/ with a header comment; never in a scratchpad.
- Copy is the founder's; no em dashes a visitor can read. Reduced motion is out of scope (S1). The README's view-transition contract binds.
- Edit with the Edit/Write tools, never PowerShell Get-Content/Set-Content.
- Match the surrounding code's comment density and idiom. Refer to the founder as "the founder" or "they".
- BDL_GPU=1 for every Playwright run. Evidence over assertion; open every image you cite with the Read tool.
- Your final answer is data for the orchestrator, not a message to the founder.`

const REPORT = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    files_changed: { type: 'array', items: { type: 'string' } },
    details: { type: 'string' },
    acceptance: {
      type: 'array',
      items: {
        type: 'object',
        properties: { check: { type: 'string' }, result: { type: 'string', enum: ['pass', 'fail', 'not-run'] }, evidence: { type: 'string' } },
        required: ['check', 'result', 'evidence'],
      },
    },
    films: { type: 'array', items: { type: 'string' }, minItems: 1 },
    compare_sheets: { type: 'array', items: { type: 'string' } },
    scripts_added: { type: 'array', items: { type: 'string' } },
    founder_questions: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'files_changed', 'details', 'acceptance', 'films', 'compare_sheets', 'scripts_added', 'founder_questions', 'risks'],
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

const B = `${COMMON}

YOUR SLICE (builder). Files you own: src/themes/portal/runtime.ts, src/themes/README.md ("The wordmark" only), scripts/themes/probe-scrolled-swap.mjs (for example a --scroll <fraction or px> option for the half-visible case). Port 4497; snapshot names wm-close*. The state before your change is HEAD (cea8db5 plus b6d3dcb): build it first as wm-close-pre for the before films.
1. When the runtime took the departing wordmark out of the morph, also take the arriving page's wordmark out (inline view-transition-name: none on the new document's wordmark before it is captured: in astro:before-swap on e.newDocument, or wherever Astro's swap guarantees it lands before the new capture; the wordmark is the one element carrying data-astro-transition-scope, but confirm there is exactly one per page). Give the name back once the arrival's transition has finished, or been skipped or aborted, and whenever the next navigation starts, so no page is ever left with an unnamed wordmark for its own next swap. Keep the existing behaviour exactly when the departing wordmark stays named (every swap from the top of a page).
2. Correct the README bullet (soft spot 3) and describe the arriving side too, in the section's voice.
3. Film, before (wm-close-pre) and after, labels stage2-wm-close-pre and stage2-wm-close:
   - in-school from the footer, all seven schools (quiet, vaporwave, glassmorphism, swiss, cottagecore, grandmillennial, bauhaus), dark desktop and light mobile, --top 160 and full frame: the wordmark appears with its header or page, never an empty slot, never ahead of its page, never a drop;
   - cross-school from a scrolled page (--to-school with --to about), at least quiet to cottagecore, swiss to vaporwave, grandmillennial to bauhaus, dark desktop and light mobile;
   - the half-visible case: a page scrolled so the wordmark is about 30% and about 70% on screen, for swiss, cottagecore and quiet, dark desktop and light mobile; say what each side of the line shows;
   - regression, unscrolled: motion.mjs --crop wordmark, arrive from quiet and page, all six schools, dark desktop and light mobile: every verdict unchanged; --crop switcher arrive and page on mobile for two schools.
   Make before/after sheets (compare-strips.mjs, .jpg) in scripts/themes/.out/stage2-wm-close-compare/ for at least swiss, bauhaus, cottagecore and quiet.
4. Run npx vitest run for any test you touch.`

const V = (b) => `${COMMON}

YOUR SLICE (verifier): try to refute the builder's claims. You MUST film from your own fresh snapshot (snap.mjs --name wm-close-verify --port 4498; labels stage2-wm-close-verify*) and list every strip in films_made. Read-only on src/. Default to a finding when unsure.
Re-film independently, phone first: in-school from the footer for swiss, bauhaus, cottagecore and quiet (light mobile, then dark desktop), stepping through every frame of the header band; one cross-school scrolled swap; the half-visible case at about 30% and 70% for swiss; the unscrolled wordmark crops for two schools (verdicts unchanged); and two back-to-back navigations started before the first arrival finished (a second click during the transition), to check the name always comes back. Read the diff (git diff) against the README contract.

The builder's report:
${JSON.stringify(b, null, 2)}`

const C = (b, v) => `${COMMON}

YOUR SLICE (critic, read-only: no builds and no timing runs; you may film from the verifier's snapshot with snap.mjs --name wm-close-verify --reuse --port 4490, label stage2-wm-close-critic). Review for quality and safety: does the wordmark now arrive well in every school after a scrolled swap (with its page or header, in the school's own idiom); is the runtime state safe on aborted, rapid, back and forward navigations and on a swap whose transition is skipped; is every swap from the top of a page exactly as before; is the README accurate. Severity: blocker = something visibly broken or a stale unnamed wordmark left behind; major = a defect the founder would see; minor = polish.

Builder:
${JSON.stringify(b, null, 2)}

Verifier:
${JSON.stringify(v, null, 2)}`

const F = (b, findings) => `${COMMON}

YOUR SLICE (fixer): fix the blocker and major findings below and nothing else, in the builder's files. Port 4497 (snap.mjs --name wm-close, rebuild). Re-film the affected cases into the same labels. Report in the builder's shape.

Builder:
${JSON.stringify(b, null, 2)}

Findings:
${JSON.stringify(findings, null, 2)}`

const RC = (fx, findings) => `${COMMON}

YOUR SLICE (re-check): confirm or refute that each finding is resolved and nothing it touched broke. Fresh snapshot snap.mjs --name wm-close-recheck --port 4499; labels stage2-wm-close-recheck*; list films_made. Read-only on src/. Default to "not resolved" when unsure.

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
