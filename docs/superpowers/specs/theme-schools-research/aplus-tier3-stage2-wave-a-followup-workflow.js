export const meta = {
  name: 'tier3-stage2-wave-a-followup',
  description: 'Tier 3 Stage 2 wave A follow-up: swiss and glassmorphism in-school header names, vaporwave light CRT power-on, VT background and preserveDrawingBuffer; verify, critic, one conditional fix round',
  phases: [
    { title: 'Build', detail: 'one builder per school on its own snapshot port (Opus/high)' },
    { title: 'Verify', detail: 'one verifier per school, fresh snapshot (Sonnet/medium)' },
    { title: 'Critic', detail: 'one cross-school critic (Opus/medium)' },
    { title: 'Fix', detail: 'fixer (Opus/high) + re-check (Sonnet/medium) per school with a confirmed blocker/major' },
  ],
}

const R = 'docs/superpowers/specs/theme-schools-research'
const SCHOOLS = ['swiss', 'glassmorphism', 'vaporwave']

const COMMON = `You are one agent in a workflow for Tier 3, Stage 2 (the defect sweep) of the theme-schools work ("the Portal", BDL-010) in the repo at C:/git/birchdesignlab, branch feat/theme-schools-tier3-stage2. Never call it "Period Rooms".

Already done before you started (do not redo, do not re-ask): the P5 wordmark proof; the judge hardening (wordmarkOverlap, wordmarkBlank at 80 ms, wordmarkBlink with blend, wordmarkDrawn; scripts/themes/rejudge-wordmark.mjs); and wave A of the sweep, committed: vaporwave (E1 in-school swap, E2 Contact overflow, the floor through the portal tail, Exo 2 and VT323 preloads), glassmorphism (E15: fades through the field, no blur), swiss (item 10: column panels clear, hold, lay; one-step wordmark swap at 345 ms, top-anchored). Its record, with the founder's questions and the small follow-ups, is ${R}/tier3-stage2/wave-a.md. The founder answered at the wave A stop (${R}/tier3-briefs/stage0-decisions.md, "At the wave A stop"; binding). Their latest message ("your recommendation for all 3 calls sounds good. your two small fixes sound fine in theory. let's do the wave A follow up then stop to assess where we stand before wave B") approves exactly the follow-up items in your slice and nothing more. Wave B (cottagecore, grandmillennial, bauhaus) is NOT part of this workflow.

Read first: ${R}/tier3-stage2/wave-a.md, ${R}/tier3-briefs/stage0-decisions.md ("At the wave A stop"), src/themes/README.md ("View-transition names", "Motion and backgrounds", "The wordmark"), and the header comments of scripts/themes/motion.mjs and scripts/themes/snap.mjs for exact usage.

Environment:
- A Worker (wrangler dev) on :8787 belongs to the orchestrator. Never film it, start it, stop it or rely on what it serves: snap.mjs builds rewrite dist/, which it serves.
- Build and film only through snap.mjs (builds under the shared render lock, freezes the build as scripts/themes/.out/snap-<name>/, serves it on your port; --reuse serves an existing snapshot). render.mjs (stills, contrast, the school's built tests) builds under the same lock; you may run it. Never run npm run build, astro build, npm run verify, npm run dev:worker or wrangler yourself.
- Wave A's final state is the "before" for this follow-up: its films are in scripts/themes/.out/stage2-<school>/ (wordmark crops), stage2-<school>-full/ (full frame where they exist) and stage2-<school>-switcher/. Main's state is the frozen scripts/themes/.out/snap-head/ (serve it with --reuse on your head port if you need it).
- Other agents edit other schools in the same working tree at the same time. Keep your school buildable between edits; if a build fails in a file that is not yours, wait a minute and retry.
- BDL_GPU=1 for every Playwright run.

Rules for every agent in this workflow:
- Work only in your slice. Never touch a file outside it; never revert or reformat another agent's change.
- No git commands that change state (commit, add, branch, checkout, switch, stash, reset, rebase, restore, worktree). Read-only git is fine. The orchestrator commits.
- Do not run npm install or change package.json.
- Copy is the founder's: add no visible words; decoration is aria-hidden. No em dashes in anything a visitor can read. Fix structure, not copy-dependent line breaks.
- Reduced motion is out of scope (decision S1).
- Do only the items in your slice; name anything else you notice in your report.
- The README's view-transition contract binds: wordmark is the only cross-school name; a school's own chrome is named <id>-* with ONE :is() rule keyed on data-to-theme / data-from-theme (the README recipe), used once per page; never another school's prefix; none of the forbidden properties on ::view-transition (a background is allowed); never mention bdl-switcher. A named element is a stacking context and a backdrop root while named: name the element that carries a backdrop-filter itself, never an ancestor of blurring elements.
- Edit files with the Edit/Write tools, never PowerShell Get-Content/Set-Content. The Edit/Write tools can decode backslash escape sequences in your payload into real characters: check the bytes with grep and run "file <path>" when a file must contain a literal backslash sequence.
- Match the surrounding code's comment density, naming and idiom. Refer to the founder as "the founder" or "they".
- Evidence over assertion: every claim names the file, strip (and frame time) or number that shows it. Open the images you cite with the Read tool.
- Your final answer is data for the orchestrator, not a message to the founder.`

