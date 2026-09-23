export const meta = {
  name: 'tier3-stage1-review',
  description: 'Tier 3 Stage 1 review: 5 finders + completeness critic, 2 refuters per finding, one fixer',
  phases: [
    { title: 'Find', detail: '5 finders + 1 completeness critic (Opus/medium)' },
    { title: 'Verify', detail: '2 refute seats per finding (Sonnet/medium)' },
    { title: 'Fix', detail: 'one fixer for surviving defects (Opus/high)' },
  ],
}

const RANGE = '5a58e6c..HEAD'

const COMMON = `You are one agent in the REVIEW workflow for Tier 3, Stage 1 ("portal stage") of the theme-schools work in the repo at C:/git/birchdesignlab (branch feat/theme-schools-tranche-1). The exhibit ships as "the Portal" (BDL-010).

Already done before you started (do not redo): the Stage 1 build is finished and committed as ${RANGE} (git log ${RANGE}; git diff ${RANGE}). The orchestrator ran npm run verify (clean: unit tests, astro check, build, built-site tests), the portal smoke test, and filmed hold-still strips. The founder approved this review. A Worker (wrangler dev) serves the current HEAD build at http://127.0.0.1:8787 (use 127.0.0.1, not localhost).

What Stage 1 was meant to do: docs/superpowers/specs/theme-schools-research/HANDOFF-09-23-26-tier3.md (Tier 3, stage 1), tier3-briefs/portal.md section 4 (P1 to P6), and tier3-briefs/stage0-decisions.md (binding; read the "Stage 1 decisions" section and the loading/transitions note). Findings from the P4 trace: docs/superpowers/specs/theme-schools-research/tier3-stage1/p4-trace.md.

Known items (already confirmed by the orchestrator; do not re-report them, but do report anything new about them):
- K1: on viewports under 700px the switcher is centred with left: 50% plus translateX(-50%); during a view transition its snapshot is drawn slightly off the live element's subpixel position, so motion.mjs's hold-still check flags 2 to 9% of a button's pixels on phone/mobile (tablet and desktop pass at 0.0%). A fix is planned: centre with auto margins, and the same for the first-load prompt's translate.
- K2: runtime.ts aborts unfinished warm-ups when a navigation starts; the smoke test (scripts/themes/smoke.mjs) reports the aborted fetch as requestfailed net::ERR_ABORTED. The founder said to "eat it up front" (preloading cost is acceptable), so the planned fix is to stop aborting warm-ups that are still useful.
- The runtime deliberately clears data-from-theme when an arrival transition finishes (B1's refinement of S2); only vaporwave's taskbar rule reads data-from-theme outside ::view-transition pseudos today.
- Reduced motion is out of scope in the portal (S1): never flag missing reduced-motion handling.

Rules:
- Read-only for you unless your brief says otherwise: no file edits, no git commands that change state, no builds (no npm run build, verify, dev:worker, render.mjs), no starting or stopping servers, no npm install. You may run unit tests, node scripts that only read, and short Playwright probes against the Worker (keep them light and sequential; other reviewers may probe too).
- Refer to the founder as "the founder" or "they", never "he" or "she".
- Visitor-facing copy is the founder's: flag copy problems (em dashes, voice, stale claims) but classify rewording as founder-decision, not defect.
- Check file:line references against the current tree. Only report what you can support with evidence (code, a probe, a spec citation). No style nits unless they change behaviour or break a stated rule.
- Your final answer is data for the orchestrator.`

const FINDINGS = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          kind: { type: 'string', enum: ['defect', 'founder-decision', 'nit'] },
          file: { type: 'string' },
          line: { type: 'number' },
          evidence: { type: 'string' },
          failure_scenario: { type: 'string' },
          suggested_fix: { type: 'string' },
        },
        required: ['title', 'severity', 'kind', 'file', 'evidence', 'failure_scenario', 'suggested_fix'],
      },
    },
    checked_and_fine: { type: 'string', description: 'What you checked that holds up, briefly' },
  },
  required: ['findings', 'checked_and_fine'],
}

