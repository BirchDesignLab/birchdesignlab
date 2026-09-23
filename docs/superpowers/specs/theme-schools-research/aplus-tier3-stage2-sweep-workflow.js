export const meta = {
  name: 'tier3-stage2-sweep',
  description: 'Tier 3 Stage 2 defect sweep, one wave: optional tooling hardening, then per-school builder -> verifier lanes, a cross-school critic, and one conditional fix round',
  phases: [
    { title: 'Tooling', detail: 'T: blank metric, judge limits, re-judge mode, lock hardening (Opus/high); wave A only' },
    { title: 'Build', detail: 'one builder per school on its own snapshot port (Opus/high)' },
    { title: 'Verify', detail: 'one verifier per school, fresh snapshot (Sonnet/medium)' },
    { title: 'Critic', detail: 'one cross-school critic for the wave (Opus/medium)' },
    { title: 'Fix', detail: 'fixer (Opus/high) + re-check (Sonnet/medium) per school with a confirmed blocker/major' },
  ],
}

const R = 'docs/superpowers/specs/theme-schools-research'
const WAVE = args?.wave ?? 'A'
const SCHOOLS = args?.schools ?? ['vaporwave', 'glassmorphism', 'swiss']
const WITH_TOOLING = args?.tooling ?? true

const COMMON = `You are one agent in a workflow for Tier 3, Stage 2 (the defect sweep) of the theme-schools work ("the Portal", BDL-010) in the repo at C:/git/birchdesignlab, branch feat/theme-schools-tier3-stage2. Never call it "Period Rooms".

Already done before you started (do not redo, do not re-ask): the Stage 2 plan (${R}/tier3-stage2/stage2-plan.md) and every founder decision for it (${R}/tier3-briefs/stage0-decisions.md: "Stage 2 start", "Stage 2 decisions" and "At the P5 checkpoint"; binding over every brief); the before films (scripts/themes/.out/stage2-before/, full frame: arrive from quiet and page, six schools, dark and light, desktop and mobile); the P5 wordmark proof, which passed (${R}/tier3-stage2/p5-proof.md; README "The wordmark" is now correct; cottagecore and quiet already carry the wordmark default); the film tooling (scripts/themes/motion.mjs with --from, --crop wordmark and the wordmark judge; scripts/themes/snap.mjs; scripts/themes/compare-strips.mjs, which writes a JPEG when --out ends in .jpg). The founder's latest message ("b and let's kick off wave a please") chose option b at the P5 checkpoint (each school tunes its wordmark fade offsets so the blank, both images under 10% opacity, stays at or under 80 ms while overlap still passes) and started this wave. It does NOT widen any slice. This is wave ${WAVE} of the sweep: schools ${SCHOOLS.join(', ')}. The other schools are not yours.

Read first: ${R}/tier3-stage2/stage2-plan.md (the per-school defaults and the shared swap acceptance), ${R}/tier3-stage2/p5-proof.md ("Carried into the sweep"), ${R}/HANDOFF-09-23-26-stage2.md, src/themes/README.md (the authors' contract: "View-transition names", "Motion and backgrounds", "The wordmark", "Type"), and the header comments of scripts/themes/motion.mjs and scripts/themes/snap.mjs for exact usage.

Environment:
- A Worker (wrangler dev) on :8787 belongs to the orchestrator. Never film it, start it, stop it or rely on what it serves: snap.mjs builds rewrite dist/, which it serves.
- Build and film only through snap.mjs (it builds under the shared render lock, freezes the build as scripts/themes/.out/snap-<name>/ and serves it on your port; --reuse serves an existing snapshot without building). render.mjs (stills, contrast, the school's built tests) also builds under the same lock; you may run it. Never run npm run build, astro build, npm run verify, npm run dev:worker or wrangler yourself. The orchestrator runs the full gate afterwards.
- Frozen HEAD build: scripts/themes/.out/snap-head/ (serve it with snap.mjs --name head --reuse on your head port) for any "before" film you need that is not already on disk. Before films on disk: scripts/themes/.out/stage2-before/ (full frame) and scripts/themes/.out/stage2-p5-head/ (wordmark crops, arrive from quiet and page, all six, dark and light, desktop and mobile).
- Other agents edit other schools in this same working tree at the same time, and their half-finished work lands in your builds. Keep your own school buildable between edits (finish a change before you build). If a build fails in a file that is not yours, wait a minute and retry; say so in your report if it persists.
- BDL_GPU=1 for every Playwright run.

Rules for every agent in this workflow:
- Work only in your slice. Never touch a file outside it; never revert or reformat another agent's change.
- No git commands that change state: no commit, add, branch, checkout, switch, stash, reset, rebase, restore, worktree. The orchestrator commits. Read-only git (status, diff, log, show) is fine.
- Do not run npm install or change package.json.
- Copy is the founder's: add no visible words and reword nothing. Word parity with quiet is guarded; decoration is aria-hidden. No em dashes in anything a visitor can read.
- Fix structure, not copy-dependent line breaks: the site copy pass will reflow every school later, so never tune a width, a break or a split to today's words.
- Reduced motion is out of scope (decision S1): no reduced-motion work, and never flag its absence. Existing reduce blocks may stay.
- Stage 2 is repairs, not design: do only your school's listed items. Pair-stage work (new ornament, new layouts, the vaporwave kiosk and lobby tile, glass's new controls, and so on) waits; name anything you notice in your report instead of building it.
- The README's view-transition contract binds: wordmark is the only cross-school name; a school's own chrome is named <id>-* with ONE :is() rule keyed on data-to-theme / data-from-theme; never another school's prefix, never auto/match-element/var() names; none of the forbidden properties on the shared ::view-transition pseudo; never mention bdl-switcher. Choreography for arrivals is keyed on the arriving page (data-to-theme cannot style pseudo-elements).
- Edit files with the Edit/Write tools, never PowerShell Get-Content/Set-Content (it double-encodes UTF-8). The Edit/Write tools can decode backslash escape sequences (backslash-u, backslash-n) in your payload into real characters: when a file must contain a literal backslash sequence, check the bytes afterwards with grep, and run "file <path>" to confirm it is still text.
- Match the surrounding code's comment density, naming and idiom. Refer to the founder as "the founder" or "they".
- Evidence over assertion: every claim names the file, strip (and frame time) or number that shows it. When you look at a strip or still, actually open the image with the Read tool.
- Your final answer is data for the orchestrator, not a message to the founder.`

