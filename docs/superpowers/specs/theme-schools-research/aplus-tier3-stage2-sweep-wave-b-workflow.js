export const meta = {
  name: 'tier3-stage2-sweep-wave-b',
  description: 'Tier 3 Stage 2 defect sweep, wave B (cottagecore, grandmillennial, bauhaus): builder -> verifier lanes, a cross-school critic, one conditional fix round',
  phases: [
    { title: 'Build', detail: 'one builder per school on its own snapshot port (Opus/high)' },
    { title: 'Verify', detail: 'one verifier per school, fresh snapshot, fixed adversarial cases (Sonnet/medium)' },
    { title: 'Critic', detail: 'one cross-school critic (Opus/medium)' },
    { title: 'Fix', detail: 'fixer (Opus/high) + re-check (Sonnet/medium) per school with a confirmed blocker/major' },
  ],
}

const R = 'docs/superpowers/specs/theme-schools-research'
const SCHOOLS = ['cottagecore', 'grandmillennial', 'bauhaus']

const COMMON = `You are one agent in a workflow for Tier 3, Stage 2 (the defect sweep) of the theme-schools work ("the Portal", BDL-010) in the repo at C:/git/birchdesignlab, branch feat/theme-schools-tier3-stage2. Never call it "Period Rooms".

Already done before you started (do not redo, do not re-ask): the Stage 2 plan and every founder decision (${R}/tier3-briefs/stage0-decisions.md; binding over every brief; read every section from "Stage 2 start" to the end); the P5 wordmark proof (${R}/tier3-stage2/p5-proof.md; cottagecore and quiet already carry the wordmark default); the judge hardening (wordmarkOverlap, wordmarkBlank <= 80 ms, wordmarkBlink, wordmarkDrawn; scripts/themes/rejudge-wordmark.mjs); wave A and its follow-up for vaporwave, glassmorphism and swiss, committed (${R}/tier3-stage2/wave-a.md); and the assessment before wave B (${R}/tier3-stage2/assessment-before-wave-b.md: read "What wave A taught" and "Wave B, as planned"). The founder's latest message says the post-A+ transitions phase is about turning transitions into transformations (more motion later), and holds four issues until after this wave: Safari, the dark-desktop first-draw freeze, the wordmark dropping in from above on a swap clicked low on a page, and glassmorphism's plain fade. It does NOT widen any slice, and you fix none of those four. This workflow is wave B: cottagecore, grandmillennial, bauhaus. Vaporwave, glassmorphism, swiss and quiet are not yours.

Read first: ${R}/tier3-stage2/assessment-before-wave-b.md, ${R}/tier3-stage2/stage2-plan.md (per-school defaults), src/themes/README.md (the authors' contract: "View-transition names" including the three named-chrome traps, "Motion and backgrounds", "The wordmark", "Type"), and the header comments of scripts/themes/motion.mjs, scripts/themes/snap.mjs and scripts/themes/probe-scrolled-swap.mjs for exact usage.

Environment:
- A Worker (wrangler dev) on :8787 belongs to the orchestrator. Never film it, start it, stop it or rely on what it serves: snap.mjs builds rewrite dist/, which it serves.
- Build and film only through snap.mjs (builds under the shared render lock, freezes the build as scripts/themes/.out/snap-<name>/, serves it on your port; --reuse serves an existing snapshot). render.mjs (stills, contrast, the school's built tests) builds under the same lock; you may run it. Never run npm run build, astro build, npm run verify, npm run dev:worker or wrangler yourself.
- Frozen main build: scripts/themes/.out/snap-head/ (snap.mjs --name head --reuse on your head port). Before films on disk: scripts/themes/.out/stage2-before/ (full frame, arrive from quiet and page) and scripts/themes/.out/stage2-p5-head/ (wordmark crops). For cottagecore the P5 proof state (wordmark default, not yet tuned) is scripts/themes/.out/stage2-p5-proof/.
- Other agents edit other schools in the same working tree at the same time. Keep your school buildable between edits; if a build fails in a file that is not yours, wait a minute and retry.
- BDL_GPU=1 for every Playwright run.

Rules for every agent in this workflow:
- Work only in your slice. Never touch a file outside it; never revert or reformat another agent's change.
- No git commands that change state (commit, add, branch, checkout, switch, stash, reset, rebase, restore, worktree). Read-only git is fine. The orchestrator commits.
- Scripts: any probe or helper you write goes in scripts/themes/harness/ with a header comment (what, why, written 09-23-26, usage). Never write scripts in a scratchpad or temp folder (repo rule: scripts are kept).
- Do not run npm install or change package.json.
- Copy is the founder's: add no visible words; decoration is aria-hidden. No em dashes in anything a visitor can read. Fix structure, not copy-dependent line breaks (the site copy pass will reflow every school).
- Reduced motion is out of scope (decision S1).
- Stage 2 is repairs, not design: do only your school's listed items; name anything else in your report. Pair-stage work waits.
- The README's view-transition contract binds, including its three named-chrome traps (pinning a group, backdrop-filter while named, non-sticky chrome over a scrolled old page).
- Edit files with the Edit/Write tools, never PowerShell Get-Content/Set-Content. The Edit/Write tools can decode backslash escape sequences in your payload into real characters: check the bytes with grep and run "file <path>" when a file must contain a literal backslash sequence.
- Match the surrounding code's comment density, naming and idiom. Refer to the founder as "the founder" or "they".
- Evidence over assertion: every claim names the file, strip (and frame time) or number that shows it. Open the images you cite with the Read tool.
- Your final answer is data for the orchestrator, not a message to the founder.`

