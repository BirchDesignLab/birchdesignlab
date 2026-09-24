export const meta = {
  name: 'tier3-stage2-wave-b-followup',
  description: 'Tier 3 Stage 2 wave B follow-up: portal-level fix for the wordmark dropping in after a scrolled swap (all seven schools), bauhaus old-wordmark delay, grandmillennial header token; verify (filming required), critic, one conditional fix round',
  phases: [
    { title: 'Build', detail: 'portal lane and schools lane (Opus/high)' },
    { title: 'Verify', detail: 'one verifier per lane, fresh snapshot, filming required (Sonnet/medium)' },
    { title: 'Critic', detail: 'one critic over both lanes (Opus/medium)' },
    { title: 'Fix', detail: 'fixer (Opus/high) + re-check (Sonnet/medium) per lane with a confirmed blocker/major' },
  ],
}

const R = 'docs/superpowers/specs/theme-schools-research'
const LANES = ['portal', 'schools']

const COMMON = `You are one agent in a workflow for Tier 3, Stage 2 (the defect sweep) of the theme-schools work ("the Portal", BDL-010) in the repo at C:/git/birchdesignlab, branch feat/theme-schools-tier3-stage2. Never call it "Period Rooms".

Already done before you started (do not redo, do not re-ask): the P5 wordmark proof; the judge hardening; wave A and its follow-up (vaporwave, glassmorphism, swiss); wave B (cottagecore, grandmillennial, bauhaus), all committed. Read ${R}/tier3-stage2/wave-b.md first: its "Small calls" and "The held review" sections define this workflow. The founder's latest message ("ok lets do the small followup. the four held items. then the stage 2 wrap up") approves THIS small follow-up: the portal-level wordmark fix (held item 3), bauhaus small call 1, and grandmillennial small call 3. It does NOT authorise work on the other held items (Safari, the first-draw freeze, glassmorphism's plain fade) or the wrap-up; those come later, separately. Cottagecore's beat of bare table stays as it is.

Also read: ${R}/tier3-briefs/stage0-decisions.md (binding; every section from "Stage 2 start"), src/themes/README.md ("View-transition names", "Motion and backgrounds", "The wordmark"), src/themes/portal/runtime.ts, and the header comments of scripts/themes/motion.mjs, scripts/themes/snap.mjs and scripts/themes/probe-scrolled-swap.mjs.

Environment:
- A Worker (wrangler dev) on :8787 belongs to the orchestrator. Never film it, start it, stop it or rely on what it serves.
- Build and film only through snap.mjs (builds under the shared render lock, freezes the build as scripts/themes/.out/snap-<name>/, serves it on your port; --reuse serves an existing snapshot). render.mjs builds under the same lock; you may run it. Never run npm run build, astro build, npm run verify, npm run dev:worker or wrangler yourself. You may run npx vitest run tests/<file>.test.ts.
- Main's frozen build: scripts/themes/.out/snap-head/. The state before this workflow: build it yourself from HEAD's committed tree only if you need it; the wave B films (scripts/themes/.out/stage2-<school>-scrolled/, stage2-bauhaus-orch*, stage2-grandmillennial-*) show it.
- The other lane edits other files in the same working tree at the same time. Keep your files buildable between edits; if a build fails in a file that is not yours, wait a minute and retry.
- BDL_GPU=1 for every Playwright run.

Rules:
- Work only in your slice. Never touch a file outside it; never revert or reformat another agent's change.
- No git commands that change state. Read-only git is fine. The orchestrator commits.
- Scripts: any probe or helper goes in scripts/themes/ (a real tool) or scripts/themes/harness/ (a probe), with a header comment (what, why, written 09-23-26, usage). Never in a scratchpad or temp folder.
- No npm install, no package.json changes. Copy is the founder's (add no visible words; no em dashes a visitor can read). Reduced motion is out of scope (S1). Fix structure, not copy-dependent breaks.
- The README's view-transition contract binds, including the three named-chrome traps.
- Edit with the Edit/Write tools, never PowerShell Get-Content/Set-Content; check literal backslash sequences with grep and "file <path>".
- Match the surrounding code's comment density, naming and idiom. Refer to the founder as "the founder" or "they".
- Evidence over assertion; open every image you cite with the Read tool.
- Your final answer is data for the orchestrator, not a message to the founder.`

