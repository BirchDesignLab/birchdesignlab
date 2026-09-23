# Theme schools: Tier 3 handoff (session of 09-23-26)

Start here. This supersedes `HANDOFF-09-23-26.md` (the earlier handoff from
the same day, which covered building the six schools).

## The goal

Take the six tranche-1 schools of the Period Rooms portal (`/t/<school>/`,
BDL-010) from a first-pass B to A+. Founder, 09-23-26: "keep in mind that
this is going to be the magnum opus for at least a few months." After A+
comes a purposeful transitions phase, then BDL-011 and the final review,
then one PR, then tranche 2.

## Read first, in this order

1. `tier3-briefs/stage0-decisions.md`: the founder's answers. Binding; wins
   over every brief.
2. `tier3-briefs/portal.md`: the set and the portal, cross-cutting fixes
   P1 to P6, and the Tier 3 order (sections 4 and 6).
3. The brief for whichever stage you are on: `tier3-briefs/<school>.md`.
   Each has Protect, execution items, founder decisions and ideas saved for
   the transitions phase.
4. The school's research dossier when you need the evidence:
   `dossiers/<school>.md` (cited, primary sources, re-verified).
5. `src/themes/README.md`: the authors' contract.

All paths above are under `docs/superpowers/specs/theme-schools-research/`
unless they start with `src/`.

## Where things stand

