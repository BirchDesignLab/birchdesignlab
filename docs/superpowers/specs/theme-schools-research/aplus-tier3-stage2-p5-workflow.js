export const meta = {
  name: 'tier3-stage2-p5-proof',
  description: 'Tier 3 Stage 2 P5: wordmark film tooling + snapshot server, then the wordmark recipe proof on cottagecore and quiet, then critic + refuter, one conditional fix round',
  phases: [
    { title: 'Tooling', detail: 'A: motion.mjs --crop wordmark, --from, dense frames, overlap/blink judge; snap.mjs; HEAD control films (Opus/high)' },
    { title: 'Proof', detail: 'B: recipe on cottagecore + quiet destination, README fix, films (Opus/high)' },
    { title: 'Check', detail: 'C critic (Opus/medium) and D refuter (Sonnet/medium) in parallel' },
    { title: 'Fix', detail: 'E fixer (Opus/high) and F re-check (Sonnet/medium), only if C or D confirm a fault' },
  ],
}

const R = 'docs/superpowers/specs/theme-schools-research'

const COMMON = `You are one agent in a workflow for Tier 3, Stage 2 of the theme-schools work ("the Portal", BDL-010) in the repo at C:/git/birchdesignlab, branch feat/theme-schools-tier3-stage2. Never call it "Period Rooms".

Already done before you started (do not redo, do not re-ask): PR #88 merged; the orchestrator branched, fixed the stale handoff, wrote the Stage 2 plan (${R}/tier3-stage2/stage2-plan.md), recorded the founder's mobile test and the founder's Stage 2 decisions (${R}/tier3-briefs/stage0-decisions.md, sections "Stage 2 start" and "Stage 2 decisions"; binding), ran npm run verify on HEAD (clean: 331 unit, astro check 0/0, 440 built), and filmed 48 full-frame before strips into scripts/themes/.out/stage2-before/. The founder's latest message ("do you trust your judgement on all that stuff? if so let's go with exactly what you think we should do") approved the plan as written. It does NOT widen your slice: this workflow is ONLY Stage 2's first step, the P5 wordmark proof. The six-school sweep comes later in other workflows; do no sweep work.

Read first: ${R}/tier3-stage2/stage2-plan.md (especially "Found while planning: the README's wordmark recipe has a hole" and "Step 1"), ${R}/HANDOFF-09-23-26-stage2.md, src/themes/README.md ("View-transition names", "Motion and backgrounds", "The wordmark").

The key fact the plan found: every page's header carries transition:name="wordmark", and Astro writes into every page an inline style block: [data-astro-transition-scope="astro-...-1"] { view-transition-name: wordmark; } followed by @layer astro { ::view-transition-old(wordmark) { animation-duration: 180ms; animation-timing-function: cubic-bezier(0.76, 0, 0.24, 1); animation-fill-mode: both; animation-name: astroFadeOut; } ::view-transition-new(wordmark) { same, astroFadeIn } } plus [data-astro-transition-fallback] variants. Schools style only ::view-transition-group(wordmark) today, so every swap runs Astro's simultaneous 180 ms crossfade inside the group's morph. The README recipe overrides only animation-name and fill mode, so its images keep Astro's 180 ms, contrary to the README's "both images inherit the group's duration".

Environment:
- A Worker (wrangler dev) serves the HEAD build at http://127.0.0.1:8787 (use 127.0.0.1). It belongs to the orchestrator. Never start, stop or rebuild it and never film it after agent A finishes (see each slice).
- Builds are fast (about 7 s: npm run build = clean-dist + og prebuild + astro build). A build rewrites dist/, which the Worker serves.
- The GPU: set BDL_GPU=1 for every Playwright run (the RTX 3070; headless otherwise silently uses SwiftShader).
- Film output folders under scripts/themes/.out/ are gitignored.

Rules for every agent in this workflow:
- Work only in your slice. Never touch a file outside it; never revert or reformat another agent's change.
- No git commands that change state: no commit, add, branch, checkout, switch, stash, reset, rebase, restore, worktree. The orchestrator commits. Read-only git (status, diff, log, show) is fine.
- Do not run npm install or change package.json. Do not start servers except the ones your slice names (snap.mjs's own static server on your named port).
- Refer to the founder as "the founder" or "they".
- No em dashes in anything a visitor can read. Match the surrounding code's comment density, naming and idiom; scripts get a header comment like the others in scripts/themes/ (what, why, written 09-23-26, usage).
- Edit files with the Edit/Write tools, never PowerShell Get-Content/Set-Content (it double-encodes UTF-8). The Edit/Write tools can decode backslash escape sequences (backslash-u, backslash-n) in your payload into real characters: when a file must contain a literal backslash sequence, check the bytes afterwards with grep, and run "file <path>" to confirm it is still text.
- Reduced motion is out of scope in the portal (decision S1): add no reduced-motion work, and do not flag its absence.
- Evidence over assertion: every claim in your report names the file, strip or number that shows it. When you look at a strip, actually open the PNG with the Read tool.
- Your final answer is data for the orchestrator, not a message to the founder.`

