# Tier 3, Stage 3, Tier B (the build): plan

Written 09-25-26 at the start of the Tier B session, from
`HANDOFF-09-25-26-stage3-tierB.md`, `stage3-decisions.md` (the "Final answers
at the Tier A stop" win), the proofs, the two briefs and `stage0-decisions.md`
(binding). Stop for the founder after each wave.

**Confirmed by the founder (09-25-26):** two waves, offline wallpaper,
stand-ins in B1, and the Venus as the head (`stage3-decisions.md`, "Answers
at the start of Tier B").

**The WebKit run (before B1, `proofs/lens.md`, "WebKit run"):** Playwright's
WebKit 26.6 on Windows accepts `backdrop-filter` but never paints it, so it
cannot show Safari's frosted look; the gate correctly keeps WebKit off the
url() bend; the WebGL lens renders in WebKit with its rim, highlight and
bend and matches its backdrop model. Nothing found changes the pane recipe.
A real Safari look (the founder's iPhone) is still owed before the PR, and
the iOS momentum check with it. One fix for B2: a mouse drag on the lens
selects page text; the lens drag must suppress selection.

## Shape: two waves, a stop between

Tier B is large (glass: E1 to E14, E16, the controls, the lens, the wallpaper,
the face; vaporwave: the plaza, F1 framing, the marble, E4 to E15, the
interactables). One workflow per wave keeps each builder's scope bounded and
gives the founder a look at the rooms before the showpieces go on them.

- **Wave B1, the rooms.** The look and the layout of both schools: glass's
  wallpaper, materials, orbs, type, layout and chrome; vaporwave's plaza, F1
  framing on the other pages, the system details and the wall label. The
  showpieces get placeholders (a frosted disc where the lens goes, the Tier A
  stand-in stills where the head goes). Stop: sheets for the founder.
- **Wave B2, the showpieces and interactables.** Glass's Control Centre, the
  production lens and the Services settings pane; vaporwave's interactables,
  the marble pipeline moved into `src/`, the head stills and the live About
  bust. Then the gates (`harness/stage-gates.mjs --before-dir stage3-before
  --after-label stage3-after`), the S3 side by side, strips and sheets. Stop.

Why this order: the lens samples the wallpaper and orbs that B1 settles, and
the mesh download can happen while B1 runs.

## Architecture calls (recommendations, founder to confirm)

1. **The glass wallpaper is painted offline, once, to image files.** A
   committed script (`scripts/themes/glassmorphism/paint-wallpaper.mjs`,
   @napi-rs/canvas, already installed) paints the warm Big Sur mesh with the
   coral bridge shape for each scheme and time of day (dawn, day, dusk: six
   images), encoded small (a smooth gradient is a few KB as AVIF or WebP).
   The CSS background and the lens texture load the same file. This keeps
   the Tier A rule (one source, so the lens rim can never disagree with the
   page) and, unlike the lens proof's runtime canvas, the wallpaper is there
   on first paint and in the portal's drawn-ahead copies, which strip
   scripts. The non-default times of day load on first use.
2. **Orbs stay DOM discs (flat, D7 B),** moved by the lens's frame loop on
   the page that shows the lens and by `animation-timeline` elsewhere, as
   the lens proof measured.
3. **Rooms use the Tier A stand-in stills in B1** (the marble sphere, column,
   holographic form and chrome orb, already rendered); the head replaces its
   placeholder in B2 once the founder has downloaded the pick.

## Wave B1: model plan (up to 14 agents)

| Stage | Seat | Model | Effort | Count |
|---|---|---|---|---|
| Build | glass-1, the look: wallpaper script and files, E1 materials, E2 orb placement, E3, E8, E9, E14 and Inter Display, D4 vibrancy, the coral bridge, `meta.ts` contrast | Sonnet 5 | high | 1 |
| Build | glass-2, layout and chrome (after glass-1): E5, E6 footer dock, E7, E10 off state, E13, E16, text off the bare wallpaper, the lens placeholder disc | Sonnet 5 | high | 1 |
| Build | vw-1, the rooms: E3 plaza (kiosk, lobby tile, portal tail), F1 framing (Services lobby, Contact `screensaver.scr` window, Sent Win95 desktop, About staging), E6, E7, stand-in stills | Sonnet 5 | high | 1 |
| Build | vw-2, the system (after vw-1): E4, E5, E8, the rest of E9, E10, E11, E12, E13, E14, E15, the 19:93 clock, the wall label, remove the tear variant and `?vwLoop=`, phone targets | Sonnet 5 | high | 1 |
| Critic | one per school, after its builders | Opus 5.5 | medium | 2 |
| Verify | one per school, required adversarial cases, at least 8 films made by the verifier itself | Sonnet 5 | medium | 2 |
| Fix | one per school, only if its critic blocks | Sonnet 5 | high | up to 2 |
| Re-critic | one per school, only after a fix | Opus 5.5 | medium | up to 2 |

Glass and vaporwave chains run in parallel, each on its own `snap.mjs` port.

## Wave B2: model plan (up to 12 agents)

| Stage | Seat | Model | Effort | Count |
|---|---|---|---|---|
| Build | glass-3: Control Centre (Clear/Tinted, frost slider, time of day, location pill), the production lens (rigid feel as proven, under the content, poster disc, context loss), orbs on the lens clock, Services settings pane, E11, E12, session hold, phone targets | Sonnet 5 | high | 1 |
| Build | vw-3, interactables: window drag, the screensaver's Settings and Preview, the kiosk attract loop, caption presses | Sonnet 5 | high | 1 |
| Build | vw-4, marble (parallel with vw-3, owns About and `marble/`): scene module into `src/themes/vaporwave/marble/`, the mesh processing script (meshoptimizer devDependency), head stills, the live About bust | Sonnet 5 | high | 1 |
| Critic | one per school | Opus 5.5 | medium | 2 |
| Verify | one per school, adversarial cases, films minimum | Sonnet 5 | medium | 2 |
| Fix / re-critic | only on a block | Sonnet 5 high / Opus 5.5 medium | | up to 4 |

Then the gates and sheets (orchestrator), and the stop. The PR's whole-branch
review later is Opus 5.5 `high` (the branch touches no sensitive code).

## Rules every seat gets

- Scripts in `scripts/themes/`, `scripts/themes/harness/`,
  `scripts/themes/glassmorphism/` or `scripts/themes/vaporwave/`, never a
  scratchpad. No git; the orchestrator commits.
- The user's triggering message is handled; name the done steps.
- GPU Chromium for every film (`BDL_GPU=1`), renderer string logged.
- Wait once for long batches (one Monitor, or foreground chunks under ten
  minutes).
- Animation fixes probe a whole cycle (`harness/vw-floor-critic2.mjs`
  pattern: 0, 60, 80, 95%).
- Founder sheets: PNG or JPEG q90+, labels at least 20 px, same crops across
  columns; system ffmpeg for h264 frames.

## Wave B2 as run (founder yes, 09-25-26)

Amended from the table above: the two large seats split by file ownership,
and the critics stepped up one notch, since B1's Opus `medium` critics passed
four plainly unmet brief items (the step-up rule in `CLAUDE.md`).

Workflow 1 (10 agents):

| Stage | Seat | Model | Effort |
|---|---|---|---|
| Build | glass-3a: the production lens, orbs on the lens clock, the Control Centre, the session hold | Sonnet 5 | high |
| Build | glass-3b (after 3a; shares `theme.css` and `fx.ts`): the Services settings pane, E11, E12, phone targets | Sonnet 5 | high |
| Build | vw-3: window drag, the screensaver's Settings and Preview, the kiosk attract loop, caption presses (owns Home, Contact, `Win.astro`, `fx.ts`, `theme.css`) | Sonnet 5 | high |
| Build | vw-4a (parallel with vw-3): the scene into `src/themes/vaporwave/marble/`, the meshoptimizer devDependency, the processing script, the Venus stills, the bbox re-measure, About's poster, `meta.ts` | Sonnet 5 | high |
| Build | vw-4b (after 4a): the live About bust | Sonnet 5 | high |
| Build | kiosk-swap (after vw-3 and 4a): the Venus still into the kiosk | Sonnet 5 | low |
| Critic | one per school | Opus 5.5 | high |
| Verify | one per school, adversarial cases, a films minimum, arrivals filmed | Sonnet 5 | medium |

Then the orchestrator's own look at the sheets, then Workflow 2 (up to 4):
a fixer per blocked school tiered by what failed (Sonnet 5 `high` by default,
Opus 5.5 `high` for an arrival or portal-runtime bug) and an Opus 5.5 `high`
re-critic. Then the gates, the S3 side by side, the report and the stop.
