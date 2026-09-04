# social/

Self-contained social asset pipeline. Renders video loops and cards from the
site's own pages, encodes them to platform-ready mp4, and verifies the result
before anything gets posted.

**This directory does not touch the site.** No imports out of `social/`, no
edits to `src/`, no build hooks, no deploy involvement. It reads the site the
way a visitor does — over HTTP, from the local dev server. A copy pass on the
site can run at the same time as a render run without either one seeing the
other.

## Rules this pipeline enforces on itself

- **One source: the local dev server.** No third-party sites, ever, and no
  cached copies of anything — every run renders from current code. There is no
  production fallback: if `localhost:4321` is not up, the run stops rather than
  quietly rendering a different commit.
- **`out/` is gitignored.** Generated assets are outputs, not source. The
  calendar and the code that reads it are what get committed.
- **`manifest.json` is generated, never hand-edited.** `calendar.html` is the
  source of truth; the manifest is a committed snapshot of what it said.

## Setup

Once, inside `social/`:

```bash
npm install
```

That installs Playwright and downloads Chromium. `ffmpeg` and `ffprobe` must
already be on PATH — the pipeline shells out to both, and `npm run preflight`
fails loudly if either is missing.

```bash
npm run preflight
```

## Commands

Run all of these from inside `social/`.

```bash
npm run manifest
```

Reparses `calendar.html` into `manifest.json` and prints the asset table. Run
it after any edit to the calendar.

```bash
npm run loops
```

Captures and encodes every video asset. Needs a dev server running (see below).

```bash
npm run cards
```

Renders the still cards and carousel slides.

```bash
npm run verify
```

Probes every mp4 in `out/` and writes `out/report.md`. Exits non-zero if
anything failed, so it is safe to gate on.

```bash
npm run selftest
```

Proves the encoder and verifier end to end with synthetic frames — no browser,
no dev server. It builds a sequence that is a known-good loop by construction,
encodes it, and runs the real verifier over the result. If a real render fails
verification, run this first: it tells you whether the fault is in the pipeline
or in the scene.

```bash
npm run selftest:capture
```

Regression tests for the two determinism guards, against the live scene. Each
guard is disabled on purpose and the run must then FAIL to reproduce — proving
the guard is load-bearing rather than decorative.

```bash
npm run probe
```

The determinism probe. Renders 30 frames twice, in two separate browser
sessions, and diffs them frame by frame — plus a read-out of every source of
time and randomness the page touched. `--variant A|B|C`, `--framing SQ|PT|VT`.

## Dev server

The renderers point at the Astro dev server from the repo root. There is no
production fallback: if `http://localhost:4321` is not answering, the run stops
with the command to start it. Silently rendering against production would
produce assets from a different commit than the one checked out, and nothing
downstream would catch it.

From the **repo root**, in a separate terminal:

```bash
npm run dev
```

### How the harness is served

Astro's dev server serves `public/` and its own routes — nothing from the repo
root. So `http://localhost:4321/social/harness/bdl-007.html` is a 404, and
making it work would mean adding files under `public/`, which this pipeline is
not allowed to do.

Vite's `/@fs/` prefix is the way through. It serves any file inside the project
root straight off disk, query strings included:

```
http://localhost:4321/@fs/C:/git/birchdesignlab/social/harness/bdl-007.html?variant=A&framing=SQ
```

Same origin as the dev server, so the harness's `import '/src/experiments/...'`
resolves through Vite's own transform pipeline and loads the real scene module —
not a copy. `lib/devserver.mjs` builds these URLs; nothing hard-codes the path.

## How the pieces fit