const SHARED_ACCEPTANCE = `The shared swap acceptance (portal.md section 4, minus reduced motion) and the Stage 2 gates, for every arrival and every in-school page swap of the school:
1. No frame shows both pages' body text legible (full-frame strips, dense where it matters: motion.mjs --dense works with any crop; full frame dense is fine too).
2. No white or unpainted frame.
3. The switcher holds still (motion.mjs --crop switcher, arrive and page; the verdict is in the manifest).
4. In-school swaps finish under about 700 ms.
5. The wordmark: --crop wordmark, arrive from quiet, arrive --from <the contrasting school named in the slice>, and page, dark and light, desktop and mobile. wordmarkOverlap passes on every arrival, wordmarkBlink on every page swap, and the blank (both images under 10% opacity) is at or under 80 ms on every arrival (founder decision b; tune the school's own fade offsets in its keyframes to get there; say the final offsets and the measured blank per strip).
6. No horizontal scroll at 390 px; contrast in both schemes; the school's built tests: node scripts/themes/render.mjs --theme <school> (stills of all five pages, both schemes, desktop and mobile), then open the stills of every page you changed.
7. The unit tests you touch: npx vitest run tests/<file>.test.ts.`

const SLICES = {
  vaporwave: {
    port: 4461, headPort: 4561, verifyPort: 4471, recheckPort: 4481, from: 'glassmorphism',
    files: 'src/themes/vaporwave/** (theme.css, fx.ts, meta.ts, pages/*, Footer.astro, Header.astro, parts/*); tests/theme-registry.test.ts (only the preload cap); src/themes/README.md (only the "Type" section\'s preload bullet)',
    items: `Your school's brief: ${R}/tier3-briefs/vaporwave.md (section 2 "Protect" binds; section 3 E1, E2, E3). Items, with the founder's decisions applied:
1. E1, the in-school page swap (white hero, green sun, TV switching off), all three parts: (a) keep the Home hero's WebGL pixels in the old capture (preserveDrawingBuffer, or render one last frame on astro:before-preparation and hide the canvas so the CSS sky shows; choose by what the strips show and by cost, and keep fx.ts's lifecycle guarantees: owner check, DPR cap, pauses, context loss and restore, WEBGL_lose_context on teardown); (b) the in-school old root gets its own short opacity fade (about 120 ms, no brightness, no squash), and vw-crt-off stays for leaving the school; (c) no hue-rotate over about 8 degrees and no saturate(2) in vw-track: carry the tape error with translateX / skewX on steps(), one horizontal tear band (clip-path), at most brightness(1.15), keeping the 360 ms steps(6) cadence. Verify per the brief: no frame lighter than the scheme's sky, no hue outside the pink / violet / cyan / peach band, and the About hero in its own colours by about +400 ms with at most a tear.
2. E2, Contact scrolling sideways at desktop: structural. Let the trust line wrap between parts at every width (or stack the two parts as terminal lines at every width, as the 520 px rule does), nowrap only inside a part, hide the separator when parts wrap, min-width: 0 on the side column's grid child. Verify document.documentElement.scrollWidth <= innerWidth at 1024, 1280 and 1440 wide and at 390, and that the desktop contact stills are 1440 wide.
3. The E3 tail ONLY: every page's floor stops 76 px short of the page bottom, because the portal tail ([data-portal-tail]) is unpainted. Paint [data-portal-tail]'s background with the floor's continuation or its lower-edge colour from the school's own scoped styles (README "Footer": never target the portal's DOM any other way), or fade the plane's near edge so no hard edge shows. Both schemes, desktop and mobile. The kiosk and the lobby tile are pair stage 3: not now.
4. Fonts (founder decision 4): the preload cap rises from two to four, for faces that paint above the fold. Change tests/theme-registry.test.ts's cap to four with a comment citing the decision, and the README "Type" bullet to match ("at most four woff2 files, for the faces that paint above the fold"). Vaporwave adds Exo 2 Variable and VT323 latin woff2 preloads (imported with ?url from the package's files/, like the existing two) if they paint above the fold on its pages; check how src/themes/portal/runtime.ts uses meta.fonts preloads before a swap (FONT_WAIT_MS) and say what the change does to a cold arrival. Report the first-load cost: the bytes the two extra preloads add and whether they were already fetched without the preload.
5. The wordmark default (README "The wordmark", as corrected by P5) plus tuning to the 80 ms blank. Vaporwave's group is 520 ms cubic-bezier(0.2, 0.7, 0.2, 1) today. Its taskbar keeps its vaporwave-taskbar naming (Stage 1) and must still hold still on in-school swaps.
6. First-frame items (${R}/tier3-stage1/p4-trace.md, "Stage 2 items, per school"): the heaviest first render (146 ms) and 150 to 250 ms of first-use GPU compile for the CRT filters. E1(c) and the fonts address part of it; take any cheap, clearly measured reduction of the arrival's first-frame cost (for example filters on full-viewport snapshots) and report before and after, but do not redesign the arrival: the CRT arrival from another school is protected.
Contrasting school for --from: glassmorphism.`,
  },
  glassmorphism: {
    port: 4462, headPort: 4562, verifyPort: 4472, recheckPort: 4482, from: 'vaporwave',
    files: 'src/themes/glassmorphism/** (theme.css and any of its components if the swap needs it)',
    items: `Your school's brief: ${R}/tier3-briefs/glassmorphism.md (section 2 "Protect" binds; section 3 E15). Items, with the founder's decisions applied:
1. E15, stop the arrival smearing text (defect fix only; the material choreography waits for the transitions phase), without its reduced-motion bullet (S1):
   - split the in-school swap from the cross-school arrival with html[data-from-theme='glassmorphism'], as bauhaus, vaporwave and grandmillennial do;
   - the in-school swap becomes a short opacity handoff with no filter on the root: old out about 167 ms, new in about 250 ms, cubic-bezier(0, 0, 0, 1). This removes the "Design Lab" ghost over "The shining tree";
   - the cross-school arrival drops the 22 px text blur (and the scale if it costs the first frame) and stays under about 333 to 400 ms;
   - the wordmark group: 333 ms cubic-bezier(0.55, 0.55, 0, 1) so it lands with the page;
   - verify per the brief: page__light__desktop and page__dark__mobile strips show no double-exposed headlines at +240 and +320 ms and text never blurred; arrive strips settle by about 400 ms with the wordmark not trailing.
2. The wordmark default (README "The wordmark") plus tuning to the 80 ms blank. Watch the critic's unverified note: object-fit: none may clip a larger old wordmark inside a shrinking morph box; check your crops.
3. First-frame items (${R}/tier3-stage1/p4-trace.md): about 370 ms of first-use GPU compile for the blurred, scaled snapshot (blur(22px), scale(1.035)); glass-leave is ease-in and the new page starts at opacity 0, so nothing visible happens early. E15 removes most of it; measure the first visible change before and after (motion.mjs full-frame frame times are enough; scripts/themes/trace-arrival.mjs if you want the number, run only against your own snapshot port).
Glass keeps its hero toggle, location pill and traffic lights; add no controls in this stage (S3's "more interactables" is pair stage 3).
Contrasting school for --from: vaporwave.`,
  },
  swiss: {
    port: 4463, headPort: 4563, verifyPort: 4473, recheckPort: 4483, from: 'bauhaus',
    files: 'src/themes/swiss/** (theme.css; a component only if the grid variables the transition needs live there)',
    items: `Your school's brief: ${R}/tier3-briefs/swiss.md (section 2 "Protect" binds; section 3 item 10, "Repair the page transition (defect fix only)"; D4 confirms the scope). Items, with the founder's decisions applied:
1. Item 10 without its reduced-motion bullet (S1), for every in-school swap and every arrival:
   - never show both sheets' type at once. Phase (a), about 0 to 280 ms: the old snapshot is cleared to the bare field colour in hard column panels (animate ::view-transition-old(root) clip-path in steps, over a background of var(--field) on ::view-transition-group(root) or ::view-transition; a background is the one thing README allows on ::view-transition). Phase (b): hold about 60 ms on the bare sheet. Phase (c), about 340 to 640 ms: new(root) is revealed panel by panel. Confirm in the strips that the exposed area shows the field colour, not the live page or the new page early;
   - pacing: 90 to 110 ms per panel with uneven spacing between keyframes, linear or stepped, no ease-out; total under the ~700 ms cap;
   - panel count follows the grid: --div per breakpoint (4 below 640 px, 6 above); panel edges from --edge: max(var(--margin), (100% - 1760px) / 2) so they land on real column lines on phones and on sheets wider than about 1904 px;
   - verify per the brief: no frame shows glyphs from both pages; each panel visible for at least 5 frames; the mobile strips show panel edges on the 4 column lines.
2. The wordmark (founder decision 7): the brief's station clock. The group runs about 560 ms linear with a flat tail, and the old and new wordmark images swap in ONE step, never a crossfade (for example step keyframes on both images meeting at the same instant, on the group's clock per the README's inherits). The overlap judge must pass (a one-step swap never has both visible), the blink judge must pass in-school, and the blank is about 0.
3. First-frame note (p4-trace): swiss is already the fastest; the step-end wipe shows its first column only at 40 ms. Keep the first visible change early under the new choreography and report it.
Swiss adds no lowercase (S4); red stays swiss's one mark.
Contrasting school for --from: bauhaus.`,
  },
}

