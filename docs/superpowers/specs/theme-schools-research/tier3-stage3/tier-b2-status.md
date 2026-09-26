# Tier 3, Stage 3, wave B2: status after workflow 1 (09-25-26)

Branch `feat/theme-schools-tier3-stage3-b2`. Plan: `tier-b-plan.md`, "Wave B2
as run". Workflow 1 (`wf_1e696135-0cf`, 10 agents, about 83 minutes) built
everything once; both Opus critics blocked. Fix workflow 2 is planned and
held for the founder's go. Outputs: `scripts/themes/.out/stage3-b2/<seat>/`
(gitignored).

## What workflow 1 built

- **glass-3a:** the production lens in `src/themes/glassmorphism/lens/`
  (TypeScript port of the proof; FEEL verbatim, 30 physics unit tests; draw
  on change; context loss; WEBGL_lose_context teardown; text selection
  suppressed, checked in Chromium and WebKit; a focusable button with arrow
  keys), Home's orbs on the lens clock (`orbs-clock.ts`), the Control Centre
  (Clear/Tinted switch, frost slider, dawn/day/dusk over the six files), the
  session hold (sessionStorage; an inline head script in
  `src/pages/t/glassmorphism/[...page].astro` plus an `astro:before-swap`
  listener). vitest 377, astro check clean, test:dist 483.
- **glass-3b:** Services as one settings pane with inert switches and
  steppers, E11 touch-safe states, E12 pointer light (`reveal.ts`, the
  Control Centre counted as a command group), a 44 px table at 390 px.
- **vw-3:** title-bar window drag and activation (`windows.ts`), caption
  presses, the screensaver's Settings and Preview (`screensaver.ts`: sunset,
  marble sphere, pipes), the kiosk attract loop (`kiosk.ts`).
- **vw-4a:** the scene in `src/themes/vaporwave/marble/`, meshoptimizer
  1.1.1 as a devDependency, `process-venus.mjs` (about 30k triangles, meshopt
  GLB), `render-venus.mjs`, the Venus stills, About's poster, `meta.ts`
  provenance `public-domain`.
- **vw-4b:** the live About bust (`marble/live-bust.ts`, dynamic import, yaw
  only, idle turn, context loss, teardown).
- **kiosk-swap:** the Venus still beside the kiosk, the sphere kept.

## What blocks (critics, confirmed by the orchestrator's own look)

Glass:
1. The lens draws under the real orbs (lens canvas z-index -1, orbs 0) and
   does not redraw when the orbs move on scroll or drift: ghost orbs, about
   100 px off after a 120 px scroll (`glass-critic/sheet__orbedge-*.jpg`).
2. The lens starts hidden under the hero window on desktop and phone.
3. The lens's transparent hit button sits above every pane: grab cursor over
   the headline, pointer and touch stolen from text and links, a phone swipe
   on the hero copy drags the lens instead of scrolling.
4. The frost slider changes nothing live (`fx.ts` writes each pane's filter
   once, resolved) and nothing writes `data-glass-frost-step`, so Safari's
   stepped path is dead.
5. The hero switch shows the browser's button background (a grey or white
   box) since glass-3b's restructure.
6. Services' "off" switches are nearly invisible.
Orchestrator's own: Services' controls do not line up across the four
columns; the location pill hides behind the portal switcher at 1440 x 900;
the Control Centre sits at the fold as a long pill (founder: compact tiles).
Not a defect: the glass verifier's "Contact input 177 x 21 px" is the
clipped honeypot (`portal/ContactHidden.astro`), correct as built.
Verification gaps: no production seam probe (rim alignment unmeasured by the
builders); the glass verifier drove arrivals by URL, not the switcher (the
critic did drive the switcher).

Vaporwave:
1. Pressing a caption button starts a window drag.
2. The attract loop is mostly black: its grid takes the marquee's max-content
   width, so the kana land off-screen.
3. The live bust canvas is a labelled control inside an `aria-hidden`
   wrapper.