| File | Job |
| --- | --- |
| `calendar.html` | The content calendar. Hand-edited. Carries the `asset-manifest` JSON block. |
| `scripts/manifest.mjs` | Parses that block into `manifest.json` and flattens it into one row per buildable asset. |
| `lib/capture.mjs` | Deterministic frame recorder. Fake clock, seeded RNG, exact integer-ms stepping. |
| `lib/encode.mjs` | ffmpeg wrapper. H.264 High / yuv420p / CRF 18 / faststart / silent AAC. |
| `lib/verify.mjs` | ffprobe conformance checks plus the loop-seam test. Writes `out/report.md`. |
| `lib/ffmpeg.mjs` | Shared ffmpeg/ffprobe plumbing and the PSNR frame diff. |
| `render/loops.mjs` | Drives capture + encode for every video asset. |
| `render/cards.mjs` | Renders stills and carousel slides. |
| `render/framing.mjs` | The founder-specified per-asset framing table, capture resolution, and time scale. |
| `harness/bdl-007.html` + `.mjs` | Render harness. Imports the real scene module; adds a frame-sized stage, a true first-draw hook, and deterministic variant staging. |
| `scripts/selftest.mjs` | Browser-free proof that encode + verify are correct. |
| `scripts/probe-determinism.mjs` | Double-render diff plus a time/randomness audit of the live scene. |
| `scripts/selftest-capture.mjs` | Regression tests proving the two determinism guards are load-bearing. |
| `scripts/measure-loop.mjs` | Seam residual at candidate durations. |
| `scripts/measure-scatter-decay.mjs` | Firefly transient decay, measured off the shipped model. Browser-free. |
| `scripts/measure-gather.mjs` | When the flock gathers and goes quiet, read off the GPU buffer upload. |
| `scripts/selftest-dissolve.mjs` | Proves the cross-dissolve maps frames correctly. Browser-free. |
| `scripts/measure-supersample.mjs` | Proves 1440 CSS does not move the framing. |
| `scripts/render-one.mjs` | One asset plus a contact sheet, for review before it ships. |
| `scripts/render-candidates.mjs` | Variant B angles and variant C orbit speeds, as stills to choose from. |
| `lib/contact.mjs` | Contact sheets. A clip cannot be judged in a terminal. |

### Why the capture is built the way it is

Three details in `lib/capture.mjs` are load-bearing, and all three are easy to
undo by accident:

1. **`page.clock.install()` runs before `page.goto()`.** After `goto`, the page
   has already sampled the real clock and seeded its animation phase from it.
   The first frame then depends on what time it happened to be, and the loop
   seam moves between runs.
2. **`Math.random` is seeded through `context.addInitScript`.** Context init
   scripts run before any page script, on every frame. A `page.evaluate` after
   load is too late — the field has already been generated.
3. **The frame step must sum exactly, and land on the redraw grid.** A frame
   duration that is not a whole number of milliseconds drifts: a flat 33ms at
   "30fps" loses a full frame every three seconds. `stepCycle()` distributes the
   remainder by Bresenham so the sum is exact, and takes a `timeScale`. The
   shipped 60fps at 4.8x gives a flat 80ms — see "Why the clip is 12.5 seconds".

### The loop seam

Measured on the **source frames**, never on the encoded mp4 — see
`seamFromFrames()` in `lib/verify.mjs`. The mp4 answer is the encoder's, not the
animation's: frame 0 is an IDR keyframe at full quality and the last frame sits
at the end of a GOP carrying the most accumulated prediction error, and a field
of sparse bright dots on near-black is exactly where that error lives. That gap
swamped the real seam roughly 3x and stayed almost constant no matter what was
done to the scene, which made a perfectly good loop look broken:

| scene state | mp4 wrap | source-frame wrap |
| --- | --- | --- |
| wandering | 0.3132 | 0.1007 |
| gathered | 0.2251 | - |
| wandering + dissolve | 0.3054 | 0.1007 |

The test is a ratio: the wrap should cost about what an ordinary frame step
costs. The baseline is averaged over several points in the loop, because
per-frame motion varies through the breath.

### Why the clip is 12.5 seconds

Three periods and one grid have to agree:

| | |
| --- | --- |
| `IDLE_YAW` | one revolution per 60s |
| `PULSE_PERIOD` | the moss breath, 20s |
| rAF under the fake clock | fires every **16ms** exactly (measured) |

60s of scene time is the only duration that is a whole number of *both* — one
revolution and three breaths. Compressing 60s into a 12.5s clip at 60fps is
`TIME_SCALE 4.8`, which makes the step 80ms: exactly five 16ms redraws.

That alignment is not cosmetic. If the step is not a whole multiple of the
redraw interval, every frame shows a state 0-16ms stale by a *varying* amount
and the result visibly skips. Measured at a 125ms step: per-frame motion swung
**42%** in an alternating beat. At 80ms: **15%**, and smoothly monotonic.