const REPORT = {
  type: 'object',
  properties: {
    school: { type: 'string' },
    summary: { type: 'string' },
    files_changed: { type: 'array', items: { type: 'string' } },
    details: { type: 'string', description: 'What changed and why, per item, precisely enough for the verifier and critic' },
    acceptance: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          check: { type: 'string' },
          result: { type: 'string', enum: ['pass', 'fail', 'not-run'] },
          evidence: { type: 'string', description: 'strip / manifest / still path, frame time, number' },
        },
        required: ['check', 'result', 'evidence'],
      },
    },
    wordmark: { type: 'string', description: 'Final fade offsets and the measured blank per strip' },
    compare_sheets: { type: 'array', items: { type: 'string' }, description: 'before/after sheets made with compare-strips.mjs (.jpg)' },
    snapshot: { type: 'string', description: 'The snap-<name> your final films came from' },
    deferred: { type: 'array', items: { type: 'string' }, description: 'Things noticed but out of scope (pair stage, transitions phase)' },
    founder_questions: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'string' } },
  },
  required: ['school', 'summary', 'files_changed', 'details', 'acceptance', 'wordmark', 'compare_sheets', 'snapshot', 'deferred', 'founder_questions', 'risks'],
}

const TOOL_REPORT = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    files_changed: { type: 'array', items: { type: 'string' } },
    details: { type: 'string' },
    verification: { type: 'string' },
    blank_measured: { type: 'string', description: 'Blank per strip for the P5 proof set (cottagecore and quiet) and the HEAD set, from the re-judge' },
    usage_for_builders: { type: 'string', description: 'Exact commands and manifest fields the school builders use' },
    risks: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'files_changed', 'details', 'verification', 'blank_measured', 'usage_for_builders', 'risks'],
}

