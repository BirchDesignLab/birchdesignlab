# README charts to 11 (spec, 11-17-26)

Founder 11-17-26: "those mermaid charts are cool but can we ... turn the WOW to 11 on them". Option **C (hybrid)** chosen: five charts generated from their Mermaid source into brand SVGs, plus two hand-composed showpieces (Timeline, Portal). Defaults taken for the unanswered calls: the site's quiet palette with Lab-level motion; motion plays once and settles (the hero webp already loops). A founder fiddle round follows the first pass (palette, motion amount, which charts animate).

## What GitHub allows

- Mermaid in a README: theme variables and classDef only. No fonts, motion, JS or links.
- SVG through `<img>` / `<picture>`: CSS `@keyframes` (and SMIL) play; base64 `@font-face` fonts render; no JS, no external loads, links inside do nothing.
- `<picture><source media="(prefers-color-scheme: dark)" srcset="...dark.svg"><img src="...light.svg" alt="..."></picture>` swaps reliably.
- README column is about 830px wide on desktop; on phones about 360px. Charts must read at both (they scale down; text must stay legible at 830 and the layout must not become a thin strip on phones; a phone-tall layout is acceptable only if it is a separate `<source media="(max-width: ...)">`, otherwise one layout that scales).

## Deliverables

- `scripts/readme/charts/` : the builder (`build.mjs`, entry point `node scripts/readme/charts/build.mjs`), shared theme module (tokens, fonts, motion), one module per showpiece, and the data JSON for the showpieces. Committed, documented in a header comment.
- `assets/readme/charts/<n>-<name>.light.svg` and `.dark.svg` for all seven charts.
- README.md: each Mermaid block replaced by a `<picture>` with a real `alt` (what the chart says, one or two sentences), followed by `<details><summary>Chart source (Mermaid)</summary>` holding the original Mermaid block unchanged (so it still renders as a fallback and stays the editable source). The Timeline and Portal showpieces read their content from JSON; their `<details>` holds the Mermaid as today, and the JSON must agree with it (see drift gate).
- `tests/readme-charts.test.ts` : the drift gate (below). Runs inside `npm run verify` (vitest includes `tests/**`); no browser.
- `scripts/readme/mermaid-check.mjs` keeps working (it reads Mermaid blocks; they are now inside `<details>`).

## The builder

