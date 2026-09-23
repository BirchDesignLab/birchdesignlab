export const meta = {
  name: 'tier3-stage1-build',
  description: 'Tier 3 Stage 1 portal fixes: P4 trace, P1/P2 naming + guard, P6 placards, README/quiet/vaporwave/rename, P4 remedy',
  phases: [
    { title: 'Trace', detail: 'P4 baseline measurement (Opus/high)' },
    { title: 'Build', detail: 'B1 P1/P2 then B2 P6 and B3 README/quiet/vaporwave/rename (Opus/high)' },
    { title: 'Remedy', detail: 'B4 P4 remedy from the trace (Opus/high)' },
  ],
}

const COMMON = `You are one agent in a workflow for Tier 3, Stage 1 ("portal stage") of the theme-schools work in the repo at C:/git/birchdesignlab (branch feat/theme-schools-tranche-1). The exhibit ships as "the Portal" (BDL-010); older docs call it "Period Rooms".

Already done before you started (do not redo): the founder answered the Stage 0 and Stage 1 decisions, recorded in docs/superpowers/specs/theme-schools-research/tier3-briefs/stage0-decisions.md (binding over every brief; read the "Stage 1 decisions" section). The orchestrator added a --crop switcher|header mode to scripts/themes/motion.mjs and filmed baseline strips at HEAD into scripts/themes/.out/stage1-before/. A Worker (wrangler dev) is serving the HEAD build at http://127.0.0.1:8787 (use 127.0.0.1, not localhost). The founder approved launching this workflow; your slice is named below and is the only thing you do.

Read first: docs/superpowers/specs/theme-schools-research/HANDOFF-09-23-26-tier3.md, docs/superpowers/specs/theme-schools-research/tier3-briefs/stage0-decisions.md, docs/superpowers/specs/theme-schools-research/tier3-briefs/portal.md (sections 3 and 4), src/themes/README.md.

Rules for every agent in this workflow:
- Work only in your slice. Other agents edit other files at the same time: never touch a file outside your slice, never revert or reformat someone else's change.
- No git commands that change state: no commit, add, branch, checkout, switch, stash, reset, rebase, restore. The orchestrator commits. Read-only git (status, diff, log, show) is fine.
- Do not build: no npm run build, astro build, npm run verify, npm run dev:worker, scripts/themes/render.mjs, or anything else that rewrites dist/. The running Worker serves dist/ for the trace agent's timing measurements. Do not start or stop servers. Do not run npm install.
- You may run unit tests (npx vitest run tests/<file>.test.ts) and node --check. The orchestrator runs npm run verify (which includes astro check) after the workflow.
- Refer to the founder as "the founder" or "they", never "he" or "she".
- No em dashes in anything a visitor can read. Match the surrounding code's comment density, naming and idiom.
- Edit files with the Edit/Write tools, never with PowerShell Get-Content/Set-Content (it double-encodes UTF-8). The Edit/Write tools can decode backslash escape sequences (backslash-u, backslash-n) in your payload into real characters: when a source file must contain a literal backslash sequence, check the bytes afterwards with grep, and run "file <path>" to confirm the source is still text.
- Reduced motion is out of scope in the portal (decision S1): add no reduced-motion work.
- Your final answer is data for the orchestrator, not a message to the founder.`

const REPORT = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    files_changed: { type: 'array', items: { type: 'string' } },
    details: { type: 'string', description: 'What you built and why, precisely enough for the next agent and the reviewers' },
    verification: { type: 'string', description: 'What you ran or checked, with results' },
    needs_rebuild_to_confirm: { type: 'array', items: { type: 'string' } },
    founder_questions: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'files_changed', 'details', 'verification', 'needs_rebuild_to_confirm', 'founder_questions', 'risks'],
}

const TRACE_REPORT = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    table: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          school: { type: 'string' },
          viewport: { type: 'string' },
          first_visible_ms_median: { type: 'number' },
          breakdown: { type: 'string', description: 'Median ms per phase, trigger to first visible frame' },
        },
        required: ['school', 'viewport', 'first_visible_ms_median', 'breakdown'],
      },
    },
    cause: { type: 'string' },
    portal_side: {
      type: 'array',
      items: {
        type: 'object',
        properties: { remedy: { type: 'string' }, expected_gain: { type: 'string' }, evidence: { type: 'string' } },
        required: ['remedy', 'expected_gain', 'evidence'],
      },
    },
    school_side: {
      type: 'array',
      items: {
        type: 'object',
        properties: { school: { type: 'string' }, item: { type: 'string' }, evidence: { type: 'string' } },
        required: ['school', 'item', 'evidence'],
      },
    },
    files_written: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'table', 'cause', 'portal_side', 'school_side', 'files_written', 'risks'],
}