const FINDINGS = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['pass', 'fail'], description: 'fail if any finding is blocker or major' },
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
    confirmed: { type: 'array', items: { type: 'string' }, description: 'Claims you tried to refute and could not, with evidence' },
    notes: { type: 'string' },
  },
  required: ['verdict', 'findings', 'confirmed', 'notes'],
}

const T = `${COMMON}

YOUR SLICE (agent T, tooling hardening, runs alone before the school builders): the follow-ups the P5 critic raised, so the sweep's gates are sound. You change no school.

Files you own: scripts/themes/lib/wordmark-judge.mjs, scripts/themes/lib/wordmark-judge.selftest.mjs, scripts/themes/lib/wordmark-sampler.mjs, scripts/themes/lib/render-lock.mjs, scripts/themes/motion.mjs, scripts/themes/snap.mjs, a new re-judge script if you want one (scripts/themes/lib/ or scripts/themes/), src/themes/quiet/portal.css (only if step 4 needs it), and in src/themes/README.md only the bullet about motion.mjs --crop wordmark in "The wordmark".

1. The blank. Add to the judge, for cross-school arrivals, the longest continuous span on the transition's timeline (use the replayed series, which the sampler already produces at 4 ms) where both effective opacities are under 0.10. Store it per strip (ms, start, end) as wordmarkBlank with a verdict that fails above 80 ms (founder decision b, stage0-decisions.md "At the P5 checkpoint"). An arrival whose blank cannot be measured is unsampled, never a pass. Print it with the other verdicts.
2. The blink judge's blend assumption. Use each image's resolved mix-blend-mode (the sampler records it): plus-lighter sums, normal composites (coverage = n + o * (1 - n)). A school whose own in-school keyframes replace Astro's gets judged correctly.
3. Opacity-only limit. Record each image's resolved clip-path, transform, visibility and filter across the transition; treat visibility hidden as 0; when an image carries a non-trivial clip-path or a transform that could hide it (scale 0, translate off its box) while the judge counts it visible, raise a problem that names it, so no strip passes silently on an image nobody could see. State the remaining limits in the judge's header and in the README bullet.
4. A re-judge mode: re-run the judge over a label folder's existing <strip>.wordmark.json sample files and update its manifest, without re-filming. Re-judge scripts/themes/.out/stage2-p5-proof/ and stage2-p5-head/ and report the blank per strip. If quiet's arrivals (src/themes/quiet/portal.css) exceed 80 ms, tune quiet's keyframe offsets there so the blank is at or under 80 ms and overlap still passes, then re-film the quiet cases (arrive from cottagecore and from vaporwave, page; dark and light; desktop and mobile; --crop wordmark) through snap.mjs --name tooling --port 4469 into label stage2-p5-proof (the manifest merges). Cottagecore's own tuning belongs to wave B: report its blank only.
5. The render lock (render-lock.mjs): break a lock only when its owner's pid is dead (process.kill(pid, 0) throws ESRCH) or its age passes the stale limit; break it by renaming the lock directory to a unique name before removing it, so two waiters cannot both take it; release only a lock you own (owner.json pid). Three builders will share it from now on.
6. Update the self-test with blank cases (a 50 ms gap passes, a 120 ms gap fails, a missing series is unsampled) and a normal-blend blink case, and run it. Regression: against the head snapshot (node scripts/themes/snap.mjs --name head --reuse --port 4460 -- ...), one plain strip, one --crop switcher strip (hold-still verdict unchanged) and one --crop wordmark strip (verdicts as before plus the blank), label stage2-tooling-regress.
In usage_for_builders give the exact commands the school builders should run (snap.mjs build and reuse, the motion.mjs wordmark / switcher / full-frame films with --from, the re-judge, compare-strips to .jpg) and which manifest fields hold each verdict.`

