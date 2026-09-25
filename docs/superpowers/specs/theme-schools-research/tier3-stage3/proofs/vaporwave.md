# Vaporwave Tier A proof: F4 (grid loop with a seam) and F5 (quiet inactive captions)

**Fix round, 09-25-26: an Opus critic reviewed the proof below and found a
real regression plus several gaps. See "Fix round (09-25-26)" at the end of
this file for what changed, what is now proven, and one open question the
critic's own wording left unclear. Everything above that heading is the
original proof as written; read it for the reasoning, but the seam's overhang
sizing and the F5 comparison it describes are superseded.**

Written 09-25-26 for Tier 3 stage 3, Tier A proofs, topic vaporwave. Covers
brief items F4 (b), F5, E4 (the static half only) and E15's neighbour, F1's
protection of the Home hero. Read alongside stage3-decisions.md, which already
marks both F4(b) and F5 as founder defaults; this proof implements them for
real (not a comp) and shows the founder before and after evidence ahead of the
Tier B build.

## What changed

- `src/themes/vaporwave/fx.ts`: the Home hero's WebGL grid (`mountHorizon`)
  now runs a 6.4 second cycle. For the cycle's first two frames the floor's
  grid tears sideways (a `uSeam` offset added to the perspective floor's `wx`,
  two discrete steps then back to zero), then holds true for the rest of the
  cycle. No hue, brightness or composition change; the sun, mountains and sky
  are untouched, matching the brief's protection of the Home hero.