const SHARED_ACCEPTANCE = `The shared swap acceptance and the Stage 2 gates, for every arrival and every in-school page swap of the school:
1. No frame superimposes both pages' body text (a double exposure: two pages' type drawn over each other, at any opacity where both read). A hard-edged wipe or reveal that shows the old page on one side of the edge and the new page on the other is NOT a failure (bauhaus's circle and square wipes, grandmillennial's drapes are protected concepts); a soft or feathered edge that blends two pages' type is.
2. No white or unpainted frame.
3. The switcher holds still (motion.mjs --crop switcher, arrive and page, desktop and mobile).
4. In-school swaps finish under about 700 ms.
5. The wordmark: --crop wordmark, arrive from quiet, arrive --from <the contrasting school named in the slice>, and page, dark and light, desktop and mobile: wordmarkOverlap and wordmarkBlank (<= 80 ms, founder decision b; tune the school's own fade offsets in its keyframes) on every arrival, wordmarkBlink on every page swap, wordmarkDrawn with no suspects. Say the final offsets and the blank per strip.
6. If your school names any chrome: the header crop (motion.mjs --crop header --scenarios page) holds still apart from the current-page mark, and probe-scrolled-swap.mjs (dark desktop and light mobile at least) shows nothing of the old page's scrolled content through or around it.
7. No horizontal scroll at 390 px; contrast in both schemes; node scripts/themes/render.mjs --theme <school> passes (stills, contrast, the school's built tests, including the view-transition name guard), and the stills of every page you changed look right.
8. The unit tests you touch: npx vitest run tests/<file>.test.ts.
Also, as evidence for the founder's held review (not a fix): report, for your school, the dark desktop arrival's longest gap between presented frames (dense.maxGapMs in the manifest, from a fresh-browser film) and what the wordmark does on a scrolled in-school swap (probe-scrolled-swap.mjs, dark desktop).`

