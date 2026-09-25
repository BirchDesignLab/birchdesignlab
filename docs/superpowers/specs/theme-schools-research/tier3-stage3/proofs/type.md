# D8 heading face proof: Plus Jakarta Sans vs Inter Display

09-25-26. Tier A proof for glassmorphism.md D8, run against the frozen
Stage 3 base build. Script: `scripts/themes/harness/stage3-type-proof.mjs`.
No edits under `src/`; the override runs as an injected `<style>` and
`@font-face` on the live pages.

Revised same day in the Tier A fix round, after an Opus critic pass found
the comparison sheets were low-quality JPEGs, the byte-cost claim was
wrong, the specimen sat over live-page chrome, and the Inter Display
weight used for the first pass read lighter than Jakarta at card sizes.
All four are fixed below, in the Method, Byte cost and specimen
description.

## Method

Captured Home hero (desktop 1440 x first 900px, phone 390 2x first screen),
the Services head card, and the About title card, dark and light, for both
faces. Also a specimen: the line "Birch Design Lab, agency 2026" (varied
letterforms, not just "Design Lab") set as an h2 at 96px, 56px and 28px,
both faces, both schemes, on a clean isolated field (own opaque overlay,
everything else on the page hidden) rather than over the live hero.

Settings used:

- **Plus Jakarta Sans (today, unchanged):** the theme's own rule.
  Weight 760, letter-spacing -0.03em, word-spacing 0.05em (the word-spacing
  is theme.css's own give-back for how tight Jakarta 800 gets at the letter
  level; without it words visually run together).