const REPORT = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    files_changed: { type: 'array', items: { type: 'string' } },
    details: { type: 'string', description: 'What you built and why, precisely enough for the next agent and the reviewers' },
    verification: { type: 'string', description: 'What you ran or checked, with results and output paths' },
    strips: { type: 'array', items: { type: 'string' }, description: 'Paths of the strips and manifests that carry the evidence' },
    founder_questions: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'files_changed', 'details', 'verification', 'strips', 'founder_questions', 'risks'],
}

const FINDINGS = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['pass', 'fail'], description: 'fail if any finding is severity blocker or major' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
          claim_checked: { type: 'string' },
          problem: { type: 'string' },
          evidence: { type: 'string', description: 'file:line, strip path + frame time, or number' },
          fix: { type: 'string' },
        },
        required: ['severity', 'claim_checked', 'problem', 'evidence', 'fix'],
      },
    },
    confirmed: { type: 'array', items: { type: 'string' }, description: 'Claims you tried to refute and could not, with the evidence you used' },
    notes: { type: 'string' },
  },
  required: ['verdict', 'findings', 'confirmed', 'notes'],
}

const A = `${COMMON}

YOUR SLICE (agent A, film tooling): the filming tools the proof and the later sweep need, then the HEAD films that serve as the "before" set and the negative control. You change no file under src/.

Files you own: scripts/themes/motion.mjs, scripts/themes/snap.mjs (new), scripts/themes/render.mjs (only to move its static server into a shared helper), new helpers under scripts/themes/lib/ (for example lib/serve-dist.mjs, lib/wordmark-judge.mjs and a self-test beside it).

1. motion.mjs, keeping its style, its existing flags and the switcher hold-still behaviour exactly:
   a. --from <school>: the arrive scenario starts on /t/<from>/ instead of /t/quiet/. The target may be quiet (--schools quiet --from cottagecore films arriving AT quiet). File names gain __from-<school> when --from is given; without it, names stay exactly as today (manifests already on disk depend on them). Reject from == target.
   b. --crop wordmark: the crop box is the union of the old wordmark's box (the element whose computed view-transition-name is wordmark, measured on the departing page before the trigger) and the new wordmark's box (measured on the arriving page after the transition finishes), padded enough that a morph between them stays in frame. Measure the after box once the film settles, and crop every frame to the union. For the page scenario, the union of the Home and About wordmarks.
   c. Dense frames: with --crop wordmark (and optionally a --dense flag for any crop), the sheet shows every screencast frame from the trigger until the transition's finished promise resolves plus about 100 ms, instead of 16 evenly spaced picks. Label each with its time since the trigger. If the dense set is long, keep all of it (more rows); never silently drop frames, and if you must cap, log what was dropped in the manifest. Raise the JPEG quality for crop films if it helps legibility at small sizes.
   d. The wordmark judge. An init script wraps document.startViewTransition so it can see each transition object; from ready until finished it samples, every animation frame, the effective opacity of ::view-transition-old(wordmark) and ::view-transition-new(wordmark): the image's own opacity multiplied by its ::view-transition-image-pair(wordmark) and ::view-transition-group(wordmark) opacity. Read them with getComputedStyle(document.documentElement, '::view-transition-old(wordmark)') and so on; if this Chromium does not resolve animated values that way, use document.getAnimations() (effect.pseudoElement, getComputedTiming, keyframes) instead, and say which works. Record per sample: time since the trigger, the three opacities per image, and the group's progress. Also record the group's and each image's actual animation-duration, delay and timing function as the browser resolved them (this is how the README claim gets settled). Two verdicts, stored in the manifest per strip and printed:
      - wordmarkOverlap, for cross-school arrivals: fails if at any sample min(effOld, effNew) > 0.10 (both legible together). Record the worst sample.
      - wordmarkBlink, for in-school swaps (the page scenario): fails if at any sample effOld + effNew < 0.90 while the two images are the same wordmark (a still wordmark blinking). Also say whether the wordmark group animates at all.
      Keep the verdict logic a small pure function in lib/ with a self-test on synthetic sample series (a simultaneous crossfade must fail overlap; the README's 0-35% out / 40-100% in must pass overlap; the same fades on an in-school swap must fail blink; Astro's matched 180 ms crossfade on identical images must pass blink). Run the self-test.
   e. A wordmark strip whose judge could not sample (no transition, no wordmark on one side) is a problem, never a silent pass.
2. snap.mjs: so several builders can film their own builds without a rebuild changing what they film. Modes:
   - build: under the SAME lock render.mjs uses (scripts/themes/.out/.render-lock; reuse its acquire and release code, moved into a shared lib if that is cleaner), run the same build npm run build runs, copy dist/ to scripts/themes/.out/snap-<name>/, release the lock;
   - --reuse: skip the build and use an existing snap-<name>/;
   - then serve the snapshot on --port with the same static server render.mjs uses (move serveDist into lib/serve-dist.mjs and import it from both; render.mjs must behave exactly as before), and either run a command given after "--" with SNAP_BASE=http://127.0.0.1:<port> in its environment (then stop the server and exit with the command's code), or with --hold keep serving until killed.
   Make sure the static server serves everything a school page and its transitions need (fonts, the glb, webp, module scripts), and that a missing asset is a visible problem in the films, not a silent 404.
3. Before filming anything with the new tools, run the existing flows unchanged against the Worker to prove you broke nothing: one plain strip (for example --schools swiss --scenarios page --viewports desktop --schemes dark --label stage2-p5-regress) and one --crop switcher strip with its hold-still verdict.
4. Snapshot HEAD: node scripts/themes/snap.mjs --name head (the tree is still HEAD for src/; you changed only scripts). This frozen copy lets later agents film HEAD at any time with --reuse.
5. Film the HEAD wordmark set (the negative control and the before set) from the head snapshot on port 4460, label stage2-p5-head, --crop wordmark, dark and light, desktop and mobile:
   - arrive from quiet and page, for all six schools (vaporwave, glassmorphism, swiss, cottagecore, grandmillennial, bauhaus);
   - cottagecore arriving from vaporwave and from swiss;
   - quiet arriving from cottagecore and from vaporwave.
   Expected on HEAD: every cross-school arrival FAILS wordmarkOverlap (Astro's simultaneous crossfade puts both near 0.5 around +90 ms). If any passes, find out why before reporting; a judge that cannot see the fault is not a judge. Open at least four of the strips yourself and say whether the pixels agree with the numbers.
6. Also film the same set full frame (no crop) with --from for the cottagecore and quiet cross-school cases, label stage2-p5-head-full, so reviewers see the context.

Report the exact commands, the resolved durations and timing functions the judge found on HEAD (this answers "do the images inherit the group's duration?"), each verdict count, and anything the proof agent must know.`

