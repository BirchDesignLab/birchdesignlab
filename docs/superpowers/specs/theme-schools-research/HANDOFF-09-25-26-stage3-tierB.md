# Theme schools: Tier 3 Stage 3 handoff, after Tier A (09-25-26)

Start here. It supersedes `HANDOFF-09-24-26-stage3.md` for Stage 3 (pair B:
glassmorphism and vaporwave). Tier A (the proofs) is done and committed;
the founder answered part of the Tier A stop, and a few calls are open.
Tier B (the build) has not started.

## Where things stand

- Branch `feat/theme-schools-tier3-stage3` (from `main` at `87608f0`),
  pushed. Commits: `a262c28` decisions, `ef346f9` lens feel, `48d2504` Tier A
  proofs, then the Tier A stop answers and this handoff.
- `npm run verify` clean at `48d2504`: 347 unit tests, astro check 0 errors
  0 warnings, 483 built-site tests.
- Visitor-visible code on the branch so far (vaporwave only, brief
  defaults): F4 (b) the grid's 6.4 s loop with a two-frame seam tear (CSS
  floors: the 1.6 s scroll plus a separate `translate` seam animation; the
  WebGL hero has proof variants 'tear' and 'restart' behind a proof-only
  `?vwLoop=` query, default restart); F5 the inactive back-window bar on
  Services (`Win.astro` `inactive` prop).
- The before set for Stage 3's sheets: `scripts/themes/.out/stage3-before`
  (48 strips, filmed on `main`'s code). Frozen base build:
  `scripts/themes/.out/snap-stage3-base`.

## Read first, in this order

All under `docs/superpowers/specs/theme-schools-research/`.

1. `tier3-stage3/stage3-decisions.md`: every Stage 3 decision, the founder's
   answers at the start, and "Answers at the Tier A stop" at the end.
2. `tier3-stage3/tier-a-report.md`: what each proof showed.
3. `tier3-stage3/proofs/*.md`: per-topic notes (palette, type, vaporwave,
   lens, marble), including the Tier B integration notes (one wallpaper
   source for the CSS background and the lens texture).
4. `tier3-briefs/stage0-decisions.md` (binding), `tier3-briefs/glassmorphism.md`,
   `tier3-briefs/vaporwave.md`, `src/themes/README.md`.
5. `HANDOFF-09-24-26-stage3.md`: gates, tools and the working lessons
   still apply.

## Decided (do not re-ask)

- Glass: Liquid Glass forward; warm Big Sur wallpaper (dark = deep blue
  with ember light); no title bar, keep the traffic lights; the Control
  Centre controls and draggable lens (S3); D2 C; D3 no noise; D4 C
  (vibrancy); D7 flat discs. The lens: WebGL everywhere, under the page
  content in the Home hero's empty half, rigid-glass handling as proven;
  panes bend with the SVG filter in Chromium only, **bevel inward**;
  frosted with edge light elsewhere. Text on bare wallpaper moves onto a
  pane (it cannot pass contrast). Warm light's mauve overlap gets a coral
  shape.
- Vaporwave: F1 (b); F3 rendered, pristine, tinted, glossy marble, stills
  plus a live draggable bust on About; F5 as built; F6 declined; the
  pressed task button switches instantly; the interactables (draggable
  windows, screensaver Settings and Preview, kiosk attract loop, pressing
  caption buttons); the frozen tray clock reads **19:93**.
- Dev tools: add `meshoptimizer` as an explicit devDependency (same
  version as on disk, 1.1.1, via @types/three); keep `sharp` (with Astro)
  for AVIF.

## Open: ask the founder first thing

1. **Heading face:** Plus Jakarta Sans or Inter Display. The founder asked
   "why Plus Jakarta over Inter Display" (the recommendation was Inter
   Display; they may have misread) and got `type/specimen.png`. Clarify
   and get the pick.
2. **Grid loop:** tear, restart, or the old endless drive. The founder
   asked whether the tear is a bug; it is a choice (the canon's loop with
   its seam showing, a tape-tracking jolt). Show
   `vaporwave/hero__dark__compare.mp4` and `hero__light__compare.mp4` again
   if needed.
3. **Marble head:** discuss and show options. Free only (the founder will
   make a free account, will not pay). Candidates in `proofs/marble.md`
   (pick so far: CMA Head of Apollo, chipped nose tip; Augustus bust;
   Doryphoros cast; Memnon; Tranquillina; Vespasian). Show them side by
   side (Sketchfab thumbnails via the browser, no download), and check
   other free sources (threedscans.com: verify its licence on its own
   page). Then the founder downloads the pick into
   `scripts/themes/.out/meshes/` (gitignored); never sign in yourself.
4. **Playwright WebKit:** yes or no to `npx playwright install webkit`
   (about 150 MB; Chromium is already installed, WebKit is not).
5. **Wall label lesson:** A, B or C (drafts in `stage3-decisions.md` item
   13), or the founder's words. Era: recommend "The internet in the 2010s"
   (the founder said "whichever years are the correct one"); confirm.

## Then Tier B

Plan it, show the model plan and agent count, and stop between tiers
(decisions are shared). Suggested shape: glass and vaporwave builders in
parallel on their own `snap.mjs` ports; an Opus critic per school; Sonnet
verifiers with required adversarial cases and a films minimum; then the S3
side by side, `harness/stage-gates.mjs` (`--before-dir stage3-before
--after-label stage3-after`), strips and sheets, and a stop.

- Glass: E1 to E14, E16 under Liquid Glass; the warm wallpaper painted once
  from one source (CSS background and lens texture); the Control Centre
  cluster; the lens; the face; vibrancy; the phone targets under 44 px in
  its chrome.
- Vaporwave: the E3 plaza (kiosk, lobby tile), F1 framing on the other
  pages, the marble (render pipeline in `scripts/themes/vaporwave/`, then
  the live About bust), E4 to E8, E10 to E15, the rest of E9, the 19:93
  clock, the wall label, the interactables, the phone targets; remove the
  losing loop variant and the `?vwLoop=` proof query.

## Lessons from Tier A

- Sonnet fixers broke the vaporwave floor twice (an overhang that did not
  cover the travel; then a moved tilt pivot and a lost static transform);
  the Opus critic caught both. Keep the Opus critic, and have fixers probe
  a whole animation cycle (`harness/vw-floor-critic2.mjs` pauses every floor
  at 0/60/80/95% and under reduced motion).
- Founder sheets: PNG or JPEG q90+, labels at least 20 px, same crops across
  columns. Playwright's bundled ffmpeg cannot decode h264; extract frames
  with the system ffmpeg.
- Workflow agents see the triggering user message; say it is handled in
  every prompt. Verify results against `journal.jsonl` and the disk.