const GATES = `Gates that must still pass after your change (wave A passed all of them; do not regress any):
1. No frame shows both pages' body text legible; no white or unpainted frame (except where your slice says otherwise).
2. The switcher holds still (motion.mjs --crop switcher, arrive and page, desktop and mobile; the manifest verdict).
3. In-school swaps finish under about 700 ms.
4. The wordmark: --crop wordmark, arrive from quiet and page, dark and light, desktop and mobile: wordmarkOverlap and wordmarkBlank (<= 80 ms) on arrivals, wordmarkBlink on page swaps, wordmarkDrawn with no suspects.
5. No horizontal scroll at 390 px; contrast both schemes; node scripts/themes/render.mjs --theme <school> passes and its stills look right.
6. The school's built guard for view-transition names (tests/built/portal.test.ts, run by render.mjs for the school): shapes, one declaration per name, <id>-* keyed on data-to-theme/data-from-theme.
Film the after set into label stage2-<school>-fu (and stage2-<school>-fu-full, stage2-<school>-fu-switcher), and make before/after sheets with compare-strips.mjs (.jpg) into scripts/themes/.out/stage2-<school>-fu-compare/, before = wave A's film of the same case.`

const SLICES = {
  swiss: {
    port: 4463, headPort: 4563, verifyPort: 4473, recheckPort: 4483,
    files: 'src/themes/swiss/** (theme.css, Header.astro only if a class hook is needed)',
    items: `1. Name the header swiss-header for in-school swaps only (founder answer 1), with the README recipe: one :is() rule, html[data-theme='swiss']:is([data-to-theme='swiss'], [data-from-theme='swiss']:not([data-to-theme])) <the header element> { view-transition-name: swiss-header; }. Pick the element that holds the wordmark row and the nav (src/themes/swiss/Header.astro: header.site-header or its .sw-row.bar) and say why. The wordmark inside it keeps its own wordmark name and group.
2. The header group must hold still on every in-school swap, in the frames: the nav links never vanish, move or blink. Decide how the current-page highlight (the red aria-current link) changes: animation: none on ::view-transition-group(swiss-header) swaps the old picture for the new at once (station-clock idiom, consistent with the one-step wordmark), animation-name: none keeps a crossfade in place. Prefer the one-step change, and say at which moment the highlight switches.
3. Arrivals from other schools are unchanged: the header is unnamed there and rides the panels (check arrive strips).
4. Keep everything else from wave A: the panels, the hold, the four desktop beats (founder answer 3: kept), the wordmark's step swap and its blank of 0. The column panels now pass beneath the header group; check that nothing of the old page shows through or around the header during the clear and lay, on desktop and phone.
Verify with: motion.mjs --crop header --scenarios page, dark and light, desktop and mobile (the header crop must look identical in every frame apart from the highlight's one step), full-frame page strips (the phone case that failed: page light mobile), and the gates.`,
  },
  glassmorphism: {
    port: 4462, headPort: 4562, verifyPort: 4472, recheckPort: 4482,
    files: 'src/themes/glassmorphism/** (theme.css, Header.astro only if a class hook is needed)',
    items: `1. Name the header bar glassmorphism-header for in-school swaps only (founder answer 1), with the README recipe (one :is() rule keyed on data-to-theme / data-from-theme). The bar is <div class="bar glass glass-strong"> in src/themes/glassmorphism/Header.astro and carries the backdrop-filter: name that element itself, never an ancestor (README: a named element is a backdrop root).
2. The frosted bar must still look frosted during the swap. A captured element's snapshot and its backdrop-filter interact in ways the README flags; film it and look: the bar must not turn clear, dark, flat or double during the in-school swap, in light and dark, desktop and mobile. If naming breaks the glass in a way no simple rule fixes, stop and report it with the strips rather than shipping a broken bar.
3. The bar and nav must hold still on in-school swaps (no dip toward the field; wave A showed about 2 frames of dip at page dark mobile +155 to +184 ms). Choose the group's animation (animation: none for an instant swap of the current-page mark, or animation-name: none to keep a crossfade in place) and say why.
4. Arrivals from other schools are unchanged: the bar is unnamed there and rides the fade.
5. Keep everything else from wave A (E15's fades, the wordmark default and its offsets).
Verify with: motion.mjs --crop header --scenarios page (dark and light, desktop and mobile), full-frame page strips (page dark mobile, page light desktop), and the gates.`,
  },
  vaporwave: {
    port: 4461, headPort: 4561, verifyPort: 4471, recheckPort: 4481,
    files: 'src/themes/vaporwave/** (theme.css, fx.ts)',
    items: `1. The light scheme's CRT power-on (founder answer 2). Arriving at vaporwave in light, vw-crt-on's brightness washes the pastel page near white from about +360 to +600 ms (stage2-vaporwave-compare/arrive-light-mobile.jpg; the same on main). Give the light scheme its own gentler power-on: keep the beam line, the squash-open shape and the 640 ms timing, and lower the brightness through the opening (for example about brightness(1.1) saturate(0.7) at 30%, brightness(1) by 65%) so no frame is whiter than the pastel page's lightest surface. Key it on the arriving page's scheme (html[data-theme='vaporwave'][data-scheme='light'] with the existing cross-school guard; vaporwave's nativeScheme is dark, so check what a visitor with no stored scheme and a light OS gets and handle it the way theme.css already decides light). Dark is untouched: its strips must match wave A's.
2. The view-transition background follows the scheme (approved small fix): in light, the in-school tear band and skew slivers show the dark #07011a ::view-transition background as a dark band for 60 to 180 ms. Use a light-scheme background (the pastel field or the sky's lower colour) so the tear reads as tape, not a dropout. The shared ::view-transition pseudo allows only a background (README): set nothing else on it. Dark keeps #07011a.
3. preserveDrawingBuffer (approved small fix, conditional): wave A's builder added preserveDrawingBuffer: true in fx.ts as well as deferring the WebGL context's release until the swap's transition settles. The critic noted the deferral alone fixed the white hero. Remove preserveDrawingBuffer; film the in-school swap from Home (page, dark and light, desktop and mobile, full frame dense); if no frame shows a grey, white or blank hero, keep it removed and report the frame evidence; if the hero breaks, restore it and report why. Keep every fx.ts lifecycle guarantee (owner check, DPR cap, pauses, context loss and restore, WEBGL_lose_context on teardown).
Verify with: full-frame arrive light (desktop and mobile) and arrive dark (desktop) to show the light power-on changed and dark did not; page light and dark (desktop and mobile) for the tear background and the hero; and the gates.`,
  },
}

