export const meta = {
  name: 'tier3-stage1-founder-decisions',
  description: 'Apply the founder Stage 1 decisions (prompt, placard removal, picker heading, cues, BDL-010 copy), then two checkers',
  phases: [
    { title: 'Build', detail: 'one builder (Opus/high)' },
    { title: 'Check', detail: 'behaviour probe + diff/rules check (Sonnet/medium)' },
    { title: 'Fix', detail: 'only if checkers find defects (Opus/high)' },
  ],
}

const COMMON = `You are one agent in a small workflow in the repo at C:/git/birchdesignlab (branch feat/theme-schools-tranche-1), Tier 3 Stage 1 of the theme-schools work ("the Portal", BDL-010). Stage 1 is built, reviewed and committed (HEAD 98dad53); read docs/superpowers/specs/theme-schools-research/tier3-stage1/stage1-report.md ("Decisions for the founder") for context. The founder has now answered those decisions; your job is only to apply the answers listed below. A Worker (wrangler dev) serves dist/ at http://127.0.0.1:8787 (use 127.0.0.1) and picks up rebuilds. Refer to the founder as "the founder" or "they". No em dashes anywhere a visitor can read. Match the surrounding code's style and comment density. Edit with the Edit/Write tools, not PowerShell. No git commands that change state (the orchestrator commits and opens the PR). Your final answer is data for the orchestrator.

THE FOUNDER'S ANSWERS TO APPLY (exact wording is binding):
D1. First-load prompt copy (FIRST_LOAD_PROMPT in src/themes/portal/switcher.ts), exactly:
    "Welcome to the Portal. Choose a design school and watch the page transform. Shuffle for a random one, and swap between light and dark while you're there."
    Update the constant's comment: the founder chose this wording 09-23-26; it names no school count, so it survives tranche 2.
D2+D3. No repeats, and the list must not eat the phone: REMOVE the placard from the switcher dialog entirely (its markup, styles, update() code, and the landscape-phone scroll handling that only existed for it, keeping the dialog's scroll behaviour sound: opening the dialog still focuses the current school's row and brings it into view). The current row keeps its highlight and aria-current. Lessons are kept for the BDL-011 case study: leave meta.ts lesson fields alone, but remove lesson from SchoolSummary / PortalLayout's serialized data (nothing reads it any more) and update the built test that asserted it (keep its order assertion). The dialog heading "Design schools" becomes "The Portal" (portal wording for the school picker). Keep the dialog's aria-labelledby wiring.
D4. The prompt lives until a tap or click: it is dismissed only by a click or tap on the prompt itself (its text button opens the dialog, as now), its dismiss control, any switcher control, or Escape on the prompt. It survives router navigations and reloads within the browser session (remove the dismissal on astro:before-preparation and on pagehide). The sessionStorage flag is written only on those dismissals. Storage failures stay caught.
D6. The prompt arrives after 1000 ms (was 650), and the beacon pulses more slowly (about half the current pulse rate, same count).
D7. The busy cue on the pressed switcher control is bolder: clearly visible at a glance (for example a thicker, brighter moss bar and a stronger raised background), still inside the button's box with no layout shift, and still cleared exactly as now.
D9. The prompt's dismiss control's aria-label becomes "Dismiss the Portal prompt".
D10. BDL-010 is the Portal throughout. In src/content/lab/bdl-010.md set, exactly:
    summary: 'The Portal: this whole site, rebuilt in one design school after another, with the page transforming as you cross between them. Same words, same links, a working contact form in every one; every visual decision made again from scratch.'
    howto:
      - Pick a school from the bar at the bottom of the screen and watch the page transform.
      - Shuffle for a random school; the page you are on stays put.
      - Swap between light and dark while you are there. Every school has both.
      - Leave steps back out to the regular site.
    If the lab schema (src/content.config.ts or wherever the lab collection is defined, plus tests/lab-schema.test.ts) limits summary or howto length, say so and do not silently shorten the founder's words; report it.
D5 (bar width) stays as is. D8 and D11 are the orchestrator's (backlog), not yours.`