const SLICES = {
  portal: {
    port: 4467, verifyPort: 4478, recheckPort: 4487,
    files: 'src/themes/portal/runtime.ts (and its unit tests, if any exist or are cheap to add), src/themes/README.md ("The wordmark" section, one bullet), scripts/themes/probe-scrolled-swap.mjs (to extend it)',
    items: `Held item 3, the wordmark dropping in after a scrolled swap (wave-b.md, "The held review", item 3). Every school's header scrolls away with the page, so on a swap clicked from low down a page the old wordmark's captured box is above the viewport and the wordmark group morphs down from off screen; the header sits without a wordmark for about 250 ms, then it slides in from above. One portal-level fix covers all seven schools (quiet included):
1. In runtime.ts, just before the old page is captured (the same place data-to-theme is set, astro:before-preparation, or later if the capture happens later; confirm against Astro 7's transitions source in node_modules/astro/dist/transitions/), find the old page's element whose computed view-transition-name is wordmark. If it is not visible in the viewport (entirely above or below it; decide and justify how much must be visible to count), set its inline view-transition-name to none, so it joins the root snapshot and the new wordmark has no partner: it enters in place on its school's -new(wordmark) animation instead of morphing from off screen. Recompute on every navigation (an aborted navigation must not leave the old page's wordmark unnamed for the next swap: clear the inline style when the wordmark is in view). Update the runtime's header comment.
2. Check what the new wordmark then does in every school, in-school and across schools: with no old image, the ::view-transition-new(wordmark) animation (the school's wordmark-in keyframes on arrival; Astro's astroFadeIn in-school, on the group's clock) must fade it in where it sits, never blink, never pop at full strength before its page, never ride a morph. Where a school's rule would misbehave with no old image, report it (the school files are not yours; the critic and orchestrator decide).
3. Add one bullet to README "The wordmark" saying what the portal does on a swap from a scrolled page and why.
4. Extend probe-scrolled-swap.mjs (keep its style and flags) so it can also film a cross-school swap from a scrolled page (for example --to-school <id>: scroll the source school's Home to the bottom, then follow a link to /t/<id>/, the way motion.mjs's followLink does).
5. Film the proof, labels stage2-scrolled-fix (after) and, from the head or pre-change snapshot, stage2-scrolled-pre if the wave B films do not already show the before for a case:
   - in-school from the footer, all seven schools (quiet, vaporwave, glassmorphism, swiss, cottagecore, grandmillennial, bauhaus), dark desktop and light mobile, --top 160 and full frame: the header never shows an empty wordmark slot followed by a drop from above; the wordmark fades in where it sits;
   - cross-school from a scrolled page, at least three pairs (for example quiet to cottagecore, swiss to vaporwave, grandmillennial to bauhaus), dark desktop and light mobile;
   - regression, unscrolled: motion.mjs --crop wordmark, arrive from quiet and page, all six schools, dark desktop and light mobile: every verdict (overlap, blank, blink, drawn) the same as before (the fix must not fire when the wordmark is in view); plus --crop switcher arrive and page on mobile for two schools.
   Make before/after sheets (compare-strips.mjs, .jpg) in scripts/themes/.out/stage2-scrolled-fix-compare/ for at least four schools.`,
  },
  schools: {
    port: 4468, verifyPort: 4479, recheckPort: 4488,
    files: 'src/themes/bauhaus/theme.css (wordmark rules only), src/themes/grandmillennial/theme.css and src/themes/grandmillennial/Header.astro (the header background token only)',
    items: `Two small calls from wave-b.md ("Small calls"):
1. Bauhaus small call 1: on a phone arrival, the old school's wordmark sits over bauhaus's new nav row for about 50 to 60 ms (around +333 to +366 ms, light mobile; scripts/themes/.out/stage2-bauhaus-orch-full/bauhaus__arrive__light__mobile.png), because both wordmark images inherit the group's 120 ms arrival delay. The old wordmark should start fading at once (animation-delay 0 on ::view-transition-old(wordmark) for arrivals); the new one keeps the delay so the shape leads and the mark settles. Re-tune bauhaus's fade offsets so overlap still passes and the blank stays at or under 80 ms. In-school (no delay) is unchanged. Verify: the full-frame dense arrival from quiet, light mobile and dark desktop, shows no old wordmark over the new nav; the wordmark crops, arrive from quiet and from swiss and page, both schemes, desktop and mobile, pass overlap, blank, blink and drawn.
2. Grandmillennial small call 3: the header's background gradient is copied by hand from the body's (with a different radius), so an edit to one drifts from the other. Tie them with one shared token defined once and used by both, as cottagecore's --table does, with NO visible change: render.mjs captures of all five pages, both schemes, desktop and mobile, before and after, compared with scripts/themes/diff-captures.mjs at its default tolerance; plus the grandmillennial scrolled swap (probe-scrolled-swap.mjs, dark desktop and light mobile) and the header crop (motion.mjs --crop header --scenarios page), unchanged.`,
  },
}

