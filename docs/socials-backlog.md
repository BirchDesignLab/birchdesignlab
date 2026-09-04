# Socials Backlog

*Social asset pipeline and its work items. Started 09-02-26, the day the
BDL-007 launch loops were rendered. Parent documents: `social/README.md` (how
the pipeline works), `social/calendar.html` (the content calendar and its
`asset-manifest` block).*

*This file is for the SOCIAL pipeline. Site experiments stay in
`docs/lab-backlog.md`.*

## Where things are

Everything lives in `social/`, which is deliberately self-contained: no imports
out of it, no edits to `src/`, no build hooks, no deploy involvement. It reads
the site over HTTP from the local dev server the same way a visitor does, so a
copy pass and a render run cannot collide. `social/out/` is gitignored —
rendered assets are outputs, not source.

```bash
cd social
npm install                       # playwright + chromium; ffmpeg must be on PATH
npm run manifest                  # calendar.html -> manifest.json, prints the asset table
BDL_GPU=1 npm run loops           # render every video asset (SEE "Always render on the GPU")
npm run verify                    # conformance + seam over out/, writes out/report.md
npm run selftest                  # browser-free proof the encoder and verifier are correct
npm run probe                     # double-render determinism diff
```

The harness is served through Vite's `/@fs/` route off `localhost:4321`, which
is how it imports the real `src/experiments/bdl-007/stage.ts` rather than a copy
without putting any file under `public/`. It is dev-only by construction and
that is fine; loops never render against production.

## Shipped 09-02-26 — BDL-007 launch loops

Two files, the undisturbed idle rotation of the wordmark. The post is "we're
getting spun up", a pun on the tree spinning on the specimen page, so **the
spin is the shot**.

| file | dims | frames | duration | seam |
| --- | --- | --- | --- | --- |
| `V007-VT.mp4` | 1080x1920 | 750 | 12.500s | 0.97x |
| `V007-SQ.mp4` | 1080x1080 | 750 | 12.500s | 0.94x |

H.264 High **Level 4.2**, yuv420p, 60fps, CRF 18, faststart, silent 48kHz
stereo AAC. Head-on at both ends, one full revolution, fireflies airborne then
settling near the end.

**The numbers close by construction, and that is the whole trick.** `IDLE_YAW`
is one revolution per 60s and the moss breath is 20s, so 60s of scene time is
exactly one turn AND exactly three breaths. Compressing 60s of scene into a
12.5s clip is `timeScale 4.8` at 60fps, which is an 80ms step — exactly five
redraws of the 16ms rAF grid. Every one of those numbers has to hold or
something visibly breaks; see the findings below.

Facebook turns every video into a Reel, so **VT is the file that matters**; SQ
now only serves X. `calendar.html` was repointed accordingly on the five video
dates (09-02, 09-09, 09-16, 09-29, 09-30). Card dates still use SQ — stills are
not reeled.

## Always render on the GPU

Playwright's headless Chromium silently rasterises WebGL with **SwiftShader**,
in software. Nothing warns; it just looks slow. Verify with
`WEBGL_debug_renderer_info`:

```
ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)   <- software
ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Laptop GPU, Direct3D11 vs_5_0 ps_5_0, D3D11)  <- what you want
```

`BDL_GPU=1` adds `--use-angle=d3d11 --enable-gpu --ignore-gpu-blocklist
--enable-gpu-rasterization`. Measured on the VT file: **~25 minutes to 2
minutes 7 seconds.** The CPU ran at full tilt for hours on 09-02 while the GPU
sat under 25%.

The one caveat, and it is why this is opt-in rather than default: **changing
rasteriser changes pixels.** Antialiasing, shader precision and the ACES
tone-mapping roll-off all differ. Never mix software- and GPU-rendered files
inside one delivery. To switch an existing set, render one asset both ways,
diff with `lumaDelta`, look at the frames, then re-render the whole set.

## Findings that cost a day, and will cost it again if forgotten

Every one of these fails **silently**: the render succeeds, the file verifies,
and the output is wrong.