So duration, fps and `TIME_SCALE` move together. A valid set satisfies both:

    seconds * TIME_SCALE === 60
    1000 * TIME_SCALE / fps  is a multiple of 16

`resolveRow()` throws if a looping row breaks either — a loop that does not
close is otherwise a silent defect, since it renders and passes conformance.

An earlier design closed only the 20s breath, holding the mark still with a
synthetic tap. It was wrong twice over: the tap stops `IDLE_YAW` permanently,
and the rotation *is* the shot. Durations from that era, kept because the
measurements are still instructive:

| loop | residual | what differs |
| --- | --- | --- |
| 6.667s | 2.54x | whole mark — breath a third of a cycle out |
| 10s | 8.11x | worst case — half a breath, maximum opposition |
| 20s | 1.24x | mark matches; only the fireflies differ |

The fireflies never return at any duration — their motion is integrated, not
periodic. Once the rotation runs, per-frame motion is large enough that the
residual disappears into it. `encode()` keeps a `dissolveSeconds` option for a
scene where that is not true; it is 0 here.

### Do not judge a seam by PSNR alone

PSNR rated 6.667s (38.41dB), 20s (38.55dB) and 10s (34.80dB) as near-equivalent,
and it is badly wrong. The breath moves a **large dim area** — low peak, high
area. The fireflies move a **few very bright pixels** — high peak, low area.
PSNR is a mean of squared error, so a handful of bright dots dominates it and
a whole-mark brightness shift barely registers.

The mean of the difference image (`lumaDelta` in `lib/ffmpeg.mjs`) is the metric
that sees what the eye sees, and it separated the three cases cleanly. Amplified
difference images in `out/.loopcheck/` show it directly: at 6.667s the entire
mark glows; at 20s the mark is black and only fireflies remain.

### Settle frames

The burn-in is one full revolution, 60s of scene time (750 frames at 60fps and
4.8x), for two reasons.

**Yaw.** Rotation accumulates from mount, so frame 0 only lands head-on where
scene time is a multiple of 60s. At an earlier 29.6s the take opened on the
*back* of the mark.

**Fireflies.** Undisturbed, the scene's own gather engages at `GATHER_AFTER_MS`
and the flock is quiet ~5.7s later. `scripts/measure-gather.mjs` measures this
properly — it reads the flock's real positions off the GPU buffer upload,
because neither pixel metric can see 40 dots against a breathing mark (the mean
is dominated by the mark; the peak saturates on one bright dot):

    wandering               0.0104 units/frame, steady to 18.8s
    gather engages at 20s   spikes to 0.0185 as the flock accelerates in
    collapse                0.0038 at 25.0s, 0.0016 at 27.1s
    quiet floor             0.0017, first held from 25.7s

`scripts/measure-scatter-decay.mjs` remains for the case where something *does*
tap the scene: any pointer event fires `markInteraction()`, which scatters the
flock at ~50x cruising speed, and the excess takes 1.17s of scene time to fall
under 5%. Nothing in the shipped take does this.

### The scene throttles itself to 30fps

`stage.ts` renders ambient motion at `AMBIENT_FPS = 30` and skips the frame
otherwise, so it redraws on a 48ms grid (its threshold landing on 16ms rAF
boundaries). Sampling at any rate that is not a multiple of that beats against
it: at 30fps capture, one frame in three was a duplicate (36 of 119).

The shipped take removes the throttle for the duration of the recording — see
the note on recording-only `stage.ts` overrides in `docs/socials-backlog.md` —
so the scene redraws every 16ms and the 80ms step is exactly five of them.

### Variant C cannot be a real orbit

The mark is a flat relief, not a solid. Turned 90 degrees it collapses to a
green edge-on sliver, so the calendar's "one slow full orbit per loop" loses the
wordmark entirely twice per loop; a half revolution passes through edge-on once
and ends mirrored, which does not close on yaw at all. Both were rendered as
contact sheets before anyone tried to ship one.

`__BDL_ORBIT` therefore takes a `sweep` as well as `turns`: a sine sweep never
reaches edge-on, reveals the mossy sides on the turn, and returns to exactly 0
at the end of the loop, so it closes in both position and velocity. The shipped
pick is +-26deg (`C_ORBIT`).

Note before re-rendering B or C: both still stage themselves with a synthetic
pointer gesture, which stops the idle rotation. Variant A no longer does. If B
and C should also spin, their staging needs rethinking first.