4. The poster-to-live handoff jumps (the CSS drop shadow is on the poster
   only; the live canvas is not premultiplied, so it gets a dark aliased rim;
   about 11% of the stage's pixels change).
5. The kiosk Venus passes through its drum ("a head in a collar").
Orchestrator's own: a primary marble vein crosses the face like a crack
(founder: keep veins off the face); the marble screensaver's sphere is tiny;
the pipes are flat lines (founder: shaded 3D tubes).
The vaporwave verifier ran nothing (0 films), so every vaporwave behaviour is
still unverified except what the critic filmed.
Nits worth folding in: the bust's DPR should be min(devicePixelRatio, cap);
a smaller yaw velocity epsilon; a dispose guard during an in-flight stage
build; no grab cursor before the bust is live; `KHR_mesh_quantization` in
`extensionsRequired` and VEC3 normals in `venus.glb`; glass's idle rAF loops
doing work when nothing changed; the lens keeping the old scheme's texture
until the new one decodes; E12's halo lowering a nav label's contrast; builder
stills that show the portal's welcome prompt.

## Fix workflow 2 (planned; held for the founder's go)

| Seat | Model | Effort |
|---|---|---|
| glass-fix-lens: layering (lens above the orbs, below panes and text), redraw when the orb clock or scroll moves them, start in open wallpaper across an orb edge, hit area under the panes, a production seam probe | Sonnet 5 | xhigh (one notch above the builder) |
| glass-fix-ui (after the lens fix; shared files): the frost slider live and Safari's steps, the switch box, Services' off switches and alignment, the location pill, the Control Centre as compact tiles | Sonnet 5 | high |
| vw-fix-marble: veins off the face (re-render every Venus still), the kiosk drum, the handoff jump, the a11y wrapper, the bust nits, the GLB spec | Sonnet 5 | xhigh (one notch up) |
| vw-fix-interact (parallel): caption presses without drag, the attract layout, a bigger marble sphere, shaded 3D pipes | Sonnet 5 | high |
| Re-critic, one per school | Opus 5.5 | high |
| Glass re-verify (its script again plus the seam probe and real switcher arrivals) | Sonnet 5 | medium |
| Vaporwave verify, a real run (the first did nothing) | Sonnet 5 | high (stepped up) |

Then the orchestrator's own look, the gates (`harness/stage-gates.mjs
--before-dir stage3-before --after-label stage3-after`), the S3 side by
side, founder sheets, the B2 report and the stop.

## Fix round, part 1 (09-26-26): paused before the review

Workflow `wf_eb99fea5-5f7` ran the fixers; the founder asked to pause before
the review stage, so the orchestrator stopped the workflow the moment the
vaporwave re-critic and verifier started (they were killed within seconds and
made nothing). Committed as `4fb2b69` (local, not yet pushed to PR #93).

- **vw-fix-interact (done):** caption presses no longer start a drag; the
  attract loop's grid is `minmax(0, 1fr)` so the kana and marquee stay in the
  screen; the marble screensaver's sphere is about a third of the window;
  the pipes are shaded 3D-looking tubes on the 2D canvas (Contact keeps one
  WebGL canvas, the horizon); light-scheme stills. vitest 388, astro check
  clean, test:dist 483; `verify-arrival-animates.mjs` passes.
- **vw-fix-marble (done):** an object-space face mask keeps the veins off
  the Venus's face in both qualities; the kiosk drum sized from the neck
  footprint; the live canvas premultiplied and the drop shadow shared, so
  the handoff changes 1.31% (dark) and 1.27% (light) of the bust's pixels;
  `aria-hidden` moved onto the decorative children; DPR min(dpr, cap), glide
  epsilon 0.02 rad/s, the dispose guard, no grab cursor before live, clean
  context restore; `venus.glb` 132.7 KB, 30,000 triangles,
  `KHR_mesh_quantization` required, VEC3 normals with a 4-byte stride.
  Open: its context-loss film shows a black sky in the lost and restored
  frames (it believes a compositor artefact of the probe).
- **glass-fix-lens (work done, report lost):** the stop killed it while it
  was reviewing its own films; its code, tests (vitest 388), probes and films
  are on disk (`.out/stage3-b2/glass-fix-lens/verify-results.json`): the
  lens canvas and hit control at z -1 with the orbs moved to -2 (so the lens
  covers the orb it refracts); idle draws 0 and orb drift 0 over 4 s; 6 draws
  over a 120 px scroll; production probes behind `?lensProbe=`; seam median
  1 px, max 1 px; identity away from an orb max 1 level. To check in the
  review: identity OVER an orb edge reads max 168 levels, 3% of pixels over
  8 (the lens's orb copy may not match the page's orb exactly); the start is
  "partial" at 1024 x 768 (under the hero window's edge) and at 390 x 844
  (under the Control Centre, which glass-fix-ui reshapes); its hit probe
  reports the hit control topmost at scroll positions where a pane covers
  the lens centre, which needs a second look.
- **Not run yet:** glass-fix-ui (the frost slider, the hero switch box,
  Services, the location pill, the Control Centre as compact tiles, E12
  contrast), then the re-critics and verifiers, then the gates.

## Fix round, part 2 (09-26-26): HELD after glass-fix-ui

Workflow `wf_ab11081a-f62`. The founder held everything after glass-fix-ui
(high-priority work elsewhere); the orchestrator stopped the workflow the
moment the glass re-critic and re-verifier started (killed at once, nothing
made). Reports saved to `.out/stage3-b2/w3-reports.json`.

- **glass-fix-lens rerun (done, report in):** confirmed the first run's work
  and fixed six items (the orb gradient in the lens's model, the hit
  control's layering under covering panes, the film crops). Still open: the
  identity probe over an orb edge at the 1440 x 900 start reads 3.00% of
  pixels over 8 levels (mean 2.9, max 182); the 1024 x 768 start overlaps the
  hero window's edge.
- **glass-fix-ui (done):** the frost slider live in Chromium (panes'
  filters rewritten on change) and Safari (`data-glass-frost-step` written
  wherever settings apply); the hero switch's browser box reset; Services'
  off switches visible and every column's controls on one baseline; the
  Control Centre as four rounded-square tiles (location, Clear/Tinted, frost,
  time of day), the old absolute location pill retired into its tile; E12's
  halo dimmed so the nav label holds contrast. Open: at 1440 x 900 and
  1280 x 800 the tiles sit 58 to 158 px below the fold because the hero
  window is 609 px tall (a founder call: shrink the hero's vertical rhythm,
  or accept one scroll step); a small overlap between the Dusk segment and
  the portal switcher's closed badge at 1440 x 900.
- **vaporwave re-critic (done): still BLOCKS.** W1 blockers 1, 3, 5 fixed;
  2 and 4 partly. New: (a) after a context loss and restore the About bust
  renders over an opaque black square that never clears (a real regression,
  not the probe); (b) while lost, a white broken-image box shows behind the
  poster; (c) on phones the attract loop still reads black (its content is
  centred in the tall CRT, above the viewport when the visitor taps); (d) the
  phone handoff changes 3.64% of pixels at 390 (target under 2%), speckle in
  the hair; (e) the pipes show fine ribbing across every tube and cartoon
  "eyes" on each growing head, so they do not read as shaded tubes.
- **vaporwave verifier (done, a real run):** 15 films, 16 of 18 cases pass.
  Fails: a caption button stays pressed if the pointer leaves it while held;
  the Venus-to-plinth gap could not be measured reliably (a probe gap).
- **Not run:** the glass re-critic and re-verifier. Next, on the founder's
  go: one fix round for both schools (the vaporwave blockers above, the glass
  open items and anything the glass review finds), then the reviews, the
  gates, the report and the stop.

## Round 3 (09-26-26): workflow 4, then HELD

Workflow `wf_6f9da3c7-da4` (8 agents), reports in
`.out/stage3-b2/w4-reports.json`.

- **Glass review round 1 (Opus high) blocked 5:** the lens-layering fix had
  put Home's orbs at z -2, under the wallpaper (every Home orb hidden); the
  hit control sat under the transparent hero section (the visible lens could
  not be grabbed; a drag selected text); the poster and the live lens
  disagreed on position and size (a jump on arrival); the Time tile under the
  portal switcher; the phone lens 80% under the Control Centre, crossing no
  orb.
- **Glass fix round 3 (Opus medium, stepped up for lens and runtime):** 10
  fixed: z order wallpaper -3, orbs -2, lens -1, panes 1; grab works on the
  visible disc; poster and lens agree; the start searched from the live
  layout.
- **Glass review round 2 (Opus high) blocks 1:** Home's scroll-linked orbs
  sit 17 to 65 px higher than B1's placement at every scroll position:
  `orbs-clock.ts` measure() reads each orb's rect with the stylesheet's
  `translate(-50% -50%)` still applied, while CSS `view()` uses the
  untransformed box (fix: measure with `translate: none`, or add h/2; check
  with `b2r3-glass-critic2-orbpos.mjs`, the JS and CSS rows within 1 px).
  Its founder calls are answered in stage3-decisions.md ("Answers after B2
  round 3").
- **Glass verifier (Sonnet medium): 0 films again** (a third time at
  medium); run verifiers at Sonnet high (the vaporwave one made 23 films).
- **vw-fix-marble3 (Opus medium):** the black square after a context
  restore fixed (round 2 never called `renderer.dispose()`, which is what
  removes three's own context listeners): clear [0,0,0,0] after a restore, no
  delta after a drag; the canvas hidden while lost (no broken-image box); the
  handoff under 2% everywhere (390: 1.19%, 820: 1.06%, desktop: 0.76%) by a
  1.5 cap with 2x supersampling; a solid-silhouette plinth gap probe (1440
  +1.52 px, 820 +0.73, 390 +0.55).
- **vw-fix-interact3 (Sonnet xhigh):** caption buttons pressed only while
  the held pointer is over them; the phone attract loop scrolls the CRT into
  view (the founder has since said no scroll); the pipes redrawn as one
  continuous stroke per run (ribbing and eyes gone).
- **Vaporwave re-critic round 3 (Opus high) blocks 1:** each pipe sits in an
  opaque halo band 1.9x its width, restroked every frame over the elbow's
  ball joint, so the tubes read as flat outlined capsules (fix: drop the halo
  or keep it at most about 1.1x as a darker silhouette rim; draw the start
  joint after the run's strokes). Nit: dragging off a held caption button
  selects about 9 characters (preventDefault on the caption pointerdown).
- **Vaporwave verifier (Sonnet high):** 23 films, 21 of 21 cases pass.
- **The rim fringe (founder: fix):** the colour split halved in `lens.ts`
  (0.03 to 0.015). Re-shot with `b2r3-glass-critic2-probe.mjs --only
  orbedge,rim` (outputs `.out/stage3-b2/fringe-halved/`): no olive line at
  1x; a faint 1 px green hint remains at 4x.

### Next round (held; the founder's answers are in stage3-decisions.md)

- Glass: the orbs-clock measure fix; restore B1's phone hero and start the
  phone lens half under the window's lower corner across an orb; keep the
  Time tile clear of the desktop portal switcher (the phone switcher spans
  the width, so any flow content passes under it while scrolling: judge the
  resting positions).
- Vaporwave: crisp 3D pipes (no halo band, joints drawn last); the phone
  attract loop with no scroll (content in the visible part of the CRT); the
  caption drag-off text selection.
- Then an Opus high re-critic per school and verifiers at Sonnet high, the
  orchestrator's own look, the Stage 3 gates (`harness/stage-gates.mjs
  --before-dir stage3-before --after-label stage3-after`), the S3 side by
  side, founder sheets, the B2 report and the stop.

## Round 4 (09-26-26): workflow 5, then STOPPED for the founder

Workflow `wf_80f40fcf-631` (6 agents, about 45 minutes, every agent
returned), reports in `.out/stage3-b2/w5-reports.json`. Committed as
`c24c067`, pushed to #93. Founder's pre-launch answers: stop on a block,
no pause before the reviews, run the gates regardless.

- **glass-fix-r4 (Opus medium):** G1 fixed at the root: `orbs-clock.ts`
  cleared `translate` to `''`, which put the stylesheet's -50% -50% back; it
  now reads with `translate: none` (JS matches CSS `view()` within 0.1 px at
  1440 and 390, scroll 0/200/400; was 17 to 65 px). Identity at the 1440
  start 0.80% of disc pixels over 8 levels, all on the orb edge; seam median
  0.18 px, max 1.18. G2: B1's phone hero back (min-height 0, 3.5rem top);
  a new `cornerStart()` in `physics.ts` (6 unit tests) starts the lens half
  under the window's lower corner across an orb on phones and portrait
  tablets (390: right corner over peach, cover 0.48; 820: left corner over
  pink); desktop and 1024 starts unchanged. Touch film: a drag on the
  visible half moves the lens, a swipe on the covered half or the copy
  scrolls the page. G3 needed no code: tiles clear the desktop switcher by
  67 to 204 px at rest at 1440, 1280 and 1024.
- **vw-fix-r4 (Sonnet xhigh):** pipes without the halo band, ball joints
  drawn after each run's strokes; the phone attract content sits in the
  on-screen part of the CRT with no scroll; `preventDefault` on caption
  pointerdown (selection 0); the wrong "one grid cell" comment fixed.
- **Glass re-critic (Opus high): BLOCKS 2.** (1) 820x1180 portrait tablet:
  the lens jumps across the window on arrival (poster at the lower-right
  corner 723,604, live lens at the lower-left 97,604; 10 of 12 hard loads
  and every switcher arrival; 2 loads settle right, so the start varies).
  Cause: `planLensStart`'s corner branch runs first in `home-boot` before
  the orb clock has written any translate (static orb rects), then again at
  lens mount with the clock's rects, and `cornerStart` ignores the poster's
  spot. Phones pick the same corner both times, so they are steady but
  fragile. (2) Desktop hero orbs are not at B1's hand-placed spots: the
  Control Centre joined `.hero`, so the hero box is 167 to 263 px taller and
  every %-placed orb resolves lower (1440: peach 796 to 977, pink 644 to
  841; 1280 and 1024 lose two of four first-view orbs). Predates round 4;
  round 4 restored B1's orb box on phones only. Fix hint: give `.hero >
  .orbs` B1's box at every size.
- **Glass verifier (Sonnet high):** 10 films, 0 failures (cases 1, 4 to 7,
  14, 15, 18 to 24). It did not film 820 arrivals, so it missed blocker 1.
- **Vaporwave re-critic (Opus high): PASSES.** Pipes "read as the Windows
  3D Pipes screensaver"; caption selection fixed; no scroll on the attract
  tap.
- **Vaporwave verifier (Sonnet high):** 29 films; 1 failing case (16, a
  dark line on the face "at yaw 60"). The orchestrator looked:
  `vw-reverify-r4/case16-face-veins.jpg` shows a clean face in the "yaw 60"
  frame, and the probe's yaw labels are off (its "yaw 0" is the back of the
  head); marble code is untouched since round 3. Read as probe noise (brow
  or nose shading), not a defect. Case 20's halo-band sub-metric reads
  0.07 to 0.2 against 0.1 at small line widths (antialiasing); the crops
  show no band.
- **Orchestrator's own look:** confirmed glass blocker 1 in the critic's
  820 arrival film (+317 ms right, +635 ms left) and blocker 2 in the
  1440 B1-vs-round-4 first-view sheet (the pink and peach orbs at the
  window's lower corners are gone); the phone first view matches B1 with the
  lens at the lower-right corner; the pipes 2x crop and the phone attract
  strip look right.

- **Gates (`stage3-gates/gates.md`):** `npm run verify` clean (401, 0
  errors, 483). Smoke, switcher (72/72 held), unname, wordmark (28/28) and
  the 48 after-strips PASS. Timing FAIL on one transient
  `net::ERR_NO_BUFFER_SPACE` loading quiet (desktop dark), not a number.
  Numbers against Stage 2 (`harness/b2r4-timing-compare.mjs`): glass cold
  and switcher-warm firstVisible +220 to +279 ms dark and mobile, +17 to
  +28 desktop light; untouched schools +35 to +113 (machine drift), so glass
  is about 150 to 200 ms beyond drift. Hover and warm unchanged. No freeze
  in the arrival strips. A founder call (B1's was 20 to 70 ms).
- **S3 side by side** (`harness/b2r4-s3-sheet.mjs`, `.out/stage3-b2-s3/`):
  the boundary holds.
- Report: `tier-b2-report.md`. Founder sheets:
  `.out/stage3-b2/founder-r4/`.

### Founder calls raised this round

- Glass arrival timing (above): accept into the transitions phase, or
  investigate the first paint now.

- Phone lens: it sits almost concentric with the peach orb, so the visible
  lower half shows the orb's lower edge inside the disc rather than an edge
  crossing the rim. The look, or start further along the edge?
- Portrait tablet: the Control Centre margin is 5rem and the tablet window
  sits at 152 px, not B1's 290 (round 3 moved it). Accept?
- Desktop arrival: the poster reads as a solid peach disc, then the clear
  live lens about 850 ms after the click (same spot and size; predates
  round 4). Match the poster to the lens, or accept?
- Phone first view at rest: the portal switcher sits over the Control
  Centre's second tile row. Fine at rest too?
- Vaporwave attract: a tap with the button in the top ~200 px of a phone
  viewport leaves under ~125 px of CRT on screen, so the loop plays mostly
  off screen. Accept, echo it on the plaque or button, or clamp it?
- Vaporwave desktop attract now centres in the visible band when the CRT's
  top is scrolled off (byte-for-byte the same when the whole screen is in
  view). Keep?
- Pipes: a spawn point also gets a ball (the original does not); the drop
  shadow's round cap shows as a thin crescent ahead of a growing head. Both
  fine to keep?
