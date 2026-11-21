# BDL-013 Lab page plan: o7 as a real Lab experiment

*11-21-26: the proposal and the briefs this plan cites now live in gitignored
`docs/private/bdl-013/` (they name private clients; this repo is public).*

Plan approved 11-20-26. Source of truth for the piece:
`docs/bdl-013/mockups/o7-drawing-set.html` (founder pick). Facts:
`docs/bdl-013/briefs/round6/judge-picks.md` (Facts), bdlBase `1f9afc7`.

**Hold: no push and no PR until the Portal lands** (founder 11-20-26). Build
may proceed locally on this branch; it waits for the theme-schools work to
merge to `main`, then rebases or merges `main` in and opens its PR.

## Founder answers, 11-20-26

1. **Title: "The Drawing Set"** (default; founder unsure, revisit at the copy
   pass). It names the artifact the way "The Data Map" does. Summary draft:
   "bdlBase, the web framework we built, drawn as one engineering sheet: each
   line of a business's file, tied to the part of the website it causes."
2. **Day / Night: keep o7's own switch** (default; founder unsure). Starts
   from the visitor's site scheme, never stored. Cyanotype Night is half
   the charm and the switch is a try-it detail. Revisit after the first
   founder sheets.
3. **Stage vs Lab chrome: approved.** Drop the eyebrow (the pill says it),
   wall label starts folded below 1760px wide (BDL-012 precedent), stage
   fills the first screen, specimen plate follows on scroll.
4. **Cross-links: founder doesn't mind.** Lightest option: Detail 1's
   Magnolia & Mane heading links to `/lab/bdl-008/`. The BDL-008 and
   BDL-009 writeups stay untouched.
5. **4:5 social takes: parked** in `docs/socials-backlog.md`. Page and OG
   card ship without them.
6. **Specimen plate copy: approved.** I draft, founder edits before merge.
7. **Fonts: use what is installed.** `@fontsource/ibm-plex-mono` and
   `@fontsource/spectral` (incl. 500) are already dependencies; no new
   package.
8. **OG: refit 627 to 630** (approved).

## What ships (files)

| File | What |
|---|---|
| `src/content/lab/bdl-013.md` | Entry: `type: experiment`, `device: universal`, `status: live`, tech `[astro, cloudflare workers, durable objects, stripe, github actions]` (check each against the facts), `howto` (draft below), plate copy |
| `src/experiments/bdl-013/data.ts` | Every string, Plain and Hood side by side, plus a `FACTS` table: each number on the sheet with its bdlBase source path (9 routes, 9 deploy jobs, 7 merged files, LHCI 0.95/1.0, 0 files) |
| `src/experiments/bdl-013/Experiment.astro` | Sheet 1 and Details 1-3 rendered from `data.ts`; styles nested under `.ds` (global, BDL-012 pattern) |
| `src/experiments/bdl-013/stage.ts` | Port of o7's script: Plain/Hood, Day/Night, detail nav, history, keys, leader hover, zone grid, fit |
| `src/experiments/registry.ts` | One line: `'BDL-013': BDL013` |
| `src/lib/og/manifest.ts` | `OG_LAB_CUSTOM` entry for BDL-013 |
| `scripts/og/capture-bdl-013.mjs` | Captures the OG card from the built site (`?og=1`) to `src/experiments/bdl-013/og.png` |
| `scripts/lab/shoot-bdl-013.mjs` | Port of `shoot-o7-drawing-set.mjs` against the built site: every state, text checks |
| `tests/bdl-013-data.test.ts` | Data checks below (mirrors `bdl-012-data.test.ts`) |
| `ExperimentLayout` or `Experiment.astro` imports | `@fontsource/ibm-plex-mono` 400/500 and Spectral 500, both already in `package.json` |

## Port rules (mockup to site)

- **Fonts self-hosted.** Drop Google Fonts. Import the installed
  `@fontsource/ibm-plex-mono` (400, 500) and `@fontsource/spectral/500.css`
  on this page only. Latin subset only (no vi text on the sheet).