1. Read README.md, extract the seven Mermaid blocks (in order) and a stable id per block.
2. Generated charts (1 to 6, except Portal = 4): render each block with mermaid in headless Chromium (Playwright from node_modules; GPU not needed) with `htmlLabels: false` and `flowchart.htmlLabels: false` so labels are SVG `<text>` (foreignObject does not render in `<img>`), using a `base` theme whose `themeVariables` come from the shared theme. Then post-process the SVG: strip Mermaid's default style block, apply the brand stylesheet per scheme, map each classDef (`store`, `cloud`, `you`, any others present) to brand roles, add motion classes, embed fonts, set `viewBox`, width/height, `<title>` and `<desc>`.
3. Showpieces (Portal = 4, Timeline = 7): bespoke SVG built in code from JSON data, same theme module, same font embedding.
4. Every SVG carries `<metadata>` with `data-source-hash` = sha256 of its source (the normalized Mermaid block for 1, 2, 3, 5, 6; the JSON file for 4 and 7) and the builder version.
5. Fonts: Marcellus (display) and Spectral (body) from `@fontsource`; for Portal, each school's own display face from its `src/themes/<id>/` (fontsource packages already in package.json). Subset to the glyphs each SVG uses (fonttools `pyftsubset` is installed; or opentype.js, already a dependency), embed as base64 woff2. Budget: each SVG at most 150 KB; report sizes.
6. Deterministic: the same input produces byte-identical output (no timestamps, stable ids, sorted attributes where Mermaid is unstable). Run it twice and diff to prove it.
7. A `--check` flag re-renders and fails if any committed SVG differs (for the builder's own use; not in verify).

## Look (quiet palette, from `src/styles/tokens.css`)

- Light: bark white field (`--bark-white`, `--bark-white-dim` raised), ink (`--ink`) text and strokes, moss and forest greens for the site/Cloudflare roles, leather caramel/brown for stores, a restrained accent for the one thing each chart is about.
- Dark: the site's dark tokens (read the dark blocks in tokens.css); never a light card on dark.
- Background: transparent or the field colour with rounded corners; must sit well on GitHub's white and on its dark `#0d1117`.
- Type: Marcellus for titles and node headings, Spectral for edge labels and secondary lines; sizes legible at 830px wide (no text under about 11px rendered at 830).
- Strokes hand-tuned: no Mermaid default arrowheads or grey boxes; arrows in ink at reduced opacity, labels on a field-coloured halo.
- Contrast: every text/background pair at least 4.5:1 in both schemes; report the pairs.
- No em dashes or en dashes in any text.

## Motion (CSS keyframes in the SVG; plays once on load, about 2 to 4 s total, then still)

1. **How the site is served:** a request dot travels Visitor to Static Assets and back; a POST dot travels Visitor to Worker through honeypot, rate limit, validate, daily cap to email; the failed-send branch pulses into KV and the cron's retry loops back once. Ends still.
2. **Repository map:** branches draw in from the root (stroke-dashoffset), folders appear in order like twigs; a few lenticel marks on the trunk.
3. **Lab:** nodes are museum specimen labels (thin double rule, accession number in small caps); they settle in with a slight stagger.
4. **Portal (showpiece):** seven school swatches, each in that school's palette and display face (read `src/themes/<id>/` tokens and meta), with the shared copy flowing into each and the wordmark as the one element that pairs across them; the swatches deal in left to right and the wordmark slides across them once, the way the site's morph does.
5. **Build, verify, deploy:** a check mark ticks verify's four stages (vitest, astro check, build, test:dist), then the deploy lands.
6. **Harness:** agent seats coloured by model tier (Haiku, Sonnet, Opus; a legend), the review block fans out in parallel and folds back into the gate.
7. **Timeline (showpiece):** a birch trunk drawn upward (or left to right if that reads better at 830 and 360), events as dark bark marks with dates and short labels; the founding, launch, Portal day and today picked out; draws in once.

Motion must not hide information in the final frame: the still frame alone is a complete chart. Keep it calm: easing, no bounces, nothing flashing.

## Drift gate (`tests/readme-charts.test.ts`)

- For each `<picture>` in README.md, the light and dark SVG files exist.
- For charts 1, 2, 3, 5, 6: sha256 of the normalized Mermaid block in the following `<details>` equals the SVG's `data-source-hash` (both schemes).
- For 4 and 7: sha256 of the JSON equals the SVGs' hash, and the JSON's events/schools agree with the Mermaid in `<details>` (every Mermaid event or school appears in the JSON and vice versa; write the comparison so a wording edit in one fails the test).
- Each SVG has no `<script>`, no `foreignObject`, no external `href`/`url(http`, has `<title>`, and is under 150 KB.
- Failure messages say: "README chart <n> is stale: run node scripts/readme/charts/build.mjs".

## Evidence (for the critic and the controller)

- `scripts/readme/.out/charts/` (gitignored): PNG stills of every SVG, light and dark, at 830px and 360px wide, rendered as `<img>` on a page with GitHub's backgrounds (`#ffffff`, `#0d1117`); plus a filmstrip of each chart's motion (8 frames across the animation) at 830 light and dark; and a contact sheet of all of it.
- A size table, the contrast pairs, the determinism diff, `npm run verify` output.

## Out of scope

Site pages, any `src/` change, CLAUDE.md, the Worker. No new runtime dependency; a devDependency only if fonttools and opentype.js cannot do the job (newest stable, say why).