const SLICES = {
  cottagecore: {
    port: 4464, headPort: 4564, verifyPort: 4474, recheckPort: 4484, from: 'vaporwave',
    files: 'src/themes/cottagecore/** (theme.css, Header.astro, pages/*, parts/* and any component the page trim needs)',
    items: `Your school's brief: ${R}/tier3-briefs/cottagecore.md (section 2 "Protect" binds; section 3 item 2; D5 as far as item 2 needs). Items, with the founder's decisions applied:
1. Item 2, stop the double exposure and keep the room still between in-school pages:
   - old root: an opacity-only exit of about 180 ms, ease-out (optionally scaleY(0.99) as the start of "pressed away");
   - new root: a delay of about 120 ms, full opacity within its first quarter, carried by a small lift, so it covers the old page like an opaque sheet laid on top; total under 700 ms. This replaces the page turn only as far as item 2 needs (portal.md section 5); the "laid on the table" gesture waits;
   - name the header chrome cottagecore-header for in-school swaps only, with the README's one :is() rule (never cc-header). Choose the element (the valance and the bar, header.cc-header, or its parts) and say why; the header also holds the dark-mode fireflies canvas (.cc-motes), which must keep working and must not be frozen into a snapshot in a way that shows. Pin it by one of the README's two recipes. The header is not sticky: handle the scrolled-swap trap (README) and prove it with probe-scrolled-swap.mjs;
   - verify per the brief: no frame shows two billboards or two paragraph sets; the header row identical across page-strip frames; on arrive strips the wordmark keeps its aspect ratio at +240 / +320 ms on mobile.
2. The wordmark: cottagecore already carries the default from the P5 proof, but its blank measures about 148 ms on every arrival (p5-proof re-judge). Tune its fade offsets so the blank is at or under 80 ms and overlap still passes, on the group's 560 ms curve.
3. The 337 KB page (p4-trace first-frame item: first render 137 ms, the costliest page to warm): cut the HTML structurally, with NO visible change. The bulk is inline SVG pressed specimens repeated per instance (hundreds of paths: bud, vein, petal-vein, frond). Options: define each specimen once per page and reuse it (<symbol>/<use>), share repeated geometry, or reduce path precision. Check that CSS which styles parts inside the specimens still reaches them (styles do reach <use> shadow trees in Chromium; verify in the stills), and that per-instance variation (seeds) is preserved or provably invisible. Acceptance: node scripts/themes/diff-captures.mjs between capture sets of all five pages, both schemes, desktop and mobile, before (head snapshot, or render.mjs on the P5 state) and after, within its default tolerance; report the HTML size per page before and after and the first render if you trace it (trace-arrival.mjs against your own port only).
4. Protect: the dark-mode fireflies (the founder likes them; stage0-decisions.md), the gingham valance, the pressed specimens' look. The cross-stitch lettering belongs to grandmillennial (S5); twine replaces the bow at the pair stage, not now.
Contrasting school for --from: vaporwave.`,
  },
  grandmillennial: {
    port: 4465, headPort: 4565, verifyPort: 4475, recheckPort: 4485, from: 'swiss',
    files: 'src/themes/grandmillennial/** (theme.css, parts/Defs.astro, pages/Services.astro, Header.astro only if the awning is named)',
    items: `Your school's brief: ${R}/tier3-briefs/grandmillennial.md (section 2 "Protect" binds, including item 11's motion temperament and the drapes; section 3 items 3 and 4). Items, with the founder's decisions applied:
1. Item 3, the No. 1 swatch's visible grid: stop halving the 200 px tile. Clip the full-size #gm-chintz (the brief's first option, the stage 2 default) inside the swatch so it shows a fragment of a bigger design, as a real cutting does, or offset the crop so no row or column aligns. Verify on the Services stills, light and dark, desktop and mobile: No. 1 reads as a cut of fabric with no repeating rows. Do not enlarge or re-lay the swatches (item 13 is pair stage).
2. Item 4, arrival and in-school motion:
   (a) the dead start: gm-drapes starts at clip-path inset(0 47% 0 47%) and the new-root curve becomes a decelerating one such as cubic-bezier(0.33, 0, 0.15, 1); keep 640 ms, so the drapes visibly part from the first frame and slow as they gather (p4-trace: the old curve hid 50 to 60 ms beyond the floor);
   (b) the wordmark: the README default (as proved in P5) plus tuning to the 80 ms blank, on the group's 560 ms curve;
   (c) the in-school swap: replace the symmetric 260 ms crossfade with a staggered one at about 300 ms, ease-out (old 1 to 0 over 0 to 45%, new 0 to 1 over 40 to 100%). If the header and awning visibly blink at the midpoint, name the awning chrome grandmillennial-header for in-school swaps only (founder decision 8; the README's one :is() rule and a pin recipe; the header is not sticky, so handle the scrolled-swap trap and prove it with probe-scrolled-swap.mjs). Say whether it blinked and what you did.
   Verify per the brief: visible parting by about +160 ms on dark desktop arrivals; no frame with both "BIRCH DESIGN LAB" caps and the italic "Birch" legible together; no frame at +160 or +240 of the page strip where both pages' headlines are superimposed.
Contrasting school for --from: swiss.`,
  },
  bauhaus: {
    port: 4466, headPort: 4566, verifyPort: 4476, recheckPort: 4486, from: 'swiss',
    files: 'src/themes/bauhaus/** (theme.css, pages/* only for the text-wrap hooks)',
    items: `Your school's brief: ${R}/tier3-briefs/bauhaus.md (section 2 "Protect" binds; section 3 E5; F8 is covered by the wordmark default). Items, with the founder's decisions applied:
1. E5, balanced headings and pretty body text: text-wrap: balance on h1 to h3, .pull, .lead and the display ledes; text-wrap: pretty on paragraphs. Do NOT widen the Services process heading's 12ch cap (founder decision 9: it would tune to today's copy). Verify on the stills: the Home closer, the Services process heading, and the mobile Home, About and Contact; report which widows are gone, without tuning any width to today's words.
2. The circle wipe's invisible start (p4-trace: bh-wipe-circle from circle(0%) under the snap curve, dark on dark, is invisible for about 170 ms beyond the frame floor; bauhaus is the only school over 160 ms even warm, 239). Give the arrival a visible first frame: a non-zero start radius, an ease without a flat start, or an origin over contrasting content (the brief's options), keeping the circle from the top-right corner as the gesture. Measure the first visible change before and after (full-frame strips; scripts/themes/trace-arrival.mjs against your own snapshot port if you want the number).
3. The wordmark: the README default plus tuning to the 80 ms blank. Its arrival group has a 120 ms delay and 640 ms on the snap curve (the images inherit the delay); in-school 420 ms, no delay.
4. The in-school square wipe (420 ms, hard edge, old held underneath with mix-blend-mode normal) stays; check it against the acceptance (a hard edge is fine).
Bauhaus keeps no red type (S4) and its lowercase.
Contrasting school for --from: swiss.`,
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
    wordmark: { type: 'string', description: 'Final fade offsets and the measured blank per strip' },
    held_evidence: { type: 'string', description: 'Dark desktop arrival maxGapMs, and what the wordmark does on a scrolled in-school swap' },
    compare_sheets: { type: 'array', items: { type: 'string' } },
    snapshot: { type: 'string' },
    scripts_added: { type: 'array', items: { type: 'string' } },
    deferred: { type: 'array', items: { type: 'string' } },
    founder_questions: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'string' } },
  },
  required: ['school', 'summary', 'files_changed', 'details', 'acceptance', 'wordmark', 'held_evidence', 'compare_sheets', 'snapshot', 'scripts_added', 'deferred', 'founder_questions', 'risks'],
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

