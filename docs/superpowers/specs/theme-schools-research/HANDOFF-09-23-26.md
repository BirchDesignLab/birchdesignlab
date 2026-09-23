# Theme schools: build handoff (session 09-22/23-26)

Start here in the next session. Spec: `docs/superpowers/specs/09-22-26-theme-schools-design.md` (its §11 lists calls made in build; founder has not reviewed them). Plan: `docs/superpowers/plans/09-22-26-theme-schools.md`. Founder said "just build it"; approval gates were waived for this work.

## Branches

- `chore/deps-and-theme-foundation`: everything done so far, linear, ready for review. Not pushed. Contains spec + plan, all dependency upgrades, and PR 0 (the portal foundation).
- `feat/theme-schools-tranche-1`: one WIP commit on top: six schools stamped from the template plus a few minutes of builder-agent edits before the workflow was stopped. All routes disabled. A possible head start; nothing in it is reviewed.

## Done (all verified: `npm run verify` clean, root pages pixel-identical to production)

- Deps: audit fix + minors; Astro 7.3.4 + @astrojs/svelte 9 + zod 4; TypeScript 6.0 (7.0 held back: no compiler API, @astrojs/check peers ^5||^6; recorded in lab-backlog); vitest 5; fontaine 1.0; three 0.186. `npm audit`: 0.
- Astro 7 traps fixed in `astro.config.mjs`: `compressHTML: true` (the 'jsx' default ate "survives in bright"); a CSS restore plugin (Rolldown ignores Astro's CSS restore, broke `/?tune`). `npm run build` now empties dist first (`scripts/build/clean-dist.mjs`; Astro's emptyDir silently left a deleted school's pages).
- Attribute contract: `data-scheme` = light/dark (localStorage `scheme`, legacy `theme` migrated), `data-theme` = school, `data-face` retired.
- `src/lib/lifecycle.ts` onMount (per-body scripts), BarkField WebGL context-loss recovery.
- Copy collection `src/content/copy/*.yaml` (SITE_DESCRIPTION injected, never copied).
- Quiet is a school (`src/themes/quiet/`); root pages are thin wrappers. `/t/quiet/` live in the portal: PortalLayout, runtime (attribute re-stamp, font warm-up, scroll, focus, Zaraz spaPageview), shadow-DOM switcher.
- Worker: `return` field, pattern + asset-existence check, themed redirects. Verified under wrangler dev.
- Contrast checker (`src/lib/contrast`, `scripts/themes/check-contrast.ts`), built-site guards (`tests/built/`), BDL-010 Period Rooms + BDL-011 Field Guide as `forthcoming`, self-study schema.
- Author tooling: `src/themes/README.md` (the contract), `scripts/themes/new-theme.mjs` + `template/` (guard-passing scaffold), `scripts/themes/render.mjs` (locked build + GPU capture + contrast + school tests), `smoke.mjs` (portal runtime, `--contact` under wrangler dev), `capture.mjs`/`diff-captures.mjs`, `check-context-loss.mjs`.

## Next

1. Build the six schools. `tranche-1-workflow.js` in this folder is the stopped workflow (per-school briefs: palette, doctrine, fonts, motifs; builder -> Opus critic -> reviser). Reuse it. Schools build in parallel in one tree; render.mjs's lock serializes builds. Decide whether to start from the WIP branch or re-stamp.
2. When a school is done: rename its route to `[...page].astro`, run render + smoke, commit per school.
3. BDL-011: school index component (planned: cards reading each school's palette from its CSS via `src/lib/contrast` tokensFor; register in `src/studies/registry.ts`), writeups, new hero; flip BDL-010/011 to live.
4. Phase D: full verify, capture + smoke (+ `--contact` under `npm run dev:worker`), adversarial review workflow over the whole diff, docs (lab-backlog theme thread, `/lab/[slug]` all-CSS twin bug F016, second tranche, docs/analytics.md SPA note, brand-brief dated note), then ask the founder before pushing.

## Gotchas learned this session

- Workflow agents receive the founder's triggering prompt and rank it above the script; Haiku agents branched and committed once. Say in every prompt that git is the orchestrator's; Sonnet minimum near the repo.
- Git Bash mangles `/t/...` args: `MSYS_NO_PATHCONV=1`. Heredocs and Edit/Write decode backslash escapes; use anchors without backslashes.
- Astro 7 allows one `astro preview` per project; render.mjs serves dist itself.
- Founder items outstanding: Zaraz "SPA support" toggle must stay off (runtime calls spaPageview); post-deploy check of consent modal across swaps; real-device pass; voice pass on BDL-010/011; review spec §11 calls; push/PR approval.