1. **`page.clock.install()` does not stop time.** An installed clock keeps
   ticking with real time; `runFor()` only jumps it further. It needs
   `clock.pauseAt()` as well. Measured: 3s of real idle advanced the page's
   `performance.now()` by 3003ms with install alone, 0ms with the pause.
   Without it, however long the glb took to load leaks into the scene's clock
   and frame 0 lands at a different point in the breath every run.

2. **`performance.now()` is faked with about a millisecond of slop.**
   `stage.ts` seeds the firefly scatter with
   `(performance.now() | 0) % 100000`, so that slop becomes an entirely
   different PRNG seed and the flock starts somewhere else. The harness pins
   `performance.now` to the exactly-faked `Date`.

3. **The bump textures are never awaited.** `stage.ts` fires
   `TextureLoader.load()` for canopy and stone and wires them onto the
   materials whenever they happen to decode. `onReady` only covers the glb.
   Recording before they land shades the early frames differently — which made
   determinism a function of how long `settleFrames` happened to take in real
   time.

4. **The scene throttles its own ambient motion to `AMBIENT_FPS = 30`,** and
   skips the render otherwise. Sampling at any rate that is not a multiple of
   its redraw grid produces duplicate frames or judder. At 30fps capture, one
   frame in three was a duplicate (36 of 119). At 60fps with a 125ms step, the
   per-frame motion swung 42% in an alternating beat — visible skipping.

5. **rAF fires at exactly 16ms under the fake clock.** With the throttle
   removed the scene redraws on that grid, so the capture step must be an
   integer multiple of 16ms or the sampled state is 0-16ms stale, varying.
   80ms works (5 redraws). 125ms does not (7.8125).

6. **Do not measure the loop seam on the encoded mp4 — it measures H.264.**
   Frame 0 is an IDR keyframe at full quality and the last frame sits at the
   end of a GOP with maximum accumulated prediction error. On a field of sparse
   bright dots against near-black, that gap swamped the real seam roughly 3x
   and barely moved no matter what was done to the scene:

   | scene state | mp4 wrap | source-frame wrap |
   | --- | --- | --- |
   | wandering | 0.3132 | 0.1007 |
   | gathered | 0.2251 | - |
   | wandering + dissolve | 0.3054 | 0.1007 |

   `seamFromFrames()` in `lib/verify.mjs` measures the PNG sequence instead.

7. **PSNR is the wrong metric for this scene.** It is a mean of *squared*
   error, so a handful of very bright pixels (40 fireflies) dominates it and a
   large dim area (the whole mark at the wrong breath phase) barely registers —
   exactly backwards. PSNR rated a loop a third of a breath out of phase
   (38.41dB) as equivalent to one that closed properly (38.55dB). The **mean**
   of the difference separated them cleanly at 2.54x versus 1.24x of an
   ordinary frame step.

8. **H.264 level must be 4.2, not 4.0, at 60fps.** 1080x1080 needs 277,440
   macroblocks/sec and 1080x1920 needs 489,600; Level 4.0 caps at 245,760.
   Declaring a level the stream exceeds is not cosmetic — strict hardware
   decoders on older phones and TVs can refuse the file or fall back to
   software decoding. An existing file can be patched losslessly:
   `ffmpeg -i in.mp4 -c copy -bsf:v h264_metadata=level=42 out.mp4`.

9. **The fireflies never close a loop while wandering.** Their motion is
   integrated, not periodic. This does not matter once the rotation is running,
   because per-frame motion is large enough that the residual disappears into
   it — but it is why every attempt to close the loop on a *static* mark
   failed. The scene's own gather behaviour does land them (leave it alone for
   `GATHER_AFTER_MS` and they seek fixed points on the moss), at the cost of
   most of the scene's motion.

## Open work

### VT is only supersampled 1.125x, not 2x — FIX FIRST

`CAPTURE` in `render/framing.mjs` normalises the **long edge** to 1440 CSS,
which produces a true 2x only for square. The rule looks symmetric and is not:

