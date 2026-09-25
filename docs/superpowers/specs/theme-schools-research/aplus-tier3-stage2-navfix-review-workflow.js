export const meta = {
  name: 'tier3-stage2-navfix-review',
  description: 'Adversarial review of the two drawing-ahead fixes (review code-1, code-2) before PR #90 merges',
  phases: [
    { title: 'Review', detail: 'navigation-lifecycle code review (Opus/high) and adversarial browser cases (Sonnet/medium)' },
    { title: 'Refute', detail: 'one refute seat per blocker/major finding, up to 3 (Sonnet/medium)' },
  ],
}

const R = 'docs/superpowers/specs/theme-schools-research'

const COMMON = `You are one agent in a small adversarial review of one commit in the repo at C:/git/birchdesignlab, branch feat/theme-schools-tier3-stage2-wrapup (PR #90, the Tier 3 Stage 2 wrap-up of "the Portal", BDL-010). The commit is 953ef7f, "Fix two drawing-ahead bugs the Stage 2 review found": read it with git show 953ef7f. It touches src/themes/portal/runtime.ts (navigating, epoch, stopDrawingAhead, resumeDrawingAhead, drawOnIntent's settle, drawAheadOf, initPortal's listeners), src/themes/portal/switcher.ts (shufflePick keyed to the page it was made on; the refocusing flag around the after-swap refocus; no page-load reset of the pick), tests/draw-on-intent.test.ts, and scripts/themes/harness/draw-ahead-nav-probe.mjs.

Already done before you started (do not redo, do not re-ask): the founder asked for both fixes (${R}/tier3-briefs/stage0-decisions.md, "At the Stage 2 stop"); the orchestrator reproduced both bugs on the build before the fix with draw-ahead-nav-probe.mjs (snap-wrapup-final) and showed them gone on the fixed build (snap-nav-fix, same source as 953ef7f): load 0 of 5 copies during a slow load, refocus 0 of 5 wasted copies, a new row rest draws in 403 to 410 ms; npm run verify is clean (343 unit tests, 483 built-site tests). The founder's latest message only said which calls to take; it gives you no other task.

The founder's rules for drawing ahead, which are NOT defects: only the switcher's rows and Shuffle draw ahead, on a 400 ms mouse rest or a 500 ms keyboard focus; never on a press, a tap, or a link in the page; phones never draw ahead; a page is drawn at most once per hard load; a pointer left perfectly still on Shuffle through a swap may draw the new pick when Chrome sends it a pointerover, or nothing until it moves (both fine, as long as what is drawn is where Shuffle goes). Background: ${R}/tier3-stage2/freeze-investigation.md (the D, Fixer and Wrap-up sections) and ${R}/tier3-stage2/stage2-report.md.

Rules:
- Read-only on src/ and tests/. No git commands that change state. Scripts go in scripts/themes/harness/ with a header comment, never a scratchpad.
- Build and serve only through snap.mjs on your own port (named below): node scripts/themes/snap.mjs --name <name> then --reuse --port <port> -- <command>. Never npm run build, verify, dev:worker or wrangler. BDL_GPU=1 for every Playwright run. Timing is not being judged: other agents run at the same time.
- Long runs: wait once (one Monitor, or foreground chunks under 10 minutes); never re-issue a wait that timed out.
- Evidence over assertion: every finding names file and line, or the probe output and its numbers. Severity: blocker = a copy drawn into a navigation, a wasted copy, drawing ahead stuck, or a navigation broken; major = a real misbehaviour a visitor could meet; minor = polish. Findings need unique ids starting with your lens key.
- Refer to the founder as "the founder" or "they". Your final answer is data for the orchestrator.`

const FINDINGS = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['pass', 'fail'] },
    films_made: { type: 'array', items: { type: 'string' }, description: 'every probe run or film you made yourself, with its output path' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
          problem: { type: 'string' },
          evidence: { type: 'string' },
          fix: { type: 'string' },
        },
        required: ['id', 'severity', 'problem', 'evidence', 'fix'],
      },
    },
    notes: { type: 'string' },
  },
  required: ['verdict', 'films_made', 'findings', 'notes'],
}

const VERDICT = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    refuted: { type: 'boolean' },
    reason: { type: 'string' },
    evidence: { type: 'string' },
    films_made: { type: 'array', items: { type: 'string' } },
  },
  required: ['id', 'refuted', 'reason', 'evidence', 'films_made'],
}