const BUILDER = (id, t) => {
  const s = SLICES[id]
  return `${COMMON}

YOUR SLICE (builder for ${id}): repair ${id}'s Stage 2 defects and hold it to the acceptance below. Other builders are doing other schools at the same time in the same tree.

Files you own: ${s.files}.
Your ports: build and film your work with node scripts/themes/snap.mjs --name ${id} --port ${s.port} (rebuild after each round of edits; --reuse to film the same build again). Film HEAD "before" strips you still need from node scripts/themes/snap.mjs --name head --reuse --port ${s.headPort}.
Label your films stage2-${id} (after), stage2-${id}-head (any extra before films), and put before/after sheets (compare-strips.mjs, .jpg) in scripts/themes/.out/stage2-${id}-compare/. Make at least: the page swap and the arrival from quiet, dark desktop and light mobile, full frame; and the wordmark arrival from quiet on mobile.

${s.items}

${SHARED_ACCEPTANCE}

Iterate until every check passes and the school looks right, not merely passing: open the strips. If a check cannot pass without breaking a protected element or doing pair-stage work, stop and report it as a founder question instead of forcing it.
${t ? `\nThe tooling agent's usage notes:\n${t.usage_for_builders}\n` : ''}`
}

const VERIFIER = (id, b) => {
  const s = SLICES[id]
  return `${COMMON}

YOUR SLICE (verifier for ${id}): try to refute the builder's claims. Read-only on src/ and tests/. Build a fresh snapshot of the current tree with node scripts/themes/snap.mjs --name verify-${id} --port ${s.verifyPort} and film only from it (label stage2-${id}-verify); never film another port except the head snapshot (--reuse, port ${s.verifyPort + 100}) if you need a before. Default to a finding when you are unsure.

Attack every acceptance line the builder reported, the brief's own Verify lines for each item, and these:
- re-film independently: arrive from quiet and page, full frame dense, dark desktop and light mobile; the wordmark crop for arrive from quiet, from ${s.from}, and page, both schemes, desktop and mobile; the switcher crop for arrive and page on mobile. Compare verdicts with the builder's;
- open every strip you film and the builder's compare sheets, frame by frame where the claim is about frames;
- check the diff (git diff -- the builder's files) for contract breaks: view-transition names, rules keyed on the wrong page, forbidden properties on ::view-transition, another school's prefix, visible text added (parity), em dashes, reduced-motion work, pair-stage work, copy-dependent tuning, files outside the builder's slice (git status);
- run npx vitest run for any test file the builder touched, and node scripts/themes/render.mjs --theme ${id} --no-tests=false if the builder did not report its built tests.
Findings carry school "${id}".

The builder's report:
${JSON.stringify(b, null, 2)}`
}