const B = (a) => `${COMMON}

YOUR SLICE (agent B, the proof): settle the README's wordmark recipe and prove it on cottagecore (decision 1), and fix quiet as a destination (decision 3). Agent A finished the tooling; its report is at the end. Use its tools exactly as it documents them.

Files you own: src/themes/cottagecore/theme.css (only the wordmark rules in its view-transition block; its root choreography, the item 2 swap work and everything else belong to the later sweep), src/themes/README.md ("The wordmark" section, plus any other sentence that repeats the wrong claim), a new quiet stylesheet for the portal route only (for example src/themes/quiet/portal.css) and its one import line in src/pages/t/quiet/[...page].astro, and tests if a guard needs to learn the new file (tests/built/portal.test.ts only to append).

1. The recipe. Using A's resolved-timing numbers, decide how the wordmark images get the intended timing: most likely animation-duration, animation-delay and animation-timing-function set to inherit on both images (so they follow the group, as the README meant), or explicit values. Think about: the group's own timing per school (durations 240 to 640 ms, some with a delay, one with animation: none in-school), a root animation longer than the group (the fill-mode trap the README describes), the [data-astro-transition-fallback] rules (fallback path only), and that the in-school guard (:not([data-from-theme='x'])) leaves Astro's matched crossfade in place in-school, which must not blink. Also what object-position cottagecore's wordmark needs. The fades must never show both wordmarks legible, and the new wordmark should land with the morph, not pop in early at the old spot or late after the group settles.
2. Apply it to cottagecore. Build and film only through snap.mjs: node scripts/themes/snap.mjs --name p5-proof --port 4464 -- <motion.mjs command using SNAP_BASE>. Never film :8787 (it serves HEAD for the orchestrator), never run npm run build outside snap.mjs, never touch the head snapshot.
3. Quiet as a destination (decision 3). Quiet has no stylesheet in the portal; its /t/quiet/ route imports the root site's tokens.css and base.css. Add a small stylesheet imported ONLY by src/pages/t/quiet/[...page].astro carrying the same wordmark recipe keyed on html[data-theme='quiet']. Prove the root business pages are untouched: after your build, every root page (/, /about/, /services/, /contact/, /contact/sent/, /lab/ and the other non-/t/ pages) must link exactly the same stylesheets with byte-identical contents as in the head snapshot (scripts/themes/.out/snap-head/), and their HTML must be identical apart from nothing. Show the comparison you ran.
4. Correct src/themes/README.md so "The wordmark" states what really happens (Astro's layered 180 ms rule, what the recipe overrides and why), and the recipe block is the one you proved. Keep its voice and its bullet style.
5. Film the proof, label stage2-p5-proof, --crop wordmark, dark and light, desktop and mobile:
   - cottagecore: arrive from quiet, from vaporwave, from swiss; page (in-school);
   - quiet: arrive from cottagecore and from vaporwave; page (in-school quiet: Home to About).
   Also full frame for the same cases, label stage2-p5-proof-full.
   Passing means: wordmarkOverlap passes on every cross-school strip; wordmarkBlink passes on every in-school strip; A's HEAD control for the same cases failed; and the dense crops, which you must open, show no frame with both wordmarks legible, no stretched wordmark and no wordmark popping in far from where the morph has carried the box. Also check the switcher still holds still on one cottagecore arrival (--crop switcher).
6. Run npx vitest run (the unit suite) and the built-site tests against your snapshot's dist if they can be pointed at it; otherwise say which assertions need the orchestrator's full verify.

Agent A's report:
${JSON.stringify(a, null, 2)}`