- **Inter Display:** loaded as `'Inter Display Proof'` from
  `node_modules/@fontsource-variable/inter/files/inter-latin-opsz-normal.woff2`
  (72.9 KB on disk, 71.2 KB decoded from the base64 the script measured),
  a file the theme does not load today. Weight 740, letter-spacing -0.022em,
  word-spacing 0 (Inter does not need Jakarta's word-space give-back).
  740 replaces the first pass's 700: 700 read visibly lighter than Jakarta
  760 at head-card and title-card sizes, so this revision tried the
  720-760 range by eye and settled on 740 as the closest match without
  looking heavier than Jakarta. `font-variation-settings: 'opsz' 32`
  pinned explicitly rather than `font-optical-sizing: auto`, so every
  heading size in the proof shows the same opsz instead of one that drifts
  down at the smaller sizes (the head card and title card h1/h2 sizes are
  well under the 32px `auto` would choose from font-size alone).

Output: `scripts/themes/.out/stage3-proofs/type/` (gitignored):
`sheet-home.png`, `sheet-services.png`, `sheet-about.png`, `specimen.png`,
plus the raw PNG element shots. PNG, not JPEG: the first pass's JPEG
sheets came out as 7-50 KB files, visibly posterised and blotchy with
unreadable labels. Every sheet now carries labels at least 20px tall
naming face, weight, tracking and scheme, and both columns of a row are
drawn at the same scale and the same x/y offset so the crop and position
match across the comparison.

## What the proof shows

Looked at every sheet before writing this. Both faces render distinctly;
this is not a case where the override silently failed to apply, though at
a glance across the full hero shot the two look closer than the specimen
strip suggests, because at billboard size (96px+, gradient-filled) the
difference in feel is subtler than in the specimen's flat black-on-white
comparison.

- **Design.** Inter Display at opsz 32 reads noticeably calmer than Jakarta
  at the same nominal weight: rounder counters (the "a", "g" open up),
  slightly narrower set width, and no trace of Jakarta's slightly
  geometric, drawn-with-a-compass "D" and "g". Inter's tabular, humanist
  skeleton is exactly why it is the standard "nearest open face to SF"
  citation. It reads more like Apple's Liquid Glass headings.
- **Jakarta**, by contrast, reads as its era: a 2020-2021 Dribbble-adjacent
  geometric sans, close to Poppins/Futura's family and further from SF's
  humanist skeleton. It is not wrong for the room, but it is not the
  Apple-lineage read the founder's Liquid Glass forward direction points
  toward.
- **Weight match.** This revision uses 740 for Inter Display (was 700 in
  the first pass, chosen for the specimen's biggest, most weight-sensitive
  size). At 700 the head-card and title-card h1s read visibly lighter than
  Jakarta 760 at the same visual size; 740 was the closest match found by
  eye trying the 720-760 range the critic suggested, without tipping
  heavier than Jakarta. If B is picked, this is the starting weight to
  carry into theme.css, not 700.
- **The gradient billboard** ("Design Lab") keeps its current colour and
  clip-text treatment in both faces, as scoped: this proof is about the
  letterform, not the vibrancy change (D4, Tier B).
- **Dark/light.** Both faces hold up the same way in both schemes; no
  contrast or legibility difference introduced by the face swap itself.

**Read: Inter Display suits the Liquid Glass room better.** It is the face
that actually reads like SF's lineage; Jakarta is a fine, and period-correct
for the Dribbble-hybrid original brief, but it is pulling against the
Apple-forward direction the founder chose for this pass, not with it.

## Byte cost

Read `src/pages/t/glassmorphism/[...page].astro` and
`src/themes/glassmorphism/meta.ts`. Corrected in the fix round below: the
first pass's "one opsz file cannot serve both roles" claim was wrong.

- The route imports three variable-font `wght.css` files today: Plus
  Jakarta Sans (27.3 KB latin woff2), Inter (48.3 KB latin woff2), and
  Space Grotesk (22.3 KB latin woff2). `meta.ts` preloads the Jakarta and
  Inter files (Space Grotesk is not preloaded, accent role only).
- Inter's body role already loads the `wght`-axis file
  (`inter-latin-wght-normal.woff2`, 48.3 KB on disk). The `opsz`-axis file
  used for this proof (`inter-latin-opsz-normal.woff2`, 72.9 KB on disk,
  71.2 KB decoded) is the complementary split fontsource ships.
- **One opsz file CAN serve both roles.** The first pass assumed the opsz
  file pins `wght` at its default and so cannot carry body text's
  `<strong>`/`<em>` weights (750/650, About.astro's `.founder-body` copy).
  That assumption does not hold: `node_modules/@fontsource-variable/inter/opsz.css`,
  fontsource's own shipped stylesheet for this exact file, declares
  `font-weight: 100 900` on the `@font-face` block for
  `inter-latin-opsz-normal.woff2`, the identical range `wght.css`
  declares for the dedicated wght file. A variable-weight range in the CSS
  for a `format('woff2-variations')` source means the binary's `fvar`
  table carries that axis; fontsource does not publish a weight range on a
  file whose weight is pinned. This is the file packager's own metadata
  for this file, not the "documented convention" hand-wave the first pass
  fell back on. It was not confirmed by decoding the `fvar` table directly
  (no woff2 decompressor is available in this sandbox: `opentype.js` is
  present but needs an external one, confirmed again in this fix round),
  so treat it as first-party-metadata-verified, not binary-verified.
- **Net cost if D8-B ships:** a swap, not additive. One opsz file
  (72.9 KB) replaces both the Inter wght file (48.3 KB, body) and the
  Jakarta file (27.3 KB, heading): **72.9 - 48.3 - 27.3 = -2.7 KB** on disk
  versus today. If the Inter wght file were kept anyway (for example, not
  trusting this file to also cover the body's synthetic bold/italic
  without a visual check), the opsz file is added on top instead of
  replacing it, and only Jakarta drops: **72.9 - 27.3 = +45.6 KB**. Either
  way this is a preloaded, render-blocking-for-headings-and-body web font,
  so the shape of the number (roughly flat, and possibly a small win) is
  the headline, not the raw 72.9 KB file size read in isolation.
- **A third case**, for completeness: if D8 stays A (Jakarta headings) and
  only brief E14 lands (the opsz file replaces the Inter wght file for
  body), the cost is **72.9 - 48.3 = +24.6 KB**. The critic's second pass
  decoded the `fvar` table directly (opsz 14 to 32, wght 100 to 900), so
  the two-axis reading above is binary-verified after all.

## Files

- `scripts/themes/harness/stage3-type-proof.mjs` (read-only against
  `src/`, serves the frozen `snap-stage3-base` build on port 4462; revised
  09-25-26 for the fix round: PNG sheets with 20px+ labels, isolated
  both-scheme specimen, weight 740)
- `scripts/themes/.out/stage3-proofs/type/` (gitignored proof images)