const CRITIC = (lanes) => `${COMMON}

YOUR SLICE (critic for wave ${WAVE}): review the three schools side by side for quality, not only acceptance. Read-only on src/ and tests/. You may film from the verifiers' snapshots with node scripts/themes/snap.mjs --name verify-<school> --reuse --port 4490 (label stage2-wave${WAVE}-critic); never build.

For each school: open its before/after sheets and the verifier's strips; does the repair look deliberate and in the school's idiom (read its brief's section 2 "Protect" and the school's signature in src/themes/<school>/meta.ts), or merely pass? Is anything protected broken or diluted? Any pair-stage work done early, or copy-dependent tuning? Is the wordmark handoff good to the eye (not only under 80 ms), and does the arrival now read as that school's arrival? Are the code changes clean and in the file's idiom, and do they respect the README contract? Anything the verifier missed? Also read the diff of tests/ and src/themes/README.md if changed (vaporwave's preload cap), and judge the reported first-load cost.
Across schools: do the three arrivals still feel distinct from each other; does any repair make one school borrow another's gesture?
Severity: blocker = acceptance really fails or a protected element is broken; major = a real defect or a clear quality miss the founder would see; minor = polish. Every finding names its school.

Lanes (builder report and verifier result per school):
${JSON.stringify(lanes, null, 2)}`