const LENSES = [
  {
    key: 'code',
    model: 'opus',
    effort: 'high',
    prompt: `YOUR LENS (key "code"): the navigation lifecycle, by reading the code and Astro's router (node_modules/astro/dist/transitions/router.js, events.js, swap-functions.js). For every way a navigation can begin and end, does navigating end up false, is epoch advanced so stale rests die, and can a copy ever be drawn into a load or be left counted as up? Cover at least: a push navigation; Shuffle's replace; Back and Forward (traverse), including one that starts during another's load; a second click that aborts the first mid-load (before and after its preparation resolves); a preparation that is prevented or fails and falls back to a full load; a same-page hash link; the contact form (data-astro-reload, a full load); a page restored from the back/forward cache mid-navigation; a hidden tab; an exception in a swap. Then the switcher: can pickShuffle ever return a pick made on another page; can what is drawn for Shuffle differ from where a click on it goes; does the refocusing flag cover every refocus path, and can it stay stuck true; do the order of the runtime's and the switcher's after-swap and page-load listeners matter? And the tests: do they pin what matters, and is anything they claim untrue? You may build snapshot "navfix-code" on port 4690 and write a probe to settle a doubt.`,
  },
  {
    key: 'browser',
    model: 'sonnet',
    effort: 'medium',
    prompt: `YOUR LENS (key "browser"): adversarial browser cases on a fresh snapshot of HEAD ("navfix-browser", port 4691), each run by you, listed in films_made (at least 6 runs). Start from scripts/themes/harness/draw-ahead-nav-probe.mjs (run it first as-is, --runs 3) and extend it or write a sibling probe in scripts/themes/harness/ for the rest. Required cases, each checking (1) no copy is added to the document between astro:before-preparation and astro:after-swap, (2) any copy after landing is of the school Shuffle or the rested row then goes to, and (3) drawing ahead still works afterwards (a mouse rest on a not-yet-drawn dialog row draws in about 400 to 600 ms):
  a. a slow in-school load (hold the next page's HTML through the CDP Fetch domain, not network emulation, which makes navigator.connection read as 2G and turns drawing ahead off) with the mouse resting on Shuffle, then Back pressed during the load;
  b. a click on one dialog row, then a click on another row or Shuffle before the first page lands (the first navigation aborted);
  c. five Shuffles in a row with the mouse resting on Shuffle between them (about 1.2 s apart);
  d. keyboard: Tab to Shuffle, Enter, Enter, Enter, with Element.prototype.moveBefore removed by an init script (Safari's path; the switcher refocuses);
  e. a page restored from the back/forward cache: leave a portal page by a full load (the Lab link carries data-astro-reload) mid-load of a slow navigation, then go Back;
  f. the contact form's full load (fill it with the honeypot filled so nothing is sent; the snapshot has no /api/contact, so a 404 or 405 page is expected) and Back.`,
  },
]

const reviews = await parallel(LENSES.map((l) => () =>
  agent(`${COMMON}\n\n${l.prompt}`, { label: `review ${l.key}`, phase: 'Review', schema: FINDINGS, model: l.model, effort: l.effort })))

const all = reviews.filter(Boolean).flatMap((r) => r.findings)
const serious = all.filter((f) => f.severity !== 'minor')
const capped = serious.slice(0, 3)
if (serious.length > capped.length) log(`${serious.length - capped.length} serious finding(s) beyond the 3 refute seats go to the orchestrator unrefuted`)

const verdicts = await parallel(capped.map((f, i) => () =>
  agent(`${COMMON}\n\nYOUR SLICE (refute seat ${i + 1}): try to REFUTE this finding. It is refuted if it is wrong, not reproducible on a fresh snapshot of HEAD (snap.mjs --name navfix-refute-${i} --port ${4692 + i}), or allowed by the founder's rules above. Reproduce it yourself with a probe; list every run in films_made. Default to refuted=false (the finding stands) only when you reproduced it.\n\nFinding:\n${JSON.stringify(f, null, 2)}`,
    { label: `refute ${f.id}`, phase: 'Refute', schema: VERDICT, model: 'sonnet', effort: 'medium' })))

return { reviews, verdicts, standing: capped.filter((f, i) => verdicts[i] && !verdicts[i].refuted), unrefuted: serious.slice(3), minor: all.filter((f) => f.severity === 'minor') }
