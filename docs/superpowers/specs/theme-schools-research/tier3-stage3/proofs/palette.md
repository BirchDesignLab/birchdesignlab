# Tier A proof: the glass wallpaper palette

Written 09-25-26 for Tier 3 Stage 3 (pair B), Tier A. Question: at sheet
scale, does glass (dark and light) read clearly apart from vaporwave's indigo,
violet, magenta and cyan, and does warm Big Sur (the founder's lead) or blue
Bloom (the alternative) do it better? Nothing under `src/` was edited.

## What was made

- `scripts/themes/proofs/stage3-palette/warm.css` and `blue.css`: the two
  variant sheets, written so Tier B can lift them into `theme.css`. Every rule
  is under `html[data-theme='glassmorphism']`; token blocks use
  `html:root[data-theme=...]` so they beat theme.css's `:root[data-theme]` on
  specificity without `!important`. Each one:
  - replaces `main::before` with a fixed mesh of large mid-value radial forms
    over a diagonal base, with a vignette that darkens toward the edges; no
    blur filter, no idle drift (E3). The body takes a deep edge colour so
    nothing falls to a flat field below the fold;
  - makes the orbs flat two-stop discs with crisp edges, no hotspot and no
    blur (D7);
  - recolours orbs, accents, links, buttons, icon plates, lines, shadows and
    the field tokens. The orb class names stay (no markup change): warm maps
    violet to deep blue, cyan to ember/amber, peach to coral, pink to rose;
    blue maps them to cobalt, azure, ice and royal blue. Glass fills, edges,
    blur and layout are untouched (Tier B).
- `scripts/themes/proofs/stage3-palette/check-palette-contrast.ts`: runs the
  site's own `checkTheme()` over theme.css plus a variant, with glass's real
  `meta.contrast` list loaded through Vite, plus proof-only pairs for text on
  the bare wallpaper. Output saved beside the images as `contrast.txt`.
- `scripts/themes/harness/stage3-palette-proof.mjs`: loads the frozen
  `snap-stage3-base` build on port 4461 through `snap.mjs --reuse`, injects a
  variant with `addStyleTag`, and captures Home, Services and About for
  vaporwave, glass today, glass warm and glass blue, dark and light, desktop
  1440 (1x) and phone 390 (2x). GPU confirmed: ANGLE, RTX 3070 Laptop, D3D11
  (`renderer.txt`).

Images: `scripts/themes/.out/stage3-proofs/palette/` holds `thumb-dark.jpg`,
`thumb-light.jpg`, `hero-desktop.jpg`, `phone.jpg`, `unstitched.jpg`, and the
48 stitched pages plus 16 unstitched viewport captures under `pages/`.

## Capture method (the fixed-wallpaper caveat)

Pages are **stitched**, not pinned: viewport-sized screenshots at scroll
offsets 0, vh, 2vh and so on, plus one flush with the bottom, pasted at their
real scroll positions. The wallpaper stays `position: fixed`, so each band
shows what a reader sees at that scroll. That puts a visible step in the
wallpaper every 900 px (desktop) or 844 px (phone). The step is how the method
works. It is not a defect in the wallpaper. Sticky and fixed chrome (the header bar) is hidden in
every band after the first so it shows once. Also for the comp only: the
portal switcher is hidden in every column, and orb drift is paused on the
glass columns so the three are not caught at different drift phases.

At thumbnail scale that seam reads as banding, so `thumb-dark.jpg`,
`thumb-light.jpg` and `phone.jpg` now carry a one-line caption saying it is
the stitch, not the wallpaper. To see the wallpaper whole, `unstitched.jpg`
holds raw, un-stitched viewport screenshots per column: Home's first screen
and one mid-page screen, dark and light, at desktop 1440. No seam in these;
they are what a reader's screen actually shows at that scroll.

## The read

- **Glass today against vaporwave:** the hue problem is real. At thumbnail
  size, glass dark is violet, magenta and teal on indigo, the same family as
  vaporwave's night. The glass panels and orbs tell them apart, not the colour.
- **Warm (Big Sur):** the clearest separation, in both schemes. Orange and
  coral are nowhere in vaporwave (its only warm note is the yellow sun), and
  the deep blue sits cooler and bluer than vaporwave's indigo. In dark it
  reads as "blue night with embers", with no violet in it at all. Light is
  bright and saturated, not milky. Weakest spot: in light, where orange and
  blue forms overlap in the middle of the page, the blend goes a greyish mauve
  (visible behind the Home hero and the Lab panel). A coral or pink bridge
  form at the centre, or a hue-aware blend, would fix it in Tier B.
- **Blue (Bloom):** also clearly apart from vaporwave by hue, and very
  coherent, but it is monochrome. In dark it reads cold and a little generic,
  closer to a stock Windows desktop than to a designed room. Its azure also
  sits nearer vaporwave's cyan grid than anything in warm does. The Bloom
  shape is only suggested here (radial forms, no real petals), so blue is
  undersold slightly; a petal shape would not change the hue verdict.
- **Phone:** the same ranking holds. At 390 the percentage-sized forms fill
  less of each screen, so warm dark reads mostly blue in the first screen with
  ember showing as you scroll. Orb placement on phones is still today's
  (E2 is Tier B), which is why some cards sit over plain field.

**Lead with warm.** It answers the question at a glance in every sheet, it is
Apple's own lineage (Liquid Glass forward), and it matches the founder's pick.
Keep blue as the alternative, but at sheet scale it adds no separation that
warm lacks, and it gives up the warmth that makes glass feel like a place.

## Contrast

- All of glass's `meta.contrast` pairs and the required pairs pass, for
  today, warm and blue alike (150 ok rows in `contrast.txt`, 50 per variant,
  zero failing). Getting there took tuning: the dark `--blob-worst` (the
  brightest orb highlight) had to come down to about the brightness of
  today's cyan highlight (warm `#f08a3c`, blue `#6fa6f0`). The dark kicker
  accents went lighter, and the light accents, the warm button start and the
  headline end went darker. Tier B must keep the wallpaper's brightest dark
  stop at or under `--blob-worst`, and its darkest light stop at or above the
  worst body. The sheets do that now.
- **Risk: text on the bare wallpaper.** Nothing in the checker's required or
  meta pairs covers text that sits on the field itself. `check-palette-contrast.ts`
  now traces every number this section cites: `--mark`, `--mark-muted`,
  `--accent` and `--link` over each wallpaper stop bare, the same four over
  the glass layers on the darkest light stop (`--wp-deep`), and the same four
  over the **composited edge**, meaning `--wp-edge` (the vignette) painted on
  top of `--wp-deep`, which is what a reader actually sees toward the page's edge,
  not the bare stop colour. All of it is in `contrast.txt`, tagged `proof:`
  and reported but not counted toward pass/fail (68 of these `low`, none
  reach the 4.5 floor without glass under them).
  - Bare wallpaper, warm light, worst stop `--wp-deep`: `--mark` 2.16,
    `--mark-muted` 1.24, `--accent` 1.05, `--link` 1.04. Warm dark's worst
    bare stop is `--wp-amber` (`--mark` 2.55, `--mark-muted` 2.02, `--accent`
    1.88, `--link` 1.87). Blue is no better: light `--wp-deep` bottoms out at
    `--mark-muted` 1.05, `--accent` 1.18, `--link` 1.06; dark's worst is
    `--wp-amber` at `--link` 1.74 (`--accent` 1.89).
  - The composited edge does not save it. Warm light, `--wp-edge` over
    `--wp-deep`: `--mark` 1.65, `--mark-muted` 1.05, `--accent` 1.37,
    `--link` 1.25. The vignette darkens `--wp-deep` further, so `--mark`
    and `--mark-muted` land *below* their already-failing bare-stop numbers.
    Flagging this: **the composited edge is a worse case than the bare
    wallpaper for `--mark`/`--mark-muted`, not a better one**, so any Tier B
    reasoning that leans on "the vignette darkens toward the edge, so it's
    safer there" is backwards for text sitting directly on the field.
  - Glass is what actually saves it. Every one of these same four tokens
    over `--sheen` + `--glass` on top of the composited edge passes (warm
    light: `--mark-muted` 6.30, `--accent` 4.85, `--link` 5.29; all dark
    variants land in the 10-14 range). So the fix is not a token change, it
    is placement: E3's rule to keep kickers and body headings on a pane, not
    the bare field, is load-bearing once the wallpaper is this saturated.
  - Visible cases in the sheets: Services' "How a project runs" heading, and
    on Home the "What we build" kicker chip (`.chip`, styled with `--accent`)
    and the "How we build" link right after it (`--link`), both sit on the
    bare field today. Bare-wallpaper text is still untested beyond these
    proof-pair stop colours; a form's actual rendered gradient can land
    between two stops.
- The fallback without `backdrop-filter` and the E10 off state are untested
  under the new tokens.

## For Tier B: the lens proof paints the wallpaper differently than warm.css

`scripts/themes/proofs/stage3-lens/room.js` (the lens proof, a separate Tier A
proof) builds its warm wallpaper by painting a `<canvas>` once in JS, with
layered wave shapes from `createLinearGradient`, a sun glow and a vignette,
and hands that same bitmap to both the CSS `background-image` and the lens's
WebGL texture, so the two can never drift apart. Its orbs (`ORBS` in
`room.js`) are flat, single-colour discs: one `c` per orb, no gradient.

That is a different construction than this proof's `warm.css`, which paints
the wallpaper with CSS `radial-gradient()` layers directly on `main::before`
(no canvas, no shared bitmap) and gives orbs a two-stop `linear-gradient()`
(`--hi` to `--lo`) rather than a flat fill.

Tier B has to pick one construction, not keep both: **paint the chosen warm
mesh once, from one source, and feed both the CSS background and the lens
texture from it**. The lens proof's canvas-and-blob-URL approach is the one
that already does this and should be the pattern to keep. Whichever way the
mesh is painted, the lens's orb model has to match the orbs it is drawing:
if production orbs stay two-stop gradients (as this proof's D7 discs are),
the lens's orb render has to sample or approximate that gradient, or the
orbs in the lens have to go flat too, matching room.js. Shipping the lens
against a different orb model than the page paints is the kind of drift the
canvas-and-shared-bitmap trick exists to prevent in the first place.

**The one weak spot to fix, not just note:** the read above already flags
that warm light's orange and blue forms overlap in the page middle and blend
to a greyish mauve (visible behind the Home hero and the Lab panel). That
overlap is a straightforward consequence of `radial-gradient()` layers
alpha-compositing in sRGB: averaging orange and blue in RGB desaturates
through grey, unlike mixing warm pigments. Two fixes are available and
either fits the "paint once" plan above: (1) add a coral or pink bridge
`radial-gradient` stop centered where the orange and blue circles overlap,
so the seam reads as a third warm hue instead of a grey; or (2) do the blend
in OKLCH instead of sRGB, painting the mesh on the canvas pixel-by-pixel (or
composite in an OKLCH-aware step) so overlapping hues interpolate through
chroma instead of collapsing toward it, the same way `color-mix(in oklch, …)`
already works elsewhere in this codebase (`src/lib/contrast/check.ts`). The
bridge-stop fix is cheaper and matches how `room.js` already layers shapes;
the OKLCH-blend fix is more correct but changes how the mesh is generated,
not just its stops.