const TRACE = `${COMMON}

YOUR SLICE: P4 measurement only. The delay between a click and the first visible change on a school switch (portal.md section 3, "Nothing happens for a while after the click", and P4). Measure; change nothing under src/.

Files you own: scripts/themes/trace-arrival.mjs (new), scripts/themes/.out/trace-stage1/ (output, gitignored), docs/superpowers/specs/theme-schools-research/tier3-stage1/p4-trace.md (new, your findings).

Known: the Tier 2 arrival strips (scripts/themes/.out/motion-tier2/*__arrive__*, made by scripts/themes/motion.mjs, which follows a link from /t/quiet/ to /t/<id>/) put the first visible change at about +160 ms swiss, +240 bauhaus and grandmillennial, +400 glassmorphism and cottagecore, +480 to 560 vaporwave. The old-page keyframes have no delay (vaporwave's vw-crt-off starts at 0). The portal runtime (src/themes/portal/runtime.ts) wraps Astro's loader in astro:before-preparation to await the destination school's font preloads, capped at FONT_WAIT_MS = 600. Astro is 7.3.4; read node_modules/astro/dist/transitions/ (router and swap code) to know exactly when startViewTransition is called relative to the fetch, stylesheet loading, the DOM swap and script execution.

Do:
1. Write scripts/themes/trace-arrival.mjs with a header comment like the other scripts in scripts/themes/ (what, why, written 09-23-26, usage). Playwright Chromium; honour BDL_GPU=1 with the same launch flags motion.mjs uses; abort zaraz like motion.mjs. For each of the six schools (bauhaus, swiss, vaporwave, cottagecore, grandmillennial, glassmorphism), start on /t/quiet/, settle, then trigger the same client-side navigation motion.mjs uses (followLink). Add the return trip to quiet for at least swiss and vaporwave. Record on one clock (performance.now()): the trigger; astro:before-preparation, astro:after-preparation, astro:before-swap, astro:after-swap, astro:page-load; document.startViewTransition called, updateCallbackDone, ready (pseudo-elements start animating) and finished (wrap the method in an init script); resource timings for the destination HTML fetch, its stylesheets, fonts and module scripts; and the first screencast frame that differs visibly from the pre-trigger frame. At least 5 runs per school; report medians and spread. Desktop dark is the main case; add mobile dark for swiss and vaporwave.
2. For swiss and vaporwave, also record a Chrome performance trace (Playwright browser.startTracing on Chromium) of one arrival each, save it under scripts/themes/.out/trace-stage1/, and summarise the main-thread and compositor work between each pair of phases (style recalc, layout, paint, raster, script evaluation, image decode, font loading), naming the biggest costs.
3. Decide where the time goes. Split it into (a) portal-side time the portal code can remove (fetch, font wait, stylesheet waits, anything in runtime.ts or the switcher) and (b) school-side time (the destination page's own render or script cost before the new snapshot is ready) that belongs to that school's Stage 2 fix. Map the portal-side time onto portal.md's listed remedies: prefetch every school's same page and its font preloads when the switcher dialog opens, and the Shuffle target on hover or focus; lowering FONT_WAIT_MS; a busy state on the switcher control. Say which would actually move the number on this local build and by roughly how much, and say plainly when a remedy would not help. Target from portal.md: first visible change at or under 160 ms for every school on the local build. Note that a real network (the live site on Cloudflare) adds fetch latency the local build hides; say what that implies.
4. Write the findings to docs/superpowers/specs/theme-schools-research/tier3-stage1/p4-trace.md: method, a table per school, the phase breakdown, the cause, and ranked remedies with evidence. Plain prose, dated 09-23-26.

You are the only agent using the Worker during this workflow, so keep runs sequential for clean timings. Do not modify runtime.ts, switcher.ts or any school: another agent implements the remedy after you, from your report.`

