# README showcase pass (2026-11-21)

Working record for the README cleanup on `feat/readme-charts` (PR 118). Two read-only audits (Sonnet 5 medium fact-check, Sonnet 5 high tone audit) fed one Opus 5.5 medium rewrite, followed by an Opus 5.5 high critic.

## Founder decisions (2026-11-21)

- The repo is public as a **showcase**, not an open-source project. Contributions are not wanted, but the README must not say "don't contribute". It simply stops inviting them.
- The contributor-facing parts (Standing gaps, How contributions flow, Local setup, What a clone does not have, House rules) are **reframed as one "How we work" section**: the process shown as part of the portfolio, written as how we operate, not as instructions to an outsider. The gaps list, contribution steps and clone/setup how-to go.
- Scope is **tone and accuracy plus the full README list in the design critique** (`2026-11-17-readme-charts-critique.md`, section C).
- Add a **copyright LICENSE**: "Copyright Birch Design Lab", all rights reserved.
- Open question to the founder: the old House rules said "No study names the framework behind the specimens", while BDL-013 now names bdlBase openly. The rule line goes with House rules; whether bdlBase may be named elsewhere is the founder's call.

## Fact-check findings (Sonnet 5 medium)

No hard errors in paths, commands, counts, PRs or limits. Fix:

1. "The stage reports and handoffs live in the stage directories": handoffs (`HANDOFF-*.md`) sit at the root of `docs/superpowers/specs/theme-schools-research/`, reports in the stage directories.
2. "BDL-011 ... forthcoming, with a spec written": it is a front-matter stub; no BDL-011 spec file exists.
3. "one pair of schools per stage": Stage 1 built six schools, Stage 2 was a defect sweep; pairs start at Stage 3.
4. Repo map chart (chart 2) node "bdl-001 002 003 006 007 012" lacks 013.
5. "required check in the main ruleset" is a GitHub setting, unverifiable from the repo (true per founder setup).
6. BDL-013 frontmatter date is 2026-11-20; the timeline uses the merge day 2026-11-21. Both defensible.

Verified in bulk: glance table, Worker facts (run_worker_first, 5/60s limiter, cap 40, 30-day hold, cron 17 14 * * *), repo map paths, Lab table vs frontmatter, OG claims, Portal PR dates, harness files, timeline dates, gitignore claims.

## Tone audit (Sonnet 5 high)

Contributor voice to cut or reframe: "a map for anyone joining the project" (L7), Contents items for how-to-help/clone/setup/house rules, "Before you touch this layer" (to "Decisions we made in this layer"), "Opus-grade review under the house rules", docs-map imperatives, "(see House rules)", the new-theme scaffold how-to, `BDL_GPU=1` operator detail, "Three things to know", "Where it stands and how to help", "the studio sets priorities", the gaps list, "How contributions flow", "What a clone does not have", "Local setup", "House rules".

Voice breaks: "the studio" at L423, L479, L500, L507, L511, L547, L554; Mermaid "Studio inbox" (chart 1) and "Studio stop" (chart 6); alt text "a studio stop for taste calls". Templated: "Three things to know" plus a bold lead-in triplet, "is more than a form handler". Jargon to explain or drop: "Opus-grade", "film"/"film sheets", "taste calls", "brief-sized", "mutant suite", "render lock", "maxRounds", "seat", "parked", "stretch interactables", "?bh-assembly=", "one-way door", "accession numbers" before the museum framing.

Undercutting the portfolio reading: opening paragraph of stack facts before what a visitor gets; dated status hedging and roadmap chatter (Next planned work, Stage 6 queue, PR-number state column); backlog pointers; hints about private sibling repos beyond one line; internal editorial rules exposed.

Proposed "How we work" order: how a change reaches production (verify gate, CI, merge = deploy, no staging, revert as the safety net; chart 5); sensitive code and the best decisions in it; dependencies in one sentence; the agent harness in plain words (chart 6); how decisions get recorded (3 links max); habits in prose; honest limits in two sentences (Chromium-only filming with real-iOS checks after deploy; no screen-reader audit yet).

## Rewrite notes (Opus 5.5 medium editor, 2026-11-21)

**Structure.** Title, two sentences, hero with a one-line caption, one short paragraph that folds in the old "map" line. Then At a glance (2-column table), How the site is served, Repository map, The Lab, The Portal, How we work (production path with chart 5, Sensitive code, Agents with chart 6, How decisions are recorded with habits and two honest limits), Timeline, copyright footer. No Contents list, no `---` before H2s, no "Repository:" line.

**Moved.** "Before you touch this layer" became "Decisions we made in this layer" (same facts, plain words). The sensitive-code sentence moved into How we work. Build/verify/deploy and the harness became subsections of How we work. Dependencies policy is one sentence. Stage reports and handoffs are located correctly (handoffs at the root of `theme-schools-research/`).

**Cut.** Contents; the 11-row docs map; the path table trimmed from 15 rows to 8, two columns, start-with links inlined; the new-theme scaffold how-to; `BDL_GPU=1`; the Stage 6 / transitions / copy-pass roadmap; "Where it stands and how to help", Next planned work, Standing gaps, How contributions flow, What a clone does not have, Local setup, House rules (including the editorial rules and the "no study names the framework" line); the PR-number state column in the schools table (replaced by each school's era from `meta.ts`); `type: study` / `genreStudy` detail; render lock, maxRounds, mutant suite, film, taste calls, seat, parked, one-way door.

**Fact fixes applied.** Handoff location; BDL-011 now just "Forthcoming" (no spec claim); "Stage 1 built six schools around quiet, Stage 2 swept defects, pairs from Stage 3"; 013 added to chart 2. The required-check claim stays, reworded as "a red run blocks the merge".

**Charts.** classDefs recoloured to the light brand palette (tan `#e7d9c7`/`#4a3a2c`, sage `#e3e9e0`/`#2b4a37`, paper `#fbfaf6`/ink `#1f1b15`) in all six flowcharts. Chart 1 "Studio inbox" to "Our inbox". Chart 2 experiments node adds 013. Chart 6: "Studio stop / taste calls" to "Our call / style and scope decisions", plus plain-word labels (Verify head, minor issues logged, set aside for us to rule on, two rounds, records every case in Chromium); alt text updated in README and `charts.json`. One-line colour keys above charts 1, 2, 3 and 5 (chart 1's also explains the ticks). Timeline untouched.

**Founder calls to look at.**
1. All new copy (first screen, hero caption, How we work prose, "Agents, with a budget" heading) is founder territory.
2. bdlBase is named in the BDL-013 line (it is the entry's own public summary). The old "no study names the framework" rule was dropped with House rules.
3. BDL-005 keeps its title "Cheer and Chatter Social Club" (public on the live Lab and linked from BDL-012) with one line that its code is in a private repository. Drop the name if it should stay off GitHub.
4. "Every pull request is reviewed and merged by hand" and "a month of usage in about ten minutes" are public claims about process.
5. The hero loop is stale (five schools, captured dark) and was not regenerated; the caption avoids a number.
6. Section title "The Portal: seven design schools" differs from chart 4's baked caption "The Portal: design schools" (left unchanged).
7. On the chart 6 phone layout, the edges from Verify head cross the cluster title "Review in parallel on the verified head"; the title and layout were not changed by this pass, so it is likely pre-existing.