const REPORT = {
  type: 'object',
  properties: {
    lane: { type: 'string' },
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
    films: { type: 'array', items: { type: 'string' }, minItems: 1, description: 'Label folders or strip paths you filmed' },
    compare_sheets: { type: 'array', items: { type: 'string' } },
    scripts_added: { type: 'array', items: { type: 'string' } },
    founder_questions: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'string' } },
  },
  required: ['lane', 'summary', 'files_changed', 'details', 'acceptance', 'films', 'compare_sheets', 'scripts_added', 'founder_questions', 'risks'],
}

const FINDINGS = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['pass', 'fail'] },
    films_made: { type: 'array', items: { type: 'string' }, minItems: 3, description: 'Strip paths YOU filmed from your own fresh snapshot in this run. A verifier that films nothing has not verified.' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          lane: { type: 'string' },
          severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
          claim_checked: { type: 'string' },
          problem: { type: 'string' },
          evidence: { type: 'string' },
          fix: { type: 'string' },
        },
        required: ['lane', 'severity', 'claim_checked', 'problem', 'evidence', 'fix'],
      },
    },
    confirmed: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
  required: ['verdict', 'films_made', 'findings', 'confirmed', 'notes'],
}

const CRITIC_SCHEMA = { ...FINDINGS, properties: { ...FINDINGS.properties, films_made: { type: 'array', items: { type: 'string' } } } }

const BUILDER = (id) => {
  const s = SLICES[id]
  return `${COMMON}

YOUR SLICE (${id} lane builder). Files you own: ${s.files}.
Build and film with node scripts/themes/snap.mjs --name fu-${id} --port ${s.port} (rebuild after each round of edits; --reuse to re-film the same build). Main's frozen build: snap.mjs --name head --reuse --port ${s.port + 100}.

${s.items}

Iterate until everything passes and looks right in the frames. If something cannot be done without breaking a protected element or needs a school file you do not own, stop and report it as a founder question.`
}