YOUR SLICE (builder for ${id}). Files you own: ${s.files}.
Build and film with node scripts/themes/snap.mjs --name ${id} --port ${s.port} (rebuild after each round of edits; --reuse to re-film the same build). Main's frozen build: snap.mjs --name head --reuse --port ${s.headPort}.
Label your films stage2-${id} (wordmark crops), stage2-${id}-full (full frame), stage2-${id}-switcher, stage2-${id}-header and stage2-${id}-scrolled where relevant, and put before/after sheets (compare-strips.mjs, .jpg) in scripts/themes/.out/stage2-${id}-compare/: at least the page swap and the arrival from quiet, dark desktop and light mobile, full frame; the wordmark arrival from quiet on mobile; plus one sheet per item that shows its change.

${s.items}

${SHARED_ACCEPTANCE}

Iterate until every check passes and the school looks right in the frames, not merely passing (wave A needed three and four rounds for its named headers). If a check cannot pass without breaking a protected element or doing pair-stage work, stop and report it as a founder question instead of forcing it.`
}

const VERIFIER = (id, b) => {
  const s = SLICES[id]
  return `${COMMON}

YOUR SLICE (verifier for ${id}): try to refute the builder's claims. In wave A the verifiers found nothing and the critic found every real fault; do better. Read-only on src/ and tests/. Build a fresh snapshot of the current tree with node scripts/themes/snap.mjs --name verify-${id} --port ${s.verifyPort} and film only from it (label stage2-${id}-verify); main's frozen build is snap.mjs --name head --reuse --port ${s.verifyPort + 100}. Default to a finding when unsure.