const C = (a, b) => `${COMMON}

YOUR SLICE (agent C, critic): review agents A and B. Read-only on src/ and scripts/ (you may run the tools and write films under scripts/themes/.out/stage2-p5-critic/ from the snapshots with --reuse on port 4470; never film :8787, never build).

Check hardest:
1. Does the wordmark judge measure what the eye sees? Effective opacity (image x image-pair x group), sampling every frame from ready to finished, what happens if a school animates the image pair or uses a clip or transform that hides an image at full opacity, what a missing sample does. Read lib/ and motion.mjs and run the self-test. Would a judge that always passes be caught? (A's HEAD control must fail; check its manifest yourself.)
2. Is the crop really the union of both wordmarks and the morph path, at both viewports? Open strips.
3. Is B's recipe right for every school's group timing, not only cottagecore's (read every src/themes/*/theme.css wordmark group rule), and does the README now say exactly what happens? Is anything in it still wrong or misleading?
4. Is the quiet stylesheet really scoped to /t/quiet/ only, with the root pages byte-identical? Re-run the comparison.
5. snap.mjs and the render.mjs refactor: lock correctness (two builders at once, a crashed holder), render.mjs unchanged in behaviour, static server fidelity.
Severity: blocker = the proof's conclusion is wrong or unproven; major = a real defect the sweep would inherit; minor = polish. Fail if any blocker or major.

Agent A's report:
${JSON.stringify(a, null, 2)}

Agent B's report:
${JSON.stringify(b, null, 2)}`