const BUILD = `${COMMON}

YOUR ROLE: the builder. Apply D1, D2+D3, D4, D6, D7, D9 and D10. Also update anything that referenced the placard or the old prompt behaviour so nothing is left stale: scripts/themes/harness/stage1-fixes-probe.mjs (drop or replace the landscape placard check), scripts/themes/harness/stage1-founder-shots.mjs, scripts/themes/smoke.mjs (if it checks prompt dismissal on navigation), tests, and the switcher.ts header comment. Do not touch docs/ (the orchestrator updates the report).
Then verify, in this order, and fix until clean:
1. npm run verify (must be clean).
2. MSYS_NO_PATHCONV=1 node scripts/themes/smoke.mjs --base http://127.0.0.1:8787 --contact (must pass).
3. BDL_GPU=1 MSYS_NO_PATHCONV=1 node scripts/themes/motion.mjs --base http://127.0.0.1:8787 --schools vaporwave,grandmillennial,glassmorphism --scenarios arrive,page --viewports desktop,mobile --schemes dark --crop switcher --label stage1-decisions-holdstill (every strip must say "switcher held still").
4. node scripts/themes/harness/stage1-fixes-probe.mjs (must pass).
5. BDL_GPU=1 MSYS_NO_PATHCONV=1 node scripts/themes/harness/stage1-founder-shots.mjs --school vaporwave --schemes dark,light, then open and look at the dialog and prompt PNGs in scripts/themes/.out/stage1-founder/ and say what they show.
Report every change with its files, the results of all five steps, and anything the founder should look at.`

const REPORT = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    changes: { type: 'array', items: { type: 'string' } },
    verification: { type: 'string' },
    notes_for_founder: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'changes', 'verification', 'notes_for_founder'],
}
const CHECK = {
  type: 'object',
  properties: {
    defects: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, file: { type: 'string' }, evidence: { type: 'string' }, fix: { type: 'string' } }, required: ['title', 'file', 'evidence', 'fix'] } },
    checked_ok: { type: 'string' },
  },
  required: ['defects', 'checked_ok'],
}

phase('Build')
const build = await agent(BUILD, { label: 'build:decisions', phase: 'Build', schema: REPORT, model: 'opus', effort: 'high' })

phase('Check')
const checks = await parallel([
  () => agent(`${COMMON}

YOUR ROLE: live behaviour checker (read-only: no edits, no builds). The builder has applied the answers; its report is below. With Playwright (Chromium) against the Worker, confirm each behaviour on a phone (390x844, 2x, touch) and a desktop (1440x900):
- a fresh session shows the prompt with the exact D1 text, arriving about 1000 ms after load; it survives a router navigation (click a header link) and a reload; it disappears on a click on its dismiss control, and separately (fresh session) on a click on a switcher control, and on Escape while focused; after dismissal it stays gone across navigation and reload in the same session;
- the dismiss control's accessible name is exactly "Dismiss the Portal prompt";
- the dialog has no placard, its heading reads "The Portal", the current school's row is highlighted with aria-current and is in view on open, and on the phone the whole list fits or scrolls without the dialog covering the screen edge to edge; take screenshots and look at them;
- a school pick shows the busy cue at the click (catch it by throttling the network in DevTools so the load takes a moment) and it clears after the swap;
- /lab/ shows BDL-010's new summary text (or the card text it uses) where the catalog shows it.
Report only real defects with evidence.

Builder report:
${JSON.stringify(build, null, 2)}`, { label: 'check:behaviour', phase: 'Check', schema: CHECK, model: 'sonnet', effort: 'medium' }),
  () => agent(`${COMMON}

YOUR ROLE: diff and rules checker (read-only: no edits, no builds). Run git diff (working tree against HEAD 98dad53) and check: every founder string appears exactly as specified (D1, D9, D10, the heading "The Portal"); no em dash in any visitor-visible string; nothing left over from the placard or from lesson in the portal data (dead CSS, dead functions, stale comments, stale test names, stale harness checks); sessionStorage reads and writes still in try/catch; escapeHtml still on every interpolated string; the switcher's shadow-DOM, focus and aria wiring intact; tests changed consistently with the code; npx vitest run (unit) passes. Report only real defects with evidence.

Builder report:
${JSON.stringify(build, null, 2)}`, { label: 'check:diff-rules', phase: 'Check', schema: CHECK, model: 'sonnet', effort: 'medium' }),
])

const defects = checks.filter(Boolean).flatMap((c) => c.defects || [])
let fix = null
if (defects.length) {
  phase('Fix')
  fix = await agent(`${COMMON}

YOUR ROLE: fixer. The builder applied the founder's answers; two checkers found the defects below. Fix each one that is real (skip with a reason any that is not), then re-run npm run verify and MSYS_NO_PATHCONV=1 node scripts/themes/smoke.mjs --base http://127.0.0.1:8787 --contact, both clean. Do not change the founder's wording.

Defects:
${JSON.stringify(defects, null, 2)}`, { label: 'fix:decisions', phase: 'Fix', schema: REPORT, model: 'opus', effort: 'high' })
} else {
  log('Checkers found no defects; no fix pass')
}
return { build, checks, fix }