Required adversarial cases, all of them, phone first:
1. Page swap, full frame, dense (motion.mjs --dense), light mobile, then dark desktop: step through every frame for superimposed type, white or unpainted frames, anything of the old page showing where it should not.
2. Arrival from quiet and from ${s.from}, full frame dense, light mobile and dark desktop.
3. probe-scrolled-swap.mjs, dark desktop and light mobile (a swap clicked from the footer), for every school, named chrome or not.
4. The header crop (motion.mjs --crop header --scenarios page), light mobile and dark desktop.
5. The wordmark crops: arrive from quiet, from ${s.from}, and page, both schemes, mobile; compare the verdicts with the builder's and open the strips.
6. The switcher crop, arrive and page, mobile and desktop.
7. The builder's own compare sheets, each against the item it claims to show.
8. The diff (git diff -- src/themes/${id}) against the README contract, and git status for anything outside the slice or any script written outside scripts/themes/.
9. The brief's Verify lines for each item, and render.mjs --theme ${id} if the builder did not report its built tests.
Findings carry school "${id}".

Items the builder was given:
${s.items}

The builder's report:
${JSON.stringify(b, null, 2)}`
}

const CRITIC = (lanes) => `${COMMON}

YOUR SLICE (critic for wave B): review the three schools side by side for quality, not only acceptance. Read-only on src/ and tests/. You may film from the verifiers' snapshots with snap.mjs --name verify-<school> --reuse --port 4490 (label stage2-waveB-critic); never build.

For each school: open its before/after sheets and the verifier's strips. Does the repair look deliberate and in the school's idiom (its brief's section 2 "Protect", and meta.ts's signature), or merely pass? Is anything protected broken or diluted (cottagecore's fireflies and specimens, grandmillennial's drapes and settled temperament, bauhaus's circle from the corner)? Any pair-stage work done early, or copy-dependent tuning? Is the wordmark handoff good to the eye, not only under 80 ms? For cottagecore's page trim: is it truly invisible (diff-captures), and is the code still maintainable? For any named chrome: the three README traps, including a scrolled swap. Code clean and in the file's idiom; README contract respected; scripts only in scripts/themes/harness/.
Across schools: do the three arrivals and in-school swaps still feel distinct from each other and from wave A's schools; does any repair borrow another school's gesture?
Also, for the founder's held review (no fix): from the builders' held_evidence and your own look, do the dark-desktop first-draw gaps or the scrolled-swap wordmark behaviour suggest a common cause across schools? Put that in notes.
Severity: blocker = acceptance fails or a protected element breaks; major = a defect or quality miss the founder would see; minor = polish. Every finding names its school.

Lanes:
${JSON.stringify(lanes, null, 2)}`

const FIXER = (id, lane, findings) => {
  const s = SLICES[id]
  return `${COMMON}

YOUR SLICE (fixer for ${id}): fix the blocker and major findings below, and nothing else. Files: ${s.files}. Build and film with snap.mjs --name ${id} --port ${s.port}; re-film into the same labels (manifests merge) and remake any affected sheet. For a finding you judge wrong, say why with evidence instead of changing code. Report in the builder's shape with the gates re-checked.

Items:
${s.items}

${SHARED_ACCEPTANCE}

The lane so far:
${JSON.stringify(lane, null, 2)}

Findings to fix:
${JSON.stringify(findings, null, 2)}`
}

const RECHECK = (id, fx, findings) => {
  const s = SLICES[id]
  return `${COMMON}

YOUR SLICE (re-check for ${id}): confirm or refute that each finding is resolved, and that the fix broke no gate it touched. Read-only on src/ and tests/. Fresh snapshot: snap.mjs --name recheck-${id} --port ${s.recheckPort}; label stage2-${id}-recheck. Open the strips. Default to "not resolved" when unsure.

The fixer's report:
${JSON.stringify(fx, null, 2)}

Findings:
${JSON.stringify(findings, null, 2)}`
}

const lanes = await pipeline(
  SCHOOLS,
  (id) => agent(BUILDER(id), { label: `build ${id}`, phase: 'Build', schema: REPORT, model: 'opus', effort: 'high' }),
  (b, id) => b
    ? agent(VERIFIER(id, b), { label: `verify ${id}`, phase: 'Verify', schema: FINDINGS, model: 'sonnet', effort: 'medium' }).then((v) => ({ id, builder: b, verifier: v }))
    : { id, builder: null, verifier: null },
)

phase('Critic')
const done = lanes.filter(Boolean)
const critic = await agent(CRITIC(done), { label: 'critic wave B', phase: 'Critic', schema: FINDINGS, model: 'opus', effort: 'medium' })

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

return { wave: 'B', lanes: done, critic, fixes }