const D = (a, b) => `${COMMON}

YOUR SLICE (agent D, refuter): try to refute the proof. Read-only on src/ and scripts/; films only under scripts/themes/.out/stage2-p5-refute/ from snapshots with --reuse (port 4471); never film :8787, never build. Default to "refuted" (a finding) when you are unsure.

Claims to attack:
1. "No frame of any proof crop (scripts/themes/.out/stage2-p5-proof/*crop-wordmark*) shows both wordmarks legible." Open every such strip with the Read tool and look at every frame. Zoom by re-filming one case at a larger cell size if the frames are too small to judge.
2. "Every HEAD cross-school arrival fails the overlap judge" (scripts/themes/.out/stage2-p5-head/manifest.json): check the manifest numbers and open at least three HEAD strips to confirm the double wordmark is visible.
3. "In-school swaps do not blink" on cottagecore and quiet: check the blink verdicts and the frames.
4. "No wordmark is stretched, and the new one lands with the morph."
5. "The root pages are untouched": re-run B's comparison.
6. Independently re-film two proof cases from the p5-proof snapshot (one desktop dark, one mobile light) and confirm the verdicts reproduce.
Report each claim as confirmed (with the evidence) or as a finding.

Agent A's report:
${JSON.stringify(a, null, 2)}

Agent B's report:
${JSON.stringify(b, null, 2)}`

const E = (a, b, c, d) => `${COMMON}

YOUR SLICE (agent E, fixer): fix the blocker and major findings below from the critic (C) and the refuter (D), and nothing else. You may edit the files agents A and B owned (listed in their reports). Build and film only through snap.mjs (--name p5-proof --port 4464, rebuilding it); never film :8787. Re-film the affected strips into the same labels (manifests merge) and open them. For any finding you judge wrong, say why with evidence instead of changing code.

Agent A's report:
${JSON.stringify(a, null, 2)}

Agent B's report:
${JSON.stringify(b, null, 2)}

Critic C:
${JSON.stringify(c, null, 2)}

Refuter D:
${JSON.stringify(d, null, 2)}`

const F = (e, c, d) => `${COMMON}

YOUR SLICE (agent F, re-check): confirm or refute that the fixer resolved each blocker and major finding. Read-only on src/ and scripts/; films only under scripts/themes/.out/stage2-p5-recheck/ from the p5-proof snapshot with --reuse on port 4472; never film :8787, never build. Default to "not resolved" when unsure. Open the strips.

Fixer E:
${JSON.stringify(e, null, 2)}

Critic C:
${JSON.stringify(c, null, 2)}

Refuter D:
${JSON.stringify(d, null, 2)}`

phase('Tooling')
const a = await agent(A, { label: 'A film tooling', phase: 'Tooling', schema: REPORT, model: 'opus', effort: 'high' })
if (!a) return { error: 'agent A returned nothing' }

phase('Proof')
const b = await agent(B(a), { label: 'B wordmark proof', phase: 'Proof', schema: REPORT, model: 'opus', effort: 'high' })
if (!b) return { a, error: 'agent B returned nothing' }

phase('Check')
const [c, d] = await parallel([
  () => agent(C(a, b), { label: 'C critic', phase: 'Check', schema: FINDINGS, model: 'opus', effort: 'medium' }),
  () => agent(D(a, b), { label: 'D refuter', phase: 'Check', schema: FINDINGS, model: 'sonnet', effort: 'medium' }),
])

const serious = [c, d].filter(Boolean).flatMap((r) => r.findings).filter((f) => f.severity !== 'minor')
let e = null
let f = null
if (serious.length) {
  phase('Fix')
  log(`${serious.length} blocker/major finding(s): running one fix round`)
  e = await agent(E(a, b, c, d), { label: 'E fixer', phase: 'Fix', schema: REPORT, model: 'opus', effort: 'high' })
  if (e) f = await agent(F(e, c, d), { label: 'F re-check', phase: 'Fix', schema: FINDINGS, model: 'sonnet', effort: 'medium' })
} else {
  log('no blocker or major findings: fix round skipped')
}

return { a, b, c, d, e, f }