const VERDICT = {
  type: 'object',
  properties: {
    refuted: { type: 'boolean' },
    reasoning: { type: 'string' },
  },
  required: ['refuted', 'reasoning'],
}

const FIX_REPORT = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    fixed: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, what: { type: 'string' }, files: { type: 'array', items: { type: 'string' } } }, required: ['title', 'what', 'files'] } },
    skipped: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, why: { type: 'string' } }, required: ['title', 'why'] } },
    verification: { type: 'string' },
    risks: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'fixed', 'skipped', 'verification', 'risks'],
}

const FINDERS = [
  {
    key: 'vt-semantics',
    prompt: `YOUR LENS: view-transition correctness of P1 and P2. Files: src/themes/portal/PortalLayout.astro (the switcher name and the inline data-portal-vt block), src/themes/portal/runtime.ts (data-to-theme, data-from-theme set and cleared), src/themes/vaporwave/theme.css (the vaporwave-taskbar rule and group rule), and every src/themes/*/theme.css view-transition block for interactions.
Check against Astro 7.3.4's transitions source (node_modules/astro/dist/transitions/) and the CSS View Transitions spec as Chrome ships it: when view-transition-name is read for the old and new captures relative to the runtime's attribute changes; whether @layer plus !important really wins over every school rule for the switcher's group, image pair, old and new (including properties other than animation that a school wildcard sets); paint order of the bdl-switcher group relative to the root and other named groups; aborted navigations, back/forward traversal, a second click mid-transition, same-page school switches (Shuffle), and returns to quiet (no theme.css); whether clearing data-from-theme at arrival finish can break any school's choreography or leave a named chrome element in a wrong state; whether the switcher being a stacking context and backdrop root at all times changes how the dialog or its ::backdrop render. Probe live in Chromium where it settles a question (for example read computed view-transition-name on header.taskbar at old capture, new capture and rest).`,
  },
  {
    key: 'switcher-ui',
    prompt: `YOUR LENS: the switcher's P6 work and its busy state, as a showpiece UI. File: src/themes/portal/switcher.ts (placard, first-load prompt, busy state, inert throwaway element), src/themes/portal/schools.ts, the meta.ts order fields.
Check: accessibility (roles, names, focus order, focus return, keyboard for the prompt and its dismiss control, what a screen reader announces for the placard and prompt, aria-busy use, the inert throwaway <bdl-switcher> the router connects during a swap), sessionStorage use (try/catch, semantics of first load, dismissal on pagehide vs first interaction per portal.md), escapeHtml on every interpolated string, layout at 320x640, 375x667, 390x844, 844x390 and 1440x900 (probe live: the dialog list must scroll, the placard must not push it off screen, the prompt must never cover the bar's buttons), no layout shift of the bar during a swap, no em dash in any visible string, and whether the look is deliberate (spacing, type scale, hierarchy) in the switcher's house style. Screenshot the dialog and the prompt live (use --show-prompt semantics: a fresh context with no sessionStorage flag shows the prompt) and look at them.`,
  },
  {
    key: 'warm-loader',
    prompt: `YOUR LENS: the P4 warm-up and the in-memory loader in src/themes/portal/runtime.ts and their callers in src/themes/portal/switcher.ts. Compare loadWarmed() line by line with Astro 7.3.4's defaultLoader and preloadStyleLinks (node_modules/astro/dist/transitions/router.js and swap-functions.js): anything it misses or does differently (noscript removal, the view-transitions meta check, persisted stylesheets, error handling, redirects, non-HTML responses, formData navigations, history traversal). Check the cache: staleness across a deploy (2 minute max age), keys (trailing slash, query strings), memory, the queue order, what happens when the visitor clicks before a warm-up finishes (takeWarmed returning an in-flight promise), when two navigations overlap, and the frugal() check (Save-Data, 2g). Check the busy state's set and clear paths. See K2 above: say concretely which aborts are wasteful and which are needed, and what the least risky change is. Probe live against the Worker with Playwright where useful (open the dialog, watch the network, click a school).`,
  },
  {
    key: 'guards-tooling',
    prompt: `YOUR LENS: the guards and review tooling. Files: tests/built/portal.test.ts (the view-transition name rules, the bdl-switcher rules, the school-data order/lesson test), tests/theme-registry.test.ts, scripts/themes/lib/hold-still.mjs and hold-still.selftest.mjs, scripts/themes/motion.mjs (crop, hold-still wiring, manifest merge, prompt suppression), scripts/themes/capture.mjs (prompt suppression), scripts/themes/trace-arrival.mjs, scripts/themes/lib/probe-vt-name.mjs.
Hunt for false negatives: ways a school could break the naming contract that the guard would miss (names in @media/@supports/@layer blocks, !important, upper case, CSS custom properties, view-transition-name via the transition:name directive, a name declared in a scoped Astro style, a name that starts with another school's id plus a hyphen, tranche-2 ids that prefix each other). Hunt for false positives on legitimate future school CSS. Check the hold-still judge (is the reference choice sound, can a switcher that vanishes for one frame pass, what JPEG noise does at 2x), the manifest merge, and that motion.mjs and capture.mjs still behave as their header comments say. Run the built tests (npx vitest run --config vitest.dist.config.ts) and node scripts/themes/lib/hold-still.selftest.mjs; both read only.`,
  },
  {
    key: 'root-readme',
    prompt: `YOUR LENS: the promises outside the portal, and the docs. (1) Root-site invariance: the root business pages (/, /about/, /services/, /contact/, /contact/sent/, /privacy/, /lab/ and Lab pages) must carry none of the portal and must be byte-identical to before except aria-current on Contact at /contact/sent/ (src/themes/quiet/Header.astro via src/components/SiteHeader.astro). Compare the built pages served by the Worker against what the pre-Stage-1 source would produce (git show 5a58e6c:src/themes/quiet/Header.astro and reason about it, or diff built HTML if you can reconstruct it). The Lab link must still light across /lab/, /lab/experiments/, /lab/studies/ and Lab entries on the root. (2) The rename: BDL-010 is "The Portal" wherever a visitor sees it (the /lab/ catalog, OG or social metadata, any other surface); no stale "Period Rooms" in anything a visitor can read; BDL-011's alt text. (3) src/themes/README.md: every claim matches the code as built (the naming recipe, the data-to-theme and data-from-theme lifecycle including the clearing at arrival finish, the stacking-context note, the P5 wordmark recipe CSS: is it valid, does it do what it says, and is B3's scoping to cross-school arrivals sound; S1 and S3 text), no em dashes, the README's plain voice. (4) Word parity: nothing in Stage 1 added visible words to any school page (the switcher lives in a shadow root; confirm the parity walker never sees it).`,
  },
  {
    key: 'completeness',
    prompt: `YOUR ROLE: completeness critic. List what Stage 1 was supposed to deliver that is missing, half done, or unverified. Sources of truth: HANDOFF-09-23-26-tier3.md (Tier 3 stage 1 bullet list), portal.md section 4 (P1 to P6, each with its Verify step) and the "Shared acceptance for page swaps", stage0-decisions.md (S1, S2, S3, S6, S7 and the Stage 1 decisions). Compare with git log and git diff ${RANGE} and the files on disk. For each gap, say whether it is a defect to fix now, something the orchestrator still has to run (for example re-filming every arrival strip as the new baseline, or the before/after strips the founder asked to see), or a founder decision. Do not repeat K1 and K2. Keep items concrete.`,
  },
]

