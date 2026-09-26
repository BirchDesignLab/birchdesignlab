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
