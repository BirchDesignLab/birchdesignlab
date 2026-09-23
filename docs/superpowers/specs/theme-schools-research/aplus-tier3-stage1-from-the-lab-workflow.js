export const meta = {
  name: 'tier3-stage1-from-the-lab',
  description: 'From the lab: show 3 newest specimens and link each designation, across the root home and all seven school homes',
  phases: [
    { title: 'Build', detail: 'one builder (Opus/high)' },
    { title: 'Check', detail: 'visual + link checker (Sonnet/medium)' },
    { title: 'Fix', detail: 'only if the checker finds defects (Opus/high)' },
  ],
}

const COMMON = `You are one agent in a small workflow in the repo at C:/git/birchdesignlab (branch feat/theme-schools-tranche-1, PR #88 open, HEAD 5226800). Everything else in the PR is done, verified and pushed; your slice is only the home page's "From the lab" lines. A Worker (wrangler dev) serves dist/ at http://127.0.0.1:8787 (use 127.0.0.1) and picks up rebuilds; you are the only agent building. Refer to the founder as "the founder" or "they". No em dashes anywhere a visitor can read. No git commands that change state (the orchestrator commits and pushes). Edit with the Edit/Write tools, not PowerShell. Your final answer is data for the orchestrator.

THE FOUNDER'S REQUEST (binding): "for the immediate term can we just do the most recent 3 instead of 2? and make the bdl-0xx on the home page link to the actual lab experiment/study?"

What exists: featuredSpecimens() in src/lib/copy.ts returns the two newest live, non-noindex Lab entries by designation. The root home (src/pages/index.astro via src/themes/quiet/pages/Home.astro) and every school's src/themes/<id>/pages/Home.astro render them inside a data-parity-skip list (designation plus summary), each in its own idiom. After this PR's latest commit the live entries include BDL-010 (experiment, href /t/quiet/) and BDL-009 (study, /lab/bdl-009/). src/components/SpecimenCard.astro already resolves an entry's link: experiment href if present, otherwise /lab/<id>.`

const BUILD = `${COMMON}

YOUR ROLE: the builder.
1. featuredSpecimens() returns the three newest (keep its filter and order). Update any test or comment that says two.
2. Add one shared helper for an entry's link (next to featuredSpecimens, and use it in SpecimenCard too so there is one rule): an experiment's href if it has one, otherwise the entry's /lab/ page. Root-site links keep the root convention (no trailing slash, like hrefFor('lab') returns '/lab' on the root); inside a school, /lab/ links carry the trailing slash and data-astro-reload (they leave the school, like the existing "more" link), while BDL-010's /t/quiet/ link stays a router navigation inside the portal. Check how quiet's Home already decides \`leaves\` / theme and follow it.
3. In quiet's Home (root and /t/quiet/) and all six schools' Homes, make the designation (the "BDL-0xx" text) a real link to that entry, styled in each school's own idiom (visible as a link on hover and focus, with a visible focus style; keep each school's look, do not restyle the section). The summary stays text. Keep data-parity-skip on the list. Check the designation link has an accessible name that makes sense on its own (the designation alone may be too terse for a screen reader: consider aria-label or visually hidden text that reads like "BDL-009, Bayou Kitchen"; the entry's title is the natural label). Any visible text you add inside data-parity-skip is fine for parity, but add none unless needed.
4. Three lines instead of two: check each school's list styling still holds (grid, counters, separators, mobile stacking) and fix what breaks, in that school's idiom.
5. Verify: npm run verify clean; MSYS_NO_PATHCONV=1 node scripts/themes/smoke.mjs --base http://127.0.0.1:8787 --contact clean; then capture every home: BDL_GPU=1 MSYS_NO_PATHCONV=1 node scripts/themes/capture.mjs --base http://127.0.0.1:8787 --routes /,/t/quiet/,/t/bauhaus/,/t/swiss/,/t/vaporwave/,/t/cottagecore/,/t/grandmillennial/,/t/glassmorphism/ --viewports desktop,mobile --schemes dark,light --full-page --hide-switcher --label from-the-lab . Open the PNGs, look at the From the lab section on each, and fix anything wrong. Also click-test one designation link per school in a browser (Playwright) to confirm where it lands.
Report every change with files, the verification results, and what each school's section looks like now.`

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
const build = await agent(BUILD, { label: 'build:from-the-lab', phase: 'Build', schema: REPORT, model: 'opus', effort: 'high' })

phase('Check')
const check = await agent(`${COMMON}

YOUR ROLE: checker (read-only: no edits, no builds). The builder's report is below. Look at every PNG in scripts/themes/.out/from-the-lab/ (root and seven schools, desktop and mobile, dark and light) and judge the From the lab section: three lines present, nothing clipped, overlapping or misaligned, each school's idiom intact, the link visible as a link. Then with Playwright against the Worker, on / and each /t/<id>/, confirm each designation is a link, where it points (root: /lab/bdl-0xx without trailing slash or /t/quiet/; schools: /lab/bdl-0xx/ with data-astro-reload, or /t/quiet/ as a router link), that it is keyboard focusable with a visible focus style, and its accessible name. Run git diff to confirm the helper is shared (SpecimenCard uses it too) and nothing outside the slice changed. Report only real defects with evidence.

Builder report:
${JSON.stringify(build, null, 2)}`, { label: 'check:from-the-lab', phase: 'Check', schema: CHECK, model: 'sonnet', effort: 'medium' })

let fix = null
if (check && check.defects && check.defects.length) {
  phase('Fix')
  fix = await agent(`${COMMON}

YOUR ROLE: fixer. Fix each real defect below (skip with a reason any that is not), then re-run npm run verify and the smoke test, both clean, and re-capture the affected homes with the same capture.mjs command into --label from-the-lab.

Defects:
${JSON.stringify(check.defects, null, 2)}`, { label: 'fix:from-the-lab', phase: 'Fix', schema: REPORT, model: 'opus', effort: 'high' })
} else {
  log('Checker found no defects; no fix pass')
}
return { build, check, fix }