const B1 = `${COMMON}

YOUR SLICE: P1 and P2 (portal.md section 4) plus the guard, as amended by stage0-decisions.md S2. You are the first builder; B2 and B3 start from your report.

Files you own: src/themes/portal/PortalLayout.astro, src/themes/portal/runtime.ts, tests/built/portal.test.ts, scripts/themes/motion.mjs, and new helpers under scripts/themes/lib/ if you need them. B2 edits PortalLayout.astro after you (it adds lesson to the school data), so keep your PortalLayout change small and self-contained.

P1, the switcher holds still:
- Give <bdl-switcher> the inline style "view-transition-name: bdl-switcher" in PortalLayout.astro.
- Add a small <style is:inline> in the head, marked with a data attribute (for example data-portal-vt) so tests can tell it apart from school CSS, with rules for ::view-transition-group(bdl-switcher) animation none, ::view-transition-old(bdl-switcher) display none, ::view-transition-new(bdl-switcher) animation none. They must win against every school's rules: several schools have html[data-theme='x']::view-transition-group(*), -old(*) and -new(*) wildcards, which out-rank a bare ::view-transition-group(bdl-switcher). Use !important (it is a portal invariant) and check against every src/themes/*/theme.css view-transition block. The block names no school, so "styles name no other school" stays green.
- It must be is:inline, not an Astro-bundled style, so it does not join a school's stylesheet set.
- Think it through: the switcher is transition:persist'ed (Astro moves the same element into the new body), it is position: fixed with a huge z-index, it lives in its own shadow root, and its label text changes on astro:page-load. Confirm from Astro 7.3.4's transitions source (node_modules/astro/dist/transitions/) that the persisted element is present in both captured states, and that nothing Astro does strips or rewrites an inline style attribute on persist. A school link in the dialog (top layer) closes the dialog before navigate().

P2, the naming contract (S2):
- In runtime.ts astro:before-preparation, set data-to-theme=<destination school id> on the current <html> (document.documentElement) before the view transition captures the old page. Overwrite it on every navigation, and remove it when the destination is not a school page, so an aborted navigation cannot leave a stale value that matters. Update the runtime's header comment.
- The recipe the README will document. B3 writes the README from your report, so get the recipe exactly right and put its final text in your report. A school names its own persistent chrome <id>-* only when both sides of the swap are that school, with ONE rule per name so the guard's per-page count stays at one:
    html[data-theme='x']:is([data-to-theme='x'], [data-from-theme='x']:not([data-to-theme])) .chrome { view-transition-name: x-chrome; }
  The :not([data-to-theme]) matters: data-from-theme stays on a page after it arrives, so without it a stale data-from-theme='x' would name the chrome on a departure to a different school. Check this reasoning against the runtime (data-from-theme is set on the incoming document in astro:before-swap) and against when Chrome reads view-transition-name for the old and the new capture. If the recipe is wrong or can be simpler, fix it and explain why.
  Also find out whether a non-none view-transition-name makes an element a stacking context or backdrop root outside a transition in current Chrome (it matters for glassmorphism's backdrop-filter chrome later). Cite the spec text if you can find it; otherwise say it is unverified.
- Tighten the built-site guard in tests/built/portal.test.ts (the "every view-transition name is used once" test):
  - collect names from linked stylesheets, inline <style> blocks AND inline style="" attributes;
  - keep the uniqueness check;
  - allow only three shapes: wordmark, bdl-switcher, and <id>-<something> where <id> is the page's own school (careful with ids that are prefixes of other ids, for tranche 2);
  - bdl-switcher appears exactly once on every portal page, only on the switcher element;
  - no school stylesheet mentions bdl-switcher (only the portal's marked inline block may);
  - keep the existing tests' style and helpers (tests/built/helpers.ts).
  You may run "npx vitest run --config vitest.dist.config.ts tests/built/portal.test.ts" against the existing dist/ (built from HEAD, so it lacks your markup change) as a sanity check that the guard does not false-positive on today's schools. List in needs_rebuild_to_confirm which assertions can only be confirmed after the orchestrator rebuilds.
- motion.mjs: the orchestrator just added --crop switcher|header; build on it and keep its style. Add a stability check for the switcher. When filming with --crop switcher, measure the switcher bar's rect before the trigger and again after the film settles. The switcher passes if every picked frame's bar region matches either the pre-trigger frame (in the before rect) or the final frame (in the after rect), within a tolerance that absorbs JPEG noise and the bar's 1px translucent seams. An intermediate state (scaled, tilted, blurred, clipped, ghosted, missing) fails. Record stable true/false and the worst frame per strip in manifest.json, print it, and add failures to problems. Keep the pixel comparison in a small pure function (scripts/themes/lib/ is fine) and prove it on synthetic images with a quick node run. Do not run motion.mjs against the Worker (the trace agent is timing it); the orchestrator validates live afterwards, where the HEAD baseline must FAIL for vaporwave (its switcher vanishes at +480 ms desktop dark) and grandmillennial mobile (its switcher is sliced by the wipe at +320 to 400 ms). Also fix a pre-existing wart: manifest.json is overwritten by each run, so a second run into the same --label loses the first run's entries; merge with an existing manifest instead (replace entries with the same file name).

In details, give exactly: the final recipe text for the README, the switcher CSS, the data-to-theme behaviour, the stacking-context finding, and the guard's rules.`

