# Stage 6 A1: glass lens drag diagnosis

Opus `high`, 11-19-26, GPU (RTX 3070, ANGLE D3D11). Probes:
`scripts/themes/stage6/glass-diag-{drag,swap,scroll,os-media}.mjs`; evidence
in the gitignored `scripts/themes/.out/stage6-glass-diag/`.

**Short answer:** the lens drags fine under ordinary conditions. On the
founder's machine it likely never mounts: Windows "Transparency effects" is
off on this account (`HKCU\...\Themes\Personalize EnableTransparency = 0`),
so Chromium, Chrome and Edge report `prefers-reduced-transparency: reduce`
and the school shows its opaque fallback. With transparency on, two real
bugs make the lens look broken after the first drag.

## What works

First drag at 1440, 1280 and 1024, both schemes, direct and via the
switcher; the lens follows 1:1 then glides; arrow keys move it.

## What breaks

- **A, the opaque fallback (founder's machine).** In reduce mode
  `.lens-hit` and `.lens-canvas` are `display: none` and a static poster
  disc shows; panes go 94% opaque, no backdrop blur, flat wallpaper.
  `theme.css:216`, `:669`, `:1432-1436` (decision E10). Matches "the
  transparency thing doesn't work, the draggable thing doesn't work, it's
  fine".
- **B, the lens gets lost under a pane.** After a drag or throw it rests
  under the hero window or Control Centre in 11 of 15 desktop drags, blurred
  away and ungrabbable (hit button at z-index -1 by design,
  `theme.css:1187-1191`, `Home.astro:214-215`; release, glide end and keys
  clamp only to the viewport, `lens.ts:642-651`, `:745-750`, `:662-677`).
  Only a reload brings it back.
- **C, two lenses after arriving through the portal or returning to Home.**
  `idle-after-arrival.ts:30-41` never clears its 2500 ms safety timer on the
  MutationObserver path, so the idle callback runs twice;
  `home-boot.ts:131` overwrites the first lens without destroying it: a
  ghost lens and a leaked WebGL context, rAF loop and listeners per arrival.

## Fixes

- **C (do regardless):** a `fired` guard in `runIdle`, `clearTimeout(safety)`
  in the observer path, `if (lens) return;` in `home-boot.ts`. Check: one
  `+lens-hit` per Home visit (`glass-diag-swap.mjs`).
- **B (recommended behaviour):** settle back into open wallpaper. A
  `nearestOpenSpot` in `physics.ts` on the start-position grid; in `lens.ts`
  a `checkRest()` after a zero-velocity release, at glide end and on the hit
  button's blur, easing (no spring) to the nearest spot with at most 20%
  cover when more than 50% is covered; pointerdown cancels. Alternatives:
  collide with panes during the drag, or lift the lens above panes while
  held (both bigger).
- **A (founder call):** (a) turn Transparency effects on to judge the design
  as intended (many Windows visitors still get the fallback); (b) the Portal
  ignores `prefers-reduced-transparency` (the "Lab rolls heavy" reading:
  drop the reduce half of the three media queries and the `fx.ts:65`, `:386`
  checks, keep `prefers-contrast: more`); (c) keep E10. Un-hiding only the
  lens in reduce mode is not a fix.

## For the glass critic

Reduce mode still mounts an invisible lens (`home-boot.ts:129-142`); the
travel box's bottom inset reads the document-end spacer, not the fixed
switcher (`home-boot.ts:20-26`, code reading only); at 1024 about 37% of
the disc is grabbable at load; under a pane the lens vanishes rather than
reading as glass under glass; in reduce mode the Control Centre's Frost and
Glass tiles change nothing.