const refutePrompt = (f, finderKey) => `${COMMON}

YOUR ROLE: refute one finding from the "${finderKey}" reviewer. Try hard to show it is wrong, overstated, already handled elsewhere, or not reachable in this codebase. Check the cited file and line in the current tree and reproduce the failure scenario if you can (code reading, a unit test, or a short live probe). If you cannot refute it, say so. Default to refuted=false only when the evidence holds up; if the finding rests on a guess you cannot confirm either way, refuted=true.

FINDING:
${JSON.stringify(f, null, 2)}`

phase('Find')
const results = await pipeline(
  FINDERS,
  (d) => agent(`${COMMON}\n\n${d.prompt}`, { label: `find:${d.key}`, phase: 'Find', schema: FINDINGS, model: 'opus', effort: 'medium' }),
  (res, d) => {
    if (!res) return { key: d.key, confirmed: [], dropped: [], fine: 'agent returned nothing' }
    const findings = res.findings || []
    return parallel(findings.map((f) => () =>
      parallel([0, 1].map((i) => () => agent(refutePrompt(f, d.key), { label: `verify:${d.key}:${i}:${(f.title || '').slice(0, 30)}`, phase: 'Verify', schema: VERDICT, model: 'sonnet', effort: 'medium' })))
        .then((votes) => {
          const v = votes.filter(Boolean)
          const refutes = v.filter((x) => x.refuted).length
          return { ...f, finder: d.key, votes: v, survives: v.length === 0 ? true : refutes < v.length }
        })
    )).then((judged) => ({
      key: d.key,
      confirmed: judged.filter(Boolean).filter((f) => f.survives),
      dropped: judged.filter(Boolean).filter((f) => !f.survives),
      fine: res.checked_and_fine,
    }))
  },
)