const B2 = (b1) => `${COMMON}

YOUR SLICE: P6, room placards and chronological order (portal.md P6; stage0-decisions.md S6, S7, and the Stage 1 decision that the exhibit is called the Portal). B1 already finished P1/P2; its report is at the end. Build on its PortalLayout.astro change, do not undo it. B3 is working in parallel on the README, the quiet header, vaporwave and lab content; do not touch those.

Files you own: src/themes/portal/schools.ts, src/themes/portal/switcher.ts, src/themes/portal/PortalLayout.astro (only the school data it serializes), src/themes/*/meta.ts (only the order field), and tests for these (tests/theme-registry.test.ts if it pins order; tests/built/portal.test.ts only to append an assertion, since B1 changed it).

Do:
1. Add lesson to SchoolSummary and to the data PortalLayout serializes. The JSON must stay byte-identical on every portal page (a test checks). schools.ts contains, inside serializePortalData, the literal six-character source text backslash, u, 0, 0, 3, c. Preserve it byte for byte and check with grep after editing.
2. Renumber order chronologically by era after quiet: quiet 0, bauhaus 1 (1919), swiss 2 (1950s), vaporwave 3 (2010), cottagecore 4 (2018), grandmillennial 5 (2019), glassmorphism 6 (2020). Touch only the order fields.
3. The placard: at the top of the switcher dialog, the current school's name, era, signature and lesson, set like a museum wall label but in the switcher's own house look (charcoal and moss, square corners, system type; the switcher never borrows a school's style). update() keeps it current after every swap. It sits under the dialog's heading with sensible structure (not a live region). Mind the dialog's max-height and the list's scroll on a 390x844 phone and a 1440x900 desktop: the list must still scroll and the placard must not push it off screen.
4. The first-load prompt: a one-line prompt above the bar on the first portal page load of a browser session. It never opens the dialog by itself. Clicking the prompt opens the school dialog; a small dismiss control (with an aria-label) closes it. Using any switcher control, or navigating, also counts as the first interaction and dismisses it. Remember the dismissal in sessionStorage, with every read and write in try/catch (storage can throw); if storage is unavailable, show it once per hard load. It sits above the bar, right-aligned with the bar on desktop and centred on phones, within 100vw minus 24px (it may wrap to two lines on a phone). It must never cover the bar's buttons. A small arrival animation is welcome (the Lab rolls heavy). The copy is a placeholder: put it in one clearly named constant at the top of switcher.ts with a comment saying the founder picks the final wording (stage0-decisions.md, Stage 1 decisions), and use: "The Portal: this site in seven design schools. Pick one to step through." No em dashes.
5. Keep the switcher's contracts: its shadow root, one look over every school, focus behaviour (dialog.close() returns focus to the open button; the current school's link gets focus on open), escapeHtml on every interpolated string, and the existing role and aria wiring. The switcher now holds still through every transition (B1), so its size must not jump when the prompt is dismissed mid-transition in a way that breaks that. This is a showpiece of the Lab: spacing, type scale and hierarchy should look deliberate.
6. Run the unit tests you touch.

In details: describe the placard and prompt layout and sizes at both viewports, the sessionStorage key, and what needs the founder's eye.

B1's report:
${JSON.stringify(b1, null, 2)}`