| | CSS | buffer | output | supersample |
| --- | --- | --- | --- | --- |
| SQ | 1440x1440 | 2160x2160 | 1080x1080 | **2.00x** |
| PT | 1152x1440 | 1728x2160 | 1080x1350 | **1.60x** |
| VT | 810x1440 | 1215x2160 | 1080x1920 | **1.125x** |

VT gets almost none of the antialiasing benefit SQ gets, and a 1.125x downscale
resamples on a non-integer grid — it can read slightly softer without buying
edge quality. The correct rule is buffer = 2x output in **both** dimensions,
CSS = buffer / 1.5 (the cap in `stage.ts`), so VT wants CSS 1440x2560 and a
2160x3840 buffer. That is 3.16x the pixels of what shipped; trivial on the GPU.

VT is the format that matters, so this is the first thing to fix.

### tokens.json and the card template — NOT STARTED

The cards, carousels and stills in the calendar. Plain typographic work: no
scene, no clock, no loop seam, so none of the findings above apply.

- **`social/tokens.json`** — snapshot the site's real CSS custom properties
  (and the styleguide page if it exposes them) with a timestamp and the commit
  SHA. The card template reads **only** from that file, never live tokens, so a
  copy pass cannot restyle an asset that has already been posted. Re-snapshot
  deliberately, behind a flag.
- **`social/render/cards.mjs`** is scaffolded but prints its targets and exits
  non-zero. It needs the template page and its type scale.
- The harness already refuses to render if `document.fonts.ready` resolves with
  any face unloaded; the card template inherits that. Fonts are self-hosted
  (`@fontsource*`), no CDN.

### Re-render B2 and C4 with the undisturbed spin

Both were rendered on 09-02 with a synthetic tap that stopped the rotation, and
are gone. Not needed until 09-09 (V007B) and 09-30 (V007C). The founder's picks
are already wired into `framing.mjs`:

- **B2** — `B_ANGLE = { yaw: 0.55, pitch: -0.42, zoom: 6 }`, low angle, moss in
  the foreground.
- **C4** — `C_ORBIT = { sweep: 0.45 }`, a +-26deg sine sweep, **not** an orbit.
  A real revolution collapses the flat relief mark to an edge-on green sliver
  twice per loop; a half revolution ends mirrored and never closes on yaw. The
  sweep's period equals the loop period, so it is continuous in both position
  and velocity at the wrap.

Note that B and C currently stage themselves with a pointer gesture, which
stops `IDLE_YAW`. If they should also spin, their staging needs the same
treatment variant A got.

### V005 and V029 — never attempted

`V005` is a scroll capture of `/lab/bdl-005` (no harness, so it waits on a
selector and has no decode gate of its own — this is why
`waitForNetworkQuiet` stays in `capture()`). `V029` is kinetic type with no
source page at all; it needs a template built inside `social/`, like the cards.

## Temporary `src/` edits — always revert

The 09-02 renders needed two parameters changed in
`src/experiments/bdl-007/stage.ts`, with the founder's permission, purely for
recording:

- `GATHER_AFTER_MS` 20000 -> 104000, so the flies stay airborne into the take
  and settle near its end rather than long before frame 0.
- `AMBIENT_FPS` 30 -> 240, so the throttle never blocks a redraw (finding 4).

Both were reverted with `git checkout` afterwards and `src/` verified clean.
**If a future render needs them again: re-apply, restart the dev server, and
confirm the server is actually serving the new values** — a render was started
once against reverted params and produced plausible, wrong output.

## Operating notes

- **Never run two renders at once.** They share `out/.frames/<asset>`, which
  `capture()` wipes and rewrites, so frames from two runs interleave and the
  result passes `ffprobe` cleanly while containing spliced content. One file
  was lost this way on 09-02.
- **Do not discard a background render's output.** A run launched with
  `> /dev/null` died invisibly, was assumed dead from a stale artifact, and a
  second run was started on top of it.
- **`taskkill /F /IM chrome.exe` also kills the user's browser.** Playwright's
  Chromium lives under `ms-playwright`; filter on the executable path.
- The dev server's child processes outlive the shell that started it. Kill the
  `node.exe` processes whose command line contains `astro`.