const VERIFIER = (id, b) => {
  const s = SLICES[id]
  return `${COMMON}

YOUR SLICE (${id} lane verifier): try to refute the builder's claims. You MUST film: build a fresh snapshot of the current tree with node scripts/themes/snap.mjs --name verify-fu-${id} --port ${s.verifyPort} and film from it (labels stage2-fu-${id}-verify*); list every strip you filmed in films_made. In wave B one verifier filmed nothing and reported static checks; that is not verification. Read-only on src/ and tests/. Default to a finding when unsure.
Re-film independently the cases the builder's acceptance rests on, phone first, and open every strip frame by frame where the claim is about frames. For the portal lane: at least three schools in-school from the footer (one of them quiet), one cross-school scrolled swap, and the unscrolled wordmark crops for two schools (verdicts unchanged). For the schools lane: bauhaus's dense arrival on light mobile and its wordmark crops, and grandmillennial's diff-captures rerun. Check the diff (git diff) against the README contract and git status for stray files.
Findings carry lane "${id}".

Items the builder was given:
${s.items}

The builder's report:
${JSON.stringify(b, null, 2)}`
}

const CRITIC = (lanes) => `${COMMON}

YOUR SLICE (critic): review both lanes for quality, not only acceptance. Read-only on src/ and tests/. You may film from the verifiers' snapshots with snap.mjs --name verify-fu-<lane> --reuse --port 4490 (label stage2-fu-critic); never build.
Portal lane: is the off-screen test right (partly visible wordmark, a page barely scrolled, the phone's address bar, a very tall header), does the fix leave every unscrolled swap exactly as before, does the new wordmark enter well in all seven schools with no old partner, and is the runtime change safe on aborted and rapid navigations? Schools lane: does bauhaus's arrival still read as "shape leads, mark settles" with the old mark gone sooner; is grandmillennial truly unchanged? Code clean, README accurate, scripts in the right folders.
Severity: blocker = acceptance fails or a protected element breaks; major = a defect the founder would see; minor = polish. Every finding names its lane.

Lanes:
${JSON.stringify(lanes, null, 2)}`

const FIXER = (id, lane, findings) => {
  const s = SLICES[id]
  return `${COMMON}

YOUR SLICE (${id} lane fixer): fix the blocker and major findings below, and nothing else. Files: ${s.files}. Build and film with snap.mjs --name fu-${id} --port ${s.port}; re-film into the same labels and remake any affected sheet. For a finding you judge wrong, say why with evidence. Report in the builder's shape.

Items:
${s.items}

The lane so far:
${JSON.stringify(lane, null, 2)}

Findings to fix:
${JSON.stringify(findings, null, 2)}`
}

const RECHECK = (id, fx, findings) => {
  const s = SLICES[id]
  return `${COMMON}

YOUR SLICE (${id} lane re-check): confirm or refute that each finding is resolved and that the fix broke nothing it touched. You MUST film: fresh snapshot snap.mjs --name recheck-fu-${id} --port ${s.recheckPort}; labels stage2-fu-${id}-recheck*; list them in films_made. Read-only on src/ and tests/. Open the strips. Default to "not resolved" when unsure.

The fixer's report:
${JSON.stringify(fx, null, 2)}

Findings:
${JSON.stringify(findings, null, 2)}`
}

const lanes = await pipeline(
  LANES,
  (id) => agent(BUILDER(id), { label: `build ${id}`, phase: 'Build', schema: REPORT, model: 'opus', effort: 'high' }),
  (b, id) => b
    ? agent(VERIFIER(id, b), { label: `verify ${id}`, phase: 'Verify', schema: FINDINGS, model: 'sonnet', effort: 'medium' }).then((v) => ({ id, builder: b, verifier: v }))
    : { id, builder: null, verifier: null },
)

phase('Critic')
const done = lanes.filter(Boolean)
const critic = await agent(CRITIC(done), { label: 'critic', phase: 'Critic', schema: CRITIC_SCHEMA, model: 'opus', effort: 'medium' })

const serious = (id) => [
  ...((done.find((l) => l.id === id)?.verifier?.findings) ?? []),
  ...((critic?.findings ?? []).filter((f) => f.lane === id)),
].filter((f) => f.severity !== 'minor')

const toFix = LANES.filter((id) => serious(id).length)
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