const REPORT = {
  type: 'object',
  properties: {
    school: { type: 'string' },
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
    compare_sheets: { type: 'array', items: { type: 'string' } },
    snapshot: { type: 'string' },
    deferred: { type: 'array', items: { type: 'string' } },
    founder_questions: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'string' } },
  },
  required: ['school', 'summary', 'files_changed', 'details', 'acceptance', 'compare_sheets', 'snapshot', 'deferred', 'founder_questions', 'risks'],
}

const FINDINGS = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['pass', 'fail'] },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          school: { type: 'string' },
          severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
          claim_checked: { type: 'string' },
          problem: { type: 'string' },
          evidence: { type: 'string' },
          fix: { type: 'string' },
        },
        required: ['school', 'severity', 'claim_checked', 'problem', 'evidence', 'fix'],
      },
    },
    confirmed: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
  required: ['verdict', 'findings', 'confirmed', 'notes'],
}

const BUILDER = (id) => {
  const s = SLICES[id]
  return `${COMMON}

YOUR SLICE (follow-up builder for ${id}). Files you own: ${s.files}.
Build and film with node scripts/themes/snap.mjs --name ${id}-fu --port ${s.port} (rebuild after each round of edits; --reuse to re-film the same build). Main's frozen build, if you need it: snap.mjs --name head --reuse --port ${s.headPort}.

Items:
${s.items}

${GATES}

Iterate until the items are done and every gate passes, and the result looks right in the frames, not merely passing. If an item cannot be done without breaking a protected element or a gate, stop and report it as a founder question.`
}

const VERIFIER = (id, b) => {
  const s = SLICES[id]
  return `${COMMON}

YOUR SLICE (verifier for the ${id} follow-up): try to refute the builder's claims. Read-only on src/ and tests/. Build a fresh snapshot of the current tree with node scripts/themes/snap.mjs --name verify-${id}-fu --port ${s.verifyPort} and film only from it (label stage2-${id}-fu-verify). Default to a finding when unsure.
Attack every item and every gate the builder reported. Re-film independently at least: the in-school page swap full frame, dense, light mobile and dark desktop; the header crop (--crop header --scenarios page) where the slice is about the header; the arrive case the slice changes; the wordmark crops for arrive from quiet and page on mobile, both schemes; the switcher crop for arrive and page on mobile. Open every strip you cite. Check the diff (git diff -- src/themes/${id}) against the README contract, and that git status shows no change outside the builder's slice. Findings carry school "${id}".

Items the builder was given:
${s.items}

The builder's report:
${JSON.stringify(b, null, 2)}`
}

