# Proof a1: swiss red duotone Shining Tree on About (D1)

Made 10-02-26 for Stage 4 Tier A. Brief: `briefs/a1-swiss-duotone.md`.
Nothing under `src/` changed; the proof CSS is injected into the frozen build
`scripts/themes/.out/snap-stage4-base/`.

## The question

Does a red duotone of the Shining Tree still, as a full-bleed field on swiss
About carrying the manifesto in white, read as a Swiss poster photograph, with
the manifesto legible, in light and dark, at every size?

## What was made

- `scripts/themes/proofs/stage4-swiss-duotone/make-duotone.mjs` (sharp) turns
  `src/experiments/bdl-007/still.png` (592x963, tree on alpha) into two WebPs,
  each the tree cropped with a margin, on a flat `#da0016` field, upscaled
  1.75x to 1036x1423:
  - A, `tree-red-black.webp`: shadows `#0b0b0b`, highlights `#da0016`. 37,698 bytes.
  - B, `tree-red-paper.webp`: shadows `#da0016`, highlights `#fafaf7`. 54,986 bytes.
- `proof.css` (same folder): About's manifesto section becomes a true
  viewport-bleed field (`margin-inline: calc(50% - 50vw)` with matching
  padding, so the type stays on its grid lines), `#da0016` with `#ffffff` type
  in both schemes (brief item 4: the red field does not flip to coral in dark),
  and Home's red rectangle loses its fill.
- `scripts/themes/harness/stage4-swiss-duotone-proof.mjs` films it (GPU
  Chromium, RTX 3070 through ANGLE D3D11, string in `renderer.txt`).

## What the images show

All under `scripts/themes/.out/stage4-proofs/swiss-duotone/`:

- `field-paper.jpg`, `field-black.jpg`: the manifesto field at 1440, 1280,
  1024, 820, 390, light and dark.
- `mapping-compare.jpg`: A against B at 1440 and 390.
- `about-full-paper.jpg`, `about-full-black.jpg`: whole About at 1440, 820, 390.
- `home-billboard.jpg`: Home first screen before and after, four sizes, both schemes.
- `shots/` holds every full-size PNG; `contrast.json` the measurements.

## The answer

**Mapping: B, red-and-paper.** The bark turns near-white and the moss shadows
go red, so the tree reads as a bold pale figure on the red sheet, the
Wachsmann poster look. A keeps depth (the moss goes black) but the bark is the
same red as the field, so the tree nearly vanishes and the sheet reads as a
dark texture. A's advantage is that every pixel is between black and the red,
so white type holds on it anywhere; B needs the layout to keep type off the tree.

**Crop and focal point.**
- 1024 and up: the tree stands on the right, `background-size: auto 100%` at
  1024, `auto 118%` from 1280, `background-position: right 3vw top 0` (1024)
  and `right 3vw top 40%` (1280 and up), cropped by the sheet edge. The
  manifesto keeps to six columns (1024 to 1279) or seven (1280 up) on flat red.
- Below 1024 (820 and 390, portrait): the tree is a band across the top of the
  field, `background-size: min(100vw, 560px) auto`, `background-position: 62% 0`
  (78% from 640), and the type sits below on flat red
  (`padding-top: min(100vw, 560px) * 1.38`, the image height). At 390 the
  whole tree reads, about 380 css px wide.

**Measured contrast** (white against the pixels under every line of the
manifesto, field screenshots with the type hidden, GPU frames): 5.26:1 at every
size, both schemes, both mappings, for the display type (needs 3) and the
index label (needs 4.5). Lightest and darkest under the type are the same
because the type is kept clear of the tree: the pixels under it are flat
`#da0016`. A first pass with the type overlapping B's tree measured 1.0 to 1.2,
so the layout is what carries the contrast, not a scrim. If Tier B wants type
over the tree it must use mapping A (also 5.26 or better anywhere) or add a scrim.

**File weight.** 54,986 bytes for B at 1036x1423. Resolution is limited by the
source (592 px wide): at 1440 the tree is shown at about 1.0x to 1.3x its
1.75x upscale; at 2x phones it is soft but a duotone with noisy bark hides
it. A fresh render of the 3D scene at a larger size would fix it if the
founder wants razor edges (not needed for the proof).

**Home.** The rectangle's fill and size go; the lead ("A design lab, not an
agency.") is copy, so it stays as ink type in the same spot. Billboard plus that
lead and the subline, no red anywhere on the first screen. Word parity holds.

## What Tier B lifts

- Asset: `scripts/themes/proofs/stage4-swiss-duotone/tree-red-paper.webp`
  into `src/assets/` (or beside the theme), imported through astro:assets.
  Decorative, so it is a CSS background, no `alt`. Keep it lazy below the fold
  (a CSS background on a section below the fold loads when painted).
- CSS: `proof.css` in the same folder, minus the `:root{--sw-tree}` the
  harness prepends. Replace `var(--sw-tree)` with the imported URL. It is
  already all under `html[data-theme='swiss']`. Use the new `--red-field` and
  `--on-red` tokens from item 4 where it hardcodes `#da0016` and `#ffffff`.
- The CTA stays the existing ink button on the red (black in light, paper in
  dark); nothing was changed there.
- Not checked here: the portal swap through this section, and Lighthouse.
  Sheets load About directly with the switcher hidden.