const B3 = (b1) => `${COMMON}

YOUR SLICE: the README, the quiet current-page fix, vaporwave's taskbar name, and the rename to the Portal. B1 already finished P1/P2; its report is at the end, and your README recipe must match what B1 built and wrote. B2 is working in parallel on switcher.ts, schools.ts, PortalLayout.astro and the meta.ts order fields; do not touch those.

Files you own: src/themes/README.md, src/themes/quiet/Header.astro, src/themes/vaporwave/theme.css (only a new, clearly commented naming block), src/content/lab/bdl-010.md (title only), src/content/lab/bdl-011.md (hero alt only), docs/lab-backlog.md (the BDL-010/011 heading only).

1. README (src/themes/README.md):
   - Intro: "BDL-010 Period Rooms" becomes "BDL-010, the Portal".
   - Links section: replace "No other element may use transition:name" with the naming contract (S2): wordmark (transition:name on the header wordmark) is the only name that pairs across schools; bdl-switcher belongs to the portal and no school may name or style it; a school may name its own persistent chrome with a CSS view-transition-name <id>-*, used once per page and applied only when both sides of the swap are that school, via B1's recipe (quote it exactly, with a one-line reason for each part, including the stale data-from-theme trap); one rule per name, because the guard counts declarations per page; the guard enforces the shapes and uniqueness. Say that a named element becomes its own group during the swap, and include B1's finding on stacking context and backdrop root.
   - Motion and backgrounds: document data-to-theme (set on the departing page) next to data-from-theme (set on the arriving page). Add the P5 wordmark recipe as the default every school adopts and may tune: ::view-transition-old(wordmark) fades out over the first 35% of the group's duration and ::view-transition-new(wordmark) fades in from 40%, so the two wordmarks are never legible together; both get height: 100%; object-fit: none (and an object-position matching where the school's wordmark sits) so a wordmark with a different aspect ratio is not stretched. Give the CSS. Read the cottagecore brief (docs/superpowers/specs/theme-schools-research/tier3-briefs/cottagecore.md item 2) for the finding this comes from. Say schools adopt it in Stage 2.
   - S1: reduced motion is out of scope for the portal's schools (this is a Lab piece); existing reduced-motion code may stay but gets no further work, and reviewers do not flag it; the root business pages rendered through quiet keep their behaviour exactly. Fix the WebGL bullet's "under prefers-reduced-motion: reduce draw one still frame" to match. Note that capture.mjs still emulates reduced motion for deterministic stills, so a school that stops honouring it is caught mid-animation in stills.
   - S3: add a principle where it fits best: more interactable details, not fewer, even if they do nothing. Rules: a control that does something is a real control with an aria-label; one that does nothing is aria-hidden and not focusable; visible label text counts for word parity unless it sits under aria-hidden (the parity walker skips aria-hidden subtrees, SVG text included; scripts/themes/lib/visible-text.mjs).
   - Keep the README's voice: plain, direct, second person to the school author, no em dashes.
2. Quiet's current-page highlight (stage0-decisions.md, "Stage 1 decisions" and the end of the file). src/themes/quiet/Header.astro renders on the root site (via src/components/SiteHeader.astro) and in /t/quiet/. Today aria-current uses path.startsWith(href), so Contact lights up on /contact/sent/. Change: page links light only on their own page (exact match, trailing-slash insensitive: root hrefs have no trailing slash, built root pathnames may have one); the Lab link keeps lighting across the whole Lab section on the root (/lab/, /lab/experiments/, /lab/studies/, /lab/<slug>/) with a boundary-aware prefix. In the portal, page links can use isCurrent() from src/themes/paths.ts. The only visible change anywhere: Contact is no longer highlighted on the sent page, root and portal. Root markup must otherwise stay byte-identical; no copy change.
3. vaporwave-taskbar (Stage 1 decision; vaporwave brief E9, naming only). In src/themes/vaporwave/theme.css, name the taskbar (header.taskbar, see src/themes/vaporwave/Header.astro) vaporwave-taskbar with B1's recipe, and add html[data-theme='vaporwave']::view-transition-group(vaporwave-taskbar) { animation: none; } so it holds still on in-school swaps, with a short comment pointing at the README contract. Put it in theme.css, not Header.astro's scoped style (Astro's scoping would mangle the html selector). Leave the image pair's default crossfade (identical pixels stay still; only the pressed task button changes) unless B1's report gives a reason not to. Nothing else from E9 or E1: the rest waits for vaporwave's stages. Check the existing vaporwave view-transition block (theme.css, around lines 395 to 435) for interactions with its old/new(root) rules and its wildcard reduce block.
4. The rename (Stage 1 decision): src/content/lab/bdl-010.md title "Period Rooms" becomes "The Portal". src/content/lab/bdl-011.md hero alt "inside the Period Rooms portal" becomes "inside the Portal". docs/lab-backlog.md heading "BDL-010 / BDL-011 · Period Rooms (theme schools)" becomes "BDL-010 / BDL-011 · The Portal (theme schools)". Grep src/, tests/, scripts/ and social/ for any other visitor-visible "Period Rooms" and report it rather than change it. Run the unit tests that cover lab content (tests/lab-schema.test.ts and any others that read src/content/lab).

In details: quote the new naming-contract and wordmark README text, give the exact quiet logic, and list anything that needs the founder.

B1's report:
${JSON.stringify(b1, null, 2)}`