### Capture resolution: 1440 CSS, not 1080 at dSF 2

`stage.ts` caps itself at `setPixelRatio(Math.min(window.devicePixelRatio, 1.5))`.
Raising `deviceScaleFactor` alone therefore cannot buy more than 1.5x — at a
1080 viewport the WebGL buffer stays 1620px however high dSF goes, and the
compositor merely stretches that to the 2160 screenshot. A 1.5x supersample
wearing a 2x costume.

A true 2x has to come from **size**: 1440 CSS on the long edge at dPR 1.5 gives a
2160px buffer natively. The risk was that the scene measures itself in CSS
pixels and would reframe, so it was measured rather than assumed
(`scripts/measure-supersample.mjs`): 46.2dB between the two normalised to 1080,
with the residual confined to thin edge halos. Sharpening, not a moved
silhouette — everything the camera derives is a ratio.

### The harness is dev-only, by construction

`/@fs/` is a Vite **dev server** route. It does not exist in a production build,
and `social/` is not part of the site's build at all — nothing under `public/`,
no route, no import from `src/`. So the harness cannot be reached on
birchdesignlab.com, and that is the intended state rather than a gap to close.

It works because `astro.config.mjs` sets no `vite.server.fs.allow`, so Vite
defaults to allowing the project root, and `social/` is inside it. Nothing had
to be configured — but if a future `server.fs.allow` is ever added to that
config, it must include the repo root or the harness stops resolving.

Loops never render against production, so a dev-only harness costs nothing.

### What makes the BDL-007 capture reproducible

Four things, all found by measurement rather than by reading. Each one, removed,
silently reintroduces drift:

1. **`clock.install()` is not enough — it needs `clock.pauseAt()`.** An
   installed clock keeps ticking with real time; `runFor()` only jumps it
   further along. Measured: 3 seconds of real idle advanced the page's
   `performance.now()` by 3003ms with install alone, and by 0ms with
   `pauseAt`. Without the pause, a page that spends 8 real seconds decoding the
   glb starts frame 0 eight seconds into the breath, at a different point every
   run.
2. **Loading waits in real time against a frozen clock.** Fetching and decoding
   is event-driven, not timer-driven, so it completes fine with time stopped.
   Everything after it is a FIXED number of fixed-size steps, so frame 0 always
   lands at the same absolute instant.
3. **The run waits for the network to go quiet, not just for the model.**
   This one will not be obvious six months from now, so: in `stage.ts`, the
   canopy and stone **bump maps are loaded by a bare `TextureLoader.load()` and
   nothing ever awaits them**. They are wired onto the materials whenever they
   happen to decode, which may be several frames after `onReady` fires — and
   `onReady` only covers the glb. Start recording before they land and the early
   frames shade differently purely on who won the race; this alone was worth
   ~38dB of frame-to-frame drift. The quiet period is counted in Node off
   Playwright's request events, not with `waitForLoadState('networkidle')`,
   because the page's own clock is frozen and a quiet timer living on it would
   never fire.
4. **Frame-locked staging runs before the clock step, not after.** The scene
   only redraws inside `runFor()`, so an orbit applied after the step is not on
   screen until the next frame, and whether the compositor caught it was a race.

## Rendering on the GPU

Playwright's headless Chromium rasterises WebGL with **SwiftShader**, in software.
Verified rather than assumed — the renderer string on this machine is:

```
ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)
```

That is why a take pegs the CPU for ~20 minutes and leaves the discrete GPU
(an RTX 3070) idle. `BDL_GPU=1` hands rasterisation to the real driver:

```bash
BDL_GPU=1 npm run loops
```

**Validate before adopting it for a set that ships.** Changing rasteriser
changes pixels: antialiasing, shader precision and the ACES tone-mapping
roll-off all differ between SwiftShader and a hardware driver. A GPU render is
not a drop-in sibling for a SwiftShader one, so never mix the two inside one
delivery. Render one asset both ways, diff with `lumaDelta`, look at the
frames — and if the difference is edge-level, switch over and re-render the
whole set as a matched pair.

## Known gap

`render/cards.mjs` is scaffolded but not implemented — it prints what it would
build and exits non-zero. It needs the card template and the `tokens.json`
brand snapshot it reads from.