- **Scheme.** Set on the stage element, not `<html>`, so leaving the page
  never touches the visitor's stored site theme. Night = cyanotype.
- **Stage fit.** o7 scales a fixed 1440x900 stage into the window with
  `overflow:hidden` on `html, body`. On the Lab page: the stage gets a
  100svh box, scales inside it, body scrolls normally to the plate. Phone
  (<=760px) keeps o7's flowing layout and fixed bottom nav, which must clear
  the wall label and the pill.
- **Keys.** ArrowLeft/Right/Escape only while the stage is in view and no
  input has focus, so they never fight page scroll in the plate.
- **History.** Keep `?detail=N`, `?hood=1`, `?scheme=dark`, `#detail-N` deep
  links (shoot script and OG capture rely on them). No ClientRouter on Lab
  routes, so plain pushState is safe.
- **No motion added.** o7 is still by design (judge spec: "No motion").
  Only the existing ink-in fade and hover lifts. Lab "roll heavy" and the
  interaction-affordance rule are met by the Try it pattern already built:
  filled Next button, cue, progress strip, leader hover.
- **OG size.** Site cards are 1200x630; o7's OG frame is 1200x627. Re-fit
  the `body.og` frame to 630.
- **Text rules carried from the shoot script.** No U+2014, no time or speed
  figures, no forbidden words, Plain text >= 16px (code, zone marks and
  controls exempt), no clipping, no overflow.

## Wall label draft (`howto`, max 4)

- Follow an arrow from a line of the file to the part of the website it makes.
- Press Next, or open a numbered detail, to read one part closely.
- Switch to Under the hood for the same sheet in engineering terms.
- Try Night for the blueprint.

## Tests (vitest)

- `data.ts`: every Plain string has a Hood twin and vice versa; no U+2014;
  no forbidden words (shoot script list); no time/speed figures.
- `FACTS` values match the numbers rendered (routes 9, jobs listed = deploy
  `needs` minus detect_changes/cloudflare_ready, merged lane = 7 files).
- Registry has BDL-013; entry parses (existing lab-schema tests cover shape).

## Fact recheck before build

Re-read each `FACTS` source in `C:\git\bdlBase` at its current `main`
(read-only, no change to bdlBase; founder 11-20). If anything moved since
`1f9afc7`, update the sheet, not the facts. Harbor Table is the bdlBase
restaurant test fixture, labelled "a demo restaurant" on the sheet.

## Execution

One feature branch off `main` carrying the o7 commits (this branch), one PR
to `main`. Run as a `bdl-wave` of three tasks, stop after each:

| Task | Owns | Notes |
|---|---|---|
| T1 Stage port | `src/experiments/bdl-013/**`, registry, entry + plate draft, tests, shoot script | The bulk, incl. eyebrow drop, wall-label fold, Detail 1 link, OG frame refit. Brief: `docs/bdl-013/briefs/lab-t1-stage-port.md` |
| T2 OG + residual fit | OG manifest, capture script, `og.png`, `ExperimentLayout` only if T1 leaves a collision | OG card |
| T3 Copy | `bdl-013.md` plate | After founder edits the plate draft |

Per-stage seats (CLAUDE.md tiers; no sensitive code touched, no WebGL):
implementer Sonnet `high` (multi-file port with judgment), verifyHead Haiku,
critic Opus `medium` (visual critic seat), verifier Sonnet `high`, fixer as
implementer, escalated fixer Opus `medium`. About 5 agents per clean task,
10 with one fix round: 15 to 30 for the wave. Sizes 1440, 1280, 1024, 820,
390; schemes dark, light. I eyeball every sheet against this plan and the
judge spec before each stop.

Gate before PR: `npm run verify` clean, shoot script clean on the built
site, Lighthouse on `/lab/bdl-013/` (Lab is unbound, but record it).

## Not in scope

- Any change to bdlBase (its rule against naming itself stays).
- o5b and o6 (o6 dropped; o5b stays a mockup).
- Build-speed figures (still unruled; none on the sheet).
- A real palette for a demo (proposal decision 3) unless you want it; o7
  does not need it.