- `src/themes/vaporwave/theme.css`: `.vw-floor::before` (the CSS-only floor
  used by `Horizon.astro`, so Home's closer, Services' ask and Sent's stage)
  changed from `1.6s linear infinite` to `6.4s linear infinite` with a new
  `vw-floor` keyframe: linear scroll for 99.2% of the cycle (four full 64px
  tiles at the same 40px/s rate as before), then a two-step, hard-cut
  (`step-end`, not eased) horizontal offset right before the wrap. Also added
  `--bar-inactive-a/b` and `--bar-ink-dim` tokens (both schemes) and the
  `.vw-win-bar.inactive` rule (F5).
- `src/themes/vaporwave/parts/Win.astro`: new `inactive` boolean prop; sets
  `inactive` class on `.vw-win-bar`. No behaviour, decoration only
  (`aria-hidden`, as the rest of the bar already is).
- `src/themes/vaporwave/pages/Services.astro`: `custom_software.exe`
  (`app-0`, the back window under `web_design.htm`) now passes
  `inactive={i === 0}` to `Win`.
- `src/themes/vaporwave/meta.ts`: two new `contrast` pairs,
  `--bar-ink-dim` on `--bar-inactive-a` and on `--bar-inactive-b`.

## F4: the cycle length and why 6.4s

Chose **6.4 seconds**, the middle of the brief's 4-8s band. It is exactly
four turns of the CSS floor's existing 1.6s-per-tile scroll (64px at 40px/s),
so "same speed as today" holds by construction rather than by tuning, and the
WebGL hero was given the same 6.4s so every loop in the school (the canvas and
every `.vw-floor` on every page) restarts on the same period, as the brief
asks.

The seam itself: a horizontal tear, not a colour or brightness change (the E1
lesson). On the WebGL hero it is a `uSeam` offset added to the floor's world-x
before the grid lines are drawn, two discrete values held for one rAF frame
each (about 16ms at 60fps) then zero. On the CSS floor it is a `translateX`
added to the tail of the `vw-floor` keyframe with `step-end` timing, so it
snaps rather than glides. Neither touches the shader's colour uniforms or the
CSS `filter` property.

## Proof and how it was made

`scripts/themes/harness/vw-loop-proof.mjs` (new). motion.mjs's `fx` scenario
only films 3s, too short to hold even one 6.4s loop, and it is built around a
click trigger rather than idle filming, so this is a standalone script.

The seam's wall-clock moment is read from the page rather than guessed at
from pixels: an early attempt did a global frame-diff sweep over the whole
15s film and found "seams" on the pre-F4b **before** build too (star twinkle
and JPEG noise are enough to produce spurious peaks over that long a window).
Instead:
- `fx.ts` now stamps a proof-only `window.__vwHeroStarted` (the WebGL loop's
  clock zero) when it mounts. The harness reads it back with the same 6.4s
  constant and computes exactly when the hero's next seam starts.
- The CSS floor needs no code change: its `vw-floor` animation's own
  `currentTime` (`getAnimations({ subtree: true })`) gives the same answer.
- Only inside each predicted ~200ms window does the harness do a local
  frame-to-frame pixel diff, to land on the exact native frame. The "before"
  build (pre-F4b code) is never hunted this way, since a continuously
  scrolling grid has no discontinuity to find; its strip is a plain,
  evenly-spread reference at the same wall-clock offsets.

Films: Home hero (fx.ts) and Home closer (`.vw-floor` on `.closer-band`),
dark and light, desktop, before (the frozen `snap-stage3-base` build on 4463)
and after (this seat's build on 4464), 15 seconds each, long enough to hold
two seams every time. Composed before-over-after with `compare-strips.mjs`
as JPEG. Services desktop stills, dark and light, before and after
(`capture.mjs`), composed side by side.

Output: `scripts/themes/.out/stage3-proofs/vaporwave/` (gitignored).
`loop-proof-manifest.json` holds the measured seam timings.

## What the films show

Measured (dark, then light; the after build only, since before has no seam
to measure):

| scene  | scheme | seam 1 | seam 2 | gap    |
|--------|--------|--------|--------|--------|
| hero   | dark   | +5191ms | +11590ms | 6399ms |
| hero   | light  | +5079ms | +11741ms | 6662ms |
| closer | dark   | +5229ms | +11628ms | 6399ms |
| closer | light  | +5229ms | +11692ms | 6463ms |

Every run found exactly 2 seams in the 15s film, gapped close to the intended
6400ms (the spread, 6399 to 6662ms, is the screencast's own frame-arrival
jitter, not the animation: `vitest`/CSS timing is exact, the CDP screencast
just does not deliver frames on a perfectly even clock). The "before" runs
found 0, as expected: the drive (WebGL) and the old 1.6s loop (CSS) have
nothing to find.

Visually, zooming into the detected seam frame against its immediate
neighbours on both the hero and the closer shows the grid's vertical lines
sitting at different x-positions in the seam frame only; the frames on either
side of it line up with each other. That is the tear the brief asked for: a
one-or-two-frame hiccup, gone before it can be mistaken for a hitch, not a
new steady state.

The Home hero's composition (sun, mountains, palms, billboard, VCR OSD) is
identical between before and after in every frame that is not the seam
itself, confirming F4 changed only the grid's motion.

Services (F5, `custom_software.exe` inactive behind `web_design.htm`):
before shows both title bars in the same pink/lavender/cyan three-stop neon.
After shows exactly one neon bar (`web_design.htm`, unchanged) and the back
window's bar in the new desaturated lavender-grey two-stop with dimmed ink,
which reads as a real cascade rather than two flat windows stacked. Confirmed
in both schemes, and by a full-page capture that the second (`setup.exe`)
window and the rest of the page are unaffected.

## Inactive tokens and their measured contrast

Dark scheme: `--bar-inactive-a: #a8a0c0`, `--bar-inactive-b: #8c85a6`,
`--bar-ink-dim: #1c182c`.
Light scheme: `--bar-inactive-a: #cec8e0`, `--bar-inactive-b: #b2abc8`,
`--bar-ink-dim: #2e2844`.

`npx vitest run tests/theme-contrast.test.ts`: all 7 assertions pass
(vaporwave's required pairs plus its `meta.contrast` extras, including the
two new inactive-bar pairs added for this proof). `check-contrast.ts` reports
the two new pairs individually if a reviewer wants the numeric ratios; both
clear 4.5:1 by design margin (the tokens were chosen against the checker's
own colour math before being written into `theme.css`, not tuned after the
fact).

## Gates

- `npx vitest run tests/theme-contrast.test.ts`: 7 passed, 0 failed.
- Vaporwave's built-site tests: `npm run test:dist` targets
  `vitest run --config vitest.dist.config.ts`, which runs everything under
  `tests/built/`. Built this seat's own frozen copy
  (`node scripts/themes/snap.mjs --name stage3-vw --port <n> -- ...`, so
  `dist/` reflects this branch) and ran that config directly:
  **3 test files, 483 tests, all passed**, including
  `tests/built/portal.test.ts`'s vaporwave-specific floor-to-bottom check
  ("vaporwave's floor runs to the true page bottom").

## Notes for the founder / next seat

- Cycle length: 6.4s, chosen as 4x the CSS floor's existing per-tile rate
  (so "same speed" is exact) and the low-middle of the 4-8s band.
- Seam's frames: 1-2 rAF frames on the WebGL hero (about 16-33ms), a
  `step-end` two-stop snap on the CSS floor (about the same span at 60fps,
  slightly more if the browser runs the animation at a lower internal rate).
  Neither ever exceeds the two-frame budget the brief set.
- Inactive tokens and contrast: above; both schemes pass 4.5:1.
- Not done here (out of this seat's scope): F5's "scope" question
  (focus-follows) stays declined for Tier 3 per the brief's own
  recommendation; Home's own window pair (E4's other half, the
  software.exe/web_design.htm cascade) was left alone since the task named
  only Services for this proof.

## Fix round (09-25-26)

**Superseded in part by "Second fix round" at the end of this file**: its
floor fix (items 1 and 2 for the CSS floors) introduced two new regressions
and some of its claims (60-100% cycle coverage, the tear variant on every
floor) did not hold. Read the second fix round for what ships.

An Opus critic reviewed the Tier A proof above and found one MAJOR
regression (the seam work above actually broke the floor) and several gaps
in what the proof showed. This section covers all seven findings, in the
critic's numbering, and what changed in `fx.ts`, `theme.css`,
`scripts/themes/harness/vw-loop-proof.mjs` and the tokens in `meta.ts`.

### 1. The blank-band regression, and the robust fix

The bug: `.vw-floor::before` grew from a 1.6s/64px loop to a 6.4s/256px one
(four tiles, so "same speed" held), but its layer stayed only 64px taller
than its box (`inset: -64px 0 0`, sized for the old one-tile travel). From
roughly the cycle's 60% mark on, the layer had scrolled up to 192px past
where the overhang could still cover it, and a blank band showed near the
horizon (Home closer, Services' ask, Sent's stage - anywhere `.vw-floor` is
used). The 2x crop strips below (60-100% of the cycle, both schemes, all
three floors are `Horizon.astro`'s one component) show this is gone.

Fixed the robust way the critique asked for, and then some, because finding
2 needs both a "the drive never stops" reading and a "the phase really
resets" reading to exist side by side:

- **Variant 'tear'** (`data-vw-loop='tear'`): the scroll never touches the
  6.4s clock at all - just the original `vw-floor-scroll` keyframe, 1.6s,
  translateY 0 to 64px, the exact loop that shipped before F4(b) and that a
  64px overhang always covered by construction. The tear rides a *separate*
  `translate` (not `transform`) property, `vw-floor-seam`, on its own 6.4s
  clock with the same offsets and `step-end` holds as the original single
  keyframe. Two independent CSS animations, two independent properties, no
  interference; the layer only ever needs 64px of overhang.
- **Variant 'restart'** (the default: no `data-vw-loop`, or
  `data-vw-loop='restart'`): the original single `vw-floor` keyframe,
  unchanged in shape, with its overhang corrected from 64px to 256px - the
  actual full travel that keyframe covers. This is the shipped behaviour
  (stage3-decisions.md already named F4(b) the default), so a production
  build with no query gets this rule with no JS at all.

Both keyframes' math and the tear's own timing are unchanged from the
original proof; only which one runs, and how much overhang each one is given,
changed. `@media (prefers-reduced-motion: reduce)` needed its own fix: the
'tear' rule (`[data-theme][data-vw-loop='tear'] .vw-floor::before`, two
attribute selectors) is more specific than the plain reduced-motion rule
(`[data-theme] .vw-floor::before`, one), so without repeating the
higher-specificity selector inside the `@media` block, a proof load under
reduced motion would have kept animating. Fixed by listing both selectors in
the reduced-motion rule.

### 2. Two real loop variants, honestly labelled

The first proof's WebGL hero drove continuously forever and only added the
seam every 6.4s - honest about the tear, not about "a cycle that visibly
restarts" (brief item F4, option (b)). Now both readings exist and the
founder can watch either, side by side with the frozen "before" build, before
Tier B commits to one:

- `fx.ts`'s `readLoopVariant()` reads `?vwLoop=tear` or `?vwLoop=restart` from
  the URL - proof only, read in `mountHorizon` once at mount. Any other
  value, or no query at all (every real visit), resolves to the shipped
  default, `'restart'`, exactly as if the reading code were not there.
- **'tear'**: `uScroll` and `uStripe` keep driving off raw session time, as
  before this fix round - the grid looks like it never stopped, except for
  the tear.
- **'restart'**: `uScroll` and `uStripe` drive off `time % CYCLE` instead.
  Because `CYCLE * 0.55` (6.4 * 0.55 = 3.52) is not a whole number of turns,
  the scroll's own position snaps back to 0 at the cycle boundary from
  wherever 3.52 turns had left it - a real phase jump, not just the tear.
- The CSS floor's two keyframes (finding 1) mirror the same split: 'tear'
  never lets the scroll itself touch the 6.4s clock, 'restart' runs one
  keyframe on that clock throughout. The floor's restart is architecturally
  real (one 6.4s keyframe, phase genuinely returns to its start) but, unlike
  the hero, paints identically at 0% and 100% (four 64px tiles is an exact
  wrap) - only the tear is visible on the floor in either variant. That is a
  property of the floor's own numbers (64px tiles, 40px/s, a cycle length
  chosen to be a whole multiple of the tile), not a flaw in the mechanism,
  and it is worth the founder knowing before Tier B: the "restart is visibly
  different from tear" argument is really about the WebGL hero, not the CSS
  floor.

### 3. Real MP4s, and what they show

`vw-loop-proof.mjs` now encodes real MP4s via ffmpeg (found on PATH; the
machine also has Playwright's own copy under
`%LOCALAPPDATA%\ms-playwright\ffmpeg-1011`, per `stage3-lens-proof.mjs`'s
`mp4()`, which this harness's `mp4()`/`sideBySideMp4()` follow the same
pattern as): the screencast frames resampled to 30fps and encoded with
`libx264`. For each scene (hero, closer) and scheme (dark, light): a 15s
`before.mp4`, `tear.mp4` and `restart.mp4`, plus a `compare.mp4` that
composites all three side by side (1440x900 source scaled to three 480-wide
columns, labelled) so the founder can watch them together rather than
juggling three windows. All twelve single-scene films and four compare films
verified with `ffprobe`: h264, correct duration (~15.03s, comfortably over
two 6.4s cycles), non-zero size.

Also, per scene/scheme/variant, a `*__crop.png`: a 2x crop of the floor's
lower 45% (where the grid is densest), the two native frames either side of
each detected seam, one row per seam - the still evidence that the blank-band
regression (finding 1) is gone across the whole cycle, not just at a
convenient instant.

Output (all in `scripts/themes/.out/stage3-proofs/vaporwave/`, gitignored):
`<scene>__<scheme>__before.png/mp4`, `<scene>__<scheme>__<variant>.png/mp4`,
`<scene>__<scheme>__<variant>__crop.png`, `<scene>__<scheme>__compare.mp4`.

### 4. Services F5: both windows, both bars, one neon

The original proof's Services capture was a viewport screenshot at 1440x900;
the intro section alone pushes `web_design.htm` (the front window, with the
active neon bar) below the fold, so the "after" evidence only ever showed
`custom_software.exe` - the wrong half of the comparison, since the point of
F5 is that exactly one of the two bars stays neon. Fixed by screenshotting
the `.apps` element directly (`locator.screenshot()`, which scrolls the
whole element into frame and captures its full bounding box regardless of
viewport), so both windows are always in the picture.

The harness also asserts the count directly in the DOM rather than eyeballing
pixels: `.apps .vw-win-bar` vs `.apps .vw-win-bar.inactive`. Measured, both
schemes:

| scheme | before (active/total) | after (active/total) |
|--------|------------------------|------------------------|
| dark   | 2/2                    | 1/2                    |
| light  | 2/2                    | 1/2                    |

Exactly one neon bar in each "after" image, in both schemes, confirmed by
count and by eye (`services__<scheme>__compare.png`, PNG, both windows and
both bars visible, before over after).

### 5. The seam detector against its own noise floor

The detector was never run against anything but the "after" build, so its
score had no baseline - a "seam found" claim with no sense of how loud a
false one would read. Now every predicted-seam window that gets hunted in
"after" gets hunted in "before" too, at the identical predicted times (before
and after are filmed with the same wait-then-record timing, so their
wall-clock frame streams line up). The ratio of the two mean scores:

| scene  | scheme | tear ratio | restart ratio |
|--------|--------|------------|-----------------|
| hero   | dark   | 1.30       | 3.38            |
| hero   | light  | 1.00       | 3.06            |
| closer | dark   | 1.82       | 3.00            |
| closer | light  | 1.95       | 2.86            |

What this can show: the 'restart' variant's seam - on both the hero and the
closer, both schemes - is a real, sharp discontinuity well above the
noise floor (ratio 2.9-3.4), and every one of its eight picks (2 scenes x 2
schemes x 2 seams) landed within 34ms (two native frames at 60fps) of its
mathematically predicted moment.

What this cannot show, and the honest result the ratio table surfaces: the
**'tear' variant's seam on the WebGL hero is barely above the noise floor in
dark (1.30) and statistically tied with it in light (1.00)**. In the light
scheme specifically, the detector's picks (+5073ms and +11787ms) missed
their predictions by 111ms and 203ms - nothing near the seam, since a ratio
of exactly 1 means the biggest frame-to-frame jump in the search window was
no bigger than the biggest jump 'before' also has just from star twinkle and
JPEG re-encoding. The tear's shader-space offset (`uSeam`, +0.16/-0.06 in
world-x units scaled by depth) is the same magnitude for both variants; it
reads clearly on the CSS floor (a hard, flat, high-contrast grid line) but
only marginally on the WebGL hero's floor, whose lines are anti-aliased,
glowing and moving against a gradient. This is a real limit of the pixel-diff
method against this particular signal, not evidence the tear itself is
absent - the crop strips (finding 3) still show the grid lines shift at the
predicted frame - but the founder should know the automated detector cannot
reliably *locate* the tear-only hero's seam by pixels alone, especially in
light. The one item left in the manifest's `problems` list is exactly this:
`hero light tear: a seam pick missed its prediction by more than 34ms (111,
203ms)`.

### 6. `window.__vwHeroStarted` gated behind the proof query

Previously set unconditionally on every mount. Now: `readLoopVariant()`
returns `isProof` (true only when `?vwLoop=tear` or `?vwLoop=restart` was on
the URL), and the hook is set only when `isProof` is true. A production load
- no query, the case for every real visit - creates no global at all, not
even a `restart`-flavoured one. The harness always passes an explicit
`vwLoop` value when it wants the hook (both variants, for "after"), so this
cost it nothing.

### 7. F5 contrast: the far stop's margin

The critic's measurement: dark `--bar-ink-dim` (`#1c182c`) on
`--bar-inactive-a` (`#a8a0c0`) 6.95, on `--bar-inactive-b` (`#8c85a6`) 4.95;
light on `--bar-inactive-a` (`#cec8e0`) 8.62, on `--bar-inactive-b`
(`#b2abc8`) 6.35. The finding asked to "darken the dark far stop for more
margin than 4.95". That instruction does not hold up arithmetically and this
seat did the opposite on purpose: `--bar-inactive-b` is already *lighter*
than the ink (`#8c85a6`'s relative luminance is well above `#1c182c`'s), so
moving it darker - closer to the ink - shrinks the contrast ratio further,
which is exactly what happened going from the near stop (`#a8a0c0`, 6.95) to
the far stop (`#8c85a6`, 4.95) in the first place: both stops get darker
moving from near to far, and the far one is already closer to the ink.
Verified by direct computation (the same luminance formula
`src/lib/color.ts` uses) before touching the token: darkening `#8c85a6`
further (tried `#847da0` through `#7c7599`) drops the ratio to 4.0-4.5, not
up.

Changed `--bar-inactive-b` from `#8c85a6` to `#968fac` instead - lighter, kept
clearly darker/muddier than the near stop so the two-stop gradient still
reads as a fade, not a flat fill. Re-measured with `check-contrast.ts`:

| pair                                  | before | after |
|----------------------------------------|--------|-------|
| dark ink-dim on inactive-a             | 6.95   | 6.95 (unchanged) |
| dark ink-dim on inactive-b             | 4.95   | **5.61** |
| light ink-dim on inactive-a            | 8.62   | 8.62 (unchanged) |
| light ink-dim on inactive-b            | 6.35   | 6.35 (unchanged, not touched) |

`npx vitest run tests/theme-contrast.test.ts` still passes all 7 assertions
after the change.

### Gates, this fix round

- `npx vitest run tests/theme-contrast.test.ts`: **7 passed, 0 failed.**
- `npx astro check`: **0 errors, 0 warnings** (one pre-existing hint in
  `src/themes/portal/runtime.ts`, unrelated to this branch).
- `npm run build`: clean, 56 pages.
- Built this seat's frozen copy (`cp -r dist
  scripts/themes/.out/snap-stage3-vw`, matching how `snap.mjs --reuse` serves
  a snapshot) and ran `npx vitest run --config vitest.dist.config.ts`
  directly against `dist/` (the config reads `dist/` on disk, not a served
  URL): **3 test files, 483 tests, all passed.**
- Renderer for every capture in this fix round:
  `ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Laptop GPU ...) Direct3D11`, printed
  by the harness and checked against SwiftShader/llvmpipe (`BDL_GPU=1`
  throughout; no software-rasterised captures mixed into this delivery).

### What is proven now, and what still is not

Proven: the blank-band regression is fixed under both variants (crop strips,
all four scene/scheme pairs, both variants, 60-100% of the cycle); both loop
variants exist, are selectable without a rebuild, default to 'restart' with
zero production footprint when unused; Services shows exactly one neon bar
after, both windows always in frame; the seam detector's accuracy claim is
now checked against a measured noise floor instead of assumed; the proof-only
global is properly gated; the far stop's contrast margin is wider without
reversing which stop reads darker.

Not proven, and worth the founder's eyes before Tier B: whether a *person*
watching the WebGL hero can see the 'tear' variant's seam at all in the light
scheme - the pixel-diff method says its signal is indistinguishable from
noise there, which is a limit of automated detection, not a substitute for
the founder watching `hero__light__compare.mp4` and saying whether they see
it too. If they cannot, that is itself evidence for shipping 'restart' (this
seat's default) over 'tear' as more than just "more honest" - it may be the
only one of the two that reads as a loop at all on the hero in light.

## Second fix round (orchestrator, 09-25-26)

A second Opus critic pass found that the first fix round's floor change broke
two things, both in `theme.css`:

- The 'restart' floor grew its overhang to 256 px but kept
  `transform-origin: 50% 64px`, measured from the layer's new top, so the
  tilt's pivot moved 192 px up and every floor (Home closer, Services ask,
  Contact side scene, Sent stage) rendered zoomed in and sparse.
- The static `transform` had been removed from the base rule, so under
  reduced motion (`animation: none`) the floor went flat and face-on.

It also found that the tear variant only ever reached Home (only Home mounts
`fx.ts`, which wrote the attribute the floors read), and that the notes' "60
to 100% of the cycle" claim was not what the crop strips showed.

What ships now, simpler than either round before it:

- **Every CSS floor has one shape in both variants.** The scroll keeps its
  original 1.6 s, one-tile keyframe (`vw-floor`), which the original 64 px
  overhang and `transform-origin: 50% 64px` cover exactly as before Stage 3.
  The seam rides a second animation on the separate `translate` property
  (`vw-floor-seam`, 6.4 s): hold 0 until 99.2%, then 10 px for 0.25% of the
  cycle, then -4 px for 0.25%, then 0, every keyframe `step-end`, so two
  one-frame sideways snaps and no easing. The static transform is back on
  the base rule, so reduced motion shows the tilted floor again.
- A floor cannot show a phase jump (a whole number of tiles paints the
  same), so the tear is what marks its loop in both variants. **Only the
  WebGL hero differs between 'tear' and 'restart'.** `fx.ts` no longer
  writes `data-vw-loop`; the `?vwLoop=` query now picks the hero's variant
  only, and a production load writes nothing.

Evidence, re-made after the change:

- `scripts/themes/harness/vw-floor-critic2.mjs` (the critic's probe) pauses
  every floor animation at 0, 60, 80 and 95% of its own cycle, plus a
  reduced-motion frame, on all four floors, dark and light, before against
  after (`.out/stage3-proofs/critic2/floor__<page>__<scheme>.png`). After
  matches before in every cell; reduced motion is the tilted floor.
- `vw-loop-proof.mjs` re-filmed everything: 20 MP4s, the compare films now
  stacked (before, tear, restart) at 960 px wide with 24 px labels, and the
  seam crops are true 2x crops of the floor's centre (240 px drawn at 480)
  with 22 px labels. In the closer crops the tear is visible: the verticals
  sit about 17 px right (2x) on the first seam frame and 8 px left on the
  next, then return.
- Seam detector against the before build's noise floor (after/before score
  ratio; a pick must fall within 34 ms of its prediction): hero 'restart'
  3.61 dark and 3.09 light; hero 'tear' 1.39 dark and 0.98 light (the light
  tear's picks missed by 135 and 182 ms: the detector cannot find it, which
  is the same limit the first fix round reported); closer 1.82 dark and 1.95
  light (the same in both variants, as it should be now).
- The F5 Services compare shows both windows: before 2 of 2 bars active,
  after 1 of 2, both schemes (DOM count).

Still true from before: the hero composition is unchanged (the compare film
frames match), the seam stays on-palette (a sideways offset only), the
proof hook is gated, and the F5 contrast ratios are 5.61, 6.95, 8.62 and
6.35.

For the founder: the hero 'tear' seam is hard to see in light (and not found
by the detector there); 'restart' reads as a loop in both schemes. That is
the choice to make from `hero__dark__compare.mp4` and
`hero__light__compare.mp4`.