const B4 = (trace, b1, b2, b3) => `${COMMON}

YOUR SLICE: P4, the remedy. The trace agent measured the delay; its report is below and its notes are in docs/superpowers/specs/theme-schools-research/tier3-stage1/p4-trace.md. B1 (runtime.ts, PortalLayout, guard, motion.mjs), B2 (switcher.ts placard and prompt, schools.ts, order) and B3 (README, quiet, vaporwave, lab content) are finished; their reports are below. Build on their changes; do not undo them.

Files you own: src/themes/portal/runtime.ts, src/themes/portal/switcher.ts, and docs/superpowers/specs/theme-schools-research/tier3-stage1/p4-trace.md (append a "Remedy" section; do not rewrite the trace agent's findings).

Apply only remedies portal.md lists, and only where the trace shows they move the number:
- prefetch every school's same page (and its font preloads) when the switcher dialog opens, and the Shuffle target when the pointer is over Shuffle or it gets focus. Pick the Shuffle target then, and use that same pick on click so the prefetch is not wasted; Shuffle must still exclude the current school and replace the history entry.
- change FONT_WAIT_MS only if the trace shows fonts gate the swap.
- a busy state on the switcher control that started the navigation, from the click until astro:page-load (or an aborted navigation), with aria-busy and a visible cue in the switcher's house look. No layout shift: the switcher's size must not change during the swap, because it now holds still through the transition.
Use Astro's own prefetch API if the installed Astro 7.3.4 exposes one that works for navigate() targets (check node_modules/astro/dist/prefetch/ and how the ClientRouter consumes prefetched pages, and whether prefetch is enabled by the ClientRouter in this config); otherwise explain what you used and why. Links inside the switcher's shadow root are invisible to Astro's own link prefetching.
If the trace puts the time mostly in school-side render cost, do not fix schools: list those as Stage 2 items in the Remedy section, per school, with the evidence.
Do not re-measure against the Worker (it serves the old build); the orchestrator rebuilds and re-runs scripts/themes/trace-arrival.mjs afterwards. Say what you expect the new numbers to be and why.

Trace report:
${JSON.stringify(trace, null, 2)}

B1 report:
${JSON.stringify(b1, null, 2)}

B2 report:
${JSON.stringify(b2, null, 2)}

B3 report:
${JSON.stringify(b3, null, 2)}`

const tracePromise = agent(TRACE, { label: 'trace:P4', phase: 'Trace', schema: TRACE_REPORT, model: 'opus', effort: 'high' })
const b1 = await agent(B1, { label: 'build:B1 P1/P2+guard', phase: 'Build', schema: REPORT, model: 'opus', effort: 'high' })
log('B1 done; B2 (placards/order) and B3 (README/quiet/vaporwave/rename) start in parallel')
const [b2, b3] = await parallel([
  () => agent(B2(b1), { label: 'build:B2 P6', phase: 'Build', schema: REPORT, model: 'opus', effort: 'high' }),
  () => agent(B3(b1), { label: 'build:B3 README+quiet+vw+rename', phase: 'Build', schema: REPORT, model: 'opus', effort: 'high' }),
])
const trace = await tracePromise
log('Trace and builders done; B4 applies the P4 remedy')
const b4 = await agent(B4(trace, b1, b2, b3), { label: 'remedy:B4 P4', phase: 'Remedy', schema: REPORT, model: 'opus', effort: 'high' })
return { trace, b1, b2, b3, b4 }
