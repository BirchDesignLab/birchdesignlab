# Tier 3, Stage 3, Tier A (the proofs): report for the founder

Written 09-25-26 at the Tier A stop. Nothing here is merged or live. Branch
`feat/theme-schools-tier3-stage3`. The proofs answer the calls the founder
asked to see before the build (`stage3-decisions.md`, Answers); each topic's
full notes are in `proofs/`.

## How it ran

- Before set filmed first (`.out/stage3-before`, 48 strips, 0 problems).
- Workflow 1 (7 agents): palette and lens and marble on Opus, type and
  vaporwave and the lens verifier on Sonnet, one Opus critic. The critic
  passed lens, marble and palette and blocked five things (vaporwave's floor
  regression, no playable loop films, a Services crop missing the front
  window; type's degraded sheets and a wrong byte cost).
- Workflow 2 (5 agents): four Sonnet fixers, one Opus critic. The critic
  found the vaporwave floor fix had broken two more things (a moved tilt
  pivot, a flat floor under reduced motion) and some notes overclaimed.
- Orchestrator: fixed the floor properly (the original scroll plus a
  separate seam animation, no overhang games), re-probed all four floors at
  0/60/80/95% of the cycle and reduced motion (identical to before), re-filmed
  (20 MP4s), and corrected the notes, sheet quality and numbers.
- Every result was checked against the workflow journals and the disk. No
  agent touched git.

## What to look at, and the calls

All images and films are in `scripts/themes/.out/stage3-proofs/`.

1. **Glass palette** (`palette/thumb-dark.jpg`, `thumb-light.jpg`,
   `hero-desktop.jpg`, `phone.jpg`, `unstitched.jpg`). Warm Big Sur (your
   pick) is clearly apart from vaporwave at thumbnail scale in both schemes;
   blue also separates but reads cold and sits nearer vaporwave's cyan.
   Two things Tier B must do: warm light goes greyish mauve where the orange
   and blue shapes overlap (fix: a coral shape between them), and text that
   sits on the bare wallpaper (Services "How a project runs", Home's "What
   we build" chip and "How we build" link) must move onto a pane, since
   nothing passes contrast on the bare wallpaper. The stitched sheets step
   every 900 px because of how they were captured, not the wallpaper.
   **No call needed** unless you want to change your mind.
2. **Glass heading face** (`type/sheet-home.png`, `sheet-services.png`,
   `sheet-about.png`, `specimen.png`). Plus Jakarta Sans 760 against Inter
   Display 740, same crops. Inter Display is rounder and closer to Apple's
   SF; Jakarta reads as the 2021 Dribbble era. Cost: about 2.7 KB *less*
   than today if body text moves to the same Inter file (one file carries
   weight and optical size). **Call: which face.** Recommendation: Inter
   Display.
3. **Vaporwave grid loop** (`vaporwave/hero__dark__compare.mp4`,
   `hero__light__compare.mp4`, stacked before / tear / restart; crops
   `*__crop.png`). "Tear": the grid keeps driving and a two-frame sideways
   tear marks every 6.4 s. "Restart": the grid's phase visibly jumps back at
   the same moment, plus the tear. The tear alone is hard to see on the hero
   in light (the detector could not find it either). The CSS floors carry
   the same tear in both (a floor cannot show a phase jump). **Call: tear or
   restart.** Recommendation: restart.
4. **Vaporwave inactive back window** (`vaporwave/services__dark__compare.png`,
   `services__light__compare.png`). The back window's bar goes lavender-grey
   two-stop with dimmed ink; exactly one neon bar per window pair. Contrast
   5.61 to 8.62. **No call needed** unless it reads wrong to you.
5. **Glass lens** (`lens/still__desktop__clear.png`, `lens__desktop__tinted.png`,
   `compare__lens-over-text__desktop.png`, `compare__pane-bend-vs-frosted__desktop.png`,
   `film__drag-fling__desktop.mp4`, `film__wall-stop__desktop.mp4`). The
   WebGL lens works everywhere, handles as rigid glass (stretch at most 3%,
   no bounce, glides to a stop, stops dead at a wall, verified by a second
   agent), holds 60 fps, and lines up with the page within 1 px while
   scrolling. Research confirmed Safari (18 to 26) and Firefox do not bend
   through `backdrop-filter`; Chrome does. Three calls:
   - **Where the lens lives:** under the page content, in the Home hero's
     empty half, so text passes over it (recommended); or over the content,
     where text under it disappears (WebGL cannot draw page text).
   - **Chrome's text-bending lens:** Chrome alone could bend the text too
     (third panel of the over-text sheet), but it mirrors at the rim and
     would look different from Safari. Recommendation: WebGL everywhere.
   - **Pane edge:** the bevel bends inward (default) or outward (reads like
     a thick glass edge). Taste; both in `compare__pane-bend-vs-frosted`.
   The glide time and a faster stretch release at a wall are left for you to
   feel on your phone once it is built.
6. **Marble** (`marble/tints-sheet.png`, `composite-light.png`,
   `composite-dark.png`). Stand-in props prove the material: glossy white,
   pink and black-vein marble spheres, pastel columns, holographic facets,
   chrome orbs; 10 to 47 KB each as WebP or AVIF. Weakest: the columns
   (paler and more matte), and the chrome still reflects a boxy room. The
   mesh pick is the Cleveland Museum of Art's **Head of Apollo** (CC0,
   Roman, 94,564 triangles, a chipped nose tip only). **Calls:**
   - Apollo with a chipped nose tip, or a complete head (the Doryphoros
     cast, to be checked) or a bust with shoulders (Augustus)?
   - The download needs a signed-in Sketchfab account, which I cannot use.
     Either you download the glTF (about 10 to 40 MB) into
     `scripts/themes/.out/meshes/`, or I look for a copy the museum serves
     directly.
   - Two dev tools: add `meshoptimizer` as an explicit devDependency (it is
     already on disk under @types/three; package.json changes) and keep
     `sharp` (already installed with Astro) for AVIF, since
     @napi-rs/canvas's AVIF output is broken.

## Still open from the start of Stage 3

- Installing Playwright WebKit (about 150 MB from Microsoft's Playwright
  servers) to test Safari's engine locally.
- The vaporwave wall label's lesson (A, B or C in `stage3-decisions.md`, or
  A by default), and whether the era stays "2012 to 2017".

## Gates

`npm run verify` on the Tier A tree, clean: 347 unit tests, astro check 0
errors and 0 warnings, 483 built-site tests.


## Next

Tier B, the build, after these calls: glass (E1 to E14, E16, the controls,
the lens, the warm wallpaper, the face) and vaporwave (the plaza, F1
framing, the marble, E4 to E15, the 19:93 clock), with an Opus critic per
school and the Stage 2 gates.