const all = results.filter(Boolean)
const confirmed = all.flatMap((r) => r.confirmed)
const toFix = confirmed.filter((f) => f.kind !== 'founder-decision')
const forFounder = confirmed.filter((f) => f.kind === 'founder-decision')
log(`${confirmed.length} findings survived (${toFix.length} to fix, ${forFounder.length} for the founder); ${all.flatMap((r) => r.dropped).length} refuted`)

phase('Fix')
const fix = await agent(`${COMMON}

YOUR ROLE: the fixer. You are now the only agent running, so for this role the read-only rule is lifted: you may edit files in src/, tests/ and scripts/ and run "npm run build" and "npm run verify" (the Worker serves dist/ and picks up a rebuild) and scripts/themes/motion.mjs against the Worker. Still no git commands that change state; the orchestrator commits.

Fix, in this order:
1. K1: centre the switcher on viewports under 700px without a transform (auto margins, or another layout-based centring that lands on whole pixels), and the first-load prompt the same way if it uses translate or transform. Keep the desktop placement unchanged. Verify with: BDL_GPU=1 MSYS_NO_PATHCONV=1 node scripts/themes/motion.mjs --base http://127.0.0.1:8787 --schools bauhaus,swiss,vaporwave,grandmillennial,glassmorphism --scenarios arrive --viewports mobile,phone --schemes dark --crop switcher --label stage1-fix-k1 ; every strip must say "switcher held still". If one still fails, find out why before changing thresholds; never loosen hold-still.mjs to make a strip pass.
2. K2: stop aborting warm-ups that are still useful when a navigation starts (the founder accepts the up-front cost), keep aborting only what is genuinely wasted, and make sure the smoke test is clean: MSYS_NO_PATHCONV=1 node scripts/themes/smoke.mjs --base http://127.0.0.1:8787 --contact . Do not weaken smoke.mjs to hide a real failure.
3. Then every surviving finding below that is a defect or a nit, most severe first. Skip anything that would change visitor-facing copy or a design decision, and say so in skipped. If a finding is wrong once you look closely, skip it with the reason.
Finish with npm run verify clean and the two commands above clean. Report every fix with its files.

Surviving findings to fix:
${JSON.stringify(toFix, null, 2)}

Findings held for the founder (do not act on these, but tell the orchestrator if a fix above touches one):
${JSON.stringify(forFounder.map((f) => ({ title: f.title, file: f.file })), null, 2)}`, { label: 'fix:all', phase: 'Fix', schema: FIX_REPORT, model: 'opus', effort: 'high' })

return {
  confirmed,
  forFounder,
  dropped: all.flatMap((r) => r.dropped.map((f) => ({ title: f.title, finder: f.finder, votes: f.votes }))),
  fine: all.map((r) => ({ key: r.key, fine: r.fine })),
  fix,
}