const CRITIC = (lanes) => `${COMMON}

YOUR SLICE (critic for the wave A follow-up): review the three follow-ups for quality, not only acceptance. Read-only on src/ and tests/; you may film from the verifiers' snapshots with snap.mjs --name verify-<school>-fu --reuse --port 4490 (label stage2-wave-a-fu-critic); never build.
For each school, open the before/after sheets and the verifier's strips:
- swiss: does the nav now truly hold still on phones and desktop, does the highlight change read as a deliberate station-clock step, and do the panels look right beneath the header?
- glassmorphism: is the bar still unmistakably frosted glass through the swap, with no dip?
- vaporwave: does the light power-on still read as a CRT turning on (beam, squash) without whiting out; is dark unchanged; does the light tear read as tape; is the hero intact without preserveDrawingBuffer?
Also: contract compliance, clean code in the file's idiom, and anything the verifiers missed. Severity: blocker = acceptance fails or a protected element breaks; major = a defect or quality miss the founder would see; minor = polish. Every finding names its school.

Lanes:
${JSON.stringify(lanes, null, 2)}`

const FIXER = (id, lane, findings) => {
  const s = SLICES[id]
  return `${COMMON}

YOUR SLICE (fixer for the ${id} follow-up): fix the blocker and major findings below, and nothing else. Files: ${s.files}. Build and film with snap.mjs --name ${id}-fu --port ${s.port}; re-film into the same labels (manifests merge) and remake any affected sheet. For a finding you judge wrong, say why with evidence instead of changing code. Report in the builder's shape with the gates re-checked.

Items:
${s.items}

${GATES}

The lane so far:
${JSON.stringify(lane, null, 2)}

Findings to fix:
${JSON.stringify(findings, null, 2)}`
}

const RECHECK = (id, fx, findings) => {
  const s = SLICES[id]
  return `${COMMON}

YOUR SLICE (re-check for the ${id} follow-up): confirm or refute that each finding is resolved, and that the fix broke no gate it touched. Read-only on src/ and tests/. Fresh snapshot: snap.mjs --name recheck-${id}-fu --port ${s.recheckPort}; label stage2-${id}-fu-recheck. Open the strips. Default to "not resolved" when unsure.

The fixer's report:
${JSON.stringify(fx, null, 2)}

Findings:
${JSON.stringify(findings, null, 2)}`
}

const lanes = await pipeline(
  SCHOOLS,
  (id) => agent(BUILDER(id), { label: `follow-up ${id}`, phase: 'Build', schema: REPORT, model: 'opus', effort: 'high' }),
  (b, id) => b
    ? agent(VERIFIER(id, b), { label: `verify ${id}`, phase: 'Verify', schema: FINDINGS, model: 'sonnet', effort: 'medium' }).then((v) => ({ id, builder: b, verifier: v }))
    : { id, builder: null, verifier: null },
)

phase('Critic')
const done = lanes.filter(Boolean)
const critic = await agent(CRITIC(done), { label: 'critic follow-up', phase: 'Critic', schema: FINDINGS, model: 'opus', effort: 'medium' })

const serious = (id) => [
  ...((done.find((l) => l.id === id)?.verifier?.findings) ?? []),
  ...((critic?.findings ?? []).filter((f) => f.school === id)),
].filter((f) => f.severity !== 'minor')

const toFix = SCHOOLS.filter((id) => serious(id).length)
let fixes = []
if (toFix.length) {
  log(`fix round for: ${toFix.join(', ')}`)
  fixes = await pipeline(
    toFix,
    (id) => agent(FIXER(id, done.find((l) => l.id === id), serious(id)), { label: `fix ${id}`, phase: 'Fix', schema: REPORT, model: 'opus', effort: 'high' }),
    (fx, id) => fx
      ? agent(RECHECK(id, fx, serious(id)), { label: `re-check ${id}`, phase: 'Fix', schema: FINDINGS, model: 'sonnet', effort: 'medium' }).then((r) => ({ id, fix: fx, recheck: r }))
      : { id, fix: null, recheck: null },
  )
} else {
  log('no blocker or major findings: fix round skipped')
}

return { lanes: done, critic, fixes }
