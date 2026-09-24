# Tier 3, Stage 2: the P5 wordmark proof (result)

Written 09-23-26 at the P5 checkpoint. Workflow `aplus-tier3-stage2-p5-workflow.js`
(run `wf_8e3d3f9b-038`): A tooling and B proof (Opus/high), C critic
(Opus/medium), D refuter (Sonnet/medium). No fix round was needed, because
nothing blocker or major was found. The orchestrator checked every number
below against the journal and the manifests on disk. Commits `79ac5da`
(tooling) and `7614ffe` (proof).

## Verdict: the proof passes

| set | strips | cross-school overlap | in-school blink |
|---|---|---|---|
| HEAD, wordmark crops (`.out/stage2-p5-head`) | 64 | 0 of 40 pass (worst min 0.455 to 0.500) | 24 of 24 pass |
| HEAD, full frame (`.out/stage2-p5-head-full`) | 64 | 0 of 40 pass | 24 of 24 pass |
| proof, wordmark crops (`.out/stage2-p5-proof`) | 28 | 20 of 20 pass (worst min 0) | 8 of 8 pass |
| proof, full frame (`.out/stage2-p5-proof-full`) | 28 | 20 of 20 pass | 8 of 8 pass |

The proof covers:
- cottagecore, arriving from quiet, from vaporwave and from swiss, plus its
  in-school swap;
- quiet, arriving from cottagecore and from vaporwave, plus its in-school
  swap.

Each case was filmed in dark and light, on desktop and mobile. All 21 root
pages, and the stylesheets they link, are byte-identical to HEAD.
`npm run verify` is clean on the proof build: 331 unit tests, astro check
0 errors and 0 warnings, 440 built-site tests.

## What was wrong, measured

Astro writes a fade for the wordmark images inside `@layer astro`: 180 ms,
`cubic-bezier(0.76, 0, 0.24, 1)`. That rule beats the browser's `inherit`,
so the images ignore the group's duration (240 to 640 ms) and curve. Only
the group's delay still reaches them (bauhaus's 120 ms). The recipe now sets
`animation-duration`, `-timing-function` and `-delay` to `inherit` on both
images, and the README says so.

## Carried into the sweep

- **The blank.** Between the old wordmark leaving and the new one arriving,
  neither shows. The strips show it as 1 to 4 empty header frames; on the
  cottagecore phone, about +354 to +417 ms. The critic estimates the time
  below 10% opacity at about 144 ms on cottagecore and 56 ms on quiet,
  because the group's curve eases each fade. Nothing measures it yet; a
  `blank` figure goes into the judge before the sweep. The founder decides
  how much blank is acceptable (checkpoint question).
- **Judge limits (critic, minor):**
  - the blink verdict assumes Astro's `plus-lighter` blend, which is true
    only while Astro's keyframes run in-school;
  - the judge reads opacity only, so an image hidden by clip or transform
    counts as visible.
  Both are stated in the judge and tightened where cheap.
- **The render lock (critic, minor):** a stale-lock break can race when two
  builders wait at once. Hardened before three builders share it.
- **`snap.mjs` rewrites `dist/`,** which the :8787 Worker serves. Nobody
  films :8787 during a sweep wave; the gates rebuild it afterwards.
- **Heavy dark-desktop arrivals present almost no frames through the fade.**
  On cottagecore's dark desktop crops, the longest gap between presented
  frames is 344 to 404 ms, and the main thread stalls up to 233 ms.
  Transitions phase, and cottagecore's first-frame item. It is likely part
  of the stutter the founder saw on the phone.
- **Unverified (critic):** `object-fit: none` may clip a larger old wordmark
  inside a shrinking morph box. Watch for it when glassmorphism and bauhaus
  adopt the recipe.

## Sheets for the founder

`scripts/themes/.out/stage2-p5-compare/`:
1. quiet from vaporwave, desktop;
2. cottagecore from vaporwave, phone, dark;
3. cottagecore from quiet, phone, light;
4. cottagecore Home to About, phone, light (holds still).