const FIXER = (id, lane, findings) => {
  const s = SLICES[id]
  return `${COMMON}

YOUR SLICE (fixer for ${id}): fix the blocker and major findings below for ${id}, and nothing else. Files: ${s.files}. Build and film with node scripts/themes/snap.mjs --name ${id} --port ${s.port}; re-film into label stage2-${id} (the manifest merges) and remake any affected compare sheet. For a finding you judge wrong, say why with evidence instead of changing code. Report in the same shape as the builder, with acceptance re-checked.

The school's items and acceptance, for reference:
${s.items}

${SHARED_ACCEPTANCE}

The builder's report and the verifier's result:
${JSON.stringify(lane, null, 2)}

Findings to fix:
${JSON.stringify(findings, null, 2)}`
}

const RECHECK = (id, fix, findings) => {
  const s = SLICES[id]
  return `${COMMON}

YOUR SLICE (re-check for ${id}): confirm or refute that each finding below is resolved. Read-only on src/ and tests/. Build a fresh snapshot with node scripts/themes/snap.mjs --name recheck-${id} --port ${s.recheckPort} and film only from it (label stage2-${id}-recheck). Open the strips. Default to "not resolved" when unsure. Also check the fix broke none of the acceptance lines it touched.

The fixer's report:
${JSON.stringify(fix, null, 2)}

Findings:
${JSON.stringify(findings, null, 2)}`
}

let t = null
if (WITH_TOOLING) {
  phase('Tooling')
  t = await agent(T, { label: 'T tooling hardening', phase: 'Tooling', schema: TOOL_REPORT, model: 'opus', effort: 'high' })
  if (!t) return { error: 'tooling agent returned nothing; builders not started' }
}

const lanes = await pipeline(
  SCHOOLS,
  (id) => agent(BUILDER(id, t), { label: `build ${id}`, phase: 'Build', schema: REPORT, model: 'opus', effort: 'high' }),
  (b, id) => b
    ? agent(VERIFIER(id, b), { label: `verify ${id}`, phase: 'Verify', schema: FINDINGS, model: 'sonnet', effort: 'medium' }).then((v) => ({ id, builder: b, verifier: v }))
    : { id, builder: null, verifier: null },
)

phase('Critic')
const done = lanes.filter(Boolean)
const critic = await agent(CRITIC(done), { label: `critic wave ${WAVE}`, phase: 'Critic', schema: FINDINGS, model: 'opus', effort: 'medium' })

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

return { wave: WAVE, tooling: t, lanes: done, critic, fixes }