- Branch `feat/theme-schools-tranche-1`, nothing pushed. Main has the portal
  foundation (#87). One PR at the end, schools and BDL-010/011 going live
  together. Ask the founder before pushing.
- Six schools built and committed, one commit each (09-23-26). Grades after
  the critique panel: vaporwave B, grandmillennial B+, glassmorphism B-,
  cottagecore B+, bauhaus B+, swiss B-.
- Founder's read: vaporwave and bauhaus are great (favourites);
  grandmillennial and cottagecore are "absolutely selling what we can do";
  glassmorphism is the most lackluster, swiss right behind. Mobile looks good.
- Tier 1 done: the `[data-portal-tail]` hook, `isCurrent()` for nav
  highlighting, the glass orb fix, review tooling (below), and a review of
  it. Tier 2 done: the research dossiers and the critique panel's briefs.
- `npm run verify` and the portal smoke test (`--contact`) were clean after
  Tier 1.

## Stage 1 status (09-23-26, later the same day)

Stage 1 is built, reviewed, fixed and committed (4ee4a55 to the Stage 1
report commit), and stopped for the founder. Start from
`tier3-stage1/stage1-report.md`: what shipped, the evidence, 11 open founder
decisions (prompt copy with three drafts, placard labels and layout, prompt
behaviour, bar width, cues, the dismiss label, BDL-010 copy, and a
pre-existing root-page CSS leak), and what carries into Stage 2 (the P5
wordmark proof comes first). The founder's Stage 1 answers are in
`tier3-briefs/stage0-decisions.md` ("Stage 1 decisions"): the exhibit ships
as **the Portal**, the transitions phase builds a transition for each pair
of schools that never stalls on loading, and cottagecore gains dandelions in
the light scheme.

New tooling since this handoff was written:
- `scripts/themes/motion.mjs --crop switcher|header`, with a hold-still
  verdict and `--unname-switcher` as the negative control;
- `scripts/themes/trace-arrival.mjs` (P4 timing);
- `scripts/themes/compare-strips.mjs` (before over after);
- `scripts/themes/harness/*` (live probes, founder shots);
- `smoke.mjs`, which now checks the runtime end to end.

Capture tools hide the first-load prompt unless you pass `--show-prompt`.

## Tier 3, in stages (stop for the founder after each)

The founder approved the plan in `portal.md` section 6, as amended by
`stage0-decisions.md`:

1. **Portal stage** (commits on this branch; there is no separate PR):
   - P1: the switcher gets its own transition name, no animation.
   - P2: the naming contract, `data-to-theme` on the departing page, the
     README recipe, and the guard update (S2).
   - P3 is dropped (S1: reduced motion is out of scope).
   - P4: trace the delay between click and first visible change
     (160 ms swiss to 560 ms vaporwave) before fixing anything.
   - P5: the README recipe that stops the wordmark ghosting.
   - P6: room placards in the switcher dialog, chronological order (S6, S7).
   - README: S1, S2, and the "more interactable details" principle (S3).
   - Quiet's current-page highlight on `/contact/sent/`, root and portal
     together (end of `stage0-decisions.md`), only if the founder says yes;
     ask at the start of the session.
   - Afterwards, re-film every arrival strip as the new baseline.
   - Show the founder S2 working, not described: before-and-after motion
     strips of the switcher holding still, and of one school's chrome holding
     still on an in-school page change. Founder: "i might have to see it to
     understand fully." The parked billboard-carries-`wordmark` idea needs a
     discussion and an example before anything is built.
2. **Defect sweep**, all six in parallel (`portal.md` section 6, stage 2,
   minus the reduced-motion items).
3. **Pair: glassmorphism + vaporwave.** Study the Supyrb references first
   (in stage0-decisions under vaporwave); glass goes Liquid Glass forward.
4. **Pair: swiss + bauhaus.**
5. **Pair: grandmillennial + cottagecore.** Cottagecore's object words are
   copy: draft them and get the founder's approval.
6. **Set re-review:** regenerate the sheets and strips, and run the set
   critique again.

At each pair stage, list the per-school decisions you are applying (brief
recommendations by default) so the founder can revisit them.

**Models:** revisers and builders Opus/high this time (a Sonnet reviser
introduced a regression in the first pass), critics Opus/medium,
verify/refute seats Sonnet. State the plan and agent count before any
workflow, per CLAUDE.md.

## Tooling (all under `scripts/themes/`, usage in each file's header)

- `render.mjs --theme <id>`: locked build plus captures (desktop and mobile,
  switcher hidden), contrast check and the school's built-site tests.
  Builds are serialized by a lock, so parallel authors queue.
- `capture.mjs`: viewports `desktop`, `mobile`, `tablet` (2x, touch, so
  `pointer: coarse` applies) and the older `phone`; `--hide-switcher`;
  `--full-page`; `--motion`.
- `motion.mjs`: films arrive / page / fx as timestamped frame strips; a
  navigation that never landed is written as `__FAILED`.
- `contact-sheet.mjs --label <run>`: one sheet per school (per viewport).
- `smoke.mjs --base http://127.0.0.1:8787 --contact`: the portal runtime
  end to end, under `npm run dev:worker`.
- Tier 2 inputs, still on disk (gitignored, regenerable):
  `.out/tier2-{desktop,mobile,tablet}/` and `.out/motion-tier2/`.

## Gotchas this session learned

- **Wrangler dev binds 127.0.0.1.** Node resolves `localhost` to IPv6 and
  gets connection refused, so use `http://127.0.0.1:8787`.
- **Don't build while the founder is browsing the Worker.** A build rewrites
  the `dist/` folder the Worker serves from, so pages break mid-visit.
  Capture from the running Worker instead.
- **Astro reserves the prop name `as`.** A component whose Props has `as`
  silently loses its whole type. Agents can't run `astro check`, so the
  orchestrator runs `npm run verify` after every workflow.
- **Workflow agents see the founder's latest message** and rank it above the
  script. Name the steps already done in every prompt and say which slice is
  theirs. Check `git branch` and `git reflog` after every workflow.
- **Pronouns.** Agents guessed "he" for the founder once. Tell them to write
  "the founder" or "they".
- **Workflow scripts live in this folder** (`aplus-*.js`, `tranche-1-*.js`).
  Strip `\r` before launching one with `scriptPath`.
- **WebFetch refuses web.archive.org.** Use `curl` with the capture's `id_`
  URL. Raw copies of copyrighted pages go to the scratch folder, never the
  repo. The web-search budget can run out mid-session.
- **The critics' file:line references drift.** Re-check them against the
  current code.
- **Git Bash mangles `/t/...` arguments.** Prefix with `MSYS_NO_PATHCONV=1`.

## Founder items outstanding

- Quiet's root `/contact/sent/` nav highlight (see `stage0-decisions.md`).
- Approval of the vaporwave `meta.ts` wording and of cottagecore's object
  words when drafted.
- From the build handoff: keep Zaraz "SPA support" off, a post-deploy check
  of the consent modal across swaps, a real-device pass, a voice pass on
  BDL-010/011, and the push/PR approval.
- The transitions phase and tranche 2 are parked in `docs/lab-backlog.md`
  (BDL-010/011 section).
